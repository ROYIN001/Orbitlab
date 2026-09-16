/** Minimal canvas line charts for the telemetry panel. */
export interface Series {
  x: number[];
  y: number[];
  color: string;
  label?: string;
}
export interface ChartOptions {
  title: string;
  xLabel?: string;
  yMin?: number;
  yMax?: number;
  xMax?: number;
  markers?: { x: number; color: string }[];
}

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
  if (opt.xMax !== undefined) xMax = Math.max(xMax, opt.xMax);
  if (opt.yMin !== undefined) yMin = Math.min(yMin, opt.yMin);
  if (opt.yMax !== undefined) yMax = Math.max(yMax, opt.yMax);
  if (xMax - xMin < 1e-9) xMax = xMin + 1;
  if (yMax - yMin < 1e-9) yMax = yMin + 1;
  const pad = (yMax - yMin) * 0.06;
  yMax += pad; yMin -= pad;
  const sx = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * pw;
  const sy = (y: number) => padT + (1 - (y - yMin) / (yMax - yMin)) * ph;
  // grid
  g.strokeStyle = '#26304a';
  g.lineWidth = 1;
  g.font = '10px ui-monospace, monospace';
  g.fillStyle = '#8d9bb5';
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
    g.textAlign = 'center';
    g.fillText(fmt(x), px, h - 5);
  }
  // markers
  for (const m of opt.markers ?? []) {
    if (m.x < xMin || m.x > xMax) continue;
    g.strokeStyle = m.color; g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(sx(m.x), padT); g.lineTo(sx(m.x), h - padB); g.stroke();
    g.setLineDash([]);
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
  // title & legend
  g.textAlign = 'left';
  g.fillStyle = '#dbe3f0';
  g.font = 'bold 11px system-ui, sans-serif';
  g.fillText(opt.title, padL, 12);
  let lx = w - padR;
  g.font = '10px system-ui, sans-serif';
  for (const s of [...series].reverse()) {
    if (!s.label) continue;
    g.textAlign = 'right';
    g.fillStyle = s.color;
    g.fillText(s.label, lx, 12);
    lx -= g.measureText(s.label).width + 12;
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
