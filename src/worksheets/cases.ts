/**
 * Worksheets from real cases (roadmap P2.5, with M01–M03): a printable sheet
 * and its answer key for each of three cases from the record, worked with
 * the published data and this app's own physics — the collision of Iridium
 * 33 and Cosmos 2251 (2009), the second Long March 5B core stage's
 * uncontrolled re-entry (2021), and THEOS-2's sun-synchronous orbit over
 * Bangkok.
 *
 * The app's lessons are graded launches (src/lessons/types.ts: a mission
 * flown and read); these cases are no launch, so they come as case sheets
 * from the Orbit section, rendered by the same HTML as E05's worksheets
 * (src/worksheets/html.ts). Every answer is computed here, from the data the
 * sheet prints, and the working says how.
 *
 * DOM-free; tests/case-worksheets.test.ts.
 */
import { t, type Lang } from '../i18n';
import { J2_EARTH, MU_EARTH, R_EARTH } from '../physics/constants';
import { v3 } from '../physics/vec3';
import type { Activity } from '../physics/propagator/activity';
import IRIDIUM from '../data/iridium33-cosmos2251.json';
import { CZ5B_STAGES } from '../data/cz5b';
import { collisionProbability, inertialVelocity, rtnAxes, rtnToFrame, type Mat3, type PosVel } from '../orbit/conjunction';
import { encounterPlane, encounterPlaneSvg } from '../orbit/encounter-plane';
import { predictReentry, tumblingCylinderArea, WINDOW_FRACTION } from '../orbit/reentry';
import { elementsFromRecord } from '../orbit/omm';
import { meanStart } from '../orbit/mean-state';
import { groundReach, sensorFor } from '../orbit/sensors';
import type { ElementSet } from '../orbit/tle';
import { unitText } from '../lessons/text';
import type { CaseKey } from '../lessons/types';
import { CZ5B_CASE_STAGE, type CaseId } from './case-ids';
import { fmt } from './flight-questions';
import { letterOf } from './bank-items';
import type { WsItem, Worksheet } from './types';

export { CASE_IDS, type CaseId } from './case-ids';

export interface CaseInput {
  lang: Lang;
  generatedAt: Date;
  /** the Sun's activity the re-entry is predicted with (R05) */
  activity: Activity;
  /** THEOS-2's element set, as the catalogue on screen has it */
  theos2: ElementSet | null;
}

const DEG = Math.PI / 180;
const jdOf = (iso: string): number => Date.parse(iso) / 86400000 + 2440587.5;
const utc = (iso: string): string => `${iso.slice(0, 16).replace('T', ' ')} UTC`;

/**
 * A number item: the prompt, the answer to `digits`, its tolerance and working.
 * `unit` is the SI symbol; the sheet and its key print it as the reader's
 * language writes it (src/lessons/text.ts), as the flight sheets do.
 */
function num(lang: Lang, id: string, prompt: string, unit: string, value: number, digits: number, tol: number, working: string): WsItem {
  const u = unitText(unit, lang);
  return {
    kind: 'number', id, prompt, unit: u,
    answer: { text: `${fmt(lang, value, digits)} ${u}`.trim(), value, tolerance: `± ${fmt(lang, tol, digits)} ${u}`.trim(), tol, working },
  };
}

/** A choice item: the right answer put in place `at` among the wrong ones; the key names its letter, as the sheet letters it (а, б, в in Russian; ก, ข, ค in Thai). */
function choice(lang: Lang, id: string, prompt: string, right: string, wrong: string[], at: number): WsItem {
  const options = [...wrong.slice(0, at), right, ...wrong.slice(at)];
  return { kind: 'choice', id, prompt, options, answer: { text: `${letterOf(lang, at)}) ${right}`, index: at } };
}

// ─── Iridium 33 and Cosmos 2251 ───────────────────────────────────────────────

