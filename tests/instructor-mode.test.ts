/**
 * Instructor mode (roadmap T01/T02, Phase 4 map §4.1–4.2), the parts that are
 * not the re-check itself (tests/recheck.test.ts): a lesson on a rocket or a
 * satellite of the class's own, the command journal a flight keeps, and what
 * a lesson's record now carries.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { BUILTIN_CASE_LESSONS, BUILTIN_LESSONS } from '../src/lessons/catalog';
import { lessonConfig, missionConfigFromState, missionStateOf, defaultMissionState } from '../src/lessons/config';
import { brokenLocks, flightEnded, gradeShown } from '../src/lessons/grader';
import { flightRecord, flownMission, missingFields, RECHECK_FIELDS, type LessonRecord } from '../src/lessons/progress';
import { missionDocument, parseMissionDocument } from '../src/config/mission-file';
import { guidanceForVehicle } from '../src/physics/defaults';
import type { Lesson } from '../src/lessons/types';
import { LESSON_FORMAT_VERSION, lessonFileText, lessonFileVersion, parseLessonFile } from '../src/lessons/lesson-file';
import { copyOf } from './custom-vehicle-harness';
import { satelliteCopyOf } from './custom-satellite-harness';
import { InlineSession, WorkerSession, type SessionWorker } from '../src/session/session';
import { SimCore } from '../src/session/core';
import type { FromCore, ToCore } from '../src/session/protocol';
import { applyAction, readActions, type FlightAction } from '../src/physics/sim/actions';
import { appBuildId } from '../src/build-info';
import type { MissionConfig } from '../src/types';

const lesson = (id: string): Lesson => {
  const l = BUILTIN_LESSONS.find((x) => x.id === id);
  if (!l) throw new Error(`no lesson ${id}`);
  return l;
};

/** Lesson 1.1 flown on a copy of its Falcon 9 under an id of its own, the guidance locked too. */
function customLesson(): Lesson {
  const base = lesson('orbit-first');
  const state = missionStateOf(base.mission);
  state.vehicleSpec = copyOf(state.vehicleId);
  state.vehicleId = state.vehicleSpec.id;
  return { ...base, id: 'custom-first', mission: missionDocument(state), locked: [...base.locked, 'setup.guidance'] };
}

/** Lesson 1.1 with a copy of its CubeSats under an id of their own (D06's inline satellite, C2). */
function customSatelliteLesson(): Lesson {
  const base = lesson('orbit-first');
  const state = missionStateOf(base.mission);
  state.satelliteSpec = satelliteCopyOf(state.satelliteId);
  state.satelliteId = state.satelliteSpec.id;
  return { ...base, id: 'custom-sat-first', mission: missionDocument(state) };
}

describe('a lesson on a rocket of the class\'s own (T01, map §4.1)', () => {
  it('builds the configuration the setup panel builds, the custom vehicle kept, and flies it as the catalogue rocket', () => {
    const custom = customLesson();
    const cfg = lessonConfig(custom.mission);
    expect(cfg.vehicleId).toBe('falcon9-copy');
    expect(cfg.vehicleSpec).toEqual(copyOf('falcon9'));
    // the guidance is the custom vehicle's own programme, as `SetupPanel.guidance` resolves it
    expect(cfg.guidance).toEqual(guidanceForVehicle(copyOf('falcon9'), undefined, 'pointMass'));
    // a copy of a catalogue rocket flies that rocket's flight (S02), so the lesson's flight is lesson 1.1's
    const fly = (c: typeof cfg) => {
      const sim = new Simulation(c, { headless: true });
      while (!flightEnded(custom, sim) && sim.state.t < 4000) sim.step(sim.suggestedDt());
      return structuredClone({ t: sim.state.t, elements: sim.state.elements, events: sim.events.map((e) => [e.t, e.key]) });
    };
    expect(fly(cfg)).toEqual(fly(lessonConfig(lesson('orbit-first').mission)));
  }, 60_000);

  it('holds the guidance lock to the lesson\'s own vehicle instead of throwing for it', () => {
    const custom = customLesson();
    const kept = new Simulation(lessonConfig(custom.mission), { headless: true });
    expect(brokenLocks(custom, kept)).toEqual([]);
    const edited = new Simulation(lessonConfig(custom.mission, (s) => { s.guidanceOverrides = { ...s.guidanceOverrides, kickAngle: 3.1 }; }), { headless: true });
    expect(brokenLocks(custom, edited)).toEqual(['setup.guidance']);
  });

  it('reads the mission as flown back to the same configuration, custom vehicle and all (audit A11)', () => {
    const cfg = new Simulation(lessonConfig(customLesson().mission), { headless: true }).cfg;
    const doc = JSON.parse(JSON.stringify(flownMission(cfg)));
    expect(doc.mission.vehicleSpec).toEqual(copyOf('falcon9'));
    const parsed = parseMissionDocument(doc, defaultMissionState());
    expect(parsed.issues).toEqual([]);
    expect(missionConfigFromState(parsed.state)).toEqual(cfg);
  });
});

