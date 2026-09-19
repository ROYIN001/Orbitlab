import { describe, expect, it } from 'vitest';
import { DEG, G0, OMEGA_EARTH, R_EARTH } from '../src/physics/constants';
import { cross, norm, scale, sub, v3, type Vec3 } from '../src/physics/vec3';
import { pointExitFlowMoment, RigidRuntime, targetAttitude, windScenario, type SnapshotProvider } from '../src/physics/rigid/runtime';
import { windVelocityENU } from '../src/physics/rigid/aero';
import { atmosphere } from '../src/physics/atmosphere';
import { gravityJ2 } from '../src/physics/gravity';
import type { RigidState } from '../src/physics/rigid/integrator';
import type { BudgetedEngine, RigidVehicleSnapshot } from '../src/physics/rigid/mass';
import { matMul, matTranspose, quatAngularDistance, quatFromAxisAngle, quatIdentity, quatRotate, quatToMatrix, type Mat3 } from '../src/physics/rigid/math';
import type { RcsThrusterGeometry } from '../src/physics/rigid/vehicle-data';

const config = { model: 'sixDof', wind: 'calm', seed: 42 } as const;
const diagonal = (x: number, y: number, z: number): Mat3 => [x, 0, 0, 0, y, 0, 0, 0, z];
const state = (): RigidState => ({ r: v3(1e12, 0, 0), v: v3(), attitudeQ: quatIdentity(), omegaBody: v3() });
const engine = (change: Partial<BudgetedEngine> = {}): BudgetedEngine => ({
  id: 'engine', clusterId: 'cluster', kind: 'main', engineIndex: 0, thrustFraction: 1,
  positionBody: v3(-2, 0, 0), directionBody: v3(1, 0, 0), thrustBudgetN: 100, massFlowKgS: 0,
  gimbalAxesBody: [v3(0, 1, 0), v3(0, 0, 1)], maxGimbalRad: 0.1,
  maxGimbalRateRadS: 1, timeConstantS: 0.1, ...change,
});
function snapshot(change: Partial<RigidVehicleSnapshot> = {}): RigidVehicleSnapshot {
  return {
    mass: 100, cg: v3(), inertia: diagonal(10, 20, 30), components: [], engines: [], rcs: [], rcsThrusters: [],
    geometry: { vehicleId: 'fixture', length: 4, stageBases: [v3()], stageHeights: [4],
      fairingBase: v3(4, 0, 0), payloadBase: v3(4, 0, 0), boosters: [], estimated: true },
    activeBase: v3(), modelId: 'fixture', dataRevision: 'fixture', assumptions: ['Synthetic analytic fixture'],
    aero: { referenceArea: 0, referenceLength: 4, cpBody: v3(), cdMach: [[0, 0], [100, 0]],
      normalSlopePerRad: 0, rateDamping: v3(), validAngleRad: Math.PI }, ...change,
  };
}
function pairedJets(): RcsThrusterGeometry[] {
  const jets: RcsThrusterGeometry[] = [];
  const pairs = [
    { r: v3(0, 1, 0), f: v3(0, 0, 1) },
    { r: v3(0, 0, 1), f: v3(1, 0, 0) },
    { r: v3(1, 0, 0), f: v3(0, 1, 0) },
  ];
  pairs.forEach((pair, axis) => {
    for (const side of [-1, 1]) for (const sign of [-1, 1]) jets.push({
      id: `${axis}/${side}/${sign}`, stageId: 's1', positionBody: scale(pair.r, side),
      directionBody: scale(pair.f, side * sign), maxThrust: 10, isp: 60,
    });
  });
  return jets;
}
function gasProvider(initial: number, calls?: { elapsed: number; consumed: number }[]): SnapshotProvider {
  const jets = pairedJets();
  return (elapsed, consumed) => {
    const used = consumed.s1 ?? 0;
    calls?.push({ elapsed, consumed: used });
    return snapshot({ mass: 100 - used, rcs: [{ stageId: 's1', initialPropellantKg: initial, centerBody: v3(), thrusters: jets }], rcsThrusters: jets });
  };
}

