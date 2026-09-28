/**
 * Optimal staging (roadmap D05): how to divide a required Δv among serial
 * stages of given specific impulse and structural ratio so that the vehicle
 * carries the most payload for its mass on the pad.
 *
 * The method is the Lagrange-multiplier solution of the ideal (loss-free)
 * problem; the textbook reference is Curtis, Orbital Mechanics for Engineering
 * Students, the rocket vehicle dynamics chapter, section on optimal staging.
 * With, for stage i in burn order,
 *
 *   c_i = G0·Isp_i                 exhaust speed
 *   ε_i = ms_i/(ms_i + mp_i)       structural ratio
 *   n_i = m0_i/mf_i                mass ratio (stack at ignition over stack at burnout)
 *
 * the stage gives Δv_i = c_i ln n_i, and the payload ratio of the vehicle is
 *
 *   π* = m_payload/m0_1 = Π (1 − n_i ε_i)/(n_i (1 − ε_i)).
 *
 * Making ln π* stationary under Σ c_i ln n_i = Δv, with multiplier η, gives
 *
 *   n_i = (c_i η − 1)/(c_i ε_i η),
 *
 * and η is fixed by the constraint. ln π* is a sum of strictly concave functions
 * of the Δv_i, so the stationary point is the one maximum. The solver works in
 * x = 1/η, a speed: n_i = (c_i − x)/(c_i ε_i), and Σ c_i ln n_i falls strictly
 * from Σ c_i ln(1/ε_i) at x = 0 to −∞ at x = min c_i, so bisection on that
 * finite interval always brackets the root (η > max 1/c_i in the book's terms).
 *
 * Two limits:
 * - Δv must stay below Σ c_i ln(1/ε_i), the Δv of stages that are all
 *   propellant but their structure and carry nothing. At the limit the payload
 *   ratio is zero; past it no staging of these stages will do.
 * - Every stage must get some Δv (n_i > 1). For a small Δv and unlike stages
 *   the stationary point can hand a low-Isp stage a mass ratio below 1, a stage
 *   of negative mass; the true optimum then leaves that stage out, which is a
 *   different vehicle, so it is reported rather than solved.
 *
 * Serial stages only. A strap-on phase (VehicleModel.deltaVRemaining's parallel
 * phase) burns two loads at once at an exhaust speed averaged over both flows,
 * so its Δv is not c ln n of one stage's own mass ratio, and the closed form
 * above does not describe it. The D05 page must say so.
 *
 * DOM-free, SI units (m/s, s, kg); tests/design-optimal-staging.test.ts holds it
 * to closed forms, a brute-force search and a published worked example.
 */
import { G0 } from '../physics/constants';

export interface StagingStage {
  /** vacuum specific impulse, s */
  ispS: number;
  /** structural ratio ε = ms/(ms + mp), 0 < ε < 1 */
  epsilon: number;
}

export interface OptimalStaging {
  /** the Lagrange multiplier η, s/m */
  eta: number;
  /** n_i = m0_i/mf_i, burn order */
  massRatio: number[];
  /** Δv_i = c_i ln n_i, m/s; they sum to the required Δv */
  stageDv: number[];
  /** π_i = (mass above stage i)/m0_i; their product is `payloadRatio` */
  stagePayloadRatio: number[];
  /** ms + mp of each stage, kg */
  stageMass: number[];
  structureMass: number[];
  propellantMass: number[];
  /** the whole vehicle with its payload, kg */
  grossMass: number;
  /** m_payload/grossMass, whatever the payload */
  payloadRatio: number;
}

/**
 * Why no optimum is returned: bad input (stages, Δv or payload), Δv at or past
 * the limit, or a stage the optimum would leave out.
 */
export type StagingProblem = 'invalid' | 'beyondLimit' | 'stageWithoutDv';

const exhaust = (s: StagingStage): number => G0 * s.ispS;

const validPayload = (kg: number): boolean => Number.isFinite(kg) && kg >= 0;

const validStages = (stages: readonly StagingStage[]): boolean =>
  stages.length > 0 && stages.every((s) => Number.isFinite(s.ispS) && s.ispS > 0 && Number.isFinite(s.epsilon) && s.epsilon > 0 && s.epsilon < 1);

