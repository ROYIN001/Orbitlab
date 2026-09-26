/**
 * Lessons with set tasks and automatic grading (roadmap E03): the shapes a
 * lesson, its criteria and its grade take. Everything here is plain data, so a
 * lesson can live in the code (the built-in ones) or in a teacher's
 * `.orbitlab-lesson.json` file, and the grader that reads it is DOM-free.
 */
import type { Lang } from '../i18n';
import type { MissionDocument } from '../config/mission-file';
import type { Simulation } from '../physics/simulation';

/** A text in the three languages of the interface; English is required, the others fall back to it. */
export type LocalText = { en: string } & Partial<Record<Exclude<Lang, 'en'>, string>>;

/** The six areas of knowledge the lessons and the placement test are built on. */
export type Domain = 1 | 2 | 3 | 4 | 5 | 6;
export const DOMAINS: readonly Domain[] = [1, 2, 3, 4, 5, 6];

/**
 * A setting of the mission a lesson can fix, in the setup panel's own words
 * (the panel greys the control out, and the grader checks the flight kept it).
 */
export type LockKey =
  | 'setup.vehicle' | 'setup.site' | 'setup.satellite' | 'setup.payloadMass' | 'setup.orbit' | 'setup.launchTime'
  | 'setup.failure' | 'setup.dynamics.model' | 'setup.guidance' | 'setup.boosterRecovery' | 'setup.faults';
export const LOCK_KEYS: readonly LockKey[] = [
  'setup.vehicle', 'setup.site', 'setup.satellite', 'setup.payloadMass', 'setup.orbit', 'setup.launchTime',
  'setup.failure', 'setup.dynamics.model', 'setup.guidance', 'setup.boosterRecovery', 'setup.faults',
];

/** A number read from the flight (see `measures.ts`). */
export type MeasureId =
  | 'orbit.perigee' | 'orbit.apogee' | 'orbit.inclination' | 'orbit.raanError' | 'orbit.period' | 'orbit.eccentricity'
  | 'orbit.semiMajorAxis' | 'maxQ' | 'maxQTime' | 'maxG' | 'dvLeft' | 'payload' | 'insertionTime'
  | 'loss.gravity' | 'loss.drag' | 'loss.steering' | 'burnDv' | 'orbit.speed' | 'abort.maxG' | 'abort.time'
  | 'nav.positionError' | 'loop.pmAtMaxQ' | 'loop.gmAtMaxQ' | 'loop.wcAtMaxQ' | 'step.overshoot' | 'dock.hours' | 'orbit.perigeeMiss'
  | 'burnDv.raise';

/** A bound on a measure: a range, or a target and a tolerance around it. */
export interface MeasureBound {
  min?: number;
  max?: number;
  /** a number, or `mission` for the value the mission's own target orbit asks for */
  target?: number | 'mission';
  /** half-width of the band round `target`, in the measure's unit */
  tol?: number;
}

export type Criterion =
  /** a number the flight must keep within bounds */
  | ({ id: string; kind: 'measure'; measure: MeasureId; label?: LocalText } & MeasureBound)
  /** how the flight ended: on target, in any orbit, not lost */
  | { id: string; kind: 'outcome'; is: 'target' | 'orbit' | 'survived'; label?: LocalText }
  /** an event must (or must not) happen */
  | { id: string; kind: 'event'; key: string; present: boolean; label?: LocalText }
  /** a number the student works out and types in, checked against the one this flight measured */
  | { id: string; kind: 'answer'; measure: MeasureId; tol?: number; tolPct?: number; prompt: LocalText; unit?: string; label?: LocalText }
  /** a check written in code (`hooks.ts`), for what the kinds above cannot say */
  | { id: string; kind: 'hook'; hook: string; params?: Record<string, number | string | boolean>; label?: LocalText };

/** Where a lesson is listed, and the mode it opens in. */
export interface LessonMeta {
  id: string;
  /** track 1–5 in the catalogue; a teacher's lesson may use any */
  track: number;
  /** its place in the track: 1, 2, … */
  order: number;
  /** the workspace mode the lesson opens in */
  mode: 'explore' | 'engineer';
  /** the areas of knowledge it exercises (the placement test's recommendations) */
  domains: Domain[];
  /** a roadmap item or a tag shown on the card, e.g. `G08` */
  tags?: string[];
  /** a built-in lesson that is only listed, not yet written */
  comingSoon?: boolean;
}

export interface Lesson extends LessonMeta {
  title: LocalText;
  /** the task, as the student reads it */
  brief: LocalText;
  /** what the lesson is about, after it is passed */
  debrief?: LocalText;
  /** the mission it starts from (U01's document) */
  mission: MissionDocument;
  /** the settings the student may not change */
  locked: LockKey[];
  criteria: Criterion[];
  /** revealed one at a time */
  hints: LocalText[];
  /**
   * The flight ends for grading when the result card has an outcome (the
   * default), or at this event (a flight that goes on after its target, such as
   * an abort to the crew on the ground).
   */
  endEvent?: string;
}

/**
 * What the grader reads: a live simulation, the main thread's mirror of one in
 * the physics worker, or a headless flight in a test all have these.
 */
export type LessonFlight = Pick<Simulation, 'cfg' | 'plan' | 'state' | 'events' | 'telemetry' | 'debris' | 'site'>;

export type CriterionState = 'pending' | 'passing' | 'pass' | 'fail';

export interface CriterionGrade {
  id: string;
  state: CriterionState;
  /** the value measured (or typed, for an answer), in the measure's unit */
  value: number | null;
  /** the value the answer is checked against; absent before the flight ends */
  expected?: number | null;
}

export interface LessonGrade {
  lessonId: string;
  /** the flight has ended for grading */
  final: boolean;
  /** all passed / any failed / not yet decided */
  verdict: 'pass' | 'fail' | 'open';
  criteria: CriterionGrade[];
  /** settings the lesson locked that the flight did not keep */
  lockBroken: LockKey[];
  /** mission time graded at, s */
  t: number;
}
