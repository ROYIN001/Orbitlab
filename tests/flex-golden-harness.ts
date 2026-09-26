/**
 * Fingerprints of six-DOF flights, recorded before slosh, bending and the
 * notch filter existed (roadmap P05, commit 7834edd). Those options are off by
 * default, and off they must leave every flight exactly as it was: every
 * second of state and six-DOF telemetry, the recorded telemetry and the event
 * log hash to the same value, bit for bit.
 *
 * The attitude loop's record (roadmap G03, `attitudeLoop`) and its
 * linearisation (G04, `linearModel`) came later and are left out of the
 * fingerprint: they only read the loop, so with them left out the flight must
 * still hash as it did at 7834edd.
 */
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

export async function flightFingerprint(flight: (typeof GOLDEN_FLIGHTS)[number], until: number,
  dynamics: DynamicsConfig = { model: 'sixDof', wind: 'crosswind', seed: 20260919 }): Promise<string> {
  const sim = new Simulation({ vehicleId: flight.vehicle, satelliteId: 'cubesats', siteId: flight.site, orbit: orbitById(flight.orbit),
    launchTime: LAUNCH_TIME, guidance: guidanceForVehicle(vehicleById(flight.vehicle), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, dynamics }, { headless: true });
  const parts: string[] = [];
  const withoutLoop = (key: string, value: unknown) => (key === 'attitudeLoop' || key === 'linearModel' ? undefined : value);
  let next = -10;
  while (!sim.done && sim.state.t < until) {
    sim.step(sim.suggestedDt());
    if (sim.state.t >= next) { parts.push(JSON.stringify([sim.state.t, sim.state.r, sim.state.v, sim.state.rigid], withoutLoop)); next += 1; }
  }
  parts.push(JSON.stringify(sim.telemetry, withoutLoop));
  parts.push(JSON.stringify(sim.events.map((e) => [e.key, e.t])));
  // SHA-256 of the concatenation, as recorded.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts.join('')));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/**
 * Recorded at 7834edd with crosswind: the first 160 s, and the whole mission.
 * Falcon 9's were re-recorded when its first stage took the published masses
 * (docs/VALIDATION.md, F1), and again when its six-DOF pitch programme was
 * fitted to webcast telemetry (F5): each time by 7834edd itself with only
 * those data changed, so they still pin the flight as it was before P05. The
 * earlier values were '6bbf5b89a9e2ef67' / '79335bdea3cbfea9' and
 * 'a2a7fd3be9557223' / 'dcc841438202bf56'. Soyuz-2.1a's were re-recorded
 * when its fairing became the 4.11 × 11.43 m unit with its own adapter
 * (owner's figures, 2026-09-25): a change to the vehicle, not to the options,
 * and with every option given and off it still flies the same 160 s bit for bit.
 */
export const GOLDEN: Record<(typeof GOLDEN_FLIGHTS)[number]['vehicle'], { first160s: string; mission: string }> = {
  falcon9: { first160s: '3f48e9ee37213f9e', mission: '7fb4ebc11cd17b4f' },
  soyuz21a: { first160s: '839f89154a81d07c', mission: '1edcbd927a140a70' },
  angaraa5: { first160s: 'c3022008e3f8d476', mission: '08a8c33302e646d6' },
};
