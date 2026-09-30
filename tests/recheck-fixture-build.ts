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
import type { Lesson } from '../src/lessons/types';
import { expectedOf, flyLessonLive } from './recheck-harness';

export const FIXTURE_LAUNCH = '2026-10-05T03:00:00.000Z';
export const RECORD_APP = '0.1.0+fixture';
export const CHECKER_APP = '0.1.0+checker';
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
  const data = emptyProgress();
  recordGrade(data, { lessonId: leo.id, ...border.record });
  recordGrade(data, { lessonId: leo.id, ...heavy.record });
  recordGrade(data, { lessonId: abort.id, ...escape.record });
  const results = JSON.parse(JSON.stringify(await resultsFile(data, new Date(Date.UTC(2026, 9, 6, 8)), 'Student A (fixture)'))) as ResultsFile;
  const scenario = lessonFileText([leo, abort]);
  const expected = await checkResults({ results: [results], names: [RESULTS_NAME], lessons: [leo, abort] }, { app: CHECKER_APP });
  const statuses = expected.records.map((r) => `${r.lessonId}/${r.which.join('+')}:${r.status}`);
  const want = ['class-leo/passed:borderline', 'class-leo/last:match', 'class-abort/passed+last:match'];
  if (statuses.join() !== want.join()) throw new Error(`the check is not what the fixture claims: ${statuses}`);
  return { scenario, results, expected: JSON.parse(JSON.stringify(expected)) as ResultsCheck };
}
