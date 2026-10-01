/**
 * The lesson strip's parts for a design lesson (roadmap T01, Phase 4 map
 * §4.1): what the mission asks, shown beside the designer; each criterion's
 * bound and the design's figure; the names of the parts a lesson locks, in
 * the designer's own words. The strip itself is src/ui/lessons/lesson-mode.ts.
 */
import { t } from '../../i18n';
import { SATELLITE_FIELDS } from '../../design/satellite-model';
import type { MissionRequirements } from '../../design/requirements';
import { STATION_KEY } from '../orbit/applications-panel';
import { localText } from '../../lessons/text';
import type { CriterionGrade, DesignCriterion, DesignKey } from '../../lessons/types';
import { boundDigits, designMeasureName, designNumber, designUnitText, designValueText } from './design-text';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** The parts a lesson can lock that are not number fields, by the designer's own labels. */
const CHOICE_KEY: Readonly<Record<string, string>> = {
  'orbit.sso': 'build.sat.sso', 'power.mount': 'build.sat.mount', 'power.regulation': 'build.sat.regulation', 'adcs.mode': 'build.sat.mode',
  'comms.station': 'build.sat.station', propulsion: 'build.sat.engine', payload: 'build.sat.camera',
};

/** A locked part's name as the designer labels it. */
export function lockName(key: string): string {
  const f = SATELLITE_FIELDS.find((x) => x.path === key);
  if (f) return t(f.key);
  return CHOICE_KEY[key] ? t(CHOICE_KEY[key]) : key;
}

/** A criterion's name: its own label, its prompt, or the measure's. */
export function designCriterionName(c: DesignCriterion): string {
  if (c.label) return localText(c.label);
  return c.kind === 'answer' ? localText(c.prompt) : designMeasureName(c.measure);
}

/** A criterion's bound in its unit: "≥ 10 %", "≤ 30 %", "0.5 … 1 m", "10 ± 0.5 kg", the 25-year rule as "yes". */
export function designBoundText(c: DesignCriterion): string {
  if (c.kind !== 'design') return '';
  if (c.measure === 'sat.disposal25y') return designValueText(c.measure, c.min ?? c.target ?? c.max ?? 1);
  const u = designUnitText(c.measure);
  const n = (v: number): string => designNumber(v, 6);
  const unit = u ? ` ${u}` : '';
  if (c.target !== undefined) return `${n(c.target)} ± ${n(c.tol ?? 0)}${unit}`;
  if (c.min !== undefined && c.max !== undefined) return `${n(c.min)} … ${n(c.max)}${unit}`;
  if (c.max !== undefined) return `≤ ${n(c.max)}${unit}`;
  return `≥ ${n(c.min ?? 0)}${unit}`;
}

/** One criterion as a chip: its name, its bound, the design's figure once checked, and its mark. */
export function designChip(c: DesignCriterion, g: CriterionGrade | undefined, key: DesignKey | null, stale: boolean): HTMLElement {
  const state = g && !stale ? g.state : 'pending';
  const chip = el('div', `lesson-crit ${state}${stale && g ? ' stale' : ''}`);
  chip.dataset.criterion = c.id;
  chip.append(el('span', 'lesson-crit-name', designCriterionName(c)));
  const value = g && key ? designValueText(c.measure, g.value, {
    capped: c.measure === 'sat.lifetime' && key.lifetimeCapped, ...(typeof g.value === 'number' ? { digits: boundDigits(c, g.value) } : {}),
  }) : '';
  const mark = state === 'pass' ? '✓' : state === 'fail' ? '✗' : t('lesson.crit.pending');
  chip.append(el('span', 'lesson-crit-value', [designBoundText(c), value, mark].filter(Boolean).join(' · ')));
  return chip;
}

const LEVEL_KEY: Readonly<Record<string, string>> = { low: 'life.activity.low', moderate: 'life.activity.moderate', high: 'life.activity.high' };
export const levelName = (level: string): string => t(LEVEL_KEY[level] ?? 'life.activity.moderate');

/** "13.76° N, 100.50° E" in the reader's own decimal sign. */
const latLon = (lat: number, lon: number): string => {
  const e = ((lon + 540) % 360) - 180;
  return `${designNumber(Math.abs(lat), 2)}° ${t(lat >= 0 ? 'lesson.design.req.north' : 'lesson.design.req.south')}, ${designNumber(Math.abs(e), 2)}° ${t(e >= 0 ? 'lesson.design.req.east' : 'lesson.design.req.west')}`;
};
const hhmm = (h: number): string => {
  const m = Math.round(h * 60) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** What the mission asks (D07's requirements), beside the designer, in the requirements page's own words. */
export function requirementsBox(req: MissionRequirements): HTMLElement {
  const box = el('details', 'lesson-design-req');
  box.open = true;
  box.append(el('summary', undefined, t('lesson.design.req.title')));
  const rows: [string, string][] = [
    [t('build.req.f.target'), `${req.target.name || t('lesson.design.req.place')} (${latLon(req.target.lat, req.target.lon)})`],
    [t('build.req.f.gsd'), `${designNumber(req.gsd, 3)} ${t('u.m')}`],
    [t('build.req.f.revisit'), `${designNumber(req.revisitDays, 2)} ${t('lesson.design.u.days')}`],
    [t('build.req.f.daylight'), t(req.daylightOnly ? 'lesson.design.yes' : 'lesson.design.no')],
    ...(req.ltan !== undefined ? [[t('build.sat.f.ltan'), hhmm(req.ltan)] as [string, string]] : []),
    [t('build.sat.f.life'), `${designNumber(req.lifeYears, 1)} ${t('build.sat.u.years')}`],
    [t('build.sat.bench.level'), levelName(req.activity)],
    [t('build.req.f.data'), `${designNumber(req.dataPerDay / 1e9, 2)} ${t('build.req.u.gbitDay')}`],
    [t('build.req.f.stations'), req.stations.map((s) => (STATION_KEY[s] ? t(STATION_KEY[s]) : s)).join(', ') || '—'],
    [t('build.sat.f.minEl'), `${designNumber(req.minElDeg, 1)}°`],
    [t('build.req.f.disposal'), t(req.disposal === '25y' ? 'build.req.disposal.25y' : 'build.req.disposal.none')],
  ];
  const dl = el('dl', 'lesson-design-req-list');
  for (const [k, v] of rows) {
    const row = el('div');
    row.append(el('dt', undefined, k), el('dd', undefined, v));
    dl.append(row);
  }
  box.append(dl);
  return box;
}
