/**
 * Lessons of tracks 2, 4 and 5 (roadmap E03, round 2): each point-mass
 * lesson's worked solution passes and its wrong flights fail; each six-DOF
 * lesson's wrong flight fails here, its solution in
 * tests/heavy/lessons-sixdof.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { BUILTIN_LESSONS } from '../src/lessons/catalog';
import { defaultMissionState, lessonConfig, missionConfigFromState } from '../src/lessons/config';
import { flightEnded, gradeLesson, type LessonAnswers } from '../src/lessons/grader';
import { GRADED_STEP, MEASURES } from '../src/lessons/measures';
import type { AttitudeTestRecord } from '../src/physics/rigid/attitude-test';
import { parseMissionDocument, type MissionState } from '../src/config/mission-file';
import { emptyProgress, flownMission, loadProgress, recordGrade, saveProgress } from '../src/lessons/progress';
import type { Lesson, LessonFlight } from '../src/lessons/types';

const lesson = (id: string): Lesson => BUILTIN_LESSONS.find((x) => x.id === id)!;

/** Fly a lesson's mission, with the student's edits, until it ends for grading (or `stop` says so). */
export function fly(l: Lesson, edit?: (s: MissionState) => void, limit = 20000, stop?: (sim: Simulation) => boolean): Simulation {
  const sim = new Simulation(lessonConfig(l.mission, edit), { headless: true });
  let guard = 0;
  while (!flightEnded(l, sim) && !sim.done && sim.state.t < limit && !stop?.(sim) && guard++ < 5_000_000) sim.step(sim.suggestedDt());
  return sim;
}

const exact = (l: Lesson, f: LessonFlight): LessonAnswers =>
  Object.fromEntries(l.criteria.flatMap((c) => (c.kind === 'answer' ? [[c.id, MEASURES[c.measure].read(f)!]] : [])));
const log = (sim: Simulation): string => sim.events.map((e) => `${e.t.toFixed(0)} ${e.key} ${JSON.stringify(e.params ?? {})}`).join('\n');
const graded = (l: Lesson, sim: Simulation, answers?: LessonAnswers) => {
  const g = gradeLesson(l, sim, answers ?? exact(l, sim));
  return { verdict: g.verdict, detail: JSON.stringify(g) + '\n' + log(sim) };
};
/**
 * Audit 2026-09-27 A11: the flight's record, kept in storage and read back as
 * a mission document, flies the configuration that was flown.
 */
function expectRecordedAsFlown(l: Lesson, sim: Simulation): void {
  const data = new Map<string, string>();
  const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
  const progress = emptyProgress();
  const g = gradeLesson(l, sim, exact(l, sim));
  recordGrade(progress, { lessonId: l.id, at: 'now', verdict: g.verdict, criteria: g.criteria, answers: {}, hintsShown: 0, mission: flownMission(sim.cfg) });
  expect(saveProgress(progress, store)).toBe(true);
  const doc = loadProgress(store).lessons[l.id].last!.mission;
  const parsed = parseMissionDocument(doc, defaultMissionState());
  expect(parsed.issues).toEqual([]);
  expect(missionConfigFromState(parsed.state)).toEqual(sim.cfg);
}

/** A six-DOF wrong flight stops as soon as its grade has failed. */
const failed = (l: Lesson) => (sim: Simulation) => gradeLesson(l, sim).verdict === 'fail';

