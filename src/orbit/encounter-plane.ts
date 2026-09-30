/**
 * The encounter plane of a close approach, drawn (roadmap P2.5, for M01):
 * the plane square to the relative velocity at the closest approach, where
 * the two-dimensional probability of collision is worked out
 * (src/orbit/conjunction.ts). In it the second object is a point at the miss
 * distance, the pair's combined size a circle round it, and the combined
 * position uncertainty an ellipse round the first object — the picture
 * operators read a conjunction from: the probability is the ellipse's share
 * of the circle.
 *
 * DOM-free: the figure is an SVG string the page and the worksheets use alike.
 * tests/conjunction.test.ts holds the plane to the probability's own.
 */
import { v3, type Vec3 } from '../physics/vec3';
import type { Mat3, PosVel } from './conjunction';

export interface EncounterPlane {
  /** the second object's position in the plane, m: x along the miss, y square to it */
  miss: { x: number; y: number };
  /** the combined uncertainty's standard deviations along its principal axes, m (larger first) */
  sigma: [number, number];
  /** the larger axis's angle from x, rad */
  angle: number;
  /** the combined radius, m */
  radius: number;
}

const sub = (p: Vec3, q: Vec3): Vec3 => v3(p.x - q.x, p.y - q.y, p.z - q.z);
const dot = (p: Vec3, q: Vec3): number => p.x * q.x + p.y * q.y + p.z * q.z;
const cross = (p: Vec3, q: Vec3): Vec3 => v3(p.y * q.z - p.z * q.y, p.z * q.x - p.x * q.z, p.x * q.y - p.y * q.x);
const unit = (p: Vec3): Vec3 => { const n = Math.hypot(p.x, p.y, p.z); return v3(p.x / n, p.y / n, p.z / n); };
const quad = (C: Mat3, u: Vec3, w: Vec3): number => {
  const a = [u.x, u.y, u.z], b = [w.x, w.y, w.z];
  let s = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += a[i] * C[i][j] * b[j];
  return s;
};

/** The plane of an encounter from both states (one frame) and covariances (that frame, m²). */
export function encounterPlane(a: PosVel, covA: Mat3, b: PosVel, covB: Mat3, radius: number): EncounterPlane {
  const d = sub(b.r, a.r), along = unit(sub(b.v, a.v));
  let inPlane = sub(d, v3(along.x * dot(d, along), along.y * dot(d, along), along.z * dot(d, along)));
  if (Math.hypot(inPlane.x, inPlane.y, inPlane.z) < 1e-9) inPlane = cross(along, Math.abs(along.x) < 0.9 ? v3(1, 0, 0) : v3(0, 1, 0));
  const X = unit(inPlane), Y = unit(cross(along, X));
  const C = [0, 1, 2].map((i) => [0, 1, 2].map((j) => covA[i][j] + covB[i][j])) as Mat3;
  const sxx = quad(C, X, X), sxy = quad(C, X, Y), syy = quad(C, Y, Y);
  // the 2 × 2 covariance's eigenvalues and the larger one's direction
  const mean = (sxx + syy) / 2, diff = Math.hypot((sxx - syy) / 2, sxy);
  return {
    miss: { x: dot(d, X), y: dot(d, Y) },
    sigma: [Math.sqrt(Math.max(0, mean + diff)), Math.sqrt(Math.max(0, mean - diff))],
    angle: 0.5 * Math.atan2(2 * sxy, sxx - syy),
    radius,
  };
}

