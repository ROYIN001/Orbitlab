/**
 * Physics in a worker (roadmap F02): the recording the app draws from must not
 * depend on which thread flew the mission.
 *
 * The worker's `SimCore` runs here in-process behind a fake transport that
 * structured-clones every message both ways, exactly as `postMessage` does, and
 * its main-thread mirror is compared with an `InlineSession` driven by the same
 * requests — frame for frame, event for event, sample for sample.
 */
import { describe, expect, it } from 'vitest';
import { SimCore } from '../src/session/core';
import { InlineSession, WorkerSession, type SessionWorker } from '../src/session/session';
import type { FromCore, ToCore } from '../src/session/protocol';
import { ReplayPlayer } from '../src/replay/player';
import { FlightRecorder, type RecordingSource } from '../src/replay/recorder';
import type { Simulation } from '../src/physics/simulation';
import { createFrameSimView } from '../src/replay/simview';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { orbitById } from '../src/data/orbits';
import { rigidMission } from './rigid-harness';
import type { MissionConfig } from '../src/types';

const cfg = (): MissionConfig => ({
  vehicleId: 'falcon9', satelliteId: 'starlink', siteId: 'cape', orbit: orbitById('iss'),
  launchTime: new Date(Date.UTC(2026, 8, 15, 12, 0, 0)),
  guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
});

