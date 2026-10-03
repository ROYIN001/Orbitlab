/** Strict, bounded archive readers. Existing forgiving browser loaders are not import validators. */
import { MISSION_FORMAT_VERSION, parseMissionDocument, type MissionDocument } from '../config/mission-file';
import { validateConfigInput, type ConfigInput } from '../config/validation';
import { designProblems, type DesignRecord } from '../design/design-store';
import { satelliteDesignProblems } from '../config/satellite-design';
import { defaultMissionState } from '../lessons/config';
import { readAnyLesson, readQuestion, type FileIssue } from '../lessons/lesson-file';
import { DATASET_SPECS } from '../lessons/assessment/flights';
import type { ProgressData } from '../lessons/progress';
import { readActions } from '../physics/sim/actions';

export const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.length <= 100_000;
const id = (v: unknown): v is string => text(v) && v.length > 0 && v.length <= 200;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const count = (v: unknown): v is number => finite(v) && Number.isSafeInteger(v) && v >= 0;
const date = (v: unknown): v is string => text(v) && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
const array = (v: unknown, max = 10_000): v is unknown[] => Array.isArray(v) && v.length <= max;
const optional = (v: unknown, check: (x: unknown) => boolean): boolean => v === undefined || check(v);
const numberMap = (v: unknown): boolean => record(v) && Object.values(v).every(finite);
const nullableNumber = (v: unknown): boolean => v === null || finite(v);

/** No executable values, prototype keys, excessive nesting or unbounded collections. */
export function safeJson(value: unknown): boolean {
  let nodes = 0;
  const visit = (v: unknown, depth: number): boolean => {
    if (++nodes > 400_000 || depth > 64) return false;
    if (v === null || typeof v === 'boolean') return true;
    if (typeof v === 'number') return Number.isFinite(v);
    if (typeof v === 'string') return v.length <= 100_000;
    if (Array.isArray(v)) return v.length <= 50_000 && v.every((x) => visit(x, depth + 1));
    if (!record(v) || Object.getPrototypeOf(v) !== Object.prototype) return false;
    return Object.entries(v).every(([k, x]) => !['__proto__', 'constructor', 'prototype'].includes(k) && visit(x, depth + 1));
  };
  return visit(value, 0);
}

export function validMission(value: unknown): value is MissionDocument {
  if (!record(value) || !record(value.mission) || !Number.isInteger(value.version)
    || (value.version as number) > MISSION_FORMAT_VERSION) return false;
  const m = value.mission;
  // The forgiving mission upgrader drops these fields in older versions.
  // An archive must reject that loss instead of claiming a complete restore.
  if ((value.version as number) < 2 && m.vehicleSpec !== undefined
    || (value.version as number) < 3 && m.satelliteSpec !== undefined) return false;
  if (!['vehicleId', 'satelliteId', 'siteId', 'orbitId'].every((k) => id(m[k])) || !date(m.launchTime)
    || !record(m.orbit) || !record(m.guidanceOverrides) || !record(m.failure)
    || !finite(m.payloadMass) || typeof m.boosterRecovery !== 'boolean') return false;
  try {
    if (validateConfigInput({ ...m, launchTime: new Date(m.launchTime) } as unknown as ConfigInput).length) return false;
    const parsed = parseMissionDocument(value, defaultMissionState());
    return parsed.usable && parsed.issues.length === 0;
  } catch { return false; }
}

export interface ProjectDesigns { version: 1; designs: DesignRecord[] }
export function validDesigns(value: unknown): value is ProjectDesigns {
  if (!record(value) || value.version !== 1 || !array(value.designs, 1_000)) return false;
  const ids = new Set<string>();
  return value.designs.every((d) => {
    if (!record(d) || !id(d.id) || ids.has(d.id) || !date(d.created) || !date(d.updated)) return false;
    ids.add(d.id);
    try { return designProblems(d.kind, d.name, d.design) === null; } catch { return false; }
  });
}

const SVG_TAGS = new Set(['svg', 'g', 'path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse', 'text', 'tspan', 'title', 'desc']);
const SVG_ATTRIBUTES = new Set([
  'xmlns', 'viewBox', 'width', 'height', 'role', 'class', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'dx', 'dy',
  'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray',
  'stroke-linecap', 'stroke-linejoin', 'fill-opacity', 'stroke-opacity', 'opacity', 'transform',
  'text-anchor', 'dominant-baseline', 'font-family', 'font-size', 'font-weight',
]);

/**
 * The app's saved diagrams use inert geometry and text only. Validate that
 * exact subset, rather than trying to sanitize arbitrary SVG with a blacklist.
 * Links, animation, CSS, resource loading, foreign namespaces and HTML are not supported.
 */
