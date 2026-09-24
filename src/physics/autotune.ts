/**
 * Auto-tuning of the pitch-over kick angle by running the ascent headlessly
 * for a grid of candidates and keeping the one that reaches the parking orbit
 * with the largest remaining delta-v while respecting the max-Q limit.
 */
import type { GuidanceParams, MissionConfig } from '../types';
import { Simulation } from './simulation';
import { orbitResiduals, ORBIT_INSERTION_FLOOR } from './mission';
import type { OrbitMiss } from './mission';
import { VehicleModel } from './vehicle';
import { vehicleById } from '../data/vehicles';
import { satelliteById } from '../data/satellites';

export interface TuneResult {
  /**
   * The three swept parameters *as they were flown*. When the caller's
   * configuration is not `guidanceResolved`, the vehicle's own
   * `guidanceDefaults` may replace a candidate that still sits at the library
   * default, so these are the resolved values and not necessarily the ones the
   * search asked for — writing them back into the caller's guidance therefore
   * reproduces exactly the trajectory that was measured.
   */
  kickAngle: number;
  maxTurnRate: number;
  loftAltitude: number;
  /** every guidance parameter the measured flight used */
  guidance: GuidanceParams;
  success: boolean;
  dvRemaining: number;
  maxQ: number;
  minAltitudeClosedLoop: number;
  tInsertion: number;
  reason: string;
  /**
   * How the insertion orbit missed the plan, empty when it did not.
   *
   * Numbers, not prose: `orbitResiduals` no longer builds English sentences
   * (review follow-up), and a tuning diagnostic has no business being the one
   * caller that still needs them.
   */
  residual: OrbitMiss[];
  /** set by `autotune` when the candidate was flown to completion */
  missionOnTarget?: boolean;
  missionMisses?: OrbitMiss[];
  /** terminal state of the completion flight when it did not reach the target */
  missionEndStatus?: string;
}

export interface AutotuneOutcome {
  best: TuneResult | null;
  results: TuneResult[];
}

export function runAscent(cfg: MissionConfig, kickAngle: number, maxTurnRate = cfg.guidance.maxTurnRate, loftAltitude = cfg.guidance.loftAltitude, maxTime = 2400): TuneResult {
  // Build the configuration exactly the way the caller's own flight will be
  // built — in particular, keep `guidanceResolved` as the caller has it — so
  // that the tuner measures the trajectory that this candidate will actually
  // fly. Forcing `guidanceResolved: true` here used to measure a candidate
  // (say kick 2.5°) that the flown mission then replaced with the vehicle
  // default, because the value-based merge in `applyVehicleGuidanceDefaults`
  // cannot tell "the operator chose 2.5" from "nobody touched 2.5".
  // `TuneResult` reports the resolved values, so writing them back into the
  // caller's guidance reproduces the measured flight.
  const c: MissionConfig = {
    ...cfg,
    guidance: { ...cfg.guidance, kickAngle, maxTurnRate, loftAltitude },
    failure: { ...cfg.failure },
  };
  const sim = new Simulation(c, { headless: true });
  const flown = sim.cfg.guidance;
  let minAltCL = Infinity;
  let maxAlt = 0;
  let guard = 0;
  const stepBudget = cfg.dynamics?.model === 'sixDof' ? Math.ceil((maxTime + 10) / 0.01) + 1000 : 200000;
  while (sim.state.t < maxTime && guard++ < stepBudget) {
    const dt = sim.suggestedDt();
    sim.step(dt);
    const s = sim.state;
    maxAlt = Math.max(maxAlt, s.altitude);
    // a dip: falling back below 80 km after having been above 120 km
    if (s.status !== 'orbit' && maxAlt > 120e3) minAltCL = Math.min(minAltCL, s.altitude);
    if (s.status === 'failed' || s.status === 'orbit') break;
    if (sim.events.some((e) => e.key === 'evt.parkingOrbit')) break;
  }
  // The engine that made the parking orbit is still tailing off, and the cut-off
  // was timed on the orbit that tail-off leaves: that is the orbit to judge.
  for (let n = 0; n < 1000 && sim.state.status !== 'failed' && sim.vehicle.inTransient(sim.state.t); n++) sim.step(sim.suggestedDt());
  const s = sim.state;
  const parking = sim.events.find((e) => e.key === 'evt.parkingOrbit');
  const reached = !!parking && s.status !== 'failed';
  const dv = parking ? Number(parking.params?.dv ?? 0) : 0;
  const lastFail = [...sim.events].reverse().find((e) => e.severity === 'fail' || e.severity === 'warn');
  // A parking orbit is not the mission (audit item B16). `runAscent` stops at
  // `evt.parkingOrbit` for speed, so what it can still check for free is the
  // orbit it stopped in: an insertion that is nowhere near the plan is not a
  // candidate worth ranking, whatever happens downstream. `residual` is
  // reported so a near miss is visible instead of being scored as a clean
  // success, and `autotuneToTarget` below flies the survivors to completion.
  const res = orbitResiduals(sim.plan.target, s.elements);
  const planned = orbitResiduals(
    sim.plan.target,
    { periapsisAlt: sim.plan.insertionAltitude, apoapsisAlt: sim.plan.insertionApoapsis, i: sim.plan.ascentInclination, raan: 0, e: 0 },
  );
  // The ascent is judged against the orbit the PLAN asked it to reach, not
  // against the mission's final orbit: a parking orbit is supposed to differ
  // from a geostationary transfer.
  const insertionOk = Math.abs(s.elements.periapsisAlt - sim.plan.insertionAltitude) < Math.max(20e3, 0.1 * sim.plan.insertionAltitude)
    && Math.abs(s.elements.apoapsisAlt - sim.plan.insertionApoapsis) < Math.max(30e3, 0.15 * sim.plan.insertionApoapsis);
  let reason = reached ? 'ok' : `${s.note}:${lastFail?.key ?? ''}`;
  if (reached && s.maxQ.value > sim.vehicleSpec.maxQ) reason = 'maxQ';
  else if (reached && minAltCL < 80e3) reason = 'dip';
  else if (reached && !insertionOk) reason = 'insertion';
  return {
    kickAngle: flown.kickAngle, maxTurnRate: flown.maxTurnRate, loftAltitude: flown.loftAltitude, guidance: flown,
    success: reached && reason === 'ok', dvRemaining: dv, maxQ: s.maxQ.value,
    minAltitudeClosedLoop: minAltCL, tInsertion: parking ? parking.t : -1, reason,
    residual: planned.onTarget ? res.misses : [],
  };
}

