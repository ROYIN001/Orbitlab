/**
 * What tests/fixtures/recheck/ holds and how it was made (roadmap T02; Phase 4
 * map §4.2). scripts/recheck-fixtures.ts ran this ONCE and wrote the files;
 * the tests read them with `?raw` (tests/recheck.test.ts) and the browser
 * journey with node:fs (tests/browser/journeys/recheck.mjs). Never run it
 * again to make a test pass: a miss is recorded, not regenerated away.
 *
 * - The scenario, `scenario.orbitlab-lesson.json`: two point-mass flight
 *   lessons written with the authoring page's own writer (`draftLesson`),
 *   each at the fixed launch time below. `class-leo` is lesson 1.1's Falcon 9
 *   to a 500 km circle with the payload left free; `class-abort` is lesson
 *   3.3's crewed Soyuz without its scripted abort, so the student presses
 *   Abort. A launch reads no space weather (the Launch section's air is a
 *   fixed standard atmosphere), so there is no ECSS level to fix for these;
 *   the design lessons of the next stage, which do read one, will fix it.
 * - The results file, `results.orbitlab-results.json`: one student's, three
 *   records, each flown LIVE by tests/recheck-harness.ts with seeded random
 *   frames and warps: `class-leo`'s first pass, its period typed 0.0004 min
 *   inside the edge of its 0.5 min band (borderline: within the period's
 *   1e-3 min engine tolerance of the bound); `class-leo`'s last flight, 20 t
 *   on a rocket that takes 17.5 t there (a clear fail); `class-abort`, the
 *   Abort pressed at T+60 s on screen and the peak load typed 3 % high (a
 *   clear pass, with a journaled command).
 * - Two DESIGN lessons (T01, T02 for designs; added 2026-10-01 with
 *   `--force`, a deliberate change of the fixture, said in its commit): each
 *   fixes its design date (`DESIGN_DATE`) and an ECSS level, so nothing in
 *   them reads the measured space weather. `class-power` is the example
 *   lesson's NAPA-2 power margin (at least 10 %, the battery no deeper than
 *   30 %, the longest eclipse typed); `class-theos` is the THEOS-2-class
 *   imager's lifetime and 25-year rule (the lifetime run), its data a day
 *   (the contact search), its ground sample and Δv (closed forms) and its
 *   swath typed within 2 %. Three design records, handed in as the strip
 *   hands them in (`designLessonKey`, the lifetime through the lifetime job's
 *   inline path): `class-power`'s first pass, its array sized to a margin
 *   2e-9 % over 10 % (borderline: within the closed forms' 1e-9 of the
 *   bound); its last, NAPA-2 as it flew, +6.8 % (a clear fail); and
 *   `class-theos`'s, the template as it is (a clear pass).
 * - `expected.json`: `checkResults` over them in Node, as the build
 *   `CHECKER_APP` (the records say `RECORD_APP`: another build, as a
 *   student's would be).
 */
import { BUILTIN_LESSONS } from '../src/lessons/catalog';
import { missionStateOf } from '../src/lessons/config';
import { missionDocument } from '../src/config/mission-file';
import { DEFAULT_LOCKS, draftLesson, type LessonDraft } from '../src/lessons/authoring';
import { lessonFileText } from '../src/lessons/lesson-file';
import { emptyProgress, recordGrade, resultsFile, type ResultsFile } from '../src/lessons/progress';
import { checkResults, type ResultsCheck } from '../src/lessons/recheck';
import type { DesignLesson, Lesson } from '../src/lessons/types';
import { expectedOf, flyLessonLive } from './recheck-harness';
import { designDateJd, designFigures, withValue } from '../src/design/satellite-model';
import { designLessonStart } from '../src/design/design-lesson-key';
import { gradeDesign, lockGroupKeys } from '../src/lessons/design-lesson';
import { readDesignLesson, type FileIssue } from '../src/lessons/lesson-file';
import { designRecord, type LessonRecord } from '../src/lessons/progress';
import { designLessonKey } from '../src/ui/lessons/design-key';
import type { SatelliteDesign } from '../src/design/satellite-spec';

export const FIXTURE_LAUNCH = '2026-10-05T03:00:00.000Z';
export const RECORD_APP = '0.1.0+fixture';
export const CHECKER_APP = '0.1.0+checker';
/** The design lessons' design date: their figures are read on it, whatever day the fixtures are checked. */
export const DESIGN_DATE = '2026-10-05';
export const RESULTS_NAME = 'results.orbitlab-results.json';

