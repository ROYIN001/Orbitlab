/**
 * What today's integrators give against exact solutions (PF-15): measurements frozen as bounds, each with the value
 * measured on 2026-11-27 beside it. Nothing here edits src/physics. The last case measures the flight as it is today;
 * its numbers belong to the flight's own outputs, so the batch that re-records the Launch fingerprints re-measures it.
 */
import { describe, expect, it } from 'vitest';
import { rk4Step, type PointState } from '../src/physics/integrator';
import { propagate } from '../src/physics/propagator/propagate';
import { ECSS_LEVELS } from '../src/physics/propagator/activity';
import type { ForceModel } from '../src/physics/propagator/forces';
import { MU_EARTH } from '../src/physics/constants';
import { Simulation } from '../src/physics/simulation';
import { DEFAULT_GUIDANCE, DEFAULT_FAILURE } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';
import type { MissionConfig } from '../src/types';

const twoBody = (_t: number, r: { x: number; y: number; z: number }) => {
  const d = Math.hypot(r.x, r.y, r.z);
  const k = -MU_EARTH / (d * d * d);
  return { x: r.x * k, y: r.y * k, z: r.z * k };
};
const STEPS = [40, 20, 10, 5];
const ratios = (errs: number[]) => errs.slice(0, -1).map((e, i) => e / errs[i + 1]);

describe('rk4Step', () => {
  it('rk4Step is fourth order, circular orbit', () => {
    const a = 7.0e6;
    const n = Math.sqrt(MU_EARTH / a ** 3);
    const vc = Math.sqrt(MU_EARTH / a);
    const T = 1200;
    const err = (h: number) => {
      let s: PointState = { r: { x: a, y: 0, z: 0 }, v: { x: 0, y: vc * Math.cos(0.9), z: vc * Math.sin(0.9) } };
      const steps = Math.round(T / h);
      for (let i = 0; i < steps; i++) s = rk4Step(i * h, s, h, twoBody);
      const th = n * T;
      const ex = { x: a * Math.cos(th), y: a * Math.sin(th) * Math.cos(0.9), z: a * Math.sin(th) * Math.sin(0.9) };
      return Math.hypot(s.r.x - ex.x, s.r.y - ex.y, s.r.z - ex.z);
    };
    const errs = STEPS.map(err);
    // measured ratios 16.46, 16.23, 16.12; err(10 s) 1.09e-3 m
    ratios(errs).forEach((q, i) => {
      expect(q, `err(${STEPS[i]} s) / err(${STEPS[i + 1]} s)`).toBeGreaterThanOrEqual(15);
      expect(q, `err(${STEPS[i]} s) / err(${STEPS[i + 1]} s)`).toBeLessThanOrEqual(17);
    });
    expect(errs[2], 'err(10 s)').toBeLessThanOrEqual(5e-3);
  });

  it('rk4Step is fourth order, through a perigee', () => {
    const rp = 6.678e6;
    const ecc = 0.6;
    const sma = rp / (1 - ecc);
    const n = Math.sqrt(MU_EARTH / sma ** 3);
    const solve = (M: number) => {
      let E = M;
      for (let i = 0; i < 80; i++) E -= (E - ecc * Math.sin(E) - M) / (1 - ecc * Math.cos(E));
      return E;
    };
    const pos = (E: number) => ({ x: sma * (Math.cos(E) - ecc), y: sma * Math.sqrt(1 - ecc * ecc) * Math.sin(E) });
    const vel = (E: number) => {
      const r = sma * (1 - ecc * Math.cos(E));
      return { x: (-Math.sqrt(MU_EARTH * sma) * Math.sin(E)) / r, y: (Math.sqrt(MU_EARTH * sma) * Math.sqrt(1 - ecc * ecc) * Math.cos(E)) / r };
    };
    const E0 = solve(n * -600);
    const p0 = pos(E0);
    const v0 = vel(E0);
    const ex = pos(solve(n * 600));
    const err = (h: number) => {
      let s: PointState = { r: { x: p0.x, y: p0.y, z: 0 }, v: { x: v0.x, y: v0.y, z: 0 } };
      const steps = Math.round(1200 / h);
      for (let i = 0; i < steps; i++) s = rk4Step(i * h, s, h, twoBody);
      return Math.hypot(s.r.x - ex.x, s.r.y - ex.y);
    };
    const errs = STEPS.map(err);
    // measured ratios 16.02, 16.01, 16.01
    ratios(errs).forEach((q, i) => {
      expect(q, `err(${STEPS[i]} s) / err(${STEPS[i + 1]} s)`).toBeGreaterThanOrEqual(15);
      expect(q, `err(${STEPS[i]} s) / err(${STEPS[i + 1]} s)`).toBeLessThanOrEqual(17);
    });
  });
});

