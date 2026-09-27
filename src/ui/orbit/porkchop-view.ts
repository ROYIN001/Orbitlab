/**
 * The porkchop plot of an Earth-orbit rendezvous (roadmap O02, Engineer):
 * every departure time across, every time of flight up, each point the
 * transfer Lambert's problem finds between the chaser then and the target
 * at arrival, coloured by the total Δv of its two burns. The cheapest point
 * is marked; a click plans the transfer at that point. Empty points are
 * transfers that would pass through the atmosphere, or none at all.
 */
import { t } from '../../i18n';
import { num } from './dom';

export interface PorkchopData {
  /** s after the plan's start, and s of flight */
  deps: readonly number[];
  tofs: readonly number[];
  /** Δv, m/s, [departure][time of flight]; NaN where there is no transfer */
  grid: readonly (readonly number[])[];
  /** the transfer planned now, if any */
  chosen: { dep: number; tof: number } | null;
}

/** Colours from cheap to dear (viridis's ends and middle, to read on a dark page). */
const STOPS: readonly [number, number, number][] = [[253, 231, 37], [94, 201, 98], [33, 145, 140], [59, 82, 139], [68, 1, 84]];

function colour(f: number): string {
  const x = Math.max(0, Math.min(1, f)) * (STOPS.length - 1);
  const k = Math.min(STOPS.length - 2, Math.floor(x)), u = x - k;
  const c = STOPS[k].map((v, j) => Math.round(v + (STOPS[k + 1][j] - v) * u));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export class PorkchopView {
  private data: PorkchopData | null = null;
  private layout = { x0: 0, y0: 0, w: 0, h: 0 };
  private hover: { i: number; j: number } | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, pick: (dep: number, tof: number) => void) {
    canvas.addEventListener('pointermove', (e) => { this.hover = this.cellAt(e); });
    canvas.addEventListener('pointerleave', () => { this.hover = null; });
    canvas.addEventListener('click', (e) => {
      const c = this.cellAt(e);
      if (c && this.data && Number.isFinite(this.data.grid[c.i][c.j])) pick(this.data.deps[c.i], this.data.tofs[c.j]);
    });
  }

  set(data: PorkchopData | null): void {
    this.data = data;
  }

  private cellAt(e: PointerEvent | MouseEvent): { i: number; j: number } | null {
    const d = this.data, L = this.layout;
    if (!d) return null;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - L.x0, y = L.y0 + L.h - (e.clientY - rect.top);
    if (x < 0 || y < 0 || x > L.w || y > L.h) return null;
    return { i: Math.min(d.deps.length - 1, Math.floor((x / L.w) * d.deps.length)), j: Math.min(d.tofs.length - 1, Math.floor((y / L.h) * d.tofs.length)) };
  }

  draw(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    if (W === 0 || H === 0) return;
    if (this.canvas.width !== Math.round(W * dpr) || this.canvas.height !== Math.round(H * dpr)) {
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
    }
    const g = this.canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#05080d';
    g.fillRect(0, 0, W, H);
    g.font = '12px system-ui, sans-serif';
    const d = this.data;
    // with no rendezvous chosen the page says so over the empty plot (a canvas cannot wrap Thai)
    if (!d) return;
    const finite = d.grid.flat().filter(Number.isFinite);
    const lo = finite.length ? Math.min(...finite) : 0;
    // the scale runs to three times the cheapest: dearer transfers are all "dear"
    const hi = finite.length ? Math.min(Math.max(...finite), 3 * lo) : 1;
    const L = { x0: 56, y0: 30, w: Math.max(40, W - 56 - 76), h: Math.max(40, H - 30 - 46) };
    this.layout = L;
    const cw = L.w / d.deps.length, ch = L.h / d.tofs.length;
    d.grid.forEach((row, i) => row.forEach((dv, j) => {
      g.fillStyle = Number.isFinite(dv) ? colour((dv - lo) / (hi - lo || 1)) : '#11161e';
      g.fillRect(L.x0 + i * cw, L.y0 + L.h - (j + 1) * ch, Math.ceil(cw), Math.ceil(ch));
    }));
    // axes, in minutes
    g.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    g.strokeRect(L.x0 + 0.5, L.y0 + 0.5, L.w, L.h);
    g.fillStyle = '#b8c5d3';
    g.textAlign = 'center';
    for (let k = 0; k <= 4; k++) {
      const x = L.x0 + (k / 4) * L.w, v = d.deps[0] + (k / 4) * (d.deps[d.deps.length - 1] - d.deps[0]);
      g.fillText(num(v / 60), x, L.y0 + L.h + 16);
    }
    g.fillText(t('pc.x'), L.x0 + L.w / 2, L.y0 + L.h + 34);
    g.textAlign = 'right';
    for (let k = 0; k <= 4; k++) {
      const y = L.y0 + L.h - (k / 4) * L.h, v = d.tofs[0] + (k / 4) * (d.tofs[d.tofs.length - 1] - d.tofs[0]);
      g.fillText(num(v / 60), L.x0 - 6, y + 4);
    }
    g.save();
    g.translate(14, L.y0 + L.h / 2);
    g.rotate(-Math.PI / 2);
    g.textAlign = 'center';
    g.fillText(t('pc.y'), 0, 0);
    g.restore();
    // the colour key
    const kx = L.x0 + L.w + 16;
    for (let k = 0; k < L.h; k++) { g.fillStyle = colour(1 - k / L.h); g.fillRect(kx, L.y0 + k, 12, 1); }
    g.fillStyle = '#b8c5d3';
    g.textAlign = 'left';
    const kms = t('u.kms');
    g.fillText(`${num(lo / 1000, 2)}`, kx + 16, L.y0 + L.h);
    g.fillText(`${num(hi / 1000, 2)}`, kx + 16, L.y0 + 10);
    g.fillText(kms, kx - 2, L.y0 - 10);
    // the cheapest, the one planned, and the one under the pointer
    const mark = (i: number, j: number, color: string, r: number) => {
      g.strokeStyle = color; g.lineWidth = 2;
      g.beginPath(); g.arc(L.x0 + (i + 0.5) * cw, L.y0 + L.h - (j + 0.5) * ch, r, 0, 2 * Math.PI); g.stroke();
    };
    let best: { i: number; j: number } | null = null, bestDv = Infinity;
    d.grid.forEach((row, i) => row.forEach((dv, j) => { if (dv < bestDv) { bestDv = dv; best = { i, j }; } }));
    if (best) { const b = best as { i: number; j: number }; mark(b.i, b.j, '#ffffff', 6); }
    if (d.chosen) {
      const i = nearest(d.deps, d.chosen.dep), j = nearest(d.tofs, d.chosen.tof);
      if (i >= 0 && j >= 0) mark(i, j, '#ff6b6b', 8);
    }
    // the line over the plot: the point under the pointer, or else the plot's title where it fits
    g.textAlign = 'left';
    if (this.hover) {
      const { i, j } = this.hover, dv = d.grid[i][j];
      mark(i, j, '#8be5cd', 5);
      g.fillStyle = '#e7edf4';
      g.fillText(Number.isFinite(dv)
        ? t('pc.cell', { dep: num(d.deps[i] / 60), tof: num(d.tofs[j] / 60), dv: num(dv / 1000, 3), u: kms })
        : t('pc.empty'), L.x0, 18, L.w);
    } else if (g.measureText(t('pc.title')).width <= L.w) {
      g.fillStyle = '#b8c5d3';
      g.fillText(t('pc.title'), L.x0, 18);
    }
  }
}

/** The index of the grid value nearest `v`, or −1 outside the grid. */
function nearest(axis: readonly number[], v: number): number {
  if (!axis.length || v < axis[0] - 1e-6 || v > axis[axis.length - 1] + 1e-6) return -1;
  let best = 0;
  axis.forEach((x, k) => { if (Math.abs(x - v) < Math.abs(axis[best] - v)) best = k; });
  return best;
}