const lesson = (id: string): Lesson => {
  const l = BUILTIN_LESSONS.find((x) => x.id === id);
  if (!l) throw new Error(`no lesson ${id}`);
  return l;
};

/** A built-in lesson's mission at the fixture's launch time, edited. */
function missionFrom(id: string, edit: (s: ReturnType<typeof missionStateOf>) => void = () => {}) {
  const state = missionStateOf(lesson(id).mission);
  state.launchTime = new Date(FIXTURE_LAUNCH);
  edit(state);
  return missionDocument(state);
}

function written(draft: LessonDraft, mission: ReturnType<typeof missionDocument>): Lesson {
  const { lesson: l, issues } = draftLesson(draft, mission);
  if (!l || issues.length) throw new Error(`${draft.id}: ${JSON.stringify(issues)}`);
  return l;
}

/** The scenario's two lessons. */
export function scenarioLessons(): Lesson[] {
  const leo = written({
    id: 'class-leo', mode: 'explore', domains: [2, 3],
    title: { en: 'A payload to 500 km', ru: 'Полезный груз на 500 км', th: 'น้ำหนักบรรทุกสู่ 500 กม.' },
    brief: {
      en: 'Fly Falcon 9 into the 500 km circular orbit with a payload you choose, keep at least 100 m/s in the second stage, and type the orbit\'s period.',
      ru: 'Выведите Falcon 9 на круговую орбиту 500 км с выбранным вами грузом, сохраните во второй ступени не меньше 100 м/с и введите период орбиты.',
      th: 'นำ Falcon 9 ขึ้นสู่วงโคจรวงกลม 500 กม. พร้อมน้ำหนักบรรทุกที่เลือกเอง ให้ขั้นที่ 2 เหลือ Δv อย่างน้อย 100 ม./วินาที แล้วพิมพ์คาบของวงโคจร',
    },
    hints: [{ en: 'T = 2π√(a³/μ)', ru: 'T = 2π√(a³/μ)', th: 'T = 2π√(a³/μ)' }],
    locked: DEFAULT_LOCKS.filter((k) => k !== 'setup.payloadMass'),
    criteria: [
      { kind: 'outcome', is: 'target' },
      { kind: 'measure', measure: 'dvLeft', min: 100 },
      { kind: 'answer', measure: 'orbit.period', tol: 0.5, prompt: { en: 'Period (min)', ru: 'Период (мин)', th: 'คาบ (นาที)' } },
    ],
  }, missionFrom('orbit-first'));
  const abort = written({
    id: 'class-abort', mode: 'explore', domains: [6],
    title: { en: 'Abort at max-Q', ru: 'Спасение на максимальном напоре', th: 'ยกเลิกการปล่อยที่ max-Q' },
    brief: {
      en: 'A crewed Soyuz. Press Abort at T+60 s, fly until the crew is down, and type the peak load on the crew.',
      ru: 'Пилотируемый «Союз». Нажмите «Авария» на T+60 с, выполните полёт до приземления экипажа и введите максимальную перегрузку экипажа.',
      th: 'ยานโซยุซมีมนุษย์ กดยกเลิกการปล่อยที่ T+60 วินาที บินจนลูกเรือถึงพื้น แล้วพิมพ์ภาระสูงสุดที่ลูกเรือได้รับ',
    },
    hints: [],
    locked: DEFAULT_LOCKS.filter((k) => k !== 'setup.failure'),
    endEvent: 'evt.abortCrewSafe',
    criteria: [
      { kind: 'event', key: 'evt.abortCrewSafe', present: true },
      { kind: 'answer', measure: 'abort.maxG', tolPct: 10, prompt: { en: 'Peak load (g)', ru: 'Максимальная перегрузка (ед.)', th: 'ภาระสูงสุด (g)' } },
    ],
  }, missionFrom('fail-abort', (s) => { s.failure = { ...s.failure, mode: 'none' }; }));
  return [leo, abort];
}

/** A design lesson as a lesson file holds it, read back through the reader. */
function designLesson(raw: Omit<DesignLesson, 'kind' | 'track' | 'order'>): DesignLesson {
  const issues: FileIssue[] = [];
  const l = readDesignLesson({ kind: 'design', track: 9, order: 1, ...raw }, 'fixture', issues);
  if (!l || issues.length) throw new Error(`${raw.id}: ${JSON.stringify(issues)}`);
  return l;
}

