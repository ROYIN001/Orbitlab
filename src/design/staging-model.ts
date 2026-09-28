/**
 * The Engineer level's optimal staging page (roadmap D05) as data: the
 * stages a real vehicle gives the optimiser, the vehicle's own split to set
 * beside the optimum, the curve of payload ratio against the split for two
 * stages, and why an input or a problem gets no answer — for the Lagrange
 * solution of src/design/optimal-staging.ts, which this does not change.
 *
 * A VEHICLE'S STAGES. Each serial stage's vacuum Isp and structural ratio
 * ε = ms/(ms + mp) as the budget core reads them (`vehicleFigures`), and the
 * vehicle's own ideal Δv at the payload (the model's `idealDeltaV`: vacuum
 * Isp, no losses). Strap-ons are left out, and said to be: they burn beside
 * the core stage, a phase whose Δv is not c·ln n of one stage's mass ratio,
 * so the closed form does not describe them (optimal-staging.ts). The
 * fairing is not a stage either; the optimiser does not carry it.
 *
 * THE REAL SPLIT is only set beside the optimum for a vehicle with no
 * strap-ons, whose stages are then exactly the optimiser's: each stage's own
 * ideal Δv, mass ratio and the vehicle's payload ratio at the same payload
 * and the same total Δv. It is one feasible point of the same problem, so the
 * optimum carries at least as much (tests/design-optimal-staging.test.ts).
 * A vehicle with a fairing lifts it on its first stage, which the optimum
 * does not count (`fairingKg`, said on screen). What the comparison shows is
 * the optimum's blind spot: it is loss-free, and gravity and drag are paid by
 * the first stage, so real first stages take more of the Δv than the optimum
 * gives them (Saturn V: about 1.75 km/s optimal against 3.88 km/s flown).
 *
 * DOM-free, SI (m/s, s, kg).
 */
import type { VehicleSpec } from '../types';
import { G0 } from '../physics/constants';
import { vehicleFigures } from './budget';
import { optimalStaging, splitPayloadRatio, stagingLimit, type OptimalStaging, type StagingProblem, type StagingStage } from './optimal-staging';

/** How many stages the page takes. */
export const STAGING_MAX_STAGES = 5;
/** The inputs' bounds: Isp in s, ε as a fraction, Δv in m/s, payload in kg. */
export const STAGING_LIMITS = { isp: [50, 1000], epsilon: [0.01, 0.6], dv: [100, 30000], payload: [0, 1e6] } as const;

export interface StagingInputs {
  stages: StagingStage[];
  dvMps: number;
  payloadKg: number;
}

/** The optimiser's inputs from a vehicle's serial stages at `payloadKg`, and what was left out. */
export interface VehicleStaging extends StagingInputs {
  vehicleId: string;
  /** strap-on groups the vehicle has, left out of the stages */
  strapOnGroups: number;
  /** stages past `STAGING_MAX_STAGES`, left out */
  stagesLeftOut: number;
  fairingKg: number;
}

export function vehicleStaging(spec: VehicleSpec, payloadKg: number): VehicleStaging {
  const f = vehicleFigures(spec, payloadKg);
  const stages = spec.stages.slice(0, STAGING_MAX_STAGES).map((st, i) => ({ ispS: st.engine.ispVac, epsilon: f.stages[i].structuralRatio }));
  return {
    vehicleId: spec.id, stages, dvMps: f.totalDv, payloadKg,
    strapOnGroups: spec.stages[0]?.boosters?.length ?? 0,
    stagesLeftOut: Math.max(0, spec.stages.length - STAGING_MAX_STAGES),
    fairingKg: spec.fairing?.mass ?? 0,
  };
}

/** The inputs still exactly a vehicle's own (the comparison's condition for drawing the real split on the curve). */
export function sameInputs(a: StagingInputs, b: StagingInputs): boolean {
  return a.dvMps === b.dvMps && a.payloadKg === b.payloadKg && a.stages.length === b.stages.length
    && a.stages.every((s, i) => s.ispS === b.stages[i].ispS && s.epsilon === b.stages[i].epsilon);
}

export interface RealSplit {
  /** each stage's own ideal Δv, m/s, burn order */
  stageDv: number[];
  /** each stage's m0/mf */
  massRatio: number[];
  totalDv: number;
  /** payload over liftoff mass */
  payloadRatio: number;
  liftoffMass: number;
  fairingKg: number;
}

/**
 * The vehicle's own split at `payloadKg`, or null when it cannot be set beside
 * the optimum: strap-ons (a parallel phase) or more stages than the page takes.
 */
