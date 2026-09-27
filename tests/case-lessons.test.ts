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
import { gradeCaseLesson } from '../src/lessons/case-grader';
import { awaitingAnswers } from '../src/lessons/grader';
import { LESSON_FORMAT, lessonFileText, parseLessonFile, readCaseLesson, type FileIssue } from '../src/lessons/lesson-file';
import { emptyProgress, lessonProgress, loadProgress, recordGrade, recordRevealed, resultsFile, saveProgress, verifyResults, type KeyValueStore } from '../src/lessons/progress';
import { createLessonTools, type LessonToolsHost } from '../src/lessons/mcp-tools';
import { isCaseLesson, type CaseKey, type CaseLesson, type LessonGrade } from '../src/lessons/types';
import { CASE_FOCUS, CASE_IDS, CASE_ITEM_IDS, caseAnswersShown } from '../src/worksheets/case-ids';
import { caseKey, caseWorksheet } from '../src/worksheets/cases';
import { measuredActivity, type SolarDaily } from '../src/physics/propagator/activity';
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
      for (const item of sheetOf(l).sections[1].items) {
        if (item.kind !== 'number') continue;
        const figure = item.answer.text.split(' ')[0];
        expect(told, `${l.id}: ${item.id} = ${figure}`).not.toContain(figure);
      }
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

  it('fails an answer once shown, and never passes it after', () => {
    const l = lesson('case-theos2');
    const key = keyOf(l);
    const p = emptyProgress();
    recordRevealed(p, l.id, { j2: key.j2.value, why: key.why.value });
    const g = gradeCaseLesson(l, key, exact(l, key), lessonProgress(p, l.id).revealed);
    expect(g.verdict).toBe('fail');
    expect(g.criteria.filter((c) => c.revealed).map((c) => c.id)).toEqual(['j2', 'why']);
    expect(g.criteria.find((c) => c.id === 'height')!.state).toBe('pass');
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

  it('reads a file written before case lessons as it was, and writes it back byte for byte', () => {
    const parsed = parseLessonFile(JSON.parse(V1), new Set());
    expect(parsed.issues).toEqual([]);
    expect(parsed.lessons).toEqual(BUILTIN_LESSONS.filter((l) => l.id === 'orbit-first' || l.id === 'guid-maxq'));
    expect(lessonFileText(parsed.lessons)).toBe(V1);
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

  it('grades from nothing that propagates: the grader and the case names import no propagator', () => {
    const src = import.meta.glob(['../src/lessons/case-grader.ts', '../src/worksheets/case-ids.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    expect(Object.keys(src)).toHaveLength(2);
    for (const [path, text] of Object.entries(src)) expect(text, path).not.toMatch(/from ['"][^'"]*propagator\//);
    expect(src['../src/worksheets/case-ids.ts']).not.toMatch(/^import /m);
  });
});
