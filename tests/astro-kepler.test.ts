/**
 * keplerUniversal of src/astro/base/kepler.ts (PF-15) against an 80-digit solution by the classical route
 * (tests/fixtures/astro/kepler/mpmath-kepler.json, made by make_kepler_fixture.py there), 888 cases from e = 0 to 10.
 * Metres, metres per second, seconds; mu = 3.986004418e14 m^3/s^2.
 */
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/astro/kepler/mpmath-kepler.json';
import { keplerUniversal } from '../src/astro/base/kepler';
import type { State } from '../src/astro/base/frames';
import { propagateKepler } from '../src/physics/orbital';

type V3 = { x: number; y: number; z: number };
type Case = { e: number; rp: number; nu: number; r: number[]; v: number[]; dt: number; r1: number[]; v1: number[] };

const MU = fixture.mu;
const CASES = fixture.cases as Case[];
const vec = (p: number[]): V3 => ({ x: p[0], y: p[1], z: p[2] });
const state = (c: Case): State => ({ r: vec(c.r), v: vec(c.v) });
const label = (c: Case) => `e = ${c.e}, r_p = ${c.rp}, nu = ${c.nu}, dt = ${c.dt}`;

// local arithmetic, so that a reference value never goes through the module under test
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const norm = (a: V3) => Math.hypot(a.x, a.y, a.z);
const dist = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const nums = (s: State): number[] => [s.r.x, s.r.y, s.r.z, s.v.x, s.v.y, s.v.z];

