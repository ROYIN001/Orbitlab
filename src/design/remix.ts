/**
 * Remix a real rocket (roadmap D02; the Phase 3 map, §3.1): a catalogue
 * vehicle with a handful of changes — a stretched stage, another engine,
 * strap-ons added or taken off, another fairing — as a custom vehicle of its
 * own that the flight takes like any other (roadmap S02).
 *
 * `remix(origin, ops, id, name)` applies the ops in order to a deep copy
 * (`structuredClone`): `vehicleById` hands out the live catalogue object, and
 * the caches keyed on a spec object (the stack layout, the six-DOF tables)
 * must never see it change. The result is `derivedFrom` the origin, so what a
 * spec does not carry and the code looks up by vehicle id — the six-DOF tables
 * of that hardware, the drawing's livery, the localized stage names — stay the
 * origin's (`vehicleDataId`). With no ops it is exactly the copy S02 flies
 * identically (`copyOf` in tests/custom-vehicle-harness.ts).
 *
 * IDS. A stage or strap-on group keeps its catalogue id while its engine
 * installation (part and count) is unchanged: it then keeps the origin's
 * steering, attitude thrusters, propellant layout, nozzle pattern and
 * translated name, which describe that hardware. A stretch keeps it (same
 * engines, more propellant). When the engine changes it gets a new id from
 * `newPartId` and the generic six-DOF behaviour, and a name made of the
 * engine's own (a proper name, no language).
 *
 * WHAT IS REFUSED (`RemixRefused`, with a code the builder can say in words):
 * re-counting a lumped or cluster engine part (the parts catalogue's comment:
 * its `count` is not a count of engines, and changing it changes far more than
 * thrust); swapping a solid motor in or out (a solid motor is its own casing
 * and grain: its stage is the motor, so change the strap-on body instead); a
 * vacuum-only engine where it would light on the pad; and anything beyond the
 * validator's bounds (`PART_LIMITS`, src/config/vehicle-spec.ts). Anything the
 * ops cannot produce is not refused here: tests/design-remix.test.ts holds
 * every accepted result to `vehicleSpecProblems` across a fuzz of ops.
 *
 * MASS RULES, and which are estimates (each comes back as a code in
 * `estimates`, with the stage it is about):
 * - Swapping an engine changes the stage's dry mass by the engines' published
 *   masses (`EnginePart.mass`, count × mass, new minus old) when both are
 *   known. That is the published data, not an estimate. When either is not
 *   known the dry mass is left as it was: `engineMassUnknown`.
 * - Stretching by k multiplies the propellant by k and the dry mass other than
 *   the engines by k: the tank structure scaled with the propellant it holds,
 *   `tankMassScaled`, an estimate (real tanks scale with area and pressure, not
 *   volume, and a stretch keeps the thrust structure). With the engine mass not
 *   known the whole dry mass is scaled (`engineMassUnknown` too). A solid
 *   motor's inert mass is its case and belongs to the motor: all of it is
 *   scaled with the grain, `solidCaseScaled` (the nozzle does not really
 *   scale).
 * - A stretch lengthens the stage by the extra propellant's volume at the
 *   stage's diameter (src/design/propellant.ts: `PROPELLANT_DENSITY` and the
 *   stage's or its family's mixture ratio), the rest of the length fixed:
 *   `lengthFromVolume`. Where that volume would not fit the stage as it is
 *   (Proton's first stage keeps much of its load in six outboard tanks), or
 *   for a solid (the repo holds no grain density), the length is scaled in
 *   proportion instead: `lengthProportional`.
 * - A fairing on an origin that has none is jettisoned at the fleet's median
 *   altitude: `fairingSepAltitude`.
 * - Any op at all leaves the payload ratings, the guidance programme and the
 *   `RATING_ORBITS` line the origin's, which no longer describe the remix:
 *   `originRatings` (src/design/ratings.ts computes ratings for it).
 *
 * The stated height is the origin's, moved by exactly what the drawn stack
 * (`stackLayout` plus the fairing) gained or lost, so a catalogue vehicle's
 * published height carries over and the change is the geometry's.
 *
 * DOM-free, SI units (kg, m, N).
 */
import type { BoosterGroupSpec, EngineSpec, StageSpec, VehicleSpec } from '../types';
import {
  boosterBody, boosterSpec, enginePart, enginePartOf, engineSpec, fairingPart, fairingSpec, lockedEngineCount,
  type EnginePart,
} from '../data/parts';
import { VEHICLES, isCatalogueVehicle, vehicleById } from '../data/vehicles';
import { MAX_BOOSTERS_PER_GROUP, MAX_BOOSTER_GROUPS, PART_ID_PATTERN, PART_LIMITS, RESERVED_PART_IDS } from '../config/vehicle-spec';
import { isCataloguePartId } from '../physics/rigid/vehicle-data';
import { stackLayout } from '../physics/frame';
import { mixtureRatioFor, tankLength, type LiquidFamily } from './propellant';

