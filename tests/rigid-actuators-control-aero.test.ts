import { describe, expect, it } from 'vitest';
import { DEG, G0 } from '../src/physics/constants';
import { dot, norm, scale, sub, v3 } from '../src/physics/vec3';
import {
  allocateEngineGimbals, allocateRcs, createEngineStates, engineWrench, stepEngineActuators, stepRcs,
  type EngineActuatorSpec, type RcsThrusterSpec,
} from '../src/physics/rigid/actuators';
import { attitudeControl, limitAscentCommand, rateControl, type ControlGains } from '../src/physics/rigid/control';
import { aerodynamicWrench, enuWindToEci, windVelocityECI, windVelocityENU, type Aero6DofSpec, type WindScenario } from '../src/physics/rigid/aero';
import { quatAngularDistance, quatFromAxisAngle, quatIdentity, quatMultiply, quatRotate, type Mat3 } from '../src/physics/rigid/math';
import { integrateRigidStep, type RigidState } from '../src/physics/rigid/integrator';

const engine = (overrides: Partial<EngineActuatorSpec> = {}): EngineActuatorSpec => ({
  id: 'reference-engine', positionBody: v3(-2, 0, 0), directionBody: v3(1, 0, 0),
  maxThrust: 100, minThrottle: 0,
  gimbalAxesBody: [v3(0, 1, 0), v3(0, 0, 1)],
  maxGimbalRad: 0.2, maxGimbalRateRadS: 0.5, timeConstantS: 0.1,
  ...overrides,
});
const inertia: Mat3 = [2, 0, 0, 0, 3, 0, 0, 0, 4];
const gains: ControlGains = {
  attitudeGain: v3(2, 2, 2), rateGain: v3(4, 4, 4),
  maxRate: v3(0.3, 0.3, 0.3), maxAngularAcceleration: v3(0.5, 0.5, 0.5),
};

/** Six torque couples, each made from two actual opposite-force nozzles. */
function rcs(): RcsThrusterSpec[] {
  const pairs = [
    { axis: v3(0, 0, 1), force: v3(0, -1, 0) }, // positive roll
    { axis: v3(0, 0, 1), force: v3(1, 0, 0) }, // positive pitch
    { axis: v3(0, 1, 0), force: v3(-1, 0, 0) }, // positive yaw
  ];
  const jets: RcsThrusterSpec[] = [];
  pairs.forEach((pair, axis) => {
    for (const sign of [-1, 1]) for (const side of [-1, 1]) {
      jets.push({ id: `${axis}/${sign}/${side}`, positionBody: scale(pair.axis, side),
        directionBody: scale(pair.force, side * sign), maxThrust: 10, isp: 60 });
    }
  });
  return jets;
}

