/**
 * Lesson files (roadmap E03): a teacher's lessons and placement-test
 * questions as a `.orbitlab-lesson.json` file, read with the same care as a
 * mission file (U01). The built-in lessons and questions are held to the same
 * reader by the tests, so the format is exactly what the app itself uses.
 *
 * A lesson whose mission, criteria or texts cannot be used is left out with
 * the reason; the rest of the file is kept. A text missing a language falls
 * back to English and is reported as a warning.
 *
 * Version 2 adds the case lessons (`"kind": "case"`, track 6: P2.5's cases
 * from the record). A file is still written as version 1 when it holds none,
 * so a teacher's file of flight lessons reads back byte for byte, and an
 * older copy of the app warns of a newer file rather than calling a case
 * lesson's missing mission an error.
 *
 * Version 3 (roadmap T01, Phase 4 map §4.1; C2's open question) is a file
 * with a flight lesson whose mission carries a satellite of its own (mission
 * file v3, D06). The layout is unchanged, but a reader older than D06 cannot
 * fly such a lesson: it does not know the satellite's id and leaves the
 * lesson out as an error in its mission. With the version raised it also says
 * the file is newer than itself, which is the one thing its user can act on
 * (update the app), exactly the reason version 2 was raised for case lessons.
 * The same rule, applied to what came before, writes a lesson on a custom
 * rocket (mission v2, S02) as version 2: every reader of version 2 (P2.5 on)
 * flies one, while a reader of version 1 alone may predate S02. A file is
 * written at the lowest version whose every reader flies all of its lessons
 * (`lessonFileVersion`), so a file of catalogue flights stays version 1.
 *
 * The design lessons (`"kind": "design"`, T01, map §4.1: design a satellite
 * that meets these requirements) are version 3 too. E2 put a custom
 * satellite at version 3 in this same Phase 4 release, so every reader of
 * version 3 has both, and none lacks the design kind: an older copy says the
 * file is newer (as for a case lesson in version 2) rather than refuse the
 * lesson's kind as an error. Had the kind come a release later it would have
 * needed a number of its own.
 *
 * Lesson packs (roadmap T03, map §4.3) raise no version: a file's optional
 * `pack` (`LessonPack`: its title, audience, curriculum and order, and the
 * built-in lessons it reuses by reference) and a lesson's optional
 * `curriculum` codes are fields an older reader never looks at — `readMeta`
 * and `parseLessonFile` build their results from the fields they know — so
 * the same file opens there as a teacher's file of the same lessons, without
 * the grouping. tests/lesson-packs.test.ts holds a pack file to the version
 * its lessons need.
 */
import { missionDocument, parseMissionDocument, MISSION_FORMAT, type MissionDocument } from '../config/mission-file';
import { defaultMissionState } from './config';
import { hookExists } from './hooks';
import { MEASURE_IDS } from './measures';
import { compileExpression } from './assessment/expression';
import { DIAGRAM_IDS } from './assessment/diagrams';
import {
  CURRICULUM_KINDS, DOMAINS, LOCK_KEYS, REVEAL_KEYS, isCaseLesson, isDesignLesson,
  type CaseCriterion, type CaseLesson, type CatalogLesson, type Criterion, type CurriculumCode, type CurriculumKind, type DesignCriterion, type DesignLesson,
  type DesignMeasureId, type Domain, type Lesson, type LessonPack, type LocalText, type LockKey, type MeasureId, type PackEntry, type RevealKey,
} from './types';
import { DESIGN_LOCK_KEYS, DESIGN_MEASURE_IDS } from './design-lesson';
import { satelliteDesignProblems } from '../config/satellite-design';
import { satelliteTemplateById } from '../data/satellite-templates';
import { STATIONS } from '../orbit/applications-setup';
import type { SatelliteDesign } from '../design/satellite-spec';
import type { MissionRequirements } from '../design/requirements';
import { CASE_CHOICE_ITEMS, CASE_IDS, CASE_ITEM_IDS, type CaseId } from '../worksheets/case-ids';
import type { ChoiceOption, Figure, FlightSeries, Question } from './assessment/types';
import { VEHICLES } from '../data/vehicles';

export const LESSON_FORMAT = 'orbitlab.lessons';
export const LESSON_FORMAT_VERSION = 3;
/** The version a file of flight lessons on catalogue rockets and satellites is written as: every copy of the app reads it. */
const FLIGHT_ONLY_VERSION = 1;
/** The version that first read case lessons (track 6), after S02's custom rockets. */
const CASE_VERSION = 2;
/** The version that first read a custom satellite (D06) and the design lessons (T01): one Phase 4 release (see the header). */
const DESIGN_VERSION = 3;
export const LESSON_FILE_EXTENSION = '.orbitlab-lesson.json';

export interface LessonFileDocument {
  format: typeof LESSON_FORMAT;
  version: number;
  /** T03: the file is a lesson pack (`LessonPack`) */
  pack?: LessonPack;
  lessons?: unknown[];
  questions?: unknown[];
}

export type FileIssueCode = 'format' | 'newerVersion' | 'missing' | 'invalid' | 'mission' | 'translation' | 'hook' | 'expression' | 'duplicate' | 'event' | 'builtinId' | 'pack';
export interface FileIssue { where: string; code: FileIssueCode; level: 'error' | 'warn'; detail?: string }

