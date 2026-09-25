/**
 * The R-7 family as it looks (roadmap item V04): Blok A tapering from the
 * booster tips down to its engines and topped by the open truss Blok I fires
 * through, the four strap-ons as oblique cones whose tips lean in to meet the
 * core, the aft skirt Blok I sheds after staging, the crewed Soyuz's escape
 * tower and fairing fins, and the frost on the oxygen tanks on the pad.
 *
 * Render only: the physics keeps its cylinders and its stacking heights
 * (`stackLayout`), and everything here is drawn inside them. Dimensions are
 * from the published Soyuz-2 figures — Blok A 2.95 m at its widest, 2.05 m at
 * the engines and 2.66 m at the top; the strap-ons 2.68 m at the base, 19.6 m
 * long, their tips level with Blok A's widest ring.
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
  // every part here is an indexed, non-UV-mapped primitive; drop the uv so the
  // attribute sets agree, then concatenate
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
 * it, and its flame is seen through the gaps.
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
  return merge(parts);
}

/**
 * Radius of a strap-on `s` of the way up it (0 at its base): a short cylinder
 * holding the kerosene, then the long cone of the oxygen tank to the tip.
 */
function boosterRadius(r0: number, s: number): number {
  const cone = 0.33, tip = 0.1 * r0;
  return s <= cone ? r0 : r0 + (tip - r0) * (s - cone) / (1 - cone);
}

/**
 * A strap-on as an oblique cone, in its own frame (base at y = 0, +X pointing
 * away from the core). Its inner side follows Blok A's taper — `flare` is how
 * far the core's surface moves out over the strap-on's length — so the tip
 * leans in and meets the core at its widest ring, the way the R-7's ball
 * joints carry the thrust. u runs round it as on a `CylinderGeometry`, v up it.
 */
export function r7BoosterGeometry(r0: number, L: number, flare: number, rings = 40, sides = 28): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], index: number[] = [];
  for (let j = 0; j <= rings; j++) {
    const s = j / rings, r = boosterRadius(r0, s);
    const dx = flare * s + (r - r0);
    for (let i = 0; i <= sides; i++) {
      const th = (i / sides) * Math.PI * 2;
      pos.push(dx + r * Math.sin(th), s * L, r * Math.cos(th));
      uv.push(i / sides, s);
    }
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < sides; i++) {
    const a = j * (sides + 1) + i, b = a + sides + 1;
    index.push(a, a + 1, b, b, a + 1, b + 1);
  }
  // the base, closed
  const c = pos.length / 3;
  pos.push(0, 0, 0); uv.push(0.5, 0);
  for (let i = 0; i < sides; i++) index.push(c, i + 1, i);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Where a strap-on's tip is, in its own frame. */
export function r7BoosterTip(r0: number, L: number, flare: number): THREE.Vector3 {
  return new THREE.Vector3(flare + boosterRadius(r0, 1) - r0, L, 0);
}

/** The air rudder on the outer side of a strap-on's base: a small swept plate. */
export function r7RudderGeometry(r0: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.95, 0.25);
  shape.lineTo(0.95, 1.05);
  shape.lineTo(0, 1.6);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false });
  g.translate(r0 - 0.05, 0.35, -0.035);
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

/** Seconds after Blok A leaves that Blok I drops its aft skirt. */
const SKIRT_AFTER = 10;

/**
 * Blok I's aft skirt round its engine, in three petals. It rides through the
 * truss during the hot staging and is shed ten seconds after Blok A has gone,
 * the petals swinging out and falling behind.
 */
export class AftSkirt {
  readonly group = new THREE.Group();
  private readonly petals: THREE.Group[] = [];

  constructor(r: number, height: number, mat: THREE.Material) {
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

  /**
   * @param sinceBlokA mission time since Blok A separated, s (negative while
   *        it is still attached)
   */
  update(sinceBlokA: number): void {
    const tau = sinceBlokA - SKIRT_AFTER;
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

/** The escape tower is jettisoned at T+114.5 s, forty seconds before the fairing. */
export const LES_JETTISON = 114.5;

/**
 * The launch escape tower (САС) on the crewed fairing's nose, and the four
 * lattice fins folded against the fairing's lower half. The fins go with the
 * fairing; the tower is jettisoned on its own motor, pulling ahead and off to
 * one side. Only the look: the abort itself is roadmap item G06.
 */
/**
 * Where the crewed fairing's lattice fins sit, as a fraction of its length:
 * on the part that leaves in an abort, just above the service module
 * (render/escape.ts cuts the head section there).
 */
export const FIN_CENTRE = 0.36;

export class CrewedTop {
  readonly tower = new THREE.Group();
  readonly fins = new THREE.Group();
  private readonly flame: THREE.Mesh;

  constructor(fairingR: number, fairingLength: number, mat: (color: string, metal?: number, rough?: number) => THREE.Material, finMat: THREE.Material) {
    const steel = mat('#b9bdc2', 0.55, 0.45);
    const dark = mat('#3c3f44', 0.4, 0.6);
    // the adapter truss from the fairing's nose to the motor, then the motor,
    // its ring of canted nozzles and the separation motor's cap
    const trussH = ESCAPE.tower.truss, motorH = ESCAPE.tower.motor, capH = ESCAPE.tower.cap, motorR = 0.42;
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      parts.push(strut(new THREE.Vector3(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12), new THREE.Vector3(Math.cos(a) * motorR * 0.9, trussH, Math.sin(a) * motorR * 0.9), 0.05));
    }
    const adapter = new THREE.Mesh(merge(parts), dark);
    this.tower.add(adapter);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(motorR, motorR, motorH, 20), steel);
    motor.position.y = trussH + motorH / 2;
    motor.castShadow = true;
    this.tower.add(motor);
    // Eight nozzles canted out and down, their throats in toward the motor.
    // Two nested rotations, never two Euler angles on one object (see the
    // grid fins in debris.ts): the azimuth turns local +X radially out, and
    // the cant tips the cone's apex (its throat) up and in.
    const nozzleGeo = new THREE.ConeGeometry(0.1, 0.34, 8, 1, true);
    for (let k = 0; k < 8; k++) {
      const az = new THREE.Group();
      az.position.y = trussH + motorH * 0.72;
      az.rotation.y = -(k / 8) * Math.PI * 2;
      const nozzle = new THREE.Mesh(nozzleGeo, dark);
      nozzle.position.x = motorR * 1.05;
      nozzle.rotation.z = 0.47;
      az.add(nozzle);
      this.tower.add(az);
    }
    const cap = new THREE.Mesh(new THREE.ConeGeometry(motorR, capH, 20), steel);
    cap.position.y = trussH + motorH + capH / 2;
    this.tower.add(cap);
    this.tower.position.y = fairingLength;
    this.flame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffc58a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.flame.position.y = trussH + motorH * 0.72 - 2;
    this.flame.rotation.x = Math.PI;
    this.flame.visible = false;
    this.tower.add(this.flame);

    // four lattice fins, folded along the fairing's lower part
    const w = fairingR * 0.75, h = fairingLength * 0.16;
    const finGeo = new THREE.PlaneGeometry(w, h);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.set(Math.cos(a) * (fairingR + 0.08), fairingLength * FIN_CENTRE, Math.sin(a) * (fairingR + 0.08));
      fin.rotation.y = -a + Math.PI / 2;
      this.fins.add(fin);
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

  dispose(): void {
    (this.flame.material as THREE.Material).dispose();
  }
}
