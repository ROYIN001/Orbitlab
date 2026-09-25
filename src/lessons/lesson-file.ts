/**
 * Lesson files (roadmap E03): a teacher's lessons and placement-test
 * questions as a `.orbitlab-lesson.json` file, read with the same care as a
 * mission file (U01). The built-in lessons and questions are held to the same
 * reader by the tests, so the format is exactly what the app itself uses.
 *
 * A lesson whose mission, criteria or texts cannot be used is left out with
 * the reason; the rest of the file is kept. A text missing a language falls
 * back to English and is reported as a warning.
 */
import { missionDocument, parseMissionDocument, MISSION_FORMAT, type MissionDocument } from '../config/mission-file';
import { defaultMissionState } from './config';
import { hookExists } from './hooks';
import { MEASURE_IDS } from './measures';
import { compileExpression } from './assessment/expression';
import { DOMAINS, LOCK_KEYS, type Criterion, type Domain, type Lesson, type LocalText, type LockKey, type MeasureId } from './types';
import type { ChoiceOption, Figure, FlightSeries, Question } from './assessment/types';
import { VEHICLES } from '../data/vehicles';

export const LESSON_FORMAT = 'orbitlab.lessons';
export const LESSON_FORMAT_VERSION = 1;
export const LESSON_FILE_EXTENSION = '.orbitlab-lesson.json';

export interface LessonFileDocument {
  format: typeof LESSON_FORMAT;
  version: number;
  lessons?: unknown[];
  questions?: unknown[];
}

export type FileIssueCode = 'format' | 'newerVersion' | 'missing' | 'invalid' | 'mission' | 'translation' | 'hook' | 'expression' | 'duplicate';
export interface FileIssue { where: string; code: FileIssueCode; level: 'error' | 'warn'; detail?: string }

export interface ParsedLessonFile {
  lessons: Lesson[];
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

/** Read one lesson. Its mission is normalised through the mission reader. */
export function readLesson(raw: unknown, where: string, issues: FileIssue[]): Lesson | null {
  const r = new Reader(issues);
  if (!isRecord(raw) || !isStr(raw.id)) return r.error(where, 'missing', 'id') || null;
  const at = `${where} (${raw.id})`;
  const title = r.text(raw.title, `${at}.title`);
  const brief = r.text(raw.brief, `${at}.brief`);
  if (!title || !brief) return null;
  const debrief = raw.debrief === undefined ? undefined : r.text(raw.debrief, `${at}.debrief`) ?? undefined;
  const track = isNum(raw.track) ? Math.round(raw.track) : 9;
  const order = isNum(raw.order) ? Math.round(raw.order) : 99;
  const mode = raw.mode === 'engineer' ? 'engineer' : 'explore';
  const domains = Array.isArray(raw.domains) ? raw.domains.filter((d): d is Domain => DOMAINS.includes(d as Domain)) : [];
  if (!domains.length) return r.error(`${at}.domains`, 'missing') || null;
  const tags = Array.isArray(raw.tags) ? raw.tags.filter(isStr) : undefined;
  const comingSoon = raw.comingSoon === true;

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
  const hints: LocalText[] = [];
  if (Array.isArray(raw.hints)) for (let i = 0; i < raw.hints.length; i++) {
    const h = r.text(raw.hints[i], `${at}.hints[${i}]`);
    if (h) hints.push(h);
  }
  return {
    id: raw.id, track, order, mode, domains, ...(tags?.length ? { tags } : {}),
    title, brief, ...(debrief ? { debrief } : {}), mission, locked, criteria, hints,
    ...(isStr(raw.endEvent) ? { endEvent: raw.endEvent } : {}),
    ...(comingSoon ? { comingSoon } : {}),
  };
}

const SERIES: readonly FlightSeries[] = ['alt', 'vInertial', 'q', 'gLoad', 'mass', 'thrust', 'pitch', 'dvRemaining'];

function readFigure(r: Reader, raw: unknown, where: string, datasets: ReadonlySet<string>): Figure | null {
  if (!isRecord(raw)) return r.error(where, 'invalid') || null;
  if (raw.kind === 'vehicle') return isStr(raw.vehicleId) && VEHICLES.some((v) => v.id === raw.vehicleId) ? { kind: 'vehicle', vehicleId: raw.vehicleId } : r.error(where, 'invalid', 'vehicleId') || null;
  if (raw.kind === 'diagram') return isStr(raw.id) ? { kind: 'diagram', id: raw.id } : r.error(where, 'invalid', 'id') || null;
  if (raw.kind === 'chart') {
    const compare = Array.isArray(raw.compare) ? raw.compare.filter(isStr) : undefined;
    if (!isStr(raw.dataset) || !datasets.has(raw.dataset) || !SERIES.includes(raw.series as FlightSeries)
      || (compare && compare.some((d) => !datasets.has(d)))) return r.error(where, 'invalid', 'dataset') || null;
    return { kind: 'chart', dataset: raw.dataset, series: raw.series as FlightSeries, ...(compare?.length ? { compare } : {}), ...(isNum(raw.tMax) ? { tMax: raw.tMax } : {}) };
  }
  return r.error(where, 'invalid', 'kind') || null;
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
      if (!Array.isArray(raw.options) || raw.options.length < 2) return r.error(`${at}.options`, 'missing') || null;
      const options: ChoiceOption[] = [];
      for (let i = 0; i < raw.options.length; i++) {
        const o = raw.options[i];
        const text = isRecord(o) ? r.text(o.text, `${at}.options[${i}]`) : null;
        if (!text || !isRecord(o)) return null;
        const misconception = o.misconception === undefined ? undefined : r.text(o.misconception, `${at}.options[${i}].misconception`) ?? undefined;
        options.push({ text, ...(o.correct === true ? { correct: true } : {}), ...(misconception ? { misconception } : {}) });
      }
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
    case 'vehicle': {
      const vehicles = Array.isArray(raw.vehicles) ? raw.vehicles.filter((v): v is string => isStr(v) && VEHICLES.some((x) => x.id === v)) : [];
      if (vehicles.length < 4) return r.error(`${at}.vehicles`, 'invalid', 'four or more') || null;
      return { ...base, type: 'vehicle', vehicles };
    }
    default:
      return r.error(at, 'invalid', 'type') || null;
  }
}

