/**
 * The Soyuz-2.1b / Fregat model's content file
 * (public/structure/soyuz-2-1b-fregat-st31.r2.json, scripts/structure-meshes.mjs):
 * the owner's Thai guide as the page has it — its components and their
 * groups, its fifteen propellant and gas circuits with their ordered steps,
 * its flight sequence — and one record per part. Read and checked here, and
 * arranged for the three depths: the assemblies (watch), each assembly's
 * groups as the page lists them (explore), each part (engineer).
 *
 * DOM-free.
 */
import { buildTree, type ModelNode, type ModelRelation, type ModelTree } from './model';
import { SOYUZ_COMPONENT, SOYUZ_INTERFACES, SOYUZ_UNITS, soyuzCategory, soyuzCertainty, type SoyuzJoint, type SoyuzUnit } from './soyuz';
import { CERTAINTIES, PART_CATEGORIES, type StructureSource } from './types';

/**
 * The files' data revision (scripts/structure-meshes.mjs `DATA_REVISION`): in
 * their names, so a browser's kept copy of an older revision is never read
 * for this one, and inside each, so two revisions are never mixed.
 */
export const SOYUZ_DATA_REVISION = 2;

export const SOYUZ_FILES = {
  content: 'structure/soyuz-2-1b-fregat-st31.r2.json',
  layers: {
    outer: 'structure/soyuz-2-1b-fregat-st31.r2.outer.bin',
    inner: 'structure/soyuz-2-1b-fregat-st31.r2.inner.bin',
    engine: 'structure/soyuz-2-1b-fregat-st31.r2.engine.bin',
  },
} as const;

export type SoyuzLayer = keyof typeof SOYUZ_FILES.layers;
export const SOYUZ_LAYERS: readonly SoyuzLayer[] = ['outer', 'inner', 'engine'];

export interface SoyuzPart {
  id: string;
  unit: SoyuzUnit;
  kind: string;
  layer: SoyuzLayer;
  half?: string;
  role?: string;
  material?: string;
  model?: string;
  /** index into `scopes`: the model-maker's note on how far the part is the real one */
  scope?: number;
  circuits?: string[];
  /** the circuits' steps it belongs to (indices into `circuitSteps`) */
  steps?: number[];
  /** what flows through it, and as what */
  medium?: string;
  phase?: 'liquid' | 'gas' | string;
  /** the parts a line runs between (indices) */
  terminals?: number[];
  /** the model-maker's evidence references for this part (indices into `evidence`) */
  evidence?: number[];
  /** parts it is mounted on (indices) */
  mounts?: number[];
  /** where it is seated on them: the point (m), the way the seat faces, its radius (m), and the parts there */
  ends?: { at: [number, number, number]; normal: [number, number, number]; r: number; to: number[] }[];
  /** a mechanism's pivot (m) and axis (a unit vector); `gimbalAxes`: how many axes a gimballed nozzle swings about */
  pivot?: [number, number, number];
  axis?: [number, number, number];
  gimbalAxes?: number;
  /** the model-maker marks its orientation as approximate */
  approximate?: boolean;
  /** it leaves the vehicle in flight at this event of the flight sequence, moving this way (m) */
  leaves?: { event: string; move: [number, number, number] };
  /** the tank it stands inside, and the part it is a fitting of (indices) */
  inside?: number;
  host?: number;
  /** the model-maker's notes on what it stands for */
  contents?: string;
  steering?: string;
  /** m, the model's frame */
  center: [number, number, number];
}

export interface SoyuzGroup {
  id: string;
  label: string;
  count: number;
  unit: string;
  ru?: string;
  items: number[];
}

export interface SoyuzComponent {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  /** a second paragraph of the page's (may be empty) */
  details: string;
  facts: { label: string; value: string }[];
  note: string;
  sourceIds: string[];
  observations: string[];
  groups: SoyuzGroup[];
}

