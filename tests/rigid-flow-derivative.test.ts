import { afterEach, describe, expect, it, vi } from 'vitest';
import { v3 } from '../src/physics/vec3';
import { DEG } from '../src/physics/constants';
import * as integrator from '../src/physics/rigid/integrator';
import type { RigidState } from '../src/physics/rigid/integrator';
import type { RigidVehicleSnapshot } from '../src/physics/rigid/mass';
import { quatAngularDistance, quatFromAxisAngle, quatIdentity } from '../src/physics/rigid/math';
import { RigidRuntime } from '../src/physics/rigid/runtime';

const config = { model: 'sixDof', wind: 'calm', seed: 42 } as const;
const decay = 0.7, initialSpin = 0.01, controlStepS = 0.01, integrationStepS = 0.0025;
const initial = (): RigidState => ({ r: v3(1e12, 0, 0), v: v3(), attitudeQ: quatIdentity(), omegaBody: v3(initialSpin, 0, 0) });

/** Synthetic smooth burning body with a known nonlinear inertia schedule.
 * The one point exit lies on the spin axis, so its axial flux is zero. Thus
 * Ixx=10 exp(-k t), Ixx'= -k Ixx and omegaX=omega0 exp(k t) independently.
 * This isolates the implemented reduced-flow derivative, not a tank model
 * or general variable-mass rocket validation. Axial force has no CG moment. */
function snapshot(time: number): RigidVehicleSnapshot {
  return {
    mass: 100 - time, cg: v3(), inertia: [10 * Math.exp(-decay * time), 0, 0, 0, 20, 0, 0, 0, 20],
    components: [], rcs: [], rcsThrusters: [],
    engines: [{ id: 'axis-exit', clusterId: 'axis-exit', kind: 'main', engineIndex: 0, thrustFraction: 1,
      positionBody: v3(-2, 0, 0), directionBody: v3(1, 0, 0), thrustBudgetN: 100, massFlowKgS: 1,
      gimbalAxesBody: [], maxGimbalRad: 0, maxGimbalRateRadS: 0, timeConstantS: 0 }],
    geometry: { vehicleId: 'fixture', length: 4, stageBases: [v3()], stageHeights: [4],
      fairingBase: v3(4, 0, 0), payloadBase: v3(4, 0, 0), boosters: [], estimated: true },
    activeBase: v3(), modelId: 'analytic-burn', dataRevision: 'analytic-burn-1', assumptions: ['Synthetic nonlinear inertia derivative fixture'],
    aero: { referenceArea: 0, referenceLength: 4, cpBody: v3(), cdMach: [[0, 0], [100, 0]],
      normalSlopePerRad: 0, rateDamping: v3(), validAngleRad: Math.PI },
  };
}

function oneStep(derivativeStepS?: number) {
  const runtime = new RigidRuntime(config, 'fixture', { massFlowModel: 'reducedFlux', integrationStepS, derivativeStepS });
  runtime.setCommand({ mode: 'manual', rates: v3(initialSpin, 0, 0), throttle: 1 });
  return runtime.step(0, initial(), controlStepS, v3(1, 0, 0), v3(0, 0, 1), elapsed => {
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(elapsed).toBeLessThanOrEqual(controlStepS);
    return snapshot(elapsed);
  }).state;
}

afterEach(() => vi.restoreAllMocks());

