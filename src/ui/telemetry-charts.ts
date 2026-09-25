/**
 * The telemetry panel's charts as data: their ids, titles and event markers,
 * and (roadmap U06) the whole flight's charts for the flight report, built the
 * way the panel builds its own but over the full recording and unshared.
 */
import { t } from '../i18n';
import type { SimEvent } from '../physics/simulation';
import type { TelemetrySample } from '../physics/sim/types';
import type { VehicleSpec } from '../types';
import type { ChartMarker, Series } from './charts';
import type { ChartSnapshot } from './chart-export';
import type { ReferenceSample } from '../replay/reference';
import { eventLabel } from './phase';
import { localizeEventParams } from './names';
import { symbolText, withSymbol, type Quantity } from './notation';

/** Events worth a dashed line on every chart. */
export const ASCENT_MARKERS = ['evt.maxQ', 'evt.meco', 'evt.stageSep', 'evt.seco', 'evt.fairingSep'];
export const ORBIT_MARKERS = ['evt.parkingOrbit', 'evt.burnStart', 'evt.burnComplete', 'evt.targetOrbit'];

export const CHART_IDS = ['altitude', 'velocity', 'q', 'g', 'apsides', 'dv', 'pitch', 'mass'] as const;
export type ChartId = (typeof CHART_IDS)[number];
/** Dictionary key for each chart's title, so `reset()` can redraw them empty. */
const CHART_TITLES: Record<ChartId, string> = {
  altitude: 'tel.altitude', velocity: 'tel.velocity', q: 'tel.q', g: 'tel.g',
  apsides: 'tel.apsides', dv: 'tel.dv', pitch: 'tel.pitch', mass: 'tel.mass',
};

/** U07: the symbol a chart's title carries, in the notation in force. */
const CHART_SYMBOLS: Partial<Record<string, Quantity>> = {
  altitude: 'altitude', q: 'dynamicPressure', g: 'loadFactor', pitch: 'pitchAngle', mass: 'mass',
};
export const chartTitle = (id: ChartId): string => {
  const symbol = CHART_SYMBOLS[id];
  return symbol ? withSymbol(t(CHART_TITLES[id]), symbol) : t(CHART_TITLES[id]);
};

/** Points a report chart is decimated to: a printed figure resolves no more. */
const REPORT_POINTS = 1500;

/** The event that ends the ascent: the parking or final orbit, or a suborbital cut-off. */
export function insertionEvent(events: readonly SimEvent[]): SimEvent | undefined {
  return events.find((e) => e.key === 'evt.parkingOrbit' || e.key === 'evt.targetOrbit'
    || e.key === 'evt.offTargetOrbit' || e.key === 'evt.suborbitalTarget' || e.key === 'evt.suborbitalOffTarget');
}

/** The instant the ascent is over, for the ascent charts' window: insertion, else the last sample. */
export function ascentEnd(events: readonly SimEvent[], tel: readonly TelemetrySample[]): number {
  const insertion = insertionEvent(events);
  const last = tel.length ? tel[tel.length - 1].t : 60;
  return insertion ? Math.min(last, insertion.t + 30) : last;
}

/**
 * The flight's charts for a report: the six ascent quantities from the
 * countdown to 30 s after insertion, the apsides and Δv over the whole flight.
 */
