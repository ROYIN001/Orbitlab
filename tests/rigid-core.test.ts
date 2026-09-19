import { describe, expect, it } from 'vitest';
import { type Vec3, add, cross, dot, norm, scale, sub, v3 } from '../src/physics/vec3';
import { type Mat3, type Quat, assertSPD, matMul, matTranspose, matVecMul,
  quatAngularDistance, quatFromAxisAngle, quatFromBasis, quatFromMatrix, quatIdentity,
  quatInverseRotate, quatMultiply, quatNorm, quatRotate, quatSlerp, quatToMatrix, solveSPD } from '../src/physics/rigid/math';
import { type RigidLoads, type RigidModelFn, type RigidState, integrateRigidStep } from '../src/physics/rigid/integrator';
import { type RigidMassProperties, type StagingChild, separateRigidBody } from '../src/physics/rigid/staging';

const identity: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const diagonal = (a: number, b: number, c: number): Mat3 => [a, 0, 0, 0, b, 0, 0, 0, c];
const initial = (extra: Partial<RigidState> = {}): RigidState =>
  ({ r: v3(), v: v3(), attitudeQ: quatIdentity(), omegaBody: v3(), ...extra });
const loads = (extra: Partial<RigidLoads> = {}): RigidLoads =>
  ({ mass: 1, inertiaBody: identity, forceECI: v3(), momentBody: v3(), externalAccelerationECI: v3(), ...extra });
function closeVector(actual: Vec3, expected: Vec3, tolerance = 1e-10): void {
  expect(norm(sub(actual, expected))).toBeLessThanOrEqual(tolerance);
}
function run(state: RigidState, duration: number, dt: number, model: RigidModelFn): RigidState {
  for (let i = 0; i < Math.round(duration / dt); i++) state = integrateRigidStep(i * dt, state, dt, model).state;
  return state;
}

describe('rigid frame and quaternion contract', () => {
  it('uses positive right-hand basis rotations, Hamilton composition, and proper matrices', () => {
    const axes = [v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, 1)];
    closeVector(quatRotate(quatFromAxisAngle(axes[0], Math.PI / 2), axes[1]), axes[2]);
    closeVector(quatRotate(quatFromAxisAngle(axes[1], Math.PI / 2), axes[2]), axes[0]);
    closeVector(quatRotate(quatFromAxisAngle(axes[2], Math.PI / 2), axes[0]), axes[1]);
    const qx = quatFromAxisAngle(axes[0], Math.PI / 2), qy = quatFromAxisAngle(axes[1], Math.PI / 2);
    closeVector(quatRotate(quatMultiply(qy, qx), axes[1]), axes[0]);
    for (const axis of [...axes, v3(1, 2, -3)]) for (const angle of [0, Math.PI / 2, Math.PI, 3.7, 8]) {
      const q = quatFromAxisAngle(axis, angle), m = quatToMatrix(q);
      closeVector(quatInverseRotate(q, quatRotate(q, v3(1.3, -7.1, 8.2))), v3(1.3, -7.1, 8.2));
      expect(quatAngularDistance(q, quatFromMatrix(m))).toBeLessThan(1e-10);
      const gram = matMul(matTranspose(m), m);
      gram.forEach((n, i) => expect(Math.abs(n - identity[i])).toBeLessThan(1e-10));
      const determinant = dot(matVecMul(m, axes[0]), cross(matVecMul(m, axes[1]), matVecMul(m, axes[2])));
      expect(Math.abs(determinant - 1)).toBeLessThan(1e-10);
    }
    // +Y-nose render mesh -> +X-nose body is [ -BodyY, BodyX, BodyZ ].
    const renderQ = quatFromBasis(v3(0, -1, 0), v3(1, 0, 0), v3(0, 0, 1));
    closeVector(quatRotate(renderQ, axes[1]), axes[0]);
    expect(() => quatFromBasis(axes[0], axes[1], v3(0, 0, -1))).toThrow(/determinant/);
    expect(() => quatFromMatrix([2, 0, 0, 0, 1, 0, 0, 0, 1])).toThrow(/orthonormal/);
  });

  it('treats q/-q identically, crosses 180 degrees, and interpolates the shortest path', () => {
    const q = quatFromAxisAngle(v3(1, -2, 3), 3.6);
    const negative = (a: Quat): Quat => ({ w: -a.w, x: -a.x, y: -a.y, z: -a.z });
    closeVector(quatRotate(q, v3(4, 5, 6)), quatRotate(negative(q), v3(4, 5, 6)));
    expect(quatAngularDistance(q, negative(q))).toBeLessThan(1e-14);
    expect(quatAngularDistance(q, quatSlerp(q, negative(q), 0.5))).toBeLessThan(1e-14);
    const a = quatFromAxisAngle(v3(0, 0, 1), 170 * Math.PI / 180);
    const b = quatFromAxisAngle(v3(0, 0, 1), -170 * Math.PI / 180);
    closeVector(quatRotate(quatSlerp(a, b, 0.5), v3(1, 0, 0)), v3(-1, 0, 0));
    const omega = v3(0.2, -0.3, 0.7), duration = 100;
    const end = run(initial({ attitudeQ: q, omegaBody: omega }), duration, 0.02, () => loads());
    const negEnd = run(initial({ attitudeQ: negative(q), omegaBody: omega }), duration, 0.02, () => loads());
    const exact = quatMultiply(q, quatFromAxisAngle(omega, norm(omega) * duration));
    expect(quatAngularDistance(end.attitudeQ, exact)).toBeLessThan(1e-6);
    expect(quatAngularDistance(end.attitudeQ, negEnd.attitudeQ)).toBeLessThan(1e-12);
    expect(Math.abs(quatNorm(end.attitudeQ) - 1)).toBeLessThan(1e-10);
  });

  it('solves full SPD inertia and rejects nonphysical algebra inputs instead of diagonalizing', () => {
    const full: Mat3 = [4, 1, 0.5, 1, 3, -0.2, 0.5, -0.2, 2];
    closeVector(solveSPD(full, v3(5.325, -7.13, 2.9)), v3(2, -3, 0.65), 1e-14);
    const solution = v3(0.2, -0.3, 0.7);
    closeVector(solveSPD(full, matVecMul(full, solution)), solution, 1e-14);
    expect(() => assertSPD([1, 0.2, 0, 0.1, 1, 0, 0, 0, 1])).toThrow(/symmetric/);
    expect(() => assertSPD(diagonal(1, 0, 1))).toThrow(/positive/);
    expect(() => assertSPD(diagonal(1, -1, 1))).toThrow(/positive/);
    expect(() => assertSPD(diagonal(1, Infinity, 1))).toThrow(/finite/);
  });
});

