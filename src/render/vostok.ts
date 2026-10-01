/**
 * Vostok's instrument module as drawn, one model for every place it appears:
 * on the spacecraft in orbit (render/satellite.ts), on the sphere through the
 * retro burn and until the cables part (render/escape.ts), and tumbling on its
 * own to its break-up (render/debris.ts).
 *
 * Two cones base to base, 2.43 m across at the waist and 2.25 m long (GCTC,
 * as src/physics/sim/module-entry.ts has it), the narrower end in the
 * sphere's cradle; the ring of spherical gas bottles round its top and the
 * louvred radiator on its lower cone; the TDU-1's chamber
 * and its four steering nozzles at the far end. The proportions, the
 * bottles' number and the colours are the drawing's.
 *
 * Model axes: the end in the sphere's cradle at y = 0, the module along +Y,
 * the engine's nozzle at `IM_NOZZLE_Y` firing towards +Y.
 */
import * as THREE from 'three';

/** Length of the module's body, m (GCTC). */
export const IM_LENGTH = 2.25;
/** Diameter at its waist, m (GCTC). */
export const IM_DIAMETER = 2.43;
/** Where the TDU-1's nozzle ends, m along +Y. */
export const IM_NOZZLE_Y = IM_LENGTH + 0.3;
/**
 * How deep the sphere sits in the module's cradle, m: wherever the module is
 * drawn against the sphere (on the spacecraft, through the return, and on its
 * own as it leaves), its end is put this far into the sphere's side of the
 * interface, so the sphere rests in it rather than on a point (the drawing's).
 */
export const IM_NEST = 0.3;
/** The cone towards the sphere is this much of the length; the waist sits there (the drawing's, as render/satellite.ts had it). */
const UPPER = 0.45;
/** Radius of the end in the sphere's cradle and of the engine's end, m (the drawing's, as render/satellite.ts had them). */
const R_TOP = 0.9;
const R_AFT = 0.6;

/** Louvres: the thermal-control radiator's shutters, as stripes round the lower cone (shared, never disposed). */
let louvreTex: THREE.Texture | null = null;
function louvres(): THREE.Texture {
  if (louvreTex) return louvreTex;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 32;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c4c8cd';
  g.fillRect(0, 0, 256, 32);
  g.fillStyle = '#8d9298';
  for (let i = 0; i < 32; i++) g.fillRect(i * 8, 4, 3, 24);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.shared = true;
  louvreTex = t;
  return t;
}

/**
 * A soft dark spot for under a body resting on the ground (the sphere and
 * Gagarin on the steppe): the scene casts shadows only round the launch pad,
 * and without one a body on the ground reads as floating over it (shared,
 * never disposed).
 */
let shadowTex: THREE.Texture | null = null;
export function contactShadow(radius: number): THREE.Mesh {
  if (!shadowTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.6)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    shadowTex = new THREE.CanvasTexture(c);
    shadowTex.userData.shared = true;
  }
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 24),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, fog: false }));
  mesh.renderOrder = 1;
  return mesh;
}

export interface InstrumentModuleView {
  readonly group: THREE.Group;
  /** Every material it was built with, e.g. to warm them into a glow. */
  readonly materials: THREE.MeshStandardMaterial[];
  dispose(): void;
}

/** The instrument module, its cradle end at the origin and its engine up +Y. */
export function buildInstrumentModule(): InstrumentModuleView {
  const group = new THREE.Group();
  const materials: THREE.MeshStandardMaterial[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const mat = (p: THREE.MeshStandardMaterialParameters) => { const m = new THREE.MeshStandardMaterial(p); materials.push(m); return m; };
  const geo = <G extends THREE.BufferGeometry>(g: G): G => { geometries.push(g); return g; };
  const shell = mat({ color: 0x3a3e45, metalness: 0.35, roughness: 0.55 });
  const radiator = mat({ color: 0xffffff, map: louvres(), metalness: 0.5, roughness: 0.4 });
  const bottle = mat({ color: 0xb8bcc2, metalness: 0.6, roughness: 0.35 });
  const engine = mat({ color: 0x45474b, metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide });
  const rWaist = IM_DIAMETER / 2, hUp = IM_LENGTH * UPPER, hLow = IM_LENGTH - hUp;
  // the cone up to the waist from the sphere's cradle (CylinderGeometry's top is its +Y end)
  const upper = new THREE.Mesh(geo(new THREE.CylinderGeometry(rWaist, R_TOP, hUp, 32)), shell);
  upper.position.y = hUp / 2;
  // and down from the waist to the engine bay, the radiator's louvres on it
  const lower = new THREE.Mesh(geo(new THREE.CylinderGeometry(R_AFT, rWaist, hLow, 32)), radiator);
  lower.position.y = hUp + hLow / 2;
  const aft = new THREE.Mesh(geo(new THREE.CircleGeometry(R_AFT, 28)), engine);
  aft.rotation.x = -Math.PI / 2;
  aft.position.y = IM_LENGTH;
  group.add(upper, lower, aft);
  // the gas bottles in a ring round the top, against the upper cone
  const ball = geo(new THREE.SphereGeometry(0.17, 12, 8));
  const n = 16;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const y = 0.28, r = R_TOP + (rWaist - R_TOP) * (y / hUp) + 0.13;
    const b = new THREE.Mesh(ball, bottle);
    b.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    group.add(b);
  }
  // the TDU-1: its chamber's nozzle on the axis and the four steering nozzles round it
  const bell = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.2, 0.11, 0.3, 18, 1, true)), engine);
  bell.position.y = IM_LENGTH + 0.15;
  group.add(bell);
  const small = geo(new THREE.CylinderGeometry(0.06, 0.035, 0.14, 10, 1, true));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const s = new THREE.Mesh(small, engine);
    s.position.set(Math.cos(a) * 0.38, IM_LENGTH + 0.07, Math.sin(a) * 0.38);
    group.add(s);
  }
  return {
    group, materials,
    dispose: () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