describe('a lesson on a satellite of the class\'s own (T01 with D06\'s inline satellite)', () => {
  it('keeps the satellite spec with the rocket\'s, and flies it as the catalogue satellite', () => {
    const custom = customSatelliteLesson();
    const cfg = lessonConfig(custom.mission);
    expect(cfg.satelliteId).toBe('cubesats-copy');
    expect(cfg.satelliteSpec).toEqual(satelliteCopyOf('cubesats'));
    expect(cfg.vehicleSpec).toBeUndefined();
    const fly = (c: typeof cfg) => {
      const sim = new Simulation(c, { headless: true });
      while (!flightEnded(custom, sim) && sim.state.t < 4000) sim.step(sim.suggestedDt());
      return structuredClone({ t: sim.state.t, elements: sim.state.elements, events: sim.events.map((e) => [e.t, e.key]) });
    };
    expect(fly(cfg)).toEqual(fly(lessonConfig(lesson('orbit-first').mission)));
    // both specs at once, as a class's rocket carrying a class's satellite
    const both = lessonConfig(customLesson().mission, (s) => { s.satelliteSpec = satelliteCopyOf('cubesats'); s.satelliteId = 'cubesats-copy'; });
    expect(both.vehicleSpec?.id).toBe('falcon9-copy');
    expect(both.satelliteSpec?.id).toBe('cubesats-copy');
  }, 60_000);

  it('refuses a mission whose satellite id is not its spec\'s where it is read, not at launch', () => {
    const state = missionStateOf(customSatelliteLesson().mission);
    state.satelliteId = 'cubesats';
    expect(() => missionConfigFromState(state)).toThrow(/not its custom satellite/);
  });

  it('holds the vehicle lock to the custom rocket\'s spec, not only its id', () => {
    const custom = { ...customLesson(), locked: ['setup.vehicle' as const] };
    const kept = new Simulation(lessonConfig(custom.mission), { headless: true });
    expect(brokenLocks(custom, kept)).toEqual([]);
    // the same id, another rocket: a file could keep the id and change the design
    const edited = new Simulation(lessonConfig(custom.mission, (s) => { s.vehicleSpec = copyOf('falcon9', { name: 'Heavier' }); }), { headless: true });
    expect(brokenLocks(custom, edited)).toEqual(['setup.vehicle']);
  });
});

describe('the lesson file a custom rocket or satellite is written in (T01; C2\'s open question)', () => {
  const caseLesson = () => BUILTIN_CASE_LESSONS[0];

  it('is the lowest version whose every reader flies each lesson', () => {
    expect(LESSON_FORMAT_VERSION).toBe(3);
    expect(lessonFileVersion([lesson('orbit-first')])).toBe(1);
    expect(lessonFileVersion([])).toBe(1);
    // a custom rocket (mission v2, S02): every reader of version 2 flies it
    expect(lessonFileVersion([lesson('orbit-first'), customLesson()])).toBe(2);
    expect(lessonFileVersion([caseLesson(), customLesson()])).toBe(2);
    // a custom satellite (mission v3, D06): a reader older than D06 cannot
    expect(lessonFileVersion([lesson('orbit-first'), customSatelliteLesson()])).toBe(3);
    expect(lessonFileVersion([caseLesson(), customSatelliteLesson(), customLesson()])).toBe(3);
  });

  it('reads a version-3 file back to the same lessons and writes it again byte for byte', () => {
    const text = lessonFileText([customSatelliteLesson(), customLesson()]);
    const doc = JSON.parse(text);
    expect(doc.version).toBe(3);
    expect(doc.lessons[0].mission.version).toBe(3);
    expect(doc.lessons[1].mission.version).toBe(2);
    const parsed = parseLessonFile(doc, new Set());
    expect(parsed.issues).toEqual([]);
    expect(parsed.lessons.map((l) => l.id)).toEqual(['custom-sat-first', 'custom-first']);
    expect(lessonFileText(parsed.lessons)).toBe(text);
    // and the lesson flies its own satellite
    expect(lessonConfig((parsed.lessons[0] as Lesson).mission).satelliteSpec).toEqual(satelliteCopyOf('cubesats'));
  });
});