describe('track 2, guidance and navigation', () => {
  it('2.1 aerodynamic loads: an acceleration limit of 18 m/s² keeps q under 25 kPa; the vehicle as it is, and a limit too low, fail', { timeout: 120_000 }, () => {
    const l = lesson('guid-maxq');
    const solved = fly(l, (s) => { s.guidanceOverrides = { maxAccel: 18 }; });
    expect(MEASURES.maxQ.read(solved)).toBeLessThan(25);
    expect(graded(l, solved).verdict, graded(l, solved).detail).toBe('pass');
    // the acceleration limit the student set goes into the results (audit 2026-09-27 A11)
    expect(solved.cfg.guidance.maxAccel).toBe(18);
    expectRecordedAsFlown(l, solved);
    // flown as it is, about 34 kPa
    const asIs = fly(l);
    expect(MEASURES.maxQ.read(asIs)).toBeGreaterThan(30);
    expect(gradeLesson(l, asIs).verdict).toBe('fail');
    // too gentle: still low and slow in dense air when it gets fast, and the load comes back
    const timid = fly(l, (s) => { s.guidanceOverrides = { maxAccel: 15 }; });
    expect(timid.events.some((e) => e.key === 'evt.structuralFailure'), log(timid)).toBe(true);
    expect(gradeLesson(l, timid).verdict).toBe('fail');
    // a wrong reading of the peak fails
    expect(gradeLesson(l, solved, { 'q-read': MEASURES.maxQ.read(solved)! + 3 }).verdict).toBe('fail');
  });

  it('2.2 PEG and IGM: either explicit law reaches the orbit an engine short; the standard steering runs dry', { timeout: 120_000 }, () => {
    const l = lesson('guid-peg');
    for (const law of ['peg', 'igm'] as const) {
      const solved = fly(l, (s) => { s.dynamics = { ...s.dynamics!, explicitGuidance: { law } }; });
      expect(graded(l, solved).verdict, graded(l, solved).detail).toBe('pass');
    }
    const standard = fly(l);
    expect(standard.events.some((e) => e.key === 'evt.offTargetOrbit'), log(standard)).toBe(true);
    expect(gradeLesson(l, standard).verdict).toBe('fail');
  });

  it('2.3 inertial navigation: the MEMS unit alone drifts past 500 m before MECO, and the lesson fails', { timeout: 180_000 }, () => {
    const l = lesson('guid-nav');
    const sim = fly(l, undefined, 200, failed(l));
    expect(MEASURES['nav.positionError'].read(sim)!).toBeGreaterThan(500);
    expect(sim.state.t).toBeLessThan(152);
    expect(gradeLesson(l, sim).verdict).toBe('fail');
    // turning the GNSS back on is not the lesson's answer
    const gnss = lessonConfig(l.mission, (s) => { s.dynamics!.navigation = { grade: 'mems', gnss: true }; });
    expect(gradeLesson(l, { ...sim, cfg: gnss } as LessonFlight).criteria.find((c) => c.id === 'gnss')!.state).toBe('fail');
  });
});

describe('2.4 Monte Carlo 3σ', () => {
  it('a nominal flight is not a run of the set, and the lesson fails', { timeout: 60_000 }, () => {
    const l = lesson('guid-monte-carlo');
    const sim = fly(l, undefined, 30, () => false);
    const g = gradeLesson(l, sim, {}, true);
    expect(g.criteria.find((c) => c.id === 'run')!.state).toBe('fail');
    expect(g.verdict).toBe('fail');
    // a run of another set is not the one asked for either
    const other = lessonConfig(l.mission, (s) => { s.dynamics!.dispersion = { seed: 2, run: 4 }; });
    expect(gradeLesson(l, { ...sim, cfg: other } as LessonFlight, {}, true).criteria.find((c) => c.id === 'run')!.state).toBe('fail');
    const right = lessonConfig(l.mission, (s) => { s.dynamics!.dispersion = { seed: 1, run: 4 }; });
    const graded = gradeLesson(l, { ...sim, cfg: right } as LessonFlight, {}, true).criteria.find((c) => c.id === 'run')!;
    expect(graded).toMatchObject({ state: 'pass', value: 5 });
  });
});