/** One step of a circuit, in the page's own Thai; `representation`: drawn as a pipe of the model, or only as a diagram of what happens inside. */
export interface SoyuzCircuitStep { id: string; label: string; description: string; representation: 'physicalpipe' | 'internal-schematic' | string }

export interface SoyuzCircuit {
  id: string; label: string; description: string; confidence: string; limitation: string; sourceIds: string[];
  /** the page's parts (assemblies) it runs through */
  parts: string[];
  steps: SoyuzCircuitStep[];
}

/** A step of the page's flight sequence; `part`: the page's part it is about (`fairing` for both halves), or null. */
export interface SoyuzFlightStep { title: string; time: string; text: string; part: string | null; engines: string; sourceIds: string[] }

export interface SoyuzFlight {
  title: string;
  note: string;
  steps: SoyuzFlightStep[];
  /** at which step (its index) each of these leaves: boosters, fairing, core, skirt, upper, payload, disposal */
  events: Record<string, number>;
  last: number;
  /** how far Fregat moves off at its disposal, m */
  disposalMove: [number, number, number];
}

export interface SoyuzContent {
  format: 'orbitlab-structure-content';
  version: 1;
  revision: number;
  source: { file: string; sha256: string; title: string };
  assemblies: Record<SoyuzUnit, { move: [number, number, number]; reveal?: [number, number, number]; parts: number }>;
  guide: {
    title: string; subtitle: string; configuration: string; intro: string; statusNote: string;
    reviewWarnings: string[]; geometryReference: Record<string, string | number>;
    summaryStats: { label: string; value: string }[]; engineeringNotes: string[];
  };
  flight: SoyuzFlight;
  sources: StructureSource[];
  circuits: SoyuzCircuit[];
  /** every circuit's steps' ids, in the circuits' order: a part's `steps` are indices into it */
  circuitSteps: string[];
  /** the model-maker's evidence references: a part's `evidence` are indices into it */
  evidence: string[];
  components: SoyuzComponent[];
  scopes: string[];
  items: SoyuzPart[];
  pageBuild: { app: string; version: string; scene: string };
}

/** Read the content file, or throw saying what is wrong with it. */
export function parseSoyuzContent(raw: unknown): SoyuzContent {
  const c = raw as Partial<SoyuzContent> | null;
  if (!c || typeof c !== 'object' || c.format !== 'orbitlab-structure-content') throw new Error('not a structure content file');
  if (c.version !== 1) throw new Error(`structure content version ${String(c.version)}, expected 1`);
  if (c.revision !== SOYUZ_DATA_REVISION) throw new Error(`structure content revision ${String(c.revision)}, expected ${SOYUZ_DATA_REVISION}`);
  if (!Array.isArray(c.items) || !Array.isArray(c.components) || !c.assemblies || !c.source?.sha256) throw new Error('structure content is incomplete');
  if (!Array.isArray(c.circuits) || !Array.isArray(c.circuitSteps) || !Array.isArray(c.evidence) || !Array.isArray(c.flight?.steps)) throw new Error('structure content is incomplete');
  for (const u of SOYUZ_UNITS) if (!c.assemblies[u]) throw new Error(`structure content has no assembly ${u}`);
  c.items.forEach((it, i) => {
    if (typeof it?.id !== 'string' || !(SOYUZ_UNITS as readonly string[]).includes(it.unit)) throw new Error(`structure content part ${i} is not readable`);
  });
  return c as SoyuzContent;
}

/** Everything the three depths read off the content, worked out once. */
export interface SoyuzIndex {
  content: SoyuzContent;
  /** per part: its kind of part and how its shape is known, as indices into PART_CATEGORIES and CERTAINTIES */
  category: Uint8Array;
  certainty: Uint8Array;
  /** per part: its group (index into `groups`) */
  groupOf: Int32Array;
  /** every group, the page's and one "other parts" group per assembly for parts the page groups nowhere */
  groups: { key: string; unit: SoyuzUnit; group: SoyuzGroup | null; items: number[] }[];
  /** per assembly: its parts, its groups (indices), its component */
  units: Record<SoyuzUnit, { items: number[]; groups: number[]; component: SoyuzComponent | undefined }>;
  /** the part's index by id */
  byId: Map<string, number>;
}

