/**
 * Passes over a place (roadmap R03) against Skyfield — an independent
 * implementation of the look angles, the pass search, the Earth's shadow and
 * the Sun (JPL DE421) — for the same element sets: the ISS, THEOS-2 and a GPS
 * satellite, over Bangkok and Saint Petersburg, three days each
 * (tests/fixtures/passes/, made by make_pass_fixtures.py there).
 */
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/passes/skyfield-passes.json';
import { DARK_SKY, findPasses, inSunlight, lookFrom, sunElevation } from '../src/orbit/passes';
import { elementsFromRecord } from '../src/orbit/omm';
import { skyObjects, skyState } from '../src/orbit/real-sky';
import type { OmmRecord } from '../src/provider/satellites';
import { DEG } from '../src/physics/constants';

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
