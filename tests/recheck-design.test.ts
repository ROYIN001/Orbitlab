/**
 * The instructor's re-check of design lessons (roadmap T02 for designs; Phase
 * 4 map §4.2): a record handed in by the page's rules — the key built from the
 * design at the lesson's date and level, the grade, `designRecord` — is worked
 * out again from the design it kept, at the date and level it kept, and held
 * criterion by criterion to the record (src/lessons/recheck.ts
 * `checkDesignRecord`). The Node-against-Chromium half is
 * tests/recheck.test.ts with tests/browser/journeys/recheck.mjs.
 *
 * Acceptance, fixed before the first run: on the engine that made it, a
 * design record re-checks as `match` on every criterion with the same values
 * (`toBe`): the page and the re-check call the same functions. An edited
 * figure, design, answer, date or level is said; a figure within the design
 * engine tolerance of a bound is borderline.
 */
import { describe, expect, it } from 'vitest';
import { designFromTemplate, withValue } from '../src/design/satellite-model';
import { designLessonStart, designValues, designValuesNow } from '../src/design/design-lesson-key';
import { lifetimeNow } from '../src/orbit/lifetime-now';
import { brokenDesignLocks, designLessonOptions, gradeDesign, lockGroupKeys } from '../src/lessons/design-lesson';
import { designRecord, emptyProgress, recordGrade, resultsFile, type LessonRecord } from '../src/lessons/progress';
import {
  DESIGN_ENGINE_TOLERANCE, checkDesignCriterion, checkRecord, checkResults, designTolerance, recheckCsv, type RecheckJob,
} from '../src/lessons/recheck';
import { runRecheckJob } from '../src/lessons/recheck-job';
import { allLessons } from '../src/lessons/catalog';
import type { DesignKey, DesignLesson } from '../src/lessons/types';
import type { SatelliteDesign } from '../src/design/satellite-spec';

const APP = 'test+build';
const napa = designFromTemplate('napa2', 'n', 'NAPA-2');

const LESSON: DesignLesson = {
  kind: 'design', id: 'class-power', track: 9, order: 1, mode: 'explore', domains: [1], title: { en: 'Power' }, brief: { en: 'More power.' },
  start: { template: 'napa2' }, designDate: '2026-10-01', level: 'moderate',
  locked: [...lockGroupKeys('orbit'), 'power.payloadW', 'power.busW'],
  criteria: [
    { id: 'margin', kind: 'design', measure: 'sat.powerMargin', min: 10 },
    { id: 'life', kind: 'design', measure: 'sat.lifetime', min: 3 },
    { id: 'down', kind: 'design', measure: 'sat.disposal25y', min: 1 },
    { id: 'eclipse', kind: 'answer', measure: 'sat.eclipseMax', tol: 1, prompt: { en: 'Eclipse (min)' } },
  ],
  hints: [],
};
const CATALOGUE = allLessons([LESSON]);

function keyOf(l: DesignLesson, design: SatelliteDesign, date = l.designDate, level = l.level): DesignKey {
  return { ...designValuesNow(design, { ...designLessonOptions(l), date, level }, lifetimeNow), lockBroken: brokenDesignLocks(l.locked, designLessonStart(l.start), design) };
}

/** A design handed in as the page keeps it (src/ui/lessons/lesson-mode.ts): the key, the grade, the record. */
function handIn(design: SatelliteDesign, answers: (k: DesignKey) => Record<string, number> = () => ({}), l: DesignLesson = LESSON): LessonRecord {
  const key = keyOf(l, design);
  const typed = answers(key);
  const grade = gradeDesign(l, key, typed);
  return designRecord({ at: new Date(Date.UTC(2026, 9, 1, 9)), grade, answers: typed, hintsShown: 0, design, designDate: l.designDate, level: l.level, figures: key.values, app: APP });
}
const job = (record: LessonRecord, lessonId = LESSON.id): RecheckJob => ({ file: 0, student: 'A', lessonId, which: ['last'], record });
const right = (k: DesignKey) => ({ eclipse: k.values['sat.eclipseMax']! });

