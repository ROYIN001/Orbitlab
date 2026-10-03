/**
 * The Build section's Explore level as data (roadmap D02 "remix a real
 * rocket", D03 "build from parts"): what the student has chosen, and the
 * vehicle that makes. The screen (src/ui/build/explore-level.ts) only draws
 * this state and edits it; everything that decides what the vehicle is
 * lives here, DOM-free, and tests/design-explore-model.test.ts holds it to
 * its promises.
 *
 * TWO DRAFTS, ONE PER MODE. A remix and a parts design are two rockets: the
 * state keeps one of each (`ExploreState.remix`, `.parts`), each with its
 * own id, name, payload and saved record, so switching mode never loses the
 * other's work.
 *
 * A REMIX (D02) is a base vehicle and the changes made to it, turned into
 * src/design/remix.ts's ops in a fixed order (`remixOps`): each stage's
 * stretch, then its engine swap (a stretch scales the tanks built for the
 * engines the stage has; the swap then trades engines by their published
 * masses), then strap-on groups taken off (highest index first, so the
 * others keep theirs), then groups added, then the fairing. The base is a
 * catalogue vehicle or a design saved earlier. With no change at all the
 * remix is the base itself under the draft's id and name, so its figures are
 * the catalogue's exactly (the test compares them).
 *
 * A PARTS DESIGN (D03) is a list of stages — each a catalogue stage body or
 * a body of one's own, with an engine and a count — the first stage's
 * strap-on groups (catalogue strap-on bodies), a fairing and a launch site,
 * put together by src/design/assemble.ts.
 *
 * WHAT IS REFUSED is what the remix and the assembly refuse, with their
 * codes, plus three checks of this level's own that let the screen say which
 * field is wrong rather than "out of limits": an empty name, a payload that
 * is not a mass, and a figure of a body of one's own outside the validator's
 * bounds (src/config/vehicle-spec.ts, `PART_LIMITS`).
 *
 * LOADING A SAVED DESIGN (`draftFromSpec`). A design is kept as the
 * `VehicleSpec` it flies (src/design/design-store.ts), which says nothing of
 * the choices that made it. So a spec is opened in the parts builder when a
 * parts design can be found that assembles to exactly that spec — found part
 * by part, and then checked whole — and otherwise as the base of a remix with
 * no changes, which is exactly that spec too. Either way the vehicle loaded
 * is the vehicle saved, to the last field (tested for all 21 catalogue
 * vehicles and for remixes and parts designs).
 *
 * RATINGS. A design's payload ratings are computed by flying it
 * (src/design/ratings.ts, estimates). A computed rating is kept with the
 * signature of the vehicle it was computed for (`ratingsSignature`: the spec
 * without its id, name and ratings), and any change to the vehicle leaves it
 * behind. Until then a parts design has none (0, which the pre-flight verdict
 * reads as "no rating"), and a remix carries its base's, flagged
 * `originRatings`: the screen says "unknown", never 0.
 *
 * DOM-free, SI (kg, m).
 */
import type { BoosterGroupSpec, StageSpec, VehicleSpec } from '../types';
import { VEHICLES, isCatalogueVehicle, vehicleById } from '../data/vehicles';
import {
  BOOSTER_BODIES, ENGINE_PARTS, FAIRING_PARTS, STAGE_BODIES, boosterSpec, enginePart, enginePartOf, lockedEngineCount, stageBody, stageSpec,
  type BoosterInstall, type EnginePart, type StageInstall,
} from '../data/parts';
import { SITES } from '../data/sites';
import { PART_ID_PATTERN, PART_LIMITS } from '../config/vehicle-spec';
import type { PropellantFamily } from '../physics/rigid/vehicle-data';
import { RemixRefused, engineName, remix, type RemixOp } from './remix';
import {
  AssembleRefused, FLEET_MAX_ACCEL, FLEET_MAX_Q, assemble, type CustomBody, type DesignFairing, type DesignRatings, type PartsDesign,
} from './assemble';
import { FLEET_FAIRING_SEP_ALTITUDE } from './remix';
import { designWarnings } from './warnings';
import { fairingOf, vehicleParts } from './vehicle-parts';
import { watchPayload } from './stage-table';
import {
  exploreCheckText, estimateText, uniqueEstimates, warningText,
  type BodyField, type DesignEstimate, type DesignRefusal, type DesignText, type ExploreCheck,
} from './warning-text';

export type ExploreMode = 'remix' | 'parts';
export const EXPLORE_MODES: readonly ExploreMode[] = ['remix', 'parts'];

/** An engine installation: an engine part and how many. */
export interface EngineChoice {
  part: string;
  count: number;
}

/** A stretch (propellant × factor, 1 = none) and an engine swap for one of the base's stages. */
export interface RemixStageEdit {
  stretch: number;
  /** another installation in place of the base's; absent keeps the base's */
  engine?: EngineChoice;
}

export type RemixBase = { kind: 'catalogue'; id: string } | { kind: 'design'; spec: VehicleSpec };

export interface RemixEdit {
  base: RemixBase;
  /** one per stage of the base */
  stages: RemixStageEdit[];
  /** the base's first-stage strap-on groups taken off, by index */
  removedGroups: number[];
  /** catalogue strap-on groups added to the first stage, lit on the pad */
  addedGroups: { body: string; count: number }[];
  /** a catalogue fairing in place of the base's; null keeps the base's */
  fairing: string | null;
}

