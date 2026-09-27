/**
 * The case lessons' grader (roadmap E03, track 6: P2.5's cases from the
 * record). DOM-free and pure: the typed answers held to the case sheet's own
 * key (src/worksheets/cases.ts `caseKey`), which the page builds once, from
 * the data frozen when the lesson opened, and hands in as data. There is no
 * flight: the grade is final from the start, and open until every answer is
 * in, by the rules the flight lessons' answers follow (`regradeAnswers`).
 *
 * It imports nothing that predicts or propagates: the sheet works the
 * numbers, and src/lessons may not import the propagator
 * (tests/propagator.test.ts).
 */
import { answerMatches, wasRevealed, type LessonAnswers, type RevealedAnswers } from './grader';
import type { CaseKey, CaseLesson, CriterionGrade, LessonGrade } from './types';

/**
 * Grade a case lesson. A number is right within the lesson's own tolerance
 * where it sets one, the sheet's otherwise (the key's `tol`); a choice is
 * right on the key's option. An answer shown to the student fails, typed or
 * not (see `regradeAnswers`).
 */
export function gradeCaseLesson(lesson: CaseLesson, key: CaseKey, answers: LessonAnswers = {}, revealed: RevealedAnswers = {}): LessonGrade {
  const criteria: CriterionGrade[] = lesson.criteria.map((c) => {
    const k = key[c.item];
    if (!k) return { id: c.id, state: 'fail', value: null };
    const tol = k.kind === 'choice' ? 0 : c.tol ?? (c.tolPct === undefined ? k.tol : undefined);
    const tolPct = k.kind === 'choice' ? undefined : c.tolPct;
    const typed = answers[c.id];
    const value = typed === undefined || !Number.isFinite(typed) ? null : typed;
    if (wasRevealed({ tol, tolPct }, k.value, revealed[c.id])) return { id: c.id, state: 'fail', value, expected: k.value, revealed: true };
    if (value === null) return { id: c.id, state: 'pending', value: null, expected: k.value };
    const ok = k.kind === 'choice' ? value === k.value : answerMatches(value, k.value, tol, tolPct);
    return { id: c.id, state: ok ? 'pass' : 'fail', value, expected: k.value };
  });
  const anyFail = criteria.some((c) => c.state === 'fail');
  return {
    lessonId: lesson.id, final: true,
    verdict: anyFail ? 'fail' : criteria.every((c) => c.state === 'pass') ? 'pass' : 'open',
    criteria, lockBroken: [], t: 0,
  };
}
