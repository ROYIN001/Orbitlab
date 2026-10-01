/**
 * The lesson catalogue (roadmap E03): the built-in lessons, read through the
 * same reader as a teacher's file, and the tracks they are listed under —
 * five of flight lessons and, sixth, the cases from the record (P2.5).
 */
import { readAnyLesson, type FileIssue } from './lesson-file';
import { TRACK1 } from './builtin/track1';
import { TRACK2 } from './builtin/track2';
import { TRACK3 } from './builtin/track3';
import { TRACK4 } from './builtin/track4';
import { TRACK5 } from './builtin/track5';
import { TRACK6 } from './builtin/track6';
import { COMING } from './builtin/coming';
import { isCaseLesson, isFlightLesson, type CaseLesson, type CatalogLesson, type Lesson, type LocalText } from './types';

/** What reading the built-in lessons reported; the tests hold it empty. */
export const BUILTIN_ISSUES: FileIssue[] = [];

function readAll(raw: readonly unknown[], from: string): CatalogLesson[] {
  const out: CatalogLesson[] = [];
  raw.forEach((l, i) => {
    const lesson = readAnyLesson(l, `${from}[${i}]`, BUILTIN_ISSUES);
    if (lesson) out.push(lesson);
  });
  return out;
}

/** The built-in flight lessons, tracks 1–5: everything that flies a lesson reads these. */
export const BUILTIN_LESSONS: readonly Lesson[] = readAll([...TRACK1, ...TRACK2, ...TRACK3, ...TRACK4, ...TRACK5, ...COMING], 'builtin')
  .filter(isFlightLesson);

/** The built-in case lessons, track 6 (P2.5's cases from the record). */
export const BUILTIN_CASE_LESSONS: readonly CaseLesson[] = readAll(TRACK6, 'builtin.track6').filter(isCaseLesson);

export interface Track { id: number; title: LocalText; note: LocalText }

export const TRACKS: readonly Track[] = [
  { id: 1, title: { en: 'Orbital mechanics', ru: 'Орбитальная механика', th: 'กลศาสตร์วงโคจร' },
    note: { en: 'Explore · point mass', ru: 'Исследование · материальная точка', th: 'สำรวจภารกิจ · จุดมวล' } },
  { id: 2, title: { en: 'Guidance and navigation', ru: 'Наведение и навигация', th: 'การนำวิถีและการนำทาง' },
    note: { en: 'Engineer · mostly six-DOF', ru: 'Инженер · в основном 6 степеней свободы', th: 'วิศวกร · ส่วนใหญ่ 6-DOF' } },
  { id: 3, title: { en: 'Failures', ru: 'Отказы', th: 'ความผิดปกติ' },
    note: { en: 'Failure scenarios', ru: 'Аварийные ситуации', th: 'สถานการณ์ขัดข้อง' } },
  { id: 4, title: { en: 'Attitude control', ru: 'Управление угловым движением', th: 'ระบบควบคุมท่าทาง' },
    note: { en: 'Engineer · six-DOF', ru: 'Инженер · 6 степеней свободы', th: 'วิศวกร · 6-DOF' } },
  { id: 5, title: { en: 'Advanced missions', ru: 'Сложные миссии', th: 'ภารกิจขั้นสูง' },
    note: { en: 'Several phases', ru: 'Несколько этапов', th: 'หลายขั้นตอน' } },
  { id: 6, title: { en: 'Real cases', ru: 'Реальные случаи', th: 'กรณีศึกษาจากเหตุการณ์จริง' },
    note: { en: 'Orbit section · real satellites', ru: 'Раздел «Орбита» · реальные спутники', th: 'ส่วนวงโคจร · ดาวเทียมจริง' } },
];

/** The catalogue's number for a lesson: "1.2". */
export const lessonNumber = (l: Pick<Lesson, 'track' | 'order'>): string => `${l.track}.${l.order}`;