export type PartsBody = { kind: 'catalogue'; id: string } | { kind: 'own'; body: CustomBody };

export interface PartsStage {
  body: PartsBody;
  engine: EngineChoice;
  /** installation fields a loaded design carried (staging delays, livery…), kept as they were; the screen does not edit them */
  install?: Omit<StageInstall, 'boosters'>;
}

export interface PartsGroup {
  /** a catalogue strap-on body */
  body: string;
  count: number;
  install?: BoosterInstall;
}

export interface PartsEdit {
  /** launch sites; the first is the vehicle's own */
  sites: string[];
  stages: PartsStage[];
  /** the first stage's strap-on groups */
  groups: PartsGroup[];
  fairing: DesignFairing | null;
  /** vehicle fields a loaded design carried, kept as they were */
  keep?: Pick<PartsDesign, 'country' | 'manufacturer' | 'maxQ' | 'maxAccel' | 'guidanceDefaults' | 'derivedFrom'>;
}

/** Ratings computed for a design, with the signature of the vehicle they were computed for. kg; estimates. */
export interface RatingsRecord {
  signature: string;
  payloadLEO: number;
  payloadGTO: number;
  payloadSSO?: number;
}

export interface Draft<E> {
  /** the vehicle's id (a custom vehicle's: `PART_ID_PATTERN`, never a catalogue id) */
  id: string;
  name: string;
  /** the payload the figures and the warnings are worked out at, and the flight carries, kg */
  payloadKg: number;
  /** the design store's record it was saved as or opened from */
  recordId: string | null;
  ratings: RatingsRecord | null;
  edit: E;
}

export interface ExploreState {
  mode: ExploreMode;
  remix: Draft<RemixEdit>;
  parts: Draft<PartsEdit>;
}

/** Where a design's payload ratings come from, as the screen says it. */
export type RatingsSource =
  /** computed for this very vehicle (estimates) */
  | 'computed'
  /** a catalogue vehicle's own published figures (a remix with no change) */
  | 'published'
  /** the base's, which no longer describe the remix */
  | 'base'
  /** none: a parts design until it is computed */
  | 'none';

export type DesignResult =
  | {
    ok: true;
    spec: VehicleSpec;
    estimates: DesignEstimate[];
    ratings: RatingsSource;
    /** whose ratings a `base` source is */
    ratingsOwner: string;
    /** `ratingsSignature(spec)` */
    signature: string;
  }
  | { ok: false; refusal: DesignRefusal };

/** How far a stage can be stretched or shrunk from the Explore level: 50 % to 200 % of its propellant (roadmap D02). */
export const STRETCH_RANGE: readonly [number, number] = [0.5, 2];
/** The parts builder's payload before the student sets one, kg. */
export const PARTS_DEFAULT_PAYLOAD = 5000;
/** Strap-ons a new group starts with. */
export const DEFAULT_GROUP = { body: 'gem63', count: 2 } as const;

// ─── ids and names ──────────────────────────────────────────────────────────

/**
 * A vehicle id for a new design: its name in Latin letters and digits, and a
 * suffix from the clock, so two designs of one name do not share an id. A
 * name with no Latin letter (a Russian or Thai one) gives `design-…`. Always
 * `PART_ID_PATTERN`, never a catalogue vehicle's id.
 */
export function newDesignId(name: string, now: number = Date.now()): string {
  const slug = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 26).replace(/-+$/, '');
  const suffix = Math.max(0, Math.floor(now)).toString(36).slice(-6);
  const id = `${/^[a-z0-9]/.test(slug) ? slug : 'design'}-${suffix}`;
  return PART_ID_PATTERN.test(id) && !isCatalogueVehicle(id) ? id : `design-${suffix}`;
}

// ─── the drafts a level starts with ─────────────────────────────────────────

/** A remix of catalogue vehicle `vehicleId` with nothing changed yet, at half its rated LEO payload (the Watch level's). */
export function remixDraft(vehicleId: string, id: string, name: string): Draft<RemixEdit> {
  const base = vehicleById(vehicleId);
  return {
    id, name, payloadKg: watchPayload(base), recordId: null, ratings: null,
    edit: { base: { kind: 'catalogue', id: vehicleId }, stages: base.stages.map(() => ({ stretch: 1 })), removedGroups: [], addedGroups: [], fairing: null },
  };
}

/** The parts builder's first design: Falcon 9's two stage bodies and its fairing, from Cape Canaveral — a known rocket to change part by part. */
export function partsDraft(id: string, name: string): Draft<PartsEdit> {
  const s1 = stageBody('s1'), s2 = stageBody('s2');
  return {
    id, name, payloadKg: PARTS_DEFAULT_PAYLOAD, recordId: null, ratings: null,
    edit: {
      sites: ['cape'],
      stages: [
        { body: { kind: 'catalogue', id: s1.id }, engine: { ...s1.engine } },
        { body: { kind: 'catalogue', id: s2.id }, engine: { ...s2.engine } },
      ],
      groups: [],
      fairing: { part: 'falcon9' },
    },
  };
}

/**
 * A new stage of one's own for the end of the stack: a kerolox first stage
 * (Falcon 9's first-stage figures, rounded) when the stack is empty, else a
 * kerolox upper stage lit in the air (RD-0124 figures, sized between Blok I
 * and Falcon 9's second stage). Starting points to change, not designs.
 */
