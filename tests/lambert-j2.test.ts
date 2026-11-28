/**
 * PF-04, the second suspect: the Lambert plan solved for two bodies and
 * flown with J2.
 *
 * `rendezvous()` in `src/orbit/maneuvers.ts` places the two ends with
 * `stateAt(…, j2)` and joins them with the two-body `lambert`; the arrival
 * burn then sets the target's velocity wherever the chaser is. The Orbit
 * playground plans and flies with one J2 flag. These cases fly the transfer
 * of tests/maneuvers.test.ts (400 km to 800 km, about 165°) with that one
 * flag, as the playground does, at three inclinations.
 *
 * The case titled `known defect (PF-04)` pins what the app does today. OE-4,
 * the batch that owns the Lambert plan, replaces its assertion with its own
 * failing test when it fixes the plan. The report is
 * docs/development/reports/PF-04-silent-answers.md.
 */
import { describe, expect, it } from 'vitest';
import { DEG, R_EARTH } from '../src/physics/constants';
import { norm, sub } from '../src/physics/vec3';
import { stateAt, type Orbit } from '../src/orbit/kepler';
import { isPlan, rendezvous, stateOnPlan } from '../src/orbit/maneuvers';

const JD = 2461309.5;
/** The helper of tests/maneuvers.test.ts. */
const circle = (alt: number, i = 0, extra: Partial<Orbit> = {}): Orbit => ({ a: R_EARTH + alt, e: 0, i, raan: 0.3, argp: 0, m0: 0.2, jd0: JD, ...extra });

/** The chaser against the target at the plan's arrival, planned and flown with the one flag `j2`. */
function arrival(incDeg: number, j2: boolean): { miss: number; dv: number } {
  const chaser = circle(400e3, incDeg * DEG, { raan: 0, m0: 0 });
  const target = circle(800e3, incDeg * DEG, { raan: 0, m0: -6 * DEG });
  const plan = rendezvous(chaser, target, 600, 2800, j2);
  if (!isPlan(plan)) throw new Error(`no plan at i = ${incDeg}°: ${JSON.stringify(plan)}`);
  const c = stateOnPlan(plan, plan.arrival + 1e-6, j2), tg = stateAt(target, plan.arrival, j2);
  return { miss: norm(sub(c.r, tg.r)), dv: norm(sub(c.v, tg.v)) };
}

const INCLINATIONS = [0, 51.6, 98];

describe('the Lambert rendezvous, planned and flown with one J2 flag', () => {
  it('two-body: the plan arrives on the target', () => {
    for (const i of INCLINATIONS) {
      const a = arrival(i, false);
      // measured 7.4e-3 m and 7.7e-6 m/s at each inclination
      expect(a.miss, `i = ${i}°`).toBeLessThan(0.1);
      expect(a.dv, `i = ${i}°`).toBeLessThan(1e-4);
    }
  });

  it('known defect (PF-04): with J2 on, the plan arrives tens of kilometres from the target', () => {
    // measured 59,500.6 m, 15,329.3 m and 28,365.8 m; the velocities agree to 7.8e-6 m/s or better
    const measured = [59_500, 15_330, 28_370];
    INCLINATIONS.forEach((i, k) => {
      const a = arrival(i, true);
      expect(Math.abs(a.miss / measured[k] - 1), `i = ${i}°: ${a.miss} m`).toBeLessThanOrEqual(0.1);
      expect(a.dv, `i = ${i}°`).toBeLessThan(1e-4);
    });
  });
});
