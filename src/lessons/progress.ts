/**
 * A student's progress through the lessons and the placement test (roadmap
 * E03), kept in the browser's storage and exported as a results file for the
 * teacher. DOM-free: the storage is passed in, so the tests use a map.
 *
 * The results file carries a SHA-256 checksum of its contents. It shows a file
 * was not edited by accident; it is not a signature, and does not claim to be.
 */
import { missionDocument, type MissionDocument, type MissionState } from '../config/mission-file';
import { satelliteById } from '../data/satellites';
import type { MissionConfig } from '../types';
import type { AssessmentAttempt, Question } from './assessment/types';
import { CZ5B_CASE_STAGE, type CaseId } from '../worksheets/case-ids';
import { CZ5B_STAGES } from '../data/cz5b';
import type { CaseSource } from '../worksheets/cases';
import type { Activity, DailyActivity } from '../physics/propagator/activity';
import type { Worksheet } from '../worksheets/types';
import type { CatalogLesson, CriterionGrade, LessonGrade } from './types';

export const PROGRESS_STORAGE_KEY = 'orbitlab.lessons';
export const RESULTS_FORMAT = 'orbitlab.results';
export const RESULTS_FILE_EXTENSION = '.orbitlab-results.json';

export interface KeyValueStore { getItem(key: string): string | null; setItem(key: string, value: string): void }

/** One graded flight of a lesson, or one check of a case lesson's answers. */
export interface LessonRecord {
  at: string;
  verdict: LessonGrade['verdict'];
  criteria: CriterionGrade[];
  answers: Record<string, number>;
  hintsShown: number;
  /** the mission as it was flown (a flight lesson's) */
  mission?: MissionDocument;
  /**
   * A case lesson's inputs, frozen when it opened: the answers depend on
   * THEOS-2's element set (its epoch) and the Sun's activity (the last day
   * of it measured or forecast), so the teacher can see which were used.
   */
  caseData?: CaseRecordData;
  /** the answers shown to the student in this attempt, by criterion id: the attempt did not pass on them */
  revealed?: string[];
}

export interface CaseRecordData {
  case: CaseId;
  theos2Epoch?: string;
  activityTo?: string;
  /** Optional for old results; new records keep the complete inputs and exact generated sheet/key. */
  snapshot?: { version: 1; generatedAt: string; source: CaseSource; worksheet: Worksheet };
}

/** Keep the input horizon, independently of the predicted answer (reentry.ts defaults to 365 days). */
function frozenCz5bActivity(activity: Activity): Activity {
  if (!('from' in activity)) return structuredClone(activity);
  // OMM epochs have no suffix but are UTC, never the browser's local time.
  const epochText = CZ5B_STAGES.find((stage) => stage.name === CZ5B_CASE_STAGE)!.elements.EPOCH;
  const epoch = Date.parse(epochText.endsWith('Z') ? epochText : `${epochText}Z`) / 86400000 + 2440587.5;
  const through = epoch + 365;
  // Clamp both endpoints: a series wholly before/after the run must still
  // retain its boundary value. Preserve the already computed 81-day means.
  const at = (jd: number) => Math.max(0, Math.min(activity.f107.length - 1, Math.floor(jd - activity.from)));
  const first = at(epoch), last = at(through);
  const slice = (values: number[]) => values.slice(first, last + 1);
  return {
    from: activity.from + first,
    f107: slice(activity.f107), f107a: slice(activity.f107a), ap: slice(activity.ap),
  } satisfies DailyActivity;
}

function frozenCaseSource(id: CaseId, source: CaseSource): CaseSource {
  if (id === 'cz5b') return {
    activity: frozenCz5bActivity(source.activity), theos2: null,
    ...(source.activityTo ? { activityTo: source.activityTo } : {}),
  };
  if (id === 'theos2') return { activity: { f107: 0, f107a: 0, ap: 0 }, theos2: structuredClone(source.theos2) };
  return { activity: { f107: 0, f107a: 0, ap: 0 }, theos2: null };
}