/** Read a lesson file. */
export function parseLessonFile(raw: unknown, datasets: ReadonlySet<string>): ParsedLessonFile {
  const issues: FileIssue[] = [];
  if (!isRecord(raw) || raw.format !== LESSON_FORMAT || !isNum(raw.version) || raw.version < 1) {
    return { lessons: [], questions: [], issues: [{ where: 'document', code: 'format', level: 'error' }], usable: false };
  }
  if (raw.version > LESSON_FORMAT_VERSION) issues.push({ where: 'document', code: 'newerVersion', level: 'warn' });
  const lessons: Lesson[] = [];
  const questions: Question[] = [];
  const seen = new Set<string>();
  const unique = (id: string, where: string): boolean => {
    if (seen.has(id)) { issues.push({ where, code: 'duplicate', level: 'error', detail: id }); return false; }
    seen.add(id);
    return true;
  };
  if (Array.isArray(raw.lessons)) raw.lessons.forEach((l, i) => {
    const lesson = readLesson(l, `lessons[${i}]`, issues);
    if (lesson && unique(lesson.id, `lessons[${i}]`)) lessons.push(lesson);
  });
  if (Array.isArray(raw.questions)) raw.questions.forEach((q, i) => {
    const question = readQuestion(q, `questions[${i}]`, issues, datasets);
    if (question && unique(question.id, `questions[${i}]`)) questions.push({ ...question, custom: true });
  });
  if (!lessons.length && !questions.length) return { lessons, questions, issues, usable: false };
  return { lessons, questions, issues, usable: true };
}

/** A file holding the given lessons and questions. */
export function lessonFileText(lessons: readonly Lesson[], questions: readonly Question[] = []): string {
  const doc: LessonFileDocument = { format: LESSON_FORMAT, version: LESSON_FORMAT_VERSION, lessons: [...lessons], ...(questions.length ? { questions: [...questions] } : {}) };
  return `${JSON.stringify(doc, null, 2)}\n`;
}
