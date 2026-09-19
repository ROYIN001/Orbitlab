import { type Vec3, add, cross, scale, sub } from '../vec3';
import { type Mat3, type Quat, matVecMul, quatMultiply, quatNorm, quatNormalize, solveSPD } from './math';

/** SI units. r and v locate the CG in ECI; attitudeQ maps Body to ECI. */
export interface RigidState { r: Vec3; v: Vec3; attitudeQ: Quat; omegaBody: Vec3 }
export interface RigidLoads {
  mass: number;
  inertiaBody: Mat3;
  /** Net force including exhaust momentum, but excluding gravity. N in ECI. */
  forceECI: Vec3;
  /** External moment about the current CG, N m in body axes. */
  momentBody: Vec3;
  /** Gravity or another imposed acceleration, m/s² in ECI. Explicit zero disables it. */
  externalAccelerationECI: Vec3;
  /** Declared variable-mass angular momentum correction, N m, body axes.
   * Omission is the quasi-steady zero-correction approximation, NOT -I_dot*omega.
   * The caller must state its mass-flow assumptions and avoid counting flux twice. */
  massFlowMomentBody?: Vec3;
}
/** Pure evaluation: every RK substage re-evaluates mass, inertia, forces and moments.
 * Supplied stage attitude is normalized; do not mutate state or advance controller
 * memory here. Caller splits steps at discontinuities and advances actuator state. */
export type RigidModelFn = (t: number, state: Readonly<RigidState>) => RigidLoads;
export interface RigidStepResult { state: RigidState; quaternionNormBeforeNormalize: number }

function finiteVector(v: Vec3, name: string): void {
  if (![v.x, v.y, v.z].every(Number.isFinite)) throw new RangeError(`${name} must be finite`);
}
function plus(s: RigidState, k: RigidState, h: number): RigidState {
  return { r: add(s.r, scale(k.r, h)), v: add(s.v, scale(k.v, h)),
    omegaBody: add(s.omegaBody, scale(k.omegaBody, h)),
    attitudeQ: { w: s.attitudeQ.w + h * k.attitudeQ.w, x: s.attitudeQ.x + h * k.attitudeQ.x,
      y: s.attitudeQ.y + h * k.attitudeQ.y, z: s.attitudeQ.z + h * k.attitudeQ.z } };
}
function derivative(t: number, s: RigidState, model: RigidModelFn): RigidState {
  const loads = model(t, { ...s, attitudeQ: quatNormalize(s.attitudeQ) });
  if (!(loads.mass > 0) || !Number.isFinite(loads.mass)) throw new RangeError('Rigid mass must be finite and positive');
  finiteVector(loads.forceECI, 'Force');
  finiteVector(loads.momentBody, 'Moment');
  finiteVector(loads.externalAccelerationECI, 'External acceleration');
  const correction = loads.massFlowMomentBody ?? { x: 0, y: 0, z: 0 };
  finiteVector(correction, 'Mass flow moment');
  // Euler's equation in arbitrary body axes: I*w_dot = M - w×(I*w) + M_flow.
  // UT Austin, Euler's Equations, eqs. 501–506:
  // https://farside.ph.utexas.edu/teaching/336k/Newtonhtml/node68.html
  const angularMomentum = matVecMul(loads.inertiaBody, s.omegaBody);
  const omegaDot = solveSPD(loads.inertiaBody,
    add(sub(loads.momentBody, cross(s.omegaBody, angularMomentum)), correction));
  // Active Body→ECI convention: q(t+dt) = q(t) ⊗ dq_body, hence q_dot=0.5*q⊗[0,w].
  const qDot = quatMultiply(s.attitudeQ, { w: 0, ...s.omegaBody });
  return { r: { ...s.v }, v: add(loads.externalAccelerationECI, scale(loads.forceECI, 1 / loads.mass)),
    omegaBody: omegaDot, attitudeQ: { w: qDot.w / 2, x: qDot.x / 2, y: qDot.y / 2, z: qDot.z / 2 } };
}

/** Coupled classic RK4. No hidden gravity, rotation constraints, control torques or
 * event handling. Quaternion projection occurs only after the accepted step;
 * pre-projection norm is returned so a caller can detect an inadequate timestep.
 * The caller must check convergence and limit dt against rotational bandwidth. */
export function integrateRigidStep(t: number, state: RigidState, dt: number, modelFn: RigidModelFn): RigidStepResult {
  if (!Number.isFinite(t) || !Number.isFinite(dt) || dt < 0) throw new RangeError('Time and nonnegative timestep must be finite');
  finiteVector(state.r, 'Position'); finiteVector(state.v, 'Velocity'); finiteVector(state.omegaBody, 'Angular rate');
  const inputNorm = quatNorm(state.attitudeQ);
  if (!Number.isFinite(inputNorm) || Math.abs(inputNorm - 1) > 1e-6) throw new RangeError('Initial attitude quaternion must be unit length');
  const s: RigidState = { r: { ...state.r }, v: { ...state.v }, attitudeQ: quatNormalize(state.attitudeQ), omegaBody: { ...state.omegaBody } };
  if (dt === 0) return { state: s, quaternionNormBeforeNormalize: inputNorm };
  const k1 = derivative(t, s, modelFn);
  const k2 = derivative(t + dt / 2, plus(s, k1, dt / 2), modelFn);
  const k3 = derivative(t + dt / 2, plus(s, k2, dt / 2), modelFn);
  const k4 = derivative(t + dt, plus(s, k3, dt), modelFn);
  const result = plus(plus(plus(plus(s, k1, dt / 6), k2, dt / 3), k3, dt / 3), k4, dt / 6);
  finiteVector(result.r, 'Integrated position'); finiteVector(result.v, 'Integrated velocity'); finiteVector(result.omegaBody, 'Integrated angular rate');
  const quaternionNormBeforeNormalize = quatNorm(result.attitudeQ);
  result.attitudeQ = quatNormalize(result.attitudeQ);
  return { state: result, quaternionNormBeforeNormalize };
}
