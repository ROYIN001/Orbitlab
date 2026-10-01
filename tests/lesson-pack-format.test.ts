/**
 * The lesson-pack format (roadmap T03, Phase 4 map §4.3): a lesson file's
 * optional `pack` and a lesson's optional `curriculum` codes. They round-trip
 * through the writer and the reader, raise no file version, leave the
 * lessons themselves exactly as a file without them reads them (what an
 * older reader, which skips both fields, gets), and a pack's references
 * resolve to the built-in lessons they name.
 */
import { describe, expect, it } from 'vitest';
import { BUILTIN_CASE_LESSONS, BUILTIN_LESSONS, allLessons } from '../src/lessons/catalog';
import { lessonFileText, parseLessonFile, type LessonFileDocument } from '../src/lessons/lesson-file';
import { packLessons, packOf, readPackText, resolvePack } from '../src/lessons/packs';
import { draftLesson, newDraft } from '../src/lessons/authoring';
import { missionDocument } from '../src/config/mission-file';
import { defaultMissionState } from '../src/lessons/config';
import type { CatalogLesson, Lesson, LessonPack } from '../src/lessons/types';

const builtin = (id: string): Lesson => {
  const l = BUILTIN_LESSONS.find((x) => x.id === id);
  if (!l) throw new Error(id);
  return l;
};

/** A pack's own lesson: a built-in flight under a new id, with codes. */
const own = (id: string, codes: Lesson['curriculum']): Lesson => ({ ...structuredClone(builtin('orbit-first')), id, track: 11, order: 1, ...(codes ? { curriculum: codes } : {}) });

const PACK: LessonPack = {
  id: 'test-pack',
  title: { en: 'A pack', ru: 'Набор', th: 'ชุดบทเรียน' },
  audience: { en: 'Grade 11', ru: '11 класс', th: 'ม.5' },
  framework: { en: 'IPST 2017', ru: 'IPST 2017', th: 'สสวท. 2560' },
  reviewed: false,
  contents: [
    { id: 'pack-one' },
    { id: 'orbit-payload', curriculum: [{ code: 'ว 2.2 ม.5/3', kind: 'indicator' }], note: { en: 'a = F/m', ru: 'a = F/m, сила', th: 'a = F/m แรง' } },
    { id: 'case-theos2', curriculum: [{ code: 'ว 3.1 ม.6/10', kind: 'indicator' }] },
  ],
};

const read = (text: string) => parseLessonFile(JSON.parse(text), new Set());

describe('a lesson pack file', () => {
  const lessons = [own('pack-one', [{ code: 'ว 2.2 ม.5/6', kind: 'indicator' }, { code: 'ฟส ม.4 ผล 17', kind: 'outcome' }])];

  it('round-trips the pack and the lessons\' codes, at the version the lessons need (no version of its own)', () => {
    const text = lessonFileText(lessons, [], PACK);
    const doc = JSON.parse(text) as LessonFileDocument;
    // a file of catalogue flights stays version 1, pack or not
    expect(doc.version).toBe(1);
    expect(Object.keys(doc)).toEqual(['format', 'version', 'pack', 'lessons']);
    const parsed = read(text);
    expect(parsed.issues).toEqual([]);
    expect(parsed.pack).toEqual(PACK);
    expect(parsed.lessons).toEqual(lessons);
    expect(lessonFileText(parsed.lessons, [], parsed.pack)).toBe(text);
  });

  it('reads the lessons exactly as a file without the pack fields reads them: an older reader loses only the grouping', () => {
    const doc = JSON.parse(lessonFileText(lessons, [], PACK)) as { format: string; version: number; lessons: Array<Record<string, unknown>> };
    const strip = (l: object) => Object.fromEntries(Object.entries(l).filter(([k]) => k !== 'curriculum'));
    const withFields = read(JSON.stringify(doc));
    const bare = { format: doc.format, version: doc.version, lessons: doc.lessons.map(strip) };
    const without = read(JSON.stringify(bare));
    expect(without.issues).toEqual(withFields.issues);
    expect(without.pack).toBeUndefined();
    expect(withFields.lessons.map(strip)).toEqual(without.lessons);
  });

  it('keeps a lesson whose codes cannot be read, leaving out only the bad codes with a warning', () => {
    const doc = JSON.parse(lessonFileText(lessons, [], PACK)) as { lessons: Array<{ curriculum: unknown[] }> };
    doc.lessons[0].curriculum.push({ code: 'X', kind: 'nonsense' }, { kind: 'outcome' }, 'ว 1');
    const parsed = parseLessonFile(doc, new Set());
    expect(parsed.lessons[0].curriculum).toEqual(lessons[0].curriculum);
    expect(parsed.issues.map((i) => [i.code, i.level])).toEqual([['invalid', 'warn'], ['invalid', 'warn'], ['invalid', 'warn']]);
  });

  it('reads a pack without a review flag as a draft, takes plain strings for audience and framework, and lists unnamed lessons after the named ones', () => {
    const second = own('pack-two', undefined);
    const doc = JSON.parse(lessonFileText([...lessons, second], [], PACK)) as { pack: Record<string, unknown> };
    delete doc.pack.reviewed;
    doc.pack.audience = 'M.5';
    doc.pack.framework = 'IPST-2560';
    doc.pack.contents = [{ id: 'orbit-payload' }, { id: 'orbit-payload' }, { id: 'pack-one', curriculum: [] }, 'x'];
    const parsed = parseLessonFile(doc, new Set());
    expect(parsed.pack?.reviewed).toBe(false);
    expect(parsed.pack?.audience).toEqual({ en: 'M.5' });
    expect(parsed.pack?.framework).toEqual({ en: 'IPST-2560' });
    expect(parsed.pack?.contents.map((e) => e.id)).toEqual(['orbit-payload', 'pack-one', 'pack-two']);
    expect(parsed.issues.map((i) => `${i.where} ${i.code} ${i.detail}`)).toEqual([
      'pack (test-pack).reviewed invalid reviewed',
      'pack (test-pack).contents[1] duplicate orbit-payload',
      'pack (test-pack).contents[2].curriculum invalid curriculum',
      'pack (test-pack).contents[3] invalid id',
    ]);
  });

  it('leaves out a pack it cannot read and keeps the file\'s lessons', () => {
    const doc = JSON.parse(lessonFileText(lessons, [], PACK)) as { pack: Record<string, unknown> };
    delete doc.pack.title;
    const parsed = parseLessonFile(doc, new Set());
    expect(parsed.usable).toBe(true);
    expect(parsed.pack).toBeUndefined();
    expect(parsed.lessons).toEqual(lessons);
    expect(parsed.issues.filter((i) => i.level === 'error').map((i) => i.code)).toEqual(['missing', 'pack']);
  });
});