describe('integrator against exact solutions', () => {
  it('Dormand–Prince answers to its tolerance', () => {
    const a = 7.0e6;
    const vc = Math.sqrt(MU_EARTH / a);
    const forces: ForceModel = { j2: false, j3j4: false, drag: false, sun: false, moon: false, srp: false, activity: ECSS_LEVELS.moderate };
    const err = (tolerance: number) => {
      const res = propagate([a, 0, 0], [0, vc * Math.cos(0.9), vc * Math.sin(0.9)], 2461310.5, {
        method: 'cowell', duration: 43200, forces, spacecraft: { mass: 1, area: 0, cd: 0, cr: 0 }, samples: 4, tolerance,
      });
      return Math.abs(res.samples[res.samples.length - 1].a - a);
    };
    const tols = [1e-6, 1e-8, 1e-10, 1e-12];
    const errs = tols.map(err);
    // measured: 100 m, 0.94 m, 1.26e-2 m, 1.31e-4 m at 1e-6 to 1e-12; ratios 107, 75, 96
    expect(errs[2], 'error at tolerance 1e-10').toBeLessThanOrEqual(0.1);
    ratios(errs).forEach((q, i) => {
      expect(q, `error at ${tols[i]} / error at ${tols[i + 1]}`).toBeGreaterThanOrEqual(30);
      expect(q, `error at ${tols[i]} / error at ${tols[i + 1]}`).toBeLessThanOrEqual(300);
    });
  });

  it('the point-mass step schedule: halving the step', () => {
    const cfg = {
      vehicleId: 'falcon9', satelliteId: 'starlink', siteId: 'cape', orbit: orbitById('iss'),
      launchTime: new Date(Date.UTC(2026, 8, 15, 12, 0, 0)), guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE },
      boosterRecovery: false,
    } as MissionConfig;
    const fly = (k: number, until: number) => {
      const sim = new Simulation(cfg, { headless: true });
      let guard = 0;
      while (!sim.done && sim.state.t < until - 1e-9 && guard++ < 4_000_000) sim.step(Math.min(sim.suggestedDt() / k, until - sim.state.t));
      return { r: { ...sim.state.r }, v: { ...sim.state.v } };
    };
    const d = (p: ReturnType<typeof fly>, q: ReturnType<typeof fly>) => [
      Math.hypot(p.r.x - q.r.x, p.r.y - q.r.y, p.r.z - q.r.z),
      Math.hypot(p.v.x - q.v.x, p.v.y - q.v.y, p.v.z - q.v.z),
    ];
    // [time, position bound m, velocity bound m/s]; measured, k = 1 to 2: 11.9 m and 0.77 m/s, 335 m and 4.17, 1,098 m and 5.00,
    // 1,267 m and 6.78; k = 2 to 4, position: 7.3, 162, 460, 896 m
    const rows: [number, number, number][] = [[60, 30, 2], [150, 800, 10], [300, 2500, 12], [500, 3000, 16]];
    for (const [until, dr, dv] of rows) {
      const [s1, s2, s4] = [fly(1, until), fly(2, until), fly(4, until)];
      const [p12, v12] = d(s1, s2);
      const [p24] = d(s2, s4);
      expect(p12, `T+${until} s, k = 1 to 2, position`).toBeLessThanOrEqual(dr);
      expect(v12, `T+${until} s, k = 1 to 2, velocity`).toBeLessThanOrEqual(dv);
      expect(p24, `T+${until} s, k = 2 to 4 against k = 1 to 2, position`).toBeLessThan(p12);
    }
  });
});
