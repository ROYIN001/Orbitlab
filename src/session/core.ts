/**
 * The physics worker's side of a flight (roadmap F02).
 *
 * It runs the mission exactly as the app used to run it on the main thread —
 * a `Simulation` stepped by a `FlightRecorder` — and after every request it
 * reports what the recording gained as a `RecordingDelta`. Nothing here knows
 * it is in a worker: the transport is two callbacks, so the tests drive it
 * directly and compare its mirror with a recording made in-process.
 */
import { Simulation } from '../physics/simulation';
import { FlightRecorder } from '../replay/recorder';
import type { VisualFrame } from '../physics/frame';
import type { RigidTelemetry } from '../physics/rigid/telemetry';
import type { AttitudeSample, FromCore, RecordingDelta, ShellExtras, ToCore } from './protocol';

/** Where the core's replies go and how it yields between fast-forward chunks. */
export interface CoreHost {
  post(message: FromCore): void;
  /** Run `fn` after the messages already queued have been handled. */
  later(fn: () => void): void;
  now(): number;
}

/** Wall-clock budget of one fast-forward chunk, ms — what the main thread used to spend per frame. */
export const FAST_FORWARD_CHUNK_MS = 30;

export class SimCore {
  private session = -1;
  private sim: Simulation | null = null;
  private recorder: FlightRecorder | null = null;
  private sentFrames: VisualFrame[] = [];
  private sentDecimations = 0;
  private sentEvents = 0;
  private sentTelemetry = 0;
  /** -1: the first delta replaces the shell's own pad sample with the worker's telemetry. */
  private sentRevision = -1;
  private sentPlan = '';
  private attitudes: AttitudeSample[] = [];
  private fastForward: { id: number; target: number } | null = null;

  /** @param maxFrames the recorder's frame ceiling, for tests that exercise its thinning */
  constructor(private readonly host: CoreHost, private readonly maxFrames?: number) {}

  handle(message: ToCore): void {
    if (message.type === 'start') {
      this.start(message.session, message);
      return;
    }
    if (message.session !== this.session || !this.sim || !this.recorder) return;
    const ack = message.type === 'advance' || message.type === 'fastForward' ? message.id : undefined;
    try {
      switch (message.type) {
        case 'advance':
          this.recorder.advance(message.seconds, message.maxSteps, this.host.now() + message.budgetMs);
          this.report(message.id);
          break;
        case 'fastForward':
          this.fastForward = { id: message.id, target: message.target };
          this.runFastForward();
          break;
        case 'halt':
          if (this.fastForward) {
            this.fastForward = null;
            this.report(undefined, true);
          }
          break;
        case 'command':
          // Exactly the app's own sequence: accept the command, then pin the
          // changed state into the recording at the current clock.
          this.sim.setRigidCommand(message.command);
          this.recorder.captureChangedState();
          this.report();
          break;
        case 'attitudeTest':
          // E04: the shell has checked it; the worker's own checks decide.
          this.sim.startAttitudeTest(message.spec);
          this.report();
          break;
      }
    } catch (err) {
      this.fastForward = null;
      this.host.post({ type: 'error', session: this.session, ack, message: err instanceof Error ? err.message : String(err) });
    }
  }

  private start(session: number, message: Extract<ToCore, { type: 'start' }>): void {
    this.session = session;
    this.fastForward = null;
    this.sentFrames = [];
    this.sentDecimations = 0;
    this.sentEvents = 0;
    this.sentTelemetry = 0;
    this.sentRevision = -1;
    this.sentPlan = '';
    this.attitudes = [];
    try {
      this.sim = new Simulation(message.cfg);
      this.recorder = new FlightRecorder(this.maxFrames, (key, t, telemetry, force) => this.attitudes.push(slimAttitude(key, t, telemetry, force)));
      this.recorder.start(this.sim);
      this.report();
    } catch (err) {
      this.sim = null;
      this.recorder = null;
      this.host.post({ type: 'error', session, message: err instanceof Error ? err.message : String(err) });
    }
  }

