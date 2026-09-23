import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import type { FlexConfig } from '../src/types';
import { LAUNCH_TIME } from './fleet-harness';

/** Falcon 9 from the Cape in crosswind with a flexible body, flown for `until` seconds. */
function fly(flex: FlexConfig, until: number) {
  const sim = new Simulation({ vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'), launchTime: LAUNCH_TIME,
    guidance: guidanceForVehicle(vehicleById('falcon9'), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, dynamics: { model: 'sixDof', wind: 'crosswind', seed: 20260919, flex } }, { headless: true });
  let deflection = 0, load = 0, slosh = 0, sensor = 0;
  while (!sim.done && sim.state.t < until) {
    sim.step(sim.suggestedDt());
    const f = sim.state.rigid?.flex;
    if (f?.bending) { deflection = Math.max(deflection, f.bending.deflectionM); load = Math.max(load, f.bending.loadRatio); sensor = Math.max(sensor, f.bending.sensorErrorRad); }
    for (const tank of f?.slosh?.tanks ?? []) slosh = Math.max(slosh, tank.displacementM);
  }
  return { sim, deflection, load, slosh, sensor, keys: sim.events.map((e) => e.key) };
}

describe('a flexible Falcon 9 in closed loop (roadmap P05)', () => {
  it('without the bending filter, its IMU drives the first mode unstable and the stack breaks up', () => {
    const { sim, keys, deflection } = fly({ bending: true }, 30);
    expect(keys).toContain('evt.bendingFailure');
    expect(sim.state.status).toBe('failed');
    const breakup = sim.events.find((e) => e.key === 'evt.bendingFailure')!;
    expect(breakup.t).toBeLessThan(15);
    expect(deflection).toBeGreaterThan(0.3);
  }, 60_000);

  it('with the notch and the flexible-vehicle autopilot, it flies through max-q with centimetres of bending', () => {
    const { sim, keys, deflection, load, sensor } = fly({ bending: true, notch: true }, 90);
    expect(keys).not.toContain('evt.bendingFailure');
    expect(sim.state.status).toBe('ascent');
    expect(deflection).toBeLessThan(0.1);
    expect(load).toBeLessThan(0.5);
    expect(sensor).toBeGreaterThan(0);
  }, 120_000);

  it('sloshes its tanks by centimetres to decimetres under thrust', () => {
    const { sim, keys, slosh } = fly({ slosh: true }, 40);
    expect(keys).not.toContain('evt.bendingFailure');
    expect(sim.state.rigid!.flex!.slosh!.active).toBe(true);
    expect(sim.state.rigid!.flex!.slosh!.tanks.length).toBe(4);
    expect(slosh).toBeGreaterThan(1e-4);
    expect(slosh).toBeLessThan(0.5);
  }, 60_000);
});
