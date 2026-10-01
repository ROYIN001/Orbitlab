/**
 * What Vostok-1's return leaves behind, as drawn (C01; the bodies fly in
 * src/physics/sim/module-entry.ts, crew-descent.ts and fall.ts):
 *
 * - the instrument module, tumbling as its own rigid flight has it, its shock
 *   layer and wake glowing from the entry's heating;
 * - the pieces it breaks into at 78 km, each debris record standing for
 *   `count` alike pieces flown together: a few of them, tumbling, tinted by
 *   their metal and glowing as hot as the model has them, with a streak of
 *   hot gas behind and a spot that shows them from kilometres away;
 * - hatch No. 1 and the empty seat, falling, then lying where they came down;
 * - Gagarin, on his seat, then under his canopies (render/cosmonaut.ts).
 *
 * Not one of them has an engine's plume or the sunlit flash given to a
 * stage just let go (render/debris.ts). They are handed over at their WGS-84
 * height above the drawn Earth (render/datum.ts). Each is drawn round the
 * point its flight carries, its CG (the pilot's: where he touches the
 * ground), in a group held in the scene's own axes, so the glow can be turned
 * onto the air the body is moving through whatever its tumble.
 */
import * as THREE from 'three';
import type { DebrisFrame } from '../physics/frame';
import { OMEGA_EARTH, R_EARTH } from '../physics/constants';
import { VOSTOK_CAPSULE } from '../physics/rigid/escape';
import { VOSTOK_IM, type ModulePiece } from '../physics/sim/module-entry';
import { buildEntryGlow, entryGlow, type EntryGlowView } from './entry-glow';
import { buildInstrumentModule, IM_NEST, type InstrumentModuleView } from './vostok';
import { buildCosmonaut, buildEmptySeat, type CosmonautView } from './cosmonaut';
import { hash11 } from './noise';

/** The debris kinds drawn here. */
const KINDS: ReadonlySet<string> = new Set(['instrumentModule', 'imFragment', 'hatch', 'seat', 'pilot']);
export const isVostokBody = (d: DebrisFrame): boolean => KINDS.has(d.visual.kind);

const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
/** The rocket's model axes onto a rigid body's (+Y along body x), as render/debris.ts. */
const MODEL_TO_BODY = new THREE.Quaternion().setFromAxisAngle(Z, -Math.PI / 2);

/**
 * Where the module's drawing starts along its own +Y from the end its flight
 * puts in the sphere's cradle (`ModuleSpec.baseX`): that end is where the
 * sphere's drawing has it, nested `IM_NEST` into the sphere's side, so the
 * module does not jump as it leaves (render/escape.ts draws it on the sphere
 * from the sphere's bottom, which is `cgAbove` below the sphere's CG; the
 * module's CG is `packX` beyond that).
 */
const IM_SHIFT = -IM_NEST - (VOSTOK_IM.baseX + (VOSTOK_CAPSULE.retro?.packX ?? 2) - VOSTOK_CAPSULE.cgAbove);

/**
 * A hot metal's glow at `T` K: its colour into `out` and its brightness,
 * 0 below about 750 K (the Draper point, where red first shows, is 798 K),
 * red through orange to yellow-white by 1,750 K. For the picture: the
 * brightness rises steeply, as the radiance does.
 */
export function incandescence(T: number, out: THREE.Color): number {
  if (!(T > 750)) return 0;
  const u = Math.min(1, (T - 750) / 1000);
  out.setRGB(1, 0.16 + 0.62 * u, 0.03 + 0.5 * u * u);
  return Math.min(3, 1.5 * ((T - 750) / 600) ** 2);
}

/** A piece's shape (module-entry.ts's records), m. */
function pieceGeometry(p: Pick<ModulePiece, 'shape' | 'size' | 'id'> | undefined, d: DebrisFrame): THREE.BufferGeometry {
  if (!p) return new THREE.BoxGeometry(d.visual.diameter, d.visual.length * 0.4, d.visual.diameter * 0.6);
  const [a, b = a, c = b] = p.size;
  // the TDU-1's two tanks, toroidal (module-entry.ts): drawn as rings of their size
  if (p.id === 'im.tanks') return new THREE.TorusGeometry(a / 2 - b / 2, b / 2, 8, 18);
  if (p.shape === 'sphere') return new THREE.SphereGeometry(a / 2, 12, 8);
  if (p.shape === 'cylinder') return new THREE.CylinderGeometry(a / 2, a / 2, b, 14);
  return new THREE.BoxGeometry(a, b, c);
}