describe('track 4, attitude control', () => {
  it('4.1 reading the loop: numbers far from the inspector\'s fail', { timeout: 180_000 }, () => {
    const l = lesson('ctl-inspector');
    const sim = fly(l, undefined, 200);
    expect(flightEnded(l, sim)).toBe(true);
    const wc = MEASURES['loop.wcAtMaxQ'].read(sim)!, pm = MEASURES['loop.pmAtMaxQ'].read(sim)!;
    expect(wc).toBeGreaterThan(1);
    expect(pm).toBeGreaterThan(20);
    expect(gradeLesson(l, sim, { wc: wc * 1.3, pm }).verdict).toBe('fail');
    expect(gradeLesson(l, sim, { wc, pm: pm - 10 }).verdict).toBe('fail');
  });

  it('4.2 gains with margins: the fast tuning the lesson starts with has too little phase margin at max-Q', { timeout: 180_000 }, () => {
    const l = lesson('ctl-margins');
    const sim = fly(l, undefined, 200);
    expect(MEASURES['loop.pmAtMaxQ'].read(sim)!).toBeLessThan(30);
    expect(gradeLesson(l, sim).verdict).toBe('fail');
  });

  it('4.3 a step test: only a step begun in the window after max-Q is graded (audit 2026-09-27 A12)', () => {
    const l = lesson('ctl-step');
    const shell = new Simulation(lessonConfig(l.mission), { headless: true });
    const amp = 2 * Math.PI / 180;
    // a finished pitch step begun at `startS`, whose response peaks at `peak` × the command
    const step = (startS: number, peak: number, holdS = 8): AttitudeTestRecord => {
      const t = Array.from({ length: holdS + 6 }, (_, i) => i);
      return {
        spec: { axis: 'z', sign: 1, kind: 'step', amplitudeRad: amp, holdS }, startS, t, command: t.map(() => amp),
        response: t.map((x) => (x === 0 ? 0 : x === 1 ? 0.6 * amp : x === 2 ? peak * amp : amp)), limits: t.map(() => 0), baselineRad: 0, done: true,
      };
    };
    // the flight: max-Q at T+53 s, MECO at T+157 s, the steps' records on the telemetry when each finished
    const flight = (...tests: AttitudeTestRecord[]): LessonFlight => ({
      ...shell,
      state: { ...shell.state, t: 157, status: 'coast', maxQ: { value: 30e3, t: 53 } },
      events: [{ t: 157, key: 'evt.meco', severity: 'info' }],
      telemetry: tests.map((x) => ({ ...shell.telemetry[0], t: x.startS + x.t[x.t.length - 1], rigid: { attitudeTest: x } })),
    } as unknown as LessonFlight);
    const overshoot = (f: LessonFlight) => gradeLesson(l, f, {}, true).criteria.find((c) => c.id === 'overshoot')!;
    // at T+20 s, before max-Q: not graded, however little it overshoots
    const early = flight(step(20, 1.01));
    expect(MEASURES['step.overshoot'].read(early, 157)).toBeNull();
    expect(overshoot(early)).toMatchObject({ state: 'fail', value: null });
    // at T+65 s: graded as before
    const inWindow = flight(step(65, 1.04));
    expect(overshoot(inWindow).state).toBe('pass');
    expect(overshoot(inWindow).value).toBeCloseTo(4, 6);
    expect(overshoot(flight(step(65, 1.12))).state).toBe('fail');
    // a later step, after the window, does not replace the one in it
    expect(overshoot(flight(step(65, 1.12), step(53 + GRADED_STEP.afterMaxQS + 20, 1.01)))).toMatchObject({ state: 'fail' });
    expect(overshoot(flight(step(65, 1.12), step(53 + GRADED_STEP.afterMaxQS + 20, 1.01))).value).toBeCloseTo(12, 6);
    // held too briefly to settle: not graded
    expect(overshoot(flight(step(65, 1.04, GRADED_STEP.minHoldS - 2))).value).toBeNull();
    // the window's edges: at max-Q and 30 s after it
    expect(overshoot(flight(step(53, 1.04))).state).toBe('pass');
    expect(overshoot(flight(step(53 + GRADED_STEP.afterMaxQS, 1.04))).state).toBe('pass');
    expect(overshoot(flight(step(53 + GRADED_STEP.afterMaxQS + 1, 1.04))).value).toBeNull();
  });

  it('4.4 bending and the notch filter: with no filter the vehicle breaks up in seconds', { timeout: 120_000 }, () => {
    const l = lesson('ctl-notch');
    const sim = fly(l, undefined, 60);
    expect(sim.events.some((e) => e.key === 'evt.bendingFailure'), log(sim)).toBe(true);
    expect(gradeLesson(l, sim).verdict).toBe('fail');
    // switching the bending off is not the answer either
    const off = lessonConfig(l.mission, (s) => { s.dynamics!.flex = { bending: false }; });
    expect(gradeLesson(l, { ...sim, cfg: off } as LessonFlight).criteria.find((c) => c.id === 'bending')!.state).toBe('fail');
  });
});

describe('track 5, advanced missions', () => {
  it('5.1 the booster home: 9.5 t reaches the orbit with the stage on LZ-1; 12 t falls short, 8.5 t is less than asked', { timeout: 120_000 }, () => {
    const l = lesson('adv-landing');
    const solved = fly(l, (s) => { s.payloadMass = 9500; });
    expect(solved.events.some((e) => e.key === 'evt.boosterLandedZone'), log(solved)).toBe(true);
    expect(graded(l, solved).verdict, graded(l, solved).detail).toBe('pass');
    const heavy = fly(l);
    expect(heavy.events.some((e) => e.key === 'evt.boosterLandedZone')).toBe(true);
    expect(gradeLesson(l, heavy).verdict).toBe('fail');
    expect(gradeLesson(l, fly(l, (s) => { s.payloadMass = 8500; })).verdict).toBe('fail');
  });

  it('5.2 rendezvous and docking: the two-orbit profile docks in about 3.4 h; the two-day one is too slow', { timeout: 180_000 }, () => {
    const l = lesson('adv-docking');
    const fast = fly(l, (s) => { s.rendezvous = { profile: 'twoOrbit', port: 'rassvet' }; }, 60 * 3600);
    const hours = MEASURES['dock.hours'].read(fast)!;
    expect(hours).toBeGreaterThan(3);
    expect(hours).toBeLessThan(4);
    expect(graded(l, fast).verdict, graded(l, fast).detail).toBe('pass');
    expect(gradeLesson(l, fast, { hours: hours + 0.5 }).verdict).toBe('fail');
    // the profile the student chose goes into the results (audit 2026-09-27 A11)
    expect(fast.cfg.rendezvous?.profile).toBe('twoOrbit');
    expectRecordedAsFlown(l, fast);
    const slow = fly(l, undefined, 60 * 3600);
    expect(MEASURES['dock.hours'].read(slow)!, log(slow)).toBeGreaterThan(24);
    expect(gradeLesson(l, slow).verdict).toBe('fail');
  });
});
