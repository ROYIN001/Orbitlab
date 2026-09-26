/**
 * Building a worksheet (roadmap E05) from a flight flown in this simulator:
 * the mission and its key events, the flight's charts, questions worked from
 * the flight with numbers drawn for each student, and questions from the
 * placement test's bank. The same inputs always build the same sheet, so the
 * key for a class is built from the class code and the names alone.
 */
import { t, type Lang } from '../i18n';
import { RAD } from '../physics/constants';
import { vehicleById } from '../data/vehicles';
import { siteById } from '../data/sites';
import { satelliteById } from '../data/satellites';
import { localizeEventParams, satelliteName, siteName } from '../ui/names';
import { localText, unitText } from '../lessons/text';
import { lessonNumber } from '../lessons/catalog';
import { rng } from '../lessons/assessment/draw';
import { chartSvg } from '../lessons/assessment/figures';
import { SERIES_UNITS, resampleTelemetry, type FlightData } from '../lessons/assessment/flights';
import type { FlightSeries, Question } from '../lessons/assessment/types';
import type { Domain, Lesson } from '../lessons/types';
import { ascentEnd, flightQuestions, fmt, type WsFlight } from './flight-questions';
import { drawBankItems } from './bank-items';
import type { WsFigure, WsSection, Worksheet } from './types';

export interface WorksheetInput {
  flight: WsFlight;
  lang: Lang;
  generatedAt: Date;
  /** the lesson the sheet goes with, or none for a sheet on any mission */
  lesson?: Pick<Lesson, 'id' | 'track' | 'order' | 'title'>;
  student: string;
  classCode: string;
  flightCount: number;
  bankCount: number;
  domains: Domain[];
  bank: readonly Question[];
  /** the placement test's recorded flights, for a bank question's chart */
  data: FlightData;
}

/** FNV-1a: the seed a student's sheet is drawn from. */
export function worksheetSeed(student: string, classCode: string, source: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${student.trim().toLowerCase()}|${classCode.trim()}|${source}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** The source a sheet is drawn for: the lesson, or the mission and its launch. */
export const worksheetSource = (input: Pick<WorksheetInput, 'lesson' | 'flight'>): string =>
  input.lesson ? `lesson:${input.lesson.id}` : `mission:${input.flight.cfg.vehicleId}:${input.flight.cfg.siteId}:${input.flight.cfg.launchTime.toISOString()}`;

// max-Q and the lift-off's T/W are asked for, from the charts and the numbers: their events would give them away
const EVENT_KEYS = ['evt.boosterSep', 'evt.meco', 'evt.stageSep', 'evt.fairingSep', 'evt.seco', 'evt.parkingOrbit', 'evt.targetOrbit', 'evt.offTargetOrbit', 'evt.engineOut', 'evt.guidanceEngaged', 'evt.boosterLandedZone', 'evt.docked'];

/** The flight's charts over its ascent, drawn for print. */
export function flightCharts(f: WsFlight, lang: Lang): WsFigure[] {
  const end = ascentEnd(f) + 10;
  const step = Math.max(1, Math.ceil(end / 240));
  const keys: FlightSeries[] = ['alt', 'vInertial', 'q', 'gLoad', 'mass'];
  const sampled = resampleTelemetry(f.telemetry, end, step, keys);
  const data: FlightData = { flight: { ...sampled, events: [] } };
  return keys.map((key) => ({
    svg: chartSvg(data, ['flight'], key, { xLabel: t('assess.axisTime'), yLabel: `${t(`assess.series.${key}`)}, ${unitText(SERIES_UNITS[key], lang)}`, height: 260 }),
    caption: t(`assess.series.${key}`),
  }));
}

export function buildWorksheet(input: WorksheetInput): Worksheet {
  const { flight: f, lang } = input;
  const seed = worksheetSeed(input.student, input.classCode, worksheetSource(input));
  const random = rng(seed);
  const spec = vehicleById(f.cfg.vehicleId), site = siteById(f.cfg.siteId), sat = satelliteById(f.cfg.satelliteId);
  const target = f.plan.target;
  const date = `${f.cfg.launchTime.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
  const mission: Array<[string, string]> = [
    [t('setup.vehicle'), spec.name],
    [t('setup.site'), siteName(site)],
    [t('setup.satellite'), `${satelliteName(sat)}, ${fmt(lang, f.cfg.payloadMassOverride ?? sat.mass, 0)} ${unitText('kg', lang)}`],
    [t('ws.targetOrbit'), `${fmt(lang, target.perigee / 1000, 0)} × ${fmt(lang, target.apogee / 1000, 0)} ${unitText('km', lang)}, i = ${fmt(lang, target.inclination * RAD, 2)}°`],
    [t('setup.launchTime'), date],
    [t('setup.dynamics.title'), f.cfg.dynamics?.model === 'sixDof' ? t('setup.dynamics.sixDof') : t('setup.dynamics.pointMass')],
  ];
  const events: Array<[string, string]> = f.events.filter((e) => e.t >= 0 && EVENT_KEYS.includes(e.key))
    .map((e) => [`T+${fmt(lang, e.t, 0)} ${unitText('s', lang)}`, t(e.key, localizeEventParams(spec, e.params))]);
  const sections: WsSection[] = [
    { title: t('ws.section.mission'), table: mission, items: [] },
    { title: t('ws.section.events'), table: events, items: [] },
    { title: t('ws.section.flight'), intro: t('ws.section.flightIntro'), figures: flightCharts(f, lang), items: flightQuestions(f, lang, random, input.flightCount) },
  ];
  if (input.bankCount > 0 && input.domains.length) {
    sections.push({ title: t('ws.section.bank'), items: drawBankItems(input.bank, input.domains, input.bankCount, random, input.data, lang) });
  }
  const title = input.lesson ? t('ws.titleLesson', { n: lessonNumber(input.lesson), title: localText(input.lesson.title, lang) }) : t('ws.title', { vehicle: spec.name });
  return {
    lang, title, subtitle: `${spec.name} · ${siteName(site)} · ${date}`,
    student: input.student.trim(), code: `${input.classCode.trim() || '—'} · ${seed.toString(36).toUpperCase()}`, seed,
    generatedAt: input.generatedAt, sections,
  };
}

/** A sheet for each student named (one without a name if none is). */
export function buildClass(input: Omit<WorksheetInput, 'student'>, students: readonly string[]): Worksheet[] {
  const names = students.map((s) => s.trim()).filter(Boolean);
  return (names.length ? names : ['']).map((student) => buildWorksheet({ ...input, student }));
}
