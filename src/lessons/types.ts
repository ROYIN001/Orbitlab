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
import type { SatelliteDesign } from '../design/satellite-spec';
import type { MissionRequirements } from '../design/requirements';

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

/**
 * What a curriculum code names (roadmap T03, "Lessons matched to the Thai
 * science curriculum (IPST)"; Phase 4 map §4.3; the T03 research's §1.5): an
 * IPST basic-science indicator (`ว 2.2 ม.5/6`), a learning outcome of an
 * additional course (`ฟส ม.4 ผล 17`), a course of an academy's programme
 * (`วอ 478`), or a competence of a federal standard (`ОПК-8`). The last two
 * were added to the map's pair for the cadet curricula.
 */
export type CurriculumKind = 'indicator' | 'outcome' | 'course' | 'competence';
export const CURRICULUM_KINDS: readonly CurriculumKind[] = ['indicator', 'outcome', 'course', 'competence'];

/** One code of a curriculum a lesson is matched to, as the curriculum document writes it. */
export interface CurriculumCode {
  code: string;
  kind: CurriculumKind;
}

/**
 * A lesson of a pack (T03): one of the pack file's own lessons, or a built-in
 * lesson the pack reuses by reference (the research's §8 item 1), so a tested
 * lesson is listed again rather than copied under a new id. A reference
 * carries its codes here; a lesson of the file carries its own `curriculum`.
 */
export interface PackEntry {
  id: string;
  curriculum?: CurriculumCode[];
  /** a reference's word on what the lesson is for in this curriculum, shown under its card */
  note?: LocalText;
}

/**
 * A lesson pack (T03): a lesson file read as a group of lessons matched to one
 * curriculum. It is an optional field of the file, so the file stays at the
 * version its lessons need: an older reader skips the field and reads the
 * lessons as any teacher's file (map §1.3, `readMeta`).
 */
export interface LessonPack {
  id: string;
  title: LocalText;
  /** who it is for: the grades or the cadets' year */
  audience: LocalText;
  /** the curriculum document its codes are read from */
  framework: LocalText;
  /**
   * The roadmap's validation for T03 is the owner's review: until it is done
   * the pack is a draft, and the lessons page says so.
   */
  reviewed: boolean;
  description?: LocalText;
  /** its lessons in order: the file's own, and built-in ones by reference; the file's own not named are listed after */
  contents: PackEntry[];
}

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
  /** T03: the curriculum codes the lesson is matched to, shown as chips in its pack */
  curriculum?: CurriculumCode[];
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

/**
 * A number of a designed satellite a design lesson grades (roadmap T01, Phase 4
 * map §4.1 "Design a satellite that meets these requirements"), each read from
 * the D06 satellite model's figures (src/design/satellite-model.ts
 * `designFigures`) or, for the two the air decides, the lifetime analysis (P07)
 * flown on the design — never worked out a second way (src/design/design-lesson-key.ts).
 * Units, as a lesson file writes its bounds (`DESIGN_MEASURES`): kg, min, %, %,
 * m/s, dB, Gbit a day, m, km, days, years, a ratio, 0 or 1, A·m².
 * `sat.torquerDipole` is the T03 research's addition (the magnetorquer lesson
 * of the IPST physics pack, phase4-t03-curricula §8): the torquer dipole the
 * disturbances need.
 */
export type DesignMeasureId =
  | 'sat.mass' | 'sat.eclipseMax' | 'sat.powerMargin' | 'sat.batteryDod' | 'sat.dvMargin' | 'sat.linkMargin' | 'sat.dataPerDay'
  | 'sat.gsd' | 'sat.swath' | 'sat.revisitMax' | 'sat.lifetime' | 'sat.wheelMargin' | 'sat.disposal25y' | 'sat.torquerDipole';

/**
 * A part of the design a design lesson fixes (T01): a number's path in the
 * design (`power.arrayArea`, as the satellite model's `SATELLITE_FIELDS` name
 * it), a menu's (`power.mount`, `power.regulation`, `adcs.mode`,
 * `comms.station`), the sun-synchronous switch (`orbit.sso`), or whether the
 * design has an engine (`propulsion`) or a camera (`payload`). The full list
 * is `DESIGN_LOCK_KEYS` (src/lessons/design-lesson.ts).
 */
export type DesignLockKey = string;

