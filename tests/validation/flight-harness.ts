/**
 * Flies a reference mission and reads the simulator's numbers off it, for the
 * comparisons with published flight data in `tests/validation/*.test.ts` and
 * `tests/heavy/validation-*.test.ts` (docs/VALIDATION.md).
 *
 * Nothing here decides whether the model is right: this file only builds the
 * mission as it was flown (vehicle, site, payload, orbit, recovery) and
 * samples the resulting trajectory at the times and events the reference
 * gives. The tolerances and the verdicts live in `reference-data.ts` and the
 * tests, so that the instrument and the judgement stay separate.
 */
import { Simulation } from '../../src/physics/simulation';
import { DEFAULT_FAILURE, guidanceForVehicle } from '../../src/physics/defaults';
import { orbitById } from '../../src/data/orbits';
import { vehicleById } from '../../src/data/vehicles';
import { defaultDynamics } from '../../src/physics/rigid/config';
import type { OrbitSpec, RecoveryPlan } from '../../src/types';
import type { SimEvent, TelemetrySample } from '../../src/physics/sim/types';

/** The mission as the simulator is asked to fly it. */
export interface SimMission {
  vehicleId: string;
  siteId: string;
  satelliteId: string;
  orbitId: string;
  orbit?: Partial<OrbitSpec>;
  payloadMass: number;
  recoveryPlan?: RecoveryPlan;
  /** A date in a launch window: only the orbit's plane depends on it. */
  launchTime: Date;
}

export type ModelKind = 'pointMass' | 'sixDof';

export interface FlownMission {
  model: ModelKind;
  failed: boolean;
  /** time of the first occurrence of each event key, s */
  eventTime: (key: string) => number | undefined;
  /** time of the first occurrence of an event key strictly after t, s */
  eventTimeAfter: (key: string, t: number) => number | undefined;
  /** every event, in order */
  events: readonly SimEvent[];
  /** linear interpolation of the telemetry at time t, s */
  at: (t: number) => TelemetrySample;
  /** the last sample flown */
  last: TelemetrySample;
}

/**
 * Flies `m` until the first upper-stage cut-off (the end of the powered ascent
 * a webcast shows) plus `after` seconds, or until `until` seconds of flight.
 */
export function flyMission(m: SimMission, model: ModelKind, opts: { until?: number; after?: number } = {}): FlownMission {
  const until = opts.until ?? 1200;
  const after = opts.after ?? 2;
  const dynamics = { ...defaultDynamics(m.vehicleId), model };
  const sim = new Simulation({
    vehicleId: m.vehicleId, satelliteId: m.satelliteId, siteId: m.siteId,
    orbit: { ...orbitById(m.orbitId), ...m.orbit },
    launchTime: m.launchTime, payloadMassOverride: m.payloadMass,
    guidance: guidanceForVehicle(vehicleById(m.vehicleId), undefined, model), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: !!m.recoveryPlan, recoveryPlan: m.recoveryPlan, dynamics,
  }, { headless: true });
  let secoAt: number | undefined;
  let guard = 0;
  while (!sim.done && !sim.isFailed() && sim.state.t < until && guard++ < 1_000_000) {
    sim.step(sim.suggestedDt());
    if (secoAt === undefined && sim.events.some((e) => e.key === 'evt.seco')) secoAt = sim.state.t;
    if (secoAt !== undefined && sim.state.t >= secoAt + after) break;
  }
  const tel = sim.telemetry.slice();
  const events = sim.events.slice();
  const at = (t: number): TelemetrySample => {
    if (tel.length === 0) throw new Error('no telemetry was recorded');
    if (t <= tel[0].t) return tel[0];
    let lo = 0;
    let hi = tel.length - 1;
    if (t >= tel[hi].t) return tel[hi];
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (tel[mid].t <= t) lo = mid; else hi = mid;
    }
    const a = tel[lo];
    const b = tel[hi];
    const f = (t - a.t) / (b.t - a.t);
    const lerp = (x: number, y: number) => x + (y - x) * f;
    return { ...a, t, alt: lerp(a.alt, b.alt), vInertial: lerp(a.vInertial, b.vInertial), vAir: lerp(a.vAir, b.vAir), q: lerp(a.q, b.q), mass: lerp(a.mass, b.mass) };
  };
  return {
    model, failed: sim.isFailed(),
    eventTime: (key) => events.find((e) => e.key === key)?.t,
    eventTimeAfter: (key, t) => events.find((e) => e.key === key && e.t > t)?.t,
    events,
    at, last: tel[tel.length - 1],
  };
}
