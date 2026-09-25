/** Minimal canvas line charts for the telemetry panel. */
import { getLang, t, type Lang } from '../i18n';

export interface Series {
  x: number[];
  y: number[];
  color: string;
  label?: string;
  /** Dash pattern, px; solid when absent (the attitude-loop inspector's commands, G03). */
  dash?: number[];
}
export interface ChartMarker {
  x: number;
  color: string;
  /** short label drawn along the marker, e.g. "Max Q" */
  label?: string;
}
export interface ChartOptions {
  title: string;
  /** unit of the x axis, drawn bottom-right (B11: no chart used to state one) */
  xLabel?: string;
  yMin?: number;
  yMax?: number;
  /** hard window; when given the axis uses it instead of the data extent */
  xMin?: number;
  xMax?: number;
  markers?: ChartMarker[];
  /** the instant the rest of the app is showing, drawn as a bright playhead */
  cursor?: number;
  /** format the x ticks as m:ss rather than as plain numbers */
  timeAxis?: boolean;
  /** Spoken names when the visual legend uses short symbols such as v_air. */
  seriesLabels?: readonly string[];
  /** Tick label of the x axis (a log axis plots log₁₀ x and labels 10^x; the G04 Bode plot). */
  xFormat?: (x: number) => string;
}

export interface ChartSeriesSummary {
  minimum: number;
  maximum: number;
  latest: number;
  latestTime: number;
}

/** Statistics of the plotted samples, not a claim about unsampled extrema. */
export function chartStatistics(series: readonly Series[], start: number, end: number): Array<ChartSeriesSummary | null> {
  return series.map((s) => {
    let summary: ChartSeriesSummary | null = null;
    for (let i = 0; i < s.x.length; i++) {
      const x = s.x[i], y = s.y[i];
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < start || x > end) continue;
      if (!summary) summary = { minimum: y, maximum: y, latest: y, latestTime: x };
      else {
        summary.minimum = Math.min(summary.minimum, y);
        summary.maximum = Math.max(summary.maximum, y);
        if (x >= summary.latestTime) { summary.latest = y; summary.latestTime = x; }
      }
    }
    return summary;
  });
}

const numberFormats: Record<Lang, Intl.NumberFormat> = {
  en: new Intl.NumberFormat('en', { maximumFractionDigits: 2 }),
  ru: new Intl.NumberFormat('ru', { maximumFractionDigits: 2 }),
  th: new Intl.NumberFormat('th', { maximumFractionDigits: 2 }),
};

/** Text equivalent of one chart; called at the panel's existing 2 Hz cadence. */
export function chartDescription(series: readonly Series[], opt: ChartOptions, start: number, end: number): string {
  const format = (value: number): string => numberFormats[getLang()].format(value);
  const parts = [opt.title, t('tel.chart.window', { start: format(start), end: format(end) })];
  if (opt.cursor !== undefined && Number.isFinite(opt.cursor)) parts.push(t('tel.chart.cursor', { time: format(opt.cursor) }));
  const stats = chartStatistics(series, start, end);
  if (!stats.some((s) => s !== null)) parts.push(t('tel.chart.noData'));
  else stats.forEach((s, index) => {
    const name = opt.seriesLabels?.[index] ?? series[index].label ?? opt.title;
    parts.push(s ? t('tel.chart.sample', {
      series: name, latest: format(s.latest), time: format(s.latestTime), min: format(s.minimum), max: format(s.maximum),
    }) : t('tel.chart.seriesNoData', { series: name }));
  });
  return parts.join(' ');
}

/** The colours a chart is drawn in: the panel's dark ones, or paper's for an exported image (U06). */
export interface ChartTheme {
  background: string | null;
  grid: string;
  axisText: string;
  titleText: string;
  cursor: string;
  /** a series' or marker's own colour, as this theme draws it */
  ink: (color: string) => string;
}

export const SCREEN_THEME: ChartTheme = {
  background: null, grid: '#232d3a', axisText: '#8695a8', titleText: '#e7edf4', cursor: '#8be5cd', ink: (c) => c,
};

/**
 * White paper: the panel's colours are light, for a dark background, so each
 * is darkened to about 60 % until it reads on white.
 */