/** The scenario's two design lessons (T01). */
export function designLessons(): DesignLesson[] {
  const power = designLesson({
    id: 'class-power', mode: 'explore', domains: [1, 2],
    title: { en: 'Power through the eclipse', ru: 'Мощность в тени', th: 'กำลังไฟฟ้าตลอดอุปราคา' },
    brief: {
      en: 'Give NAPA-2 a power margin of at least 10 % at the end of its life, the battery drained no deeper than 30 %, and type its longest eclipse.',
      ru: 'Обеспечьте NAPA-2 запас мощности не меньше 10 % к концу срока службы при разряде аккумулятора не глубже 30 % и введите самую длинную тень.',
      th: 'ทำให้ NAPA-2 มีค่าเผื่อกำลังไฟฟ้าอย่างน้อย 10 % เมื่อสิ้นอายุการใช้งาน แบตเตอรี่คายประจุไม่เกิน 30 % แล้วพิมพ์อุปราคานานที่สุด',
    },
    start: { template: 'napa2' }, designDate: DESIGN_DATE, level: 'moderate',
    locked: [...lockGroupKeys('orbit'), ...lockGroupKeys('bus'), 'power.payloadW', 'power.busW'],
    criteria: [
      { id: 'margin', kind: 'design', measure: 'sat.powerMargin', min: 10 },
      { id: 'battery', kind: 'design', measure: 'sat.batteryDod', max: 30 },
      { id: 'eclipse', kind: 'answer', measure: 'sat.eclipseMax', tol: 1, prompt: { en: 'Longest eclipse (min)', ru: 'Самая длинная тень (мин)', th: 'อุปราคานานที่สุด (นาที)' } },
    ],
    hints: [],
  });
  const theos = designLesson({
    id: 'class-theos', mode: 'engineer', domains: [2],
    title: { en: 'An imager that lasts and leaves', ru: 'Съёмочный спутник: прослужить и уйти', th: 'ดาวเทียมถ่ายภาพที่อยู่นานแล้วออกจากวงโคจร' },
    brief: {
      en: 'Keep the THEOS-2-class imager up for its ten years and down within IADC\'s 25, bring 100 Gbit down to Bangkok a day, and type its swath.',
      ru: 'Сохраните съёмочный спутник класса THEOS-2 на орбите все десять лет и сведите его в течение 25 лет по правилу IADC, передавайте в Бангкок 100 Гбит в сутки и введите полосу обзора.',
      th: 'ให้ดาวเทียมถ่ายภาพระดับ THEOS-2 อยู่ในวงโคจรครบ 10 ปีและตกสู่บรรยากาศภายใน 25 ปีตามแนวทาง IADC ส่งข้อมูลลงกรุงเทพฯ วันละ 100 กิกะบิต แล้วพิมพ์ความกว้างแนวถ่ายภาพ',
    },
    start: { template: 'theos2' }, designDate: DESIGN_DATE, level: 'moderate',
    requirements: {
      target: { lat: 13.7563, lon: 100.5018, name: 'Bangkok' }, gsd: 0.5, revisitDays: 26, daylightOnly: true, ltan: 22.25,
      lifeYears: 10, activity: 'moderate', dataPerDay: 100e9, stations: ['bangkok'], minElDeg: 10, disposal: '25y',
    },
    locked: lockGroupKeys('bus'),
    criteria: [
      { id: 'life', kind: 'design', measure: 'sat.lifetime', min: 10 },
      { id: 'down', kind: 'design', measure: 'sat.disposal25y', min: 1 },
      { id: 'data', kind: 'design', measure: 'sat.dataPerDay', min: 100 },
      { id: 'gsd', kind: 'design', measure: 'sat.gsd', max: 0.55 },
      { id: 'dv', kind: 'design', measure: 'sat.dvMargin', min: 0 },
      { id: 'swath', kind: 'answer', measure: 'sat.swath', tolPct: 2, prompt: { en: 'Swath (km)', ru: 'Полоса обзора (км)', th: 'ความกว้างแนวถ่ายภาพ (กม.)' } },
    ],
    hints: [],
  });
  return [power, theos];
}

type DesignValues = Awaited<ReturnType<typeof designLessonKey>>['values'];

