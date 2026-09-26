/**
 * Questions worked from the flight itself (roadmap E05): values read off its
 * charts at times drawn for each student, and calculations from its numbers —
 * thrust-to-weight at lift-off, the first stage's ideal Δv and what the ascent
 * lost of it, the period and perigee speed of the orbit reached. Every answer
 * is computed from the recorded telemetry and events, as the student is asked
 * to, so the key is the flight's own.
 */
import { t, type Lang } from '../i18n';
import { G0, MU_EARTH, R_EARTH } from '../physics/constants';
import { missionVehicle } from '../data/vehicles';
import { flightElements } from '../lessons/measures';
import { unitText } from '../lessons/text';
import { seriesValue, type ChartSample } from '../lessons/assessment/flights';
import type { FlightSeries } from '../lessons/assessment/types';
import type { LessonFlight } from '../lessons/types';
import type { WsItem } from './types';

export type WsFlight = LessonFlight;

/** A number as the sheet prints it, in the reader's language. */
export const fmt = (lang: Lang, v: number, digits: number): string =>
  v.toLocaleString(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits });
const round = (v: number, digits: number): number => Number(v.toFixed(digits));

/** A telemetry value at a mission time, interpolated, in the charts' unit. */
export function valueAt(samples: readonly ChartSample[], time: number, key: FlightSeries): number | null {
  // the lift-off sample lands a rounding error before T+0
  const tel = samples.filter((s) => s.t >= -1e-6);
  if (!tel.length || time < tel[0].t - 1e-6 || time > tel[tel.length - 1].t) return null;
  let i = 0;
  while (i < tel.length - 2 && tel[i + 1].t < time) i++;
  const a = tel[i], b = tel[Math.min(i + 1, tel.length - 1)];
  const u = b.t > a.t ? (time - a.t) / (b.t - a.t) : 0;
  return seriesValue(a, key) + (seriesValue(b, key) - seriesValue(a, key)) * u;
}

export const eventTime = (f: WsFlight, keys: readonly string[]): number | null => {
  let best: number | null = null;
  for (const e of f.events) if (keys.includes(e.key) && e.t >= 0 && (best === null || e.t < best)) best = e.t;
  return best;
};

/** When the ascent ended: the insertion, or the last sample. */
export function ascentEnd(f: WsFlight): number {
  const ins = eventTime(f, ['evt.seco', 'evt.parkingOrbit', 'evt.targetOrbit', 'evt.offTargetOrbit']);
  return ins ?? f.telemetry[f.telemetry.length - 1]?.t ?? 0;
}

function peak(f: WsFlight, key: FlightSeries): { value: number; t: number } | null {
  let best: { value: number; t: number } | null = null;
  const end = ascentEnd(f);
  for (const s of f.telemetry) {
    if (s.t < 0 || s.t > end + 1e-6) continue;
    const v = seriesValue(s, key);
    if (!best || v > best.value) best = { value: v, t: s.t };
  }
  return best;
}

interface Ctx { f: WsFlight; lang: Lang; random: () => number }
type Generator = (c: Ctx) => WsItem | null;

const drawTime = (c: Ctx, from: number, to: number, step = 10): number | null => {
  const lo = Math.ceil(from / step), hi = Math.floor(to / step);
  return hi < lo ? null : (lo + Math.floor(c.random() * (hi - lo + 1))) * step;
};

/** The first stage's own burn, when it flies alone (no strap-ons to share it). */
function firstStage(c: Ctx) {
  const spec = missionVehicle(c.f.cfg); // S02: a custom vehicle's flight too
  const stage = spec.stages[0];
  const meco = eventTime(c.f, ['evt.meco']);
  if (!stage || stage.boosters?.length || meco === null || meco < 20) return null;
  const m0 = valueAt(c.f.telemetry, 0, 'mass'), m1 = valueAt(c.f.telemetry, meco - 0.5, 'mass');
  if (m0 === null || m1 === null || !(m0 > m1)) return null;
  return { meco, m0: round(m0, 1), m1: round(m1, 1), isp: Math.round((stage.engine.ispSL + stage.engine.ispVac) / 2) };
}

