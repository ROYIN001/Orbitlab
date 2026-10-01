/**
 * Roadmap D01: the fleet's point-mass flights, recorded before the parts
 * catalogue.
 *
 * tests/d01-vehicles-identity.test.ts proves the re-expressed specs equal the
 * old literals; this flies them. Each row is a fleet case from
 * `allCases()` (tests/fleet-harness.ts), flown by `flyCase` exactly as the
 * fleet matrix flies it, and fingerprinted as the six-DOF goldens are
 * (`FingerprintSampler`, tests/flex-golden-harness.ts): the state `[t, r, v]`
 * once per second from T−10 s, then the recorded telemetry and the event log
 * `[key, t]`, hashed with SHA-256 (first 16 hex digits). The hashes also catch
 * any physics file the catalogue work touches by accident.
 *
 * The rows: every vehicle's `leo` 50 % row, the kick-stage and restart rows
 * `protonm/gto/50` (Briz-M's multi-burn transfer), `soyuz21b/gto/50`
 * (Fregat), `ariane64/gto/50` (Vinci relight), `vegac/sso/50` (AVUM+) and
 * `pslvxl/sso/50` (PS4, air-lit strap-ons) — all five exist in the matrix as
 * named — and one row more, `angaraa5/leo/25`: Angara-A5's `leo/50` is a known
 * break-up at T+179 s (`BEYOND_CAPABILITY` in the harness), before its URM-2
 * or Briz-M ever light, and the 25 % row flies both to orbit. `protonm/leo/50`
 * is also a known break-up, at T+1 038 s, after all four stages have fired.
 * A failed flight is as deterministic as a good one, so those rows are kept.
 *
 * RECORDED at eedd035, the pre-D01 HEAD, before src/data/vehicles.ts was
 * touched, and committed with this file in "D01: the fleet's specs and flights
 * recorded before the catalogue". They are never re-recorded by the D01 work:
 * a mismatch means a built-in flight changed. 27 flights, about 5 s in all on
 * the machine that recorded them (4.8 s of flying, measured).
 *
 * Re-recorded once, for a change made on purpose elsewhere: main's F11
 * (2026-09-28) gave Falcon Heavy Falcon 9 Block 5's published first-stage
 * masses and a max-Q bucket, so `falconheavy/leo/50` flies a different vehicle
 * (it was 'ef9bbec0786e0558'). Its spec equals main's literal value for value
 * (tests/d01-vehicles-identity.test.ts), and the other 26 rows, unchanged,
 * show the point-mass physics is main's, so the new hash is main's flight.
 *
 * And a second time, for F14 (2026-09-28): Proton-M's published stage
 * propellant loads and Proton-M's and Angara-A5's fairing jettison rule, with
 * the insertion floor now applied during the ascent. `protonm/leo/50` (was
 * '76fae19e6ec959b6'; it now ends as an abandoned insertion instead of a
 * break-up), `protonm/gto/50` (was 'bb6e24576d031e4c') and `angaraa5/leo/25`
 * (was '1ee1e0256adecd40') fly different vehicles. The three new hashes were
 * flown both from the literal `VEHICLES` of the branch that made the change
 * (c2aabb4, before it met the catalogue) and from the catalogue after the
 * merge, and agree; the other 24 rows are unchanged.
 *
 * Re-recorded a second time for Soyuz-2 on its real flight (2026-10-01,
 * docs/VALIDATION.md §3): `soyuz21a/leo/50`, `soyuz21b/leo/50` and
 * `soyuz21b/gto/50` fly the published engines and loads, the commanded
 * cut-offs and the stored pitch programme (they were 'deef4d6e49a74ea0',
 * '487ada8595699387' and '62c11ccc40646589'). The other 24 rows, unchanged,
 * show that the new mechanisms change no other vehicle.
 *
 * Re-recorded a third time for Soyuz-2's hot staging and Soyuz-2.1a's cargo
 * payload section (2026-10-01, docs/VALIDATION.md §3, second pass):
 * `soyuz21a/leo/50`, `soyuz21b/leo/50` and `soyuz21b/gto/50` (they were
 * 'd90cb1ce6c496984', '4983ea1c31ef47bc' and 'd1f368b68b92d7bf'). The other 24
 * rows, unchanged, show that the hot staging changes no other vehicle.
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES } from '../src/data/vehicles';
import { allCases, caseKey, flyCase } from './fleet-harness';
import { FingerprintSampler } from './flex-golden-harness';

export const D01_FINGERPRINTS: Readonly<Record<string, string>> = {
  'soyuz21a/leo/50': '4b1f0b7f49f9651a',
  'soyuz21b/leo/50': '7973a02dec1cf395',
  'protonm/leo/50': '46ca21856e1a5d25',
  'angaraa5/leo/50': '7cea61f34555f892',
  'falcon9/leo/50': '8504537bbd7ef7e5',
  'falconheavy/leo/50': '9d7255f795d6d88b',
  'atlasv551/leo/50': '0d1e6478571ba55a',
  'vulcan/leo/50': '4d91d8ca27fb9268',
  'ariane64/leo/50': '0c847c54216a4e9e',
  'vegac/leo/50': '90be7919be291d5a',
  'longmarch2d/leo/50': 'b5245d6120455552',
  'longmarch3be/leo/50': '7f72f2cf338e447f',
  'h2a202/leo/50': '6cc53db4bd700dd2',
  'longmarch5/leo/50': '872f594cb4817a02',
  'h3/leo/50': '19f258b3c7260121',
  'pslvxl/leo/50': '230c580197fb8478',
  'electron/leo/50': '05d6bef5f0121eee',
  'starship/leo/50': '2eb2b5a1a855178c',
  'sputnik8k71ps/leo/50': '78195a7baaf7e849',
  'vostok8k72k/leo/50': '4e37c2c9a626ebd9',
  'saturnv/leo/50': '6216e2d36a22f147',
  'protonm/gto/50': '904a8a631b0b7e7d',
  'soyuz21b/gto/50': '9f4b1fceeea35057',
  'ariane64/gto/50': '5f39c0051d6adb58',
  'vegac/sso/50': 'c6c598e3d8ea5910',
  'pslvxl/sso/50': '4a10da20085b3a09',
  'angaraa5/leo/25': '1fd2f80a8d65c52e',
};

const CASES = allCases();

/** The fingerprint of one fleet case, flown point-mass through `flyCase`. */
async function caseFingerprint(key: string): Promise<string> {
  const c = CASES.find((x) => caseKey(x) === key);
  if (!c) throw new Error(`no fleet case ${key}`);
  const sampler = new FingerprintSampler((sim) => [sim.state.t, sim.state.r, sim.state.v]);
  const sim = flyCase(c, 'cubesats', undefined, (s) => sampler.observe(s));
  return sampler.digest(sim);
}

describe('D01: the fleet flies as it did before the parts catalogue', () => {
  it('records a leo/50 row for every vehicle, and every recorded row is a fleet case', () => {
    for (const v of VEHICLES) expect(D01_FINGERPRINTS).toHaveProperty([`${v.id}/leo/50`]);
    const keys = new Set(CASES.map(caseKey));
    expect(Object.keys(D01_FINGERPRINTS).filter((k) => !keys.has(k))).toEqual([]);
  });

  it.each(Object.keys(D01_FINGERPRINTS))('%s', async (key) => {
    expect(await caseFingerprint(key)).toBe(D01_FINGERPRINTS[key]);
  }, 60_000);
});
