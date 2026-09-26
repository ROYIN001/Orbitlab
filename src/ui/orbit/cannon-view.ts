/**
 * Newton's cannon (roadmap O01), drawn the way Newton drew it in *A Treatise
 * of the System of the World* (1728): the Earth, a mountain above the air,
 * and a cannon on it firing sideways ever faster, until the ball falls all
 * the way round and never lands. The paths are the exact conics of
 * `newtonsCannon` (src/orbit/kepler.ts) and the ball moves along them at its
 * real pace, sped up by the playground's warp — slow at the top of its arc,
 * fast at the bottom, as Kepler's second law says.
 *
 * The Earth and the paths are to scale; the mountain is too, but never drawn
 * smaller than a few pixels, so it can be seen.
 */
import { R_EARTH } from '../../physics/constants';
import { newtonsCannon, type CannonShot } from '../../orbit/kepler';

/** How many earlier shots stay on the drawing, fading. */
const HISTORY = 6;
const SHOT_COLORS: Record<CannonShot['outcome'], string> = { impact: '#efa47e', orbit: '#8be5cd', escape: '#c3a6ff' };

/** Where the ball is `clock` seconds after the shot: its point on the path, and whether it has landed. */
export function ballAt(shot: CannonShot, clock: number): { x: number; y: number; done: boolean } {
  const times = shot.times, end = times[times.length - 1] ?? 0;
  if (times.length < 2 || end <= 0) return { ...shot.path[0], done: true };
  let tau = clock;
  if (shot.outcome === 'orbit') tau = ((clock % end) + end) % end;
  else if (tau >= end) return { ...shot.path[shot.path.length - 1], done: true };
  if (tau <= 0) return { ...shot.path[0], done: false };
  let lo = 0, hi = times.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= tau) lo = mid; else hi = mid;
  }
  const f = (tau - times[lo]) / (times[hi] - times[lo] || 1);
  const a = shot.path[lo], b = shot.path[hi];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, done: false };
}

/**
 * The part of the drawing to show, m: the box round the path and the
 * mountain's peak, padded, at least a third of an Earth radius across so the
 * ground's curve shows, and the whole Earth once the path reaches round the
 * back of it.
 */
export function framing(path: readonly { x: number; y: number }[], peak: number): { x: number; y: number; half: number } {
  let x0 = -0.05 * R_EARTH, x1 = 0.05 * R_EARTH, y0 = peak, y1 = peak;
  for (const p of path) {
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
  }
  if (y0 < 0.3 * R_EARTH) {
    // round the back: the whole Earth, and all of the path
    const far = Math.max(R_EARTH, ...path.map((p) => Math.hypot(p.x, p.y)));
    return { x: 0, y: 0, half: Math.min(4 * R_EARTH, far * 1.08) };
  }
  const half = Math.min(4 * R_EARTH, Math.max(0.18 * R_EARTH, 0.62 * Math.max(x1 - x0, y1 - y0)));
  return { x: (x0 + x1) / 2, y: Math.max((y0 + y1) / 2, peak - 0.6 * half), half };
}

export class CannonView {
  private shots: CannonShot[] = [];
  private altitude = 100e3;
  private elevation = 0;
  /** what the drawing shows, m about the Earth's centre, eased towards what the latest shot needs */
  private frame = { x: 0, y: 0, half: 1.3 * R_EARTH };

  constructor(private readonly canvas: HTMLCanvasElement) {}

  get latest(): CannonShot | null {
    return this.shots[this.shots.length - 1] ?? null;
  }

  /** The mountain and the barrel, before any shot. */
  aim(altitude: number, elevation: number): void {
    if (altitude !== this.altitude) this.shots = [];
    this.altitude = altitude;
    this.elevation = elevation;
  }

  fire(speed: number): CannonShot {
    const shot = newtonsCannon(this.altitude, speed, this.elevation);
    this.shots.push(shot);
    if (this.shots.length > HISTORY) this.shots.shift();
    return shot;
  }

  clear(): void {
    this.shots = [];
  }

