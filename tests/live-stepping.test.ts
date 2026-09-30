/**
 * Live point-mass stepping that does not depend on frame length (roadmap T02;
 * owner decision 2, 2026-09-29).
 *
 * An instructor's copy re-checks a student's flight by flying it again headless
 * (docs/ROADMAP-PART2-3.md, T02). That only means something if the flight the
 * student watched *is* the headless flight. Until now it was not: the Launch
 * section cut each point-mass step to what was left of the animation frame, so
 * the step sequence — and every number after it — depended on the frame rate
 * and the warp. Measured before this change, on these missions and a crewed
 * Soyuz, the orbit at each insertion event was up to 2.7 km from the headless
 * one with random frames; at a steady 60 frames a second at 1× Electron's
 * suborbital SECO perigee was 19 km from it and its Curie burns ended 42–44 s
 * earlier (probes not committed; docs/PHYSICS.md §2n).
 *
 * The references, fixed before the first comparison:
 * - *the headless flight*: `new Simulation(cfg)` stepped with
 *   `sim.step(sim.suggestedDt())` from the pad to the instant the live flight
 *   reached — the loop every headless test, the fleet fingerprints and the
 *   lesson recordings use;
 * - *the headless recording*: a `FlightRecorder` taken to that instant in one
 *   call, with no frames, no wall clock and no step cap.
 * The live flight is an `InlineSession` driven as the app drives it — frames of
 * random length at random warps, `recordNow` each frame, pauses, frames cut
 * short by the wall-clock budget or the step cap, fast-forwards — and it must
 * equal both with `toEqual`: bit for bit (numbers compare with `Object.is`), no
 * tolerance at all.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { FlightRecorder, type RecordingSource } from '../src/replay/recorder';
import { InlineSession, WorkerSession, type SessionWorker } from '../src/session/session';
import { SimCore } from '../src/session/core';
import type { FromCore, ToCore } from '../src/session/protocol';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { siteById } from '../src/data/sites';
import { launchWindows } from '../src/physics/mission';
import type { MissionConfig } from '../src/types';
import { BUILTIN_LESSONS } from '../src/lessons/catalog';
import { lessonConfig } from '../src/lessons/config';
import { gradeLesson, gradeShown } from '../src/lessons/grader';

const LAUNCH = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));

/** A fleet mission as the fleet flies it (tests/fleet-harness.ts `flyCase`), point-mass. */
function mission(vehicleId: string, satelliteId: string, siteId: string, orbitId: string): MissionConfig {
  const orbit = orbitById(orbitId);
  const window = orbit.raanMode === 'free' ? undefined : launchWindows(orbit, siteById(siteId), LAUNCH, 1)[0];
  return {
    vehicleId, satelliteId, siteId, orbit, launchTime: window?.time ?? LAUNCH,
    guidance: guidanceForVehicle(vehicleById(vehicleId), DEFAULT_GUIDANCE), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
  };
}

/** Deterministic frames: a small LCG, so a failure names its seed. */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

const WARPS = [1, 2, 5, 10, 50, 100, 1000];

interface Driver {
  /** One animation frame; false once the flight has reached `until`. */
  frame(): boolean;
}

/**
 * The app's frame loop (src/main.ts `frame`) over a session: a frame of 4–67 ms
 * at the current warp, then `recordNow` for the picture. Now and then the warp
 * changes, the app pauses for a few frames, a frame runs out of its wall-clock
 * budget (an already-passed deadline stops the step loop after 32 steps) or
 * hits a small step cap. `stopAt`, when given, is a mission time the frame
 * that would pass it stops at, as a user pausing there would.
 */
function driver(session: InlineSession, until: number, seed: number, stopAt = Infinity): Driver {
  const r = random(seed);
  let warp = 1, paused = 0;
  return {
    frame(): boolean {
      if (session.recorder.clock >= until || session.sim.isFailed()) return false;
      if (r() < 0.01) warp = WARPS[Math.floor(r() * WARPS.length)];
      if (paused > 0) paused--;
      else if (r() < 0.003) paused = 1 + Math.floor(r() * 20);
      else {
        const clock = session.recorder.clock;
        let seconds = (1 / 240 + r() * (1 / 15 - 1 / 240)) * warp;
        if (clock < stopAt && clock + seconds > stopAt) seconds = stopAt - clock;
        const roll = r();
        if (roll < 0.02) session.advance(seconds, -1e9);
        else if (roll < 0.04) session.recorder.advance(seconds, 1 + Math.floor(r() * 4));
        else session.advance(seconds, 1e9);
      }
      session.recorder.recordNow();
      return true;
    },
  };
}

