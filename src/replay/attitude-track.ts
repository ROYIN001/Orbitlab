import { quatSlerp, type Quat } from '../physics/rigid/math';
import { type Vec3, lerp } from '../physics/vec3';
import type { RigidTelemetry } from '../physics/rigid/telemetry';

const STRIDE = 8; // time, quaternion w/x/y/z, body angular rate x/y/z
const MAX_INTERVAL = 0.25;
const MAX_TRAVEL = 0.15;
/** 20.4 MB of packed numeric storage per body, allocated only as needed. */
export const MAX_ATTITUDE_SAMPLES = 300000;

export interface AttitudeWindow {
  from: number;
  to: number;
  samples: number;
  /** True means rotations before `from` are no longer retained. */
  truncated: boolean;
  bytes: number;
}
export interface RecordedAttitude { attitudeQ: Quat; omegaBody: Vec3 }

/** Compact independent rotation history. It survives visual-frame decimation,
 * so a 30-second coast frame gap cannot erase a full roll. Immutable source
 * telemetry is copied into packed numbers, never retained by reference. */
export class AttitudeTrack {
  private capacity: number;
  private data: Float64Array;
  private segment: Uint32Array;
  private start = 0;
  private count = 0;
  private dropped = false;
  private signatures: string[] = [];
  private signatureIds = new Map<string, number>();
  private signature = '';
  private signatureId = 0;
  private modelVersion: string | undefined;
  private bodyId: string | undefined;
  private configurationId: string | undefined;
  private massFlowModel: string | undefined;
  private tail = new Float64Array(STRIDE);
  private tailSegment = 0;
  private hasTail = false;
  private travel = 0;

  constructor(private readonly maximumSamples = MAX_ATTITUDE_SAMPLES) {
    if (!Number.isInteger(maximumSamples) || maximumSamples < 2) throw new RangeError('Attitude track capacity must be at least two');
    this.capacity = Math.min(maximumSamples, 256);
    this.data = new Float64Array(this.capacity * STRIDE);
    this.segment = new Uint32Array(this.capacity);
  }

  private signatureFor(value: RigidTelemetry): string {
    return JSON.stringify([value.modelVersion, value.bodyId, value.configurationId, value.massFlowModel]);
  }

  private identify(value: RigidTelemetry): number {
    if (value.modelVersion !== this.modelVersion || value.bodyId !== this.bodyId
      || value.configurationId !== this.configurationId || value.massFlowModel !== this.massFlowModel || !this.signature) {
      this.modelVersion = value.modelVersion; this.bodyId = value.bodyId;
      this.configurationId = value.configurationId; this.massFlowModel = value.massFlowModel;
      this.signature = this.signatureFor(value);
      let id = this.signatureIds.get(this.signature);
      if (id === undefined) {
        id = this.signatures.length;
        this.signatureIds.set(this.signature, id); this.signatures.push(this.signature);
      }
      this.signatureId = id;
    }
    return this.signatureId;
  }

  private physical(logical: number): number { return (this.start + logical) % this.capacity; }
  private time(logical: number): number { return this.data[this.physical(logical) * STRIDE]; }

  private append(values: Float64Array, segment: number): void {
    if (this.count) {
      const last = this.physical(this.count - 1);
      if (this.data[last * STRIDE] === values[0] && this.segment[last] === segment) {
        this.data.set(values, last * STRIDE); return;
      }
    }
    if (this.count === this.capacity && this.capacity < this.maximumSamples) {
      const size = Math.min(this.maximumSamples, this.capacity * 2);
      const next = new Float64Array(size * STRIDE), segments = new Uint32Array(size);
      for (let i = 0; i < this.count; i++) {
        const from = this.physical(i);
        next.set(this.data.subarray(from * STRIDE, (from + 1) * STRIDE), i * STRIDE);
        segments[i] = this.segment[from];
      }
      this.data = next; this.segment = segments; this.capacity = size; this.start = 0;
    }
    const slot = this.physical(this.count);
    if (this.count === this.capacity) { this.start = (this.start + 1) % this.capacity; this.dropped = true; }
    else this.count++;
    this.data.set(values, slot * STRIDE); this.segment[slot] = segment;
  }

