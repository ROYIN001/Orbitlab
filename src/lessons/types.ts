/**
 * Lessons with set tasks and automatic grading (roadmap E03): the shapes a
 * lesson, its criteria and its grade take. Everything here is plain data, so a
 * lesson can live in the code (the built-in ones) or in a teacher's
 * `.orbitlab-lesson.json` file, and the grader that reads it is DOM-free.
 *
 * Two kinds: a flight lesson (`Lesson`), a mission flown and graded, and a
 * case lesson (`CaseLesson`, P2.5's cases from the record, track 6), a case
 * worked from its data in the Orbit section with no flight at all. The
 * catalogue, the file reader, the progress and the WebMCP tools take either
 * (`CatalogLesson`); everything that flies takes a `Lesson`.
 */
import type { Lang } from '../i18n';
import type { CaseId } from '../worksheets/case-ids';
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

/**
 * A setting the Explore level keeps computed (src/ui/explore.ts) that a
 * lesson opening in Explore asks the student to change, and so shows.
 */
export type RevealKey = 'setup.guidance';
export const REVEAL_KEYS: readonly RevealKey[] = ['setup.guidance'];

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
  /** track 1–6 in the catalogue (6: the cases from the record); a teacher's lesson may use any */
  track: number;
  /** its place in the track: 1, 2, … */
  order: number;
  /** the workspace mode the lesson opens in; a case lesson's, the Orbit section's level */
  mode: 'explore' | 'engineer';
  /** the areas of knowledge it exercises (the placement test's recommendations) */
  domains: Domain[];
  /** a roadmap item or a tag shown on the card, e.g. `G08` */
  tags?: string[];
  /** a built-in lesson that is only listed, not yet written */
  comingSoon?: boolean;
}

export interface Lesson extends LessonMeta {
  /** a flight lesson: never written, since a lesson without a kind is one */
  kind?: 'flight';
  title: LocalText;
  /** the task, as the student reads it */
  brief: LocalText;
  /** what the lesson is about, after it is passed */
  debrief?: LocalText;
  /** the mission it starts from (U01's document) */
  mission: MissionDocument;
  /** the settings the student may not change */
  locked: LockKey[];
  /** computed settings the lesson asks the student to change, shown in Explore */
  reveal?: RevealKey[];
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

/** A question of a case's sheet the student answers, checked against the sheet's own key. */
export interface CaseCriterion {
  id: string;
  kind: 'case';
  /** the sheet's question (src/worksheets/case-ids.ts `CASE_ITEM_IDS`) */
  item: string;
  /** a tolerance of the lesson's own, in place of the sheet's (a number question only) */
  tol?: number;
  tolPct?: number;
  label?: LocalText;
}

/**
 * A case lesson (P2.5's cases from the record, graded since E03's track 6):
 * the Orbit section's Real satellites opens at the case's tool, and the
 * student answers the case sheet's questions, graded by the sheet's own key
 * with the data frozen when the lesson opens. No mission, no locks.
 */
export interface CaseLesson extends LessonMeta {
  kind: 'case';
  case: CaseId;
  title: LocalText;
  brief: LocalText;
  debrief?: LocalText;
  criteria: CaseCriterion[];
  hints: LocalText[];
}

/** A lesson of either kind, as the catalogue lists it. */
export type CatalogLesson = Lesson | CaseLesson;

export const isCaseLesson = (l: CatalogLesson): l is CaseLesson => l.kind === 'case';

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
  /**
   * The answer was shown to the student (the strip's "Show the answers")
   * before it was right: it cannot pass, whatever is typed after.
   */
  revealed?: boolean;
}

/**
 * A case sheet's answer key as data (P2.5, graded as lessons in track 6): by
 * question id, the value and the tolerance that counts as right; for a
 * choice, the right option's index and no tolerance. Read off the sheet
 * itself (src/worksheets/cases.ts `caseKey`), so the lesson and the printed
 * key are the same computation.
 */
export type CaseKey = Readonly<Record<string, { kind: 'number' | 'choice'; value: number; tol: number }>>;

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
