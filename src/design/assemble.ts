/**
 * The parts builder's assembly (roadmap D03; the Phase 3 map, §3.2): a design
 * made of parts — stage bodies from the catalogue or of one's own, engines,
 * strap-on groups, a fairing — put together as the `VehicleSpec` the flight
 * takes.
 *
 * Built with D01's own emitters (src/data/parts.ts: `stageSpec`,
 * `boosterSpec`, `fairingSpec`, `engineSpec`), so a design made of a catalogue
 * vehicle's parts and installation assembles to that vehicle's stages and
 * fairing exactly (tests/design-assemble.test.ts, all 21). A body of one's own
 * goes through the same emitter as a catalogue body; nothing is emitted that
 * the validator's field lists do not know (src/config/vehicle-spec.ts), and
 * every field the validator requires is filled:
 *
 * - `payloadLEO`, `payloadGTO` (and `payloadSSO` if given): the design's
 *   computed ratings (src/design/ratings.ts) when it carries them, else 0,
 *   and `noRatings` says so. A 0 is no rating, which the pre-flight verdict
 *   reads as "no rating for this orbit" rather than as a promise.
 * - `maxQ`, `maxAccel`: the design's, else the catalogue's median
 *   (`FLEET_MAX_Q`, `FLEET_MAX_ACCEL`) — ESTIMATES (`maxQDefault`,
 *   `maxAccelDefault`). The fleet's own values are src/data/vehicles.ts's,
 *   typed from public sources (user guides, press kits) and rounded, with no
 *   per-vehicle citation; they are structural and throttle placards, so a
 *   median is a placeholder for a number the designer has not chosen, not a
 *   property of the design.
 * - `height`: the drawn stack, `stackLayout` plus the fairing — what the
 *   drawing shows, not a typed number.
 * - `country`: the design's, else its first launch site's.
 *
 * IDS follow the remix's rule (src/design/remix.ts): a catalogue body flown
 * with its own engine installation keeps its catalogue stage id, which keys
 * that hardware's six-DOF tables; any other stage or group, and a catalogue
 * id already taken in this vehicle, gets one of its own from `newPartId`.
 *
 * MASSES. A body's dry mass includes its engines, as `StageSpec.dryMass` and a
 * catalogue body's do; a body of one's own states it that way too. A
 * catalogue body given another engine changes its dry mass by the engines'
 * published masses (`swapDryMass`), or keeps it and says `engineMassUnknown`.
 *
 * REFUSED (`AssembleRefused`, with a code): what the remix refuses — a lumped
 * or cluster engine re-counted, a solid motor swapped into or out of a
 * catalogue body, an engine of another propellant family than the one a
 * catalogue body was built for, a vacuum-only engine lit on the pad, anything
 * past the validator's bounds — and, for a body of one's own, an engine of
 * another propellant family than the body's (a solid body needs a solid
 * motor, and a liquid body an engine that burns what its tanks hold).
 *
 * DOM-free, SI units (kg, m, Pa, m/s²).
 */
import type { BoosterGroupSpec, FairingSpec, GuidanceParams, StageSpec, VehicleSpec } from '../types';
import {
  boosterBody, boosterSpec, enginePart, engineSpec, fairingPart, fairingSpec, lockedEngineCount, stageBody, stageSpec,
  type BoosterInstall, type EnginePart, type StageBodyPart, type StageInstall,
} from '../data/parts';
import { VEHICLES, isCatalogueVehicle } from '../data/vehicles';
import { SITES } from '../data/sites';
import { MAX_BOOSTERS_PER_GROUP, MAX_BOOSTER_GROUPS, MAX_STAGES, PART_LIMITS } from '../config/vehicle-spec';
import type { PropellantFamily } from '../physics/rigid/vehicle-data';
import { stackLayout } from '../physics/frame';
import { FLEET_FAIRING_SEP_ALTITUDE, engineName, newPartId, swapDryMass } from './remix';

