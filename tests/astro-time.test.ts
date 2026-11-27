/**
 * Time scales of src/astro/base (PF-10) against ERFA (dat, utctai, taitt, dtdb)
 * (tests/fixtures/astro/time/, made by make_time_fixture.py there), and the Earth
 * orientation against the app's present function in src/orbit/earth-orientation.ts.
 */
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/astro/time/erfa-time.json';
import {
  eopAt, jd2, julianCenturies, taiMinusUtc, taiToTt, taiToUtc, tdbMinusTt, ttToTai, ttToUtc, utcToTai, utcToTt, utcToUt1,
  type EopTable, type Jd2,
} from '../src/astro/base/time';
import { eopAt as eopAtToday } from '../src/orbit/earth-orientation';

const J = (p: number[]): Jd2 => ({ a: p[0], b: p[1] });
/** Two dates compared part by part, in seconds: x − y. */
const diff = (x: Jd2, y: Jd2) => ((x.a - y.a) + (x.b - y.b)) * 86400;
/** A calendar instant (UTC) as a Julian date in one number; exact for 0 h. */
const jdOf = (y: number, m: number, d: number, h = 0, mi = 0, s = 0) => Date.UTC(y, m - 1, d, h, mi, s) / 86400000 + 2440587.5;

const THREE: Jd2[] = [{ a: 2451545.0, b: 0 }, { a: 2460000.5, b: 0.75 }, { a: 2437300.5, b: 0.25 }];