export function reportTelemetryCharts(
  flight: { telemetry: readonly TelemetrySample[]; events: readonly SimEvent[]; vehicleSpec: VehicleSpec },
): ChartSnapshot[] {
  const tel = flight.telemetry;
  if (!tel.length) return [];
  const end = ascentEnd(flight.events, tel);
  const xLabel = t('tel.xAxis');
  const markers = (orbit: boolean): ChartMarker[] => flight.events
    .filter((e) => ASCENT_MARKERS.includes(e.key) || (orbit && ORBIT_MARKERS.includes(e.key)))
    .map((e) => ({ x: e.t, color: ORBIT_MARKERS.includes(e.key) ? '#5c7d76' : '#3a4a5c', label: eventLabel(e.key, localizeEventParams(flight.vehicleSpec, e.params)) }));
  const window = (x0: number, x1: number): TelemetrySample[] => {
    const inside = tel.filter((s) => s.t >= x0 && s.t <= x1);
    const stride = Math.max(1, Math.ceil(inside.length / REPORT_POINTS));
    const out = inside.filter((_, i) => i % stride === 0);
    if (inside.length && out[out.length - 1] !== inside[inside.length - 1]) out.push(inside[inside.length - 1]);
    return out;
  };
  const ascent = window(-10, end), whole = window(-10, Infinity);
  const line = (rows: TelemetrySample[], y: (s: TelemetrySample) => number, color: string, label?: string): Series =>
    ({ x: rows.map((s) => s.t), y: rows.map(y), color, label });
  const chart = (id: ChartId, series: Series[], rows: TelemetrySample[], orbit: boolean, yMin?: number, seriesLabels?: string[]): ChartSnapshot => ({
    series,
    opt: { title: chartTitle(id), xLabel, timeAxis: true, markers: markers(orbit), xMin: rows[0]?.t, xMax: rows[rows.length - 1]?.t, yMin, seriesLabels },
  });
  return [
    chart('altitude', [line(ascent, (s) => s.alt / 1000, '#6ec8ff')], ascent, false),
    chart('velocity', [line(ascent, (s) => s.vInertial, '#8be5cd', 'v'), line(ascent, (s) => s.vAir, '#96a3b4', symbolText('airspeed'))], ascent, false, undefined,
      [t('tel.chart.inertial'), t('tel.chart.airspeed')]),
    chart('q', [line(ascent, (s) => s.q / 1000, '#efa47e')], ascent, false, 0),
    chart('g', [line(ascent, (s) => s.gLoad, '#7ddba0')], ascent, false, 0),
    chart('pitch', [line(ascent, (s) => s.pitch, '#ffd28a')], ascent, false),
    chart('mass', [line(ascent, (s) => s.mass / 1000, '#9be7ff')], ascent, false, 0),
    chart('apsides', [line(whole, (s) => (s.ap > 0 && s.ap < 5e7 ? s.ap / 1000 : NaN), '#6ec8ff', 'ap'),
      line(whole, (s) => (s.pe > -2000e3 ? s.pe / 1000 : NaN), '#8be5cd', 'pe')], whole, true, 0, [t('tel.chart.apogee'), t('tel.chart.perigee')]),
    chart('dv', [line(whole, (s) => s.dvRemaining, '#c3a6ff')], whole, true, 0),
  ];
}

/** What each chart plots, as a function of a sample (U02 draws a reference flight from it). */
const CHART_VALUES: Record<ChartId, ((s: ReferenceSample) => number)[]> = {
  altitude: [(s) => s.alt / 1000],
  velocity: [(s) => s.vInertial, (s) => s.vAir],
  q: [(s) => s.q / 1000],
  g: [(s) => s.gLoad],
  apsides: [(s) => (s.ap > 0 && s.ap < 5e7 ? s.ap / 1000 : NaN), (s) => (s.pe > -2000e3 ? s.pe / 1000 : NaN)],
  dv: [(s) => s.dvRemaining],
  pitch: [(s) => s.pitch],
  mass: [(s) => s.mass / 1000],
};

/** The dash a reference flight is drawn with, px. */
export const REFERENCE_DASH = [5, 4];

/**
 * A reference flight's traces for one chart (roadmap U02): the same
 * quantities in the same colours as the flight's own, dashed, the first
 * labelled "ref".
 */
export function referenceSeries(id: ChartId, rows: readonly ReferenceSample[], own: readonly Series[]): Series[] {
  const x = rows.map((s) => s.t);
  return CHART_VALUES[id].map((f, i) => ({
    x, y: rows.map(f), color: own[i]?.color ?? '#c3a6ff', dash: REFERENCE_DASH, label: i === 0 ? t('cmp.ref') : undefined,
  }));
}
