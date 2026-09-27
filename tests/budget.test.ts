/**
 * O03: a plan's propellant, by the rocket equation (Tsiolkovsky):
 * Δv = Isp·g₀·ln(m₀/m₁). A 1 000 kg spacecraft with an engine of Isp 300 s
 * spends 1 000·(1 − e^(−1000/2941.995)) = 288.2 kg on 1 km/s, and a 400 N
 * engine takes 2 119 s over it; burns in turn cost what one burn of their sum
 * would; tanks that run dry make the plan short, by the Δv they lack.
 */
import { describe, expect, it } from 'vitest';
import { G0, R_EARTH } from '../src/physics/constants';
import {
  CRAFT_LIMITS, budgetFor, craftAfter, craftFromHandoff, craftProblem, defaultCraft, deltaVAvailable, exhaustSpeed, maxPropellant, type Craft,
} from '../src/orbit/budget';
import { hohmann, isPlan, spiral, type Plan } from '../src/orbit/maneuvers';
import { v3 } from '../src/physics/vec3';

const burns = (...dvs: number[]): Pick<Plan, 'burns' | 'spiral' | 'totalDv'> => ({
  burns: dvs.map((dv, k) => ({ t: k, dv: v3(dv, 0, 0), vnb: { prograde: dv, normal: 0, radial: 0 }, point: 'now' as const })),
  totalDv: dvs.reduce((s, x) => s + x, 0),
});

describe('the propellant budget (O03)', () => {
  it('follows the rocket equation', () => {
    const craft = { mass: 1000, propellant: 500, isp: 300, thrust: 400 };
    const b = budgetFor(burns(1000), craft);
    expect(exhaustSpeed(300)).toBeCloseTo(300 * G0, 9);
    expect(b.burns[0].propellant).toBeCloseTo(1000 * (1 - Math.exp(-1000 / (300 * G0))), 9);
    expect(b.burns[0].propellant).toBeCloseTo(288.2, 1);
    expect(b.burns[0].duration).toBeCloseTo(b.burns[0].propellant / (400 / (300 * G0)), 6);
    expect(b.burns[0].duration).toBeCloseTo(2119, 0);
    expect(b.enough).toBe(true);
    expect(b.left).toBeCloseTo(500 - b.used, 9);
    expect(deltaVAvailable(craft)).toBeCloseTo(300 * G0 * Math.log(2), 9);
  });

  it('costs the same in several burns as in one of their sum', () => {
    const craft = { mass: 2200, propellant: 900, isp: 315, thrust: 400 };
    const split = budgetFor(burns(400, 350, 250), craft), whole = budgetFor(burns(1000), craft);
    expect(split.used).toBeCloseTo(whole.used, 9);
    expect(split.burns[2].massAfter).toBeCloseTo(whole.burns[0].massAfter, 9);
    // and the spacecraft after is lighter by it
    const after = craftAfter(split);
    expect(after.mass).toBeCloseTo(craft.mass - split.used, 9);
    expect(deltaVAvailable(after)).toBeCloseTo(deltaVAvailable(craft) - 1000, 6);
  });

  it('says how far short a plan is when the tanks run dry', () => {
    const craft = { mass: 1000, propellant: 100, isp: 300, thrust: 400 };
    const available = deltaVAvailable(craft);
    const b = budgetFor(burns(200, 200), craft);
    expect(available).toBeCloseTo(310.0, 0);
    expect(b.enough).toBe(false);
    expect(b.burns[0].short).toBe(false);
    expect(b.burns[1].short).toBe(true);
    expect(b.used).toBeCloseTo(100, 9);
    expect(b.left).toBe(0);
    expect(b.shortfall).toBeCloseTo(400 - available, 6);
  });

  it('budgets a real plan, and a spiral as one long burn', () => {
    const craft = defaultCraft();
    expect(craft).toEqual({ mass: 1800, propellant: 0.42 * 1800, isp: 315, thrust: 400 });
    const leo = { a: R_EARTH + 500e3, e: 0, i: 0.5, raan: 0, argp: 0, m0: 0, jd0: 2461309.5 };
    const plan = hohmann(leo, 0, 35_786e3, false);
    expect(isPlan(plan)).toBe(true);
    if (!isPlan(plan)) return;
    const b = budgetFor(plan, craft);
    expect(b.burns.length).toBe(2);
    expect(b.enough).toBe(false); // a geostationary bus's tanks hold ~1.7 km/s, not the 3.8 of a Hohmann from LEO
    const sp = spiral(leo, 0, 1000e3, 0.5, 1e-3, false);
    if (!isPlan(sp)) throw new Error('spiral');
    const bs = budgetFor(sp, craft);
    expect(bs.burns.length).toBe(1);
    expect(bs.burns[0].dv).toBeCloseTo(sp.totalDv, 9);
    expect(bs.enough).toBe(true);
  });

  it('takes a handed-on spacecraft\'s engine and tanks, and none from one without', () => {
    const withEngine = { spacecraft: { mass: 7150, area: 10, cd: 2.2, cr: 1.3, kind: 'crew' as const, propulsion: { thrust: 3920, isp: 302, propellantMass: 500 } } };
    expect(craftFromHandoff(withEngine)).toEqual({ mass: 7150, propellant: 500, isp: 302, thrust: 3920 });
    expect(craftFromHandoff({ spacecraft: { ...withEngine.spacecraft, propulsion: null } })).toBeNull();
  });
});

