/**
 * Writing a scenario (roadmap T01; Phase 4 map §4.1): the instructor's form on
 * the authoring page (`#/lessons/author`) turned into a flight lesson — the
 * mission on the setup panel as it stands, the settings it locks, the
 * criteria and the texts — and then read back through the lesson-file reader
 * itself (`readLesson`), so what the page writes is exactly what every copy
 * of the app will read, and each problem the reader would find is shown
 * before the file is saved. DOM-free.
 *
 * A text given in some languages and not in English is written with the
 * first given one standing in for English (the reader's fallback), and the
 * page says so: a Thai teacher's lesson in Thai alone still reads, in Thai,
 * everywhere.
 */
import type { MissionDocument } from '../config/mission-file';
import type { SatelliteDesign } from '../design/satellite-spec';
import { eventIssues, readDesignLesson, readLesson, type FileIssue } from './lesson-file';
import { AUTHOR_TRACK, BUILTIN_LESSON_IDS } from './catalog';
import { DESIGN_LOCK_GROUPS, lockGroupKeys, type DesignLockGroup } from './design-lesson';
import { DOMAINS, LOCK_KEYS, type DesignLesson, type DesignMeasureId, type Domain, type Lesson, type LocalText, type LockKey, type MeasureId } from './types';

/** A text as typed, in each language (empty where not given). */
export interface DraftText { en: string; ru: string; th: string }

export type DraftCriterion =
  | { kind: 'outcome'; is: 'target' | 'orbit' | 'survived' }
  /** `target: 'mission'` holds the value to the one the mission's own orbit asks for */
  | { kind: 'measure'; measure: MeasureId; min?: number; max?: number; target?: number | 'mission'; tol?: number }
  | { kind: 'answer'; measure: MeasureId; tol?: number; tolPct?: number; prompt: DraftText }
  | { kind: 'event'; key: string; present: boolean };

export interface LessonDraft {
  id: string;
  title: DraftText;
  brief: DraftText;
  hints: DraftText[];
  mode: 'explore' | 'engineer';
  domains: Domain[];
  locked: LockKey[];
  criteria: DraftCriterion[];
  /** the event the flight ends at for grading (a flight that goes on after its target) */
  endEvent?: string;
}

/** What a scenario locks unless the instructor frees it: every setting of the mission, so each student flies the same one. */
export const DEFAULT_LOCKS: readonly LockKey[] = ['setup.vehicle', 'setup.site', 'setup.satellite', 'setup.payloadMass', 'setup.orbit', 'setup.launchTime', 'setup.failure', 'setup.dynamics.model'];
/** A teacher's lessons are listed after the six tracks, under the catalogue's own heading for them (src/lessons/catalog.ts). */
export { AUTHOR_TRACK };

export const emptyText = (): DraftText => ({ en: '', ru: '', th: '' });

/** A new draft: reach the mission's orbit, the mission's settings locked. */
export function newDraft(id = 'class-lesson'): LessonDraft {
  return {
    id, title: emptyText(), brief: emptyText(), hints: [], mode: 'explore', domains: [2],
    locked: [...DEFAULT_LOCKS], criteria: [{ kind: 'outcome', is: 'target' }],
  };
}

/** An id from a title: lowercase ASCII words joined by hyphens, `class-` in front so no built-in id is taken. */
export function lessonIdFrom(title: string, fallback = 'lesson'): string {
  const slug = title.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  return `class-${slug || fallback}`;
}

const LANGS = ['en', 'ru', 'th'] as const;

/**
 * The built-in lessons' ids. A teacher's lesson under one of them is left out
 * of every catalogue (`allLessons`), so its file adds nothing and its link and
 * "Try it now" open the built-in lesson instead: the writer refuses the id.
 */
const BUILTIN_IDS = BUILTIN_LESSON_IDS;

