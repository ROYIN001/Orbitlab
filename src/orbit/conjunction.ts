/**
 * Close approaches between two objects in orbit (roadmap M01): when they come
 * closest, how close, how fast they pass, and — given how uncertain each
 * position is — the probability that they collide.
 *
 * - **The search** samples the range between the two every `step` seconds and
 *   refines each local minimum by golden section to 0.1 ms. Near an
 *   encounter the relative motion is a straight line, so the range there is
 *   √(d² + v²t²): a sample within half a step of the true closest approach is
 *   at most v·step/2 farther, and a minimum sampled farther than the limit
 *   plus that is not refined. A pair whose radial bands (perigee to apogee)
 *   are farther apart than the limit never meets and is not searched (the
 *   apogee–perigee filter of Hoots, Crawford and Roehrich, *Celestial
 *   Mechanics* 33, 1984).
 * - **The probability** is the usual two-dimensional one (Foster and Estes,
 *   NASA JSC-25898, 1992; Chan, *Spacecraft Collision Probability*, 2008):
 *   at the closest approach the encounter is so fast that the relative motion
 *   is a straight line and the two uncertainties do not change along it, so
 *   the probability is the mass of the combined position uncertainty,
 *   projected on the plane square to the relative velocity, within a circle
 *   of the two objects' combined radius around the other object. It is
 *   integrated numerically, in logarithms so that a probability of 1e-50 is
 *   still a number.
 * - **The frames**: each object's uncertainty is given, as in a conjunction
 *   data message, in its own radial, transverse (along-track), normal axes,
 *   the normal along the angular momentum of its *inertial* orbit
 *   (CCSDS 508.0-B-1, the Conjunction Data Message).
 *
 * DOM-free; tests/conjunction.test.ts holds it to a constructed encounter and
 * to the Iridium 33–Cosmos 2251 collision of 2009 February 10 as its
 * conjunction data were published.
 */
import { OMEGA_EARTH } from '../physics/constants';
import { v3, type Vec3 } from '../physics/vec3';

/** Position and velocity, m and m/s, in one frame for both objects. */
export interface PosVel { r: Vec3; v: Vec3 }
/** Where an object is at a Julian date; null where it cannot be placed. */
export type Ephemeris = (jd: number) => PosVel | null;

export interface Approach {
  /** Julian date (UTC) of the closest approach */
  tca: number;
  /** miss distance, m */
  miss: number;
  /** relative speed, m/s */
  speed: number;
  /** the second object's offset in the first's radial, transverse (along-track) and normal axes, m */
  rtn: { radial: number; along: number; cross: number };
  /** both states at the closest approach */
  a: PosVel;
  b: PosVel;
}

const sub = (p: Vec3, q: Vec3): Vec3 => v3(p.x - q.x, p.y - q.y, p.z - q.z);
const dot = (p: Vec3, q: Vec3): number => p.x * q.x + p.y * q.y + p.z * q.z;
const cross = (p: Vec3, q: Vec3): Vec3 => v3(p.y * q.z - p.z * q.y, p.z * q.x - p.x * q.z, p.x * q.y - p.y * q.x);
const norm = (p: Vec3): number => Math.hypot(p.x, p.y, p.z);
const unit = (p: Vec3): Vec3 => { const n = norm(p); return v3(p.x / n, p.y / n, p.z / n); };

/** Radial, transverse and normal unit vectors of an orbit, from an inertial state. */
export function rtnAxes(s: PosVel): [Vec3, Vec3, Vec3] {
  const R = unit(s.r);
  const N = unit(cross(s.r, s.v));
  return [R, cross(N, R), N];
}

/**
 * An Earth-fixed state's velocity as seen from the inertial frame at the same
 * instant, v + ω × r: what an orbit's axes are defined from when its state is
 * given Earth-fixed (a conjunction data message in ITRF).
 */
export function inertialVelocity(s: PosVel): PosVel {
  return { r: s.r, v: v3(s.v.x - OMEGA_EARTH * s.r.y, s.v.y + OMEGA_EARTH * s.r.x, s.v.z) };
}

