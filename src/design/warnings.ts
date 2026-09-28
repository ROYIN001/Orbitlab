/**
 * What is wrong with a vehicle design before it flies (roadmap D03): the
 * builder's warnings, as codes, levels and numbers.
 *
 * No text. Each warning is a code, a level, the stage (and strap-on group) it
 * is about, and the numbers it was decided on; the builder's screen maps the
 * code to a sentence in the reader's language and prints the numbers in it.
 * Every threshold is one the program already holds somewhere else — the
 * flight, the planner, the validator or the fleet's own acceptance tests — and
 * the table below names where, so a warning says what the flight or the
 * acceptance suite would say, not a second opinion:
 *
 * | code | level | condition | from |
 * |---|---|---|---|
 * | `invalid` | fail | any `vehicleSpecProblems` finding, by path | src/config/vehicle-spec.ts |
 * | `vacuumEngineOnPad` | fail | a ground-lit engine is `vacuumOnly` | the validator's own rule (`checkEngine`: "cannot be set on an engine that lights on the pad"), restated as a code |
 * | `noLiftoff` | fail | the hold-down never releases: thrust ≤ weight until T+3 s | `Simulation.stepPrelaunch`, replayed (`holdDownRelease`): released when thrust > weight, else `evt.noLiftoff` after T+3 s |
 * | `lowLiftoffTW` | warn | 1 < T/W < 1.15 | the fleet's floor, tests/data-consistency.test.ts ("thrust-to-weight is between 1.15 and 2.6") |
 * | `weakUpperStage` | warn | an upper stage lights at under 1.6 m/s² | `planMission`'s `weakFinalStage` (src/physics/mission.ts) |
 * | `fixedThrustOverAccel` | warn | a stage at its lowest thrust still exceeds `maxAccel` at burnout, or at the end of the strap-on phase | the throttle clamp in `VehicleModel.thrust` (a command below `minThrottle` is raised to it; no `minThrottle`, or a solid, cannot throttle) |
 * | `lowDv` | warn | ideal Δv < 9 500 m/s at the design payload | the fleet's floor, tests/ascent.test.ts ("a plausible ideal delta-v") |
 * | `implausibleFraction` | warn | a stage's or strap-on's propellant fraction outside [0.51, 0.97] | the catalogue's own range, 0.516 (Vega-C AVUM) to 0.962 (Falcon 9 second stage), rounded outward |
 * | `upperWiderThanFairing` | warn | the widest upper stage is wider than the fairing | tests/data-consistency.test.ts ("the fairing is at least as wide as the widest stage it sits on") |
 *
 * Levels: `fail` is what the flight or the validator would refuse outright; a
 * `warn` is something the fleet does not do or the flight will not like, on a
 * design that may still fly. `weakUpperStage` is how Briz-M, Fregat and every
 * kick stage fly, so on a last stage it is news, not a fault; `lowDv` is a
 * sanity floor on the data, not a verdict on a mission (the readiness review
 * judges the mission: src/design/readiness.ts). Nothing here flies the vehicle
 * beyond the pad.
 *
 * `noLiftoff` is the flight's own decision, not T/W ≤ 1 at full tanks. The
 * flight lights a liquid first stage at T−2.5 s, burns propellant on the
 * hold-down, and releases at the first step from T+0 at which the thrust at
 * the pad's pressure beats the weight under the pad's own gravity; only a
 * stack still held at T+3 s fails. So it lifts designs whose static T/W is a
 * little under 1: measured while this was written (thrust scaled until the
 * flight first lifted off, half the rated payload), Falcon 9 at a static
 * 0.982, Soyuz-2.1a 0.978, Electron 0.983, H3 0.992. A static T/W ≤ 1 test
 * would have failed all of those, so `holdDownRelease` replays the hold-down
 * on `VehicleModel` with the flight's step, ignition times, pad pressure and
 * gravity instead, and agrees with the flight to within one step's burn.
 *
 * A spec the validator refuses is not measured: its numbers describe nothing
 * the flight would ever fly (a mission refuses it, src/config/validation.ts),
 * and some would not compute. The catalogue's own objects are not put through
 * the validator — it refuses their ids by design, since it guards custom
 * vehicles against impersonating them — and tests/custom-vehicle.test.ts holds
 * every catalogue vehicle clean under an id of its own.
 *
 * DOM-free, SI units (N, kg, m, m/s, m/s²).
 */