/** The case's numbers, from the conjunction message of 9 February 2009 as Shepperd (AMOS 2023) gives it. */
export function iridiumNumbers(): { miss: number; speed: number; angle: number; radius: number; sigmaMiss: number; sigma: [number, number]; majorFromMiss: number; logPcMessage: number; pcCautious: number } {
  const f = IRIDIUM;
  const state = (o: { r: number[]; v: number[] }): PosVel => ({ r: v3(o.r[0], o.r[1], o.r[2]), v: v3(o.v[0], o.v[1], o.v[2]) });
  const cov = (o: { r: number[]; v: number[]; cov: number[][] }): Mat3 => rtnToFrame(o.cov as Mat3, rtnAxes(inertialVelocity(state(o))));
  const a = state(f.iridium33), b = state(f.cosmos2251);
  const ai = inertialVelocity(a), bi = inertialVelocity(b);
  const radius = f.hardBodyRadius.iridium33 + f.hardBodyRadius.cosmos2251;
  const plane = encounterPlane(ai, cov(f.iridium33), bi, cov(f.cosmos2251), radius);
  const along = Math.hypot(plane.sigma[0] * Math.cos(plane.angle), plane.sigma[1] * Math.sin(plane.angle));
  // Iridium's own estimate with its cautious covariance, Cosmos carried to its epoch along a straight line (as the paper)
  const e = f.iridiumAdjustedEstimate, dt = (jdOf(e.epoch) - jdOf(f.tca)) * 86400;
  const moved = { r: v3(b.r.x + b.v.x * dt, b.r.y + b.v.y * dt, b.r.z + b.v.z * dt), v: b.v };
  const vdot = ai.v.x * bi.v.x + ai.v.y * bi.v.y + ai.v.z * bi.v.z;
  return {
    miss: Math.hypot(b.r.x - a.r.x, b.r.y - a.r.y, b.r.z - a.r.z),
    speed: Math.hypot(bi.v.x - ai.v.x, bi.v.y - ai.v.y, bi.v.z - ai.v.z),
    angle: Math.acos(vdot / (Math.hypot(ai.v.x, ai.v.y, ai.v.z) * Math.hypot(bi.v.x, bi.v.y, bi.v.z))) / DEG,
    radius,
    sigmaMiss: along,
    sigma: plane.sigma,
    majorFromMiss: Math.abs(plane.angle) / DEG,
    logPcMessage: collisionProbability(ai, cov(f.iridium33), bi, cov(f.cosmos2251), radius).log10,
    pcCautious: 10 ** collisionProbability(state(e), cov(e), moved, cov(f.cosmos2251), radius).log10,
  };
}

