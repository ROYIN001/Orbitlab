/**
 * Exhaust trails (roadmap V03): the smoke an ascent leaves in the air, where
 * it was left.
 *
 * Every puff is a point the vehicle's exhaust passed through, taken from the
 * flight's own recording: each recorded frame (every 0.1 s on an ascent) is an
 * emission from each engine burning in it — the core's, each strap-on's, a
 * returning stage's, an escape motor's. The point is fixed to the ground (the
 * air turns with the Earth), carried by the flight's own wind — the physics'
 * crosswind or shear, nothing when it is calm — and it widens and fades with
 * age. Nothing is accumulated between frames, so a replay, a scrub back or a
 * scrub forward draws exactly the trail the flight left.
 *
 * What the smoke looks like is the propellant's: solid motors leave the thick
 * white column that hangs for minutes; kerosene a thin grey one, darker behind
 * a Merlin, whose gas generator dumps its fuel-rich exhaust beside the nozzle;
 * hydrogen next to nothing but a contrail where its water freezes, in humid
 * air; methane little; the hypergolic stages a reddish-brown haze of NO₂.
 * All of it is visible only in dense air.
 */
import * as THREE from 'three';
import type { VisualFrame } from '../physics/frame';
import type { DynamicsConfig, VehicleSpec } from '../types';
import { getRigidVehicleGeometry } from '../physics/rigid/vehicle-data';
import { exhaustKind, type ExhaustKind } from './exhaust';
import { windVelocityECI, type WindScenario } from '../physics/rigid/aero';
import { windScenario } from '../physics/rigid/runtime';
import { quatRotate } from '../physics/rigid/math';
import { OMEGA_EARTH } from '../physics/constants';
import type { Vec3 } from '../physics/vec3';
import { puffTexture } from './smoke';
import { smoothstep } from './noise';

export { exhaustKind, type ExhaustKind };

/**
 * What a separation leaves: a liquid strap-on venting its oxygen as it falls
 * away (the Korolev cross), a solid booster's separation motors, the puff at a
 * stage's separation plane.
 */
type PuffKind = ExhaustKind | 'vent' | 'sepMotor' | 'staging';
/** How long each separation keeps puffing, s after it */
const SEPARATION_PUFF: Record<'vent' | 'sepMotor' | 'staging', number> = { vent: 2, sepMotor: 1.2, staging: 0.8 };


interface ExhaustLook {
  /** smoke colour in daylight */
  color: number;
  /** opacity of a fresh puff in dense air */
  opacity: number;
  /** s until a puff has faded away */
  lifetime: number;
  /** altitude band the smoke thins out over, m: full below the first, none above the second */
  fade: [number, number];
  /** width at emission as a multiple of the source's diameter */
  width: number;
  /** how fast the column widens, m at an age of 1 s (grows as age^0.8) */
  spread: number;
  /** a contrail where the exhaust's water freezes: full between the middle two altitudes, m, and its opacity in saturated air */
  contrail?: [number, number, number, number, number];
}

/** Estimates, from launch photographs; docs/IMPLEMENTATION-STATUS.md. */
const LOOKS: Record<PuffKind, ExhaustLook> = {
  solid: { color: 0xecebe6, opacity: 0.9, lifetime: 900, fade: [25e3, 45e3], width: 1.5, spread: 2.2 },
  kerolox: { color: 0xc9ccd0, opacity: 0.32, lifetime: 80, fade: [8e3, 22e3], width: 1.3, spread: 1.5 },
  keroloxGG: { color: 0xa39f99, opacity: 0.4, lifetime: 90, fade: [8e3, 24e3], width: 1.3, spread: 1.5 },
  hydrolox: { color: 0xf1f4f7, opacity: 0.06, lifetime: 150, fade: [2e3, 6e3], width: 1.0, spread: 1.2, contrail: [6e3, 8.5e3, 13e3, 16e3, 0.5] },
  methalox: { color: 0xdfe1e4, opacity: 0.12, lifetime: 60, fade: [6e3, 18e3], width: 1.0, spread: 1.2, contrail: [7e3, 9e3, 12e3, 15e3, 0.2] },
  hypergolic: { color: 0xb38566, opacity: 0.4, lifetime: 220, fade: [15e3, 35e3], width: 1.2, spread: 1.8 },
  // vented oxygen boils into a cloud that billows out in the thin air of a separation at 40–60 km;
  // in near-vacuum a separation motor's or a stage's puff spreads wide and fast (`spread` grows with altitude)
  vent: { color: 0xf3f6f9, opacity: 0.3, lifetime: 30, fade: [90e3, 140e3], width: 1.5, spread: 14 },
  sepMotor: { color: 0xe6e5e1, opacity: 0.7, lifetime: 45, fade: [110e3, 160e3], width: 2.5, spread: 4 },
  staging: { color: 0xd4d5d8, opacity: 0.4, lifetime: 20, fade: [120e3, 180e3], width: 1.1, spread: 5 },
};

