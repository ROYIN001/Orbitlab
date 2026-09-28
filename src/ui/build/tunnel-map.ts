/**
 * The wind tunnel's Mach × angle map (roadmap D04): one coefficient as a
 * grid of coloured cells, Mach number across (the tables' own breakpoints, as
 * equal columns — the map shows what the tables hold, not a Mach scale) and
 * angle of attack up the side. The values and the colours are
 * src/design/tunnel-view.ts's; this only paints them.
 *
 * Read by pointer (a cell under the pointer is read out, a click keeps it)
 * and by keyboard (the arrows move the kept cell, Home and End go to the
 * first and last Mach number): the readout under the map says the cell in
 * words and is announced politely, so the colour is never the only way to
 * the number. Cells beyond the 15° the tables are built for are hatched, as
 * the flight flags them.
 */
import { getLang } from '../../i18n';
import { mapColour, type TunnelMap } from '../../design/tunnel-view';
import { el } from '../orbit/dom';

export interface MapText {
  /** the whole map in a sentence, for the accessible name */
  summary: string;
  /** one cell in words: "Mach 1.2, α = 4°: C_N = 0.312" */
  cell(machIndex: number, alphaIndex: number): string;
  /** the axes' names */
  mach: string;
  alpha: string;
}

const PAD = { l: 34, r: 8, t: 16, b: 32 };
/** rows' height, px: the small-angle view has 11, the wide one 19 */
const rowHeight = (rows: number): number => (rows > 12 ? 13 : 20);

export const machText = (m: number): string => m.toLocaleString(getLang(), { maximumFractionDigits: 2 });

export class TunnelMapView {
  readonly root = el('div', 'be-map');
  private readonly canvas = el('canvas', 'be-map-canvas');
  private readonly readout = el('p', 'be-map-readout');
  private map: TunnelMap | null = null;
  private text: MapText | null = null;
  /** the kept cell, by column (Mach) and row (angle) */
  private sel = { m: 5, a: 4 };
  private hover: { m: number; a: number } | null = null;

  constructor() {
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('role', 'img');
    this.readout.setAttribute('aria-live', 'polite');
    this.readout.id = 'be-map-readout';
    this.canvas.setAttribute('aria-describedby', this.readout.id);
    this.root.append(this.canvas, this.readout);
    this.canvas.addEventListener('pointermove', (e) => { this.hover = this.cellAt(e); this.paint(); this.say(); });
    this.canvas.addEventListener('pointerleave', () => { this.hover = null; this.paint(); this.say(); });
    this.canvas.addEventListener('click', (e) => {
      const c = this.cellAt(e);
      if (c) { this.sel = c; this.paint(); this.say(); }
    });
    this.canvas.addEventListener('keydown', (e) => this.onKey(e));
  }

  set(map: TunnelMap, text: MapText): void {
    this.map = map;
    this.text = text;
    this.sel = { m: Math.min(this.sel.m, map.machs.length - 1), a: Math.min(this.sel.a, map.alphas.length - 1) };
    this.canvas.setAttribute('aria-label', text.summary);
    this.paint();
    this.say();
  }

  /** The kept cell's column and row. */
  get selected(): { m: number; a: number } {
    return this.sel;
  }

