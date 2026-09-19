import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { quickstartMission } from '../src/ui/quickstart';
import { defaultDynamics } from '../src/physics/rigid/config';
import { rigidMomentum } from '../src/physics/rigid/staging';
import { quatFromAxisAngle, quatRotate } from '../src/physics/rigid/math';
import { gravityJ2 } from '../src/physics/gravity';
import { R_EARTH, OMEGA_EARTH } from '../src/physics/constants';
import { add, cross, dot, norm, scale, sub, v3, type Vec3 } from '../src/physics/vec3';
import type { StageState, BoosterState } from '../src/physics/vehicle';
import type { RigidVehicleSnapshot } from '../src/physics/rigid/mass';

// Reach exact event boundaries through the real adapter, without a many-minute
// flight hiding which mutation lost a component or replaced body state.
type Boundaries = {
  rigidDebris: Map<number, { runtime: { integrationStepS: number } }>;
  currentRigidSnapshot(): RigidVehicleSnapshot;
  detachStage(stage: StageState): void;
  detachBooster(booster: BoosterState): void;
  separatePayload(ignite: boolean): void;
  stepFlight(dt: number): void;
  stepOrbit(dt: number): void;
  stepDebris(dt: number): void;
  applyManualEngineCommand(stage: StageState, throttle: number): void;
};
const boundary = (sim: Simulation) => sim as unknown as Boundaries;

function fixture(id: 'leo' | 'iss' = 'leo', inertPayload = false, rigidDt = 0.01) {
  const q = quickstartMission(id, new Date('2026-09-15T12:00:00Z'));
  const sim = new Simulation({ vehicleId: q.vehicleId, siteId: q.siteId,
    satelliteId: inertPayload ? 'cubesats' : q.satelliteId, orbit: q.orbit,
    launchTime: q.launchTime, guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE },
    payloadMassOverride: 1000, boosterRecovery: id === 'leo', dynamics: defaultDynamics(q.vehicleId),
  }, { headless: true, rigidDt });
  // Deliver countdown actions before placing the test at an event boundary.
  sim.state.t = 0; sim.step(0);
  sim.state.t = 100;
  sim.state.status = 'coast'; sim.state.liftoff = true;
  setBody(sim, v3(R_EARTH + 200000, 0, 0), v3(20, 7600, 100));
  return sim;
}

function setBody(sim: Simulation, r: Vec3, v: Vec3) {
  const snapshot = boundary(sim).currentRigidSnapshot();
  const state = { r, v, attitudeQ: quatFromAxisAngle(v3(1, 2, 3), 0.4), omegaBody: v3(0.03, -0.02, 0.01) };
  sim.state.r = r; sim.state.v = v; sim.state.mass = snapshot.mass;
  sim.state.altitude = norm(r) - R_EARTH; sim.state.altitudeAGL = sim.state.altitude;
  sim.state.dir = quatRotate(state.attitudeQ, v3(1, 0, 0));
  sim.state.rigid = sim.rigidRuntime!.telemetry(state, sim.state.t, snapshot);
  sim.rigidRuntime!.snapshot = snapshot;
}

function momenta(sim: Simulation, origin: Vec3, originVelocity: Vec3) {
  const live = sim.state;
  const all = [live, ...sim.debris];
  // Angular momentum in the inertial frame moving with the original CG avoids
  // subtracting huge orbital terms after rounding Earth-sized positions.
  const entries = all.map(body => rigidMomentum({ r: body.r, v: sub(body.v, originVelocity),
    attitudeQ: body.rigid!.attitudeQ, omegaBody: body.rigid!.omegaBody },
  { mass: body.mass, inertiaBody: body.rigid!.inertiaBody }, origin));
  return { mass: all.reduce((sum, body) => sum + body.mass, 0),
    linear: all.reduce((sum, body) => add(sum, scale(body.v, body.mass)), v3()),
    angular: entries.reduce((sum, entry) => add(sum, entry.angular), v3()) };
}

function expectConservative(sim: Simulation, operation: () => void) {
  const origin = { ...sim.state.r }, originVelocity = { ...sim.state.v }, before = momenta(sim, origin, originVelocity);
  operation();
  const after = momenta(sim, origin, originVelocity);
  expect(after.mass).toBeCloseTo(before.mass, 7);
  expect(norm(sub(after.linear, before.linear)) / Math.max(1, norm(before.linear))).toBeLessThan(1e-12);
  expect(norm(sub(after.angular, before.angular)) / Math.max(1, norm(before.angular))).toBeLessThan(2e-7);
  expect(sim.state.rigid!.cgBody).toEqual(boundary(sim).currentRigidSnapshot().cg);
  for (const body of [sim.state, ...sim.debris]) {
    expect([body.r.x, body.r.y, body.r.z, body.v.x, body.v.y, body.v.z, ...Object.values(body.rigid!.attitudeQ),
      ...Object.values(body.rigid!.omegaBody)].every(Number.isFinite)).toBe(true);
  }
}

