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

/** The built-in questions and a teacher's, without duplicates. */
export function questionBank(custom: readonly Question[] = []): Question[] {
  const ids = new Set(BUILTIN_QUESTIONS.map((q) => q.id));
  return [...BUILTIN_QUESTIONS, ...custom.filter((q) => !ids.has(q.id))];
}