interface Piece { mesh: THREE.Mesh; axis: THREE.Vector3; rate: number; phase: number }

/** One of Vostok's bodies, its `root` placed at its debris record's point, in the scene's axes. */
export class VostokBody {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private glow: EntryGlowView | null = null;
  private module: InstrumentModuleView | null = null;
  private pilot: CosmonautView | null = null;
  private seat: { group: THREE.Group; dispose(): void } | null = null;
  private readonly pieces: Piece[] = [];
  private pieceMat: THREE.MeshStandardMaterial | null = null;
  private readonly owned: { dispose(): void }[] = [];
  private readonly tumbleAxis: THREE.Vector3;
  private readonly tumbleRate: number;
  private readonly kind: DebrisFrame['visual']['kind'];
  private readonly q = new THREE.Quaternion();
  private readonly qt = new THREE.Quaternion();
  private readonly air = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly axis = new THREE.Vector3();
  private readonly east = new THREE.Vector3();
  private readonly north = new THREE.Vector3();
  private readonly face = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly basis = new THREE.Matrix4();
  private readonly hot = new THREE.Color();

  constructor(d: DebrisFrame) {
    this.kind = d.visual.kind;
    this.root.add(this.body);
    this.tumbleAxis = randAxis(d.id);
    this.tumbleRate = 0.6 + 2.2 * hash11(d.id * 9.1 + 4.4);
    if (this.kind === 'instrumentModule') {
      this.module = buildInstrumentModule();
      this.module.group.position.y = IM_SHIFT;
      this.body.add(this.module.group);
      this.owned.push(this.module);
      this.glow = buildEntryGlow(1.25, { wake: 9, spot: 0.018 });
    } else if (this.kind === 'imFragment') {
      const spec = VOSTOK_IM.pieces.find((p) => p.id === d.name);
      const geo = pieceGeometry(spec, d);
      this.pieceMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(d.visual.color), metalness: 0.55, roughness: 0.5,
        side: THREE.DoubleSide, emissive: 0x000000 });
      // `count` alike pieces flown as one record: a few of them drawn a little apart (the spread is the drawing's)
      const count = Math.min(5, spec?.count ?? 1);
      const reach = 1.2 + 1.5 * Math.max(...(spec?.size ?? [d.visual.diameter]));
      for (let k = 0; k < count; k++) {
        const mesh = new THREE.Mesh(geo, this.pieceMat);
        const h = (x: number) => hash11(d.id * 13.7 + k * 3.1 + x);
        if (k > 0) mesh.position.set((h(0.1) - 0.5) * 2 * reach, (h(0.2) - 0.5) * 2 * reach, (h(0.3) - 0.5) * 2 * reach);
        this.body.add(mesh);
        this.pieces.push({ mesh, axis: randAxis(d.id * 7 + k), rate: 0.8 + 3 * h(0.4), phase: h(0.5) * 6.28 });
      }
      this.owned.push(geo, this.pieceMat);
      const size = Math.max(0.3, Math.max(...(spec?.size ?? [d.visual.diameter])) / 2);
      this.glow = buildEntryGlow(size, { wake: 18, spot: 0.01 });
    } else if (this.kind === 'hatch') {
      // hatch No. 1, 1 m across: its outside charred as the sphere's, its inside bare metal
      const outside = new THREE.MeshStandardMaterial({ color: 0x86847d, roughness: 0.75, metalness: 0.15 });
      const inside = new THREE.MeshStandardMaterial({ color: 0xa9adb2, roughness: 0.4, metalness: 0.6 });
      const geo = new THREE.CylinderGeometry(d.visual.diameter / 2, d.visual.diameter / 2, Math.max(0.06, d.visual.length * 0.5), 28);
      const disc = new THREE.Mesh(geo, [outside, outside, inside]);
      this.body.add(disc);
      this.owned.push(geo, outside, inside);
    } else if (this.kind === 'seat') {
      this.seat = buildEmptySeat();
      this.body.add(this.seat.group);
      this.owned.push(this.seat);
    } else {
      this.pilot = buildCosmonaut();
      this.body.add(this.pilot.group);
      this.owned.push(this.pilot);
    }
    if (this.glow) { this.root.add(this.glow.group); this.owned.push(this.glow); }
  }

  /**
   * Draw `d` at mission time `t`, its point at `pos` (scene), seen from `camera` (scene), when known.
   */
  update(d: DebrisFrame, t: number, pos: THREE.Vector3, camera?: THREE.Vector3): void {
    this.root.position.copy(pos);
    const age = Math.max(0, t - d.createdAt);
    const r = d.r, up = this.up.set(r.x, r.y, r.z).normalize();
    const down = !d.alive;
    // the air it moves through: its velocity less the turning atmosphere's
    const air = this.air.set(d.v.x + OMEGA_EARTH * r.y, d.v.y - OMEGA_EARTH * r.x, d.v.z);
    const airspeed = air.length();
    if (this.kind === 'instrumentModule' && d.rigid) {
      const a = d.rigid.attitudeQ, off = d.rigid.renderOffsetBody;
      this.q.set(a.x, a.y, a.z, a.w);
      this.body.quaternion.copy(this.q).multiply(MODEL_TO_BODY);
      this.body.position.set(off.x, off.y, off.z).applyQuaternion(this.q);
      this.warm(this.module!.materials, d, 0.35);
    } else if (this.kind === 'imFragment') {
      this.body.quaternion.identity();
      for (const p of this.pieces) p.mesh.quaternion.setFromAxisAngle(p.axis, p.phase + age * p.rate);
      const f = Math.cbrt(Math.max(0.02, d.entry?.massFraction ?? 1));
      this.body.scale.setScalar(f);
      this.warm([this.pieceMat!], d, 1);
    } else if (this.kind === 'pilot') {
      this.placePilot(d, up, t);
    } else if (down) {
      // on the ground: the hatch flat, the seat on its back
      this.body.quaternion.setFromUnitVectors(this.kind === 'hatch' ? Y : Z, up);
    } else {
      this.q.setFromUnitVectors(Y, this.axis.set(d.dir.x, d.dir.y, d.dir.z).normalize());
      this.qt.setFromAxisAngle(this.tumbleAxis, age * this.tumbleRate);
      this.body.quaternion.copy(this.q).multiply(this.qt);
    }
    if (this.glow) {
      // (its height: the app draws the return's bodies at their WGS-84 height over the drawn sphere, render/datum.ts)
      let k = down ? 0 : entryGlow(Math.hypot(r.x, r.y, r.z) - R_EARTH, airspeed);
      // a small piece's streak: brighter for its size than a body's shock, and while it melts away
      if (this.kind === 'imFragment') k = Math.min(1, 1.6 * k + (d.entry?.ablating ? 0.35 : 0));
      this.glow.set(k, air);
      if (camera) this.glow.look(this.axis.copy(camera).sub(pos));
    }
  }

  /** Its metal's glow, from the temperature the frame carries. */
  private warm(mats: THREE.MeshStandardMaterial[], d: DebrisFrame, scale: number): void {
    const b = incandescence(d.alive ? d.entry?.temperature ?? 0 : 0, this.hot) * scale;
    for (const m of mats) {
      m.emissive.copy(this.hot);
      m.emissiveIntensity = b;
    }
  }

  /**
   * Gagarin: up his risers along `dir` (the way the drag pulls) while he
   * falls, upright once down; facing the way the exterior camera first looks
   * from, turning slowly a little either way, as a man under a canopy does
   * (the sway is the drawing's).
   */
  private placePilot(d: DebrisFrame, up: THREE.Vector3, t: number): void {
    const crew = d.crew;
    const landed = !d.alive || crew?.phase === 'landed';
    const along = landed ? up : this.axis.set(d.dir.x, d.dir.y, d.dir.z).normalize();
    // the local east and north, and a facing between them (the camera's opening azimuth, render/cameras.ts)
    const east = this.east.set(-up.y, up.x, 0);
    if (east.lengthSq() < 1e-9) east.set(0, 1, 0);
    east.normalize();
    const north = this.north.crossVectors(up, east);
    const az = 0.9 + (landed ? 0.3 : 0.35 * Math.sin(t * 0.11 + d.id));
    const face = this.face.copy(east).multiplyScalar(Math.cos(az)).addScaledVector(north, Math.sin(az));
    face.addScaledVector(along, -face.dot(along));
    if (face.lengthSq() < 1e-9) face.copy(north);
    face.normalize();
    this.basis.makeBasis(this.side.crossVectors(along, face), along, face);
    this.body.quaternion.setFromRotationMatrix(this.basis);
    this.pilot!.update(crew);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.root.clear();
  }
}

function randAxis(id: number): THREE.Vector3 {
  const u = hash11(id * 5.3) * 2 - 1;
  const ph = hash11(id * 2.7 + 1.9) * Math.PI * 2;
  const rr = Math.sqrt(Math.max(0, 1 - u * u));
  return new THREE.Vector3(rr * Math.cos(ph), u, rr * Math.sin(ph)).normalize();
}
