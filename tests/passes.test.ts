/**
 * Passes over a place (roadmap R03) against Skyfield — an independent
 * implementation of the look angles, the pass search, the Earth's shadow and
 * the Sun (JPL DE421) — for the same element sets: the ISS, THEOS-2 and a GPS
 * satellite, over Bangkok and Saint Petersburg, three days each
 * (tests/fixtures/passes/, made by make_pass_fixtures.py there). The Earth
 * turns by the IERS's UT1 of the bundled snapshot, as in the app (P2.5).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fixture from './fixtures/passes/skyfield-passes.json';
import { DARK_SKY, findPasses, findPassesOf, inSunlight, lookFrom, sunElevation } from '../src/orbit/passes';
import { elementsFromRecord } from '../src/orbit/omm';
import { skyObjects, skyState } from '../src/orbit/real-sky';
import type { OmmRecord } from '../src/provider/satellites';
import { DEG, R_EARTH } from '../src/physics/constants';
import { gmst, wrap2pi } from '../src/physics/orbital';
import { orbitFacts, stateAt, type Orbit } from '../src/orbit/kepler';
import { eciToEcef, footprintAngle, lookAngles } from '../src/orbit/applications';
import { setEarthOrientation } from '../src/orbit/earth-orientation';
import { parseSnapshot } from '../src/provider/data-provider';

const EOP_FILE = import.meta.glob('../public/data/earth-orientation.json', { import: 'default', eager: true }) as Record<string, unknown>;
beforeAll(() => setEarthOrientation(parseSnapshot(Object.values(EOP_FILE)[0], 'earthOrientation').data));
afterAll(() => setEarthOrientation(null));

type Event = { norad: number; station: string; event: 'rise' | 'culminate' | 'set'; time: string; alt: number; az: number; km: number; sunlit: boolean; sunAlt: number };
const F = fixture as unknown as { stations: Record<string, [number, number]>; sets: OmmRecord[]; passes: Event[]; shadow: { time: string; sunlit: boolean }[] };
const jdOf = (iso: string) => Date.parse(iso) / 86400e3 + 2440587.5;
const station = (id: string) => ({ lat: F.stations[id][0] * DEG, lon: F.stations[id][1] * DEG, h: 0 });

const objectOf = (norad: number) => skyObjects([elementsFromRecord(F.sets.find((s) => s.NORAD_CAT_ID === norad)!)], 'imported')[0];

/** Our passes as Skyfield lists them: rise, each highest point, set, in time order. */
function ourEvents(norad: number, id: string) {
  const rec = F.sets.find((s) => s.NORAD_CAT_ID === norad)!;
  const o = objectOf(norad);
  const epoch = Date.parse(`${rec.EPOCH}Z`);
  const t0 = Math.floor(epoch / 3600e3) * 3600e3 / 86400e3 + 2440587.5;
  const out: { event: string; jd: number; el: number; az: number; range: number; sunlit: boolean; sunEl: number }[] = [];
  for (const p of findPasses(o, station(id), t0, t0 + 3)) {
    if (p.rise) out.push({ event: 'rise', ...p.rise });
    for (const c of p.culminations) out.push({ event: 'culminate', ...c });
    if (p.set) out.push({ event: 'set', ...p.set });
  }
  return out.sort((a, b) => a.jd - b.jd);
}

const azDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe('passes against Skyfield (R03)', () => {
  for (const norad of [25544, 58016, 26407]) {
    for (const id of Object.keys(F.stations)) {
      it(`finds the same passes of ${norad} over ${id}, at the same times and angles`, () => {
        const ref = F.passes.filter((p) => p.norad === norad && p.station === id);
        const ours = ourEvents(norad, id);
        expect(ours.map((e) => e.event)).toEqual(ref.map((e) => e.event));
        const o = objectOf(norad);
        let worstRiseSet = 0, worstTop = 0, worstEl = 0, worstAz = 0;
        ref.forEach((r, k) => {
          const mine = ours[k], jd = jdOf(r.time);
          const dt = Math.abs(mine.jd - jd) * 86400;
          if (r.event === 'culminate') {
            // a highest point is flat: its time is loose, its height is not
            worstTop = Math.max(worstTop, dt);
            worstEl = Math.max(worstEl, Math.abs(mine.el / DEG - r.alt));
          } else worstRiseSet = Math.max(worstRiseSet, dt);
          // the look angles at Skyfield's own moment: the geometry alone, apart from the search
          const look = lookFrom(o, station(id), jd)!;
          expect(Math.abs(look.el / DEG - r.alt)).toBeLessThan(0.02);
          // near the zenith the azimuth turns fast: held in arc across the sky, not in degrees of azimuth
          worstAz = Math.max(worstAz, azDiff(look.az / DEG, r.az) * Math.cos(r.alt * DEG));
          expect(Math.abs(look.range / 1000 - r.km)).toBeLessThan(1);
          expect(Math.abs(look.sunEl / DEG - r.sunAlt)).toBeLessThan(0.05);
          expect(look.sunlit).toBe(r.sunlit);
        });
        expect(worstRiseSet).toBeLessThan(2);
        expect(worstTop).toBeLessThan(5);
        expect(worstEl).toBeLessThan(0.02);
        expect(worstAz).toBeLessThan(0.02);
      });
    }
  }

  it('puts the ISS into and out of the Earth\'s shadow when Skyfield does', () => {
    const rec = F.sets.find((s) => s.NORAD_CAT_ID === 25544)!;
    const [o] = skyObjects([elementsFromRecord(rec)], 'imported');
    for (const edge of F.shadow) {
      const jd = jdOf(edge.time);
      for (const [dt, expected] of [[-3, !edge.sunlit], [3, edge.sunlit]] as const) {
        const s = skyState(o, jd + dt / 86400);
        if (s.error !== 0) throw new Error('no state');
        expect(inSunlight(s.r, jd + dt / 86400), `${edge.time} ${dt} s`).toBe(expected);
      }
    }
    expect(F.shadow.length).toBeGreaterThan(25);
  });
});

