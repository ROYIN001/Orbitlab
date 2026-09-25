/**
 * G07: the spacecraft's motion relative to the station, in the station's LVLH
 * frame — the plot rendezvous engineers draw: the station at the centre, the
 * V-bar (its direction of flight) to the right and up away from the Earth
 * (−R-bar), metres on both axes at the same scale so the geometry reads true.
 *
 * The window follows the range: it is a round span a little over the current
 * distance, so the hours of phasing show as the spacecraft rising from below
 * and behind, and the last hundred metres fill the plot as the approach closes
 * in. The track is the recorded flight up to the displayed instant, so it
 * stops at the timeline cursor like every other chart.
 *
 * One series and a station glyph: no legend; the title names it and the
 * figures beside it give the range and the closing speed.
 */
import type { VisualFrame } from '../physics/frame';
import { PORTS } from '../physics/rendezvous/ports';
import { APPROACH } from '../physics/rendezvous/profiles';
import { getLang, t } from '../i18n';

const GRID = '#232d3a';
const AXIS_TEXT = '#8695a8';
const TITLE_TEXT = '#e7edf4';
const TRACK = '#6ec8ff';
const SURFACE = '#161e2a';
const GUIDE = '#3a4a5c';

/** The smallest round span (1, 2 or 5 × 10ⁿ) at least `x`. */
export function niceSpan(x: number): number {
  const p = 10 ** Math.floor(Math.log10(Math.max(x, 1e-9)));
  for (const m of [1, 2, 5, 10]) if (m * p >= x) return m * p;
  return 10 * p;
}