export interface ParsedLessonFile {
  lessons: CatalogLesson[];
  questions: Question[];
  issues: FileIssue[];
  /** false when the file is not a lesson file at all */
  usable: boolean;
  /** T03: the file's lesson pack, when it is one and its pack could be read */
  pack?: LessonPack;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Collects issues against the thing being read. */
class Reader {
  constructor(readonly issues: FileIssue[]) {}
  error(where: string, code: FileIssueCode, detail?: string): false {
    this.issues.push({ where, code, level: 'error', ...(detail ? { detail } : {}) });
    return false;
  }
  warn(where: string, code: FileIssueCode, detail?: string): void {
    this.issues.push({ where, code, level: 'warn', ...(detail ? { detail } : {}) });
  }
  text(v: unknown, where: string): LocalText | null {
    if (!isRecord(v) || !isStr(v.en)) { this.error(where, 'missing', 'en'); return null; }
    const out: LocalText = { en: v.en };
    for (const lang of ['ru', 'th'] as const) {
      if (isStr(v[lang])) out[lang] = v[lang] as string;
      else this.warn(where, 'translation', lang);
    }
    return out;
  }
  /**
   * T03: a lesson's curriculum codes. A code that cannot be read is left out
   * with a warning, not the lesson: the codes are shown, never graded.
   */
  codes(v: unknown, where: string): CurriculumCode[] | undefined {
    if (v === undefined) return undefined;
    if (!Array.isArray(v)) { this.warn(where, 'invalid', 'curriculum'); return undefined; }
    const out: CurriculumCode[] = [];
    v.forEach((c, i) => {
      if (isRecord(c) && isStr(c.code) && CURRICULUM_KINDS.includes(c.kind as CurriculumKind)) out.push({ code: c.code.trim(), kind: c.kind as CurriculumKind });
      else this.warn(`${where}[${i}]`, 'invalid', 'curriculum');
    });
    return out;
  }
}

function readCriterion(r: Reader, raw: unknown, where: string): Criterion | null {
  if (!isRecord(raw) || !isStr(raw.id)) { r.error(where, 'missing', 'id'); return null; }
  const id = raw.id;
  const label = raw.label === undefined ? undefined : r.text(raw.label, `${where}.label`) ?? undefined;
  const measure = (): MeasureId | null => (MEASURE_IDS.includes(raw.measure as MeasureId) ? raw.measure as MeasureId : (r.error(where, 'invalid', 'measure'), null));
  const withLabel = <T extends object>(c: T): T => (label ? { ...c, label } : c);
  switch (raw.kind) {
    case 'measure': {
      const m = measure();
      if (!m) return null;
      const bound: { min?: number; max?: number; target?: number | 'mission'; tol?: number } = {};
      for (const k of ['min', 'max', 'tol'] as const) {
        if (raw[k] === undefined) continue;
        if (!isNum(raw[k])) { r.error(where, 'invalid', k); return null; }
        bound[k] = raw[k] as number;
      }
      if (raw.target !== undefined) {
        if (!isNum(raw.target) && raw.target !== 'mission') { r.error(where, 'invalid', 'target'); return null; }
        bound.target = raw.target as number | 'mission';
      }
      if (bound.min === undefined && bound.max === undefined && bound.target === undefined) { r.error(where, 'missing', 'bound'); return null; }
      return withLabel({ id, kind: 'measure' as const, measure: m, ...bound });
    }
    case 'outcome':
      if (!['target', 'orbit', 'survived'].includes(raw.is as string)) { r.error(where, 'invalid', 'is'); return null; }
      return withLabel({ id, kind: 'outcome' as const, is: raw.is as 'target' | 'orbit' | 'survived' });
    case 'event':
      if (!isStr(raw.key) || typeof raw.present !== 'boolean') { r.error(where, 'invalid', 'key'); return null; }
      return withLabel({ id, kind: 'event' as const, key: raw.key, present: raw.present });
    case 'answer': {
      const m = measure();
      const prompt = r.text(raw.prompt, `${where}.prompt`);
      if (!m || !prompt) return null;
      if (raw.tol !== undefined && !isNum(raw.tol)) { r.error(where, 'invalid', 'tol'); return null; }
      if (raw.tolPct !== undefined && !isNum(raw.tolPct)) { r.error(where, 'invalid', 'tolPct'); return null; }
      if (raw.tol === undefined && raw.tolPct === undefined) { r.error(where, 'missing', 'tol'); return null; }
      return withLabel({ id, kind: 'answer' as const, measure: m, prompt,
        ...(raw.tol !== undefined ? { tol: raw.tol as number } : {}), ...(raw.tolPct !== undefined ? { tolPct: raw.tolPct as number } : {}),
        ...(isStr(raw.unit) ? { unit: raw.unit } : {}) });
    }
    case 'hook':
      if (!isStr(raw.hook) || !hookExists(raw.hook)) { r.error(where, 'hook', String(raw.hook)); return null; }
      if (raw.params !== undefined && !isRecord(raw.params)) { r.error(where, 'invalid', 'params'); return null; }
      return withLabel({ id, kind: 'hook' as const, hook: raw.hook, ...(raw.params ? { params: raw.params as Record<string, number | string | boolean> } : {}) });
    default:
      r.error(where, 'invalid', 'kind');
      return null;
  }
}

/** What every lesson has, of either kind: its texts and where it is listed. */
function readMeta(r: Reader, raw: Record<string, unknown>, at: string) {
  const title = r.text(raw.title, `${at}.title`);
  const brief = r.text(raw.brief, `${at}.brief`);
  if (!title || !brief) return null;
  const debrief = raw.debrief === undefined ? undefined : r.text(raw.debrief, `${at}.debrief`) ?? undefined;
  const track = isNum(raw.track) ? Math.round(raw.track) : 9;
  const order = isNum(raw.order) ? Math.round(raw.order) : 99;
  const mode: 'explore' | 'engineer' = raw.mode === 'engineer' ? 'engineer' : 'explore';
  const domains = Array.isArray(raw.domains) ? raw.domains.filter((d): d is Domain => DOMAINS.includes(d as Domain)) : [];
  if (!domains.length) return r.error(`${at}.domains`, 'missing') || null;
  const tags = Array.isArray(raw.tags) ? raw.tags.filter(isStr) : undefined;
  const comingSoon = raw.comingSoon === true;
  const curriculum = r.codes(raw.curriculum, `${at}.curriculum`);
  return { title, brief, debrief, track, order, mode, domains, tags, comingSoon, curriculum };
}

function readHints(r: Reader, raw: Record<string, unknown>, at: string): LocalText[] {
  const hints: LocalText[] = [];
  if (Array.isArray(raw.hints)) for (let i = 0; i < raw.hints.length; i++) {
    const h = r.text(raw.hints[i], `${at}.hints[${i}]`);
    if (h) hints.push(h);
  }
  return hints;
}

/** Read one flight lesson. Its mission is normalised through the mission reader. */
export function readLesson(raw: unknown, where: string, issues: FileIssue[]): Lesson | null {
  const r = new Reader(issues);
  if (!isRecord(raw) || !isStr(raw.id)) return r.error(where, 'missing', 'id') || null;
  const at = `${where} (${raw.id})`;
  const meta = readMeta(r, raw, at);
  if (!meta) return null;
  const { title, brief, debrief, track, order, mode, domains, tags, comingSoon, curriculum } = meta;

  let mission: MissionDocument;
  if (!isRecord(raw.mission) || raw.mission.format !== MISSION_FORMAT) return r.error(`${at}.mission`, 'mission', 'format') || null;
  {
    const mIssues: FileIssue[] = [];
    const parsed = parseMissionDocument(raw.mission, defaultMissionState());
    if (!parsed.usable) return r.error(`${at}.mission`, 'mission', 'unusable') || null;
    for (const i of parsed.issues) if (i.code !== 'newerVersion') mIssues.push({ where: `${at}.mission`, code: 'mission', level: 'error', detail: i.field });
    if (mIssues.length) { issues.push(...mIssues); return null; }
    mission = missionDocument(parsed.state);
  }
  const locked = Array.isArray(raw.locked) ? raw.locked.filter((k): k is LockKey => LOCK_KEYS.includes(k as LockKey)) : [];
  if (Array.isArray(raw.locked) && locked.length !== raw.locked.length) r.warn(`${at}.locked`, 'invalid');
  const reveal = Array.isArray(raw.reveal) ? raw.reveal.filter((k): k is RevealKey => REVEAL_KEYS.includes(k as RevealKey)) : [];
  if (Array.isArray(raw.reveal) && reveal.length !== raw.reveal.length) r.warn(`${at}.reveal`, 'invalid');
  if (!Array.isArray(raw.criteria) || (!raw.criteria.length && !comingSoon)) return r.error(`${at}.criteria`, 'missing') || null;
  const criteria: Criterion[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < raw.criteria.length; i++) {
    const c = readCriterion(r, raw.criteria[i], `${at}.criteria[${i}]`);
    if (!c) return null;
    if (ids.has(c.id)) return r.error(`${at}.criteria[${i}]`, 'duplicate', c.id) || null;
    ids.add(c.id);
    criteria.push(c);
  }
  const hints = readHints(r, raw, at);
  return {
    id: raw.id, track, order, mode, domains, ...(tags?.length ? { tags } : {}),
    title, brief, ...(debrief ? { debrief } : {}), mission, locked, ...(reveal.length ? { reveal } : {}), criteria, hints,
    ...(isStr(raw.endEvent) ? { endEvent: raw.endEvent } : {}),
    ...(comingSoon ? { comingSoon } : {}),
    ...(curriculum?.length ? { curriculum } : {}),
  };
}

function readCaseCriterion(r: Reader, raw: unknown, where: string, id: CaseId): CaseCriterion | null {
  if (!isRecord(raw) || !isStr(raw.id)) { r.error(where, 'missing', 'id'); return null; }
  if (raw.kind !== 'case') { r.error(where, 'invalid', 'kind'); return null; }
  if (!isStr(raw.item) || !CASE_ITEM_IDS[id].includes(raw.item)) { r.error(where, 'invalid', 'item'); return null; }
  const choice = CASE_CHOICE_ITEMS.includes(raw.item);
  for (const k of ['tol', 'tolPct'] as const) {
    if (raw[k] === undefined) continue;
    // a choice is right or not: a tolerance on it means the file meant another question
    if (choice || !isNum(raw[k]) || (raw[k] as number) < 0) { r.error(where, 'invalid', k); return null; }
  }
  const label = raw.label === undefined ? undefined : r.text(raw.label, `${where}.label`) ?? undefined;
  return {
    id: raw.id, kind: 'case', item: raw.item,
    ...(raw.tol !== undefined ? { tol: raw.tol as number } : {}), ...(raw.tolPct !== undefined ? { tolPct: raw.tolPct as number } : {}),
    ...(label ? { label } : {}),
  };
}

/**
 * Read one case lesson: a case from the record (`case`) and the questions of
 * its sheet the student answers. What only a flight lesson has (a mission,
 * locks) is dropped with a warning.
 */
export function readCaseLesson(raw: unknown, where: string, issues: FileIssue[]): CaseLesson | null {
  const r = new Reader(issues);
  if (!isRecord(raw) || !isStr(raw.id)) return r.error(where, 'missing', 'id') || null;
  const at = `${where} (${raw.id})`;
  const meta = readMeta(r, raw, at);
  if (!meta) return null;
  const { title, brief, debrief, track, order, mode, domains, tags, comingSoon, curriculum } = meta;
  if (!CASE_IDS.includes(raw.case as CaseId)) return r.error(`${at}.case`, 'invalid', 'case') || null;
  const id = raw.case as CaseId;
  for (const k of ['mission', 'locked', 'reveal', 'endEvent']) if (raw[k] !== undefined) r.warn(`${at}.${k}`, 'invalid', k);
  if (!Array.isArray(raw.criteria) || (!raw.criteria.length && !comingSoon)) return r.error(`${at}.criteria`, 'missing') || null;
  const criteria: CaseCriterion[] = [];
  for (let i = 0; i < raw.criteria.length; i++) {
    const c = readCaseCriterion(r, raw.criteria[i], `${at}.criteria[${i}]`, id);
    if (!c) return null;
    if (criteria.some((x) => x.id === c.id || x.item === c.item)) return r.error(`${at}.criteria[${i}]`, 'duplicate', c.id) || null;
    criteria.push(c);
  }
  const hints = readHints(r, raw, at);
  return {
    kind: 'case', id: raw.id, track, order, mode, domains, ...(tags?.length ? { tags } : {}),
    title, brief, ...(debrief ? { debrief } : {}), case: id, criteria, hints,
    ...(comingSoon ? { comingSoon } : {}),
    ...(curriculum?.length ? { curriculum } : {}),
  };
}

// ─── design lessons (T01) ───────────────────────────────────────────────────

const DESIGN_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** A design date: `YYYY-MM-DD`, a real day of 1957–2200 (the satellite model's `designDateJd`; tests/design-lessons.test.ts holds the two equal). */
export function isDesignDate(v: unknown): v is string {
  const m = typeof v === 'string' ? DESIGN_DATE.exec(v) : null;
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const back = new Date(Date.UTC(y, mo - 1, d));
  return y >= 1957 && y <= 2200 && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d;
}
/** ECSS's fixed levels of solar activity, spelt out as src/design/requirements.ts spells them (the propagator stays out of src/lessons). */
const ECSS = ['low', 'moderate', 'high'] as const;
type Ecss = (typeof ECSS)[number];

function readDesignCriterion(r: Reader, raw: unknown, where: string): DesignCriterion | null {
  if (!isRecord(raw) || !isStr(raw.id)) { r.error(where, 'missing', 'id'); return null; }
  const id = raw.id;
  if (!DESIGN_MEASURE_IDS.includes(raw.measure as DesignMeasureId)) { r.error(where, 'invalid', 'measure'); return null; }
  const measure = raw.measure as DesignMeasureId;
  const label = raw.label === undefined ? undefined : r.text(raw.label, `${where}.label`) ?? undefined;
  const withLabel = <T extends object>(c: T): T => (label ? { ...c, label } : c);
  if (raw.kind === 'design') {
    const bound: { min?: number; max?: number; target?: number; tol?: number } = {};
    for (const k of ['min', 'max', 'target', 'tol'] as const) {
      if (raw[k] === undefined) continue;
      if (!isNum(raw[k])) { r.error(where, 'invalid', k); return null; }
      bound[k] = raw[k] as number;
    }
    if (bound.min === undefined && bound.max === undefined && bound.target === undefined) { r.error(where, 'missing', 'bound'); return null; }
    if (bound.tol !== undefined && bound.tol < 0) { r.error(where, 'invalid', 'tol'); return null; }
    return withLabel({ id, kind: 'design' as const, measure, ...bound });
  }
  if (raw.kind === 'answer') {
    const prompt = r.text(raw.prompt, `${where}.prompt`);
    if (!prompt) return null;
    for (const k of ['tol', 'tolPct'] as const) if (raw[k] !== undefined && (!isNum(raw[k]) || (raw[k] as number) < 0)) { r.error(where, 'invalid', k); return null; }
    if (raw.tol === undefined && raw.tolPct === undefined) { r.error(where, 'missing', 'tol'); return null; }
    return withLabel({ id, kind: 'answer' as const, measure, prompt,
      ...(raw.tol !== undefined ? { tol: raw.tol as number } : {}), ...(raw.tolPct !== undefined ? { tolPct: raw.tolPct as number } : {}),
      ...(isStr(raw.unit) ? { unit: raw.unit } : {}) });
  }
  r.error(where, 'invalid', 'kind');
  return null;
}

/** What a mission asks (D07's `MissionRequirements`), within plausible bounds; null, with the field named, when it cannot be used. */
function readRequirements(r: Reader, raw: unknown, where: string): MissionRequirements | null {
  if (!isRecord(raw) || !isRecord(raw.target)) return r.error(where, 'invalid', 'requirements') || null;
  const t = raw.target;
  const num = (v: unknown, lo: number, hi: number): v is number => isNum(v) && v >= lo && v <= hi;
  const bad = (field: string): null => r.error(`${where}.${field}`, 'invalid', field) || null;
  if (!num(t.lat, -90, 90) || !num(t.lon, -180, 360) || typeof t.name !== 'string') return bad('target');
  if (!num(raw.gsd, 1e-3, 1e4)) return bad('gsd');
  if (!num(raw.revisitDays, 1e-3, 366)) return bad('revisitDays');
  if (typeof raw.daylightOnly !== 'boolean') return bad('daylightOnly');
  if (raw.ltan !== undefined && !num(raw.ltan, 0, 24)) return bad('ltan');
  if (!num(raw.lifeYears, 0.1, 30)) return bad('lifeYears');
  if (!ECSS.includes(raw.activity as Ecss)) return bad('activity');
  if (!num(raw.dataPerDay, 0, 1e15)) return bad('dataPerDay');
  if (!Array.isArray(raw.stations) || !raw.stations.every((s) => STATIONS.some((x) => x.id === s))) return bad('stations');
  if (!num(raw.minElDeg, 0, 89)) return bad('minElDeg');
  if (raw.disposal !== '25y' && raw.disposal !== 'none') return bad('disposal');
  return {
    target: { lat: t.lat, lon: t.lon, name: t.name }, gsd: raw.gsd, revisitDays: raw.revisitDays, daylightOnly: raw.daylightOnly,
    ...(raw.ltan !== undefined ? { ltan: raw.ltan as number } : {}),
    lifeYears: raw.lifeYears, activity: raw.activity as Ecss, dataPerDay: raw.dataPerDay, stations: [...raw.stations as string[]],
    minElDeg: raw.minElDeg, disposal: raw.disposal,
  };
}

/**
 * Read one design lesson (T01, map §4.1): its start — a template, or a whole
 * design the satellite checker accepts —, the day and the ECSS level its
 * figures are read at (fixed, so a grade reproduces: never the measured
 * series), what the mission asks, the parts it locks and its criteria on
 * design measures. What only a flight or a case lesson has is dropped with a
 * warning.
 */
export function readDesignLesson(raw: unknown, where: string, issues: FileIssue[]): DesignLesson | null {
  const r = new Reader(issues);
  if (!isRecord(raw) || !isStr(raw.id)) return r.error(where, 'missing', 'id') || null;
  const at = `${where} (${raw.id})`;
  const meta = readMeta(r, raw, at);
  if (!meta) return null;
  const { title, brief, debrief, track, order, mode, domains, tags, comingSoon } = meta;
  let start: DesignLesson['start'];
  if (!isRecord(raw.start)) return r.error(`${at}.start`, 'missing', 'start') || null;
  if (raw.start.template !== undefined) {
    if (!isStr(raw.start.template) || !satelliteTemplateById(raw.start.template)) return r.error(`${at}.start`, 'invalid', 'template') || null;
    start = { template: raw.start.template };
  } else {
    const problems = satelliteDesignProblems(raw.start.design);
    if (problems.length) return r.error(`${at}.start.design`, 'invalid', `${problems[0].path} ${problems[0].message}`) || null;
    start = { design: JSON.parse(JSON.stringify(raw.start.design)) as SatelliteDesign };
  }
  if (!isDesignDate(raw.designDate)) return r.error(`${at}.designDate`, 'invalid', 'designDate') || null;
  if (!ECSS.includes(raw.level as Ecss)) return r.error(`${at}.level`, 'invalid', 'level') || null;
  let requirements: MissionRequirements | undefined;
  if (raw.requirements !== undefined) {
    const req = readRequirements(r, raw.requirements, `${at}.requirements`);
    if (!req) return null;
    requirements = req;
  }
  const locked = Array.isArray(raw.locked) ? raw.locked.filter((k): k is string => DESIGN_LOCK_KEYS.includes(k as string)) : [];
  if (Array.isArray(raw.locked) && locked.length !== raw.locked.length) r.warn(`${at}.locked`, 'invalid');
  for (const k of ['mission', 'reveal', 'endEvent', 'case']) if (raw[k] !== undefined) r.warn(`${at}.${k}`, 'invalid', k);
  if (!Array.isArray(raw.criteria) || (!raw.criteria.length && !comingSoon)) return r.error(`${at}.criteria`, 'missing') || null;
  const criteria: DesignCriterion[] = [];
  for (let i = 0; i < raw.criteria.length; i++) {
    const c = readDesignCriterion(r, raw.criteria[i], `${at}.criteria[${i}]`);
    if (!c) return null;
    if (criteria.some((x) => x.id === c.id)) return r.error(`${at}.criteria[${i}]`, 'duplicate', c.id) || null;
    // the revisit is the wait at the requirements' place: without them there is no place to look at
    if (c.measure === 'sat.revisitMax' && !requirements) return r.error(`${at}.criteria[${i}]`, 'missing', 'requirements') || null;
    criteria.push(c);
  }
  const hints = readHints(r, raw, at);
  return {
    kind: 'design', id: raw.id, track, order, mode, domains, ...(tags?.length ? { tags } : {}),
    title, brief, ...(debrief ? { debrief } : {}), start, designDate: raw.designDate, level: raw.level as Ecss,
    ...(requirements ? { requirements } : {}), locked, criteria, hints,
    ...(comingSoon ? { comingSoon } : {}),
  };
}

/** Read one lesson of any kind: a case or a design lesson says so; a lesson without a kind is a flight lesson. */
export function readAnyLesson(raw: unknown, where: string, issues: FileIssue[]): CatalogLesson | null {
  const kind = isRecord(raw) ? raw.kind : undefined;
  if (kind === 'case') return readCaseLesson(raw, where, issues);
  if (kind === 'design') return readDesignLesson(raw, where, issues);
  if (kind === undefined || kind === 'flight') return readLesson(raw, where, issues);
  issues.push({ where: isRecord(raw) && isStr(raw.id) ? `${where} (${raw.id})` : where, code: 'invalid', level: 'error', detail: 'kind' });
  return null;
}

const SERIES: readonly FlightSeries[] = ['alt', 'vInertial', 'q', 'gLoad', 'mass', 'thrust', 'pitch', 'dvRemaining'];

function readFigure(r: Reader, raw: unknown, where: string, datasets: ReadonlySet<string>): Figure | null {
  if (!isRecord(raw)) return r.error(where, 'invalid') || null;
  if (raw.kind === 'vehicle') return isStr(raw.vehicleId) && VEHICLES.some((v) => v.id === raw.vehicleId) ? { kind: 'vehicle', vehicleId: raw.vehicleId } : r.error(where, 'invalid', 'vehicleId') || null;
  if (raw.kind === 'diagram') return isStr(raw.id) && DIAGRAM_IDS.includes(raw.id) ? { kind: 'diagram', id: raw.id } : r.error(where, 'invalid', 'id') || null;
  if (raw.kind === 'chart') {
    const compare = Array.isArray(raw.compare) ? raw.compare.filter(isStr) : undefined;
    if (!isStr(raw.dataset) || !datasets.has(raw.dataset) || !SERIES.includes(raw.series as FlightSeries)
      || (compare && compare.some((d) => !datasets.has(d)))) return r.error(where, 'invalid', 'dataset') || null;
    return { kind: 'chart', dataset: raw.dataset, series: raw.series as FlightSeries, ...(compare?.length ? { compare } : {}), ...(isNum(raw.tMax) ? { tMax: raw.tMax } : {}) };
  }
  return r.error(where, 'invalid', 'kind') || null;
}

function readOptions(r: Reader, raw: unknown, at: string): ChoiceOption[] | null {
  if (!Array.isArray(raw) || raw.length < 2) return r.error(`${at}.options`, 'missing') || null;
  const options: ChoiceOption[] = [];
  for (let i = 0; i < raw.length; i++) {
    const o = raw[i];
    const text = isRecord(o) ? r.text(o.text, `${at}.options[${i}]`) : null;
    if (!text || !isRecord(o)) return null;
    const misconception = o.misconception === undefined ? undefined : r.text(o.misconception, `${at}.options[${i}].misconception`) ?? undefined;
    options.push({ text, ...(o.correct === true ? { correct: true } : {}), ...(misconception ? { misconception } : {}) });
  }
  return options;
}

/** Read one placement-test question. `datasets`: the recorded flights a chart may show. */
export function readQuestion(raw: unknown, where: string, issues: FileIssue[], datasets: ReadonlySet<string>): Question | null {
  const r = new Reader(issues);
  if (!isRecord(raw) || !isStr(raw.id)) return r.error(where, 'missing', 'id') || null;
  const at = `${where} (${raw.id})`;
  if (!DOMAINS.includes(raw.domain as Domain) || ![1, 2, 3].includes(raw.level as number)) return r.error(at, 'invalid', 'domain/level') || null;
  const kind = raw.kind === 'understanding' ? 'understanding' : 'knowledge';
  const prompt = r.text(raw.prompt, `${at}.prompt`);
  const explanation = r.text(raw.explanation, `${at}.explanation`);
  if (!prompt || !explanation) return null;
  const figure = raw.figure === undefined ? undefined : readFigure(r, raw.figure, `${at}.figure`, datasets) ?? null;
  if (figure === null) return null;
  const base = {
    id: raw.id, domain: raw.domain as Domain, level: raw.level as 1 | 2 | 3, kind, skill: isStr(raw.skill) ? raw.skill : raw.id,
    prompt, explanation, ...(figure ? { figure } : {}),
    ...(Array.isArray(raw.lessons) ? { lessons: raw.lessons.filter(isStr) } : {}),
  } as const;
  switch (raw.type) {
    case 'choice': {
      const options = readOptions(r, raw.options, at);
      if (!options) return null;
      if (options.filter((o) => o.correct).length !== 1) return r.error(`${at}.options`, 'invalid', 'one correct') || null;
      const observe = raw.observe === undefined ? undefined : readFigure(r, raw.observe, `${at}.observe`, datasets) ?? null;
      if (observe === null) return null;
      return { ...base, type: 'choice', options, ...(observe ? { observe } : {}), ...(raw.fixedOrder === true ? { fixedOrder: true } : {}) };
    }
    case 'numeric': {
      if (!Array.isArray(raw.params) || !isStr(raw.answer) || !isNum(raw.tolPct) || raw.tolPct <= 0) return r.error(at, 'invalid', 'params/answer/tolPct') || null;
      const params = [];
      for (const p of raw.params) {
        if (!isRecord(p) || !isStr(p.name) || !isNum(p.min) || !isNum(p.max) || !isNum(p.step) || p.step <= 0 || p.max < p.min) return r.error(`${at}.params`, 'invalid') || null;
        params.push({ name: p.name, min: p.min, max: p.max, step: p.step });
      }
      try { compileExpression(raw.answer, params.map((p) => p.name)); } catch (err) { return r.error(`${at}.answer`, 'expression', (err as Error).message) || null; }
      return { ...base, type: 'numeric', params, answer: raw.answer, unit: typeof raw.unit === 'string' ? raw.unit : '', tolPct: raw.tolPct };
    }
    case 'multi': {
      const options = readOptions(r, raw.options, at);
      if (!options) return null;
      const right = options.filter((o) => o.correct).length;
      if (right < 2 || right === options.length) return r.error(`${at}.options`, 'invalid', 'two or more correct, one or more wrong') || null;
      return { ...base, type: 'multi', options };
    }
    case 'order': {
      if (!Array.isArray(raw.items) || raw.items.length < 3) return r.error(`${at}.items`, 'invalid', 'three or more') || null;
      const items: LocalText[] = [];
      for (let i = 0; i < raw.items.length; i++) {
        const text = r.text(raw.items[i], `${at}.items[${i}]`);
        if (!text) return null;
        items.push(text);
      }
      return { ...base, type: 'order', items };
    }
    case 'vehicle': {
      const vehicles = Array.isArray(raw.vehicles) ? raw.vehicles.filter((v): v is string => isStr(v) && VEHICLES.some((x) => x.id === v)) : [];
      if (vehicles.length < 4) return r.error(`${at}.vehicles`, 'invalid', 'four or more') || null;
      return { ...base, type: 'vehicle', vehicles };
    }
    default:
      return r.error(at, 'invalid', 'type') || null;
  }
}

/**
 * Warnings for the event keys a flight lesson names that no flight emits (T01,
 * map §4.1): an `event` criterion's key and the `endEvent`. The reader takes
 * any key — a newer app may emit one this build does not know — so a typo
 * reads and then never happens: "must happen" fails and an `endEvent` never
 * ends the flight. `knownEvents` is the set the page knows (the `evt.*` keys of
 * its dictionary, which name every event the simulation emits); the reader
 * itself stays free of the dictionaries, so the re-check's worker does not
 * carry them.
 */
export function eventIssues(lesson: Lesson, where: string, knownEvents: ReadonlySet<string>): FileIssue[] {
  const issues: FileIssue[] = [];
  lesson.criteria.forEach((c, i) => {
    if (c.kind === 'event' && !knownEvents.has(c.key)) issues.push({ where: `${where}.criteria[${i}]`, code: 'event', level: 'warn', detail: c.key });
  });
  if (lesson.endEvent !== undefined && !knownEvents.has(lesson.endEvent)) issues.push({ where: `${where}.endEvent`, code: 'event', level: 'warn', detail: lesson.endEvent });
  return issues;
}

/**
 * T03: a file's lesson pack. Its texts are read as a lesson's are; `audience`
 * and `framework` may also be one plain string, the same in every language.
 * A pack that cannot be read is reported and left out, while the file's
 * lessons are kept, as an older reader keeps them. Which of its entries name
 * a built-in lesson is not known here (the catalogue reads its lessons
 * through this reader): src/lessons/packs.ts resolves them.
 */
function readPack(raw: unknown, lessons: readonly CatalogLesson[], issues: FileIssue[]): LessonPack | undefined {
  const r = new Reader(issues);
  if (!isRecord(raw) || !isStr(raw.id)) { r.error('pack', 'pack', 'id'); return undefined; }
  const at = `pack (${raw.id})`;
  const loose = (v: unknown, w: string): LocalText | null => (isStr(v) ? { en: v.trim() } : r.text(v, w));
  const title = r.text(raw.title, `${at}.title`);
  const audience = loose(raw.audience, `${at}.audience`);
  const framework = loose(raw.framework, `${at}.framework`);
  if (!title || !audience || !framework) { r.error(at, 'pack', 'text'); return undefined; }
  // not reviewed unless it says so: the page then calls it a draft
  if (typeof raw.reviewed !== 'boolean') r.warn(`${at}.reviewed`, 'invalid', 'reviewed');
  const description = raw.description === undefined ? undefined : r.text(raw.description, `${at}.description`) ?? undefined;
  const contents: PackEntry[] = [];
  const named = new Set<string>();
  if (raw.contents !== undefined && !Array.isArray(raw.contents)) r.warn(`${at}.contents`, 'invalid', 'contents');
  if (Array.isArray(raw.contents)) raw.contents.forEach((e, i) => {
    const w = `${at}.contents[${i}]`;
    if (!isRecord(e) || !isStr(e.id)) { r.warn(w, 'invalid', 'id'); return; }
    if (named.has(e.id)) { r.warn(w, 'duplicate', e.id); return; }
    named.add(e.id);
    const own = lessons.some((l) => l.id === e.id);
    // a lesson of the file carries its own codes: codes on its entry as well could say something else
    if (own && e.curriculum !== undefined) r.warn(`${w}.curriculum`, 'invalid', 'curriculum');
    const curriculum = own ? undefined : r.codes(e.curriculum, `${w}.curriculum`);
    const note = e.note === undefined ? undefined : r.text(e.note, `${w}.note`) ?? undefined;
    contents.push({ id: e.id, ...(curriculum?.length ? { curriculum } : {}), ...(note ? { note } : {}) });
  });
  for (const l of lessons) if (!named.has(l.id)) contents.push({ id: l.id });
  return {
    id: raw.id, title, audience, framework, reviewed: raw.reviewed === true,
    ...(description ? { description } : {}), contents,
  };
}

/** Read a lesson file; with `knownEvents`, warn of event keys no flight emits (`eventIssues`). */
export function parseLessonFile(raw: unknown, datasets: ReadonlySet<string>, knownEvents?: ReadonlySet<string>): ParsedLessonFile {
  const issues: FileIssue[] = [];
  if (!isRecord(raw) || raw.format !== LESSON_FORMAT || !isNum(raw.version) || raw.version < 1) {
    return { lessons: [], questions: [], issues: [{ where: 'document', code: 'format', level: 'error' }], usable: false };
  }
  if (raw.version > LESSON_FORMAT_VERSION) issues.push({ where: 'document', code: 'newerVersion', level: 'warn' });
  const lessons: CatalogLesson[] = [];
  const questions: Question[] = [];
  const seen = new Set<string>();
  const unique = (id: string, where: string): boolean => {
    if (seen.has(id)) { issues.push({ where, code: 'duplicate', level: 'error', detail: id }); return false; }
    seen.add(id);
    return true;
  };
  if (Array.isArray(raw.lessons)) raw.lessons.forEach((l, i) => {
    const lesson = readAnyLesson(l, `lessons[${i}]`, issues);
    if (lesson && unique(lesson.id, `lessons[${i}]`)) {
      lessons.push(lesson);
      if (knownEvents && !isCaseLesson(lesson) && !isDesignLesson(lesson)) issues.push(...eventIssues(lesson, `lessons[${i}] (${lesson.id})`, knownEvents));
    }
  });
  if (Array.isArray(raw.questions)) raw.questions.forEach((q, i) => {
    const question = readQuestion(q, `questions[${i}]`, issues, datasets);
    if (question && unique(question.id, `questions[${i}]`)) questions.push({ ...question, custom: true });
  });
  if (!lessons.length && !questions.length) return { lessons, questions, issues, usable: false };
  const pack = raw.pack === undefined ? undefined : readPack(raw.pack, lessons, issues);
  return { lessons, questions, issues, usable: true, ...(pack ? { pack } : {}) };
}

/**
 * The lowest file version whose every reader flies this lesson (see the
 * header): 1 for a flight on catalogue parts, 2 for a case lesson or a custom
 * rocket, 3 for a custom satellite or a design lesson.
 */
export function lessonVersion(lesson: CatalogLesson): number {
  if (isCaseLesson(lesson)) return CASE_VERSION;
  if (isDesignLesson(lesson)) return DESIGN_VERSION;
  const m = lesson.mission.mission;
  if (m.satelliteSpec) return LESSON_FORMAT_VERSION;
  if (m.vehicleSpec) return CASE_VERSION;
  return FLIGHT_ONLY_VERSION;
}

/** The version a file of these lessons is written as: the highest any of them needs. */
export function lessonFileVersion(lessons: readonly CatalogLesson[]): number {
  return lessons.reduce((v, l) => Math.max(v, lessonVersion(l)), FLIGHT_ONLY_VERSION);
}

/**
 * The document of a file holding the given lessons and questions, at the
 * lowest version that reads them all (`lessonFileVersion`); with `pack`, a
 * lesson pack (T03), which needs no version of its own.
 */
export function lessonFileDocument(lessons: readonly CatalogLesson[], questions: readonly Question[] = [], pack?: LessonPack): LessonFileDocument {
  return {
    format: LESSON_FORMAT, version: lessonFileVersion(lessons), ...(pack ? { pack } : {}),
    lessons: [...lessons], ...(questions.length ? { questions: [...questions] } : {}),
  };
}

/** That document as the file's text. */
export function lessonFileText(lessons: readonly CatalogLesson[], questions: readonly Question[] = [], pack?: LessonPack): string {
  return `${JSON.stringify(lessonFileDocument(lessons, questions, pack), null, 2)}\n`;
}