/**
 * Everything a recording and its simulation expose, as plain data. The whole
 * simulation state; for the worker's main-thread shell, whose state is rebuilt
 * from a frame, the fields a frame carries of it (as tests/session.test.ts).
 */
function recording(sim: Simulation, rec: RecordingSource, shell = false) {
  const s = sim.state;
  return structuredClone({
    frames: rec.frames, events: rec.events, stats: { ...rec.stats(), rotationWindows: undefined },
    telemetry: sim.telemetry, simEvents: sim.events, plan: sim.plan,
    state: shell ? { t: s.t, status: s.status, elements: s.elements, nextBurnTime: s.nextBurnTime, r: s.r, v: s.v, mass: s.mass } : s,
  });
}

/** The headless flight and the headless recording of `cfg`, to the step boundary `t`. */
function headless(cfg: MissionConfig, t: number) {
  const sim = new Simulation(cfg, { headless: true });
  while (sim.state.t < t) sim.step(sim.suggestedDt());
  const recorded = new Simulation(cfg, { headless: true });
  const rec = new FlightRecorder();
  rec.start(recorded);
  rec.advance(t - rec.clock, Infinity);
  return { sim, recorded, rec };
}

/** Take the picture up to the simulation (at most one step), as the next frames would. */
function settle(session: InlineSession): void {
  session.advance(session.sim.state.t - session.recorder.clock, 1e9);
  expect(session.recorder.clock).toBe(session.sim.state.t);
}

const MISSIONS: Array<[string, MissionConfig, number]> = [
  ['Falcon 9, ISS orbit', mission('falcon9', 'starlink', 'cape', 'iss'), 2400],
  ['Electron, LEO with Curie burns', mission('electron', 'cubesats', 'mahia', 'leo'), 4500],
  ['H3, sun-synchronous with a parking orbit', mission('h3', 'earthObs', 'tanegashima', 'sso'), 3600],
  ['Ariane 64, GTO', mission('ariane64', 'comsat', 'kourou', 'gto'), 7200],
];

