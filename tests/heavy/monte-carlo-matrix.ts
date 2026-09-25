/**
 * Monte Carlo sets of roadmap G05, flown in-process one run after another (a set's pool of workers
 * is the app's): a vehicle's reference mission, six-DOF in crosswind, its vehicle and air dispersed
 * with the default (minimal) set. Each file flies one set; vitest's workers fly the files side by
 * side. One line per set is printed for docs/history/PARALLEL-GNC-2026-09.md, G05 (under an AI agent, vitest's
 * own reporter hides a passing test's output: run with `--reporter=default` to see it).
 *
 * What a set holds the tool to (the owner's choice, 2026-09-25): every run flown is counted, and
 * every run lost is lost to a failure it names. What it holds the flights to is what they did when
 * the set was recorded: at most that many runs lost or short (a guard against getting worse, not a
 * claim that the losses are right; they are the known issues of the G05 record), and the runs that
 * reached their target orbit within bands around it.
 */
import { expect, it } from 'vitest';
import { vehicleById } from '../../src/data/vehicles';
import { cloneDispersions, DEFAULT_DISPERSIONS } from '../../src/physics/dispersion';
import {
  drawLayout, flyMonteCarloRun, missionTargetsOf, statsOf, summarizeMonteCarlo, type GuidanceLaw, type MeasurePoint, type MonteCarloConfig, type MonteCarloRun,
} from '../../src/physics/monte-carlo';
import type { MissionConfig, NavigationConfig } from '../../src/types';
import { fleetCaseConfig, referenceCase } from './flex-matrix';

export interface MonteCarloCase {
  vehicle: string;
  law: GuidanceLaw;
  runs: number;
  navigation?: NavigationConfig;
  /** the runs that may be lost, and that may end in an orbit short of one: what the recorded set did */
  maxLost: number;
  maxShort?: number;
  /** the runs that must reach their target orbit */
  minOnTarget: number;
  /** 3σ and bias bands the runs on target keep around the target, km and ° */
  bands: { perigeeKm: number; apogeeKm: number; inclinationDeg: number };
}

/** Losses the tool must not report: a loss it cannot name, a run it did not finish, a run it threw on. */
const UNNAMED = /^(evt\.vehicleLost|timeout|failed|error:)/;