/** Copy the opened case, not the live catalogue: later updates cannot rewrite this evidence. */
export function frozenCaseData(id: CaseId, source: CaseSource, worksheet: Worksheet, generatedAt: Date): CaseRecordData {
  const theos2Epoch = id === 'theos2' && source.theos2
    ? new Date((source.theos2.jdEpoch + source.theos2.jdEpochFrac - 2440587.5) * 86400e3).toISOString() : null;
  return {
    case: id,
    ...(theos2Epoch ? { theos2Epoch } : {}),
    ...(id === 'cz5b' && source.activityTo ? { activityTo: source.activityTo } : {}),
    snapshot: { version: 1, generatedAt: generatedAt.toISOString(), source: frozenCaseSource(id, source), worksheet: structuredClone(worksheet) },
  };
}

export interface LessonProgress {
  /** flights launched in the lesson; for a case lesson, the answers checked */
  attempts: number;
  /** hints revealed, 0–3 */
  hintsShown: number;
  passed: boolean;
  /** the first flight that passed */
  passedRecord?: LessonRecord;
  /** the last flight graded */
  last?: LessonRecord;
  /**
   * Expected values shown with "Show the answers", by criterion id: a number
   * shown is never a pass again (src/lessons/grader.ts `RevealedAnswers`).
   */
  revealed?: Record<string, number[]>;
}

export interface ProgressData {
  version: 1;
  lessons: Record<string, LessonProgress>;
  assessments: AssessmentAttempt[];
  /** a teacher's lessons and questions, opened from a file and kept */
  customLessons: CatalogLesson[];
  customQuestions: Question[];
}

/**
 * The mission a lesson's flight flew, as a document (audit 2026-09-27 A11):
 * what the simulation was given, not the lesson's mission with the student's
 * edits dropped. `cfg.guidance` is the guidance already merged with the
 * vehicle's defaults, and is kept whole, so the document flies the same
 * guidance even if a later Orbitlab changes those defaults. The docking
 * profile, the pad and a custom vehicle go with it.
 */
export function flownMission(cfg: MissionConfig): MissionDocument {
  const state: MissionState = {
    vehicleId: cfg.vehicleId, satelliteId: cfg.satelliteId, siteId: cfg.siteId, orbitId: 'custom', orbit: { ...cfg.orbit },
    launchTime: new Date(cfg.launchTime.getTime()), guidanceOverrides: { ...cfg.guidance }, failure: { ...cfg.failure },
    boosterRecovery: cfg.boosterRecovery,
    // what the simulation flew: the override, else the payload's own mass
    payloadMass: cfg.payloadMassOverride ?? satelliteById(cfg.satelliteId).mass,
    ...(cfg.vehicleSpec ? { vehicleSpec: cfg.vehicleSpec } : {}),
    ...(cfg.recoveryPlan ? { recoveryPlan: cfg.recoveryPlan } : {}),
    ...(cfg.dynamics ? { dynamics: cfg.dynamics } : {}),
    ...(cfg.padId ? { padId: cfg.padId } : {}),
    ...(cfg.rendezvous ? { rendezvous: cfg.rendezvous } : {}),
  };
  // the document copies every nested object: nothing is shared with the flight
  return missionDocument(state);
}

export const emptyProgress = (): ProgressData => ({ version: 1, lessons: {}, assessments: [], customLessons: [], customQuestions: [] });

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

// Keep malformed source bytes out of the public/exported progress schema. A
// repair may be saved only after the original has been preserved separately.
// null means storage could not even be read: it must not be overwritten.
const recoverySource = new WeakMap<ProgressData, string | null>();
const recovering = (data: ProgressData, raw: string | null): ProgressData => {
  recoverySource.set(data, raw);
  return data;
};

function readLessonProgress(value: unknown): LessonProgress {
  if (!isRecord(value)) return { attempts: 0, hintsShown: 0, passed: false };
  const count = (n: unknown): number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : 0;
  // Leave old records (including ones without frozen snapshots) intact.
  const out = { ...value, attempts: count(value.attempts), hintsShown: Math.min(3, count(value.hintsShown)), passed: value.passed === true } as LessonProgress;
  if (value.revealed !== undefined) {
    out.revealed = isRecord(value.revealed)
      ? Object.fromEntries(Object.entries(value.revealed).map(([id, values]) => [id, Array.isArray(values)
        ? values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)) : []]))
      : {};
  }
  return out;
}

