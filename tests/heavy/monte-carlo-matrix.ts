/**
 * Monte Carlo sets of roadmap G05, flown in-process one run after another (a set's pool of workers
 * is the app's): a vehicle's reference mission, six-DOF in crosswind, its vehicle and air dispersed
 * with the default (minimal) set. Each file flies one set; vitest's workers fly the files side by
 * side. One line per set is printed for docs/history/PARALLEL-GNC-2026-09.md, G05.
 */
import { expect, it } from 'vitest';
import { vehicleById } from '../../src/data/vehicles';
import { cloneDispersions, DEFAULT_DISPERSIONS } from '../../src/physics/dispersion';
import {
  drawLayout, flyMonteCarloRun, insertionTargetOf, summarizeMonteCarlo, type GuidanceLaw, type MonteCarloConfig, type MonteCarloRun,
} from '../../src/physics/monte-carlo';
import type { MissionConfig, NavigationConfig } from '../../src/types';
import { fleetCaseConfig, referenceCase } from './flex-matrix';

export interface MonteCarloCase {
  vehicle: string;
  law: GuidanceLaw;
  runs: number;
  navigation?: NavigationConfig;
  /** 3σ bands the set must keep, and the runs that may be lost */
  bands: { perigeeKm: number; apogeeKm: number; inclinationDeg: number };
}

export function monteCarloSet(c: MonteCarloCase): void {
  it(`${c.vehicle} ${c.law}${c.navigation ? ' with navigation' : ''}: ${c.runs} dispersed runs insert within the bands`, () => {
    const ref = referenceCase(c.vehicle)!;
    const base = fleetCaseConfig(ref);
    const cfg: MissionConfig = { ...base, dynamics: { model: 'sixDof', wind: 'crosswind', seed: 20260919,
      ...(c.law !== 'standard' ? { explicitGuidance: { law: c.law } } : {}), ...(c.navigation ? { navigation: c.navigation } : {}) } };
    const mc: MonteCarloConfig = { runs: c.runs, seed: 1, dispersions: cloneDispersions(DEFAULT_DISPERSIONS), compareLaws: false };
    const spec = vehicleById(c.vehicle), layout = drawLayout(spec), target = insertionTargetOf(cfg);
    const runs: MonteCarloRun[] = [];
    for (let i = 0; i < c.runs; i++) runs.push(flyMonteCarloRun(cfg, spec, mc, i, c.law));
    const law = summarizeMonteCarlo(runs, layout, mc.dispersions, target).laws[0];
    const s = law.stats, share = (k: 'perigeeKm' | 'apogeeKm' | 'inclinationDeg') => {
      const sens = law.sensitivity[k];
      if (!sens.ok) return 'n/a';
      const top = Object.entries(sens.shares).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 2).map(([q, v]) => `${q} ${Math.round((v ?? 0) * 100)}%`);
      return `${top.join(', ')}, other ${Math.round(sens.other * 100)}%`;
    };
    const f = (v: number, d: number) => v.toFixed(d);
    // One line per set for the record (docs/history/PARALLEL-GNC-2026-09.md, G05).
    console.log(`MC ${c.vehicle} ${c.law}${c.navigation ? '+nav' : ''} ${ref.orbit}: ${law.inserted}/${law.runs} in orbit, lost ${law.lost} ${JSON.stringify(law.reasons)}; `
      + `target ${f(target.perigeeKm, 1)}×${f(target.apogeeKm, 1)} km ${f(target.inclinationDeg, 3)}°; `
      + `pe ${f(s.perigeeKm.mean, 2)}±${f(3 * s.perigeeKm.sigma, 2)} (bias ${f(s.perigeeKm.bias!, 2)}) [${share('perigeeKm')}]; `
      + `ap ${f(s.apogeeKm.mean, 2)}±${f(3 * s.apogeeKm.sigma, 2)} (bias ${f(s.apogeeKm.bias!, 2)}) [${share('apogeeKm')}]; `
      + `i ${f(s.inclinationDeg.mean, 4)}±${f(3 * s.inclinationDeg.sigma, 4)} [${share('inclinationDeg')}]; `
      + `dv ${f(s.dvLeft.mean, 0)}±${f(3 * s.dvLeft.sigma, 0)} m/s; max q·α ${f(Math.max(...runs.map((r) => r.maxQAlpha)), 0)} kPa·°; `
      + `${f(runs.reduce((a, r) => a + r.ms, 0) / runs.length / 1000, 1)} s/run`);
    expect(law.lost, JSON.stringify(law.reasons)).toBe(0);
    expect(law.short).toBe(0);
    expect(3 * s.perigeeKm.sigma).toBeLessThan(c.bands.perigeeKm);
    expect(3 * s.apogeeKm.sigma).toBeLessThan(c.bands.apogeeKm);
    expect(3 * s.inclinationDeg.sigma).toBeLessThan(c.bands.inclinationDeg);
    expect(Math.abs(s.perigeeKm.bias!)).toBeLessThan(c.bands.perigeeKm);
    expect(Math.abs(s.apogeeKm.bias!)).toBeLessThan(c.bands.apogeeKm);
  }, 4 * 3_600_000);
}
