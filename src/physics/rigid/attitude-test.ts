/**
 * An attitude test flown in the loop (roadmap E04): a step or a doublet added
 * to the autopilot's attitude target about one body axis, the response recorded
 * at every control step, and what the loop linearised at the start (G04)
 * predicts for it. The offset rotates the target about its own body axis, so
 * the autopilot sees it as a change of command; guidance is untouched.
 */
import { commandResponse, type LinearAxis, type LinearModel } from './linear';

export type AttitudeTestKind = 'step' | 'doublet';

export interface AttitudeTestSpec {
  /** The simulator's body axis (x roll, z pitch, y yaw), and the sense of the first pulse along it. */
  axis: LinearAxis;
  sign: 1 | -1;
  kind: AttitudeTestKind;
  amplitudeRad: number;
  /** Step: how long the offset is held; doublet: the length of each half. */
  holdS: number;
}

/** Accepted ranges (the panel's and the tool's). */
export const ATTITUDE_TEST_LIMITS = { amplitudeDeg: [0.1, 5], holdS: [0.2, 20] } as const;
/** The record runs past the offset's end for the release to settle. */
export const ATTITUDE_TEST_TAIL_S = 5;

export interface AttitudeTestRecord {
  spec: AttitudeTestSpec;
  /** Mission time of the first step with the offset, s. */
  startS: number;
  /**
   * From the start, every control step: time, s; the offset commanded and the attitude reached
   * along the test's axis (as the IMU reads it, the error before the test taken out), rad.
   */
  t: number[];
  command: number[];
  response: number[];
  /** Which of the loop's limiters held the test's axis at each step (G03): 1 stopping distance, 2 rate, 4 angular acceleration. */
  limits: number[];
  /** The attitude error along the axis when the test began, rad. */
  baselineRad: number;
  /** The loop as linearised at the start (G04), for the prediction. */
  model?: LinearModel;
  done: boolean;
  /** Ended before its time: the pilot took manual control, or the flight ended. */
  aborted?: 'manual' | 'ended';
  /** On the telemetry while the test runs, a stub (no samples) says how far it has got, s. */
  progressS?: number;
}

/** Throws for a test the runtime cannot fly. */
export function validateAttitudeTestSpec(spec: AttitudeTestSpec): void {
  if (!['x', 'y', 'z'].includes(spec.axis) || (spec.sign !== 1 && spec.sign !== -1) || !['step', 'doublet'].includes(spec.kind)
    || !(spec.amplitudeRad > 0 && spec.amplitudeRad < 0.2) || !(spec.holdS > 0 && spec.holdS <= 60)) throw new RangeError('Invalid attitude test');
}

/** What a telemetry sample carries while the test runs: its settings and progress, not its samples. */
export function attitudeTestStub(record: AttitudeTestRecord): AttitudeTestRecord {
  return { spec: { ...record.spec }, startS: record.startS, t: [], command: [], response: [], limits: [], baselineRad: record.baselineRad, done: false,
    progressS: record.t.length ? record.t[record.t.length - 1] : 0 };
}

/** How long the offset lasts, s. */
export function attitudeTestLength(spec: AttitudeTestSpec): number {
  return spec.kind === 'doublet' ? 2 * spec.holdS : spec.holdS;
}

/** The whole record's length, s. */
export function attitudeTestDuration(spec: AttitudeTestSpec): number {
  return attitudeTestLength(spec) + ATTITUDE_TEST_TAIL_S;
}

/** The offset at `tau` s after the start, rad, along the test's signed axis. */
export function attitudeTestOffset(spec: AttitudeTestSpec, tau: number): number {
  if (tau < 0) return 0;
  if (tau < spec.holdS) return spec.amplitudeRad;
  if (spec.kind === 'doublet' && tau < 2 * spec.holdS) return -spec.amplitudeRad;
  return 0;
}

export interface AttitudeTestMetrics {
  /** Of the first pulse, over the amplitude: 10–90 % rise time, s; overshoot, %; peak. */
  riseS?: number;
  overshootPct: number;
  peak: number;
}

/** Rise and overshoot of the first pulse of a response sampled at `t` (rad), over its amplitude. */
export function pulseMetrics(t: readonly number[], response: readonly number[], spec: AttitudeTestSpec): AttitudeTestMetrics {
  let i10 = -1, i90 = -1, peak = 0;
  for (let i = 0; i < t.length && t[i] < spec.holdS; i++) {
    const y = response[i] / spec.amplitudeRad;
    if (i10 < 0 && y >= 0.1) i10 = i;
    if (i90 < 0 && y >= 0.9) i90 = i;
    peak = Math.max(peak, y);
  }
  return { ...(i10 >= 0 && i90 >= 0 ? { riseS: t[i90] - t[i10] } : {}), overshootPct: Math.max(0, (peak - 1) * 100), peak };
}

/** The RMS difference of two responses over the amplitude, on the first's samples. */
export function responseMismatch(a: readonly number[], b: readonly number[], amplitudeRad: number): number {
  const n = Math.min(a.length, b.length);
  if (!n) return NaN;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += ((a[i] - b[i]) / amplitudeRad) ** 2;
  return Math.sqrt(sum / n);
}

/**
 * What the loop linearised at the start predicts for the test: the attitude the IMU reads along
 * the test's axis, at every control step of the record's length. None without a model, or in a
 * plane nothing steered.
 */
export function predictAttitudeTest(record: AttitudeTestRecord): { t: number[]; response: number[] } | undefined {
  const model = record.model, plane = model?.planes[record.spec.axis];
  if (!model || !plane || plane.actuator === 'none') return undefined;
  // The loop is linear and symmetric: the response along the signed axis is the response to the offset.
  const r = commandResponse(plane, model.T, 0, (t) => attitudeTestOffset(record.spec, t + 1e-9), attitudeTestDuration(record.spec));
  return { t: r.t, response: r.sensed };
}

/** The share of the offset's steps each limiter held the axis (the tail left out). */
export function limiterShares(record: AttitudeTestRecord): { stopping: number; rate: number; acceleration: number } {
  const n = record.t.filter((t) => t < attitudeTestLength(record.spec)).length;
  const share = (bit: number) => (n ? record.limits.slice(0, n).filter((l) => l & bit).length / n : 0);
  return { stopping: share(1), rate: share(2), acceleration: share(4) };
}

/**
 * The latest attitude test at or before `cursor` in the telemetry: while it runs the samples carry
 * a stub, and the sample where it ends the whole record — which a replay inside the test's window
 * takes, to draw it up to the cursor.
 */
export function attitudeTestAt(samples: readonly { t: number; rigid?: { attitudeTest?: AttitudeTestRecord } }[], cursor: number): AttitudeTestRecord | undefined {
  for (let i = samples.length - 1; i >= 0; i--) {
    const s = samples[i];
    if (s.t > cursor + 1e-9) continue;
    const found = s.rigid?.attitudeTest;
    if (!found) continue;
    if (found.done) return found;
    for (let j = i + 1; j < samples.length; j++) {
      const later = samples[j].rigid?.attitudeTest;
      if (later && later.done && later.startS === found.startS) return later;
    }
    return found;
  }
  return undefined;
}
