/**
 * Placement-test questions on a worksheet (roadmap E05): drawn from the bank
 * for the areas asked, one per skill, with the student's own numbers, and
 * turned into items a sheet prints — the diagram drawn with those numbers,
 * the recorded flight's chart, a vehicle's photograph by its address.
 */
import { t, type Lang } from '../i18n';
import { vehicleById } from '../data/vehicles';
import { localText, unitText } from '../lessons/text';
import { prepareQuestion } from '../lessons/assessment/draw';
import { numericExpected } from '../lessons/assessment/score';
import { diagramSvg } from '../lessons/assessment/diagrams';
import { chartSvg } from '../lessons/assessment/figures';
import { SERIES_UNITS, type FlightData } from '../lessons/assessment/flights';
import { VEHICLE_PHOTOS } from '../lessons/assessment/photos';
import type { Figure, PreparedQuestion, Question } from '../lessons/assessment/types';
import type { Domain } from '../lessons/types';
import type { WsFigure, WsItem } from './types';
import { fmt } from './flight-questions';

const LETTERS: Record<Lang, string[]> = { en: ['a', 'b', 'c', 'd', 'e', 'f'], ru: ['а', 'б', 'в', 'г', 'д', 'е'], th: ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'] };
export const letterOf = (lang: Lang, i: number): string => LETTERS[lang][i] ?? String(i + 1);

/** A number as a prompt prints it: no more digits than it has. */
const num = (v: number): string => String(Number(v.toPrecision(6)));

function promptText(q: Question, p: PreparedQuestion, lang: Lang): string {
  let text = localText(q.prompt, lang);
  for (const [name, v] of Object.entries(p.values ?? {})) text = text.split(`{${name}}`).join(num(v));
  return text;
}

function figureOf(f: Figure, p: PreparedQuestion, data: FlightData, lang: Lang): WsFigure | undefined {
  if (f.kind === 'diagram') return { svg: diagramSvg(f.id, p.values ?? {}, (u) => unitText(u, lang)) ?? undefined };
  if (f.kind === 'vehicle') return { image: `lessons/vehicles/${f.vehicleId}.jpg` };
  const ids = [f.dataset, ...(f.compare ?? [])];
  return {
    svg: chartSvg(data, ids, f.series, { xLabel: t('assess.axisTime'), yLabel: `${t(`assess.series.${f.series}`)}, ${unitText(SERIES_UNITS[f.series], lang)}`, tMax: f.tMax }),
    caption: t('assess.chartCaption', { flight: t(`assess.flight.${f.dataset}`) }),
  };
}

/** One bank question as a worksheet item, its answer in the key. */
export function bankItem(q: Question, p: PreparedQuestion, data: FlightData, lang: Lang): WsItem {
  const prompt = promptText(q, p, lang);
  const explanation = localText(q.explanation, lang);
  const figure = q.type === 'vehicle' && p.vehicle ? figureOf({ kind: 'vehicle', vehicleId: p.vehicle }, p, data, lang) : q.figure ? figureOf(q.figure, p, data, lang) : undefined;
  const base = { prompt, ...(figure ? { figure } : {}) };
  switch (q.type) {
    case 'choice': case 'multi': {
      const order = p.order ?? q.options.map((_, i) => i);
      const right = order.flatMap((i, k) => (q.options[i].correct ? [`${letterOf(lang, k)}) ${localText(q.options[i].text, lang)}`] : []));
      return { ...base, kind: q.type, options: order.map((i) => localText(q.options[i].text, lang)), answer: { text: right.join('; '), working: explanation } };
    }
    case 'order': {
      const order = p.order ?? q.items.map((_, i) => i);
      // the key gives, for each item as printed, its place in the right order
      const places = order.map((i) => i + 1);
      return {
        ...base, kind: 'order', options: order.map((i) => localText(q.items[i], lang)),
        answer: { text: order.map((_, k) => `${letterOf(lang, k)} ${places[k]}`).join(', '), working: `${q.items.map((x) => localText(x, lang)).join(' → ')}. ${explanation}` },
      };
    }
    case 'vehicle': {
      const options = (p.vehicleOptions ?? []).map((id) => vehicleById(id).name);
      const k = (p.vehicleOptions ?? []).indexOf(p.vehicle!);
      const credit = VEHICLE_PHOTOS[p.vehicle!];
      const photo = credit ? ` ${t('assess.photoCredit', { author: credit.author, license: credit.license })}` : '';
      return { ...base, kind: 'choice', options, answer: { text: `${letterOf(lang, k)}) ${vehicleById(p.vehicle!).name}`, working: explanation + photo } };
    }
    case 'numeric': {
      const v = numericExpected(q, p) ?? NaN;
      const digits = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2;
      return {
        ...base, kind: 'number', unit: unitText(q.unit, lang),
        answer: { text: `${fmt(lang, v, digits)} ${unitText(q.unit, lang)}`.trim(), value: v, tolerance: `± ${q.tolPct} %`, working: explanation },
      };
    }
  }
}

/**
 * `count` bank questions in the areas asked, one per skill, easiest first,
 * the numbers drawn with `random`. Questions whose answer is seen only in the
 * simulator after answering (predict, then observe) are left out.
 */
export function drawBankItems(bank: readonly Question[], domains: readonly Domain[], count: number, random: () => number, data: FlightData, lang: Lang): WsItem[] {
  const pool = bank.filter((q) => domains.includes(q.domain) && !(q.type === 'choice' && q.observe));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const skills = new Set<string>();
  const chosen: Question[] = [];
  // spread over the areas: take one from each in turn
  for (let round = 0; chosen.length < count && round < pool.length; round++) {
    let took = false;
    for (const d of domains) {
      if (chosen.length >= count) break;
      const q = pool.find((x) => x.domain === d && !skills.has(x.skill) && !chosen.includes(x));
      if (q) { chosen.push(q); skills.add(q.skill); took = true; }
    }
    if (!took) break;
  }
  return chosen.sort((a, b) => a.level - b.level).map((q) => bankItem(q, prepareQuestion(q, random), data, lang));
}
