/**
 * The Sun and the Moon of src/astro/base (PF-14) against ERFA's moon98 and plan94 (tests/fixtures/astro/sun-moon/
 * erfa-sun-moon.json, made by make_erfa_fixture.py there) and against JPL DE421 through Skyfield (de421-sun-moon.json,
 * made by make_de421_fixture.py). All dates are TT, in two parts; metres and metres per second.
 */
import { describe, expect, it } from 'vitest';
import erfa from './fixtures/astro/sun-moon/erfa-sun-moon.json';
import de421 from './fixtures/astro/sun-moon/de421-sun-moon.json';
import { AU, EARTH_MOON_MASS_RATIO, earthMoonBarycentreState, moonState, sunState } from '../src/astro/base/sun-moon';
import { MOON98_B, MOON98_LR, PLAN94_EMB } from '../src/astro/base/sun-moon-tables';
import type { State } from '../src/astro/base/frames';
import type { Jd2 } from '../src/astro/base/time';
import type { V3 } from '../src/astro/base/geodesy';

const J = (p: number[]): Jd2 => ({ a: p[0], b: p[1] });
const vec = (p: number[]): V3 => ({ x: p[0], y: p[1], z: p[2] });

// local arithmetic, so that a reference value never goes through the module under test
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const norm = (a: V3) => Math.hypot(a.x, a.y, a.z);
const dist = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
/** The angle between two vectors, atan2(|a × b|, a · b), in degrees. */
const angleDeg = (a: V3, b: V3) => (Math.atan2(norm(cross(a, b)), dot(a, b)) * 180) / Math.PI;

type Row = { r: number[]; v: number[] };
const I = erfa.instants;
const D = de421.instants;

/** Position within `dr` m and velocity within `dv` m/s of the ERFA row, at all 65 instants. */
const holdsToErfa = (f: (tt: Jd2) => State, key: 'moon' | 'emb' | 'sun', dr: number, dv: number) => {
  expect(I).toHaveLength(65);
  for (const s of I) {
    const want = (s as unknown as Record<string, Row>)[key];
    const got = f(J(s.tt));
    const what = `${key} at ${s.label} (${s.tt[0]} + ${s.tt[1]})`;
    expect(dist(got.r, vec(want.r)), `${what} position`).toBeLessThanOrEqual(dr);
    expect(dist(got.v, vec(want.v)), `${what} velocity`).toBeLessThanOrEqual(dv);
  }
};

/** Direction within `deg`, distance within the fraction `rel`, velocity within `dv` m/s of DE421, at all 400 instants. */
const holdsToDe421 = (f: (tt: Jd2) => State, key: 'moon' | 'sun', deg: number, rel: number, dv: number) => {
  expect(D).toHaveLength(400);
  expect(de421.kernel.sha256).toBe('a20a7139da04cbc462454634918e9a9ca69127044e2cc9d4f9c16e238d2deedc');
  for (const s of D) {
    const want = s[key];
    const got = f(J(s.tt));
    const r = vec(want.r);
    const what = `${key} at ${s.tt[0]} + ${s.tt[1]}`;
    expect(angleDeg(got.r, r), `${what} direction (deg)`).toBeLessThanOrEqual(deg);
    expect(Math.abs(norm(got.r) - norm(r)) / norm(r), `${what} distance (fraction)`).toBeLessThanOrEqual(rel);
    expect(dist(got.v, vec(want.v)), `${what} velocity`).toBeLessThanOrEqual(dv);
  }
};

describe('astro Sun and Moon', () => {
  it('the Moon equals ERFA', () => {
    holdsToErfa(moonState, 'moon', 1e-3, 1e-8);
  });

  it('the Earth–Moon barycentre equals ERFA', () => {
    // the years 999 and 3001 are outside those plan94 is fitted to: ERFA's status is 1 there, and the numbers stand
    expect(I.filter((s) => s.status === 1).map((s) => s.label)).toEqual(['0999-01-01 00:00 TT', '3001-01-01 00:00 TT']);
    holdsToErfa(earthMoonBarycentreState, 'emb', 1e-1, 1e-6);
  });

  it("the Sun equals ERFA's two series combined", () => {
    // the Moon's term is 4,600 km of this, so a Sun taken from the barycentre alone fails here
    holdsToErfa(sunState, 'sun', 1e-1, 1e-6);
  });

  it("the tables have the source's shape", () => {
    const allNumbers = (xs: readonly number[]) => xs.every((x) => typeof x === 'number' && Number.isFinite(x));
    expect(MOON98_LR).toHaveLength(60);
    for (const row of MOON98_LR) {
      expect(row).toHaveLength(6);
      expect(allNumbers(row)).toBe(true);
    }
    expect(MOON98_B).toHaveLength(60);
    for (const row of MOON98_B) {
      expect(row).toHaveLength(5);
      expect(allNumbers(row)).toBe(true);
    }
    expect(PLAN94_EMB.amas).toBe(328900.5);
    const lengths: [keyof typeof PLAN94_EMB, number][] = [
      ['a', 3], ['dlm', 3], ['e', 3], ['pi', 3], ['dinc', 3], ['omega', 3],
      ['kp', 9], ['ca', 9], ['sa', 9],
      ['kq', 10], ['cl', 10], ['sl', 10],
    ];
    for (const [name, n] of lengths) {
      const xs = PLAN94_EMB[name] as unknown as readonly number[];
      expect(xs, `PLAN94_EMB.${String(name)}`).toHaveLength(n);
      expect(allNumbers(xs), `PLAN94_EMB.${String(name)}`).toBe(true);
    }
  });

  it("the node of the barycentre's orbit is the source's", () => {
    // the third row of omega in plan94.c; the barycentre's inclination is near zero, so the cases above cannot see it
    const OMEGA_EMB = [174.87317577, -8679.27034, 15.34191];
    expect(erfa.omega_emb).toEqual(OMEGA_EMB);
    expect([...PLAN94_EMB.omega]).toEqual(OMEGA_EMB);
  });

  it('the Moon against DE421', () => {
    holdsToDe421(moonState, 'moon', 0.01, 0.05 / 100, 0.5);
  });

  it('the Sun against DE421', () => {
    holdsToDe421(sunState, 'sun', 0.01, 0.1 / 100, 6);
  });

  it('constants', () => {
    expect(AU).toBe(149597870700);
    expect(EARTH_MOON_MASS_RATIO).toBe(81.30056);
  });

  it('a non-finite input gives NaN in every number returned', () => {
    const nums = (o: unknown): number[] => (typeof o === 'number' ? [o] : Object.values(o as object).flatMap(nums));
    const fns: [string, (tt: Jd2) => State][] = [
      ['moonState', moonState], ['earthMoonBarycentreState', earthMoonBarycentreState], ['sunState', sunState],
    ];
    const base = [2460000.5, 0.25];
    for (const [name, f] of fns)
      for (const bad of [NaN, Infinity, -Infinity])
        base.forEach((_, i) => {
          const args = base.map((v, j) => (j === i ? bad : v));
          const what = `${name}, position ${i} = ${bad}`;
          let r: number[] = [];
          expect(() => { r = nums(f({ a: args[0], b: args[1] })); }, `${what} threw`).not.toThrow();
          expect(r, `${what} returned ${r.join(', ')}`).toHaveLength(6);
          expect(r.every(Number.isNaN), `${what} returned ${r.join(', ')}`).toBe(true);
        });
  });
});
