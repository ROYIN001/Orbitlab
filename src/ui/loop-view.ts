/**
 * The attitude-loop inspector's numbers (roadmap G03), DOM-free: the recorded
 * loop (src/physics/rigid/loop.ts) turned into roll, pitch and yaw in the
 * axes and signs of the notation in force (src/ui/notation.ts), in the units
 * the inspector shows. Every vector here is an axial one (a rotation, a rate,
 * an angular acceleration, a moment), so one relabelling serves them all.
 */
import { RAD } from '../physics/constants';
import { decodeLoopLimits, type AttitudeLoopTelemetry, type AxisFlags } from '../physics/rigid/loop';
import type { RigidTelemetry } from '../physics/rigid/telemetry';
import type { Vec3 } from '../physics/vec3';
import { bodyRates, getNotation, type Notation } from './notation';

export type LoopAxis = 'roll' | 'pitch' | 'yaw';
export const LOOP_AXES: readonly LoopAxis[] = ['roll', 'pitch', 'yaw'];
export type Triple = Record<LoopAxis, number>;
export type FlagTriple = Record<LoopAxis, boolean>;

/** The standard's letter for each axis: ISO rolls about x, pitches about y, yaws about z; ГОСТ about x, z, y. */
export function axisLetter(axis: LoopAxis, n: Notation = getNotation()): string {
  return axis === 'roll' ? 'x' : n === 'iso' ? (axis === 'pitch' ? 'y' : 'z') : (axis === 'pitch' ? 'z' : 'y');
}

/** An axial vector of the simulator's body axes in the standard's, scaled. */
export function triple(v: Vec3, n: Notation, scale = 1): Triple {
  const r = bodyRates(v, n);
  return { roll: r.roll * scale, pitch: r.pitch * scale, yaw: r.yaw * scale };
}
/** Per-axis magnitudes (gains, limits): the same axes, no sign. */
function magnitudes(v: Vec3, scale = 1): Triple { return { roll: v.x * scale, pitch: v.z * scale, yaw: v.y * scale }; }
function flags(f: AxisFlags): FlagTriple { return { roll: f.x, pitch: f.z, yaw: f.y }; }
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const length = (v: Vec3): number => Math.hypot(v.x, v.y, v.z);

export interface LoopView {
  mode: 'auto' | 'manual';
  /** Attitude error, deg; absent under manual rates. */
  errorDeg?: Triple;
  /** Rate command after every limit, deg/s. */
  commandDegS: Triple;
  /** Rates the vehicle turns at, deg/s. */
  measuredDegS: Triple;
  /** Rates the controller read at the start of the step (through the IMU, which reads the bending with P05), deg/s. */
  sensedDegS: Triple;
  /** Command minus what the IMU read, deg/s. */
  rateErrorDegS: Triple;
  /** Commanded angular acceleration, deg/s². */
  accelerationDegS2: Triple;
  gains: { attitude: Triple; rate: Triple; maxRateDegS: Triple; maxAccelerationDegS2: Triple; responseDelayS: number };
  /** kN·m: asked for, after the bending filter, delivered by the engines and jets, the air's, and what was left unmet. */
  momentKNm: { demand: Triple; filtered?: Triple; engines: Triple; jets: Triple; aero: Triple; delivered: Triple; unmet: Triple };
  /** The runtime's own test: unmet beyond 1 N·m and 5 % of the demand. */
  unmetSignificant: boolean;
  limits: { stopping: FlagTriple; rate: FlagTriple; acceleration: FlagTriple; gasBudget: boolean; gimbal: boolean; rcs: boolean };
  gimbalUsePct: number;
  rcsDutyPct: number;
  loadReliefDeg?: { requested: number; limit: number; applied: number };
  /** How far the IMU's reading is off the rigid body (P05 bending), deg. */
  imuErrorDeg?: number;
  /** The bending filter's centre, Hz (P05). */
  notchHz?: number;
}

