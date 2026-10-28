/**
 * The owner's Soyuz Anatomy models in the flight: the outside of Soyuz-2.1a
 * and 2.1b — the strap-ons, Blok A and its truss, Blok I, Fregat, the
 * fairing's two halves, the escape tower and the Soyuz MS or Progress MS —
 * as their pages draw it (src/data/anatomy.ts), from the exterior meshes
 * scripts/anatomy-meshes.mjs derives from each page.
 *
 * Render only, like render/soyuz.ts: the physics keeps its stages, and each
 * part of the model is fitted into the place `stackLayout` gives its stage
 * (`anatomyFit`). The flight's own engine bells, plumes, aft skirt and
 * escape-tower motion stay; render/rocket.ts hides its own drawing of a part
 * (and the pad frost drawn on it) when the model's is mounted, and draws its
 * own on any other vehicle, or while the meshes are loading or cannot load
 * (offline before they were first fetched): the files are fetched on demand,
 * never precached (src/pwa/manifest.ts).
 *
 * The file format is documented in scripts/anatomy-meshes.mjs.
 */
import * as THREE from 'three';
import type { VehicleSpec } from '../types';
import { stackLayout } from '../physics/frame';
import { anatomyPage, type AnatomyVariant } from '../data/anatomy';
import { R7_BOOSTER_GAP, r7CoreBase, soyuzMsWings } from './soyuz';

export const ANATOMY_FORMAT_VERSION = 1;

export type AnatomyPartName = 'booster' | 'core' | 'stage3' | 'skirt' | 'fregat' | 'fairing-left' | 'fairing-right' | 'escape' | 'payload';

export interface AnatomyMaterialSpec { name: string; color: string; roughness: number; metalness: number }

/** One rotation of a Progress hinge chain, about `pivot`, applied in turn (flight axes, m). */
export interface AnatomyRotation { pivot: [number, number, number]; axis: [number, number, number]; angle: number }

export interface AnatomyMesh {
  material: number;
  /** index into `AnatomyModel.hinges`, or −1 */
  hinge: number;
  geometry: THREE.BufferGeometry;
}

export interface AnatomyPart {
  name: AnatomyPartName;
  min: THREE.Vector3;
  max: THREE.Vector3;
  meshes: AnatomyMesh[];
}

export interface AnatomyModel {
  variant: string;
  /** the page the meshes were made from */
  source: { file: string; sha256: string; title: string };
  materials: AnatomyMaterialSpec[];
  hinges: { rotations: AnatomyRotation[] }[];
  parts: Partial<Record<AnatomyPartName, AnatomyPart>>;
  triangles: number;
}

interface HeaderMesh {
  material: number; hinge?: number; vertices: number; indices: number;
  min: number[]; step: number[]; position: number; normal: number; index: number; wide: boolean;
}

/**
 * Read an exterior mesh file into geometries. Pure but for three's
 * `BufferGeometry`, so it runs under test. The geometries are shared by every
 * view that draws the model (`userData.shared`): they live as long as the page.
 */
export function decodeAnatomy(buffer: ArrayBuffer): AnatomyModel {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  if (magic !== 'OLAX') throw new Error('not an Orbitlab anatomy mesh file');
  const version = view.getUint32(4, true);
  if (version !== ANATOMY_FORMAT_VERSION) throw new Error(`anatomy mesh format ${version}, expected ${ANATOMY_FORMAT_VERSION}`);
  const length = view.getUint32(8, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 12, length)));
  const body = 12 + length;
  const parts: AnatomyModel['parts'] = {};
  for (const p of header.parts as { name: AnatomyPartName; bounds: { min: number[]; max: number[] }; meshes: HeaderMesh[] }[]) {
    const meshes = p.meshes.map((m): AnatomyMesh => {
      const q = new Uint16Array(buffer, body + m.position, m.vertices * 3);
      const n = new Int8Array(buffer, body + m.normal, m.vertices * 4);
      const positions = new Float32Array(m.vertices * 3), normals = new Float32Array(m.vertices * 3);
      for (let v = 0; v < m.vertices; v++) {
        for (let a = 0; a < 3; a++) {
          positions[v * 3 + a] = m.min[a] + q[v * 3 + a] * m.step[a];
          normals[v * 3 + a] = n[v * 4 + a] / 127;
        }
      }
      const index = m.wide ? new Uint32Array(buffer.slice(body + m.index, body + m.index + m.indices * 4))
        : new Uint16Array(buffer.slice(body + m.index, body + m.index + m.indices * 2));
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      geometry.setIndex(new THREE.BufferAttribute(index, 1));
      geometry.computeBoundingSphere();
      geometry.userData.shared = true;
      return { material: m.material, hinge: m.hinge ?? -1, geometry };
    });
    parts[p.name] = { name: p.name, min: new THREE.Vector3(...p.bounds.min), max: new THREE.Vector3(...p.bounds.max), meshes };
  }
  return { variant: header.variant, source: header.source, materials: header.materials, hinges: header.hinges, parts, triangles: header.triangles };
}

