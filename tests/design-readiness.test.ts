/**
 * The flight readiness review (roadmap D04), src/design/readiness.ts.
 *
 * Two claims. For a catalogue vehicle the review gives the setup panel's own
 * verdict — checked against the composition tests/panel-verdict.test.ts
 * flies its fleet agreement with (`verdictFor`, restated below word for word
 * so the two files keep saying the same thing independently), on a set of
 * catalogue rows chosen to take every branch the verdict has in the fleet.
 * For a vehicle of one's own it catches what the panel's verdict cannot: a
 * design that never leaves the pad, whatever its typed rating says, and a
 * rating typed higher than the vehicle can lift, which would otherwise keep
 * the probe from flying.
 */
import { describe, expect, it } from 'vitest';
import { readiness, type ReadinessMission } from '../src/design/readiness';
import { marginalMission, missionCapability, missionVerdict, orbitClassOf, ratedPayload, type VerdictInput } from '../src/ui/panel';
import { siteById } from '../src/data/sites';
import { vehicleById } from '../src/data/vehicles';
import { satelliteById } from '../src/data/satellites';
import { orbitById } from '../src/data/orbits';
import { planMission, resolveTarget, launchWindows } from '../src/physics/mission';
import { probeInsertion } from '../src/physics/autotune';
import { guidanceForVehicle, DEFAULT_FAILURE } from '../src/physics/defaults';
import { RAD } from '../src/physics/constants';
import { allCases, caseKey, LAUNCH_TIME } from './fleet-harness';
import { copyOf } from './custom-vehicle-harness';
import type { MissionConfig, VehicleSpec } from '../src/types';

/** tests/panel-verdict.test.ts's `verdictFor`, as written there (the panel's probe gate spelled out). */
function verdictFor(vehicleId: string, siteId: string, orbitId: string, satelliteId: string, mass?: number, extra: Partial<VerdictInput> = {}) {
  const spec = vehicleById(vehicleId);
  const site = siteById(siteId);
  const orbit = orbitById(orbitId);
  const satellite = satelliteById(satelliteId);
  const payloadMass = mass ?? satellite.mass;
  const cfg: MissionConfig = {
    vehicleId, satelliteId, siteId, orbit,
    launchTime: orbit.raanMode === 'free' ? LAUNCH_TIME : (launchWindows(orbit, site, LAUNCH_TIME, 1)[0]?.time ?? LAUNCH_TIME),
    guidance: guidanceForVehicle(spec), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: payloadMass,
  };
  const plan = planMission(cfg, site, spec);
  const capability = missionCapability(spec, satellite, payloadMass, plan);
  const { cap } = ratedPayload(spec, orbitClassOf(orbit));
  const marginal = capability.ascentShortfall > 0 || (cap > 0 && payloadMass >= cap * 0.9);
  const insertion = marginal ? probeInsertion(cfg) : null;
  return {
    plan,
    insertion,
    verdict: missionVerdict({
      spec, site, orbit, satellite, payloadMass,
      inclinationDeg: resolveTarget(orbit, site, LAUNCH_TIME).inclination * RAD,
      plan, insertion, failureMode: 'none', siteReassigned: false, ...extra,
    }),
  };
}

/** The same mission for the review: the vehicle apart, everything else as `verdictFor` builds it. */
function missionFor(spec: VehicleSpec, siteId: string, orbitId: string, satelliteId: string, mass?: number): ReadinessMission {
  const site = siteById(siteId), orbit = orbitById(orbitId), satellite = satelliteById(satelliteId);
  return {
    satelliteId, siteId, orbit,
    launchTime: orbit.raanMode === 'free' ? LAUNCH_TIME : (launchWindows(orbit, site, LAUNCH_TIME, 1)[0]?.time ?? LAUNCH_TIME),
    guidance: guidanceForVehicle(spec), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: mass ?? satellite.mass,
  };
}