function validSvg(value: unknown): boolean {
  if (!text(value)) return false;
  const stack: string[] = [];
  let at = 0, root = false;
  while (at < value.length) {
    const next = value.indexOf('<', at);
    const content = value.slice(at, next < 0 ? value.length : next);
    if (!stack.length && content.trim()) return false;
    if (content.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, '').includes('&')) return false;
    if (next < 0) { at = value.length; break; }
    const end = value.indexOf('>', next);
    if (end < 0) return false;
    const tag = /^<(\/?)([A-Za-z]+)([\s\S]*?)(\/?)>$/.exec(value.slice(next, end + 1));
    if (!tag || !SVG_TAGS.has(tag[2])) return false;
    const [, closing, name, attributes, selfClosing] = tag;
    if (closing) {
      if (attributes.trim() || selfClosing || stack.pop() !== name) return false;
    } else {
      if (!stack.length) {
        if (root || name !== 'svg') return false;
        root = true;
      }
      const seen = new Set<string>();
      let rest = attributes;
      while (rest.trim()) {
        const attribute = /^\s+([A-Za-z][\w:-]*)\s*=\s*(["'])([^<>]*?)\2/.exec(rest);
        if (!attribute || !SVG_ATTRIBUTES.has(attribute[1]) || seen.has(attribute[1])) return false;
        const [, key, , val] = attribute;
        if (val.includes('&') || (key === 'xmlns' && val !== 'http://www.w3.org/2000/svg')) return false;
        if ((key === 'fill' || key === 'stroke') && !/^(?:none|currentColor|transparent|[a-z]+|#[\da-f]{3,8}|rgba?\([\d.,%\s]+\))$/i.test(val)) return false;
        seen.add(key);
        rest = rest.slice(attribute[0].length);
      }
      if (!selfClosing) stack.push(name);
    }
    at = end + 1;
  }
  return root && stack.length === 0;
}

function validImage(value: unknown): boolean {
  if (!text(value) || /[\u0000-\u0020\\]/.test(value)) return false;
  // Generated worksheets use bundled photographs; explicit HTTPS images and
  // raster data URLs are also inert. SVG data URLs and all other schemes fail.
  return /^(?:\.\/)?[\w/-]+\.(?:png|jpe?g|webp|gif)$/i.test(value)
    || /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z\d+/]+=*$/i.test(value)
    || (() => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } })();
}

function validFigure(v: unknown): boolean {
  return record(v) && optional(v.caption, text) && optional(v.image, validImage) && optional(v.svg, validSvg);
}

function validWorksheet(v: unknown): boolean {
  return record(v) && ['en', 'ru', 'th'].includes(v.lang as string)
    && ['title', 'subtitle', 'student', 'code'].every((k) => text(v[k])) && finite(v.seed) && date(v.generatedAt)
    && optional(v.footer, text)
    && array(v.sections, 100) && v.sections.every((s) => record(s) && text(s.title) && array(s.items, 1_000)
      && optional(s.intro, text) && optional(s.figures, (x) => array(x, 100) && x.every(validFigure))
      && optional(s.table, (x) => array(x, 1_000) && x.every((row) => array(row, 2) && row.length === 2 && row.every(text)))
      && s.items.every((i) => record(i) && ['number', 'choice', 'multi', 'order'].includes(i.kind as string)
        && text(i.prompt) && record(i.answer) && text(i.answer.text)
        && optional(i.id, id) && optional(i.unit, text) && optional(i.figure, validFigure)
        && optional(i.answer.value, finite) && optional(i.answer.index, count) && optional(i.answer.tol, finite)
        && optional(i.answer.tolerance, text) && optional(i.answer.working, text)
        && optional(i.options, (x) => array(x, 100) && x.every(text))));
}

function validCaseSource(v: unknown): boolean {
  if (!record(v) || !record(v.activity) || !optional(v.activityTo, text)) return false;
  const a = v.activity;
  if (a.from !== undefined) {
    if (!finite(a.from) || !array(a.f107) || !a.f107.length || !a.f107.every(finite)
      || !array(a.f107a) || a.f107a.length !== a.f107.length || !a.f107a.every(finite)
      || !array(a.ap) || a.ap.length !== a.f107.length || !a.ap.every(finite)) return false;
  } else if (!['f107', 'f107a', 'ap'].every((k) => finite(a[k]))) return false;
  const e = v.theos2;
  return e === null || record(e) && (e.name === null || text(e.name)) && text(e.classification) && text(e.intldesg)
    && ['satnum', 'epochYear', 'epochDays', 'jdEpoch', 'jdEpochFrac', 'ndot', 'nddot', 'bstar', 'inclo', 'nodeo', 'ecco', 'argpo', 'mo', 'noKozai', 'elnum', 'revnum'].every((k) => finite(e[k]));
}

