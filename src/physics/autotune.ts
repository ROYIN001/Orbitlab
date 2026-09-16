/**
 * Auto-tuning of the pitch-over kick angle by running the ascent headlessly
 * for a grid of candidates and keeping the one that reaches the parking orbit
 * with the largest remaining delta-v while respecting the max-Q limit.
 */
import type { MissionConfig } from '../types';
import { Simulation } from './simulation';
import { VehicleModel } from './vehicle';
import { vehicleById } from '../data/vehicles';
import { satelliteById } from '../data/satellites';

export interface TuneResult {
  kickAngle: number;
  maxTurnRate: number;
  loftAltitude: number;
  success: boolean;
  dvRemaining: number;
  maxQ: number;
  minAltitudeClosedLoop: number;
  tInsertion: number;
  reason: string;
  /** the insertion orbit is close to the planned one (not lofted, perigee not sagging) */
  insertionOk: boolean;
  insertionAp: number;
  insertionPe: number;
}

export interface AutotuneOutcome {
  best: TuneResult | null;
  results: TuneResult[];
}

export function runAscent(cfg: MissionConfig, kickAngle: number, maxTurnRate = cfg.guidance.maxTurnRate, loftAltitude = cfg.guidance.loftAltitude, maxTime = 2400): TuneResult {
  const c: MissionConfig = { ...cfg, guidance: { ...cfg.guidance, kickAngle, maxTurnRate, loftAltitude }, failure: { mode: 'none', time: 0, stage: 0 } };
  const sim = new Simulation(c, { headless: true });
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
  const dv = parking ? Number(parking.params?.dv ?? 0) : 0;
  // a "clean" insertion is close to the planned orbit (perigee not sagging, apoapsis not lofted away);
  // a lofted/sagging one still counts as reaching orbit but is only chosen when nothing cleaner exists
  const hIns = sim.plan.insertionAltitude / 1000, haIns = sim.plan.insertionApoapsis / 1000;
  const pe = parking ? Number(parking.params?.pe ?? -1) : -1;
  const ap = parking ? Number(parking.params?.ap ?? 0) : 0;
  const insertionOk = pe >= hIns - 35 && ap <= haIns + Math.max(300, 0.6 * haIns) && dv > 0;
  const success = !!parking && s.status !== 'failed';
  const lastFail = [...sim.events].reverse().find((e) => e.severity === 'fail' || e.severity === 'warn');
  let reason = success ? (insertionOk ? 'ok' : `lofted:${ap}x${pe}`) : `${s.note}:${lastFail?.key ?? ''}`;
  if (success && s.maxQ.value > sim.vehicleSpec.maxQ) reason = 'maxQ';
  if (success && minAltCL < 80e3) reason = 'dip';
  return {
    kickAngle, maxTurnRate, loftAltitude, success: success && (reason === 'ok' || reason.startsWith('lofted')), insertionOk, insertionAp: ap, insertionPe: pe,
    dvRemaining: dv, maxQ: s.maxQ.value, minAltitudeClosedLoop: minAltCL, tInsertion: parking ? parking.t : -1, reason,
  };
}

export const DEFAULT_KICKS = [2, 3, 4, 6, 8, 11, 15];
export const DEFAULT_RATES = [0.3, 0.45, 0.6, 0.8];

export const DEFAULT_LOFTS = [0, 40e3, 80e3, 130e3];

/** Whether the vehicle hands off to an upper stage too weak to hold altitude (needs a loft search). */
export function needsLoftSearch(cfg: MissionConfig): boolean {
  const spec = vehicleById(cfg.vehicleId);
  const sat = satelliteById(cfg.satelliteId);
  const vm = new VehicleModel(spec, cfg.payloadMassOverride ?? sat.mass, cfg.boosterRecovery, sat);
  const a = vm.nextStageAccel(false);
  return a > 0 && a < 4.8;
}

/** Best candidate: the largest remaining Δv among clean insertions, else among all successful ones. */
export function pickBest(ok: TuneResult[]): TuneResult | null {
  if (ok.length === 0) return null;
  const clean = ok.filter((r) => r.insertionOk);
  return (clean.length ? clean : ok).reduce((a, b) => (b.dvRemaining > a.dvRemaining ? b : a));
}

export function autotune(cfg: MissionConfig, candidates: number[] = DEFAULT_KICKS, rates: number[] = DEFAULT_RATES, lofts?: number[]): AutotuneOutcome {
  const results: TuneResult[] = [];
  const loftList = lofts ?? (needsLoftSearch(cfg) ? DEFAULT_LOFTS : [0]);
  for (const loft of loftList) for (const rate of rates) for (const k of candidates) results.push(runAscent(cfg, k, rate, loft));
  const ok = results.filter((r) => r.success);
  let best: TuneResult | null = null;
  if (ok.length > 0) {
    best = pickBest(ok);
  } else {
    // nothing succeeded: prefer the candidate that got closest (highest remaining dv, then lowest maxQ)
    const partial = results.filter((r) => r.reason === 'maxQ' || r.reason === 'dip');
    if (partial.length > 0) best = partial.reduce((a, b) => (b.dvRemaining > a.dvRemaining ? b : a));
  }
  return { best, results };
}