export function newStage(index: number): PartsStage {
  return index === 0
    ? { body: { kind: 'own', body: { dryMass: 22000, propellantMass: 400000, diameter: 3.7, length: 40, family: 'kerolox' } }, engine: { part: 'merlin1d', count: 9 } }
    : { body: { kind: 'own', body: { dryMass: 3000, propellantMass: 40000, diameter: 3, length: 10, family: 'kerolox' } }, engine: { part: 'rd0124', count: 1 } };
}

/**
 * The stage as a body of one's own with the figures it flies now (dry mass,
 * propellant, size, and what its engine burns), and the same engine: the
 * student changes the figures from there. `flown` is the stage as the last
 * built vehicle has it, which already counts an engine swap in the dry mass.
 */
export function asOwnBody(stage: PartsStage, flown: StageSpec): PartsStage {
  if (stage.body.kind === 'own') return stage;
  const family = enginePart(stage.engine.part).family;
  return {
    ...stage,
    body: { kind: 'own', body: { dryMass: flown.dryMass, propellantMass: flown.propellantMass, diameter: flown.diameter, length: flown.length, family } },
  };
}

// ─── engines a stage may take ───────────────────────────────────────────────

export interface EngineOptions {
  /** engines offered, the one installed first */
  options: EnginePart[];
  /** why the engine cannot be changed at all: a solid motor is its stage's casing and grain; an engine no catalogue part emits has no family to match */
  swapLocked: 'solid' | 'notCatalogue' | null;
  /** why the count of `selected` cannot change: a solid body is one motor; a lumped or cluster entry's count is not a count of engines */
  countLocked: 'solid' | 'lumped' | 'cluster' | null;
  /** what was left out of `options`, so the screen can say why */
  leftOut: { lumped: boolean; vacuum: boolean };
}

/**
 * The engines a stage (or a body of one's own) may carry: the ordinary
 * engine parts of its propellant family — never a lumped or cluster entry,
 * whose `count` is not a count of engines and must never change (the parts
 * catalogue's "count is load-bearing"), and never a vacuum engine where it
 * would light on the pad — with the one it has first, whatever its kind.
 * `selected` is the part chosen now, whose count may be locked.
 */
export function engineOptions(o: { family: PropellantFamily; installed: EnginePart | null; selected: string | null; groundLit: boolean; solidBody: boolean }): EngineOptions {
  if (o.solidBody) {
    // a catalogue solid body is its motor; a body of one's own chooses one, but only one
    const options = o.installed ? [o.installed]
      : ENGINE_PARTS.filter((p) => p.kind === 'engine' && p.solid === true);
    return { options, swapLocked: o.installed ? 'solid' : null, countLocked: 'solid', leftOut: { lumped: false, vacuum: false } };
  }
  const sameFamily = ENGINE_PARTS.filter((p) => p.family === o.family && !p.solid);
  const options = sameFamily.filter((p) => p.kind === 'engine' && !(o.groundLit && p.vacuumOnly));
  if (o.installed) {
    const at = options.indexOf(o.installed);
    if (at >= 0) options.splice(at, 1);
    options.unshift(o.installed);
  }
  const selected = o.selected ? ENGINE_PARTS.find((p) => p.id === o.selected) ?? null : o.installed;
  const locked = selected ? lockedEngineCount(selected.id) : undefined;
  return {
    options,
    swapLocked: null,
    countLocked: locked === undefined ? null : selected!.kind === 'cluster' ? 'cluster' : 'lumped',
    leftOut: { lumped: sameFamily.some((p) => p.kind !== 'engine' && p !== o.installed), vacuum: o.groundLit && sameFamily.some((p) => p.vacuumOnly) },
  };
}

/** The engine options of a remix's base stage `i` (or strap-on group), from the engine it has. */
export function remixEngineOptions(base: VehicleSpec, stage: number, selected: string | null): EngineOptions {
  const st = base.stages[stage];
  const installed = enginePartOf(st.engine);
  if (!installed) return { options: [], swapLocked: 'notCatalogue', countLocked: null, leftOut: { lumped: false, vacuum: false } };
  return engineOptions({ family: installed.family, installed, selected, groundLit: stage === 0, solidBody: installed.solid === true });
}

/** The engine options of a parts stage. */
export function partsEngineOptions(stage: PartsStage, index: number): EngineOptions {
  if (stage.body.kind === 'catalogue') {
    const own = enginePart(stageBody(stage.body.id).engine.part);
    return engineOptions({ family: own.family, installed: own, selected: stage.engine.part, groundLit: index === 0, solidBody: own.solid === true });
  }
  const family = stage.body.body.family;
  return engineOptions({ family, installed: null, selected: stage.engine.part, groundLit: index === 0, solidBody: family === 'solid' });
}

/**
 * A parts stage with an engine it may carry: the one it has when that is
 * still offered (after its body, its family or its place in the stack
 * changed), else the first offered, at a count it may have.
 */
export function fitEngine(stage: PartsStage, index: number): PartsStage {
  const o = partsEngineOptions(stage, index);
  const keep = o.options.find((p) => p.id === stage.engine.part);
  const part = keep ?? (stage.body.kind === 'catalogue' ? enginePart(stageBody(stage.body.id).engine.part) : o.options[0]);
  if (!part) return stage;
  const locked = lockedEngineCount(part.id);
  const count = part.solid ? 1 : locked ?? (keep ? stage.engine.count : stage.body.kind === 'catalogue' ? stageBody(stage.body.id).engine.count : 1);
  return { ...stage, engine: { part: part.id, count } };
}

