/**
 * The Sun's activity in the lifetime model (roadmap R05): the density's level
 * against the NRLMSISE-00 tables it is built on, the indices it reads — Kp to
 * Ap, the measured and forecast series — and, the validation, seven spheres of
 * published mass and size carried from their first element set down to their
 * re-entry on record. The tolerance, ±25 % of the time each actually spent in
 * orbit, was fixed before the comparison; VALIDATION.md §6 has the table.
 */
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/space-weather/spheres.json';
import { SOLAR_HISTORY } from '../src/data/solar-history';
import {
  AP_CLIMATOLOGY, CYCLE_MONTHS, ECSS_LEVELS, dailyAp, indicesAt, kpToAp, measuredActivity, read, type Activity,
} from '../src/physics/propagator/activity';
import {
  airDensity, bulgeExponent, exosphericTemperature, harrisPriesterBounds, heightKm, meanDensity,
} from '../src/physics/propagator/density';
import { propagate } from '../src/physics/propagator/propagate';
import { ALL_FORCES } from '../src/physics/propagator/forces';
import { AU, type V3 } from '../src/physics/propagator/ephemeris';
import { R_EARTH } from '../src/physics/constants';
import { elementsFromRecord } from '../src/orbit/omm';
import { meanStart } from '../src/orbit/mean-state';
import type { OmmRecord } from '../src/provider/satellites';
import type { SpaceWeather } from '../src/provider/space-weather';

const SNAPSHOT_FILE = import.meta.glob('../public/data/space-weather.json', { import: 'default', eager: true }) as Record<string, { data: SpaceWeather }>;
const bundled = Object.values(SNAPSHOT_FILE)[0].data;
const DEG = Math.PI / 180;
const jdOf = (iso: string): number => Date.parse(iso) / 86400000 + 2440587.5;

describe('the density at a level of activity (R05)', () => {
  it('is ECSS\'s NRLMSISE-00 table at its three levels, and in between for the rest', () => {
    // ECSS-E-ST-10-04C Annex G, Tables G-1 to G-3, the ρ column
    expect(meanDensity(400, ECSS_LEVELS.low)).toBeCloseTo(5.75e-13, 16);
    expect(meanDensity(400, ECSS_LEVELS.moderate)).toBeCloseTo(3.96e-12, 15);
    expect(meanDensity(400, ECSS_LEVELS.high)).toBeCloseTo(1.40e-11, 14);
    expect(meanDensity(200, ECSS_LEVELS.moderate)).toBeCloseTo(2.84e-10, 13);
    expect(meanDensity(700, ECSS_LEVELS.high)).toBeCloseTo(3.75e-13, 16);
    // between rows, exponential in height: the geometric mean halfway
    expect(meanDensity(410, ECSS_LEVELS.moderate)).toBeCloseTo(Math.sqrt(3.96e-12 * 2.83e-12), 15);
    // more activity, more air, at every height
    for (let h = 120; h <= 900; h += 20) {
      let last = 0;
      for (const f107 of [65, 100, 140, 180, 250, 300]) {
        const rho = meanDensity(h, { f107, ap: 15 });
        expect(rho, `${h} km, F10.7 ${f107}`).toBeGreaterThan(last);
        last = rho;
      }
    }
  });

  it('weighs the flux against Ap by the IPS relation', () => {
    expect(exosphericTemperature(ECSS_LEVELS.low)).toBe(887.5);
    expect(exosphericTemperature(ECSS_LEVELS.moderate)).toBe(1097.5);
    expect(exosphericTemperature(ECSS_LEVELS.high)).toBe(1417.5);
    // 1.5 K per unit of Ap, 2.5 K per sfu: Ap 25 more is F10.7 15 more
    expect(meanDensity(400, { f107: 140, ap: 40 })).toBeCloseTo(meanDensity(400, { f107: 155, ap: 15 }), 15);
  });

  it('spreads the level through the day as Harris–Priester does, averaging it over the globe', () => {
    const sun: V3 = [AU, 0, 0];
    for (const [alt, incl] of [[300, 51.6], [500, 98], [800, 0]]) {
      const n = bulgeExponent(incl * DEG);
      const r = R_EARTH + alt * 1e3;
      // the average over a sphere of directions (a Fibonacci lattice) at this height
      let sum = 0;
      const N = 4000;
      for (let k = 0; k < N; k++) {
        const z = 1 - (2 * (k + 0.5)) / N, rho = Math.sqrt(1 - z * z), phi = k * Math.PI * (3 - Math.sqrt(5));
        sum += airDensity([r * rho * Math.cos(phi), r * rho * Math.sin(phi), r * z], alt, sun, n, ECSS_LEVELS.moderate);
      }
      expect(sum / N / meanDensity(alt, ECSS_LEVELS.moderate), `${alt} km`).toBeCloseTo(1, 2);
      // and the day side is Harris–Priester's maximum over its minimum times the night side
      const [mn, mx] = harrisPriesterBounds(alt);
      const apex = airDensity([r * Math.cos(30 * DEG), r * Math.sin(30 * DEG), 0], alt, sun, n, ECSS_LEVELS.high);
      const night = airDensity([-r * Math.cos(30 * DEG), -r * Math.sin(30 * DEG), 0], alt, sun, n, ECSS_LEVELS.high);
      expect(apex / night).toBeCloseTo(mx / mn, 6);
    }
    expect(airDensity([R_EARTH + 1100e3, 0, 0], 1100, sun, 4, ECSS_LEVELS.high)).toBe(0);
  });

  it('reads the height above the WGS-84 ellipsoid, not above a sphere', () => {
    expect(heightKm([R_EARTH + 400e3, 0, 0])).toBeCloseTo(400, 9);
    // over the pole the ellipsoid is 21.4 km lower (WGS-84 polar radius 6 356.752 km)
    expect(heightKm([0, 0, 6356752.3 + 400e3])).toBeCloseTo(400, 1);
  });
});

