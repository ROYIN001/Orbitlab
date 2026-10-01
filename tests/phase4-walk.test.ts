/**
 * Small fixes from Phase 4's last check in Chromium (task W). A student, a
 * cadet and a teacher used the built app in en, ru and th at 1440, 375 and
 * 360 px. Each fix that has a DOM-free part is held here.
 *
 * CRITERIA, fixed before the first run (exact strings: grammar, not a
 * measurement):
 * - "Open lesson file" and a `?scenario=` link: the notice gives each count
 *   with its word in the right form. For one lesson it says "1 lesson"
 *   («1 урок», «บทเรียน 1 บท»). Before, it said "1 lessons" (left open by I2,
 *   item 4 of its open problems).
 */
import { describe, expect, it } from 'vitest';
import { setLang, t, tCount } from '../src/i18n';

const NBSP = ' ';
const say = (s: string): string => s.split(NBSP).join(' ');

function withLang<T>(lang: 'en' | 'ru' | 'th', fn: () => T): T {
  const g = globalThis as { document?: unknown };
  if (!g.document) g.document = { documentElement: {} };
  setLang(lang);
  try { return fn(); } finally { setLang('en'); }
}

const loaded = (lang: 'en' | 'ru' | 'th', lessons: number, questions: number): string => withLang(lang, () => say(t('lesson.file.loaded', {
  lessons: tCount('lesson.file.n.lessons', lessons), questions: tCount('lesson.file.n.questions', questions),
})));

describe('the lesson file notice counts in words (W)', () => {
  it('says one lesson in the singular', () => {
    expect(loaded('en', 1, 0)).toBe('Added from the file: 1 lesson and 0 placement-test questions.');
    expect(loaded('en', 3, 1)).toBe('Added from the file: 3 lessons and 1 placement-test question.');
    expect(loaded('ru', 1, 0)).toBe('Из файла добавлено: 1 урок и 0 вопросов входного теста.');
    expect(loaded('ru', 2, 5)).toBe('Из файла добавлено: 2 урока и 5 вопросов входного теста.');
    expect(loaded('ru', 21, 22)).toBe('Из файла добавлено: 21 урок и 22 вопроса входного теста.');
    expect(loaded('th', 1, 0)).toBe('เพิ่มจากไฟล์แล้ว: บทเรียน 1 บท และข้อสอบวัดพื้นฐาน 0 ข้อ');
  });
});
