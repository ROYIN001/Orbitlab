/**
 * D07 (docs/ROADMAP-PART2-3.md; Phase 4 map §3 item 3): the lowest circular
 * altitude that lasts the years asked, by bisection over P07's mean-element
 * runs (src/orbit/lifetime-altitude.ts), and its worker job.
 *
 * TOLERANCES, fixed before the first run (the map's):
 * - the search stops at ±5 km: the final bracket is at most 10 km wide and
 *   the altitude returned is its middle;
 * - the altitude returned, run again through P07 as the lifetime window runs
 *   it (`runLifetimeJob`), comes down between the bracket's ends: the orbit at
 *   the bracket's bottom first, before the years asked; the one at its top
 *   last, after them (exact comparisons);
 * - lifetime grows with altitude on a ladder of altitudes (strictly);
 * - the job's answer is the search's own, exactly, and a Stop ends it with an
 *   AbortError.
 *
 * The craft is NAPA-2 as the D06 tests fly it: 10 kg, the tumbling box of
 * 0.2 × 0.1 × 0.3405 m, C_D 2.2 — B = 0.0134 m²/kg (docs/VALIDATION.md §7).
 */
import { describe, expect, it } from 'vitest';
import { julianDate } from '../src/physics/orbital';
import { runLifetimeJob } from '../src/physics/lifetime-job';
import { YEAR, dragMakeupPerYear } from '../src/orbit/disposal';
import { stateAt } from '../src/orbit/kepler';
import { tumblingBoxArea } from '../src/orbit/reentry';
import {
  altitudesForLifetimes, circularOrbit, expectedRuns, holdDvPerYear, lifetimeAt, meanForces, minAltitudeForLifetime,
  type AltitudeSearch, type LifetimePlane,
} from '../src/orbit/lifetime-altitude';
import { runAltitudesJob } from '../src/orbit/lifetime-altitude-job';

const JD0 = julianDate(new Date(Date.UTC(2026, 8, 21)));
const NAPA2 = { mass: 10, area: tumblingBoxArea([0.2, 0.1, 0.3405]), cd: 2.2, cr: 1.2 };
const PLANE: LifetimePlane = { sso: true, ltan: 22.5 };
const base: Omit<AltitudeSearch, 'years'> = { spacecraft: NAPA2, level: 'moderate', plane: PLANE, jd0: JD0 };

/** P07 as the lifetime window runs it (mean method, 600 samples), from the circular orbit at `h`, for `years`. */
async function p07(h: number, years: number): Promise<number | null> {
  const o = circularOrbit(h, PLANE, JD0);
  const s = stateAt(o, 0, true);
  const res = await runLifetimeJob({
    r0: [s.r.x, s.r.y, s.r.z], v0: [s.v.x, s.v.y, s.v.z], jd0: JD0,
    options: { method: 'mean', duration: years * YEAR, forces: meanForces('moderate'), spacecraft: NAPA2, samples: 600, tolerance: 1e-9 },
  }, new AbortController().signal, () => {});
  return res.lifetime;
}

