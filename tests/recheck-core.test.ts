/**
 * The instructor's re-check (roadmap T02; Phase 4 map §4.2), its core
 * (src/lessons/recheck.ts) and its job: records made by flying a lesson live
 * as the page does (tests/recheck-harness.ts) are found again by the headless
 * re-fly, an edited record is not, and each way a record cannot be re-flown
 * says so. The Node-against-Chromium comparison over committed fixtures is
 * tests/recheck.test.ts and tests/browser/journeys/recheck.mjs.
 *
 * Acceptance, fixed before the first run: a record flown live and kept by
 * the page's rules re-checks as `match` on every criterion, with the same
 * verdict and the same grading time (`toBe`), because the live point-mass
 * flight IS the headless one since T02 (docs/PHYSICS.md §2n) and the journal
 * gives its commands at the same step boundaries.
 */
import { describe, expect, it } from 'vitest';
import { BUILTIN_CASE_LESSONS, BUILTIN_LESSONS } from '../src/lessons/catalog';
import { lessonConfig, missionStateOf } from '../src/lessons/config';
import { missionDocument } from '../src/config/mission-file';
import { flightRecord, resultsFile, emptyProgress, recordGrade, type LessonRecord, type ProgressData } from '../src/lessons/progress';
import {
  CHECK_STATUSES, ENGINE_TOLERANCE, checkCriterion, checkResults, collectRecords, recheckCsv, statusCounts, type RecheckJob,
} from '../src/lessons/recheck';
import { checkRecord } from '../src/lessons/recheck';
import { runRecheckJob } from '../src/lessons/recheck-job';
import { allLessons } from '../src/lessons/catalog';
import type { Criterion, Lesson } from '../src/lessons/types';
import { MEASURES } from '../src/lessons/measures';
import { expectedOf, flyLessonLive } from './recheck-harness';

