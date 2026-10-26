/**
 * The placement test's question bank (roadmap E03): six areas, read through
 * the lesson file reader so the built-in questions are held to the format a
 * teacher's file uses. The flights their charts show are in `flights.json`.
 */
import { readQuestion, type FileIssue } from '../lesson-file';
import type { Question } from './types';
import type { FlightData } from './flights';
import FLIGHTS from './flights.json';
import { BASICS } from './bank/basics';
import { ORBITS } from './bank/orbits';
import { ROCKETS } from './bank/rockets';
import { GUIDANCE } from './bank/guidance';
import { CONTROL } from './bank/control';
import { FAILURES } from './bank/failures';

export const FLIGHT_DATA = FLIGHTS as unknown as FlightData;
export const DATASET_IDS: ReadonlySet<string> = new Set(Object.keys(FLIGHT_DATA));

/** What reading the built-in questions reported; the tests hold it empty. */
export const BANK_ISSUES: FileIssue[] = [];

export const BUILTIN_QUESTIONS: readonly Question[] = [...BASICS, ...ORBITS, ...ROCKETS, ...GUIDANCE, ...CONTROL, ...FAILURES]
  .map((raw, i) => readQuestion(raw, `bank[${i}]`, BANK_ISSUES, DATASET_IDS))
  .filter((q): q is Question => q !== null);

/**
 * The bank's grading revision (M-LEARNING-027; `revision.ts` reads it). It goes up only when what decides
 * a stored test's score changes for a question: its type, area, level or kind; for choice and multi the
 * number of options and which are right; for order the number of items; for numeric the answer, its unit
 * and tolerance (and a constant behind it). Wording, explanations, figures, the skill named and the
 * lessons a question points to stay current, as the advice follows the live lessons; tests/
 * assessment-revision.test.ts pins exactly these fields per revision.
 */
export const BANK_REVISION = 1;

/**
 * Each grading change, oldest first: the last revision the old grading belongs to, and every item it
 * changed as that revision had it, whole and in the bank's own format (null: not in the bank then).
 * Empty: the grading has not changed since revision 1, the bank the placement test shipped with (#22).
 */
export const BANK_HISTORY: ReadonlyArray<{ upTo: number; items: Readonly<Record<string, unknown>> }> = [];

/** The built-in questions and a teacher's, without duplicates. */
export function questionBank(custom: readonly Question[] = []): Question[] {
  const ids = new Set(BUILTIN_QUESTIONS.map((q) => q.id));
  return [...BUILTIN_QUESTIONS, ...custom.filter((q) => !ids.has(q.id))];
}