// ─── where the catalogue's parts come from (for the screen's lists) ─────────

let origins: { stages: Map<string, string>; boosters: Map<string, string> } | null = null;
/** The catalogue vehicle each stage body and strap-on body is first flown on, by body id. */
export function partOrigins(): { stages: ReadonlyMap<string, string>; boosters: ReadonlyMap<string, string> } {
  if (origins) return origins;
  const stages = new Map<string, string>(), boosters = new Map<string, string>();
  for (const v of VEHICLES) {
    const parts = vehicleParts(v);
    parts.stages.forEach((p) => { if (p.body && !stages.has(p.body.id)) stages.set(p.body.id, v.id); });
    parts.boosters.flat().forEach((p) => { if (p.body && !boosters.has(p.body.id)) boosters.set(p.body.id, v.id); });
  }
  origins = { stages, boosters };
  return origins;
}

// ─── the vehicle ────────────────────────────────────────────────────────────

/** The base vehicle of a remix. */
export function remixBase(base: RemixBase): VehicleSpec {
  return base.kind === 'catalogue' ? vehicleById(base.id) : base.spec;
}

/** The remix's changes as src/design/remix.ts's ops, in the order the module comment gives. A change that changes nothing is no op. */
export function remixOps(base: VehicleSpec, edit: RemixEdit): RemixOp[] {
  const ops: RemixOp[] = [];
  edit.stages.forEach((s, i) => {
    const st = base.stages[i];
    if (!st) return;
    if (s.stretch !== 1) ops.push({ op: 'stretch', target: { stage: i }, factor: s.stretch });
    if (s.engine) {
      const installed = enginePartOf(st.engine);
      if (!(installed && installed.id === s.engine.part && st.engine.count === s.engine.count)) {
        ops.push({ op: 'swapEngine', target: { stage: i }, part: s.engine.part, count: s.engine.count });
      }
    }
  });
  const groups = base.stages[0].boosters?.length ?? 0;
  [...new Set(edit.removedGroups)].filter((g) => g >= 0 && g < groups).sort((a, b) => b - a)
    .forEach((group) => ops.push({ op: 'removeBoosters', group }));
  for (const g of edit.addedGroups) ops.push({ op: 'addBoosters', body: g.body, count: g.count });
  if (edit.fairing !== null) {
    const was = base.fairing ? fairingOf(base.fairing) : null;
    if (!was || was.id !== edit.fairing) ops.push({ op: 'fairing', part: edit.fairing });
  }
  return ops;
}

type Obj = Record<string, unknown>;
const sortKeys = (v: unknown): unknown => (Array.isArray(v) ? v.map(sortKeys)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys((v as Obj)[k])])) : v);
/** Plain data equal field for field, whatever the order of the keys. */
export const sameSpec = (a: unknown, b: unknown): boolean => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));

/** What a computed rating is valid for: the vehicle without its id, its name and its ratings. */
export function ratingsSignature(spec: VehicleSpec): string {
  const { id: _i, name: _n, payloadLEO: _l, payloadGTO: _g, payloadSSO: _s, ...rest } = spec;
  return JSON.stringify(sortKeys(rest));
}

/** `spec` is catalogue vehicle `origin` itself, but for its id, its name and the origin it names. */
function sameAsCatalogue(spec: VehicleSpec, origin: VehicleSpec): boolean {
  const { id: _i, name: _n, derivedFrom: _d, ...a } = spec;
  const { id: _j, name: _m, ...b } = origin;
  return sameSpec(a, b);
}

const detailOf = (e: Error): string | undefined => /\(([^()]*(?:\([^()]*\)[^()]*)*)\)$/.exec(e.message)?.[1];

/** The level's own checks on a name and a payload. */
function draftRefusal(d: Draft<unknown>): DesignRefusal | null {
  if (!d.name.trim()) return { code: 'noName' };
  if (!(Number.isFinite(d.payloadKg) && d.payloadKg >= 0)) return { code: 'badPayload' };
  return null;
}

/** A remix draft's vehicle, or why it is refused. */
export function remixResult(d: Draft<RemixEdit>): DesignResult {
  const early = draftRefusal(d);
  if (early) return { ok: false, refusal: early };
  const base = remixBase(d.edit.base);
  const ops = remixOps(base, d.edit);
  let made;
  try {
    made = remix(base, ops, d.id, d.name.trim());
  } catch (e) {
    if (!(e instanceof RemixRefused)) throw e;
    const op = ops[e.op];
    const detail = detailOf(e);
    const where: Partial<DesignRefusal> = detail?.startsWith('height') ? {}
      : op?.op === 'stretch' || op?.op === 'swapEngine' ? { stage: op.target.stage, ...(op.target.group !== undefined ? { group: op.target.group } : {}) }
        : op?.op === 'removeBoosters' ? { group: op.group }
          : op?.op === 'fairing' ? { fairing: true } : {};
    return { ok: false, refusal: { code: e.code, ...where, ...(detail ? { detail } : {}) } };
  }
  const spec = made.spec;
  const signature = ratingsSignature(spec);
  const origin = spec.derivedFrom !== undefined ? vehicleById(spec.derivedFrom) : null;
  // whose ratings the vehicle carries until its own are computed
  const owner = d.edit.base.kind === 'catalogue' ? base.name
    : origin && origin.payloadLEO === base.payloadLEO && origin.payloadGTO === base.payloadGTO ? origin.name : base.name;
  let ratings: RatingsSource;
  let estimates: DesignEstimate[] = made.estimates;
  if (d.ratings && d.ratings.signature === signature) {
    ratings = 'computed';
    spec.payloadLEO = d.ratings.payloadLEO;
    spec.payloadGTO = d.ratings.payloadGTO;
    if (d.ratings.payloadSSO !== undefined) spec.payloadSSO = d.ratings.payloadSSO;
    else delete spec.payloadSSO;
    estimates = estimates.filter((e) => e.code !== 'originRatings');
  } else if (origin && sameAsCatalogue(spec, origin)) {
    // the catalogue vehicle itself under another id (no change, or a saved copy of it): its published ratings describe it
    ratings = 'published';
    estimates = estimates.filter((e) => e.code !== 'originRatings');
  } else if (spec.payloadLEO === 0 && spec.payloadGTO === 0) ratings = 'none';
  else {
    ratings = 'base';
    if (!estimates.some((e) => e.code === 'originRatings')) estimates = [...estimates, { code: 'originRatings' }];
  }
  return { ok: true, spec, estimates: uniqueEstimates(estimates), ratings, ratingsOwner: owner, signature };
}