/** A typed text as a lesson's text, or null when none was given; `stood` names the language standing in for English. */
function localOf(text: DraftText): { text: LocalText; stood: 'ru' | 'th' | null } | null {
  const given = LANGS.filter((l) => text[l].trim() !== '');
  if (!given.length) return null;
  const en = text.en.trim() || text[given[0]].trim();
  const out: LocalText = { en };
  for (const l of ['ru', 'th'] as const) if (text[l].trim()) out[l] = text[l].trim();
  return { text: out, stood: text.en.trim() ? null : given[0] as 'ru' | 'th' };
}

/**
 * The criterion as the file writes it, with an id of its own: `c1`, `c2`, …
 * The reader takes any numbers; the writer refuses (an error) the two that no
 * flight can ever pass: a range whose lower bound is above its upper one, and a
 * negative tolerance.
 */
function criterionOf(c: DraftCriterion, i: number, issues: FileIssue[]): Record<string, unknown> {
  const id = `c${i + 1}`;
  const where = `criteria[${i}]`;
  if (c.kind === 'measure' && c.min !== undefined && c.max !== undefined && c.min > c.max) issues.push({ where, code: 'invalid', level: 'error', detail: 'range' });
  if ((c.kind === 'measure' || c.kind === 'answer') && [c.tol, c.kind === 'answer' ? c.tolPct : undefined].some((v) => v !== undefined && v < 0)) {
    issues.push({ where, code: 'invalid', level: 'error', detail: 'negative' });
  }
  switch (c.kind) {
    case 'outcome': return { id, kind: 'outcome', is: c.is };
    case 'event': return { id, kind: 'event', key: c.key.trim(), present: c.present };
    case 'measure': return {
      id, kind: 'measure', measure: c.measure,
      ...(c.min !== undefined ? { min: c.min } : {}), ...(c.max !== undefined ? { max: c.max } : {}),
      ...(c.target !== undefined ? { target: c.target, tol: c.tol ?? 0 } : {}),
    };
    case 'answer': {
      const prompt = localOf(c.prompt);
      if (prompt?.stood) issues.push({ where: `criteria[${i}].prompt`, code: 'translation', level: 'warn', detail: `en=${prompt.stood}` });
      return {
        id, kind: 'answer', measure: c.measure, prompt: prompt?.text ?? {},
        ...(c.tol !== undefined ? { tol: c.tol } : {}), ...(c.tolPct !== undefined ? { tolPct: c.tolPct } : {}),
      };
    }
  }
}

export interface DraftResult<L = Lesson> {
  /** the lesson as every copy of the app will read it; null when the reader refuses it */
  lesson: L | null;
  /** what the reader found, and the authoring warnings (an unknown event, a language standing in for English) */
  issues: FileIssue[];
}

/**
 * The draft as a flight lesson on `mission` (the setup panel's, as a mission
 * document), read back through `readLesson`. `knownEvents`: the event keys a
 * flight emits (the page's `evt.*` keys), for the warnings of `eventIssues`.
 * `reserved`: the ids of the lesson packs' lessons (T03), refused like a
 * built-in lesson's id.
 */
