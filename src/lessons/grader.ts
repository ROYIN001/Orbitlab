/**
 * The lesson grader (roadmap E03): a lesson's criteria held to a recorded
 * flight. DOM-free and pure — the page grades the flight at its recording's
 * head (so scrubbing back through a replay never changes a grade) and a test
 * grades a headless flight with the same call.
 *
 * A criterion is `pending` until it can be decided, `passing` while a bound
 * that could still be broken holds, and `pass` or `fail` once decided. A bound
 * on a peak over the flight (q, the load factor) fails the moment it is
 * broken; everything else is decided when the flight ends for grading.
 */
import { assessMissionResult } from '../ui/result-content';
import { guidanceForVehicle } from '../physics/defaults';
import { defaultDynamics } from '../physics/rigid/config';
import { vehicleById } from '../data/vehicles';
import { LESSON_HOOKS } from './hooks';
import { MEASURES, missionTarget } from './measures';
import type { Criterion, CriterionGrade, CriterionState, Lesson, LessonFlight, LessonGrade, LockKey, MeasureBound } from './types';

/** Answers the student has typed, by criterion id. */
export type LessonAnswers = Readonly<Record<string, number>>;

/** Has the flight ended, for this lesson? */
export function flightEnded(lesson: Pick<Lesson, 'endEvent'>, flight: LessonFlight): boolean {
  if (flight.state.status === 'failed') return true;
  if (lesson.endEvent) return flight.events.some((e) => e.key === lesson.endEvent);
  return assessMissionResult({ ...flight, events: flight.events }) !== null;
}

/** The events that end a flight for grading, as the result card reads them. */
const COMPLETION_KEYS = ['evt.targetOrbit', 'evt.offTargetOrbit', 'evt.suborbitalTarget', 'evt.suborbitalOffTarget'];

/** The mission time the flight ended for grading, or null while it has not. */
export function gradingEnd(lesson: Pick<Lesson, 'endEvent'>, flight: LessonFlight): number | null {
  let t: number | null = null;
  const keys = lesson.endEvent ? [lesson.endEvent] : COMPLETION_KEYS;
  for (const e of flight.events) if (keys.includes(e.key) && (t === null || e.t < t)) t = e.t;
  if (t === null && flight.state.status === 'failed') t = flight.state.t;
  return t;
}

/** Did the flight leave the pad at all? A flight still on the pad is not graded. */
export function flightStarted(flight: LessonFlight): boolean {
  return flight.state.t > 0 || flight.state.status !== 'prelaunch';
}

function withinBound(value: number, bound: MeasureBound, target: number | null): boolean {
  if (bound.min !== undefined && value < bound.min) return false;
  if (bound.max !== undefined && value > bound.max) return false;
  if (bound.target !== undefined) {
    if (target === null) return false;
    if (Math.abs(value - target) > (bound.tol ?? 0)) return false;
  }
  return true;
}

/** Whether a typed answer matches the measured value. */
export function answerMatches(answer: number, expected: number, tol?: number, tolPct?: number): boolean {
  const band = Math.max(tol ?? 0, tolPct !== undefined ? Math.abs(expected) * tolPct / 100 : 0);
  return Math.abs(answer - expected) <= band + 1e-9;
}

function gradeCriterion(c: Criterion, flight: LessonFlight, final: boolean, answers: LessonAnswers, end: number | undefined): CriterionGrade {
  const state = (s: CriterionState, value: number | null = null, expected?: number | null): CriterionGrade =>
    expected === undefined ? { id: c.id, state: s, value } : { id: c.id, state: s, value, expected };
  switch (c.kind) {
    case 'measure': {
      const def = MEASURES[c.measure];
      const value = def.read(flight, end);
      const target = c.target === 'mission' ? missionTarget(flight, c.measure) : c.target ?? null;
      if (def.over === 'history') {
        if (value !== null && !withinBound(value, c, target)) return state('fail', value);
        return state(final ? (value !== null ? 'pass' : 'fail') : 'passing', value);
      }
      if (!final) return state('pending', null);
      return state(value !== null && withinBound(value, c, target) ? 'pass' : 'fail', value);
    }
    case 'outcome': {
      if (!final) return state(c.is === 'survived' && flight.state.status !== 'failed' ? 'passing' : 'pending');
      const result = assessMissionResult(flight);
      const failed = flight.state.status === 'failed' || result?.outcome === 'failed';
      const ok = c.is === 'target' ? result?.outcome === 'target'
        : c.is === 'orbit' ? !failed && !!result && result.outcome !== 'failed'
        : !failed;
      return state(ok ? 'pass' : 'fail');
    }
    case 'event': {
      const seen = flight.events.find((e) => e.key === c.key);
      if (c.present) return state(seen ? 'pass' : final ? 'fail' : 'pending', seen ? seen.t : null);
      return state(seen ? 'fail' : final ? 'pass' : 'passing', seen ? seen.t : null);
    }
    case 'answer': {
      if (!final) return state('pending');
      const expected = MEASURES[c.measure].read(flight, end);
      const typed = answers[c.id];
      if (typed === undefined || !Number.isFinite(typed)) return state('pending', null, expected);
      if (expected === null) return state('fail', typed, expected);
      return state(answerMatches(typed, expected, c.tol, c.tolPct) ? 'pass' : 'fail', typed, expected);
    }
    case 'hook': {
      const hook = LESSON_HOOKS[c.hook];
      if (!hook) return state('fail');
      const r = hook(flight, c.params ?? {}, final);
      return state(r.state, r.value);
    }
  }
}