/**
 * The index: each part's group is the smallest of the page's groups of its
 * assembly that holds it (the page's "whole engine" group holds the
 * chambers' parts too, which the "main chambers" group names more closely);
 * a part in none goes into its assembly's "other parts" group, a grouping of
 * this pilot's, said as such.
 */
export function indexSoyuz(content: SoyuzContent): SoyuzIndex {
  const n = content.items.length;
  const category = new Uint8Array(n), certainty = new Uint8Array(n), groupOf = new Int32Array(n).fill(-1);
  content.items.forEach((p, i) => {
    category[i] = PART_CATEGORIES.indexOf(soyuzCategory(p));
    certainty[i] = CERTAINTIES.indexOf(soyuzCertainty(p));
  });
  const groups: SoyuzIndex['groups'] = [];
  const units = {} as SoyuzIndex['units'];
  const componentOf = new Map(content.components.map((c) => [c.id, c]));
  for (const unit of SOYUZ_UNITS) {
    const items = content.items.flatMap((p, i) => (p.unit === unit ? [i] : []));
    const component = componentOf.get(SOYUZ_COMPONENT[unit]);
    const own = new Set(items);
    const mine: number[] = [];
    for (const g of component?.groups ?? []) {
      // the fairing's halves share one component: each half takes the parts of its own side
      const inUnit = g.items.filter((i) => own.has(i));
      if (!inUnit.length) continue;
      mine.push(groups.length);
      groups.push({ key: `${unit}/${g.id}`, unit, group: g, items: inUnit });
    }
    // smallest group first
    for (const gi of [...mine].sort((a, b) => groups[a].items.length - groups[b].items.length)) {
      for (const i of groups[gi].items) if (groupOf[i] < 0) groupOf[i] = gi;
    }
    const rest = items.filter((i) => groupOf[i] < 0);
    if (rest.length) {
      mine.push(groups.length);
      for (const i of rest) groupOf[i] = groups.length;
      groups.push({ key: `${unit}/other`, unit, group: null, items: rest });
    }
    units[unit] = { items, groups: mine, component };
  }
  return { content, category, certainty, groupOf, groups, units, byId: new Map(content.items.map((p, i) => [p.id, i])) };
}

/**
 * Where an assembly's own vertical axis stands, m (x, z): the centre of its
 * lowest fifth's parts, so a strap-on turns about its own cylinder, not the
 * cone that leans to the core. The core, the stages and Fregat stand on the
 * vehicle's axis.
 */
export function unitAxis(index: SoyuzIndex, unit: SoyuzUnit): [number, number] {
  const parts = index.units[unit].items.map((i) => index.content.items[i].center);
  if (!parts.length) return [0, 0];
  const ys = parts.map((c) => c[1]);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  const low = parts.filter((c) => c[1] <= lo + 0.2 * (hi - lo));
  const x = low.reduce((s, c) => s + c[0], 0) / low.length;
  const z = low.reduce((s, c) => s + c[2], 0) / low.length;
  return [Math.abs(x) < 0.05 ? 0 : x, Math.abs(z) < 0.05 ? 0 : z];
}

/**
 * Where to look from to see into the page's cutaway, as the viewer's azimuth
 * (its camera stands at (sin az, cos az) round the target in x and z,
 * src/render/structure-viewer.ts): from the side of the halves the cutaway
 * hides ("…front"), away from the halves it keeps ("…back"). Taken from the
 * page's own halves, so it follows the model if the page is remade.
 */
