/**
 * The screening's time filter (roadmap M01, P2.5; src/orbit/screening-filter.ts).
 *
 * - Its bounds are held to SGP4 itself: for every near-Earth object of the
 *   bundled catalogue, at times across a week, SGP4's radius, its argument of
 *   latitude and its plane stay inside what the filter assumes.
 * - The filtered screening is held to the full search, which is kept callable
 *   as the reference: for each primary here, the same approaches (the same
 *   objects, TCA within 1 ms, miss within 1 mm), none dropped, none added.
 *   Those tolerances were fixed before the comparison was first run. The
 *   larger sweep — every primary, windows of 1, 3 and 7 days, limits of 1, 5
 *   and 25 km — is tests/heavy/screening-filter.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { closeApproaches, type Ephemeris } from '../src/orbit/conjunction';
import { v3 } from '../src/physics/vec3';
import { filterBounds, meanArgumentOfLatitude, meanNode, pairWindows, radiusBand, radiusOver } from '../src/orbit/screening-filter';
import { bandsOverlap, candidates, screen, screenInSlices, type FilterStats } from '../src/orbit/screening';
import { minutesSinceEpoch, sgp4 } from '../src/orbit/sgp4';
import { catalogue, compareScreenings, JD0, made, PRIMARIES } from './screening-cases';

const wrap = (x: number): number => x - 2 * Math.PI * Math.round(x / (2 * Math.PI));

describe('the time filter\'s bounds, against SGP4 itself (M01, P2.5)', () => {
  it('holds every near-Earth object of the catalogue inside them for a week', () => {
    const objects = [...catalogue, ...['transfer', 'reentering'].map((k) => PRIMARIES[k]().self)];
    const r = [0, 0, 0], v = [0, 0, 0];
    let used = 0, samples = 0, worstR = -Infinity, worstU = 0, worstTilt = 0;
    for (const o of objects) {
      const b = filterBounds(o, JD0, JD0 + 7);
      if (o.sat.method === 'd') { expect(b.usable, o.key).toBe(false); continue; }
      if (!b.usable) continue;
      used++;
      const s = o.sat;
      for (let k = 0; k < 40; k++) {
        // spread through the week, off any round number of revolutions
        const t = minutesSinceEpoch(s, JD0 + 7 * ((k + 0.5 + 0.37 * Math.sin(k * 12.9898 + s.satnum)) / 40));
        if (sgp4(s, t, r, v) !== 0) continue;
        samples++;
        const rr = Math.hypot(r[0], r[1], r[2]) / s.radiusearthkm;
        worstR = Math.max(worstR, b.rMin - rr, rr - b.rMax);
        const O = meanNode(s, t), ci = Math.cos(s.inclo), si = Math.sin(s.inclo);
        const P = [Math.cos(O), Math.sin(O), 0], Q = [-ci * Math.sin(O), ci * Math.cos(O), si], H = [si * Math.sin(O), -si * Math.cos(O), ci];
        const dot = (a: number[]): number => a[0] * r[0] + a[1] * r[1] + a[2] * r[2];
        const inPlane = Math.atan2(dot(Q), dot(P));
        worstU = Math.max(worstU, Math.abs(wrap(inPlane - meanArgumentOfLatitude(s, t))) / b.du);
        worstTilt = Math.max(worstTilt, Math.asin(Math.abs(dot(H)) / Math.hypot(r[0], r[1], r[2])) / b.eps);
      }
    }
    // most of the catalogue is near-Earth, and the filter takes nearly all of it
    expect(used).toBeGreaterThan(2000);
    expect(samples).toBeGreaterThan(80_000);
    expect(worstR, 'radius outside [rMin, rMax], earth radii').toBeLessThanOrEqual(0);
    expect(worstU, 'along-track, share of the bound').toBeLessThanOrEqual(1);
    expect(worstTilt, 'out of the mean plane, share of the bound').toBeLessThanOrEqual(1);
    // and they are not idle: SGP4 comes within reach of them
    expect(worstU).toBeGreaterThan(0.5);
    expect(worstTilt).toBeGreaterThan(0.5);
  });

  it('holds SGP4\'s radius inside the bound for each pass, over stretches of 10 s to 10 min', () => {
    const objects = [...catalogue, ...['transfer', 'reentering'].map((k) => PRIMARIES[k]().self)];
    const r = [0, 0, 0], v = [0, 0, 0];
    let samples = 0, worst = -Infinity, widest = 0;
    for (const o of objects) {
      const b = filterBounds(o, JD0, JD0 + 7);
      if (!b.usable) continue;
      const s = o.sat;
      for (let k = 0; k < 12; k++) {
        const len = [10 / 60, 1, 10][k % 3];
        const lo = minutesSinceEpoch(s, JD0 + 7 * ((k + 0.5 + 0.37 * Math.sin(k * 78.233 + s.satnum)) / 12)), hi = lo + len;
        const [a, z] = radiusOver(b, lo, hi);
        widest = Math.max(widest, (z - a) * s.radiusearthkm);
        for (let j = 0; j <= 4; j++) {
          if (sgp4(s, lo + (len * j) / 4, r, v) !== 0) continue;
          samples++;
          const rr = Math.hypot(r[0], r[1], r[2]) / s.radiusearthkm;
          worst = Math.max(worst, a - rr, rr - z);
        }
      }
    }
    expect(samples).toBeGreaterThan(100_000);
    expect(worst, 'radius outside the pass\'s bound, earth radii').toBeLessThanOrEqual(0);
    expect(widest).toBeGreaterThan(0);
  });

  it('keeps a decaying object that SGP4 brings down through the primary\'s band, which its epoch\'s perigee and apogee leave out', () => {
    // constructed: 481 × 495 km at the epoch, B* 0.05; SGP4 takes it below 400 km within the week, through the ISS's height
    const iss = PRIMARIES.iss().self;
    const sinking = PRIMARIES.sinking().self;
    const r = [0, 0, 0], v = [0, 0, 0];
    let lowest = Infinity;
    for (let k = 0; k <= 7 * 288; k++) {
      if (sgp4(sinking.sat, minutesSinceEpoch(sinking.sat, JD0 + k / 288), r, v) === 0) lowest = Math.min(lowest, Math.hypot(r[0], r[1], r[2]));
    }
    expect(lowest - sinking.sat.radiusearthkm).toBeLessThan(410);
    expect(bandsOverlap(iss, sinking, 5e3), 'the epoch\'s perigee and apogee, 30 km either way').toBe(false);
    expect(bandsOverlap(iss, sinking, 5e3, JD0, JD0 + 7), 'SGP4\'s band over the week').toBe(true);
    expect(candidates(iss, [sinking], 5e3, JD0, JD0 + 7)).toEqual([sinking]);
  });

  it('takes an object SGP4 brings down within the window from the ground up', () => {
    // constructed: 233 × 713 km, down after 35 h; over a week its drag polynomial is not trusted
    const falling = PRIMARIES.falling().self;
    expect(radiusBand(falling, JD0, JD0 + 7)).toBe('down');
    expect(filterBounds(falling, JD0, JD0 + 7).usable).toBe(false);
    // over its first day, before it comes down, SGP4's band is given
    expect(Array.isArray(radiusBand(falling, JD0, JD0 + 1))).toBe(true);
  });

  it('takes a near-Earth object whose band cannot be bounded to be anywhere', () => {
    // constructed: 159 km × 10 900 km, B* −0.005, screened a month after its epoch: SGP4's drift of e over the
    // window may take it past 0.5, so no band is given, and its epoch's perigee and apogee say nothing of it then
    const drifting = made(99007, 'DRIFTING (CONSTRUCTED)', { MEAN_MOTION: 6.7, ECCENTRICITY: 0.45, BSTAR: -5e-3 });
    const geo = PRIMARIES.geo().self;
    expect(drifting.sat.method).toBe('n');
    expect(radiusBand(drifting, JD0 + 30, JD0 + 37)).toBeNull();
    expect(bandsOverlap(geo, drifting, 5e3), 'the epoch\'s perigee and apogee, 30 km either way').toBe(false);
    expect(bandsOverlap(geo, drifting, 5e3, JD0 + 30, JD0 + 37)).toBe(true);
    expect(candidates(geo, [drifting], 5e3, JD0 + 30, JD0 + 37)).toEqual([drifting]);
  });

  it('sends deep-space objects (SDP4) to the full search', () => {
    for (const k of ['geo', 'molniya', 'gto']) {
      const self = PRIMARIES[k]().self;
      expect(filterBounds(self, JD0, JD0 + 1).usable, k).toBe(false);
      const other = filterBounds(PRIMARIES.iss().self, JD0, JD0 + 1);
      expect(pairWindows(filterBounds(self, JD0, JD0 + 1), other, 5e3), k).toBeNull();
    }
  });
});

describe('the search on a shared grid, in windows only (M01, P2.5)', () => {
  // A in the equator, B over the poles 100 m higher, both at A's rate: they meet at t = 0, P/2, P (tests/conjunction.test.ts)
  const R = 7.16e6, n = Math.sqrt(3.986004418e14 / R ** 3), P = 2 * Math.PI / n, h = R + 100;
  const a: Ephemeris = (jd) => { const t = (jd - JD0) * 86400; return { r: v3(R * Math.cos(n * t), R * Math.sin(n * t), 0), v: v3(-R * n * Math.sin(n * t), R * n * Math.cos(n * t), 0) }; };
  const b: Ephemeris = (jd) => { const t = (jd - JD0) * 86400; return { r: v3(h * Math.cos(n * t), 0, h * Math.sin(n * t)), v: v3(-h * n * Math.sin(n * t), 0, h * n * Math.cos(n * t)) }; };
  const jd0 = JD0 - 1000 / 86400, jd1 = JD0 + (P + 1000) / 86400;
  const at = (s: number, half = 1): [number, number] => [JD0 + (s - half) / 86400, JD0 + (s + half) / 86400];

  it('finds in a window exactly what the whole search finds there', () => {
    const whole = closeApproaches(a, b, jd0, jd1, 5000, 60);
    expect(whole).toHaveLength(3);
    const windowed = closeApproaches(a, b, jd0, jd1, 5000, 60, [at(0), at(P / 2), at(P)]);
    expect(windowed).toEqual(whole);
  });

  it('leaves out only what no window holds', () => {
    const whole = closeApproaches(a, b, jd0, jd1, 5000, 60);
    expect(closeApproaches(a, b, jd0, jd1, 5000, 60, [at(P / 2)])).toEqual([whole[1]]);
    expect(closeApproaches(a, b, jd0, jd1, 5000, 60, [])).toEqual([]);
  });
});

describe('the filtered screening against the full search (M01, P2.5)', () => {
  it.each(Object.keys(PRIMARIES))('finds every approach the full search finds, and no other: %s, one day', (key) => {
    const { label, self } = PRIMARIES[key]();
    for (const within of [1e3, 5e3, 25e3]) compareScreenings(self, 1, within, `${label}, 1 d, ${within / 1e3} km`);
  }, 120_000);

  it.each(['iss', 'sso700', 'leo1200'])('and over a week at 25 km: %s', (key) => {
    const { label, self } = PRIMARIES[key]();
    const c = compareScreenings(self, 7, 25e3, `${label}, 7 d, 25 km`);
    expect(c.reference).toBeGreaterThan(0);
  }, 120_000);

  it('searches few pairs whole, and most not at all, for a satellite at 700 km', () => {
    const stats: FilterStats = { pairs: 0, whole: 0, none: 0, windows: 0 };
    screen(PRIMARIES.sso700().self, catalogue, JD0, JD0 + 3, 5e3, 10, { stats });
    expect(stats.pairs).toBeGreaterThan(100);
    expect(stats.whole / stats.pairs).toBeLessThan(0.1);
    expect(stats.none / stats.pairs).toBeGreaterThan(0.5);
  }, 60_000);

  it('searches every pair whole for a geostationary primary', () => {
    const stats: FilterStats = { pairs: 0, whole: 0, none: 0, windows: 0 };
    screen(PRIMARIES.geo().self, catalogue, JD0, JD0 + 1, 25e3, 10, { stats });
    expect(stats.pairs).toBeGreaterThan(10);
    expect(stats.whole).toBe(stats.pairs);
  }, 60_000);

  it('gives the worker\'s slices the same answer as one pass', async () => {
    const self = PRIMARIES.sso700().self;
    const direct = screen(self, catalogue, JD0, JD0 + 1, 25e3, 10);
    const sliced = await screenInSlices(self, catalogue, JD0, JD0 + 1, 25e3, 10, () => true, async () => {});
    expect(sliced!.map((c) => [c.other.key, c.approach.tca, c.approach.miss])).toEqual(direct.map((c) => [c.other.key, c.approach.tca, c.approach.miss]));
    const reference = await screenInSlices(self, catalogue, JD0, JD0 + 1, 25e3, 10, () => true, async () => {}, { filter: false });
    expect(sliced!.map((c) => [c.other.key, c.approach.tca, c.approach.miss])).toEqual(reference!.map((c) => [c.other.key, c.approach.tca, c.approach.miss]));
  }, 60_000);
});