function validLessonRecord(v: unknown): boolean {
  if (!record(v) || !date(v.at) || !['pass', 'passedWithHelp', 'fail', 'open'].includes(v.verdict as string)
    || !count(v.hintsShown) || v.hintsShown > 3 || !numberMap(v.answers) || !array(v.criteria, 1_000)) return false;
  if (!v.criteria.every((c) => record(c) && id(c.id) && ['pending', 'passing', 'pass', 'fail'].includes(c.state as string)
    && nullableNumber(c.value) && optional(c.expected, nullableNumber) && optional(c.revealed, (x) => typeof x === 'boolean'))) return false;
  if (!optional(v.mission, validMission) || !optional(v.t, finite) || !optional(v.clock, finite)
    || !optional(v.app, text) || !optional(v.revealed, (x) => array(x) && x.every(id))
    || !optional(v.actions, (x) => array(x) && readActions(x) !== null)
    || !optional(v.design, (x) => satelliteDesignProblems(x).length === 0)
    || !optional(v.designDate, (x) => text(x) && Number.isFinite(Date.parse(x)))
    || !optional(v.level, (x) => ['low', 'moderate', 'high'].includes(x as string))
    || !optional(v.figures, (x) => record(x) && Object.values(x).every(nullableNumber))) return false;
  if (v.caseData !== undefined) {
    const c = v.caseData;
    if (!record(c) || !['iridium', 'cz5b', 'theos2'].includes(c.case as string)
      || !optional(c.theos2Epoch, text) || !optional(c.activityTo, text)) return false;
    if (c.snapshot !== undefined) {
      const s = c.snapshot;
      if (!record(s) || s.version !== 1 || !date(s.generatedAt) || !validCaseSource(s.source)
        || !validWorksheet(s.worksheet)) return false;
    }
  }
  return true;
}

/**
 * Stored custom teaching data already has the reader's complete shape. A
 * forgiving parser may demonstrate usability, but must not silently repair
 * raw archive values which are later used directly by the browser loader.
 */
function sameStoredShape(raw: unknown, parsed: unknown): boolean {
  if (raw === parsed) return true;
  if (Array.isArray(raw) && Array.isArray(parsed)) return raw.length === parsed.length && raw.every((v, i) => sameStoredShape(v, parsed[i]));
  if (!record(raw) || !record(parsed)) return false;
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined && !sameStoredShape(raw[key], value)) return false;
  }
  return Object.entries(raw).every(([key, value]) => {
    if (parsed[key] !== undefined) return true;
    // These explicit optional values have the same meaning as omission and
    // remain byte-for-data intact in the archive. Everything else must match.
    return value === false && ['comingSoon', 'fixedOrder', 'correct'].includes(key)
      || Array.isArray(value) && value.length === 0 && ['tags', 'curriculum', 'reveal', 'compare'].includes(key);
  });
}

/** Validate existing progress without dropping records or silently repairing student work. */
export function validProgress(value: unknown): value is ProgressData {
  if (!record(value) || value.version !== 1 || !record(value.lessons) || Object.keys(value.lessons).length > 5_000
    || !array(value.assessments, 5_000) || !array(value.customLessons, 1_000) || !array(value.customQuestions, 5_000)) return false;
  if (!Object.entries(value.lessons).every(([key, p]) => id(key) && record(p) && count(p.attempts)
    && count(p.hintsShown) && p.hintsShown <= 3 && typeof p.passed === 'boolean'
    && optional(p.passedWithHelp, (x) => typeof x === 'boolean') && optional(p.reveals, count)
    && optional(p.last, validLessonRecord) && optional(p.passedRecord, validLessonRecord)
    && optional(p.revealed, (x) => record(x) && Object.values(x).every((a) => array(a) && a.every(finite))))) return false;
  if (!value.assessments.every((a) => record(a) && ['pre', 'post'].includes(a.kind as string) && finite(a.seed)
    && date(a.startedAt) && optional(a.finishedAt, date) && array(a.questions, 1_000) && array(a.answers, 1_000)
    && a.questions.every((q) => record(q) && id(q.id) && optional(q.order, (x) => array(x) && x.every(count))
      && optional(q.values, numberMap) && optional(q.vehicle, id) && optional(q.vehicleOptions, (x) => array(x) && x.every(id)))
    && a.answers.every((r) => record(r) && id(r.id) && (r.value === null || text(r.value) || finite(r.value))
      && optional(r.confidence, (x) => ['guess', 'unsure', 'sure'].includes(x as string))
      && optional(r.skipped, (x) => typeof x === 'boolean')))) return false;
  const issues: FileIssue[] = [], ids = new Set<string>(), datasets = new Set(Object.keys(DATASET_SPECS));
  for (const [kind, values] of [['lesson', value.customLessons], ['question', value.customQuestions]] as const) {
    for (const item of values) {
      if (kind === 'lesson' && record(item) && item.mission !== undefined && !validMission(item.mission)) return false;
      const parsed = kind === 'lesson' ? readAnyLesson(item, 'project', issues) : readQuestion(item, 'project', issues, datasets);
      if (!parsed || !record(item) || ids.has(parsed.id) || issues.some((i) => i.level === 'error')) return false;
      const expected = { ...parsed } as Record<string, unknown>;
      // Reader-only provenance fields are legitimate in stored objects.
      if (kind === 'question' && item.custom !== undefined) {
        if (typeof item.custom !== 'boolean') return false;
        expected.custom = item.custom;
      }
      if (kind === 'lesson' && item.kind === 'flight') expected.kind = 'flight';
      if (!sameStoredShape(item, expected)) return false;
      ids.add(parsed.id);
    }
  }
  return true;
}