describe('rigid runtime integration boundaries', () => {
  it('constructs a full right-handed target attitude with stable parallel-reference fallbacks', () => {
    for (const nose of [v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, 1)]) {
      const q = targetAttitude(nose, nose);
      expect(norm(sub(quatRotate(q, v3(1, 0, 0)), nose))).toBeLessThan(1e-12);
      const y = quatRotate(q, v3(0, 1, 0)), z = quatRotate(q, v3(0, 0, 1));
      expect(norm(sub(cross(nose, y), z))).toBeLessThan(1e-12);
    }
  });

  it('subtracts Earth rotation and uses a bounded, deterministic shear profile', () => {
    const runtime = new RigidRuntime(config);
    const r = v3(R_EARTH, 0, 0), v = cross(v3(0, 0, OMEGA_EARTH), r);
    expect(norm(runtime.airVelocity({ r, v }, 0))).toBe(0);
    const wind = windScenario({ ...config, wind: 'shear' });
    expect(windVelocityENU(wind, 1e6, 7)).toEqual(windVelocityENU(wind, 12000, 7));
    expect(windVelocityENU(wind, -100, 7)).toEqual(windVelocityENU(wind, 0, 7));
    expect(windVelocityENU(wind, 1000, 7)).not.toEqual(windVelocityENU({ ...wind, seed: 43 }, 1000, 7));
  });

  it('evaluates pure fuel-dependent snapshots at RK times and commits finite gas once', () => {
    const calls: { elapsed: number; consumed: number }[] = [];
    const runtime = new RigidRuntime(config);
    runtime.setCommand({ mode: 'manual', rates: v3(0.01, -0.01, 0.01), throttle: 1 });
    const result = runtime.step(0, state(), 0.01, v3(1, 0, 0), v3(0, 0, 1), gasProvider(1, calls));
    expect(calls.map(call => call.elapsed)).toEqual([0, 0.005, 0.01]);
    expect(runtime.consumed.s1).toBeGreaterThan(0);
    expect(calls[1].consumed).toBeCloseTo(runtime.consumed.s1 / 2, 14);
    expect(calls[2].consumed).toBeCloseTo(runtime.consumed.s1, 14);
    expect(result.snapshot.mass).toBeCloseTo(100 - runtime.consumed.s1, 12);
    expect(result.telemetry.rcsPropellantKg).toBeCloseTo(1 - runtime.consumed.s1, 12);
    expect(result.telemetry.massFlowModel).toBe('quasiSteady');
    expect(norm(result.state.v)).toBeLessThan(1e-10);
  });

  it('cannot rotate an uncontrolled coasting body by assigning the guidance target', () => {
    const runtime = new RigidRuntime(config), initial = state();
    const result = runtime.step(0, initial, 0.01, v3(0, 1, 0), v3(0, 0, 1), () => snapshot());
    expect(quatAngularDistance(result.state.attitudeQ, initial.attitudeQ)).toBeLessThan(1e-14);
    expect(norm(result.state.omegaBody)).toBe(0);
    expect(result.telemetry.saturated).toBe(true);
  });

  it('uses upstream pressure/throttle thrust budgets exactly once', () => {
    const runtime = new RigidRuntime(config);
    // Provider owns throttle application. The runtime must not multiply an
    // already throttled available budget by the manual input a second time.
    runtime.setCommand({ mode: 'manual', rates: v3(), throttle: 0.2 });
    const result = runtime.step(0, state(), 0.01, v3(1, 0, 0), v3(0, 0, 1), () => snapshot({ engines: [engine({ upstreamThrottle: 0.2 })] }));
    expect(result.state.v.x).toBeCloseTo(0.01, 9);
    expect(result.telemetry.engineThrottles?.engine).toBe(0.2);
    const startup = runtime.step(0.01, result.state, 0.01, v3(1, 0, 0), v3(0, 0, 1), () => snapshot({
      engines: [engine({ thrustBudgetN: 40, upstreamThrottle: 0.08 })],
    }));
    expect(startup.telemetry.engineThrottles?.engine).toBe(0.08);
    expect(startup.state.v.x - result.state.v.x).toBeCloseTo(0.004, 9);
  });

  it('integrates gimbal lag throughout the step instead of applying the future deflection early', () => {
    const runtime = new RigidRuntime(config);
    runtime.setCommand({ mode: 'manual', rates: v3(0, 0.01, 0), throttle: 1 });
    const dt = 0.01, lag = 0.1;
    const result = runtime.step(0, state(), dt, v3(1, 0, 0), v3(0, 0, 1), () => snapshot({ engines: [engine()] }));
    // Rate gain 3 gives alpha=0.03. This is the independent small-angle
    // integral of 1-exp(-t/tau); sin-angle correction here is below 1e-6.
    const expected = 0.03 * (dt - lag * (1 - Math.exp(-dt / lag)));
    expect(Math.abs(result.state.omegaBody.y - expected) / expected).toBeLessThan(1e-4);
    expect(result.telemetry.engineDeflections.engine[0]).toBeLessThan(0);
    expect(Math.abs(result.telemetry.engineDeflections.engine[0])).toBeLessThan(0.003);
  });

  it('refines the plant while holding one outer command, fuel impulse and actuator endpoint', () => {
    const outputs = [0.01, 0.005, 0.0025].map(integrationStepS => {
      const runtime = new RigidRuntime(config, 'fixture', { integrationStepS });
      runtime.setCommand({ mode: 'manual', rates: v3(0.01, 0.01, -0.01), throttle: 1 });
      const calls: { elapsed: number; consumed: number }[] = [];
      const gas = gasProvider(1, calls);
      const result = runtime.step(0, state(), 0.01, v3(1, 0, 0), v3(0, 0, 1), (elapsed, consumed) =>
        ({ ...gas(elapsed, consumed), engines: [engine()], mass: 100 - 2 * elapsed - (consumed.s1 ?? 0) }));
      return { runtime, calls, result };
    });
    expect(outputs.map(out => out.calls.map(call => Number(call.elapsed.toFixed(12))))).toEqual([
      [0, 0.005, 0.01], [0, 0.0025, 0.005, 0.0075, 0.01],
      [0, 0.00125, 0.0025, 0.00375, 0.005, 0.00625, 0.0075, 0.00875, 0.01],
    ]);
    for (const out of outputs) {
      expect(out.runtime.consumed).toEqual(outputs[0].runtime.consumed);
      expect(out.result.telemetry.engineDeflections).toEqual(outputs[0].result.telemetry.engineDeflections);
      expect(out.result.snapshot.mass).toBe(outputs[0].result.snapshot.mass);
      expect(out.result.accelerationsStart).toEqual(outputs[0].result.accelerationsStart);
      for (const call of out.calls) expect(call.consumed).toBeCloseTo(out.runtime.consumed.s1 * call.elapsed / 0.01, 14);
    }
    const coarseError = norm(sub(outputs[0].result.state.omegaBody, outputs[2].result.state.omegaBody));
    const fineError = norm(sub(outputs[1].result.state.omegaBody, outputs[2].result.state.omegaBody));
    expect(coarseError).toBeGreaterThan(1e-12);
    expect(fineError).toBeLessThan(coarseError / 8);
  });

  it('reports the initial physical force acceleration, including rotated propulsion and aerodynamic drag', () => {
    const runtime = new RigidRuntime(config), altitude = 1000, speed = 100;
    runtime.setCommand({ mode: 'manual', rates: v3(), throttle: 1 });
    const initial = { ...state(), r: v3(R_EARTH + altitude, 0, 0),
      attitudeQ: quatFromAxisAngle(v3(0, 0, 1), Math.PI / 2) };
    initial.v = sub(v3(speed, 0, 0), scale(cross(v3(0, 0, OMEGA_EARTH), initial.r), -1));
    const body = snapshot();
    const result = runtime.step(0, initial, 0.01, v3(0, 1, 0), v3(0, 0, 1), () => ({ ...body,
      engines: [engine()], aero: { ...body.aero, referenceArea: 2, cdMach: [[0, 0.5], [100, 0.5]] } }));
    expect(norm(sub(result.accelerationsStart.propulsionECI, v3(0, 1, 0)))).toBeLessThan(1e-12);
    expect(norm(sub(result.accelerationsStart.aerodynamicECI, v3(-0.5 * atmosphere(altitude).rho * speed ** 2 * 2 * 0.5 / 100, 0, 0)))).toBeLessThan(1e-10);
    expect(result.accelerationsStart.gravityECI).toEqual(gravityJ2(initial.r));
  });

  it('includes nonzero net RCS force in the initial propulsion acceleration', () => {
    const runtime = new RigidRuntime(config);
    runtime.setCommand({ mode: 'manual', rates: v3(0, 0, 0.01), throttle: 0 });
    // Both torque signs are controllable, but each jet pushes in +Y: this
    // deliberately unbalanced geometry cannot hide its translation in a pair.
    const jets = [-1, 1].map(side => ({ id: `unpaired-${side}`, stageId: 's1', positionBody: v3(side, 0, 0), directionBody: v3(0, 1, 0), maxThrust: 1, isp: 60 }));
    const result = runtime.step(0, state(), 0.01, v3(1, 0, 0), v3(0, 0, 1), (_elapsed, consumed) => snapshot({
      mass: 100 - (consumed.s1 ?? 0), rcs: [{ stageId: 's1', initialPropellantKg: 1, centerBody: v3(), thrusters: jets }], rcsThrusters: jets,
    }));
    expect(result.accelerationsStart.propulsionECI.y).toBeGreaterThan(0);
    // Actual impulse is F*dt, and the same jet spends F*dt/(Isp*g0).
    expect(result.accelerationsStart.propulsionECI.y * 100 * 0.01).toBeCloseTo(runtime.consumed.s1 * 60 * G0, 13);
  });

  it('rejects invalid integration steps and bounds a coarse setting to the outer cadence', () => {
    for (const integrationStepS of [0, -0.1, NaN, Infinity, 0.020001]) expect(() => new RigidRuntime(config, 'fixture', { integrationStepS })).toThrow(RangeError);
    const runtime = new RigidRuntime(config, 'fixture', { integrationStepS: 0.02 });
    const calls: number[] = [];
    runtime.step(0, state(), 0.01, v3(1, 0, 0), v3(0, 0, 1), elapsed => { calls.push(elapsed); return snapshot(); });
    expect(calls).toEqual([0, 0.005, 0.01]);
  });

  it('exhausts a finite RCS reservoir and then preserves free principal-axis rotation', () => {
    const runtime = new RigidRuntime(config);
    runtime.setCommand({ mode: 'manual', rates: v3(0.05, 0, 0), throttle: 1 });
    const provider = gasProvider(1e-6);
    const fired = runtime.step(0, state(), 0.01, v3(1, 0, 0), v3(0, 0, 1), provider);
    expect(fired.telemetry.rcsPropellantKg).toBe(0);
    expect(runtime.consumed.s1).toBe(1e-6);
    expect(fired.state.omegaBody.x).toBeGreaterThan(0);
    const dry = runtime.step(0.01, fired.state, 0.01, v3(1, 0, 0), v3(0, 0, 1), provider);
    expect(dry.state.omegaBody.x).toBeCloseTo(fired.state.omegaBody.x, 14);
    expect(runtime.consumed.s1).toBe(1e-6);
    expect(dry.telemetry.saturated).toBe(true);
  });

  it('does not commit fuel or actuator changes if a trial snapshot fails', () => {
    const runtime = new RigidRuntime(config), initial = state();
    const start = snapshot({ ...gasProvider(1)(0, {}), engines: [engine()] });
    runtime.setCommand({ mode: 'manual', rates: v3(0.01, 0.01, 0), throttle: 1 });
    expect(() => runtime.step(0, initial, 0.01, v3(1, 0, 0), v3(0, 0, 1), elapsed => {
      if (elapsed > 0) throw new Error('provider failed');
      return start;
    })).toThrow('provider failed');
    expect(runtime.consumed).toEqual({});
    expect(runtime.telemetry(initial, 0, start).engineThrottles?.engine).toBe(0);
    expect(runtime.snapshot).toBeUndefined();
  });

  it('makes zero duration a state/fuel-preserving read and rejects invalid durations before providers', () => {
    const runtime = new RigidRuntime(config), initial = state();
    runtime.setCommand({ mode: 'manual', rates: v3(0.01, 0, 0), throttle: 1 });
    const result = runtime.step(0, initial, 0, v3(1, 0, 0), v3(0, 0, 1), gasProvider(1));
    expect(result.state).toEqual(initial);
    expect(runtime.consumed).toEqual({});
    let called = false;
    for (const dt of [-1, NaN, Infinity]) expect(() => runtime.step(0, initial, dt, v3(1, 0, 0), v3(0, 0, 1), () => {
      called = true; return snapshot();
    })).toThrow(RangeError);
    expect(called).toBe(false);
  });

  it('matches the ideal axial rocket equation with trial-step mass variation', () => {
    const runtime = new RigidRuntime(config);
    runtime.setCommand({ mode: 'manual', rates: v3(), throttle: 1 });
    let current = state();
    const isp = 100, flow = 2, m0 = 1000, dt = 0.01, duration = 10;
    for (let tick = 0; tick < duration / dt; tick++) {
      const t = tick * dt;
      current = runtime.step(t, current, dt, v3(1, 0, 0), v3(0, 0, 1), elapsed => snapshot({
        mass: m0 - flow * (t + elapsed), engines: [engine({ positionBody: v3(), thrustBudgetN: isp * G0 * flow, massFlowKgS: flow })],
      })).state;
    }
    const expected = isp * G0 * Math.log(m0 / (m0 - duration * flow));
    expect(Math.abs(current.v.x - expected) / expected).toBeLessThan(1e-8);
  });

  it.each([v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, 1)])('brakes a 60-degree maneuver with weak finite actuators instead of oscillating past the target: %j', axis => {
    const runtime = new RigidRuntime(config);
    let current = state(), peakRate = 0, peakAngle = 0;
    const targetQ = quatFromAxisAngle(axis, 60 * DEG);
    const nose = quatRotate(targetQ, v3(1, 0, 0)), side = quatRotate(targetQ, v3(0, 0, 1));
    // At most ~0.2 N m about either transverse axis, I=100 kg m². A 5°/s
    // unconstrained slew would require >100° just to stop; the controller
    // must schedule a slower trajectory from the physical torque budget.
    const jets = axis.x ? pairedJets().map(jet => ({ ...jet, maxThrust: 0.1 })) : [];
    const provider: SnapshotProvider = (_elapsed, consumed) => snapshot({ mass: 100 - (consumed.s1 ?? 0), inertia: diagonal(100, 100, 100),
      engines: [engine({ thrustBudgetN: 2, maxGimbalRad: 0.05, maxGimbalRateRadS: 0.1, timeConstantS: 0.2 })],
      rcsThrusters: jets, rcs: jets.length ? [{ stageId: 's1', initialPropellantKg: 1, centerBody: v3(), thrusters: jets }] : [] });
    for (let tick = 0; tick < 12000; tick++) {
      current = runtime.step(tick * 0.01, current, 0.01, nose, side, provider).state;
      peakRate = Math.max(peakRate, norm(current.omegaBody));
      peakAngle = Math.max(peakAngle, quatAngularDistance(current.attitudeQ, quatIdentity()));
    }
    expect(peakRate).toBeLessThan(2 * DEG);
    expect(peakAngle).toBeLessThan(62 * DEG);
    expect(quatAngularDistance(current.attitudeQ, targetQ)).toBeLessThan(0.1 * DEG);
    expect(norm(current.omegaBody)).toBeLessThan(0.05 * DEG);
    if (axis.x) expect(runtime.consumed.s1).toBeGreaterThan(0);
  }, 20000);
});