export function draftLesson(draft: LessonDraft, mission: MissionDocument, knownEvents?: ReadonlySet<string>, reserved?: ReadonlySet<string>): DraftResult {
  const issues: FileIssue[] = [];
  const title = localOf(draft.title), brief = localOf(draft.brief);
  if (title?.stood) issues.push({ where: 'title', code: 'translation', level: 'warn', detail: `en=${title.stood}` });
  if (brief?.stood) issues.push({ where: 'brief', code: 'translation', level: 'warn', detail: `en=${brief.stood}` });
  const hints = draft.hints.map(localOf).filter((h): h is NonNullable<typeof h> => h !== null);
  const raw = {
    // the first of the file it is written to, which holds it alone; the catalogue numbers a teacher's lessons
    // in the order they are kept (`numberTeacherLessons`, task I2), so the second file's is not a second 9.1
    id: draft.id.trim(), track: AUTHOR_TRACK, order: 1, mode: draft.mode,
    domains: DOMAINS.filter((d) => draft.domains.includes(d)),
    title: title?.text ?? {}, brief: brief?.text ?? {},
    mission, locked: LOCK_KEYS.filter((k) => draft.locked.includes(k)),
    criteria: draft.criteria.map((c, i) => criterionOf(c, i, issues)),
    hints: hints.map((h) => h.text),
    ...(draft.endEvent?.trim() ? { endEvent: draft.endEvent.trim() } : {}),
  };
  if (BUILTIN_IDS.has(raw.id)) issues.push({ where: 'id', code: 'builtinId', level: 'error', detail: raw.id });
  // T03: a lesson pack's lesson ships with the app as a built-in one does, and wins over a teacher's of the same id
  else if (reserved?.has(raw.id)) issues.push({ where: 'id', code: 'pack', level: 'error', detail: raw.id });
  // the writer's own refusals (above and in `criterionOf`): every one of them is an error
  const refused = issues.some((i) => i.level === 'error');
  const read: FileIssue[] = [];
  const lesson = readLesson(raw, 'lesson', read);
  // a language missing from a text is the file's usual warning; one standing in for English is said above, and
  // for that text the reader's "no Russian text: the English one is shown" would name as English what is Thai
  const stoodIn = issues.filter((i) => i.code === 'translation' && i.detail?.startsWith('en=')).map((i) => `.${i.where}`);
  issues.push(...read.filter((i) => !(i.code === 'translation' && stoodIn.some((w) => i.where.endsWith(w)))));
  if (lesson && knownEvents) issues.push(...eventIssues(lesson, 'lesson', knownEvents));
  return { lesson: refused ? null : lesson, issues };
}

// ─── a design lesson (T01, map §4.1) ────────────────────────────────────────

export type DraftDesignCriterion =
  | { kind: 'design'; measure: DesignMeasureId; min?: number; max?: number; target?: number; tol?: number }
  | { kind: 'answer'; measure: DesignMeasureId; tol?: number; tolPct?: number; prompt: DraftText };

/**
 * A design lesson as the writer's form holds it: the same texts and listing
 * as a flight lesson's, the groups of the design the students may not
 * change, and criteria on design measures. The design itself, its date and
 * its level are the satellite bench's as they stand when it is written.
 */
export interface DesignLessonDraft {
  id: string;
  title: DraftText;
  brief: DraftText;
  hints: DraftText[];
  mode: 'explore' | 'engineer';
  domains: Domain[];
  lockGroups: DesignLockGroup[];
  criteria: DraftDesignCriterion[];
}

/** The design on the bench a design lesson is written from: the design, its design date and its ECSS level. */
export interface DesignDesk {
  design: SatelliteDesign;
  date: string;
  level: 'low' | 'moderate' | 'high';
}

/**
 * The measures the writer offers. The revisit is left out: it is the wait at
 * a place the mission's requirements name, which the writer does not write
 * (a lesson file may carry both).
 */
export const WRITER_DESIGN_MEASURES: readonly DesignMeasureId[] = [
  'sat.mass', 'sat.eclipseMax', 'sat.powerMargin', 'sat.batteryDod', 'sat.dvMargin', 'sat.linkMargin', 'sat.dataPerDay',
  'sat.gsd', 'sat.swath', 'sat.lifetime', 'sat.disposal25y', 'sat.wheelMargin', 'sat.torquerDipole',
];

/** A new design draft: the orbit and the bus locked, the power margin to keep above zero. */
export function newDesignDraft(id = 'class-design'): DesignLessonDraft {
  return {
    id, title: emptyText(), brief: emptyText(), hints: [], mode: 'explore', domains: [1],
    lockGroups: ['orbit', 'bus'], criteria: [{ kind: 'design', measure: 'sat.powerMargin', min: 0 }],
  };
}

