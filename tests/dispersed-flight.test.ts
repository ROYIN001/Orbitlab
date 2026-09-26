/**
 * One dispersed flight (roadmap P08): a mission naming run n of a Monte Carlo set flies run n of
 * that set — the same draws, in the same order, from the same stream as G05 — in point-mass and in
 * six-DOF; a mission that names none flies as it always did; the run travels in a mission file.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, guidanceForVehicle } from '../src/physics/defaults';
import { cloneDispersions, DEFAULT_DISPERSIONS, drawDispersion, runSeed, type FlightDispersion } from '../src/physics/dispersion';
import { configuredDispersion, DISPERSED_RUN_MAX, validDispersedFlight } from '../src/physics/dispersed-flight';
import { dispersedRunMission, runMission } from '../src/physics/monte-carlo';
import { validateDynamics } from '../src/physics/rigid/config';
import { defaultMissionState } from '../src/lessons/config';
import { missionDocument, parseMissionDocument } from '../src/config/mission-file';
import type { MissionConfig } from '../src/types';

function falcon9(model: 'pointMass' | 'sixDof'): MissionConfig {
  return {
    vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: { ...orbitById('leo') }, launchTime: new Date('2026-09-15T12:00:00Z'),
    guidance: guidanceForVehicle(vehicleById('falcon9'), undefined, model), guidanceResolved: true, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    payloadMassOverride: 10000, dynamics: { model, wind: 'calm', seed: 20260919 },
  };
}
/** Fly to `until` as a Monte Carlo run flies (no loop or equation record: the flight is the same). */
function fly(cfg: MissionConfig, until: number, dispersion?: FlightDispersion): Simulation {
  const sim = new Simulation(cfg, { headless: true, equations: false, rigidOptions: { recordLoop: false }, ...(dispersion ? { dispersion } : {}) });
  while (sim.state.t < until && !sim.done) sim.step(sim.suggestedDt());
  return sim;
}
const same = (a: Simulation, b: Simulation) => {
  expect(a.state.t).toBe(b.state.t);
  expect([a.state.r.x, a.state.r.y, a.state.r.z, a.state.v.x, a.state.v.y, a.state.v.z]).toEqual([b.state.r.x, b.state.r.y, b.state.r.z, b.state.v.x, b.state.v.y, b.state.v.z]);
  expect(a.state.mass).toBe(b.state.mass);
};

describe('a dispersed flight', () => {
  it('is drawn by G05\'s own function, stream and order, which P08 leaves as they were', () => {
    const spec = vehicleById('falcon9');
    expect(configuredDispersion(spec, { seed: 7, run: 3 })).toEqual(drawDispersion(spec, DEFAULT_DISPERSIONS, 7, 3).dispersion);
    // the set's stream is the one G05 fixed: a change here would change every set already flown
    expect([runSeed(1, 0), runSeed(1, 1), runSeed(7, 3)]).toMatchInlineSnapshot(`
      [
        209987748,
        3675191115,
        1342634795,
      ]
    `);
    expect(DEFAULT_DISPERSIONS.thrust).toEqual({ enabled: true, sigma: 1 });
  });

  it('in point-mass: run n named in the mission flies as run n drawn by the set, and differs from the nominal flight', () => {
    const cfg = falcon9('pointMass');
    const drawn = drawDispersion(vehicleById('falcon9'), DEFAULT_DISPERSIONS, 7, 3).dispersion;
    const named = fly({ ...cfg, dynamics: { ...cfg.dynamics!, dispersion: { seed: 7, run: 3 } } }, 300);
    same(named, fly(cfg, 300, drawn));
    const nominal = fly(cfg, 300);
    expect(nominal.state.r.x).not.toBe(named.state.r.x);
    // another run of the set flies otherwise, and the same run the same every time
    expect(fly({ ...cfg, dynamics: { ...cfg.dynamics!, dispersion: { seed: 7, run: 4 } } }, 300).state.r.x).not.toBe(named.state.r.x);
    same(fly({ ...cfg, dynamics: { ...cfg.dynamics!, dispersion: { seed: 7, run: 3 } } }, 300), named);
  });

  it('with no run named, flies exactly as the nominal flight always has', () => {
    const cfg = falcon9('pointMass');
    const a = fly(cfg, 400), b = fly(structuredClone(cfg), 400);
    same(a, b);
    expect(a.vehicle.spec).toEqual(vehicleById('falcon9'));
  });

  it('in six-DOF: the Monte Carlo window\'s run, opened on its own, is the set\'s run', { timeout: 120_000 }, () => {
    const cfg = falcon9('pointMass');
    const mc = { seed: 11, dispersions: cloneDispersions(DEFAULT_DISPERSIONS) };
    const mission = dispersedRunMission(cfg, mc, { index: 5, law: 'peg' });
    expect(mission.dynamics).toMatchObject({ model: 'sixDof', explicitGuidance: { law: 'peg' }, dispersion: { seed: 11, run: 5 } });
    expect(mission.dynamics!.dispersion!.settings).toBeUndefined();
    const asRun = fly(runMission(cfg, 'peg'), 40, drawDispersion(vehicleById('falcon9'), mc.dispersions, 11, 5).dispersion);
    same(fly(mission, 40), asRun);
    // a set with its own dispersions carries them
    const custom = cloneDispersions(DEFAULT_DISPERSIONS);
    custom.thrust.sigma = 2;
    expect(dispersedRunMission(cfg, { seed: 11, dispersions: custom }, { index: 5, law: 'standard' }).dynamics!.dispersion!.settings!.thrust.sigma).toBe(2);
  });

  it('accepts only a run a set can have, and travels in a mission file', () => {
    expect(validDispersedFlight({ seed: 1, run: 0 })).toBe(true);
    expect(validDispersedFlight({ seed: 1, run: DISPERSED_RUN_MAX })).toBe(true);
    for (const bad of [{ seed: 1, run: DISPERSED_RUN_MAX + 1 }, { seed: -1, run: 0 }, { seed: 1, run: 1.5 }, { seed: 1, run: 0, extra: true }, { seed: 1, run: 0, settings: { thrust: 1 } }, null]) {
      expect(validDispersedFlight(bad), JSON.stringify(bad)).toBe(false);
    }
    expect(validateDynamics({ model: 'pointMass', wind: 'calm', seed: 1, dispersion: { seed: 1, run: 2 } }, 'falcon9')).toBe(true);
    expect(validateDynamics({ model: 'pointMass', wind: 'calm', seed: 1, dispersion: { seed: 1, run: -2 } }, 'falcon9')).toBe(false);
    const state = { ...defaultMissionState(), dynamics: { model: 'pointMass' as const, wind: 'calm' as const, seed: 5, dispersion: { seed: 9, run: 12 } } };
    const parsed = parseMissionDocument(JSON.parse(JSON.stringify(missionDocument(state))), defaultMissionState());
    expect(parsed.usable).toBe(true);
    expect(parsed.state.dynamics?.dispersion).toEqual({ seed: 9, run: 12 });
  });
});