/**
 * How humid each site's air is, 0–1, for contrails (and the vapour cone):
 * a tropical coast near 1, the Kazakh and Gobi steppes low. Estimates from
 * climate, not measured weather.
 */
export const SITE_HUMIDITY: Record<string, number> = {
  kourou: 0.95, wenchang: 0.9, cape: 0.85, ksc39a: 0.85, sriharikota: 0.85, tanegashima: 0.85,
  starbase: 0.8, wallops: 0.75, mahia: 0.75, vandenberg: 0.7, plesetsk: 0.7, vostochny: 0.6,
  xichang: 0.6, taiyuan: 0.35, baikonur: 0.3, jiuquan: 0.2,
};

/** A puff budget: past it the oldest part of the column is thinned harder. */
const MAX_PUFFS = 16000;

/** One engine burning in one recorded frame: where its exhaust left the vehicle. */
interface Emission {
  t: number;
  /** the source it came from, so a column joins its own neighbours */
  key: string;
  kind: PuffKind;
  /** position fixed to the ground: the ECI point turned back by the Earth's rotation at `t` */
  x: number; y: number; z: number;
  altitude: number;
  diameter: number;
  /** 0–1: how much smoke this engine leaves at this altitude */
  strength: number;
  /** index of the same source's next emission, -1 at its newest */
  next: number;
  /** position of this frame in the recording, for thinning the old column evenly */
  frame: number;
}

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

export class ExhaustTrails {
  readonly mesh: THREE.Mesh;
  private readonly geo: THREE.InstancedBufferGeometry;
  private readonly mat: THREE.ShaderMaterial;
  private readonly pos: Float32Array;
  private readonly axis: Float32Array;
  private readonly size: Float32Array;
  private readonly look: Float32Array;
  private readonly attrs: THREE.InstancedBufferAttribute[];
  private readonly wind: WindScenario | null;
  private readonly humidity: number;
  private readonly kinds: { core: ExhaustKind[]; booster: Map<string, { kind: ExhaustKind; diameter: number }>; byName: Map<string, ExhaustKind> };
  private readonly boosterBase: Map<string, Vec3[]>;
  private readonly colors: Record<PuffKind, THREE.Color>;
  /** emissions of the frames seen so far, and which frame they end at */
  private emissions: Emission[] = [];
  private frameEnd: number[] = [];
  private lastFrame: VisualFrame | null = null;
  private lastOfKey = new Map<string, number>();
  private readonly tmp = new THREE.Vector3();

