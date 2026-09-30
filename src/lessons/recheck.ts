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
 *   lesson file is not the one the student had;
 * - **cannot re-fly**: a case lesson (no flight), a six-DOF flight (minutes
 *   each: not re-flown), a lesson this checker does not have, a mission or a
 *   journal that does not read, a flight that never reaches the time it was
 *   graded at — or a record made before T02 (no grading time, instant on
 *   screen or journal) whose re-fly came out different: it is flown to the
 *   first step the flight has ended at, which can be a step before the grade
 *   was taken (13.75 s on lesson 1.1, where the speed then read moves by
 *   0.02 m/s), and without its commands, so a difference says nothing about
 *   an edit (`incomplete`). One that comes out the same is a match.
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
import { RESULTS_FORMAT, missingFields, verifyResults, type LessonProgress, type LessonRecord, type RecheckField, type ResultsFile } from './progress';
import { isCaseLesson, type CatalogLesson, type Criterion, type CriterionGrade, type Lesson, type LessonGrade, type LockKey, type MeasureId } from './types';

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
 * A hook's value, in its own unit: the crew's peak load (g, as `abort.maxG`),
 * the perigee (km), a run's number (exact). A hook with no value is its state.
 */
export const HOOK_TOLERANCE: Readonly<Record<string, number>> = { crewSafe: 1e-4, stableOrbit: 0.01, dispersedRun: 0 };

/** Longest re-fly, s of mission time, and most steps: a flight that runs on past these never reaches its grade. */
const MAX_REFLY_T = 30 * 86400;
const MAX_REFLY_STEPS = 2_000_000;
/** Step boundaries are compared to a nanosecond: a journal written as JSON reads back to the same double. */
const SAME_T = 1e-9;

export type CheckStatus = 'match' | 'borderline' | 'differs' | 'cannotRefly';
export type CannotReason = 'caseLesson' | 'noLesson' | 'noMission' | 'mission' | 'sixDof' | 'actions' | 'notReached' | 'incomplete' | 'error';
export type Which = 'passed' | 'last';
export const CHECK_STATUSES: readonly CheckStatus[] = ['match', 'borderline', 'differs', 'cannotRefly'];

/** One criterion, as recorded and as re-checked. */
export interface CriterionCheck {
  id: string;
  kind: Criterion['kind'] | 'missing';
  measure?: MeasureId;
  hook?: string;
  event?: string;
  recorded: CriterionGrade | null;
  rechecked: CriterionGrade | null;
  /** the tolerance the values were held to, in their unit; null for a state alone */
  tol: number | null;
  status: CheckStatus;
  /** borderline: the bound the value lies near, in its unit */
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
  kind: 'flight' | 'case';
  status: CheckStatus;
  reason?: CannotReason;
  /** the fields an exact re-check needs that the record lacks (a record made before T02) */
  missing: RecheckField[];
  /** whether it was flown on this build; null when the record does not say */
  sameBuild: boolean | null;
  /** the build the record says it was flown on */
  app: string | null;
  recordedVerdict: LessonRecord['verdict'];
  /** the re-grade, when the flight was flown again */
  recheckedVerdict: LessonGrade['verdict'] | null;
  lockBroken: LockKey[];
  criteria: CriterionCheck[];
  /** the mission time flown to, s, and in how many steps */
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
    case 'answer': {
      if (expected === null || expected === undefined) return null;
      // the typed answer against the band round the flight's value; a percentage band moves with that value too
      const band = Math.max(c.tol ?? 0, c.tolPct !== undefined ? Math.abs(expected) * c.tolPct / 100 : 0);
      const slack = tol * (1 + (c.tolPct ?? 0) / 100);
      if (Math.abs(Math.abs(v - expected) - band) <= slack) return v > expected ? expected + band : expected - band;
      return null;
    }
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

/** Check one record against the catalogue (the built-in lessons and the instructor's). */
export function checkRecord(job: RecheckJob, catalogue: readonly CatalogLesson[], app = appBuildId()): RecordCheck {
  const r = job.record;
  const lesson = catalogue.find((l) => l.id === job.lessonId);
  const kind: RecordCheck['kind'] = r.caseData || (lesson && isCaseLesson(lesson)) ? 'case' : 'flight';
  const out: RecordCheck = {
    file: job.file, student: job.student, lessonId: job.lessonId, which: job.which, at: r.at, kind,
    status: 'cannotRefly', missing: kind === 'flight' ? missingFields(r) : [],
    sameBuild: typeof r.app === 'string' ? r.app === app : null, app: typeof r.app === 'string' ? r.app : null,
    recordedVerdict: r.verdict, recheckedVerdict: null, lockBroken: [],
    criteria: r.criteria.map((g) => ({ id: g.id, kind: 'missing', recorded: g, rechecked: null, tol: null, status: 'cannotRefly' as const })),
    flownTo: null, steps: 0, lateActions: 0,
  };
  if (kind === 'case') return { ...out, reason: 'caseLesson' };
  if (!lesson || isCaseLesson(lesson)) return { ...out, reason: 'noLesson' };
  let flown: ReturnType<typeof reflyRecord>;
  try { flown = reflyRecord(lesson, r); } catch { return { ...out, reason: 'error' }; }
  if ('reason' in flown) return { ...out, reason: flown.reason };
  const { sim, grade } = flown;
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
  // a record made before T02 is flown as near as it can be: a difference is not evidence of an edit
  const incomplete = status === 'differs' && out.missing.some((f) => f === 't' || f === 'clock' || f === 'actions');
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
    const record = checkRecord(job, catalogue, app);
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
      r.reason ?? '', r.recordedVerdict, r.recheckedVerdict ?? '', r.missing.join(' '), r.sameBuild === null ? '' : r.sameBuild ? '1' : '0', csvText(r.app ?? ''),
      file?.checksum === null || file?.checksum === undefined ? '' : file.checksum ? '1' : '0', num(r.flownTo)];
    if (!r.criteria.length) { rows.push([...lead, '', '', '', '', '', '', '', '', '', '', STATUS_CSV[r.status]].join(',')); continue; }
    for (const c of r.criteria) {
      const unit = c.measure ? MEASURES[c.measure].unit : c.kind === 'event' ? 's' : '';
      rows.push([...lead, csvText(c.id), c.kind, csvText(c.measure ?? c.hook ?? c.event ?? ''), csvText(unit), num(c.recorded?.value), num(c.rechecked?.value),
        num(c.recorded?.expected), num(c.rechecked?.expected), num(c.tol), num(c.bound), STATUS_CSV[c.status]].join(','));
    }
  }
  return `${rows.join('\n')}\n`;
}