describe('the re-check works a design out again (T02 for designs)', () => {
  it('matches a design handed in, criterion by criterion, with the same figures', () => {
    for (const [design, verdict] of [[withValue(napa, 'power.arrayArea', 0.08), 'pass'], [napa, 'fail']] as const) {
      const rec = handIn(design, right);
      expect(rec.verdict).toBe(verdict);
      const c = checkRecord(job(JSON.parse(JSON.stringify(rec)) as LessonRecord), CATALOGUE, APP);
      expect([c.kind, c.status, c.recheckedVerdict, c.missing, c.sameBuild, c.flownTo]).toEqual(['design', 'match', verdict, [], true, null]);
      expect([c.designDate, c.level]).toEqual(['2026-10-01', 'moderate']);
      expect(c.criteria.map((x) => [x.id, x.status])).toEqual([['margin', 'match'], ['life', 'match'], ['down', 'match'], ['eclipse', 'match']]);
      for (const x of c.criteria) {
        expect(x.rechecked?.value).toBe(x.recorded?.value);
        expect(x.rechecked?.expected).toBe(x.recorded?.expected);
      }
    }
  }, 60_000);

  it('works the page\'s key out the same in a worker job and here and now', async () => {
    const design = withValue(napa, 'power.arrayArea', 0.08);
    const opts = designLessonOptions(LESSON);
    const page = await designValues(design, opts, (req) => Promise.resolve(lifetimeNow(req)));
    expect(page).toEqual(designValuesNow(design, opts, lifetimeNow));
  }, 60_000);

  it('says a record was edited: a figure, the design, an answer, the verdict', () => {
    const rec = handIn(withValue(napa, 'power.arrayArea', 0.08), right);
    const edit = (f: (r: LessonRecord) => void): ReturnType<typeof checkRecord> => {
      const r = JSON.parse(JSON.stringify(rec)) as LessonRecord;
      f(r);
      return checkRecord(job(r), CATALOGUE, APP);
    };
    // the margin raised by a hundredth of a percent: far outside 1e-9 of itself
    const figure = edit((r) => { r.criteria[0].value = (r.criteria[0].value as number) + 0.01; });
    expect([figure.status, figure.criteria[0].status]).toEqual(['differs', 'differs']);
    // the design handed in is not the one graded: more cells than the record's margin
    const design = edit((r) => { r.design!.power.arrayArea = 0.09; });
    expect([design.status, design.criteria[0].status]).toEqual(['differs', 'differs']);
    const answer = edit((r) => { r.answers.eclipse += 0.5; });
    expect([answer.status, answer.criteria[3].status]).toEqual(['differs', 'differs']);
    const verdict = edit((r) => { r.verdict = 'fail'; });
    expect([verdict.status, verdict.recheckedVerdict]).toEqual(['differs', 'pass']);
  }, 60_000);

  it('says what a record lacks, and a day or air other than the lesson\'s', () => {
    const rec = handIn(withValue(napa, 'power.arrayArea', 0.08), right);
    const without = (f: keyof LessonRecord): LessonRecord => { const r = JSON.parse(JSON.stringify(rec)) as LessonRecord; delete r[f]; return r; };
    expect(checkRecord(job(without('design')), CATALOGUE, APP)).toMatchObject({ kind: 'design', status: 'cannotRefly', reason: 'noDesign', missing: ['design'] });
    // every build that hands a design in keeps all of its fields: one lacking was edited away
    expect(checkRecord(job(without('designDate')), CATALOGUE, APP)).toMatchObject({ status: 'differs', missing: ['designDate'] });
    expect(checkRecord(job(without('figures')), CATALOGUE, APP)).toMatchObject({ status: 'differs', missing: ['figures'] });
    // graded on another day: worked out again on that day (its own figures match), and said not to be the lesson's
    const other = { ...LESSON, designDate: '2026-12-21' };
    const moved = handIn(withValue(napa, 'power.arrayArea', 0.08), right, other);
    const c = checkRecord(job(moved), CATALOGUE, APP);
    expect([c.status, c.mismatch, c.designDate]).toEqual(['differs', ['designDate'], '2026-12-21']);
    expect(c.criteria.every((x) => x.status === 'match')).toBe(true);
    // the instructor's lesson file not opened, or the record another kind's
    expect(checkRecord(job(rec, 'class-other'), CATALOGUE, APP)).toMatchObject({ kind: 'design', status: 'cannotRefly', reason: 'noLesson' });
  }, 60_000);
});

