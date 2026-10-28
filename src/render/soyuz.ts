/**
 * The R-7 family as it looks (roadmap item V04): Blok A tapering from the
 * booster tips down to its engines and topped by the open truss Blok I fires
 * through, the four strap-ons as oblique cones whose tips lean in to meet the
 * core, the aft skirt Blok I sheds after staging, the crewed Soyuz's escape
 * tower and fairing fins, the frost on the oxygen tanks on the pad, and the
 * Soyuz MS spacecraft once it is out of its fairing (roadmap item G07).
 *
 * Render only: the physics keeps its cylinders and its stacking heights
 * (`stackLayout`), and everything here is drawn inside them. Dimensions are
 * from the published Soyuz-2 figures — Blok A 2.95 m at its widest, 2.05 m at
 * the engines and 2.66 m at the top; the strap-ons 2.68 m at the base, 19.6 m
 * long, their tips level with Blok A's widest ring, each closed by a small
 * dome under its ball joint. The Soyuz MS is 2.72 m across its service module
 * and 10.7 m across its solar wings. The smaller details are drawn to the
 * eye, not to a drawing: the flame deflector at the foot of the truss; the
 * escape tower's braced truss, its eight canted nozzles, each with its own
 * plume when the tower is jettisoned, and the belt of its control motors; the
 * fairing's grid fins as lattices of crossed walls (`gridFinGeometry`, which
 * render/escape.ts draws too); and the Soyuz MS's main engine, windows,
 * periscope, side hatch, four-panel wings and antenna booms.
 */
import * as THREE from 'three';
import { fbm2, smoothstep } from './noise';
import { ESCAPE } from '../physics/rigid/escape';

/** Blok A's radius at its engines, as a share of its widest. */
const CORE_BASE = 2.05 / 2.95;
/** …and at its top, where the truss sits. */
const CORE_TOP = 2.66 / 2.95;
/** Height of the widest ring, where the strap-on tips meet it, as a share of Blok A. */
const CORE_RING = 19.6 / 27.8;
/** Height of the truss drawn inside Blok A's own length, m (the rest is the interstage gap). */
export const R7_TRUSS_INSIDE = 1.0;
/** Gap between a strap-on and the core it hugs, m. */
export const R7_BOOSTER_GAP = 0.06;
/**
 * How far Blok A's surface moves out over a strap-on's length, m: from its
 * 2.05 m base to its 2.95 m ring, which is where the strap-on tips are.
 */
export const R7_FLARE = (2.95 - 2.05) / 2;
/** Blok A's radius at its base, for a core of widest radius `R`. */
export const r7CoreBase = (R: number): number => R * CORE_BASE;
/** Blok A's radius at its top, where the truss stands. */
export const r7CoreTop = (R: number): number => R * CORE_TOP;

/** Blok A's radius `y` metres above its base. */
export function r7CoreRadius(R: number, L: number, y: number): number {
  const ring = CORE_RING * L, shoulder = 0.8 * L, top = L - R7_TRUSS_INSIDE;
  if (y <= ring) return R * (CORE_BASE + (1 - CORE_BASE) * Math.max(0, y) / ring);
  if (y <= shoulder) return R;
  return R * (1 + (CORE_TOP - 1) * Math.min(1, (y - shoulder) / (top - shoulder)));
}

/**
 * Blok A's body, for `LatheGeometry`, sampled evenly in height so the lathe's
 * v runs with the height and the stage's paint lies where it did on the
 * cylinder; closed at both ends.
 */
export function r7CoreProfile(R: number, L: number, segments = 40): THREE.Vector2[] {
  const top = L - R7_TRUSS_INSIDE;
  const pts: THREE.Vector2[] = [new THREE.Vector2(1e-3, 0)];
  for (let i = 0; i <= segments; i++) {
    const y = (i / segments) * top;
    pts.push(new THREE.Vector2(r7CoreRadius(R, L, y), y));
  }
  pts.push(new THREE.Vector2(1e-3, top));
  return pts;
}