const BODY_LIMITS: Record<BodyField, (group: boolean) => number> = {
  dryMass: (g) => (g ? PART_LIMITS.boosterDryMass : PART_LIMITS.stageDryMass),
  propellantMass: (g) => (g ? PART_LIMITS.boosterPropellantMass : PART_LIMITS.stagePropellantMass),
  diameter: () => PART_LIMITS.diameter,
  length: () => PART_LIMITS.length,
};

/** The first figure of a body of one's own outside the validator's bounds, as a refusal. */
function bodyRefusal(body: CustomBody, stage: number): DesignRefusal | null {
  for (const field of ['dryMass', 'propellantMass', 'diameter', 'length'] as const) {
    const v = body[field], max = BODY_LIMITS[field](false);
    if (!(Number.isFinite(v) && v > 0 && v <= max)) return { code: 'fieldRange', stage, field, min: 0, max };
  }
  return null;
}

/** A parts draft as the design src/design/assemble.ts builds. */
export function partsDesign(d: Draft<PartsEdit>, withRatings: DesignRatings | null = null): PartsDesign {
  const e = d.edit;
  return {
    id: d.id, name: d.name.trim(), sites: [...e.sites],
    stages: e.stages.map((s, i) => ({
      body: s.body.kind === 'catalogue' ? s.body.id : { ...s.body.body },
      engine: { ...s.engine },
      ...(s.install && Object.keys(s.install).length ? { install: { ...s.install } } : {}),
      ...(i === 0 && e.groups.length ? { boosters: e.groups.map((g) => ({ body: g.body, count: g.count, ...(g.install ? { install: { ...g.install } } : {}) })) } : {}),
    })),
    fairing: e.fairing ? { ...e.fairing } : null,
    ...(withRatings ? { ratings: { ...withRatings } } : {}),
    ...(e.keep ?? {}),
  };
}

/** A parts draft's vehicle, or why it is refused. */
export function partsResult(d: Draft<PartsEdit>): DesignResult {
  const early = draftRefusal(d);
  if (early) return { ok: false, refusal: early };
  for (const [i, s] of d.edit.stages.entries()) {
    if (s.body.kind === 'own') {
      const r = bodyRefusal(s.body.body, i);
      if (r) return { ok: false, refusal: r };
    }
  }
  // the vehicle without ratings first: its signature says whether the ratings kept are its own
  let bare;
  try {
    bare = assemble(partsDesign(d));
  } catch (e) {
    if (!(e instanceof AssembleRefused)) throw e;
    const detail = detailOf(e);
    return { ok: false, refusal: { code: e.code, ...e.where, ...(detail ? { detail } : {}) } };
  }
  const signature = ratingsSignature(bare.spec);
  if (d.ratings && d.ratings.signature === signature) {
    const rated = assemble(partsDesign(d, { payloadLEO: d.ratings.payloadLEO, payloadGTO: d.ratings.payloadGTO,
      ...(d.ratings.payloadSSO !== undefined ? { payloadSSO: d.ratings.payloadSSO } : {}) }));
    return { ok: true, spec: rated.spec, estimates: uniqueEstimates(rated.estimates), ratings: 'computed', ratingsOwner: '', signature };
  }
  return { ok: true, spec: bare.spec, estimates: uniqueEstimates(bare.estimates), ratings: 'none', ratingsOwner: '', signature };
}

/** The vehicle of the mode on screen. */
export function designResult(state: ExploreState): DesignResult {
  return state.mode === 'remix' ? remixResult(state.remix) : partsResult(state.parts);
}

/** The draft of the mode on screen. */
export const activeDraft = (state: ExploreState): Draft<RemixEdit> | Draft<PartsEdit> => (state.mode === 'remix' ? state.remix : state.parts);

// ─── what the screen says about a vehicle ───────────────────────────────────

/**
 * The Explore level's own check, beside `designWarnings`: a liquid stage
 * whose dry mass (engines included, as a body's is) is less than its
 * engines' published mass alone — a body of one's own typed too light, which
 * nothing else would catch. The catalogue has none (tests/parts-engine-masses).
 */