describe('physical TVC forces and finite actuators', () => {
  it('computes pitch/yaw moments from the actual thrust direction and engine lever arm', () => {
    const spec = engine();
    const y = engineWrench([spec], [{ deflections: [0.1, 0], throttle: 1 }], v3());
    expect(y.forceBody.x).toBeCloseTo(100 * Math.cos(0.1), 10);
    expect(y.forceBody.z).toBeCloseTo(-100 * Math.sin(0.1), 10);
    expect(y.momentBody.y).toBeCloseTo(-200 * Math.sin(0.1), 10);
    expect(y.momentBody.x).toBe(0);
    const z = engineWrench([spec], [{ deflections: [0, 0.1], throttle: 1 }], v3());
    expect(z.forceBody.y).toBeCloseTo(100 * Math.sin(0.1), 10);
    expect(z.momentBody.z).toBeCloseTo(-200 * Math.sin(0.1), 10);
    expect(z.momentBody.x).toBe(0);
  });

  it('enforces combined angle, slew-rate and lag limits without changing the supplied state', () => {
    const spec = engine({ maxGimbalRateRadS: 0.05 });
    const initial = createEngineStates([spec]);
    const command = [{ deflections: [1, 1], throttle: 1 }];
    const first = stepEngineActuators([spec], initial, command, 0.1);
    expect(Math.hypot(...first[0].deflections)).toBeCloseTo(0.005, 10);
    expect(initial[0].deflections).toEqual([0, 0]);
    let state = first;
    for (let step = 0; step < 200; step++) {
      const next = stepEngineActuators([spec], state, command, 0.1);
      expect(Math.hypot(...next[0].deflections)).toBeLessThanOrEqual(0.2 + 1e-12);
      expect(Math.hypot(...next[0].deflections.map((v, i) => v - state[0].deflections[i]))).toBeLessThanOrEqual(0.005 + 1e-12);
      state = next;
    }
    expect(Math.hypot(...state[0].deflections)).toBeCloseTo(0.2, 8);
    const slow = engine({ timeConstantS: 2, maxGimbalRateRadS: 10 });
    const response = stepEngineActuators([slow], createEngineStates([slow]), [{ deflections: [0.1, 0], throttle: 1 }], 0.2);
    expect(response[0].deflections[0]).toBeCloseTo(0.1 * (1 - Math.exp(-0.1)), 12);
  });

  it('enforces throttle limits and produces zero thrust and torque for a disabled engine', () => {
    const spec = engine({ minThrottle: 0.5 });
    const state = createEngineStates([spec]);
    const throttled = stepEngineActuators([spec], state, [{ deflections: [0, 0], throttle: 0.1 }], 0.01);
    expect(throttled[0].throttle).toBe(0.5);
    const disabled = stepEngineActuators([spec], throttled, [{ deflections: [0.1, 0], throttle: 1, enabled: false }], 1);
    const wrench = engineWrench([spec], disabled, v3());
    expect(norm(wrench.forceBody)).toBe(0);
    expect(norm(wrench.momentBody)).toBe(0);
  });

  it('allocates the correct control signs on pitch and yaw, including finite travel', () => {
    const spec = engine();
    const allocation = allocateEngineGimbals([spec], [1], v3(0, 1, 2), v3());
    expect(allocation.commands[0].deflections[0]).toBeLessThan(0);
    expect(allocation.commands[0].deflections[1]).toBeLessThan(0);
    expect(allocation.wrench.momentBody.y).toBeCloseTo(1, 3);
    expect(allocation.wrench.momentBody.z).toBeCloseTo(2, 3);
    const saturated = allocateEngineGimbals([spec], [1], v3(0, 1000, 1000), v3());
    expect(Math.hypot(...saturated.commands[0].deflections)).toBeLessThanOrEqual(spec.maxGimbalRad + 1e-12);
    expect(saturated.saturated).toBe(true);
    expect(norm(saturated.residualMomentBody)).toBeGreaterThan(1000);
    const asymmetric = allocateEngineGimbals([spec], [1], v3(0, 1000, 2000), v3());
    expect(asymmetric.commands[0].deflections[1] / asymmetric.commands[0].deflections[0]).toBeCloseTo(2, 10);
  });

  it('cannot create roll authority with one centered engine or any authority with zero thrust', () => {
    const spec = engine();
    const roll = allocateEngineGimbals([spec], [1], v3(10, 0, 0), v3());
    expect(roll.wrench.momentBody.x).toBe(0);
    expect(roll.residualMomentBody.x).toBe(10);
    expect(roll.saturated).toBe(true);
    expect(roll.commands[0].deflections).toEqual([0, 0]);
    const off = allocateEngineGimbals([spec], [0], v3(1, 2, 3), v3());
    expect(norm(off.wrench.momentBody)).toBe(0);
    expect(off.residualMomentBody).toEqual(v3(1, 2, 3));
  });

  it('resolves feasible roll on a slender multi-engine vehicle despite much stronger pitch/yaw authority', () => {
    const specs = Array.from({ length: 8 }, (_, index) => engine({
      id: `ring-${index}`, positionBody: v3(-25, 1.5 * Math.cos(index * Math.PI / 4), 1.5 * Math.sin(index * Math.PI / 4)),
      maxThrust: 800000, maxGimbalRad: 5 * DEG,
    }));
    const requested = v3(40000, -500000, 300000);
    const allocation = allocateEngineGimbals(specs, specs.map(() => 1), requested, v3());
    expect(Math.abs(allocation.residualMomentBody.x) / requested.x).toBeLessThan(0.01);
    expect(norm(allocation.residualMomentBody) / norm(requested)).toBeLessThan(0.005);
    expect(allocation.commands.every(command => Math.hypot(...command.deflections) < 5 * DEG)).toBe(true);
    expect(allocation.saturated).toBe(false);
  });

  it('creates the expected uncompensated moment when one off-axis engine loses thrust', () => {
    const specs = [engine({ id: 'left', positionBody: v3(-2, -1, 0), gimbalAxesBody: [] }),
      engine({ id: 'right', positionBody: v3(-2, 1, 0), gimbalAxesBody: [] })];
    const nominal = engineWrench(specs, [{ deflections: [], throttle: 1 }, { deflections: [], throttle: 1 }], v3());
    expect(norm(nominal.momentBody)).toBe(0);
    const failed = engineWrench(specs, [{ deflections: [], throttle: 1 }, { deflections: [], throttle: 0 }], v3());
    expect(failed.forceBody.x).toBe(100);
    expect(failed.momentBody.z).toBe(100);
  });
});

