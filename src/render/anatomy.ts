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
import { R7_BOOSTER_GAP, r7CoreBase, SOYUZ_MS_HINGE, soyuzMsWings } from './soyuz';

export const ANATOMY_FORMAT_VERSION = 2;

export type AnatomyPartName = 'booster' | 'core' | 'stage3' | 'skirt' | 'bay' | 'fregat' | 'fairing-left' | 'fairing-right' | 'escape' | 'payload';

/**
 * A chamber or nozzle in the model that the flight draws its own fire from:
 * Blok I's (the `bay` part's) and Fregat's, whose bells the flight draws, and
 * the escape tower's jettison nozzles. Its exit's centre and radius, and its
 * top's and exit's heights (model metres).
 */
export interface AnatomyNozzle {
  kind: 'main' | 'vernier' | 'jettison';
  x: number; z: number; r: number; top: number; exit: number;
  /** a canted nozzle's axis, out of its mouth (the jettison nozzles'); others fire straight down */
  axis?: [number, number, number];
}

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
  /** the `bay`'s and `fregat`'s chambers, which the flight draws as its own bells where these are; the `escape` tower's jettison nozzles */
  nozzles?: AnatomyNozzle[];
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
 * The file as fetched, gzip-compressed (scripts/anatomy-meshes.mjs), inflated;
 * one that is not is passed on as it is. Throws where the browser cannot
 * inflate (no `DecompressionStream`): the vehicle is then drawn as before.
 */
/** This browser cannot read the meshes at all (no `DecompressionStream`): not worth fetching again this visit. */
class Unsupported extends Error {}

export async function inflateAnatomy(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const head = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength));
  if (head[0] !== 0x1f || head[1] !== 0x8b) return buffer;
  if (typeof DecompressionStream !== 'function') throw new Unsupported('no DecompressionStream');
  return new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}

/**
 * Read an (inflated) exterior mesh file into geometries. Pure but for three's
 * `BufferGeometry`, so it runs under test. The geometries are shared by every
 * view that draws the model (`userData.shared`): they live as long as the page.
 */
export function decodeAnatomy(buffer: ArrayBuffer): AnatomyModel {
  const view = new DataView(buffer), bytes = new Uint8Array(buffer);
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  if (magic !== 'OLAX') throw new Error('not an Orbitlab anatomy mesh file');
  const version = view.getUint32(4, true);
  if (version !== ANATOMY_FORMAT_VERSION) throw new Error(`anatomy mesh format ${version}, expected ${ANATOMY_FORMAT_VERSION}`);
  const length = view.getUint32(8, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 12, length)));
  const body = 12 + length;
  const parts: AnatomyModel['parts'] = {};
  for (const p of header.parts as { name: AnatomyPartName; bounds: { min: number[]; max: number[] }; meshes: HeaderMesh[]; nozzles?: AnatomyNozzle[] }[]) {
    const meshes = p.meshes.map((m): AnatomyMesh => {
      // the byte planes scripts/anatomy-meshes.mjs lays them out in
      const V = m.vertices, I = m.indices;
      const positions = new Float32Array(V * 3), normals = new Float32Array(V * 3);
      const n = new Int8Array(buffer, body + m.normal, V * 3);
      for (let a = 0; a < 3; a++) {
        const lo = body + m.position + a * 2 * V, hi = lo + V;
        let q = 0;
        for (let v = 0; v < V; v++) {
          q = (q + (bytes[lo + v] | (bytes[hi + v] << 8))) & 0xffff;
          positions[v * 3 + a] = m.min[a] + q * m.step[a];
          normals[v * 3 + a] = n[a * V + v] / 127;
        }
      }
      const size = m.wide ? 4 : 2, at = body + m.index;
      const index = m.wide ? new Uint32Array(I) : new Uint16Array(I);
      for (let i = 0, next = 0; i < I; i++) {
        let code = 0;
        for (let b = 0; b < size; b++) code |= bytes[at + b * I + i] << (8 * b);
        index[i] = code === 0 ? next++ : next - (code >>> 0);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      geometry.setIndex(new THREE.BufferAttribute(index, 1));
      geometry.computeBoundingSphere();
      geometry.userData.shared = true;
      return { material: m.material, hinge: m.hinge ?? -1, geometry };
    });
    parts[p.name] = { name: p.name, min: new THREE.Vector3(...p.bounds.min), max: new THREE.Vector3(...p.bounds.max), meshes, ...(p.nozzles ? { nozzles: p.nozzles } : {}) };
  }
  return { variant: header.variant, source: header.source, materials: header.materials, hinges: header.hinges, parts, triangles: header.triangles };
}

const loads = new Map<AnatomyVariant, Promise<AnatomyModel>>();
const loaded = new Map<AnatomyVariant, AnatomyModel>();

/** The model if it has already been loaded this visit, else null. */
export const anatomyLoaded = (variant: AnatomyVariant): AnatomyModel | null => loaded.get(variant) ?? null;