describe('keplerUniversal', () => {
  it('the fixture has 888 cases', () => {
    expect(CASES).toHaveLength(888);
    expect(MU).toBe(3.986004418e14);
  });

  it('equals the 80-digit solution, every conic', () => {
    for (const c of CASES) {
      const got = keplerUniversal(state(c), c.dt, MU);
      expect(dist(got.r, vec(c.r1)), `${label(c)} position`).toBeLessThanOrEqual(1e-3);
      expect(dist(got.v, vec(c.v1)), `${label(c)} velocity`).toBeLessThanOrEqual(1e-7);
    }
  });

  it('a step of zero returns the state', () => {
    const firsts = new Map<number, Case>();
    for (const c of CASES) if (!firsts.has(c.e)) firsts.set(c.e, c);
    expect(firsts.size).toBe(19);
    for (const c of firsts.values()) {
      const s = state(c);
      const got = nums(keplerUniversal(s, 0, MU));
      nums(s).forEach((x, i) => expect(got[i], `e = ${c.e}, number ${i}`).toBe(x));
    }
  });

  it('there and back', () => {
    let n = 0;
    for (const c of CASES) {
      if (c.dt !== 3600 && c.dt !== 86400) continue;
      n++;
      const s = state(c);
      const back = keplerUniversal(keplerUniversal(s, c.dt, MU), -c.dt, MU);
      expect(dist(back.r, s.r), `${label(c)} position`).toBeLessThanOrEqual(1e-2);
      expect(dist(back.v, s.v), `${label(c)} velocity`).toBeLessThanOrEqual(1e-5);
    }
    expect(n).toBe(296);
  });

  it('keeps angular momentum and energy', () => {
    const energy = (s: State) => dot(s.v, s.v) / 2 - MU / norm(s.r);
    let n = 0;
    for (const c of CASES) {
      if (c.dt !== 3600 && c.dt !== 86400) continue;
      n++;
      const s = state(c);
      const g = keplerUniversal(s, c.dt, MU);
      const h0 = norm(cross(s.r, s.v));
      const h1 = norm(cross(g.r, g.v));
      expect(Math.abs(h1 - h0) / h0, `${label(c)} angular momentum`).toBeLessThanOrEqual(1e-11);
      expect(Math.abs(energy(g) - energy(s)), `${label(c)} energy`).toBeLessThanOrEqual((1e-11 * MU) / norm(s.r));
    }
    expect(n).toBe(296);
  });

  it('ends on extreme inputs', () => {
    // the block `extreme` holds the three inputs, solved at 120 digits: e = 10 with dt = 1e12 s, e = 0.001 with dt = +-1e9 s
    const X = fixture.extreme.cases as Case[];
    expect(X.map((c) => [c.e, c.dt])).toEqual([[10, 1e12], [0.001, 1e9], [0.001, -1e9]]);
    for (const c of X) {
      const t0 = performance.now();
      const got = keplerUniversal(state(c), c.dt, MU);
      const ms = performance.now() - t0;
      const n = nums(got);
      expect(n, `${label(c)}`).toHaveLength(6);
      expect(n.every(Number.isFinite), `${label(c)} returned ${n.join(', ')}`).toBe(true);
      expect(ms, `${label(c)} took ${ms} ms`).toBeLessThan(200);
      if (c.e === 10) {
        expect(dist(got.r, vec(c.r1)) / norm(vec(c.r1)), `${label(c)} position, relative`).toBeLessThanOrEqual(1e-9);
        expect(dist(got.v, vec(c.v1)) / norm(vec(c.v1)), `${label(c)} velocity, relative`).toBeLessThanOrEqual(1e-9);
      } else {
        expect(dist(got.r, vec(c.r1)), `${label(c)} position`).toBeLessThanOrEqual(1);
        expect(dist(got.v, vec(c.v1)), `${label(c)} velocity`).toBeLessThanOrEqual(1e-3);
      }
    }
  });

  it('another mu, another orientation', () => {
    const H = fixture.heliocentric;
    expect(H.mu).toBe(1.32712440018e20);
    expect(H.cases).toHaveLength(120);
    for (const c of H.cases as Case[]) {
      const got = keplerUniversal(state(c), c.dt, H.mu);
      const r1 = vec(c.r1);
      const v1 = vec(c.v1);
      expect(dist(got.r, r1) / norm(r1), `${label(c)} position, relative`).toBeLessThanOrEqual(1e-11);
      expect(dist(got.v, v1) / norm(v1), `${label(c)} velocity, relative`).toBeLessThanOrEqual(1e-11);
    }
  });

  it('very short steps', () => {
    expect(fixture.short.cases).toHaveLength(24);
    for (const c of fixture.short.cases as Case[]) {
      const got = keplerUniversal(state(c), c.dt, MU);
      expect(dist(got.r, vec(c.r1)), `${label(c)} position`).toBeLessThanOrEqual(1e-3);
      expect(dist(got.v, vec(c.v1)), `${label(c)} velocity`).toBeLessThanOrEqual(1e-7);
    }
  });

  it("agrees with the app's present elliptic path where that is sound", () => {
    let n = 0;
    for (const c of CASES) {
      if (!(c.e <= 0.99) || c.dt === 259200) continue;
      n++;
      const got = keplerUniversal(state(c), c.dt, MU);
      const old = propagateKepler(vec(c.r), vec(c.v), c.dt);
      expect(dist(got.r, old.r), `${label(c)} position`).toBeLessThanOrEqual(0.5);
      expect(dist(got.v, old.v), `${label(c)} velocity`).toBeLessThanOrEqual(5e-4);
    }
    expect(n).toBe(240);
  });

  it('bad input', () => {
    const base = CASES.find((c) => c.e === 0.6 && c.rp === 6.578e6 && c.nu === 0.8)!;
    const s = state(base);
    const run = (what: string, st: State, dt: number, mu: number) => {
      let got: number[] = [];
      expect(() => { got = nums(keplerUniversal(st, dt, mu)); }, `${what} threw`).not.toThrow();
      expect(got, `${what} returned ${got.join(', ')}`).toHaveLength(6);
      expect(got.every(Number.isNaN), `${what} returned ${got.join(', ')}`).toBe(true);
    };
    for (const dt of [0, 600]) {
      run(`r = 0, dt = ${dt}`, { r: { x: 0, y: 0, z: 0 }, v: s.v }, dt, MU);
      run(`mu = 0, dt = ${dt}`, s, dt, 0);
      run(`mu < 0, dt = ${dt}`, s, dt, -MU);
    }
    for (const bad of [NaN, Infinity, -Infinity]) {
      for (const key of ['r', 'v'] as const)
        for (const comp of ['x', 'y', 'z'] as const) {
          const st: State = { r: { ...s.r }, v: { ...s.v } };
          st[key][comp] = bad;
          run(`${key}.${comp} = ${bad}`, st, 600, MU);
          run(`${key}.${comp} = ${bad}, dt = 0`, st, 0, MU);
        }
      run(`dt = ${bad}`, s, bad, MU);
      run(`mu = ${bad}`, s, 600, bad);
      run(`mu = ${bad}, dt = 0`, s, 0, bad);
    }
  });
});
