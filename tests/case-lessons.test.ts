/**
 * The case lessons (roadmap E03, track 6: P2.5's cases from the record): the
 * three built-in ones are held to their sheets, graded by the sheet's own key
 * and tolerances, read and written by the lesson file, kept in the progress,
 * given to an assistant without their answers, and opened where the Orbit
 * section has what they need. The placement test's advice on them is in
 * tests/assessment.test.ts.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { BUILTIN_CASE_LESSONS, BUILTIN_ISSUES, BUILTIN_LESSONS, allLessons, lessonNumber } from '../src/lessons/catalog';
import { caseAnswersOpen, caseWorkingShown, gradeCaseLesson } from '../src/lessons/case-grader';
import { awaitingAnswers } from '../src/lessons/grader';
import { LESSON_FORMAT, lessonFileText, parseLessonFile, readCaseLesson, type FileIssue } from '../src/lessons/lesson-file';
import { emptyProgress, frozenCaseData, lessonProgress, loadProgress, recordGrade, recordRevealed, resultsFile, saveProgress, verifyResults, type KeyValueStore } from '../src/lessons/progress';
import { createLessonTools, type LessonToolsHost } from '../src/lessons/mcp-tools';
import { isCaseLesson, type CaseKey, type CaseLesson, type LessonGrade } from '../src/lessons/types';
import { CASE_FOCUS, CASE_IDS, CASE_ITEM_IDS, CZ5B_CASE_STAGE, caseAnswersShown, caseStudyErrorShown } from '../src/worksheets/case-ids';
import { CZ5B_STAGES } from '../src/data/cz5b';
import { caseKey, caseWorksheet } from '../src/worksheets/cases';
import { indicesAt, indicesOver, measuredActivity, type DailyActivity, type SolarDaily } from '../src/physics/propagator/activity';
import HISTORY from '../src/data/solar-daily.json';
import { setLang } from '../src/i18n';
import { elementsFromRecord } from '../src/orbit/omm';
import { parseSnapshot } from '../src/provider/data-provider';
import { skyFacts, skyObjects } from '../src/orbit/real-sky';
import { REENTRY_BELOW } from '../src/orbit/reentry';

const SNAPSHOT_FILE = import.meta.glob('../public/data/satellites.json', { import: 'default', eager: true }) as Record<string, unknown>;
const snap = parseSnapshot(Object.values(SNAPSHOT_FILE)[0], 'satellites');
const theos2 = elementsFromRecord(snap.data.groups.find((g) => g.id === 'thai')!.sets.find((r) => r.NORAD_CAT_ID === 58016)!);
const activity = measuredActivity(HISTORY as SolarDaily, null).series;
const at = new Date('2026-09-27T12:00:00Z');
const CYRILLIC = /\p{Script=Cyrillic}/u;
const THAI = /\p{Script=Thai}/u;

{
  const g = globalThis as { document?: unknown };
  if (!g.document) g.document = { documentElement: {} };
  setLang('en');
}
afterAll(() => setLang('en'));

const lesson = (id: string): CaseLesson => BUILTIN_CASE_LESSONS.find((l) => l.id === id)!;
const sheetOf = (l: CaseLesson) => caseWorksheet(l.case, { lang: 'en', generatedAt: at, activity, theos2 })!;
const keyOf = (l: CaseLesson): CaseKey => caseKey(sheetOf(l));
/** Answers typed exactly as the key has them. */
const exact = (l: CaseLesson, key: CaseKey): Record<string, number> => Object.fromEntries(l.criteria.map((c) => [c.id, key[c.item].value]));

