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
import { answerMatches, verdictOf, wasRevealed, type LessonAnswers, type RevealedAnswers } from './grader';
import type { CaseKey, CaseLesson, CriterionGrade, LessonGrade } from './types';

/**
 * Grade a case lesson. A number is right within the lesson's own tolerance
 * where it sets one, the sheet's otherwise (the key's `tol`); a choice is
 * right on the key's option. An answer shown to the student passes only with
 * help (see `regradeAnswers`).
 */
export function gradeCaseLesson(lesson: CaseLesson, key: CaseKey, answers: LessonAnswers = {}, revealed: RevealedAnswers = {}): LessonGrade {
  const criteria: CriterionGrade[] = lesson.criteria.map((c) => {
    const k = key[c.item];
    if (!k) return { id: c.id, state: 'fail', value: null };
    const tol = k.kind === 'choice' ? 0 : c.tol ?? (c.tolPct === undefined ? k.tol : undefined);
    const tolPct = k.kind === 'choice' ? undefined : c.tolPct;
    const typed = answers[c.id];
    const value = typed === undefined || !Number.isFinite(typed) ? null : typed;
    const shown = wasRevealed({ tol, tolPct }, k.value, revealed[c.id]) ? { revealed: true } : {};
    if (value === null) return { id: c.id, state: 'pending', value: null, expected: k.value, ...shown };
    const ok = k.kind === 'choice' ? value === k.value : answerMatches(value, k.value, tol, tolPct);
    return { id: c.id, state: ok ? 'pass' : 'fail', value, expected: k.value, ...shown };
  });
  return { lessonId: lesson.id, final: true, verdict: verdictOf(criteria, [], true), criteria, lockBroken: [], t: 0 };
}

/**
 * Whether a case lesson has nothing left to give away: passed (now, or on an
 * earlier visit: `passedBefore`), or its answers shown. Until then the Orbit
 * section keeps that case's answer key, and the stage of Tianhe's error,
 * out of sight (src/worksheets/case-ids.ts `caseAnswersShown`).
 */
export function caseAnswersOpen(grade: LessonGrade | null, passedBefore = false): boolean {
  return passedBefore || (!!grade && (grade.verdict === 'pass' || grade.criteria.some((c) => c.revealed)));
}

/**
 * Whether a question's answer and its working may be shown on the strip: a
 * question whose answer was shown, and a right one only once the whole
 * lesson is open (`caseAnswersOpen` on this grade). A working names numbers
 * of its own, and one may be another question's answer — the Iridium sheet's
 * relative speed is worked "for both 226 m apart", the miss asked before it
 * — so a question got right early shows only its ✓.
 */
export function caseWorkingShown(grade: LessonGrade, id: string): boolean {
  const g = grade.criteria.find((c) => c.id === id);
  if (!g) return false;
  return g.revealed === true || (g.state === 'pass' && caseAnswersOpen(grade));
}
