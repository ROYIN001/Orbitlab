/**
 * Illustrative onboard/crew view overlay drawn over the 3D window view:
 * cabin frame, attitude indicator, g-meter, altitude/velocity readouts.
 */
import type { Simulation } from '../physics/simulation';
import { t } from '../i18n';
import { eventText } from './hud';
import { dot, normalize, cross, norm, sub, scale } from '../physics/vec3';

export class OnboardOverlay {
  private canvas: HTMLCanvasElement;
  private lastEvent = '';
  private lastEventT = -1e9;

  /** Forget the cached (translated) event text, e.g. after a language change. */
  invalidate(): void {
    this.lastEventT = -1e9;
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  draw(sim: Simulation | null, crewed: boolean): void {
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
    // cabin wall with a porthole (shaded panels, cable ducts, bolted bezel)
    // porthole sized so that it (and its label) stays above the instrument panel
    const panelTop = H - 186;
    const cx = W * 0.5;
    const cy = Math.min(H * 0.40, (panelTop - 44) * 0.5);
    const r = Math.max(40, Math.min(Math.min(W, H * 0.8) * 0.36, panelTop - 44 - cy));
    const wall = g.createRadialGradient(cx, cy, r, cx, cy, Math.max(W, H));
    wall.addColorStop(0, '#1b2029');
    wall.addColorStop(0.35, '#12161d');
    wall.addColorStop(1, '#07090d');
    g.fillStyle = wall;
    g.beginPath();
    g.rect(0, 0, W, H);
    g.arc(cx, cy, r, 0, Math.PI * 2, true);
    g.fill();
    // panel seams and ducts on the wall
    g.strokeStyle = 'rgba(255,255,255,0.05)';
    g.lineWidth = 2;
    for (let x = 40; x < W; x += 160) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 60; y < H; y += 140) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.strokeStyle = 'rgba(120,140,170,0.18)';
    g.lineWidth = 6;
    g.beginPath(); g.moveTo(0, 30); g.lineTo(W, 30); g.stroke();
    // bezel: metallic ring with highlight
    const bezel = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    bezel.addColorStop(0, '#5c6474');
    bezel.addColorStop(0.5, '#262b35');
    bezel.addColorStop(1, '#4a5160');
    g.lineWidth = 18;
    g.strokeStyle = bezel;
    g.beginPath(); g.arc(cx, cy, r + 9, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.beginPath(); g.arc(cx, cy, r + 1, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#0a0c10';
    g.beginPath(); g.arc(cx, cy, r + 19, 0, Math.PI * 2); g.stroke();
    // bolts
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const bx = cx + Math.cos(a) * (r + 9), by = cy + Math.sin(a) * (r + 9);
      g.fillStyle = '#20242c'; g.beginPath(); g.arc(bx, by, 3.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#8b94a6'; g.beginPath(); g.arc(bx - 1, by - 1, 1.6, 0, Math.PI * 2); g.fill();
    }
    // window glare
    const grad = g.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.05)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    // label
    g.font = 'bold 12px system-ui, sans-serif';
    g.fillStyle = '#8d9bb5';
    g.textAlign = 'center';
    g.fillText(crewed ? t('ob.crew') : t('ob.camera'), cx, cy + r + 30);
    if (!sim) return;
    const s = sim.state;
    // instruments panel (kept above the playback controls)
    const py = H - 176;
    const panel = g.createLinearGradient(0, py - 10, 0, py + 96);
    panel.addColorStop(0, 'rgba(34,39,50,0.97)');
    panel.addColorStop(1, 'rgba(16,19,26,0.97)');
    g.fillStyle = panel;
    g.fillRect(0, py - 10, W, 106);
    g.strokeStyle = '#3a4050'; g.lineWidth = 1;
    g.strokeRect(0.5, py - 9.5, W - 1, 105);
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    g.beginPath(); g.moveTo(0, py - 9); g.lineTo(W, py - 9); g.stroke();
    // attitude indicator (pitch vs local horizon)
    const up = normalize(s.r);
    const pitch = Math.asin(Math.max(-1, Math.min(1, dot(s.dir, up))));
    const ax = 80, ay = py + 40, ar = 36;
    g.save();
    g.beginPath(); g.arc(ax, ay, ar, 0, Math.PI * 2); g.clip();
    const horizonY = ay + Math.sin(pitch) * ar * 1.2;
    g.fillStyle = '#3b7dd8'; g.fillRect(ax - ar, ay - ar * 2, ar * 2, ar * 4);
    g.fillStyle = '#8b5a2b'; g.fillRect(ax - ar, horizonY, ar * 2, ar * 4);
    g.strokeStyle = '#fff'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(ax - ar, horizonY); g.lineTo(ax + ar, horizonY); g.stroke();
    for (let d = -60; d <= 60; d += 30) {
      const yy = ay + Math.sin(pitch - d * Math.PI / 180) * ar * 1.2;
      g.strokeStyle = 'rgba(255,255,255,0.6)';
      g.beginPath(); g.moveTo(ax - 10, yy); g.lineTo(ax + 10, yy); g.stroke();
    }
    g.restore();
    g.strokeStyle = '#f2b134'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(ax - 18, ay); g.lineTo(ax - 6, ay); g.lineTo(ax, ay + 5); g.lineTo(ax + 6, ay); g.lineTo(ax + 18, ay); g.stroke();
    g.strokeStyle = '#4a5160'; g.lineWidth = 2; g.beginPath(); g.arc(ax, ay, ar + 2, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#8d9bb5'; g.font = '10px ui-monospace, monospace'; g.textAlign = 'center';
    g.fillText(`${t('ob.horizon')} ${(pitch * 180 / Math.PI).toFixed(0)}°`, ax, ay + ar + 16);
    // g-meter
    const gx = 190, gy = py + 48, gr = 34;
    const gl = Math.min(8, s.gLoad);
    g.strokeStyle = '#3a4050'; g.lineWidth = 6;
    g.beginPath(); g.arc(gx, gy, gr, Math.PI, 2 * Math.PI); g.stroke();
    g.strokeStyle = gl > 5 ? '#ff5d5d' : gl > 3.5 ? '#ffb347' : '#4cd97b';
    g.beginPath(); g.arc(gx, gy, gr, Math.PI, Math.PI + (Math.PI * gl) / 8); g.stroke();
    g.fillStyle = '#fff'; g.font = 'bold 16px ui-monospace, monospace';
    g.fillText(`${s.gLoad.toFixed(1)} ${t('ob.gload')}`, gx, gy - 4);
    g.fillStyle = '#8d9bb5'; g.font = '10px ui-monospace, monospace';
    g.fillText('0        4        8', gx, gy + 14);
    // digital readouts
    const items: [string, string][] = [
      [t('ob.alt'), (s.altitude / 1000).toFixed(1)],
      [t('ob.vel'), s.speed.toFixed(0)],
      [t('ob.stage'), sim.vehicle.active ? String(sim.vehicle.active.index + 1) : '—'],
      [t('ob.throttle'), `${(s.throttle * 100).toFixed(0)}%`],
    ];
    // readouts laid out from the available width: one row of four boxes, or a 2×2 grid when narrow
    const x0 = 260;
    const avail = W - x0 - 10;
    const twoRows = avail < 4 * 66;
    const cols = twoRows ? 2 : 4;
    const bw = Math.max(54, Math.min(92, avail / cols - 8));
    const bh = twoRows ? 27 : 58;
    items.forEach(([k, v], i) => {
      const bx = x0 + (i % cols) * (bw + 8);
      const by = py + 6 + Math.floor(i / cols) * (bh + 4);
      g.fillStyle = '#0a0d12'; g.fillRect(bx, by, bw, bh);
      g.strokeStyle = '#3a4050'; g.strokeRect(bx + 0.5, by + 0.5, bw, bh);
      g.fillStyle = '#8d9bb5'; g.font = `${twoRows ? 9 : 10}px ui-monospace, monospace`; g.textAlign = 'left';
      g.fillText(k, bx + 5, by + (twoRows ? 10 : 14));
      g.shadowColor = 'rgba(127,224,255,0.8)'; g.shadowBlur = 10;
      g.fillStyle = '#7fe0ff'; g.font = `bold ${twoRows ? 14 : 20}px ui-monospace, monospace`;
      g.fillText(v, bx + 5, by + (twoRows ? 23 : 42));
      g.shadowBlur = 0;
    });
    // caution/event lamp on its own line under the readouts
    const last = sim.events[sim.events.length - 1];
    if (last && last.t !== this.lastEventT) { this.lastEvent = eventText(last); this.lastEventT = last.t; }
    if (last && s.t - last.t < 12) {
      const blink = Math.floor(s.t * 3) % 2 === 0 || last.severity !== 'fail';
      g.fillStyle = last.severity === 'fail' ? (blink ? '#ff5d5d' : '#5a1a1a') : last.severity === 'warn' ? '#ffb347' : '#4cd97b';
      g.fillRect(x0, py + 72, 8, 16);
      g.fillStyle = '#dbe3f0'; g.font = '11px system-ui, sans-serif'; g.textAlign = 'left';
      let txt = this.lastEvent;
      const maxW = W - x0 - 26;
      while (txt.length > 4 && g.measureText(txt).width > maxW) txt = txt.slice(0, -2);
      g.fillText(txt === this.lastEvent ? txt : txt + '…', x0 + 14, py + 84);
    }
    // vibration hint: velocity vector arrow in the porthole is provided by the 3D view
    void cross; void norm; void sub; void scale;
  }
}
