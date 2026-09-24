/**
 * One mission as the app flies it: the simulation, its recording, and the
 * clock that advances them (roadmap F02).
 *
 * Two implementations behind one interface:
 *
 * - `WorkerSession` flies the mission in a Web Worker. The app's animation
 *   frame only asks for mission time and draws what has arrived, so a slow
 *   renderer no longer takes the physics down with it: the integrator gets a
 *   thread of its own instead of the eight milliseconds a frame could spare.
 * - `InlineSession` flies it on the main thread, exactly as the app always
 *   did. It is the fallback where a module worker cannot start, and
 *   `?physics=inline` selects it for comparison.
 *
 * Both run the same `Simulation` and `FlightRecorder` code on the same
 * sequence of requests, so the flight and the recording do not depend on which
 * thread flew them (tests/session.test.ts holds the worker path's mirror to the
 * in-process recording frame for frame).
 */
import { Simulation } from '../physics/simulation';
import { validateRigidCommand } from '../physics/rigid/runtime';
import type { RigidCommand } from '../physics/rigid/telemetry';
import { FlightRecorder, type RecordingSource } from '../replay/recorder';
import type { MissionConfig } from '../types';
import { RecordingMirror } from './mirror';
import type { FromCore, ToCore } from './protocol';

export interface FlightSession {
  readonly kind: 'inline' | 'worker';
  /**
   * The mission's simulation. For a worker session this is the main-thread
   * shell (see src/session/mirror.ts): read it, never step it.
   */
  readonly sim: Simulation;
  readonly recorder: RecordingSource;
  /** Fly `seconds` of live mission time within about `budgetMs` of wall time. */
  advance(seconds: number, budgetMs: number): void;
  /** Fly on to mission time `target` (in chunks; `fastForwarding` until done). */
  fastForward(target: number): void;
  readonly fastForwarding: boolean;
  /** Abandon a fast-forward. */
  halt(): void;
  /** Once per animation frame. */
  tick(): void;
  /** A live flight-control command; throws `RangeError` for one the runtime would refuse. */
  setRigidCommand(command: RigidCommand): void;
  /** Fire a crewed launch's escape system now (roadmap G06); nothing when there is none to fire. */
  commandAbort(): void;
  dispose(): void;
}

/** Wall-clock budget of one fast-forward chunk on the main thread, ms. */
const INLINE_FAST_FORWARD_MS = 30;

export class InlineSession implements FlightSession {
  readonly kind = 'inline' as const;
  readonly sim: Simulation;
  readonly recorder: FlightRecorder;
  private target: number | null = null;

  constructor(cfg: MissionConfig, recorder = new FlightRecorder()) {
    this.sim = new Simulation(cfg);
    this.recorder = recorder;
    this.recorder.start(this.sim);
  }

  advance(seconds: number, budgetMs: number): void {
    this.recorder.advance(seconds, 20000, performance.now() + budgetMs);
  }
  get fastForwarding(): boolean {
    return this.target !== null;
  }
  fastForward(target: number): void {
    this.target = target;
  }
  halt(): void {
    this.target = null;
  }
  tick(): void {
    const target = this.target, sim = this.sim;
    if (target === null) return;
    if (!(target > sim.state.t + 1e-3) || sim.isFailed()) { this.target = null; return; }
    const budget = performance.now() + INLINE_FAST_FORWARD_MS;
    while (sim.state.t < target - 1e-3 && performance.now() < budget && !sim.isFailed()) {
      const before = sim.state.t;
      this.recorder.advance(Math.min(600, target - sim.state.t), 3000, budget);
      if (sim.state.t <= before) { this.target = null; return; } // no progress: give up rather than spin
    }
    if (sim.state.t >= target - 1e-3 || sim.isFailed()) this.target = null;
  }
  setRigidCommand(command: RigidCommand): void {
    this.sim.setRigidCommand(command);
    this.recorder.captureChangedState();
  }
  commandAbort(): void {
    if (this.sim.commandAbort()) this.recorder.captureChangedState();
  }
  dispose(): void {
    this.target = null;
  }
}