export const PRINT_THEME: ChartTheme = {
  background: '#ffffff', grid: '#dde2e8', axisText: '#4b5563', titleText: '#111827', cursor: '#0f766e', ink: darken,
};

export function darken(color: string, factor = 0.6): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 255) * factor).toString(16).padStart(2, '0');
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

/** Called with what each chart was last drawn from (src/ui/chart-export.ts registers it). */
let onDrawn: ((canvas: HTMLCanvasElement, series: Series[], opt: ChartOptions) => void) | null = null;
export function setChartDrawnHook(hook: typeof onDrawn): void { onDrawn = hook; }

export function drawChart(canvas: HTMLCanvasElement, series: Series[], opt: ChartOptions): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 300;
  const h = canvas.clientHeight || 120;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const g = canvas.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const description = paintChart(g, w, h, series, opt, SCREEN_THEME);
  // A named image plus a textual alternative makes the canvas readable without
  // color or vision. No aria-live: a running flight must not speak eight charts
  // twice a second. Source arrays are already capped by the telemetry panel.
  canvas.setAttribute('role', 'img');
  if (canvas.getAttribute('aria-label') !== description) {
    canvas.setAttribute('aria-label', description);
    canvas.textContent = description;
  }
  onDrawn?.(canvas, series, opt);
}

/**
 * Draw a chart into a 2-D context of `w` × `h` CSS pixels, in a theme; returns
 * its text description. `drawChart` is this on the panel's canvas; an export
 * (src/ui/chart-export.ts) is this on a larger one, in `PRINT_THEME`.
 */