  /**
   * @param azimuth the launch azimuth, rad: how a point-mass frame's stack is turned about its axis, as it is drawn
   */
  constructor(private readonly vehicle: VehicleSpec, siteId: string, dynamics: DynamicsConfig | undefined, private readonly azimuth: number,
    map: THREE.Texture = puffTexture()) {
    this.wind = dynamics && dynamics.model === 'sixDof' && dynamics.wind !== 'calm' ? windScenario(dynamics) : null;
    this.humidity = SITE_HUMIDITY[siteId] ?? 0.6;
    const booster = new Map<string, { kind: ExhaustKind; diameter: number }>();
    const byName = new Map<string, ExhaustKind>();
    for (const st of vehicle.stages) {
      byName.set(st.name, exhaustKind(st));
      for (const b of st.boosters ?? []) {
        booster.set(b.id, { kind: exhaustKind(b), diameter: b.diameter });
        byName.set(b.name, exhaustKind(b));
      }
    }
    this.kinds = { core: vehicle.stages.map((st) => exhaustKind(st)), booster, byName };
    this.boosterBase = new Map();
    for (const p of getRigidVehicleGeometry(vehicle).boosters) {
      const group = p.id.slice(0, p.id.lastIndexOf('.'));
      const list = this.boosterBase.get(group) ?? [];
      list.push(p.baseBody);
      this.boosterBase.set(group, list);
    }
    this.colors = Object.fromEntries(Object.entries(LOOKS).map(([k, l]) => [k, new THREE.Color(l.color)])) as Record<PuffKind, THREE.Color>;

    const base = new THREE.PlaneGeometry(1, 1);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    this.geo.setAttribute('uv', base.getAttribute('uv'));
    this.pos = new Float32Array(MAX_PUFFS * 3);
    this.axis = new Float32Array(MAX_PUFFS * 3);
    this.size = new Float32Array(MAX_PUFFS * 2);
    this.look = new Float32Array(MAX_PUFFS * 4);
    this.attrs = [
      new THREE.InstancedBufferAttribute(this.pos, 3), new THREE.InstancedBufferAttribute(this.axis, 3),
      new THREE.InstancedBufferAttribute(this.size, 2), new THREE.InstancedBufferAttribute(this.look, 4),
    ];
    for (const a of this.attrs) a.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('iPos', this.attrs[0]);
    this.geo.setAttribute('iAxis', this.attrs[1]);
    this.geo.setAttribute('iSize', this.attrs[2]);
    this.geo.setAttribute('iLook', this.attrs[3]);
    this.geo.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uMap: { value: map }, uLight: { value: 1 } },
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
  }

  /** How many puffs are drawn, and where (scene coordinates), for the tests. */
  drawn(): { count: number; positions: Float32Array } {
    return { count: this.geo.instanceCount, positions: this.pos.subarray(0, this.geo.instanceCount * 3) };
  }

  /** Forget everything (a new recording). */
  clear(): void {
    this.emissions = [];
    this.frameEnd = [];
    this.lastFrame = null;
    this.lastOfKey.clear();
    this.geo.instanceCount = 0;
  }

  /**
   * Draw the trails as they stand at mission time `t`.
   *
   * @param frames the recording, oldest first
   * @param toScene ECI position to scene coordinates
   * @param night 0 in daylight, 1 at night
   */
  update(frames: readonly VisualFrame[], t: number, toScene: (p: Vec3, out: THREE.Vector3) => THREE.Vector3, night: number): void {
    this.catchUp(frames);
    this.mat.uniforms.uLight.value = 1 - 0.82 * night;
    let n = 0;
    const cosT = Math.cos(OMEGA_EARTH * t), sinT = Math.sin(OMEGA_EARTH * t);
    const out = this.tmp;
    // newest first: when the budget runs out it is the oldest smoke that goes
    let end = this.frameEnd.length;
    while (end > 0 && frames[end - 1] && frames[end - 1].t > t + 1e-9) end--;
    const last = end > 0 ? this.frameEnd[end - 1] : 0;
    for (let i = last - 1; i >= 0 && n < MAX_PUFFS; i--) {
      const e = this.emissions[i];
      const age = t - e.t;
      const look = LOOKS[e.kind];
      if (age > look.lifetime) {
        // everything older is older still; only the solids outlive the rest
        if (age > LOOKS.solid.lifetime) break;
        continue;
      }
      // thin the old column evenly: every other frame past a minute, one in four past three
      const stride = age > 180 ? 4 : age > 60 ? 2 : 1;
      if (e.frame % stride !== 0) continue;
      const alpha = e.strength * look.opacity * smoothstep(0, 0.35, age) * (1 - smoothstep(0.3 * look.lifetime, look.lifetime, age));
      if (alpha < 0.01) continue;
      // the ground-fixed point, turned with the Earth to now
      let px = e.x * cosT - e.y * sinT, py = e.x * sinT + e.y * cosT, pz = e.z;
      if (this.wind && age > 0) {
        const w = windVelocityECI(this.wind, v(px, py, pz), e.altitude, t - age / 2);
        px += w.x * age; py += w.y * age; pz += w.z * age;
      }
      toScene(v(px, py, pz), out);
      const k = n * 3;
      this.pos[k] = out.x; this.pos[k + 1] = out.y; this.pos[k + 2] = out.z;
      // along the column: to the same source's next point
      let ax = 0, ay = 0, az = 0, len = 0;
      if (e.next >= 0) {
        const f = this.emissions[e.next];
        const dx = f.x - e.x, dy = f.y - e.y, dz = f.z - e.z;
        len = Math.hypot(dx, dy, dz);
        if (len > 1e-6) { ax = (dx * cosT - dy * sinT) / len; ay = (dx * sinT + dy * cosT) / len; az = dz / len; }
      }
      this.axis[k] = ax; this.axis[k + 1] = ay; this.axis[k + 2] = az;
      // the column widens with age, and faster where the air is thin
      const width = e.diameter * look.width * (1 + 0.6 * Math.sqrt(age)) + look.spread * Math.pow(age, 0.8) * (1 + e.altitude / 12e3);
      this.size[n * 2] = width;
      this.size[n * 2 + 1] = Math.max(width, len * stride * 1.8);
      const c = this.colors[e.kind];
      const hot = 1 - smoothstep(0, 1.5, age);
      this.look[n * 4] = c.r + (1 - c.r) * hot * 0.4;
      this.look[n * 4 + 1] = c.g + (0.75 - c.g) * hot * 0.4;
      this.look[n * 4 + 2] = c.b + (0.45 - c.b) * hot * 0.4;
      this.look[n * 4 + 3] = Math.min(1, alpha);
      n++;
    }
    this.geo.instanceCount = n;
    for (const a of this.attrs) { a.needsUpdate = true; a.clearUpdateRanges(); a.addUpdateRange(0, n * a.itemSize); }
    this.mesh.visible = n > 0;
  }

  /** Emissions for the frames recorded since the last call; all of them again when the recording was thinned or replaced. */
  private catchUp(frames: readonly VisualFrame[]): void {
    const done = this.frameEnd.length;
    if (done > frames.length || (done > 0 && frames[done - 1] !== this.lastFrame)) this.clear();
    for (let i = this.frameEnd.length; i < frames.length; i++) {
      this.emit(frames[i], i);
      this.frameEnd.push(this.emissions.length);
      this.lastFrame = frames[i];
    }
  }

  private emit(f: VisualFrame, index: number): void {
    // the ground-fixed frame: the ECI point turned back by the Earth's rotation
    const c = Math.cos(-OMEGA_EARTH * f.t), s = Math.sin(-OMEGA_EARTH * f.t);
    const add = (key: string, kind: PuffKind, p: Vec3, diameter: number) => {
      const strength = this.strength(kind, f.altitude);
      if (strength < 0.02) return;
      const i = this.emissions.length;
      const prev = this.lastOfKey.get(key);
      if (prev !== undefined && f.t - this.emissions[prev].t < 1.5) this.emissions[prev].next = i;
      this.lastOfKey.set(key, i);
      this.emissions.push({ t: f.t, key, kind, x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z,
        altitude: f.altitude, diameter, strength, next: -1, frame: index });
    };
    const base = this.stackBase(f);
    if (f.liftoff && !f.destroyed && !f.abort) {
      const burning = f.stages.filter((st) => st.attached && st.burning && !st.isSpacecraft);
      if (burning.length) {
        const st = burning[0];
        add(`core${st.index}`, this.kinds.core[st.index] ?? 'kerolox', base, this.vehicle.stages[st.index]?.diameter ?? 3);
      }
      for (const b of f.boosters) {
        if (!b.attached || !b.burning) continue;
        const info = this.kinds.booster.get(b.id);
        const places = this.boosterBase.get(b.id) ?? [];
        places.forEach((body, k) => add(`${b.id}.${k}`, info?.kind ?? 'kerolox', addV(base, this.toWorld(f, body)), info?.diameter ?? 2));
      }
    }
    // a stage flying home on its engines, an escape motor pulling the crew away
    for (const d of f.debris ?? []) {
      if (!d.alive) continue;
      const kind = this.kinds.byName.get(d.name);
      if (d.burning && kind) add(`debris${d.id}`, kind, d.r, d.visual.diameter);
      // what the separation itself leaves in its first seconds
      const since = f.t - d.createdAt;
      if (since < 0) continue;
      const along = (x: number) => addV(d.r, v(d.dir.x * x, d.dir.y * x, d.dir.z * x));
      if (d.visual.kind === 'booster') {
        if (kind === 'solid') {
          if (since < SEPARATION_PUFF.sepMotor) {
            // separation motors at the nose and at the aft skirt push the booster clear
            add(`sepN${d.id}`, 'sepMotor', along(d.visual.length * 0.9), d.visual.diameter);
            add(`sepA${d.id}`, 'sepMotor', d.r, d.visual.diameter);
          }
        } else if (since < SEPARATION_PUFF.vent) add(`vent${d.id}`, 'vent', along(d.visual.length * 0.85), d.visual.diameter);
      } else if ((d.visual.kind === 'stage' || d.visual.kind === 'upperStage') && since < SEPARATION_PUFF.staging) {
        // the spent stage's debris point is its separation plane
        add(`stage${d.id}`, 'staging', d.r, d.visual.diameter);
      }
    }
    const a = f.abort;
    if (a && (a.motors.main > 0.05 || a.motors.fairing > 0.05)) add('escape', 'solid', f.r, a.motors.main > 0.05 ? 2.5 : 3.5);
  }

  /** How much smoke `kind` leaves at `altitude`. */
  private strength(kind: PuffKind, altitude: number): number {
    const look = LOOKS[kind];
    let s = 1 - smoothstep(look.fade[0], look.fade[1], altitude);
    if (look.contrail) {
      const [a0, a1, b0, b1, peak] = look.contrail;
      s = Math.max(s, peak / look.opacity * this.humidity * smoothstep(a0, a1, altitude) * (1 - smoothstep(b0, b1, altitude)));
    }
    return s;
  }

  /** Where the stack's base is, ECI: the drawn stack's origin. */
  private stackBase(f: VisualFrame): Vec3 {
    if (!f.rigid) return f.r;
    return addV(f.r, quatRotate(f.rigid.attitudeQ, f.rigid.renderOffsetBody));
  }

  /** A body-axes offset (x the nose) in ECI, turned as the stack is drawn. */
  private toWorld(f: VisualFrame, b: Vec3): Vec3 {
    if (f.rigid) return quatRotate(f.rigid.attitudeQ, b);
    // the point-mass stack is drawn with its side on the launch azimuth's normal (main.ts)
    const r = f.r, rn = Math.hypot(r.x, r.y, r.z);
    const up = v(r.x / rn, r.y / rn, r.z / rn);
    let east = v(-up.y, up.x, 0);
    const en = Math.hypot(east.x, east.y) || 1;
    east = v(east.x / en, east.y / en, 0);
    const north = cross(up, east);
    const heading = v(east.x * Math.sin(this.azimuth) + north.x * Math.cos(this.azimuth), east.y * Math.sin(this.azimuth) + north.y * Math.cos(this.azimuth), east.z * Math.sin(this.azimuth) + north.z * Math.cos(this.azimuth));
    const dir = f.dir;
    let side = cross(heading, up);
    const d = side.x * dir.x + side.y * dir.y + side.z * dir.z;
    side = v(side.x - d * dir.x, side.y - d * dir.y, side.z - d * dir.z);
    const sn = Math.hypot(side.x, side.y, side.z) || 1;
    side = v(side.x / sn, side.y / sn, side.z / sn);
    const xAxis = cross(dir, side);
    // body (x, y, z) is render (−y… ): x along the axis, y against render x, z along render z
    return v(b.x * dir.x - b.y * xAxis.x + b.z * side.x, b.x * dir.y - b.y * xAxis.y + b.z * side.y, b.x * dir.z - b.y * xAxis.z + b.z * side.z);
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
  }
}