describe('Simulation rigid separation boundaries', () => {
  it('ordinary Falcon stage separation retains consumed gas, health and both momenta', () => {
    const sim = fixture('leo', false, 0.005);
    const first = sim.vehicle.stages[0];
    first.propellant = 14000; first.engineFraction = 8 / 9;
    sim.rigidRuntime!.consumed.s1 = 35;
    setBody(sim, sim.state.r, sim.state.v);
    const q = { ...sim.state.rigid!.attitudeQ };
    expectConservative(sim, () => boundary(sim).detachStage(first));
    expect(sim.debris).toHaveLength(1);
    for (const axis of ['w', 'x', 'y', 'z'] as const) expect(sim.debris[0].rigid!.attitudeQ[axis]).toBeCloseTo(q[axis], 14);
    expect(sim.debris[0].rigid!.rcsPropellantKg).toBe(65);
    expect(sim.debris[0].mass).toBe(25600 + 14000 - 35);
    expect(boundary(sim).rigidDebris.get(sim.debris[0].id)!.runtime.integrationStepS).toBe(0.005);
  });

  it('Soyuz booster separation conserves mass and momenta for all four physical children', () => {
    const sim = fixture('iss'), booster = sim.vehicle.stages[0].boosters[0];
    booster.propellant = 0;
    setBody(sim, sim.state.r, sim.state.v);
    expectConservative(sim, () => boundary(sim).detachBooster(booster));
    expect(sim.debris).toHaveLength(4);
    expect(sim.debris.every(d => d.rigid && !d.recovery)).toBe(true);
    expect(new Set(sim.debris.map(d => JSON.stringify(d.rigid!.attitudeQ))).size).toBe(4);
  });

  it('an early core separation cannot silently discard still-attached Soyuz boosters', () => {
    const sim = fixture('iss');
    expectConservative(sim, () => boundary(sim).detachStage(sim.vehicle.stages[0]));
    expect(sim.debris).toHaveLength(5);
    expect(sim.vehicle.stages[0].boosters.every(b => !b.attached)).toBe(true);
  });

  it('the real fairing-release path preserves both momenta across co-located half-shell estimates', () => {
    const sim = fixture();
    expect(sim.vehicle.fairingAttached).toBe(true);
    expectConservative(sim, () => boundary(sim).stepFlight(0));
    expect(sim.vehicle.fairingAttached).toBe(false);
    expect(sim.debris.filter(d => d.visual.kind === 'fairing')).toHaveLength(2);
  });

  it('payload release retains a physical inert payload, with actual atmospheric drag', () => {
    const sim = fixture('leo', true);
    sim.vehicle.jettisonFairing();
    setBody(sim, sim.state.r, sim.state.v);
    boundary(sim).detachStage(sim.vehicle.stages[0]);
    expectConservative(sim, () => boundary(sim).separatePayload(false));
    expect(sim.state.payloadSeparated).toBe(true);
    const snapshot = sim.rigidRuntime!.snapshot!;
    expect(snapshot.mass).toBe(1000);
    expect(snapshot.aero.referenceArea).toBeCloseTo(Math.PI / 4, 12);
    expect(snapshot.aero.referenceLength).toBeCloseTo(1.2, 12);
    const r = v3(R_EARTH + 60000, 0, 0);
    setBody(sim, r, add(cross(v3(0, 0, OMEGA_EARTH), r), v3(0, 2000, 0)));
    const velocity = { ...sim.state.v }, gravity = gravityJ2(r), dt = 0.001;
    boundary(sim).stepOrbit(dt);
    const nongrav = sub(scale(sub(sim.state.v, velocity), 1 / dt), gravity);
    expect(dot(nongrav, v3(0, 1, 0))).toBeLessThan(-0.01);
  });

  it('payload release uses a finite relative ejection speed and actual component masses', () => {
    const sim = fixture('leo', true);
    sim.vehicle.jettisonFairing();
    boundary(sim).detachStage(sim.vehicle.stages[0]);
    sim.vehicle.stages[1].propellant = 10000;
    sim.rigidRuntime!.consumed.s2 = 17;
    setBody(sim, sim.state.r, sim.state.v);
    sim.state.rigid!.omegaBody = v3();
    const before = boundary(sim).currentRigidSnapshot();
    const stageMass = before.components.filter(part => part.ownerId === 's2').reduce((sum, part) => sum + part.mass, 0);
    const payloadMass = before.mass - stageMass, velocity = { ...sim.state.v };
    const axis = quatRotate(sim.state.rigid!.attitudeQ, v3(1, 0, 0));
    expect(stageMass).toBe(14283);
    expect(payloadMass).toBe(1000);
    expectConservative(sim, () => boundary(sim).separatePayload(false));
    const released = sim.debris[sim.debris.length - 1];
    expect(dot(sub(sim.state.v, released.v), axis)).toBeCloseTo(0.5, 10);
    expect(dot(sub(sim.state.v, velocity), axis)).toBeCloseTo(0.5 * stageMass / before.mass, 10);
    expect(dot(sub(released.v, velocity), axis)).toBeCloseTo(-0.5 * payloadMass / before.mass, 10);
    expect(norm(sub(sim.state.v, velocity))).toBeLessThan(0.5);
  });

  it('a child created at the accepted tick is not propagated before its creation time', () => {
    const sim = fixture();
    boundary(sim).detachStage(sim.vehicle.stages[0]);
    const child = sim.debris[0], before = JSON.stringify({ r: child.r, v: child.v, q: child.rigid!.attitudeQ });
    boundary(sim).stepDebris(0.01);
    expect(JSON.stringify({ r: child.r, v: child.v, q: child.rigid!.attitudeQ })).toBe(before);
    const r = { ...child.r };
    sim.state.t += 0.01;
    boundary(sim).stepDebris(0.01);
    expect(norm(sub(child.r, r))).toBeGreaterThan(1);
  });

  it('registers active side contact while the physical CG is still above the ground', () => {
    const sim = fixture(), r = v3(R_EARTH + 1.8, 0, 0);
    setBody(sim, r, cross(v3(0, 0, OMEGA_EARTH), r));
    sim.state.rigid!.attitudeQ = quatFromAxisAngle(v3(0, 0, 1), Math.PI / 2);
    sim.state.dir = v3(0, 1, 0);
    expect(sim.state.altitude).toBeGreaterThan(0);
    boundary(sim).stepFlight(0);
    expect(sim.isFailed()).toBe(true);
    expect(sim.events.some(event => event.key === 'evt.impact')).toBe(true);
    expect(sim.state.altitude).toBeGreaterThan(0);
  });
});

