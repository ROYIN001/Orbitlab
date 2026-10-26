/**
 * M-LEARNING-027: the placement bank's revision, and the reader that grades a test by its own one.
 *
 * - What decides a score is pinned per revision (PINNED, a hash of `grading`): a change to it fails here
 *   until the revision goes up and the changed questions are kept in the bank's history. The hash is
 *   the same for the bank the test shipped with (#22, b74679e) and after every change since (#23, #41,
 *   #63, #135): every test stored so far is revision 1.
 * - A test is read with or without a revision; one from a newer build is left out and left as it is.
 * - Every test ever stored reads as revision 1 and keeps the score it had: the audit's results file,
 *   exported on 2026-09-29, still scores as its frozen summary says.
 * - Storage, the project archive and the results file keep a test's revision as it was.
 */
import { describe, expect, it } from 'vitest';
// the audit's results file, as text through Vite's `?raw` (tsconfig types only `vite/client`, no `node:fs`)
import AUDIT from '../docs/audit-2026-09-29/audit-2026-09-29/orbitlab-QA-Test-2026-09-29-19-56.orbitlab-results.json?raw';
import { BANK_HISTORY, BANK_REVISION, BUILTIN_QUESTIONS, questionBank } from '../src/lessons/assessment/bank';
import { evaluate } from '../src/lessons/assessment/expression';
import { attemptRevision, bankAt, bankFor, readableAttempt } from '../src/lessons/assessment/revision';
import { scoreAttempt } from '../src/lessons/assessment/score';
import type { AssessmentAttempt, Question } from '../src/lessons/assessment/types';
import { allLessons } from '../src/lessons/catalog';
import { emptyProgress, loadProgress, PROGRESS_STORAGE_KEY, resultsFile, saveProgress, verifyResults, type KeyValueStore, type ProgressData, type ResultsFile } from '../src/lessons/progress';
import { validProgress } from '../src/projects/validation';
import { exportProjectArchive, parseProjectArchive, projectArchiveText, type ProjectStorage } from '../src/projects/archive';
import { latestResult, nextTestKind } from '../src/ui/lessons/assessment-view';

/**
 * What decides a test's score, a question a line, in id order (src/lessons/assessment/score.ts looks a
 * question up by id, so the bank's order does not count; a question deleted later and kept in the history
 * comes back at the end of `bankAt`'s list): whether an answer is
 * right, its credit, and the area and level it is weighed in. Wording, explanations, figures and the lessons
 * a question points to are left out: they change what is shown, not the score.
 */
function grading(questions: readonly Question[]): string {
  const indices = <T>(list: readonly T[], keep: (x: T) => boolean): number[] => list.flatMap((x, i) => (keep(x) ? [i] : []));
  return questions.map((q) => {
    const base = { id: q.id, type: q.type, domain: q.domain, level: q.level, kind: q.kind };
    switch (q.type) {
      case 'choice': case 'multi': return { ...base, options: q.options.length, correct: indices(q.options, (o) => !!o.correct) };
      case 'order': return { ...base, items: q.items.length };
      case 'vehicle': return base;
      case 'numeric': {
        // the answer's value at the numbers' ends: a constant behind it (a recorded flight, g0) counts too
        const at = (end: 'min' | 'max') => evaluate(q.answer, Object.fromEntries(q.params.map((p) => [p.name, p[end]])));
        return { ...base, answer: q.answer, unit: q.unit, tolPct: q.tolPct, expected: [at('min'), at('max')] };
      }
    }
  }).map((x) => JSON.stringify(x)).sort().join('\n');
}
const sha256 = async (text: string): Promise<string> =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Each revision's `grading` hash; never change an earlier one. */
const PINNED: Readonly<Record<number, string>> = {
  1: '989000665e7d458dd431ac0e814a40445f3036802199e63d3f9080e6b1014d52',
};

const finishedTest = (over: Partial<AssessmentAttempt> = {}): AssessmentAttempt => ({
  kind: 'pre', seed: 7, startedAt: '2026-10-01T10:00:00.000Z', finishedAt: '2026-10-01T10:05:00.000Z',
  questions: [{ id: 'b-karman', order: [0, 1, 2, 3] }], answers: [{ id: 'b-karman', value: 0 }], ...over,
});
const withTests = (...assessments: AssessmentAttempt[]): ProgressData => ({ ...emptyProgress(), assessments });

describe('the bank revision', () => {
  it('pins what decides a score at every revision this build knows', async () => {
    for (let r = 1; r <= BANK_REVISION; r++) {
      const now = grading(bankAt(r));
      // a failure here: the grading changed. Raise BANK_REVISION, keep the changed questions as they
      // were in BANK_HISTORY, and pin the new revision's hash; never change an earlier one.
      expect(await sha256(now), `revision ${r} grades as:\n${now}`).toBe(PINNED[r]);
    }
  });

  it('is today\'s bank at the current revision', () => {
    expect(bankAt(BANK_REVISION)).toEqual([...BUILTIN_QUESTIONS]);
    const custom = [{ ...BUILTIN_QUESTIONS[0], id: 'teacher-1', custom: true }, { ...BUILTIN_QUESTIONS[1], custom: true }] as Question[];
    expect(bankAt(BANK_REVISION, custom)).toEqual(questionBank(custom));
  });

  it('keeps a history whose revisions are earlier than the current one', () => {
    for (const change of BANK_HISTORY) expect(change.upTo).toBeLessThan(BANK_REVISION);
  });
});

