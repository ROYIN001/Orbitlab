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
import { requiresOf, type ModelRelation, type MountPoint, type OrderRule } from './model';
import type { Certainty, PartCategory } from './types';

export type SoyuzUnit =
  | 'core' | 'booster-b' | 'booster-v' | 'booster-g' | 'booster-d' | 'interstage' | 'stage3' | 'fregat' | 'payload' | 'fairing-left' | 'fairing-right';

/** The assemblies, in the reference's order of assembly. */
export const SOYUZ_UNITS: readonly SoyuzUnit[] = [
  'core', 'booster-b', 'booster-v', 'booster-g', 'booster-d', 'interstage', 'stage3', 'fregat', 'payload', 'fairing-left', 'fairing-right',
];

export const SOYUZ_BOOSTERS: readonly SoyuzUnit[] = ['booster-b', 'booster-v', 'booster-g', 'booster-d'];
export const SOYUZ_FAIRING: readonly SoyuzUnit[] = ['fairing-left', 'fairing-right'];

/**
 * Units that can be offered turned about their own axis, in quarter turns:
 * a strap-on, whose cone leans in to the core's ball joint and whose fin
 * stands outward, and Fregat, whose six spheres and attachment posts line up
 * with Block I's adapter. Only the reference's way round (0) fits.
 */
const QUARTER_TURNS: ReadonlySet<SoyuzUnit> = new Set<SoyuzUnit>(SOYUZ_BOOSTERS);

/** How two assemblies meet: the joint's name is the text key `soyuz.joint.<joint>`. */
export type SoyuzJoint = 'strapOn' | 'trussLower' | 'trussUpper' | 'adapter' | 'payloadRing' | 'fairingBase' | 'fairingSeam' | 'encloses';

const rel = (a: SoyuzUnit, b: SoyuzUnit, kind: ModelRelation['kind'], joint: SoyuzJoint): ModelRelation =>
  ({ id: `${a}>${b}:${joint}`, a, b, kind, medium: 'structure', joint });

/** How the assemblies meet, each where the page puts it. */
export const SOYUZ_RELATIONS: readonly ModelRelation[] = [
  ...SOYUZ_BOOSTERS.map((a) => rel(a, 'core', 'mounts', 'strapOn')),
  rel('interstage', 'core', 'mounts', 'trussLower'),
  rel('stage3', 'interstage', 'mounts', 'trussUpper'),
  rel('fregat', 'stage3', 'mounts', 'adapter'),
  rel('payload', 'fregat', 'mounts', 'payloadRing'),
  rel('fairing-left', 'stage3', 'mounts', 'fairingBase'),
  rel('fairing-right', 'stage3', 'mounts', 'fairingBase'),
  rel('fairing-left', 'fairing-right', 'connects', 'fairingSeam'),
  rel('fairing-left', 'payload', 'encloses', 'encloses'),
  rel('fairing-right', 'payload', 'encloses', 'encloses'),
  rel('fairing-left', 'fregat', 'encloses', 'encloses'),
  rel('fairing-right', 'fregat', 'encloses', 'encloses'),
];

const after = (unit: SoyuzUnit, a: SoyuzUnit, joint: SoyuzJoint): OrderRule => ({ unit, after: a, why: `soyuz.why.${joint}` });

/**
 * The order the section assembles in, and why (text keys `soyuz.why.*`): by
 * what rests on what, standing up — the strap-ons and the interstage on the
 * core, Block I on the interstage, Fregat on Block I's adapter, the payload
 * on Fregat, and the fairing, closed last, on Block I round Fregat and the
 * payload.
 */
export const SOYUZ_ORDER: readonly OrderRule[] = [
  ...SOYUZ_BOOSTERS.map((b) => after(b, 'core', 'strapOn')),
  after('interstage', 'core', 'trussLower'),
  after('stage3', 'interstage', 'trussUpper'),
  after('fregat', 'stage3', 'adapter'),
  after('payload', 'fregat', 'payloadRing'),
  ...SOYUZ_FAIRING.flatMap((f) => [after(f, 'stage3', 'fairingBase'), after(f, 'payload', 'encloses')]),
];

