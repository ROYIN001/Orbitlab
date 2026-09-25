import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import {
  cloneDispersions, CLIP_SIGMA, DEFAULT_DISPERSIONS, dispersedVehicle, dispersedWind, drawDispersion, propulsionElements, validDispersions,
  type FlightDispersion,
} from '../src/physics/dispersion';
import {
  defaultMonteCarlo, drawLayout, ellipseOf, histogram, monteCarloCsv, monteCarloLaws, regress, runMission, sensitivityOf, statsOf,
  summarizeMonteCarlo, validMonteCarloConfig, type MonteCarloRun,
} from '../src/physics/monte-carlo';
import { MonteCarloJob, type MonteCarloReply, type MonteCarloRequest, type MonteCarloWorker } from '../src/physics/monte-carlo-job';
import { windScenario } from '../src/physics/rigid/runtime';
import type { MissionConfig } from '../src/types';
import { LAUNCH_TIME } from './fleet-harness';

function mission(vehicleId = 'falcon9', model: 'sixDof' | 'pointMass' = 'sixDof'): MissionConfig {
  return { vehicleId, satelliteId: 'cubesats', siteId: vehicleId === 'falconheavy' || vehicleId === 'falcon9' ? 'cape' : 'kourou', orbit: orbitById('leo'),
    launchTime: LAUNCH_TIME, guidance: guidanceForVehicle(vehicleById(vehicleId), DEFAULT_GUIDANCE, model), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    dynamics: model === 'sixDof' ? { model: 'sixDof', wind: 'crosswind', seed: 20260919 } : { model: 'pointMass', wind: 'calm', seed: 1 } } as MissionConfig;
}
const identity: FlightDispersion = { vehicle: {}, densityFactor: 1, windENU: { east: 0, north: 0 } };