function iridiumSheet(lang: Lang): Omit<Worksheet, 'lang' | 'generatedAt'> {
  const f = IRIDIUM, n = iridiumNumbers();
  const km = (x: number) => fmt(lang, x / 1000, 3), kms = (x: number) => fmt(lang, x / 1000, 4);
  const u = (unit: string) => unitText(unit, lang);
  const plane = (() => {
    const s = (o: { r: number[]; v: number[] }): PosVel => ({ r: v3(o.r[0], o.r[1], o.r[2]), v: v3(o.v[0], o.v[1], o.v[2]) });
    const c = (o: { r: number[]; v: number[]; cov: number[][] }): Mat3 => rtnToFrame(o.cov as Mat3, rtnAxes(inertialVelocity(s(o))));
    return encounterPlane(inertialVelocity(s(f.iridium33)), c(f.iridium33), inertialVelocity(s(f.cosmos2251)), c(f.cosmos2251), n.radius);
  })();
  // the miss in the plane square to the relative velocity: at the closest approach, the whole of it
  const nSigma = Math.hypot(plane.miss.x, plane.miss.y) / n.sigmaMiss;
  return {
    title: t('wsc.iridium.title'), subtitle: t('wsc.iridium.subtitle'), student: '', code: 'CASE-IRIDIUM', seed: 0,
    sections: [
      {
        title: t('wsc.data'), intro: t('wsc.iridium.intro'),
        table: [
          [t('wsc.iridium.tca'), utc(f.tca)],
          [t('wsc.iridium.r1'), `(${f.iridium33.r.map(km).join('; ')}) ${u('km')}`],
          [t('wsc.iridium.v1'), `(${f.iridium33.v.map(kms).join('; ')}) ${u('km/s')}`],
          [t('wsc.iridium.r2'), `(${f.cosmos2251.r.map(km).join('; ')}) ${u('km')}`],
          [t('wsc.iridium.v2'), `(${f.cosmos2251.v.map(kms).join('; ')}) ${u('km/s')}`],
          [t('wsc.iridium.radii'), `${fmt(lang, f.hardBodyRadius.iridium33, 3)} ${u('m')}; ${fmt(lang, f.hardBodyRadius.cosmos2251, 0)} ${u('m')}`],
          [t('wsc.iridium.sigmas'), `${fmt(lang, n.sigma[0], 1)} ${u('m')}; ${fmt(lang, n.sigma[1], 1)} ${u('m')}; ${fmt(lang, n.majorFromMiss, 1)}°`],
          [t('wsc.iridium.published'), `JSpOC: ${f.table2Feb9['JSpOC-JSpOC'].foster.toExponential(1)}; Iridium: ${f.table2Feb9['IridConstr-JSpOC'].foster}`],
        ],
        figures: [{ svg: encounterPlaneSvg(plane, { first: 'Iridium 33', second: 'Cosmos 2251', scale: t('conj.planeScale') }, 280, true), caption: t('wsc.iridium.figure') }],
        items: [],
      },
      {
        title: t('wsc.questions'), intro: t('wsc.iridium.qIntro'),
        items: [
          num(lang, 'miss', t('wsc.iridium.q.miss'), 'm', n.miss, 0, 5, t('wsc.iridium.w.miss')),
          num(lang, 'speed', t('wsc.iridium.q.speed'), 'km/s', n.speed / 1000, 2, 0.05, t('wsc.iridium.w.speed')),
          num(lang, 'angle', t('wsc.iridium.q.angle'), '°', n.angle, 0, 2, t('wsc.iridium.w.angle')),
          num(lang, 'radius', t('wsc.iridium.q.radius'), 'm', n.radius, 1, 0.1, t('wsc.iridium.w.radius')),
          num(lang, 'sigma', t('wsc.iridium.q.sigma'), 'm', n.sigmaMiss, 1, Math.max(0.5, n.sigmaMiss * 0.05), t('wsc.iridium.w.sigma')),
          num(lang, 'nsigma', t('wsc.iridium.q.nsigma'), '', nSigma, 0, Math.max(1, nSigma * 0.05), t('wsc.iridium.w.nsigma')),
          choice(lang, 'why', t('wsc.iridium.q.why'), t('wsc.iridium.why.right'), [t('wsc.iridium.why.b'), t('wsc.iridium.why.c'), t('wsc.iridium.why.d')], 2),
          num(lang, 'times', t('wsc.iridium.q.times'), '', n.pcCautious / 1e-4, 0, 30, t('wsc.iridium.w.times', { p: fmt(lang, n.pcCautious, 3) })),
        ],
      },
    ],
  };
}

// ─── the Long March 5B core stage that launched Tianhe ─────────────────────────

type Cz5bNumbers = { area: number; b: number; left: number; actual: number; broadside: number; hp: number; ha: number; epoch: string };
/** One re-entry prediction takes some 0.4 s: a sheet built again (another language, the key) with the same Sun reuses it. */
const cz5bMemo = new WeakMap<Activity, Cz5bNumbers>();

/** The case's numbers: the stage that launched Tianhe (Y2), from its first element set, with the Sun as measured. */
export function cz5bNumbers(activity: Activity): Cz5bNumbers {
  const kept = cz5bMemo.get(activity);
  if (kept) return kept;
  const n = cz5bWorked(activity);
  cz5bMemo.set(activity, n);
  return n;
}

function cz5bWorked(activity: Activity): Cz5bNumbers {
  const s = CZ5B_STAGES.find((x) => x.name === CZ5B_CASE_STAGE)!;
  const el = elementsFromRecord(s.elements);
  const area = tumblingCylinderArea(s.length, s.diameter);
  const p = predictReentry(el, { mass: s.mass, area, cd: 2.2 }, activity);
  const from = el.jdEpoch + el.jdEpochFrac;
  const a = meanStart(el).a, e = s.elements.ECCENTRICITY;
  return {
    area, b: (2.2 * area) / s.mass, left: p.jd! - from, actual: jdOf(s.reentry) - from,
    broadside: s.length * s.diameter, hp: (a * (1 - e) - R_EARTH) / 1000, ha: (a * (1 + e) - R_EARTH) / 1000, epoch: s.elements.EPOCH,
  };
}