describe('what a pass says', () => {
  const rec = F.sets.find((s) => s.NORAD_CAT_ID === 25544)!;
  const [iss] = skyObjects([elementsFromRecord(rec)], 'imported');
  const bangkok = station('bangkok');
  const t0 = Date.parse(`${rec.EPOCH}Z`) / 86400e3 + 2440587.5;

  it('rises and sets at the minimum elevation asked, highest between', () => {
    for (const p of findPasses(iss, bangkok, t0, t0 + 2, 10 * DEG)) {
      if (p.rise) expect(p.rise.el / DEG).toBeCloseTo(10, 3);
      if (p.set) expect(p.set.el / DEG).toBeCloseTo(10, 3);
      expect(p.top.el).toBeGreaterThan(10 * DEG);
      if (p.rise && p.set) expect(p.rise.jd).toBeLessThan(p.top.jd);
    }
  });

  it('can be seen only while sunlit in a dark sky', () => {
    const passes = findPasses(iss, bangkok, t0, t0 + 3);
    expect(passes.length).toBeGreaterThan(5);
    for (const p of passes) {
      if (!p.visible) continue;
      const mid = (p.visible.from + p.visible.to) / 2;
      const look = lookFrom(iss, bangkok, mid)!;
      expect(look.sunlit).toBe(true);
      expect(look.sunEl).toBeLessThan(DARK_SKY);
    }
    // the Sun is up at noon in Bangkok (05:00 UTC), and down at midnight
    const day = Math.floor(t0 - 0.5) + 0.5;
    expect(sunElevation(bangkok, day + 5 / 24)).toBeGreaterThan(40 * DEG);
    expect(sunElevation(bangkok, day + 17 / 24)).toBeLessThan(-40 * DEG);
  });

  it('gives a geostationary satellite one pass that never sets where it is up, and none where it never rises', () => {
    const still = { ...rec, NORAD_CAT_ID: 90001, MEAN_MOTION: 1.00273, INCLINATION: 0.02, ECCENTRICITY: 0.0002, BSTAR: 0, MEAN_MOTION_DOT: 0 };
    const [geo] = skyObjects([elementsFromRecord(still)], 'imported');
    const s = skyState(geo, t0);
    if (s.error !== 0) throw new Error('no state');
    const under = { lat: 0, lon: s.lon + 10 * DEG, h: 0 }, opposite = { lat: 0, lon: s.lon + Math.PI, h: 0 };
    const up = findPasses(geo, under, t0, t0 + 1);
    expect(up).toHaveLength(1);
    expect(up[0].rise).toBeNull();
    expect(up[0].set).toBeNull();
    expect(up[0].top.el).toBeGreaterThan(70 * DEG);
    expect(findPasses(geo, opposite, t0, t0 + 1)).toEqual([]);
  });
});