/** A thin straight member from `a` to `b`. */
function strut(a: THREE.Vector3, b: THREE.Vector3, r: number): THREE.BufferGeometry {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = new THREE.CylinderGeometry(r, r, d.length(), 6, 1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // every part here is an indexed primitive drawn untextured; drop the uv so
  // the attribute sets agree, then concatenate (what this returns has no uv,
  // so it cannot carry a texture)
  const out = new THREE.BufferGeometry();
  const positions: number[] = [], normals: number[] = [], index: number[] = [];
  let base = 0;
  for (const g of parts) {
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { positions.push(p.getX(i), p.getY(i), p.getZ(i)); normals.push(n.getX(i), n.getY(i), n.getZ(i)); }
    const idx = g.index;
    if (idx) for (let i = 0; i < idx.count; i++) index.push(idx.getX(i) + base);
    else for (let i = 0; i < p.count; i++) index.push(i + base);
    base += p.count;
    g.dispose();
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setIndex(index);
  return out;
}

/**
 * The open lattice between Blok A and Blok I: a ring of diagonal struts from
 * `y0` to `y1`, both rings of radius `r`. Blok I lights while it is still on
 * it, and its flame is seen through the gaps. At its foot, on Blok A's top,
 * stands the cone-shaped deflector that turns that flame aside ("a special
 * cone-shaped, titanium-covered deflector above the instrument section",
 * https://russianspaceweb.com/soyuz_lv_stage2.html); its size is the eye's.
 */
export function r7TrussGeometry(r: number, y0: number, y1: number, bays = 14): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const at = (a: number, y: number) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  for (let k = 0; k < bays; k++) {
    const a0 = (k / bays) * Math.PI * 2, a1 = ((k + 0.5) / bays) * Math.PI * 2, a2 = ((k + 1) / bays) * Math.PI * 2;
    parts.push(strut(at(a0, y0), at(a1, y1), 0.055), strut(at(a1, y1), at(a2, y0), 0.055));
  }
  for (const y of [y0, y1]) {
    const ring = new THREE.TorusGeometry(r, 0.07, 6, 48);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, y, 0);
    parts.push(ring);
  }
  const deflector = new THREE.ConeGeometry(r * 0.92, (y1 - y0) * 0.22, 24, 1, true);
  deflector.translate(0, y0 + (y1 - y0) * 0.11, 0);
  parts.push(deflector);
  return merge(parts);
}

/** Share of a strap-on's length that is the kerosene tank's cylinder; above it, the oxygen tank's cone. */
const BOOSTER_CONE = 0.33;
/** The cone's radius at the top, as a share of the base's: the ball joint's place (`r7BoosterTip`). */
const BOOSTER_TIP = 0.1;
/** Where the dome that closes the tip starts, as a share of the length: the last 0.29 m of a 19.6 m strap-on. */
const BOOSTER_NECK = 0.985;
/** Rings across that dome, below its apex. */
const DOME_RINGS = 4;

/**
 * Radius of a strap-on `s` of the way up it (0 at its base): a short cylinder
 * holding the kerosene, then the long cone of the oxygen tank to the tip,
 * its last stretch rounded off into a dome. The dome is the cone's radius
 * times a quarter ellipse, so it leaves the cone with no kink at the neck and
 * closes to nothing at `s` = 1.
 */
function boosterRadius(r0: number, s: number): number {
  if (s <= BOOSTER_CONE) return r0;
  const r = r0 + (BOOSTER_TIP * r0 - r0) * (s - BOOSTER_CONE) / (1 - BOOSTER_CONE);
  const u = (s - BOOSTER_NECK) / (1 - BOOSTER_NECK);
  return u <= 0 ? r : r * Math.sqrt(Math.max(0, 1 - u * u));
}

/**
 * A strap-on as an oblique cone, in its own frame (base at y = 0, +X pointing
 * away from the core). Its inner side follows Blok A's taper — `flare` is how
 * far the core's surface moves out over the strap-on's length — so the tip
 * leans in and meets the core at its widest ring, the way the R-7's ball
 * joints carry the thrust. Every ring is set in from the axis by as much as
 * its radius has shrunk, so the inner side runs straight on up the taper to
 * the apex and the dome closes onto the core, not about the axis. u runs
 * round it as on a `CylinderGeometry`, v up it.
 */
