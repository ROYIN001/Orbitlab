/**
 * WGS-84 geodesy of src/astro/base (PF-12) against ERFA (gd2gc, gc2gd) and
 * Moritz's closed forms for normal gravity, in mpmath
 * (tests/fixtures/astro/geodesy/, made by make_geodesy_fixture.py there).
 */
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/astro/geodesy/erfa-geodesy.json';
import { ecefFromGeodetic, ellipsoidNormal, enuBasis, geodeticFromEcef, normalGravity, type V3 } from '../src/astro/base/geodesy';
import { geodetic } from '../src/physics/geodesy';

const P = fixture.points;
const dist = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const wrapPi = (a: number) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

describe('astro geodesy', () => {
  it('matches ERFA: geodetic to Earth-fixed', () => {
    for (const p of P) expect(dist(ecefFromGeodetic(p.lat, p.lon, p.h), p)).toBeLessThanOrEqual(1e-6);
  });

  // The inputs of ERFA's closed-form forward transform are the truth for (x, y, z). ERFA's own inverse is one pass
  // of Halley's method, up to 2.6e-11 rad off in latitude near 20,000 km: a witness for h and lon only (S20 amendment 7).
  it('matches ERFA: Earth-fixed to geodetic', () => {
    for (const p of P) {
      const g = geodeticFromEcef(p);
      expect(Math.abs(g.lat - p.lat)).toBeLessThanOrEqual(1e-11);
      expect(Math.abs(g.h - p.h)).toBeLessThanOrEqual(1e-6);
      expect(Math.abs(g.h - p.hBack)).toBeLessThanOrEqual(1e-6);
      if (Math.abs(p.lat) !== Math.PI / 2) {
        expect(Math.abs(wrapPi(g.lon - p.lon))).toBeLessThanOrEqual(1e-11);
        expect(Math.abs(wrapPi(g.lon - p.lonBack))).toBeLessThanOrEqual(1e-11);
      }
    }
  });

  it('round trip', () => {
    for (const p of P) {
      const g = geodeticFromEcef(p);
      expect(dist(ecefFromGeodetic(g.lat, g.lon, g.h), p)).toBeLessThanOrEqual(1e-6);
    }
  });

  it('the normal is the direction height grows in', () => {
    for (const p of P.slice(0, 20)) {
      const n = ellipsoidNormal(p.lat, p.lon);
      const r = ecefFromGeodetic(p.lat, p.lon, p.h);
      const up = geodeticFromEcef({ x: r.x + 1000 * n.x, y: r.y + 1000 * n.y, z: r.z + 1000 * n.z });
      expect(Math.abs(up.h - p.h - 1000)).toBeLessThanOrEqual(1e-6);
      expect(Math.abs(up.lat - p.lat)).toBeLessThanOrEqual(1e-11);
      expect(Math.abs(wrapPi(up.lon - p.lon))).toBeLessThanOrEqual(1e-11);
      const { east, north, up: u } = enuBasis(p.lat, p.lon);
      for (const v of [east, north, u]) expect(Math.abs(dot(v, v) - 1)).toBeLessThanOrEqual(1e-15);
      for (const [a, b] of [[east, north], [east, u], [north, u]]) expect(Math.abs(dot(a, b))).toBeLessThanOrEqual(1e-15);
      expect(dist(cross(east, north), u)).toBeLessThanOrEqual(1e-15);
      expect(dist(u, n)).toBeLessThanOrEqual(1e-15);
      expect(dist(east, { x: -Math.sin(p.lon), y: Math.cos(p.lon), z: 0 })).toBeLessThanOrEqual(1e-15);
    }
  });

  it("agrees with the app's present geodesy below 2,000 km", () => {
    for (const p of P.filter((q) => q.h <= 2e6)) {
      const old = geodetic(p.x, p.y, p.z);
      const g = geodeticFromEcef(p);
      expect(Math.abs(g.lat - old.lat)).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(g.h - old.h)).toBeLessThanOrEqual(1e-3);
    }
  });

  it('normal gravity matches the closed forms', () => {
    expect(fixture.gravity).toHaveLength(7);
    for (const g of fixture.gravity) expect(Math.abs(normalGravity(g.lat) - g.gamma) / g.gamma).toBeLessThanOrEqual(5e-10);
  });

  it('longitude stays in (−π, π]', () => {
    const inRange = (lon: number) => lon > -Math.PI && lon <= Math.PI;
    for (const p of P) expect(inRange(geodeticFromEcef(p).lon)).toBe(true);
    for (const lon of [Math.PI, -Math.PI]) expect(inRange(geodeticFromEcef(ecefFromGeodetic(0.4, lon, 100)).lon)).toBe(true);
  });

  it('degenerate inputs end', () => {
    const inputs = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 7e6 }, { x: 0, y: 0, z: -7e6 }, { x: 1e12, y: 0, z: 1e12 }];
    const t0 = performance.now();
    const out = inputs.map((r) => geodeticFromEcef(r));
    expect(performance.now() - t0).toBeLessThan(50);
    out.forEach((g, i) => {
      const { x, y, z } = inputs[i];
      for (const v of [g.lat, g.lon, g.h]) expect(Number.isFinite(v), `(${x}, ${y}, ${z}) -> ${JSON.stringify(g)}`).toBe(true);
      expect(Math.abs(g.lat)).toBeLessThanOrEqual(Math.PI / 2);
      if (x === 0 && y === 0 && z !== 0) {
        expect(Math.abs(g.lat - Math.sign(z) * Math.PI / 2)).toBeLessThanOrEqual(1e-15);
        expect(Math.abs(g.h - (Math.abs(z) - 6378137 * (1 - 1 / 298.257223563)))).toBeLessThanOrEqual(1e-6);
      }
    });
  });

  it('a non-finite input gives NaN in every number returned', () => {
    const nums = (o: unknown): number[] => (typeof o === 'number' ? [o] : Object.values(o as object).flatMap(nums));
    const fns: [string, number[], (a: number[]) => unknown][] = [
      ['geodeticFromEcef', [4e6, 3e6, 5e6], (a) => geodeticFromEcef({ x: a[0], y: a[1], z: a[2] })],
      ['ecefFromGeodetic', [0.5, 1, 1000], (a) => ecefFromGeodetic(a[0], a[1], a[2])],
      ['ellipsoidNormal', [0.5, 1], (a) => ellipsoidNormal(a[0], a[1])],
      ['enuBasis', [0.5, 1], (a) => enuBasis(a[0], a[1])],
      ['normalGravity', [0.5], (a) => normalGravity(a[0])],
    ];
    for (const [name, base, f] of fns)
      for (const bad of [NaN, Infinity, -Infinity])
        base.forEach((_, i) => {
          const args = base.map((v, j) => (j === i ? bad : v));
          const r = nums(f(args));
          expect(r.every(Number.isNaN), `${name}(${args.join(', ')}) returned ${r.join(', ')}`).toBe(true);
        });
  });
});