describe('reduced-flow inertia derivative interval acceptance', () => {
  it('preserves the default exactly, caps its interval within the control step, and rejects invalid intervals', () => {
    expect(new RigidRuntime(config).derivativeStepS).toBe(0.001);
    expect(oneStep()).toEqual(oneStep(0.001));
    expect(oneStep(1)).toEqual(oneStep(controlStepS / 4));
    for (const derivativeStepS of [0, -0.001, NaN, Infinity]) {
      expect(() => new RigidRuntime(config, 'fixture', { derivativeStepS })).toThrow('Invalid inertia derivative step');
    }
  });

  it('refines bounded endpoint and central derivatives during a nonlinear burn with unchanged control/RK clocks', () => {
    const duration = 2, integrate = integrator.integrateRigidStep;
    const exactRate = initialSpin * Math.exp(decay * duration);
    const exactQ = quatFromAxisAngle(v3(1, 0, 0), initialSpin * Math.expm1(decay * duration) / decay);
    const reports = [0.001, 0.0005, 0.00025].map(derivativeStepS => {
      let maxEndpointRelativeError = 0, maxCentralRelativeError = 0, endpointSamples = 0, centralSamples = 0;
      let outerTime = 0, integrationCalls = 0;
      const spy = vi.spyOn(integrator, 'integrateRigidStep').mockImplementation((time, state, dt, model) => {
        integrationCalls++;
        expect(dt).toBe(integrationStepS);
        return integrate(time, state, dt, (at, trial) => {
          const loads = model(at, trial);
          const exactDerivative = -decay * 10 * Math.exp(-decay * at);
          const appliedDerivative = -loads.massFlowMomentBody!.x / trial.omegaBody.x;
          const relativeError = Math.abs((appliedDerivative - exactDerivative) / exactDerivative);
          const elapsed = at - outerTime;
          if (elapsed < 1e-12 || controlStepS - elapsed < 1e-12) {
            endpointSamples++; maxEndpointRelativeError = Math.max(maxEndpointRelativeError, relativeError);
          } else {
            centralSamples++; maxCentralRelativeError = Math.max(maxCentralRelativeError, relativeError);
          }
          return loads;
        });
      });
      const runtime = new RigidRuntime(config, 'fixture', { massFlowModel: 'reducedFlux', integrationStepS, derivativeStepS });
      runtime.setCommand({ mode: 'manual', rates: v3(initialSpin, 0, 0), throttle: 1 });
      let state = initial();
      for (let tick = 0; tick < duration / controlStepS; tick++) {
        outerTime = tick * controlStepS;
        state = runtime.step(outerTime, state, controlStepS, v3(1, 0, 0), v3(0, 0, 1), elapsed => {
          // The bounded one-sided differences must not query outside this
          // accepted configuration's interval, including either endpoint.
          expect(elapsed).toBeGreaterThanOrEqual(0);
          expect(elapsed).toBeLessThanOrEqual(controlStepS);
          return snapshot(outerTime + elapsed);
        }).state;
      }
      spy.mockRestore();
      const rateError = Math.abs(state.omegaBody.x - exactRate);
      const attitudeErrorRad = quatAngularDistance(state.attitudeQ, exactQ);
      expect(integrationCalls).toBe(duration / integrationStepS);
      expect(endpointSamples).toBe(duration / controlStepS * 2);
      expect(centralSamples).toBeGreaterThan(endpointSamples);
      expect(maxEndpointRelativeError).toBeLessThan(decay * derivativeStepS);
      expect(maxCentralRelativeError).toBeLessThan((decay * derivativeStepS) ** 2);
      expect(rateError).toBeLessThan(1e-7);
      expect(attitudeErrorRad).toBeLessThan(1e-7);
      return { derivativeStepS, controlStepS, integrationStepS, maxEndpointRelativeError, maxCentralRelativeError,
        rateError, attitudeErrorDeg: attitudeErrorRad / DEG, endpointSamples, centralSamples };
    });
    for (let i = 1; i < reports.length; i++) {
      // Bounded one-sided endpoint differences are first order in h; smooth
      // central differences are second order. No global RK order is inferred.
      expect(reports[i].maxEndpointRelativeError).toBeLessThan(reports[i - 1].maxEndpointRelativeError * 0.51);
      expect(reports[i].maxCentralRelativeError).toBeLessThan(reports[i - 1].maxCentralRelativeError * 0.26);
      expect(reports[i].rateError).toBeLessThan(reports[i - 1].rateError);
    }
    // Attitude retains the fixed RK error as h shrinks: its independent
    // absolute bound above matters, not monotone convergence to that floor.
    console.log('RIGID_FLOW_DERIVATIVE', JSON.stringify({ duration, exactRate, reports }));
  });
});