describe('the dispersions (roadmap G05)', () => {
  const spec = vehicleById('falconheavy');

  it('draws the same numbers for the same seed and run, and others for another', () => {
    const a = drawDispersion(spec, DEFAULT_DISPERSIONS, 7, 3), b = drawDispersion(spec, DEFAULT_DISPERSIONS, 7, 3);
    expect(a).toEqual(b);
    expect(drawDispersion(spec, DEFAULT_DISPERSIONS, 7, 4).draws.map((d) => d.z)).not.toEqual(a.draws.map((d) => d.z));
    expect(drawDispersion(spec, DEFAULT_DISPERSIONS, 8, 3).draws.map((d) => d.z)).not.toEqual(a.draws.map((d) => d.z));
  });

  it('draws per stage and strap-on group, the spacecraft left out, and a switched-off quantity moves no other draw', () => {
    const ids = propulsionElements(spec).map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(spec.stages.filter((s) => !s.isSpacecraft).map((s) => s.id)));
    expect(ids.length).toBeGreaterThan(spec.stages.filter((s) => !s.isSpacecraft).length); // the side boosters
    const on = drawDispersion(spec, DEFAULT_DISPERSIONS, 11, 0);
    const offSettings = cloneDispersions(DEFAULT_DISPERSIONS); offSettings.thrust.enabled = false; offSettings.wind.enabled = false;
    const off = drawDispersion(spec, offSettings, 11, 0);
    expect(off.draws).toEqual(on.draws);
    for (const id of ids) {
      expect(off.dispersion.vehicle[id].thrust).toBe(1);
      expect(off.dispersion.vehicle[id].isp).toBe(on.dispersion.vehicle[id].isp);
      const z = on.draws.find((d) => d.element === id && d.key === 'thrust')!.z;
      expect(on.dispersion.vehicle[id].thrust).toBeCloseTo(1 + 0.01 * z, 14);
    }
    expect(off.dispersion.windENU).toEqual({ east: 0, north: 0 });
    expect(off.dispersion.windSeed).toBeUndefined();
    expect(off.dispersion.densityFactor).toBe(on.dispersion.densityFactor);
  });

  it('draws standard normal numbers, clipped at ±3σ', () => {
    const z: number[] = [];
    for (let i = 0; i < 1500; i++) z.push(...drawDispersion(vehicleById('falcon9'), DEFAULT_DISPERSIONS, 3, i).draws.map((d) => d.z));
    const s = statsOf(z);
    expect(Math.abs(s.mean)).toBeLessThan(0.03);
    expect(s.sigma).toBeGreaterThan(0.97);
    expect(s.sigma).toBeLessThan(1.03);
    expect(Math.max(...z.map(Math.abs))).toBeLessThanOrEqual(CLIP_SIGMA);
    const inOneSigma = z.filter((v) => Math.abs(v) < 1).length / z.length;
    expect(inOneSigma).toBeGreaterThan(0.66);
    expect(inOneSigma).toBeLessThan(0.70);
  });

  it('scales the engines, the propellant and the dry mass of the vehicle that flies, never the nominal one', () => {
    const before = JSON.stringify(spec);
    const factors = Object.fromEntries(propulsionElements(spec).map((e) => [e.id, { thrust: 1.02, isp: 0.99, propellant: 1.01, dryMass: 0.98 }]));
    const flown = dispersedVehicle(spec, factors);
    expect(JSON.stringify(spec)).toBe(before);
    spec.stages.forEach((st, i) => {
      const f = flown.stages[i];
      if (st.isSpacecraft) { expect(f).toEqual(st); return; }
      expect(f.engine.thrustVac).toBeCloseTo(st.engine.thrustVac * 1.02, 6);
      expect(f.engine.thrustSL).toBeCloseTo(st.engine.thrustSL * 1.02, 6);
      expect(f.engine.ispVac).toBeCloseTo(st.engine.ispVac * 0.99, 9);
      expect(f.propellantMass).toBeCloseTo(st.propellantMass * 1.01, 6);
      expect(f.dryMass).toBeCloseTo(st.dryMass * 0.98, 6);
      (st.boosters ?? []).forEach((b, j) => expect(f.boosters![j].engine.thrustVac).toBeCloseTo(b.engine.thrustVac * 1.02, 6));
    });
  });

  it('adds the run\'s steady wind and gust phase to the mission\'s', () => {
    const cross = windScenario({ model: 'sixDof', wind: 'crosswind', seed: 5 });
    const w = dispersedWind(cross, { densityFactor: 1, windENU: { east: 3, north: -4 }, windSeed: 99 });
    expect(w.velocityENU).toEqual({ x: cross.velocityENU!.x + 3, y: -4, z: 0 });
    expect(w.seed).toBe(99);
    const calm = dispersedWind(windScenario({ model: 'sixDof', wind: 'calm', seed: 5 }), { densityFactor: 1, windENU: { east: 1, north: 2 } });
    expect(calm.kind).toBe('constant');
    expect(calm.velocityENU).toEqual({ x: 1, y: 2, z: 0 });
    expect(dispersedWind(cross, undefined)).toBe(cross);
  });

  it('flies a run with nothing dispersed exactly as the nominal flight', () => {
    const cfg = mission();
    const a = new Simulation(cfg, { headless: true }), b = new Simulation(cfg, { headless: true, dispersion: identity });
    while (a.state.t < 15) { a.step(a.suggestedDt()); b.step(b.suggestedDt()); }
    expect(b.state.t).toBe(a.state.t);
    expect(b.state.r).toEqual(a.state.r);
    expect(b.state.v).toEqual(a.state.v);
    expect(b.state.rigid!.attitudeQ).toEqual(a.state.rigid!.attitudeQ);
  }, 60_000);

  it('flies the dispersed vehicle through the dispersed air', () => {
    const cfg = mission();
    const factors = Object.fromEntries(propulsionElements(vehicleById('falcon9')).map((e) => [e.id, { thrust: 1.03, isp: 1, propellant: 1, dryMass: 1 }]));
    const a = new Simulation(cfg, { headless: true });
    const b = new Simulation(cfg, { headless: true, dispersion: { vehicle: factors, densityFactor: 1.2, windENU: { east: 10, north: 0 } } });
    expect(b.rigidRuntime!.wind.velocityENU!.x).toBe(a.rigidRuntime!.wind.velocityENU!.x + 10);
    expect(b.vehicleSpec).toBe(a.vehicleSpec); // planned on the nominal vehicle
    expect(b.plan.insertionAltitude).toBe(a.plan.insertionAltitude);
    while (a.state.t < 5) { a.step(a.suggestedDt()); b.step(b.suggestedDt()); }
    expect(b.state.thrust / a.state.thrust).toBeCloseTo(1.03, 3);
    while (a.state.t < 40) { a.step(a.suggestedDt()); b.step(b.suggestedDt()); }
    // The same air data 40 s up, 20 % denser: q follows the density (the faster vehicle is higher, and faster, by a little).
    expect(b.state.q / a.state.q).toBeGreaterThan(1.1);
  }, 60_000);

  it('flies a fresh IMU realisation when the navigation is on', () => {
    const cfg = mission();
    const nav = { ...cfg, dynamics: { ...cfg.dynamics!, navigation: { grade: 'mems' as const } } };
    const a = new Simulation(nav, { headless: true }), b = new Simulation(nav, { headless: true, dispersion: { ...identity, navigationSeed: 12345 } });
    while (a.state.t < 8) { a.step(a.suggestedDt()); b.step(b.suggestedDt()); }
    expect(b.rigidRuntime!.navigation!.estimate.r).not.toEqual(a.rigidRuntime!.navigation!.estimate.r);
  }, 60_000);

  it('checks a setting: every quantity, in its range', () => {
    expect(validDispersions(cloneDispersions(DEFAULT_DISPERSIONS))).toBe(true);
    const bad = cloneDispersions(DEFAULT_DISPERSIONS); bad.thrust.sigma = 11;
    expect(validDispersions(bad)).toBe(false);
    expect(validDispersions({ ...cloneDispersions(DEFAULT_DISPERSIONS), extra: { enabled: true, sigma: 1 } })).toBe(false);
    const { density: _d, ...missing } = cloneDispersions(DEFAULT_DISPERSIONS);
    expect(validDispersions(missing)).toBe(false);
    expect(validMonteCarloConfig(defaultMonteCarlo())).toBe(true);
    expect(validMonteCarloConfig({ ...defaultMonteCarlo(), runs: 19 })).toBe(false);
    expect(validMonteCarloConfig({ ...defaultMonteCarlo(), runs: 2001 })).toBe(false);
    expect(validMonteCarloConfig({ ...defaultMonteCarlo(), seed: -1 })).toBe(false);
  });
});

