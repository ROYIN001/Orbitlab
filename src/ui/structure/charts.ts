/**
 * The Structure section's drawings that need no WebGL: the battery's charge
 * through the scenario's orbits (an SVG of the result power-balance.ts
 * computed, nothing of its own); the picture that explains which way the
 * energy flows by day and in the shadow (an illustration: it shows no
 * figure, and is marked as one); and the side view a model falls back to
 * when there is no 3-D (each assembly's box, pickable).
 */
import type { PowerResult } from '../../structure/power-balance';
import { svg } from './dom';
import { tx, num } from './text';

/**
 * The charge curve: shadows shaded, the floor dashed, shortfalls red.
 * `compact` is the one under the picture: drawn small, so with fewer ticks
 * and the units at the ends of the axes, at a size that still reads.
 */
export function chargeChart(r: PowerResult, orbits: number, compact = false): SVGSVGElement {
  const [W, H, L, R, T, B] = compact ? [380, 138, 40, 10, 18, 24] : [640, 220, 46, 10, 12, 32];
  const end = r.segments.length ? r.segments[r.segments.length - 1].t1 : r.period * orbits;
  const x = (t: number) => L + ((W - L - R) * t) / end;
  const y = (wh: number) => T + (H - T - B) * (1 - wh / r.capacityWh);
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: `st-chart${compact ? ' is-compact' : ''}`, role: 'img' });
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
  const step = compact || minutes > 200 ? 60 : 30;
  for (let m = 0; m <= minutes + 1e-6; m += step) {
    const t = svg('text', { x: x(m * 60), y: H - B + 14, class: 'st-chart-tick', 'text-anchor': 'middle' });
    t.textContent = String(m);
    root.append(t, svg('line', { x1: x(m * 60), y1: H - B, x2: x(m * 60), y2: H - B + 4, class: 'st-chart-axis' }));
  }
  for (const frac of compact ? [0, 1] : [0, 0.5, 1]) {
    const wh = r.capacityWh * frac;
    const t = svg('text', { x: L - 6, y: y(wh) + 4, class: 'st-chart-tick', 'text-anchor': 'end' });
    t.textContent = num(wh, 1);
    root.append(t);
  }
  if (compact) {
    // the units at the axes' ends
    const yl = svg('text', { x: 4, y: 11, class: 'st-chart-label', 'text-anchor': 'start' });
    yl.textContent = tx('res.chart.charge');
    const xl = svg('text', { x: W - R, y: H - 1, class: 'st-chart-label', 'text-anchor': 'end' });
    xl.textContent = tx('res.chart.time');
    root.append(xl, yl);
  } else {
    const xl = svg('text', { x: (L + W - R) / 2, y: H - 2, class: 'st-chart-label', 'text-anchor': 'middle' });
    xl.textContent = tx('res.chart.time');
    const yl = svg('text', { x: 12, y: (T + H - B) / 2, class: 'st-chart-label', 'text-anchor': 'middle', transform: `rotate(-90 12 ${(T + H - B) / 2})` });
    yl.textContent = tx('res.chart.charge');
    root.append(xl, yl);
  }
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

/**
 * Which way the energy goes, in sunlight and in the Earth's shadow: boxes
 * and arrows only, no figure. It explains; nothing in it is worked out (the
 * figures are in the results, apart from it).
 */
export function energyFlow(at: 'sunlit' | 'eclipse'): SVGSVGElement {
  const W = 360, H = 150;
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'st-flow-svg', role: 'img' });
  const title = svg('title');
  title.textContent = tx(at === 'sunlit' ? 'flow.sunlit.desc' : 'flow.eclipse.desc');
  root.append(title);
  const defs = svg('defs');
  const marker = svg('marker', { id: `st-arrow-${at}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
  marker.append(svg('path', { d: 'M0 0 L10 5 L0 10 z', class: 'st-flow-head' }));
  defs.append(marker);
  root.append(defs);
  const box = (x: number, y: number, w: number, label: string, cls = ''): void => {
    root.append(svg('rect', { x, y, width: w, height: 30, rx: 6, class: `st-flow-box ${cls}` }));
    const t = svg('text', { x: x + w / 2, y: y + 19, 'text-anchor': 'middle', class: 'st-flow-label' });
    t.textContent = label;
    root.append(t);
  };
  const arrow = (x1: number, y1: number, x2: number, y2: number, off = false): void => {
    root.append(svg('line', { x1, y1, x2, y2, class: `st-flow-line${off ? ' is-off' : ''}`, ...(off ? {} : { 'marker-end': `url(#st-arrow-${at})` }) }));
  };
  const sun = at === 'sunlit';
  box(8, 14, 78, tx(sun ? 'flow.sun' : 'flow.shadow'), sun ? 'is-sun' : 'is-shadow');
  box(8, 100, 78, tx('flow.panels'), sun ? '' : 'is-idle');
  box(140, 56, 80, tx('flow.eps'));
  box(272, 14, 80, tx('flow.loads'));
  box(272, 100, 80, tx('flow.battery'));
  arrow(47, 46, 47, 98, !sun); // the Sun to the panels
  arrow(88, 112, 138, 80, !sun); // the panels to the power board
  arrow(222, 64, 270, 34); // the power board to the loads
  if (sun) arrow(222, 80, 270, 108); else arrow(270, 108, 222, 80); // charging by day, discharging in the shadow
  return root;
}