export class RendezvousPlot {
  readonly canvas: HTMLCanvasElement;
  private xs: number[] = [];
  private zs: number[] = [];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'chart rv-plot hidden';
    this.canvas.setAttribute('role', 'img');
  }

  /** Draw the flight up to `frame` (null or no rendezvous hides the plot). */
  update(frames: readonly VisualFrame[], frame: VisualFrame | null): void {
    const rv = frame?.rendezvous;
    this.canvas.classList.toggle('hidden', !rv);
    if (!rv || !frame) return;
    // the track, recorded frames up to the displayed instant
    this.xs.length = 0; this.zs.length = 0;
    for (const f of frames) {
      if (f.t > frame.t) break;
      if (!f.rendezvous) continue;
      this.xs.push(f.rendezvous.rel.r.x);
      this.zs.push(f.rendezvous.rel.r.z);
    }
    this.xs.push(rv.rel.r.x);
    this.zs.push(rv.rel.r.z);
    this.draw(rv.rel.r.x, rv.rel.r.z, rv.range, rv.rangeRate, rv.port);
  }

  private draw(x: number, z: number, range: number, rate: number, port: keyof typeof PORTS): void {
    const c = this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth || 300, h = c.clientHeight || 220;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const padL = 40, padR = 10, padT = 22, padB = 18;
    const pw = w - padL - padR, ph = h - padT - padB;
    // equal scale on both axes, the station at the centre, a round span a little past the spacecraft
    const half = niceSpan(Math.max(range * 1.25, 40));
    const scale = Math.min(pw, ph) / (2 * half);
    const cx = padL + pw / 2, cy = padT + ph / 2;
    const sx = (m: number) => cx + m * scale;
    const sy = (m: number) => cy + m * scale; // +z (R-bar, toward the Earth) is down
    const km = half >= 5000;
    const unit = km ? t('rv.unit.km') : t('rv.unit.m');
    const lang = getLang();
    const fmt = (m: number) => (km ? m / 1000 : m).toLocaleString(lang, { maximumFractionDigits: 1 });
    // grid, at a round step
    const step = niceSpan(half / 2.5);
    g.strokeStyle = GRID;
    g.lineWidth = 1;
    g.font = '10px ui-monospace, monospace';
    g.fillStyle = AXIS_TEXT;
    const xHalf = pw / 2 / scale, zHalf = ph / 2 / scale;
    for (let k = -Math.floor(xHalf / step); k <= Math.floor(xHalf / step); k++) {
      const px = sx(k * step);
      g.beginPath(); g.moveTo(px, padT); g.lineTo(px, h - padB); g.stroke();
      if (k !== 0 && Math.abs(px - (w - padR)) > 30) { g.textAlign = 'center'; g.fillText(fmt(k * step), px, h - 5); }
    }
    for (let k = -Math.floor(zHalf / step); k <= Math.floor(zHalf / step); k++) {
      const py = sy(k * step);
      g.beginPath(); g.moveTo(padL, py); g.lineTo(w - padR, py); g.stroke();
      // up is away from the Earth: label heights above the station as positive
      g.textAlign = 'right';
      g.fillText(fmt(-k * step), padL - 4, py + 3);
    }
    g.save();
    g.beginPath(); g.rect(padL, padT, pw, ph); g.clip();
    // the port's approach axis, and the flyaround's 400 m, once they are in the window
    const p = PORTS[port];
    g.strokeStyle = GUIDE;
    g.setLineDash([4, 4]);
    g.beginPath();
    g.moveTo(sx(p.position.x), sy(p.position.z));
    g.lineTo(sx(p.position.x + p.axis.x * half * 3), sy(p.position.z + p.axis.z * half * 3));
    g.stroke();
    if (APPROACH.flyaroundRange * scale > 6 && half <= 5000) {
      g.beginPath(); g.arc(sx(p.position.x), sy(p.position.z), APPROACH.flyaroundRange * scale, 0, Math.PI * 2); g.stroke();
    }
    g.setLineDash([]);
    // the track
    g.strokeStyle = TRACK;
    g.lineWidth = 2;
    g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i < this.xs.length; i++) {
      const px = sx(this.xs[i]), py = sy(this.zs[i]);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.stroke();
    // the station seen from the side: the modules from Zvezda's aft end to the US segment's front, Nauka and Prichal below
    // (to scale once it is more than a dot)
    g.fillStyle = TITLE_TEXT;
    const bar = Math.max(2, 4.2 * scale);
    g.fillRect(sx(-38), sy(0) - bar / 2, Math.max(3, 52 * scale), bar);
    g.fillRect(sx(-26) - bar / 2, sy(0), bar, Math.max(1, 19 * scale));
    g.beginPath(); g.arc(sx(0), sy(0), 2.5, 0, Math.PI * 2); g.fill();
    // the spacecraft now, ringed with the surface so it reads over the track
    g.fillStyle = TRACK;
    g.strokeStyle = SURFACE;
    g.lineWidth = 2;
    g.beginPath(); g.arc(sx(x), sy(z), 4.5, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
    // title, figures, axis names
    g.textAlign = 'left';
    g.fillStyle = TITLE_TEXT;
    g.font = '600 11px "Space Grotesk", system-ui, sans-serif';
    g.fillText(t('rvplot.title'), padL, 14);
    const figs = t('rvplot.figures', {
      range: range >= 1000 ? `${(range / 1000).toLocaleString(lang, { maximumFractionDigits: 2 })} ${t('rv.unit.km')}` : `${range.toLocaleString(lang, { maximumFractionDigits: 0 })} ${t('rv.unit.m')}`,
      rate: rate.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    });
    g.textAlign = 'right';
    g.font = '10px ui-monospace, monospace';
    g.fillStyle = TITLE_TEXT;
    g.fillText(figs, w - padR, 14);
    g.fillStyle = AXIS_TEXT;
    g.font = '9px "DM Sans", system-ui, sans-serif';
    g.fillText(t('rvplot.vbar', { unit }), w - padR, h - 5);
    g.textAlign = 'left';
    g.fillText(t('rvplot.up', { unit }), padL + 4, padT + 10);
    const label = t('rvplot.aria', { x: fmt(x), z: fmt(-z), unit, range: figs });
    if (c.getAttribute('aria-label') !== label) { c.setAttribute('aria-label', label); c.textContent = label; }
  }
}