describe('a design criterion held to its record', () => {
  const g = (value: number | null, state: 'pass' | 'fail' = 'pass') => ({ id: 'c', state, value });

  it('keeps the design engine tolerances of the table in recheck.ts (fixed 2026-10-01)', () => {
    expect(DESIGN_ENGINE_TOLERANCE).toEqual({
      closed: { rel: 1e-9, abs: 1e-12 }, eclipse: { abs: 2e-4 }, revisit: { abs: 1e-7 }, contact: { rel: 1e-6, abs: 1e-12 }, lifetime: { rel: 1e-3 }, flag: { abs: 0 },
    });
    expect(designTolerance('sat.powerMargin', 12, 12.5)).toBeCloseTo(12.5e-9, 20);
    expect(designTolerance('sat.dvMargin', 0, 0)).toBe(1e-12);
    expect(designTolerance('sat.eclipseMax', 35, 35)).toBe(2e-4);
    expect(designTolerance('sat.lifetime', 6.8, 6.8)).toBeCloseTo(6.8e-3, 15);
    expect(designTolerance('sat.disposal25y', 1, 1)).toBe(0);
  });

  it('matches within the tolerance, differs beyond it, and is borderline within it of a bound', () => {
    const c = { id: 'c', kind: 'design' as const, measure: 'sat.powerMargin' as const, min: 10 };
    expect(checkDesignCriterion(c, g(12), g(12 * (1 + 5e-10))).status).toBe('match');
    expect(checkDesignCriterion(c, g(12), g(12 * (1 + 5e-9))).status).toBe('differs');
    // 10 % and a hair: another engine could have put it a hair below
    expect(checkDesignCriterion(c, g(10 + 5e-9), g(10 + 5e-9))).toMatchObject({ status: 'borderline', bound: 10 });
    const life = { id: 'c', kind: 'design' as const, measure: 'sat.lifetime' as const, min: 5 };
    expect(checkDesignCriterion(life, g(5.004), g(5.004)).status).toBe('borderline');
    expect(checkDesignCriterion(life, g(5.006), g(5.006)).status).toBe('match');
  });

  it('calls the 25-year rule borderline when the lifetime lies within 0.1 % of its limit', () => {
    const c = { id: 'c', kind: 'design' as const, measure: 'sat.disposal25y' as const, min: 1 };
    const key = (life: number): DesignKey => ({ values: { 'sat.lifetime': life, 'sat.disposal25y': 1 }, lockBroken: [], disposalLimit: 28 });
    expect(checkDesignCriterion(c, g(1), g(1), key(27.98))).toMatchObject({ status: 'borderline', bound: 28 });
    expect(checkDesignCriterion(c, g(1), g(1), key(27.9)).status).toBe('match');
    expect(checkDesignCriterion(c, g(1), g(0, 'fail'), key(27.98)).status).toBe('differs');
  });
});

describe('a class\'s files with design records', () => {
  it('checks them with the flights, in a job where there is no worker, and saves them as CSV with their units', async () => {
    const data = emptyProgress();
    recordGrade(data, { lessonId: LESSON.id, ...handIn(napa, right) });
    recordGrade(data, { lessonId: LESSON.id, ...handIn(withValue(napa, 'power.arrayArea', 0.08), right) });
    const file = JSON.parse(JSON.stringify(await resultsFile(data, new Date(Date.UTC(2026, 9, 1, 10)), 'B'))) as unknown;
    const direct = await checkResults({ results: [file], lessons: [LESSON] }, { app: APP });
    const job2 = await runRecheckJob({ results: [file], lessons: [LESSON] }, new AbortController().signal);
    // the first hand-in failed and was the last until the second: the first pass and the last are now one record
    expect(direct.records.map((r) => [r.which.join('+'), r.kind, r.status, r.recheckedVerdict])).toEqual([['passed+last', 'design', 'match', 'pass']]);
    expect(job2.records.map((r) => r.status)).toEqual(['match']);
    const csv = recheckCsv(direct).split('\n');
    const margin = csv.find((l) => l.includes(',margin,'))!;
    expect(margin).toContain(',design,sat.powerMargin,%,');
    expect(csv.find((l) => l.includes(',life,'))).toContain(',sat.lifetime,yr,');
  }, 120_000);
});