  select(m: number, a: number): void {
    if (!this.map) return;
    this.sel = { m: Math.max(0, Math.min(this.map.machs.length - 1, m)), a: Math.max(0, Math.min(this.map.alphas.length - 1, a)) };
    this.paint();
    this.say();
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.map) return;
    const { m, a } = this.sel;
    const last = this.map.machs.length - 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [m - 1, a], ArrowRight: [m + 1, a], ArrowUp: [m, a + 1], ArrowDown: [m, a - 1], Home: [0, a], End: [last, a],
    };
    const to = moves[e.key];
    if (!to) return;
    e.preventDefault();
    this.hover = null;
    this.select(to[0], to[1]);
  }

  private say(): void {
    if (!this.map || !this.text) return;
    const c = this.hover ?? this.sel;
    this.readout.textContent = this.text.cell(c.m, c.a);
  }

  private geometry(): { w: number; h: number; cw: number; ch: number } | null {
    if (!this.map) return null;
    const w = this.canvas.clientWidth || this.root.clientWidth;
    const ch = rowHeight(this.map.alphas.length);
    const h = PAD.t + ch * this.map.alphas.length + PAD.b;
    const cw = (w - PAD.l - PAD.r) / this.map.machs.length;
    return { w, h, cw, ch };
  }

  private cellAt(e: PointerEvent | MouseEvent): { m: number; a: number } | null {
    const g = this.geometry();
    if (!g || !this.map) return null;
    const box = this.canvas.getBoundingClientRect();
    const x = e.clientX - box.left - PAD.l, y = e.clientY - box.top - PAD.t;
    const m = Math.floor(x / g.cw), row = Math.floor(y / g.ch);
    const n = this.map.alphas.length;
    if (m < 0 || m >= this.map.machs.length || row < 0 || row >= n) return null;
    return { m, a: n - 1 - row };
  }

  /** Paint the map at the canvas's size (called again on a resize). */
  paint(): void {
    const g = this.geometry();
    const map = this.map;
    if (!g || !map || g.w < 50) return;
    this.canvas.style.height = `${g.h}px`;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (this.canvas.width !== Math.round(g.w * dpr) || this.canvas.height !== Math.round(g.h * dpr)) {
      this.canvas.width = Math.round(g.w * dpr);
      this.canvas.height = Math.round(g.h * dpr);
    }
    const c = this.canvas.getContext('2d');
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, g.w, g.h);
    const n = map.alphas.length;
    const x0 = (m: number): number => PAD.l + m * g.cw;
    const y0 = (a: number): number => PAD.t + (n - 1 - a) * g.ch;
    // the cells, with a 1 px gap of panel between them
    for (let a = 0; a < n; a++) {
      for (let m = 0; m < map.machs.length; m++) {
        c.fillStyle = mapColour(map, map.values[a][m]);
        c.fillRect(x0(m) + 0.5, y0(a) + 0.5, g.cw - 1, g.ch - 1);
        if (!map.within[a][m]) {
          c.save();
          c.beginPath();
          c.rect(x0(m) + 0.5, y0(a) + 0.5, g.cw - 1, g.ch - 1);
          c.clip();
          c.strokeStyle = 'rgba(8, 12, 19, 0.55)';
          c.lineWidth = 1.2;
          for (let k = -g.ch; k < g.cw; k += 5) {
            c.beginPath();
            c.moveTo(x0(m) + k, y0(a) + g.ch);
            c.lineTo(x0(m) + k + g.ch, y0(a));
            c.stroke();
          }
          c.restore();
        }
      }
    }
    // the kept cell, and the one under the pointer
    const ring = (cell: { m: number; a: number }, colour: string, width: number): void => {
      c.strokeStyle = colour;
      c.lineWidth = width;
      c.strokeRect(x0(cell.m) + width / 2, y0(cell.a) + width / 2, g.cw - width, g.ch - width);
    };
    if (this.hover && (this.hover.m !== this.sel.m || this.hover.a !== this.sel.a)) ring(this.hover, 'rgba(231, 237, 244, 0.7)', 1);
    ring(this.sel, '#e7edf4', 2);
    // the axes
    c.fillStyle = '#8695a8';
    c.font = '10px ui-monospace, monospace';
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    const every = n > 12 ? 2 : 1;
    for (let a = 0; a < n; a += every) c.fillText(`${map.alphas[a]}°`, PAD.l - 4, y0(a) + g.ch / 2);
    c.textAlign = 'center';
    c.textBaseline = 'top';
    let right = -Infinity;
    for (let m = 0; m < map.machs.length; m++) {
      const label = machText(map.machs[m]);
      const x = x0(m) + g.cw / 2, half = c.measureText(label).width / 2;
      // a label that would come within a character of the one before it is left out (a phone's narrow
      // columns: 3 px apart, "0.6 0.8" read as one number); the readout still names every column
      if (x - half < right + 8) continue;
      c.fillText(label, x, PAD.t + n * g.ch + 4);
      right = x + half;
    }
    c.fillStyle = '#96a3b4';
    c.font = '10px "DM Sans", system-ui, sans-serif';
    c.textAlign = 'right';
    c.textBaseline = 'alphabetic';
    c.fillText(this.text?.mach ?? '', g.w - PAD.r, g.h - 3);
    c.textAlign = 'left';
    c.fillText(this.text?.alpha ?? '', 2, 11);
  }
}
