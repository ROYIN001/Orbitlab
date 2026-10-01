/**
 * A teacher's lessons in the catalogue (roadmap T01; Phase 4 stage 3b, task
 * I2): what the stage-3a instructor-mode review left open about lessons that
 * come from a file.
 *
 * CRITERIA, fixed before the first run (exact; these are numbers and lists,
 * not measurements):
 * - item 2: lessons written by the scenario writer (`draftLesson`, which
 *   writes each as the first of its own file, `order: 1`) are numbered 9.1,
 *   9.2, 9.3 in the order they are written in a file, and a later file's go
 *   on from there (9.4); a lesson a file places in another track keeps the
 *   file's number; the built-in lessons' numbers do not move; the lessons
 *   kept are not changed (the numbers are the catalogue's).
 * - item 4: of a file's lessons, one under a built-in lesson's id is not
 *   taken and is handed back to be named (it was dropped without a word);
 *   the others are kept, a lesson already kept replaced where it stands and
 *   a new one after; the sentence that names it has its title and id, in
 *   each of the three languages, with no placeholder left.
 */
import { describe, expect, it } from 'vitest';
import { allLessons, AUTHOR_TRACK, BUILTIN_CASE_LESSONS, BUILTIN_LESSONS, BUILTIN_LESSON_IDS, lessonNumber, lessonsWithFiles, numberTeacherLessons, takeLessons } from '../src/lessons/catalog';
import { setLang, t } from '../src/i18n';
import { localText } from '../src/lessons/text';
import { draftLesson, newDraft, type LessonDraft } from '../src/lessons/authoring';
import { lessonFileText, parseLessonFile } from '../src/lessons/lesson-file';
import { missionDocument } from '../src/config/mission-file';
import { defaultMissionState } from '../src/lessons/config';
import type { CatalogLesson, Lesson } from '../src/lessons/types';

const MISSION = missionDocument(defaultMissionState());

/** A lesson as the scenario writer writes it. */
function written(id: string, title: string): Lesson {
  const draft: LessonDraft = { ...newDraft(id), title: { en: title, ru: '', th: '' }, brief: { en: `${title}: reach the orbit.`, ru: '', th: '' } };
  const { lesson, issues } = draftLesson(draft, MISSION);
  expect(issues.filter((i) => i.level === 'error'), id).toEqual([]);
  expect(lesson!.track).toBe(AUTHOR_TRACK);
  expect(lesson!.order).toBe(1);
  return lesson!;
}

/** A lesson file's text, read back as "Open lesson file" reads it. */
const readBack = (lessons: CatalogLesson[]): CatalogLesson[] => {
  const parsed = parseLessonFile(JSON.parse(lessonFileText(lessons)), new Set());
  expect(parsed.usable).toBe(true);
  return parsed.lessons;
};

const numbers = (catalogue: CatalogLesson[], ids: string[]): string[] => ids.map((id) => lessonNumber(catalogue.find((l) => l.id === id)!));