describe('finite RCS and quaternion control', () => {
  it('allocates all three torque signs using physical paired thrusters with negligible net force', () => {
    const jets = rcs();
    for (const demand of [v3(2, -3, 4), v3(-2, 3, -4)]) {
      const allocation = allocateRcs(jets, demand, v3());
      expect(norm(allocation.residualMomentBody)).toBeLessThan(1e-5);
      expect(norm(allocation.wrench.forceBody)).toBeLessThan(1e-9);
      expect(allocation.duties.every(duty => duty >= 0 && duty <= 1)).toBe(true);
    }
  });

  it('accounts Isp mass flow, scales average thrust at depletion and has no free torque afterwards', () => {
    const jets = rcs();
    const allocation = allocateRcs(jets, v3(2, 0, 0), v3());
    const requestedKg = allocation.duties.reduce((sum, duty) => sum + 10 * duty / (60 * G0), 0);
    const partial = stepRcs(jets, allocation.duties, requestedKg * 0.25, 1, v3());
    expect(partial.activeFraction).toBeCloseTo(0.25, 10);
    expect(partial.consumedKg).toBeCloseTo(requestedKg * 0.25, 12);
    expect(partial.propellantKg).toBe(0);
    expect(partial.wrench.momentBody.x).toBeCloseTo(allocation.wrench.momentBody.x * 0.25, 10);
    const dry = stepRcs(jets, allocation.duties, partial.propellantKg, 1, v3());
    expect(norm(dry.wrench.momentBody)).toBe(0);
    expect(norm(dry.wrench.forceBody)).toBe(0);
    expect(dry.consumedKg).toBe(0);
  });

  it('exposes residual torque under saturation and returns actual force for an unpaired jet', () => {
    const one = [rcs()[0]];
    const allocation = allocateRcs(one, v3(-100, 0, 0), v3());
    expect(allocation.saturated).toBe(true);
    expect(norm(allocation.residualMomentBody)).toBeGreaterThan(80);
    expect(norm(allocation.wrench.forceBody)).toBeGreaterThan(0);
    expect(Math.max(...allocation.duties)).toBeLessThanOrEqual(1);
    expect(() => stepRcs([{ ...one[0], isp: 0 }], [1], 1, 1, v3())).toThrow(RangeError);
  });

  it('uses body-frame quaternion error and treats quaternion signs identically', () => {
    const current = quatFromAxisAngle(v3(0, 0, 1), Math.PI / 2);
    const target = quatMultiply(current, quatFromAxisAngle(v3(1, 0, 0), 1 * DEG));
    const demand = attitudeControl(current, target, v3(), inertia, gains);
    expect(demand.momentBody.x).toBeGreaterThan(0);
    expect(Math.abs(demand.momentBody.y)).toBeLessThan(1e-12);
    expect(Math.abs(demand.momentBody.z)).toBeLessThan(1e-12);
    const negative = { w: -target.w, x: -target.x, y: -target.y, z: -target.z };
    expect(norm(sub(attitudeControl(current, negative, v3(), inertia, gains).momentBody, demand.momentBody))).toBeLessThan(1e-12);
    const halfTurn = { w: 0, x: -1, y: 0, z: 0 };
    const otherHalfTurn = { w: 0, x: 1, y: 0, z: 0 };
    expect(attitudeControl(quatIdentity(), halfTurn, v3(), inertia, gains).momentBody)
      .toEqual(attitudeControl(quatIdentity(), otherHalfTurn, v3(), inertia, gains).momentBody);
    const roundedHalfTurn = quatFromAxisAngle(v3(-1, 0, 0), Math.PI);
    const negatedHalfTurn = { w: -roundedHalfTurn.w, x: -roundedHalfTurn.x, y: -roundedHalfTurn.y, z: -roundedHalfTurn.z };
    expect(attitudeControl(quatIdentity(), roundedHalfTurn, v3(), inertia, gains).momentBody)
      .toEqual(attitudeControl(quatIdentity(), negatedHalfTurn, v3(), inertia, gains).momentBody);
  });

  it('limits manual desired rates and angular acceleration before requesting physical torque', () => {
    const demand = rateControl(v3(10, -10, 10), v3(), inertia, gains);
    expect(demand.desiredRates).toEqual(v3(0.3, -0.3, 0.3));
    expect(demand.angularAcceleration).toEqual(v3(0.5, -0.5, 0.5));
    expect(demand.momentBody).toEqual(v3(1, -1.5, 2));
    expect(demand.saturated).toBe(true);
  });

  it('limits automatic rates by physical stopping distance including actuator delay', () => {
    const distance = 60 * DEG, acceleration = 0.005, delay = 0.5;
    const bounded = attitudeControl(quatIdentity(), quatFromAxisAngle(v3(0, 1, 0), distance), v3(), inertia,
      { ...gains, maxAngularAcceleration: v3(acceleration, acceleration, acceleration), responseDelayS: delay });
    const rate = bounded.desiredRates.y;
    expect(rate * delay + rate ** 2 / (2 * acceleration)).toBeCloseTo(distance, 10);
    expect(rate).toBeLessThan(gains.maxRate.y);
    expect(bounded.saturated).toBe(true);
  });

  it('limits only an ascent direction command to the relative-air cone, including antiparallel input', () => {
    const air = v3(100, 0, 0), requested = v3(0, 1, 0), limit = 3 * DEG;
    const bounded = limitAscentCommand(requested, air, limit);
    expect(norm(bounded)).toBeCloseTo(1, 12);
    expect(Math.acos(bounded.x)).toBeCloseTo(limit, 12);
    expect(bounded.y).toBeGreaterThan(0);
    expect(bounded.z).toBe(0);
    const reverse = limitAscentCommand(v3(-1, 0, 0), air, limit);
    expect(norm(reverse)).toBeCloseTo(1, 12);
    expect(Math.acos(reverse.x)).toBeCloseTo(limit, 12);
    expect(limitAscentCommand(requested, v3(), limit)).toEqual(requested);
    expect(requested).toEqual(v3(0, 1, 0));
  });

  it.each([v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, 1)])('settles a 1-degree attitude / 0.1-degree-per-second disturbance using finite jets within 10 s: %j', axis => {
    const jets = rcs();
    let state: RigidState = { r: v3(), v: v3(), attitudeQ: quatFromAxisAngle(axis, DEG), omegaBody: scale(axis, 0.1 * DEG) };
    let fuel = 1;
    for (let tick = 0; tick < 1000; tick++) {
      const demand = attitudeControl(state.attitudeQ, quatIdentity(), state.omegaBody, inertia, gains);
      const allocation = allocateRcs(jets, demand.momentBody, v3());
      const fired = stepRcs(jets, allocation.duties, fuel, 0.01, v3());
      fuel = fired.propellantKg;
      state = integrateRigidStep(tick * 0.01, state, 0.01, (_time, substage) => ({
        mass: 10, inertiaBody: inertia, forceECI: quatRotate(substage.attitudeQ, fired.wrench.forceBody),
        momentBody: fired.wrench.momentBody, externalAccelerationECI: v3(),
      })).state;
    }
    expect(quatAngularDistance(state.attitudeQ, quatIdentity())).toBeLessThan(0.1 * DEG);
    expect(norm(state.omegaBody)).toBeLessThan(0.05 * DEG);
    expect(fuel).toBeLessThan(1);
    expect(fuel).toBeGreaterThan(0);
    expect(norm(state.v)).toBeLessThan(1e-9);
  });
});

