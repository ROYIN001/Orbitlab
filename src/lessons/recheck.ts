/**
 * The instructor's re-check of a class's results files (roadmap T02; Phase 4
 * map §4.2). DOM-free: the checking page runs it in a Web Worker
 * (src/lessons/recheck-job.ts), the `check_results` lesson tool through the
 * same job, and the tests in Node. Nothing is sent anywhere: the files are
 * read and the flights flown on this device.
 *
 * Each flight lesson's record is flown again headless from the mission it
 * kept — `sim.step(sim.suggestedDt())` from the pad, the loop the live flight
 * equals bit for bit since T02 (src/replay/recorder.ts, docs/PHYSICS.md §2n) —
 * giving the commands of its journal at the step boundaries that took them
 * (`LessonRecord.actions`), to the simulation time it was graded at
 * (`LessonRecord.t`), and graded again with the instructor's own copy of the
 * lesson, counting the events the student's picture had reached
 * (`gradeShown` with `LessonRecord.clock`). Each criterion is then held to
 * what the record says:
 *
 * - **match**: the same state, and the value within the engine tolerance
 *   below;
 * - **borderline**: the value lies within that tolerance of one of the
 *   criterion's bounds, so another engine could have decided it either way
 *   (the grader's bounds have no epsilon, grader.ts `withinBound`), whichever
 *   way it went here;
 * - **differs**: a value or a state the tolerance does not explain — the
 *   record was edited, it comes from another build (`sameBuild`), or the
 *   lesson file is not the one the student had — or a re-fly that could not
 *   stop within `EVENT_TIME_TOLERANCE` of the grading time (no step boundary
 *   within `SAME_T` of it: an edited time, or another build's steps);
 * - **cannot re-fly**: a case lesson (no flight), a six-DOF flight (minutes
 *   each: not re-flown), a lesson this checker does not have, a mission or a
 *   journal that does not read, a flight that never reaches the time it was
 *   graded at — or a record made before T02 (no grading time, instant on
 *   screen or journal) whose re-fly came out different: it is flown to the
 *   first step the flight has ended at, which can be a step before the grade
 *   was taken (13.75 s on lesson 1.1), and without its commands, and a build
 *   that old read the orbit at the frame it graded on (the speed 13.75 s on
 *   moves by 0.02 m/s), not at the grading end as this one does (T03 review),
 *   so a difference says nothing about an edit (`incomplete`). One that comes
 *   out the same is a match. A record
 *   that names its build (`app`) and lacks one of the others was edited, since
 *   every build that writes `app` writes all four: it differs.
 * - a record whose fields are not a record's (a criterion that is not one)
 *   cannot be re-flown (`error`), and the rest of the class is checked.
 *
 * The re-check's verdict is the instructor's re-grade.
 */
import { Simulation } from '../physics/simulation';
import { applyAction, readActions, type FlightAction } from '../physics/sim/actions';
import { parseMissionDocument } from '../config/mission-file';
import { appBuildId } from '../build-info';
import { allLessons } from './catalog';
import { defaultMissionState, missionConfigFromState } from './config';
import { flightEnded, gradeShown, regradeAnswers, type RevealedAnswers } from './grader';
import { MEASURES, missionTarget } from './measures';
import {
  RESULTS_FORMAT, missingDesignFields, missingFields, verifyResults, type LessonProgress, type LessonRecord, type RecheckField, type ResultsFile,
} from './progress';
import {
  isCaseLesson, isDesignLesson, isFlightLesson,
  type CatalogLesson, type Criterion, type CriterionGrade, type DesignCriterion, type DesignKey, type DesignLesson, type DesignLockKey, type DesignMeasureId,
  type Lesson, type LessonGrade, type LockKey, type MeasureId,
} from './types';
import { DESIGN_MEASURES, brokenDesignLocks, designLessonOptions, gradeDesign, type DesignMeasureKind } from './design-lesson';
import { designLessonStart, designValuesNow } from '../design/design-lesson-key';
import { lifetimeNow } from '../orbit/lifetime-now';

/**
 * How far a re-checked value may be from the recorded one and still match, in
 * the measure's own unit (map §4.2's table; tests/recheck.test.ts fixes the
 * same table in its header before the first Node-against-Chromium run). The
 * student's browser and the instructor's may differ in the last bits of
 * `Math.sin` and its kin; these bound what that may move. Each is at most a
 * hundredth of the tightest tolerance a built-in lesson gives the measure
 * (answer `tol` or `tolPct` at the lesson's value, or a range's width), so a
 * difference within it cannot pass a flight a lesson means to fail. Those
 * the map does not list are derived: the period from 0.01 km of semi-major
 * axis (at most 4e-4 min up to a GTO), the speed from 0.01 m/s, the
 * eccentricity from 0.01 km on each apsis (1.5e-6 in LEO), an event's time
 * from 0.01 s (the docking hour: 2.8e-6 h), the crew's peak load as `maxG`'s
 * tenfold (it is read from the same telemetry over a few samples). Six-DOF
 * measures (`nav`, `loop`, `step`) are listed for completeness: a six-DOF
 * flight is not re-flown.
 */