describe('manual shutdown and finite relight scheduling', () => {
  it('Soyuz non-restartable stages cannot be freely relit by moving throttle back up', () => {
    const sim = fixture('iss'), stage = sim.vehicle.stages[0];
    if (!stage.ignited) sim.vehicle.igniteStage(stage, sim.state.t);
    sim.setRigidCommand({ mode: 'manual', rates: v3(), throttle: 0 });
    boundary(sim).applyManualEngineCommand(stage, 0);
    expect(stage.cutoff).toBe(true);
    sim.setRigidCommand({ mode: 'manual', rates: v3(), throttle: 1 });
    boundary(sim).applyManualEngineCommand(stage, 1);
    sim.state.t += 20;
    sim.step(0);
    expect(stage.cutoff).toBe(true);
    expect(stage.ignitions).toBe(1);
  });

  it('a Falcon upper-stage manual relight waits for its scheduled ignition delay', () => {
    const sim = fixture(), stage = sim.vehicle.stages[1];
    boundary(sim).detachStage(sim.vehicle.stages[0]);
    sim.vehicle.igniteStage(stage, sim.state.t);
    sim.setRigidCommand({ mode: 'manual', rates: v3(), throttle: 0 });
    boundary(sim).applyManualEngineCommand(stage, 0);
    const time = sim.state.t, delay = Math.max(1, stage.spec.ignitionDelay ?? 5);
    sim.setRigidCommand({ mode: 'manual', rates: v3(), throttle: 1 });
    boundary(sim).applyManualEngineCommand(stage, 1);
    expect(stage.cutoff).toBe(true);
    sim.state.t = time + delay - 0.001; sim.step(0);
    expect(stage.cutoff).toBe(true); expect(stage.ignitions).toBe(1);
    sim.state.t = time + delay; sim.step(0);
    expect(stage.cutoff).toBe(false); expect(stage.ignitions).toBe(2);
  });
});