export function paintChart(g: CanvasRenderingContext2D, w: number, h: number, series: Series[], opt: ChartOptions, theme: ChartTheme, scale = 1): string {
  g.clearRect(0, 0, w, h);
  if (theme.background) { g.fillStyle = theme.background; g.fillRect(0, 0, w, h); }
  const GRID = theme.grid, AXIS_TEXT = theme.axisText, TITLE_TEXT = theme.titleText;
  const px = (n: number) => n * scale;
  const padL = px(44), padR = px(8), padT = px(18), padB = px(18);
  const pw = w - padL - padR, ph = h - padT - padB;
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const s of series) {
    for (let i = 0; i < s.x.length; i++) {
      const x = s.x[i], y = s.y[i];
      if (!isFinite(x) || !isFinite(y)) continue;
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
  }
  if (!isFinite(xMin)) { xMin = 0; xMax = 1; yMin = 0; yMax = 1; }
  // An explicit window wins over the data extent: the telemetry panel uses it
  // to keep every chart on the same axis and to follow the timeline cursor.
  if (opt.xMin !== undefined) xMin = opt.xMin;
  if (opt.xMax !== undefined) xMax = opt.xMax;
  if (opt.yMin !== undefined) yMin = Math.min(yMin, opt.yMin);
  if (opt.yMax !== undefined) yMax = Math.max(yMax, opt.yMax);
  if (xMax - xMin < 1e-9) xMax = xMin + 1;
  const description = chartDescription(series, opt, xMin, xMax);
  if (yMax - yMin < 1e-9) yMax = yMin + 1;
  const pad = (yMax - yMin) * 0.06;
  yMax += pad;
  // A declared floor is a floor, not a hint: padding below `opt.yMin` drew 6 %
  // of every altitude and dynamic-pressure chart under the zero line, so the
  // trace started part-way up the frame and the axis labelled altitudes the
  // vehicle can never have.
  if (opt.yMin === undefined || yMin < opt.yMin) yMin -= pad;
  const sx = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * pw;
  const sy = (y: number) => padT + (1 - (y - yMin) / (yMax - yMin)) * ph;
  const fmtX = opt.xFormat ?? (opt.timeAxis ? fmtClock : fmt);
  // grid
  g.strokeStyle = GRID;
  g.lineWidth = px(1);
  g.font = `${px(10)}px ui-monospace, monospace`;
  g.fillStyle = AXIS_TEXT;
  const ticksY = 4;
  for (let i = 0; i <= ticksY; i++) {
    const y = yMin + ((yMax - yMin) * i) / ticksY;
    const py = sy(y);
    g.beginPath(); g.moveTo(padL, py); g.lineTo(w - padR, py); g.stroke();
    g.textAlign = 'right';
    g.fillText(fmt(y), padL - px(4), py + px(3));
  }
  const ticksX = 4;
  for (let i = 0; i <= ticksX; i++) {
    const x = xMin + ((xMax - xMin) * i) / ticksX;
    const xp = sx(x);
    g.beginPath(); g.moveTo(xp, padT); g.lineTo(xp, h - padB); g.stroke();
    // The last tick label sits exactly where the axis unit goes, so the unit
    // wins: it says what all of them mean.
    if (i === ticksX && opt.xLabel) continue;
    g.textAlign = 'center';
    g.fillText(fmtX(x), xp, h - px(5));
  }
  // markers
  g.save();
  g.beginPath();
  g.rect(padL, padT, pw, ph);
  g.clip();
  for (const m of opt.markers ?? []) {
    if (m.x < xMin || m.x > xMax) continue;
    const xp = sx(m.x);
    g.strokeStyle = theme.ink(m.color); g.setLineDash([px(3), px(3)]);
    g.beginPath(); g.moveTo(xp, padT); g.lineTo(xp, h - padB); g.stroke();
    g.setLineDash([]);
    if (m.label) {
      g.save();
      g.translate(xp + px(3), padT + px(2));
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.font = `${px(9)}px ui-monospace, monospace`;
      g.fillStyle = theme.ink(m.color);
      g.fillText(m.label, 0, 0);
      g.restore();
      g.textBaseline = 'alphabetic';
    }
  }
  // series
  for (const s of series) {
    g.strokeStyle = theme.ink(s.color);
    g.lineWidth = px(1.5);
    g.setLineDash((s.dash ?? []).map(px));
    g.beginPath();
    let started = false;
    for (let i = 0; i < s.x.length; i++) {
      const x = s.x[i], y = s.y[i];
      if (!isFinite(x) || !isFinite(y)) { started = false; continue; }
      const xp = sx(x), py = sy(y);
      if (!started) { g.moveTo(xp, py); started = true; } else g.lineTo(xp, py);
    }
    g.stroke();
  }
  g.setLineDash([]);
  // the instant the rest of the app is showing
  if (opt.cursor !== undefined && isFinite(opt.cursor) && opt.cursor >= xMin && opt.cursor <= xMax) {
    const xp = sx(opt.cursor);
    g.strokeStyle = theme.cursor;
    g.lineWidth = px(1);
    g.beginPath(); g.moveTo(xp, padT); g.lineTo(xp, h - padB); g.stroke();
  }
  g.restore();
  // title & legend
  g.textAlign = 'left';
  g.fillStyle = TITLE_TEXT;
  g.font = `600 ${px(11)}px "Space Grotesk", system-ui, sans-serif`;
  g.fillText(opt.title, padL, px(12));
  let lx = w - padR;
  g.font = `${px(10)}px "DM Sans", system-ui, sans-serif`;
  for (const s of [...series].reverse()) {
    if (!s.label) continue;
    g.textAlign = 'right';
    g.fillStyle = theme.ink(s.color);
    g.fillText(s.label, lx, px(12));
    lx -= g.measureText(s.label).width + px(12);
  }
  if (opt.xLabel) {
    g.textAlign = 'right';
    g.fillStyle = AXIS_TEXT;
    g.font = `${px(9)}px "DM Sans", system-ui, sans-serif`;
    g.fillText(opt.xLabel, w - padR, h - px(5));
  }
  return description;
}

function fmt(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e5) return (v / 1000).toFixed(0) + 'k';
  if (a >= 1000) return v.toFixed(0);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

/** m:ss for a mission-time axis; h:mm:ss once a coast runs past an hour. */
function fmtClock(sec: number): string {
  const sign = sec < 0 ? '-' : '';
  const a = Math.round(Math.abs(sec));
  const h = Math.floor(a / 3600);
  const m = Math.floor((a % 3600) / 60);
  const s = a % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${sign}${h}:${p(m)}:${p(s)}` : `${sign}${m}:${p(s)}`;
}
