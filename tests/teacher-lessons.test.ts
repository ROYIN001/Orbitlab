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
 */
import { describe, expect, it } from 'vitest';
import { allLessons, AUTHOR_TRACK, BUILTIN_CASE_LESSONS, BUILTIN_LESSONS, lessonNumber, numberTeacherLessons } from '../src/lessons/catalog';
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