const APP = 'test+build';
const lesson = (id: string): Lesson => {
  const l = BUILTIN_LESSONS.find((x) => x.id === id);
  if (!l) throw new Error(`no lesson ${id}`);
  return l;
};
const job = (lessonId: string, record: LessonRecord): RecheckJob => ({ file: 0, student: 'A', lessonId, which: ['last'], record });
const CATALOGUE = allLessons();
/** A CSV line's cells, quotes undone. */
const cells = (line: string): string[] => [...line.matchAll(/("([^"]|"")*"|[^,]*)(,|$)/g)].slice(0, -1).map((m) => m[1].replace(/^"|"$/g, '').replace(/""/g, '"'));

/** Lesson 1.1 flown live and answered right: period and speed from the frozen grade. */
function firstOrbit(seed = 1) {
  const l = lesson('orbit-first');
  return flyLessonLive(l, { seed, answers: (g) => ({ period: expectedOf(g, 'period'), speed: expectedOf(g, 'speed') }) });
}

/** Lesson 3.3 as a teacher might set it: no scripted abort, the student presses Abort at T+60 s. */
function abortByHand(): Lesson {
  const base = lesson('fail-abort');
  const state = missionStateOf(base.mission);
  state.failure = { ...state.failure, mode: 'none' };
  return { ...base, id: 'abort-by-hand', track: 9, mission: missionDocument(state), locked: base.locked.filter((k) => k !== 'setup.failure') };
}

describe('the re-check finds a live flight again (T02)', () => {
  it('matches a record of lesson 1.1 flown live, criterion by criterion, at the same grading time', () => {
    for (const seed of [1, 2]) {
      const { record, frames } = firstOrbit(seed);
      expect(frames).toBeGreaterThan(20);
      expect(record.verdict).toBe('pass');
      expect(record.t! - record.clock!).toBeGreaterThanOrEqual(0);
      const check = checkRecord(job('orbit-first', record), CATALOGUE, APP);
      expect(check.status).toBe('match');
      expect(check.recheckedVerdict).toBe('pass');
      expect(check.flownTo).toBe(record.t);
      expect(check.missing).toEqual([]);
      expect(check.sameBuild).toBe(true);
      expect(check.lateActions).toBe(0);
      expect(check.criteria.map((c) => [c.id, c.status])).toEqual([['orbit', 'match'], ['period', 'match'], ['speed', 'match']]);
      // bit for bit, not only within the tolerance
      for (const c of check.criteria) expect(c.rechecked).toEqual(c.recorded);
    }
  }, 120_000);

  it('gives a journaled Abort again at its step boundary, and without the journal the flight is another', () => {
    const l = abortByHand();
    const { record } = flyLessonLive(l, {
      seed: 3, maxWarp: 4, commands: [{ at: 60, give: (s) => s.commandAbort() }],
      answers: (g) => ({ peak: expectedOf(g, 'peak') }),
    });
    expect(record.actions).toHaveLength(1);
    expect(record.actions![0].kind).toBe('commandAbort');
    // taken at the simulation's clock, a step boundary at or after the picture's T+60
    expect(record.actions![0].t).toBeGreaterThanOrEqual(60);
    expect(record.actions![0].t - 60).toBeLessThan(0.3);
    expect(record.verdict).toBe('pass');
    const catalogue = allLessons([l]);
    const check = checkRecord(job(l.id, record), catalogue, APP);
    expect(check.status).toBe('match');
    for (const c of check.criteria) expect(c.rechecked).toEqual(c.recorded);
    // the same record with its journal dropped: no abort, no crew landing by the grading time
    const bare = checkRecord(job(l.id, { ...record, actions: [] }), catalogue, APP);
    expect(bare.status).toBe('differs');
    expect(bare.recheckedVerdict).not.toBe('pass');
  }, 120_000);

  it('says a record was edited: a value, a verdict, a typed answer', () => {
    const { record } = firstOrbit();
    const edited = structuredClone(record);
    edited.criteria.find((c) => c.id === 'period')!.expected! += 0.5;
    const check = checkRecord(job('orbit-first', edited), CATALOGUE, APP);
    expect(check.criteria.find((c) => c.id === 'period')!.status).toBe('differs');
    expect(check.status).toBe('differs');
    const verdict = checkRecord(job('orbit-first', { ...structuredClone(record), verdict: 'fail' }), CATALOGUE, APP);
    expect(verdict.status).toBe('differs');
    // a typed answer changed after grading: it is re-graded as typed, and its state is not the record's
    const typed = structuredClone(record);
    typed.answers.period += 5;
    const retyped = checkRecord(job('orbit-first', typed), CATALOGUE, APP);
    expect(retyped.criteria.find((c) => c.id === 'period')!.status).toBe('differs');
    expect(retyped.recheckedVerdict).toBe('fail');
  }, 60_000);

  it('re-checks a record made before T02 as far as it can, lists what it lacks, and does not call a difference an edit', () => {
    // Measured on the first run (recorded, not tuned): without the grading time the re-fly stops at
    // the first step the flight has ended at, 13.75 s before seeds 1 and 3 were graded (the picture
    // reached the end mid-step); the speed read there is 0.021 m/s lower, beyond the 0.01 m/s
    // tolerance. Seed 2 was graded at that very step and matches.
    const statuses = [1, 2].map((seed) => {
      const { record } = firstOrbit(seed);
      const { t: _t, clock: _c, actions: _a, app: _p, ...old } = record;
      const check = checkRecord(job('orbit-first', old), CATALOGUE, APP);
      expect(check.missing).toEqual(['t', 'clock', 'actions', 'app']);
      expect(check.sameBuild).toBeNull();
      expect(check.flownTo!).toBeLessThanOrEqual(record.t!);
      expect(record.t! - check.flownTo!).toBeLessThan(60);
      expect(check.recheckedVerdict).toBe('pass');
      return [check.status, check.reason ?? null];
    });
    expect(statuses).toEqual([['cannotRefly', 'incomplete'], ['match', null]]);
  }, 60_000);

  it('says why a record cannot be re-flown', () => {
    const { record } = firstOrbit();
    expect(checkRecord(job('no-such-lesson', record), CATALOGUE, APP)).toMatchObject({ status: 'cannotRefly', reason: 'noLesson' });
    expect(checkRecord(job('orbit-first', { ...record, mission: undefined }), CATALOGUE, APP)).toMatchObject({ status: 'cannotRefly', reason: 'noMission' });
    expect(checkRecord(job('orbit-first', { ...record, mission: { format: 'nope' } as never }), CATALOGUE, APP)).toMatchObject({ reason: 'mission' });
    expect(checkRecord(job('orbit-first', { ...record, actions: [{ t: 1, kind: 'selfDestruct' }] as never }), CATALOGUE, APP)).toMatchObject({ reason: 'actions' });
    // six-DOF: minutes each, not re-flown
    const six = structuredClone(record);
    six.mission!.mission.dynamics = { model: 'sixDof', wind: 'calm', seed: 20260919 };
    expect(checkRecord(job('orbit-first', six), CATALOGUE, APP)).toMatchObject({ status: 'cannotRefly', reason: 'sixDof' });
    // a case lesson flies nothing
    const c = BUILTIN_CASE_LESSONS[0];
    const caseRecord: LessonRecord = { at: record.at, verdict: 'pass', criteria: [], answers: {}, hintsShown: 0, caseData: { case: c.case } };
    expect(checkRecord(job(c.id, caseRecord), CATALOGUE, APP)).toMatchObject({ kind: 'case', status: 'cannotRefly', reason: 'caseLesson', missing: [] });
  }, 60_000);
});

describe('each criterion held to its record', () => {
  const g = (state: 'pass' | 'fail', value: number | null, expected?: number) => ({ id: 'x', state, value, ...(expected !== undefined ? { expected } : {}) });
  const measure = (bound: Partial<Extract<Criterion, { kind: 'measure' }>>): Criterion => ({ id: 'x', kind: 'measure', measure: 'orbit.apogee', ...bound });

  it('matches within the engine tolerance, and differs beyond it', () => {
    const c = measure({ max: 600 });
    expect(checkCriterion(c, g('pass', 500), g('pass', 500.009), null).status).toBe('match');
    expect(checkCriterion(c, g('pass', 500), g('pass', 500.02), null).status).toBe('differs');
    expect(checkCriterion(c, g('pass', 500), g('fail', 500), null).status).toBe('differs');
    expect(checkCriterion(c, g('pass', 500), null, null).status).toBe('differs');
  });

  it('calls a value within the tolerance of a bound borderline, whichever way it went', () => {
    // withinBound has no epsilon: 600.004 fails a max of 600 here, and could pass it on another engine
    expect(checkCriterion(measure({ max: 600 }), g('pass', 599.996), g('fail', 600.004), null)).toMatchObject({ status: 'borderline', bound: 600 });
    expect(checkCriterion(measure({ min: 400 }), g('pass', 400.003), g('pass', 400.003), null)).toMatchObject({ status: 'borderline', bound: 400 });
    // a target and its band: the band's edge is the bound
    expect(checkCriterion(measure({ target: 500, tol: 2 }), g('pass', 501.995), g('pass', 501.995), 500)).toMatchObject({ status: 'borderline', bound: 502 });
    expect(checkCriterion(measure({ target: 500, tol: 2 }), g('pass', 501), g('pass', 501), 500).status).toBe('match');
  });

  it('holds a typed answer to the band round the flown value, the band moving with a percentage', () => {
    const answer: Criterion = { id: 'x', kind: 'answer', measure: 'orbit.period', tol: 1, prompt: { en: 'T' } };
    // typed 95.9995 against 95.000: 0.0005 inside the band's edge, within the period's 1e-3 min
    expect(checkCriterion(answer, g('pass', 95.9995, 95), g('pass', 95.9995, 95.0002), null)).toMatchObject({ status: 'borderline', bound: 96.0002 });
    expect(checkCriterion(answer, g('pass', 95.5, 95), g('pass', 95.5, 95.0002), null).status).toBe('match');
    // the typed number is the student's: it is the same on both sides, or the record was edited
    expect(checkCriterion(answer, g('pass', 95.5, 95), g('pass', 95.6, 95), null).status).toBe('differs');
    const pct: Criterion = { id: 'x', kind: 'answer', measure: 'burnDv', tolPct: 5, prompt: { en: 'Δv' } };
    expect(checkCriterion(pct, g('pass', 104.995, 100), g('pass', 104.995, 100), null)).toMatchObject({ status: 'borderline', bound: 105 });
    // shown to the student: the same flag on both sides, or it differs
    expect(checkCriterion(answer, { ...g('pass', 95, 95), revealed: true }, g('pass', 95, 95), null).status).toBe('differs');
    expect(checkCriterion(answer, { ...g('pass', 95, 95), revealed: true }, { ...g('pass', 95, 95), revealed: true }, null).status).toBe('match');
  });

  it('holds an event to its time and an outcome to its state', () => {
    const event: Criterion = { id: 'x', kind: 'event', key: 'evt.docked', present: true };
    expect(checkCriterion(event, g('pass', 12372.3), g('pass', 12372.305), null).status).toBe('match');
    expect(checkCriterion(event, g('pass', 12372.3), g('pass', 12372.4), null).status).toBe('differs');
    const outcome: Criterion = { id: 'x', kind: 'outcome', is: 'target' };
    expect(checkCriterion(outcome, g('pass', null), g('pass', null), null)).toMatchObject({ status: 'match', tol: null });
    expect(checkCriterion(outcome, g('pass', null), g('fail', null), null).status).toBe('differs');
  });

  it('keeps each engine tolerance at most a hundredth of the tightest a built-in lesson gives its measure', () => {
    // Map §4.2: a difference within the tolerance must not pass a flight a lesson means to fail. Absolute
    // tolerances are read from the lessons; a percentage one at the smallest value its lesson can have
    // (burnDv ≥ 100 m/s, burnDv.raise ≥ 1000 m/s, abort.maxG ≥ 1 g, loop.* ≥ 0.1 in its unit).
    const floor: Partial<Record<string, number>> = { burnDv: 100, 'burnDv.raise': 1000, 'abort.maxG': 1, 'loop.wcAtMaxQ': 0.1, 'loop.pmAtMaxQ': 0.1 };
    const tightest = new Map<string, number>();
    const note = (m: string, tol: number) => tightest.set(m, Math.min(tightest.get(m) ?? Infinity, tol));
    for (const l of BUILTIN_LESSONS) for (const c of l.criteria) {
      if (c.kind === 'answer') {
        if (c.tol !== undefined) note(c.measure, c.tol);
        if (c.tolPct !== undefined) note(c.measure, (floor[c.measure] ?? NaN) * c.tolPct / 100);
      }
      if (c.kind === 'measure') {
        if (c.tol !== undefined) note(c.measure, c.tol);
        if (c.min !== undefined && c.max !== undefined) note(c.measure, c.max - c.min);
      }
    }
    expect(tightest.size).toBeGreaterThan(8);
    for (const [m, tol] of tightest) {
      expect(Number.isFinite(tol), m).toBe(true);
      expect(ENGINE_TOLERANCE[m as keyof typeof ENGINE_TOLERANCE], `${m}: tightest ${tol} ${MEASURES[m as keyof typeof MEASURES].unit}`).toBeLessThanOrEqual(tol / 100 + 1e-15);
    }
  });
});

describe('a class\'s files', () => {
  async function fileOf(records: Array<[string, LessonRecord]>, student?: string) {
    const data: ProgressData = emptyProgress();
    for (const [lessonId, r] of records) recordGrade(data, { lessonId, ...r });
    return JSON.parse(JSON.stringify(await resultsFile(data, new Date(Date.UTC(2026, 9, 1, 10)), student)));
  }

  it('reads each file, its checksum, and each lesson\'s first pass and last flight once', async () => {
    const { record } = firstOrbit();
    const fail = { ...structuredClone(record), verdict: 'fail' as const, at: '2026-10-01T09:30:00.000Z' };
    const good = await fileOf([['orbit-first', record]], 'Ploy, M.4/2');
    const both = await fileOf([['orbit-first', record], ['orbit-first', fail]]);
    const edited = structuredClone(good);
    edited.progress.lessons['orbit-first'].last.answers.period += 1;
    const { files, jobs } = collectRecords([good, both, { format: 'something else' }, edited], ['a.json', null, 'c.json', 'd.json']);
    expect(files.map((f) => [f.readable, f.student, f.name])).toEqual([[true, 'Ploy, M.4/2', 'a.json'], [true, null, null], [false, null, 'c.json'], [true, 'Ploy, M.4/2', 'd.json']]);
    expect(jobs.map((j) => [j.file, j.which.join('+')])).toEqual([[0, 'passed+last'], [1, 'passed'], [1, 'last'], [3, 'passed'], [3, 'last']]);
    const check = await checkResults({ results: [good, both, { format: 'something else' }, edited] }, { app: APP });
    expect(check.files.map((f) => f.checksum)).toEqual([true, true, null, false]);
    expect(check.records.map((r) => r.status)).toEqual(['match', 'match', 'differs', 'match', 'differs']);
    expect(statusCounts(check)).toEqual({ match: 3, borderline: 0, differs: 2, cannotRefly: 0 });
    expect(CHECK_STATUSES).toEqual(Object.keys(statusCounts(check)));
    // a spreadsheet: a row per criterion, the name quoted, nothing a spreadsheet would run as a formula
    const csv = recheckCsv(check).trimEnd().split('\n');
    expect(csv[0].split(',').slice(0, 6)).toEqual(['file', 'student', 'lesson', 'record', 'graded_at', 'record_status']);
    expect(csv).toHaveLength(1 + 5 * 3);
    expect(csv[1]).toContain('"Ploy, M.4/2"');
    // the edited answer's row says which criterion; the edited verdict's rows all match, under a record that differs
    const rows = csv.map(cells);
    expect(rows.filter((r) => r.at(-1) === 'differs').map((r) => r[14])).toEqual(['period']);
    expect(rows.filter((r) => r[5] === 'differs').length).toBe(2 * 3);
    expect(rows[1].slice(0, 4)).toEqual(['1', 'Ploy, M.4/2', 'orbit-first', 'passed+last']);
    const risky = recheckCsv({ ...check, files: check.files.map((f) => ({ ...f, name: '=HYPERLINK("x")' })) });
    expect(risky).not.toMatch(/(^|,)=HYPERLINK/m);
  }, 60_000);

  it('runs as a job where there is no worker, with progress, and a Stop keeps what is done', async () => {
    const { record } = firstOrbit();
    const file = await fileOf([['orbit-first', record], ['orbit-hohmann', { ...record, verdict: 'fail' }]]);
    const seen: number[] = [];
    const whole = await runRecheckJob({ results: [file] }, new AbortController().signal, (done) => seen.push(done));
    expect(whole.stopped).toBe(false);
    expect(whole.records).toHaveLength(2);
    expect(seen).toEqual([0, 1, 2]);
    const stop = new AbortController();
    const part = await runRecheckJob({ results: [file] }, stop.signal, (done) => { if (done === 1) stop.abort(); });
    expect(part.stopped).toBe(true);
    expect(part.records.map((r) => r.lessonId)).toEqual(['orbit-first']);
  }, 60_000);

  it('checks a lesson the results file does not carry, from the instructor\'s own lesson file', async () => {
    const l = { ...lesson('orbit-first'), id: 'class-orbit', track: 9 };
    const { record } = flyLessonLive(l, { seed: 5, answers: (gr) => ({ period: expectedOf(gr, 'period'), speed: expectedOf(gr, 'speed') }) });
    const file = await fileOf([[l.id, record]]);
    expect((await checkResults({ results: [file] }, { app: APP })).records[0]).toMatchObject({ status: 'cannotRefly', reason: 'noLesson' });
    expect((await checkResults({ results: [file], lessons: [l] }, { app: APP })).records[0]).toMatchObject({ status: 'match' });
    // a record keeps the lesson's own mission, whatever the instructor's copy now starts from
    expect(lessonConfig(record.mission!).vehicleId).toBe('falcon9');
  }, 60_000);
});

describe('flightRecord', () => {
  it('keeps the flight\'s own mission, grade time and journal', () => {
    const l = lesson('orbit-first');
    const cfg = lessonConfig(l.mission);
    const grade = { lessonId: l.id, final: true, verdict: 'open' as const, criteria: [], lockBroken: [], t: 612.5 };
    const r = flightRecord({ at: new Date(0), grade, answers: {}, hintsShown: 2, cfg, clock: 612.25, actions: [{ t: 5, kind: 'commandAbort' }], app: 'x+y' });
    expect(r).toMatchObject({ t: 612.5, clock: 612.25, actions: [{ t: 5, kind: 'commandAbort' }], app: 'x+y', hintsShown: 2 });
    expect(r.mission?.mission.vehicleId).toBe('falcon9');
  });
});