/**
 * Fly a tuning candidate to completion and report whether the MISSION — not the
 * ascent — succeeded.
 *
 * `runAscent` breaks at `evt.parkingOrbit`, so nothing after insertion can
 * influence the parameter choice: an unreachable transfer, a stage that cannot
 * restart, a burn that never completes and an off-target final orbit are all
 * invisible to it (audit item B16). This is the second, cheap scoring pass the
 * audit asks for, with the TIME BUDGET it also asks for — a stalled candidate
 * never reaches a terminal state, so "fly to completion" on its own hangs.
 */
export function flyToTarget(
  cfg: MissionConfig, guidance: GuidanceParams, maxTime = 6 * 3600,
  maxSteps = cfg.dynamics?.model === 'sixDof' ? Math.ceil((maxTime + 10) / 0.01) + 1000 : 300000,
): { onTarget: boolean; misses: OrbitMiss[]; endStatus: string | null; t: number } {
  const sim = new Simulation({ ...cfg, guidance, guidanceResolved: true, failure: { ...cfg.failure } }, { headless: true });
  let guard = 0;
  while (!sim.done && sim.state.t < maxTime && guard++ < maxSteps) sim.step(sim.suggestedDt());
  const hit = sim.events.find((e) => e.key === 'evt.targetOrbit');
  const res = orbitResiduals(sim.plan.target, sim.state.elements, true);
  // A candidate can also fail by never getting far enough to have a residual at
  // all (it broke up, or it is still climbing at the horizon). That used to be
  // reported as a fabricated `ended <status>` entry in the residual list, which
  // made a terminal state look like an orbital parameter; it is its own field.
  return {
    onTarget: !!hit,
    misses: hit ? [] : res.misses,
    endStatus: hit ? null : sim.state.status,
    t: hit ? hit.t : -1,
  };
}

export const DEFAULT_KICKS = [1.5, 2.5, 4, 6, 9, 12];
export const DEFAULT_RATES = [0.3, 0.45, 0.6, 0.8];

export const DEFAULT_LOFTS = [0, 80e3, 150e3, 250e3];

/** Whether the vehicle hands off to an upper stage too weak to hold altitude (needs a loft search). */
export function needsLoftSearch(cfg: MissionConfig): boolean {
  const spec = vehicleById(cfg.vehicleId);
  const sat = satelliteById(cfg.satelliteId);
  const vm = new VehicleModel(spec, cfg.payloadMassOverride ?? sat.mass, cfg.boosterRecovery, sat, cfg.recoveryPlan);
  const a = vm.nextStageAccel(false);
  return a > 0 && a < 4.8;
}

