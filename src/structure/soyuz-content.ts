/**
 * The Soyuz-2.1b / Fregat model's content file
 * (public/structure/soyuz-2-1b-fregat-st31.json, scripts/structure-meshes.mjs):
 * the owner's Thai guide as the page has it, and one record per part. Read
 * and checked here, and arranged for the three depths: the assemblies
 * (watch), each assembly's groups as the page lists them (explore), each
 * part (engineer).
 *
 * DOM-free.
 */
import type { StructureSource } from './types';
import { SOYUZ_COMPONENT, SOYUZ_UNITS, soyuzCategory, soyuzCertainty, type SoyuzUnit } from './soyuz';
import { CERTAINTIES, PART_CATEGORIES } from './types';

export const SOYUZ_FILES = {
  content: 'structure/soyuz-2-1b-fregat-st31.json',
  layers: {
    outer: 'structure/soyuz-2-1b-fregat-st31.outer.bin',
    inner: 'structure/soyuz-2-1b-fregat-st31.inner.bin',
    engine: 'structure/soyuz-2-1b-fregat-st31.engine.bin',
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
  /** parts it is mounted on (indices) */
  mounts?: number[];
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
  facts: { label: string; value: string }[];
  note: string;
  sourceIds: string[];
  observations: string[];
  groups: SoyuzGroup[];
}

export interface SoyuzCircuit { id: string; label: string; description: string; confidence: string; limitation: string; sourceIds: string[] }

export interface SoyuzContent {
  format: 'orbitlab-structure-content';
  version: 1;
  source: { file: string; sha256: string; title: string };
  assemblies: Record<SoyuzUnit, { move: [number, number, number]; reveal?: [number, number, number]; parts: number }>;
  guide: {
    title: string; subtitle: string; configuration: string; intro: string; statusNote: string;
    reviewWarnings: string[]; geometryReference: Record<string, string | number>;
  };
  sources: StructureSource[];
  circuits: SoyuzCircuit[];
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
  if (!Array.isArray(c.items) || !Array.isArray(c.components) || !c.assemblies || !c.source?.sha256) throw new Error('structure content is incomplete');
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