describe('the built-in case lessons', () => {
  it('are track 6, 6.1 THEOS-2, 6.2 the Long March 5B stage, 6.3 Iridium–Cosmos, read without an issue', () => {
    expect(BUILTIN_ISSUES).toEqual([]);
    expect(BUILTIN_CASE_LESSONS.map((l) => [lessonNumber(l), l.id, l.case])).toEqual([
      ['6.1', 'case-theos2', 'theos2'], ['6.2', 'case-cz5b', 'cz5b'], ['6.3', 'case-iridium', 'iridium'],
    ]);
    expect(BUILTIN_CASE_LESSONS.every(isCaseLesson)).toBe(true);
    expect(BUILTIN_LESSONS.some((l) => isCaseLesson(l))).toBe(false);
  });

  it('ask every question of their sheet, and open at a level where Real satellites is theirs (not Watch, which is the tour)', () => {
    for (const l of BUILTIN_CASE_LESSONS) {
      expect(l.criteria.map((c) => c.item), l.id).toEqual(CASE_ITEM_IDS[l.case]);
      expect(['explore', 'engineer']).toContain(l.mode);
      expect(l.hints, l.id).toHaveLength(3);
    }
  });

  it('carry Russian in Cyrillic and Thai in Thai script, and no hint or task gives a number the key holds', () => {
    for (const l of BUILTIN_CASE_LESSONS) {
      for (const text of [l.title, l.brief, ...(l.debrief ? [l.debrief] : []), ...l.hints]) {
        expect(text.ru, `${l.id}: ${text.en}`).toMatch(CYRILLIC);
        expect(text.th, `${l.id}: ${text.en}`).toMatch(THAI);
      }
      const told = [l.brief, ...l.hints].flatMap((x) => [x.en, x.ru ?? '', x.th ?? '']).join(' ');
      // each figure as the key prints it, with a decimal point and (Russian) a decimal comma
      for (const lang of ['en', 'ru'] as const) {
        setLang(lang);
        const sheet = caseWorksheet(l.case, { lang, generatedAt: at, activity, theos2 })!;
        for (const item of sheet.sections[1].items) {
          if (item.kind !== 'number') continue;
          const figure = item.answer.text.split(' ')[0];
          expect(told, `${l.id} (${lang}): ${item.id} = ${figure}`).not.toContain(figure);
        }
      }
      setLang('en');
    }
  });
});

