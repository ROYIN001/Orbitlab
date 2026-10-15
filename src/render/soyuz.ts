/**
 * The R-7 family as it looks (roadmap item V04): Blok A tapering from the
 * booster tips down to its engines and topped by the open truss Blok I fires
 * through, the four strap-ons as oblique cones whose tips lean in to meet the
 * core, the aft skirt Blok I sheds after staging, the crewed Soyuz's escape
 * tower and fairing fins, and the frost on the oxygen tanks on the pad.
 *
 * Upgraded 3D engineering geometry: seamless normals and ball-joint nose caps
 * on the strap-ons, ribbed interstage rings, 3D lattice grid fins, 8-plume
 * canted SAS escape motor exhaust, and a high-detail Soyuz MS spacecraft with
 * KTDU-80 nozzle, VSK-4 periscope, segmented solar wings, and docking target.
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
export function r7CoreProfile(R: number, L: number, segments = 48): THREE.Vector2[] {
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
  const g = new THREE.CylinderGeometry(r, r, d.length(), 8, 1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  const positions: number[] = [], normals: number[] = [], index: number[] = [];
  let base = 0;
  for (const g of parts) {
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
    }
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
 * `y0` to `y1`, both rings of radius `r`, plus an intermediate stiffening ring
 * and heat-shield crown on top of Blok A.
 */
export function r7TrussGeometry(r: number, y0: number, y1: number, bays = 14): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const at = (a: number, y: number) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  for (let k = 0; k < bays; k++) {
    const a0 = (k / bays) * Math.PI * 2;
    const a1 = ((k + 0.5) / bays) * Math.PI * 2;
    const a2 = ((k + 1) / bays) * Math.PI * 2;
    parts.push(strut(at(a0, y0), at(a1, y1), 0.055), strut(at(a1, y1), at(a2, y0), 0.055));
  }
  for (const y of [y0, y1]) {
    const ring = new THREE.TorusGeometry(r, 0.072, 8, 48);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, y, 0);
    parts.push(ring);
  }
  // Conical flame deflector cap protecting the top dome of Blok A during hot-staging
  const deflector = new THREE.ConeGeometry(r * 0.92, (y1 - y0) * 0.22, 32, 1, true);
  deflector.translate(0, y0 + (y1 - y0) * 0.11, 0);
  parts.push(deflector);
  return merge(parts);
}

/**
 * Radius of a strap-on `s` of the way up it (0 at its base): a short cylinder
 * holding the kerosene, a smooth shoulder transition, then the long cone of
 * the oxygen tank tapering to a hemispherical ball-joint cap at the tip.
 */
function boosterRadius(r0: number, s: number): number {
  const cone = 0.33, tip = 0.1 * r0;
  if (s <= cone) return r0;
  if (s >= 0.985) {
    // Smooth spherical nose cap closure at the top 1.5% of the strap-on
    const u = (s - 0.985) / 0.015;
    const rAtNeck = r0 + (tip - r0) * (0.985 - cone) / (1 - cone);
    return rAtNeck * Math.sqrt(Math.max(0, 1 - u * u));
  }
  return r0 + (tip - r0) * (s - cone) / (1 - cone);
}

/**
 * A strap-on as an oblique cone, in its own frame (base at y = 0, +X pointing
 * away from the core). Its inner side follows Blok A's taper — `flare` is how
 * far the core's surface moves out over the strap-on's length — so the tip
 * leans in and meets the core at its widest ring, the way the R-7's ball
 * joints carry the thrust. Seam-welded normals eliminate UV-boundary creases.
 */
