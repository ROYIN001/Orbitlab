/**
 * A student's progress through the lessons and the placement test (roadmap
 * E03), kept in the browser's storage and exported as a results file for the
 * teacher. DOM-free: the storage is passed in, so the tests use a map.
 *
 * The results file carries a SHA-256 checksum of its contents. It shows a file
 * was not edited by accident; it is not a signature, and does not claim to be.
 */
import type { MissionDocument } from '../config/mission-file';
import type { AssessmentAttempt, Question } from './assessment/types';
import type { CriterionGrade, Lesson, LessonGrade } from './types';

export const PROGRESS_STORAGE_KEY = 'orbitlab.lessons';
export const RESULTS_FORMAT = 'orbitlab.results';
export const RESULTS_FILE_EXTENSION = '.orbitlab-results.json';

export interface KeyValueStore { getItem(key: string): string | null; setItem(key: string, value: string): void }

/** One graded flight of a lesson. */
export interface LessonRecord {
  at: string;
  verdict: LessonGrade['verdict'];
  criteria: CriterionGrade[];
  answers: Record<string, number>;
  hintsShown: number;
  /** the mission as it was flown */
  mission: MissionDocument;
}

export interface LessonProgress {
  /** flights launched in the lesson */
  attempts: number;
  /** hints revealed, 0–3 */
  hintsShown: number;
  passed: boolean;
  /** the first flight that passed */
  passedRecord?: LessonRecord;
  /** the last flight graded */
  last?: LessonRecord;
}

export interface ProgressData {
  version: 1;
  lessons: Record<string, LessonProgress>;
  assessments: AssessmentAttempt[];
  /** a teacher's lessons and questions, opened from a file and kept */
  customLessons: Lesson[];
  customQuestions: Question[];
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
      customLessons: Array.isArray(data.customLessons) ? data.customLessons as Lesson[] : [],
      customQuestions: Array.isArray(data.customQuestions) ? data.customQuestions as Question[] : [],
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(data: ProgressData, store?: KeyValueStore): void {
  try { (store ?? localStorage).setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data)); } catch { /* storage is optional: progress lasts the tab */ }
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