describe('the case grader', () => {
  it('passes each lesson on its sheet\'s key', () => {
    for (const l of BUILTIN_CASE_LESSONS) {
      const key = keyOf(l);
      expect(gradeCaseLesson(l, key, exact(l, key)).verdict, l.id).toBe('pass');
    }
  });

  it('holds a number to the sheet\'s tolerance: 0.9 of it passes, 1.5 of it fails', () => {
    for (const l of BUILTIN_CASE_LESSONS) {
      const key = keyOf(l);
      for (const c of l.criteria) {
        const k = key[c.item];
        if (k.kind !== 'number') continue;
        const near = gradeCaseLesson(l, key, { ...exact(l, key), [c.id]: k.value + 0.9 * k.tol });
        const far = gradeCaseLesson(l, key, { ...exact(l, key), [c.id]: k.value - 1.5 * k.tol });
        expect(near.verdict, `${l.id} ${c.item}`).toBe('pass');
        expect(far.verdict, `${l.id} ${c.item}`).toBe('fail');
        expect(far.criteria.find((x) => x.id === c.id)!.state).toBe('fail');
      }
    }
  });

  it('holds a choice to its option, waits for what is not answered, and takes a teacher\'s tolerance over the sheet\'s', () => {
    const l = lesson('case-iridium');
    const key = keyOf(l);
    expect(key.why).toEqual({ kind: 'choice', value: 2, tol: 0 });
    expect(gradeCaseLesson(l, key, { ...exact(l, key), why: 1 }).verdict).toBe('fail');
    const open = gradeCaseLesson(l, key, { miss: key.miss.value });
    expect(open.final).toBe(true);
    expect(open.verdict).toBe('open');
    expect(awaitingAnswers(l, open)).toEqual(CASE_ITEM_IDS.iridium.filter((i) => i !== 'miss'));
    // the sheet allows ±5 m on the miss; a teacher's lesson may allow 10 %
    const loose: CaseLesson = { ...l, criteria: l.criteria.map((c) => (c.item === 'miss' ? { ...c, tolPct: 10 } : c)) };
    const typed = { ...exact(l, key), miss: key.miss.value * 1.08 };
    expect(gradeCaseLesson(l, key, typed).verdict).toBe('fail');
    expect(gradeCaseLesson(loose, key, typed).verdict).toBe('pass');
  });

  // owner decision D-6: an answer shown passes only with help, never unaided, until the student clears it
  it('passes an answer once shown only with help, and never unaided after', () => {
    const l = lesson('case-theos2');
    const key = keyOf(l);
    const p = emptyProgress();
    recordRevealed(p, l.id, { j2: key.j2.value, why: key.why.value });
    const g = gradeCaseLesson(l, key, exact(l, key), lessonProgress(p, l.id).revealed);
    expect(g.verdict).toBe('passedWithHelp');
    expect(g.criteria.filter((c) => c.revealed).map((c) => c.id)).toEqual(['j2', 'why']);
    expect(g.criteria.find((c) => c.id === 'height')!.state).toBe('pass');
    // a wrong choice after the answers were shown still fails
    const wrong = gradeCaseLesson(l, key, { ...exact(l, key), why: key.why.value === 0 ? 1 : 0 }, lessonProgress(p, l.id).revealed);
    expect(wrong.verdict).toBe('fail');
    expect(caseAnswersOpen(g)).toBe(true);
  });

  // the strip once showed each question's working as soon as it was right, and the Iridium speed's names the miss
  it('shows a right answer\'s working only once the whole lesson is passed or its answers shown', () => {
    const l = lesson('case-iridium');
    const sheet = sheetOf(l);
    const key = caseKey(sheet);
    const speed = sheet.sections[1].items.find((i) => i.id === 'speed')!;
    expect(speed.answer.working).toContain(key.miss.value.toFixed(0));
    const early = gradeCaseLesson(l, key, { speed: key.speed.value });
    expect(early.criteria.find((c) => c.id === 'speed')!.state).toBe('pass');
    expect(caseWorkingShown(early, 'speed')).toBe(false);
    expect(caseAnswersOpen(early)).toBe(false);
    const passed = gradeCaseLesson(l, key, exact(l, key));
    expect(l.criteria.every((c) => caseWorkingShown(passed, c.id))).toBe(true);
    // shown: every question's answer and working, the one got right before included
    const p = emptyProgress();
    recordRevealed(p, l.id, Object.fromEntries(l.criteria.filter((c) => c.item !== 'speed').map((c) => [c.id, key[c.item].value])));
    const shown = gradeCaseLesson(l, key, { speed: key.speed.value }, lessonProgress(p, l.id).revealed);
    expect(caseAnswersOpen(shown)).toBe(true);
    expect(l.criteria.every((c) => caseWorkingShown(shown, c.id))).toBe(true);
    // a lesson passed on an earlier visit has nothing left to give away, even with the answers cleared
    expect(caseAnswersOpen(gradeCaseLesson(l, key, {}), true)).toBe(true);
    expect(caseAnswersOpen(null)).toBe(false);
  });

  it('grades by the key frozen when the lesson opened, not by a newer element set', () => {
    const l = lesson('case-theos2');
    const frozen = keyOf(l);
    // a set a week on, with its mean motion changed a little by drag
    const newer = { ...theos2, jdEpoch: theos2.jdEpoch + 7, noKozai: theos2.noKozai * 1.001 };
    const later = caseKey(caseWorksheet('theos2', { lang: 'en', generatedAt: at, activity, theos2: newer })!);
    expect(later.height.value).not.toBeCloseTo(frozen.height.value, 0);
    expect(gradeCaseLesson(l, frozen, exact(l, frozen)).verdict).toBe('pass');
    expect(gradeCaseLesson(l, later, exact(l, frozen)).verdict).toBe('fail');
  });
});