export interface PlaneLabels {
  /** the first object, the second, "1σ", "3σ", and the combined radius's name */
  first: string;
  second: string;
  scale: string;
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The plane as an SVG, `size` px square: the uncertainty's 1σ and 3σ
 * ellipses round the first object, the second object and its circle of the
 * combined radius, a scale bar. The view spans whichever is larger, the miss
 * or the 3σ ellipse; a combined radius too small to see is drawn as a ring
 * of a few pixels, and says so by its dashed edge.
 */
/** The page's colours, dark, and paper's (P2.5: the case worksheets); the ellipses' blue is recoloured by the worksheets' own print pass. */
const INK = {
  screen: { ground: '#05080d', axis: 'rgba(255,255,255,0.12)', first: '#ffffff', text: '#b8c5d3', second: '#ff8a65', secondText: '#ffb199' },
  paper: { ground: '#ffffff', axis: '#d1d5db', first: '#111827', text: '#374151', second: '#ea580c', secondText: '#c2410c' },
};

export function encounterPlaneSvg(p: EncounterPlane, labels: PlaneLabels, size = 280, paper = false): string {
  const c = paper ? INK.paper : INK.screen;
  const reach = Math.max(Math.hypot(p.miss.x, p.miss.y) * 1.25, 3.3 * p.sigma[0], p.radius * 3);
  const k = (size / 2 - 14) / reach;
  const cx = size / 2, cy = size / 2;
  const px = (x: number) => cx + x * k, py = (y: number) => cy - y * k;
  const deg = (-p.angle * 180) / Math.PI;
  const ell = (n: number, dash: string) => `<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(0.5, n * p.sigma[0] * k).toFixed(2)}" ry="${Math.max(0.5, n * p.sigma[1] * k).toFixed(2)}" transform="rotate(${deg.toFixed(2)} ${cx} ${cy})" fill="none" stroke="#6ec8ff" stroke-width="1.4"${dash}/>`;
  const rpx = p.radius * k, tiny = rpx < 3;
  // Name the 3σ ellipse at the end of its major axis away from the
  // second object: otherwise its name can cover this short label.
  const majorX = 3 * p.sigma[0] * k * Math.cos(p.angle), majorY = -3 * p.sigma[0] * k * Math.sin(p.angle);
  const labelSide = majorX * p.miss.x - majorY * p.miss.y >= 0 ? -1 : 1;
  const labelLeft = labelSide * majorX < 0;
  const sigmaX = Math.max(labelLeft ? 30 : 8, Math.min(size - (labelLeft ? 8 : 30), cx + labelSide * majorX + (labelLeft ? -4 : 4)));
  const sigmaY = Math.max(31, Math.min(size - 32, cy + labelSide * majorY + (labelSide * majorY >= 0 ? 14 : -6)));
  // a scale bar of a round length about a quarter of the view
  const raw = reach / 2, mag = 10 ** Math.floor(Math.log10(raw)), bar = [1, 2, 5, 10].map((m) => m * mag).filter((v) => v <= raw).pop() ?? mag;
  const barText = bar >= 1000 ? `${bar / 1000} km` : `${bar} m`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" font-family="system-ui, sans-serif" font-size="11">`
    + `<rect width="${size}" height="${size}" fill="${c.ground}"/>`
    + `<line x1="${cx}" y1="8" x2="${cx}" y2="${size - 8}" stroke="${c.axis}"/><line x1="8" y1="${cy}" x2="${size - 8}" y2="${cy}" stroke="${c.axis}"/>`
    + ell(3, ' stroke-dasharray="4 3" opacity="0.7"') + ell(1, '')
    + `<text x="${sigmaX.toFixed(1)}" y="${sigmaY.toFixed(1)}" text-anchor="${labelLeft ? 'end' : 'start'}" fill="#6ec8ff">3σ</text>`
    + `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${c.first}"/><text x="${cx + 6}" y="${cy + 14}" fill="${c.text}">${esc(labels.first)}</text>`
    + `<circle cx="${px(p.miss.x).toFixed(2)}" cy="${py(p.miss.y).toFixed(2)}" r="${Math.max(3, rpx).toFixed(2)}" fill="rgba(255,138,101,0.35)" stroke="${c.second}" stroke-width="1.4"${tiny ? ' stroke-dasharray="2 2"' : ''}/>`
    // the second object's name beside it, or above and to its left near the right edge
    + (px(p.miss.x) > size * 0.6
      ? `<text x="${(px(p.miss.x) + Math.max(3, rpx)).toFixed(1)}" y="${(py(p.miss.y) - Math.max(3, rpx) - 6).toFixed(1)}" text-anchor="end" fill="${c.secondText}">${esc(labels.second)}</text>`
      : `<text x="${(px(p.miss.x) + Math.max(3, rpx) + 4).toFixed(1)}" y="${(py(p.miss.y) - 4).toFixed(1)}" fill="${c.secondText}">${esc(labels.second)}</text>`)
    + `<line x1="12" y1="${size - 14}" x2="${(12 + bar * k).toFixed(1)}" y2="${size - 14}" stroke="${c.text}" stroke-width="2"/><text x="12" y="${size - 20}" fill="${c.text}">${esc(barText)}</text>`
    + `<text x="${size - 12}" y="18" text-anchor="end" fill="${c.text}">${esc(labels.scale)}</text>`
    + '</svg>';
}