/**
 * Fetch and decode a variant's exterior meshes once per visit. A failed load
 * is tried again by the next mission (offline before the file was ever
 * fetched, or an older format a cache still held, which the service worker
 * refreshes meanwhile), but for a browser that cannot inflate it at all.
 */
export function loadAnatomy(variant: AnatomyVariant, base: string | URL = document.baseURI): Promise<AnatomyModel> {
  let p = loads.get(variant);
  if (!p) {
    p = fetch(new URL(anatomyPage(variant).meshes, base))
      .then((r) => {
        if (!r.ok) throw new Error(`anatomy meshes: HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then(inflateAnatomy)
      .then((buffer) => {
        const model = decodeAnatomy(buffer);
        loaded.set(variant, model);
        return model;
      });
    p.catch((error: unknown) => { if (!(error instanceof Unsupported)) loads.delete(variant); });
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
  /** Blok I, in stage 1's group: its skin, its aft bay (`bay`: engine, thrust frame, lowest tank) and its skirt */
  stage3: Placement;
  /**
   * A spent Blok I, in the debris (drawn from `-height[1]`): on the 2.1a its
   * top, which stands 0.2 m above the physics' (the spacecraft's seat), on the
   * separation plane the spacecraft leaves from, so the two do not overlap.
   */
  stage3Spent: Placement;
  /**
   * Blok I's chambers placed in its group (heights there), for its bells,
   * glow and plumes: the model's own chambers are left to the flight, which
   * gimbals and lights them. Null when the model records none.
   */
  chambers: PlacedChamber[] | null;
  /** Fregat, in stage 2's group: dropped onto Blok I's top, over the adapter the stack layout puts between */
  fregat: Placement | null;
  /** Fregat's main chamber placed in its group, as `chambers` */
  fregatChambers: PlacedChamber[] | null;
  /** a spent Fregat, in the debris: its top on the separation plane its spacecraft leaves from (the debris draws it from `-height[2]`) */
  fregatSpent: Placement | null;
  /**
   * Where a strap-on unit's engines go (bells, glow, plumes) so that they hang
   * under the model's strap-on: its base is above Blok A's in the model, and
   * its base ring further out than the unit's own axis.
   */
  boosterEngines: { dx: number; dy: number };
  /** the fairing's halves, in the fairing's group (at the top of the attached stack) */
  fairing: Placement;
  /** the model's fairing's top, and its shoulder (where the nose's curve meets the cylinder, the Mach-1 collar's place), in the fairing's group */
  fairingTop: number;
  fairingShoulder: number;
  /**
   * where the escape tower stands in the fairing's group, and the tower in its
   * own; `jets`: its jettison nozzles' exits there (centre and radius), where
   * its fire leaves the tower
   */
  tower: { y: number; placement: Placement; jets: TowerJet[] | null } | null;
  /** the spacecraft, centred on its group as render/satellite.ts centres a payload; `seat` above the stage's top */
  payload: (Placement & { height: number; seat: number }) | null;
  /**
   * Where the mission's own satellite stands above the top of the stack while
   * it rides (`SatelliteView.seat`): on the model's Fregat, which sits lower
   * than the stack layout's; null to leave it where it was.
   */
  satelliteSeat: number | null;
}

/** One of the escape tower's jettison nozzles in the tower's group: its mouth's centre and radius, and its axis. */
export interface TowerJet { x: number; y: number; z: number; r: number; axis?: [number, number, number] }

/** A chamber in a stage's group: its exit's centre and radius, its top's and exit's heights there. */
export interface PlacedChamber { kind: 'main' | 'vernier'; x: number; z: number; r: number; top: number; exit: number }

const at = (y0: number, sy = 1, dy = 0, dx = 0): Placement => ({ y0, sy, dy, dx });
/** A model height in the group a placement puts it in. */
export const placeY = (p: Placement, y: number): number => p.dy + (y - p.y0) * p.sy;

/** A part's chambers (not the tower's jets) in the group `place` puts it in; null if it records none. */
function placed(nozzles: AnatomyNozzle[] | undefined, place: Placement): PlacedChamber[] | null {
  const list: PlacedChamber[] = [];
  for (const n of nozzles ?? []) {
    if (n.kind !== 'jettison') list.push({ kind: n.kind, x: n.x, z: n.z, r: n.r, top: placeY(place, n.top), exit: placeY(place, n.exit) });
  }
  return list.length ? list : null;
}

/** The escape tower's jettison nozzles' exits in the tower's own group. */
function jets(escape: AnatomyPart, place: Placement): TowerJet[] | null {
  const list = (escape.nozzles ?? []).filter((n) => n.kind === 'jettison');
  return list.length ? list.map((n) => ({ x: n.x, y: placeY(place, n.exit), z: n.z, r: n.r, ...(n.axis ? { axis: n.axis } : {}) })) : null;
}

/** Each vertex of a part's meshes, in the model's metres. */
function eachVertex(part: AnatomyPart, f: (x: number, y: number, z: number) => void): void {
  for (const m of part.meshes) {
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) f(p.getX(i), p.getY(i), p.getZ(i));
  }
}

/**
 * The centre of the strap-on's base ring (the model's +X strap-on): its
 * vertices within 3 cm of its bottom, the ring's radius from its extent
 * across (Z), which the outboard fin does not reach.
 */
function baseRing(booster: AnatomyPart): { x: number; z: number } {
  let minX = Infinity, minZ = Infinity, maxZ = -Infinity;
  eachVertex(booster, (x, y, z) => {
    if (y > booster.min.y + 0.03) return;
    minX = Math.min(minX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  });
  const r = (maxZ - minZ) / 2;
  return { x: minX + r, z: (minZ + maxZ) / 2 };
}

/**
 * The fairing's shoulder: the highest point at which it is still as wide as
 * its cylinder (`radius`, the vehicle's fairing; 3 % short of it), so the
 * fins lower down, wider still, do not count.
 */
function shoulder(halves: AnatomyPart[], radius: number): number {
  let y0 = -Infinity;
  for (const h of halves) eachVertex(h, (x, y, z) => { if (Math.hypot(x, z) >= 0.97 * radius && y > y0) y0 = y; });
  return Number.isFinite(y0) ? y0 : halves[0].min.y;
}

/**
 * Fit the model's parts into the vehicle's stack. Blok A and Blok I are
 * stretched along their axes into their stages' heights (by 1.02 and 0.96 on
 * 2.1a, 1.03 and 0.99 on 2.1b); everything above Blok I keeps the model's own
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
  // every part this vehicle is drawn with, before anything is hidden (render/rocket.ts `mountAnatomy`)
  const core = part('core'), stage3 = part('stage3'), booster = part('booster');
  const halves = [part('fairing-left'), part('fairing-right')];
  if (spec.stages.length > 2 && !p.fregat) throw new Error('the anatomy model has no fregat');
  const fairingBase = Math.min(halves[0].min.y, halves[1].min.y);
  const fairingTop = Math.max(halves[0].max.y, halves[1].max.y);
  const fregat = p.fregat ?? null;
  // Blok I's bottom: its skin's, or its skirt's where it has one (the 2.1b's, whose skin starts at its tank)
  const blokIBase = Math.min(stage3.min.y, p.skirt?.min.y ?? Infinity);
  const sy0 = layout.height[0] / (blokIBase - core.min.y);
  const b = blokA.boosters![0];
  const off = r7CoreBase(blokA.diameter / 2) + R7_BOOSTER_GAP + b.diameter / 2;
  // Blok I's top in the stack, and the fairing group's base while the fairing is on (the whole stack is)
  const blokITop = layout.base[1] + blokI.length;
  const top = layout.total;
  const escape = p.escape ?? null;
  const ship = withSpacecraft ? p.payload ?? null : null;
  const ring = baseRing(booster);
  const blokIPlace = at(blokIBase, blokI.length / ((fregat ? fregat.min.y : fairingBase) - blokIBase));
  const fairingDy = blokITop - top;
  const fairingR = (spec.fairing?.diameter ?? 0) / 2;
  const fregatPlace = fregat ? at(fregat.min.y, 1, blokITop - (layout.base[2] ?? blokITop)) : null;
  // the 2.1a's Blok I stands a little above the physics' top, where the spacecraft sits (`payload.seat`)
  const blokIProud = fregat ? 0 : placeY(blokIPlace, stage3.max.y) - blokI.length;
  const towerPlace = escape ? at(escape.min.y) : null;
  return {
    core: at(core.min.y, sy0),
    booster: at(core.min.y, sy0, -(b.baseOffset ?? 0), -off),
    boosterEngines: { dx: ring.x - off, dy: (booster.min.y - core.min.y) * sy0 },
    stage3: blokIPlace,
    stage3Spent: { ...blokIPlace, dy: blokIPlace.dy - Math.max(0, blokIProud) },
    chambers: placed(p.bay?.nozzles, blokIPlace),
    fregat: fregatPlace,
    fregatChambers: fregat && fregatPlace ? placed(fregat.nozzles, fregatPlace) : null,
    fregatSpent: fregat ? at(fregat.min.y, 1, (layout.height[2] ?? 0) - (fregat.max.y - fregat.min.y)) : null,
    fairing: at(fairingBase, 1, fairingDy),
    fairingTop: fairingDy + fairingTop - fairingBase,
    fairingShoulder: fairingDy + shoulder(halves, fairingR) - fairingBase,
    tower: escape && towerPlace ? { y: fairingDy + (escape.min.y - fairingBase), placement: towerPlace, jets: jets(escape, towerPlace) } : null,
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
  // hinged where the model's folded arrays are, 1.6 m above the aft end in the flight's own drawing
  let hinge = Infinity;
  for (const o of folded) {
    const g = (o as THREE.Mesh).geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    hinge = Math.min(hinge, g.boundingBox!.min.y);
  }
  const unfold = soyuzMsWings(wings, (Number.isFinite(hinge) ? hinge : part.min.y + SOYUZ_MS_HINGE) - SOYUZ_MS_HINGE, grey, panel, geos);
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
