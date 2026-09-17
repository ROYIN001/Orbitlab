/**
 * Illustrative onboard/crew view: a cabin mask with a porthole cut out of it,
 * so the 3-D onboard camera is what you see through the glass, and a strip of
 * instruments below the porthole.
 *
 * Audit B31: the previous version placed the attitude ball at x = 80, the
 * g-meter at x = 190, four 92 px tiles from x = 260 and the caution lamp at
 * x ≈ 670, then painted the strip across the full width and anchored it to
 * H − 176. On a 1280×800 laptop the permanent side panels leave the viewport
 * about 580 px wide, so everything past x ≈ 660 — the throttle tile, the lamp
 * and the event text — was simply outside the canvas, and in Russian the
 * labels ran into each other long before that. The strip is now a measured,
 * proportional layout: a scale derived from the canvas width, tiles sized from
 * the space that is actually left, tiles dropped from the least important end
 * when there is not enough, and every string trimmed with `measureText` rather
 * than by a character count. The porthole is placed above the strip instead of
 * behind it, so it cannot be covered on a short window.
 *
 * `bottomInset` is the measured height of the phase-narration band, handed in
 * by main.ts. The strip is drawn above it, so the instruments and the narration
 * cannot collide whatever the language does to the narration's height. It is a
 * measurement rather than a CSS trick because the canvas has to keep covering
 * the whole viewport: the porthole mask is what hides the 3-D scene outside the
 * glass, and a shortened canvas would leave a strip of unmasked scene.
 */
import type { Simulation } from '../physics/simulation';
import { t } from '../i18n';
import { dot, normalize } from '../physics/vec3';

interface Tile {
  label: string;
  value: string;
}