export function cutawayAzimuth(content: SoyuzContent): number {
  const front = [0, 0, 0], back = [0, 0, 0]; // x sum, z sum, count
  for (const it of content.items) {
    const side = it.half?.endsWith('front') ? front : it.half?.endsWith('back') ? back : null;
    if (!side) continue;
    side[0] += it.center[0]; side[1] += it.center[2]; side[2]++;
  }
  if (!front[2] || !back[2]) return 0;
  return Math.atan2(front[0] / front[2] - back[0] / back[2], front[1] / front[2] - back[1] / back[2]);
}

/**
 * The model's tree for the three depths: the eleven assemblies (each a unit),
 * under each its groups as the page lists them (and this section's "other
 * parts" group where the page groups a part nowhere), under each group the
 * parts it names most closely, by the page's own ids.
 */
export function soyuzTree(index: SoyuzIndex): ModelTree {
  const nodes: ModelNode[] = [];
  for (const unit of SOYUZ_UNITS) nodes.push({ id: unit, parent: null, tier: 1, items: index.units[unit].items, unit });
  index.groups.forEach((g, gi) => {
    // a group's own parts: those it names most closely. A group every part of which a narrower one names (the page's
    // "whole engine", which holds the chambers, the pumps and the pipes) stands for its whole list: picked, it lights all of it.
    const own = index.content.items.flatMap((_, i) => (index.groupOf[i] === gi ? [i] : []));
    nodes.push({ id: g.key, parent: g.unit, tier: 2, items: own.length ? own : g.items });
  });
  index.content.items.forEach((p, i) => {
    nodes.push({
      id: p.id, parent: index.groups[index.groupOf[i]].key, tier: 3, items: [i],
      category: PART_CATEGORIES[index.category[i]], certainty: CERTAINTIES[index.certainty[i]],
    });
  });
  return buildTree(nodes, index.content.items.length);
}

/** A joint as the picture shows it: the parts that are it on each side, and the point it is marked at, m. */
export interface SoyuzJointParts { a: number[]; b: number[]; at: [number, number, number] | null }

/**
 * The parts of a relation's joint (`SOYUZ_INTERFACES`, by the page's ids)
 * and where to mark it: the middle of those parts' centres. A relation whose
 * joint the page draws no hardware for has no parts and no mark.
 */
export function jointParts(index: SoyuzIndex, relation: ModelRelation): SoyuzJointParts {
  const rule = SOYUZ_INTERFACES[relation.joint as SoyuzJoint] ?? {};
  const side = (unit: string, pattern: RegExp | undefined): number[] => {
    if (!pattern || !Object.hasOwn(index.units, unit)) return [];
    return index.units[unit as SoyuzUnit].items.filter((i) => {
      const id = index.content.items[i].id;
      return pattern.test(id.slice(id.indexOf('.') + 1));
    });
  };
  const a = side(relation.a, rule.a), b = side(relation.b, rule.b);
  const all = [...a, ...b];
  if (!all.length) return { a, b, at: null };
  const at: [number, number, number] = [0, 0, 0];
  for (const i of all) for (let k = 0; k < 3; k++) at[k] += index.content.items[i].center[k] / all.length;
  return { a, b, at };
}

/** The parts of one circuit: all of them, and those of each of its steps, in the steps' order. */
export function circuitParts(index: SoyuzIndex, circuitId: string): { all: number[]; steps: number[][] } {
  const circuit = index.content.circuits.find((c) => c.id === circuitId);
  if (!circuit) return { all: [], steps: [] };
  const stepAt = new Map(circuit.steps.map((s, k) => [index.content.circuitSteps.indexOf(s.id), k]));
  const steps: number[][] = circuit.steps.map(() => []);
  const all: number[] = [];
  index.content.items.forEach((p, i) => {
    if (!p.circuits?.includes(circuitId)) return;
    all.push(i);
    for (const s of p.steps ?? []) { const k = stepAt.get(s); if (k !== undefined) steps[k].push(i); }
  });
  return { all, steps };
}