export interface TuneProgress { phase: 'ascent' | 'mission'; completed: number; total: number }

export function autotune(cfg: MissionConfig, candidates?: number[], rates?: number[], lofts?: number[], onProgress?: (progress: TuneProgress) => void): AutotuneOutcome {
  const results: TuneResult[] = [];
  const rigid = cfg.dynamics?.model === 'sixDof';
  // A small local search is explicit for the expensive coupled model. Every
  // candidate and final verification still flies the selected physics model.
  candidates ??= rigid ? [...new Set([0.8, 1, 1.2].map(f => Math.max(0.1, Math.min(20, cfg.guidance.kickAngle * f))))] : DEFAULT_KICKS;
  rates ??= rigid ? [cfg.guidance.maxTurnRate] : DEFAULT_RATES;
  const loftList = lofts ?? (rigid ? [cfg.guidance.loftAltitude] : needsLoftSearch(cfg) ? DEFAULT_LOFTS : [0]);
  const total = loftList.length * rates.length * candidates.length;
  onProgress?.({ phase: 'ascent', completed: 0, total });
  for (const loft of loftList) for (const rate of rates) for (const k of candidates) {
    results.push(runAscent(cfg, k, rate, loft));
    onProgress?.({ phase: 'ascent', completed: results.length, total });
  }
  const ok = results.filter((r) => r.success);
  let best: TuneResult | null = null;
  if (ok.length > 0) {
    // Second pass (audit item B16): fly the best few survivors to completion and
    // prefer one that actually reaches the TARGET orbit. Ranked by remaining
    // delta-v first so the pass is spent on the candidates most likely to win,
    // and capped at five flights so a tuning click stays affordable.
    const ranked = [...ok].sort((a, b) => b.dvRemaining - a.dvRemaining);
    const finalists = ranked.slice(0, rigid ? 2 : 5);
    for (const [index, r] of finalists.entries()) {
      const m = flyToTarget(cfg, r.guidance);
      r.missionOnTarget = m.onTarget;
      r.missionMisses = m.misses;
      if (m.endStatus !== null) r.missionEndStatus = m.endStatus;
      onProgress?.({ phase: 'mission', completed: index + 1, total: finalists.length });
      if (rigid && m.onTarget) break;
    }
    const complete = ranked.filter((r) => r.missionOnTarget);
    best = complete.length > 0 ? complete[0] : ranked[0];
  } else {
    // Nothing passed the ascent screen. The screen stands in for "worth flying
    // to the end", and when every candidate fails it only for inserting away
    // from the plan it has nothing left to say: a weak upper stage that arcs
    // over its target and makes the orbit with the later burns — Vulcan's
    // Centaur V under a heavy payload inserts at 137 x 1 200 km against a
    // 250 x 500 km plan on every candidate — is exactly that case. Fly the best
    // of them to the end, as the second pass above does for survivors, and let
    // the mission decide.
    const offPlan = results.filter((r) => r.reason === 'insertion')
      .sort((a, b) => b.dvRemaining - a.dvRemaining).slice(0, rigid ? 2 : 5);
    for (const [index, r] of offPlan.entries()) {
      const m = flyToTarget(cfg, r.guidance);
      r.missionOnTarget = m.onTarget;
      r.missionMisses = m.misses;
      if (m.endStatus !== null) r.missionEndStatus = m.endStatus;
      onProgress?.({ phase: 'mission', completed: index + 1, total: offPlan.length });
      if (m.onTarget) { best = r; break; }
    }
    // otherwise prefer the candidate that got closest (highest remaining dv, then lowest maxQ)
    const partial = results.filter((r) => r.reason === 'maxQ' || r.reason === 'dip' || r.reason === 'insertion');
    if (!best && partial.length > 0) best = partial.reduce((a, b) => (b.dvRemaining > a.dvRemaining ? b : a));
  }
  return { best, results };
}

// ---------------------------------------------------------------------------
// The insertion probe
// ---------------------------------------------------------------------------

/**
 * How long the insertion probe flies before giving up, s.
 *
 * The question it asks is answered by the insertion clock and nothing later:
 * the slowest class in the fleet — a launcher whose orbit is made by a kick
 * stage below 0.15 g — is held to T+1900 s by the fleet gate's own
 * `insertionLimit`, and every accepted row in the matrix is in an orbit well
 * inside that. The horizon is the same 2400 s `runAscent` uses, which leaves
 * 500 s of headroom over the slowest accepted insertion and still bounds the
 * cost at a few thousand integration steps.
 */
export const INSERTION_PROBE_HORIZON = 2400;

