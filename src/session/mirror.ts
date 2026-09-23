/**
 * The main thread's copy of a flight recorded in the physics worker (F02).
 *
 * Two objects stand in for the ones the app used to own directly:
 *
 * - `RecordingMirror` is the recording — frames, events, rotation history —
 *   rebuilt from the worker's `RecordingDelta`s, behind the same
 *   `RecordingSource` interface the replay cursor and the frame loop read.
 * - the *shell*: a `Simulation` built from the same mission configuration and
 *   never stepped. It answers everything that is fixed for the mission (plan,
 *   site, vehicle, satellite, `julianDate`) the way the real one would, and
 *   the mirror keeps its clock, state, telemetry and event log current, so the
 *   frame-backed view (src/replay/simview.ts), the map, the onboard overlay,
 *   the telemetry panel, the CSV export and the WebMCP tools all read it
 *   exactly as they read a live simulation.
 */
import { captureFrame, type VisualFrame } from '../physics/frame';
import type { Simulation } from '../physics/simulation';
import type { RigidTelemetry } from '../physics/rigid/telemetry';
import { AttitudeTrack } from '../replay/attitude-track';
import {
  applyAttitudeTracks, frameIndexAt, recordingStats, type RecorderStats, type RecordingSource,
} from '../replay/recorder';
import { applyFrameToState } from '../replay/simview';
import type { RecordingDelta } from './protocol';

export class RecordingMirror implements RecordingSource {
  readonly frames: VisualFrame[] = [];
  private readonly tracks = new Map<string, AttitudeTrack>();
  private decimations = 0;
  private live: VisualFrame;

  /**
   * @param shell the never-stepped simulation of the same mission. Until the
   *        worker's first delta arrives the mirror shows the shell's own pad
   *        frame, which is the frame the worker starts from too.
   */
  constructor(readonly shell: Simulation) {
    this.live = captureFrame(shell);
    this.frames.push(captureFrame(shell));
  }

  get events() {
    return this.shell.chronologicalEvents;
  }
  get startTime(): number {
    return this.frames.length > 0 ? this.frames[0].t : 0;
  }
  get headTime(): number {
    return this.frames.length > 0 ? this.frames[this.frames.length - 1].t : 0;
  }
  get head(): VisualFrame | null {
    return this.frames.length > 0 ? this.frames[this.frames.length - 1] : null;
  }
  indexAt(t: number): number {
    return frameIndexAt(this.frames, t);
  }
  applyRecordedAttitudes(frame: VisualFrame): VisualFrame {
    return applyAttitudeTracks(this.tracks, frame);
  }
  /** The live instant. Like the recorder's, never an object the recording holds. */
  recordNow(): VisualFrame {
    return this.live;
  }
  stats(): RecorderStats {
    return recordingStats(this.frames, this.events.length, this.decimations, this.tracks);
  }

  /** Take one delta from the worker, into the recording and into the shell. */
  apply(delta: RecordingDelta): void {
    if (delta.keepTimes) {
      const keep = new Set(delta.keepTimes);
      let n = 0;
      for (const f of this.frames) if (keep.has(f.t)) this.frames[n++] = f;
      this.frames.length = n;
    }
    if (this.frames.length > delta.truncate) this.frames.length = delta.truncate;
    for (const f of delta.frames) this.frames.push(f);
    this.decimations = delta.decimations;
    for (const sample of delta.attitudes) {
      let track = this.tracks.get(sample.key);
      if (!track) { track = new AttitudeTrack(); this.tracks.set(sample.key, track); }
      // The sample carries every field `record` reads; the rest of a telemetry
      // record (engine maps, wind provenance) is not part of rotation history.
      track.record(sample.t, sample.telemetry as RigidTelemetry, sample.force);
    }
    this.live = delta.live;

    const shell = this.shell;
    for (const e of delta.events) shell.events.push(e);
    shell.mirrorTelemetry(delta.telemetry.samples, delta.telemetry.reset, delta.telemetry.revision);
    if (delta.plan) Object.assign(shell.plan, delta.plan);
    applyFrameToState(shell.state, shell.vehicle, shell.vehicle.stages, delta.live);
    const x = delta.extras;
    shell.state.currentBurn = x.currentBurn;
    shell.state.burnStartTime = x.burnStartTime;
    shell.state.burnDvRemaining = x.burnDvRemaining;
    shell.state.burnPlaneNormal = x.burnPlaneNormal;
    shell.state.predictedApoapsis = x.predictedApoapsis;
    x.stages.forEach((flags, i) => {
      const st = shell.vehicle.stages[i];
      if (!st) return;
      st.cutoff = flags.cutoff; st.burnedOut = flags.burnedOut; st.ignitions = flags.ignitions; st.cutoffTime = flags.cutoffTime;
    });
  }
}
