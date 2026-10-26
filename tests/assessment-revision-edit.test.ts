/**
 * M-LEARNING-027: editing a question in the placement bank leaves an earlier test's result as it was.
 *
 * The bank here is the real one with one question's right answer moved to another option, as a later
 * revision (2) would have it; the bank's history keeps the question as revision 1 had it. A test taken
 * on revision 1 (stored with no revision, as every test is today) keeps its score; a test taken on
 * revision 2 is graded by revision 2. Before the fix the earlier test was graded again against the
 * edited bank, and its right answer turned wrong.
 */
import { describe, expect, it, vi } from 'vitest';
import type { AssessmentAttempt, ChoiceQuestion } from '../src/lessons/assessment/types';
import type { ProgressData } from '../src/lessons/progress';

const EDITED = vi.hoisted(() => 'b-karman');

vi.mock('../src/lessons/assessment/bank', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/lessons/assessment/bank')>();
  const original = real.BUILTIN_QUESTIONS.find((q) => q.id === EDITED) as ChoiceQuestion;
  const right = original.options.findIndex((o) => o.correct);
  const moved = (right + 1) % original.options.length;
  const edited: ChoiceQuestion = { ...original, options: original.options.map((o, i) => ({ text: o.text, ...(i === moved ? { correct: true } : {}) })) };
  const builtin = real.BUILTIN_QUESTIONS.map((q) => (q.id === EDITED ? edited : q));
  return {
    ...real,
    BUILTIN_QUESTIONS: builtin,
    BANK_REVISION: 2,
    BANK_HISTORY: [{ upTo: 1, items: { [EDITED]: original } }],
    questionBank: (custom: readonly ChoiceQuestion[] = []) => {
      const ids = new Set(builtin.map((q) => q.id));
      return [...builtin, ...custom.filter((q) => !ids.has(q.id))];
    },
  };
});

const { BUILTIN_QUESTIONS, BANK_HISTORY } = await import('../src/lessons/assessment/bank');
const { latestResult } = await import('../src/ui/lessons/assessment-view');
const { allLessons } = await import('../src/lessons/catalog');

const original = BANK_HISTORY[0].items[EDITED] as ChoiceQuestion;
const edited = BUILTIN_QUESTIONS.find((q) => q.id === EDITED) as ChoiceQuestion;
const rightThen = original.options.findIndex((o) => o.correct);
const rightNow = edited.options.findIndex((o) => o.correct);

const test = (answer: number, revision?: number): AssessmentAttempt => ({
  ...(revision !== undefined ? { revision } : {}),
  kind: 'pre', seed: 1, startedAt: '2026-10-01T10:00:00.000Z', finishedAt: '2026-10-01T10:05:00.000Z',
  questions: [{ id: EDITED, order: original.options.map((_, i) => i) }],
  answers: [{ id: EDITED, value: answer, confidence: 'sure' }],
});
const progress = (attempt: AssessmentAttempt): ProgressData => ({ version: 1, lessons: {}, assessments: [attempt], customLessons: [], customQuestions: [] });

describe('M-LEARNING-027: an edited question does not change an earlier result', () => {
  it('the edit moved the right answer', () => {
    expect(rightThen).toBeGreaterThanOrEqual(0);
    expect(rightNow).not.toBe(rightThen);
  });

  it('a test taken before the edit keeps its score', () => {
    const r = latestResult(progress(test(rightThen)), allLessons())!.result;
    expect(r.questions.map((q) => [q.id, q.correct])).toEqual([[EDITED, true]]);
    expect(r.percent).toBe(100);
  });

  it('a test taken after the edit is graded by the edited bank', () => {
    const r = latestResult(progress(test(rightNow, 2)), allLessons())!.result;
    expect(r.questions.map((q) => [q.id, q.correct])).toEqual([[EDITED, true]]);
    expect(latestResult(progress(test(rightThen, 2)), allLessons())!.result.percent).toBe(0);
  });
});