/**
 * The same search on a designed orbit (roadmap D07, docs/ROADMAP-PART2-3.md;
 * Phase 4 map §3 item 1): `findPassesOf` fed by a Kepler orbit — `stateAt`
 * (src/orbit/kepler.ts, J2 on) through `eciToEcef` and `lookAngles` — as D07
 * will feed it. The SGP4 path through `findPasses` is held to Skyfield above;
 * this holds the search, apart from SGP4, to an analytic reference.
 *
 * Reference: the longest pass, straight overhead, T_max = (P/π)·λ_max. A
 * satellite on a circular orbit sweeps 2π/P rad of Earth central angle a
 * second; an overhead pass crosses the whole footprint, a central angle of
 * 2·λ_max, with λ_max = `footprintAngle(r, ε_min)` = acos(R·cos ε/r) − ε
 * (spherical Earth); so T = 2·λ_max/(2π/P). It is the form of Wertz & Larson,
 * *Space Mission Analysis and Design* (Earth-coverage chapter; not free, no
 * URL), and the map's `maxPassDuration` (§2.2 E), which track A3 implements.
 *
 * The case: circular, 500 km, i = 90°, its ascending node over a station on
 * the equator at jd0, so the pass is overhead. On the equator at h = 0 the
 * WGS-84 station's radius is R_EARTH and its vertical is the radius, so the
 * closed form's spherical geometry holds exactly there. P is the nodal period,
 * the period of the argument of latitude that the J2 mean motion and perigee
 * drift set (about 0.14 % longer than the two-body period here).
 *
 * Tolerances, fixed before the first run:
 * - the map's criterion: the pass lasts (P/π)·λ_max within 1 %, at
 *   ε_min = 0° and 10°;
 * - the closed form leaves out the Earth turning under the pass. For this
 *   orbit and station the central angle from the station is exactly
 *   cos γ = cos(u̇t)·cos(ω⊕t), with u̇ = 2π/P and ω⊕ the sidereal angle's rate,
 *   so the pass is shorter by δ ≈ (k²/2)·λ/tan λ, k = ω⊕/u̇ ≈ 0.066: −0.207 %
 *   at 0°, −0.213 % at 10°, worked by hand before the run. The difference must
 *   therefore lie in [−0.30 %, −0.12 %];
 * - the pass must last as long as that exact rotating-Earth solution, solved
 *   here by bisection, within 10 ms (the search bisects each end to 1 ms);
 * - the top is overhead: at jd0 within 10 ms (golden section to 1 ms), above
 *   89.99°, and the rise and set are symmetric about it within 10 ms
 *   (cos γ is even in t).
 */
describe('passes of a designed orbit (D07, findPassesOf)', () => {
  const jd0 = Date.parse('2026-09-21T00:00:00Z') / 86400e3 + 2440587.5;
  const station = { lat: 0, lon: 100.5018 * DEG, h: 0 };
  const h = 500e3, r = R_EARTH + h;
  const o: Orbit = { a: r, e: 0, i: 90 * DEG, raan: wrap2pi(gmst(jd0) + station.lon), argp: 0, m0: 0, jd0 };
  const elevation = (jd: number) => {
    const s = stateAt(o, (jd - o.jd0) * 86400, true);
    return lookAngles(station, eciToEcef(s.r, s.theta)).elevation;
  };
  const P = orbitFacts(o, true).nodalPeriod;
  // the sidereal angle's rate, rad/s: gmst's own 360.98564736629° a day
  const wEarth = (360.98564736629 * DEG) / 86400;

  /** Half the exact overhead pass, s: cos(u̇t)·cos(ω⊕t) = cos λ, by bisection. */
  function halfPassTurning(lambda: number): number {
    const u = (2 * Math.PI) / P;
    let a = 0, b = lambda / u;
    for (let k = 0; k < 200; k++) {
      const m = (a + b) / 2;
      if (Math.cos(u * m) * Math.cos(wEarth * m) > Math.cos(lambda)) a = m; else b = m;
    }
    return (a + b) / 2;
  }

  for (const minElDeg of [0, 10]) {
    it(`lasts (P/π)·λ_max within 1 % straight overhead, above ${minElDeg}°`, () => {
      const minEl = minElDeg * DEG;
      const lambda = footprintAngle(r, minEl);
      const closedForm = (P / Math.PI) * lambda;
      const passes = findPassesOf(elevation, P, jd0 - 0.02, jd0 + 0.02, minEl);
      expect(passes).toHaveLength(1);
      const [p] = passes;
      if (p.rise === null || p.set === null) throw new Error('the pass is cut by the window');
      const found = (p.set - p.rise) * 86400;
      // the map's criterion
      expect(Math.abs(found / closedForm - 1)).toBeLessThan(0.01);
      // the Earth's turning, and nothing else, makes the difference
      expect(found / closedForm - 1).toBeGreaterThan(-0.003);
      expect(found / closedForm - 1).toBeLessThan(-0.0012);
      expect(Math.abs(found - 2 * halfPassTurning(lambda))).toBeLessThan(0.01);
      // overhead, and symmetric about the top
      expect(p.culminations).toHaveLength(1);
      expect(Math.abs(p.top - jd0) * 86400).toBeLessThan(0.01);
      expect(elevation(p.top)).toBeGreaterThan(89.99 * DEG);
      expect(Math.abs((jd0 - p.rise) - (p.set - jd0)) * 86400).toBeLessThan(0.01);
    });
  }
});
