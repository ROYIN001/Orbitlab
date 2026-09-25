/**
 * Messages between the app and the physics worker (roadmap F02).
 *
 * The worker owns the `Simulation` and the `FlightRecorder` that records it —
 * the same classes, run exactly as the app used to run them on the main thread
 * — and after every request it sends back what the recording gained: new
 * frames, the live instant, new events, rotation samples, telemetry and the
 * mission plan when the plan changed. Everything here survives structured
 * clone; nothing carries a function or a class instance.
 */
import type { ToruCommand } from '../physics/sim/rendezvous';
import type { VisualFrame } from '../physics/frame';
import type { MissionPlan } from '../physics/mission';
import type { RigidCommand } from '../physics/rigid/telemetry';
import type { SimEvent, TelemetrySample } from '../physics/simulation';
import type { SimState } from '../physics/sim/types';
import type { MissionConfig } from '../types';

/** Main thread → worker. `session` numbers a mission; stale replies are dropped by it. */
export type ToCore =
  | { type: 'start'; session: number; cfg: MissionConfig }
  /** Fly `seconds` of mission time, as `FlightRecorder.advance` would, within `budgetMs` of wall time. */
  | { type: 'advance'; session: number; id: number; seconds: number; maxSteps: number; budgetMs: number }
  /** Fly on to mission time `target` in chunks, reporting after each. */
  | { type: 'fastForward'; session: number; id: number; target: number }
  /** Abandon a fast-forward in progress. */
  | { type: 'halt'; session: number }
  /** A live flight-control command, pinned into the recording as it is accepted. */
  | { type: 'command'; session: number; command: RigidCommand }
  /** Fire the escape system (roadmap G06), pinned into the recording as it is accepted. */
  | { type: 'abort'; session: number }
  /** The TORU hand controllers (roadmap G07; null hands the approach back to Kurs), pinned into the recording as accepted. */
  | { type: 'toru'; session: number; cmd: ToruCommand | null };

/**
 * The part of a rotation telemetry record `AttitudeTrack.record` reads: the
 * pose, and the identity fields that separate one physical body configuration
 * from the next.
 */
export interface AttitudeSample {
  key: string;
  t: number;
  force: boolean;
  telemetry: {
    attitudeQ: { w: number; x: number; y: number; z: number };
    omegaBody: { x: number; y: number; z: number };
    modelVersion: string;
    dataRevision?: string;
    bodyId?: string;
    configurationId?: string;
    massFlowModel?: 'quasiSteady' | 'reducedFlux';
  };
}

/** Simulation state no frame field carries, for the shell on the main thread. */
export type ShellExtras = Pick<SimState, 'currentBurn' | 'burnStartTime' | 'burnDvRemaining' | 'burnPlaneNormal' | 'predictedApoapsis'> & {
  /** per stage: the flags `VisualFrame` does not record */
  stages: Array<{ cutoff: boolean; burnedOut: boolean; ignitions: number; cutoffTime: number }>;
};

/** What the recording gained since the previous delta. */
export interface RecordingDelta {
  /**
   * After the recorder thinned its oldest frames: the times of the frames
   * already sent that survived. Times are unique in a recording.
   */
  keepTimes?: number[];
  /** Length to cut the mirror's frame list to before appending `frames`. */
  truncate: number;
  frames: VisualFrame[];
  /** The live instant, as `FlightRecorder.recordNow` returned it. */
  live: VisualFrame;
  /** Newly detected events, in detection order. */
  events: SimEvent[];
  attitudes: AttitudeSample[];
  telemetry: { reset: boolean; revision: number; samples: TelemetrySample[] };
  /** The mission plan, when it changed (re-planned burns). */
  plan?: MissionPlan;
  extras: ShellExtras;
  decimations: number;
}

/** Worker → main thread. */
export type FromCore =
  | {
    type: 'delta'; session: number;
    /** the request this answers, when it answers one */
    ack?: number;
    /** a fast-forward reached its target, failed or stopped making progress */
    fastForwardDone?: boolean;
    delta: RecordingDelta;
  }
  | { type: 'error'; session: number; ack?: number; message: string };