/**
 * A teacher's lessons are listed after the six tracks, under the catalogue's
 * own heading for them: the track the scenario writer writes (T01), and the
 * reader's for a lesson that names none (src/lessons/lesson-file.ts).
 */
export const AUTHOR_TRACK = 9;

/** The built-in lessons' ids, of both kinds: the catalogue lists the built-in lesson under each. */
export const BUILTIN_LESSON_IDS: ReadonlySet<string> = new Set([...BUILTIN_LESSONS, ...BUILTIN_CASE_LESSONS].map((l) => l.id));

/** What this browser keeps of a file's lessons, and the ones it does not take (`takeLessons`). */
export interface TakenLessons {
  /** the lessons kept, the file's among them */
  lessons: CatalogLesson[];
  /** the file's lessons under a built-in lesson's id, not taken */
  builtin: CatalogLesson[];
}

/**
 * A file's lessons into the ones this browser keeps (roadmap T01; Phase 4
 * stage 3b, task I2, item 4): a lesson under a built-in lesson's id is not
 * taken, and is handed back to be named — the catalogue lists the built-in
 * lesson under that id, so the file's could never be opened, and "Open
 * lesson file" used to drop it without a word (the scenario writer refuses
 * such an id; a file written by hand or by an older copy may carry one). A
 * lesson already kept is replaced where it stands, so a file opened again
 * keeps its lessons' numbers; the rest follow in the order they are written
 * in the file.
 */
export function takeLessons(kept: readonly CatalogLesson[], added: readonly CatalogLesson[]): TakenLessons {
  const builtin = added.filter((l) => BUILTIN_LESSON_IDS.has(l.id));
  const taken = added.filter((l) => !BUILTIN_LESSON_IDS.has(l.id));
  const lessons = kept.map((l) => taken.find((x) => x.id === l.id) ?? l);
  for (const l of taken) if (!kept.some((x) => x.id === l.id)) lessons.push(l);
  return { lessons, builtin };
}

/**
 * The lessons a check of results files holds its records to (the lessons
 * page's checking tab, src/ui/lessons/check-view.ts): those this browser
 * keeps, each in its place in the version a lesson file opened there gives
 * it, then the files' other lessons, the first file's first. So a teacher's
 * lesson has the catalogue's number on the check too (task I2's review: with
 * the files' lessons put first, a kept 9.2 opened again on the check read 9.1).
 */
export function lessonsWithFiles(kept: readonly CatalogLesson[], files: readonly (readonly CatalogLesson[])[]): CatalogLesson[] {
  const added: CatalogLesson[] = [];
  for (const f of files) for (const l of f) if (!added.some((x) => x.id === l.id)) added.push(l);
  return takeLessons(kept, added).lessons;
}

/**
 * The teacher's lessons (the author track) numbered 1, 2, 3… in the order
 * they are kept: each file's in the order they are written in it, the files
 * in the order they were opened (task I2, item 2). The writer writes each
 * lesson as the first of a file of its own (`order: 1`), so every teacher's
 * lesson used to read "9.1". A lesson a file places in another track keeps
 * the file's number. Copies: the lessons kept are not changed.
 */
export function numberTeacherLessons(custom: readonly CatalogLesson[]): CatalogLesson[] {
  let n = 0;
  return custom.map((l) => (l.track === AUTHOR_TRACK ? { ...l, order: ++n } : l));
}

/** The built-in lessons of both kinds followed by any a teacher's file added (a teacher's numbered in order), in catalogue order. */
export function allLessons(custom: readonly CatalogLesson[] = []): CatalogLesson[] {
  const builtin: CatalogLesson[] = [...BUILTIN_LESSONS, ...BUILTIN_CASE_LESSONS];
  const own = numberTeacherLessons(custom.filter((l) => !BUILTIN_LESSON_IDS.has(l.id)));
  return [...builtin, ...own].sort((a, b) => a.track - b.track || a.order - b.order);
}