/** A stage or strap-on body of one's own. kg, m; `dryMass` includes the engines, as `StageSpec.dryMass` does. */
export interface CustomBody {
  dryMass: number;
  propellantMass: number;
  diameter: number;
  length: number;
  /** what its tanks hold, or a solid grain; its engine must burn the same */
  family: PropellantFamily;
  /** a name of one's own; else the engines' */
  name?: string;
}

export interface EngineInstall {
  /** an engine part's id (src/data/parts.ts) */
  part: string;
  count: number;
}

export interface DesignBoosterGroup {
  /** a catalogue strap-on body's id, or a body of one's own */
  body: string | CustomBody;
  /** how many strap-ons of it */
  count: number;
  /** the engine per strap-on; a catalogue body's own when absent (required for a body of one's own) */
  engine?: EngineInstall;
  install?: BoosterInstall;
}

export interface DesignStage {
  /** a catalogue stage body's id, or a body of one's own */
  body: string | CustomBody;
  /** a catalogue body's own when absent (required for a body of one's own) */
  engine?: EngineInstall;
  install?: Omit<StageInstall, 'boosters'>;
  /** strap-on groups, first stage only */
  boosters?: DesignBoosterGroup[];
}

export interface DesignFairing {
  /** a catalogue fairing part's id */
  part: string;
  /** jettison altitude, m; the fleet's median when absent (an estimate) */
  sepAltitude?: number;
  sepTime?: number;
  color?: string;
}

/** Computed payload ratings (src/design/ratings.ts), kg. */
export interface DesignRatings {
  payloadLEO: number;
  payloadGTO: number;
  payloadSSO?: number;
}

export interface PartsDesign {
  id: string;
  name: string;
  /** launch site ids; the first is the vehicle's own */
  sites: string[];
  /** burn order: stages[0] is the first stage */
  stages: DesignStage[];
  fairing: DesignFairing | null;
  ratings?: DesignRatings;
  country?: string;
  manufacturer?: string;
  maxQ?: number;
  maxAccel?: number;
  /** a catalogue vehicle the design is made from (`VehicleSpec.derivedFrom`) */
  derivedFrom?: string;
  guidanceDefaults?: Partial<GuidanceParams>;
}

export type AssembleEstimateCode = 'noRatings' | 'maxQDefault' | 'maxAccelDefault' | 'engineMassUnknown' | 'fairingSepAltitude';

export interface AssembleEstimate {
  code: AssembleEstimateCode;
  stage?: number;
  group?: number;
}

export interface Assembly {
  spec: VehicleSpec;
  /** what in `spec` is a default or an estimate rather than the design's */
  estimates: AssembleEstimate[];
}

export type AssembleRefusal =
  | 'noStages' | 'tooManyStages' | 'tooManyGroups' | 'boostersNotOnFirstStage' | 'unknownPart' | 'unknownSite' | 'noEngine'
  | 'badCount' | 'lumpedRecount' | 'solidMotor' | 'familyMismatch' | 'vacuumEngineOnPad' | 'outOfLimits';

