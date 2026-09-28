/**
 * What a part card says about a piece of hardware (the Build section: the
 * Watch level's exploded view opens one when a part is clicked; D02 and D03
 * will show the same card for a design's parts).
 *
 * The numbers are the ones the vehicle flies, read from its spec, and the
 * card names the D01 catalogue part they come from (src/data/parts.ts),
 * with that part's sources. Two honesty rules from the catalogue carry over:
 *
 * - A vacuum-only engine's sea-level thrust and Isp are placeholders the spec
 *   format requires, not data (parts.ts, "VACUUM-ONLY ENGINES"). The card
 *   leaves them out rather than print invented numbers.
 * - A solid motor's thrust is its mean over the burn; its published peak is
 *   `peakFactor` times that. A lumped entry is not one real engine, so its
 *   count is not a count of engines. The card says which.
 *
 * An engine's published dry mass appears only when its catalogue part
 * carries one (a `dryMass` field; the base catalogue has none yet, so this
 * card shows none).
 *
 * Sources are free text in the catalogue ("https://… (note); …"). They are
 * split into the links they cite and the references that are not links, and
 * the catalogue's standard "not cited in the data" phrase becomes a flag the
 * screen words in its own language.
 *
 * DOM-free, SI (N, s, kg, m). tests/design-part-card.test.ts.
 */
import type { EngineSpec, VehicleSpec } from '../types';
import { UNCITED, type EngineKind, type EnginePart } from '../data/parts';
import type { PropellantFamily } from '../physics/rigid/vehicle-data';
import { interstageParts } from './interstages';
import { vehicleParts } from './vehicle-parts';

export type SourceItem = { kind: 'link'; url: string } | { kind: 'text'; text: string };

export interface Sources {
  items: SourceItem[];
  /** the catalogue's "not cited" note: for none of the figures, some, or all */
  uncited: 'none' | 'partly' | 'all';
}

export interface EngineCard {
  /** catalogue part id, null for an engine no part emits */
  partId: string | null;
  /** the engine's name, as data (a proper name) */
  name: string;
  kind: EngineKind | null;
  family: PropellantFamily | null;
  /** engines on the stage, or on one strap-on */
  count: number;
  /** per engine, N and s; the sea-level pair is null on a vacuum-only engine (not data) */
  thrustSL: number | null;
  thrustVac: number;
  ispSL: number | null;
  ispVac: number;
  solid: boolean;
  /** a solid's published peak over its mean */
  peakFactor: number | null;
  minThrottle: number | null;
  vacuumOnly: boolean;
  historical: boolean;
  /** published dry mass of one engine, kg, when the catalogue part carries one */
  dryMass: number | null;
  sources: Sources | null;
}

export interface BodyCard {
  partId: string | null;
  /** the stage's name in the data (the screen shows its translation) */
  name: string;
  stageId: string;
  /** kg, m; a strap-on's per unit */
  dryMass: number;
  propellantMass: number;
  diameter: number;
  length: number;
  /** ε = dry / (dry + propellant), and the propellant's share */
  structuralRatio: number;
  propellantFraction: number;
  sources: Sources | null;
}

export type PartCard =
  | { kind: 'stage'; ref: string; stageIndex: number; body: BodyCard; engine: EngineCard }
  | { kind: 'booster'; ref: string; stageIndex: number; group: number; units: number; body: BodyCard; engine: EngineCard }
  | {
    kind: 'fairing'; ref: string; partId: string | null; mass: number; diameter: number; length: number;
    /** its own lower cone, m, or null */
    adapter: number | null;
    /** jettison altitude floor, m, and the operator's published time, s after liftoff, if there is one */
    sepAltitude: number; sepTime: number | null; sources: Sources | null;
  }
  | { kind: 'interstage'; ref: string; stageIndex: number; lowerDiameter: number; upperDiameter: number; height: number; carries: string };

const URL_RE = /https?:\/\/[^\s;,]+/g;

/** A URL as written in running text: a closing bracket or full stop after it belongs to the text. */
function trimUrl(url: string): string {
  let out = url.replace(/[.,:]+$/, '');
  while (out.endsWith(')') && (out.match(/\(/g) ?? []).length < (out.match(/\)/g) ?? []).length) out = out.slice(0, -1);
  return out;
}

/**
 * A catalogue source, split into what it cites: its links, and the
 * references that are not links (a flight manual, a magazine, the owner's
 * figures), each as the catalogue records it.
 */
