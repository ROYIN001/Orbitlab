/**
 * Auto-tuning of the pitch-over kick angle by running the ascent headlessly
 * for a grid of candidates and keeping the one that reaches the parking orbit
 * with the largest remaining delta-v while respecting the max-Q limit.
 */
import type { GuidanceParams, MissionConfig } from '../types';
import { Simulation } from './simulation';
import { orbitResiduals } from './mission';
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
    failure: { mode: 'none', time: 0, stage: 0 },
  };
  const sim = new Simulation(c, { headless: true });
  const flown = sim.cfg.guidance;
  let minAltCL = Infinity;
  let maxAlt = 0;
  let guard = 0;
  while (sim.state.t < maxTime && guard++ < 200000) {
    const dt = sim.suggestedDt();
    sim.step(dt);
    const s = sim.state;
    maxAlt = Math.max(maxAlt, s.altitude);
    // a dip: falling back below 80 km after having been above 120 km
    if (s.status !== 'orbit' && maxAlt > 120e3) minAltCL = Math.min(minAltCL, s.altitude);
    if (s.status === 'failed' || s.status === 'orbit') break;
    if (sim.events.some((e) => e.key === 'evt.parkingOrbit')) break;
  }
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
  cfg: MissionConfig, guidance: GuidanceParams, maxTime = 6 * 3600, maxSteps = 300000,
): { onTarget: boolean; misses: OrbitMiss[]; endStatus: string | null; t: number } {
  const sim = new Simulation({ ...cfg, guidance, guidanceResolved: true, failure: { mode: 'none', time: 0, stage: 0 } }, { headless: true });
  let guard = 0;
  while (!sim.done && sim.state.t < maxTime && guard++ < maxSteps) sim.step(sim.suggestedDt());
  const hit = sim.events.find((e) => e.key === 'evt.targetOrbit');
  const res = orbitResiduals(sim.plan.target, sim.state.elements);
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
  const vm = new VehicleModel(spec, cfg.payloadMassOverride ?? sat.mass, cfg.boosterRecovery, sat);
  const a = vm.nextStageAccel(false);
  return a > 0 && a < 4.8;
}

export function autotune(cfg: MissionConfig, candidates: number[] = DEFAULT_KICKS, rates: number[] = DEFAULT_RATES, lofts?: number[]): AutotuneOutcome {
  const results: TuneResult[] = [];
  const loftList = lofts ?? (needsLoftSearch(cfg) ? DEFAULT_LOFTS : [0]);
  for (const loft of loftList) for (const rate of rates) for (const k of candidates) results.push(runAscent(cfg, k, rate, loft));
  const ok = results.filter((r) => r.success);
  let best: TuneResult | null = null;
  if (ok.length > 0) {
    // Second pass (audit item B16): fly the best few survivors to completion and
    // prefer one that actually reaches the TARGET orbit. Ranked by remaining
    // delta-v first so the pass is spent on the candidates most likely to win,
    // and capped at five flights so a tuning click stays affordable.
    const ranked = [...ok].sort((a, b) => b.dvRemaining - a.dvRemaining);
    for (const r of ranked.slice(0, 5)) {
      const m = flyToTarget(cfg, r.guidance);
      r.missionOnTarget = m.onTarget;
      r.missionMisses = m.misses;
      if (m.endStatus !== null) r.missionEndStatus = m.endStatus;
    }
    const complete = ranked.filter((r) => r.missionOnTarget);
    best = complete.length > 0 ? complete[0] : ranked[0];
  } else {
    // nothing succeeded: prefer the candidate that got closest (highest remaining dv, then lowest maxQ)
    const partial = results.filter((r) => r.reason === 'maxQ' || r.reason === 'dip' || r.reason === 'insertion');
    if (partial.length > 0) best = partial.reduce((a, b) => (b.dvRemaining > a.dvRemaining ? b : a));
  }
  return { best, results };
}