export function loadProgress(store?: KeyValueStore): ProgressData {
  let raw: string | null = null;
  try {
    raw = (store ?? localStorage).getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return emptyProgress();
    const data = JSON.parse(raw) as unknown;
    if (!isRecord(data) || data.version !== 1) return recovering(emptyProgress(), raw);
    const loaded: ProgressData = {
      version: 1,
      lessons: isRecord(data.lessons) ? Object.fromEntries(Object.entries(data.lessons).map(([id, value]) => [id, readLessonProgress(value)])) : {},
      assessments: Array.isArray(data.assessments) ? data.assessments as AssessmentAttempt[] : [],
      customLessons: Array.isArray(data.customLessons) ? data.customLessons as CatalogLesson[] : [],
      customQuestions: Array.isArray(data.customQuestions) ? data.customQuestions as Question[] : [],
    };
    return JSON.stringify(loaded) === JSON.stringify(data) ? loaded : recovering(loaded, raw);
  } catch {
    return recovering(emptyProgress(), raw);
  }
}

/**
 * Keep the progress in the browser's storage. Storage is optional — without
 * it the progress lasts the tab — but the page has to say so (audit
 * 2026-09-27 A19), so this returns whether it was kept: false in a private
 * window that refuses storage, or when the storage is full.
 */
export function saveProgress(data: ProgressData, store?: KeyValueStore): boolean {
  try {
    const target = store ?? localStorage;
    if (recoverySource.has(data)) {
      const raw = recoverySource.get(data);
      if (raw == null) return false;
      // Never replace an older recovery copy. If backup fails (e.g. quota),
      // the original active record stays untouched and the UI reports failure.
      const base = `${PROGRESS_STORAGE_KEY}.recovery`;
      let key = base, suffix = 0, previous = target.getItem(key);
      while (previous !== null && previous !== raw) {
        key = `${base}.${++suffix}`;
        previous = target.getItem(key);
      }
      if (previous !== raw) target.setItem(key, raw);
    }
    target.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data));
    recoverySource.delete(data);
    return true;
  } catch {
    return false;
  }
}

export function lessonProgress(data: ProgressData, id: string): LessonProgress {
  return (data.lessons[id] ??= { attempts: 0, hintsShown: 0, passed: false });
}

/** Keep a graded flight: the last one always, the first pass for good. */
export function recordGrade(data: ProgressData, record: LessonRecord & { lessonId: string }): void {
  const { lessonId, ...rec } = record;
  const p = lessonProgress(data, lessonId);
  p.last = rec;
  if (rec.verdict === 'pass' && !p.passed) { p.passed = true; p.passedRecord = rec; }
}

/** Keep the expected values shown to the student, so none of them passes later. */
export function recordRevealed(data: ProgressData, lessonId: string, shown: Readonly<Record<string, number>>): void {
  const p = lessonProgress(data, lessonId);
  const kept = (p.revealed ??= {});
  for (const [id, v] of Object.entries(shown)) {
    if (!Number.isFinite(v)) continue;
    const list = (kept[id] ??= []);
    if (!list.includes(v)) list.push(v);
  }
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface ResultsFile {
  format: typeof RESULTS_FORMAT;
  version: 1;
  exportedAt: string;
  /** the student's name, as typed on export (optional) */
  student?: string;
  progress: Omit<ProgressData, 'customLessons' | 'customQuestions'>;
  /** the placement tests' scores, worked out when exported */
  summary?: unknown;
  checksum: string;
}

/** The contents a checksum is taken over: everything but the checksum. */
const checksumBody = (f: Omit<ResultsFile, 'checksum'>): string => JSON.stringify([f.format, f.version, f.exportedAt, f.student ?? null, f.progress, f.summary ?? null]);

export async function resultsFile(data: ProgressData, exportedAt: Date, student?: string, summary?: unknown): Promise<ResultsFile> {
  const body: Omit<ResultsFile, 'checksum'> = {
    format: RESULTS_FORMAT, version: 1, exportedAt: exportedAt.toISOString(),
    ...(student ? { student } : {}),
    progress: { version: 1, lessons: data.lessons, assessments: data.assessments },
    ...(summary !== undefined ? { summary } : {}),
  };
  return { ...body, checksum: await sha256(checksumBody(body)) };
}

/** Whether a results file is as it was exported. */
export async function verifyResults(file: ResultsFile): Promise<boolean> {
  const { checksum, ...body } = file;
  return checksum === await sha256(checksumBody(body));
}
