/** Quaternion attitude/rate control produces torque requests, never state edits. */
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import { matVecMul, quatConjugate, quatMultiply, quatNormalize, type Mat3, type Quat } from './math';

export interface ControlGains {
  /** Attitude-error to desired angular-rate gains, 1/s. */
  attitudeGain: Vec3;
  /** Rate-error to angular-acceleration gains, 1/s. */
  rateGain: Vec3;
  maxRate: Vec3;
  maxAngularAcceleration: Vec3;
  /** Conservative actuator response/slew allowance in stopping-distance shaping. */
  responseDelayS?: number;
}
export interface ControlDemand {
  desiredRates: Vec3;
  angularAcceleration: Vec3;
  momentBody: Vec3;
  saturated: boolean;
}
const axes = ['x', 'y', 'z'] as const;
function checkGains(gains: ControlGains): void {
  if (!Number.isFinite(gains.responseDelayS ?? 0) || (gains.responseDelayS ?? 0) < 0) throw new RangeError('Invalid control response delay');
  for (const vector of [gains.attitudeGain, gains.rateGain, gains.maxRate, gains.maxAngularAcceleration]) {
    if (axes.some(axis => !Number.isFinite(vector[axis]) || vector[axis] < 0)) throw new RangeError('Control gains/limits must be finite and nonnegative');
  }
}
function limited(vector: Vec3, limit: Vec3): Vec3 {
  if (axes.some(axis => !Number.isFinite(vector[axis]))) throw new RangeError('Control state must be finite');
  return v3(...axes.map(axis => Math.max(-limit[axis], Math.min(limit[axis], vector[axis]))) as [number, number, number]);
}

/** Manual commands are body rates in rad/s: X roll, Y pitch, Z yaw. */
export function rateControl(desiredRates: Vec3, omegaBody: Vec3, inertiaBody: Mat3, gains: ControlGains): ControlDemand {
  checkGains(gains);
  const rates = limited(desiredRates, gains.maxRate);
  const error = sub(rates, omegaBody);
  const requested = v3(error.x * gains.rateGain.x, error.y * gains.rateGain.y, error.z * gains.rateGain.z);
  const acceleration = limited(requested, gains.maxAngularAcceleration);
  // Gyroscopic feedforward cancels Euler coupling only when the physical
  // actuators can supply this torque; allocation residual remains observable.
  const momentBody = matVecMul(inertiaBody, acceleration);
  const gyroscopic = cross(omegaBody, matVecMul(inertiaBody, omegaBody));
  momentBody.x += gyroscopic.x; momentBody.y += gyroscopic.y; momentBody.z += gyroscopic.z;
  return {
    desiredRates: rates, angularAcceleration: acceleration, momentBody,
    saturated: axes.some(axis => rates[axis] !== desiredRates[axis] || acceleration[axis] !== requested[axis]),
  };
}

/** Hamilton qBodyToInertial; the shortest error rotation is expressed in Body. */
export function attitudeControl(attitude: Quat, target: Quat, omegaBody: Vec3, inertiaBody: Mat3, gains: ControlGains): ControlDemand {
  const error = quatNormalize(quatMultiply(quatConjugate(quatNormalize(attitude)), quatNormalize(target)));
  // q and -q describe the same attitude, including the exact 180-degree tie.
  const first = Math.abs(error.x) > 1e-14 ? error.x : Math.abs(error.y) > 1e-14 ? error.y : error.z;
  if (Math.abs(error.w) < 1e-14 ? first < 0 : error.w < 0) {
    error.w = -error.w; error.x = -error.x; error.y = -error.y; error.z = -error.z;
  }
  const vectorLength = Math.hypot(error.x, error.y, error.z);
  const factor = vectorLength > 1e-12 ? 2 * Math.atan2(vectorLength, Math.max(0, error.w)) / vectorLength : 2;
  checkGains(gains);
  const rotation = v3(factor * error.x, factor * error.y, factor * error.z);
  let limitedByStoppingDistance = false;
  const requested = v3(...axes.map(axis => {
    const distance = Math.abs(rotation[axis]), acceleration = gains.maxAngularAcceleration[axis];
    const delayVelocity = acceleration * (gains.responseDelayS ?? 0);
    // distance = v*delay + v²/(2*a). Rationalized form avoids cancellation
    // close to target. These are command bounds, never edits to angular rate.
    const stoppingRate = acceleration > 0 ? 2 * acceleration * distance
      / (Math.sqrt(delayVelocity ** 2 + 2 * acceleration * distance) + delayVelocity || 1) : 0;
    const proportional = distance * gains.attitudeGain[axis];
    limitedByStoppingDistance ||= stoppingRate < proportional;
    return Math.sign(rotation[axis]) * Math.min(proportional, stoppingRate);
  }) as [number, number, number]);
  const demand = rateControl(requested, omegaBody, inertiaBody, gains);
  return { ...demand, saturated: demand.saturated || limitedByStoppingDistance };
}

/** Ascent-only aerodynamic load relief: rotate the requested direction toward
 * relative airflow by a bounded angle. Caller selects the ascent/q envelope.
 * No attitude, angular rate, force or aerodynamic coefficient is overwritten. */
export function limitAscentCommand(requestedECI: Vec3, airVelocityECI: Vec3, maxAngleRad: number): Vec3 {
  if (!Number.isFinite(maxAngleRad) || maxAngleRad < 0 || maxAngleRad > Math.PI) throw new RangeError('Invalid ascent angle limit');
  const requested = normalize(requestedECI);
  if (norm(airVelocityECI) < 1e-6) return requested;
  const air = normalize(airVelocityECI), cosine = Math.max(-1, Math.min(1, dot(air, requested)));
  const angle = Math.acos(cosine);
  if (angle <= maxAngleRad) return requested;
  let transverse = sub(requested, scale(air, cosine));
  if (norm(transverse) < 1e-10) transverse = cross(Math.abs(air.z) < 0.8 ? v3(0, 0, 1) : v3(0, 1, 0), air);
  return add(scale(air, Math.cos(maxAngleRad)), scale(normalize(transverse), Math.sin(maxAngleRad)));
}