describe('coupled rigid integration against independent criteria', () => {
  it('matches inertial straight-line motion and constant force plus explicit gravity for 10 seconds', () => {
    const start = initial({ r: v3(12, -4, 7), v: v3(3, 5, -2) });
    const free = run(start, 10, 0.01, () => loads());
    closeVector(free.v, start.v, 1e-12); closeVector(free.r, v3(42, 46, -13), 1e-10);
    const acceleration = v3(2, -3, -8);
    const end = run(start, 10, 0.01, () => loads({ mass: 5, forceECI: v3(10, -15, 10), externalAccelerationECI: v3(0, 0, -10) }));
    closeVector(end.v, add(start.v, scale(acceleration, 10)), 1e-10);
    closeVector(end.r, add(add(start.r, scale(start.v, 10)), scale(acceleration, 50)), 1e-9);
    expect(start.r).toEqual(v3(12, -4, 7)); // caller-owned state remains untouched
  });

  it('matches constant principal-axis torque and angular displacement, with observable raw norm drift', () => {
    const end = run(initial({ omegaBody: v3(0.1, 0, 0) }), 10, 0.01,
      () => loads({ inertiaBody: diagonal(2, 3, 4), momentBody: v3(0.4, 0, 0) }));
    closeVector(end.omegaBody, v3(2.1, 0, 0), 1e-12);
    expect(quatAngularDistance(end.attitudeQ, quatFromAxisAngle(v3(1, 0, 0), 11))).toBeLessThan(1e-8);
    const coarse = integrateRigidStep(0, initial({ omegaBody: v3(0, 0, 4) }), 0.2, () => loads());
    expect(Math.abs(coarse.quaternionNormBeforeNormalize - 1)).toBeGreaterThan(1e-6);
    expect(Math.abs(quatNorm(coarse.state.attitudeQ) - 1)).toBeLessThan(1e-14);
  });

  it('evaluates all RK substage loads and preserves explicit variable-mass correction semantics', () => {
    const times: number[] = [], masses: number[] = [];
    const stageModel: RigidModelFn = (t, s) => {
      times.push(t); masses.push(1000 - 2 * t);
      expect(Math.abs(quatNorm(s.attitudeQ) - 1)).toBeLessThan(1e-14);
      return loads({ mass: masses.at(-1)!, forceECI: v3(2000, 0, 0), inertiaBody: diagonal(10 - t, 10 - t, 10 - t) });
    };
    integrateRigidStep(1, initial(), 0.2, stageModel);
    expect(times).toEqual([1, 1.1, 1.1, 1.2]); expect(masses).toEqual([998, 997.8, 997.8, 997.6]);
    const burn = run(initial(), 10, 0.02, t => loads({ mass: 1000 - 2 * t, forceECI: v3(2000, 0, 0) }));
    const rocketDeltaV = 1000 * Math.log(1000 / 980); // net thrust / mass-flow * ln(m0/m1)
    expect(Math.abs(burn.v.x - rocketDeltaV) / rocketDeltaV).toBeLessThan(1e-5);
    const noCorrection = run(initial({ omegaBody: v3(0, 0, 0.5) }), 2, 0.01,
      t => loads({ inertiaBody: diagonal(10 - t, 10 - t, 10 - t) }));
    closeVector(noCorrection.omegaBody, v3(0, 0, 0.5), 1e-12);
    const correction = run(initial(), 2, 0.01,
      () => loads({ inertiaBody: diagonal(2, 3, 4), massFlowMomentBody: v3(0, 0, 2) }));
    closeVector(correction.omegaBody, v3(0, 0, 1), 1e-12);
  });

  it('shows fourth-order convergence for rotating body thrust at 0.02/0.01/0.005 s', () => {
    const omega = 3, duration = 2, acceleration = 7;
    const exact = { r: v3(acceleration / omega ** 2 * (1 - Math.cos(omega * duration)),
      acceleration * (duration / omega - Math.sin(omega * duration) / omega ** 2), 0),
      v: v3(acceleration / omega * Math.sin(omega * duration), acceleration / omega * (1 - Math.cos(omega * duration)), 0),
      q: quatFromAxisAngle(v3(0, 0, 1), omega * duration) };
    const errors = [0.02, 0.01, 0.005].map(dt => {
      const result = run(initial({ omegaBody: v3(0, 0, omega) }), duration, dt,
        (_t, state) => loads({ forceECI: quatRotate(state.attitudeQ, v3(acceleration, 0, 0)) }));
      return norm(sub(result.r, exact.r)) + norm(sub(result.v, exact.v)) + quatAngularDistance(result.attitudeQ, exact.q);
    });
    expect(errors[2]).toBeLessThan(1e-8);
    for (let i = 0; i < 2; i++) {
      const order = Math.log2(errors[i] / errors[i + 1]);
      expect(order).toBeGreaterThan(3.8); expect(order).toBeLessThan(4.2);
    }
  });

  it('conserves torque-free asymmetric energy and the inertial angular-momentum VECTOR for 600 seconds', () => {
    // A non-diagonal physical tensor: principal moments 4, 5, 6 in a rotated basis.
    const basisQ = quatFromAxisAngle(v3(1, 2, -1), 0.7), basis = quatToMatrix(basisQ);
    const inertia = matMul(matMul(basis, diagonal(4, 5, 6)), matTranspose(basis));
    const omegaPrincipal = v3(0.7, 1.1, 0.5);
    let state = initial({ attitudeQ: quatFromAxisAngle(v3(2, -1, 3), 0.4), omegaBody: matVecMul(basis, omegaPrincipal) });
    const energy0 = 0.5 * dot(state.omegaBody, matVecMul(inertia, state.omegaBody));
    const momentum0 = quatRotate(state.attitudeQ, matVecMul(inertia, state.omegaBody));
    const initialPrincipalRotation = matMul(quatToMatrix(state.attitudeQ), basis);
    let energyDrift = 0, vectorDrift = 0, normDrift = 0;
    for (let i = 0; i < 60000; i++) {
      const step = integrateRigidStep(i * 0.01, state, 0.01, () => loads({ inertiaBody: inertia }));
      state = step.state;
      normDrift = Math.max(normDrift, Math.abs(step.quaternionNormBeforeNormalize - 1));
      if (i % 100 === 99) {
        energyDrift = Math.max(energyDrift, Math.abs(0.5 * dot(state.omegaBody, matVecMul(inertia, state.omegaBody)) - energy0) / energy0);
        vectorDrift = Math.max(vectorDrift, norm(sub(quatRotate(state.attitudeQ, matVecMul(inertia, state.omegaBody)), momentum0)) / norm(momentum0));
      }
    }
    expect(energyDrift).toBeLessThan(1e-6); expect(vectorDrift).toBeLessThan(1e-6);
    expect(normDrift).toBeLessThan(1e-10); expect(Math.abs(quatNorm(state.attitudeQ) - 1)).toBeLessThan(1e-10);
    // Independent Dormand–Prince order-5 solver: direct Euler principal-axis
    // equations and 9 DCM entries, no production quaternion/RK4/tensor solver.
    const reference = independentTop([...initialPrincipalRotation, omegaPrincipal.x, omegaPrincipal.y, omegaPrincipal.z], 600, 0.02);
    const actualPrincipalRotation = matMul(quatToMatrix(state.attitudeQ), basis);
    actualPrincipalRotation.forEach((value, i) => expect(Math.abs(value - reference[i])).toBeLessThan(1e-6));
    const actualPrincipalOmega = quatInverseRotate(basisQ, state.omegaBody);
    closeVector(actualPrincipalOmega, v3(reference[9], reference[10], reference[11]), 1e-6);
  }, 20000);

  it('rejects invalid state/load/timestep and treats zero duration as a pure copy', () => {
    expect(() => integrateRigidStep(0, initial(), -0.1, () => loads())).toThrow(/timestep/);
    expect(() => integrateRigidStep(0, initial({ attitudeQ: { w: 2, x: 0, y: 0, z: 0 } }), 0.1, () => loads())).toThrow(/unit/);
    expect(() => integrateRigidStep(0, initial(), 0.1, () => loads({ mass: 0 }))).toThrow(/mass/);
    expect(() => integrateRigidStep(0, initial(), 0.1, () => loads({ forceECI: v3(NaN) }))).toThrow(/finite/);
    const state = initial(), result = integrateRigidStep(0, state, 0, () => { throw new Error('must not evaluate'); });
    expect(result.state).toEqual(state); expect(result.state).not.toBe(state);
  });
});

