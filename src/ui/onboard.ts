/**
 * Illustrative onboard/crew view overlay drawn over the 3D window view:
 * cabin frame, attitude indicator, g-meter, altitude/velocity readouts.
 */
import type { Simulation } from '../physics/simulation';
import { t } from '../i18n';
import { dot, normalize, cross, norm, sub, scale } from '../physics/vec3';

export class OnboardOverlay {
  private canvas: HTMLCanvasElement;
  private lastEvent = '';
  private lastEventT = -1e9;

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
    // cabin frame with a porthole
    const cx = W * 0.5, cy = H * 0.40, r = Math.min(W, H * 0.8) * 0.36;
    g.fillStyle = '#0f1218';
    g.beginPath();
    g.rect(0, 0, W, H);
    g.arc(cx, cy, r, 0, Math.PI * 2, true);
    g.fill();
    // porthole rim
    g.lineWidth = 14;
    g.strokeStyle = '#2a2f3a';
    g.beginPath(); g.arc(cx, cy, r + 7, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 3;
    g.strokeStyle = '#4a5160';
    g.beginPath(); g.arc(cx, cy, r + 15, 0, Math.PI * 2); g.stroke();
    // bolts
    g.fillStyle = '#6a7080';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath(); g.arc(cx + Math.cos(a) * (r + 15), cy + Math.sin(a) * (r + 15), 3, 0, Math.PI * 2); g.fill();
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
    g.fillStyle = 'rgba(20,24,32,0.95)';
    g.fillRect(0, py - 10, W, 106);
    g.strokeStyle = '#3a4050'; g.lineWidth = 1;
    g.strokeRect(0.5, py - 9.5, W - 1, 105);
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
      [t('ob.stage'), String((sim.vehicle.active?.index ?? 0) + 1)],
      [t('ob.throttle'), `${(s.throttle * 100).toFixed(0)}%`],
    ];
    let ix = 260;
    for (const [k, v] of items) {
      g.fillStyle = '#0a0d12'; g.fillRect(ix, py + 6, 92, 58);
      g.strokeStyle = '#3a4050'; g.strokeRect(ix + 0.5, py + 6.5, 92, 58);
      g.fillStyle = '#8d9bb5'; g.font = '10px ui-monospace, monospace'; g.textAlign = 'left';
      g.fillText(k, ix + 6, py + 20);
      g.fillStyle = '#7fe0ff'; g.font = 'bold 20px ui-monospace, monospace';
      g.fillText(v, ix + 6, py + 48);
      ix += 100;
    }
    // caution/event lamp
    const last = sim.events[sim.events.length - 1];
    if (last && last.t !== this.lastEventT) { this.lastEvent = t(last.key, last.params); this.lastEventT = last.t; }
    if (last && s.t - last.t < 12) {
      const blink = Math.floor(s.t * 3) % 2 === 0 || last.severity !== 'fail';
      g.fillStyle = last.severity === 'fail' ? (blink ? '#ff5d5d' : '#5a1a1a') : last.severity === 'warn' ? '#ffb347' : '#4cd97b';
      g.fillRect(ix + 10, py + 6, 10, 58);
      g.fillStyle = '#dbe3f0'; g.font = '11px system-ui, sans-serif'; g.textAlign = 'left';
      g.fillText(this.lastEvent.slice(0, 60), ix + 28, py + 40);
    }
    // vibration hint: velocity vector arrow in the porthole is provided by the 3D view
    void cross; void norm; void sub; void scale;
  }
}