  /** One fast-forward chunk, as the app's frame loop used to fly it; then yield. */
  private runFastForward(): void {
    const ff = this.fastForward, sim = this.sim, recorder = this.recorder;
    if (!ff || !sim || !recorder) return;
    const budget = this.host.now() + FAST_FORWARD_CHUNK_MS;
    let stalled = false;
    while (sim.state.t < ff.target - 1e-3 && this.host.now() < budget && !sim.isFailed()) {
      const before = sim.state.t;
      recorder.advance(Math.min(600, ff.target - sim.state.t), 3000, budget);
      if (sim.state.t <= before) { stalled = true; break; }
    }
    const done = stalled || sim.state.t >= ff.target - 1e-3 || sim.isFailed();
    if (done) this.fastForward = null;
    this.report(done ? ff.id : undefined, done);
    if (!done) {
      const session = this.session;
      this.host.later(() => {
        if (this.session === session && this.fastForward === ff) {
          try { this.runFastForward(); } catch (err) {
            this.fastForward = null;
            this.host.post({ type: 'error', session, ack: ff.id, message: err instanceof Error ? err.message : String(err) });
          }
        }
      });
    }
  }

  private report(ack?: number, fastForwardDone?: boolean): void {
    this.host.post({ type: 'delta', session: this.session, ack, fastForwardDone, delta: this.delta() });
  }

  /** What the recording and the simulation gained since the previous delta. */
  private delta(): RecordingDelta {
    const sim = this.sim!, recorder = this.recorder!;
    // The live instant first: capturing it can store a frame and pull events,
    // exactly as the app's per-frame `recordNow` did.
    const live = recorder.recordNow();
    const current = recorder.frames;
    let keepTimes: number[] | undefined;
    if (recorder.decimationCount !== this.sentDecimations) {
      const alive = new Set<VisualFrame>(current);
      this.sentFrames = this.sentFrames.filter((f) => alive.has(f));
      keepTimes = this.sentFrames.map((f) => f.t);
      this.sentDecimations = recorder.decimationCount;
    }
    // Only the tail of a recording changes between deltas — appended frames, or
    // a head replaced by a later capture of the same instant.
    let common = Math.min(this.sentFrames.length, current.length);
    while (common > 0 && this.sentFrames[common - 1] !== current[common - 1]) common--;
    const frames = current.slice(common);
    this.sentFrames.length = common;
    for (const f of frames) this.sentFrames.push(f);

    const events = sim.events.slice(this.sentEvents);
    this.sentEvents = sim.events.length;

    const revision = sim.telemetryRevision;
    const reset = revision !== this.sentRevision;
    const samples = reset ? sim.telemetry.slice() : sim.telemetry.slice(this.sentTelemetry);
    this.sentRevision = revision;
    this.sentTelemetry = sim.telemetry.length;

    const planJson = JSON.stringify(sim.plan);
    const plan = planJson !== this.sentPlan ? sim.plan : undefined;
    this.sentPlan = planJson;

    const attitudes = this.attitudes;
    this.attitudes = [];
    const s = sim.state;
    const extras: ShellExtras = {
      currentBurn: s.currentBurn, burnStartTime: s.burnStartTime, burnDvRemaining: s.burnDvRemaining,
      burnPlaneNormal: s.burnPlaneNormal, predictedApoapsis: s.predictedApoapsis,
      stages: sim.vehicle.stages.map((st) => ({ cutoff: st.cutoff, burnedOut: st.burnedOut, ignitions: st.ignitions, cutoffTime: st.cutoffTime })),
    };
    return {
      keepTimes, truncate: common, frames, live, events, attitudes,
      telemetry: { reset, revision, samples }, plan, extras, decimations: recorder.decimationCount,
    };
  }
}

/** Copy what `AttitudeTrack.record` reads, at the moment it read it. */
function slimAttitude(key: string, t: number, telemetry: RigidTelemetry, force: boolean): AttitudeSample {
  const q = telemetry.attitudeQ, w = telemetry.omegaBody;
  return {
    key, t, force,
    telemetry: {
      attitudeQ: { w: q.w, x: q.x, y: q.y, z: q.z }, omegaBody: { x: w.x, y: w.y, z: w.z },
      modelVersion: telemetry.modelVersion, dataRevision: telemetry.dataRevision, bodyId: telemetry.bodyId,
      configurationId: telemetry.configurationId, massFlowModel: telemetry.massFlowModel,
    },
  };
}
