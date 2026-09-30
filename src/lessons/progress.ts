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
import type { CaseId } from '../worksheets/case-ids';
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
  caseData?: { case: CaseId; theos2Epoch?: string; activityTo?: string };
  /** the answers shown to the student in this attempt, by criterion id: on them it passes only with help */
  revealed?: string[];
}

export interface LessonProgress {
  /** flights launched in the lesson; for a case lesson, the answers checked */
  attempts: number;
  /** hints revealed, 0–3 */
  hintsShown: number;
  /** passed unaided: a pass with help (`passedWithHelp`) never sets it */
  passed: boolean;
  /** the first flight that passed unaided */
  passedRecord?: LessonRecord;
  /** a flight passed with help (on answers shown): recorded as such, never counted as passed */
  passedWithHelp?: boolean;
  /** the last flight graded */
  last?: LessonRecord;
  /**
   * Expected values shown with "Show the answers", by criterion id: a number
   * shown passes only with help (src/lessons/grader.ts `RevealedAnswers`),
   * until the student clears them (`clearRevealed`).
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

export function loadProgress(store?: KeyValueStore): ProgressData {
  try {
    const raw = (store ?? localStorage).getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return emptyProgress();
    const data = JSON.parse(raw) as unknown;
    if (!isRecord(data) || data.version !== 1) return emptyProgress();
    return {
      version: 1,
      lessons: isRecord(data.lessons) ? data.lessons as Record<string, LessonProgress> : {},
      assessments: Array.isArray(data.assessments) ? data.assessments as AssessmentAttempt[] : [],
      customLessons: Array.isArray(data.customLessons) ? data.customLessons as CatalogLesson[] : [],
      customQuestions: Array.isArray(data.customQuestions) ? data.customQuestions as Question[] : [],
    };
  } catch {
    return emptyProgress();
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
    (store ?? localStorage).setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function lessonProgress(data: ProgressData, id: string): LessonProgress {
  return (data.lessons[id] ??= { attempts: 0, hintsShown: 0, passed: false });
}

/** Keep a graded flight: the last one always, the first unaided pass for good, and that one passed with help. */
export function recordGrade(data: ProgressData, record: LessonRecord & { lessonId: string }): void {
  const { lessonId, ...rec } = record;
  const p = lessonProgress(data, lessonId);
  p.last = rec;
  if (rec.verdict === 'pass' && !p.passed) { p.passed = true; p.passedRecord = rec; }
  if (rec.verdict === 'passedWithHelp') p.passedWithHelp = true;
}

/** Keep the expected values shown to the student, so none of them passes unaided later. */
export function recordRevealed(data: ProgressData, lessonId: string, shown: Readonly<Record<string, number>>): void {
  const p = lessonProgress(data, lessonId);
  const kept = (p.revealed ??= {});
  for (const [id, v] of Object.entries(shown)) {
    if (!Number.isFinite(v)) continue;
    const list = (kept[id] ??= []);
    if (!list.includes(v)) list.push(v);
  }
}

/**
 * "Clear the answers I have seen": forget the values a lesson showed, so a
 * later attempt can pass unaided (owner decision D-6). What was recorded
 * (the attempts passed with help, the answers shown in them) stays.
 */
export function clearRevealed(data: ProgressData, lessonId: string): void {
  const p = data.lessons[lessonId];
  if (p) delete p.revealed;
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