/** A design the assembly will not build; `code` says why, `stage`/`group` where. */
export class AssembleRefused extends Error {
  constructor(readonly code: AssembleRefusal, readonly where: { stage?: number; group?: number }, detail: string) {
    super(`assemble${where.stage !== undefined ? ` stage ${where.stage}` : ''}${where.group !== undefined ? ` group ${where.group}` : ''}: ${code} (${detail})`);
    this.name = 'AssembleRefused';
  }
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
/** The catalogue's median structural dynamic-pressure limit, Pa (40 kPa today): an estimate for a design that sets none. */
export const FLEET_MAX_Q = median(VEHICLES.map((v) => v.maxQ));
/** The catalogue's median acceleration limit, m/s² (50 today): an estimate for a design that sets none. */
export const FLEET_MAX_ACCEL = median(VEHICLES.map((v) => v.maxAccel));

/** Build the vehicle a design describes. Throws `AssembleRefused`; never changes the design. */
export function assemble(design: PartsDesign): Assembly {
  const estimates: AssembleEstimate[] = [];
  const refuse = (code: AssembleRefusal, where: { stage?: number; group?: number }, detail: string): never => {
    throw new AssembleRefused(code, where, detail);
  };
  if (design.stages.length === 0) refuse('noStages', {}, 'a vehicle needs a stage');
  if (design.stages.length > MAX_STAGES) refuse('tooManyStages', {}, `${design.stages.length} (at most ${MAX_STAGES})`);
  for (const id of design.sites) if (!SITES.some((s) => s.id === id)) refuse('unknownSite', {}, id);
  if (design.sites.length === 0) refuse('unknownSite', {}, 'no launch site');

  const taken = new Set<string>();
  /** The body as a part the emitters take: a catalogue body as it is or with another engine, or one of one's own. */
  const bodyPart = (raw: string | CustomBody, install: EngineInstall | undefined, where: { stage: number; group?: number },
    groundLit: boolean, isGroup: boolean): StageBodyPart => {
    let body: StageBodyPart;
    if (typeof raw === 'string') {
      try { body = isGroup ? boosterBody(raw) : stageBody(raw); } catch { return refuse('unknownPart', where, `${isGroup ? 'strap-on' : 'stage'} body ${raw}`); }
    } else {
      const d = raw;
      const dryMax = isGroup ? PART_LIMITS.boosterDryMass : PART_LIMITS.stageDryMass;
      const propMax = isGroup ? PART_LIMITS.boosterPropellantMass : PART_LIMITS.stagePropellantMass;
      const ok = (v: number, max: number): boolean => Number.isFinite(v) && v > 0 && v <= max;
      if (!ok(d.dryMass, dryMax) || !ok(d.propellantMass, propMax) || !ok(d.diameter, PART_LIMITS.diameter) || !ok(d.length, PART_LIMITS.length)) {
        refuse('outOfLimits', where, `body ${JSON.stringify(d)}`);
      }
      if (!install) return refuse('noEngine', where, 'a body of one’s own needs an engine');
      body = { id: 'design', stageId: '', name: d.name ?? '', dryMass: d.dryMass, propellantMass: d.propellantMass, diameter: d.diameter,
        length: d.length, engine: { part: install.part, count: install.count }, source: 'the designer' };
    }
    const custom = typeof raw !== 'string';
    const own = custom ? null : enginePart(body.engine.part);
    const want = install ?? body.engine;
    let engine: EnginePart;
    try { engine = enginePart(want.part); } catch { return refuse('unknownPart', where, `engine ${want.part}`); }
    if (!Number.isInteger(want.count) || want.count < 1 || want.count > PART_LIMITS.engineCount) refuse('badCount', where, `engine count ${want.count}`);
    const locked = lockedEngineCount(engine.id);
    if (locked !== undefined && want.count !== locked) refuse('lumpedRecount', where, `${engine.id} is installed ${locked}, never ${want.count}`);
    if (engine.vacuumOnly && groundLit) refuse('vacuumEngineOnPad', where, engine.id);
    if (custom) {
      const family = (raw as CustomBody).family;
      if (engine.family !== family) refuse('familyMismatch', where, `${engine.id} burns ${engine.family}, the body holds ${family}`);
    }
    const sameEngine = !custom && own === engine && body.engine.count === want.count;
    if (!custom && !sameEngine) {
      if (own!.solid || engine.solid) refuse('solidMotor', where, `${own!.id} to ${engine.id}`);
      // a catalogue body's tanks hold what its own engine burns
      if (own!.family !== engine.family) refuse('familyMismatch', where, `${engine.id} burns ${engine.family}, the body holds ${own!.family}`);
      const dry = swapDryMass(body.dryMass, engineSpec(own!, body.engine.count), engine, want.count);
      if (dry === null) estimates.push({ code: 'engineMassUnknown', ...where });
      body = { ...body, dryMass: dry ?? body.dryMass, engine: { part: engine.id, count: want.count } };
    }
    // The catalogue id where the hardware is the catalogue's own, else one of this vehicle's own.
    const keepId = sameEngine && !taken.has(body.stageId);
    const id = keepId ? body.stageId : newPartId(taken, custom ? (isGroup ? `strapon${(where.group ?? 0) + 1}` : `stage${where.stage + 1}`) : body.stageId);
    taken.add(id);
    const name = sameEngine ? body.name : (custom && (raw as CustomBody).name) || engineName(engine, want.count);
    return { ...body, stageId: id, name };
  };

  const stages: StageSpec[] = design.stages.map((st, i) => {
    if (st.boosters && st.boosters.length > 0 && i !== 0) refuse('boostersNotOnFirstStage', { stage: i }, 'strap-ons are flown on the first stage only');
    if ((st.boosters?.length ?? 0) > MAX_BOOSTER_GROUPS) refuse('tooManyGroups', { stage: i }, `${st.boosters!.length} (at most ${MAX_BOOSTER_GROUPS})`);
    const body = bodyPart(st.body, st.engine, { stage: i }, i === 0, false);
    const groups: BoosterGroupSpec[] | undefined = st.boosters && st.boosters.length > 0
      ? st.boosters.map((g, gi) => {
        if (!Number.isInteger(g.count) || g.count < 1 || g.count > MAX_BOOSTERS_PER_GROUP) refuse('badCount', { stage: i, group: gi }, `${g.count} strap-ons`);
        const lit = !((g.install?.igniteAt ?? 0) > 0);
        return boosterSpec(bodyPart(g.body, g.engine, { stage: i, group: gi }, lit, true), g.count, g.install ?? {});
      })
      : undefined;
    return stageSpec(body, { ...(st.install ?? {}), ...(groups ? { boosters: groups } : {}) });
  });

  let fairing: FairingSpec | null = null;
  if (design.fairing) {
    const f = design.fairing;
    let part;
    try { part = fairingPart(f.part); } catch { return refuse('unknownPart', {}, `fairing ${f.part}`); }
    if (f.sepAltitude === undefined) estimates.push({ code: 'fairingSepAltitude' });
    fairing = fairingSpec(part, {
      sepAltitude: f.sepAltitude ?? FLEET_FAIRING_SEP_ALTITUDE,
      ...(f.sepTime !== undefined ? { sepTime: f.sepTime } : {}),
      ...(f.color !== undefined ? { color: f.color } : {}),
    });
  }

  if (!design.ratings) estimates.push({ code: 'noRatings' });
  if (design.maxQ === undefined) estimates.push({ code: 'maxQDefault' });
  if (design.maxAccel === undefined) estimates.push({ code: 'maxAccelDefault' });
  const site = SITES.find((s) => s.id === design.sites[0])!;
  const spec: VehicleSpec = {
    id: design.id, name: design.name, country: design.country ?? site.country, manufacturer: design.manufacturer ?? '',
    height: 0,
    payloadLEO: design.ratings?.payloadLEO ?? 0, payloadGTO: design.ratings?.payloadGTO ?? 0,
    ...(design.ratings?.payloadSSO !== undefined ? { payloadSSO: design.ratings.payloadSSO } : {}),
    fairing, stages, sites: [...design.sites],
    maxQ: design.maxQ ?? FLEET_MAX_Q, maxAccel: design.maxAccel ?? FLEET_MAX_ACCEL,
    ...(design.guidanceDefaults ? { guidanceDefaults: { ...design.guidanceDefaults } } : {}),
    ...(design.derivedFrom !== undefined && isCatalogueVehicle(design.derivedFrom) ? { derivedFrom: design.derivedFrom } : {}),
  };
  // the drawn stack (the height is not an input of the layout)
  const height = stackLayout(spec).total + (fairing?.length ?? 0);
  if (!(height > 0 && height <= PART_LIMITS.height)) refuse('outOfLimits', {}, `height ${height} (at most ${PART_LIMITS.height})`);
  spec.height = height;
  return { spec, estimates };
}