function cz5bSheet(lang: Lang, activity: Activity): Omit<Worksheet, 'lang' | 'generatedAt'> {
  const s = CZ5B_STAGES.find((x) => x.name === CZ5B_CASE_STAGE)!;
  const n = cz5bNumbers(activity);
  const early = n.left * (1 - WINDOW_FRACTION), late = n.left * (1 + WINDOW_FRACTION);
  const err = (n.left / n.actual - 1) * 100;
  const broadsideLeft = n.left * (n.area / n.broadside);
  const u = (unit: string) => unitText(unit, lang);
  return {
    title: t('wsc.cz5b.title'), subtitle: t('wsc.cz5b.subtitle'), student: '', code: 'CASE-CZ5B', seed: 0,
    sections: [
      {
        title: t('wsc.data'), intro: t('wsc.cz5b.intro'),
        table: [
          [t('wsc.cz5b.epoch'), utc(n.epoch)],
          [t('wsc.cz5b.orbit'), `${fmt(lang, n.hp, 0)} × ${fmt(lang, n.ha, 0)} ${u('km')}, ${fmt(lang, s.elements.INCLINATION, 1)}°`],
          [t('wsc.cz5b.body'), `${fmt(lang, s.mass, 0)} ${u('kg')}; ${fmt(lang, s.length, 1)} × ${fmt(lang, s.diameter, 1)} ${u('m')}; C_D ${fmt(lang, 2.2, 1)}`],
          [t('wsc.cz5b.predicted'), t('wsc.cz5b.predictedValue', { days: fmt(lang, n.left, 2) })],
          [t('wsc.cz5b.actual'), utc(s.reentry)],
        ],
        items: [],
      },
      {
        title: t('wsc.questions'), intro: t('wsc.cz5b.qIntro'),
        items: [
          num(lang, 'area', t('wsc.cz5b.q.area'), 'm²', n.area, 1, 1, t('wsc.cz5b.w.area')),
          num(lang, 'b', t('wsc.cz5b.q.b'), 'm²/kg', n.b, 5, 0.0003, t('wsc.cz5b.w.b')),
          num(lang, 'early', t('wsc.cz5b.q.early'), t('wsc.days'), early, 2, 0.05, t('wsc.cz5b.w.window')),
          num(lang, 'late', t('wsc.cz5b.q.late'), t('wsc.days'), late, 2, 0.05, t('wsc.cz5b.w.window')),
          num(lang, 'actual', t('wsc.cz5b.q.actual'), t('wsc.days'), n.actual, 2, 0.05, t('wsc.cz5b.w.actual')),
          num(lang, 'error', t('wsc.cz5b.q.error'), '%', err, 1, 1, t('wsc.cz5b.w.error')),
          num(lang, 'broadside', t('wsc.cz5b.q.broadside'), t('wsc.days'), broadsideLeft, 1, 0.5, t('wsc.cz5b.w.broadside', { a: fmt(lang, n.broadside, 1) })),
          choice(lang, 'why', t('wsc.cz5b.q.why'), t('wsc.cz5b.why.right'), [t('wsc.cz5b.why.b'), t('wsc.cz5b.why.c'), t('wsc.cz5b.why.d')], 1),
        ],
      },
    ],
  };
}

// ─── THEOS-2 ──────────────────────────────────────────────────────────────────

/** The case's numbers, from THEOS-2's element set. */
export function theos2Numbers(el: ElementSet): { a: number; e: number; i: number; h: number; required: number; j2: number; reach: number; lst: number } {
  const s = meanStart(el);
  const e = el.ecco, i = el.inclo;
  const p = s.a * (1 - e * e), n = Math.sqrt(MU_EARTH / s.a ** 3);
  const j2 = -1.5 * J2_EARTH * (R_EARTH / p) ** 2 * n * Math.cos(i) * (86400 / DEG);
  const h = s.a - R_EARTH;
  const reach = groundReach((sensorFor(58016)?.lookMax ?? 45 * DEG), h);
  return { a: s.a, e, i: i / DEG, h, required: 360 / 365.2422, j2, reach, lst: 3 + 20 / 60 + 100.5018 / 15 };
}