describe('readiness review · the catalogue gets the setup panel’s verdict', () => {
  /**
   * Every vehicle's `leo` row at half its rating (the fleet matrix's own rows
   * and masses), and the rows tests/panel-verdict.test.ts names for each
   * branch: the range-safety corridor, a plane change the stack cannot
   * afford, a stack with no restart, the crew ship on Proton-M either side of
   * what its Briz-M can make up, the tight default mission, and the one row
   * the verdict states it cannot see (`pslvxl/gto/50`). The verdict and the
   * probe must be identical, not close: it is the same functions on the same
   * inputs.
   *
   * Three rows added in review, for the branches the set did not reach: a
   * payload over the rating, an orbit class with no rating (Soyuz-2.1a has no
   * GTO figure), and a plane the site cannot launch into directly (GEO from
   * the Cape). Not reached, and not reachable from the catalogue with this
   * composition: `beyondCapability` (no single-shot catalogue stack is short
   * of the orbit its plan aims at — the plan closes at 200 km instead, which
   * is `noRestart`) and `siteChanged` (an input the panel sets, false here).
   */
  it('gives verdictFor’s verdict, probe and all, on a set of rows that takes every branch the catalogue reaches', () => {
    const byKey = new Map(allCases().map((c) => [caseKey(c), c]));
    const rows: [string, string, string, string, number | undefined][] = [
      ...[...byKey.values()].filter((c) => c.orbit === 'leo' && c.percent === 50).map((c) => [c.vehicle, c.site, c.orbit, 'cubesats', c.mass] as [string, string, string, string, number]),
      ['starship', 'starbase', 'iss', 'cubesats', undefined],
      ['longmarch3be', 'xichang', 'sso', 'cubesats', undefined],
      ['soyuz21a', 'baikonur', 'iss', 'crew', undefined],
      ['soyuz21a', 'plesetsk', 'iss', 'crew', undefined],
      ['longmarch2d', 'jiuquan', 'sso', 'cubesats', undefined],
      ['longmarch2d', 'jiuquan', 'sso', 'earthObs', 650],
      ['protonm', 'baikonur', 'iss', 'crew', 7150],
      ['protonm', 'baikonur', 'iss', 'crew', 5750],
      ['falcon9', 'cape', 'iss', 'cubesats', 7800],
      ['falcon9', 'cape', 'leo', 'cubesats', byKey.get('falcon9/leo/90')!.mass],
      ['electron', 'mahia', 'sso', 'cubesats', 100],
      ['pslvxl', 'sriharikota', 'gto', 'cubesats', byKey.get('pslvxl/gto/50')!.mass],
      // added in review (see above)
      ['falcon9', 'cape', 'leo', 'cubesats', 30000],
      ['soyuz21a', 'baikonur', 'gto', 'cubesats', 1000],
      ['falcon9', 'cape', 'geo', 'cubesats', 1000],
    ];
    expect(rows.length).toBe(21 + 12 + 3);
    const causes = new Set<string>();
    const started = performance.now();
    for (const [vehicle, site, orbit, satellite, mass] of rows) {
      const label = `${vehicle}/${site}/${orbit}/${satellite}/${mass ?? 'default'}`;
      const expected = verdictFor(vehicle, site, orbit, satellite, mass);
      const review = readiness(vehicleById(vehicle), missionFor(vehicleById(vehicle), site, orbit, satellite, mass));
      expect(review.verdict, label).toEqual(expected.verdict);
      expect(review.insertion, `${label}: the probe`).toEqual(expected.insertion);
      expect(review.items.find((i) => i.step === 'verdict')!.code, label).toBe(expected.verdict.cause);
      // no notices for the catalogue: its guidance is its own, and it may fly six-DOF
      expect(review.items.filter((i) => i.step === 'notice'), label).toEqual([]);
      causes.add(expected.verdict.cause);
    }
    // the set reaches these nine branches of the verdict
    expect([...causes].sort()).toEqual(['burnBudget', 'corridor', 'inclination', 'margin', 'noInsertion', 'noRating', 'noRestart',
      'overCapacity', 'ready']);
    // Runtime: 1.5 s measured for the first 33 rows (two plans and up to two
    // probes each) on a shared 4-core machine; the bound only catches a runaway.
    expect(performance.now() - started).toBeLessThan(60_000);
  }, 120_000);
});

