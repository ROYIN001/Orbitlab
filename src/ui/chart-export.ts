/**
 * Every chart as an image (roadmap U06): a "PNG" button that appears on any
 * chart the app draws — the telemetry panel's, and the Engineer mode's Bode,
 * step-response, inspector, guidance and navigation plots — and saves it
 * redrawn on white at print resolution, ready for a report or a thesis.
 *
 * `drawChart` reports what each canvas was last drawn from; this module keeps
 * a copy (the panels reuse their arrays between charts) and redraws it with
 * `paintChart` in `PRINT_THEME` on demand. The flight report (src/ui/report.ts)
 * takes its engineering charts from the same copies.
 */
import { PRINT_THEME, paintChart, setChartDrawnHook, type ChartOptions, type ChartTheme, type Series } from './charts';
import { t } from '../i18n';
import { downloadBlob } from './download';

export interface ChartSnapshot { series: Series[]; opt: ChartOptions }

const snapshots = new WeakMap<HTMLCanvasElement, ChartSnapshot>();
const wired = new WeakSet<HTMLCanvasElement>();
let button: HTMLButtonElement | null = null;
let target: HTMLCanvasElement | null = null;
let hideTimer = 0;

/** A copy of what a chart was drawn from, safe from the panel's next draw. */
export function snapshotChart(series: Series[], opt: ChartOptions): ChartSnapshot {
  return {
    series: series.map((s) => ({ ...s, x: s.x.slice(), y: s.y.slice(), dash: s.dash?.slice() })),
    opt: { ...opt, markers: opt.markers?.map((m) => ({ ...m })), seriesLabels: opt.seriesLabels?.slice() },
  };
}

export interface ChartImageOptions {
  /** CSS pixels of the image before `scale` */
  width?: number;
  height?: number;
  /** device pixels per CSS pixel: 2 gives a 2400 × 1200 image from the defaults */
  scale?: number;
  theme?: ChartTheme;
}

/** A chart drawn on its own canvas, by default 1200 × 600 on white at twice that resolution. */
export function chartImage(snapshot: ChartSnapshot, o: ChartImageOptions = {}): HTMLCanvasElement {
  const width = o.width ?? 1200, height = o.height ?? 600, scale = o.scale ?? 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const g = canvas.getContext('2d')!;
  // The panel's layout is sized for a ~300 px chart: a larger image draws it
  // at a larger type and line size too, so it keeps its proportions.
  const typeScale = Math.max(1, Math.min(2.4, width / 520));
  g.setTransform(scale, 0, 0, scale, 0, 0);
  paintChart(g, width, height, snapshot.series, snapshot.opt, o.theme ?? PRINT_THEME, typeScale);
  return canvas;
}

/** A file name from the chart's title: letters of any script, digits and dashes. */
export function chartFileName(title: string): string {
  const slug = title.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return `orbitlab-${slug || 'chart'}.png`;
}

export function saveChartPng(canvas: HTMLCanvasElement): void {
  const snapshot = snapshots.get(canvas);
  if (!snapshot) return;
  chartImage(snapshot).toBlob((blob) => { if (blob) downloadBlob(blob, chartFileName(snapshot.opt.title)); }, 'image/png');
}

/** What a chart on the page was last drawn from, for the flight report. */
export function chartSnapshot(canvas: HTMLCanvasElement): ChartSnapshot | undefined {
  return snapshots.get(canvas);
}

/** Every chart on the page that is showing, in document order. */
export function visibleCharts(root: ParentNode = document): HTMLCanvasElement[] {
  return Array.from(root.querySelectorAll('canvas')).filter((c) => snapshots.has(c) && c.isConnected && c.getClientRects().length > 0);
}

function place(): void {
  if (!button || !target) return;
  const r = target.getBoundingClientRect();
  button.style.left = `${Math.round(r.right - button.offsetWidth - 4)}px`;
  button.style.top = `${Math.round(r.bottom - button.offsetHeight - 20)}px`;
}

function show(canvas: HTMLCanvasElement): void {
  window.clearTimeout(hideTimer);
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'chart-png';
    button.addEventListener('click', () => { if (target) saveChartPng(target); });
    button.addEventListener('pointerenter', () => window.clearTimeout(hideTimer));
    button.addEventListener('pointerleave', hide);
    button.addEventListener('blur', hide);
    window.addEventListener('scroll', () => { if (button) button.hidden = true; }, { capture: true, passive: true });
  }
  target = canvas;
  button.textContent = t('chart.png');
  const title = snapshots.get(canvas)?.opt.title ?? '';
  button.title = t('chart.pngTitle', { chart: title });
  button.setAttribute('aria-label', button.title);
  // Next to its chart in the tab order; fixed, so outside the layout.
  if (canvas.nextSibling !== button) canvas.after(button);
  button.hidden = false;
  place();
}

function hide(): void {
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    if (button && document.activeElement !== button && document.activeElement !== target) button.hidden = true;
  }, 400);
}

function wire(canvas: HTMLCanvasElement): void {
  if (wired.has(canvas)) return;
  wired.add(canvas);
  // focusable, so a keyboard reaches the chart and the button after it
  if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;
  canvas.addEventListener('pointerenter', () => show(canvas));
  canvas.addEventListener('pointerleave', hide);
  canvas.addEventListener('focus', () => show(canvas));
  canvas.addEventListener('blur', hide);
}

/** Start keeping what every chart is drawn from, and offer each as a PNG. */
export function enableChartExport(): void {
  setChartDrawnHook((canvas, series, opt) => {
    snapshots.set(canvas, snapshotChart(series, opt));
    wire(canvas);
  });
}