/** A stage by index, or one of the first stage's strap-on groups. */
export interface RemixTarget {
  stage: number;
  /** a strap-on group of stage 0, by index */
  group?: number;
}

export type RemixOp =
  /** propellant × factor, the tank structure and the length with it (see the mass rules) */
  | { op: 'stretch'; target: RemixTarget; factor: number }
  /** `count` of engine part `part` in place of what the stage or group has */
  | { op: 'swapEngine'; target: RemixTarget; part: string; count: number }
  /** a new strap-on group on the first stage: `count` of strap-on body `body`, lit on the pad or at `igniteAt` s */
  | { op: 'addBoosters'; body: string; count: number; igniteAt?: number }
  | { op: 'removeBoosters'; group: number }
  /** another catalogue fairing, jettisoned as the origin's was */
  | { op: 'fairing'; part: string };

export type RemixEstimateCode =
  | 'tankMassScaled' | 'solidCaseScaled' | 'engineMassUnknown' | 'lengthFromVolume' | 'lengthProportional'
  | 'fairingSepAltitude' | 'originRatings';

export interface RemixEstimate {
  code: RemixEstimateCode;
  /** the stage (and strap-on group) it is about, where it is about one */
  stage?: number;
  group?: number;
}

export interface Remix {
  spec: VehicleSpec;
  /** what in `spec` is an estimate, in the order the ops made it */
  estimates: RemixEstimate[];
}

export type RemixRefusal =
  | 'unknownOp' | 'noSuchStage' | 'noSuchGroup' | 'unknownPart' | 'badFactor' | 'badCount' | 'badIgnition' | 'lumpedRecount'
  | 'solidMotor' | 'vacuumEngineOnPad' | 'tooManyGroups' | 'outOfLimits';

/** An op the remix will not apply; `code` says why, `op` which one (index in the list). */
export class RemixRefused extends Error {
  constructor(readonly code: RemixRefusal, readonly op: number, detail: string) {
    super(`remix op ${op}: ${code} (${detail})`);
    this.name = 'RemixRefused';
  }
}

/** The fleet's median fairing jettison altitude, m (115 km today): for a fairing where the design has none of its own. An estimate. */
export const FLEET_FAIRING_SEP_ALTITUDE = (() => {
  const alts = VEHICLES.flatMap((v) => (v.fairing ? [v.fairing.sepAltitude] : [])).sort((a, b) => a - b);
  const mid = alts.length >> 1;
  return alts.length % 2 ? alts[mid] : (alts[mid - 1] + alts[mid]) / 2;
})();

/**
 * An id for a new part: `base` made to fit the validator's pattern
 * (`PART_ID_PATTERN`), with a suffix, that is not in `taken`, not one the
 * vehicle model reserves (`RESERVED_PART_IDS`) and not a catalogue part's —
 * so the six-DOF model sees a part of its own, not a catalogue one
 * (`isCataloguePartId`).
 */
export function newPartId(taken: ReadonlySet<string>, base: string): string {
  const stem = base.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^[^A-Za-z0-9]+/, '').slice(0, 32) || 'part';
  for (let n = 1; ; n++) {
    const id = `${stem}-r${n}`;
    if (PART_ID_PATTERN.test(id) && !taken.has(id) && !RESERVED_PART_IDS.includes(id) && !isCataloguePartId(id)) return id;
  }
}

const partIds = (spec: VehicleSpec): Set<string> =>
  new Set(spec.stages.flatMap((s) => [s.id, ...(s.boosters ?? []).map((b) => b.id)]));

/** The drawn height of a stack: stages, adapters, fairing (`stackLayout`). */
const drawnHeight = (spec: VehicleSpec): number => stackLayout(spec).total + (spec.fairing?.length ?? 0);

/** A stage named for its engines: a proper name and a count, no words of any language. */
export const engineName = (part: EnginePart, count: number): string => (count > 1 ? `${count}× ${part.name}` : part.name);

/**
 * A stage's dry mass with `count` of `next` in place of the engines it has:
 * count × published mass, new minus old (`EnginePart.mass`). Null when either
 * mass is not known (the engine it has is not a catalogue part, or a figure is
 * unpublished) or the result would not be positive: the caller leaves the dry
 * mass as it is and says so. Published data, not an estimate.
 */