export function r7BoosterGeometry(r0: number, L: number, flare: number, rings = 44, sides = 32): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], index: number[] = [];
  for (let j = 0; j <= rings; j++) {
    const s = j / rings;
    const r = j === rings ? 0 : boosterRadius(r0, s);
    const rShift = r0 + (0.1 * r0 - r0) * Math.max(0, s - 0.33) / (1 - 0.33);
    const dx = flare * s + (rShift - r0);
    for (let i = 0; i <= sides; i++) {
      const th = (i / sides) * Math.PI * 2;
      pos.push(dx + r * Math.sin(th), s * L, r * Math.cos(th));
      uv.push(i / sides, s);
    }
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < sides; i++) {
      const a = j * (sides + 1) + i, b = a + sides + 1;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  // Separate flat base cap with its own vertices so bottom normals stay crisp
  const baseStart = pos.length / 3;
  pos.push(0, 0, 0);
  uv.push(0.5, 0);
  for (let i = 0; i <= sides; i++) {
    const th = (i / sides) * Math.PI * 2;
    pos.push(r0 * Math.sin(th), 0, r0 * Math.cos(th));
    uv.push(0.5 + 0.5 * Math.sin(th), 0.5 + 0.5 * Math.cos(th));
  }
  for (let i = 0; i < sides; i++) {
    index.push(baseStart, baseStart + 1 + i + 1, baseStart + 1 + i);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();

  // Unify seam normals at i = 0 and i = sides so no vertical lighting crease appears
  const normAttr = g.attributes.normal;
  for (let j = 0; j <= rings; j++) {
    const i0 = j * (sides + 1);
    const i1 = i0 + sides;
    const nx = normAttr.getX(i0) + normAttr.getX(i1);
    const ny = normAttr.getY(i0) + normAttr.getY(i1);
    const nz = normAttr.getZ(i0) + normAttr.getZ(i1);
    const len = Math.hypot(nx, ny, nz) || 1;
    normAttr.setXYZ(i0, nx / len, ny / len, nz / len);
    normAttr.setXYZ(i1, nx / len, ny / len, nz / len);
  }
  normAttr.needsUpdate = true;
  return g;
}

/** Where a strap-on's tip is, in its own frame. */
export function r7BoosterTip(r0: number, L: number, flare: number): THREE.Vector3 {
  return new THREE.Vector3(flare + 0.1 * r0 - r0, L, 0);
}

/** The air rudder on the outer side of a strap-on's base: a swept aerodynamic fin with root fairing. */
export function r7RudderGeometry(r0: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.95, 0.25);
  shape.lineTo(0.95, 1.05);
  shape.lineTo(0, 1.6);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
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

const SKIRT_AFTER = 11.07;

/**
 * Blok I's aft skirt round its engine, in three petals. It rides through the
 * truss during the hot staging and is shed some seconds after Blok A has gone,
 * the petals swinging out and falling behind with radial separation velocity.
 */
export class AftSkirt {
  readonly group = new THREE.Group();
  private readonly petals: THREE.Group[] = [];

  constructor(r: number, height: number, mat: THREE.Material, private readonly after = SKIRT_AFTER) {
    for (let k = 0; k < 3; k++) {
      const mid = (k + 0.5) * (Math.PI * 2 / 3);
      const hinge = new THREE.Group();
      hinge.position.set(Math.sin(mid) * r, 0, Math.cos(mid) * r);
      hinge.rotation.y = mid;
      const geo = new THREE.CylinderGeometry(
        r, r * 0.93, height, 20, 1, true,
        -Math.PI / 3 + 0.03, Math.PI * 2 / 3 - 0.06,
      );
      geo.translate(0, -height / 2, -r);
      const petal = new THREE.Mesh(geo, mat);
      petal.castShadow = true;
      hinge.add(petal);
      this.group.add(hinge);
      this.petals.push(hinge);
    }
  }

  update(sinceIgnition: number): void {
    const tau = sinceIgnition - this.after;
    if (tau <= 0) {
      this.group.visible = true;
      for (const p of this.petals) { p.rotation.x = 0; p.position.y = 0; }
      return;
    }
    this.group.visible = tau < 4;
    const drop = 0.5 * 13 * tau * tau;
    for (const p of this.petals) {
      p.rotation.x = -Math.min(2.2, 1.35 * tau);
      p.position.y = -drop;
    }
  }
}

// ------------------------------------------------------------------ crewed Soyuz: escape tower and fairing fins

export const LES_JETTISON = ESCAPE.towerJettison;
export const FIN_CENTRE = 0.36;

/** Build a 3D lattice grid fin (решётчатый стабилизатор) instead of a flat plane. */
function buildLatticeFinGeometry(w: number, h: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const barR = 0.014;
  const hw = w / 2, hh = h / 2;
  const c00 = new THREE.Vector3(-hw, -hh, 0);
  const c10 = new THREE.Vector3(hw, -hh, 0);
  const c11 = new THREE.Vector3(hw, hh, 0);
  const c01 = new THREE.Vector3(-hw, hh, 0);
  // Outer rectangular frame
  parts.push(
    strut(c00, c10, barR * 1.3),
    strut(c10, c11, barR * 1.3),
    strut(c11, c01, barR * 1.3),
    strut(c01, c00, barR * 1.3),
  );
  // Diagonal cross-grid lattice ribs
  const divs = 4;
  for (let i = 1; i < divs; i++) {
    const t = i / divs;
    const x = -hw + t * w;
    const y = -hh + t * h;
    parts.push(
      strut(new THREE.Vector3(x, -hh, 0), new THREE.Vector3(hw, y, 0), barR * 0.8),
      strut(new THREE.Vector3(-hw, y, 0), new THREE.Vector3(x, hh, 0), barR * 0.8),
      strut(new THREE.Vector3(x, hh, 0), new THREE.Vector3(hw, -y, 0), barR * 0.8),
      strut(new THREE.Vector3(-hw, -y, 0), new THREE.Vector3(x, -hh, 0), barR * 0.8),
    );
  }
  return merge(parts);
}

export class CrewedTop {
  readonly tower = new THREE.Group();
  readonly fins = new THREE.Group();
  private readonly flame: THREE.Mesh;

  constructor(
    fairingR: number,
    fairingLength: number,
    mat: (color: string, metal?: number, rough?: number) => THREE.Material,
    finMat: THREE.Material,
  ) {
    const steel = mat('#b9bdc2', 0.55, 0.45);
    const dark = mat('#3c3f44', 0.4, 0.6);
    const trussH = ESCAPE.tower.truss, motorH = ESCAPE.tower.motor, capH = ESCAPE.tower.cap, motorR = 0.42;

    // 8-member cross-braced adapter truss from fairing nose to SAS motor
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 4; k++) {
      const a0 = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const a1 = ((k + 1) / 4) * Math.PI * 2 + Math.PI / 4;
      const b0 = new THREE.Vector3(Math.cos(a0) * 0.16, 0, Math.sin(a0) * 0.16);
      const t0 = new THREE.Vector3(Math.cos(a0) * motorR * 0.9, trussH, Math.sin(a0) * motorR * 0.9);
      const t1 = new THREE.Vector3(Math.cos(a1) * motorR * 0.9, trussH, Math.sin(a1) * motorR * 0.9);
      parts.push(strut(b0, t0, 0.045), strut(b0, t1, 0.03));
    }
    const adapter = new THREE.Mesh(merge(parts), dark);
    this.tower.add(adapter);

    const motor = new THREE.Mesh(new THREE.CylinderGeometry(motorR, motorR, motorH, 24), steel);
    motor.position.y = trussH + motorH / 2;
    motor.castShadow = true;
    this.tower.add(motor);

    // Upper attitude-control thruster belt near the top of the SAS motor
    const ctrlBelt = new THREE.Mesh(new THREE.CylinderGeometry(motorR * 1.06, motorR * 1.06, 0.18, 24), dark);
    ctrlBelt.position.y = trussH + motorH * 0.92;
    this.tower.add(ctrlBelt);

    // Eight nozzles canted out and down, plus 8 matching canted exhaust plumes
    const nozzleGeo = new THREE.ConeGeometry(0.1, 0.34, 10, 1, true);
    const plumeParts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 8; k++) {
      const angle = -(k / 8) * Math.PI * 2;
      const az = new THREE.Group();
      az.position.y = trussH + motorH * 0.72;
      az.rotation.y = angle;
      const nozzle = new THREE.Mesh(nozzleGeo, dark);
      nozzle.position.x = motorR * 1.05;
      nozzle.rotation.z = 0.47;
      az.add(nozzle);
      this.tower.add(az);

      // Canted plume cone aligned with each nozzle's 0.47 rad outward cant
      const pCone = new THREE.ConeGeometry(0.32, 3.6, 10, 1, true);
      pCone.translate(0, -1.8, 0);
      pCone.rotateZ(0.47);
      pCone.translate(motorR * 1.05, 0, 0);
      pCone.rotateY(angle);
      plumeParts.push(pCone);
    }

    const cap = new THREE.Mesh(new THREE.ConeGeometry(motorR, capH, 24), steel);
    cap.position.y = trussH + motorH + capH / 2;
    this.tower.add(cap);
    this.tower.position.y = fairingLength;

    // Merge the 8 canted plumes into `this.flame` so existing material/visibility logic works seamlessly
    const allPlumes = new THREE.BufferGeometry();
    const pPos: number[] = [], pIdx: number[] = [];
    let pBase = 0;
    for (const pg of plumeParts) {
      const pa = pg.attributes.position;
      for (let i = 0; i < pa.count; i++) pPos.push(pa.getX(i), pa.getY(i), pa.getZ(i));
      const pi = pg.index!;
      for (let i = 0; i < pi.count; i++) pIdx.push(pi.getX(i) + pBase);
      pBase += pa.count;
      pg.dispose();
    }
    allPlumes.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
    allPlumes.setIndex(pIdx);

    this.flame = new THREE.Mesh(
      allPlumes,
      new THREE.MeshBasicMaterial({
        color: 0xffc58a,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.flame.position.y = trussH + motorH * 0.72;
    this.flame.visible = false;
    this.tower.add(this.flame);

    // Four 3D lattice grid fins folded against the fairing's lower part
    const w = fairingR * 0.75, h = fairingLength * 0.16;
    const finGeo = buildLatticeFinGeometry(w, h);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.set(
        Math.cos(a) * (fairingR + 0.08),
        fairingLength * FIN_CENTRE,
        Math.sin(a) * (fairingR + 0.08),
      );
      fin.rotation.y = -a + Math.PI / 2;
      this.fins.add(fin);
    }
  }

  update(sinceLiftoff: number, fairingLength: number): void {
    const tau = sinceLiftoff - LES_JETTISON;
    if (tau <= 0) {
      this.tower.visible = true;
      this.tower.position.set(0, fairingLength, 0);
      this.tower.rotation.set(0, 0, 0);
      this.flame.visible = false;
      return;
    }
    const burn = Math.min(tau, 1.5);
    const up = 0.5 * 60 * burn * burn + 60 * 1.5 * Math.max(0, tau - 1.5) - 0.5 * 25 * tau * tau;
    this.tower.visible = tau < 6;
    this.tower.position.set(0.5 * 6 * tau * tau, fairingLength + up, 0);
    this.tower.rotation.z = -0.35 * tau;
    this.flame.visible = tau < 1.5;
    (this.flame.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - smoothstep(1.1, 1.5, tau));
  }

  dispose(): void {
    this.flame.geometry.dispose();
    (this.flame.material as THREE.Material).dispose();
  }
}

// ------------------------------------------------------------------ Soyuz MS after separation (G07)

export const SOYUZ_MS_LENGTH = 7.48;

/**
 * The Soyuz MS spacecraft as it flies free (roadmap G07): the service module
 * with its KTDU-80 engine bell, radiator band and segmented 4-panel solar wings,
 * the descent module's bell with VSK-4 periscope and windows, and the orbital
 * module's sphere with side hatch, docking target, Kurs antennas and docking probe.
 */
export function buildSoyuzMs(): { group: THREE.Group; height: number; setDeploy(p: number): void; dispose(): void } {
  const g = new THREE.Group();
  const mats: THREE.Material[] = [], geos: THREE.BufferGeometry[] = [];
  const mat = (color: number, metal = 0.2, rough = 0.6, emissive = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough, emissive });
    mats.push(m);
    return m;
  };
  const green = mat(0x5b6457, 0.25, 0.7);
  const olive = mat(0x7c7a66, 0.1, 0.85);
  const grey = mat(0xa3a7ab, 0.5, 0.45);
  const radiatorWhite = mat(0xdce2e6, 0.2, 0.45);
  const panel = mat(0x1b2a6b, 0.6, 0.25, 0x070c24);
  const dark = mat(0x3c3f44, 0.4, 0.6);
  const glass = mat(0x111c2b, 0.85, 0.12, 0x050a12);

  const add = (geo: THREE.BufferGeometry, m: THREE.Material, y: number, parent: THREE.Object3D = g) => {
    geos.push(geo);
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.y = y;
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Service Module (ПАО): KTDU-80 main engine nozzle, flared aft skirt, instrument/propulsion cylinder, white radiator band
  add(new THREE.ConeGeometry(0.24, 0.36, 20, 1, true), dark, 0.08);
  add(new THREE.CylinderGeometry(1.36, 1.1, 0.4, 32), dark, 0.2);
  add(new THREE.CylinderGeometry(1.36, 1.36, 1.55, 32), green, 1.175);
  add(new THREE.CylinderGeometry(1.365, 1.365, 0.75, 32), radiatorWhite, 1.925);
  add(new THREE.CylinderGeometry(1.1, 1.36, 0.3, 32), green, 2.45);

  // Descent Module (СА): headlight bell profile + VSK-4 optical periscope & porthole windows
  const bell = [
    [0, 0], [0.95, 0.02], [1.085, 0.15], [1.07, 0.6],
    [0.95, 1.2], [0.72, 1.8], [0.46, 2.1], [0.36, 2.24], [0, 2.24],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(bell, 36), olive, 2.6);

  // VSK-4 periscope projecting radially from the descent module
  const periscope = add(new THREE.CylinderGeometry(0.06, 0.07, 0.45, 12), grey, 3.55);
  periscope.rotation.z = Math.PI / 2;
  periscope.position.x = 1.08;

  // Two side viewport windows on the descent module
  for (const s of [1, -1]) {
    const win = add(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16), glass, 3.75);
    win.rotation.x = Math.PI / 2;
    win.position.z = s * 0.94;
  }

  // Orbital Module (БО): prolate spheroid + crew side hatch + docking collar, probe & standoff target
  add(new THREE.SphereGeometry(1.1, 32, 22), olive, 6.0).scale.set(1, 1.08, 1);
  const hatch = add(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 20), grey, 6.1);
  hatch.rotation.z = Math.PI / 2;
  hatch.position.x = -1.06;

  add(new THREE.CylinderGeometry(0.62, 0.62, 0.14, 24), dark, 7.1);
  add(new THREE.CylinderGeometry(0.04, 0.14, 0.42, 16), grey, 7.27);

  // Two segmented 4-panel solar wings with root yoke frames
  const wings: THREE.Group[] = [];
  for (const s of [1, -1]) {
    const hinge = new THREE.Group();
    hinge.position.set(s * 1.36, 1.6, 0);

    // Root yoke strut
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.5), grey);
    geos.push(yoke.geometry);
    yoke.position.x = s * 0.18;
    hinge.add(yoke);

    // 4 articulated solar panel segments with subtle gaps and backing frame
    const segLen = 0.98;
    for (let p = 0; p < 4; p++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.028, 1.22), panel);
      geos.push(seg.geometry);
      seg.position.x = s * (0.4 + (p + 0.5) * (segLen + 0.03));
      hinge.add(seg);
    }
    const spine = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.04, 0.08), grey);
    geos.push(spine.geometry);
    spine.position.x = s * 2.35;
    hinge.add(spine);

    g.add(hinge);
    wings.push(hinge);
  }

  // Kurs rendezvous antenna booms on the orbital module
  const booms: THREE.Group[] = [];
  for (const [ax, az] of [[1, 0], [-1, 0], [0, 1]]) {
    const hinge = new THREE.Group();
    hinge.position.set(ax * 1.05, 6.4, az * 1.05);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8), grey);
    geos.push(rod.geometry);
    rod.position.y = 0.7;
    hinge.add(rod);
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.12, 16, 1, true), grey);
    geos.push(dish.geometry);
    dish.position.y = 1.45;
    hinge.add(dish);
    hinge.lookAt(ax * 3, 6.9, az * 3);
    g.add(hinge);
    booms.push(hinge);
  }

  const setDeploy = (p: number) => {
    const k = smoothstep(0.1, 0.7, p);
    for (const [i, w] of wings.entries()) w.rotation.z = (i === 0 ? 1 : -1) * (1 - k) * Math.PI / 2;
    for (const b of booms) b.scale.setScalar(0.2 + 0.8 * smoothstep(0.4, 1, p));
  };
  setDeploy(0);

  return {
    group: g,
    height: SOYUZ_MS_LENGTH,
    setDeploy,
    dispose: () => {
      for (const m of mats) m.dispose();
      for (const x of geos) x.dispose();
    },
  };
}
