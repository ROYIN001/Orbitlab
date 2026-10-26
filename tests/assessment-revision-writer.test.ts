/**
 * M-LEARNING-027 step 2b: a placement test begun now records the bank revision it was drawn from, so a
 * later edit of a question leaves it graded as it was taken.
 *
 * The bank here is the real one at a later revision (2), with b-karman's right answer moved to another
 * option; the history keeps revision 1's question. A test begun now, as the app begins one, is answered
 * with revision 2's right answer. Before the writer, the test was stored with no revision, read as
 * revision 1 and graded against the old key: the right answer counted as wrong.
 */
import { describe, expect, it, vi } from 'vitest';
import type { AssessmentAttempt, ChoiceQuestion, PreparedQuestion } from '../src/lessons/assessment/types';
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

const { BUILTIN_QUESTIONS } = await import('../src/lessons/assessment/bank');
const revision = await import('../src/lessons/assessment/revision') as Record<string, unknown>;
const { latestResult } = await import('../src/ui/lessons/assessment-view');
const { allLessons } = await import('../src/lessons/catalog');

type Begin = (kind: AssessmentAttempt['kind'], seed: number, questions: PreparedQuestion[], startedAt: string) => AssessmentAttempt;
// How the app begins a test: `newAttempt` from the writer on; before it, the view's own literal
// (src/ui/lessons/assessment-view.ts `begin`), which recorded no revision.
const begin: Begin = typeof revision.newAttempt === 'function' ? revision.newAttempt as Begin
  : (kind, seed, questions, startedAt) => ({ kind, seed, startedAt, questions, answers: [] });

const edited = BUILTIN_QUESTIONS.find((q) => q.id === EDITED) as ChoiceQuestion;
const rightNow = edited.options.findIndex((o) => o.correct);

describe('M-LEARNING-027 step 2b: a test begun now records its revision', () => {
  it('is graded by the revision it was drawn from', () => {
    const test = begin('pre', 3, [{ id: EDITED, order: edited.options.map((_, i) => i) }], '2026-10-27T10:00:00.000Z');
    test.answers.push({ id: EDITED, value: rightNow, confidence: 'sure' });
    test.finishedAt = '2026-10-27T10:05:00.000Z';
    const progress: ProgressData = { version: 1, lessons: {}, assessments: [test], customLessons: [], customQuestions: [] };
    expect.soft(latestResult(progress, allLessons())!.result.questions.map((q) => [q.id, q.correct])).toEqual([[EDITED, true]]);
    expect(test.revision).toBe(2);
  });
});
