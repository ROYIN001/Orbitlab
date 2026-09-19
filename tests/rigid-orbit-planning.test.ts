import { afterEach, describe, expect, it, vi } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { rigidMission } from './rigid-harness';
import { buildRigidVehicle } from '../src/physics/rigid/mass';
import { quatFromBasis } from '../src/physics/rigid/math';
import { elementsFromState, type OrbitalElements } from '../src/physics/orbital';
import { cross, norm, normalize, v3 } from '../src/physics/vec3';
import * as prediction from '../src/physics/rigid/orbit-prediction';
import type { BurnPlan } from '../src/physics/mission';
import { MU_EARTH, R_EARTH, J2_EARTH } from '../src/physics/constants';

type Boundary = {
  scheduleNextBurn(el: OrbitalElements): void; startBurn(burn: BurnPlan): void; checkBurn(el: OrbitalElements): void;
  checkCoast(el: OrbitalElements): void;
  rigidBurnForecast: unknown; rigidTransfer: { requiredDv: number; deliveredDv: number } | null;
  burnIgnited: boolean; stalledReplans: number; pending: { label: string; t: number }[];
};
const boundary = (sim: Simulation) => sim as unknown as Boundary;

function cutoffFixture() {
  const sim = new Simulation(rigidMission('leo'), { headless: true });
  sim.state.t = 0; sim.step(0);
  boundary(sim).pending = [];
  sim.vehicle.stages[0].attached = false; sim.vehicle.activeIndex = 1; sim.vehicle.fairingAttached = false;
  sim.vehicle.stages[1].propellant = 20000;
  sim.vehicle.cutoffStage(sim.vehicle.stages[1], 476);
  const r = { x: -1911760.9277536185, y: 5531958.611252583, z: 3002423.2014054745 };
  const v = { x: -7529.928274189406, y: -1983.8878754978946, z: -1141.0086645731217 };
  const x = normalize(v), z = normalize(cross(r, v)), y = normalize(cross(z, x));
  const state = { r, v, attitudeQ: quatFromBasis(x, y, z), omegaBody: v3() };
  const snapshot = buildRigidVehicle(sim.vehicle, { pressure: 0, coreThrottle: 0, boosterThrottle: 0, time: 476.0780467593383 });
  Object.assign(sim.state, { ...state, t: 476.0780467593383, status: 'coast', liftoff: true,
    dir: x, altitude: norm(r) - 6378137, altitudeAGL: norm(r) - 6378137, mass: snapshot.mass,
    thrust: 0, throttle: 0, coreThrottle: 0, boosterThrottle: 0,
    elements: elementsFromState(r, v), rigid: sim.rigidRuntime!.telemetry(state, 476.0780467593383, snapshot) });
  sim.rigidRuntime!.snapshot = snapshot;
  sim.plan.burns = [{ id: 'shape', kind: 'shapeAtApoapsis', atU: 'asap', targetPeriapsis: 500000,
    targetInclination: sim.plan.target.inclination, dvEstimate: 85, done: false }];
  return sim;
}

afterEach(() => vi.restoreAllMocks());

