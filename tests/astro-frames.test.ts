/**
 * Reference frames of src/astro/base (PF-11) against ERFA's IAU 2000B chain (pnm00b, gst00b, gmst82, pom00,
 * c2teqx, bp00) and the full IAU 2006/2000A c2t06a (tests/fixtures/astro/frames/erfa-frames.json, made by
 * make_frames_fixture.py there), against Skyfield's TEME frame (skyfield-teme.json, made by make_teme_fixture.py),
 * and against the app's present temeToItrf in src/orbit/earth-orientation.ts.
 */
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/astro/frames/erfa-frames.json';
import skyfield from './fixtures/astro/frames/skyfield-teme.json';
import {
  EARTH_ROTATION_RATE, FRAME_BIAS, azElRange, biasPrecessionNutation, framesAt, gcrfToItrfState, gmst1982,
  greenwichSiderealTime, itrfToGcrfState, lvlhBasis, matMul, matT, matVec, polarMotion, rswBasis,
  type Frames, type Mat3, type State,
} from '../src/astro/base/frames';
import { jd2, type Jd2 } from '../src/astro/base/time';
import { ecefFromGeodetic, enuBasis, type V3 } from '../src/astro/base/geodesy';
import { temeToItrf as temeToItrfToday } from '../src/orbit/earth-orientation';
import { v3 } from '../src/physics/vec3';

const J = (p: number[]): Jd2 => ({ a: p[0], b: p[1] });
const I = fixture.instants;
const EOP = fixture.eop;
const TWO_PI = 2 * Math.PI;
const wrapPi = (a: number) => a - TWO_PI * Math.round(a / TWO_PI);

// local arithmetic, so that a reference value never goes through the module under test
const add = (a: V3, b: V3, s = 1): V3 => ({ x: a.x + s * b.x, y: a.y + s * b.y, z: a.z + s * b.z });
const scale = (a: V3, s: number): V3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const norm = (a: V3) => Math.hypot(a.x, a.y, a.z);
const unit = (a: V3) => scale(a, 1 / norm(a));
const dist = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const vec = (p: number[]): V3 => ({ x: p[0], y: p[1], z: p[2] });
const mv = (m: Mat3, v: V3): V3 => ({
  x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
  y: m[3] * v.x + m[4] * v.y + m[5] * v.z,
  z: m[6] * v.x + m[7] * v.y + m[8] * v.z,
});
const mmT = (a: Mat3, b: Mat3): number[] =>
  Array.from({ length: 9 }, (_, k) => {
    const i = Math.floor(k / 3), j = k % 3;
    return a[3 * i] * b[3 * j] + a[3 * i + 1] * b[3 * j + 1] + a[3 * i + 2] * b[3 * j + 2];
  });
const det = (m: Mat3) =>
  m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
/** The angle of the rotation a b^T, from its antisymmetric part (the sine of the angle). */
const angle = (a: Mat3, b: Mat3) => {
  const m = mmT(a, b);
  return 0.5 * Math.hypot(m[7] - m[5], m[2] - m[6], m[3] - m[1]);
};
const expectMat = (got: Mat3, want: number[], bound: number, what: string) => {
  expect(got, what).toHaveLength(9);
  for (let k = 0; k < 9; k++) expect(Math.abs(got[k] - want[k]), `${what} [${k}]`).toBeLessThanOrEqual(bound);
};

const R = 7.0e6;
const DIRECTIONS = [[1, 0, 0], [0.3, -0.8, 0.52], [-0.5, 0.5, 0.7071]].map((d) => scale(unit(vec(d)), R));
const eop = { dut1: EOP.dut1, xp: EOP.xp, yp: EOP.yp };