describe('disclosed rotational mass-flow sensitivity', () => {
  it('matches hand-computed full inertia-rate and multiple point-exit angular flux', () => {
    const derivative: Mat3 = [0.1, 0.02, 0, 0.02, 0.3, 0.01, 0, 0.01, 0.5];
    const result = pointExitFlowMoment(derivative, v3(1, 2, 3), [
      { positionRelativeCg: v3(2, 0, 0), massFlowKgS: 2 },
      { positionRelativeCg: v3(0, 3, 0), massFlowKgS: 3 },
    ]);
    expect(result.x).toBeCloseTo(-27.14, 10);
    expect(result.y).toBeCloseTo(-16.65, 10);
    expect(result.z).toBeCloseTo(-106.52, 10);
    expect(norm(pointExitFlowMoment(derivative, v3(), [{ positionRelativeCg: v3(1, 2, 3), massFlowKgS: 2 }]))).toBe(0);
    expect(norm(pointExitFlowMoment(diagonal(0, 0, 0), v3(1, 2, 3), []))).toBe(0);
    expect(() => pointExitFlowMoment(derivative, v3(), [{ positionRelativeCg: v3(), massFlowKgS: -1 }])).toThrow(RangeError);
  });

  it('rotates inertia-rate, exits and angular velocity consistently under a body-basis change', () => {
    const derivative: Mat3 = [1, 0.2, 0.3, 0.2, -2, 0.1, 0.3, 0.1, 3];
    const omega = v3(0.2, -0.3, 0.4), exit = { positionRelativeCg: v3(3, -2, 1), massFlowKgS: 2 };
    const q = quatFromAxisAngle(v3(1, 2, 3), 0.7), matrix = quatToMatrix(q);
    const expected = quatRotate(q, pointExitFlowMoment(derivative, omega, [exit]));
    const actual = pointExitFlowMoment(matMul(matMul(matrix, derivative), matTranspose(matrix)), quatRotate(q, omega),
      [{ ...exit, positionRelativeCg: quatRotate(q, exit.positionRelativeCg) }]);
    expect(norm(sub(actual, expected))).toBeLessThan(1e-12);
  });

  function coast(model: 'quasiSteady' | 'reducedFlux', axis: Vec3, changingInertia: boolean) {
    const runtime = new RigidRuntime(config, 'fixture', { massFlowModel: model });
    let current = { ...state(), omegaBody: scale(axis, 0.01) };
    runtime.setCommand({ mode: 'manual', rates: { ...current.omegaBody }, throttle: 0 });
    for (let tick = 0; tick < 100; tick++) {
      const t = tick * 0.01;
      current = runtime.step(t, current, 0.01, v3(1, 0, 0), v3(0, 0, 1), elapsed => snapshot({
        mass: 100 - (t + elapsed), inertia: diagonal(changingInertia ? 10 - (t + elapsed) : 10, 20, 30),
        // Synthetic outflow fixture isolates angular flux without a net thrust
        // moment. It does not represent an operating engine performance map.
        engines: [engine({ positionBody: v3(2, 0, 0), thrustBudgetN: 0, massFlowKgS: 1 })],
      })).state;
    }
    return { runtime, current };
  }

  it('adds the independently known point-exit pitch damping while baseline remains quasi-steady', () => {
    const baseline = coast('quasiSteady', v3(0, 1, 0), false);
    const reduced = coast('reducedFlux', v3(0, 1, 0), false);
    expect(baseline.current.omegaBody.y).toBeCloseTo(0.01, 12);
    expect(reduced.current.omegaBody.y).toBeCloseTo(0.01 * Math.exp(-1 * 2 ** 2 / 20), 10);
    expect(reduced.runtime.massFlowModel).toBe('reducedFlux');
  });

  it('combines Idot with point-exit flux and does not impose closed-system conservation on baseline', () => {
    const baseline = coast('quasiSteady', v3(1, 0, 0), true);
    const reduced = coast('reducedFlux', v3(1, 0, 0), true);
    // Point exit on the spin axis carries no axial angular momentum. The
    // reduced fixture therefore conserves Ixx*omega; baseline deliberately does not.
    expect(baseline.current.omegaBody.x).toBeCloseTo(0.01, 12);
    expect(reduced.current.omegaBody.x).toBeCloseTo(0.1 / 9, 10);
    expect(baseline.current.omegaBody.x * 9).not.toBeCloseTo(0.1, 5);
  });
});