export function realSplit(spec: VehicleSpec, payloadKg: number): RealSplit | null {
  if ((spec.stages[0]?.boosters?.length ?? 0) > 0 || spec.stages.length > STAGING_MAX_STAGES) return null;
  const f = vehicleFigures(spec, payloadKg);
  // no strap-ons: one serial phase per stage, in order
  if (f.phases.length !== spec.stages.length || f.phases.some((p, i) => p.phase !== 'serial' || p.stageIndex !== i)) return null;
  return {
    stageDv: f.phases.map((p) => p.dv),
    massRatio: f.phases.map((p) => p.m0 / p.mf),
    totalDv: f.totalDv, payloadRatio: f.payloadFraction, liftoffMass: f.liftoffMass,
    fairingKg: spec.fairing?.mass ?? 0,
  };
}

/** The comparison: the optimum at the vehicle's own stages, Δv and payload, beside what the vehicle does. */
export interface StagingComparison {
  real: RealSplit;
  optimum: OptimalStaging;
}

export function compareWithVehicle(spec: VehicleSpec, payloadKg: number): StagingComparison | null {
  const real = realSplit(spec, payloadKg);
  if (!real) return null;
  const optimum = optimalStaging(vehicleStaging(spec, payloadKg).stages, real.totalDv, payloadKg);
  return optimum ? { real, optimum } : null;
}

// ─── what stops an answer ───────────────────────────────────────────────────

/** An input out of its bounds, named, with the stage it is on (0-based). */
export type StagingField = 'isp' | 'epsilon' | 'dv' | 'payload' | 'count';
export interface StagingInputProblem {
  field: StagingField;
  stage?: number;
}

const within = (v: number, [lo, hi]: readonly [number, number]): boolean => Number.isFinite(v) && v >= lo && v <= hi;

/** The first input the page will not solve with, or null. */
export function stagingInputProblem(inputs: StagingInputs): StagingInputProblem | null {
  if (inputs.stages.length < 1 || inputs.stages.length > STAGING_MAX_STAGES) return { field: 'count' };
  for (const [i, s] of inputs.stages.entries()) {
    if (!within(s.ispS, STAGING_LIMITS.isp)) return { field: 'isp', stage: i };
    if (!within(s.epsilon, STAGING_LIMITS.epsilon)) return { field: 'epsilon', stage: i };
  }
  if (!within(inputs.dvMps, STAGING_LIMITS.dv)) return { field: 'dv' };
  if (!within(inputs.payloadKg, STAGING_LIMITS.payload)) return { field: 'payload' };
  return null;
}

/** Each `stagingProblem` code's sentence. */
export const STAGING_PROBLEM_KEYS: Readonly<Record<StagingProblem, string>> = {
  invalid: 'build.eng.staging.problem.invalid',
  beyondLimit: 'build.eng.staging.problem.beyondLimit',
  stageWithoutDv: 'build.eng.staging.problem.stageWithoutDv',
};

/**
 * The stage an optimum with no answer would leave out (`stageWithoutDv`): the
 * one with the least c(1 − ε). The optimum's mass ratios are
 * n_i = (c_i − x)/(c_i ε_i) for one x, and n_i > 1 exactly when
 * x < c_i(1 − ε_i), so when any stage gets no Δv this one is among them.
 */
export function stageLeftOut(stages: readonly StagingStage[]): number {
  let at = 0, least = Infinity;
  stages.forEach((s, i) => {
    const v = G0 * s.ispS * (1 - s.epsilon);
    if (v < least) { least = v; at = i; }
  });
  return at;
}

/** The numbers each problem's sentence needs: the limit Δv, or the stage left out (1-based). */
export function problemValues(problem: StagingProblem, stages: readonly StagingStage[]): { limit?: number; stage?: number } {
  if (problem === 'beyondLimit') return { limit: stagingLimit(stages) };
  if (problem === 'stageWithoutDv') return { stage: stageLeftOut(stages) + 1 };
  return {};
}

// ─── the two-stage curve ────────────────────────────────────────────────────

export interface SplitCurve {
  /** the first stage's share of Δv, m/s */
  dv1: number[];
  /** the payload ratio at that split (0 where no vehicle of these stages flies it) */
  ratio: number[];
  /** the widest share range where the ratio is above 0, m/s */
  flyable: [number, number] | null;
}

/**
 * The payload ratio against the first stage's share of `dvMps` for two stages,
 * at `samples + 1` evenly spaced shares from 0 to the whole Δv
 * (`splitPayloadRatio`, the optimiser's own score of any split).
 */
export function splitCurve(stages: readonly [StagingStage, StagingStage] | readonly StagingStage[], dvMps: number, samples = 240): SplitCurve {
  if (stages.length !== 2) throw new Error('splitCurve: two stages');
  const dv1: number[] = [], ratio: number[] = [];
  let lo = Infinity, hi = -Infinity;
  for (let k = 0; k <= samples; k++) {
    const a = (dvMps * k) / samples;
    const r = splitPayloadRatio(stages, [a, dvMps - a]);
    dv1.push(a);
    ratio.push(r);
    if (r > 0) { lo = Math.min(lo, a); hi = Math.max(hi, a); }
  }
  return { dv1, ratio, flyable: Number.isFinite(lo) ? [lo, hi] : null };
}