const PHI = (Math.sqrt(5) - 1) / 2;
const MS = 1e-4 / 86400;

/** The two objects' range and states at `jd`; null where either cannot be placed. */
function between(a: Ephemeris, b: Ephemeris, jd: number): { range: number; speed: number; a: PosVel; b: PosVel } | null {
  const sa = a(jd), sb = b(jd);
  if (!sa || !sb) return null;
  return { range: norm(sub(sb.r, sa.r)), speed: norm(sub(sb.v, sa.v)), a: sa, b: sb };
}

/**
 * Every closest approach of `b` to `a` between Julian dates `jd0` and `jd1`
 * nearer than `within` m, in time order. `step` (s) must be well under the
 * shorter of the two orbits' periods; the default suits low orbits.
 */
export function closeApproaches(a: Ephemeris, b: Ephemeris, jd0: number, jd1: number, within: number, step = 60): Approach[] {
  const dt = step / 86400;
  const n = Math.max(2, Math.ceil((jd1 - jd0) / dt));
  const ts: number[] = [], rs: number[] = [], vs: number[] = [];
  for (let k = 0; k <= n; k++) {
    const jd = Math.min(jd1, jd0 + k * dt);
    const s = between(a, b, jd);
    ts.push(jd); rs.push(s ? s.range : Infinity); vs.push(s ? s.speed : 0);
  }
  const range = (jd: number): number => between(a, b, jd)?.range ?? Infinity;
  const out: Approach[] = [];
  for (let k = 0; k <= n; k++) {
    const left = k > 0 ? rs[k - 1] : Infinity, right = k < n ? rs[k + 1] : Infinity;
    if (!(rs[k] <= left && rs[k] < right) || !Number.isFinite(rs[k])) continue;
    if (rs[k] > within + (vs[k] * step) / 2) continue;
    // golden section on the range between the neighbouring samples
    let lo = ts[Math.max(0, k - 1)], hi = ts[Math.min(n, k + 1)];
    let x1 = hi - PHI * (hi - lo), x2 = lo + PHI * (hi - lo);
    let f1 = range(x1), f2 = range(x2);
    while (hi - lo > MS) {
      if (f1 < f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - PHI * (hi - lo); f1 = range(x1); }
      else { lo = x1; x1 = x2; f1 = f2; x2 = lo + PHI * (hi - lo); f2 = range(x2); }
    }
    const tca = (lo + hi) / 2;
    const s = between(a, b, tca);
    if (!s || s.range > within) continue;
    // an approach at the window's edge is still coming closer (or has been): not a closest approach
    if ((k === 0 && tca - jd0 < 2 * MS) || (k === n && jd1 - tca < 2 * MS)) continue;
    const d = sub(s.b.r, s.a.r);
    const [R, T, N] = rtnAxes(s.a);
    out.push({ tca, miss: s.range, speed: s.speed, rtn: { radial: dot(d, R), along: dot(d, T), cross: dot(d, N) }, a: s.a, b: s.b });
  }
  return out;
}

// ─── the probability of collision ───────────────────────────────────────────

/** A symmetric 3 × 3 matrix, row by row. */
export type Mat3 = [[number, number, number], [number, number, number], [number, number, number]];

/** A covariance given in an orbit's radial, transverse, normal axes, turned into the frame its state is in. */
export function rtnToFrame(cov: Mat3, axes: [Vec3, Vec3, Vec3]): Mat3 {
  const M = [axes[0], axes[1], axes[2]].map((u) => [u.x, u.y, u.z]); // rows: R, T, N in the frame
  const out: Mat3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  // C_frame = Mᵀ C M
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let s = 0;
    for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) s += M[p][i] * cov[p][q] * M[q][j];
    out[i][j] = s;
  }
  return out;
}

const quad = (C: Mat3, u: Vec3, w: Vec3): number => {
  const a = [u.x, u.y, u.z], b = [w.x, w.y, w.z];
  let s = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += a[i] * C[i][j] * b[j];
  return s;
};