import type { VehicleSpec } from '../types';
import { vehicleSpecProblems } from '../config/vehicle-spec';
import { isCatalogueVehicle, vehicleById } from '../data/vehicles';
import { siteById } from '../data/sites';
import { G0, MU_EARTH, R_EARTH } from '../physics/constants';
import { atmosphere } from '../physics/atmosphere';
import { guidanceForVehicle } from '../physics/defaults';
import { VehicleModel, engineMassFlow, idealDeltaV, liftoffMass, liftoffThrust, solidProfile } from '../physics/vehicle';

export type WarningCode =
  | 'invalid' | 'vacuumEngineOnPad' | 'noLiftoff' | 'lowLiftoffTW' | 'weakUpperStage'
  | 'fixedThrustOverAccel' | 'lowDv' | 'implausibleFraction' | 'upperWiderThanFairing';
export type WarningLevel = 'fail' | 'warn';

export interface DesignWarning {
  code: WarningCode;
  level: WarningLevel;
  /** the stage it is about, by index (0 is the first stage) */
  stage?: number;
  /** the first stage's strap-on group it is about, by index */
  booster?: number;
  /** the numbers it was decided on, SI; which ones depends on the code (see `designWarnings`) */
  params: Record<string, number>;
  /** `invalid` only: the validator's path, `stages[1].engine.ispVac` */
  path?: string;
  /** `invalid` only: the path without its indices, `stages.engine.ispVac` — the key the builder's text is found by */
  field?: string;
}

/** Each code's level: the table in the module comment. */
export const WARNING_LEVEL: Readonly<Record<WarningCode, WarningLevel>> = {
  invalid: 'fail', vacuumEngineOnPad: 'fail', noLiftoff: 'fail',
  lowLiftoffTW: 'warn', weakUpperStage: 'warn', fixedThrustOverAccel: 'warn', lowDv: 'warn',
  implausibleFraction: 'warn', upperWiderThanFairing: 'warn',
};

/** Liftoff T/W below which a design gets `lowLiftoffTW`: the fleet's floor (tests/data-consistency.test.ts). */
export const LIFTOFF_TW_FLOOR = 1.15;
/**
 * `planMission`'s weak-final-stage test (src/physics/mission.ts): a last stage
 * whose vacuum thrust over (its own mass + payload + this margin) is below the
 * acceleration is flown as an orbital-manoeuvring stage, not in the ascent.
 * Restated here because the planner's are local constants; the test holds the
 * two together.
 */
export const WEAK_STAGE_ACCEL = 1.6;
export const WEAK_STAGE_MARGIN_KG = 1500;
/** Ideal Δv below which a design gets `lowDv`: the fleet's floor (tests/ascent.test.ts). */
export const DV_FLOOR = 9500;
/**
 * The catalogue's range of propellant fraction mp/(ms + mp), stage by stage and
 * strap-on by strap-on: 0.516 (Vega-C's AVUM) to 0.962 (Falcon 9's second
 * stage), rounded outward to two decimals. Outside it a design is lighter or
 * heavier than anything that has flown here — an estimate of plausibility, not
 * a physical limit.
 */
export const PROPELLANT_FRACTION_RANGE: readonly [number, number] = [0.51, 0.97];

/**
 * The catalogue's own entry (the object `vehicleById` returns), not a copy of
 * it: a copy has an id of its own, and a spec that reuses a catalogue id is one
 * the validator refuses.
 */
export const isCatalogueEntry = (spec: VehicleSpec): boolean => isCatalogueVehicle(spec.id) && vehicleById(spec.id) === spec;