describe('the Monte Carlo set (roadmap G05)', () => {
  it('flies six-DOF, under the law asked for, keeping the mission\'s guidance cycle', () => {
    const pm = runMission(mission('falcon9', 'pointMass'), 'standard');
    expect(pm.dynamics!.model).toBe('sixDof');
    const cfg = { ...mission(), dynamics: { ...mission().dynamics!, explicitGuidance: { law: 'igm' as const, cycleS: 2 } } };
    expect(runMission(cfg, 'standard').dynamics!.explicitGuidance).toBeUndefined();
    expect(runMission(cfg, 'peg').dynamics!.explicitGuidance).toEqual({ law: 'peg', cycleS: 2 });
    expect(monteCarloLaws(cfg, { compareLaws: false })).toEqual(['igm']);
    expect(monteCarloLaws(mission(), { compareLaws: false })).toEqual(['standard']);
    expect(monteCarloLaws(cfg, { compareLaws: true })).toEqual(['standard', 'peg', 'igm']);
  });

  it('reads a sample: mean, σ, bias, and the 3σ ellipse of a known covariance', () => {
    const s = statsOf([1, 2, 3, 4], 2);
    expect(s.mean).toBe(2.5);
    expect(s.sigma).toBeCloseTo(Math.sqrt(5 / 3), 12);
    expect(s.bias).toBe(0.5);
    // Points on a 45° line: all the variance along it.
    const xs = [0, 1, 2, 3, 4], ys = [0, 1, 2, 3, 4];
    const e = ellipseOf(xs, ys)!;
    expect(e.angle).toBeCloseTo(Math.PI / 4, 9);
    expect(e.a).toBeCloseTo(3 * Math.sqrt(2 * 2.5), 9);
    expect(e.b).toBeCloseTo(0, 6);
    const h = histogram([0, 0.1, 0.5, 0.9, 1], 2);
    expect(h.counts).toEqual([2, 3]);
  });

  it('recovers a linear law by regression, and shares the variance between the dispersions', () => {
    const layout = drawLayout(vehicleById('falcon9'));
    const thrustSlot = layout.findIndex((s) => s.key === 'thrust'), densitySlot = layout.findIndex((s) => s.key === 'density');
    const runs: MonteCarloRun[] = [];
    for (let i = 0; i < 300; i++) {
      const z = drawDispersion(vehicleById('falcon9'), DEFAULT_DISPERSIONS, 21, i).draws.map((d) => d.z);
      const final = { perigeeKm: 200 + 2 * z[thrustSlot] + 1 * z[densitySlot], apogeeKm: 500, inclinationDeg: 28.6, dvLeft: 3000, t: 3000 };
      runs.push({ index: i, law: 'standard', outcome: 'inserted', onTarget: true, final, cutoff: { ...final, perigeeKm: 190 + z[densitySlot], t: 480 },
        maxQkPa: 30, maxQAlpha: 100, z, ms: 1 });
    }
    const fit = regress(runs.map((r) => [r.z[thrustSlot], r.z[densitySlot]]), runs.map((r) => r.final!.perigeeKm))!;
    expect(fit.coef[0]).toBeCloseTo(2, 9);
    expect(fit.coef[1]).toBeCloseTo(1, 9);
    expect(fit.rSquared).toBeCloseTo(1, 9);
    const sens = sensitivityOf(runs, layout, DEFAULT_DISPERSIONS, 'perigeeKm');
    expect(sens.ok).toBe(true);
    // 4:1 in the population; a sample of 300 draws moves each share by a few per cent.
    expect(sens.shares.thrust!).toBeGreaterThan(0.72);
    expect(sens.shares.thrust!).toBeLessThan(0.9);
    expect(sens.shares.density!).toBeGreaterThan(0.1);
    expect(sens.shares.density!).toBeLessThan(0.28);
    expect(sens.other).toBeLessThan(0.02);
    // At the cut-off only the density drove the perigee.
    const atCutoff = sensitivityOf(runs, layout, DEFAULT_DISPERSIONS, 'perigeeKm', 'cutoff');
    expect(atCutoff.shares.density!).toBeGreaterThan(0.95);
    // Too few runs for the terms: no shares shown.
    expect(sensitivityOf(runs.slice(0, 20), layout, DEFAULT_DISPERSIONS, 'perigeeKm').ok).toBe(false);
    const { final: _f, ...lostRun } = runs[0];
    const summary = summarizeMonteCarlo([...runs, { ...lostRun, index: 300, outcome: 'lost', onTarget: false, reason: 'evt.aeroBreakup' }], layout, DEFAULT_DISPERSIONS,
      { final: { perigeeKm: 200, apogeeKm: 500, inclinationDeg: 28.6 }, cutoff: { perigeeKm: 190, apogeeKm: 500, inclinationDeg: 28.6 } });
    expect(summary.laws).toHaveLength(1);
    expect(summary.laws[0]).toMatchObject({ runs: 301, inserted: 300, lost: 1, onTarget: 300, reasons: { 'evt.aeroBreakup': 1 } });
    expect(summary.laws[0].points.final.n).toBe(300);
    expect(summary.laws[0].points.cutoff.n).toBe(301); // the lost run got through its ascent
    expect(Math.abs(summary.laws[0].points.final.stats.perigeeKm.bias!)).toBeLessThan(0.3);
    expect(Math.abs(summary.laws[0].points.cutoff.stats.perigeeKm.bias!)).toBeLessThan(0.2);
  });

  it('writes every run as CSV, with what it drew as the deviation it flew', () => {
    const layout = drawLayout(vehicleById('falcon9'));
    const z = layout.map((_, i) => (i === 0 ? 1 : 0));
    const orbit = { perigeeKm: 200.5, apogeeKm: 499, inclinationDeg: 28.61, dvLeft: 2900, t: 3200 };
    const csv = monteCarloCsv([{ index: 0, law: 'peg', outcome: 'inserted', onTarget: true, cutoff: { ...orbit, t: 487 }, final: orbit,
      maxQkPa: 31, maxQAlpha: 105, z, ms: 1 }, { index: 1, law: 'peg', outcome: 'lost', onTarget: false, reason: 'error: a, b', maxQkPa: NaN, maxQAlpha: NaN, z: [], ms: 0 }],
      layout, DEFAULT_DISPERSIONS);
    const [head, row, lost] = csv.trim().split('\n');
    const cols = head.split(',');
    expect(cols.slice(0, 5)).toEqual(['run', 'law', 'outcome', 'reason', 'on_target']);
    expect(cols).toContain('cutoff_perigee_km');
    expect(cols).toContain('final_apogee_km');
    expect(cols).toContain(`${layout[0].element}_thrust_pct`);
    expect(cols).toContain('wind_east_ms');
    expect(row.split(',')[cols.indexOf(`${layout[0].element}_thrust_pct`)]).toBe('1.0000'); // 1σ of thrust: +1 %
    expect(row.split(',')[cols.indexOf('final_time_s')]).toBe('3200.0');
    expect(lost).toContain('"error: a, b"');
  });
});