describe('a test\'s revision', () => {
  it('is 1 when the test has none, its own when this build knows it, and unreadable otherwise', () => {
    expect(attemptRevision({})).toBe(1);
    expect(attemptRevision({ revision: 1 })).toBe(1);
    expect(attemptRevision({ revision: BANK_REVISION + 1 })).toBeNull();
    for (const bad of [0, -1, 1.5, '1', null, Number.NaN]) expect(attemptRevision({ revision: bad as never })).toBeNull();
    expect(readableAttempt({})).toBe(true);
    expect(readableAttempt({ revision: BANK_REVISION + 1 })).toBe(false);
  });

  it('chooses the bank a test is graded with', () => {
    expect(bankFor({})).toEqual(bankAt(1));
  });

  it('offers the placement test, not the one after, when the only test came from a newer build', () => {
    expect(nextTestKind(withTests(finishedTest({ revision: BANK_REVISION + 1 })))).toBe('pre');
    expect(nextTestKind(withTests(finishedTest()))).toBe('post');
  });

  it('leaves a test from a newer build out of the result', () => {
    const earlier = finishedTest();
    const newer = finishedTest({ revision: BANK_REVISION + 1, finishedAt: '2026-10-02T10:05:00.000Z', answers: [{ id: 'b-karman', value: 1 }] });
    const progress = withTests(earlier, newer);
    expect(latestResult(progress, allLessons())?.finishedAt).toBe(earlier.finishedAt);
    expect(latestResult(withTests(newer), allLessons())).toBeNull();
    // and as it was: nothing is written into it
    expect(progress.assessments[1]).toEqual(finishedTest({ revision: BANK_REVISION + 1, finishedAt: '2026-10-02T10:05:00.000Z', answers: [{ id: 'b-karman', value: 1 }] }));
  });
});

describe('every test stored so far reads as revision 1 and keeps its score', () => {
  it('the audit\'s results file (2026-09-29) scores as its frozen summary says', async () => {
    const file = JSON.parse(AUDIT) as ResultsFile & { summary: { kind: string; percent: number; areas: unknown[] } };
    expect(await verifyResults(file)).toBe(true);
    const [test] = file.progress.assessments;
    expect(test.revision).toBeUndefined();
    const r = latestResult(withTests(test), allLessons())!;
    expect(r.kind).toBe(file.summary.kind);
    expect(r.result.percent).toBe(file.summary.percent);
    expect(r.result.domains).toEqual(file.summary.areas);
  });

  it('the shapes tests were stored in: unsure by default, skipped, unanswered, unfinished', () => {
    const launch = finishedTest({
      questions: [{ id: 'b-karman', order: [3, 2, 1, 0] }, { id: 'b-gravity-altitude', values: { h: 400 } }, { id: 'o-kepler3', order: [3, 2, 0, 1] }, { id: 'b-order-altitude', order: [1, 2, 3, 4, 0] }],
      answers: [{ id: 'b-karman', value: 0, confidence: 'unsure' }, { id: 'b-gravity-altitude', value: 8.69, confidence: 'unsure' }, { id: 'o-kepler3', value: null, skipped: true }, { id: 'b-order-altitude', value: '0,1,2,3,4' }],
    });
    const unfinished: AssessmentAttempt = { kind: 'post', seed: 9, startedAt: '2026-10-03T10:00:00.000Z', questions: [{ id: 'b-karman', order: [0, 1, 2, 3] }], answers: [] };
    const progress = withTests(launch, unfinished);
    expect(latestResult(progress, allLessons())!.result).toEqual(scoreAttempt(launch, questionBank(), allLessons()));
  });
});

describe('a test\'s revision is kept as it was', () => {
  const tests = [finishedTest(), finishedTest({ revision: 1 }), finishedTest({ revision: BANK_REVISION + 1 })];

  it('in storage: read and saved again, byte for byte, with no recovery copy', () => {
    const raw = JSON.stringify(withTests(...tests));
    const values = new Map([[PROGRESS_STORAGE_KEY, raw]]);
    const store: KeyValueStore = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); } };
    const loaded = loadProgress(store);
    expect(loaded.assessments).toEqual(tests);
    expect(saveProgress(loaded, store)).toBe(true);
    expect(values.get(PROGRESS_STORAGE_KEY)).toBe(raw);
    expect([...values.keys()]).toEqual([PROGRESS_STORAGE_KEY]);
  });

  it('in a project archive: exported and read back, the same bytes', () => {
    const raw = JSON.stringify(withTests(...tests));
    const values = new Map([[PROGRESS_STORAGE_KEY, raw]]);
    const store: ProjectStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }, removeItem: (k) => { values.delete(k); } };
    const archive = parseProjectArchive(projectArchiveText(exportProjectArchive(store, new Date('2026-10-04T00:00:00.000Z'))));
    expect(JSON.stringify(archive.data.progress)).toBe(raw);
  });

  it('by the import check of an archive or a profile backup', () => {
    expect(validProgress(JSON.parse(JSON.stringify(withTests(...tests))))).toBe(true);
  });

  it('in a results file, under its checksum', async () => {
    const file = await resultsFile(withTests(...tests), new Date('2026-10-04T00:00:00.000Z'));
    const read = JSON.parse(JSON.stringify(file)) as ResultsFile;
    expect(await verifyResults(read)).toBe(true);
    expect(read.progress.assessments.map((a) => a.revision)).toEqual([undefined, 1, BANK_REVISION + 1]);
  });
});