export function exploreChecks(spec: VehicleSpec): ExploreCheck[] {
  const out: ExploreCheck[] = [];
  const check = (p: StageSpec | BoosterGroupSpec, stage: number): void => {
    const part = enginePartOf(p.engine);
    if (!part || part.solid || part.mass.kg === null) return;
    const enginesMass = part.mass.kg * p.engine.count;
    if (p.dryMass < enginesMass) out.push({ code: 'dryBelowEngines', level: 'warn', stage, dryMass: p.dryMass, enginesMass });
  };
  spec.stages.forEach((st, i) => check(st, i));
  return out;
}

/**
 * Everything the screen says about a design that was built: the warnings in
 * words (the fails first), then the Explore level's own check. `siteId` is
 * where the hold-down is replayed (the vehicle's first site by default).
 */
export function designChecks(spec: VehicleSpec, payloadKg: number, siteId?: string): DesignText[] {
  const said = [...designWarnings(spec, payloadKg, siteId).map(warningText), ...exploreChecks(spec).map(exploreCheckText)];
  return [...said.filter((x) => x.level === 'fail'), ...said.filter((x) => x.level !== 'fail')];
}

/** The estimates of a built design, in words. */
export function estimateTexts(result: Extract<DesignResult, { ok: true }>, country: string): DesignText[] {
  return result.estimates.map((e) => estimateText(e, { baseName: result.ratingsOwner, country }));
}


// ─── a saved design, opened again ───────────────────────────────────────────

const STAGE_INSTALL_KEYS = ['restartable', 'sepDelay', 'ignitionDelay', 'throttleWithBoosters', 'color', 'accentColor', 'profile', 'fins',
  'gridFins', 'legs', 'flaps', 'nozzleLength'] as const;
const BOOSTER_INSTALL_KEYS = ['igniteAt', 'sepDelay', 'color', 'conicalTop', 'baseOffset'] as const;
/** The fields `assemble` emits on a vehicle; a spec with any other cannot be a parts design. */
const PARTS_VEHICLE_KEYS = new Set(['id', 'name', 'country', 'manufacturer', 'height', 'payloadLEO', 'payloadGTO', 'payloadSSO', 'fairing',
  'stages', 'sites', 'maxQ', 'maxAccel', 'guidanceDefaults', 'derivedFrom']);

function defined<T extends object>(o: T, keys: readonly string[]): Partial<T> | undefined {
  const out: Obj = {};
  for (const k of keys) if ((o as Obj)[k] !== undefined) out[k] = (o as Obj)[k];
  return Object.keys(out).length ? out as Partial<T> : undefined;
}

const hardwareOf = (p: StageSpec | BoosterGroupSpec): Obj => ({
  name: p.name, dryMass: p.dryMass, propellantMass: p.propellantMass, engine: p.engine, diameter: p.diameter, length: p.length,
});
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The parts stages that might have made `st`: a catalogue body as it is, a catalogue body given another engine, or a body of one's own. */
function stageCandidates(st: StageSpec): PartsStage[] {
  const out: PartsStage[] = [];
  const install = defined(st, STAGE_INSTALL_KEYS) as PartsStage['install'];
  const extra = install ? { install } : {};
  const want = JSON.stringify(sortKeys(hardwareOf(st)));
  for (const b of STAGE_BODIES) {
    if (JSON.stringify(sortKeys(hardwareOf(stageSpec(b)))) === want) out.push({ body: { kind: 'catalogue', id: b.id }, engine: { ...b.engine }, ...extra });
  }
  const engine = enginePartOf(st.engine);
  if (!engine) return out;
  const choice = { part: engine.id, count: st.engine.count };
  for (const b of STAGE_BODIES) {
    if (b.propellantMass === st.propellantMass && b.diameter === st.diameter && b.length === st.length
      && new RegExp(`^${escapeRe(b.stageId)}-r\\d+$`).test(st.id)) out.push({ body: { kind: 'catalogue', id: b.id }, engine: { ...choice }, ...extra });
  }
  const own: CustomBody = { dryMass: st.dryMass, propellantMass: st.propellantMass, diameter: st.diameter, length: st.length, family: engine.family,
    ...(st.name !== engineName(engine, st.engine.count) ? { name: st.name } : {}) };
  out.push({ body: { kind: 'own', body: own }, engine: choice, ...extra });
  return out;
}

function groupCandidates(g: BoosterGroupSpec): PartsGroup[] {
  const install = defined(g, BOOSTER_INSTALL_KEYS) as BoosterInstall | undefined;
  const want = JSON.stringify(sortKeys(hardwareOf(g)));
  return BOOSTER_BODIES.filter((b) => JSON.stringify(sortKeys(hardwareOf(boosterSpec(b, g.count)))) === want)
    .map((b) => ({ body: b.id, count: g.count, ...(install ? { install } : {}) }));
}

const tryAssemble = (design: PartsDesign): VehicleSpec | null => {
  try { return assemble(design).spec; } catch { return null; }
};
const withoutBoosters = (st: StageSpec): Obj => {
  const { boosters: _b, ...rest } = st;
  return rest;
};

/**
 * The parts design that assembles to exactly `spec`, or null when there is
 * none: found stage by stage (and strap-on group by group) in the order the
 * assembly gives ids, each part checked against the spec's as it is chosen,
 * and the whole checked at the end.
 */