export function monteCarloSet(c: MonteCarloCase): void {
  it(`${c.vehicle} ${c.law}${c.navigation ? ' with navigation' : ''}: ${c.runs} dispersed runs, each counted and each loss named`, () => {
    const ref = referenceCase(c.vehicle)!;
    const base = fleetCaseConfig(ref);
    const cfg: MissionConfig = { ...base, dynamics: { model: 'sixDof', wind: 'crosswind', seed: 20260919,
      ...(c.law !== 'standard' ? { explicitGuidance: { law: c.law } } : {}), ...(c.navigation ? { navigation: c.navigation } : {}) } };
    const mc: MonteCarloConfig = { runs: c.runs, seed: 1, dispersions: cloneDispersions(DEFAULT_DISPERSIONS), compareLaws: false };
    const spec = vehicleById(c.vehicle), layout = drawLayout(spec), targets = missionTargetsOf(cfg);
    const runs: MonteCarloRun[] = [];
    for (let i = 0; i < c.runs; i++) runs.push(flyMonteCarloRun(cfg, spec, mc, i, c.law));
    const law = summarizeMonteCarlo(runs, layout, mc.dispersions, targets).laws[0];
    const f = (v: number, d: number) => v.toFixed(d);
    const at = (point: MeasurePoint): string => {
      const p = law.points[point], s = p.stats, t = targets[point];
      const share = (k: 'perigeeKm' | 'apogeeKm' | 'inclinationDeg') => {
        const sens = p.sensitivity[k];
        if (!sens.ok) return 'n/a';
        const top = Object.entries(sens.shares).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 2).map(([q, v]) => `${q} ${Math.round((v ?? 0) * 100)}%`);
        return `${top.join(', ')}, other ${Math.round(sens.other * 100)}%`;
      };
      return `${point} (${p.n} runs, aim ${f(t.perigeeKm, 1)}×${f(t.apogeeKm, 1)} km ${f(t.inclinationDeg, 3)}°): `
        + `pe ${f(s.perigeeKm.mean, 2)}±${f(3 * s.perigeeKm.sigma, 2)} (bias ${f(s.perigeeKm.bias!, 2)}) [${share('perigeeKm')}]; `
        + `ap ${f(s.apogeeKm.mean, 2)}±${f(3 * s.apogeeKm.sigma, 2)} (bias ${f(s.apogeeKm.bias!, 2)}) [${share('apogeeKm')}]; `
        + `i ${f(s.inclinationDeg.mean, 4)}±${f(3 * s.inclinationDeg.sigma, 4)} [${share('inclinationDeg')}]; dv ${f(s.dvLeft.mean, 0)}±${f(3 * s.dvLeft.sigma, 0)} m/s`;
    };
    const onTarget = runs.filter((r) => r.onTarget && r.final).map((r) => r.final!), t = targets.final;
    const pe = statsOf(onTarget.map((o) => o.perigeeKm), t.perigeeKm), ap = statsOf(onTarget.map((o) => o.apogeeKm), t.apogeeKm);
    const inc = statsOf(onTarget.map((o) => o.inclinationDeg), t.inclinationDeg);
    const odd = runs.filter((r) => r.outcome !== 'inserted' || !r.onTarget)
      .map((r) => `${r.index} ${r.outcome}${r.reason ? ` ${r.reason}` : ''}${r.final ? ` ${f(r.final.perigeeKm, 1)}×${f(r.final.apogeeKm, 1)} ${f(r.final.inclinationDeg, 3)}°` : ''}`);
    // One line per set for the record (docs/history/PARALLEL-GNC-2026-09.md, G05).
    console.log(`MC ${c.vehicle} ${c.law}${c.navigation ? '+nav' : ''} ${ref.orbit}: ${law.inserted}/${law.runs} in orbit, ${law.onTarget} on target, lost ${law.lost}, short ${law.short} `
      + `${JSON.stringify(law.reasons)}; not on target [${odd.join('; ')}]; on target: pe ${f(pe.mean, 2)}±${f(3 * pe.sigma, 2)} (bias ${f(pe.bias!, 2)}) `
      + `ap ${f(ap.mean, 2)}±${f(3 * ap.sigma, 2)} (bias ${f(ap.bias!, 2)}) i ${f(inc.mean, 4)}±${f(3 * inc.sigma, 4)} (bias ${f(inc.bias!, 4)}); `
      + `${at('final')} | ${at('cutoff')}; max q·α ${f(Math.max(...runs.map((r) => r.maxQAlpha)), 0)} kPa·°; `
      + `${f(runs.reduce((a, r) => a + r.ms, 0) / runs.length / 1000, 1)} s/run`);
    // The tool: every run counted once, in one outcome; every loss named by the failure that caused it.
    expect(runs.map((r) => r.index)).toEqual([...Array(c.runs).keys()]);
    expect(law.runs).toBe(c.runs);
    expect(law.inserted + law.short + law.lost).toBe(c.runs);
    for (const r of runs) {
      if (r.outcome === 'lost') expect(r.reason ?? 'failed', `run ${r.index}`).not.toMatch(UNNAMED);
      else expect(r.final, `run ${r.index}`).toBeDefined();
    }
    // The flights: no worse than when the set was recorded.
    expect(law.lost, JSON.stringify(law.reasons)).toBeLessThanOrEqual(c.maxLost);
    expect(law.short).toBeLessThanOrEqual(c.maxShort ?? 0);
    expect(law.onTarget).toBeGreaterThanOrEqual(c.minOnTarget);
    expect(3 * pe.sigma).toBeLessThan(c.bands.perigeeKm);
    expect(3 * ap.sigma).toBeLessThan(c.bands.apogeeKm);
    expect(3 * inc.sigma).toBeLessThan(c.bands.inclinationDeg);
    expect(Math.abs(pe.bias!)).toBeLessThan(c.bands.perigeeKm);
    expect(Math.abs(ap.bias!)).toBeLessThan(c.bands.apogeeKm);
    expect(Math.abs(inc.bias!)).toBeLessThan(c.bands.inclinationDeg);
  }, 6 * 3_600_000);
}