describe('the lowest altitude that lasts (D07)', () => {
  it('closes on it to ±5 km, and P07 run again there comes down inside the bracket', async () => {
    expect(NAPA2.cd * NAPA2.area / NAPA2.mass).toBeCloseTo(0.0134, 4);
    const r = minAltitudeForLifetime({ ...base, years: 5 });
    expect(r.outcome).toBe('found');
    expect(r.hi - r.lo).toBeLessThanOrEqual(10e3);
    expect(r.altitude).toBe((r.lo + r.hi) / 2);
    expect(r.runs.length).toBeLessThanOrEqual(expectedRuns(150e3, 5000e3, 5e3));
    // the bracket's ends as the search found them
    expect(r.runs.find((x) => x.altitude === r.lo)!.lifetime).not.toBeNull();
    expect(r.runs.find((x) => x.altitude === r.hi)!.lifetime).toBeNull();
    // run again through P07, for three times the years so every one comes down
    const [lo, mid, hi] = [await p07(r.lo, 15), await p07(r.altitude!, 15), await p07(r.hi, 15)];
    expect(lo).not.toBeNull();
    expect(hi).not.toBeNull();
    expect(mid).not.toBeNull();
    expect(lo!).toBeLessThan(5 * YEAR);
    expect(hi!).toBeGreaterThanOrEqual(5 * YEAR);
    expect(mid!).toBeGreaterThanOrEqual(lo!);
    expect(mid!).toBeLessThanOrEqual(hi!);
    // and the search's own run at the bottom is P07's
    expect(r.runs.find((x) => x.altitude === r.lo)!.lifetime).toBe(lo);
  }, 120_000);

  it('finds lifetime growing with altitude', () => {
    let last = 0;
    for (let h = 250e3; h <= 550e3; h += 50e3) {
      const life = lifetimeAt(h, base, 40 * YEAR);
      expect(life, `${h / 1e3} km`).not.toBeNull();
      expect(life!, `${h / 1e3} km`).toBeGreaterThan(last);
      last = life!;
    }
  }, 120_000);

  it('says when the range holds no answer, and refuses nonsense', () => {
    const below = minAltitudeForLifetime({ ...base, years: 0.001 });
    expect(below.outcome).toBe('belowRange');
    expect(below.altitude).toBe(150e3);
    expect(below.runs.length).toBe(1);
    const above = minAltitudeForLifetime({ ...base, years: 5, hi: 300e3 });
    expect(above.outcome).toBe('aboveRange');
    expect(above.altitude).toBeNull();
    expect(() => minAltitudeForLifetime({ ...base, years: 0 })).toThrow(RangeError);
    expect(() => minAltitudeForLifetime({ ...base, years: 1, lo: 600e3, hi: 500e3 })).toThrow(RangeError);
    expect(() => minAltitudeForLifetime({ ...base, years: 1, spacecraft: { ...NAPA2, mass: 0 } })).toThrow(RangeError);
    expect(() => minAltitudeForLifetime({ ...base, years: 1, level: 'toString' as never })).toThrow(RangeError);
  });

  it('answers several lives in the order asked, a longer one higher, from where the shorter one came down', () => {
    const req = { ...base, years: [3, 1], hi: 900e3 };
    const [three, one] = altitudesForLifetimes(req);
    expect(one.years).toBe(1);
    expect(three.years).toBe(3);
    expect(three.altitude!).toBeGreaterThan(one.altitude!);
    // the longer search starts at the shorter one's bottom and does not fly it again
    expect(three.runs.some((x) => x.altitude === one.lo)).toBe(false);
    expect(three.runs[0].altitude).toBe(900e3);
    // the same answer as searching alone, to within the tolerance
    const alone = minAltitudeForLifetime({ ...base, years: 3, hi: 900e3 });
    expect(Math.abs(alone.altitude! - three.altitude!)).toBeLessThanOrEqual(5e3 * 2);
  }, 120_000);

  it('holds an orbit for the Δv a year D06\'s drag make-up gives at that ECSS level', () => {
    const o = circularOrbit(450e3, PLANE, JD0);
    expect(holdDvPerYear(o, NAPA2, 'high')).toBe(dragMakeupPerYear(o, NAPA2, { f107: 250, f107a: 250, ap: 45 }));
    expect(holdDvPerYear(o, NAPA2, 'low')).toBeLessThan(holdDvPerYear(o, NAPA2, 'moderate'));
  });
});

describe('the search as a job (D07)', () => {
  it('gives the search\'s own answer where no worker can be made, with its progress', async () => {
    const req = { ...base, years: [1], hi: 800e3 };
    const seen: number[] = [];
    const [job] = await runAltitudesJob(req, new AbortController().signal, (f) => seen.push(f));
    const [direct] = altitudesForLifetimes(req);
    expect(job).toEqual(direct);
    expect(seen.length).toBeGreaterThan(3);
    for (let k = 1; k < seen.length; k++) expect(seen[k]).toBeGreaterThanOrEqual(seen[k - 1]);
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0);
    expect(seen[seen.length - 1]).toBe(1);
  }, 120_000);

  it('stops when asked, before it starts or in the middle', async () => {
    const req = { ...base, years: [1], hi: 800e3 };
    const early = new AbortController();
    early.abort();
    await expect(runAltitudesJob(req, early.signal, () => {})).rejects.toMatchObject({ name: 'AbortError' });
    const mid = new AbortController();
    await expect(runAltitudesJob(req, mid.signal, (f) => { if (f > 0.2) mid.abort(); })).rejects.toMatchObject({ name: 'AbortError' });
  }, 120_000);
});
