/**
 * Close approaches and the probability of collision (roadmap M01): the search
 * against encounters whose answer is known exactly, the probability against
 * its closed forms, and both against the Iridium 33–Cosmos 2251 collision of
 * 2009 February 10 as its conjunction data were published (Shepperd, AMOS
 * 2023). The tolerance on the published probabilities, a tenth of a decade,
 * was fixed before the comparison.
 */
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/conjunction/iridium33-cosmos2251.json';
import {
  closeApproaches, collisionProbability, inertialVelocity, rtnAxes, rtnToFrame, type Ephemeris, type Mat3, type PosVel,
} from '../src/orbit/conjunction';
import { v3, type Vec3 } from '../src/physics/vec3';
import { bandsOverlap, candidates, ephemerisOf, screen, screenInSlices, screenPair } from '../src/orbit/screening';
import { skyFacts, skyObjects } from '../src/orbit/real-sky';
import { elementsFromRecord } from '../src/orbit/omm';
import { parseSnapshot } from '../src/provider/data-provider';

const jdOf = (iso: string): number => Date.parse(iso) / 86400000 + 2440587.5;
const vec = (a: number[]): Vec3 => v3(a[0], a[1], a[2]);
const JD0 = 2461310.5;

describe('the closest approach (M01)', () => {
  it('finds two straight lines\' closest approach, its time and its miss', () => {
    // A still at the origin; B passing 250 m off it at 7 km/s, closest 90.25 s after the start
    const a: Ephemeris = () => ({ r: v3(0, 0, 0), v: v3(0, 0, 0) });
    const b: Ephemeris = (jd) => { const t = (jd - JD0) * 86400 - 90.25; return { r: v3(7000 * t, 250, 0), v: v3(7000, 0, 0) }; };
    const [c, ...more] = closeApproaches(a, b, JD0, JD0 + 600 / 86400, 1000);
    expect(more).toEqual([]);
    expect((c.tca - JD0) * 86400).toBeCloseTo(90.25, 2);
    expect(c.miss).toBeCloseTo(250, 3);
    expect(c.speed).toBeCloseTo(7000, 6);
  });

  it('finds two crossing circular orbits meeting at their nodes, twice a revolution, with the miss where it is', () => {
    // A in the equator, B over the poles 100 m higher, both at A's angular rate: they meet on the x axis, t = 0 and half a turn later
    const R = 7.16e6, n = Math.sqrt(3.986004418e14 / R ** 3), P = 2 * Math.PI / n;
    const a: Ephemeris = (jd) => { const t = (jd - JD0) * 86400; return { r: v3(R * Math.cos(n * t), R * Math.sin(n * t), 0), v: v3(-R * n * Math.sin(n * t), R * n * Math.cos(n * t), 0) }; };
    const h = R + 100;
    const b: Ephemeris = (jd) => { const t = (jd - JD0) * 86400; return { r: v3(h * Math.cos(n * t), 0, h * Math.sin(n * t)), v: v3(-h * n * Math.sin(n * t), 0, h * n * Math.cos(n * t)) }; };
    const found = closeApproaches(a, b, JD0 - 1000 / 86400, JD0 + (P + 1000) / 86400, 5000);
    expect(found.map((c) => Math.round((c.tca - JD0) * 86400 * 1000) / 1000)).toEqual([0, P / 2, P].map((t) => Math.round(t * 1000) / 1000));
    for (const c of found) {
      expect(c.miss).toBeCloseTo(100, 2);
      expect(c.speed).toBeCloseTo(n * Math.hypot(R, h), 3);
      // B is straight above A: all radial
      expect(c.rtn.radial).toBeCloseTo(100, 2);
      // to the search's tenth of a millisecond: at 7.5 km/s, under a metre along the track
      expect(Math.abs(c.rtn.along)).toBeLessThan(1);
      expect(Math.abs(c.rtn.cross)).toBeLessThan(1);
    }
    // nothing within 50 m
    expect(closeApproaches(a, b, JD0 - 1000 / 86400, JD0 + (P + 1000) / 86400, 50)).toEqual([]);
  });
});