export const ENGINE_TOLERANCE: Readonly<Record<MeasureId, number>> = {
  'orbit.perigee': 0.01, 'orbit.apogee': 0.01, 'orbit.semiMajorAxis': 0.01, 'orbit.perigeeMiss': 0.01,
  'orbit.inclination': 1e-4, 'orbit.raanError': 1e-4,
  'orbit.period': 1e-3, 'orbit.speed': 1e-5, 'orbit.eccentricity': 2e-6,
  'maxQ': 1e-4, 'maxQTime': 0.01, 'maxG': 1e-5,
  'dvLeft': 0.01, 'loss.gravity': 0.01, 'loss.drag': 0.01, 'loss.steering': 0.01, 'burnDv': 0.01, 'burnDv.raise': 0.01,
  'payload': 0,
  'insertionTime': 0.01, 'abort.time': 0.01, 'abort.maxG': 1e-4,
  'nav.positionError': 1e-3, 'loop.pmAtMaxQ': 1e-4, 'loop.gmAtMaxQ': 1e-4, 'loop.wcAtMaxQ': 1e-5, 'step.overshoot': 1e-3,
  'dock.hours': 3e-6,
};
/** An event criterion's value is the event's time, s. */
export const EVENT_TIME_TOLERANCE = 0.01;

/**
 * A design lesson's figures (T01, T02; map §4.2's table, its design half),
 * worked out again from the record's design at its design date and ECSS
 * level: how far each may move between two engines, by how it is worked out
 * (`DESIGN_MEASURES[m].kind`). FIXED ON 2026-10-01 BEFORE THE FIRST RE-CHECK
 * OF A DESIGN RECORD, in this header and in tests/recheck.test.ts's:
 *
 *   | kind     | measures                                              | tolerance                                     |
 *   |----------|-------------------------------------------------------|-----------------------------------------------|
 *   | closed   | mass, power and Δv and link margins, battery depth,   | 1e-9 relative (of the larger of the two), and |
 *   |          | GSD, swath, wheel margin, torquer dipole              | never under 1e-12 in the unit (a zero)        |
 *   | eclipse  | sat.eclipseMax                                        | 2e-4 min (0.012 s)                            |
 *   | revisit  | sat.revisitMax                                        | 1e-7 d (8.6 ms)                               |
 *   | contact  | sat.dataPerDay                                        | 1e-6 relative                                 |
 *   | lifetime | sat.lifetime                                          | 0.1 % relative                                |
 *   | flag     | sat.disposal25y                                       | exact (borderline: the lifetime within 0.1 %  |
 *   |          |                                                       | of the 25-year limit)                         |
 *
 * The closed forms and the lifetime are map §4.2's. The others are DERIVED
 * from how they are refined: an eclipse's edges are bisected to 1 ms
 * (src/orbit/eclipse.ts), so another engine's last bit can move each by at
 * most that, two edges 2 ms, and the year's search for the longest picks a
 * revolution within a minute of the same one, where the eclipse is at its
 * flattest — ten edges' worth, 0.012 s, covers both; a look's closest
 * approach is refined to 1 ms (src/orbit/coverage.ts `REFINE`), a gap two of
 * them, kept to the Julian date's 40 µs — 8.6 ms is four times that; a
 * pass's rise and set are bisected to 1 ms (src/orbit/passes.ts), and a
 * station hears a low orbit some 2 000 s a day, so a millisecond flipped in
 * a month of passes moves the day's data by 1e-8 of itself — 1e-6 is a
 * hundred times that. A look whose closest approach lies within a hair of
 * the swath's edge can come and go between engines; it shows as "differs",
 * not loosened here.
 */
export const DESIGN_ENGINE_TOLERANCE: Readonly<Record<DesignMeasureKind, { rel?: number; abs?: number }>> = {
  closed: { rel: 1e-9, abs: 1e-12 },
  eclipse: { abs: 2e-4 },
  revisit: { abs: 1e-7 },
  contact: { rel: 1e-6, abs: 1e-12 },
  lifetime: { rel: 1e-3 },
  flag: { abs: 0 },
};

/** The tolerance a design measure's value is held to between `a` and `b` (the recorded and the re-checked), in its unit. */
export function designTolerance(measure: DesignMeasureId, a: number | null | undefined, b: number | null | undefined): number {
  const t = DESIGN_ENGINE_TOLERANCE[DESIGN_MEASURES[measure].kind];
  const size = Math.max(Math.abs(a ?? 0), Math.abs(b ?? 0));
  return Math.max(t.abs ?? 0, (t.rel ?? 0) * (Number.isFinite(size) ? size : 0));
}
/**
 * A hook's value, in its own unit: the crew's peak load (g, as `abort.maxG`),
 * the perigee (km), a run's number (exact). A hook with no value is its state.
 */
