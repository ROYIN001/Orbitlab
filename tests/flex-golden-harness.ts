/**
 * Fingerprints of six-DOF flights, recorded before slosh, bending and the
 * notch filter existed (roadmap P05, commit 7834edd). Those options are off by
 * default, and off they must leave every flight exactly as it was: every
 * second of state and six-DOF telemetry, the recorded telemetry and the event
 * log hash to the same value, bit for bit.
 */
import { createHash } from 'node:crypto';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import type { DynamicsConfig } from '../src/types';
import { LAUNCH_TIME } from './fleet-harness';

export const GOLDEN_FLIGHTS = [
  { vehicle: 'falcon9', site: 'cape', orbit: 'leo' },
  { vehicle: 'soyuz21a', site: 'baikonur', orbit: 'leo' },
  { vehicle: 'angaraa5', site: 'plesetsk', orbit: 'leo' },
] as const;

export function flightFingerprint(flight: (typeof GOLDEN_FLIGHTS)[number], until: number,
  dynamics: DynamicsConfig = { model: 'sixDof', wind: 'crosswind', seed: 20260919 }): string {
  const sim = new Simulation({ vehicleId: flight.vehicle, satelliteId: 'cubesats', siteId: flight.site, orbit: orbitById(flight.orbit),
    launchTime: LAUNCH_TIME, guidance: guidanceForVehicle(vehicleById(flight.vehicle), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, dynamics }, { headless: true });
  const hash = createHash('sha256');
  let next = -10;
  while (!sim.done && sim.state.t < until) {
    sim.step(sim.suggestedDt());
    if (sim.state.t >= next) { hash.update(JSON.stringify([sim.state.t, sim.state.r, sim.state.v, sim.state.rigid])); next += 1; }
  }
  hash.update(JSON.stringify(sim.telemetry));
  hash.update(JSON.stringify(sim.events.map((e) => [e.key, e.t])));
  return hash.digest('hex').slice(0, 16);
}

/** Recorded at 7834edd with crosswind: the first 160 s, and the whole mission. */
export const GOLDEN: Record<(typeof GOLDEN_FLIGHTS)[number]['vehicle'], { first160s: string; mission: string }> = {
  falcon9: { first160s: '6bbf5b89a9e2ef67', mission: '79335bdea3cbfea9' },
  soyuz21a: { first160s: 'cdfd42e224a80772', mission: 'a5d8d75d0bd685c9' },
  angaraa5: { first160s: 'c3022008e3f8d476', mission: '08a8c33302e646d6' },
};
