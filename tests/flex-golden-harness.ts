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
import type { DynamicsConfig, MissionConfig } from '../src/types';
import { LAUNCH_TIME } from './fleet-harness';

export const GOLDEN_FLIGHTS = [
  { vehicle: 'falcon9', site: 'cape', orbit: 'leo' },
  { vehicle: 'soyuz21a', site: 'baikonur', orbit: 'leo' },
  { vehicle: 'angaraa5', site: 'plesetsk', orbit: 'leo' },
] as const;

/**
 * The fingerprint of a flight as it is flown: call `observe` after every step,
 * then `digest` once the flight is over. From T−10 s it keeps one sample each
 * time the clock passes the next whole second (every step, while steps are
 * longer than a second), then the recorded telemetry and the event log
 * `[key, t]`, and hashes the concatenation with SHA-256, first 16 hex digits.
 * `flightFingerprint` below samples the six-DOF state with it; the D01 fleet
 * fingerprints (tests/d01-fleet-fingerprint.test.ts) sample `[t, r, v]` of a
 * point-mass fleet case through `flyCase`.
 */
export class FingerprintSampler {
  private readonly parts: string[] = [];
  private next = -10;
  constructor(private readonly sample: (sim: Simulation) => unknown,
    private readonly replacer?: (key: string, value: unknown) => unknown) {}

  observe(sim: Simulation): void {
    if (sim.state.t >= this.next) { this.parts.push(JSON.stringify(this.sample(sim), this.replacer)); this.next += 1; }
  }

  async digest(sim: Simulation): Promise<string> {
    this.parts.push(JSON.stringify(sim.telemetry, this.replacer));
    this.parts.push(JSON.stringify(sim.events.map((e) => [e.key, e.t])));
    // SHA-256 of the concatenation, as recorded.
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(this.parts.join('')));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }
}

export async function flightFingerprint(flight: (typeof GOLDEN_FLIGHTS)[number], until: number,
  dynamics: DynamicsConfig = { model: 'sixDof', wind: 'crosswind', seed: 20260919 }): Promise<string> {
  return missionFingerprint({ vehicleId: flight.vehicle, satelliteId: 'cubesats', siteId: flight.site, orbit: orbitById(flight.orbit),
    launchTime: LAUNCH_TIME, guidance: guidanceForVehicle(vehicleById(flight.vehicle), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, dynamics }, until);
}

/**
 * The same fingerprint for any mission: every second of state and six-DOF
 * telemetry up to `until`, the recorded telemetry and the event log. The
 * catalogue's six-DOF fingerprints (tests/heavy/sixdof-fingerprint.test.ts,
 * the guard for the custom-vehicle fixes before roadmap D03) fly their fleet
 * rows through it.
 */
export async function missionFingerprint(cfg: MissionConfig, until: number): Promise<string> {
  const sim = new Simulation(cfg, { headless: true });
  const withoutLoop = (key: string, value: unknown) => (key === 'attitudeLoop' || key === 'linearModel' ? undefined : value);
  const sampler = new FingerprintSampler((s) => [s.state.t, s.state.r, s.state.v, s.state.rigid], withoutLoop);
  while (!sim.done && sim.state.t < until) {
    sim.step(sim.suggestedDt());
    sampler.observe(sim);
  }
  return sampler.digest(sim);
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
 * They were re-recorded again for audit PHY-01 (2026-10-01): its six-DOF
 * programme takes a 6° kick and closes the loop at T+140 s, a change to the
 * vehicle's data, not to the options. The earlier values were
 * '839f89154a81d07c' / '1edcbd927a140a70'.
 */
export const GOLDEN: Record<(typeof GOLDEN_FLIGHTS)[number]['vehicle'], { first160s: string; mission: string }> = {
  falcon9: { first160s: '3f48e9ee37213f9e', mission: '7fb4ebc11cd17b4f' },
  soyuz21a: { first160s: '48fa26cc77ca2900', mission: 'be8b6db2b3ee3e26' },
  angaraa5: { first160s: 'c3022008e3f8d476', mission: '08a8c33302e646d6' },
};
