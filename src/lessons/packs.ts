/**
 * Lesson packs (roadmap T03, "Lessons matched to the Thai science curriculum
 * (IPST), built on the three sections"; Phase 4 map §4.3): lesson files that
 * ship with the app under public/lessons/packs/, each a group of lessons
 * matched to one curriculum. The service worker precaches them with the rest
 * of public/ (vite.config.ts), so they open offline, and the lessons page
 * fetches and reads them as it reads a teacher's file (`parseLessonFile`);
 * they are not written into the browser's storage.
 *
 * A pack lists its own lessons and, by reference, built-in ones (the T03
 * research's §8 item 1), so a tested lesson is listed again under the
 * pack's codes instead of being copied under a new id. This module resolves
 * those references against the catalogue — the reader cannot, since the
 * catalogue reads its own lessons through it — and drops what the catalogue
 * would: a pack lesson with a built-in lesson's id (`allLessons` keeps the
 * built-in one).
 *
 * DOM-free: the page hands in how a file is fetched, the tests read the
 * files from disk.
 */
import { BUILTIN_CASE_LESSONS, BUILTIN_LESSONS } from './catalog';
import { parseLessonFile, type FileIssue, type ParsedLessonFile } from './lesson-file';
import type { CatalogLesson, CurriculumCode, LessonPack, LocalText } from './types';

/**
 * The packs the app ships, in the order the lessons page lists them (the
 * research's order: the three IPST packs, then the two cadet curricula).
 * Each is `public/lessons/packs/<id>.orbitlab-lesson.json`.
 */
export const BUNDLED_PACKS: readonly string[] = ['ipst-basic', 'ipst-earth-space', 'ipst-physics', 'rtaf-academy', 'ru-24-05-06'];

/** Where a bundled pack is, relative to the page (the app is built with `base: './'`). */
export const packPath = (id: string): string => `lessons/packs/${id}.orbitlab-lesson.json`;

/** A lesson of a pack as the page lists it: the lesson, the codes it is matched to here, and whether it is a built-in one. */
export interface PackItem {
  lesson: CatalogLesson;
  curriculum: CurriculumCode[];
  /** a built-in lesson the pack reuses: it keeps its own number and track */
  reference: boolean;
  /** what the pack says the lesson is for here (`PackEntry.note`) */
  note?: LocalText;
}

export interface ResolvedPack {
  pack: LessonPack;
  items: PackItem[];
  /** the pack's own lessons, which the catalogue adds to the built-in ones */
  lessons: CatalogLesson[];
  /** where it came from: a bundled pack's path, or a file's name */
  source: string;
  issues: FileIssue[];
}

const BUILTIN: readonly CatalogLesson[] = [...BUILTIN_LESSONS, ...BUILTIN_CASE_LESSONS];

/**
 * A read lesson file's pack with its references resolved, or null when the
 * file is not a pack. An entry naming neither a lesson of the file nor a
 * built-in one is reported and skipped; so is a lesson of the file that
 * reuses a built-in id.
 */
export function resolvePack(parsed: ParsedLessonFile, source: string): ResolvedPack | null {
  const pack = parsed.pack;
  if (!parsed.usable || !pack) return null;
  const issues: FileIssue[] = [];
  const builtinIds = new Set(BUILTIN.map((l) => l.id));
  const lessons = parsed.lessons.filter((l) => {
    if (!builtinIds.has(l.id)) return true;
    issues.push({ where: `pack (${pack.id})`, code: 'builtinId', level: 'error', detail: l.id });
    return false;
  });
  const items: PackItem[] = [];
  for (const entry of pack.contents) {
    const own = lessons.find((l) => l.id === entry.id);
    const note = entry.note ? { note: entry.note } : {};
    if (own) { items.push({ lesson: own, curriculum: own.curriculum ?? [], reference: false, ...note }); continue; }
    const builtin = BUILTIN.find((l) => l.id === entry.id);
    if (builtin) { items.push({ lesson: builtin, curriculum: entry.curriculum ?? [], reference: true, ...note }); continue; }
    if (!builtinIds.has(entry.id)) issues.push({ where: `pack (${pack.id}).contents`, code: 'pack', level: 'error', detail: entry.id });
  }
  return { pack, items, lessons, source, issues };
}

/** A pack file's text, read and resolved; null when it is not a usable pack. */
export function readPackText(text: string, source: string, knownEvents?: ReadonlySet<string>): ResolvedPack | null {
  let raw: unknown = null;
  try { raw = JSON.parse(text); } catch { return null; }
  const parsed = parseLessonFile(raw, new Set(), knownEvents);
  const resolved = resolvePack(parsed, source);
  if (resolved) resolved.issues.unshift(...parsed.issues);
  return resolved;
}

/** What loading the bundled packs gave: the packs read, and the files that could not be had or read. */
export interface BundledPacks {
  packs: ResolvedPack[];
  failed: Array<{ id: string; reason: string }>;
}

/**
 * Fetch and read every bundled pack (`fetchText`: the page's fetch, the tests'
 * file reader). A pack that fails is reported and the others are kept.
 */
export async function loadBundledPacks(fetchText: (path: string) => Promise<string>, knownEvents?: ReadonlySet<string>): Promise<BundledPacks> {
  const out: BundledPacks = { packs: [], failed: [] };
  const read = await Promise.all(BUNDLED_PACKS.map(async (id) => {
    try {
      const pack = readPackText(await fetchText(packPath(id)), packPath(id), knownEvents);
      return pack ? { id, pack } : { id, reason: 'format' };
    } catch (err) {
      return { id, reason: err instanceof Error ? err.message : String(err) };
    }
  }));
  for (const r of read) {
    if ('pack' in r && r.pack) out.packs.push(r.pack);
    else out.failed.push({ id: r.id, reason: 'reason' in r ? r.reason : 'format' });
  }
  return out;
}

/** The lessons the packs add to the catalogue: each pack's own, the first pack's copy of an id kept. */
export function packLessons(packs: readonly ResolvedPack[]): CatalogLesson[] {
  const out: CatalogLesson[] = [];
  for (const p of packs) for (const l of p.lessons) if (!out.some((x) => x.id === l.id)) out.push(l);
  return out;
}

/** The pack a lesson was opened from, and its place there: what the strip and "Next" read. */
export function packOf(packs: readonly ResolvedPack[], lessonId: string, packId?: string | null): { pack: ResolvedPack; index: number } | null {
  const ordered = packId ? [...packs.filter((p) => p.pack.id === packId), ...packs.filter((p) => p.pack.id !== packId)] : packs;
  for (const pack of ordered) {
    const index = pack.items.findIndex((i) => i.lesson.id === lessonId);
    // a built-in lesson belongs to a pack only when it was opened from it
    if (index >= 0 && (!pack.items[index].reference || pack.pack.id === packId)) return { pack, index };
  }
  return null;
}