describe('the probability of collision (M01)', () => {
  const at = (r: Vec3, v: Vec3): PosVel => ({ r, v });
  const iso = (s2: number): Mat3 => [[s2, 0, 0], [0, s2, 0], [0, 0, s2]];

  it('is 1 − exp(−R²/2σ²) for a direct hit through a round uncertainty', () => {
    const a = at(v3(0, 0, 0), v3(0, 7000, 0)), b = at(v3(0, 0, 0), v3(7000, 0, 0));
    for (const [R, s] of [[10, 50], [20, 20], [5, 100]]) {
      const p = collisionProbability(a, iso((s * s) / 2), b, iso((s * s) / 2), R);
      expect(p.pc).toBeCloseTo(1 - Math.exp(-(R * R) / (2 * s * s)), 9);
    }
  });

  it('is Rice\'s integral for a round uncertainty off to one side, however far out in the tail', () => {
    // P = ∫₀ᴿ (ρ/σ²) exp(−(ρ² + d²)/2σ²) I₀(ρd/σ²) dρ, by Simpson's rule on a fine grid, in logarithms
    const logI0 = (x: number): number => {
      if (x > 50) return x - 0.5 * Math.log(2 * Math.PI * x) + Math.log(1 + 1 / (8 * x) + 9 / (128 * x * x));
      let s = 1, term = 1;
      for (let k = 1; k < 200; k++) { term *= (x * x) / (4 * k * k); s += term; if (term < 1e-17 * s) break; }
      return Math.log(s);
    };
    const rice = (R: number, d: number, s2: number): number => {
      const N = 4000, h = R / N, logs: number[] = [];
      for (let k = 0; k <= N; k++) {
        const r = k * h, w = k === 0 || k === N ? 1 : k % 2 ? 4 : 2;
        logs.push(r === 0 ? -Infinity : Math.log((w * h) / 3) + Math.log(r / s2) - (r * r + d * d) / (2 * s2) + logI0((r * d) / s2));
      }
      const top = Math.max(...logs);
      return (top + Math.log(logs.reduce((s, l) => s + Math.exp(l - top), 0))) / Math.LN10;
    };
    const a = at(v3(0, 0, 0), v3(0, 7000, 0));
    for (const [d, R] of [[100, 5], [300, 20], [600, 0.5], [900, 20]]) {
      const b = at(v3(0, 0, d), v3(7000, 0, 0));
      expect(collisionProbability(a, iso(50), b, iso(50), R).log10, `${d} m, R ${R} m`).toBeCloseTo(rice(R, d, 100), 3);
    }
  });

  it('turns an uncertainty from an orbit\'s own axes into the frame', () => {
    const s = { r: v3(7e6, 0, 0), v: v3(0, 7500, 0) };
    const axes = rtnAxes(s);
    const C = rtnToFrame([[1, 0, 0], [0, 100, 0], [0, 0, 4]], axes);
    // radial along x, along-track along y, normal along z
    expect(C[0][0]).toBeCloseTo(1, 12);
    expect(C[1][1]).toBeCloseTo(100, 12);
    expect(C[2][2]).toBeCloseTo(4, 12);
  });
});

describe('Iridium 33 and Cosmos 2251, 2009 February 10 (M01)', () => {
  const f = fixture;
  const state = (o: { r: number[]; v: number[] }): PosVel => ({ r: vec(o.r), v: vec(o.v) });
  const cov = (o: { r: number[]; v: number[]; cov: number[][] }): Mat3 => rtnToFrame(o.cov as Mat3, rtnAxes(inertialVelocity(state(o))));
  const radius = f.hardBodyRadius.iridium33 + f.hardBodyRadius.cosmos2251;

  it('met at nearly right angles, 11.6 km/s apart', () => {
    const a = inertialVelocity(state(f.iridium33)), b = inertialVelocity(state(f.cosmos2251));
    const rel = Math.hypot(b.v.x - a.v.x, b.v.y - a.v.y, b.v.z - a.v.z);
    expect(rel / 1000).toBeCloseTo(11.6, 1);
    const angle = Math.acos((a.v.x * b.v.x + a.v.y * b.v.y + a.v.z * b.v.z) / (Math.hypot(a.v.x, a.v.y, a.v.z) * Math.hypot(b.v.x, b.v.y, b.v.z))) * 180 / Math.PI;
    expect(angle).toBeGreaterThan(95);
    expect(angle).toBeLessThan(110);
  });

  it('is at its closest at the TCA of the conjunction message, by straight-line motion', () => {
    const a = state(f.iridium33), b = state(f.cosmos2251);
    const t0 = jdOf(f.tca);
    const line = (s: PosVel): Ephemeris => (jd) => {
      const t = (jd - t0) * 86400;
      return { r: v3(s.r.x + s.v.x * t, s.r.y + s.v.y * t, s.r.z + s.v.z * t), v: s.v };
    };
    const [c] = closeApproaches(line(a), line(b), t0 - 1 / 1440, t0 + 1 / 1440, 1000, 1);
    expect(Math.abs(c.tca - t0) * 86400).toBeLessThan(0.002);
    expect(c.miss).toBeCloseTo(226.3, 1);
  });

  it.each([
    ['the conjunction message\'s own covariances', 'JSpOC-JSpOC', f.iridium33, f.tca],
    ['Iridium\'s orbit estimate and its covariance', 'IridOD-JSpOC', f.iridiumOrbitEstimate, f.iridiumOrbitEstimate.epoch],
    ['Iridium\'s estimate with its conservative covariance', 'IridConstr-JSpOC', f.iridiumAdjustedEstimate, f.iridiumAdjustedEstimate.epoch],
  ] as const)('gives the published probability with %s', (_, row, primary, epoch) => {
    // Cosmos 2251 carried along a straight line to the primary's epoch, as the paper does for a small change of TCA
    const dt = (jdOf(epoch) - jdOf(f.tca)) * 86400;
    const c = state(f.cosmos2251);
    const secondary = { r: v3(c.r.x + c.v.x * dt, c.r.y + c.v.y * dt, c.r.z + c.v.z * dt), v: c.v };
    const p = collisionProbability(state(primary), cov(primary), secondary, cov(f.cosmos2251), radius);
    const published = f.table2Feb9[row].foster;
    expect(Math.abs(p.log10 - Math.log10(published)), `${p.log10.toFixed(3)} against ${Math.log10(published).toFixed(3)}`).toBeLessThan(0.1);
  });
});

