import { describe, expect, it } from 'vitest';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { VehicleModel } from '../src/physics/vehicle';
import { Simulation } from '../src/physics/simulation';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { quickstartMission } from '../src/ui/quickstart';
import { defaultDynamics, supportsRigid } from '../src/physics/rigid/config';
import { buildRigidVehicle, stageMassComponents } from '../src/physics/rigid/mass';
import { allocateEngineGimbals } from '../src/physics/rigid/actuators';
import { assertSPD, quatAngularDistance, quatInverseRotate, quatRotate } from '../src/physics/rigid/math';
import { targetAttitude } from '../src/physics/rigid/runtime';
import { PROPELLANT_LOADS, STAGE_STEERING, thrusterMomentArm } from '../src/physics/rigid/vehicle-data';
import { gravityJ2 } from '../src/physics/gravity';
import { R_EARTH } from '../src/physics/constants';
import { cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../src/physics/vec3';

type Snapshot = ReturnType<typeof buildRigidVehicle>;

/** Largest moment on each body axis the gimbals (at full travel) and the thrusters can make. */
function authority(snapshot: Snapshot): { engines: Vec3; rcs: Vec3 } {
  const specs = snapshot.engines.map(e => ({ ...e, maxThrust: e.thrustBudgetN }));
  const engines = v3();
  for (const axis of ['x', 'y', 'z'] as const) {
    for (const sign of [1, -1]) {
      const want = v3(); want[axis] = sign * 1e12;
      const achieved = allocateEngineGimbals(specs, specs.map(s => s.maxThrust > 0 ? 1 : 0), want, snapshot.cg).wrench.momentBody[axis] * sign;
      engines[axis] = sign > 0 ? Math.max(0, achieved) : Math.min(engines[axis], Math.max(0, achieved));
    }
  }
  const positive = v3(), negative = v3();
  for (const jet of snapshot.rcsThrusters) {
    const moment = scale(thrusterMomentArm(jet, snapshot.cg), jet.maxThrust);
    for (const axis of ['x', 'y', 'z'] as const) { positive[axis] += Math.max(0, moment[axis]); negative[axis] += Math.max(0, -moment[axis]); }
  }
  return { engines, rcs: v3(Math.min(positive.x, negative.x), Math.min(positive.y, negative.y), Math.min(positive.z, negative.z)) };
}

describe('six-DOF data for every vehicle', () => {
  it('lets every vehicle be flown in six-DOF', () => {
    for (const vehicle of VEHICLES) expect(supportsRigid(vehicle.id)).toBe(true);
    expect(supportsRigid('no-such-vehicle')).toBe(false);
  });

  it.each(VEHICLES.map(v => v.id))('%s closes its mass through draining and every separation', id => {
    const vm = new VehicleModel(vehicleById(id), 1000);
    const check = () => {
      const snapshot = buildRigidVehicle(vm);
      expect(snapshot.mass).toBeCloseTo(vm.totalMass(), 6);
      assertSPD(snapshot.inertia);
      // Symmetric stacks: the centre of gravity is on the axis.
      expect(Math.hypot(snapshot.cg.y, snapshot.cg.z)).toBeLessThan(1e-6);
    };
    check();
    for (const stage of vm.stages) {
      stage.propellant *= 0.35;
      for (const booster of stage.boosters) booster.propellant *= 0.67;
    }
    check();
    for (const stage of vm.stages) {
      if (stage.spec.isSpacecraft) continue;
      for (const booster of stage.boosters) { vm.jettisonBooster(booster, 100); check(); }
      if (vm.fairingAttached && stage.index > 0) { vm.jettisonFairing(); check(); }
      if (stage.index < vm.stages.length - 1) { vm.separateStage(stage, 200); check(); }
    }
  });

  it.each(VEHICLES.map(v => v.id))('%s can steer on all three axes in every powered configuration', id => {
    const spec = vehicleById(id);
    spec.stages.forEach((stageSpec, k) => {
      if (stageSpec.isSpacecraft) return;
      const vm = new VehicleModel(spec, 1000);
      for (let j = 0; j < k; j++) {
        for (const booster of vm.stages[j].boosters) vm.jettisonBooster(booster, 50);
        vm.separateStage(vm.stages[j], 100);
      }
      if (k > 0 && vm.fairingAttached) vm.jettisonFairing();
      vm.igniteStage(vm.stages[k], 0);
      for (const booster of vm.stages[k].boosters) vm.igniteBooster(booster, 0);
      const snapshot = buildRigidVehicle(vm, { pressure: k === 0 ? 101325 : 0, coreThrottle: 1, boosterThrottle: 1, time: 10 });
      const { engines, rcs } = authority(snapshot);
      const label = `${id} ${stageSpec.id}`;
      // Pitch and yaw from the engines or the thrusters, roll from either:
      // no configuration that burns may be left without an axis.
      expect(engines.y + rcs.y, label).toBeGreaterThan(0);
      expect(engines.z + rcs.z, label).toBeGreaterThan(0);
      expect(engines.x + rcs.x, label).toBeGreaterThan(0);
    });
  });

  it.each(VEHICLES.map(v => v.id))('%s puts the thrust the flight model flies into its chambers, solids above their mean included', id => {
    const spec = vehicleById(id);
    spec.stages.forEach((stageSpec, k) => {
      if (stageSpec.isSpacecraft) return;
      const vm = new VehicleModel(spec, 1000);
      for (let j = 0; j < k; j++) {
        for (const booster of vm.stages[j].boosters) vm.jettisonBooster(booster, 50);
        vm.separateStage(vm.stages[j], 100);
      }
      if (k > 0 && vm.fairingAttached) vm.jettisonFairing();
      vm.igniteStage(vm.stages[k], 0);
      for (const booster of vm.stages[k].boosters) vm.igniteBooster(booster, 0);
      for (let t = 0; t < 5; t += 0.25) vm.consume(t, 1, 0.25);
      const pressure = k === 0 ? 60000 : 0;
      const thrust = vm.thrust(5, pressure, 1, 0.01);
      const snapshot = buildRigidVehicle(vm, { pressure, coreThrottle: thrust.coreLevel, boosterThrottle: thrust.boosterThrottle,
        boosterThrottles: thrust.boosterLevels, time: 5 });
      const chambers = snapshot.engines.reduce((sum, engine) => sum + engine.thrustBudgetN, 0);
      expect(chambers / thrust.thrust, `${id} ${stageSpec.id}`).toBeCloseTo(1, 9);
    });
  });

  it('gives every stage and strap-on beyond the reference vehicles a propellant and a steering entry', () => {
    const reference = new Set(['s1', 's2', 'blokA', 'blokBVGD', 'blokI', 'core', 'side']);
    for (const vehicle of VEHICLES) for (const stage of vehicle.stages) {
      for (const id of [stage.id, ...(stage.boosters ?? []).map(b => b.id)]) {
        if (reference.has(id)) continue;
        expect(STAGE_STEERING[id], `${vehicle.id} ${id} steering`).toBeDefined();
        expect(PROPELLANT_LOADS[id], `${vehicle.id} ${id} propellant`).toBeDefined();
      }
    }
  });

  it('burns a solid grain from the bore: the centre stays put and what is left sits at the case wall', () => {
    const motor = vehicleById('vegac').stages.find(s => s.id === 'z40')!;
    const full = stageMassComponents(motor, motor.propellantMass).find(c => c.kind === 'fuel')!;
    const low = stageMassComponents(motor, 0.1 * motor.propellantMass).find(c => c.kind === 'fuel')!;
    expect(low.centerBody.x).toBeCloseTo(full.centerBody.x, 12);
    // Axial radius of gyration grows as the web thins towards the case.
    expect(low.inertiaAtCenter[0] / low.mass).toBeGreaterThan(full.inertiaAtCenter[0] / full.mass);
  });

  it('puts a hydrogen stage\'s heavy oxygen where its tanks are', () => {
    // Centaur: hydrogen forward, oxygen aft. The oxidizer's centre is below the fuel's.
    const centaur = vehicleById('atlasv551').stages.find(s => s.id === 'centaur3')!;
    const parts = stageMassComponents(centaur, centaur.propellantMass);
    const ox = parts.find(c => c.kind === 'oxidizer')!, fuel = parts.find(c => c.kind === 'fuel')!;
    expect(ox.centerBody.x).toBeLessThan(fuel.centerBody.x);
    expect(ox.mass / fuel.mass).toBeCloseTo(5.88, 6);
    // Ariane 6's core is the other way round.
    const core = vehicleById('ariane64').stages.find(s => s.id === 'llpm')!;
    const coreParts = stageMassComponents(core, core.propellantMass);
    expect(coreParts.find(c => c.kind === 'oxidizer')!.centerBody.x).toBeLessThan(coreParts.find(c => c.kind === 'fuel')!.centerBody.x);
  });

  it('flies each strap-on group at its own level', () => {
    // PSLV-XL: four ground-lit PSOM-XL, two lit in the air 25 s later.
    const vm = new VehicleModel(vehicleById('pslvxl'), 1000);
    const [ground, air] = vm.stages[0].boosters;
    vm.igniteStage(vm.stages[0], 0);
    vm.igniteBooster(ground, 0);
    for (let t = 0; t < 40; t += 0.5) vm.consume(t, 1, 0.5);
    vm.igniteBooster(air, 40);
    const thrust = vm.thrust(40.2, 50000, 1, 0.01);
    expect(thrust.boosterLevels).toHaveLength(2);
    // The pair is still spinning up while the four are well down their regressive profile.
    expect(thrust.boosterLevels[1]).not.toBeCloseTo(thrust.boosterLevels[0], 2);
    expect(thrust.boosterThrottle).toBe(Math.min(1, Math.max(...thrust.boosterLevels)));
    const snapshot = buildRigidVehicle(vm, { pressure: 50000, coreThrottle: thrust.coreThrottle, boosterThrottle: thrust.boosterThrottle,
      boosterThrottles: thrust.boosterLevels, time: 40.2 });
    const unit = (prefix: string) => snapshot.engines.find(e => e.id.startsWith(prefix))!.thrustBudgetN;
    expect(unit('psoma.') / unit('psomg.')).toBeCloseTo(thrust.boosterLevels[1] / thrust.boosterLevels[0], 9);
  });
});

describe('six-DOF engine allocation', () => {
  it('asks a single on-axis chamber for no roll it cannot make', () => {
    // A centre of gravity 1e-17 m off the axis gives the chamber a roll
    // "authority" of rounding error; a small pitch demand must stay small.
    const engine = { id: 'core', positionBody: v3(), directionBody: v3(1, 0, 0), maxThrust: 3e6, minThrottle: 0,
      gimbalAxesBody: [v3(0, 1, 0), v3(0, 0, 1)], maxGimbalRad: 3 * Math.PI / 180, maxGimbalRateRadS: 0.35, timeConstantS: 0.1 };
    const cg = v3(12.5, -1.2e-17, 3.5e-17);
    const allocation = allocateEngineGimbals([engine], [1], v3(-0.004, 22e3, -42e3), cg);
    const travel = Math.hypot(...allocation.commands[0].deflections) * 180 / Math.PI;
    expect(travel).toBeLessThan(0.2);
    expect(Math.abs(allocation.wrench.momentBody.z + 42e3)).toBeLessThan(420);
  });
});

describe('held coast', () => {
  function orbiting() {
    const q = quickstartMission('leo', new Date('2026-09-15T12:00:00Z'));
    const sim = new Simulation({ vehicleId: q.vehicleId, siteId: q.siteId, satelliteId: 'cubesats', orbit: q.orbit,
      launchTime: q.launchTime, guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE },
      payloadMassOverride: 1000, boosterRecovery: false, dynamics: defaultDynamics(q.vehicleId) }, { headless: true });
    sim.state.t = 0; sim.step(0);
    sim.staging.detachStage(sim.vehicle.stages[0]);
    sim.vehicle.jettisonFairing();
    sim.state.t = 600; sim.state.status = 'orbit'; sim.state.liftoff = true;
    const r = v3(R_EARTH + 400e3, 0, 0), v = v3(0, 7669, 50);
    const snapshot = sim.rigidLink.currentRigidSnapshot()!;
    // On the prograde target, turning with it, 0.3° behind: an autopilot's steady state.
    const vHat = normalize(v), g = gravityJ2(r), turn = cross(vHat, scale(sub(g, scale(vHat, dot(g, vHat))), 1 / norm(v)));
    const attitudeQ = targetAttitude(normalize(v3(0.005, 1, 0)), v3(0, 0, 1));
    const state = { r, v, attitudeQ, omegaBody: quatInverseRotate(attitudeQ, turn) };
    sim.state.r = r; sim.state.v = v; sim.state.mass = snapshot.mass;
    sim.state.altitude = 400e3; sim.state.altitudeAGL = 400e3;
    sim.state.dir = quatRotate(attitudeQ, v3(1, 0, 0));
    sim.state.rigid = sim.rigidRuntime!.telemetry(state, sim.state.t, snapshot);
    sim.rigidRuntime!.snapshot = snapshot;
    return sim;
  }

  it('propagates a settled vacuum coast in long steps and agrees with control ticks', () => {
    const held = orbiting(), ticked = orbiting();
    // Both settle in control ticks first, identically, into the autopilot's own steady state.
    const heldWindow = held.rigidLink.heldCoastWindow.bind(held.rigidLink);
    held.rigidLink.heldCoastWindow = () => 0;
    ticked.rigidLink.heldCoastWindow = () => 0;
    for (const sim of [held, ticked]) while (sim.state.t < 660 - 1e-9) sim.step(sim.suggestedDt());
    held.rigidLink.heldCoastWindow = heldWindow;
    expect(held.rigidLink.heldCoastWindow()).toBeGreaterThan(0);
    const gas = held.state.rigid!.rcsPropellantKg;
    let heldSteps = 0;
    while (held.state.t < 900) { held.step(held.suggestedDt()); heldSteps++; }
    while (ticked.state.t < held.state.t - 1e-9) ticked.step(Math.min(ticked.suggestedDt(), held.state.t - ticked.state.t));
    expect(heldSteps).toBeLessThan(40);
    expect(norm(sub(held.state.r, ticked.state.r))).toBeLessThan(1);
    expect(norm(sub(held.state.v, ticked.state.v))).toBeLessThan(1e-3);
    // The autopilot's lag behind the turning target is kept, not snapped away.
    expect(quatAngularDistance(held.state.rigid!.attitudeQ, ticked.state.rigid!.attitudeQ) * 180 / Math.PI).toBeLessThan(0.05);
    expect(held.state.rigid!.rcsPropellantKg).toBe(gas);
    expect(gas - ticked.state.rigid!.rcsPropellantKg).toBeLessThan(0.05);
  }, 240000);

  it('keeps control ticks under a manual command or off the target rate', () => {
    const manual = orbiting();
    manual.setRigidCommand({ mode: 'manual', rates: v3(), throttle: 0 });
    expect(manual.rigidLink.heldCoastWindow()).toBe(0);
    const spinning = orbiting();
    spinning.state.rigid = { ...spinning.state.rigid!, omegaBody: v3(0.01, 0, 0) };
    expect(spinning.rigidLink.heldCoastWindow()).toBe(0);
  });
});