describe('a teacher\'s lesson file with case lessons', () => {
  const v1 = import.meta.glob('./fixtures/lessons/v1.orbitlab-lesson.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const V1 = Object.values(v1)[0];

  it('reads a file written before case lessons unchanged and writes canonical LF JSON', () => {
    const original = JSON.parse(V1);
    const parsed = parseLessonFile(original, new Set());
    expect(parsed.issues).toEqual([]);
    expect(parsed.lessons.map((lesson) => lesson.id)).toEqual(['orbit-first', 'guid-maxq']);
    // Imported lessons retain their authored text even after built-in copy is revised.
    expect(parsed.lessons).toEqual(original.lessons);
    expect(lessonFileText(parsed.lessons)).toBe(V1.replace(/\r\n/g, '\n'));
  });

  it('writes a file of flight lessons as version 1, and one with a case lesson as version 2, both read back unchanged', () => {
    expect(JSON.parse(lessonFileText(BUILTIN_LESSONS)).version).toBe(1);
    const mixed = [...BUILTIN_LESSONS, ...BUILTIN_CASE_LESSONS];
    const text = lessonFileText(mixed);
    expect(JSON.parse(text).version).toBe(2);
    const parsed = parseLessonFile(JSON.parse(text), new Set());
    expect(parsed.issues).toEqual([]);
    expect(parsed.lessons).toEqual(mixed);
  });

  it('leaves out a case lesson with an unknown case, question, kind or tolerance, naming why, and drops what only a flight has', () => {
    const good = JSON.parse(lessonFileText([lesson('case-cz5b')])).lessons[0];
    const doc = {
      format: LESSON_FORMAT, version: 2, lessons: [
        good,
        { ...good, id: 'a', case: 'apollo13' },
        { ...good, id: 'b', criteria: [{ id: 'x', kind: 'case', item: 'miss' }] },
        { ...good, id: 'c', criteria: [{ id: 'x', kind: 'case', item: 'why', tol: 1 }] },
        { ...good, id: 'd', criteria: [{ id: 'x', kind: 'case', item: 'area' }, { id: 'y', kind: 'case', item: 'area' }] },
        { ...good, id: 'e', kind: 'rocket' },
        { ...good, id: 'f', criteria: [{ id: 'x', kind: 'answer', item: 'area' }] },
      ],
    };
    const parsed = parseLessonFile(doc, new Set());
    expect(parsed.lessons.map((l) => l.id)).toEqual(['case-cz5b']);
    expect(parsed.issues.map((i) => `${i.code}:${i.detail ?? ''}`)).toEqual(['invalid:case', 'invalid:item', 'invalid:tol', 'duplicate:y', 'invalid:kind', 'invalid:kind']);
    const issues: FileIssue[] = [];
    const withMission = readCaseLesson({ ...good, mission: {}, locked: ['setup.vehicle'] }, 'lessons[0]', issues);
    expect(withMission).toEqual(lesson('case-cz5b'));
    expect(issues.map((i) => `${i.level}:${i.code}:${i.detail}`)).toEqual(['warn:invalid:mission', 'warn:invalid:locked']);
  });
});

describe('progress, results and the assistant', () => {
  const memory = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); } }; };

  it('freezes only each worksheet input, stays small, and recreates every key after save/load', () => {
    const p = emptyProgress();
    for (const id of CASE_IDS) {
      const sheet = caseWorksheet(id, { lang: 'en', generatedAt: at, activity, theos2 })!;
      const frozen = frozenCaseData(id, { activity, theos2, activityTo: '2086-09-27' }, sheet, at);
      const json = JSON.stringify(frozen);
      expect(json.length, `${id} persisted characters`).toBeLessThan(100_000);
      const source = frozen.snapshot!.source;
      if (id === 'cz5b') {
        expect('from' in source.activity).toBe(true);
        expect((source.activity as typeof activity).f107.length).toBeGreaterThan(1);
        expect((source.activity as typeof activity).f107.length).toBeLessThanOrEqual(367);
      } else expect('from' in source.activity).toBe(false);
      expect(caseKey(caseWorksheet(id, { lang: 'en', generatedAt: at, ...source })!)).toEqual(caseKey(sheet));

      const l = lesson(`case-${id}`);
      const grade = gradeCaseLesson(l, caseKey(sheet), exact(l, caseKey(sheet)));
      recordGrade(p, { lessonId: l.id, at: at.toISOString(), verdict: grade.verdict, criteria: grade.criteria,
        answers: exact(l, caseKey(sheet)), hintsShown: 0, caseData: frozen });
      const store = memory();
      expect(saveProgress(p, store)).toBe(true);
      expect(loadProgress(store).lessons[l.id].passedRecord?.caseData).toEqual(JSON.parse(JSON.stringify(frozen)));
    }
    // All three cases, including duplicated first-pass/latest records, fit
    // this conservative test budget; it is not a browser quota assertion.
    expect(JSON.stringify(p).length).toBeLessThan(500_000);
  });

  it('preserves daily boundaries and interval means across the full CZ-5B prediction horizon', () => {
    const el = elementsFromRecord(CZ5B_STAGES.find((s) => s.name === CZ5B_CASE_STAGE)!.elements);
    const epoch = el.jdEpoch + el.jdEpochFrac, through = epoch + 365;
    const frozen = frozenCaseData('cz5b', { activity, theos2 }, sheetOf(lesson('case-cz5b')), at);
    const cropped = frozen.snapshot!.source.activity as DailyActivity;
    const first = Math.floor(epoch - activity.from);
    expect(cropped.from).toBe(activity.from + first);
    expect(cropped.f107).toHaveLength(366);
    expect(cropped.f107a).toEqual(activity.f107a.slice(first, first + 366));
    expect(cropped.ap).toEqual(activity.ap.slice(first, first + 366));
    // The original patch kept only the ~10 days until the answer it predicted.
    // Checking every day beyond that also detects silent endpoint clamping.
    for (let day = 0; day <= 366; day++) {
      for (const fraction of [-1e-6, 0, 1e-6, 0.5]) {
        const jd = cropped.from + day + fraction;
        if (jd >= epoch && jd <= through) expect(indicesAt(cropped, jd)).toEqual(indicesAt(activity, jd));
      }
    }
    for (let day = 0; day < 365; day++) {
      for (const span of [0.5, 1, 5]) {
        const start = epoch + day, end = Math.min(through, start + span);
        expect(indicesOver(cropped, start, end)).toEqual(indicesOver(activity, start, end));
      }
    }
    expect(indicesAt(cropped, epoch)).toEqual(indicesAt(activity, epoch));
    expect(indicesAt(cropped, through)).toEqual(indicesAt(activity, through));
    expect(indicesOver(cropped, epoch, through)).toEqual(indicesOver(activity, epoch, through));
  });

  it('keeps the original clamp behavior when activity falls wholly before or after the prediction', () => {
    const el = elementsFromRecord(CZ5B_STAGES.find((s) => s.name === CZ5B_CASE_STAGE)!.elements);
    const epoch = el.jdEpoch + el.jdEpochFrac;
    const sheet = sheetOf(lesson('case-cz5b'));
    for (const offset of [-500, 500]) {
      const original: DailyActivity = {
        from: Math.floor(epoch) + offset,
        f107: Array.from({ length: 12 }, (_, i) => 100 + i),
        f107a: Array.from({ length: 12 }, (_, i) => 120 + i),
        ap: Array.from({ length: 12 }, (_, i) => 1 + i),
      };
      const cropped = frozenCaseData('cz5b', { activity: original, theos2 }, sheet, at).snapshot!.source.activity as DailyActivity;
      expect(cropped.f107).toHaveLength(1);
      expect(cropped.f107a).toHaveLength(1);
      expect(cropped.ap).toHaveLength(1);
      for (const day of [0, 0.5, 1, 180, 364, 365]) {
        expect(indicesAt(cropped, epoch + day)).toEqual(indicesAt(original, epoch + day));
      }
      expect(indicesOver(cropped, epoch, epoch + 365)).toEqual(indicesOver(original, epoch, epoch + 365));
    }
  });

  it('isolates saved case inputs and worksheets from later mutations, including constant activity', () => {
    const source = { activity: structuredClone(activity), theos2: structuredClone(theos2) };
    const sheet = structuredClone(sheetOf(lesson('case-cz5b')));
    const cz = frozenCaseData('cz5b', source, sheet, at);
    const th = frozenCaseData('theos2', source, sheetOf(lesson('case-theos2')), at);
    const beforeCz = JSON.stringify(cz), beforeTh = JSON.stringify(th);
    source.activity.f107.fill(999);
    source.activity.f107a.fill(999);
    source.activity.ap.fill(999);
    source.theos2.noKozai *= 2;
    sheet.sections[1].items[0].answer.value = -123;
    expect(JSON.stringify(cz)).toBe(beforeCz);
    expect(JSON.stringify(th)).toBe(beforeTh);
    const fixed = { f107: 123, f107a: 124, ap: 5 };
    const constant = frozenCaseData('cz5b', { activity: fixed, theos2: null }, sheet, at).snapshot!.source.activity;
    expect(constant).toEqual(fixed);
    fixed.ap = 999;
    expect(constant.ap).toBe(5);
  });

  it('treats malformed and unsupported legacy storage as empty without throwing', () => {
    for (const raw of ['{', 'null', '{"version":0}', '{"version":1,"lessons":null}']) {
      const store: KeyValueStore = { getItem: () => raw, setItem: () => {} };
      expect(loadProgress(store)).toEqual(emptyProgress());
    }
  });

  it('keeps a case lesson\'s check with its frozen data and no mission, through storage and in a results file that verifies', async () => {
    const l = lesson('case-theos2');
    const key = keyOf(l);
    const g = gradeCaseLesson(l, key, exact(l, key));
    const p = emptyProgress();
    lessonProgress(p, l.id).attempts = 2;
    recordGrade(p, { lessonId: l.id, at: '2026-09-27T12:00:00Z', verdict: g.verdict, criteria: g.criteria, answers: exact(l, key), hintsShown: 1,
      caseData: { case: 'theos2', theos2Epoch: '2026-09-26T11:28:23.000Z' } });
    p.customLessons = [lesson('case-iridium')];
    const store = memory();
    saveProgress(p, store);
    const back = loadProgress(store);
    expect(back.lessons[l.id].passed).toBe(true);
    expect(back.lessons[l.id].passedRecord).not.toHaveProperty('mission');
    expect(back.lessons[l.id].passedRecord?.caseData).toEqual({ case: 'theos2', theos2Epoch: '2026-09-26T11:28:23.000Z' });
    expect(back.customLessons).toEqual([lesson('case-iridium')]);
    const file = await resultsFile(back, at, 'Student A');
    expect(await verifyResults(file)).toBe(true);
  });

  it('lists the case lessons as such, opens one in the Orbit section, and never gives its answers', () => {
    const l = lesson('case-iridium');
    const key = keyOf(l);
    const grade: LessonGrade = gradeCaseLesson(l, key, { radius: key.radius.value });
    const host: LessonToolsHost = {
      catalogue: () => allLessons(), progress: () => emptyProgress(), startLesson: () => ({ ok: true }),
      activeLesson: () => ({ lesson: l, grade, hintsShown: 0, awaiting: awaitingAnswers(l, grade) }), assessmentResult: () => null,
    };
    const tools = createLessonTools(host);
    const tool = (name: string) => tools.find((x) => x.name === name)!;
    const list = (tool('list_lessons').execute({}) as { lessons: Array<{ id: string; kind: string }> }).lessons;
    expect(list.filter((x) => x.kind === 'case').map((x) => x.id)).toEqual(['case-theos2', 'case-cz5b', 'case-iridium']);
    const started = tool('start_lesson').execute({ id: 'case-iridium' }) as Record<string, unknown>;
    expect(started).toMatchObject({ kind: 'case', case: 'iridium', section: 'orbit', locked: [] });
    const result = JSON.stringify([started, tool('get_lesson_result').execute({})]);
    expect(result).toContain('How far apart were the two satellites');
    for (const k of ['miss', 'speed', 'sigma', 'times']) expect(result, k).not.toContain(key[k].value.toFixed(2).slice(0, 5));
    expect(result).not.toContain('"expected"');
  });
});