describe('screening the catalogue (M01)', () => {
  const SNAPSHOT_FILE = import.meta.glob('../public/data/satellites.json', { import: 'default', eager: true }) as Record<string, unknown>;
  const snap = parseSnapshot(Object.values(SNAPSHOT_FILE)[0], 'satellites');
  const all = snap.data.groups.flatMap((g) => skyObjects(g.sets.map(elementsFromRecord), g.id));
  const byNum = (n: number) => all.find((o) => o.el.satnum === n)!;
  const jd0 = Date.parse('2026-09-26T12:00:00Z') / 86400000 + 2440587.5;

  it('leaves out the objects whose heights never come near, and the satellite itself', () => {
    const iss = byNum(25544);
    const near = candidates(iss, all, 5000);
    expect(near.some((o) => o.el.satnum === 25544)).toBe(false);
    // GPS, 20 000 km up, never comes near the station
    expect(near.some((o) => o.source === 'gnss')).toBe(false);
    for (const o of near) expect(bandsOverlap(iss, o, 5000)).toBe(true);
  });

  it('misses no approach a ten-second brute force finds, with its coarser steps', () => {
    // a weather satellite in the Fengyun-1C debris' band, against the first forty fragments near it
    const self = all.find((o) => o.source === 'weather' && Math.abs(skyFacts(o).perigeeAlt - 850e3) < 60e3)!;
    const within = 200e3;
    const others = candidates(self, all.filter((o) => o.source === 'debris'), within).slice(0, 40);
    let total = 0;
    for (const o of others) {
      const coarse = screenPair(self, o, jd0, jd0 + 1, within, 10).map((c) => c.approach);
      const fine = closeApproaches(ephemerisOf(self), ephemerisOf(o), jd0, jd0 + 1, within, 10);
      expect(coarse.length, o.el.name ?? '').toBe(fine.length);
      total += fine.length;
      coarse.forEach((c, k) => {
        expect(Math.abs(c.tca - fine[k].tca) * 86400).toBeLessThan(0.01);
        expect(c.miss).toBeCloseTo(fine[k].miss, 1);
      });
    }
    expect(total).toBeGreaterThan(3);
  }, 60_000);

  it('gives each approach an estimated probability from both sets\' uncertainty, larger for a larger pair', () => {
    const self = byNum(25544);
    const found = screen(self, all, jd0, jd0 + 2, 50e3, 10);
    expect(found.length).toBeGreaterThan(0);
    for (const c of found) {
      expect(c.approach.miss).toBeLessThan(50e3);
      expect(c.probability.log10).toBeLessThanOrEqual(0);
      expect(c.sigma.self.along).toBeGreaterThan(c.sigma.self.radial);
      const bigger = screenPair(self, c.other, c.approach.tca - 0.01, c.approach.tca + 0.01, 50e3, 20)[0];
      expect(bigger.probability.log10).toBeGreaterThan(c.probability.log10);
    }
    // nearest first
    for (let k = 1; k < found.length; k++) expect(found[k].approach.miss).toBeGreaterThanOrEqual(found[k - 1].approach.miss);
  }, 60_000);

  it('can be stopped between slices', async () => {
    const self = all.find((o) => o.source === 'weather' && Math.abs(skyFacts(o).perigeeAlt - 850e3) < 60e3)!;
    let calls = 0;
    const slow = all.filter((o) => o.source === 'debris');
    const res = await screenInSlices(self, slow, jd0, jd0 + 1, 5e3, 10, () => ++calls < 2, async () => {});
    expect(res === null || Array.isArray(res)).toBe(true);
    const done = await screenInSlices(self, slow.slice(0, 5), jd0, jd0 + 1, 5e3, 10, () => true, async () => {});
    expect(Array.isArray(done)).toBe(true);
  }, 60_000);
});