const GENERATORS: Readonly<Record<string, Generator>> = {
  altAt(c) {
    const time = drawTime(c, 30, Math.min(ascentEnd(c.f), 480) - 10);
    const v = time === null ? null : valueAt(c.f.telemetry, time, 'alt');
    if (time === null || v === null) return null;
    return {
      kind: 'number', prompt: t('ws.fq.altAt', { t: time }), unit: unitText('km', c.lang),
      answer: { text: `${fmt(c.lang, v, 1)} ${unitText('km', c.lang)}`, value: v, tolerance: `± ${fmt(c.lang, Math.max(3, v * 0.05), 1)} ${unitText('km', c.lang)}`, working: t('ws.fw.read', { t: time }) },
    };
  },
  speedAt(c) {
    const time = drawTime(c, 30, Math.min(ascentEnd(c.f), 480) - 10);
    const v = time === null ? null : valueAt(c.f.telemetry, time, 'vInertial');
    if (time === null || v === null) return null;
    return {
      kind: 'number', prompt: t('ws.fq.speedAt', { t: time }), unit: unitText('m/s', c.lang),
      answer: { text: `${fmt(c.lang, v, 0)} ${unitText('m/s', c.lang)}`, value: v, tolerance: `± ${fmt(c.lang, Math.max(100, v * 0.05), 0)} ${unitText('m/s', c.lang)}`, working: t('ws.fw.read', { t: time }) },
    };
  },
  maxQ(c) {
    const p = peak(c.f, 'q');
    if (!p || p.value <= 0) return null;
    return {
      kind: 'number', prompt: t('ws.fq.maxQ'), unit: unitText('kPa', c.lang),
      answer: { text: `${fmt(c.lang, p.value, 1)} ${unitText('kPa', c.lang)}`, value: p.value, tolerance: '± 5 %', working: t('ws.fw.peak', { t: fmt(c.lang, p.t, 0) }) },
    };
  },
  maxQTime(c) {
    const p = peak(c.f, 'q');
    if (!p || p.value <= 0) return null;
    return {
      kind: 'number', prompt: t('ws.fq.maxQTime'), unit: unitText('s', c.lang),
      answer: { text: `T+${fmt(c.lang, p.t, 0)} ${unitText('s', c.lang)}`, value: p.t, tolerance: `± 5 ${unitText('s', c.lang)}`, working: t('ws.fw.peakQ', { q: fmt(c.lang, p.value, 1) }) },
    };
  },
  maxG(c) {
    const p = peak(c.f, 'gLoad');
    if (!p) return null;
    return {
      kind: 'number', prompt: t('ws.fq.maxG'), unit: 'g',
      answer: { text: `${fmt(c.lang, p.value, 2)} g`, value: p.value, tolerance: '± 5 %', working: t('ws.fw.peak', { t: fmt(c.lang, p.t, 0) }) },
    };
  },
  mecoTime(c) {
    const meco = eventTime(c.f, ['evt.meco']);
    if (meco === null) return null;
    return {
      kind: 'number', prompt: t('ws.fq.meco'), unit: unitText('s', c.lang),
      answer: { text: `${fmt(c.lang, meco, 0)} ${unitText('s', c.lang)}`, value: meco, tolerance: `± 2 ${unitText('s', c.lang)}`, working: t('ws.fw.meco') },
    };
  },
  twr(c) {
    const thrust = valueAt(c.f.telemetry, 1, 'thrust'), mass = valueAt(c.f.telemetry, 0, 'mass');
    if (thrust === null || mass === null || !(thrust > 0)) return null;
    const F = Math.round(thrust), m = round(mass, 1);
    const twr = (F * 1000) / (m * 1000 * G0);
    return {
      kind: 'number', prompt: t('ws.fq.twr', { F: fmt(c.lang, F, 0), m: fmt(c.lang, m, 1) }), unit: '',
      answer: { text: fmt(c.lang, twr, 2), value: twr, tolerance: '± 2 %', working: `T/W = F / (m·g0) = ${fmt(c.lang, F, 0)}·10³ / (${fmt(c.lang, m, 1)}·10³ · 9.81) = ${fmt(c.lang, twr, 2)}` },
    };
  },
  stageDv(c) {
    const s = firstStage(c);
    if (!s) return null;
    const dv = s.isp * G0 * Math.log(s.m0 / s.m1);
    return {
      kind: 'number', prompt: t('ws.fq.stageDv', { m0: fmt(c.lang, s.m0, 1), m1: fmt(c.lang, s.m1, 1), isp: s.isp, t: fmt(c.lang, s.meco, 0) }), unit: unitText('m/s', c.lang),
      answer: {
        text: `${fmt(c.lang, dv, 0)} ${unitText('m/s', c.lang)}`, value: dv, tolerance: '± 2 %',
        working: `Δv = I·g0·ln(m0/m1) = ${s.isp} · 9.81 · ln(${fmt(c.lang, s.m0, 1)} / ${fmt(c.lang, s.m1, 1)}) = ${fmt(c.lang, dv, 0)} ${unitText('m/s', c.lang)}`,
      },
    };
  },
  stageLoss(c) {
    const s = firstStage(c);
    if (!s) return null;
    const dv = Math.round(s.isp * G0 * Math.log(s.m0 / s.m1));
    const v0 = valueAt(c.f.telemetry, 0, 'vInertial'), v1 = valueAt(c.f.telemetry, s.meco - 0.5, 'vInertial');
    if (v0 === null || v1 === null) return null;
    const a = Math.round(v0), b = Math.round(v1);
    const loss = dv - (b - a);
    return {
      kind: 'number', prompt: t('ws.fq.stageLoss', { dv: fmt(c.lang, dv, 0), v0: fmt(c.lang, a, 0), v1: fmt(c.lang, b, 0) }), unit: unitText('m/s', c.lang),
      answer: {
        text: `${fmt(c.lang, loss, 0)} ${unitText('m/s', c.lang)}`, value: loss, tolerance: '± 2 %',
        working: `${fmt(c.lang, dv, 0)} − (${fmt(c.lang, b, 0)} − ${fmt(c.lang, a, 0)}) = ${fmt(c.lang, loss, 0)} ${unitText('m/s', c.lang)} ${t('ws.fw.losses')}`,
      },
    };
  },
  period(c) {
    const o = orbitReached(c);
    if (!o) return null;
    const a = R_EARTH + ((o.hp + o.ha) / 2) * 1000;
    const T = (2 * Math.PI * Math.sqrt(a ** 3 / MU_EARTH)) / 60;
    return {
      kind: 'number', prompt: t('ws.fq.period', { hp: fmt(c.lang, o.hp, 1), ha: fmt(c.lang, o.ha, 1) }), unit: unitText('min', c.lang),
      answer: {
        text: `${fmt(c.lang, T, 1)} ${unitText('min', c.lang)}`, value: T, tolerance: '± 1 %',
        working: `a = R + (h_p + h_a)/2 = ${fmt(c.lang, a / 1000, 1)} ${unitText('km', c.lang)}; T = 2π√(a³/μ) = ${fmt(c.lang, T, 1)} ${unitText('min', c.lang)}`,
      },
    };
  },
  perigeeSpeed(c) {
    const o = orbitReached(c);
    if (!o) return null;
    const rp = R_EARTH + o.hp * 1000, ra = R_EARTH + o.ha * 1000, a = (rp + ra) / 2;
    const v = Math.sqrt(MU_EARTH * (2 / rp - 1 / a)) / 1000;
    return {
      kind: 'number', prompt: t('ws.fq.perigeeSpeed', { hp: fmt(c.lang, o.hp, 1), ha: fmt(c.lang, o.ha, 1) }), unit: unitText('km/s', c.lang),
      answer: {
        text: `${fmt(c.lang, v, 3)} ${unitText('km/s', c.lang)}`, value: v, tolerance: '± 1 %',
        working: `v_p = √(μ(2/r_p − 1/a)), r_p = ${fmt(c.lang, rp / 1000, 1)} ${unitText('km', c.lang)}, a = ${fmt(c.lang, a / 1000, 1)} ${unitText('km', c.lang)} → ${fmt(c.lang, v, 3)} ${unitText('km/s', c.lang)}`,
      },
    };
  },
};