describe('where a case lesson opens', () => {
  it('picks a satellite the snapshot has, in its group, and the station low enough for the re-entry tool to be drawn', () => {
    for (const id of CASE_IDS) {
      const f = CASE_FOCUS[id];
      const group = snap.data.groups.find((g) => g.id === f.group)!;
      expect(group.sets.some((r) => r.NORAD_CAT_ID === f.satnum), id).toBe(true);
    }
    const iss = skyObjects(snap.data.groups.find((g) => g.id === 'stations')!.sets.map(elementsFromRecord), 'stations').find((o) => o.el.satnum === CASE_FOCUS.cz5b.satnum)!;
    expect(skyFacts(iss).perigeeAlt).toBeLessThan(REENTRY_BELOW);
  });

  it('keeps the case\'s answer key out of the Orbit section while its lesson is open and unanswered', () => {
    expect(caseAnswersShown(null, 'cz5b')).toBe(true);
    expect(caseAnswersShown({ case: 'cz5b', answersOpen: false }, 'cz5b')).toBe(false);
    expect(caseAnswersShown({ case: 'cz5b', answersOpen: false }, 'iridium')).toBe(true);
    expect(caseAnswersShown({ case: 'cz5b', answersOpen: true }, 'cz5b')).toBe(true);
  });

  // the re-entry case study printed the stage of Tianhe's prediction error to 0.1 %: lesson 6.2's "error" answer, on screen
  it('keeps the stage of Tianhe\'s prediction error out of the re-entry case study while lesson 6.2 is unanswered', () => {
    expect(lesson('case-cz5b').criteria.map((c) => c.item)).toContain('error');
    expect(CZ5B_STAGES.map((s) => s.name)).toContain(CZ5B_CASE_STAGE);
    const open = { case: 'cz5b' as const, answersOpen: false };
    expect(caseStudyErrorShown(CZ5B_CASE_STAGE, open)).toBe(false);
    for (const s of CZ5B_STAGES.filter((x) => x.name !== CZ5B_CASE_STAGE)) expect(caseStudyErrorShown(s.name, open), s.name).toBe(true);
    expect(caseStudyErrorShown(CZ5B_CASE_STAGE, { ...open, answersOpen: true })).toBe(true);
    expect(caseStudyErrorShown(CZ5B_CASE_STAGE, { case: 'theos2', answersOpen: false })).toBe(true);
    expect(caseStudyErrorShown(CZ5B_CASE_STAGE, null)).toBe(true);
  });

  it('grades from nothing that propagates: the grader and the case names import no propagator', () => {
    const src = import.meta.glob(['../src/lessons/case-grader.ts', '../src/worksheets/case-ids.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    expect(Object.keys(src)).toHaveLength(2);
    for (const [path, text] of Object.entries(src)) expect(text, path).not.toMatch(/from ['"][^'"]*propagator\//);
    expect(src['../src/worksheets/case-ids.ts']).not.toMatch(/^import /m);
  });
});