describe('astro time scales', () => {
  it('TAI − UTC at every leap second since 1972', () => {
    expect(fixture.leap).toHaveLength(27);
    expect(fixture.leap[0].at.utc[0]).toBe(jdOf(1972, 7, 1));
    expect(fixture.leap[26].at.utc[0]).toBe(jdOf(2017, 1, 1));
    for (const l of fixture.leap) {
      expect(taiMinusUtc(J(l.before.utc)), `before ${l.at.utc[0]}`).toBe(l.before.dat);
      expect(taiMinusUtc(J(l.at.utc)), `at ${l.at.utc[0]}`).toBe(l.at.dat);
    }
  });

  it('TAI − UTC in the drift years', () => {
    expect(fixture.drift).toHaveLength(159);
    for (const d of fixture.drift) expect(Math.abs(taiMinusUtc(J(d.utc)) - d.dat), `${d.utc}`).toBeLessThanOrEqual(1e-9);
  });

  it('holds outside the table', () => {
    const before = taiMinusUtc(jd2(jdOf(1957, 10, 4)));
    expect(Math.abs(before - fixture.first.dat)).toBeLessThanOrEqual(1e-9);
    expect(before).toBe(taiMinusUtc(jd2(jdOf(1960, 1, 1))));
    expect(taiMinusUtc(jd2(jdOf(2040, 1, 1)))).toBe(37);
  });

  it('UTC to TAI at the leap seconds and in the drift years', () => {
    const cases = [
      ...fixture.leap.flatMap((l) => [l.before, l.at]),
      ...fixture.drift,
    ];
    expect(cases).toHaveLength(27 * 2 + 159);
    for (const c of cases) {
      const u = J(c.utc);
      const t = utcToTai(u);
      expect(t.a, `${c.utc}`).toBe(u.a);
      expect(Math.abs(diff(t, u) - c.dat), `${c.utc} shift`).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(diff(taiToUtc(t), u)), `${c.utc} back`).toBeLessThanOrEqual(1e-9);
    }
  });

  it('a TAI instant inside a leap second', () => {
    const a = 2457754.5;
    const t: Jd2 = { a, b: 36.5 / 86400 };
    const u = taiToUtc(t);
    expect(u.a).toBe(a);
    expect(Math.abs(diff(u, { a, b: 0.5 / 86400 }))).toBeLessThanOrEqual(1e-9);
    const back = utcToTai(u);
    expect(back.a).toBe(a);
    expect(Math.abs(diff(back, t) - 1)).toBeLessThanOrEqual(1e-9);
    for (const s of [35.5, 37.5]) {
      const x: Jd2 = { a, b: s / 86400 };
      const r = utcToTai(taiToUtc(x));
      expect(r.a, `${s}`).toBe(a);
      expect(Math.abs(diff(r, x)), `${s}`).toBeLessThanOrEqual(1e-9);
    }
  });

  it('a date splits and adds back', () => {
    const dates = [jdOf(1960, 1, 1), jdOf(1969, 7, 16, 13, 32), jdOf(1972, 6, 30, 23, 59, 59), jdOf(2000, 1, 1, 12), jdOf(2026, 11, 27, 6), jdOf(2060, 1, 1)];
    expect(dates).toHaveLength(6);
    for (const jd of dates) {
      const s = jd2(jd);
      expect(Number.isInteger(s.a - 0.5), `${jd}: a = ${s.a}`).toBe(true);
      expect(s.a).toBeLessThanOrEqual(jd);
      expect(s.b).toBeGreaterThanOrEqual(0);
      expect(s.b).toBeLessThan(1);
      expect(s.a + s.b).toBe(jd);
    }
  });

  it('UT1 from UTC', () => {
    for (const u of [...THREE, ...fixture.scales.map((s) => J(s.utc))])
      for (const d of [0.3, -0.3]) {
        const t = utcToUt1(u, d);
        expect(t.a).toBe(u.a);
        expect(Math.abs(diff(t, u) - d), `${u.a} + ${u.b}, ${d}`).toBeLessThanOrEqual(1e-9);
      }
  });

  it('Julian centuries', () => {
    expect(Math.abs(julianCenturies({ a: 2451545.0, b: 0 }))).toBeLessThanOrEqual(1e-15);
    expect(Math.abs(julianCenturies({ a: 2451545.0, b: 36525 }) - 1)).toBeLessThanOrEqual(1e-15);
    expect(Math.abs(julianCenturies({ a: 2433282.5, b: 0 }) + 0.5)).toBeLessThanOrEqual(1e-15);
    for (const t of THREE) expect(Math.abs(julianCenturies(t) - ((t.a - 2451545.0) + t.b) / 36525)).toBeLessThanOrEqual(1e-15);
  });

  it('TT − TAI is 32.184 s', () => {
    for (const t of [...THREE, ...fixture.scales.map((s) => J(s.tai))]) {
      const tt = taiToTt(t);
      expect(tt.a).toBe(t.a);
      expect(Math.abs(diff(tt, t) - 32.184), `${t.a} + ${t.b}`).toBeLessThanOrEqual(1e-9);
      const back = ttToTai(tt);
      expect(back.a).toBe(t.a);
      expect(Math.abs(diff(back, t))).toBeLessThanOrEqual(1e-9);
    }
  });

  it('UTC to TT and back', () => {
    expect(fixture.scales).toHaveLength(40);
    for (const s of fixture.scales) {
      const u = J(s.utc);
      const tt = utcToTt(u);
      expect(Math.abs(diff(tt, J(s.tt))), `${s.utc} vs ERFA`).toBeLessThanOrEqual(1e-6);
      expect(Math.abs(diff(ttToUtc(tt), u)), `${s.utc} back`).toBeLessThanOrEqual(1e-6);
    }
  });

  it('TDB − TT', () => {
    expect(fixture.tdb).toHaveLength(200);
    for (const t of fixture.tdb) expect(Math.abs(tdbMinusTt(J(t.tt)) - t.dtdb), `${t.tt}`).toBeLessThanOrEqual(50e-6);
  });

  it("Earth orientation equals today's", () => {
    const n = 30;
    const table = {
      from: '2024-03-01',
      predictedFrom: '2024-03-20',
      dut1: Array.from({ length: n }, (_, i) => -0.02 - 0.001 * i + (i >= 12 ? 1 : 0)),
      xp: Array.from({ length: n }, (_, i) => 0.05 + 0.0004 * i + 0.00001 * i * i),
      yp: Array.from({ length: n }, (_, i) => 0.4 - 0.0003 * i + 0.00002 * i * (i % 3)),
    };
    const start = jdOf(2024, 3, 1);
    const last = start + n - 1;
    const instants = Array.from({ length: 200 }, (_, k) => start - 5 + (40 * k) / 199);
    instants.push(start, last);
    const seen = { data: 0, held: 0 };
    for (const jd of instants) {
      const now = eopAt(table, jd2(jd));
      const old = eopAtToday(jd, table);
      expect(now.dut1, `dut1 at ${jd}`).toBe(old.dut1);
      expect(now.xp, `xp at ${jd}`).toBe(old.xp);
      expect(now.yp, `yp at ${jd}`).toBe(old.yp);
      const inside = jd >= start && jd <= last;
      expect(now.quality, `quality at ${jd}`).toBe(inside ? 'data' : 'held');
      seen[inside ? 'data' : 'held']++;
    }
    expect(seen.data).toBeGreaterThan(100);
    expect(seen.held).toBeGreaterThan(20);
    expect(eopAt(table, jd2(start)).quality).toBe('data');
    expect(eopAt(table, jd2(last)).quality).toBe('data');
    // the day before the leap second keeps its own UT1 − UTC to its end
    expect(eopAt(table, jd2(start + 11.5)).dut1).toBe(table.dut1[11]);
    for (const x of [NaN, Infinity, -Infinity]) {
      const now = eopAt(table, { a: x, b: 0 });
      const old = eopAtToday(x, table);
      expect(now.dut1, `dut1 at ${x}`).toBe(old.dut1);
      expect(now.xp, `xp at ${x}`).toBe(old.xp);
      expect(now.yp, `yp at ${x}`).toBe(old.yp);
      expect(now.quality).toBe('held');
    }
    expect(Number.isNaN(eopAt(table, { a: NaN, b: 0 }).dut1)).toBe(true);
    expect(eopAt(table, { a: Infinity, b: 0 }).dut1).toBe(table.dut1[n - 1]);
    expect(eopAt(table, { a: -Infinity, b: 0 }).dut1).toBe(table.dut1[0]);
    // a table whose first day does not parse gives NaN values, as today
    const bad: EopTable = { ...table, from: 'not a date' };
    expect(Number.isNaN(eopAt(bad, jd2(start)).dut1)).toBe(true);
  });

  it('no table', () => {
    for (const u of [jd2(jdOf(2024, 3, 10)), jd2(jdOf(1957, 10, 4)), { a: NaN, b: 0 }, { a: Infinity, b: 0 }])
      expect(eopAt(null, u)).toEqual({ dut1: 0, xp: 0, yp: 0, quality: 'none' });
  });

  it('a non-finite input gives NaN in every number returned', () => {
    const nums = (o: unknown): number[] => (typeof o === 'number' ? [o] : Object.values(o as object).flatMap(nums));
    const date = (a: number[], i: number): Jd2 => ({ a: a[i], b: a[i + 1] });
    const fns: [string, number[], (a: number[]) => unknown][] = [
      ['jd2', [2460000.75], (a) => jd2(a[0])],
      ['taiMinusUtc', [2460000.5, 0.25], (a) => taiMinusUtc(date(a, 0))],
      ['utcToTai', [2460000.5, 0.25], (a) => utcToTai(date(a, 0))],
      ['taiToUtc', [2460000.5, 0.25], (a) => taiToUtc(date(a, 0))],
      ['taiToTt', [2460000.5, 0.25], (a) => taiToTt(date(a, 0))],
      ['ttToTai', [2460000.5, 0.25], (a) => ttToTai(date(a, 0))],
      ['utcToTt', [2460000.5, 0.25], (a) => utcToTt(date(a, 0))],
      ['ttToUtc', [2460000.5, 0.25], (a) => ttToUtc(date(a, 0))],
      ['tdbMinusTt', [2460000.5, 0.25], (a) => tdbMinusTt(date(a, 0))],
      ['utcToUt1', [2460000.5, 0.25, 0.3], (a) => utcToUt1(date(a, 0), a[2])],
      ['julianCenturies', [2460000.5, 0.25], (a) => julianCenturies(date(a, 0))],
    ];
    for (const [name, base, f] of fns)
      for (const bad of [NaN, Infinity, -Infinity])
        base.forEach((_, i) => {
          const args = base.map((v, j) => (j === i ? bad : v));
          let r: number[] = [];
          expect(() => { r = nums(f(args)); }, `${name}(${args.join(', ')}) threw`).not.toThrow();
          expect(r.length, `${name}(${args.join(', ')}) returned no number`).toBeGreaterThan(0);
          expect(r.every(Number.isNaN), `${name}(${args.join(', ')}) returned ${r.join(', ')}`).toBe(true);
        });
  });
});