/** Gauss–Legendre nodes and weights on [0, 1]. */
function gaussLegendre(n: number): { x: number[]; w: number[] } {
  const x: number[] = [], w: number[] = [];
  for (let i = 1; i <= n; i++) {
    let z = Math.cos(Math.PI * (i - 0.25) / (n + 0.5)), dp = 0;
    for (let it = 0; it < 100; it++) {
      let p0 = 1, p1 = z;
      for (let k = 2; k <= n; k++) { const p2 = ((2 * k - 1) * z * p1 - (k - 1) * p0) / k; p0 = p1; p1 = p2; }
      dp = (n * (z * p1 - p0)) / (z * z - 1);
      const dz = p1 / dp;
      z -= dz;
      if (Math.abs(dz) < 1e-15) break;
    }
    x.push((1 - z) / 2); w.push(1 / ((1 - z * z) * dp * dp));
  }
  return { x, w };
}
const GL = gaussLegendre(48);

export interface Probability {
  /** the probability, 0 to 1 (0 where it is below what a double can hold) */
  pc: number;
  /** its base-10 logarithm, finite however small */
  log10: number;
  /** the miss distance and the combined uncertainty in the encounter plane: its two standard deviations, m */
  miss: number;
  sigma: [number, number];
}

/**
 * The two-dimensional probability of collision at a closest approach: the
 * states of both (one frame, m and m/s), each one's position covariance in
 * that frame (m²), and the radius of a sphere holding both objects (m).
 */
export function collisionProbability(a: PosVel, covA: Mat3, b: PosVel, covB: Mat3, radius: number): Probability {
  const d = sub(b.r, a.r), vr = sub(b.v, a.v);
  const along = unit(vr);
  // the encounter plane: square to the relative velocity; x along the miss (any direction for a hit)
  let inPlane = sub(d, v3(along.x * dot(d, along), along.y * dot(d, along), along.z * dot(d, along)));
  if (norm(inPlane) < 1e-9) inPlane = cross(along, Math.abs(along.x) < 0.9 ? v3(1, 0, 0) : v3(0, 1, 0));
  const X = unit(inPlane), Y = unit(cross(along, X));
  const C: Mat3 = [0, 1, 2].map((i) => [0, 1, 2].map((j) => covA[i][j] + covB[i][j])) as Mat3;
  const sxx = quad(C, X, X), sxy = quad(C, X, Y), syy = quad(C, Y, Y);
  const det = sxx * syy - sxy * sxy;
  const ixx = syy / det, ixy = -sxy / det, iyy = sxx / det;
  const mx = dot(d, X);
  // polar quadrature about the other object: Gauss–Legendre in radius, the trapezoid (exact for a periodic integrand) in angle
  const NT = 128, logs: number[] = [];
  for (let i = 0; i < GL.x.length; i++) {
    const rho = GL.x[i] * radius;
    for (let j = 0; j < NT; j++) {
      const th = (2 * Math.PI * j) / NT;
      const px = rho * Math.cos(th) - mx, py = rho * Math.sin(th);
      const q = ixx * px * px + 2 * ixy * px * py + iyy * py * py;
      logs.push(Math.log(GL.w[i] * radius * rho * (2 * Math.PI / NT)) - q / 2);
    }
  }
  const top = Math.max(...logs);
  const sum = logs.reduce((s, l) => s + Math.exp(l - top), 0);
  const ln = top + Math.log(sum) - Math.log(2 * Math.PI * Math.sqrt(det));
  // the combined uncertainty's axes in the plane
  const tr = sxx + syy, disc = Math.sqrt(Math.max(0, (sxx - syy) ** 2 / 4 + sxy * sxy));
  return {
    pc: Math.min(1, Math.exp(ln)), log10: Math.min(0, ln / Math.LN10), miss: norm(d),
    sigma: [Math.sqrt(tr / 2 + disc), Math.sqrt(Math.max(0, tr / 2 - disc))],
  };
}
