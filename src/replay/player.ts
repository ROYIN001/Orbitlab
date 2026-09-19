/**
 * Replay cursor.
 *
 * The player owns a mission-time cursor that is independent of the live
 * simulation clock. While the cursor sits on the recording head the app is in
 * *live* mode and the cursor follows whatever the simulation just flew;
 * scrubbing backwards drops into *replay* mode, where the cursor moves on its
 * own (play/pause and time warp act on it) while the recorder keeps recording
 * the live flight behind it. Pressing "Live" jumps the cursor back to the head.
 *
 * Nothing here re-simulates: a seek is a binary search in the recording plus
 * `interpolateFrames`.
 */
import { cloneFrame, interpolateFrames, type VisualFrame } from '../physics/frame';
import type { SimEvent } from '../physics/simulation';
import type { FlightRecorder } from './recorder';

export class ReplayPlayer {
  private rec: FlightRecorder;
  /** mission time the user is looking at */
  cursor = 0;
  /** true while the cursor tracks the recording head */
  live = true;
  /** replay playback: whether the cursor advances on its own */
  playing = false;

  constructor(rec: FlightRecorder) {
    this.rec = rec;
    this.cursor = rec.startTime;
  }

  /** Back to live at the start of a new mission. */
  reset(): void {
    this.live = true;
    this.playing = false;
    this.cursor = this.rec.startTime;
  }

  get startTime(): number {
    return this.rec.startTime;
  }
  get headTime(): number {
    return this.rec.headTime;
  }
  get events(): readonly SimEvent[] {
    return this.rec.events;
  }

  /** Keep the cursor on the head while live. */
  syncLive(t: number): void {
    if (this.live) this.cursor = t;
  }

  /**
   * Move the cursor to mission time `t`, clamped to the recording. Seeking to
   * (or past) the head returns to live mode; anything earlier is replay.
   */
  seek(t: number): void {
    const lo = this.rec.startTime;
    const hi = this.rec.headTime;
    const c = Math.max(lo, Math.min(hi, t));
    if (c >= hi - 1e-6) {
      this.cursor = hi;
      this.live = true;
    } else {
      this.cursor = c;
      this.live = false;
    }
  }

  /** Jump the cursor back to the recording head. */
  goLive(): void {
    this.cursor = this.rec.headTime;
    this.live = true;
  }

  /** Advance the replay cursor by `dtMission` seconds; reaching the head goes live. */
  advanceCursor(dtMission: number): void {
    if (this.live) return;
    this.cursor += dtMission;
    if (this.cursor >= this.rec.headTime) this.goLive();
    else if (this.cursor < this.rec.startTime) this.cursor = this.rec.startTime;
  }

  /**
   * The frame at mission time `t` (interpolated between recorded frames).
   *
   * Always a *copy*, including when the seek lands exactly on a stored frame —
   * which is the common case, since every event time is a stored timestamp.
   * Handing out the stored object would expose the recording to whatever the
   * map and the onboard overlay do with what they are given (see `cloneFrame`).
   */
  frameAt(t: number): VisualFrame | null {
    const frames = this.rec.frames;
    if (frames.length === 0) return null;
    const i = this.rec.indexAt(t);
    const a = frames[i];
    const b = frames[i + 1];
    if (!b || t <= a.t + 1e-9) return this.rec.applyRecordedAttitudes(cloneFrame(a));
    if (t >= b.t - 1e-9) return this.rec.applyRecordedAttitudes(cloneFrame(b));
    return this.rec.applyRecordedAttitudes(interpolateFrames(a, b, t));
  }

  /** The frame the user is looking at. */
  frame(): VisualFrame | null {
    return this.frameAt(this.cursor);
  }

  /** Mission time of the first event after `t`, or null. */
  nextEventTime(t: number): number | null {
    for (const e of this.rec.events) if (e.t > t + 1e-3) return e.t;
    return null;
  }

  /** Mission time of the last event before `t`, or null. */
  prevEventTime(t: number): number | null {
    const ev = this.rec.events;
    for (let i = ev.length - 1; i >= 0; i--) if (ev[i].t < t - 1e-3) return ev[i].t;
    return null;
  }

  /** The most recent event at or before `t`. */
  lastEvent(t: number): SimEvent | null {
    const ev = this.rec.events;
    for (let i = ev.length - 1; i >= 0; i--) if (ev[i].t <= t + 1e-6) return ev[i];
    return null;
  }

  /** The next recorded event after `t` — only known when replaying behind the head. */
  nextEvent(t: number): SimEvent | null {
    for (const e of this.rec.events) if (e.t > t + 1e-6) return e;
    return null;
  }
}