describe('a spacecraft that cannot be one (audit 2026-09-27 A2)', () => {
  // orbit-review.md 2: two burns of 3 500 m/s in all, for 100 kg with 1 000 kg of propellant, came out Infinity and "enough"
  const review = { mass: 100, propellant: 1000, isp: 315, thrust: 400 };

  it('is found before it is budgeted: propellant must be less than the mass', () => {
    expect(craftProblem(review)).toBe('propellantOverMass');
    // the browser repro: 101 kg with 1 001 kg
    expect(craftProblem({ ...review, mass: 101, propellant: 1001 })).toBe('propellantOverMass');
    // tanks that are the whole spacecraft leave nothing when dry
    expect(craftProblem({ ...review, propellant: 100 })).toBe('propellantOverMass');
    expect(craftProblem({ ...review, propellant: 99.9 })).toBeNull();
    expect(craftProblem({ ...review, propellant: 0 })).toBeNull();
    expect(craftProblem({ ...review, propellant: -1 })).toBe('propellant');
    expect(craftProblem({ ...review, mass: 0, propellant: 0 })).toBe('mass');
    expect(craftProblem({ ...review, mass: Number.NaN })).toBe('mass');
    expect(craftProblem({ ...review, propellant: 10, isp: 0 })).toBe('isp');
    expect(craftProblem({ ...review, propellant: 10, thrust: 0 })).toBe('thrust');
    expect(craftProblem({ ...review, propellant: 10, thrust: Infinity })).toBe('thrust');
    expect(craftProblem(defaultCraft())).toBeNull();
  });

  it('is never given an infinite or undefined Δv: it is refused instead', () => {
    expect(() => deltaVAvailable(review)).toThrow(RangeError);
    expect(() => budgetFor(burns(1500, 2000), review)).toThrow(RangeError);
    expect(() => deltaVAvailable({ ...review, propellant: 100 })).toThrow(RangeError);
  });

  it('gives finite numbers for every spacecraft it accepts, and never more propellant than mass', () => {
    const cases: Craft[] = [
      { ...review, propellant: 99 }, { ...review, propellant: 0 }, { ...review, propellant: 99.999 },
      { mass: 10, propellant: maxPropellant(10), isp: 50, thrust: 0.01 },
      { mass: 20_000, propellant: maxPropellant(20_000), isp: 5000, thrust: 5000 },
    ];
    for (const craft of cases) {
      expect(craftProblem(craft)).toBeNull();
      expect(Number.isFinite(deltaVAvailable(craft))).toBe(true);
      const b = budgetFor(burns(1500, 2000), craft);
      for (const x of [b.available, b.used, b.left, b.shortfall, ...b.burns.flatMap((k) => [k.propellant, k.massBefore, k.massAfter, k.duration])]) {
        expect(Number.isFinite(x)).toBe(true);
      }
      const after = craftAfter(b);
      expect(after.propellant).toBeLessThan(after.mass);
      expect(craftProblem(after)).toBeNull();
    }
  });

  it('offers a propellant slider that ends below the mass', () => {
    for (const mass of [CRAFT_LIMITS.mass.min, 101, 1800, CRAFT_LIMITS.mass.max]) {
      const hi = maxPropellant(mass);
      expect(hi).toBeLessThan(mass);
      expect(hi).toBeLessThanOrEqual(CRAFT_LIMITS.propellant.max);
      expect(craftProblem({ mass, propellant: hi, isp: 315, thrust: 400 })).toBeNull();
    }
    expect(maxPropellant(101)).toBe(100);
  });
});