/** The orbit the flight ended in, rounded as the sheet prints it; null if it did not reach one. */
function orbitReached(c: Ctx): { hp: number; ha: number } | null {
  if (c.f.state.status === 'failed') return null;
  const el = flightElements(c.f);
  if (!(el.e < 1) || el.periapsisAlt < 100e3) return null;
  return { hp: round(el.periapsisAlt / 1000, 1), ha: round(el.apoapsisAlt / 1000, 1) };
}

/** The order they are asked in: charts first, then the calculations they lead to. */
export const FLIGHT_QUESTION_IDS = Object.keys(GENERATORS);

/** One question by its id (a test checks each answer against the flight). */
export function flightQuestion(id: string, f: WsFlight, lang: Lang, random: () => number): WsItem | null {
  return GENERATORS[id]?.({ f, lang, random }) ?? null;
}

/** `count` questions about the flight, drawn with `random`, in the sheet's order. */
export function flightQuestions(f: WsFlight, lang: Lang, random: () => number, count: number): WsItem[] {
  const c: Ctx = { f, lang, random };
  const ids = [...FLIGHT_QUESTION_IDS];
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const chosen: Array<{ id: string; item: WsItem }> = [];
  for (const id of ids) {
    if (chosen.length >= count) break;
    const item = GENERATORS[id](c);
    if (item) chosen.push({ id, item });
  }
  return chosen.sort((a, b) => FLIGHT_QUESTION_IDS.indexOf(a.id) - FLIGHT_QUESTION_IDS.indexOf(b.id)).map((x) => x.item);
}