/** The inspector's view of one sample, or null where no loop ran (a held coast, before liftoff, a legacy recording). */
export function loopView(rigid: RigidTelemetry | undefined, n: Notation = getNotation()): LoopView | null {
  const loop: AttitudeLoopTelemetry | undefined = rigid?.attitudeLoop;
  if (!rigid || !loop) return null;
  const decoded = decodeLoopLimits(loop.limits), sensed = loop.sensedOmegaBody;
  const applied = loop.momentFilteredBody ?? loop.momentDemandBody;
  const delivered = add(add(loop.engineMomentBody, loop.rcsMomentBody), loop.aeroMomentBody), unmet = sub(applied, delivered);
  const kN = 1e-3, g = loop.gains;
  return {
    mode: rigid.controlMode,
    ...(loop.attitudeErrorBody ? { errorDeg: triple(loop.attitudeErrorBody, n, RAD) } : {}),
    commandDegS: triple(loop.desiredRatesBody, n, RAD),
    measuredDegS: triple(rigid.omegaBody, n, RAD),
    sensedDegS: triple(sensed, n, RAD),
    rateErrorDegS: triple(sub(loop.desiredRatesBody, sensed), n, RAD),
    accelerationDegS2: triple(loop.angularAccelerationBody, n, RAD),
    gains: { attitude: magnitudes(g.attitudeGain), rate: magnitudes(g.rateGain), maxRateDegS: magnitudes(g.maxRate, RAD),
      maxAccelerationDegS2: magnitudes(g.maxAngularAcceleration, RAD), responseDelayS: g.responseDelayS ?? 0 },
    momentKNm: { demand: triple(loop.momentDemandBody, n, kN), ...(loop.momentFilteredBody ? { filtered: triple(loop.momentFilteredBody, n, kN) } : {}),
      engines: triple(loop.engineMomentBody, n, kN), jets: triple(loop.rcsMomentBody, n, kN), aero: triple(loop.aeroMomentBody, n, kN),
      delivered: triple(delivered, n, kN), unmet: triple(unmet, n, kN) },
    unmetSignificant: length(unmet) > Math.max(1, length(applied) * 0.05),
    limits: { stopping: flags(decoded.stopping), rate: flags(decoded.rate), acceleration: flags(decoded.acceleration),
      gasBudget: decoded.gasBudget, gimbal: decoded.gimbal, rcs: decoded.rcs },
    gimbalUsePct: loop.gimbalUse * 100,
    rcsDutyPct: loop.rcsDuty * 100,
    ...(loop.loadRelief ? { loadReliefDeg: { requested: loop.loadRelief.requestedRad * RAD, limit: loop.loadRelief.limitRad * RAD,
      applied: loop.loadRelief.appliedRad * RAD } } : {}),
    ...(rigid.flex?.bending ? { imuErrorDeg: rigid.flex.bending.sensorErrorRad * RAD } : {}),
    ...(rigid.flex?.notch ? { notchHz: rigid.flex.notch.centerHz } : {}),
  };
}

/** Whether any limiter is holding the loop on this axis. */
export function axisLimited(view: LoopView, axis: LoopAxis): boolean {
  return view.limits.stopping[axis] || view.limits.rate[axis] || view.limits.acceleration[axis];
}

/** A time history for the inspector's charts: one point per recorded sample with a loop, in [from, to]. */
export interface LoopHistory { t: number[]; views: LoopView[] }
export function loopHistory(samples: readonly { t: number; rigid?: RigidTelemetry }[], from: number, to: number, n: Notation = getNotation()): LoopHistory {
  const t: number[] = [], views: LoopView[] = [], cache = CACHE[n];
  let lo = 0, hi = samples.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (samples[mid].t < from) lo = mid + 1; else hi = mid; }
  for (let i = lo; i < samples.length && samples[i].t <= to; i++) {
    const rigid = samples[i].rigid;
    if (!rigid?.attitudeLoop) continue;
    // Recorded samples are never mutated, so a view per sample and notation stands.
    let view = cache.get(rigid);
    if (!view) { view = loopView(rigid, n)!; cache.set(rigid, view); }
    t.push(samples[i].t); views.push(view);
  }
  return { t, views };
}
const CACHE: Record<Notation, WeakMap<RigidTelemetry, LoopView>> = { iso: new WeakMap(), gost: new WeakMap() };

/** The limiters holding the loop, by name: `stopping:roll`, `rate:pitch`, `acceleration:yaw`, `gasBudget`, `gimbals`, `jets`. */
export function loopLimiterNames(view: LoopView): string[] {
  const names: string[] = [];
  for (const kind of ['stopping', 'rate', 'acceleration'] as const) {
    for (const axis of LOOP_AXES) if (view.limits[kind][axis]) names.push(`${kind}:${axis}`);
  }
  if (view.limits.gasBudget) names.push('gasBudget');
  if (view.limits.gimbal) names.push('gimbals');
  if (view.limits.rcs) names.push('jets');
  return names;
}
