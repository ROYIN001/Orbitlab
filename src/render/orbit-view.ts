/**
 * The orbit playground's 3-D view (roadmap O01): the Earth turning with the
 * sidereal time, lit by the Sun of the moment, and the orbit — its ellipse
 * with the Earth at the focus, perigee and apogee, the ascending node on the
 * equator, the satellite, and on request Kepler's equal-time sectors, the
 * radius that sweeps them, the orbit's normal and the inertial axes.
 *
 * A renderer of its own, separate from the launch scene: the playground is a
 * diagram of the orbit, not the flight's camera, and it is drawn only while
 * the Orbit section is on screen. Scene units are thousands of kilometres, the
 * axes the simulator's ECI frame (z to the north pole), so a point of the
 * physics is `position / 1e6`.
 */
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { EarthTextures } from './scene';
import { R_EARTH } from '../physics/constants';
import { gmst, sunDirectionEci } from '../physics/orbital';
import { equalTimeCuts, hitsEarth, stateAt, type Orbit } from '../orbit/kepler';

/** metres to scene units (thousands of km) */
const S = 1e-6;
const RE = R_EARTH * S;

const EARTH_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPosW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const EARTH_FRAG = /* glsl */ `
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform float hasMaps;
uniform vec3 sunDir;
uniform vec3 camPos;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vec3 n = normalize(vNormalW);
  float ndl = dot(n, sunDir);
  float day = smoothstep(-0.08, 0.12, ndl);
  vec3 dayCol = hasMaps > 0.5 ? texture2D(dayMap, vUv).rgb : vec3(0.16, 0.34, 0.62);
  vec3 nightCol = hasMaps > 0.5 ? texture2D(nightMap, vUv).rgb * vec3(1.0, 0.85, 0.6) : vec3(0.0);
  vec3 col = dayCol * (0.1 + 1.05 * max(ndl, 0.0)) * day + nightCol * (1.0 - day) * 0.9 + dayCol * 0.05;
  // a thin blue limb, where the view grazes the atmosphere
  float rim = pow(1.0 - max(dot(n, normalize(camPos - vPosW)), 0.0), 3.0);
  col += vec3(0.25, 0.45, 0.9) * rim * (0.25 + 0.75 * day);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/** O02: an orbit of a plan drawn beside the one flown — a transfer, the orbit after it, a target's. */
export interface OrbitGhost {
  /** points along it, m, ECI */
  points: { x: number; y: number; z: number }[];
  color: number;
  dashed?: boolean;
  /** the line closes on itself (an ellipse) */
  closed?: boolean;
}

/** O02: a numbered point of a plan: a burn. */
export interface OrbitMarker {
  position: { x: number; y: number; z: number };
  label: string;
  color: number;
}

export interface OrbitViewOptions {
  /** Kepler's second law: the equal-time sectors and the sweeping radius */
  sectors: boolean;
  /** the Engineer's extras: the orbit's normal and the inertial axes */
  engineer: boolean;
  /** carry J2's drift of the node and the perigee */
  j2: boolean;
}

/** Colours: the app's accent for the orbit, warm for perigee, cool for apogee. */
const COLORS = { orbit: 0x8be5cd, crash: 0xff6b6b, perigee: 0xefa47e, apogee: 0x6ec8ff, node: 0xc3a6ff, sat: 0xffffff, sectorA: 0x8be5cd, sectorB: 0x6ec8ff };

function labelSprite(text: string, color: string): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d')!;
  g.font = '600 38px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = 'rgba(5,8,13,0.9)';
  g.strokeText(text, 32, 34);
  g.fillStyle = color;
  g.fillText(text, 32, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, sizeAttenuation: false }));
  sprite.scale.set(0.045, 0.045, 1);
  // drawn just above the point it names
  sprite.center.set(0.5, -0.25);
  sprite.renderOrder = 10;
  return sprite;
}

function starField(): THREE.Points {
  const n = 1800, pos = new Float32Array(n * 3);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < n; k++) {
    const z = 2 * rnd() - 1, phi = 2 * Math.PI * rnd(), s = Math.sqrt(1 - z * z);
    pos.set([3000 * s * Math.cos(phi), 3000 * s * Math.sin(phi), 3000 * z], k * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xaab4c4, size: 1.3, sizeAttenuation: false }));
}

export class OrbitView {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.01, 10000);
  private readonly earth: THREE.Mesh;
  private readonly earthMat: THREE.ShaderMaterial;
  /** the orbit's own frame (perifocal: x to perigee, z along the angular momentum), turned into ECI each frame */
  private readonly perifocal = new THREE.Group();
  private readonly ellipse: Line2;
  private readonly ellipseMat: LineMaterial;
  private sectors: THREE.Mesh | null = null;
  private readonly perigee: THREE.Mesh;
  private readonly apogee: THREE.Mesh;
  private readonly perigeeLabel = labelSprite('P', '#efa47e');
  private readonly apogeeLabel = labelSprite('A', '#6ec8ff');
  private readonly node: THREE.Mesh;
  private readonly nodeLabel = labelSprite('☊', '#c3a6ff');
  private readonly nodeLine: THREE.Line;
  private readonly sat: THREE.Mesh;
  private readonly radius: THREE.Line;
  private readonly equator: THREE.LineLoop;
  private readonly axes = new THREE.Group();
  private readonly normal: THREE.ArrowHelper;
  private orbit: Orbit | null = null;
  private shape = { a: NaN, e: NaN };
  private options: OrbitViewOptions = { sectors: false, engineer: false, j2: false };
  // the camera, on a sphere about the Earth's centre
  private az = -0.9;
  private el = 0.45;
  private dist = 40;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch = 0;
  private readonly m = new THREE.Matrix4();
  /** O02: the plan's other orbits, its burns, and a rendezvous target */
  private readonly ghosts = new THREE.Group();
  private readonly markers = new THREE.Group();
  private readonly target: THREE.Mesh;
  private size = { w: 1, h: 1 };
  /** the farthest point of the plan's other orbits, m: framing takes them in too */
  private ghostReach = 0;
  /** R02: a catalogue group's satellites, as points; and the moment the Earth is drawn at when no orbit is */
  private points: THREE.Points | null = null;
  private bareJd = 2451545;
  /** R02: the farthest of the points, m (for framing them with no orbit) */
  private reach = 0;

  constructor(private readonly canvas: HTMLCanvasElement, textures: Promise<EarthTextures> | null) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x05080d, 1);
    this.camera.up.set(0, 0, 1);

    this.earthMat = new THREE.ShaderMaterial({
      vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG,
      uniforms: { dayMap: { value: null }, nightMap: { value: null }, hasMaps: { value: 0 },
        sunDir: { value: new THREE.Vector3(1, 0, 0) }, camPos: { value: new THREE.Vector3() } },
    });
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(RE, 96, 64), this.earthMat);
    this.scene.add(this.earth, starField());
    textures?.then((tex) => {
      // colour maps (the launch scene says the same of the textures it shares)
      tex.day.colorSpace = THREE.SRGBColorSpace;
      tex.night.colorSpace = THREE.SRGBColorSpace;
      this.earthMat.uniforms.dayMap.value = tex.day;
      this.earthMat.uniforms.nightMap.value = tex.night;
      this.earthMat.uniforms.hasMaps.value = 1;
    }).catch(() => { /* the plain blue globe stands */ });

    this.ellipseMat = new LineMaterial({ color: COLORS.orbit, linewidth: 2.2, worldUnits: false });
    this.ellipse = new Line2(new LineGeometry(), this.ellipseMat);
    const dot = (color: number, size: number) => new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), new THREE.MeshBasicMaterial({ color }));
    this.perigee = dot(COLORS.perigee, 1);
    this.apogee = dot(COLORS.apogee, 1);
    // the labels are not the dots' children: a dot is scaled to keep its size on screen, and a label keeps its own
    this.perifocal.add(this.ellipse, this.perigee, this.apogee, this.perigeeLabel, this.apogeeLabel);
    this.perifocal.matrixAutoUpdate = false;
    this.scene.add(this.perifocal);

    this.node = dot(COLORS.node, 1);
    this.nodeLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineDashedMaterial({ color: COLORS.node, dashSize: 0.6, gapSize: 0.4, transparent: true, opacity: 0.7 }));
    this.sat = dot(COLORS.sat, 1);
    this.radius = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    const ring = Array.from({ length: 129 }, (_, k) => new THREE.Vector3(Math.cos(k / 64 * Math.PI), Math.sin(k / 64 * Math.PI), 0));
    this.equator = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ring),
      new THREE.LineBasicMaterial({ color: 0x96a3b4, transparent: true, opacity: 0.25 }));
    this.normal = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 10, 0xefa47e);
    for (const [dir, color] of [[new THREE.Vector3(1, 0, 0), 0xff8a8a], [new THREE.Vector3(0, 1, 0), 0x9be89b], [new THREE.Vector3(0, 0, 1), 0x8ab4ff]] as const) {
      this.axes.add(new THREE.ArrowHelper(dir, new THREE.Vector3(), RE * 1.8, color, 0.5, 0.3));
    }
    const aries = labelSprite('♈', '#ff8a8a');
    aries.position.set(RE * 1.95, 0, 0);
    this.axes.add(aries);
    this.target = dot(0xc3a6ff, 1);
    this.target.visible = false;
    this.scene.add(this.node, this.nodeLabel, this.nodeLine, this.sat, this.radius, this.equator, this.normal, this.axes, this.ghosts, this.markers, this.target);

    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) canvas.addEventListener(type, (e) => this.onUp(e));
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(Math.exp(e.deltaY * 0.001)); }, { passive: false });
    canvas.addEventListener('dblclick', () => this.frameOrbit());
    canvas.addEventListener('keydown', (e) => this.onKey(e));
  }

  setOptions(options: Partial<OrbitViewOptions>): void {
    const before = this.options.sectors;
    this.options = { ...this.options, ...options };
    if (before !== this.options.sectors) this.shape = { a: NaN, e: NaN };
  }

  /** A new orbit (null: none — R02's satellites alone): its shape is rebuilt; `frame` moves the camera out to see all of it. */
  setOrbit(orbit: Orbit | null, frame = false): void {
    this.orbit = orbit;
    if (frame) this.frameOrbit();
  }

  /** Back far enough to see the whole orbit. */
  frameOrbit(): void {
    if (!this.orbit) { if (this.reach > 0) this.frameRadius(this.reach); return; }
    this.frameRadius(Math.max(this.orbit.a * (1 + Math.min(this.orbit.e, 0.97)), this.ghostReach));
  }

  /** R02: back far enough to see everything within `radius` of the Earth's centre, m. */
  frameRadius(radius: number): void {
    this.dist = Math.max(RE * 3.2, radius * S * 3.1);
    this.el = 0.45;
  }

  /**
   * R02: a catalogue group's satellites as points, `count` of them from `xyz`
   * (m, ECI, three numbers each); null to clear. The buffer is reused while
   * the count allows, so a group redrawn every frame allocates nothing.
   */
  setPoints(xyz: Float32Array | null, count = 0, color = 0x9ad7ff): void {
    if (!xyz || count <= 0) {
      if (this.points) this.points.visible = false;
      this.reach = 0;
      return;
    }
    let pts = this.points;
    const attr = pts?.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!pts || !attr || attr.count < count) {
      if (pts) { this.scene.remove(pts); pts.geometry.dispose(); (pts.material as THREE.Material).dispose(); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Math.max(count, 64) * 3), 3).setUsage(THREE.DynamicDrawUsage));
      pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 3.4, sizeAttenuation: false, transparent: true, opacity: 0.9 }));
      pts.frustumCulled = false;
      this.points = pts;
      this.scene.add(pts);
    }
    const a = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = a.array as Float32Array;
    let reach = 0;
    for (let k = 0; k < count * 3; k += 3) {
      arr[k] = xyz[k] * S; arr[k + 1] = xyz[k + 1] * S; arr[k + 2] = xyz[k + 2] * S;
      reach = Math.max(reach, Math.hypot(xyz[k], xyz[k + 1], xyz[k + 2]));
    }
    a.needsUpdate = true;
    pts.geometry.setDrawRange(0, count);
    (pts.material as THREE.PointsMaterial).color.setHex(color);
    pts.visible = true;
    this.reach = reach;
  }

  /** R02: with no orbit, the moment the Earth and the Sun are drawn at (Julian date). */
  setBareTime(jd: number): void {
    this.bareJd = jd;
  }

  resize(w: number, h: number): void {
    if (w <= 0 || h <= 0) return;
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.ellipseMat.resolution.set(w, h);
    this.ghosts.traverse((o) => { if (o instanceof Line2) (o.material as LineMaterial).resolution.set(w, h); });
  }

  /** O02: the plan's other orbits (none to clear them). */
  setGhosts(ghosts: readonly OrbitGhost[]): void {
    for (const child of [...this.ghosts.children]) {
      const line = child as Line2;
      line.geometry.dispose();
      (line.material as LineMaterial).dispose();
      this.ghosts.remove(line);
    }
    this.ghostReach = 0;
    for (const g of ghosts) {
      if (g.points.length < 2) continue;
      for (const p of g.points) this.ghostReach = Math.max(this.ghostReach, Math.hypot(p.x, p.y, p.z));
      const pts: number[] = [];
      for (const p of g.points) pts.push(p.x * S, p.y * S, p.z * S);
      if (g.closed) pts.push(g.points[0].x * S, g.points[0].y * S, g.points[0].z * S);
      const geo = new LineGeometry();
      geo.setPositions(pts);
      const mat = new LineMaterial({ color: g.color, linewidth: 1.6, worldUnits: false, dashed: !!g.dashed, dashSize: 0.9, gapSize: 0.6, transparent: true, opacity: 0.85 });
      mat.resolution.set(this.size.w, this.size.h);
      const line = new Line2(geo, mat);
      line.computeLineDistances();
      this.ghosts.add(line);
    }
  }

  /** O02: the plan's burns, numbered. */
  setMarkers(markers: readonly OrbitMarker[]): void {
    for (const child of [...this.markers.children]) {
      this.markers.remove(child);
      child.traverse((o) => {
        if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); }
        if (o instanceof THREE.Sprite) { o.material.map?.dispose(); o.material.dispose(); }
      });
    }
    for (const m of markers) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: m.color }));
      ball.position.set(m.position.x * S, m.position.y * S, m.position.z * S);
      const label = labelSprite(m.label, `#${m.color.toString(16).padStart(6, '0')}`);
      label.position.copy(ball.position);
      this.markers.add(ball, label);
    }
  }

  /** O02: the rendezvous target, where it is now (null: none). */
  setTarget(position: { x: number; y: number; z: number } | null): void {
    this.target.visible = !!position;
    if (position) this.target.position.set(position.x * S, position.y * S, position.z * S);
  }

  private rebuildShape(o: Orbit): void {
    const bound = o.e < 1;
    const p = o.a * (1 - o.e * o.e);
    const pts: number[] = [];
    for (let k = 0; k <= 360; k++) {
      const nu = (k / 360) * 2 * Math.PI, r = (p / (1 + o.e * Math.cos(nu))) * S;
      pts.push(r * Math.cos(nu), r * Math.sin(nu), 0);
    }
    this.ellipse.geometry.dispose();
    const geo = new LineGeometry();
    geo.setPositions(pts);
    this.ellipse.geometry = geo;
    this.ellipse.computeLineDistances();
    this.perigee.position.set(o.a * (1 - o.e) * S, 0, 0);
    this.apogee.position.set(-o.a * (1 + o.e) * S, 0, 0);
    // a circle has no perigee or apogee to point at
    const round = o.e < 1e-3;
    this.perigee.visible = this.perigeeLabel.visible = !round;
    this.apogee.visible = this.apogeeLabel.visible = bound && !round;
    this.perigeeLabel.position.copy(this.perigee.position);
    this.apogeeLabel.position.copy(this.apogee.position);
    if (this.sectors) { this.perifocal.remove(this.sectors); this.sectors.geometry.dispose(); this.sectors = null; }
    if (this.options.sectors && bound) {
      // twelve sectors swept in equal times: a fan of thin triangles from the focus, two colours alternating
      const cuts = equalTimeCuts(o.e, 12), pos: number[] = [], col: number[] = [];
      const a = new THREE.Color(COLORS.sectorA), b = new THREE.Color(COLORS.sectorB);
      cuts.slice(1).forEach((end, k) => {
        const start = cuts[k], c = k % 2 ? b : a, steps = 24;
        for (let j = 0; j < steps; j++) {
          const n1 = start + (end - start) * j / steps, n2 = start + (end - start) * (j + 1) / steps;
          const r1 = p / (1 + o.e * Math.cos(n1)) * S, r2 = p / (1 + o.e * Math.cos(n2)) * S;
          pos.push(0, 0, 0, r1 * Math.cos(n1), r1 * Math.sin(n1), 0, r2 * Math.cos(n2), r2 * Math.sin(n2), 0);
          for (let v = 0; v < 3; v++) col.push(c.r, c.g, c.b);
        }
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      this.sectors = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
      this.perifocal.add(this.sectors);
    }
    this.shape = { a: o.a, e: o.e };
  }

  /** Draw the orbit `t` seconds after its epoch (with none, the Earth at `setBareTime`'s moment). */
  update(t: number): void {
    const o = this.orbit;
    const drawn = !!o;
    for (const part of [this.perifocal, this.node, this.nodeLabel, this.nodeLine, this.sat, this.radius, this.normal]) part.visible = drawn;
    if (!o) {
      this.turnEarth(gmst(this.bareJd), this.bareJd);
      this.equator.scale.setScalar(Math.max(RE * 1.6, this.reach * S * 1.1));
      this.axes.visible = this.options.engineer;
      return;
    }
    // R02: a real satellite's osculating orbit wobbles a little every frame; below a part in a
    // million the drawing would not change, so the shape is not rebuilt for it
    if (!(Math.abs(o.a - this.shape.a) <= 1e-6 * Math.abs(o.a)) || !(Math.abs(o.e - this.shape.e) <= 1e-6)) this.rebuildShape(o);
    const s = stateAt(o, t, this.options.j2);
    // perifocal → ECI: the columns are the unit vectors to perigee, 90° on, and along h
    const cO = Math.cos(s.raan), sO = Math.sin(s.raan), ci = Math.cos(o.i), si = Math.sin(o.i), cw = Math.cos(s.argp), sw = Math.sin(s.argp);
    this.m.set(
      cO * cw - sO * sw * ci, -cO * sw - sO * cw * ci, sO * si, 0,
      sO * cw + cO * sw * ci, -sO * sw + cO * cw * ci, -cO * si, 0,
      sw * si, cw * si, ci, 0,
      0, 0, 0, 1);
    this.perifocal.matrix.copy(this.m);
    this.perifocal.matrixWorldNeedsUpdate = true;
    this.ellipseMat.color.setHex(hitsEarth(o) ? COLORS.crash : COLORS.orbit);
    const sat = new THREE.Vector3(s.r.x * S, s.r.y * S, s.r.z * S);
    this.sat.position.copy(sat);
    const rp = this.radius.geometry.getAttribute('position') as THREE.BufferAttribute;
    rp.setXYZ(1, sat.x, sat.y, sat.z);
    rp.needsUpdate = true;
    this.radius.visible = this.options.sectors;
    // the ascending node: where the orbit crosses the equator going north (ν = −ω)
    const p = o.a * (1 - o.e * o.e), rn = p / (1 + o.e * Math.cos(-s.argp)) * S;
    this.node.position.set(rn * cO, rn * sO, 0);
    const np = this.nodeLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    np.setXYZ(1, this.node.position.x, this.node.position.y, 0);
    np.needsUpdate = true;
    this.nodeLine.computeLineDistances();
    this.nodeLabel.position.copy(this.node.position);
    this.node.visible = this.nodeLine.visible = this.nodeLabel.visible = Math.abs(si) > 1e-6;
    const extent = Math.max(RE * 1.6, Math.max(o.a * (1 + Math.min(o.e, 0.97)), this.ghostReach) * S * 1.15);
    this.equator.scale.setScalar(extent);
    this.normal.setDirection(new THREE.Vector3(sO * si, -cO * si, ci));
    this.normal.setLength(Math.max(RE * 1.8, extent * 0.45), 0.8, 0.45);
    this.normal.visible = this.axes.visible = this.options.engineer;
    this.turnEarth(s.theta, o.jd0 + t / 86400);
    // markers keep a size on screen
    const px = this.dist * 0.0065;
    for (const m of [this.perigee, this.apogee, this.node]) m.scale.setScalar(px);
    this.sat.scale.setScalar(px * 1.15);
    this.target.scale.setScalar(px * 1.1);
    for (const m of this.markers.children) if (m instanceof THREE.Mesh) m.scale.setScalar(px * 0.8);
  }

  /** The Earth turned by the sidereal angle `theta`; the Sun where it is at `jd`. */
  private turnEarth(theta: number, jd: number): void {
    this.earth.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), theta)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
    const sun = sunDirectionEci(jd);
    (this.earthMat.uniforms.sunDir.value as THREE.Vector3).set(sun.x, sun.y, sun.z);
  }

  render(): void {
    // the field of view is set vertically: on a portrait screen stand back until the width fits too
    const d = this.dist * Math.max(1, 1 / this.camera.aspect);
    const c = Math.cos(this.el);
    this.camera.position.set(d * c * Math.cos(this.az), d * c * Math.sin(this.az), d * Math.sin(this.el));
    this.camera.lookAt(0, 0, 0);
    this.camera.near = Math.max(0.01, d * 0.002);
    this.camera.updateProjectionMatrix();
    (this.earthMat.uniforms.camPos.value as THREE.Vector3).copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }

  // ─── the camera, by pointer, wheel and keys ───────────────────────────────

  private zoom(f: number): void {
    this.dist = Math.min(2000, Math.max(RE * 1.25, this.dist * f));
  }
  private rotate(dx: number, dy: number): void {
    this.az -= dx * 0.006;
    this.el = Math.max(-1.45, Math.min(1.45, this.el + dy * 0.006));
  }
  private onDown(e: PointerEvent): void {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) this.pinch = this.spread();
  }
  private onMove(e: PointerEvent): void {
    const last = this.pointers.get(e.pointerId);
    if (!last) return;
    if (this.pointers.size === 1) this.rotate(e.clientX - last.x, e.clientY - last.y);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      const now = this.spread();
      if (this.pinch > 0 && now > 0) this.zoom(this.pinch / now);
      this.pinch = now;
    }
  }
  private onUp(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    this.pinch = 0;
  }
  private spread(): number {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }
  private onKey(e: KeyboardEvent): void {
    const step = e.shiftKey ? 40 : 12;
    if (e.key === 'ArrowLeft') this.rotate(step, 0);
    else if (e.key === 'ArrowRight') this.rotate(-step, 0);
    else if (e.key === 'ArrowUp') this.rotate(0, step);
    else if (e.key === 'ArrowDown') this.rotate(0, -step);
    else if (e.key === '+' || e.key === '=') this.zoom(0.85);
    else if (e.key === '-' || e.key === '_') this.zoom(1 / 0.85);
    else if (e.key === '0') this.frameOrbit();
    else return;
    e.preventDefault();
  }
}