describe('a teacher\'s lessons are numbered in the order they are written (I2, item 2)', () => {
  it('numbers a file\'s lessons 9.1, 9.2, 9.3 in the order written, and a later file\'s on from there', () => {
    const file = readBack([written('class-c', 'Third'), written('class-a', 'First'), written('class-b', 'Second')]);
    expect(file.map((l) => l.order)).toEqual([1, 1, 1]); // as written: each the first of its own file
    const one = allLessons(file);
    // the order written in the file, not the ids' order
    expect(numbers(one, ['class-c', 'class-a', 'class-b'])).toEqual(['9.1', '9.2', '9.3']);
    const teacher = one.filter((l) => l.track === AUTHOR_TRACK);
    expect(teacher.map((l) => l.id)).toEqual(['class-c', 'class-a', 'class-b']);
    // a second file, opened after
    const two = allLessons([...file, ...readBack([written('class-d', 'Fourth')])]);
    expect(numbers(two, ['class-c', 'class-a', 'class-b', 'class-d'])).toEqual(['9.1', '9.2', '9.3', '9.4']);
    // the lessons kept are not changed
    expect(file.map((l) => l.order)).toEqual([1, 1, 1]);
  });

  // ADDED BY THE REVIEW (criterion fixed before the run, exact): the checking tab put a lesson file's lessons
  // before the ones this browser keeps, so with the numbering above a kept 9.2 opened again there read 9.1
  it('gives a teacher\'s lessons the catalogue\'s numbers on the check too, a file opened there in the version it gives', () => {
    const a = written('class-a', 'First'), b = written('class-b', 'Second');
    const kept = [a, b];
    const opened = [readBack([{ ...written('class-b', 'Second, as sent') }, written('class-x', 'New')]), readBack([written('class-x', 'New, second file')])];
    // the files' lessons first, as the check used to put them: class-b would be 9.1
    const filesFirst = [...opened.flat().filter((l, i, all) => all.findIndex((x) => x.id === l.id) === i), ...kept.filter((l) => !opened.flat().some((x) => x.id === l.id))];
    expect(numbers(allLessons(filesFirst), ['class-b', 'class-a'])).toEqual(['9.1', '9.3']);
    const check = lessonsWithFiles(kept, opened);
    expect(check.map((l) => l.id)).toEqual(['class-a', 'class-b', 'class-x']);
    expect(numbers(allLessons(check), ['class-a', 'class-b', 'class-x'])).toEqual(['9.1', '9.2', '9.3']);
    expect(numbers(allLessons(check), ['class-a', 'class-b'])).toEqual(numbers(allLessons(kept), ['class-a', 'class-b']));
    // the version the file gives, the first file's for a lesson two files give
    expect(localText(check[1].title)).toBe('Second, as sent');
    expect(localText(check[2].title)).toBe('New');
  });

  it('keeps the number a file gives a lesson in another track, and the built-in lessons\' numbers', () => {
    const elsewhere = { ...written('class-e', 'Elsewhere'), track: 7, order: 5 };
    const kept = [written('class-f', 'Mine'), elsewhere];
    const catalogue = allLessons(kept);
    expect(numbers(catalogue, ['class-f', 'class-e'])).toEqual(['9.1', '7.5']);
    expect(numberTeacherLessons(kept)[1]).toBe(elsewhere);
    const builtin = new Map([...BUILTIN_LESSONS, ...BUILTIN_CASE_LESSONS].map((l) => [l.id, lessonNumber(l)]));
    for (const l of catalogue) if (builtin.has(l.id)) expect(lessonNumber(l), l.id).toBe(builtin.get(l.id));
    expect(allLessons().map(lessonNumber)).toEqual(allLessons(kept).filter((l) => builtin.has(l.id)).map(lessonNumber));
  });
});

describe('a lesson file\'s lesson under a built-in lesson\'s id is named, not dropped (I2, item 4)', () => {
  /** A lesson file written by hand (or by a copy before the writer refused the id): lesson 1.1 under its own id, retitled. */
  const clash = (): CatalogLesson => {
    const l = BUILTIN_LESSONS.find((x) => x.id === 'orbit-first')!;
    return { ...l, title: { en: 'My first orbit', ru: 'Моя первая орбита', th: 'วงโคจรแรกของฉัน' } };
  };

  it('takes the file\'s other lessons, replaces a kept one where it stands, and hands the clash back', () => {
    const a = written('class-a', 'First'), b = written('class-b', 'Second');
    const b2 = { ...written('class-b', 'Second, corrected') };
    const file = readBack([clash(), b2, written('class-c', 'Third')]);
    expect(file.map((l) => l.id)).toEqual(['orbit-first', 'class-b', 'class-c']); // the reader itself keeps it
    const { lessons, builtin } = takeLessons([a, b], file);
    expect(builtin.map((l) => l.id)).toEqual(['orbit-first']);
    expect(BUILTIN_LESSON_IDS.has('orbit-first')).toBe(true);
    expect(lessons.map((l) => l.id)).toEqual(['class-a', 'class-b', 'class-c']);
    expect(localText(lessons[1].title)).toBe('Second, corrected');
    // the catalogue: the built-in 1.1 under its id, the teacher's in order
    const catalogue = allLessons(lessons);
    expect(catalogue.filter((l) => l.id === 'orbit-first')).toEqual([BUILTIN_LESSONS.find((x) => x.id === 'orbit-first')]);
    expect(numbers(catalogue, ['class-a', 'class-b', 'class-c'])).toEqual(['9.1', '9.2', '9.3']);
    // nothing to name in a file without a clash
    expect(takeLessons(lessons, readBack([written('class-d', 'Fourth')])).builtin).toEqual([]);
  });

  it('names the lesson, its title and its id, in English, Russian and Thai', () => {
    const g = globalThis as { document?: unknown };
    if (!g.document) g.document = { documentElement: {} };
    const l = clash();
    const said: Record<string, string> = {};
    try {
      for (const lang of ['en', 'ru', 'th'] as const) {
        setLang(lang);
        said[lang] = t('lesson.author.notTaken', { title: localText(l.title), id: l.id });
        expect(said[lang], lang).toContain(localText(l.title));
        expect(said[lang], lang).toContain('orbit-first');
        expect(said[lang], lang).not.toMatch(/\{[a-zA-Z]+\}/);
      }
    } finally { setLang('en'); }
    expect(said.ru).toMatch(/[\u0400-\u04FF]/);
    expect(said.th).toMatch(/[\u0E00-\u0E7F]/);
    expect(new Set(Object.values(said)).size).toBe(3);
  });
});