export function sourceItems(source: string): Sources {
  const items: SourceItem[] = [];
  let uncitedParts = 0, parts = 0;
  for (const raw of source.split(';')) {
    const part = raw.trim();
    if (!part) continue;
    parts++;
    if (part.includes(UNCITED)) { uncitedParts++; continue; }
    const urls = [...part.matchAll(URL_RE)].map((m) => trimUrl(m[0]));
    if (urls.length) {
      for (const url of urls) if (!items.some((i) => i.kind === 'link' && i.url === url)) items.push({ kind: 'link', url });
      continue;
    }
    items.push({ kind: 'text', text: part });
  }
  const uncited = uncitedParts === 0 ? 'none' : uncitedParts === parts ? 'all' : 'partly';
  return { items, uncited };
}

/** A link's text: the address without its scheme, readable (a Wikipedia title with spaces). */
export function linkText(url: string): string {
  const bare = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
  try { return decodeURI(bare).replace(/_/g, ' '); } catch { return bare; }
}

/** The published dry mass of one engine, when the catalogue part carries it. */
export function engineDryMass(part: EnginePart | null): number | null {
  const m = (part as { dryMass?: unknown } | null)?.dryMass;
  return typeof m === 'number' && Number.isFinite(m) && m > 0 ? m : null;
}

function engineCard(e: EngineSpec, part: EnginePart | null): EngineCard {
  const vacuumOnly = !!e.vacuumOnly;
  return {
    partId: part?.id ?? null,
    name: e.name,
    kind: part?.kind ?? null,
    family: part?.family ?? null,
    count: e.count,
    thrustSL: vacuumOnly ? null : e.thrustSL,
    thrustVac: e.thrustVac,
    ispSL: vacuumOnly ? null : e.ispSL,
    ispVac: e.ispVac,
    solid: !!e.solid,
    peakFactor: e.solid ? e.peakFactor ?? null : null,
    minThrottle: e.minThrottle ?? null,
    vacuumOnly,
    historical: !!part?.historical,
    dryMass: engineDryMass(part),
    sources: part ? sourceItems(part.source) : null,
  };
}

function bodyCard(b: { id: string; name: string; dryMass: number; propellantMass: number; diameter: number; length: number }, part: { id: string; source: string } | null): BodyCard {
  const total = b.dryMass + b.propellantMass;
  return {
    partId: part?.id ?? null,
    name: b.name,
    stageId: b.id,
    dryMass: b.dryMass,
    propellantMass: b.propellantMass,
    diameter: b.diameter,
    length: b.length,
    structuralRatio: b.dryMass / total,
    propellantFraction: b.propellantMass / total,
    sources: part ? sourceItems(part.source) : null,
  };
}

/**
 * The card of a piece of hardware, by its drawing ref ('stage:1',
 * 'booster:0:0', 'fairing', 'interstage:0'; src/design/exploded.ts), or null
 * for a ref the vehicle does not have.
 */
export function partCard(spec: VehicleSpec, ref: string): PartCard | null {
  const cat = vehicleParts(spec);
  const [kind, a, b] = ref.split(':');
  const i = Number(a), k = Number(b);
  if (kind === 'stage') {
    const st = spec.stages[i];
    if (!st) return null;
    return { kind, ref, stageIndex: i, body: bodyCard(st, cat.stages[i].body), engine: engineCard(st.engine, cat.stages[i].engine) };
  }
  if (kind === 'booster') {
    const g = spec.stages[i]?.boosters?.[k];
    if (!g) return null;
    const c = cat.boosters[i][k];
    return { kind, ref, stageIndex: i, group: k, units: g.count, body: bodyCard(g, c.body), engine: engineCard(g.engine, c.engine) };
  }
  if (kind === 'fairing') {
    const f = spec.fairing;
    if (!f) return null;
    return {
      kind, ref, partId: cat.fairing?.id ?? null, mass: f.mass, diameter: f.diameter, length: f.length, adapter: f.adapter ?? null,
      sepAltitude: f.sepAltitude, sepTime: f.sepTime ?? null, sources: cat.fairing ? sourceItems(cat.fairing.source) : null,
    };
  }
  if (kind === 'interstage') {
    const s = interstageParts(spec).find((p) => p.stageIndex === i);
    if (!s) return null;
    return { kind, ref, stageIndex: i, lowerDiameter: s.lowerDiameter, upperDiameter: s.upperDiameter, height: s.height, carries: s.carries };
  }
  return null;
}
