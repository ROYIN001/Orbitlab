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
import { isCaseLesson, type CaseLesson, type CatalogLesson, type Lesson, type LocalText } from './types';

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
  .filter((l): l is Lesson => !isCaseLesson(l));

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

/** The built-in lessons of both kinds followed by any a teacher's file added, in catalogue order. */
export function allLessons(custom: readonly CatalogLesson[] = []): CatalogLesson[] {
  const builtin: CatalogLesson[] = [...BUILTIN_LESSONS, ...BUILTIN_CASE_LESSONS];
  const ids = new Set(builtin.map((l) => l.id));
  return [...builtin, ...custom.filter((l) => !ids.has(l.id))].sort((a, b) => a.track - b.track || a.order - b.order);
}
