/**
 * The Sun's activity and the air it makes (roadmap R05, P2.5): the density
 * against ECSS's NRLMSISE-00 tables, the place the model is asked about, the
 * indices it reads — Kp to Ap, the daily history, the measured and forecast
 * series, the Sun's mean cycle — and, the validation, seven spheres of
 * published mass and size carried from their first element set down to their
 * re-entry on record. The tolerances were fixed before the comparisons:
 * ±10 % of ECSS's densities (the averaging behind its tables is not spelled
 * out), ±25 % of the time each sphere actually spent in orbit. VALIDATION.md
 * §6 has the tables.
 */
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/space-weather/spheres.json';
import HISTORY from '../src/data/solar-daily.json';
import {
  CYCLE_MINIMA, CYCLE_MONTHS, ECSS_LEVELS, dailyAp, indicesAt, kpToAp, meanCycle, measuredActivity,
  type Activity, type DailyActivity, type SolarDaily,
} from '../src/physics/propagator/activity';
import { TOP_OF_ATMOSPHERE, airDensity, geodetic, heightKm, msisInput } from '../src/physics/propagator/density';
import { gtd7 } from '../src/physics/propagator/msis';
import { propagate } from '../src/physics/propagator/propagate';
import { ALL_FORCES } from '../src/physics/propagator/forces';
import { gmst } from '../src/physics/orbital';
import { R_EARTH } from '../src/physics/constants';
import { geodeticToEcef } from '../src/orbit/applications';
import { elementsFromRecord } from '../src/orbit/omm';
import { meanStart } from '../src/orbit/mean-state';
import type { OmmRecord } from '../src/provider/satellites';
import type { SpaceWeather } from '../src/provider/space-weather';

const history = HISTORY as SolarDaily;
const SNAPSHOT_FILE = import.meta.glob('../public/data/space-weather.json', { import: 'default', eager: true }) as Record<string, { data: SpaceWeather }>;
const bundled = Object.values(SNAPSHOT_FILE)[0].data;
const DEG = Math.PI / 180;
const jdOf = (iso: string): number => Date.parse(iso) / 86400000 + 2440587.5;
/** A day's value in the history. */
const day = (date: string, what: 'f107' | 'ap'): number => history[what][Math.round(jdOf(`${date}T00:00:00Z`) - jdOf(`${history.from}T00:00:00Z`))];
const at = (s: DailyActivity, iso: string) => indicesAt(s, jdOf(iso));