describe('resolving a pack', () => {
  it('puts the pack\'s own lessons and the built-in ones it names in its order, each with its codes', () => {
    const lessons = [own('pack-one', [{ code: 'ว 2.2 ม.5/6', kind: 'indicator' }])];
    const resolved = resolvePack(read(lessonFileText(lessons, [], PACK)), 'test');
    expect(resolved?.issues).toEqual([]);
    expect(resolved?.items.map((i) => [i.lesson.id, i.reference, i.curriculum.map((c) => c.code), i.note?.en])).toEqual([
      ['pack-one', false, ['ว 2.2 ม.5/6'], undefined],
      ['orbit-payload', true, ['ว 2.2 ม.5/3'], 'a = F/m'],
      ['case-theos2', true, ['ว 3.1 ม.6/10'], undefined],
    ]);
    // a reference is the built-in lesson itself, not a copy
    expect(resolved?.items[1].lesson).toBe(BUILTIN_LESSONS.find((l) => l.id === 'orbit-payload'));
    expect(resolved?.items[2].lesson).toBe(BUILTIN_CASE_LESSONS.find((l) => l.id === 'case-theos2'));
    expect(resolved?.lessons.map((l) => l.id)).toEqual(['pack-one']);
  });

  it('reports an entry that names no lesson, and drops a pack lesson with a built-in id, as the catalogue would', () => {
    const clash = { ...own('orbit-first', undefined) };
    const pack: LessonPack = { ...PACK, contents: [{ id: 'nowhere' }, ...PACK.contents] };
    const resolved = resolvePack(read(lessonFileText([own('pack-one', undefined), clash], [], pack)), 'test');
    expect(resolved?.issues.map((i) => `${i.code} ${i.detail}`)).toEqual(['builtinId orbit-first', 'pack nowhere']);
    expect(resolved?.lessons.map((l) => l.id)).toEqual(['pack-one']);
    // allLessons itself keeps the built-in one whatever a pack says
    const both = allLessons([clash] as CatalogLesson[]).filter((l) => l.id === 'orbit-first');
    expect(both).toEqual([builtin('orbit-first')]);
  });

  it('is no pack for a teacher\'s plain file, nor for text that is not a lesson file', () => {
    expect(resolvePack(read(lessonFileText([own('pack-one', undefined)])), 'test')).toBeNull();
    expect(readPackText('not json', 'test')).toBeNull();
  });

  it('says which pack a lesson was opened from: its own lessons always, a built-in one only when opened there', () => {
    const resolved = resolvePack(read(lessonFileText([own('pack-one', undefined)], [], PACK)), 'test')!;
    expect(packOf([resolved], 'pack-one')?.index).toBe(0);
    expect(packOf([resolved], 'orbit-payload')).toBeNull();
    expect(packOf([resolved], 'orbit-payload', 'test-pack')?.index).toBe(1);
    expect(packLessons([resolved, resolved]).map((l) => l.id)).toEqual(['pack-one']);
  });
});

describe('the scenario writer and the packs', () => {
  it('refuses a pack lesson\'s id as it refuses a built-in one, and takes any other', () => {
    const mission = missionDocument(defaultMissionState());
    const draft = (id: string) => ({ ...newDraft(id), title: { en: 'T', ru: 'Т', th: 'ท' }, brief: { en: 'B', ru: 'Б', th: 'บ' } });
    const reserved = new Set(['ipst-b-forces']);
    const taken = draftLesson(draft('ipst-b-forces'), mission, undefined, reserved);
    expect(taken.lesson).toBeNull();
    expect(taken.issues.filter((i) => i.level === 'error').map((i) => `${i.code} ${i.detail}`)).toEqual(['pack ipst-b-forces']);
    expect(draftLesson(draft('class-forces'), mission, undefined, reserved).lesson?.id).toBe('class-forces');
    // without the packs known (their files not fetched), the id is not refused
    expect(draftLesson(draft('ipst-b-forces'), mission).lesson?.id).toBe('ipst-b-forces');
  });
});
