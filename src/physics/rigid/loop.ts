/**
 * The attitude loop as it ran (roadmap G03): what the autopilot or the manual
 * rate loop decided at a control step, recorded with the vehicle's six-DOF
 * telemetry for the attitude-loop inspector, the CSV and `read_flight_state`.
 *
 * Every vector is in the simulator's body axes (x the nose; see
 * src/ui/notation.ts for the standards' axes). The values are those decided at
 * the start of the control interval that ends at the sample. Recording them
 * reads the loop and never feeds back into it: a flight with and without the
 * record is the same flight.
 */
import type { Vec3 } from '../vec3';
import type { Quat } from './math';
import type { ControlGains, ControlTrace } from './control';

/** Limiter flags, as bit offsets into `AttitudeLoopTelemetry.limits`. */
export const LOOP_LIMIT = {
  /** Three bits, x y z: the stopping distance held the rate below K_θ·e. */
  stopping: 0,
  /** Three bits: the rate request met the rate limit. */
  rate: 3,
  /** Three bits: the angular acceleration met its scheduled limit. */
  acceleration: 6,
  /** The coast's cold-gas budget slowed the slew. */
  gasBudget: 9,
  /** The gimbals could not supply the moment asked of them. */
  gimbal: 10,
  /** The reaction-control jets could not supply the remainder. */
  rcs: 11,
} as const;

export interface AttitudeLoopTelemetry {
  /** The attitude the autopilot steered to; absent under manual rates. */
  targetQ?: Quat;
  /** Target relative to the sensed attitude as a rotation vector, rad; absent under manual rates. */
  attitudeErrorBody?: Vec3;
  /** Rate command after every limit, rad/s (the manual command, limited, under manual rates). */
  desiredRatesBody: Vec3;
  /** Rates the controller read, rad/s: the body's at the start of the step, or the IMU's reading of a bending structure (P05). */
  sensedOmegaBody: Vec3;
  /** Commanded angular acceleration after its limit, rad/s². */
  angularAccelerationBody: Vec3;
  /** I·ε̇ + ω × Iω, N·m: the moment the controller asked for. */
  momentDemandBody: Vec3;
  /** The same after the bending filter; present only with the notch (P05). */
  momentFilteredBody?: Vec3;
  /** Aerodynamic moment about the centre of mass at the step, N·m. */
  aeroMomentBody: Vec3;
  /** Moment the gimballed engines delivered (mid-interval), N·m. */
  engineMomentBody: Vec3;
  /** Moment the reaction-control jets delivered, N·m. */
  rcsMomentBody: Vec3;
  /** Gains and limits in force: the rate and acceleration limits are scheduled by actuator authority. */
  gains: ControlGains;
  /** Limiter flags (`LOOP_LIMIT`). */
  limits: number;
  /** Largest gimbal deflection as a fraction of its limit, 0–1. */
  gimbalUse: number;
  /** Largest reaction-control duty cycle, 0–1. */
  rcsDuty: number;
  /** Ascent load relief: the command's angle to the relative wind (requested), its limit, and how far it was turned. */
  loadRelief?: { requestedRad: number; limitRad: number; appliedRad: number };
}

const copy = (v: Vec3): Vec3 => ({ x: v.x, y: v.y, z: v.z });

export function cloneAttitudeLoop(value: AttitudeLoopTelemetry): AttitudeLoopTelemetry {
  const g = value.gains;
  return {
    ...value,
    ...(value.targetQ ? { targetQ: { ...value.targetQ } } : {}),
    ...(value.attitudeErrorBody ? { attitudeErrorBody: copy(value.attitudeErrorBody) } : {}),
    desiredRatesBody: copy(value.desiredRatesBody),
    sensedOmegaBody: copy(value.sensedOmegaBody),
    angularAccelerationBody: copy(value.angularAccelerationBody),
    momentDemandBody: copy(value.momentDemandBody),
    ...(value.momentFilteredBody ? { momentFilteredBody: copy(value.momentFilteredBody) } : {}),
    aeroMomentBody: copy(value.aeroMomentBody), engineMomentBody: copy(value.engineMomentBody), rcsMomentBody: copy(value.rcsMomentBody),
    gains: { attitudeGain: copy(g.attitudeGain), rateGain: copy(g.rateGain), maxRate: copy(g.maxRate),
      maxAngularAcceleration: copy(g.maxAngularAcceleration), ...(g.responseDelayS !== undefined ? { responseDelayS: g.responseDelayS } : {}) },
    ...(value.loadRelief ? { loadRelief: { ...value.loadRelief } } : {}),
  };
}

/** A limiter's three per-axis flags. */
export interface AxisFlags { x: boolean; y: boolean; z: boolean }
export interface LoopLimits {
  stopping: AxisFlags;
  rate: AxisFlags;
  acceleration: AxisFlags;
  gasBudget: boolean;
  gimbal: boolean;
  rcs: boolean;
}
const axisFlags = (bits: number, offset: number): AxisFlags =>
  ({ x: !!(bits & (1 << offset)), y: !!(bits & (1 << (offset + 1))), z: !!(bits & (1 << (offset + 2))) });

export function decodeLoopLimits(bits: number): LoopLimits {
  return { stopping: axisFlags(bits, LOOP_LIMIT.stopping), rate: axisFlags(bits, LOOP_LIMIT.rate),
    acceleration: axisFlags(bits, LOOP_LIMIT.acceleration), gasBudget: !!(bits & (1 << LOOP_LIMIT.gasBudget)),
    gimbal: !!(bits & (1 << LOOP_LIMIT.gimbal)), rcs: !!(bits & (1 << LOOP_LIMIT.rcs)) };
}

export function encodeLoopLimits(trace: ControlTrace, flags: { gasBudget: boolean; gimbal: boolean; rcs: boolean }): number {
  return (trace.stoppingLimited << LOOP_LIMIT.stopping) | (trace.rateLimited << LOOP_LIMIT.rate)
    | (trace.accelerationLimited << LOOP_LIMIT.acceleration) | (flags.gasBudget ? 1 << LOOP_LIMIT.gasBudget : 0)
    | (flags.gimbal ? 1 << LOOP_LIMIT.gimbal : 0) | (flags.rcs ? 1 << LOOP_LIMIT.rcs : 0);
}