describe('readiness review · a vehicle of one’s own', () => {
  const PAYLOAD = 5000;

  it('flies the probe for a clean copy, and says its guidance is not its own', () => {
    const spec = copyOf('falcon9');
    const review = readiness(spec, missionFor(spec, 'cape', 'leo', 'cubesats', PAYLOAD));
    expect(review.canFly).toBe(true);
    expect(review.insertion?.reachesOrbit).toBe(true);
    expect(review.items.map((i) => `${i.step}:${i.code}:${i.level}`)).toEqual([
      'capability:capability:info', 'probe:reachesOrbit:ok', 'verdict:ready:ok', 'notice:guidanceNotTuned:info',
    ]);
    expect(review.level).toBe('info');
    // the catalogue entry on the same mission: the same verdict, without the probe (not marginal)
    const entry = readiness(vehicleById('falcon9'), missionFor(vehicleById('falcon9'), 'cape', 'leo', 'cubesats', PAYLOAD));
    expect(entry.insertion).toBeNull();
    expect(entry.verdict).toEqual(review.verdict);
    // six-DOF is offered, and said to be experimental
    const rigid = readiness(spec, { ...missionFor(spec, 'cape', 'leo', 'cubesats', PAYLOAD), dynamics: { model: 'sixDof', wind: 'calm', seed: 1 } });
    expect(rigid.items.filter((i) => i.step === 'notice').map((i) => i.code)).toEqual(['sixDofExperimental', 'guidanceNotTuned']);
  });

  /**
   * Falcon 9 with its sea-level thrust halved and its rating as typed: 5 t
   * against 22.8 t is "Ready to simulate" for the panel's static verdict. The
   * review fails it twice over — the design never leaves the pad, and the
   * probe's flight ends in `evt.noLiftoff` — and will not let it fly.
   */
  it('fails a design that never leaves the pad even when the typed rating says ready', () => {
    const spec = copyOf('falcon9');
    spec.stages[0].engine.thrustSL /= 2;
    const mission = missionFor(spec, 'cape', 'leo', 'cubesats', PAYLOAD);
    // what the rating alone says: ready, and not marginal, so the panel would not probe
    const site = siteById('cape'), satellite = satelliteById('cubesats');
    const plan = planMission({ ...mission, vehicleId: spec.id, vehicleSpec: spec }, site, spec);
    expect(marginalMission(spec, satellite, PAYLOAD, plan, mission.orbit)).toBe(false);
    const typed = missionVerdict({ spec, site, orbit: mission.orbit, satellite, payloadMass: PAYLOAD,
      inclinationDeg: resolveTarget(mission.orbit, site, mission.launchTime).inclination * RAD, plan, insertion: null, failureMode: 'none', siteReassigned: false });
    expect(typed.level).toBe('ok');
    // the review
    const review = readiness(spec, mission);
    expect(review.canFly).toBe(false);
    expect(review.level).toBe('fail');
    expect(review.items.filter((i) => i.level === 'fail').map((i) => `${i.step}:${i.code}`)).toEqual(['design:noLiftoff', 'probe:noInsertion', 'verdict:noInsertion']);
    expect(review.items.find((i) => i.code === 'noInsertion' && i.step === 'probe')!.event).toBe('evt.noLiftoff');
  });

  /**
   * Falcon 9 at 90 % of its real LEO rating, which it cannot fly (the fleet
   * matrix files `falcon9/leo/90` as beyond capability: out of propellant),
   * typed with a rating half as big again. At 60 % of the typed rating and
   * with no ascent shortfall on paper, the panel's gate would not fly the
   * probe, and the verdict would be "Ready". The review flies it anyway.
   */
  it('catches an inflated rating with the probe it always flies', () => {
    const real = vehicleById('falcon9').payloadLEO;
    const spec = copyOf('falcon9', { payloadLEO: 1.5 * real });
    const mass = 0.9 * real;
    const mission = missionFor(spec, 'cape', 'leo', 'cubesats', mass);
    const site = siteById('cape'), satellite = satelliteById('cubesats');
    const plan = planMission({ ...mission, vehicleId: spec.id, vehicleSpec: spec }, site, spec);
    expect(missionCapability(spec, satellite, mass, plan).ascentShortfall).toBe(0);
    expect(marginalMission(spec, satellite, mass, plan, mission.orbit)).toBe(false);
    const gated = missionVerdict({ spec, site, orbit: mission.orbit, satellite, payloadMass: mass,
      inclinationDeg: resolveTarget(mission.orbit, site, mission.launchTime).inclination * RAD, plan, insertion: null, failureMode: 'none', siteReassigned: false });
    expect(gated.level, 'what the panel would say without the probe').toBe('ok');
    const review = readiness(spec, mission);
    expect(review.canFly).toBe(false);
    expect(review.verdict?.cause).toBe('noInsertion');
    expect(review.insertion?.reachesOrbit).toBe(false);
    expect(review.items.filter((i) => i.level === 'fail').map((i) => `${i.step}:${i.code}`)).toEqual(['probe:noInsertion', 'verdict:noInsertion']);
    // with its honest rating the same mass is tight, and the panel's gate would have flown the probe too
    expect(readiness(copyOf('falcon9'), missionFor(copyOf('falcon9'), 'cape', 'leo', 'cubesats', mass)).verdict?.cause).toBe('noInsertion');
  });

  /**
   * The mission most callers have to hand is a whole `MissionConfig` (the
   * setup panel's `getConfig()`), and it names the vehicle it was set up for,
   * with that vehicle's spec when it is a custom one. The review is of `spec`,
   * so whatever vehicle the mission carries must not reach the plan or the
   * probe: found in review, where a catalogue entry reviewed on a mission
   * still carrying a custom spec of another id made the probe throw
   * (`missionVehicle`: the ids disagree), which the review reported as a
   * `probeFailed` warning instead of the probe's `noInsertion`.
   */
  it('reviews the vehicle it is given, not one the mission still names', () => {
    const other = copyOf('soyuz21a');
    const tight = vehicleById('falcon9').payloadLEO * 0.9;
    for (const spec of [vehicleById('falcon9'), copyOf('falcon9')]) {
      const clean = missionFor(spec, 'cape', 'leo', 'cubesats', tight);
      const expected = readiness(spec, clean);
      expect(expected.insertion, `${spec.id}: the probe flies (90 % of the rating)`).not.toBeNull();
      const stale = { ...clean, vehicleId: other.id, vehicleSpec: other } as ReadinessMission;
      const review = readiness(spec, stale);
      expect(review.items, spec.id).toEqual(expected.items);
      expect(review.insertion, spec.id).toEqual(expected.insertion);
      expect(review.verdict, spec.id).toEqual(expected.verdict);
    }
  });

  it('stops at the validator: an invalid spec is reviewed no further', () => {
    const spec = copyOf('falcon9');
    spec.stages[1].engine.ispVac = 3000;
    const review = readiness(spec, missionFor(spec, 'cape', 'leo', 'cubesats', PAYLOAD));
    expect(review.items.map((i) => `${i.step}:${i.code}:${i.path}`)).toEqual(['design:invalid:stages[1].engine.ispVac']);
    expect(review).toMatchObject({ canFly: false, level: 'fail', verdict: null, plan: null, insertion: null });
  });
});
