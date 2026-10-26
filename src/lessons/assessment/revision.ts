/**
 * A placement test is shown and graded with the bank as it was at the test's own revision
 * (M-LEARNING-027): editing a question never changes an earlier result.
 *
 * - A test with no revision was taken before tests recorded one: revision 1. The bank's grading has not
 *   changed since the test shipped (#22), so revision 1 is the bank as it is.
 * - A test of a revision this build does not know (taken in a newer build) or cannot read is left as it
 *   is: not resumed, graded or shown, and left out of the result, the advice, an export's summary and
 *   WebMCP; its bytes are kept, in storage and in archives and results files.
 */
import { readQuestion, type FileIssue } from '../lesson-file';
import { BANK_HISTORY, BANK_REVISION, BUILTIN_QUESTIONS, DATASET_IDS } from './bank';
import type { AssessmentAttempt, PreparedQuestion, Question } from './types';

/** The revision a test was drawn from, or null when it is not one this build can read. */
export function attemptRevision(attempt: Pick<AssessmentAttempt, 'revision'>): number | null {
  const r: unknown = attempt.revision;
  if (r === undefined) return 1;
  return typeof r === 'number' && Number.isInteger(r) && r >= 1 && r <= BANK_REVISION ? r : null;
}

/** A test this build can show and grade. */
export const readableAttempt = (attempt: Pick<AssessmentAttempt, 'revision'>): boolean => attemptRevision(attempt) !== null;

const read = new Map<string, Question | null>();
/** An item as an earlier revision had it, read as the bank reads its own. */
function earlier(upTo: number, id: string, raw: unknown): Question | null {
  const key = `${upTo}:${id}`;
  if (!read.has(key)) {
    const issues: FileIssue[] = [];
    read.set(key, raw === null ? null : readQuestion(raw, `history[${upTo}]`, issues, DATASET_IDS));
  }
  return read.get(key)!;
}

/** The built-in questions as revision `revision` had them, then a teacher's, as `questionBank` adds them. */
export function bankAt(revision: number, custom: readonly Question[] = []): Question[] {
  const byId = new Map(BUILTIN_QUESTIONS.map((q) => [q.id, q] as const));
  // newest change first, so the oldest one at or after `revision` is the one that stays
  for (const change of [...BANK_HISTORY].sort((a, b) => b.upTo - a.upTo)) {
    if (change.upTo < revision) break;
    for (const [id, raw] of Object.entries(change.items)) {
      const q = earlier(change.upTo, id, raw);
      if (q) byId.set(id, q); else byId.delete(id);
    }
  }
  const builtin = [...byId.values()];
  return [...builtin, ...custom.filter((q) => !byId.has(q.id))];
}

/** A test begun now: drawn from today's bank, so it records this revision (step 2b). */
export const newAttempt = (kind: AssessmentAttempt['kind'], seed: number, questions: PreparedQuestion[], startedAt: string): AssessmentAttempt =>
  ({ revision: BANK_REVISION, kind, seed, startedAt, questions, answers: [] });

/** The bank a readable test is shown and graded with. */
export const bankFor = (attempt: Pick<AssessmentAttempt, 'revision'>, custom: readonly Question[] = []): Question[] =>
  bankAt(attemptRevision(attempt) ?? BANK_REVISION, custom);