function theos2Sheet(lang: Lang, el: ElementSet): Omit<Worksheet, 'lang' | 'generatedAt'> {
  const n = theos2Numbers(el);
  const epoch = new Date((el.jdEpoch + el.jdEpochFrac - 2440587.5) * 86400e3).toISOString();
  const u = (unit: string) => unitText(unit, lang);
  return {
    title: t('wsc.theos2.title'), subtitle: t('wsc.theos2.subtitle'), student: '', code: 'CASE-THEOS2', seed: 0,
    sections: [
      {
        title: t('wsc.data'), intro: t('wsc.theos2.intro'),
        table: [
          [t('wsc.theos2.set'), utc(epoch)],
          [t('wsc.theos2.orbit'), `a = ${fmt(lang, n.a / 1000, 1)} ${u('km')}, e = ${fmt(lang, n.e, 4)}, i = ${fmt(lang, n.i, 2)}°`],
          [t('wsc.theos2.published'), t('wsc.theos2.publishedValue')],
          [t('wsc.theos2.bangkok'), `${fmt(lang, 13.756, 3)}° N, ${fmt(lang, 100.502, 3)}° E`],
          [t('wsc.theos2.constants'), `J₂ = ${fmt(lang, 1.08263, 5)} × 10⁻³; R = ${fmt(lang, 6378.137, 3)} ${u('km')}; μ = ${fmt(lang, 398600.4, 1)} ${u('km³/s²')}; R_mean = ${fmt(lang, 6371, 0)} ${u('km')}`],
        ],
        items: [],
      },
      {
        title: t('wsc.questions'), intro: t('wsc.theos2.qIntro'),
        items: [
          num(lang, 'required', t('wsc.theos2.q.required'), '°/d', n.required, 4, 0.0005, t('wsc.theos2.w.required')),
          num(lang, 'j2', t('wsc.theos2.q.j2'), '°/d', n.j2, 3, 0.01, t('wsc.theos2.w.j2')),
          num(lang, 'height', t('wsc.theos2.q.height'), 'km', n.h / 1000, 0, 2, t('wsc.theos2.w.height')),
          num(lang, 'reach', t('wsc.theos2.q.reach'), 'km', n.reach / 1000, 0, 10, t('wsc.theos2.w.reach')),
          num(lang, 'lst', t('wsc.theos2.q.lst'), 'h', n.lst, 2, 0.02, t('wsc.theos2.w.lst')),
          choice(lang, 'why', t('wsc.theos2.q.why'), t('wsc.theos2.why.right'), [t('wsc.theos2.why.b'), t('wsc.theos2.why.c'), t('wsc.theos2.why.d')], 3),
        ],
      },
    ],
  };
}

/** A case sheet in the language now chosen (`lang` is that language); null when THEOS-2's set is wanted and missing. */
export function caseWorksheet(id: CaseId, input: CaseInput): Worksheet | null {
  const body = id === 'iridium' ? iridiumSheet(input.lang)
    : id === 'cz5b' ? cz5bSheet(input.lang, input.activity)
      : input.theos2 ? theos2Sheet(input.lang, input.theos2) : null;
  return body && { ...body, lang: input.lang, generatedAt: input.generatedAt, footer: t('wsc.footer', { date: input.generatedAt.toISOString().slice(0, 10) }) };
}

/**
 * A case sheet's answer key as data: by question id, the value and the
 * tolerance the printed key gives (a choice: its option's index). The case
 * lessons are graded with it, so a lesson and the sheet cannot disagree.
 */
export function caseKey(sheet: Worksheet): CaseKey {
  const key: Record<string, CaseKey[string]> = {};
  for (const item of sheet.sections.flatMap((s) => s.items)) {
    if (!item.id) continue;
    if (item.kind === 'choice' && item.answer.index !== undefined) key[item.id] = { kind: 'choice', value: item.answer.index, tol: 0 };
    else if (item.kind === 'number' && item.answer.value !== undefined) key[item.id] = { kind: 'number', value: item.answer.value, tol: item.answer.tol ?? 0 };
  }
  return key;
}
