/**
 * The lesson packs' sources, by pack id, in the order the app lists them
 * (`BUNDLED_PACKS`, src/lessons/packs.ts), and the text of each pack's file
 * (roadmap T03). `scripts/lesson-packs.ts` writes these texts to
 * public/lessons/packs/; tests/lesson-packs.test.ts holds the committed
 * files to them. Not imported by the app (see common.ts).
 */
import { readAnyLesson, lessonFileText, type FileIssue } from '../lesson-file';
import type { CatalogLesson } from '../types';
import type { PackSource } from './common';
import { IPST_BASIC } from './ipst-basic';
import { IPST_EARTH_SPACE } from './ipst-earth-space';
import { IPST_PHYSICS } from './ipst-physics';
import { RTAF_ACADEMY } from './rtaf-academy';
import { RU_24_05_06 } from './ru-24-05-06';

export const PACK_SOURCES: Readonly<Record<string, PackSource>> = {
  'ipst-basic': IPST_BASIC,
  'ipst-earth-space': IPST_EARTH_SPACE,
  'ipst-physics': IPST_PHYSICS,
  'rtaf-academy': RTAF_ACADEMY,
  'ru-24-05-06': RU_24_05_06,
};

/**
 * A pack's file text, its lessons first read through the lesson-file reader
 * (as the built-in lessons are), so each mission is the normalised document a
 * file holds; with what reading them reported, which the tests hold empty.
 */
export function packFileText(id: string): { text: string; lessons: CatalogLesson[]; issues: FileIssue[] } {
  const source = PACK_SOURCES[id];
  if (!source) throw new Error(`no pack ${id}`);
  const issues: FileIssue[] = [];
  const lessons: CatalogLesson[] = [];
  source.lessons.forEach((raw, i) => {
    const lesson = readAnyLesson(raw, `${id}.lessons[${i}]`, issues);
    if (lesson) lessons.push(lesson);
  });
  return { text: lessonFileText(lessons, [], source.pack), lessons, issues };
}