export const HOOK_TOLERANCE: Readonly<Record<string, number>> = { crewSafe: 1e-4, stableOrbit: 0.01, dispersedRun: 0 };

/** Longest re-fly, s of mission time, and most steps: a flight that runs on past these never reaches its grade. */
const MAX_REFLY_T = 30 * 86400;
const MAX_REFLY_STEPS = 2_000_000;
/**
 * How near a step boundary must be to a recorded time (a journal entry's, the
 * grading time) to be the boundary that took it, s. On the engine that flew
 * the record the boundary is that very double (a journal written as JSON reads
 * back to it). Another engine's clock sums the same steps to a hair either side
 * — measured, Chromium against Node: 1.4e-12 s at T+3 238 s, 2.1e-8 s at
 * T+177 204 s on a two-day flight to GEO, where a nanosecond's window let the
 * re-fly step past the grading boundary and grade a whole 30 s step later. No
 * step is shorter than 1e-4 s (`Simulation.suggestedDt`'s smallest clamp, a
 * pending action's gap), so a 10 µs window still holds one boundary at most.
 */
export const SAME_T = 1e-5;

export type CheckStatus = 'match' | 'borderline' | 'differs' | 'cannotRefly';
export type CannotReason = 'caseLesson' | 'noLesson' | 'noMission' | 'mission' | 'sixDof' | 'actions' | 'notReached' | 'incomplete' | 'error' | 'noDesign';
export type Which = 'passed' | 'last';
export const CHECK_STATUSES: readonly CheckStatus[] = ['match', 'borderline', 'differs', 'cannotRefly'];

/** One criterion, as recorded and as re-checked. */
export interface CriterionCheck {
  id: string;
  kind: Criterion['kind'] | DesignCriterion['kind'] | 'missing';
  measure?: MeasureId | DesignMeasureId;
  hook?: string;
  event?: string;
  recorded: CriterionGrade | null;
  rechecked: CriterionGrade | null;
  /** the tolerance the values were held to, in their unit; null for a state alone */
  tol: number | null;
  status: CheckStatus;
  /** borderline: the bound the value lies near, in its unit (`sat.disposal25y`: the 25-year rule's limit, years, which the lifetime lies near) */
  bound?: number;
}

/** One record of one lesson in one student's file. */
export interface RecordCheck {
  /** the results file it came from, as the input listed them */
  file: number;
  student: string | null;
  lessonId: string;
  /** the progress fields it is: the first unaided pass, the last flight graded, or both */
  which: Which[];
  /** when it was graded, as the record says */
  at: string;
  kind: 'flight' | 'case' | 'design';
  status: CheckStatus;
  reason?: CannotReason;
  /** the fields an exact re-check needs that the record lacks (a record made before T02; a design record, edited) */
  missing: RecheckField[];
  /** a design record: the design date and ECSS level its figures were worked out again at (the record's own) */
  designDate?: string;
  level?: string;
  /** a design record whose date or level is not the instructor's lesson's: graded on another day or in other air than the lesson asks */
  mismatch?: ('designDate' | 'level')[];
  /** whether it was flown on this build; null when the record does not say */
  sameBuild: boolean | null;
  /** the build the record says it was flown on */
  app: string | null;
  recordedVerdict: LessonRecord['verdict'];
  /** the re-grade, when the flight was flown again */
  recheckedVerdict: LessonGrade['verdict'] | null;
  lockBroken: (LockKey | DesignLockKey)[];
  criteria: CriterionCheck[];
  /** the mission time flown to, s, and in how many steps (a design record: null and 0) */
  flownTo: number | null;
  steps: number;
  /** journal commands the re-fly gave at a boundary later than recorded (a record not flown on whole steps) */
  lateActions: number;
}

export interface FileCheck {
  index: number;
  name: string | null;
  /** it is an Orbitlab results file at all */
  readable: boolean;
  student: string | null;
  exportedAt: string | null;
  /** its checksum holds (null when unreadable): a file edited after export fails it — unless the editor recomputed it */
  checksum: boolean | null;
}

export interface ResultsCheck {
  /** the checker's own build */
  app: string;
  files: FileCheck[];
  records: RecordCheck[];
  /** the check was stopped before every record was flown */
  stopped: boolean;
}

export interface RecheckInput {
  /** the results files as read, in the order opened */
  results: readonly unknown[];
  /** their file names, for the report */
  names?: readonly (string | null)[];
  /** the instructor's own lessons (from their lesson file): results files do not carry them */
  lessons?: readonly CatalogLesson[];
}