export class OnboardOverlay {
  private canvas: HTMLCanvasElement;
  private lastEvent = '';
  private lastEventT = -1e9;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /** Shorten `text` to `max` px, adding an ellipsis; '' when nothing fits. */
  private static trim(g: CanvasRenderingContext2D, text: string, max: number): string {
    if (max <= 0) return '';
    if (g.measureText(text).width <= max) return text;
    const dots = '…';
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (g.measureText(text.slice(0, mid) + dots).width <= max) lo = mid; else hi = mid - 1;
    }
    return lo > 0 ? text.slice(0, lo) + dots : '';
  }

  draw(sim: Simulation | null, crewed: boolean, bottomInset = 0): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    if (W === 0 || H === 0) return;
    if (this.canvas.width !== Math.round(W * dpr) || this.canvas.height !== Math.round(H * dpr)) {
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
    }
    const g = this.canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    // ── proportional layout ────────────────────────────────────────────────
    const S = Math.max(0.6, Math.min(1.1, W / 900));
    const padX = Math.round(12 * S);
    const padY = Math.round(9 * S);
    const gaugeH = Math.round(62 * S);
    const eventH = Math.round(19 * S);
    const bandH = Math.min(Math.round(H * 0.42), padY * 2 + gaugeH + eventH);
    // Never push the strip off the top of a short canvas: the narration gives
    // way rather than the instruments disappearing.
    const inset = Math.max(0, Math.min(bottomInset + 12, H - bandH - 80));
    const by = H - bandH - inset;
    const viewH = by; // the porthole owns everything above the strip

    // ── cabin mask with the porthole cut out ───────────────────────────────
    const cx = W * 0.5;
    const cy = viewH * 0.47;
    const r = Math.max(30, Math.min(W * 0.40, viewH * 0.40));
    g.fillStyle = '#0a0f16';
    g.beginPath();
    g.rect(0, 0, W, H);
    g.arc(cx, cy, r, 0, Math.PI * 2, true);
    g.fill();
    const rim = Math.max(6, 12 * S);
    g.lineWidth = rim;
    g.strokeStyle = '#1b232e';
    g.beginPath(); g.arc(cx, cy, r + rim / 2, 0, Math.PI * 2); g.stroke();
    g.lineWidth = Math.max(1.5, 2.5 * S);
    g.strokeStyle = '#3b4756';
    g.beginPath(); g.arc(cx, cy, r + rim + 2, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#5d6b7c';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath(); g.arc(cx + Math.cos(a) * (r + rim + 2), cy + Math.sin(a) * (r + rim + 2), Math.max(2, 3 * S), 0, Math.PI * 2); g.fill();
    }
    const grad = g.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.10)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.font = `600 ${Math.round(11 * S)}px "Space Grotesk", system-ui, sans-serif`;
    g.fillStyle = '#8ca0b5';
    g.textAlign = 'center';
    const caption = OnboardOverlay.trim(g, crewed ? t('ob.crew') : t('ob.camera'), W - 2 * padX);
    const capY = Math.min(viewH - 6, cy + r + rim + Math.round(22 * S));
    g.fillText(caption, cx, capY);

    if (!sim) return;
    const s = sim.state;

    // ── instrument strip ───────────────────────────────────────────────────
    g.fillStyle = 'rgba(14,20,28,0.94)';
    g.fillRect(0, by, W, bandH);
    g.strokeStyle = '#26303c';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, by + 0.5); g.lineTo(W, by + 0.5); g.stroke();

    const gaugeW = Math.round(78 * S);
    const gap = Math.round(8 * S);
    const gy = by + padY;
    // Two gauges, then as many readout tiles as actually fit.
    const tiles: Tile[] = [
      { label: t('ob.alt'), value: (s.altitude / 1000).toFixed(1) },
      { label: t('ob.vel'), value: s.speed.toFixed(0) },
      { label: t('ob.stage'), value: String((sim.vehicle.active?.index ?? 0) + 1) },
      { label: t('ob.throttle'), value: `${(s.throttle * 100).toFixed(0)}%` },
    ];
    const tilesX = padX + 2 * (gaugeW + gap);
    const avail = W - tilesX - padX;
    const minTile = Math.round(58 * S);
    const n = Math.max(0, Math.min(tiles.length, Math.floor((avail + gap) / (minTile + gap))));
    const shown = tiles.slice(0, n);
    const tileW = n > 0 ? (avail - gap * (n - 1)) / n : 0;

    this.drawAttitude(g, sim, padX, gy, gaugeW, gaugeH, S);
    this.drawGMeter(g, s.gLoad, padX + gaugeW + gap, gy, gaugeW, gaugeH, S);
    let tx = tilesX;
    for (const tile of shown) {
      this.drawTile(g, tile, tx, gy, tileW, gaugeH, S);
      tx += tileW + gap;
    }

    // ── latest callout ─────────────────────────────────────────────────────
    const last = sim.events[sim.events.length - 1];
    if (last && last.t !== this.lastEventT) { this.lastEvent = t(last.key, last.params); this.lastEventT = last.t; }
    const ey = by + padY + gaugeH;
    if (last && s.t - last.t < 12) {
      const blink = Math.floor(s.t * 3) % 2 === 0 || last.severity !== 'fail';
      g.fillStyle = last.severity === 'fail' ? (blink ? '#ff6b6b' : '#5a1a1a') : last.severity === 'warn' ? '#efa47e' : '#8be5cd';
      const lamp = Math.round(6 * S);
      g.fillRect(padX, ey + eventH / 2 - lamp / 2, lamp, lamp);
      g.font = `${Math.round(11 * S)}px "DM Sans", system-ui, sans-serif`;
      g.fillStyle = '#c3d1de';
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      const maxW = W - padX * 2 - lamp - 8 * S;
      g.fillText(OnboardOverlay.trim(g, this.lastEvent, maxW), padX + lamp + 8 * S, ey + eventH / 2);
      g.textBaseline = 'alphabetic';
    }
  }

  /** Pitch against the local horizon, drawn as an artificial horizon. */
  private drawAttitude(g: CanvasRenderingContext2D, sim: Simulation, x: number, y: number, w: number, h: number, S: number): void {
    const s = sim.state;
    const up = normalize(s.r);
    const pitch = Math.asin(Math.max(-1, Math.min(1, dot(s.dir, up))));
    const ar = Math.min(w, h - 14 * S) * 0.42;
    const ax = x + w / 2;
    const ay = y + ar + 2 * S;
    g.save();
    g.beginPath(); g.arc(ax, ay, ar, 0, Math.PI * 2); g.clip();
    const horizonY = ay + Math.sin(pitch) * ar * 1.2;
    g.fillStyle = '#2f6aa8'; g.fillRect(ax - ar, ay - ar * 2, ar * 2, ar * 4);
    g.fillStyle = '#7a5230'; g.fillRect(ax - ar, horizonY, ar * 2, ar * 4);
    g.strokeStyle = '#fff'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(ax - ar, horizonY); g.lineTo(ax + ar, horizonY); g.stroke();
    for (let d = -60; d <= 60; d += 30) {
      const yy = ay + Math.sin(pitch - (d * Math.PI) / 180) * ar * 1.2;
      g.strokeStyle = 'rgba(255,255,255,0.55)';
      g.beginPath(); g.moveTo(ax - ar * 0.3, yy); g.lineTo(ax + ar * 0.3, yy); g.stroke();
    }
    g.restore();
    g.strokeStyle = '#8be5cd'; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(ax - ar * 0.55, ay); g.lineTo(ax - ar * 0.18, ay); g.lineTo(ax, ay + ar * 0.16); g.lineTo(ax + ar * 0.18, ay); g.lineTo(ax + ar * 0.55, ay);
    g.stroke();
    g.strokeStyle = '#3b4756'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(ax, ay, ar + 1.5, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#8ca0b5';
    g.font = `${Math.round(9 * S)}px ui-monospace, monospace`;
    g.textAlign = 'center';
    const label = `${t('ob.horizon')} ${((pitch * 180) / Math.PI).toFixed(0)}°`;
    g.fillText(OnboardOverlay.trim(g, label, w), ax, y + h - 2 * S);
  }

  private drawGMeter(g: CanvasRenderingContext2D, gLoad: number, x: number, y: number, w: number, h: number, S: number): void {
    const gl = Math.max(0, Math.min(8, gLoad));
    const gr = Math.min(w, (h - 14 * S) * 1.6) * 0.38;
    const gx = x + w / 2;
    const gy = y + gr + 8 * S;
    g.lineWidth = Math.max(4, 6 * S);
    g.strokeStyle = '#26303c';
    g.beginPath(); g.arc(gx, gy, gr, Math.PI, 2 * Math.PI); g.stroke();
    g.strokeStyle = gl > 5 ? '#ff6b6b' : gl > 3.5 ? '#efa47e' : '#8be5cd';
    g.beginPath(); g.arc(gx, gy, gr, Math.PI, Math.PI + (Math.PI * gl) / 8); g.stroke();
    g.fillStyle = '#fff';
    g.font = `600 ${Math.round(15 * S)}px "Space Grotesk", ui-monospace, monospace`;
    g.textAlign = 'center';
    g.fillText(`${gLoad.toFixed(1)} ${t('ob.gload')}`, gx, gy - 4 * S);
    g.fillStyle = '#8ca0b5';
    g.font = `${Math.round(9 * S)}px ui-monospace, monospace`;
    g.fillText('0     4     8', gx, gy + 12 * S);
  }

  private drawTile(g: CanvasRenderingContext2D, tile: Tile, x: number, y: number, w: number, h: number, S: number): void {
    g.fillStyle = '#0c1219';
    g.fillRect(x, y, w, h);
    g.strokeStyle = '#26303c';
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    const pad = Math.round(6 * S);
    g.textAlign = 'left';
    g.fillStyle = '#8ca0b5';
    g.font = `${Math.round(9 * S)}px ui-monospace, monospace`;
    g.fillText(OnboardOverlay.trim(g, tile.label, w - pad * 2), x + pad, y + Math.round(14 * S));
    g.fillStyle = '#a2eddc';
    g.font = `600 ${Math.round(19 * S)}px "Space Grotesk", ui-monospace, monospace`;
    g.fillText(OnboardOverlay.trim(g, tile.value, w - pad * 2), x + pad, y + h - Math.round(12 * S));
  }
}