/** A design criterion as the file writes it, with an id of its own; the writer refuses a range upside down and a negative tolerance. */
function designCriterionOf(c: DraftDesignCriterion, i: number, issues: FileIssue[]): Record<string, unknown> {
  const id = `c${i + 1}`;
  const where = `criteria[${i}]`;
  if (c.kind === 'design' && c.min !== undefined && c.max !== undefined && c.min > c.max) issues.push({ where, code: 'invalid', level: 'error', detail: 'range' });
  if ([c.tol, c.kind === 'answer' ? c.tolPct : undefined].some((v) => v !== undefined && v < 0)) issues.push({ where, code: 'invalid', level: 'error', detail: 'negative' });
  if (c.kind === 'design') {
    return {
      id, kind: 'design', measure: c.measure,
      ...(c.min !== undefined ? { min: c.min } : {}), ...(c.max !== undefined ? { max: c.max } : {}),
      ...(c.target !== undefined ? { target: c.target, tol: c.tol ?? 0 } : {}),
    };
  }
  const prompt = localOf(c.prompt);
  if (prompt?.stood) issues.push({ where: `criteria[${i}].prompt`, code: 'translation', level: 'warn', detail: `en=${prompt.stood}` });
  return {
    id, kind: 'answer', measure: c.measure, prompt: prompt?.text ?? {},
    ...(c.tol !== undefined ? { tol: c.tol } : {}), ...(c.tolPct !== undefined ? { tolPct: c.tolPct } : {}),
  };
}

/**
 * The draft as a design lesson on `desk` (the satellite bench's design, its
 * design date and its level, which the lesson then fixes, so every student's
 * figures are read on that day and in that air), read back through
 * `readDesignLesson`: what the page writes is what every copy of the app reads.
 */
export function draftDesignLesson(draft: DesignLessonDraft, desk: DesignDesk, reserved?: ReadonlySet<string>): DraftResult<DesignLesson> {
  const issues: FileIssue[] = [];
  const title = localOf(draft.title), brief = localOf(draft.brief);
  if (title?.stood) issues.push({ where: 'title', code: 'translation', level: 'warn', detail: `en=${title.stood}` });
  if (brief?.stood) issues.push({ where: 'brief', code: 'translation', level: 'warn', detail: `en=${brief.stood}` });
  const hints = draft.hints.map(localOf).filter((h): h is NonNullable<typeof h> => h !== null);
  const raw = {
    kind: 'design', id: draft.id.trim(), track: AUTHOR_TRACK, order: 1, mode: draft.mode,
    domains: DOMAINS.filter((d) => draft.domains.includes(d)),
    title: title?.text ?? {}, brief: brief?.text ?? {},
    start: { design: desk.design }, designDate: desk.date, level: desk.level,
    locked: DESIGN_LOCK_GROUPS.filter((g) => draft.lockGroups.includes(g)).flatMap(lockGroupKeys),
    criteria: draft.criteria.map((c, i) => designCriterionOf(c, i, issues)),
    hints: hints.map((h) => h.text),
  };
  if (BUILTIN_IDS.has(raw.id)) issues.push({ where: 'id', code: 'builtinId', level: 'error', detail: raw.id });
  // and a lesson pack's (T03), as a flight lesson's id is (`draftLesson`)
  else if (reserved?.has(raw.id)) issues.push({ where: 'id', code: 'pack', level: 'error', detail: raw.id });
  const refused = issues.some((i) => i.level === 'error');
  const read: FileIssue[] = [];
  const lesson = readDesignLesson(JSON.parse(JSON.stringify(raw)), 'lesson', read);
  const stoodIn = issues.filter((i) => i.code === 'translation' && i.detail?.startsWith('en=')).map((i) => `.${i.where}`);
  issues.push(...read.filter((i) => !(i.code === 'translation' && stoodIn.some((w) => i.where.endsWith(w)))));
  return { lesson: refused ? null : lesson, issues };
}