/** Σ c_i ln(1/ε_i), m/s: the Δv no staging of these stages can reach. */
export function stagingLimit(stages: readonly StagingStage[]): number {
  let dv = 0;
  for (const s of stages) dv += exhaust(s) * Math.log(1 / s.epsilon);
  return dv;
}

/**
 * The payload ratio of any division of Δv among the stages (not only the
 * optimal one): the curve D05 plots. 0 where no stage of that kind can make its
 * share (n_i ε_i ≥ 1) or a share is negative (a stage of negative mass).
 */
export function splitPayloadRatio(stages: readonly StagingStage[], stageDv: readonly number[]): number {
  let ratio = 1;
  stages.forEach((s, i) => {
    const n = Math.exp(stageDv[i] / exhaust(s));
    const left = 1 - n * s.epsilon;
    ratio *= left > 0 && n >= 1 ? left / (n * (1 - s.epsilon)) : 0;
  });
  return ratio;
}

type Solved = { x: number; n: number[] } | { problem: StagingProblem };

function solve(stages: readonly StagingStage[], dvMps: number): Solved {
  if (!validStages(stages) || !Number.isFinite(dvMps) || !(dvMps > 0)) return { problem: 'invalid' };
  if (dvMps >= stagingLimit(stages)) return { problem: 'beyondLimit' };
  const c = stages.map(exhaust);
  const dvAt = (x: number): number => {
    let dv = 0;
    stages.forEach((s, i) => { dv += c[i] * Math.log((c[i] - x) / (c[i] * s.epsilon)); });
    return dv;
  };
  // Σ c ln n(x) falls strictly on (0, min c): bisect until the interval cannot
  // shrink any further in doubles (a few thousand steps at the very worst).
  let lo = 0;
  let hi = Math.min(...c);
  for (let k = 0; k < 4000; k++) {
    const mid = lo + (hi - lo) / 2;
    if (mid <= lo || mid >= hi) break;
    if (dvAt(mid) > dvMps) lo = mid;
    else hi = mid;
  }
  const x = lo + (hi - lo) / 2;
  if (!(x > 0)) return { problem: 'beyondLimit' };
  const n = stages.map((s, i) => (c[i] - x) / (c[i] * s.epsilon));
  if (n.some((ni) => !(ni > 1))) return { problem: 'stageWithoutDv' };
  return { x, n };
}

/**
 * What stops `optimalStaging` from answering, or null when it answers. Pass
 * the same payload: a negative or non-finite one is `invalid` too (the default,
 * 0, is always a payload the solver takes), so every null `optimalStaging`
 * returns has a reason here.
 */
export function stagingProblem(stages: readonly StagingStage[], dvMps: number, payloadKg = 0): StagingProblem | null {
  if (!validPayload(payloadKg)) return 'invalid';
  const s = solve(stages, dvMps);
  return 'problem' in s ? s.problem : null;
}

/**
 * The optimal division of `dvMps` among `stages` (burn order) and the stage
 * masses that carry `payloadKg`, or null (see `stagingProblem` for why).
 */
export function optimalStaging(stages: readonly StagingStage[], dvMps: number, payloadKg: number): OptimalStaging | null {
  if (!validPayload(payloadKg)) return null;
  const s = solve(stages, dvMps);
  if ('problem' in s) return null;
  const { x, n } = s;
  const c = stages.map(exhaust);
  // 1 − n_i ε_i is exactly x/c_i; written so, it keeps its digits near the limit
  // where both terms tend to 1.
  const free = c.map((ci) => x / ci);
  const stagePayloadRatio = stages.map((st, i) => free[i] / (n[i] * (1 - st.epsilon)));
  // From the top down: stage i lifts everything above it, m_i = m_above·(n_i − 1)/(1 − n_i ε_i).
  const stageMass: number[] = new Array(stages.length);
  let above = payloadKg;
  for (let i = stages.length - 1; i >= 0; i--) {
    stageMass[i] = above * (n[i] - 1) / free[i];
    above += stageMass[i];
  }
  return {
    eta: 1 / x,
    massRatio: n,
    stageDv: n.map((ni, i) => c[i] * Math.log(ni)),
    stagePayloadRatio,
    stageMass,
    structureMass: stageMass.map((m, i) => m * stages[i].epsilon),
    propellantMass: stageMass.map((m, i) => m * (1 - stages[i].epsilon)),
    grossMass: above,
    payloadRatio: stagePayloadRatio.reduce((p, r) => p * r, 1),
  };
}
