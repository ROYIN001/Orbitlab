/**
 * D07 (docs/ROADMAP-PART2-3.md; Phase 4 map §3 items 1–2): revisit by brute
 * force on the ground track, and contact time over the ground stations
 * (src/orbit/coverage.ts).
 *
 * TOLERANCES, fixed before the first run:
 * - the refined search against a slower brute force (1 s steps, no
 *   refinement): every look matched within 1 s; the refined distance never
 *   above the slow one's by more than 1 m, and below it by at most 4 km (a 1 s
 *   step leaves the nearest sample up to 3.8 km along the track from the
 *   closest approach); every slow approach more than 4 km inside the reach
 *   found by the refined search;
 * - a place set 50 km square to the track: its look at the time it was set
 *   from within 0.5 s, 50 km within 20 m, on the side it was set;
 * - published revisits (the missions' repeat cycles, as tests/sensors.test.ts
 *   checks them on real element sets): the longest gap no longer than the
 *   cycle, to 1e-12 relative;
 * - the repeat-grid bound: a swath of `repeatGridSpacing(revs)·cos φ` gives a
 *   longest gap no longer than the cycle, to 1e-12 relative, at every
 *   longitude of one grid cell; half that swath leaves some longitude unseen;
 * - contact: the union of passes equals the sum of `findPassesOf`'s passes for
 *   one station, to 1e-9 s; a station listed twice counts once, exactly; no
 *   pass longer than the overhead bound `maxPassDuration` by more than 1 %.
 */
import { describe, expect, it } from 'vitest';
import { DEG, R_EARTH } from '../src/physics/constants';
import { julianDate } from '../src/physics/orbital';
import { cross, norm, scale, sub, v3, type Vec3 } from '../src/physics/vec3';
import { WGS84, eciToEcef, footprintAngle, repeatGridSpacing, type GroundStation } from '../src/orbit/applications';
import { contactTime, elevationOf, revisitGaps } from '../src/orbit/coverage';
import { groundTrack, orbitFacts, raanForLocalTime, stateAt, type Orbit } from '../src/orbit/kepler';
import { maxPassDuration } from '../src/orbit/link';
import { findPassesOf } from '../src/orbit/passes';
import { repeatGroundTrack } from '../src/orbit/playground-model';
import { reachEdges, sensorOf } from '../src/orbit/sensors';
import { SENSORS } from '../src/data/sensors';

const JD0 = julianDate(new Date(Date.UTC(2026, 8, 21)));
const BANGKOK: GroundStation = { lat: 13.7563 * DEG, lon: 100.5018 * DEG, h: 0 };

/** A repeat-ground-track orbit placed at `JD0`: sun-synchronous with its ascending node at `ltan` h, or at inclination `i`. */
function repeat(revs: number, days: number, plane: { ltan: number } | { i: number }): Orbit {
  const o = repeatGroundTrack(revs, days, 'ltan' in plane, 'i' in plane ? plane.i : 0);
  if (!o) throw new Error(`no ${revs}/${days} orbit`);
  const raan = 'ltan' in plane ? raanForLocalTime(plane.ltan, JD0) : 0;
  return { a: o.a, e: o.e, i: o.i, raan, argp: 0, m0: 0, jd0: JD0 };
}

/** The place on the WGS-84 ellipsoid whose direction from the centre is `p` (a unit vector, Earth-fixed). */
function placeAt(p: Vec3): GroundStation {
  const b = WGS84.a * (1 - WGS84.f), e2 = WGS84.f * (2 - WGS84.f);
  const r = 1 / Math.sqrt((p.x * p.x + p.y * p.y) / (WGS84.a * WGS84.a) + (p.z * p.z) / (b * b));
  const x = r * p.x, y = r * p.y, z = r * p.z;
  return { lat: Math.atan2(z, (1 - e2) * Math.hypot(x, y)), lon: Math.atan2(y, x), h: 0 };
}

