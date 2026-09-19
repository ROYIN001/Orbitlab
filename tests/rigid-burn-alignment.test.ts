import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { rigidMission } from './rigid-harness';
import { buildRigidVehicle } from '../src/physics/rigid/mass';
import { quatRotate } from '../src/physics/rigid/math';
import { elementsFromState, type OrbitalElements } from '../src/physics/orbital';
import type { BurnPlan } from '../src/physics/mission';
import { MU_EARTH, R_EARTH } from '../src/physics/constants';
import { v3 } from '../src/physics/vec3';

type BurnBoundary = { startBurn(burn: BurnPlan): void; checkBurn(elements: OrbitalElements): void; burnIgnited: boolean };
const boundary = (sim: Simulation) => sim as unknown as BurnBoundary;

function exhaustedCoast() {
  const sim = new Simulation(rigidMission('leo'), { headless: true });
  sim.state.t = 0; sim.step(0); // drain launch actions before injecting the orbital fixture
  sim.vehicle.stages[0].attached = false; sim.vehicle.activeIndex = 1; sim.vehicle.fairingAttached = false;
  sim.vehicle.stages[1].propellant = 20000;
  let snapshot = buildRigidVehicle(sim.vehicle, { pressure: 0, coreThrottle: 0, boosterThrottle: 0, time: 100 });
  for (const gas of snapshot.rcs) sim.rigidRuntime!.consumed[gas.stageId] = gas.initialPropellantKg;
  snapshot = buildRigidVehicle(sim.vehicle, { pressure: 0, coreThrottle: 0, boosterThrottle: 0, time: 100,
    rcsConsumedKgByStage: sim.rigidRuntime!.consumed });
  const radius = R_EARTH + 490000;
  const body = { r: v3(radius, 0, 0), v: v3(0, 0.999 * Math.sqrt(MU_EARTH / radius), 0),
    attitudeQ: { w: 1, x: 0, y: 0, z: 0 }, omegaBody: v3(0.02, 0, 0) };
  Object.assign(sim.state, { t: 100, status: 'coast', liftoff: true, r: body.r, v: body.v,
    dir: quatRotate(body.attitudeQ, v3(1, 0, 0)), altitude: 490000, altitudeAGL: 490000, mass: snapshot.mass,
    elements: elementsFromState(body.r, body.v), rigid: sim.rigidRuntime!.telemetry(body, 100, snapshot) });
  sim.rigidRuntime!.snapshot = snapshot;
  const burn: BurnPlan = { id: 'small-trim', kind: 'shapeAtApoapsis', atU: 'asap', targetPeriapsis: 500000,
    dvEstimate: 8, maxDuration: 600, done: false };
  sim.plan.burns = [burn]; boundary(sim).startBurn(burn);
  return sim;
}

describe('physical burn-pointing timeout', () => {
  it('ends an unignited small trim after 240 s with a truthful off-target result and no state snap', () => {
    const sim = exhaustedCoast(), start = sim.state.burnStartTime;
    expect(sim.state.rigid!.rcsPropellantKg).toBe(0);
    // Integrate two real rigid ticks at the wait boundary: fuel/attitude cannot
    // be conjured by mission guidance even when a small correction is required.
    sim.state.t = start + 239.98;
    const fuel = sim.vehicle.active!.propellant;
    sim.step(0.01);
    expect(sim.state.status).toBe('burn'); expect(sim.state.thrust).toBe(0);
    expect(sim.state.burnDvRemaining).toBeGreaterThan(0.05); expect(sim.state.burnDvRemaining).toBeLessThan(40);
    sim.state.t = start + 240;
    const physical = structuredClone({ r: sim.state.r, v: sim.state.v, rigid: sim.state.rigid, mass: sim.state.mass });
    boundary(sim).checkBurn(sim.state.elements);
    expect({ r: sim.state.r, v: sim.state.v, rigid: sim.state.rigid, mass: sim.state.mass }).toEqual(physical);
    expect(sim.state.status).toBe('orbit'); expect(sim.state.note).toBe('orbitOffTarget');
    expect(sim.state.currentBurn).toBeNull(); expect(sim.state.nextBurnTime).toBe(-1);
    expect(sim.state.burnPlaneNormal).toBeNull(); expect(sim.plan.burns.every(burn => burn.done)).toBe(true);
    expect(sim.vehicle.active!.cutoff).toBe(true); expect(sim.vehicle.active!.propellant).toBe(fuel);
    expect(sim.events.slice(-2).map(event => event.key)).toEqual(['evt.burnAlignmentTimeout', 'evt.offTargetOrbit']);
    expect(sim.events.at(-2)!.params).toEqual({ seconds: 240 });
    expect(sim.events.some(event => ['evt.insufficientDv', 'evt.outOfPropellant', 'evt.targetOrbit'].includes(event.key))).toBe(false);
    sim.step(0.01);
    expect(sim.state.status).toBe('orbit'); expect(sim.state.thrust).toBe(0);
    expect(sim.events.filter(event => event.key === 'evt.burnAlignmentTimeout')).toHaveLength(1);
  });

  it('does not apply the alignment guard to a lit burn or manual control', () => {
    for (const condition of ['lit', 'manual'] as const) {
      const sim = exhaustedCoast(); sim.state.t = sim.state.burnStartTime + 241;
      if (condition === 'lit') boundary(sim).burnIgnited = true;
      else sim.setRigidCommand({ mode: 'manual', rates: v3(), throttle: 0 });
      boundary(sim).checkBurn(sim.state.elements);
      expect(sim.state.status).toBe('burn');
      expect(sim.events.some(event => event.key === 'evt.burnAlignmentTimeout')).toBe(false);
    }
  });

  it('keeps the legacy point-mass small-trim behavior unchanged', () => {
    const cfg = rigidMission('leo'); cfg.dynamics = { model: 'pointMass', wind: 'calm', seed: 0 };
    const sim = new Simulation(cfg, { headless: true });
    const radius = R_EARTH + 490000;
    sim.state.r = v3(radius, 0, 0); sim.state.v = v3(0, Math.sqrt(MU_EARTH / radius), 0);
    sim.state.elements = elementsFromState(sim.state.r, sim.state.v);
    const burn: BurnPlan = { id: 'legacy-trim', kind: 'shapeAtApoapsis', atU: 'asap', dvEstimate: 8, done: false };
    boundary(sim).startBurn(burn); sim.state.t = sim.state.burnStartTime + 241;
    boundary(sim).checkBurn(sim.state.elements);
    expect(sim.state.status).toBe('burn');
    expect(sim.events.some(event => event.key === 'evt.burnAlignmentTimeout')).toBe(false);
  });
});