/** Each assembly's one slot is the place the page gives it: a slot has its unit's id, and a name of its own (`SOYUZ_MOUNTS`). */
export const SOYUZ_ASSEMBLY: AssemblySpec = {
  units: SOYUZ_UNITS.map((id) => ({ id, slots: [id], requires: requiresOf(SOYUZ_ORDER, id), orientations: QUARTER_TURNS.has(id) ? 4 : 1 })),
  slots: SOYUZ_UNITS.map((id) => ({ id, reference: id })),
};

/** The assembly's places, named for where they are (text keys `soyuz.place.*`), numbered from the ground up. */
export const SOYUZ_MOUNTS: readonly MountPoint[] = SOYUZ_UNITS.map((u, k) => ({ slot: u, mark: k + 1, name: `soyuz.place.${u}` }));

/**
 * The parts that are each joint, by the page's ids after the assembly's
 * prefix: on the side of the unit fitted (`a`) and of the unit it is fitted
 * to (`b`). The picture marks a joint at these parts and lights them; a
 * joint with none is one the page draws no hardware for: the line the
 * fairing's halves meet along runs up its length, and the page's
 * `st-joint-…` parts are rings round it at stations, so the seam is named
 * without parts to light. Representative hardware, in the page's own words,
 * not production parts.
 */
export const SOYUZ_INTERFACES: Readonly<Record<SoyuzJoint, { a?: RegExp; b?: RegExp }>> = {
  strapOn: { a: /^(?:nose-contact|upper-attachment)(?:\.|$)/ },
  trussLower: { a: /^lower-interface\./ },
  trussUpper: { b: /^upper-interface\./ },
  adapter: { a: /^lower-(?:load|post)-ring\./, b: /^rd0124-payload-adapter\./ },
  payloadRing: { b: /^payload-load-ring\./ },
  fairingBase: { a: /^st-joint-0\./ },
  fairingSeam: {},
  encloses: {},
};

/**
 * Which assemblies leave at each event of the page's flight sequence
 * (`SoyuzFlight.events`): `skirt` is three panels of Block I, which the
 * content file marks one by one (`leaves`), and `disposal` moves Fregat off.
 */
export const FLIGHT_EVENT_UNITS: Readonly<Record<string, readonly SoyuzUnit[]>> = {
  boosters: SOYUZ_BOOSTERS,
  fairing: SOYUZ_FAIRING,
  core: ['core', 'interstage'],
  skirt: [],
  upper: ['stage3'],
  payload: ['payload'],
  disposal: ['fregat'],
};

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
  /** on a propellant or gas circuit, or carrying a medium */
  circuits?: readonly string[];
  medium?: string;
  /** a mechanism's pivot or axis */
  pivot?: readonly number[];
  axis?: readonly number[];
}

/** The part of an id after its assembly's prefix: `booster-b.stabilizer-fin` → `stabilizer-fin`. */
const local = (id: string): string => id.slice(id.indexOf('.') + 1);

/**
 * Which kind of part each of the page's roles is, where the role alone says
 * it. Read off the page's 145 roles on the files whose parts are marked
 * right (revision 2): a role not listed goes by the rules of
 * `soyuzCategory`.
 */