describe('the indices (R05)', () => {
  it('turns Kp into ap by Bartels\'s table, and a day\'s eight into its Ap', () => {
    expect([0, 0.33, 1, 2.67, 3, 4, 5, 7.33, 9].map(kpToAp)).toEqual([0, 2, 4, 12, 15, 27, 48, 154, 400]);
    // GFZ's 2026-09-25: Kp 4.000 3.667 4.000 4.000 3.333 2.667 3.000 4.000, Ap 22 (its daily file)
    const kp = [4, 3.667, 4, 4, 3.333, 2.667, 3, 4].map((v, k) => ({ time: `2026-09-25T${String(3 * k).padStart(2, '0')}:00:00.000Z`, kp: v }));
    const [day] = dailyAp([...kp, { time: '2026-09-26T00:00:00.000Z', kp: 5 }]);
    expect(day.date).toBe('2026-09-25');
    expect(Math.round(day.ap)).toBe(22);
    // a day not covered in full is left out
    expect(dailyAp(kp.slice(1))).toEqual([]);
  });

  it('holds fixed indices, and reads a series between its points and at its ends', () => {
    expect(indicesAt(ECSS_LEVELS.high, 2451545)).toEqual({ f107: 250, ap: 45 });
    const s: Activity = { f107: { jd: [10, 20], v: [100, 200] }, ap: { jd: [0], v: [7] } };
    expect(indicesAt(s, 15)).toEqual({ f107: 150, ap: 7 });
    expect(indicesAt(s, 5).f107).toBe(100);
    expect(indicesAt(s, 25).f107).toBe(200);
  });

  it('builds the measured series: GFZ\'s months, SWPC\'s after them, the last days, NOAA\'s forecast, then the Sun again', () => {
    const m = measuredActivity(bundled);
    const { f107, ap } = m.series;
    // GFZ's first month, at its middle
    expect(read(f107, jdOf('1947-03-16T12:00:00Z'))).toBeCloseTo(SOLAR_HISTORY.f107[0], 6);
    // the fixed table reaches 2026-08, the bundled snapshot's months no further
    expect(SOLAR_HISTORY.from).toBe('1947-03');
    expect(m.measuredTo).toBe('2026-08');
    // the last thirty days' mean at their middle
    const days = bundled.f107;
    expect(m.recentTo).toBe(days.at(-1)!.date);
    const mid = (jdOf(`${days[0].date}T12:00:00Z`) + jdOf(`${days.at(-1)!.date}T12:00:00Z`)) / 2;
    expect(read(f107, mid)).toBeCloseTo(days.reduce((s, d) => s + d.flux, 0) / days.length, 6);
    // NOAA's forecast to its end, then eleven years back
    expect(m.forecastTo).toBe(bundled.forecast.at(-1)!.month);
    const lastF = bundled.forecast.at(-1)!;
    expect(read(f107, jdOf(`${lastF.month}-16T00:00:00Z`))).toBeCloseTo(lastF.f107, 0);
    expect(m.repeatFrom).toBe('2031-01');
    expect(read(f107, jdOf('2035-06-15T12:00:00Z'))).toBeCloseTo(read(f107, jdOf('2024-06-15T12:00:00Z')), 0);
    expect(CYCLE_MONTHS).toBe(132);
    // the high and low sides of the forecast bracket it
    const at = jdOf('2028-06-15T12:00:00Z');
    expect(read(measuredActivity(bundled, 'high').series.f107, at)).toBeGreaterThan(read(f107, at));
    expect(read(measuredActivity(bundled, 'low').series.f107, at)).toBeLessThan(read(f107, at));
    // Ap: GFZ's months, the long-term mean after them, the last week's from Kp
    expect(read(ap, jdOf('2003-10-16T12:00:00Z'))).toBeCloseTo(34.7, 6); // the Halloween storms' month
    expect(read(ap, jdOf('2040-01-01T00:00:00Z'))).toBe(AP_CLIMATOLOGY);
    const week = dailyAp(bundled.kp);
    expect(week.length).toBeGreaterThan(3);
    expect(read(ap, jdOf(`${week[1].date}T12:00:00Z`))).toBeCloseTo(week[1].ap, 9);
    // points only ever forward in time
    for (const t of [f107, ap]) for (let k = 1; k < t.jd.length; k++) expect(t.jd[k]).toBeGreaterThan(t.jd[k - 1]);
  });

  it('does without the dataset: GFZ\'s months, then the Sun repeating itself', () => {
    const m = measuredActivity(null);
    expect(m.measuredTo).toBe('2026-08');
    expect(m.forecastTo).toBeNull();
    expect(m.recentTo).toBeNull();
    expect(m.repeatFrom).toBe('2026-09');
    expect(read(m.series.f107, jdOf('2027-03-16T12:00:00Z'))).toBeCloseTo(read(m.series.f107, jdOf('2016-03-16T12:00:00Z')), 0);
  });
});