const near = (a: number | undefined, b: number | undefined, tol: number): boolean =>
  (a === undefined && b === undefined) || (a !== undefined && b !== undefined && Math.abs(a - b) <= tol);
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** The locked settings the flight did not keep, against the lesson's own mission. */
export function brokenLocks(lesson: Pick<Lesson, 'locked' | 'mission'>, flight: LessonFlight): LockKey[] {
  const m = lesson.mission.mission;
  const cfg = flight.cfg;
  const broken: LockKey[] = [];
  for (const key of lesson.locked) {
    let kept = true;
    switch (key) {
      case 'setup.vehicle': kept = cfg.vehicleId === m.vehicleId; break;
      case 'setup.site': kept = cfg.siteId === m.siteId; break;
      case 'setup.satellite': kept = cfg.satelliteId === m.satelliteId; break;
      case 'setup.payloadMass': kept = near(cfg.payloadMassOverride, m.payloadMass, 0.5); break;
      case 'setup.orbit': {
        const a = cfg.orbit, b = m.orbit;
        kept = near(a.perigee, b.perigee, 1) && near(a.apogee, b.apogee, 1) && a.raanMode === b.raanMode
          && (typeof a.inclination === 'number' && typeof b.inclination === 'number' ? near(a.inclination, b.inclination, 1e-6) : a.inclination === b.inclination)
          && near(a.argPerigee, b.argPerigee, 1e-6) && near(a.raan, b.raan, 1e-6) && near(a.ltan, b.ltan, 1e-6)
          && !!a.suborbital === !!b.suborbital
          // a flight on to the station ends somewhere else than the orbit
          && same(cfg.rendezvous, m.rendezvous);
        break;
      }
      case 'setup.launchTime': kept = Math.abs(cfg.launchTime.getTime() - Date.parse(m.launchTime)) < 1000; break;
      case 'setup.failure': kept = cfg.failure.mode === m.failure.mode && (m.failure.mode === 'none'
        || (near(cfg.failure.time, m.failure.time, 1e-6) && cfg.failure.stage === m.failure.stage)); break;
      case 'setup.dynamics.model':
        kept = (cfg.dynamics?.model ?? 'pointMass') === (m.dynamics?.model ?? defaultDynamics(m.vehicleId).model); break;
      case 'setup.guidance': {
        const spec = vehicleById(m.vehicleId);
        const model = m.dynamics?.model ?? defaultDynamics(m.vehicleId).model;
        const expected = { ...guidanceForVehicle(spec, undefined, model), ...m.guidanceOverrides } as Record<string, number>;
        const flown = cfg.guidance as unknown as Record<string, number>;
        kept = Object.keys(expected).every((k) => near(flown[k], expected[k], 1e-6));
        break;
      }
      case 'setup.boosterRecovery':
        kept = cfg.boosterRecovery === m.boosterRecovery && (!m.boosterRecovery || same(cfg.recoveryPlan, m.recoveryPlan)); break;
      // the failures struck; whether the FDIR meets them is the student's to choose
      case 'setup.faults': kept = same(cfg.dynamics?.controlFaults?.faults, m.dynamics?.controlFaults?.faults); break;
    }
    if (!kept) broken.push(key);
  }
  return broken;
}

/**
 * Grade a flight. `final` is worked out from the flight unless given (a test
 * may grade a flight it stopped early as ended).
 */
export function gradeLesson(lesson: Lesson, flight: LessonFlight, answers: LessonAnswers = {}, finalOverride?: boolean): LessonGrade {
  const final = finalOverride ?? flightEnded(lesson, flight);
  const end = gradingEnd(lesson, flight) ?? undefined;
  const criteria = lesson.criteria.map((c) => gradeCriterion(c, flight, final, answers, end));
  const lockBroken = brokenLocks(lesson, flight);
  const anyFail = lockBroken.length > 0 || criteria.some((c) => c.state === 'fail');
  const allPass = criteria.every((c) => c.state === 'pass');
  return {
    lessonId: lesson.id, final,
    verdict: anyFail ? 'fail' : allPass && final ? 'pass' : 'open',
    criteria, lockBroken, t: flight.state.t,
  };
}

/**
 * A grade taken when the flight ended, with the answers checked again as the
 * student types them. The page keeps that grade rather than grading the head
 * of a flight that coasts on (a node that precesses, a payload that
 * separates): the lesson is judged at its end, however long it is watched.
 */
export function regradeAnswers(lesson: Lesson, frozen: LessonGrade, answers: LessonAnswers = {}): LessonGrade {
  const criteria = frozen.criteria.map((g) => {
    const c = lesson.criteria.find((x) => x.id === g.id);
    if (c?.kind !== 'answer') return g;
    const typed = answers[c.id];
    if (typed === undefined || !Number.isFinite(typed)) return { ...g, state: 'pending' as const, value: null };
    const ok = g.expected !== null && g.expected !== undefined && answerMatches(typed, g.expected, c.tol, c.tolPct);
    return { ...g, state: ok ? 'pass' as const : 'fail' as const, value: typed };
  });
  const anyFail = frozen.lockBroken.length > 0 || criteria.some((c) => c.state === 'fail');
  return { ...frozen, criteria, verdict: anyFail ? 'fail' : criteria.every((c) => c.state === 'pass') ? 'pass' : 'open' };
}

/** The answers a lesson still waits for, once the flight has ended. */
export function awaitingAnswers(lesson: Lesson, grade: LessonGrade): string[] {
  if (!grade.final) return [];
  return lesson.criteria.filter((c) => c.kind === 'answer' && grade.criteria.find((g) => g.id === c.id)?.state === 'pending').map((c) => c.id);
}
