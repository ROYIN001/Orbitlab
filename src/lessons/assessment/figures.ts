/**
 * The placement test's pictures as SVG text (roadmap E03): a chart of a
 * recorded flight, overlaid with the flights it is compared with, and the
 * result's radar of the six areas. DOM-free strings, so they are tested
 * without a document and drawn with `innerHTML`.
 */
import type { FlightData } from './flights';
import type { FlightSeries } from './types';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Round axis steps: 1, 2 or 5 × 10ⁿ. */
export function niceStep(span: number, target = 5): number {
  if (!(span > 0)) return 1;
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * mag;
}

const fmt = (v: number): string => (Math.abs(v) >= 100 || Number.isInteger(v) ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1));

export interface ChartOptions {
  width?: number;
  height?: number;
  /** caption under each line, in drawing order: the main flight first */
  legend?: string[];
  /** the axis captions, e.g. "t, s" and "q, kPa" */
  xLabel: string;
  yLabel: string;
  tMax?: number;
}

/** Colours of the lines: the main flight, then each compared one. */
export const CHART_COLOURS = ['#6ec8ff', '#f5c451', '#ff8a8a', '#7ddba0'];

export function chartSvg(data: FlightData, ids: readonly string[], series: FlightSeries, o: ChartOptions): string {
  const W = o.width ?? 520, H = o.height ?? 260, L = 52, R = 12, T = 14, B = 34;
  const sets = ids.map((id) => data[id]).filter((d) => d?.series[series]);
  const tMax = o.tMax ?? Math.max(...sets.map((d) => d.t[d.t.length - 1]));
  let yMin = Infinity, yMax = -Infinity;
  for (const d of sets) d.series[series]!.forEach((v, i) => { if (d.t[i] <= tMax) { yMin = Math.min(yMin, v); yMax = Math.max(yMax, v); } });
  if (!Number.isFinite(yMin)) { yMin = 0; yMax = 1; }
  yMin = Math.min(0, yMin);
  const yStep = niceStep(yMax - yMin);
  yMax = Math.ceil(yMax / yStep) * yStep || yStep;
  yMin = Math.floor(yMin / yStep) * yStep;
  const x = (t: number) => L + (t / tMax) * (W - L - R);
  const y = (v: number) => H - B - ((v - yMin) / (yMax - yMin)) * (H - T - B);
  const parts: string[] = [];
  for (let v = yMin; v <= yMax + 1e-9; v += yStep) {
    parts.push(`<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="grid"/>`,
      `<text x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" class="tick">${fmt(v)}</text>`);
  }
  const tStep = niceStep(tMax, 6);
  for (let t = 0; t <= tMax + 1e-9; t += tStep) {
    parts.push(`<line x1="${x(t).toFixed(1)}" x2="${x(t).toFixed(1)}" y1="${T}" y2="${H - B}" class="grid"/>`,
      `<text x="${x(t).toFixed(1)}" y="${H - B + 15}" text-anchor="middle" class="tick">${fmt(t)}</text>`);
  }
  sets.forEach((d, k) => {
    const pts: string[] = [];
    d.series[series]!.forEach((v, i) => { if (d.t[i] <= tMax) pts.push(`${x(d.t[i]).toFixed(1)},${y(v).toFixed(1)}`); });
    parts.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${CHART_COLOURS[k % CHART_COLOURS.length]}" stroke-width="2"${k ? ' stroke-dasharray="6 4"' : ''}/>`);
  });
  parts.push(`<text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle" class="axis">${esc(o.xLabel)}</text>`,
    `<text x="${L}" y="${T - 3}" class="axis">${esc(o.yLabel)}</text>`);
  (o.legend ?? []).forEach((label, k) => {
    // under the axis caption, at the left, where the launch's curves are still low
    const lx = L + 10, ly = T + 16 + k * 16;
    parts.push(`<line x1="${lx}" x2="${lx + 20}" y1="${ly - 4}" y2="${ly - 4}" stroke="${CHART_COLOURS[k % CHART_COLOURS.length]}" stroke-width="2"${k ? ' stroke-dasharray="6 4"' : ''}/>`,
      `<text x="${lx + 26}" y="${ly}" class="legend">${esc(label)}</text>`);
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" class="lesson-chart">${parts.join('')}</svg>`;
}

/**
 * The six areas as a radar, one polygon per test (the placement test solid,
 * a later test dashed), each value 0–100.
 */
export function radarSvg(labels: readonly string[], tests: ReadonlyArray<readonly number[]>, size = 320): string {
  const c = size / 2, R = size / 2 - 42, n = labels.length;
  const at = (i: number, r: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + r * Math.cos(a), c + r * Math.sin(a)];
  };
  const poly = (r: (i: number) => number) => labels.map((_, i) => at(i, r(i)).map((v) => v.toFixed(1)).join(',')).join(' ');
  const parts: string[] = [];
  for (const f of [0.25, 0.5, 0.75, 1]) parts.push(`<polygon points="${poly(() => R * f)}" class="grid" fill="none"/>`);
  labels.forEach((label, i) => {
    const [x, y] = at(i, R);
    const [lx, ly] = at(i, R + 22);
    parts.push(`<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="grid"/>`,
      `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" class="tick">${esc(label)}</text>`);
  });
  tests.forEach((values, k) => {
    parts.push(`<polygon points="${poly((i) => R * Math.max(0, Math.min(100, values[i] ?? 0)) / 100)}" class="${k ? 'radar-after' : 'radar-before'}"/>`);
  });
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" role="img" class="lesson-radar">${parts.join('')}</svg>`;
}