/** A bound on a design measure, in its unit: a range, or a number and a tolerance round it. */
export interface DesignBound {
  min?: number;
  max?: number;
  target?: number;
  /** half-width of the band round `target` */
  tol?: number;
}

export type DesignCriterion =
  /** a figure of the design held within bounds */
  | ({ id: string; kind: 'design'; measure: DesignMeasureId; label?: LocalText } & DesignBound)
  /** a figure the student works out and types in (the T03 answer form, curricula §8), checked against the design's own */
  | { id: string; kind: 'answer'; measure: DesignMeasureId; tol?: number; tolPct?: number; prompt: LocalText; unit?: string; label?: LocalText };

/**
 * A design lesson (roadmap T01, Phase 4 map §4.1): the satellite designer
 * opens (Explore, or the Engineer level's bench: `mode`) on a start design,
 * some of its parts locked, and the student changes the rest until the
 * design's figures meet the criteria, then hands it in. Graded outside
 * src/lessons (src/design/design-lesson-key.ts builds the `DesignKey`; the
 * grade itself is src/lessons/design-lesson.ts `gradeDesign`), as the case
 * lessons are, so the lessons keep clear of the propagator
 * (tests/propagator.test.ts).
 *
 * REPRODUCIBLE: the lesson fixes the day the figures are read on
 * (`designDate`, the design date of the integration of D06) and the ECSS
 * level of the air (`level`), never the measured series, so the same design
 * gets the same grade on any day, on any computer within the re-check's
 * engine tolerances (T02).
 */
export interface DesignLesson extends LessonMeta {
  kind: 'design';
  title: LocalText;
  brief: LocalText;
  debrief?: LocalText;
  /** where the design starts: a template's design (src/data/satellite-templates.ts), or a whole design of the file's own */
  start: { template: string } | { design: SatelliteDesign };
  /** the day the figures are read on, `YYYY-MM-DD` (UTC) */
  designDate: string;
  /** the ECSS level of solar activity the air is read at */
  level: 'low' | 'moderate' | 'high';
  /** what the mission asks, shown beside the designer; its place is where `sat.revisitMax` looks */
  requirements?: MissionRequirements;
  /** the parts of the design the student may not change */
  locked: DesignLockKey[];
  criteria: DesignCriterion[];
  hints: LocalText[];
}

/**
 * A design's figures for a design lesson, as the grader reads them (T01):
 * built outside src/lessons from the D06 model and the lifetime run
 * (src/design/design-lesson-key.ts), handed in as data, as a case sheet's key
 * is (`CaseKey`).
 */
export interface DesignKey {
  /** each measure the lesson asks about, in its unit (`DESIGN_MEASURES`); null where it does not apply (no camera, no wheel, outside the low region) */
  values: Partial<Record<DesignMeasureId, number | null>>;
  /** the locked parts the design changed */
  lockBroken: DesignLockKey[];
  /** the design is refused by the checker: no figure could be worked out */
  refused?: boolean;
  /** `sat.lifetime` is the run's end: the satellite was still up then, so its lifetime is longer */
  lifetimeCapped?: boolean;
  /** the 25-year rule's limit for this design, years from the design date (life + 25 with no engine, 25 with one) */
  disposalLimit?: number;
}

/** A lesson of any kind, as the catalogue lists it. */
export type CatalogLesson = Lesson | CaseLesson | DesignLesson;

export const isCaseLesson = (l: CatalogLesson): l is CaseLesson => l.kind === 'case';
export const isDesignLesson = (l: CatalogLesson): l is DesignLesson => l.kind === 'design';
/** A flight lesson: the kind every flown thing takes. */
export const isFlightLesson = (l: CatalogLesson): l is Lesson => l.kind === undefined || l.kind === 'flight';

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
   * The answer's value was shown to the student (the strip's "Show the
   * answers") before it was right: typed right after, it passes only with
   * help (the lesson's verdict `passedWithHelp`), never unaided.
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
  /**
   * all passed / all passed, but on an answer the student had been shown
   * (owner decision D-6: recorded as such, never as an unaided pass) / any
   * failed / not yet decided
   */
  verdict: 'pass' | 'passedWithHelp' | 'fail' | 'open';
  criteria: CriterionGrade[];
  /** settings the lesson locked that the flight did not keep (a design lesson: the design's parts, `DesignLockKey`) */
  lockBroken: (LockKey | DesignLockKey)[];
  /** mission time graded at, s */
  t: number;
}