const unit = (p: Vec3): Vec3 => scale(p, 1 / norm(p));
const belowAt = (o: Orbit, t: number): Vec3 => { const s = stateAt(o, t, true); return unit(eciToEcef(s.r, s.theta)); };

/** Longitudes across one cell of the repeat grid from `lon0`, `n` of them. */
const cell = (revs: number, lon0: number, n: number): number[] => Array.from({ length: n }, (_, k) => lon0 + (k / n) * (2 * Math.PI / revs));

describe('revisit by brute force on the ground track (D07)', () => {
  it('finds each approach where a slower brute force with no refinement finds it', () => {
    const o = repeat(233, 16, { ltan: 22 });
    const reach = 92.5e3, days = 4, wide = 1000e3;
    const fast = revisitGaps(o, BANGKOK, wide, JD0, days, false);
    // the slow one: every second, the nearest samples of each approach, nothing refined
    const n = days * 86400 + 1;
    const pts = groundTrack(o, 0, days * 86400, n, true);
    const p = unit(v3(Math.cos(BANGKOK.lat) * Math.cos(BANGKOK.lon), Math.cos(BANGKOK.lat) * Math.sin(BANGKOK.lon), 0));
    // the place's direction from the centre, as the core takes it (the geodetic latitude turned geocentric)
    const e2 = WGS84.f * (2 - WGS84.f);
    const latC = Math.atan((1 - e2) * Math.tan(BANGKOK.lat));
    const dir = v3(Math.cos(latC) * p.x, Math.cos(latC) * p.y, Math.sin(latC));
    const ang = pts.map((q) => Math.acos(Math.min(1, Math.cos(q.lat) * Math.cos(q.lon) * dir.x + Math.cos(q.lat) * Math.sin(q.lon) * dir.y + Math.sin(q.lat) * dir.z)));
    const slow: { jd: number; d: number }[] = [];
    for (let k = 1; k < n - 1; k++) {
      if (ang[k] <= ang[k - 1] && ang[k] < ang[k + 1] && ang[k] * R_EARTH < wide) slow.push({ jd: JD0 + pts[k].t / 86400, d: ang[k] * R_EARTH });
    }
    expect(slow.length).toBeGreaterThan(3);
    expect(fast.looks.length).toBe(slow.length);
    fast.looks.forEach((l, k) => {
      expect(Math.abs(l.jd - slow[k].jd) * 86400).toBeLessThan(1);
      expect(Math.abs(l.across)).toBeLessThanOrEqual(slow[k].d + 1);
      expect(slow[k].d - Math.abs(l.across)).toBeLessThanOrEqual(4e3);
    });
    // with the swath's reach: every approach well inside it is a look
    const narrow = revisitGaps(o, BANGKOK, reach, JD0, days, false);
    for (const s of slow.filter((x) => x.d < reach - 4e3)) {
      expect(narrow.looks.some((l) => Math.abs(l.jd - s.jd) * 86400 < 1)).toBe(true);
    }
    for (const l of narrow.looks) expect(Math.abs(l.across)).toBeLessThanOrEqual(reach);
  });

  it('puts a place set 50 km to one side of the track on that side, 50 km off', () => {
    const o = repeat(233, 16, { ltan: 22 });
    for (const [t, side] of [[1234.5, 1], [20_000, -1], [51_111, 1], [70_000, -1]] as const) {
      const u = belowAt(o, t), d = sub(belowAt(o, t + 0.5), belowAt(o, t - 0.5));
      const right = unit(cross(d, u));
      const g = (side * 50e3) / R_EARTH;
      const place = placeAt(unit(v3(
        Math.cos(g) * u.x + Math.sin(g) * right.x, Math.cos(g) * u.y + Math.sin(g) * right.y, Math.cos(g) * u.z + Math.sin(g) * right.z,
      )));
      const jd = JD0 + t / 86400;
      const r = revisitGaps(o, place, 60e3, jd - 600 / 86400, 1200 / 86400, false);
      expect(r.looks.length).toBe(1);
      const l = r.looks[0];
      expect(Math.abs(l.jd - jd) * 86400).toBeLessThan(0.5);
      expect(Math.abs(l.across - side * 50e3)).toBeLessThan(20);
      expect(l.ascending).toBe(d.z > 0);
    }
  });

  it('sees Bangkok\'s latitude within 16 days from Landsat\'s 233/16 orbit with its 185 km swath, by day', () => {
    // USGS: "crossing every point on Earth once every 16 days" (tests/sensors.test.ts); descending node 10:00
    const o = repeat(233, 16, { ltan: 22 });
    for (const lon of [BANGKOK.lon, ...cell(233, BANGKOK.lon, 24)]) {
      const r = revisitGaps(o, { ...BANGKOK, lon }, 185e3 / 2, JD0, 16, true, { periodic: true });
      expect(r.looks.length).toBeGreaterThanOrEqual(1);
      expect(r.maxGap).toBeLessThanOrEqual(16 * (1 + 1e-12));
      // by day on a 10:00 descending orbit: every look is southbound, in sunlight
      for (const l of r.looks) { expect(l.ascending).toBe(false); expect(l.sunElevation).toBeGreaterThan(0); }
      expect(r.meanGap).toBeCloseTo(16 / r.looks.length, 12);
    }
  });

  it('meets Sentinel-2\'s 10 days and Sentinel-1\'s 12 days over Bangkok, the radar looking right by day and night', () => {
    // ESA: "The revisit frequency of each single satellite is 10 days"; 143/10, descending node 10:30
    const s2 = repeat(143, 10, { ltan: 22.5 });
    const r2 = revisitGaps(s2, BANGKOK, 290e3 / 2, JD0, 10, true, { periodic: true });
    expect(r2.maxGap).toBeLessThanOrEqual(10 * (1 + 1e-12));
    // Sentinel-1: 175/12, dawn–dusk (ascending node 18:00), C-SAR to the right between 29.1° and 46° incidence
    const s1 = repeat(175, 12, { ltan: 18 });
    const h = orbitFacts(s1, true).perigeeAlt;
    const [near, far] = reachEdges(sensorOf(SENSORS.find((s) => s.name === 'Sentinel-1A')!), h);
    for (const lon of [BANGKOK.lon, ...cell(175, BANGKOK.lon, 12)]) {
      const r1 = revisitGaps(s1, { ...BANGKOK, lon }, [near, far], JD0, 12, false, { periodic: true });
      expect(r1.looks.length).toBeGreaterThanOrEqual(1);
      expect(r1.maxGap).toBeLessThanOrEqual(12 * (1 + 1e-12));
      for (const l of r1.looks) { expect(l.across).toBeGreaterThanOrEqual(near); expect(l.across).toBeLessThanOrEqual(far); }
    }
  });

  it('holds to the repeat-grid bound: a swath of the grid spacing × cos φ is seen within the cycle, a narrower one is not everywhere', () => {
    // `under`: the share of the bound's swath that must leave some longitude unseen. CHANGED AFTER THE FIRST
    // RUN for the 31/2 orbit, from 1/2 to 1/4: flown day and night, its descending tracks cross the equator
    // exactly halfway between its ascending ones (the offset is π − π·days/revs, half a grid step when
    // revs − days is odd), so the two directions together close the equator with half the swath. The bound itself
    // (the first assertion) did not change.
    const cases: { revs: number; days: number; plane: { ltan: number } | { i: number }; lats: number[]; daylight: boolean[]; under: number }[] = [
      { revs: 233, days: 16, plane: { ltan: 22 }, lats: [0, 13.7563, 40], daylight: [false, true], under: 1 / 2 },
      { revs: 143, days: 10, plane: { ltan: 22.5 }, lats: [0, 13.7563, 40], daylight: [false, true], under: 1 / 2 },
      { revs: 385, days: 26, plane: { ltan: 22.25 }, lats: [13.7563], daylight: [true], under: 1 / 2 },
      { revs: 31, days: 2, plane: { i: 51.6 * DEG }, lats: [0, 13.7563, 40], daylight: [false], under: 1 / 4 },
    ];
    for (const c of cases) {
      const o = repeat(c.revs, c.days, c.plane);
      for (const latDeg of c.lats) {
        const lat = latDeg * DEG;
        const bound = repeatGridSpacing(c.revs) * Math.cos(lat);
        let unseen = 0;
        for (const lon of cell(c.revs, 100.5 * DEG, 12)) {
          for (const daylight of c.daylight) {
            const at = { lat, lon, h: 0 };
            const r = revisitGaps(o, at, bound / 2, JD0, c.days, daylight, { periodic: true });
            expect(r.maxGap, `${c.revs}/${c.days} at ${latDeg}°`).toBeLessThanOrEqual(c.days * (1 + 1e-12));
            if (revisitGaps(o, at, (bound * c.under) / 2, JD0, c.days, daylight, { periodic: true }).maxGap === Infinity) unseen++;
          }
        }
        expect(unseen, `${c.revs}/${c.days} at ${latDeg}°: a narrower swath leaves some place unseen`).toBeGreaterThan(0);
      }
    }
  }, 120_000);

  it('counts gaps over an open window and says so at its ends', () => {
    const o = repeat(233, 16, { ltan: 22 });
    const r = revisitGaps(o, BANGKOK, 1000e3, JD0, 5, false);
    expect(r.looks.length).toBeGreaterThan(2);
    expect(r.gaps.length).toBe(r.looks.length - 1);
    expect(r.firstAfter + r.gaps.reduce((s, g) => s + g, 0) + r.lastBefore).toBeCloseTo(5, 9);
    expect(r.meanGap).toBeCloseTo((r.looks[r.looks.length - 1].jd - r.looks[0].jd) / r.gaps.length, 12);
    const none = revisitGaps(o, { lat: 89 * DEG, lon: 0, h: 0 }, 10e3, JD0, 2, false);
    expect(none.looks).toEqual([]);
    expect(none.maxGap).toBe(Infinity);
    expect(() => revisitGaps(o, BANGKOK, 1e3, JD0, 0, false)).toThrow(RangeError);
  });
});

