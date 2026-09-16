/**
 * Auto-tuning of the pitch-over kick angle by running the ascent headlessly
 * for a grid of candidates and keeping the one that reaches the parking orbit
 * with the largest remaining delta-v while respecting the max-Q limit.
 */
import type { GuidanceParams, MissionConfig } from '../types';
import { Simulation } from './simulation';
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
  const success = !!parking && s.status !== 'failed';
  const dv = parking ? Number(parking.params?.dv ?? 0) : 0;
  const lastFail = [...sim.events].reverse().find((e) => e.severity === 'fail' || e.severity === 'warn');
  let reason = success ? 'ok' : `${s.note}:${lastFail?.key ?? ''}`;
  if (success && s.maxQ.value > sim.vehicleSpec.maxQ) reason = 'maxQ';
  if (success && minAltCL < 80e3) reason = 'dip';
  return {
    kickAngle: flown.kickAngle, maxTurnRate: flown.maxTurnRate, loftAltitude: flown.loftAltitude, guidance: flown,
    success: success && reason === 'ok', dvRemaining: dv, maxQ: s.maxQ.value,
    minAltitudeClosedLoop: minAltCL, tInsertion: parking ? parking.t : -1, reason,
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
    best = ok.reduce((a, b) => (b.dvRemaining > a.dvRemaining ? b : a));
  } else {
    // nothing succeeded: prefer the candidate that got closest (highest remaining dv, then lowest maxQ)
    const partial = results.filter((r) => r.reason === 'maxQ' || r.reason === 'dip');
    if (partial.length > 0) best = partial.reduce((a, b) => (b.dvRemaining > a.dvRemaining ? b : a));
  }
  return { best, results };
}
