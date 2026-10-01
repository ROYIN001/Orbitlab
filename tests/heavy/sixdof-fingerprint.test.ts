/**
 * Six-DOF fingerprints of every catalogue vehicle, the guard for the six-DOF
 * fixes custom vehicles need before roadmap D03 can offer six-DOF as
 * experimental (docs/ROADMAP-PART2-3.md, D03): multi-engine thrust for stages
 * with no layout of their own, the aero-table cache, solid grain and RCS for a
 * new stage id. Those fixes must reach only branches no catalogue stage
 * reaches, so each of the 21 vehicles must fly exactly as it did before them.
 *
 * Each vehicle's `leo` row at 50 % of its rated payload (tests/fleet-harness.ts,
 * `allCases`), flown as a rigid body in the crosswind of the flex goldens for
 * its first 160 s: lift-off, max-Q, and on most vehicles staging or strap-on
 * separation. The hash is `missionFingerprint`'s (tests/flex-golden-harness.ts):
 * every second of state and rigid-body telemetry, the recorded telemetry and
 * the event log, bit for bit.
 *
 * Recorded before any of those fixes, at the commit that added this file, and
 * never re-recorded by them. A vehicle whose data change on purpose later is
 * re-recorded with its reason stated here, as `GOLDEN` is:
 * - falconheavy, after main's F11 (2026-09-28) gave its side boosters and core
 *   Falcon 9 Block 5's published first-stage masses and a max-Q bucket; it was
 *   'dd5364877d7d1b7f'. The spec equals main's literal value for value
 *   (tests/d01-vehicles-identity.test.ts) and the other 20 are unchanged.
 * - protonm and angaraa5, after F14 (2026-09-28): Proton-M's published stage
 *   propellant loads, and Angara-A5's six-DOF kick of 8°; they were
 *   '2844117a23563142' and '1e14a01434e78edb'. Both were flown from the
 *   literal fleet of the branch that made the change (c2aabb4 with the kick)
 *   and from the catalogue, and agree; the other 19 are unchanged.
 * - soyuz21a, after audit PHY-01 (2026-10-01, docs/VALIDATION.md §3): its
 *   six-DOF programme takes a 6° kick and closes the loop at T+140 s, holding
 *   the launch azimuth until then; it was '6cffff9a7d35bbd0'. Only soyuz21a's
 *   `guidanceDefaultsSixDof` changed, and the azimuth hold reaches no other
 *   catalogue vehicle (the other 20 are unchanged).
 * - soyuz21a and soyuz21b, for Soyuz-2 on its real flight (2026-10-01,
 *   docs/VALIDATION.md §3): published engines and loads, the commanded
 *   sequence and the stored pitch programme; they were '2c9438cf9d3df949' and
 *   'bc74fbe1899c4e51'. The other 19 are unchanged.
 *
 * Heavy suite only (`npm run test:heavy`): 21 six-DOF flights of 160 s.
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES, vehicleById } from '../../src/data/vehicles';
import { orbitById } from '../../src/data/orbits';
import { siteById } from '../../src/data/sites';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../../src/physics/defaults';
import { launchWindows } from '../../src/physics/mission';
import type { DynamicsConfig, MissionConfig } from '../../src/types';
import { allCases, caseKey, LAUNCH_TIME, type FleetCase } from '../fleet-harness';
import { missionFingerprint } from '../flex-golden-harness';

const DYNAMICS: DynamicsConfig = { model: 'sixDof', wind: 'crosswind', seed: 20260919 };
const ROWS = allCases().filter((c) => c.orbit === 'leo' && c.percent === 50);

/** The fleet row's mission, as `flyCase` builds it, flown in six-DOF. */
function sixDofMission(c: FleetCase): MissionConfig {
  const orbit = orbitById(c.orbit);
  const window = orbit.raanMode === 'free' ? undefined : launchWindows(orbit, siteById(c.site), LAUNCH_TIME, 1)[0];
  return { vehicleId: c.vehicle, satelliteId: 'cubesats', siteId: c.site, orbit, launchTime: window?.time ?? LAUNCH_TIME,
    guidance: guidanceForVehicle(vehicleById(c.vehicle), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: c.mass, dynamics: DYNAMICS };
}

const FINGERPRINTS: Readonly<Record<string, string>> = {
  soyuz21a: 'c59c89cad663d74b',
  soyuz21b: '644b71375fa52e3d',
  protonm: '336045ed763a8b3e',
  angaraa5: '4d4263d76a86d994',
  falcon9: '4e7814725cdd4e3b',
  falconheavy: 'd54a7e829a77ee6a',
  atlasv551: '24fc1e3c19a18c03',
  vulcan: '1b2c16f43de54bb5',
  ariane64: 'e521b86e4a051606',
  vegac: '0722edddb57aba60',
  longmarch2d: '5af7969a7628260f',
  longmarch3be: '14358272e7fd7e78',
  h2a202: 'e731ac41a0d095dc',
  longmarch5: 'ae476b10f10daca4',
  h3: '880630716ae91a1c',
  pslvxl: '91ecd642a27e2a54',
  electron: '243da45d37772709',
  starship: 'a862fc906a084284',
  sputnik8k71ps: '6024ac904f0a2720',
  vostok8k72k: 'ffbd505b985e9895',
  saturnv: 'f21081ad198eff52',
};

describe('six-DOF fingerprints of the catalogue', () => {
  it('has one row for every catalogue vehicle', () => {
    expect(ROWS.map((c) => c.vehicle)).toEqual(VEHICLES.map((v) => v.id));
    expect(Object.keys(FINGERPRINTS).sort()).toEqual(VEHICLES.map((v) => v.id).sort());
  });

  it.each(ROWS.map((c) => [caseKey(c), c] as const))('%s flies its first 160 s in six-DOF exactly as recorded', async (_key, c) => {
    expect(await missionFingerprint(sixDofMission(c), 160)).toBe(FINGERPRINTS[c.vehicle]);
  }, 900_000);
});