describe('astro reference frames', () => {
  it('the fixtures are whole', () => {
    expect(I).toHaveLength(25);
    expect(I.filter((i) => i.date >= '1990' && i.date <= '2041')).toHaveLength(22);
    expect(skyfield.instants).toHaveLength(20);
    expect(skyfield.instants.flatMap((s) => s.vectors)).toHaveLength(60);
    expect(eop.dut1).toBe(-0.1);
    expect(eop.xp).toBe(0.1 * (Math.PI / (180 * 3600)));
    expect(eop.yp).toBe(0.3 * (Math.PI / (180 * 3600)));
  });

  it('the matrix helpers', () => {
    // row-major; the products below were worked by hand (and checked with numpy), not by the module under test
    const a: Mat3 = [1, 2, 0, -1, 3, 4, 2, 0, -2];
    const b: Mat3 = [0, 1, 3, 2, -1, 1, 5, 2, 0];
    const v: V3 = { x: 3, y: -2, z: 1 };
    const ab = [4, -1, 5, 26, 4, 0, -10, -2, 6];
    const ba = [5, 3, -2, 5, 1, -6, 3, 16, 8];
    expect(ab).not.toEqual(ba);
    const [a0, b0, v0] = [[...a], [...b], { ...v }];
    const p = matMul(a, b);
    expect([...p]).toEqual(ab);
    expect([...p]).not.toEqual(ba);
    expect([...matMul(b, a)]).toEqual(ba);
    const t = matT(a);
    expect([...t]).toEqual([1, -1, 2, 2, 3, 0, 0, 4, -2]);
    const av = matVec(a, v);
    expect(av).toEqual({ x: -1, y: -5, z: 4 });
    // new results; the inputs are left as they were
    expect(p).not.toBe(a);
    expect(p).not.toBe(b);
    expect(t).not.toBe(a);
    expect(av).not.toBe(v);
    expect([...a]).toEqual(a0);
    expect([...b]).toEqual(b0);
    expect(v).toEqual(v0);
  });

  it('bias-precession-nutation equals ERFA', () => {
    for (const i of I) expectMat(biasPrecessionNutation(J(i.tt)), i.pnm00b, 1e-11, `pnm00b ${i.date}`);
  });

  it('sidereal times equal ERFA', () => {
    const inRange = (x: number) => x >= 0 && x < TWO_PI;
    for (const i of I) {
      const gst = greenwichSiderealTime(J(i.ut1));
      const g82 = gmst1982(J(i.ut1));
      const f = framesAt(J(i.utc), eop);
      for (const [what, got, want] of [
        ['gst00b', gst, i.gst00b], ['gmst82', g82, i.gmst82], ['framesAt gst', f.gst, i.gst00b], ['framesAt gmst82', f.gmst82, i.gmst82],
      ] as const) {
        expect(Math.abs(wrapPi(got - want)), `${what} ${i.date}`).toBeLessThanOrEqual(1e-11);
        expect(inRange(got), `${what} ${i.date} = ${got}`).toBe(true);
      }
    }
  });

  it('polar motion and frame bias equal ERFA', () => {
    expectMat(polarMotion(eop.xp, eop.yp), fixture.pom00, 1e-15, 'pom00');
    expectMat(FRAME_BIAS, fixture.rb, 1e-15, 'rb');
    for (const i of I) {
      const f = framesAt(J(i.utc), eop);
      expectMat(f.pole, fixture.pom00, 1e-15, `framesAt pole ${i.date}`);
      expectMat(f.gcrfToEme2000, fixture.rb, 1e-15, `framesAt gcrfToEme2000 ${i.date}`);
    }
  });

  it("GCRF to ITRF equals ERFA's equinox-based chain", () => {
    for (const i of I) expectMat(framesAt(J(i.utc), eop).gcrfToItrf, i.c2teqx, 1e-11, `c2teqx ${i.date}`);
  });

  it('GCRF to ITRF is within 2 mas of the full IAU 2006/2000A chain', () => {
    const years = I.filter((i) => i.date >= '1990' && i.date <= '2041');
    expect(years).toHaveLength(22);
    for (const i of years) {
      const a = framesAt(J(i.utc), eop).gcrfToItrf;
      expect(angle(a, i.c2t06a), `${i.date}`).toBeLessThanOrEqual(9.7e-9);
    }
  });

  it("TEME to ITRF agrees with the app's present one", () => {
    const table = { from: '2000-01-01', predictedFrom: '2000-01-02', dut1: [-0.1, -0.1], xp: [0.1, 0.1], yp: [0.3, 0.3] };
    let n = 0;
    for (const i of I) {
      const jd = i.utc[0] + i.utc[1];
      const f = framesAt(jd2(jd), eop);
      for (const r of DIRECTIONS) {
        const now = matVec(f.temeToItrf, r);
        const old = temeToItrfToday(v3(r.x, r.y, r.z), jd, table);
        expect(dist(now, old), `${i.date} (${r.x}, ${r.y}, ${r.z})`).toBeLessThanOrEqual(3e-2);
        n++;
      }
    }
    expect(n).toBe(75);
  });

  it('TEME to GCRF agrees with Skyfield', () => {
    let n = 0;
    for (const s of skyfield.instants) {
      const f = framesAt(J(s.utc), { dut1: s.dut1, xp: 0, yp: 0 });
      const back = matT(f.gcrfToTeme);
      for (const p of s.vectors) {
        expect(dist(matVec(back, vec(p.teme)), vec(p.gcrs)), `${s.utc} ${p.teme}`).toBeLessThanOrEqual(0.2);
        n++;
      }
    }
    expect(n).toBe(60);
  });

  it("velocity carries the Earth's rotation", () => {
    expect(EARTH_ROTATION_RATE).toBe(7.292115146706979e-5);
    const r = DIRECTIONS[1];
    const d = vec([0.6, 0.1, -0.4]);
    const v = scale(unit(add(d, r, -dot(d, r) / dot(r, r))), 7500);
    expect(Math.abs(dot(unit(v), unit(r)))).toBeLessThanOrEqual(1e-15);
    const states: State[] = [{ r, v: { x: 0, y: 0, z: 0 } }, { r, v }];
    const half = 0.5 / 86400;
    for (const i of I) {
      const u = J(i.utc);
      const f = framesAt(u, eop);
      const before = framesAt({ a: u.a, b: u.b - half }, eop);
      const after = framesAt({ a: u.a, b: u.b + half }, eop);
      for (const s of states) {
        const what = `${i.date} |v| = ${norm(s.v)}`;
        const out = gcrfToItrfState(f, s);
        expect(dist(out.r, mv(f.gcrfToItrf, s.r)), `${what} position`).toBeLessThanOrEqual(1e-7);
        // the centred difference over 1 s of the ITRF position of the point as it moves uniformly in GCRF
        const numeric = add(mv(after.gcrfToItrf, add(s.r, s.v, 0.5)), mv(before.gcrfToItrf, add(s.r, s.v, -0.5)), -1);
        expect(dist(out.v, numeric), `${what} velocity`).toBeLessThanOrEqual(2e-4);
        const back = itrfToGcrfState(f, out);
        expect(dist(back.r, s.r), `${what} round trip r`).toBeLessThanOrEqual(1e-7);
        expect(dist(back.v, s.v), `${what} round trip v`).toBeLessThanOrEqual(1e-10);
      }
    }
  });

  it('matrices are rotations', () => {
    let n = 0;
    for (const i of I) {
      const f = framesAt(J(i.utc), eop);
      const mats: [string, Mat3][] = [
        ['gcrfToItrf', f.gcrfToItrf], ['temeToItrf', f.temeToItrf], ['gcrfToTeme', f.gcrfToTeme],
        ['gcrfToEme2000', f.gcrfToEme2000], ['gcrfToPef', f.gcrfToPef], ['pole', f.pole],
        ['biasPrecessionNutation', biasPrecessionNutation(J(i.tt))], ['polarMotion', polarMotion(eop.xp, eop.yp)], ['FRAME_BIAS', FRAME_BIAS],
      ];
      for (const [name, m] of mats) {
        expect(m, `${name} ${i.date}`).toHaveLength(9);
        mmT(m, m).forEach((x, k) => expect(Math.abs(x - (k % 4 === 0 ? 1 : 0)), `${name} ${i.date} M Mt [${k}]`).toBeLessThanOrEqual(1e-14));
        expect(Math.abs(det(m) - 1), `${name} ${i.date} det`).toBeLessThanOrEqual(1e-14);
        n++;
      }
    }
    expect(n).toBe(25 * 9);
  });

  it('orbit frames', () => {
    const orthonormal = (a: V3, b: V3, c: V3, what: string) => {
      for (const e of [a, b, c]) expect(Math.abs(norm(e) - 1), `${what} norm`).toBeLessThanOrEqual(1e-14);
      for (const [p, q] of [[a, b], [a, c], [b, c]]) expect(Math.abs(dot(p, q)), `${what} dot`).toBeLessThanOrEqual(1e-14);
      expect(dist(cross(a, b), c), `${what} right-handed`).toBeLessThanOrEqual(1e-14);
    };
    const speeds = [[0.6, 0.1, -0.4], [0, 0, 1], [-1, 2, 0.5]].map((d) => scale(unit(vec(d)), 7500));
    let n = 0;
    for (const r of DIRECTIONS)
      for (const v of speeds) {
        const what = `r (${r.x}, ${r.y}, ${r.z}) v (${v.x}, ${v.y}, ${v.z})`;
        const s: State = { r, v };
        const rsw = rswBasis(s);
        orthonormal(rsw.r, rsw.s, rsw.w, `rsw ${what}`);
        const w = unit(cross(r, v));
        expect(dist(rsw.r, unit(r)), `rsw.r ${what}`).toBeLessThanOrEqual(1e-14);
        expect(dist(rsw.w, w), `rsw.w ${what}`).toBeLessThanOrEqual(1e-14);
        expect(dot(rsw.s, v), `rsw.s along the motion ${what}`).toBeGreaterThan(0);
        const lvlh = lvlhBasis(s);
        orthonormal(lvlh.x, lvlh.y, lvlh.z, `lvlh ${what}`);
        expect(dist(lvlh.z, scale(unit(r), -1)), `lvlh.z ${what}`).toBeLessThanOrEqual(1e-14);
        expect(dist(lvlh.y, scale(w, -1)), `lvlh.y ${what}`).toBeLessThanOrEqual(1e-14);
        n++;
      }
    expect(n).toBe(9);
    const nums = (o: unknown): number[] => (typeof o === 'number' ? [o] : Object.values(o as object).flatMap(nums));
    const r = DIRECTIONS[2];
    const degenerate: State[] = [
      { r, v: scale(r, 2) },
      { r, v: scale(r, -0.5) },
      { r: { x: 0, y: 0, z: 0 }, v: { x: 7500, y: 0, z: 0 } },
    ];
    for (const s of degenerate)
      for (const [name, out] of [['rswBasis', rswBasis(s)], ['lvlhBasis', lvlhBasis(s)]] as const) {
        const got = nums(out);
        expect(got, `${name} ${JSON.stringify(s)}`).toHaveLength(9);
        expect(got.every(Number.isNaN), `${name} ${JSON.stringify(s)} returned ${got.join(', ')}`).toBe(true);
      }
  });

  it('azimuth, elevation, range', () => {
    const sites = [[0.5, 1, 100], [-0.9, -2.5, 0], [0, Math.PI, 2000], [1.2, -0.1, -50], [-0.3, 3.1, 8000]];
    for (const [lat, lon, h] of sites) {
      const site = ecefFromGeodetic(lat, lon, h);
      const { east, north, up } = enuBasis(lat, lon);
      const at = (d: V3) => azElRange(site, lat, lon, add(site, d, 1e6));
      const z = at(up);
      expect(Math.abs(z.el - Math.PI / 2), `zenith el at ${lat}, ${lon}`).toBeLessThanOrEqual(1e-12);
      expect(Math.abs(z.range - 1e6), `zenith range at ${lat}, ${lon}`).toBeLessThanOrEqual(1e-6);
      const horizontal: [string, V3, number][] = [
        ['north', north, 0], ['east', east, Math.PI / 2], ['south', scale(north, -1), Math.PI], ['west', scale(east, -1), 1.5 * Math.PI],
      ];
      for (const [name, d, az] of horizontal) {
        const o = at(d);
        const what = `${name} at ${lat}, ${lon}: ${JSON.stringify(o)}`;
        expect(Math.abs(wrapPi(o.az - az)), `${what} az`).toBeLessThanOrEqual(1e-12);
        expect(o.az >= 0 && o.az < TWO_PI, `${what} az in [0, 2π)`).toBe(true);
        expect(Math.abs(o.el), `${what} el`).toBeLessThanOrEqual(1e-12);
        expect(Math.abs(o.range - 1e6), `${what} range`).toBeLessThanOrEqual(1e-6);
      }
    }
  });

  it('a non-finite input gives NaN in every number returned', () => {
    const nums = (o: unknown): number[] => (typeof o === 'number' ? [o] : Object.values(o as object).flatMap(nums));
    const KEYS = ['gcrfToItrf', 'temeToItrf', 'gcrfToTeme', 'gcrfToEme2000', 'gcrfToPef', 'pole'] as const;
    const f0 = framesAt({ a: 2460000.5, b: 0.25 }, eop);
    const flatF = [...KEYS.flatMap((k) => [...f0[k]]), f0.gst, f0.gmst82];
    expect(flatF).toHaveLength(56);
    const frames = (a: number[]): Frames => {
      const f = Object.fromEntries(KEYS.map((k, j) => [k, a.slice(9 * j, 9 * j + 9)]));
      return { ...f, gst: a[54], gmst82: a[55] } as unknown as Frames;
    };
    const state = (a: number[], i: number): State => ({ r: vec(a.slice(i, i + 3)), v: vec(a.slice(i + 3, i + 6)) });
    const s0 = [4e6, -3e6, 4.5e6, 3000, 6000, -1200];
    const fns: [string, number[], (a: number[]) => unknown][] = [
      ['biasPrecessionNutation', [2460000.5, 0.25], (a) => biasPrecessionNutation({ a: a[0], b: a[1] })],
      ['greenwichSiderealTime', [2460000.5, 0.25], (a) => greenwichSiderealTime({ a: a[0], b: a[1] })],
      ['gmst1982', [2460000.5, 0.25], (a) => gmst1982({ a: a[0], b: a[1] })],
      ['polarMotion', [eop.xp, eop.yp], (a) => polarMotion(a[0], a[1])],
      ['framesAt', [2460000.5, 0.25, -0.1, eop.xp, eop.yp], (a) => framesAt({ a: a[0], b: a[1] }, { dut1: a[2], xp: a[3], yp: a[4] })],
      ['gcrfToItrfState', [...flatF, ...s0], (a) => gcrfToItrfState(frames(a), state(a, 56))],
      ['itrfToGcrfState', [...flatF, ...s0], (a) => itrfToGcrfState(frames(a), state(a, 56))],
      ['rswBasis', s0, (a) => rswBasis(state(a, 0))],
      ['lvlhBasis', s0, (a) => lvlhBasis(state(a, 0))],
      ['azElRange', [4e6, 3e6, 3.5e6, 0.6, 0.64, 4.5e6, 3.2e6, 4e6], (a) => azElRange(vec(a.slice(0, 3)), a[3], a[4], vec(a.slice(5, 8)))],
    ];
    for (const [name, base, f] of fns)
      for (const bad of [NaN, Infinity, -Infinity])
        base.forEach((_, i) => {
          const args = base.map((v, j) => (j === i ? bad : v));
          const what = `${name}, position ${i} = ${bad}`;
          let r: number[] = [];
          expect(() => { r = nums(f(args)); }, `${what} threw`).not.toThrow();
          expect(r.length, `${what} returned no number`).toBeGreaterThan(0);
          expect(r.every(Number.isNaN), `${what} returned ${r.join(', ')}`).toBe(true);
        });
  });
});
