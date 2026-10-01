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
 * programme takes a 6° kick and closes the loop at T+140 s, holding the launch
 * azimuth until then (src/physics/guidance.ts), a change to the vehicle's
 * programme, not to the options. The earlier values were '839f89154a81d07c' /
 * '1edcbd927a140a70'. And again for Soyuz-2 on its real flight (2026-10-01,
 * docs/VALIDATION.md §3): published engines and loads, commanded cut-offs, the
 * escape tower and the stored pitch programme, all the vehicle's. The PHY-01
 * values were '3ec643f99d65806d' / '912a1b0ea08f3b3e'. Re-recorded for Soyuz-2's
 * hot staging and the cargo payload section's 3.0 m fairing (2026-10-01,
 * second pass); they were 'c98116939e7b6678' / 'd4074ac66128d02a' (the mission
 * hash, flown to orbit through the hot staging, re-recorded with it after the
 * merge with main).
 *
 * Angara-A5's were re-recorded when its fairing took Khrunichev's jettison
 * rule (`fairing.sepAfterIgnition`) and its six-DOF ascent a kick of 8°
 * (docs/VALIDATION.md F14), by 7834edd itself with only those two ported in;
 * the current code flies the same hashes. They were 'c3022008e3f8d476' /
 * '08a8c33302e646d6'.
 */
export const GOLDEN: Record<(typeof GOLDEN_FLIGHTS)[number]['vehicle'], { first160s: string; mission: string }> = {
  falcon9: { first160s: '3f48e9ee37213f9e', mission: '7fb4ebc11cd17b4f' },
  soyuz21a: { first160s: '50072d4def956341', mission: 'd099a931012c9dfe' },
  angaraa5: { first160s: '98ef622ae14d11eb', mission: 'bf2b7d5589b88818' },
};