export function partsEditFromSpec(spec: VehicleSpec): { edit: PartsEdit; ratings: DesignRatings | null } | null {
  if (Object.keys(spec).some((k) => !PARTS_VEHICLE_KEYS.has(k))) return null;
  if (!spec.sites.length || !spec.sites.every((s) => SITES.some((x) => x.id === s))) return null;
  let fairing: DesignFairing | null = null;
  if (spec.fairing) {
    const part = fairingOf(spec.fairing);
    if (!part) return null;
    const f = spec.fairing;
    fairing = { part: part.id, ...(f.sepAltitude !== FLEET_FAIRING_SEP_ALTITUDE ? { sepAltitude: f.sepAltitude } : {}),
      ...(f.sepTime !== undefined ? { sepTime: f.sepTime } : {}), ...(f.color !== undefined ? { color: f.color } : {}) };
  }
  const site = SITES.find((s) => s.id === spec.sites[0])!;
  const keep: NonNullable<PartsEdit['keep']> = {
    ...(spec.country !== site.country ? { country: spec.country } : {}),
    ...(spec.manufacturer !== '' ? { manufacturer: spec.manufacturer } : {}),
    ...(spec.maxQ !== FLEET_MAX_Q ? { maxQ: spec.maxQ } : {}),
    ...(spec.maxAccel !== FLEET_MAX_ACCEL ? { maxAccel: spec.maxAccel } : {}),
    ...(spec.guidanceDefaults ? { guidanceDefaults: structuredClone(spec.guidanceDefaults) } : {}),
    ...(spec.derivedFrom !== undefined ? { derivedFrom: spec.derivedFrom } : {}),
  };
  const ratings: DesignRatings | null = spec.payloadLEO > 0 || spec.payloadGTO > 0 || spec.payloadSSO !== undefined
    ? { payloadLEO: spec.payloadLEO, payloadGTO: spec.payloadGTO, ...(spec.payloadSSO !== undefined ? { payloadSSO: spec.payloadSSO } : {}) }
    : null;
  const edit: PartsEdit = { sites: [...spec.sites], stages: [], groups: [], fairing: null, ...(Object.keys(keep).length ? { keep } : {}) };
  const draft = (e: PartsEdit): Draft<PartsEdit> => ({ id: spec.id, name: spec.name, payloadKg: 0, recordId: null, ratings: null, edit: e });
  for (const [i, st] of spec.stages.entries()) {
    const found = stageCandidates(st).find((c) => {
      const out = tryAssemble(partsDesign(draft({ ...edit, stages: [...edit.stages, c] })));
      return !!out && sameSpec(withoutBoosters(out.stages[i]), withoutBoosters(st));
    });
    if (!found) return null;
    edit.stages.push(found);
    if (i === 0) {
      for (const [g, group] of (st.boosters ?? []).entries()) {
        const hit = groupCandidates(group).find((c) => {
          const out = tryAssemble(partsDesign(draft({ ...edit, groups: [...edit.groups, c] })));
          return !!out && sameSpec(out.stages[0].boosters?.[g], group);
        });
        if (!hit) return null;
        edit.groups.push(hit);
      }
    }
  }
  edit.fairing = fairing;
  const whole = tryAssemble(partsDesign(draft(edit), ratings));
  return whole && sameSpec(whole, spec) ? { edit, ratings } : null;
}

/** The payload a loaded design's figures start at: half its LEO rating, or its origin's, or the parts builder's default. */
function loadedPayload(spec: VehicleSpec): number {
  if (spec.payloadLEO > 0) return watchPayload(spec);
  if (spec.derivedFrom !== undefined && isCatalogueVehicle(spec.derivedFrom)) return watchPayload(vehicleById(spec.derivedFrom));
  return PARTS_DEFAULT_PAYLOAD;
}

/**
 * A saved design, opened: in the parts builder when a parts design
 * assembles to exactly it, else as the base of a remix with nothing changed.
 * Its ratings count as computed when they are not its origin's (a remix
 * saved before they were computed carries its origin's) and not all 0.
 */
export function draftFromSpec(spec: VehicleSpec, recordId: string | null):
  { mode: 'parts'; draft: Draft<PartsEdit> } | { mode: 'remix'; draft: Draft<RemixEdit> } {
  const copy = structuredClone(spec);
  const signature = ratingsSignature(copy);
  const common = { id: copy.id, name: copy.name, payloadKg: loadedPayload(copy), recordId };
  const parts = partsEditFromSpec(copy);
  if (parts) {
    const r = parts.ratings;
    return { mode: 'parts', draft: { ...common, ratings: r ? { signature, ...r } : null, edit: parts.edit } };
  }
  const origin = copy.derivedFrom !== undefined && isCatalogueVehicle(copy.derivedFrom) ? vehicleById(copy.derivedFrom) : null;
  const origins = !!origin && origin.payloadLEO === copy.payloadLEO && origin.payloadGTO === copy.payloadGTO && origin.payloadSSO === copy.payloadSSO;
  const computed = !origins && (copy.payloadLEO > 0 || copy.payloadGTO > 0);
  return {
    mode: 'remix',
    draft: {
      ...common,
      ratings: computed ? { signature, payloadLEO: copy.payloadLEO, payloadGTO: copy.payloadGTO, ...(copy.payloadSSO !== undefined ? { payloadSSO: copy.payloadSSO } : {}) } : null,
      edit: { base: { kind: 'design', spec: copy }, stages: copy.stages.map(() => ({ stretch: 1 })), removedGroups: [], addedGroups: [], fairing: null },
    },
  };
}

// ─── the drafts kept across a reload ────────────────────────────────────────

/** The version of the drafts' record in the browser; a record of another version is not read. */
export const EXPLORE_DRAFTS_VERSION = 1;