const aero: Aero6DofSpec = {
  referenceArea: 2, referenceLength: 4, cpBody: v3(1, 0, 0),
  cdMach: [[0, 0.3], [1, 0.6], [3, 0.3]], normalSlopePerRad: 2,
  rateDamping: v3(0.1, 0.2, 0.2), validAngleRad: 10 * DEG,
};
describe('3D aerodynamic forces, CP moment and wind scenarios', () => {
  it('has no aerodynamic force or damping in vacuum or without air-relative speed', () => {
    for (const input of [
      { density: 0, speedOfSound: 0, airVelocityBody: v3(-300, 20, 40), omegaBody: v3(1, 2, 3), cgBody: v3() },
      { density: 1.2, speedOfSound: 300, airVelocityBody: v3(), omegaBody: v3(1, 2, 3), cgBody: v3() },
    ]) {
      const load = aerodynamicWrench(aero, input);
      expect(norm(load.forceBody)).toBe(0);
      expect(norm(load.momentBody)).toBe(0);
      expect(load.dynamicPressure).toBe(0);
      expect(load.withinEnvelope).toBe(true);
    }
  });

  it('opposes relative flow and reverses CP torque when CP moves through CG', () => {
    const input = { density: 1, speedOfSound: 300, airVelocityBody: v3(100, 5, 10), omegaBody: v3(), cgBody: v3() };
    const front = aerodynamicWrench(aero, input);
    const rear = aerodynamicWrench({ ...aero, cpBody: v3(-1, 0, 0) }, input);
    expect(dot(front.forceBody, input.airVelocityBody)).toBeLessThan(0);
    expect(front.forceBody.y).toBeLessThan(0);
    expect(front.forceBody.z).toBeLessThan(0);
    expect(front.momentBody.y).toBeGreaterThan(0);
    expect(front.momentBody.z).toBeLessThan(0);
    expect(rear.momentBody.y).toBeCloseTo(-front.momentBody.y, 10);
    expect(rear.momentBody.z).toBeCloseTo(-front.momentBody.z, 10);
    expect(front.angleOfAttack).toBeCloseTo(Math.atan2(10, 100), 12);
    expect(front.sideslip).toBeCloseTo(Math.atan2(5, Math.hypot(100, 10)), 12);
  });

  it('damps each rotation sign when the aerodynamic center is at CG', () => {
    const omega = v3(1, -2, 3);
    const load = aerodynamicWrench({ ...aero, cpBody: v3() }, {
      density: 1, speedOfSound: 300, airVelocityBody: v3(100, 0, 0), omegaBody: omega, cgBody: v3(),
    });
    expect(load.momentBody.x).toBeLessThan(0);
    expect(load.momentBody.y).toBeGreaterThan(0);
    expect(load.momentBody.z).toBeLessThan(0);
    expect(dot(load.momentBody, omega)).toBeLessThan(0);
  });

  it('flags high-angle extrapolation and still returns bounded, dissipative forces', () => {
    const velocity = v3(-1, 100, -100);
    const load = aerodynamicWrench(aero, { density: 1, speedOfSound: 300, airVelocityBody: velocity, omegaBody: v3(), cgBody: v3() });
    expect(load.withinEnvelope).toBe(false);
    expect(Number.isFinite(norm(load.forceBody))).toBe(true);
    expect(dot(load.forceBody, velocity)).toBeLessThan(0);
    expect(aerodynamicWrench(aero, { density: 1e-12, speedOfSound: 300, airVelocityBody: velocity, omegaBody: v3(), cgBody: v3() }).withinEnvelope).toBe(false);
  });

  it('reproduces seeded smooth gusts independently of call order and timestep history', () => {
    const scenario: WindScenario = { kind: 'shear', velocityENU: v3(5, 0, 0), shearPerMeterENU: v3(0.01, 0, 0),
      gustAmplitudeENU: v3(2, 1, 0), gustPeriodSeconds: 12, seed: 42 };
    const expected = windVelocityENU(scenario, 1000, 4);
    for (let i = 0; i < 100; i++) windVelocityENU(scenario, i * 10, i * 0.123);
    expect(windVelocityENU(scenario, 1000, 4)).toEqual(expected);
    expect(windVelocityENU({ ...scenario, seed: 43 }, 1000, 4)).not.toEqual(expected);
    expect(windVelocityENU({ ...scenario, kind: 'calm' }, 1000, 4)).toEqual(v3());
    expect(windVelocityENU({ ...scenario, gustAmplitudeENU: v3() }, 1000, 4)).toEqual(v3(15, 0, 0));
  });

  it('rotates east/north/up into the correct inertial directions without changing wind magnitude', () => {
    expect(enuWindToEci(v3(10, 20, 30), v3(1, 0, 0))).toEqual(v3(30, 10, 20));
    expect(enuWindToEci(v3(10, 20, 30), v3(0, 1, 0))).toEqual(v3(-10, 30, 20));
    const scenario: WindScenario = { kind: 'constant', velocityENU: v3(10, -20, 30) };
    expect(norm(windVelocityECI(scenario, v3(4, 3, 2), 1000, 0))).toBeCloseTo(Math.sqrt(1400), 10);
    expect(norm(enuWindToEci(v3(1, 2, 3), v3(0, 0, 1)))).toBeCloseTo(Math.sqrt(14), 10);
  });
});