/** A design handed in as the lesson strip hands it in (src/ui/lessons/lesson-mode.ts): the key, the grade, the record. */
async function handIn(lesson: DesignLesson, design: SatelliteDesign, at: Date, answers: (values: DesignValues) => Record<string, number>): Promise<LessonRecord> {
  const key = await designLessonKey(lesson, design, new AbortController().signal);
  const typed = answers(key.values);
  const grade = gradeDesign(lesson, key, typed);
  return designRecord({ at, grade, answers: typed, hintsShown: 0, design, designDate: lesson.designDate, level: lesson.level, figures: key.values, app: RECORD_APP });
}

export interface RecheckFixtures {
  scenario: string;
  results: ResultsFile;
  expected: ResultsCheck;
}

/** Fly the three records, keep them in a results file, and check it. */
export async function buildRecheckFixtures(): Promise<RecheckFixtures> {
  const [leo, abort] = scenarioLessons();
  const at = (minute: number) => new Date(Date.UTC(2026, 9, 6, 7, minute));
  const border = flyLessonLive(leo, {
    seed: 11, app: RECORD_APP, at: at(10),
    answers: (g) => ({ c3: expectedOf(g, 'c3') + 0.5 - 0.0004 }),
  });
  const heavy = flyLessonLive(leo, {
    seed: 12, app: RECORD_APP, at: at(20), edit: (s) => { s.payloadMass = 20_000; },
    answers: (g) => ({ c3: expectedOf(g, 'c3') }),
  });
  const escape = flyLessonLive(abort, {
    seed: 13, app: RECORD_APP, at: at(30), maxWarp: 4, commands: [{ at: 60, give: (s) => s.commandAbort() }],
    answers: (g) => ({ c2: expectedOf(g, 'c2') * 1.03 }),
  });
  const verdicts = [border, heavy, escape].map((f) => f.record.verdict);
  if (verdicts.join() !== 'pass,fail,pass') throw new Error(`the records are not a pass, a fail and a pass: ${verdicts}`);
  // T01: the design records
  const [power, theos] = designLessons();
  const napa = designLessonStart(power.start, 'fixture-napa2', 'NAPA-2 (fixture)');
  const need = designFigures(napa, designDateJd(DESIGN_DATE)!, { level: power.level }).power.areaNeeded.value;
  const typedEclipse = (v: DesignValues) => ({ eclipse: v['sat.eclipseMax']! + 0.3 });
  const edge = await handIn(power, withValue(napa, 'power.arrayArea', need * (1.1 + 2e-11)), at(40), typedEclipse);
  const flown = await handIn(power, napa, at(50), typedEclipse);
  const imager = await handIn(theos, designLessonStart(theos.start, 'fixture-theos2', 'THEOS-2 (fixture)'), at(60), (v) => ({ swath: v['sat.swath']! * 1.01 }));
  const designVerdicts = [edge, flown, imager].map((r) => r.verdict);
  if (designVerdicts.join() !== 'pass,fail,pass') throw new Error(`the design records are not a pass, a fail and a pass: ${designVerdicts}`);
  const data = emptyProgress();
  recordGrade(data, { lessonId: leo.id, ...border.record });
  recordGrade(data, { lessonId: leo.id, ...heavy.record });
  recordGrade(data, { lessonId: abort.id, ...escape.record });
  recordGrade(data, { lessonId: power.id, ...edge });
  recordGrade(data, { lessonId: power.id, ...flown });
  recordGrade(data, { lessonId: theos.id, ...imager });
  const results = JSON.parse(JSON.stringify(await resultsFile(data, new Date(Date.UTC(2026, 9, 6, 8)), 'Student A (fixture)'))) as ResultsFile;
  const scenario = lessonFileText([leo, abort, power, theos]);
  const expected = await checkResults({ results: [results], names: [RESULTS_NAME], lessons: [leo, abort, power, theos] }, { app: CHECKER_APP });
  const statuses = expected.records.map((r) => `${r.lessonId}/${r.which.join('+')}:${r.status}`);
  const want = ['class-leo/passed:borderline', 'class-leo/last:match', 'class-abort/passed+last:match',
    'class-power/passed:borderline', 'class-power/last:match', 'class-theos/passed+last:match'];
  if (statuses.join() !== want.join()) throw new Error(`the check is not what the fixture claims: ${statuses}`);
  return { scenario, results, expected: JSON.parse(JSON.stringify(expected)) as ResultsCheck };
}