export function swapDryMass(dryMass: number, engine: EngineSpec, next: EnginePart, count: number): number | null {
  const before = enginePartOf(engine)?.mass.kg ?? null;
  const after = next.mass.kg;
  if (before === null || after === null) return null;
  const out = dryMass + count * after - engine.count * before;
  return out > 0 ? out : null;
}

/**
 * Apply `ops` to a deep copy of `origin` and name it. Throws `RemixRefused`
 * for an op it will not apply (the module comment lists them); never changes
 * `origin`.
 */
export function remix(origin: VehicleSpec, ops: readonly RemixOp[], id: string, name: string): Remix {
  const spec: VehicleSpec = { ...structuredClone(origin), id, name };
  // A catalogue origin is the one a custom vehicle can name (the validator's
  // rule); a remix of a remix keeps the catalogue vehicle behind it, and an
  // origin naming none (or one that is not in the catalogue) passes none on.
  const derivedFrom = isCatalogueVehicle(origin.id) ? origin.id
    : origin.derivedFrom !== undefined && isCatalogueVehicle(origin.derivedFrom) ? origin.derivedFrom : undefined;
  if (derivedFrom !== undefined) spec.derivedFrom = derivedFrom;
  else delete spec.derivedFrom;
  // The Soyuz escape tower flies only on a vehicle derived from one that has it.
  if (spec.escapeSystem !== undefined && (derivedFrom === undefined || vehicleById(derivedFrom).escapeSystem !== spec.escapeSystem)) delete spec.escapeSystem;

  const estimates: RemixEstimate[] = [];
  const note = (code: RemixEstimateCode, where: RemixTarget | null = null): void => {
    estimates.push({ code, ...(where ? { stage: where.stage, ...(where.group !== undefined ? { group: where.group } : {}) } : {}) });
  };
  ops.forEach((op, i) => {
    const refuse = (code: RemixRefusal, detail: string): never => { throw new RemixRefused(code, i, detail); };
    const at = (t: RemixTarget): StageSpec | BoosterGroupSpec => {
      const stage = spec.stages[t.stage];
      if (!Number.isInteger(t.stage) || !stage) return refuse('noSuchStage', `stage ${t.stage}`);
      if (t.group === undefined) return stage;
      const group = t.stage === 0 ? stage.boosters?.[t.group] : undefined;
      if (!Number.isInteger(t.group) || !group) return refuse('noSuchGroup', `stage ${t.stage} group ${t.group}`);
      return group;
    };
    const within = (part: StageSpec | BoosterGroupSpec, isGroup: boolean): void => {
      const dryMax = isGroup ? PART_LIMITS.boosterDryMass : PART_LIMITS.stageDryMass;
      const propMax = isGroup ? PART_LIMITS.boosterPropellantMass : PART_LIMITS.stagePropellantMass;
      if (!(part.dryMass > 0 && part.dryMass <= dryMax)) refuse('outOfLimits', `dryMass ${part.dryMass} (at most ${dryMax})`);
      if (!(part.propellantMass > 0 && part.propellantMass <= propMax)) refuse('outOfLimits', `propellantMass ${part.propellantMass} (at most ${propMax})`);
      if (!(part.length > 0 && part.length <= PART_LIMITS.length)) refuse('outOfLimits', `length ${part.length} (at most ${PART_LIMITS.length})`);
    };
    const groundLit = (t: RemixTarget): boolean => t.stage === 0 && (t.group === undefined || !((at(t) as BoosterGroupSpec).igniteAt! > 0));

    switch (op.op) {
      case 'stretch': {
        const part = at(op.target);
        const k = op.factor;
        if (!Number.isFinite(k) || k <= 0) refuse('badFactor', `factor ${k}`);
        if (k === 1) break;
        const engine = enginePartOf(part.engine);
        const solid = part.engine.solid === true;
        // What does not grow with the tanks: the engines, when their mass is known.
        let fixed = 0;
        if (solid) note('solidCaseScaled', op.target);
        else {
          note('tankMassScaled', op.target);
          const perUnit = engine?.mass.kg ?? null;
          if (perUnit !== null && part.engine.count * perUnit < part.dryMass) fixed = part.engine.count * perUnit;
          else note('engineMassUnknown', op.target);
        }
        const dryMass = fixed + k * (part.dryMass - fixed);
        // The length: the extra load's volume at this diameter, where the load fits the stage.
        const family = engine?.family;
        let length = k * part.length;
        if (!solid && family && family !== 'solid') {
          const tank = tankLength(part.propellantMass, part.diameter, family as LiquidFamily, mixtureRatioFor(part.id, family as LiquidFamily));
          if (tank < part.length) {
            length = part.length + (k - 1) * tank;
            note('lengthFromVolume', op.target);
          } else note('lengthProportional', op.target);
        } else note('lengthProportional', op.target);
        part.propellantMass *= k;
        part.dryMass = dryMass;
        part.length = length;
        within(part, op.target.group !== undefined);
        break;
      }
      case 'swapEngine': {
        const part = at(op.target);
        let next: EnginePart;
        try { next = enginePart(op.part); } catch { return refuse('unknownPart', `engine ${op.part}`); }
        const n = op.count;
        if (!Number.isInteger(n) || n < 1 || n > PART_LIMITS.engineCount) refuse('badCount', `count ${n}`);
        const locked = lockedEngineCount(next.id);
        if (locked !== undefined && n !== locked) refuse('lumpedRecount', `${next.id} is installed ${locked}, never ${n}`);
        const current = enginePartOf(part.engine);
        if (next.solid || part.engine.solid) refuse('solidMotor', `${current?.id ?? part.engine.name} to ${next.id}`);
        if (next.vacuumOnly && groundLit(op.target)) refuse('vacuumEngineOnPad', next.id);
        if (current === next && part.engine.count === n) break; // the same installation: nothing changes
        const swapped = swapDryMass(part.dryMass, part.engine, next, n);
        if (swapped === null) note('engineMassUnknown', op.target);
        else part.dryMass = swapped;
        part.engine = engineSpec(next, n);
        const taken = partIds(spec);
        taken.delete(part.id);
        part.id = newPartId(taken, part.id);
        part.name = engineName(next, n);
        within(part, op.target.group !== undefined);
        break;
      }
      case 'addBoosters': {
        let body;
        try { body = boosterBody(op.body); } catch { return refuse('unknownPart', `strap-on body ${op.body}`); }
        const n = op.count;
        if (!Number.isInteger(n) || n < 1 || n > MAX_BOOSTERS_PER_GROUP) refuse('badCount', `count ${n}`);
        const core = spec.stages[0];
        const groups = core.boosters ?? [];
        if (groups.length >= MAX_BOOSTER_GROUPS) refuse('tooManyGroups', `${groups.length} groups already`);
        const igniteAt = op.igniteAt;
        if (igniteAt !== undefined && !(Number.isFinite(igniteAt) && igniteAt >= 0 && igniteAt <= 600)) refuse('badIgnition', `igniteAt ${igniteAt}`);
        if (enginePart(body.engine.part).vacuumOnly && !(igniteAt! > 0)) refuse('vacuumEngineOnPad', body.engine.part);
        const group = boosterSpec(body, n, igniteAt !== undefined ? { igniteAt } : {});
        // The catalogue body's own id, which keys its hardware's tables, unless the vehicle has it already.
        const taken = partIds(spec);
        if (taken.has(group.id) || RESERVED_PART_IDS.includes(group.id)) group.id = newPartId(taken, group.id);
        core.boosters = [...groups, group];
        break;
      }
      case 'removeBoosters': {
        const core = spec.stages[0];
        if (!Number.isInteger(op.group) || !core.boosters?.[op.group]) refuse('noSuchGroup', `group ${op.group}`);
        const left = core.boosters!.filter((_, g) => g !== op.group);
        if (left.length > 0) core.boosters = left;
        else delete core.boosters;
        break;
      }
      case 'fairing': {
        let part;
        try { part = fairingPart(op.part); } catch { return refuse('unknownPart', `fairing ${op.part}`); }
        const was = spec.fairing;
        if (!was) note('fairingSepAltitude');
        spec.fairing = fairingSpec(part, {
          sepAltitude: was ? was.sepAltitude : FLEET_FAIRING_SEP_ALTITUDE,
          ...(was?.sepTime !== undefined ? { sepTime: was.sepTime } : {}),
          ...(was?.color !== undefined ? { color: was.color } : {}),
        });
        break;
      }
      default:
        refuse('unknownOp', `op ${(op as { op: string }).op}`);
    }
  });
  if (ops.length > 0) {
    note('originRatings');
    const height = origin.height + (drawnHeight(spec) - drawnHeight(origin));
    if (!(height > 0 && height <= PART_LIMITS.height)) throw new RemixRefused('outOfLimits', ops.length - 1, `height ${height} (at most ${PART_LIMITS.height})`);
    spec.height = height;
  }
  return { spec, estimates };
}