/** A record found in a file, waiting to be checked. */
export interface RecheckJob {
  file: number;
  student: string | null;
  lessonId: string;
  which: Which[];
  record: LessonRecord;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isLessonRecord = (v: unknown): v is LessonRecord =>
  isRecord(v) && typeof v.at === 'string' && typeof v.verdict === 'string' && Array.isArray(v.criteria) && isRecord(v.answers);

/** Whether a file is a results file this checker can read (version 1: T02's fields are optional in it). */
export function isResultsFile(raw: unknown): raw is ResultsFile {
  return isRecord(raw) && raw.format === RESULTS_FORMAT && raw.version === 1 && isRecord(raw.progress) && isRecord(raw.progress.lessons);
}

/**
 * The records in the files, in file order and then each file's own order: a
 * lesson's first unaided pass and its last flight, once when they are the
 * same record.
 */
export function collectRecords(results: readonly unknown[], names: readonly (string | null)[] = []): { files: FileCheck[]; jobs: RecheckJob[] } {
  const files: FileCheck[] = [];
  const jobs: RecheckJob[] = [];
  results.forEach((raw, index) => {
    const name = names[index] ?? null;
    if (!isResultsFile(raw)) { files.push({ index, name, readable: false, student: null, exportedAt: null, checksum: null }); return; }
    const student = typeof raw.student === 'string' && raw.student ? raw.student : null;
    files.push({ index, name, readable: true, student, exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : null, checksum: null });
    for (const [lessonId, p] of Object.entries(raw.progress.lessons as Record<string, LessonProgress>)) {
      if (!isRecord(p)) continue;
      const passed = isLessonRecord(p.passedRecord) ? p.passedRecord : null;
      const last = isLessonRecord(p.last) ? p.last : null;
      if (passed && last && JSON.stringify(passed) === JSON.stringify(last)) { jobs.push({ file: index, student, lessonId, which: ['passed', 'last'], record: passed }); continue; }
      if (passed) jobs.push({ file: index, student, lessonId, which: ['passed'], record: passed });
      if (last) jobs.push({ file: index, student, lessonId, which: ['last'], record: last });
    }
  });
  return { files, jobs };
}

/**
 * The edge of an answer's band the typed `v` lies within `tol` of, when it
 * does: the typed answer against the band round the flight's (or the
 * design's) value; a percentage band moves with that value too.
 */
function nearAnswerBound(c: { tol?: number; tolPct?: number }, v: number, tol: number, expected?: number | null): number | null {
  if (expected === null || expected === undefined) return null;
  const band = Math.max(c.tol ?? 0, c.tolPct !== undefined ? Math.abs(expected) * c.tolPct / 100 : 0);
  const slack = tol * (1 + (c.tolPct ?? 0) / 100);
  if (Math.abs(Math.abs(v - expected) - band) <= slack) return v > expected ? expected + band : expected - band;
  return null;
}

/** The bound `v` lies within `tol` of, when there is one; else null. */
function nearBound(c: Criterion, v: number | null | undefined, tol: number, target: number | null, expected?: number | null): number | null {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  const near = (b: number | undefined | null): number | null => (b !== undefined && b !== null && Math.abs(v - b) <= tol ? b : null);
  switch (c.kind) {
    case 'measure': {
      const hit = near(c.min) ?? near(c.max);
      if (hit !== null) return hit;
      if (c.target !== undefined && target !== null) {
        const band = c.tol ?? 0;
        if (near(target - band) !== null) return target - band;
        if (near(target + band) !== null) return target + band;
      }
      return null;
    }
    case 'answer': return nearAnswerBound(c, v, tol, expected);
    case 'hook':
      if (c.hook === 'stableOrbit') return near(typeof c.params?.minPerigeeKm === 'number' ? c.params.minPerigeeKm : 150);
      return null;
    default:
      return null;
  }
}

const within = (a: number | null | undefined, b: number | null | undefined, tol: number): boolean =>
  (a === null || a === undefined) ? (b === null || b === undefined) : (b !== null && b !== undefined && Math.abs(a - b) <= tol);

/** The tolerance a criterion's value is held to, in its unit; null for a criterion judged by its state alone. */
export function criterionTolerance(c: Criterion): number | null {
  switch (c.kind) {
    case 'measure': case 'answer': return ENGINE_TOLERANCE[c.measure];
    case 'event': return EVENT_TIME_TOLERANCE;
    case 'hook': return HOOK_TOLERANCE[c.hook] ?? 0;
    default: return null;
  }
}

/** One criterion held to its record. `target` is what a `target: 'mission'` bound stands for on the re-flown flight. */
export function checkCriterion(c: Criterion, recorded: CriterionGrade | null, rechecked: CriterionGrade | null, target: number | null): CriterionCheck {
  const base = {
    id: c.id, kind: c.kind,
    ...(c.kind === 'measure' || c.kind === 'answer' ? { measure: c.measure } : {}),
    ...(c.kind === 'hook' ? { hook: c.hook } : {}),
    ...(c.kind === 'event' ? { event: c.key } : {}),
    recorded, rechecked,
  };
  const tol = criterionTolerance(c);
  if (!recorded || !rechecked) return { ...base, tol, status: 'differs' };
  const sameState = recorded.state === rechecked.state && !!recorded.revealed === !!rechecked.revealed;
  if (tol === null) return { ...base, tol, status: sameState ? 'match' : 'differs' };
  // an answer's value is the typed number, the same on both sides; what was flown is its expected value
  const valuesAgree = c.kind === 'answer'
    ? within(recorded.value, rechecked.value, 0) && within(recorded.expected, rechecked.expected, tol)
    : within(recorded.value, rechecked.value, tol);
  if (!valuesAgree) return { ...base, tol, status: 'differs' };
  const bound = c.kind === 'answer'
    ? nearBound(c, rechecked.value, tol, target, rechecked.expected) ?? nearBound(c, recorded.value, tol, target, recorded.expected)
    : nearBound(c, rechecked.value, tol, target) ?? nearBound(c, recorded.value, tol, target);
  if (bound !== null) return { ...base, tol, status: 'borderline', bound };
  return { ...base, tol, status: sameState ? 'match' : 'differs' };
}

/** The flight of a record flown again, as far as it was graded; or why it cannot be. */
export function reflyRecord(lesson: Lesson, record: LessonRecord): { sim: Simulation; grade: LessonGrade; steps: number; lateActions: number } | { reason: CannotReason } {
  if (!record.mission) return { reason: 'noMission' };
  const parsed = parseMissionDocument(record.mission, defaultMissionState());
  if (!parsed.usable || parsed.issues.some((i) => i.code !== 'newerVersion')) return { reason: 'mission' };
  const cfg = missionConfigFromState(parsed.state);
  if (cfg.dynamics?.model === 'sixDof') return { reason: 'sixDof' };
  // a record from before T02 has no journal: it is flown without commands, and says it lacks one (`missing`)
  const actions: FlightAction[] | null = record.actions === undefined ? [] : readActions(record.actions);
  if (!actions) return { reason: 'actions' };
  const until = typeof record.t === 'number' && Number.isFinite(record.t) ? record.t : null;
  const sim = new Simulation(cfg, { headless: true });
  let next = 0, steps = 0, lateActions = 0;
  for (;;) {
    // the commands the live flight took at this boundary, in the order it took them
    while (next < actions.length && actions[next].t <= sim.state.t + SAME_T) {
      if (actions[next].t < sim.state.t - SAME_T) lateActions++;
      applyAction(sim, actions[next++]);
    }
    if (until !== null ? sim.state.t >= until - SAME_T : next >= actions.length && flightEnded(lesson, sim)) break;
    if (steps >= MAX_REFLY_STEPS || sim.state.t > MAX_REFLY_T) return { reason: 'notReached' };
    const before = sim.state.t;
    sim.step(sim.suggestedDt());
    steps++;
    // a flight that has stopped (lost) before the time it was graded at never gets there
    if (!(sim.state.t > before)) {
      if (until === null) break;
      return { reason: 'notReached' };
    }
  }
  const answers = record.answers ?? {};
  let grade = gradeShown(lesson, sim, typeof record.clock === 'number' ? record.clock : sim.state.t, answers);
  // the answers the student had been shown pass only with help, as the page marked them (owner decision D-6)
  const shown = new Set(record.revealed ?? []);
  if (shown.size) {
    const revealed: Record<string, number[]> = {};
    for (const g of grade.criteria) if (shown.has(g.id) && typeof g.expected === 'number') revealed[g.id] = [g.expected];
    grade = regradeAnswers(lesson, grade, answers, revealed as RevealedAnswers);
  }
  return { sim, grade, steps, lateActions };
}

const RANK: Record<CheckStatus, number> = { match: 0, borderline: 1, differs: 2, cannotRefly: 3 };

/** A record whose fields are not what a record's are (edited by hand): it cannot be flown again, and says so. */
function unreadableRecord(job: RecheckJob): RecordCheck {
  const r = job.record;
  return {
    file: job.file, student: job.student, lessonId: job.lessonId, which: job.which, at: r.at, kind: 'flight', status: 'cannotRefly', reason: 'error',
    missing: [], sameBuild: null, app: typeof r.app === 'string' ? r.app : null, recordedVerdict: r.verdict, recheckedVerdict: null,
    lockBroken: [], criteria: [], flownTo: null, steps: 0, lateActions: 0,
  };
}

// ─── design lessons (T01, T02) ──────────────────────────────────────────────

/** The bound a design figure lies within the engine tolerance of, when there is one; else null. */
function nearDesignBound(c: DesignCriterion, v: number | null | undefined, tol: number, expected?: number | null): number | null {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  if (c.kind === 'answer') return nearAnswerBound(c, v, tol, expected);
  const near = (b: number | undefined): number | null => (b !== undefined && Math.abs(v - b) <= tol ? b : null);
  return near(c.min) ?? near(c.max) ?? (c.target !== undefined ? near(c.target - (c.tol ?? 0)) ?? near(c.target + (c.tol ?? 0)) : null);
}

/**
 * One design criterion held to its record: the figure (an answer's: the
 * figure it asks for; the typed number must be the same) within the design
 * engine tolerance, borderline within it of a bound — for `sat.disposal25y`,
 * a lifetime within 0.1 % of the 25-year limit (`values`, `limit`: the
 * re-check's key).
 */
export function checkDesignCriterion(c: DesignCriterion, recorded: CriterionGrade | null, rechecked: CriterionGrade | null, key?: DesignKey): CriterionCheck {
  const base = { id: c.id, kind: c.kind, measure: c.measure, recorded, rechecked };
  if (!recorded || !rechecked) return { ...base, tol: null, status: 'differs' };
  const sameState = recorded.state === rechecked.state && !!recorded.revealed === !!rechecked.revealed;
  const answer = c.kind === 'answer';
  const ra = answer ? recorded.expected : recorded.value, rb = answer ? rechecked.expected : rechecked.value;
  const tol = designTolerance(c.measure, ra, rb);
  const valuesAgree = (answer ? within(recorded.value, rechecked.value, 0) : true) && within(ra, rb, tol);
  if (!valuesAgree) return { ...base, tol, status: 'differs' };
  // a yes or a no is never near its bound itself: the lifetime it is read from is (below)
  const flag = DESIGN_MEASURES[c.measure].kind === 'flag';
  let bound = flag ? null : answer ? nearDesignBound(c, rechecked.value, tol, rechecked.expected) ?? nearDesignBound(c, recorded.value, tol, recorded.expected)
    : nearDesignBound(c, rb, tol) ?? nearDesignBound(c, ra, tol);
  if (bound === null && c.measure === 'sat.disposal25y' && key?.disposalLimit !== undefined) {
    const life = key.values['sat.lifetime'];
    const limit = key.disposalLimit;
    if (typeof life === 'number' && !key.lifetimeCapped && Math.abs(life - limit) <= DESIGN_ENGINE_TOLERANCE.lifetime.rel! * limit) bound = limit;
  }
  if (bound !== null) return { ...base, tol, status: 'borderline', bound };
  return { ...base, tol, status: sameState ? 'match' : 'differs' };
}

/**
 * A design record worked out again (T02 for designs; map §4.2): the record's
 * design at the record's design date and ECSS level, through the same
 * `designFigures` and lifetime run the page graded it with
 * (src/design/design-lesson-key.ts; the lifetime flown here, `lifetimeNow`),
 * graded with the instructor's lesson, and each criterion held to the record
 * within `DESIGN_ENGINE_TOLERANCE`. A date or a level that is not the
 * lesson's says the record is not of the lesson the instructor has: it
 * differs, whatever the figures.
 */
function checkDesignRecord(lesson: DesignLesson, r: LessonRecord, out: RecordCheck): RecordCheck {
  const missing = missingDesignFields(r);
  const base: RecordCheck = { ...out, kind: 'design', missing };
  if (!r.design) return { ...base, reason: 'noDesign' };
  const designDate = typeof r.designDate === 'string' ? r.designDate : lesson.designDate;
  const level = r.level === 'low' || r.level === 'moderate' || r.level === 'high' ? r.level : lesson.level;
  const mismatch = [...(designDate !== lesson.designDate ? ['designDate' as const] : []), ...(level !== lesson.level ? ['level' as const] : [])];
  const start = designLessonStart(lesson.start);
  const values = designValuesNow(r.design, { ...designLessonOptions(lesson), date: designDate, level }, lifetimeNow);
  const key: DesignKey = { ...values, lockBroken: brokenDesignLocks(lesson.locked, start, r.design) };
  // the answers the student had been shown pass only with help, as the page marked them (owner decision D-6)
  const shown = new Set(r.revealed ?? []);
  const revealed: Record<string, number[]> = {};
  for (const c of lesson.criteria) {
    const v = key.values[c.measure];
    if (c.kind === 'answer' && shown.has(c.id) && typeof v === 'number') revealed[c.id] = [v];
  }
  const grade = gradeDesign(lesson, key, r.answers ?? {}, revealed);
  const criteria: CriterionCheck[] = lesson.criteria.map((c) =>
    checkDesignCriterion(c, r.criteria.find((g) => g.id === c.id) ?? null, grade.criteria.find((g) => g.id === c.id) ?? null, key));
  for (const g of r.criteria) if (!lesson.criteria.some((c) => c.id === g.id)) criteria.push({ id: g.id, kind: 'missing', recorded: g, rechecked: null, tol: null, status: 'differs' });
  let status: CheckStatus = criteria.reduce<CheckStatus>((worst, c) => (RANK[c.status] > RANK[worst] ? c.status : worst), 'match');
  if (grade.verdict !== r.verdict && status === 'match') status = 'differs';
  // every build that hands a design in keeps all its fields, and the lesson's date and level: one lacking or other was edited
  if ((missing.length || mismatch.length) && RANK[status] < RANK.differs) status = 'differs';
  return {
    ...base, status, designDate, level, ...(mismatch.length ? { mismatch } : {}),
    recheckedVerdict: grade.verdict, lockBroken: grade.lockBroken, criteria,
  };
}

/** Check one record against the catalogue (the built-in lessons and the instructor's). */
export function checkRecord(job: RecheckJob, catalogue: readonly CatalogLesson[], app = appBuildId()): RecordCheck {
  const r = job.record;
  const lesson = catalogue.find((l) => l.id === job.lessonId);
  const kind: RecordCheck['kind'] = r.caseData || (lesson && isCaseLesson(lesson)) ? 'case'
    : r.design !== undefined || (lesson && isDesignLesson(lesson)) ? 'design' : 'flight';
  const out: RecordCheck = {
    file: job.file, student: job.student, lessonId: job.lessonId, which: job.which, at: r.at, kind,
    status: 'cannotRefly', missing: kind === 'flight' ? missingFields(r) : kind === 'design' ? missingDesignFields(r) : [],
    sameBuild: typeof r.app === 'string' ? r.app === app : null, app: typeof r.app === 'string' ? r.app : null,
    recordedVerdict: r.verdict, recheckedVerdict: null, lockBroken: [],
    criteria: r.criteria.map((g) => ({ id: g.id, kind: 'missing', recorded: g, rechecked: null, tol: null, status: 'cannotRefly' as const })),
    flownTo: null, steps: 0, lateActions: 0,
  };
  if (kind === 'case') return { ...out, reason: 'caseLesson' };
  if (kind === 'design') {
    if (!lesson || !isDesignLesson(lesson)) return { ...out, reason: 'noLesson' };
    try { return checkDesignRecord(lesson, r, out); } catch { return { ...out, reason: 'error' }; }
  }
  if (!lesson || !isFlightLesson(lesson)) return { ...out, reason: 'noLesson' };
  let flown: ReturnType<typeof reflyRecord>;
  try { flown = reflyRecord(lesson, r); } catch { return { ...out, reason: 'error' }; }
  if ('reason' in flown) return { ...out, reason: flown.reason };
  const { sim, grade } = flown;
  // flown on past the time it was graded at, a whole step or more: graded at another moment than the record
  const offTime = typeof r.t === 'number' && Math.abs(sim.state.t - r.t) > EVENT_TIME_TOLERANCE;
  const criteria: CriterionCheck[] = lesson.criteria.map((c) => {
    const recorded = r.criteria.find((g) => g.id === c.id) ?? null;
    const rechecked = grade.criteria.find((g) => g.id === c.id) ?? null;
    const target = c.kind === 'measure' && c.target !== undefined ? (c.target === 'mission' ? missionTarget(sim, c.measure) : c.target) : null;
    return checkCriterion(c, recorded, rechecked, target);
  });
  // a criterion the record has and the instructor's lesson does not: the lesson is not the one the student had
  for (const g of r.criteria) if (!lesson.criteria.some((c) => c.id === g.id)) criteria.push({ id: g.id, kind: 'missing', recorded: g, rechecked: null, tol: null, status: 'differs' });
  let status: CheckStatus = criteria.reduce<CheckStatus>((worst, c) => (RANK[c.status] > RANK[worst] ? c.status : worst), 'match');
  if (grade.verdict !== r.verdict && status === 'match') status = 'differs';
  if (offTime && RANK[status] < RANK.differs) status = 'differs';
  // a record made before T02 is flown as near as it can be: a difference is not evidence of an edit. One
  // that names its build was made by T02 or later, which keeps all four fields: lacking one, it was edited.
  const incomplete = status === 'differs' && out.missing.includes('app') && out.missing.some((f) => f === 't' || f === 'clock' || f === 'actions');
  return {
    ...out, status: incomplete ? 'cannotRefly' : status, ...(incomplete ? { reason: 'incomplete' as const } : {}),
    recheckedVerdict: grade.verdict, lockBroken: grade.lockBroken, criteria,
    flownTo: sim.state.t, steps: flown.steps, lateActions: flown.lateActions,
  };
}

export interface CheckOptions {
  /** once the files are read and their checksums checked, before the first record is flown */
  onFiles?(files: readonly FileCheck[], total: number): void;
  /** after each record: the record's check, how many are done, of how many */
  onRecord?(record: RecordCheck, done: number, total: number): void;
  /** after each record: how many are done, of how many */
  onProgress?(done: number, total: number): void;
  /** asked between records; true stops the check where it is */
  stopped?(): boolean;
  /** awaited between records, to let a page draw (the inline fallback) */
  pause?(): Promise<void>;
  /** the build to compare the records' with (this one's) */
  app?: string;
}

/** Check every record in the files: their checksums, then each record flown again. */
export async function checkResults(input: RecheckInput, opts: CheckOptions = {}): Promise<ResultsCheck> {
  const app = opts.app ?? appBuildId();
  const { files, jobs } = collectRecords(input.results, input.names);
  for (const f of files) {
    if (!f.readable) continue;
    try { f.checksum = await verifyResults(input.results[f.index] as ResultsFile); } catch { f.checksum = false; }
  }
  const catalogue = allLessons(input.lessons ?? []);
  const records: RecordCheck[] = [];
  let stopped = false;
  opts.onFiles?.(files, jobs.length);
  opts.onProgress?.(0, jobs.length);
  for (const job of jobs) {
    if (opts.stopped?.()) { stopped = true; break; }
    // one record a file mangled (a criterion that is not one) is said, not the end of the class's check
    let record: RecordCheck;
    try { record = checkRecord(job, catalogue, app); } catch { record = unreadableRecord(job); }
    records.push(record);
    opts.onRecord?.(record, records.length, jobs.length);
    opts.onProgress?.(records.length, jobs.length);
    await opts.pause?.();
  }
  return { app, files, records, stopped };
}

/** How many records came out each way. */
export function statusCounts(check: ResultsCheck): Record<CheckStatus, number> {
  const n: Record<CheckStatus, number> = { match: 0, borderline: 0, differs: 0, cannotRefly: 0 };
  for (const r of check.records) n[r.status]++;
  return n;
}

// ─── the check as a spreadsheet ─────────────────────────────────────────────

/** A cell: quoted when it holds a separator, a quote or a line break; a leading =, +, - or @ is kept as text (no formula). */
const csvText = (v: string): string => {
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
/** A measure's unit, a flight's (`MEASURES`) or a design's (`DESIGN_MEASURES`). */
export const measureUnit = (m: MeasureId | DesignMeasureId): string => (m in MEASURES ? MEASURES[m as MeasureId].unit : DESIGN_MEASURES[m as DesignMeasureId].unit);
const num = (v: number | null | undefined): string => (v === null || v === undefined || !Number.isFinite(v) ? '' : String(v));
const STATUS_CSV: Record<CheckStatus, string> = { match: 'match', borderline: 'borderline', differs: 'differs', cannotRefly: 'cannot_refly' };

/**
 * One row per criterion of each record (one row for a record with none), in
 * SI-style columns with the unit in its own column, as the app's other CSV
 * files. The student's name is the one the file carries; the file stays on
 * this device unless the instructor sends it on.
 */
export function recheckCsv(check: ResultsCheck): string {
  const head = ['file', 'student', 'lesson', 'record', 'graded_at', 'record_status', 'reason', 'recorded_verdict', 'recheck_verdict', 'missing_fields',
    'same_build', 'build', 'checksum_ok', 'flown_to_s', 'criterion', 'criterion_kind', 'measure', 'unit', 'recorded_value', 'recheck_value',
    'recorded_expected', 'recheck_expected', 'tolerance', 'bound', 'criterion_status'];
  const rows: string[] = [head.join(',')];
  for (const r of check.records) {
    const file = check.files[r.file];
    const lead = [csvText(file?.name ?? String(r.file + 1)), csvText(r.student ?? ''), csvText(r.lessonId), r.which.join('+'), csvText(r.at), STATUS_CSV[r.status],
      // the recorded verdict is the file's text, as the name is: a hand-edited file could put anything there
      r.reason ?? '', csvText(r.recordedVerdict), r.recheckedVerdict ?? '', r.missing.join(' '), r.sameBuild === null ? '' : r.sameBuild ? '1' : '0', csvText(r.app ?? ''),
      file?.checksum === null || file?.checksum === undefined ? '' : file.checksum ? '1' : '0', num(r.flownTo)];
    if (!r.criteria.length) { rows.push([...lead, '', '', '', '', '', '', '', '', '', '', STATUS_CSV[r.status]].join(',')); continue; }
    for (const c of r.criteria) {
      const unit = c.measure ? measureUnit(c.measure) : c.kind === 'event' ? 's' : '';
      rows.push([...lead, csvText(c.id), c.kind, csvText(c.measure ?? c.hook ?? c.event ?? ''), csvText(unit), num(c.recorded?.value), num(c.rechecked?.value),
        num(c.recorded?.expected), num(c.rechecked?.expected), num(c.tol), num(c.bound), STATUS_CSV[c.status]].join(','));
    }
  }
  return `${rows.join('\n')}\n`;
}