describe('the density (R05, P2.5)', () => {
  // ECSS-E-ST-10-04C Annex G, Tables G-1 to G-3, the ρ column: "NRLMSISE-00 altitude profiles at equatorial
  // latitude … averaged over diurnal and seasonal variations"; their ρ is the species' sum without anomalous oxygen
  const ECSS: [keyof typeof ECSS_LEVELS, number, number][] = [
    ['low', 200, 1.63e-10], ['low', 400, 5.75e-13], ['low', 700, 4.04e-15],
    ['moderate', 200, 2.84e-10], ['moderate', 400, 3.96e-12], ['moderate', 700, 4.80e-14],
    ['high', 200, 4.57e-10], ['high', 400, 1.40e-11], ['high', 700, 3.75e-13],
  ];
  it.each(ECSS)('averages at the equator to ECSS\'s table: %s activity, %i km', (level, alt, rho) => {
    const l = ECSS_LEVELS[level];
    let sum = 0, n = 0;
    for (let doy = 15; doy < 366; doy += 30.5) {
      for (let lst = 0.5; lst < 24; lst += 1) {
        sum += gtd7({ doy: Math.round(doy), sec: lst * 3600, alt, lat: 0, lon: 0, lst, f107a: l.f107a, f107: l.f107, ap: l.ap }, [1, ...Array<number>(23).fill(1)]).d[5];
        n++;
      }
    }
    expect(Math.abs(sum / n / rho - 1), `${(sum / n).toExponential(3)} against ${rho}`).toBeLessThan(0.1);
  });

  it('is more air with more activity, and densest in the afternoon', () => {
    const jd = jdOf('2020-03-20T12:00:00Z');
    for (const alt of [200, 400, 700]) {
      const r: [number, number, number] = [R_EARTH + alt * 1e3, 0, 0];
      let last = 0;
      for (const f107a of [65, 100, 140, 200, 250]) {
        const rho = airDensity(r, jd, { f107: f107a, f107a, ap: 15 });
        expect(rho, `${alt} km, F10.7 ${f107a}`).toBeGreaterThan(last);
        last = rho;
      }
      expect(airDensity(r, jd, { f107: 140, f107a: 140, ap: 100 })).toBeGreaterThan(airDensity(r, jd, ECSS_LEVELS.moderate));
    }
    // at the March equinox noon UT, the point under the Sun's afternoon (14 h, 30° east) against the night side
    const th = gmst(jd), r = R_EARTH + 400e3;
    const place = (lonDeg: number): [number, number, number] => [r * Math.cos(th + lonDeg * DEG), r * Math.sin(th + lonDeg * DEG), 0];
    expect(airDensity(place(30), jd, ECSS_LEVELS.moderate) / airDensity(place(-150), jd, ECSS_LEVELS.moderate)).toBeGreaterThan(2);
  });

  it('asks the model about the right place and time', () => {
    const jd = jdOf('2021-07-01T06:00:00Z');
    // a point over 100° E, 20° N, 450 km up, turned into the inertial frame by the sidereal time
    const e = geodeticToEcef({ lat: 20 * DEG, lon: 100 * DEG, h: 450e3 });
    const th = gmst(jd);
    const r: [number, number, number] = [e.x * Math.cos(th) - e.y * Math.sin(th), e.x * Math.sin(th) + e.y * Math.cos(th), e.z];
    const m = msisInput(r, jd, ECSS_LEVELS.low);
    expect(m.doy).toBe(182);
    expect(m.sec).toBeCloseTo(6 * 3600, 3);
    expect(m.lat).toBeCloseTo(20, 9);
    expect(m.lon).toBeCloseTo(100, 9);
    expect(m.alt).toBeCloseTo(450, 6);
    // the local time is the UT and the longitude's hours: 06:00 + 6 h 40 min
    expect(m.lst).toBeCloseTo(6 + 100 / 15, 9);
  });

  it('reads the height above the WGS-84 ellipsoid, not above a sphere', () => {
    expect(heightKm([R_EARTH + 400e3, 0, 0])).toBeCloseTo(400, 9);
    // over the pole the ellipsoid is 21.4 km lower (WGS-84 polar radius 6 356.752 km)
    expect(heightKm([0, 0, 6356752.3142 + 400e3])).toBeCloseTo(400, 6);
    // Bowring's one pass, against points placed exactly
    for (const lat of [-89.9, -60, -30, 0.5, 13.7, 45, 75, 89.9]) {
      for (const alt of [0, 150e3, 800e3, 2000e3]) {
        const p = geodeticToEcef({ lat: lat * DEG, lon: 1, h: alt });
        const g = geodetic(p.x, p.y, p.z);
        // 10⁻⁹ degrees is a tenth of a millimetre
        expect(Math.abs(g.lat / DEG - lat), `${lat}°, ${alt} m`).toBeLessThan(1e-9);
        expect(Math.abs(g.h - alt), `${lat}°, ${alt} m`).toBeLessThan(1e-4);
      }
    }
  });

  it('has no air above the top of the atmosphere', () => {
    expect(airDensity([R_EARTH + TOP_OF_ATMOSPHERE + 1e3, 0, 0], 2451545, ECSS_LEVELS.high)).toBe(0);
    expect(airDensity([R_EARTH + TOP_OF_ATMOSPHERE - 1e3, 0, 0], 2451545, ECSS_LEVELS.high)).toBeGreaterThan(0);
  });
});