export function r7BoosterGeometry(r0: number, L: number, flare: number, rings = 40, sides = 28): THREE.BufferGeometry {
  // the rings' heights: evenly to the dome's neck, then at even steps of the
  // ellipse's angle over the dome, and the apex
  const heights: number[] = [];
  for (let j = 0; j / rings < BOOSTER_NECK; j++) heights.push(j / rings);
  for (let k = 0; k < DOME_RINGS; k++) heights.push(BOOSTER_NECK + (1 - BOOSTER_NECK) * Math.sin((k / DOME_RINGS) * Math.PI / 2));
  heights.push(1);
  const pos: number[] = [], uv: number[] = [], index: number[] = [];
  for (const s of heights) {
    const r = boosterRadius(r0, s), dx = flare * s + (r - r0);
    for (let i = 0; i <= sides; i++) {
      const th = (i / sides) * Math.PI * 2;
      pos.push(dx + r * Math.sin(th), s * L, r * Math.cos(th));
      uv.push(i / sides, s);
    }
  }
  const rows = heights.length;
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < sides; i++) {
    const a = j * (sides + 1) + i, b = a + sides + 1;
    index.push(a, a + 1, b, b, a + 1, b + 1);
  }
  // the base, closed on a ring of its own so its rim stays a sharp edge; at
  // v = 0, the paint's bottom row, below the frost
  const c = pos.length / 3;
  pos.push(0, 0, 0); uv.push(0.5, 0);
  for (let i = 0; i <= sides; i++) {
    const th = (i / sides) * Math.PI * 2;
    pos.push(r0 * Math.sin(th), 0, r0 * Math.cos(th));
    uv.push(i / sides, 0);
  }
  for (let i = 0; i < sides; i++) index.push(c, c + 2 + i, c + 1 + i);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  // u = 0 and u = 1 are two vertices in one place, each lit by the faces on
  // its own side only: weld their normals so the seam does not light as a
  // crease. At the apex, where the last quads' second triangles have no area,
  // the u = 1 vertex has no faces of its own and takes the u = 0 one's.
  const n = g.attributes.normal as THREE.BufferAttribute;
  const w = new THREE.Vector3(), m = new THREE.Vector3();
  for (let j = 0; j < rows; j++) {
    const i0 = j * (sides + 1), i1 = i0 + sides;
    w.fromBufferAttribute(n, i0).add(m.fromBufferAttribute(n, i1)).normalize();
    n.setXYZ(i0, w.x, w.y, w.z);
    n.setXYZ(i1, w.x, w.y, w.z);
  }
  return g;
}

/**
 * Where a strap-on's ball joint is, in its own frame: at the top,
 * `BOOSTER_TIP`·r0 out from the end of its inner side, so a ball of about
 * that radius there sits over the dome and bears on Blok A's widest ring.
 */
export function r7BoosterTip(r0: number, L: number, flare: number): THREE.Vector3 {
  return new THREE.Vector3(flare + (BOOSTER_TIP - 1) * r0, L, 0);
}

/** The air rudder on the outer side of a strap-on's base: a small swept plate, its edges rounded. */
export function r7RudderGeometry(r0: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.95, 0.25);
  shape.lineTo(0.95, 1.05);
  shape.lineTo(0, 1.6);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
  g.translate(r0 - 0.05, 0.35, -0.03);
  return g;
}

// ------------------------------------------------------------------ frost

/**
 * Frost on an oxygen tank: an alpha map (read from the green channel) that is
 * zero outside the band `[v0, v1]` of the body's height and noisy inside it,
 * so that raising the material's `alphaTest` threshold makes it flake away in
 * patches rather than fade as a whole.
 */
