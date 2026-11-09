/**
 * Soyuz-2.1b / Fregat / ST fairing, as the owner's Anatomy page models the
 * ST31 launch (public/anatomy/soyuz-2-1b-fregat-st31.html, build
 * family-v1-20261026), read by the Structure section from the files
 * scripts/structure-meshes.mjs derives from it (public/structure/).
 *
 * The section assembles the page's eleven assemblies, each where the page
 * puts it — the core (Block A), the four strap-ons (Blocks Б, В, Г, Д), the
 * lattice interstage, Block I, Fregat, the payload envelope and the fairing's
 * two halves — in an order set by what rests on what: the strap-ons and the
 * interstage on the core, Block I on the interstage, Fregat on Block I's
 * adapter, the payload on Fregat, and the fairing, closed last, on Block I
 * round Fregat and the payload. It is the reference only: no swapping
 * engines, stretching stages or changing the vehicle, and passing these rules
 * says nothing of strength (owner, 2026-11-09).
 *
 * At a launch site the Soyuz is assembled lying down, and the upper part
 * (Fregat, the payload and the fairing) is put together on its own before it
 * is joined to Block I (Arianespace, Soyuz User's Manual, 2012). The order
 * here follows the load path standing up, for learning, and the section says
 * so.
 *
 * Also here: which kind of part each of the page's 2,069 parts is (for the
 * colour-by-kind view) and how its shape is known, by rules over the page's
 * own kinds, roles and ids — this pilot's reading of the page's notes, not
 * the page's own labels.
 *
 * DOM-free.
 */
import type { AssemblySpec } from './assembly';
import type { Certainty, PartCategory } from './types';

export type SoyuzUnit =
  | 'core' | 'booster-b' | 'booster-v' | 'booster-g' | 'booster-d' | 'interstage' | 'stage3' | 'fregat' | 'payload' | 'fairing-left' | 'fairing-right';

/** The assemblies, in the reference's order of assembly. */
export const SOYUZ_UNITS: readonly SoyuzUnit[] = [
  'core', 'booster-b', 'booster-v', 'booster-g', 'booster-d', 'interstage', 'stage3', 'fregat', 'payload', 'fairing-left', 'fairing-right',
];

export const SOYUZ_BOOSTERS: readonly SoyuzUnit[] = ['booster-b', 'booster-v', 'booster-g', 'booster-d'];

/**
 * Units that can be offered turned about their own axis, in quarter turns:
 * a strap-on, whose cone leans in to the core's ball joint and whose fin
 * stands outward, and Fregat, whose six spheres and attachment posts line up
 * with Block I's adapter. Only the reference's way round (0) fits.
 */
const QUARTER_TURNS: ReadonlySet<SoyuzUnit> = new Set(['booster-b', 'booster-v', 'booster-g', 'booster-d', 'fregat']);

const REQUIRES: Readonly<Record<SoyuzUnit, readonly SoyuzUnit[]>> = {
  core: [],
  'booster-b': ['core'],
  'booster-v': ['core'],
  'booster-g': ['core'],
  'booster-d': ['core'],
  interstage: ['core'],
  stage3: ['interstage'],
  fregat: ['stage3'],
  payload: ['fregat'],
  'fairing-left': ['stage3', 'payload'],
  'fairing-right': ['stage3', 'payload'],
};

/** Each assembly's one slot is the place the page gives it: a slot is named after its unit. */
export const SOYUZ_ASSEMBLY: AssemblySpec = {
  units: SOYUZ_UNITS.map((id) => ({ id, slots: [id], requires: REQUIRES[id], orientations: QUARTER_TURNS.has(id) ? 4 : 1 })),
  slots: SOYUZ_UNITS.map((id) => ({ id, reference: id })),
};

/** How two assemblies meet (the info panel's relations; the hint names the interface). */
export type SoyuzJoint = 'strapOn' | 'truss' | 'adapter' | 'payloadRing' | 'fairingBase' | 'fairingSeam' | 'encloses';

export interface SoyuzRelation { a: SoyuzUnit; b: SoyuzUnit; joint: SoyuzJoint }

export const SOYUZ_RELATIONS: readonly SoyuzRelation[] = [
  ...SOYUZ_BOOSTERS.map((a): SoyuzRelation => ({ a, b: 'core', joint: 'strapOn' })),
  { a: 'interstage', b: 'core', joint: 'truss' },
  { a: 'stage3', b: 'interstage', joint: 'truss' },
  { a: 'fregat', b: 'stage3', joint: 'adapter' },
  { a: 'payload', b: 'fregat', joint: 'payloadRing' },
  { a: 'fairing-left', b: 'stage3', joint: 'fairingBase' },
  { a: 'fairing-right', b: 'stage3', joint: 'fairingBase' },
  { a: 'fairing-left', b: 'fairing-right', joint: 'fairingSeam' },
  { a: 'fairing-left', b: 'payload', joint: 'encloses' },
  { a: 'fairing-right', b: 'payload', joint: 'encloses' },
];

/** The relations a unit takes part in. */
export const relationsOf = (unit: string): SoyuzRelation[] => SOYUZ_RELATIONS.filter((r) => r.a === unit || r.b === unit);