describe('the indices (R05, P2.5)', () => {
  it('turns Kp into ap by Bartels\'s table, and a day\'s eight into its Ap', () => {
    expect([0, 0.33, 1, 2.67, 3, 4, 5, 7.33, 9].map(kpToAp)).toEqual([0, 2, 4, 12, 15, 27, 48, 154, 400]);
    // GFZ's 2026-09-25: Kp 4.000 3.667 4.000 4.000 3.333 2.667 3.000 4.000, Ap 22 (its daily file)
    const kp = [4, 3.667, 4, 4, 3.333, 2.667, 3, 4].map((v, k) => ({ time: `2026-09-25T${String(3 * k).padStart(2, '0')}:00:00.000Z`, kp: v }));
    const [d] = dailyAp([...kp, { time: '2026-09-26T00:00:00.000Z', kp: 5 }]);
    expect(d.date).toBe('2026-09-25');
    expect(Math.round(d.ap)).toBe(22);
    expect(day('2026-09-25', 'ap')).toBe(22);
    // a day not covered in full is left out
    expect(dailyAp(kp.slice(1))).toEqual([]);
  });

  it('keeps GFZ\'s days from 1954, storms and all', () => {
    expect(history.from).toBe('1954-01-01');
    expect(history.f107.length).toBe(history.ap.length);
    expect(history.f107.length).toBe(Math.round(jdOf(`${history.to}T00:00:00Z`) - jdOf(`${history.from}T00:00:00Z`)) + 1);
    // the Halloween storms of 2003 and the storm of May 2024, as GFZ records them
    expect(day('2003-10-29', 'ap')).toBe(204);
    expect(day('2003-10-30', 'ap')).toBe(191);
    expect(day('2024-05-11', 'ap')).toBe(271);
    expect(day('2003-10-29', 'f107')).toBeCloseTo(291.7, 6);
    for (const f of history.f107) expect(f).toBeGreaterThan(50);
  });

  it('holds fixed indices, and reads a series day by day', () => {
    expect(indicesAt(ECSS_LEVELS.high, 2451545)).toEqual({ f107: 250, f107a: 250, ap: 45 });
    const s: Activity = { from: 100, f107: [70, 80, 90], f107a: [75, 75, 75], ap: [3, 4, 5] };
    expect(indicesAt(s, 101.2)).toEqual({ f107: 80, f107a: 75, ap: 4 });
    expect(indicesAt(s, 50).f107).toBe(70);
    expect(indicesAt(s, 500).ap).toBe(5);
  });

  it('builds the mean of cycles 19 to 24 from the history', () => {
    const c = meanCycle(history);
    expect(CYCLE_MINIMA[0]).toBe('1954-04');
    expect(c.f107.length).toBe(CYCLE_MONTHS);
    // quiet at the minimum, near 180 sfu some three to six years on (a broad maximum: some cycles peak twice)
    expect(c.f107[0]).toBeLessThan(80);
    const peak = c.f107.indexOf(Math.max(...c.f107));
    expect(peak).toBeGreaterThan(30);
    expect(peak).toBeLessThan(72);
    expect(c.f107[peak]).toBeGreaterThan(160);
    expect(c.f107[peak]).toBeLessThan(220);
    // the cycles differ most about their maxima
    expect(c.f107sd[peak]).toBeGreaterThan(c.f107sd[0]);
    // the Ap over the whole cycle: the 13 R05 held it at
    expect(c.ap.reduce((s, x) => s + x, 0) / c.ap.length).toBeCloseTo(13, 0);
  });

  it('builds the measured series: GFZ\'s days, SWPC\'s after them, NOAA\'s forecast, then the mean cycle', () => {
    const m = measuredActivity(history, bundled);
    const s = m.series;
    // the model's indices on a day: the day before's flux, the 81-day mean about the day, the day's Ap
    const i = at(s, '2003-10-29T12:00:00Z');
    expect(i.f107).toBeCloseTo(day('2003-10-28', 'f107'), 9);
    expect(i.ap).toBe(204);
    let sum = 0;
    for (let k = -40; k <= 40; k++) sum += history.f107[Math.round(jdOf('2003-10-29T00:00:00Z') - jdOf('1954-01-01T00:00:00Z')) + k];
    expect(i.f107a).toBeCloseTo(sum / 81, 9);
    // the history reaches the bundled snapshot's last month; SWPC's days after it
    expect(m.measuredTo).toBe(history.to);
    const days = bundled.f107.filter((d) => d.date > history.to);
    if (days.length) {
      expect(m.recentTo).toBe(days.at(-1)!.date);
      const d = days.at(-1)!;
      const next = new Date(Date.parse(`${d.date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
      expect(at(s, `${next}T12:00:00Z`).f107).toBeCloseTo(d.flux, 9);
    }
    // NOAA's forecast to its end, at its months' middles
    expect(m.forecastTo).toBe(bundled.forecast.at(-1)!.month);
    const mid = bundled.forecast.find((r) => r.month === '2028-06')!;
    expect(at(s, '2028-06-16T00:00:00Z').f107).toBeCloseTo(mid.f107, 0);
    // then the mean cycle, from cycle 25's minimum (2019-12), 132 months on: 2030-12 is its month 132, so month 0
    // again; 2035-06 is its month 54, and its first day halfway between the middles of months 53 and 54
    expect(m.repeatFrom).toBe('2031-01');
    const c = meanCycle(history);
    expect(at(s, '2035-06-01T00:00:00Z').f107).toBeCloseTo((c.f107[53] + c.f107[54]) / 2, 0);
    expect(at(s, '2046-06-01T00:00:00Z').f107).toBeCloseTo((c.f107[53] + c.f107[54]) / 2, 0);
    // the high and low sides bracket it, in NOAA's forecast and in the cycle beyond
    for (const iso of ['2028-06-15T12:00:00Z', '2035-06-01T00:00:00Z']) {
      const mean = at(s, iso).f107;
      expect(at(measuredActivity(history, bundled, 'high').series, iso).f107).toBeGreaterThan(mean);
      expect(at(measuredActivity(history, bundled, 'low').series, iso).f107).toBeLessThan(mean);
    }
    // Ap: the last week's from Kp, the cycle's where none is measured
    const week = dailyAp(bundled.kp).filter((d) => d.date > history.to);
    for (const w of week) expect(at(s, `${w.date}T12:00:00Z`).ap).toBeCloseTo(w.ap, 9);
    // 2040-02 is the cycle's month 110
    expect(at(s, '2040-02-01T00:00:00Z').ap).toBeCloseTo((c.ap[109] + c.ap[110]) / 2, 0);
    // every day has its indices, and the series runs sixty years past the forecast
    expect(s.f107.every(Number.isFinite) && s.f107a.every(Number.isFinite) && s.ap.every(Number.isFinite)).toBe(true);
    expect(s.from + s.f107.length).toBeGreaterThan(jdOf('2090-12-01T00:00:00Z'));
  });

  it('does without the dataset: GFZ\'s days, then the mean cycle', () => {
    const m = measuredActivity(history, null);
    expect(m.measuredTo).toBe(history.to);
    expect(m.forecastTo).toBeNull();
    expect(m.recentTo).toBeNull();
    expect(m.repeatFrom).toBe('2026-10');
    const c = meanCycle(history);
    // 2027-06 is month 90 from 2019-12
    expect(at(m.series, '2027-06-01T00:00:00Z').f107).toBeCloseTo(c.f107[89] * 0.5 + c.f107[90] * 0.5, 0);
  });
});

/**
 * The validation: spheres, whose drag area does not depend on how they
 * tumble, from their first element set (CelesTrak's gp-first) to their
 * re-entry (GCAT, J. McDowell), C_D 2.2, the measured series the app builds.
 */
describe('decay against re-entries on record (R05, P2.5)', () => {
  const measured = measuredActivity(history, null).series;
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