  /** Draw, the latest ball `clock` seconds into its flight; `dt` s of screen time eases the zoom. */
  draw(clock: number, dt = 1): void {
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

    // the zoom: the latest path and the mountain in view — a short shot close up, over the curve of
    // the ground; one that goes round, the whole Earth; never more than four radii out
    const latest = this.latest;
    const want = framing(latest?.path ?? [], R_EARTH + this.altitude);
    const k = Math.min(1, dt * 4);
    this.frame.x += (want.x - this.frame.x) * k;
    this.frame.y += (want.y - this.frame.y) * k;
    this.frame.half += (want.half - this.frame.half) * k;
    const scale = (Math.min(W, H) / 2 - 12) / this.frame.half;
    const cx = W / 2 - this.frame.x * scale, cy = H / 2 + this.frame.y * scale;
    const px = (p: { x: number; y: number }): [number, number] => [cx + p.x * scale, cy - p.y * scale];

    // the Earth, and a hair of atmosphere
    const re = R_EARTH * scale;
    const body = g.createRadialGradient(cx - re * 0.3, cy - re * 0.4, re * 0.1, cx, cy, re);
    body.addColorStop(0, '#2d5d86');
    body.addColorStop(1, '#10263a');
    g.fillStyle = body;
    g.beginPath(); g.arc(cx, cy, re, 0, 2 * Math.PI); g.fill();
    g.strokeStyle = 'rgba(110, 200, 255, 0.45)';
    g.lineWidth = Math.max(1, 100e3 * scale);
    g.beginPath(); g.arc(cx, cy, re + g.lineWidth / 2, 0, 2 * Math.PI); g.stroke();

    // the mountain, and the cannon on its peak aimed along the shot
    const peak = Math.max(this.altitude * scale, 6);
    const half = Math.max(0.018, Math.min(0.12, (peak / re) * 1.4));
    g.fillStyle = '#6d7d6a';
    g.beginPath();
    g.moveTo(cx + re * Math.sin(-half), cy - re * Math.cos(-half));
    g.lineTo(cx, cy - re - peak);
    g.lineTo(cx + re * Math.sin(half), cy - re * Math.cos(half));
    g.closePath();
    g.fill();
    g.save();
    g.translate(cx, cy - re - peak);
    g.rotate(-this.elevation);
    g.fillStyle = '#d7dee6';
    g.fillRect(-3, -4, 16, 6);
    g.restore();

    // the shots: the earlier ones whole and faded, the latest as far as the ball has got
    this.shots.forEach((shot, k) => {
      const isLatest = k === this.shots.length - 1;
      const alpha = isLatest ? 1 : 0.25 + 0.45 * (k / Math.max(1, this.shots.length - 1));
      g.globalAlpha = alpha;
      g.strokeStyle = SHOT_COLORS[shot.outcome];
      g.lineWidth = isLatest ? 2.2 : 1.4;
      g.beginPath();
      const upTo = isLatest && shot.outcome !== 'orbit' ? clock : Infinity;
      shot.path.forEach((p, j) => {
        if (shot.times[j] > upTo) return;
        const [x, y] = px(p);
        if (j === 0) g.moveTo(x, y); else g.lineTo(x, y);
      });
      if (isLatest && upTo !== Infinity) { const b = ballAt(shot, clock); const [x, y] = px(b); g.lineTo(x, y); }
      g.stroke();
      // where it came down
      if (shot.outcome === 'impact' && (!isLatest || ballAt(shot, clock).done)) {
        const [x, y] = px(shot.path[shot.path.length - 1]);
        g.strokeStyle = '#ff6b6b';
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(x - 4, y - 4); g.lineTo(x + 4, y + 4); g.moveTo(x + 4, y - 4); g.lineTo(x - 4, y + 4); g.stroke();
      }
    });
    g.globalAlpha = 1;
    if (latest) {
      const b = ballAt(latest, clock);
      if (!(b.done && latest.outcome === 'escape')) {
        const [x, y] = px(b);
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(x, y, 4.5, 0, 2 * Math.PI); g.fill();
      }
    }
  }
}
