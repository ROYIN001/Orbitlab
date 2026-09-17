/** Minimal canvas line charts for the telemetry panel. */
export interface Series {
  x: number[];
  y: number[];
  color: string;
  label?: string;
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
}

const GRID = '#232d3a';
const AXIS_TEXT = '#8695a8';
const TITLE_TEXT = '#e7edf4';

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
  g.clearRect(0, 0, w, h);
  const padL = 44, padR = 8, padT = 18, padB = 18;
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
  if (yMax - yMin < 1e-9) yMax = yMin + 1;
  const pad = (yMax - yMin) * 0.06;
  yMax += pad; yMin -= pad;
  const sx = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * pw;
  const sy = (y: number) => padT + (1 - (y - yMin) / (yMax - yMin)) * ph;
  const fmtX = opt.timeAxis ? fmtClock : fmt;
  // grid
  g.strokeStyle = GRID;
  g.lineWidth = 1;
  g.font = '10px ui-monospace, monospace';
  g.fillStyle = AXIS_TEXT;
  const ticksY = 4;
  for (let i = 0; i <= ticksY; i++) {
    const y = yMin + ((yMax - yMin) * i) / ticksY;
    const py = sy(y);
    g.beginPath(); g.moveTo(padL, py); g.lineTo(w - padR, py); g.stroke();
    g.textAlign = 'right';
    g.fillText(fmt(y), padL - 4, py + 3);
  }
  const ticksX = 4;
  for (let i = 0; i <= ticksX; i++) {
    const x = xMin + ((xMax - xMin) * i) / ticksX;
    const px = sx(x);
    g.beginPath(); g.moveTo(px, padT); g.lineTo(px, h - padB); g.stroke();
    // The last tick label sits exactly where the axis unit goes, so the unit
    // wins: it says what all of them mean.
    if (i === ticksX && opt.xLabel) continue;
    g.textAlign = 'center';
    g.fillText(fmtX(x), px, h - 5);
  }
  // markers
  g.save();
  g.beginPath();
  g.rect(padL, padT, pw, ph);
  g.clip();
  for (const m of opt.markers ?? []) {
    if (m.x < xMin || m.x > xMax) continue;
    const px = sx(m.x);
    g.strokeStyle = m.color; g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(px, padT); g.lineTo(px, h - padB); g.stroke();
    g.setLineDash([]);
    if (m.label) {
      g.save();
      g.translate(px + 3, padT + 2);
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.font = '9px ui-monospace, monospace';
      g.fillStyle = m.color;
      g.fillText(m.label, 0, 0);
      g.restore();
      g.textBaseline = 'alphabetic';
    }
  }
  // series
  for (const s of series) {
    g.strokeStyle = s.color;
    g.lineWidth = 1.5;
    g.beginPath();
    let started = false;
    for (let i = 0; i < s.x.length; i++) {
      const x = s.x[i], y = s.y[i];
      if (!isFinite(x) || !isFinite(y)) { started = false; continue; }
      const px = sx(x), py = sy(y);
      if (!started) { g.moveTo(px, py); started = true; } else g.lineTo(px, py);
    }
    g.stroke();
  }
  // the instant the rest of the app is showing
  if (opt.cursor !== undefined && isFinite(opt.cursor) && opt.cursor >= xMin && opt.cursor <= xMax) {
    const px = sx(opt.cursor);
    g.strokeStyle = '#8be5cd';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(px, padT); g.lineTo(px, h - padB); g.stroke();
  }
  g.restore();
  // title & legend
  g.textAlign = 'left';
  g.fillStyle = TITLE_TEXT;
  g.font = '600 11px "Space Grotesk", system-ui, sans-serif';
  g.fillText(opt.title, padL, 12);
  let lx = w - padR;
  g.font = '10px "DM Sans", system-ui, sans-serif';
  for (const s of [...series].reverse()) {
    if (!s.label) continue;
    g.textAlign = 'right';
    g.fillStyle = s.color;
    g.fillText(s.label, lx, 12);
    lx -= g.measureText(s.label).width + 12;
  }
  if (opt.xLabel) {
    g.textAlign = 'right';
    g.fillStyle = AXIS_TEXT;
    g.font = '9px "DM Sans", system-ui, sans-serif';
    g.fillText(opt.xLabel, w - padR, h - 5);
  }
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