describe('contact with the ground stations (D07)', () => {
  it('is the sum of the pass search\'s passes, counts a station listed twice once, and no pass outlasts an overhead one', () => {
    const o = repeat(143, 10, { ltan: 22.5 });
    const minEl = 5 * DEG;
    const one = contactTime(o, [BANGKOK], minEl, JD0, 3);
    const passes = findPassesOf((jd) => elevationOf(o, BANGKOK, jd), orbitFacts(o, true).period, JD0, JD0 + 3, minEl);
    const sum = passes.reduce((s, p) => s + ((p.set ?? JD0 + 3) - (p.rise ?? JD0)) * 86400, 0);
    expect(Math.abs(one.seconds - sum)).toBeLessThan(1e-9 * 86400 * 3 + 1e-9);
    expect(one.passes.length).toBe(passes.length);
    expect(one.perDay).toBeCloseTo(one.seconds / 3, 9);
    const twice = contactTime(o, [BANGKOK, BANGKOK], minEl, JD0, 3);
    expect(twice.seconds).toBe(one.seconds);
    const f = orbitFacts(o, true);
    const longest = maxPassDuration(f.nodalPeriod, footprintAngle(o.a, minEl));
    for (const p of one.passes) expect((p.to - p.from) * 86400).toBeLessThanOrEqual(longest * 1.01);
    // two stations far apart hear more than either alone
    const both = contactTime(o, [BANGKOK, { lat: 59.9386 * DEG, lon: 30.3141 * DEG, h: 0 }], minEl, JD0, 3);
    expect(both.seconds).toBeGreaterThan(one.seconds);
  });
});