const loads = new Map<AnatomyVariant, Promise<AnatomyModel>>();
const loaded = new Map<AnatomyVariant, AnatomyModel>();

/** The model if it has already been loaded this visit, else null. */
export const anatomyLoaded = (variant: AnatomyVariant): AnatomyModel | null => loaded.get(variant) ?? null;

/**
 * Fetch and decode a variant's exterior meshes once per visit. A failed load
 * (offline before the file was ever fetched) is forgotten, so the next
 * mission tries again.
 */
export function loadAnatomy(variant: AnatomyVariant, base: string | URL = document.baseURI): Promise<AnatomyModel> {
  let p = loads.get(variant);
  if (!p) {
    p = fetch(new URL(anatomyPage(variant).meshes, base))
      .then((r) => {
        if (!r.ok) throw new Error(`anatomy meshes: HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buffer) => {
        const model = decodeAnatomy(buffer);
        loaded.set(variant, model);
        return model;
      });
    p.catch(() => loads.delete(variant));
    loads.set(variant, p);
  }
  return p;
}

// ---------------------------------------------------------------- fitting

/**
 * How one part of the model goes into a group of the flight: the model's
 * height `y0` lands on the group's `dy`, its heights scaled by `sy`, and it
 * moves `dx` along the group's X.
 */
export interface Placement { y0: number; sy: number; dy: number; dx: number }

export interface AnatomyFit {
  /** Blok A and its truss, in stage 0's group (base at 0) */
  core: Placement;
  /**
   * One strap-on, in a booster unit's group: the model's booster at +X (Blok
   * B) as the unit on +X of render/rocket.ts carries it; every other unit is
   * that one turned, as the model's are (checked by the export).
   */
  booster: Placement;
  /** Blok I, in stage 1's group */
  stage3: Placement;
  /** Fregat, in stage 2's group: dropped onto Blok I's top, over the adapter the stack layout puts between */
  fregat: Placement | null;
  /** the fairing's halves, in the fairing's group (at the top of the attached stack) */
  fairing: Placement;
  /** where the escape tower stands in the fairing's group, and the tower in its own */
  tower: { y: number; placement: Placement } | null;
  /** the spacecraft, centred on its group as render/satellite.ts centres a payload; `seat` above the stage's top */
  payload: (Placement & { height: number; seat: number }) | null;
  /**
   * Where the mission's own satellite stands above the top of the stack while
   * it rides (`SatelliteView.seat`): on the model's Fregat, which sits lower
   * than the stack layout's; null to leave it where it was.
   */
  satelliteSeat: number | null;
}

const at = (y0: number, sy = 1, dy = 0, dx = 0): Placement => ({ y0, sy, dy, dx });

/**
 * Fit the model's parts into the vehicle's stack. Blok A and Blok I are
 * stretched along their axes into their stages' heights (by 1.02 and 0.96 on
 * 2.1a, 1.02 and 1.03 on 2.1b); everything above Blok I keeps the model's own
 * size and its place on Blok I's top, where the model puts it — the 2.1b
 * fairing round Fregat, as the ST fairing flies, not above it as the stack
 * layout stands it.
 */
export function anatomyFit(spec: VehicleSpec, model: Pick<AnatomyModel, 'parts'>, withSpacecraft: boolean): AnatomyFit {
  const p = model.parts;
  const part = (name: AnatomyPartName): AnatomyPart => {
    const found = p[name];
    if (!found) throw new Error(`the anatomy model has no ${name}`);
    return found;
  };
  const layout = stackLayout(spec);
  const [blokA, blokI] = spec.stages;
  const core = part('core'), stage3 = part('stage3');
  const fairingBase = Math.min(part('fairing-left').min.y, part('fairing-right').min.y);
  const fregat = p.fregat ?? null;
  const sy0 = layout.height[0] / (stage3.min.y - core.min.y);
  const b = blokA.boosters![0];
  const off = r7CoreBase(blokA.diameter / 2) + R7_BOOSTER_GAP + b.diameter / 2;
  // Blok I's top in the stack, and the fairing group's base while the fairing is on (the whole stack is)
  const blokITop = layout.base[1] + blokI.length;
  const top = layout.total;
  const escape = p.escape ?? null;
  const ship = withSpacecraft ? p.payload ?? null : null;
  return {
    core: at(core.min.y, sy0),
    booster: at(core.min.y, sy0, -(b.baseOffset ?? 0), -off),
    stage3: at(stage3.min.y, blokI.length / ((fregat ? fregat.min.y : fairingBase) - stage3.min.y)),
    fregat: fregat ? at(fregat.min.y, 1, blokITop - (layout.base[2] ?? blokITop)) : null,
    fairing: at(fairingBase, 1, blokITop - top),
    tower: escape ? { y: blokITop - top + (escape.min.y - fairingBase), placement: at(escape.min.y) } : null,
    payload: ship ? { ...at(ship.min.y, 1, -(ship.max.y - ship.min.y) / 2), height: ship.max.y - ship.min.y, seat: Math.max(0, ship.min.y - fairingBase) } : null,
    satelliteSeat: fregat && !ship ? blokITop + (fregat.max.y - fregat.min.y) - top : null,
  };
}

// ---------------------------------------------------------------- drawing

/** The model's materials, made once per view: the caller owns and frees them. */
export function anatomyMaterials(model: AnatomyModel): THREE.MeshStandardMaterial[] {
  return model.materials.map((m) => new THREE.MeshStandardMaterial({ color: new THREE.Color(m.color), roughness: m.roughness, metalness: m.metalness }));
}

/**
 * A part's meshes in a group placed by `placement`; the meshes of each Progress
 * hinge chain in a group of their own (`hinged`), turned by `setHinges`.
 */
export function anatomyGroup(part: AnatomyPart, materials: THREE.Material[], placement: Placement): THREE.Group {
  const g = new THREE.Group();
  g.name = `anatomy:${part.name}`;
  g.position.set(placement.dx, placement.dy - placement.y0 * placement.sy, 0);
  g.scale.set(1, placement.sy, 1);
  const hinged = new Map<number, THREE.Group>();
  for (const m of part.meshes) {
    const mesh = new THREE.Mesh(m.geometry, materials[m.material]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (m.hinge < 0) { g.add(mesh); continue; }
    let h = hinged.get(m.hinge);
    if (!h) {
      h = new THREE.Group();
      h.matrixAutoUpdate = false;
      h.userData.hinge = m.hinge;
      hinged.set(m.hinge, h);
      g.add(h);
    }
    h.add(mesh);
  }
  return g;
}

const tmpA = new THREE.Matrix4(), tmpB = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3();

/**
 * Turn the Progress's hinge chains (its solar arrays unfolding) to `fraction`
 * of their travel: each rotation of a chain about its own pivot, in turn, as
 * the page's `SoyuzFamilyMotion.articulation` applies them.
 */
export function setHinges(root: THREE.Object3D, model: AnatomyModel, fraction: number): void {
  root.traverse((o) => {
    const k = o.userData.hinge as number | undefined;
    if (k === undefined) return;
    const m = o.matrix.identity();
    for (const r of model.hinges[k].rotations) {
      // p' = R (p − c) + c, applied after what came before
      tmpQ.setFromAxisAngle(tmpV.set(...r.axis).normalize(), r.angle * fraction);
      tmpA.makeTranslation(r.pivot[0], r.pivot[1], r.pivot[2]).multiply(tmpB.makeRotationFromQuaternion(tmpQ));
      tmpA.multiply(tmpB.makeTranslation(-r.pivot[0], -r.pivot[1], -r.pivot[2]));
      m.premultiply(tmpA);
    }
    o.matrixWorldNeedsUpdate = true;
  });
}

// ---------------------------------------------------------------- the spacecraft

export interface AnatomySpacecraft {
  group: THREE.Group;
  height: number;
  seat: number;
  setDeploy(p: number): void;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The Soyuz MS or Progress MS as the model draws it, centred on its group as
 * render/satellite.ts centres a payload, unfolding over `setDeploy`'s 0 to 1
 * (render/rocket.ts: the 14 s after separation). The Progress page carries its
 * own hinges, and its arrays unfold on them; the Soyuz MS page draws its
 * arrays folded only, so once they start to open the flight's own Soyuz MS
 * wings (render/soyuz.ts) take their place on the model's service module.
 */
export function anatomySpacecraft(model: AnatomyModel, fit: AnatomyFit, materials: THREE.MeshStandardMaterial[], kind: 'soyuz-ms' | 'progress'): AnatomySpacecraft {
  const part = model.parts.payload!, place = fit.payload!;
  const group = new THREE.Group();
  const body = anatomyGroup(part, materials, place);
  group.add(body);
  if (kind === 'progress') {
    const setDeploy = (p: number) => setHinges(body, model, smooth(0.1, 0.9, p));
    setDeploy(0);
    return { group, height: place.height, seat: place.seat, setDeploy };
  }
  const solar = new Set(model.materials.flatMap((m, i) => (m.name === 'solar-cell-blue' ? [materials[i]] : [])));
  const folded = body.children.filter((o) => solar.has((o as THREE.Mesh).material as THREE.MeshStandardMaterial));
  const geos: THREE.BufferGeometry[] = [];
  const grey = new THREE.MeshStandardMaterial({ color: 0xb7bfbd, metalness: 0.9, roughness: 0.36 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x263a52, metalness: 0, roughness: 0.3, emissive: 0x070c24 });
  const wings = new THREE.Group();
  const unfold = soyuzMsWings(wings, part.min.y, grey, panel, geos);
  body.add(wings);
  const setDeploy = (p: number) => {
    const k = smooth(0.1, 0.7, p);
    for (const o of folded) o.visible = k <= 0;
    wings.visible = k > 0;
    unfold(k);
  };
  setDeploy(0);
  return { group, height: place.height, seat: place.seat, setDeploy };
}