/** A `SimCore` behind a transport that clones like `postMessage` and delivers on `flush`. */
class InProcessWorker implements SessionWorker {
  onmessage: ((event: MessageEvent<FromCore>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
  readonly replies: FromCore[] = [];
  private readonly continuations: Array<() => void> = [];
  readonly core: SimCore;
  posted = 0;
  constructor(maxFrames?: number, now = () => performance.now()) {
    this.core = new SimCore({
      post: (message) => this.replies.push(structuredClone(message)),
      later: (fn) => this.continuations.push(fn),
      now,
    }, maxFrames);
  }
  postMessage(message: ToCore): void {
    this.posted++;
    this.core.handle(structuredClone(message));
  }
  /** Deliver every reply and run every continuation until the worker is idle. */
  flush(): void {
    while (this.replies.length > 0 || this.continuations.length > 0) {
      while (this.replies.length > 0) this.onmessage?.({ data: this.replies.shift()! } as MessageEvent<FromCore>);
      this.continuations.shift()?.();
    }
  }
  terminate(): void {}
}

/** The worker side's own simulation and recorder, as a session-shaped pair. */
function workerSide(worker: InProcessWorker): { sim: Simulation; recorder: FlightRecorder } {
  return worker.core as unknown as { sim: Simulation; recorder: FlightRecorder };
}

/** Everything a recording exposes, as plain data. */
function snapshot(session: { sim: Simulation; recorder: RecordingSource }) {
  const rec = session.recorder, sim = session.sim;
  return {
    frames: structuredClone(rec.frames), events: structuredClone(rec.events), live: structuredClone(rec.recordNow()),
    telemetry: structuredClone(sim.telemetry), revision: sim.telemetryRevision, plan: structuredClone(sim.plan),
    t: sim.state.t, status: sim.state.status, elements: structuredClone(sim.state.elements),
    nextBurnTime: sim.state.nextBurnTime, stats: { ...rec.stats(), rotationWindows: undefined },
  };
}

/** No wall-clock budget: the comparison must not depend on how fast the test machine is. */
const UNBUDGETED = 1e9;

describe('physics worker session', () => {
  it('records a point-mass ascent frame for frame as the main thread would', () => {
    const inline = new InlineSession(cfg());
    const worker = new InProcessWorker();
    const remote = new WorkerSession(cfg(), worker, 1, (m) => { throw new Error(m); });
    worker.flush();
    // Frame-sized requests of varying length, as an animation loop makes them.
    for (let i = 0; i < 2400; i++) {
      const seconds = 0.016 + 0.007 * ((i * 7) % 5);
      inline.advance(seconds, UNBUDGETED);
      remote.advance(seconds, UNBUDGETED);
      worker.flush();
    }
    expect(inline.sim.state.t).toBeGreaterThan(50);
    expect(snapshot(remote)).toEqual(snapshot(inline));
  });

  it('fast-forwards in chunks and mirrors exactly what the worker recorded', () => {
    // A fast-forward is cut into wall-clock chunks on either thread, so where
    // the chunks fall — and the last bits of rounding in the clock — depend on
    // the machine. What must hold exactly is that the app sees the recording
    // the worker made.
    const worker = new InProcessWorker();
    const remote = new WorkerSession(cfg(), worker, 1, (m) => { throw new Error(m); });
    worker.flush();
    for (const target of [0, 700, 2500]) {
      remote.fastForward(target);
      expect(remote.fastForwarding).toBe(true);
      worker.flush();
      expect(remote.fastForwarding).toBe(false);
      for (let i = 0; i < 20; i++) {
        remote.advance(0.05, UNBUDGETED);
        worker.flush();
      }
    }
    const inline = workerSide(worker);
    expect(inline.sim.state.t).toBeGreaterThan(2500);
    expect(inline.sim.state.status).toBe('coast');
    expect(snapshot(remote)).toEqual(snapshot(inline));
    // and the 2-D panels read the same mission through the frame-backed view
    const a = createFrameSimView(inline.sim), b = createFrameSimView(remote.sim);
    const cursor = inline.recorder.frames[Math.floor(inline.recorder.frames.length / 2)];
    a.setFrame(cursor); b.setFrame(remote.recorder.frames[remote.recorder.indexAt(cursor.t)]);
    expect(b.sim.telemetry).toEqual(a.sim.telemetry);
    expect(b.sim.events).toEqual(a.sim.events);
    expect(b.sim.vehicle.deltaVRemaining()).toBe(a.sim.vehicle.deltaVRemaining());
    expect(b.sim.julianDate()).toBe(a.sim.julianDate());
  });

  it('keeps the mirror in step when the recorder thins its oldest frames', () => {
    // the same 300-frame ceiling on both sides
    const inline = new InlineSession(cfg(), new FlightRecorder(300));
    const worker = new InProcessWorker(300);
    const remote = new WorkerSession(cfg(), worker, 1, (m) => { throw new Error(m); });
    worker.flush();
    for (let i = 0; i < 400; i++) {
      inline.advance(10, UNBUDGETED);
      remote.advance(10, UNBUDGETED);
      worker.flush();
    }
    expect(inline.recorder.stats().decimations).toBeGreaterThan(0);
    expect(snapshot(remote)).toEqual(snapshot(inline));
  });

  it('replays a six-DOF flight with the same rotation history, commands included', () => {
    const inline = new InlineSession(rigidMission('leo'));
    const worker = new InProcessWorker();
    const remote = new WorkerSession(rigidMission('leo'), worker, 1, (m) => { throw new Error(m); });
    worker.flush();
    const fly = (seconds: number, n: number) => {
      for (let i = 0; i < n; i++) {
        inline.advance(seconds, UNBUDGETED);
        remote.advance(seconds, UNBUDGETED);
        worker.flush();
      }
    };
    fly(0.05, 700);
    const command = { mode: 'manual' as const, throttle: 0.8, rates: { x: 0, y: 0.01, z: 0 } };
    inline.setRigidCommand(command);
    remote.setRigidCommand(command);
    worker.flush();
    fly(0.05, 100);
    inline.setRigidCommand({ mode: 'auto', throttle: 1, rates: { x: 0, y: 0, z: 0 } });
    remote.setRigidCommand({ mode: 'auto', throttle: 1, rates: { x: 0, y: 0, z: 0 } });
    worker.flush();
    fly(0.05, 100);
    expect(inline.sim.events.some((e) => e.key === 'evt.controlCommand')).toBe(true);
    expect(snapshot(remote)).toEqual(snapshot(inline));
    const a = new ReplayPlayer(inline.recorder), b = new ReplayPlayer(remote.recorder);
    for (const t of [-5, 0.5, 12.34, 29.99, 33.3, inline.sim.state.t - 0.07]) {
      expect(b.frameAt(t)).toEqual(a.frameAt(t));
    }
    // An invalid command is refused on the main thread, synchronously, as the
    // runtime would refuse it.
    expect(() => remote.setRigidCommand({ mode: 'manual', throttle: 2, rates: { x: 0, y: 0, z: 0 } })).toThrow(RangeError);
    expect(() => remote.sim.setRigidCommand({ mode: 'manual', throttle: 2, rates: { x: 0, y: 0, z: 0 } })).toThrow(RangeError);
  }, 120000);

  it('flies an attitude test in the worker as on the main thread (roadmap E04)', () => {
    const inline = new InlineSession(rigidMission('leo'));
    const worker = new InProcessWorker();
    const remote = new WorkerSession(rigidMission('leo'), worker, 1, (m) => { throw new Error(m); });
    worker.flush();
    const fly = (seconds: number, n: number) => {
      for (let i = 0; i < n; i++) {
        inline.advance(seconds, UNBUDGETED);
        remote.advance(seconds, UNBUDGETED);
        worker.flush();
      }
    };
    fly(0.05, 600);
    const spec = { axis: 'x' as const, sign: 1 as const, kind: 'doublet' as const, amplitudeRad: 0.01, holdS: 0.5 };
    expect(typeof inline.sim.startAttitudeTest(spec)).toBe('object');
    expect(typeof remote.sim.startAttitudeTest(spec)).toBe('object');
    worker.flush();
    expect(remote.sim.startAttitudeTest(spec)).toBe('running');
    fly(0.05, 160);
    expect(inline.sim.events.some((e) => e.key === 'evt.attitudeTestDoublet')).toBe(true);
    expect(snapshot(remote)).toEqual(snapshot(inline));
    const done = remote.sim.telemetry.filter((s) => s.rigid?.attitudeTest?.done);
    expect(done.length).toBe(1);
    expect(done[0].rigid!.attitudeTest!.t.length).toBe(600);
    expect(() => remote.sim.startAttitudeTest({ ...spec, amplitudeRad: 1 })).toThrow(RangeError);
  }, 120000);

  it('takes a failure injected live in the worker as on the main thread (roadmap G08)', () => {
    const inline = new InlineSession(rigidMission('leo'));
    const worker = new InProcessWorker();
    const remote = new WorkerSession(rigidMission('leo'), worker, 1, (m) => { throw new Error(m); });
    worker.flush();
    const fly = (n: number) => {
      for (let i = 0; i < n; i++) {
        inline.advance(0.05, UNBUDGETED);
        remote.advance(0.05, UNBUDGETED);
        worker.flush();
      }
    };
    fly(400);
    const spec = { kind: 'gyroBias' as const, time: 0, units: [1], axis: 'yaw' as const, magnitude: 1 };
    expect(inline.sim.injectControlFault(spec, true)).toBe('injected');
    expect(remote.sim.injectControlFault(spec, true)).toBe('injected');
    expect(remote.sim.injectControlFault({ kind: 'gnssLoss', time: 0 })).toBe('invalid');
    worker.flush();
    fly(100);
    expect(inline.sim.events.some((e) => e.key === 'evt.fdirImuIsolated')).toBe(true);
    expect(snapshot(remote)).toEqual(snapshot(inline));
    expect(remote.sim.telemetry.at(-1)!.rigid!.controlFaults!.units).toEqual(['isolated', 'ok', 'ok']);
  }, 120000);

  it('flies on inertial navigation in the worker as on the main thread (roadmap G02)', () => {
    const mission = () => { const m = rigidMission('leo'); return { ...m, dynamics: { ...m.dynamics!, navigation: { grade: 'mems' as const, gnssOutage: [5, 20] as [number, number] } } }; };
    const inline = new InlineSession(mission());
    const worker = new InProcessWorker();
    const remote = new WorkerSession(mission(), worker, 1, (m) => { throw new Error(m); });
    worker.flush();
    for (let i = 0; i < 600; i++) {
      inline.advance(0.05, UNBUDGETED);
      remote.advance(0.05, UNBUDGETED);
      worker.flush();
    }
    expect(inline.sim.telemetry.some((s) => s.rigid?.navigation?.gnss === 'outage')).toBe(true);
    expect(snapshot(remote)).toEqual(snapshot(inline));
  }, 120000);

  it('asks for no more than two frames of flight ahead of what has come back', () => {
    const worker = new InProcessWorker();
    const remote = new WorkerSession(cfg(), worker, 1, (m) => { throw new Error(m); });
    worker.flush();
    const posted = worker.posted;
    // replies held back: the transport answers, the session does not see it yet
    for (let i = 0; i < 10; i++) remote.advance(0.016, UNBUDGETED);
    expect(worker.posted - posted).toBe(2);
    worker.flush();
    remote.advance(0.016, UNBUDGETED);
    expect(worker.posted - posted).toBe(3);
  });

  it('ignores a previous mission and falls back when the worker cannot fly', () => {
    const worker = new InProcessWorker();
    const first = new WorkerSession(cfg(), worker, 1, (m) => { throw new Error(m); });
    worker.flush();
    first.advance(5, UNBUDGETED);
    const second = new WorkerSession({ ...cfg(), vehicleId: 'electron', satelliteId: 'cubesats', siteId: 'mahia' }, worker, 2, (m) => { throw new Error(m); });
    worker.flush();
    expect(second.recorder.frames).toHaveLength(1);
    expect(second.sim.state.t).toBe(-10);

    const failures: string[] = [];
    const broken = new InProcessWorker();
    broken.core.handle = () => { throw new Error('unreachable'); };
    broken.postMessage = (message: ToCore) => {
      if (message.type === 'start') broken.replies.push({ type: 'error', session: message.session, message: 'no worker physics' });
    };
    const session = new WorkerSession(cfg(), broken, 7, (m) => failures.push(m));
    broken.flush();
    expect(failures).toEqual(['no worker physics']);
    session.advance(1, UNBUDGETED);
  });
});