describe('live point-mass stepping (T02)', () => {
  for (const [name, cfg, until] of MISSIONS) {
    it(`flies ${name} live exactly as headless, whatever the frames`, () => {
      for (const seed of [11, 29]) {
        const live = new InlineSession(cfg);
        const drive = driver(live, until, seed);
        let frames = 0;
        while (drive.frame()) frames++;
        settle(live);
        expect(frames).toBeGreaterThan(200);
        const t = live.sim.state.t;
        const ref = headless(cfg, t);
        expect(ref.sim.state.t).toBe(t);
        expect(ref.rec.clock).toBe(t);
        const want = recording(ref.recorded, ref.rec);
        // the headless recording's simulation is the headless flight …
        expect(want.telemetry).toEqual(structuredClone(ref.sim.telemetry));
        expect(want.state).toEqual(structuredClone(ref.sim.state));
        expect(want.simEvents).toEqual(structuredClone(ref.sim.events));
        // … and so is the live one, recording and all
        expect(recording(live.sim, live.recorder)).toEqual(want);
      }
    }, 120_000);
  }

  it('shows the live instant asked for, and nothing of the step flown ahead of it', () => {
    const cfg = MISSIONS[0][1];
    const session = new InlineSession(cfg);
    const r = random(7);
    let clock = session.recorder.clock, warp = 1, aheadSeen = 0;
    while (clock < 1500) {
      if (r() < 0.02) warp = WARPS[Math.floor(r() * WARPS.length)];
      const seconds = (1 / 240 + r() * (1 / 15 - 1 / 240)) * warp;
      session.advance(seconds, 1e9);
      clock += seconds;
      const shown = session.recorder.recordNow();
      const sim = session.sim, rec = session.recorder;
      // the picture is at exactly the time asked for — the clock never waits for a step
      expect(rec.clock).toBe(clock);
      expect(shown.t).toBe(clock);
      // the flight is at most one step ahead of it (a 30 s orbit step is the longest here)
      expect(sim.state.t).toBeGreaterThanOrEqual(clock - 1e-9);
      expect(sim.state.t - clock).toBeLessThan(60);
      if (sim.state.t > clock + 1e-9) aheadSeen++;
      // and the recording ends at the picture
      expect(rec.headTime).toBeLessThanOrEqual(clock + 1e-9);
      for (const e of rec.events) expect(e.t).toBeLessThanOrEqual(clock + 1e-9);
      if (sim.events.some((e) => e.t > clock + 1e-9)) expect(rec.events.length).toBeLessThan(sim.events.length);
    }
    expect(aheadSeen).toBeGreaterThan(100);
  }, 120_000);

  it('takes a command at a fixed mission time and re-flies it exactly from its journal', () => {
    // A crewed Soyuz, point-mass, aborted by hand at T+60 s: the escape system
    // fires and the crew come down under the main parachute (G06).
    const cfg = mission('soyuz21a', 'crew', 'baikonur', 'iss');
    const COMMAND_AT = 60;
    const journals: number[] = [];
    const flights = [5, 17].map((seed) => {
      const session = new InlineSession(cfg);
      const drive = driver(session, 1200, seed, COMMAND_AT);
      let commanded = false;
      while (drive.frame()) {
        if (!commanded && session.recorder.clock >= COMMAND_AT - 1e-9) {
          const before = session.sim.state.t;
          session.commandAbort();
          commanded = true;
          // The command is taken at the simulation's clock — the step boundary
          // at or after the picture — and the picture moves on to it: that time
          // is what a journal records.
          expect(session.sim.state.t).toBe(before);
          expect(session.recorder.clock).toBe(before);
          journals.push(before);
          session.recorder.recordNow();
        }
        if (session.sim.state.status === 'landed') break;
      }
      settle(session);
      expect(commanded).toBe(true);
      return session;
    });
    for (const t of journals) {
      // the step boundary at or after the time asked for: an ascent step is 0.1 s below 100 km
      expect(t).toBeGreaterThanOrEqual(COMMAND_AT - 1e-9);
      expect(t - COMMAND_AT).toBeLessThanOrEqual(0.1 + 1e-9);
    }
    // the same boundary whatever the frames that led there
    expect(journals[1]).toBe(journals[0]);
    for (const [k, live] of flights.entries()) {
      expect(live.sim.events.some((e) => e.key === 'evt.abortCommand')).toBe(true);
      const end = live.sim.state.t;
      // the re-fly: headless to the journal's time, the command, headless on
      const sim = new Simulation(cfg, { headless: true });
      const rec = new FlightRecorder();
      rec.start(sim);
      rec.advance(journals[k] - rec.clock, Infinity);
      expect(sim.state.t).toBe(journals[k]);
      expect(sim.commandAbort()).toBe(true);
      rec.captureChangedState();
      rec.advance(end - rec.clock, Infinity);
      expect(sim.state.t).toBe(end);
      expect(recording(live.sim, live.recorder)).toEqual(recording(sim, rec));
      // and the bare step loop flies the same
      const bare = new Simulation(cfg, { headless: true });
      while (bare.state.t < journals[k]) bare.step(bare.suggestedDt());
      bare.commandAbort();
      while (bare.state.t < end) bare.step(bare.suggestedDt());
      expect(structuredClone({ telemetry: bare.telemetry, events: bare.events, state: bare.state }))
        .toEqual(structuredClone({ telemetry: live.sim.telemetry, events: live.sim.events, state: live.sim.state }));
    }
  }, 120_000);

  it('fast-forwards to the same flight however the wall clock cuts the chunks', () => {
    const cfg = MISSIONS[1][1];
    // on the main thread: `tick` runs chunks against the real clock
    const inline = new InlineSession(cfg);
    for (const target of [0, 700, 2500, 4000]) {
      inline.fastForward(target);
      while (inline.fastForwarding) { inline.tick(); inline.recorder.recordNow(); }
      expect(Math.abs(inline.recorder.clock - target)).toBeLessThan(1e-3);
    }
    settle(inline);
    // in the worker: a clock that jumps at random between calls cuts the chunks elsewhere
    const r = random(3);
    let now = 0;
    const worker = new InProcessWorker(() => (now += r() * 12));
    const remote = new WorkerSession(cfg, worker, 1, (m) => { throw new Error(m); });
    worker.flush();
    for (const target of [0, 700, 2500, 4000]) {
      remote.fastForward(target);
      worker.flush();
      expect(remote.fastForwarding).toBe(false);
    }
    const core = worker.core as unknown as { sim: Simulation; recorder: FlightRecorder };
    // bring both pictures up to their simulations, which are at the same step boundary
    expect(core.sim.state.t).toBe(inline.sim.state.t);
    remote.advance(core.sim.state.t - core.recorder.clock, 1e9);
    worker.flush();
    const ref = headless(cfg, inline.sim.state.t);
    const want = recording(ref.recorded, ref.rec);
    expect(recording(inline.sim, inline.recorder)).toEqual(want);
    expect(recording(core.sim, core.recorder)).toEqual(want);
    // the main thread's mirror of the worker's recording, and its shell's state
    expect(recording(remote.sim, remote.recorder, true)).toEqual(recording(ref.recorded, ref.rec, true));
  }, 120_000);

  it('mirrors a live flight in the worker, a step ahead of the picture included', () => {
    const cfg = MISSIONS[0][1];
    const inline = new InlineSession(cfg);
    const worker = new InProcessWorker();
    const remote = new WorkerSession(cfg, worker, 1, (m) => { throw new Error(m); });
    worker.flush();
    const r = random(41);
    let ahead = 0;
    for (let i = 0; i < 3000; i++) {
      const seconds = (1 / 240 + r() * (1 / 15 - 1 / 240)) * (i < 1500 ? 1 : 20);
      inline.advance(seconds, 1e9);
      remote.advance(seconds, 1e9);
      worker.flush();
      const a = inline.recorder.recordNow(), b = remote.recorder.recordNow();
      expect(b).toEqual(a);
      if (inline.sim.state.t > a.t + 1e-9) {
        ahead++;
        // the shell's clock and state are the simulation's, as the inline one's are
        expect(remote.sim.state.t).toBe(inline.sim.state.t);
        expect(remote.recorder.events).toEqual(inline.recorder.events);
      }
    }
    expect(ahead).toBeGreaterThan(100);
    expect(recording(remote.sim, remote.recorder, true)).toEqual(recording(inline.sim, inline.recorder, true));
  }, 120_000);
});