/**
 * The validation: spheres, whose drag area does not depend on how they
 * tumble, from their first element set (CelesTrak's gp-first) to their
 * re-entry (GCAT, J. McDowell), C_D 2.2, the measured series the app builds.
 */
describe('decay against re-entries on record (R05)', () => {
  const measured = measuredActivity(null).series;
  const cases = fixture.spheres.map((s) => {
    const start = meanStart(elementsFromRecord(s.elements as OmmRecord));
    const actual = jdOf(`${s.decay}T12:00:00Z`) - start.jd;
    const run = (activity: Activity) => propagate(start.r, start.v, start.jd, {
      method: 'mean', duration: 3 * 365 * 86400, forces: { ...ALL_FORCES, activity },
      spacecraft: { mass: s.mass, area: Math.PI * (s.diameter / 2) ** 2, cd: 2.2, cr: 1.3 },
    }).lifetime;
    return { s, start, actual, run };
  });

  it.each(cases.map((c) => [c.s.name, c] as const))('%s comes down within 25 %% of its days in orbit, with the Sun as measured', (_, c) => {
    const days = c.run(measured)! / 86400;
    expect(Math.abs(days / c.actual - 1), `${days.toFixed(1)} days against ${c.actual.toFixed(1)}`).toBeLessThan(0.25);
  });

  it('is far better with the measured Sun than with a fixed moderate one, at both ends of the cycle', () => {
    let measuredErr = 0, fixedErr = 0;
    for (const c of cases) {
      measuredErr += Math.abs(Math.log(c.run(measured)! / 86400 / c.actual));
      fixedErr += Math.abs(Math.log(c.run(ECSS_LEVELS.moderate)! / 86400 / c.actual));
    }
    // mean |log ratio|: measured about 0.18, fixed about 0.9
    expect(measuredErr / cases.length).toBeLessThan(0.25);
    expect(fixedErr / cases.length).toBeGreaterThan(3 * (measuredErr / cases.length));
  });
});