// Fixed-step fifth-order Dormand–Prince tableau; independent state representation
// and component equations prevent a shared quaternion convention bug passing.
function independentTop(y: number[], duration: number, h: number): number[] {
  const rows = [[], [1 / 5], [3 / 40, 9 / 40], [44 / 45, -56 / 15, 32 / 9],
    [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
    [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656]];
  const weights = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84];
  function derivative(x: number[]): number[] {
    const [p, q, r] = x.slice(9);
    const out = Array<number>(12);
    for (let row = 0; row < 3; row++) {
      const i = 3 * row;
      out[i] = r * x[i + 1] - q * x[i + 2];
      out[i + 1] = -r * x[i] + p * x[i + 2];
      out[i + 2] = q * x[i] - p * x[i + 1];
    }
    out[9] = (5 - 6) * q * r / 4;
    out[10] = (6 - 4) * r * p / 5;
    out[11] = (4 - 5) * p * q / 6;
    return out;
  }
  for (let step = 0; step < Math.round(duration / h); step++) {
    const k: number[][] = [];
    for (const coefficients of rows) {
      k.push(derivative(y.map((value, i) => value + h * coefficients.reduce((sum, c, j) => sum + c * k[j][i], 0))));
    }
    y = y.map((value, i) => value + h * weights.reduce((sum, c, j) => sum + c * k[j][i], 0));
  }
  return y;
}