/** The page's component (its Thai guide's entry) for each assembly: the fairing's two halves share one. */
export const SOYUZ_COMPONENT: Readonly<Record<SoyuzUnit, string>> = {
  core: 'core', 'booster-b': 'booster-b', 'booster-v': 'booster-v', 'booster-g': 'booster-g', 'booster-d': 'booster-d',
  interstage: 'interstage', stage3: 'stage3', fregat: 'fregat', payload: 'payload', 'fairing-left': 'fairing', 'fairing-right': 'fairing',
};

export const isSoyuzUnit = (id: string): id is SoyuzUnit => (SOYUZ_UNITS as readonly string[]).includes(id);

// ─── kinds of part, and how their shapes are known ───────────────────────────

/** A part as the content file records it (scripts/structure-meshes.mjs). */
export interface SoyuzPartRecord {
  id: string;
  unit: string;
  kind: 'shell' | 'structural' | 'interior' | 'engine' | string;
  role?: string;
}

/** The part of an id after its assembly's prefix: `booster-b.stabilizer-fin` → `stabilizer-fin`. */
const local = (id: string): string => id.slice(id.indexOf('.') + 1);

const MECHANISM = /trunnion|yoke|gimbal|steering-actuator|translation-actuator|translation-guide|rotary-coupling/;
const MOUNT = /(?:^|[-\s.])(?:foot|feet|flange|collar|clamp|joint|interface|union|terminal|attachment|contact|bracket|seat|port)(?:[-\s.]|$)/;
const LOAD = /lattice|load-frame|frame-strut|load-post|load-spoke|load-ring|post-ring|support|suspension|brace|band/;
const WALL = /skin|cuff|shield|fin|cover|panel|skirt|transition|barrel|nose|envelope-ring/;
/** Engine parts that carry the engine to the vehicle rather than make thrust. */
const ENGINE_MOUNT = new Set(['engine-frame-foot', 'vehicle-attachment-interface', 'vehicle-aft-interface', 'steering-actuator-frame-foot']);
const ENGINE_LOAD = new Set(['engine-load-frame', 'powerpack-support', 'steering-frame-brace']);
/** Shell-kind parts that belong to an engine (Block I's nozzle jackets). */
const ENGINE_SHELL = new Set(['jacket-joint', 'regenerative-cooling-collector']);

/**
 * Which kind of part, by rules over the page's kind, role and id, in order:
 * mechanisms (gimbals, trunnions, actuators, rotating couplings), then for an
 * engine part its mounts and load frame, else propulsion; for the rest mounts
 * and joints, load-bearing members, walls and skins, and what is left by the
 * page's kind (an inside part is equipment, a structural one load-bearing).
 */
export function soyuzCategory(p: SoyuzPartRecord): PartCategory {
  const name = `${local(p.id)} ${p.role ?? ''}`;
  if (MECHANISM.test(name)) return 'mechanism';
  if (p.kind === 'engine') {
    if (ENGINE_MOUNT.has(p.role ?? '')) return 'mount';
    if (ENGINE_LOAD.has(p.role ?? '')) return 'load';
    return 'propulsion';
  }
  if (p.kind === 'shell' && ENGINE_SHELL.has(p.role ?? '')) return 'propulsion';
  if (p.role === 'representative-payload-envelope') return 'equipment';
  if (MOUNT.test(name)) return 'mount';
  if (LOAD.test(name)) return 'load';
  if (p.kind === 'interior') return 'equipment';
  if (p.kind === 'shell' || WALL.test(name)) return 'wall';
  if (p.role === 'helium-storage-vessel') return 'equipment';
  return 'load';
}

/** Outside features the page draws from photographs of the vehicle (its notes: the strap-ons' fins and cuffs, the truss). */
const SEEN_OUTSIDE = /fin|cuff|shield|lattice|upper-attachment|nose-contact|interface/;

/**
 * How a part's shape is known, from the page's own notes: the outside of the
 * vehicle (skins, the fairing, Fregat's spheres, fins, the truss) is drawn
 * from photographs, its main dimensions from documents (`image`); everything
 * inside — tanks' places, lines, valves, mounts, wall thicknesses — and every
 * part the page calls representative, the payload envelope among them, is an
 * estimate for learning (`estimated`). No part's shape is a production
 * drawing, so none is `documented`: documented figures are the facts.
 */
export function soyuzCertainty(p: SoyuzPartRecord): Certainty {
  if (p.unit === 'payload' || (p.role ?? '').startsWith('representative-')) return 'estimated';
  if (p.kind === 'shell' && !ENGINE_SHELL.has(p.role ?? '') && p.unit !== 'stage3') return 'image';
  if (p.kind === 'shell' && p.unit === 'stage3' && /skin|skirt/.test(local(p.id))) return 'image';
  if (p.kind === 'structural' && /^(?:booster-[bvgd]|core|interstage)$/.test(p.unit) && SEEN_OUTSIDE.test(local(p.id))) return 'image';
  return 'estimated';
}

/**
 * How each of the page's facts is known. The page lists its facts with the
 * component's sources; its notes say which are read from photographs (the
 * strap-on's one fin) and which are not the real hardware (the payload
 * envelope). Everything else is as documented as its sources (`documented`).
 */
export function soyuzFactCertainty(component: string, label: string): Certainty {
  if (/^booster-/.test(component) && label.includes('ครีบ')) return 'image';
  if (component === 'payload' && label.includes('สิ่งที่เห็น')) return 'estimated';
  return 'documented';
}
