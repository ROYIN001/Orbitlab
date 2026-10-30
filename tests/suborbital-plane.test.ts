/**
 * A suborbital cut-off is judged on the plane the mission asked for, like an
 * orbit (docs/development/reports/FX-5-031r-judged-params.md, nit 2): the
 * verdict (`finishSuborbital`) and the result table (`assessMissionResult`)
 * both grade a requested RAAN, off-window or not, so a plane miss is never
 * reported as "Target trajectory reached" (src/physics/mission.ts, `orbitResiduals`).
 */
import { describe, expect, it } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { Simulation } from '../src/physics/simulation';
import { guidanceForVehicle } from '../src/physics/defaults';
import { watchMissionSettings } from '../src/ui/watch-missions';
import { assessMissionResult } from '../src/ui/result-content';
import { orbitResiduals } from '../src/physics/mission';
import { DEG } from '../src/physics/constants';

/** Mercury-Redstone 3's lob to its cut-off, its plane left free or asked for (`raanDeg`). */
function flyToCutoff(raanDeg?: number): Simulation {
  const s = watchMissionSettings('mr3');
  const orbit = raanDeg === undefined ? s.orbit : { ...s.orbit, raanMode: 'fixed' as const, raan: raanDeg };
  const sim = new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit, launchTime: s.launchTime, padId: s.padId,
    payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
  }, { headless: true });
  while (!sim.isFailed() && sim.state.t < 400 && !sim.events.some((e) => e.key.startsWith('evt.suborbital'))) sim.step(sim.suggestedDt());
  return sim;
}
const verdict = (sim: Simulation) => sim.events.find((e) => e.key.startsWith('evt.suborbital'))!;
const table = (sim: Simulation) => assessMissionResult({ state: sim.state, events: sim.events, debris: [], plan: sim.plan, cfg: sim.cfg })!;

describe('a suborbital cut-off judges the requested plane (FX-5 nit 2)', () => {
  const free = flyToCutoff();
  const expected = free.plan.raanExpected / DEG;

  it('into the window: target reached, no row flagged', () => {
    const sim = flyToCutoff(expected);
    expect(sim.raanWasReachable()).toBe(true);
    expect(verdict(sim).key).toBe('evt.suborbitalTarget');
    const result = table(sim);
    expect(result.outcome).toBe('target');
    expect(result.metrics.every((m) => m.outside !== true)).toBe(true);
  }, 60_000);

  it('120 degrees off the window: off target in the verdict AND in the table, the plane named', () => {
    const sim = flyToCutoff((expected + 120) % 360);
    expect(sim.raanWasReachable()).toBe(false);
    expect(verdict(sim).key).toBe('evt.suborbitalOffTarget');
    const result = table(sim);
    expect(result.outcome).toBe('offTarget');
    expect(result.cause).toBe('window');
    expect(result.metrics.filter((m) => m.outside === true).map((m) => m.key)).toEqual(['raan']);
  }, 60_000);

  it('the verdict is what orbitResiduals says of the numbers the event recorded, with the plane graded', () => {
    for (const raan of [expected, (expected + 120) % 360]) {
      const sim = flyToCutoff(raan), p = verdict(sim).params!;
      const res = orbitResiduals(sim.plan.target,
        { apoapsisAlt: p.apJudgedM as number, periapsisAlt: p.peJudgedM as number, i: p.incJudgedRad as number, raan: p.raanJudgedRad as number, e: 0 }, true);
      expect(verdict(sim).key).toBe(res.onTarget ? 'evt.suborbitalTarget' : 'evt.suborbitalOffTarget');
    }
  }, 120_000);

  it('a free plane is graded on the trajectory alone, as before', () => {
    expect(free.plan.target.raan).toBeNull();
    expect(verdict(free).key).toBe('evt.suborbitalTarget');
  });
});