describe('staging conserves the whole assembly', () => {
  const parentProperties: RigidMassProperties = { mass: 5, inertiaBody: [12, 1, 0.5, 1, 42, 0.25, 0.5, 0.25, 45] };
  const children: StagingChild[] = [
    { id: 'a', mass: 2, offsetBody: v3(-3, 0, 0), inertiaBody: [4, 1, 0.5, 1, 5, 0.25, 0.5, 0.25, 6] },
    { id: 'b', mass: 3, offsetBody: v3(2, 0, 0), inertiaBody: diagonal(7, 8, 9), bodyToParentQ: quatFromAxisAngle(v3(0, 0, 1), Math.PI / 2) },
  ];
  const state = initial({ r: v3(6.8e6, -2e6, 1e6), v: v3(120, 7000, -300), omegaBody: v3(0.3, -0.2, 0.4),
    attitudeQ: quatFromAxisAngle(v3(1, -2, 3), 0.8) });
  // Deliberately compute sums independently of staging.rigidMomentum.
  function checkMomenta(pieces: ReturnType<typeof separateRigidBody>, parent = state): void {
    const linear = pieces.reduce((sum, p) => add(sum, scale(p.state.v, p.mass)), v3());
    const angular = pieces.reduce((sum, p) => add(sum, add(cross(sub(p.state.r, parent.r), scale(p.state.v, p.mass)),
      quatRotate(p.state.attitudeQ, matVecMul(p.inertiaBody, p.state.omegaBody)))), v3());
    closeVector(linear, scale(parent.v, parentProperties.mass), 1e-8 * Math.max(1, norm(linear)));
    const expectedAngular = quatRotate(parent.attitudeQ, matVecMul(parentProperties.inertiaBody, parent.omegaBody));
    // Earth-radius floating-point positions create <1e-5 absolute cancellation;
    // characteristic orbital momentum is sum |r_offset × m*v| (not tiny residual).
    const angularScale = Math.max(1, norm(expectedAngular), ...pieces.map(p => norm(cross(sub(p.state.r, parent.r), scale(p.state.v, p.mass)))));
    closeVector(angular, expectedAngular, 1e-8 * angularScale);
    expect(pieces.reduce((sum, p) => sum + p.mass, 0)).toBe(parentProperties.mass);
  }

  it('keeps each child CG, omega cross offset, orientation and rotated spin without impulses', () => {
    const pieces = separateRigidBody(state, parentProperties, children);
    checkMomenta(pieces);
    pieces.forEach((piece, i) => {
      const offsetECI = quatRotate(state.attitudeQ, children[i].offsetBody);
      closeVector(piece.state.r, add(state.r, offsetECI), 1e-10);
      closeVector(piece.state.v, add(state.v, cross(quatRotate(state.attitudeQ, state.omegaBody), offsetECI)), 1e-10);
      closeVector(quatRotate(piece.state.attitudeQ, piece.state.omegaBody), quatRotate(state.attitudeQ, state.omegaBody));
    });
  });

  it('preserves linear plus spin/orbital angular momentum for off-axis impulse and pure couple pairs', () => {
    const pieces = separateRigidBody(state, parentProperties, children, [{ childAId: 'a', childBId: 'b', pointBody: v3(0, 0.4, -0.2),
      impulseOnABody: v3(4, -3, 2), angularImpulseOnABody: v3(-0.1, 0.3, 0.2) }]);
    checkMomenta(pieces);
    const baseline = separateRigidBody(state, parentProperties, children);
    expect(norm(sub(pieces[0].state.omegaBody, baseline[0].state.omegaBody))).toBeGreaterThan(0.1);
    closeVector(sub(pieces[0].state.v, baseline[0].state.v), scale(quatRotate(state.attitudeQ, v3(4, -3, 2)), 0.5), 1e-10);
    expect(state.omegaBody).toEqual(v3(0.3, -0.2, 0.4));
  });

  it('preserves initially zero momenta with an absolute floor at a local inertial origin', () => {
    const parent = initial({ attitudeQ: state.attitudeQ });
    const pieces = separateRigidBody(parent, parentProperties, children, [{ childAId: 'a', childBId: 'b', pointBody: v3(0, 0.4, -0.2),
      impulseOnABody: v3(4, -3, 2), angularImpulseOnABody: v3(-0.1, 0.3, 0.2) }]);
    checkMomenta(pieces, parent);
    expect(pieces.every(piece => norm(piece.state.omegaBody) > 0)).toBe(true);
  });

  it('rejects missing/duplicated mass, incorrect CG/tensor, and noninternal impulses', () => {
    expect(() => separateRigidBody(state, parentProperties, children.slice(1))).toThrow(/mass/);
    expect(() => separateRigidBody(state, parentProperties, [children[0], children[0]])).toThrow(/IDs/);
    expect(() => separateRigidBody(state, parentProperties, children.map(c => ({ ...c, offsetBody: add(c.offsetBody, v3(1)) })))).toThrow(/CG/);
    expect(() => separateRigidBody(state, { ...parentProperties, inertiaBody: diagonal(12, 42, 45) }, children)).toThrow(/inertia/);
    expect(() => separateRigidBody(state, parentProperties, children, [{ childAId: 'a', childBId: 'missing', pointBody: v3(), impulseOnABody: v3(1) }])).toThrow(/IDs/);
  });
});
