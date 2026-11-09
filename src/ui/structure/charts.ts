/**
 * The Structure section's two drawings that need no WebGL: the battery's
 * charge through the scenario's orbits (an SVG of the result
 * power-balance.ts computed, nothing of its own), and the side view a model
 * falls back to when there is no 3-D (each assembly's box, pickable).
 */
import type { PowerResult } from '../../structure/power-balance';
import { tx, num } from './text';

const SVG = 'http://www.w3.org/2000/svg';
const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

/** The charge curve: shadows shaded, the floor dashed, shortfalls red. */
export function chargeChart(r: PowerResult, orbits: number): SVGSVGElement {
  const W = 640, H = 220, L = 46, R = 10, T = 12, B = 32;
  const end = r.segments.length ? r.segments[r.segments.length - 1].t1 : r.period * orbits;
  const x = (t: number) => L + ((W - L - R) * t) / end;
  const y = (wh: number) => T + (H - T - B) * (1 - wh / r.capacityWh);
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'st-chart', role: 'img' });
  const title = svg('title');
  title.textContent = tx('res.chart', { orbits });
  const desc = svg('desc');
  desc.textContent = tx('res.chart.desc');
  root.append(title, desc);
  for (let k = 0; k < orbits; k++) {
    const a = k * r.period + r.daylight, b = (k + 1) * r.period;
    root.append(svg('rect', { x: x(a), y: T, width: x(b) - x(a), height: H - T - B, class: 'st-chart-shadow' }));
  }
  for (const s of r.shortfalls) root.append(svg('rect', { x: x(s.start), y: T, width: Math.max(1.5, x(s.end) - x(s.start)), height: H - T - B, class: 'st-chart-short' }));
  // axes and ticks
  root.append(svg('line', { x1: L, y1: H - B, x2: W - R, y2: H - B, class: 'st-chart-axis' }), svg('line', { x1: L, y1: T, x2: L, y2: H - B, class: 'st-chart-axis' }));
  const minutes = end / 60;
  const step = minutes > 200 ? 60 : 30;
  for (let m = 0; m <= minutes + 1e-6; m += step) {
    const t = svg('text', { x: x(m * 60), y: H - B + 14, class: 'st-chart-tick', 'text-anchor': 'middle' });
    t.textContent = String(m);
    root.append(t, svg('line', { x1: x(m * 60), y1: H - B, x2: x(m * 60), y2: H - B + 4, class: 'st-chart-axis' }));
  }
  for (const frac of [0, 0.5, 1]) {
    const wh = r.capacityWh * frac;
    const t = svg('text', { x: L - 6, y: y(wh) + 4, class: 'st-chart-tick', 'text-anchor': 'end' });
    t.textContent = num(wh, 1);
    root.append(t);
  }
  const xl = svg('text', { x: (L + W - R) / 2, y: H - 2, class: 'st-chart-label', 'text-anchor': 'middle' });
  xl.textContent = tx('res.chart.time');
  const yl = svg('text', { x: 12, y: (T + H - B) / 2, class: 'st-chart-label', 'text-anchor': 'middle', transform: `rotate(-90 12 ${(T + H - B) / 2})` });
  yl.textContent = tx('res.chart.charge');
  root.append(xl, yl);
  root.append(svg('line', { x1: L, y1: y(r.floorWh), x2: W - R, y2: y(r.floorWh), class: 'st-chart-floor' }));
  const points = r.curve.map((p) => `${x(p.t).toFixed(1)},${y(p.charge).toFixed(1)}`).join(' ');
  root.append(svg('polyline', { points, class: 'st-chart-line' }));
  return root;
}

export interface SideBox { unit: string; label: string; x0: number; x1: number; y0: number; y1: number }

/** The side view: each assembly's box across (x) and up (y), m; a press on one picks it. */
export function sideView(boxes: readonly SideBox[], selected: string | null, pick: (unit: string) => void): SVGSVGElement {
  const xs = boxes.flatMap((b) => [b.x0, b.x1]), ys = boxes.flatMap((b) => [b.y0, b.y1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = 0.04 * Math.max(maxX - minX, maxY - minY);
  const root = svg('svg', { viewBox: `${minX - pad} ${-(maxY + pad)} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`, class: 'st-side-view', role: 'group' });
  root.setAttribute('aria-label', tx('fallback.title'));
  for (const b of boxes) {
    const r = svg('rect', { x: b.x0, y: -b.y1, width: Math.max(1e-3, b.x1 - b.x0), height: Math.max(1e-3, b.y1 - b.y0), class: `st-side-box${b.unit === selected ? ' sel' : ''}`, tabindex: 0, role: 'button' });
    r.setAttribute('aria-label', b.label);
    r.setAttribute('aria-pressed', String(b.unit === selected));
    const t = svg('title');
    t.textContent = b.label;
    r.append(t);
    r.addEventListener('click', () => pick(b.unit));
    r.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(b.unit); } });
    root.append(r);
  }
  return root;
}