function addV(a: Vec3, b: Vec3): Vec3 { return v(a.x + b.x, a.y + b.y, a.z + b.z); }
function cross(a: Vec3, b: Vec3): Vec3 { return v(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x); }

const VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute vec3 iPos;
  attribute vec3 iAxis;
  attribute vec2 iSize;   // width, length along the column
  attribute vec4 iLook;   // colour, opacity
  varying vec2 vUv;
  varying vec4 vLook;
  void main() {
    vUv = uv;
    vLook = iLook;
    vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
    // a streak along the column as it is seen: shortened when it points at the eye
    vec3 a = (modelViewMatrix * vec4(iAxis, 0.0)).xyz;
    float along = length(a.xy);
    vec2 u = along > 1e-4 ? a.xy / along : vec2(1.0, 0.0);
    vec2 w = vec2(-u.y, u.x);
    float len = max(iSize.x, iSize.y * along);
    mv.xy += u * position.x * len + w * position.y * iSize.x;
    gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
  }
`;

const FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D uMap;
  uniform float uLight;
  varying vec2 vUv;
  varying vec4 vLook;
  void main() {
    #include <logdepthbuf_fragment>
    // along the column only the blob's middle: a streak with no gaps between its neighbours
    vec4 t = texture2D(uMap, vec2(0.5 + (vUv.x - 0.5) * 0.45, vUv.y));
    float a = t.a * vLook.a;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vLook.rgb * t.rgb * uLight, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
