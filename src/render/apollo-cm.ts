/**
 * Columbia's way home in pictures (roadmap C01): the service module on its own
 * after the separation, and the command module — heat shield first through
 * the entry, then under its two drogues and its three orange-and-white mains.
 *
 * The command module 3.91 m across and 3.23 m tall; the drogues 16.5 ft and
 * the mains 83.3 ft across (Apollo 11 press kit); the risers' lengths and the
 * canopies' shapes from photographs, approximate.
 */
import * as THREE from 'three';

const CM_R = 1.956;
const CM_H = 3.23;
const SM_H = 3.94;
const SPS_BELL = 2.8;
const DROGUE_D = 16.5 * 0.3048;
const MAIN_D = 83.3 * 0.3048;

/** A canopy of diameter `d`, its skirt at the origin and its crown up +Y, in gores of two colours. */
function canopy(d: number, a: THREE.Material, b: THREE.Material, gores: number): THREE.Group {
  const g = new THREE.Group(), r = d / 2;
  for (let i = 0; i < gores; i++) {
    const geo = new THREE.SphereGeometry(r, 3, 8, (i * 2 * Math.PI) / gores, (2 * Math.PI) / gores, 0, Math.PI * 0.42);
    geo.translate(0, -r * Math.cos(Math.PI * 0.42), 0);
    geo.scale(1, 0.75, 1);
    g.add(new THREE.Mesh(geo, i % 2 ? a : b));
  }
  return g;
}

/** Suspension lines from a canopy's skirt (radius `r`, height `h` over the CM) down to the CM's apex. */
function risers(n: number, r: number, h: number, mat: THREE.Material): THREE.LineSegments {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    pts.push(0, CM_H, 0, Math.cos(a) * r, CM_H + h, Math.sin(a) * r);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(geo, mat);
}

export interface EntryCmView {
  group: THREE.Group;
  /** The canopies open, 0..1 each (their drag area's fraction); 0 hides them. */
  setChutes(drogue: number, main: number): void;
  dispose(): void;
}

/**
 * C01: the command module on its own, its group's origin at the heat shield's
 * centre and its apex up +Y: the flight turns it heat shield first into the
 * air, then apex up under the parachutes.
 */
export function buildEntryCm(): EntryCmView {
  const mylar = new THREE.MeshStandardMaterial({ color: 0xd8dbe0, roughness: 0.25, metalness: 0.85 });
  const shield = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.9, metalness: 0.05 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xe0662a, roughness: 0.8, side: THREE.DoubleSide });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.8, side: THREE.DoubleSide });
  const line = new THREE.LineBasicMaterial({ color: 0xcfcac0 });
  const group = new THREE.Group();
  const cm = new THREE.Mesh(new THREE.CylinderGeometry(0.42, CM_R, CM_H, 40), mylar);
  cm.position.y = CM_H / 2;
  const heat = new THREE.Mesh(new THREE.SphereGeometry(CM_R * 2.4, 40, 6, 0, Math.PI * 2, Math.PI - 0.43, 0.43), shield);
  heat.position.y = CM_R * 2.4 * Math.cos(0.43);
  group.add(cm, heat);
  // two drogues side by side on long risers; three mains in a cluster
  const drogues = new THREE.Group();
  for (const x of [-1, 1]) {
    const c = canopy(DROGUE_D, orange, white, 12);
    c.position.set(x * DROGUE_D * 0.55, CM_H + 18, 0);
    drogues.add(c, risers(8, DROGUE_D / 2, 18, line).translateX(x * DROGUE_D * 0.55));
  }
  const mains = new THREE.Group();
  const lift = 42;
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3, off = MAIN_D * 0.5;
    const c = canopy(MAIN_D, orange, white, 20);
    c.position.set(Math.cos(a) * off, CM_H + lift, Math.sin(a) * off);
    c.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
    mains.add(c);
    const r = risers(12, MAIN_D / 2, lift, line);
    r.position.set(Math.cos(a) * off * 0.6, 0, Math.sin(a) * off * 0.6);
    mains.add(r);
  }
  drogues.visible = mains.visible = false;
  group.add(drogues, mains);
  group.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  group.visible = false;
  const setChutes = (drogue: number, main: number): void => {
    drogues.visible = drogue > 0;
    mains.visible = main > 0;
    // a reefed canopy's area is its open fraction: its diameter that fraction's root
    const sd = Math.sqrt(Math.max(0.05, drogue)), sm = Math.sqrt(Math.max(0.05, main));
    drogues.children.forEach((c) => { if (c instanceof THREE.Group) c.scale.set(sd, 1, sd); });
    mains.children.forEach((c) => { if (c instanceof THREE.Group) c.scale.set(sm, 1, sm); });
  };
  return {
    group, setChutes,
    dispose: () => {
      group.traverse((o) => { if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) o.geometry.dispose(); });
      for (const m of [mylar, shield, orange, white, line]) m.dispose();
    },
  };
}

/** C01: the service module on its own after the separation: its group's origin at its forward face, the SPS bell down −Y. */
export function buildServiceModule(): { group: THREE.Group; dispose(): void } {
  const silver = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.3, metalness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.6 });
  const group = new THREE.Group();
  const sm = new THREE.Mesh(new THREE.CylinderGeometry(CM_R, CM_R, SM_H, 40), silver);
  sm.position.y = -SM_H / 2;
  const radiators = new THREE.Mesh(new THREE.CylinderGeometry(CM_R + 0.006, CM_R + 0.006, 0.9, 40, 1, true), dark);
  radiators.position.y = -0.6;
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.25, SPS_BELL, 24, 1, true), dark);
  bell.position.y = -SM_H - SPS_BELL / 2;
  group.add(sm, radiators, bell);
  group.visible = false;
  return {
    group,
    dispose: () => {
      group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
      silver.dispose(); dark.dispose();
    },
  };
}
