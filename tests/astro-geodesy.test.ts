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

  it('matches ERFA: Earth-fixed to geodetic', () => {
    for (const p of P) {
      const g = geodeticFromEcef(p);
      expect(Math.abs(g.lat - p.latBack)).toBeLessThanOrEqual(1e-11);
      expect(Math.abs(g.h - p.hBack)).toBeLessThanOrEqual(1e-6);
      if (Math.abs(p.lat) !== Math.PI / 2) expect(Math.abs(wrapPi(g.lon - p.lonBack))).toBeLessThanOrEqual(1e-11);
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
      const up = geodeticFromEcef({ x: r.x + n.x, y: r.y + n.y, z: r.z + n.z });
      expect(Math.abs(up.h - p.h - 1)).toBeLessThanOrEqual(1e-8);
      const { east, north, up: u } = enuBasis(p.lat, p.lon);
      for (const v of [east, north, u]) expect(Math.abs(dot(v, v) - 1)).toBeLessThanOrEqual(1e-15);
      for (const [a, b] of [[east, north], [east, u], [north, u]]) expect(Math.abs(dot(a, b))).toBeLessThanOrEqual(1e-15);
      expect(dist(cross(east, north), u)).toBeLessThanOrEqual(1e-15);
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
    const t0 = performance.now();
    const origin = geodeticFromEcef({ x: 0, y: 0, z: 0 });
    const nan = geodeticFromEcef({ x: NaN, y: 1, z: 2 });
    const far = geodeticFromEcef({ x: 1e12, y: 0, z: 1e12 });
    expect(performance.now() - t0).toBeLessThan(50);
    expect([nan.lat, nan.lon, nan.h].every(Number.isNaN)).toBe(true);
    expect(origin).toBeDefined();
    expect(far).toBeDefined();
  });
});