/** Workers flown in-process, each run a synthetic one, replying on the next task. */
function fakeWorkers(log: MonteCarloRequest[], opts: { dieOn?: number } = {}) {
  let died = false;
  return (): MonteCarloWorker => {
    const w: MonteCarloWorker = {
      onmessage: null, onerror: null,
      postMessage(req) {
        log.push(req);
        setTimeout(() => {
          if (opts.dieOn === req.index && !died) { died = true; w.onerror?.({ message: 'boom', preventDefault() {} } as ErrorEvent); return; }
          const final = { perigeeKm: 200 + req.index % 3, apogeeKm: 500, inclinationDeg: 28.6, dvLeft: 3000, t: 3000 };
          const reply: MonteCarloReply = { type: 'run', run: { index: req.index, law: req.law, outcome: 'inserted', onTarget: true, final, cutoff: { ...final, t: 480 },
            maxQkPa: 30, maxQAlpha: 100, z: [], ms: 1000 } };
          w.onmessage?.({ data: reply } as MessageEvent<MonteCarloReply>);
        }, 0);
      },
      terminate() { w.onmessage = null; },
    };
    return w;
  };
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('the Monte Carlo job (roadmap G05)', () => {
  it('flies every run under every law, run by run, in its workers, and is done', async () => {
    const log: MonteCarloRequest[] = [];
    const mc = { ...defaultMonteCarlo(), runs: 20, compareLaws: true };
    const job = new MonteCarloJob(mission(), mc, { workers: 4, createWorker: fakeWorkers(log) });
    expect(job.total).toBe(60);
    expect(job.workerCount).toBe(4);
    expect(job.targets.final.perigeeKm).toBe(500);
    expect(job.targets.cutoff.perigeeKm).toBe(200);
    while (job.state === 'running') await settle();
    expect(job.state).toBe('done');
    expect(job.runs).toHaveLength(60);
    expect(log.slice(0, 3).map((r) => [r.index, r.law])).toEqual([[0, 'standard'], [0, 'peg'], [0, 'igm']]);
    expect(job.summary().laws.map((l) => l.law)).toEqual(['standard', 'peg', 'igm']);
    expect(job.progress()).toMatchObject({ done: 60, total: 60, etaS: null });
    expect(job.csv().trim().split('\n')).toHaveLength(61);
  });

  it('stops when asked, and a worker that dies loses its run, not the set', async () => {
    const log: MonteCarloRequest[] = [];
    const job = new MonteCarloJob(mission(), { ...defaultMonteCarlo(), runs: 20 }, { workers: 2, createWorker: fakeWorkers(log, { dieOn: 3 }) });
    while (job.state === 'running') await settle();
    expect(job.runs).toHaveLength(20);
    expect(job.runs.filter((r) => r.outcome === 'lost')).toEqual([expect.objectContaining({ index: 3, reason: 'error: boom' })]);
    const stopped = new MonteCarloJob(mission(), { ...defaultMonteCarlo(), runs: 200 }, { workers: 2, createWorker: fakeWorkers([]) });
    await settle();
    const eta = stopped.progress().etaS;
    expect(eta).toBeGreaterThan(0);
    stopped.stop();
    const done = stopped.runs.length;
    await settle();
    expect(stopped.state).toBe('stopped');
    expect(stopped.runs.length).toBe(done);
    expect(stopped.progress().etaS).toBeNull();
  });
});