/** `stages[1].boosters[0].engine.ispVac` → stage 1, group 0, `stages.boosters.engine.ispVac`. */
function locate(path: string): Pick<DesignWarning, 'stage' | 'booster' | 'path' | 'field'> {
  const stage = /^stages\[(\d+)\]/.exec(path);
  const booster = /boosters\[(\d+)\]/.exec(path);
  return {
    path, field: path.replace(/\[\d+\]/g, ''),
    ...(stage ? { stage: Number(stage[1]) } : {}), ...(booster ? { booster: Number(booster[1]) } : {}),
  };
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * The ground-lit engines, as the validator decides it (`checkStage`,
 * `checkBooster`): the first stage's own, and each strap-on group whose
 * `igniteAt` is absent, not a number, or 0. Written for a spec that may not be
 * valid, since it runs before anything else has checked it.
 */
function groundLit(spec: VehicleSpec): { engine: Obj; path: string; booster?: number }[] {
  const st: unknown = Array.isArray(spec.stages) ? spec.stages[0] : undefined;
  if (!isObj(st)) return [];
  const out: { engine: Obj; path: string; booster?: number }[] = isObj(st.engine) ? [{ engine: st.engine, path: 'stages[0].engine' }] : [];
  if (Array.isArray(st.boosters)) {
    st.boosters.forEach((b: unknown, g) => {
      if (!isObj(b) || !isObj(b.engine)) return;
      const igniteAt = typeof b.igniteAt === 'number' && Number.isFinite(b.igniteAt) ? b.igniteAt : undefined;
      if (igniteAt === undefined || igniteAt === 0) out.push({ engine: b.engine, path: `stages[0].boosters[${g}].engine`, booster: g });
    });
  }
  return out;
}

/** The flight's prelaunch step, s (`Simulation.suggestedDt`, 'prelaunch'). */
const PAD_DT = 0.1;
/** A liquid first stage lights this long before T+0 (`Simulation`'s ignition sequence). */
const LIQUID_IGNITION_T = -2.5;
/** Still held down after T+this, the flight fails with `evt.noLiftoff` (`Simulation.stepPrelaunch`). */
const RELEASE_WINDOW_S = 3;

export interface HoldDownRelease {
  /** the hold-down released: thrust beat the weight at some step from T+0 to T+3 s */
  released: boolean;
  /** the release time, s after T+0; for a stack never released, the time the flight gives up */
  t: number;
  /** the best thrust over weight seen from T+0 on, at the pad's pressure and gravity */
  tw: number;
}

/**
 * `Simulation.stepPrelaunch`, replayed on the flight's own `VehicleModel`
 * without the rest of a flight: the same ignition sequence (a liquid first
 * stage and its liquid strap-ons lit at T−2.5 s, solids at T+0, air-lit
 * strap-ons not at all), the same 0.1 s step with thrust and propellant taken
 * together, the thrust at the pad's pressure, and the weight under the pad's
 * gravity μ/(R + h)². Released at the first step ending at or after T+0 whose
 * mean thrust exceeds the weight at its end; given up at the first step
 * ending after T+3 s. A step ends on T+0 exactly here; the flight's clock,
 * counted up from T−10 s in 0.1 s steps, reaches it a rounding short and
 * checks a step later, which can move the verdict by one step's burn (about
 * 0.06 % of the mass of a Falcon 9). tests/design-warnings.test.ts holds the
 * two to the same verdict across the edge of liftoff.
 */
export function holdDownRelease(spec: VehicleSpec, payloadKg: number, padAltitudeM: number): HoldDownRelease {
  const vm = new VehicleModel(spec, payloadKg);
  const st0 = vm.stages[0];
  const groundLitBoosters = st0.boosters.filter((b) => (b.spec.igniteAt ?? 0) <= 0);
  const pressure = atmosphere(padAltitudeM).p;
  const r = R_EARTH + padAltitudeM;
  const gravity = MU_EARTH / (r * r);
  const ignition = st0.spec.engine.solid ? 0 : LIQUID_IGNITION_T;
  let best = 0;
  for (let k = 0; ; k++) {
    const t = ignition + k * PAD_DT;
    if (k === 0) {
      vm.igniteStage(st0, t);
      for (const b of groundLitBoosters) if (!b.spec.engine.solid) vm.igniteBooster(b, t);
    }
    // T+0: the solids light (and a solid first stage, if it was not lit above)
    if (Math.abs(t) < 1e-9) {
      for (const b of groundLitBoosters) if (!b.ignited) vm.igniteBooster(b, t);
      if (!st0.ignited) vm.igniteStage(st0, t);
    }
    const thr = vm.thrust(t, pressure, 1, PAD_DT);
    if (thr.burning) vm.consume(t, 1, PAD_DT);
    const end = ignition + (k + 1) * PAD_DT;
    if (end < 0) continue;
    const tw = thr.thrust / (vm.totalMass() * gravity);
    best = Math.max(best, tw);
    if (tw > 1) return { released: true, t: end, tw: best };
    if (end > RELEASE_WINDOW_S) return { released: false, t: end, tw: best };
  }
}

/**
 * Everything the builder should say about `spec` carrying `payloadKg`, in the
 * order of the table in the module comment. `siteId` is the pad the hold-down
 * is replayed on (its altitude sets the pressure and the gravity), by default
 * the vehicle's first site. Params by code:
 *
 * - `noLiftoff`: `tw`, `thrustN`, `weightN` (at full tanks, sea level, G0 —
 *   the fleet's figure) and `releaseTw`, the best the hold-down reached;
 * - `lowLiftoffTW`: `tw`, `thrustN`, `weightN`, `floor`;
 * - `weakUpperStage`: `accel`, `floor` (m/s²);
 * - `fixedThrustOverAccel`: `accel` (at the lowest thrust, at burnout), `limit` (the flight's
 *   `maxAccel`), `strapOnPhase` (1 at the end of the first stage's strap-on phase, 0 at a
 *   stage's own burnout);
 * - `lowDv`: `dv`, `floor` (m/s);
 * - `implausibleFraction`: `fraction`, `min`, `max`;
 * - `upperWiderThanFairing`: `stageDiameter`, `fairingDiameter` (m).
 */
export function designWarnings(spec: VehicleSpec, payloadKg: number, siteId?: string): DesignWarning[] {
  if (!(payloadKg >= 0) || !Number.isFinite(payloadKg)) throw new RangeError(`payloadKg must be 0 or more (got ${payloadKg})`);
  const out: DesignWarning[] = [];
  const add = (code: WarningCode, params: Record<string, number>, where: Partial<DesignWarning> = {}): void => {
    out.push({ code, level: WARNING_LEVEL[code], ...where, params });
  };

  // --- structure: what the validator refuses
  const issues = isCatalogueEntry(spec) ? [] : vehicleSpecProblems(spec);
  const onPad = groundLit(spec).filter((g) => g.engine.vacuumOnly === true);
  const restated = new Set(onPad.map((g) => `${g.path}.vacuumOnly`));
  for (const issue of issues) if (!restated.has(issue.path)) add('invalid', {}, locate(issue.path));
  for (const g of onPad) add('vacuumEngineOnPad', {}, { stage: 0, ...(g.booster !== undefined ? { booster: g.booster } : {}) });
  if (out.length > 0) return out;

  // --- liftoff: the flight's hold-down, replayed; then the fleet's T/W floor
  // on the figure the fleet quotes (full tanks, all ground-lit engines at sea
  // level with a solid's head-end peak, G0: `liftoffThrust`/`liftoffMass`)
  const thrustN = liftoffThrust(spec);
  const weightN = liftoffMass(spec, payloadKg) * G0;
  const tw = thrustN / weightN;
  const release = holdDownRelease(spec, payloadKg, siteById(siteId ?? spec.sites[0]).altitude);
  if (!release.released) add('noLiftoff', { tw, thrustN, weightN, releaseTw: release.tw }, { stage: 0 });
  else if (tw < LIFTOFF_TW_FLOOR) add('lowLiftoffTW', { tw, thrustN, weightN, floor: LIFTOFF_TW_FLOOR }, { stage: 0 });

  // --- upper stages: the planner's weak-stage line, for every stage above the first
  const stages = spec.stages;
  for (let i = 1; i < stages.length; i++) {
    let mass = payloadKg + WEAK_STAGE_MARGIN_KG;
    for (let j = i; j < stages.length; j++) mass += stages[j].dryMass + stages[j].propellantMass;
    const e = stages[i].engine;
    const accel = (e.count * e.thrustVac) / mass;
    if (accel < WEAK_STAGE_ACCEL) add('weakUpperStage', { accel, floor: WEAK_STAGE_ACCEL }, { stage: i });
  }

  // --- burnout: can each stage hold the acceleration limit?
  // The limit is the one the flight flies for an untouched configuration: the
  // vehicle's programme's `maxAccel` when it sets one, else the spec's
  // (`Simulation`: guidance.maxAccel > 0 ? it : vehicleSpec.maxAccel). At a
  // stage's burnout the stack is its dry mass, everything above it and the
  // payload; the strap-ons are gone (they burn out first), and the fairing is
  // still on only at the first stage's burnout — where the model's Δv walk
  // drops it too (`VehicleModel.deltaVRemaining`). The engines run at their
  // lowest level — the minimum throttle, full thrust for an engine without
  // one, and for a solid the tail of its regressive profile (`solidProfile(1)`)
  // — at their vacuum thrust, which a first stage near burnout is close to.
  //
  // A first stage with strap-ons has a second peak, at the end of the parallel
  // phase, when the strap-ons are nearly empty and still pushing: Long March 5
  // flies its highest acceleration there. The mass then is the Δv walk's
  // (`deltaVRemaining`: the strap-ons' load gone and the core's full-throttle
  // share of the same time), with the model's own simplifications — the groups
  // burn out together, an air-lit group counted from liftoff — and every
  // engine still burning at its lowest level.
  const programme = guidanceForVehicle(spec).maxAccel;
  const limit = programme > 0 ? programme : spec.maxAccel;
  const lowestThrust = (e: VehicleSpec['stages'][number]['engine']): number =>
    e.count * e.thrustVac * (e.solid ? solidProfile(1, e.peakFactor) : e.minThrottle ?? 1);
  const boosters = stages[0].boosters ?? [];
  if (boosters.length > 0) {
    const core = stages[0].engine;
    const boosterProp = boosters.reduce((n, b) => n + b.propellantMass * b.count, 0);
    const boosterFlow = boosters.reduce((n, b) => n + b.count * b.engine.count * engineMassFlow(b.engine), 0);
    const coreInPar = Math.min(stages[0].propellantMass, core.count * engineMassFlow(core) * (boosterProp / boosterFlow));
    const mass = liftoffMass(spec, payloadKg) - boosterProp - coreInPar;
    const thrust = boosters.reduce((n, b) => n + b.count * lowestThrust(b.engine), 0)
      + (coreInPar < stages[0].propellantMass ? lowestThrust(core) : 0);
    const accel = thrust / mass;
    if (accel > limit) add('fixedThrustOverAccel', { accel, limit, strapOnPhase: 1 }, { stage: 0 });
  }
  for (let i = 0; i < stages.length; i++) {
    let mass = payloadKg + stages[i].dryMass + (i === 0 && spec.fairing ? spec.fairing.mass : 0);
    for (let j = i + 1; j < stages.length; j++) mass += stages[j].dryMass + stages[j].propellantMass;
    const accel = lowestThrust(stages[i].engine) / mass;
    if (accel > limit) add('fixedThrustOverAccel', { accel, limit, strapOnPhase: 0 }, { stage: i });
  }

  // --- the budget
  const dv = idealDeltaV(spec, payloadKg);
  if (dv < DV_FLOOR) add('lowDv', { dv, floor: DV_FLOOR });

  // --- mass fractions, stage by stage and strap-on by strap-on (per unit)
  const [min, max] = PROPELLANT_FRACTION_RANGE;
  stages.forEach((st, i) => {
    const parts = [{ dry: st.dryMass, prop: st.propellantMass, where: { stage: i } as Partial<DesignWarning> },
      ...(st.boosters ?? []).map((b, g) => ({ dry: b.dryMass, prop: b.propellantMass, where: { stage: i, booster: g } }))];
    for (const p of parts) {
      const fraction = p.prop / (p.dry + p.prop);
      if (fraction < min || fraction > max) add('implausibleFraction', { fraction, min, max }, p.where);
    }
  });

  // --- geometry: the fairing over the widest stage it sits on (a single stage sits under it itself)
  if (spec.fairing) {
    let widest = stages.length > 1 ? 1 : 0;
    for (let i = 2; i < stages.length; i++) if (stages[i].diameter > stages[widest].diameter) widest = i;
    if (spec.fairing.diameter < stages[widest].diameter) {
      add('upperWiderThanFairing', { stageDiameter: stages[widest].diameter, fairingDiameter: spec.fairing.diameter }, { stage: widest });
    }
  }
  return out;
}