/** The Explore level's drafts as a record of this browser, with the default names they were given (so a language switch can give them again). */
export interface KeptDrafts {
  state: ExploreState;
  defaults: Record<ExploreMode, string>;
}

/**
 * The drafts on screen as text for the browser's storage: a stretched remix
 * or a half-built rocket is the student's work, and a reload, a phone that
 * drops the tab in the background or a slip of the finger must not lose it
 * before it is saved (roadmap S05 keeps saved designs; this keeps the one on
 * the bench). An empty payload box (NaN) is kept as `null`.
 */
export function keptDraftsText(kept: KeptDrafts): string {
  return JSON.stringify({ v: EXPLORE_DRAFTS_VERSION, ...kept });
}

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
// a part this version's catalogue has: the controls look each one up by id
const knownIn = (parts: readonly { id: string }[]) => (id: unknown): boolean => typeof id === 'string' && parts.some((p) => p.id === id);
const isEnginePart = knownIn(ENGINE_PARTS), isStageBody = knownIn(STAGE_BODIES), isBoosterBody = knownIn(BOOSTER_BODIES);
const isFairingPart = knownIn(FAIRING_PARTS), isSite = knownIn(SITES);
const isEngine = (v: unknown): boolean => isObj(v) && isEnginePart(v.part) && (v.count === null || isNum(v.count));
const isRatings = (v: unknown): boolean => v === null
  || (isObj(v) && typeof v.signature === 'string' && isNum(v.payloadLEO) && isNum(v.payloadGTO) && (v.payloadSSO === undefined || isNum(v.payloadSSO)));

function isDraft(v: unknown, edit: (e: Obj) => boolean): boolean {
  return isObj(v) && typeof v.id === 'string' && PART_ID_PATTERN.test(v.id) && !isCatalogueVehicle(v.id) && typeof v.name === 'string'
    && (v.payloadKg === null || isNum(v.payloadKg)) && (v.recordId === null || typeof v.recordId === 'string') && isRatings(v.ratings)
    && isObj(v.edit) && edit(v.edit);
}

const isRemixEdit = (e: Obj): boolean => isObj(e.base)
  && ((e.base.kind === 'catalogue' && typeof e.base.id === 'string' && isCatalogueVehicle(e.base.id)) || (e.base.kind === 'design' && isObj(e.base.spec)))
  && Array.isArray(e.stages) && e.stages.every((s) => isObj(s) && (s.stretch === null || isNum(s.stretch)) && (s.engine === undefined || isEngine(s.engine)))
  && Array.isArray(e.removedGroups) && e.removedGroups.every(isNum)
  && Array.isArray(e.addedGroups) && e.addedGroups.every((g) => isObj(g) && isBoosterBody(g.body) && (g.count === null || isNum(g.count)))
  && (e.fairing === null || isFairingPart(e.fairing));

const isPartsEdit = (e: Obj): boolean => Array.isArray(e.sites) && e.sites.every(isSite)
  && Array.isArray(e.stages) && e.stages.every((s) => isObj(s) && isEngine(s.engine) && (s.install === undefined || isObj(s.install)) && isObj(s.body)
    && ((s.body.kind === 'catalogue' && isStageBody(s.body.id)) || (s.body.kind === 'own' && isObj(s.body.body))))
  && Array.isArray(e.groups) && e.groups.every((g) => isObj(g) && isBoosterBody(g.body) && (g.count === null || isNum(g.count)) && (g.install === undefined || isObj(g.install)))
  && (e.fairing === null || (isObj(e.fairing) && isFairingPart(e.fairing.part))) && (e.keep === undefined || isObj(e.keep));

/**
 * The drafts a browser kept (`keptDraftsText`), or null when there are none
 * or they cannot be taken whole: another version's record, a shape this
 * version does not know, a catalogue part it no longer has. All or nothing,
 * as an import is: the page then starts on its first designs. A draft the
 * builder refuses (a payload box left empty, a stage stretched past its
 * limit) is taken as it is — that is where the student left it.
 */
export function restoreKeptDrafts(text: string | null): KeptDrafts | null {
  if (!text) return null;
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return null; }
  if (!isObj(raw) || raw.v !== EXPLORE_DRAFTS_VERSION || !isObj(raw.state) || !isObj(raw.defaults)) return null;
  const { state: s, defaults: names } = raw;
  if (!EXPLORE_MODES.includes(s.mode as ExploreMode) || !isDraft(s.remix, isRemixEdit) || !isDraft(s.parts, isPartsEdit)) return null;
  if (typeof names.remix !== 'string' || typeof names.parts !== 'string') return null;
  const numericFields = new Set(['payloadKg', 'count', 'stretch', 'dryMass', 'propellantMass', 'diameter', 'length']);
  const draft = <E>(d: Obj): Draft<E> => JSON.parse(JSON.stringify(d), (key: string, value: unknown) => value === null && numericFields.has(key) ? Number.NaN : value) as Draft<E>;
  const state: ExploreState = { mode: s.mode as ExploreMode, remix: draft<RemixEdit>(s.remix as Obj), parts: draft<PartsEdit>(s.parts as Obj) };
  try {
    // what the page will do with them first; anything this version cannot build or refuse by name is not taken
    remixResult(state.remix);
    partsResult(state.parts);
  } catch {
    return null;
  }
  return { state, defaults: { remix: names.remix, parts: names.parts } };
}