export interface InsertionProbe {
  /**
   * The flight was still flying at the horizon: not destroyed, not suborbital,
   * not out of propellant short of an orbit.
   *
   * This — rather than a threshold on the perigee — is what the probe answers,
   * and the difference is deliberate. A perigee threshold asks a question with
   * a knife edge in it (Proton-M/Briz-M's own accepted rows insert through
   * 135 km on their way to 500 km, five kilometres under a 140 km line, and
   * they are perfectly good missions), while "was the vehicle lost trying?" has
   * no edge: every flight in the fleet matrix is either comfortably flying at
   * T+2400 s or has already ended in `evt.vehicleLost`, `evt.outOfPropellant`
   * or `evt.insertionAbandoned` by then.
   */
  reachesOrbit: boolean;
  /** first moment the stack held a bound orbit above the insertion floor, s (−1 if never) */
  tInsertion: number;
  /** the best perigee it ever held on a bound orbit after the ascent, m */
  bestPerigee: number;
  /** apoapsis at that moment, m */
  apoapsis: number;
  /** the event the flight ended on, '' when it was still flying at the horizon */
  endedWith: string;
}

/**
 * Fly the ascent and the insertion headlessly and report whether the stack gets
 * into orbit at all.
 *
 * The pre-flight verdict is otherwise derived from data and the mission plan,
 * deliberately and for good reasons — a full mission costs tens of milliseconds
 * and `runAscent` is not a sound oracle for "will this mission succeed",
 * because it stops at the parking orbit. This is the one question where that
 * objection does not apply, because stopping at the parking orbit is exactly
 * what is being asked: *is there a parking orbit?*
 *
 * It exists because no static budget can answer it. The plan can say how much
 * ideal Δv the ascent stages are short of the orbit they are aimed at
 * (`MissionPlan.ascentMakeUp`) and how far a kick stage sinks making that up
 * (`kickStageSink`), and for a stack that carries a kick stage those two
 * numbers decide the mission — but the first is built on a fleet-wide loss
 * allowance with a ±500 m/s spread and the second is CUBIC in it. Measured
 * across the fleet, that arithmetic calls Proton-M/Briz-M with the 7.15 t crew
 * ship beyond capability (correct: its losses run 240 m/s above the allowance)
 * and Angara-A5/Briz-M to a 600 km sun-synchronous orbit beyond capability too
 * (wrong: it inserts at 200 km and delivers 598 × 598 km, because its losses
 * run well below it). A verdict cannot ship a rule that is wrong about a
 * mission the project's own acceptance suite flies.
 *
 * So the probe flies it. The flight is headless, deterministic, capped at
 * `INSERTION_PROBE_HORIZON`, stops the moment the answer is yes, and costs
 * 7-95 ms across the fleet matrix (median 40).
 *
 * Failure injection is deliberately disarmed: the probe asks whether the STACK
 * can reach orbit, and an armed failure is reported by the verdict separately
 * and on purpose.
 */
export function probeInsertion(cfg: MissionConfig, horizon = INSERTION_PROBE_HORIZON): InsertionProbe {
  const sim = new Simulation({ ...cfg, failure: { mode: 'none', time: 0, stage: 0 } }, { headless: true });
  let best = -Infinity;
  let apoapsis = 0;
  let tInsertion = -1;
  let guard = 0;
  const stepBudget = cfg.dynamics?.model === 'sixDof' ? Math.ceil((horizon + 10) / 0.01) + 1000 : 200000;
  while (!sim.done && sim.state.t < horizon && guard++ < stepBudget) {
    sim.step(sim.suggestedDt());
    const el = sim.state.elements;
    // Only once the powered ascent is over: an osculating perigee during the
    // ascent means nothing (it is a thousand kilometres inside the Earth for
    // the whole first stage) and a lofted trajectory crosses the floor on the
    // way up without being in any orbit at all.
    if (sim.state.status === 'ascent' || sim.state.status === 'prelaunch') continue;
    if (!(el.e < 1)) continue;
    if (el.periapsisAlt > best) {
      best = el.periapsisAlt;
      apoapsis = el.apoapsisAlt;
    }
    if (tInsertion < 0 && el.periapsisAlt >= ORBIT_INSERTION_FLOOR) {
      tInsertion = sim.state.t;
      break; // the answer is yes; nothing later can change it
    }
  }
  const last = sim.events[sim.events.length - 1];
  return {
    reachesOrbit: sim.state.status !== 'failed',
    tInsertion,
    bestPerigee: isFinite(best) ? best : -Infinity,
    apoapsis,
    endedWith: sim.state.status === 'failed' && last ? last.key : '',
  };
}