/** The worker transport, injectable so the tests can run the core in-process. */
export interface SessionWorker {
  onmessage: ((event: MessageEvent<FromCore>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: ToCore): void;
  terminate(): void;
}

/** Advance requests the worker may have in hand before the app stops asking. */
const MAX_OUTSTANDING = 2;

export class WorkerSession implements FlightSession {
  readonly kind = 'worker' as const;
  readonly sim: Simulation;
  readonly recorder: RecordingMirror;
  private nextId = 1;
  private readonly pendingAdvance = new Set<number>();
  private ff: { id: number; target: number } | null = null;
  private disposed = false;

  /**
   * @param onFailure the worker could not fly the mission at all (it failed
   *        before its first delta, or the transport broke); the app falls back
   *        to an `InlineSession`.
   * @param onError a request failed in flight; reported, and the flight stops
   *        where it is.
   */
  constructor(cfg: MissionConfig, private readonly worker: SessionWorker, private readonly session: number,
    private readonly onFailure: (message: string) => void, private readonly onError: (message: string) => void = () => {}) {
    this.sim = new Simulation(cfg);
    this.recorder = new RecordingMirror(this.sim);
    // The WebMCP tools command a live flight through `sim.setRigidCommand`;
    // on the shell that has to mean the flight in the worker.
    this.sim.setRigidCommand = (command) => this.setRigidCommand(command);
    let started = false;
    worker.onmessage = ({ data }) => {
      if (this.disposed || data.session !== this.session) return;
      if (data.type === 'error') {
        if (data.ack !== undefined) this.pendingAdvance.delete(data.ack);
        this.ff = null;
        if (!started) { this.fail(data.message); return; }
        this.onError(data.message);
        return;
      }
      started = true;
      this.recorder.apply(data.delta);
      if (data.ack !== undefined) this.pendingAdvance.delete(data.ack);
      if (data.fastForwardDone) this.ff = null;
    };
    worker.onerror = (event) => { if (!this.disposed) this.fail(event.message || 'physics worker failed'); };
    worker.onmessageerror = () => { if (!this.disposed) this.fail('physics worker reply could not be decoded'); };
    this.post({ type: 'start', session, cfg });
  }

  private post(message: ToCore): void {
    try {
      this.worker.postMessage(message);
    } catch (err) {
      this.fail(err instanceof Error ? err.message : String(err));
    }
  }

  private fail(message: string): void {
    if (this.disposed) return;
    this.dispose();
    this.onFailure(message);
  }

  advance(seconds: number, budgetMs: number): void {
    if (this.disposed || this.ff || !(seconds > 0)) return;
    // The worker is still busy with the previous frames' time: drop this
    // frame's rather than queue it, exactly as a main-thread step loop that
    // ran out of its budget drops the rest (the achieved warp says so).
    if (this.pendingAdvance.size >= MAX_OUTSTANDING) return;
    const id = this.nextId++;
    this.pendingAdvance.add(id);
    this.post({ type: 'advance', session: this.session, id, seconds, maxSteps: 20000, budgetMs });
  }
  get fastForwarding(): boolean {
    return this.ff !== null;
  }
  fastForward(target: number): void {
    if (this.disposed || (this.ff && this.ff.target === target)) return;
    this.ff = { id: this.nextId++, target };
    this.post({ type: 'fastForward', session: this.session, id: this.ff.id, target });
  }
  halt(): void {
    if (!this.ff) return;
    this.ff = null;
    this.post({ type: 'halt', session: this.session });
  }
  tick(): void {
    // Deltas arrive on their own, between animation frames.
  }
  setRigidCommand(command: RigidCommand): void {
    // The shell answers what the real `Simulation.setRigidCommand` would ignore
    // or refuse, synchronously, before anything is sent.
    if (!this.sim.rigidRuntime || this.sim.isFailed()) return;
    validateRigidCommand(command);
    this.post({ type: 'command', session: this.session, command: { ...command, rates: { ...command.rates } } });
  }
  commandAbort(): void {
    // the worker's flight decides whether there is an escape to fire
    this.post({ type: 'abort', session: this.session });
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.ff) this.post({ type: 'halt', session: this.session });
    this.ff = null;
    this.pendingAdvance.clear();
  }
}

/** Create the physics worker, or null where module workers are unavailable. */
export function createPhysicsWorker(): SessionWorker | null {
  if (typeof Worker === 'undefined') return null;
  try {
    return new Worker(new URL('./flight.worker.ts', import.meta.url), { type: 'module' }) as unknown as SessionWorker;
  } catch {
    return null;
  }
}