function frostMap(v0: number, v1: number, seed: number): THREE.Texture {
  const W = 128, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const v = 1 - y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      // periodic in u, so the seam of the wrap does not show
      const n = fbm2(Math.cos(u * Math.PI * 2) * 3 + seed, v * 24 + Math.sin(u * Math.PI * 2) * 3, 4);
      const edge = 0.02 + 0.03 * fbm2(u * 9 + seed, v * 3, 2);
      const band = smoothstep(v0 - edge, v0 + edge, v) * (1 - smoothstep(v1 - edge, v1 + edge, v));
      const a = band * (0.12 + 0.88 * Math.min(1, Math.max(0, n)));
      const k = (y * W + x) * 4;
      const val = Math.round(a * 255);
      img.data[k] = val; img.data[k + 1] = val; img.data[k + 2] = val; img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** Mission time after liftoff by which the frost is gone, s. */
const FROST_GONE = 28;

/**
 * A coat of frost laid over a body's own geometry, on its oxygen tank. It is
 * all there until liftoff and falls away over the first half-minute of flight.
 */
export class FrostCoat {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.MeshStandardMaterial;
  readonly texture: THREE.Texture;

  constructor(geometry: THREE.BufferGeometry, v0: number, v1: number, seed: number) {
    this.texture = frostMap(v0, v1, seed);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xf2f6fa, roughness: 0.92, metalness: 0, alphaMap: this.texture, alphaTest: 0.02,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 1;
  }

  /** @param sinceLiftoff mission time since liftoff, s (negative on the pad) */
  update(sinceLiftoff: number): void {
    // kept above zero throughout, so the alpha-test define never toggles
    const threshold = 0.02 + 1.0 * smoothstep(0, FROST_GONE, sinceLiftoff);
    this.material.alphaTest = threshold;
    this.mesh.visible = threshold < 1;
  }

  dispose(): void {
    this.material.dispose();
    this.texture.dispose();
  }
}

// ------------------------------------------------------------------ Blok I aft skirt

/**
 * Seconds after its stage lights that Blok I drops its aft skirt, where the
 * stage does not say (`StageSpec.jettisons`, an `aftSkirt`, timed from the
 * same ignition): 11.07 s, Vostok-K's Blok E, which lights as its core goes.
 */
const SKIRT_AFTER = 11.07;

/**
 * Blok I's aft skirt round its engine, in three petals. It rides through the
 * truss during the hot staging and is shed some seconds after Blok A has gone,
 * the petals swinging out and falling behind.
 */
export class AftSkirt {
  readonly group = new THREE.Group();
  private readonly petals: THREE.Group[] = [];
  /** the skirt as another drawing has it (the Soyuz Anatomy model's, render/anatomy.ts), drawn instead of the petals and falling as they would */
  private cover: THREE.Object3D | null = null;

  /** @param after seconds after its stage lights that it falls away, as the stage's physics drops it */
  constructor(r: number, height: number, mat: THREE.Material, private readonly after = SKIRT_AFTER) {
    for (let k = 0; k < 3; k++) {
      const mid = (k + 0.5) * (Math.PI * 2 / 3);
      // hinge on the top edge at the middle of the petal
      const hinge = new THREE.Group();
      hinge.position.set(Math.sin(mid) * r, 0, Math.cos(mid) * r);
      hinge.rotation.y = mid;
      const geo = new THREE.CylinderGeometry(r, r * 0.93, height, 16, 1, true, -Math.PI / 3 + 0.03, Math.PI * 2 / 3 - 0.06);
      geo.translate(0, -height / 2, -r);
      const petal = new THREE.Mesh(geo, mat);
      petal.castShadow = true;
      hinge.add(petal);
      this.group.add(hinge);
      this.petals.push(hinge);
    }
  }

  /** Paint the petals with `material` (the Soyuz Anatomy model's stage paint, where the model has no skirt of its own). */
  repaint(material: THREE.Material): void {
    for (const hinge of this.petals) for (const petal of hinge.children) (petal as THREE.Mesh).material = material;
  }

  /** Draw the skirt as `shape` instead of the petals: on until it is shed, then falling away as the petals do, whole. */
  coverWith(shape: THREE.Object3D): void {
    this.cover = shape;
    for (const p of this.petals) p.visible = false;
  }

  /**
   * @param sinceIgnition mission time since its stage lit, s, once Blok A has
   *        separated (negative while Blok A is still attached)
   */
  update(sinceIgnition: number): void {
    const tau = sinceIgnition - this.after;
    if (this.cover) {
      this.cover.visible = tau < 4;
      this.cover.position.y = tau > 0 ? -0.5 * 13 * tau * tau : 0;
    }
    if (tau <= 0) {
      this.group.visible = true;
      for (const p of this.petals) { p.rotation.x = 0; p.position.y = 0; }
      return;
    }
    this.group.visible = tau < 4;
    // Blok I pulls away at about 1.3 g while the petals only tumble open
    const drop = 0.5 * 13 * tau * tau;
    for (const p of this.petals) {
      p.rotation.x = -Math.min(1.9, 1.2 * tau);
      p.position.y = -drop;
    }
  }
}

// ------------------------------------------------------------------ crewed Soyuz: escape tower and fairing fins

/** The escape tower is jettisoned at T+113.5 s, forty seconds before the fairing: the physics' own time. */
export const LES_JETTISON = ESCAPE.towerJettison;

/**
 * Where the crewed fairing's lattice fins sit (their centres), as a fraction
 * of its length: hinged at their top edges on the part that leaves in an
 * abort, just above the service module (render/escape.ts cuts the head
 * section there).
 */
export const FIN_CENTRE = 0.36;

/** A grid fin's frame, m: its members' width in the lattice's plane. */
const GRID_FRAME = 0.05;
/** …the walls' thickness, and the depth of frame and walls along the flow once the fin is open. */
const GRID_WALL = 0.02, GRID_DEPTH = 0.12;
/** Cells across a grid fin's width. */
const GRID_CELLS = 6;

/**
 * A lattice (grid) fin `w` wide and `h` tall, in its own frame: the lattice
 * in the XY plane and `GRID_DEPTH` deep along Z, the flow's direction once
 * the fin is open. A rectangular frame round two families of parallel walls
 * at ±45°, which cross in square cells standing on a corner, as on the Soyuz
 * fairing's fins (photographs:
 * https://commons.wikimedia.org/wiki/Category:Soyuz_Launch_Escape_System);
 * the cell count is the eye's. Closed boxes, so it reads as a lattice from
 * any side; it has no uv (`merge`), so it is drawn in a plain metal. Both
 * the stack (`CrewedTop`) and the abort (render/escape.ts) draw their fins
 * with it.
 */
export function gridFinGeometry(w: number, h: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const bar = (length: number, width: number, x: number, y: number, angle: number) => {
    const g = new THREE.BoxGeometry(length, width, GRID_DEPTH);
    g.rotateZ(angle);
    g.translate(x, y, 0);
    parts.push(g);
  };
  // the frame, its members' centrelines on the rectangle ±hw by ±hh
  const hw = (w - GRID_FRAME) / 2, hh = (h - GRID_FRAME) / 2;
  for (const s of [-1, 1]) {
    bar(w, GRID_FRAME, 0, s * hh, 0);
    bar(h - 2 * GRID_FRAME, GRID_FRAME, s * hw, 0, Math.PI / 2);
  }
  // the walls: lines through (c, 0) along (1, ±1), `pitch` apart where they
  // cross the middle, each running to the frame's centreline, where its
  // square-cut end is hidden in the frame (a wall no thicker than the frame)
  const pitch = (2 * hw) / GRID_CELLS, K = Math.ceil((hw + hh) / pitch);
  for (let k = -K; k <= K; k++) {
    const c = k * pitch;
    const t0 = Math.max(-hw - c, -hh), t1 = Math.min(hw - c, hh);
    if (t1 - t0 <= GRID_FRAME) continue;
    const t = (t0 + t1) / 2;
    for (const s of [-1, 1]) bar((t1 - t0) * Math.SQRT2, GRID_WALL, c + t, s * t, s * Math.PI / 4);
  }
  return merge(parts);
}

/** The escape tower's eight main nozzles: their cant out from the axis, rad, and their length, m. */
const SAS_CANT = 0.47, SAS_NOZZLE = 0.34;
/** How far below the tip of the fairing's nose the escape tower's truss stands, m: its feet on the nose, not over it. */
const TRUSS_FOOT = 0.07;

/**
 * The launch escape tower (САС) on the crewed fairing's nose, and the four
 * lattice fins folded against the fairing's lower half. The fins go with the
 * fairing; the tower is jettisoned on its own motor, pulling ahead and off to
 * one side. Only the look: the abort itself is roadmap item G06
 * (render/escape.ts, which draws this tower and hangs its plumes on `exits`
 * and `control`).
 */
export class CrewedTop {
  readonly tower = new THREE.Group();
  readonly fins = new THREE.Group();
  /** the eight main nozzles' exits, each frame's −Y pointing down its nozzle's canted axis */
  readonly exits: THREE.Group[] = [];
  /** the control motors' belt at +X, the frame's −Y pointing out from it */
  readonly control = new THREE.Group();
  private readonly flame: THREE.Mesh;
  /** the ring the flame leaves from: its nozzles' exits' height in the tower and distance from its axis */
  private readonly flameRing: { y: number; r: number };
  /** every geometry made here, for `dispose`: render/escape.ts frees only its own */
  private readonly geometries: THREE.BufferGeometry[] = [];

  /**
   * @param fairingR the fairing's radius, m
   * @param fairingLength its length: the tower stands on its nose, m
   * @param mat the stack's material for a colour, metalness and roughness
   * @param finMat the fins': a plain metal, as `gridFinGeometry` has no uv
   */
  constructor(fairingR: number, fairingLength: number, mat: (color: string, metal?: number, rough?: number) => THREE.Material, finMat: THREE.Material) {
    const steel = mat('#b9bdc2', 0.55, 0.45);
    const dark = mat('#3c3f44', 0.4, 0.6);
    const own = <G extends THREE.BufferGeometry>(g: G): G => { this.geometries.push(g); return g; };
    // the adapter truss from the fairing's nose to the motor, then the motor,
    // its ring of canted nozzles and the separation motor's cap
    const trussH = ESCAPE.tower.truss, motorH = ESCAPE.tower.motor, capH = ESCAPE.tower.cap, motorR = 0.42;
    // Four legs, each braced to the next one's top. Their feet stand on the
    // nose: the crewed fairing's 1.3 m nose is 0.32 m across 5 cm below its tip.
    const node = (k: number, r: number, y: number) => {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    };
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 4; k++) {
      const foot = node(k, 0.16, -TRUSS_FOOT);
      parts.push(strut(foot, node(k, motorR * 0.9, trussH), 0.045), strut(foot, node(k + 1, motorR * 0.9, trussH), 0.03));
    }
    const adapter = new THREE.Mesh(own(merge(parts)), dark);
    this.tower.add(adapter);
    const motor = new THREE.Mesh(own(new THREE.CylinderGeometry(motorR, motorR, motorH, 20)), steel);
    motor.position.y = trussH + motorH / 2;
    motor.castShadow = true;
    this.tower.add(motor);
    // The belt of its four small control motors ("четыре небольших
    // управляющих РДТТ", https://ru.wikipedia.org/wiki/Система_аварийного_спасения_экипажа_РН_«Союз»)
    // at the motor's top, where the physics puts their push (`ESCAPE.tower.controlX`).
    const beltR = motorR * 1.06, controlY = trussH + motorH;
    const belt = new THREE.Mesh(own(new THREE.CylinderGeometry(beltR, beltR, 0.18, 20)), dark);
    belt.position.y = controlY;
    this.tower.add(belt);
    this.control.position.set(beltR, controlY, 0);
    this.control.rotation.z = Math.PI / 2;
    this.tower.add(this.control);
    // Eight nozzles canted out and down, their throats in toward the motor.
    // Two nested rotations, never two Euler angles on one object (see the
    // grid fins in debris.ts): the azimuth turns local +X radially out, and
    // the cant tips the cone's apex (its throat) up and in. Each nozzle
    // carries a frame at its exit, so a plume hung there leaves it along the
    // nozzle's own axis.
    const nozzleGeo = own(new THREE.ConeGeometry(0.1, SAS_NOZZLE, 8, 1, true));
    for (let k = 0; k < 8; k++) {
      const az = new THREE.Group();
      az.position.y = trussH + motorH * 0.72;
      az.rotation.y = -(k / 8) * Math.PI * 2;
      const nozzle = new THREE.Mesh(nozzleGeo, dark);
      nozzle.position.x = motorR * 1.05;
      nozzle.rotation.z = SAS_CANT;
      const exit = new THREE.Group();
      exit.position.y = -SAS_NOZZLE / 2;
      nozzle.add(exit);
      az.add(nozzle);
      this.tower.add(az);
      this.exits.push(exit);
    }
    const cap = new THREE.Mesh(own(new THREE.ConeGeometry(motorR, capH, 20)), steel);
    cap.position.y = trussH + motorH + capH / 2;
    this.tower.add(cap);
    // The jettison's fire: from each exit a plume down its nozzle's axis,
    // widening from the exit's radius, the eight in one mesh. The tower is
    // still at its own origin here, so the exits' world matrices are their
    // places in it.
    const plume = new THREE.CylinderGeometry(0.1, 0.4, 3.6, 8, 1, true);
    plume.translate(0, -1.8, 0);
    this.tower.updateMatrixWorld(true);
    const exit = this.exits[0].getWorldPosition(new THREE.Vector3());
    this.flameRing = { y: exit.y, r: Math.hypot(exit.x, exit.z) };
    this.flame = new THREE.Mesh(own(merge(this.exits.map((e) => plume.clone().applyMatrix4(e.matrixWorld)))),
      new THREE.MeshBasicMaterial({ color: 0xffc58a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    plume.dispose();
    this.flame.visible = false;
    this.tower.add(this.flame);
    this.tower.position.y = fairingLength;

    // four lattice fins, folded along the fairing's lower part
    const w = fairingR * 0.75, h = fairingLength * 0.16;
    const finGeo = own(gridFinGeometry(w, h));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.set(Math.cos(a) * (fairingR + 0.08), fairingLength * FIN_CENTRE, Math.sin(a) * (fairingR + 0.08));
      fin.rotation.y = -a + Math.PI / 2;
      this.fins.add(fin);
    }
  }

  /**
   * Draw the tower as `shape` (the Soyuz Anatomy model's, render/anatomy.ts),
   * its base on the tower's origin, and leave the fins to the fairing that
   * model draws: this tower's own shape hidden, its jettison fire kept, moved
   * onto `jets` (the model's jettison nozzles' ring) where it has them.
   */
  replaceShape(shape: THREE.Object3D, jets: { y: number; r: number } | null = null): void {
    for (const child of this.tower.children) if (child !== this.flame) child.visible = false;
    this.fins.visible = false;
    this.tower.add(shape);
    if (jets) {
      const k = jets.r / this.flameRing.r;
      this.flame.scale.set(k, 1, k);
      this.flame.position.y = jets.y - this.flameRing.y;
    }
  }

  /**
   * @param sinceLiftoff mission time since liftoff, s
   * @param fairingLength the fairing's length: the tower stands on its nose, m
   */
  update(sinceLiftoff: number, fairingLength: number): void {
    const tau = sinceLiftoff - LES_JETTISON;
    if (tau <= 0) {
      this.tower.visible = true;
      this.tower.position.set(0, fairingLength, 0);
      this.tower.rotation.set(0, 0, 0);
      this.flame.visible = false;
      return;
    }
    // about 6 g of its own for a second and a half, then coasting, pulled
    // aside by its canted thrust
    const burn = Math.min(tau, 1.5);
    const up = 0.5 * 60 * burn * burn + 60 * 1.5 * Math.max(0, tau - 1.5) - 0.5 * 25 * tau * tau;
    this.tower.visible = tau < 6;
    this.tower.position.set(0.5 * 6 * tau * tau, fairingLength + up, 0);
    this.tower.rotation.z = -0.35 * tau;
    this.flame.visible = tau < 1.5;
    (this.flame.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - smoothstep(1.1, 1.5, tau));
  }

  /** Frees the geometries and the flame's material; the other materials are the caller's. */
  dispose(): void {
    for (const g of this.geometries) g.dispose();
    (this.flame.material as THREE.Material).dispose();
  }
}

// ------------------------------------------------------------------ Soyuz MS after separation (G07)

/**
 * The Soyuz MS's two solar wings, on `parent` with the service module's aft
 * end at `aft` along +Y: a yoke from the hinge, four panels with gaps between
 * them, and a spine under them, 3.99 m from the hull to the tip. Stowed, they
 * stand up its side clear of the periscope. Returns their unfolding, 0
 * (stowed) to 1 (out); render/anatomy.ts hangs them on the Anatomy
 * model's service module, whose own arrays are drawn folded.
 */
/** How far up the service module from its aft end the Soyuz MS's wings are hinged in `soyuzMsWings`, m. */
export const SOYUZ_MS_HINGE = 1.6;

export function soyuzMsWings(parent: THREE.Object3D, aft: number, grey: THREE.Material, panel: THREE.Material, geos: THREE.BufferGeometry[]): (k: number) => void {
  const wings: THREE.Group[] = [];
  const box = (sx: number, sy: number, sz: number, m: THREE.Material, x: number, hinge: THREE.Object3D) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    geos.push(b.geometry);
    b.position.x = x;
    hinge.add(b);
  };
  for (const s of [1, -1]) {
    const hinge = new THREE.Group();
    hinge.position.set(s * 1.36, aft + SOYUZ_MS_HINGE, 0);
    box(0.36, 0.04, 0.5, grey, s * 0.18, hinge);
    for (let p = 0; p < 4; p++) box(0.87, 0.028, 1.22, panel, s * (0.4 + (p + 0.5) * 0.9), hinge);
    box(3.68, 0.04, 0.08, grey, s * 2.14, hinge);
    parent.add(hinge);
    wings.push(hinge);
  }
  return (k: number) => { for (const [i, w] of wings.entries()) w.rotation.z = (i === 0 ? 1 : -1) * (1 - k) * Math.PI / 2; };
}

/** The spacecraft's length, service module to the probe's tip, m. */
export const SOYUZ_MS_LENGTH = 7.48;

/**
 * The Soyuz MS spacecraft as it flies free (roadmap G07): the service module
 * with its radiator band, its main engine's bell in its aft end and its two
 * solar wings of four panels on a yoke and a spine, 10.7 m across
 * (https://en.wikipedia.org/wiki/Soyuz_MS); the descent module's bell with
 * the VSK-4 periscope and two windows; the orbital module's sphere with its
 * side hatch, the docking probe on top and three antenna booms for the Kurs
 * rendezvous radio, their number and places the eye's. The docking target the periscope is lined
 * up on belongs to the station, not the ship. Built along +Y from the service
 * module's aft end, and centred on the group's origin, as render/satellite.ts
 * centres every payload, so that render/rocket.ts stands its aft end on the
 * stage; `setDeploy` unfolds the wings and the antennas as `p` goes from 0 to
 * 1 (render/rocket.ts: over the 14 s after separation).
 */
export function buildSoyuzMs(): { group: THREE.Group; height: number; setDeploy(p: number): void; dispose(): void } {
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = -SOYUZ_MS_LENGTH / 2;
  g.add(body);
  const mats: THREE.Material[] = [], geos: THREE.BufferGeometry[] = [];
  const mat = (color: number, metal = 0.2, rough = 0.6, emissive = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough, emissive });
    mats.push(m);
    return m;
  };
  const green = mat(0x5b6457, 0.25, 0.7), olive = mat(0x7c7a66, 0.1, 0.85), grey = mat(0xa3a7ab, 0.5, 0.45);
  const panel = mat(0x1b2a6b, 0.6, 0.25, 0x070c24), dark = mat(0x3c3f44, 0.4, 0.6);
  const white = mat(0xdce2e6, 0.2, 0.45), glass = mat(0x111c2b, 0.85, 0.12, 0x050a12);
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, y: number, parent: THREE.Object3D = body) => {
    geos.push(geo);
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.y = y;
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const lathe = (pts: number[][]) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 32);
  // service module: the aft end, a rim round a bulkhead set in (by eye) with
  // the main engine's bell inside it, so that nothing reaches past the aft end
  // into the stage below; the body, the radiator band, the shoulder to the
  // descent module
  add(lathe([[0, 0.25], [0.95, 0.25], [0.95, 0], [1.1, 0], [1.36, 0.4]]), dark, 0);
  add(new THREE.ConeGeometry(0.24, 0.3, 16, 1, true), dark, 0.17);
  add(new THREE.CylinderGeometry(1.36, 1.36, 1.55, 32), green, 1.175);
  add(new THREE.CylinderGeometry(1.365, 1.365, 0.75, 32), white, 1.925);
  add(new THREE.CylinderGeometry(1.1, 1.36, 0.3, 32), green, 2.45);
  // the descent module's bell, heat shield down, and the orbital module's sphere
  const bell = [[0, 0], [0.95, 0.02], [1.085, 0.15], [1.07, 0.6], [0.95, 1.2], [0.72, 1.8], [0.46, 2.1], [0.36, 2.24], [0, 2.24]];
  add(lathe(bell), olive, 2.6);
  // the VSK-4 periscope's head, out of the bell's side 0.95 m up it (the bell is 1.0 m in radius there)
  const periscope = add(new THREE.CylinderGeometry(0.06, 0.07, 0.45, 8), grey, 3.55);
  periscope.rotation.z = Math.PI / 2;
  periscope.position.x = 1.08;
  // two windows, centred on the bell's side 1.15 m up it (0.96 m in radius),
  // square to it where it leans in by atan(0.2)
  const lean = Math.atan(0.2);
  for (const s of [1, -1]) {
    const win = add(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 12), glass, 3.75);
    win.rotation.x = s * (Math.PI / 2 - lean);
    win.position.z = s * 0.96;
  }
  add(new THREE.SphereGeometry(1.1, 28, 18), olive, 6.0).scale.set(1, 1.08, 1);
  // the side hatch the crew boards by on the pad, on the −Z side, which no
  // antenna boom stands on
  const hatch = add(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 16), grey, 6.1);
  hatch.rotation.x = Math.PI / 2;
  hatch.position.z = -1.06;
  // the docking probe and the hatch ring
  add(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 24), dark, 7.1);
  add(new THREE.CylinderGeometry(0.05, 0.14, 0.42, 12), grey, 7.27);
  const unfoldWings = soyuzMsWings(body, 0, grey, panel, geos);
  const booms: THREE.Group[] = [];
  for (const [ax, az] of [[1, 0], [-1, 0], [0, 1]]) {
    const hinge = new THREE.Group();
    hinge.position.set(ax * 1.02, 6.4, az * 1.02);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), grey);
    geos.push(rod.geometry);
    rod.position.y = 0.7;
    hinge.add(rod);
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.12, 12, 1, true), grey);
    geos.push(dish.geometry);
    dish.position.y = 1.45;
    hinge.add(dish);
    // the boom (along the hinge's +Y) out from the hull and 14° up; not
    // `lookAt`, which aims an object's +Z and so stood the boom up and in,
    // over the docking ring
    hinge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(ax * 1.95, 0.5, az * 1.95).normalize());
    body.add(hinge);
    booms.push(hinge);
  }
  const setDeploy = (p: number) => {
    const k = smoothstep(0.1, 0.7, p);
    unfoldWings(k);
    for (const b of booms) b.scale.setScalar(0.2 + 0.8 * smoothstep(0.4, 1, p));
  };
  setDeploy(0);
  return { group: g, height: SOYUZ_MS_LENGTH, setDeploy, dispose: () => { for (const m of mats) m.dispose(); for (const x of geos) x.dispose(); } };
}