describe('J2-consistent six-DOF burn planning', () => {
  it('can schedule a node plane change on an exact circular equatorial J2 orbit without a unique apex', () => {
    const sim = cutoffFixture(), radius = R_EARTH + 500000;
    sim.state.r = v3(radius, 0, 0);
    sim.state.v = v3(0, Math.sqrt(MU_EARTH / radius * (1 + 1.5 * J2_EARTH * (R_EARTH / radius) ** 2)), 0);
    sim.state.elements = elementsFromState(sim.state.r, sim.state.v);
    boundary(sim).scheduleNextBurn(sim.state.elements);
    expect(sim.state.status).toBe('coast');
    expect(sim.state.currentBurn?.kind).toBe('shapeAtApoapsis');
    expect(sim.state.nextBurnTime).toBeGreaterThan(sim.state.t);
    expect(sim.events.some(event => event.key === 'evt.burnPredictionUnavailable')).toBe(false);
  });

  it('delivers a real physical-apex correction when the frozen conic already meets the old cutoff condition', () => {
    const sim = cutoffFixture();
    expect(sim.state.elements.apoapsisAlt).toBeGreaterThan(498000);
    boundary(sim).scheduleNextBurn(sim.state.elements);
    const correction = sim.state.currentBurn!;
    expect(correction.physicalApoapsis).toBe(500000);
    expect(sim.plan.burns.map(b => b.kind)).toEqual(['raiseApoapsis', 'shapeAtApoapsis']);
    boundary(sim).pending = [];
    boundary(sim).startBurn(correction);
    boundary(sim).checkBurn(sim.state.elements);
    expect(correction.done).toBe(false); // cannot finish before physical ignition/impulse
    const fuel = sim.vehicle.active!.propellant;
    let maximumDelivered = 0;
    for (let count = 0; count < 4000 && !correction.done && !sim.done; count++) {
      sim.step(sim.suggestedDt());
      maximumDelivered = Math.max(maximumDelivered, boundary(sim).rigidTransfer?.deliveredDv ?? 0);
    }
    expect(correction.done).toBe(true);
    expect(maximumDelivered).toBeGreaterThan(3);
    expect(sim.vehicle.active!.propellant).toBeLessThan(fuel);
    expect(boundary(sim).stalledReplans).toBe(0);
    expect(sim.state.currentBurn?.kind).toBe('shapeAtApoapsis');
    const apex = prediction.nextJ2Apsis(sim.state, 'apoapsis')!;
    expect(apex.radiusM - 6378137).toBeGreaterThan(499000);
    expect(apex.radiusM - 6378137).toBeLessThan(502000);
  });

  it('replans a changed coast and never executes a stale scheduled burn under manual control', () => {
    const sim = cutoffFixture(); boundary(sim).scheduleNextBurn(sim.state.elements);
    const burn = sim.state.currentBurn!;
    expect(boundary(sim).rigidBurnForecast).not.toBeNull();
    sim.setRigidCommand({ mode: 'manual', rates: v3(0.01, 0, 0), throttle: 0 });
    expect(boundary(sim).rigidBurnForecast).toBeNull();
    boundary(sim).startBurn(burn);
    expect(sim.state.status).toBe('coast'); expect(sim.state.thrust).toBe(0);
    sim.setRigidCommand({ mode: 'auto', rates: v3(), throttle: 0 });
    boundary(sim).checkCoast(sim.state.elements);
    expect(boundary(sim).pending.filter(action => action.label === 'burnStart')).toHaveLength(1);
    expect(sim.state.currentBurn).not.toBe(burn);
    const firstForecast = boundary(sim).rigidBurnForecast;
    sim.vehicle.active!.engineFraction = 0.8;
    boundary(sim).checkCoast(sim.state.elements);
    expect(boundary(sim).rigidBurnForecast).not.toBe(firstForecast);
    expect(boundary(sim).pending.filter(action => action.label === 'burnStart')).toHaveLength(1);
  });

  it('retains physical state and an honest off-target result if a needed forecast has no solution', () => {
    const sim = cutoffFixture();
    const before = structuredClone({ r: sim.state.r, v: sim.state.v, rigid: sim.state.rigid, mass: sim.state.mass });
    vi.spyOn(prediction, 'nextJ2Apsis').mockReturnValue(null);
    boundary(sim).scheduleNextBurn(sim.state.elements);
    expect({ r: sim.state.r, v: sim.state.v, rigid: sim.state.rigid, mass: sim.state.mass }).toEqual(before);
    expect(sim.state.status).toBe('orbit'); expect(sim.state.note).toBe('orbitOffTarget');
    expect(sim.events.slice(-2).map(e => e.key)).toEqual(['evt.burnPredictionUnavailable', 'evt.offTargetOrbit']);
    expect(sim.events.some(e => e.key === 'evt.insufficientDv')).toBe(false);
  });

  it('does not count operator mode changes before ignition as failed physical correction attempts', () => {
    const sim = cutoffFixture(); boundary(sim).scheduleNextBurn(sim.state.elements);
    const fuel = sim.vehicle.active!.propellant;
    for (let attempt = 0; attempt < 5; attempt++) {
      sim.setRigidCommand({ mode: 'manual', rates: v3(), throttle: 0 });
      sim.setRigidCommand({ mode: 'auto', rates: v3(), throttle: 0 });
      boundary(sim).checkCoast(sim.state.elements);
      expect(sim.state.status).toBe('coast');
      expect(sim.state.currentBurn?.physicalApoapsis).toBe(500000);
    }
    expect(sim.vehicle.active!.propellant).toBe(fuel);
    expect(sim.events.some(e => e.key === 'evt.burnPredictionUnavailable')).toBe(false);
  });
});
