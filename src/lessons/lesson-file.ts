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
 * (`lessonFileVersion`), so a file of catalogue flights stays version 1. The
 * design-lesson kind (map §4.1) is planned for version 3 as well, since it
 * ships in the same Phase 4 release; if it shipped later it would need its
 * own number.
 */
import { missionDocument, parseMissionDocument, MISSION_FORMAT, type MissionDocument } from '../config/mission-file';
import { defaultMissionState } from './config';
import { hookExists } from './hooks';
import { MEASURE_IDS } from './measures';
import { compileExpression } from './assessment/expression';
import { DIAGRAM_IDS } from './assessment/diagrams';
import {
  DOMAINS, LOCK_KEYS, REVEAL_KEYS, isCaseLesson,
  type CaseCriterion, type CaseLesson, type CatalogLesson, type Criterion, type Domain, type Lesson, type LocalText, type LockKey, type MeasureId, type RevealKey,
} from './types';
import { CASE_CHOICE_ITEMS, CASE_IDS, CASE_ITEM_IDS, type CaseId } from '../worksheets/case-ids';
import type { ChoiceOption, Figure, FlightSeries, Question } from './assessment/types';
import { VEHICLES } from '../data/vehicles';

export const LESSON_FORMAT = 'orbitlab.lessons';
export const LESSON_FORMAT_VERSION = 3;
/** The version a file of flight lessons on catalogue rockets and satellites is written as: every copy of the app reads it. */
const FLIGHT_ONLY_VERSION = 1;
/** The version that first read case lessons (track 6), after S02's custom rockets. */
const CASE_VERSION = 2;
export const LESSON_FILE_EXTENSION = '.orbitlab-lesson.json';

export interface LessonFileDocument {
  format: typeof LESSON_FORMAT;
  version: number;
  lessons?: unknown[];
  questions?: unknown[];
}

export type FileIssueCode = 'format' | 'newerVersion' | 'missing' | 'invalid' | 'mission' | 'translation' | 'hook' | 'expression' | 'duplicate' | 'event';
export interface FileIssue { where: string; code: FileIssueCode; level: 'error' | 'warn'; detail?: string }

export interface ParsedLessonFile {
  lessons: CatalogLesson[];
  questions: Question[];
  issues: FileIssue[];
  /** false when the file is not a lesson file at all */
  usable: boolean;
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
  return { title, brief, debrief, track, order, mode, domains, tags, comingSoon };
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
  const { title, brief, debrief, track, order, mode, domains, tags, comingSoon } = meta;

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
  const { title, brief, debrief, track, order, mode, domains, tags, comingSoon } = meta;
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
  };
}

/** Read one lesson of either kind: a case lesson says so; a lesson without a kind is a flight lesson. */
export function readAnyLesson(raw: unknown, where: string, issues: FileIssue[]): CatalogLesson | null {
  const kind = isRecord(raw) ? raw.kind : undefined;
  if (kind === 'case') return readCaseLesson(raw, where, issues);
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
      if (knownEvents && !isCaseLesson(lesson)) issues.push(...eventIssues(lesson, `lessons[${i}] (${lesson.id})`, knownEvents));
    }
  });
  if (Array.isArray(raw.questions)) raw.questions.forEach((q, i) => {
    const question = readQuestion(q, `questions[${i}]`, issues, datasets);
    if (question && unique(question.id, `questions[${i}]`)) questions.push({ ...question, custom: true });
  });
  if (!lessons.length && !questions.length) return { lessons, questions, issues, usable: false };
  return { lessons, questions, issues, usable: true };
}

/**
 * The lowest file version whose every reader flies this lesson (see the
 * header): 1 for a flight on catalogue parts, 2 for a case lesson or a custom
 * rocket, 3 for a custom satellite.
 */
export function lessonVersion(lesson: CatalogLesson): number {
  if (isCaseLesson(lesson)) return CASE_VERSION;
  const m = lesson.mission.mission;
  if (m.satelliteSpec) return LESSON_FORMAT_VERSION;
  if (m.vehicleSpec) return CASE_VERSION;
  return FLIGHT_ONLY_VERSION;
}

/** The version a file of these lessons is written as: the highest any of them needs. */
export function lessonFileVersion(lessons: readonly CatalogLesson[]): number {
  return lessons.reduce((v, l) => Math.max(v, lessonVersion(l)), FLIGHT_ONLY_VERSION);
}

/** The document of a file holding the given lessons and questions, at the lowest version that reads them all (`lessonFileVersion`). */
export function lessonFileDocument(lessons: readonly CatalogLesson[], questions: readonly Question[] = []): LessonFileDocument {
  return { format: LESSON_FORMAT, version: lessonFileVersion(lessons), lessons: [...lessons], ...(questions.length ? { questions: [...questions] } : {}) };
}

/** That document as the file's text. */
export function lessonFileText(lessons: readonly CatalogLesson[], questions: readonly Question[] = []): string {
  return `${JSON.stringify(lessonFileDocument(lessons, questions), null, 2)}\n`;
}