const ROLE_CATEGORY: Readonly<Record<string, PartCategory>> = {
  // what moves: steering chambers on trunnions and yokes, RD0124's gimbals and actuators, Fregat's sliding chamber
  'steering-trunnion': 'mechanism', 'steering-yoke': 'mechanism', 'single-axis-main-chamber-trunnion': 'mechanism',
  'single-axis-steering-actuator': 'mechanism', 'planar-translation-guide': 'mechanism', 'electrohydraulic-translation-actuator': 'mechanism',
  'steering-oxidizer-rotary-coupling': 'mechanism', 'steering-fuel-rotary-coupling': 'mechanism',
  // where an engine, a tank, a module or an assembly is held
  'engine-frame-foot': 'mount', 'engine-load-frame-foot': 'mount', 'steering-actuator-frame-foot': 'mount',
  'vehicle-attachment-interface': 'mount', 'vehicle-aft-interface': 'mount', 'payload-interface': 'mount', 'stage-interface': 'mount',
  'representative-load-interface': 'mount', 'module-joint': 'mount', 'skin-joining-flange': 'mount', 'representative-post-clamp': 'mount',
  'representative-curved-vessel-foot': 'mount', 'representative-planar-casing-foot': 'mount', 'helium-vessel-support': 'mount',
  'tank-to-shell-support': 'mount', 'auxiliary-tank-suspension': 'mount',
  // what carries thrust and weight
  'engine-load-frame': 'load', 'powerpack-support': 'load', 'steering-frame-brace': 'load', 'fixed-steering-yoke-bridge': 'load',
  'representative-structural-support': 'load', 'representative-radial-load-spoke': 'load', 'stage-load-post': 'load',
  'tank-support-with-service-passages': 'load',
  // what is carried inside
  'intertank-avionics': 'equipment', 'avionics-equipment': 'equipment', 'chemical-battery': 'equipment', 'avionics-sphere': 'equipment',
  'helium-storage-vessel': 'equipment', 'representative-payload-envelope': 'equipment',
  // skins and what closes them
  'three-part-jettisoned-skirt': 'wall', 'block-i-skin': 'wall', 'tank-circumferential-weld': 'wall', 'sealed-fuel-transit-drywell': 'wall',
  'equipment-bay-cover': 'wall',
};

/** Parts the page gives no role, by what their id says, in order. */
const STEM_CATEGORY: readonly (readonly [RegExp, PartCategory])[] = [
  [/^(?:nose-contact|upper-attachment|lower-interface|upper-interface|st-joint)/, 'mount'],
  [/^(?:duct-clamp|raceway-clamp)/, 'mount'],
  [/^(?:fuel-support|tank-support)/, 'mount'],
  [/^(?:lattice-|tank-band|circumferential-band)/, 'load'],
  [/^(?:avionics-can|guidance-deck)/, 'equipment'],
];

/**
 * Which kind of part: what moves (a pivot or axis of its own, or a role that
 * says so); else what its role says (`ROLE_CATEGORY`); else an engine part,
 * or any part on a propellant or gas circuit — tanks, lines, unions and
 * collars among them — is the propulsion system's; else what its id says
 * (`STEM_CATEGORY`); and what is left by the page's own kind: an inside part
 * is equipment, a structural one carries load, a shell is a wall. The joints
 * between assemblies are mounts; a pipe's fittings are the propulsion
 * system's, not mounts.
 */
export function soyuzCategory(p: SoyuzPartRecord): PartCategory {
  const role = p.role ?? '';
  // a gimballed chamber has a pivot too, and stays the propulsion system's: its bearings and actuators are the mechanism
  if (ROLE_CATEGORY[role] === 'mechanism' || ((p.pivot || p.axis) && p.kind !== 'engine')) return 'mechanism';
  if (Object.hasOwn(ROLE_CATEGORY, role)) return ROLE_CATEGORY[role];
  if (p.kind === 'engine' || p.circuits?.length || p.medium) return 'propulsion';
  const name = local(p.id);
  for (const [stem, category] of STEM_CATEGORY) if (stem.test(name)) return category;
  if (p.kind === 'interior') return 'equipment';
  if (p.kind === 'structural' && !/cuff|shield|fin/.test(name)) return 'load';
  return 'wall';
}

/** Shell-kind parts that belong to an engine (Block I's nozzle jackets). */
const ENGINE_SHELL = new Set(['jacket-joint', 'regenerative-cooling-collector']);

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