describe('a lesson graded live (T02)', () => {
  it('grades a docking only once the picture and the log have reached it', () => {
    // Lesson 5.2 flown as a student passes it: the two-orbit profile, to docking. The
    // docking is the end of a 5 s step while the hooks close, so the simulation holds
    // the lesson's end event a few seconds before the picture gets there.
    const lesson = BUILTIN_LESSONS.find((l) => l.id === 'adv-docking')!;
    const cfg = lessonConfig(lesson.mission, (s) => { s.rendezvous = { profile: 'twoOrbit', port: 'rassvet' }; });
    const session = new InlineSession(cfg);
    const r = random(53);
    let held = 0, shownFinal = false;
    while (!shownFinal && session.recorder.clock < 20_000) {
      const rv = session.recorder.recordNow().rendezvous;
      // quickly to the final approach, then 1–10× at 30–144 frames a second
      const warp = rv && (rv.phase === 'final' || rv.phase === 'capture') ? 1 + Math.floor(r() * 10) : 500;
      session.advance((1 / 144 + r() * (1 / 30 - 1 / 144)) * warp, 1e9);
      session.recorder.recordNow();
      const sim = session.sim, clock = session.recorder.clock;
      const docked = session.recorder.events.some((e) => e.key === 'evt.docked');
      const grade = gradeShown(lesson, sim, clock);
      shownFinal = grade.final;
      // final, and the "Docked to the station" criterion passed, exactly when the
      // event log on screen shows the docking
      expect(shownFinal).toBe(docked);
      expect(grade.criteria.find((c) => c.id === 'docked')!.state).toBe(docked ? 'pass' : 'pending');
      if (gradeLesson(lesson, sim).final && !shownFinal) held++;
    }
    expect(shownFinal).toBe(true);
    // the simulation had docked while the picture had not: the case the wait is for
    expect(held).toBeGreaterThan(0);
    expect(gradeShown(lesson, session.sim, session.recorder.clock)).toEqual(gradeLesson(lesson, session.sim));
  }, 120_000);
});

/** A `SimCore` behind a transport that clones like `postMessage` (as tests/session.test.ts). */
class InProcessWorker implements SessionWorker {
  onmessage: ((event: MessageEvent<FromCore>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
  private readonly replies: FromCore[] = [];
  private readonly continuations: Array<() => void> = [];
  readonly core: SimCore;
  constructor(now = () => performance.now()) {
    this.core = new SimCore({
      post: (message) => this.replies.push(structuredClone(message)),
      later: (fn) => this.continuations.push(fn),
      now,
    });
  }
  postMessage(message: ToCore): void {
    this.core.handle(structuredClone(message));
  }
  flush(): void {
    while (this.replies.length > 0 || this.continuations.length > 0) {
      while (this.replies.length > 0) this.onmessage?.({ data: this.replies.shift()! } as MessageEvent<FromCore>);
      this.continuations.shift()?.();
    }
  }
  terminate(): void {}
}