/** The physics worker's core in this thread, its replies structured-cloned as `postMessage` would (tests/live-stepping.test.ts). */
class InProcessWorker implements SessionWorker {
  onmessage: ((event: MessageEvent<FromCore>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
  private readonly replies: FromCore[] = [];
  private readonly continuations: Array<() => void> = [];
  readonly core = new SimCore({ post: (m) => this.replies.push(structuredClone(m)), later: (fn) => this.continuations.push(fn), now: () => performance.now() });
  postMessage(message: ToCore): void { this.core.handle(structuredClone(message)); }
  flush(): void {
    while (this.replies.length > 0 || this.continuations.length > 0) {
      while (this.replies.length > 0) this.onmessage?.({ data: this.replies.shift()! } as MessageEvent<FromCore>);
      this.continuations.shift()?.();
    }
  }
  terminate(): void {}
}

/** Lesson 3.3's crewed Soyuz without its scripted abort: the student presses Abort. */
function crewedSoyuz(): MissionConfig {
  return lessonConfig(lesson('fail-abort').mission, (s) => { s.failure = { ...s.failure, mode: 'none' }; });
}

describe('the command journal (T02, map §4.2)', () => {
  it('keeps an abort by hand at the step boundary that took it, and not the mission\'s own scripted abort', () => {
    const session = new InlineSession(crewedSoyuz());
    while (session.recorder.clock < 60) { session.advance(1 / 30, 1e9); session.recorder.recordNow(); }
    const t = session.sim.state.t;
    session.commandAbort();
    expect(session.sim.actions).toEqual([{ t, kind: 'commandAbort' }]);
    // a second press has no escape left to fire: nothing to replay
    session.commandAbort();
    expect(session.sim.actions.length).toBe(1);
    // lesson 3.3's abort is the mission's failure: the mission document already says it
    const scripted = new Simulation(lessonConfig(lesson('fail-abort').mission), { headless: true });
    while (scripted.state.t < 90) scripted.step(scripted.suggestedDt());
    expect(scripted.events.some((e) => e.key === 'evt.abortCommand')).toBe(true);
    expect(scripted.actions).toEqual([]);
  });

  it('brings the worker\'s journal to the main thread\'s copy of the flight', () => {
    const cfg = crewedSoyuz();
    const worker = new InProcessWorker();
    const remote = new WorkerSession(cfg, worker, 1, (m) => { throw new Error(m); });
    worker.flush();
    while (remote.recorder.clock < 45) { remote.advance(1 / 20, 1e9); worker.flush(); }
    remote.commandAbort();
    worker.flush();
    const core = worker.core as unknown as { sim: Simulation };
    expect(core.sim.actions.length).toBe(1);
    expect(remote.sim.actions).toEqual(core.sim.actions);
    // taken at the worker's clock, a step boundary at or after the picture's
    expect(remote.sim.actions[0].t).toBeGreaterThanOrEqual(45 - 1e-9);
    expect(remote.sim.actions[0].t - 45).toBeLessThan(0.3);
  });

  it('keeps a six-DOF control command as accepted, once per change, and replays it', () => {
    const cfg = lessonConfig(lesson('orbit-first').mission, (s) => { s.dynamics = { model: 'sixDof', wind: 'calm', seed: 20260919 }; });
    const sim = new Simulation(cfg, { headless: true });
    while (sim.state.t < 5) sim.step(sim.suggestedDt());
    const command = { mode: 'manual' as const, rates: { x: 0, y: 0.01, z: 0 }, throttle: 0.9 };
    sim.setRigidCommand(command);
    sim.setRigidCommand({ ...command, rates: { ...command.rates } }); // the same again: nothing changed
    expect(() => sim.setRigidCommand({ ...command, throttle: 2 })).toThrow(RangeError);
    expect(sim.actions).toEqual([{ t: sim.state.t, kind: 'setRigidCommand', command }]);
    // given again to a flight at the same boundary, it is taken the same way
    const again = new Simulation(cfg, { headless: true });
    while (again.state.t < sim.actions[0].t) again.step(again.suggestedDt());
    applyAction(again, sim.actions[0]);
    expect(again.actions).toEqual(sim.actions);
    // a point-mass flight has no attitude to command: nothing is taken, nothing kept
    const pm = new Simulation(lessonConfig(lesson('orbit-first').mission), { headless: true });
    pm.setRigidCommand(command);
    expect(pm.actions).toEqual([]);
  }, 60_000);

  it('reads a journal from a file only when every entry is one this build can give', () => {
    const good: FlightAction[] = [{ t: 1, kind: 'commandAbort' }, { t: 2, kind: 'commandToru', cmd: null },
      { t: 2, kind: 'setRigidCommand', command: { mode: 'auto', rates: { x: 0, y: 0, z: 0 }, throttle: 1 } }];
    expect(readActions(JSON.parse(JSON.stringify(good)))).toEqual(good);
    expect(readActions([])).toEqual([]);
    for (const bad of [null, {}, [{ t: 1, kind: 'selfDestruct' }], [{ t: 'soon', kind: 'commandAbort' }], [{ t: 2, kind: 'commandAbort' }, { t: 1, kind: 'commandAbort' }],
      [{ t: 1, kind: 'setRigidCommand' }], [{ t: 1, kind: 'injectControlFault', spec: {}, fdir: 'yes' }], [{ t: Infinity, kind: 'commandAbort' }]]) {
      expect(readActions(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe('what a lesson\'s record keeps for the re-check (T02, owner decision 3)', () => {
  it('keeps the grading time, the instant on screen, the journal up to the grade and the build', () => {
    const l = lesson('orbit-first');
    const session = new InlineSession(lessonConfig(l.mission));
    let grade = gradeShown(l, session.sim, session.recorder.clock);
    while (!grade.final) {
      session.advance(0.05 * 200, 1e9);
      session.recorder.recordNow();
      grade = gradeShown(l, session.sim, session.recorder.clock);
    }
    const clock = session.recorder.clock;
    const record = flightRecord({ at: new Date(Date.UTC(2026, 8, 30)), grade, answers: { period: 94.6 }, hintsShown: 1, cfg: session.sim.cfg,
      clock, actions: session.sim.actions, app: appBuildId() });
    expect(record.t).toBe(session.sim.state.t);
    expect(record.clock).toBe(clock);
    expect(record.t! - record.clock!).toBeGreaterThanOrEqual(0);
    expect(record.actions).toEqual([]);
    expect(record.app).toBe(appBuildId());
    expect(record.mission?.mission.vehicleId).toBe('falcon9');
    expect(missingFields(record)).toEqual([]);
    // it survives the results file's JSON exactly: the re-check flies to this very boundary
    const back = JSON.parse(JSON.stringify(record)) as LessonRecord;
    expect(back.t).toBe(record.t);
    expect(back.clock).toBe(record.clock);
  }, 60_000);

  it('says which fields a record made before T02 lacks', () => {
    const old: LessonRecord = { at: '2026-09-20T10:00:00.000Z', verdict: 'pass', criteria: [], answers: {}, hintsShown: 0, mission: lesson('orbit-first').mission };
    expect(missingFields(old)).toEqual(['t', 'clock', 'actions', 'app']);
    expect(missingFields({ ...old, mission: undefined })).toEqual([...RECHECK_FIELDS]);
    // the build is package.json's version and the commit, from vite.config.ts's define; the tests run under that config
    expect(appBuildId()).toMatch(/^\d+\.\d+\.\d+\+([0-9a-f]{7,}|dev)$/);
    expect(appBuildId({ version: '1.2.3', commit: 'abc1234' })).toBe('1.2.3+abc1234');
  });
});

describe('a journal flies the flight again (T02): the TORU hand controllers on lesson 5.2', () => {
  it('keeps each TORU command at the step boundary that took it, and a re-fly giving them there docks at the same instant', () => {
    const l = lesson('adv-docking');
    const cfg = lessonConfig(l.mission);
    const sim = new Simulation(cfg, { headless: true });
    const flyUntil = (s: Simulation, until: (s: Simulation) => boolean) => { while (!until(s) && s.state.t < 60 * 3600) s.step(s.suggestedDt()); };
    flyUntil(sim, (s) => s.state.rendezvous?.phase === 'stationkeeping');
    const settled = sim.state.t + 90;
    flyUntil(sim, (s) => s.state.t > settled);
    // a roll at 0.5 °/s, then the approach handed back to Kurs, which flies it in again
    const roll = { translate: { x: 0, y: 0, z: 0 }, rotate: { x: 0.5 * Math.PI / 180, y: 0, z: 0 } };
    expect(sim.commandToru(roll)).toBe(true);
    const t1 = sim.state.t;
    flyUntil(sim, (s) => s.state.t > t1 + 40);
    expect(sim.commandToru(null)).toBe(true);
    const t2 = sim.state.t;
    flyUntil(sim, (s) => flightEnded(l, s));
    expect(sim.actions).toEqual([{ t: t1, kind: 'commandToru', cmd: roll }, { t: t2, kind: 'commandToru', cmd: null }]);
    expect(sim.events.some((e) => e.key === 'evt.toruOn')).toBe(true);
    expect(sim.events.some((e) => e.key === 'evt.docked')).toBe(true);
    // the journal alone, given at its times to a fresh flight of the same mission
    const again = new Simulation(cfg, { headless: true });
    let next = 0;
    for (;;) {
      while (next < sim.actions.length && sim.actions[next].t <= again.state.t + 1e-9) applyAction(again, sim.actions[next++]);
      if (again.state.t >= sim.state.t) break;
      again.step(again.suggestedDt());
    }
    expect(again.actions).toEqual(sim.actions);
    expect(again.events).toEqual(sim.events);
    expect(again.state).toEqual(sim.state);
  }, 120_000);
});