  /** Called at each accepted physics tick. A segment transition pins both sides. */
  record(t: number, value: RigidTelemetry, force = false): void {
    const segment = this.identify(value), q = value.attitudeQ, w = value.omegaBody;
    if (!Number.isFinite(t) || ![q.w, q.x, q.y, q.z, w.x, w.y, w.z].every(Number.isFinite)) throw new RangeError('Attitude record must be finite');
    if (this.hasTail && t < this.tail[0] - 1e-10) throw new RangeError('Attitude records must advance in time');
    const changed = this.hasTail && segment !== this.tailSegment;
    if (changed) this.append(this.tail, this.tailSegment);
    const previousRate = Math.hypot(this.tail[5], this.tail[6], this.tail[7]);
    if (this.hasTail) this.travel += Math.max(0, t - this.tail[0]) * Math.max(previousRate, Math.hypot(w.x, w.y, w.z));
    this.tail.set([t, q.w, q.x, q.y, q.z, w.x, w.y, w.z]); this.tailSegment = segment;
    if (!this.hasTail || changed || force || this.travel >= MAX_TRAVEL - 1e-12
      || t - this.time(this.count - 1) >= MAX_INTERVAL - 1e-10) {
      this.append(this.tail, segment); this.travel = 0;
    }
    this.hasTail = true;
  }

  private stateAtSlot(slot: number): RecordedAttitude {
    const i = slot * STRIDE;
    return { attitudeQ: { w: this.data[i + 1], x: this.data[i + 2], y: this.data[i + 3], z: this.data[i + 4] },
      omegaBody: { x: this.data[i + 5], y: this.data[i + 6], z: this.data[i + 7] } };
  }
  private tailState(): RecordedAttitude {
    return { attitudeQ: { w: this.tail[1], x: this.tail[2], y: this.tail[3], z: this.tail[4] },
      omegaBody: { x: this.tail[5], y: this.tail[6], z: this.tail[7] } };
  }

  at(t: number, continuity: RigidTelemetry): RecordedAttitude | undefined {
    if (!this.count || t < this.time(0) - 1e-10 || t > this.tail[0] + 1e-10) return undefined;
    const signature = this.signatureFor(continuity), expected = this.signatureIds.get(signature);
    if (expected === undefined) return undefined;
    // Upper bound chooses the post-event segment if both sides share a timestamp.
    let lo = 0, hi = this.count;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.time(mid) <= t + 1e-10) lo = mid + 1; else hi = mid;
    }
    const index = Math.max(0, lo - 1), slot = this.physical(index), at = this.time(index);
    if (this.segment[slot] !== expected) return undefined;
    const a = this.stateAtSlot(slot);
    if (Math.abs(t - at) < 1e-10) return a;
    let b: RecordedAttitude, bt: number, bs: number;
    if (index + 1 < this.count) {
      const next = this.physical(index + 1);
      b = this.stateAtSlot(next); bt = this.time(index + 1); bs = this.segment[next];
    } else { b = this.tailState(); bt = this.tail[0]; bs = this.tailSegment; }
    if (bs !== expected || !(bt > at)) return a;
    const u = Math.max(0, Math.min(1, (t - at) / (bt - at)));
    return { attitudeQ: quatSlerp(a.attitudeQ, b.attitudeQ, u), omegaBody: lerp(a.omegaBody, b.omegaBody, u) };
  }

  window(): AttitudeWindow {
    return { from: this.count ? this.time(0) : 0, to: this.hasTail ? this.tail[0] : 0,
      samples: this.count, truncated: this.dropped, bytes: this.data.byteLength + this.segment.byteLength + this.tail.byteLength };
  }
}
