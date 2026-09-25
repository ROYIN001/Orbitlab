/**
 * The long-term propagator (roadmap P07): an orbit carried forward for days
 * to decades under `forces.ts`, until the horizon or until the atmosphere
 * takes the satellite. A module on its own — G07's rendezvous and C05's lunar
 * transfer are meant to call it too — and independent of the ascent: nothing
 * in the flight imports it, so with it unused every flight is what it was.
 *
 * Two ways to carry the orbit:
 *
 * - **Cowell** (`method: 'cowell'`): the equations of motion themselves,
 *   integrated with the Dormand–Prince 5(4) pair and step control on the
 *   position error. Every force, every short-period wobble. Some hundreds of
 *   steps an orbit, so for months rather than decades.
 * - **Mean elements** (`method: 'mean'`): the orbit's mean elements carried
 *   in steps of hours by their averaged rates — J2's secular turn of the
 *   node and the perigee, and drag's loss of energy and eccentricity found
 *   by averaging the drag over one revolution (Gauss's equations, 36 points
 *   in eccentric anomaly). Sun, Moon and sunlight are left out. Decades in a
 *   second: the answer to "how long will it stay up?".
 *
 * Both stop when the perigee is below `REENTRY_ALTITUDE`, where a satellite
 * is lost within a revolution or two.
 */
import { MU_EARTH, R_EARTH, J2_EARTH, OMEGA_EARTH } from '../constants';
import { acceleration, type ForceModel, type Spacecraft } from './forces';
import { bulgeExponent, harrisPriesterDensity } from './density';
import { sunPosition, type V3 } from './ephemeris';

export const REENTRY_ALTITUDE = 120e3;

export interface OrbitSample {
  /** seconds since the start */
  t: number;
  /** semi-major axis, m */
  a: number;
  e: number;
  /** rad */
  i: number;
  raan: number;
  argp: number;
  /** m over the equatorial radius */
  perigeeAlt: number;
  apogeeAlt: number;
}

export interface PropagationResult {
  samples: OrbitSample[];
  /** seconds from the start to reentry, or null if it stayed up to the horizon */
  lifetime: number | null;
  /** integration steps taken */
  steps: number;
}

export interface PropagationOptions {
  method: 'cowell' | 'mean';
  /** how long to carry it, s */
  duration: number;
  forces: ForceModel;
  spacecraft: Spacecraft;
  /** points to return, about (default 600) */
  samples?: number;
  /** relative position error per step for Cowell (default 1e-10) */
  tolerance?: number;
  /** called now and then with the fraction done; return false to stop */
  onProgress?: (fraction: number) => boolean | void;
}

// ─── elements ───────────────────────────────────────────────────────────────

export interface Elements { a: number; e: number; i: number; raan: number; argp: number; M: number }

export function elementsOf(r: V3, v: V3): Elements {
  const mu = MU_EARTH;
  const rn = Math.hypot(r[0], r[1], r[2]);
  const h: V3 = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
  const hn = Math.hypot(h[0], h[1], h[2]);
  const v2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  const a = 1 / (2 / rn - v2 / mu);
  const rv = r[0] * v[0] + r[1] * v[1] + r[2] * v[2];
  const ev: V3 = [0, 1, 2].map((k) => ((v2 - mu / rn) * r[k] - rv * v[k]) / mu) as V3;
  const e = Math.hypot(ev[0], ev[1], ev[2]);
  const i = Math.acos(Math.max(-1, Math.min(1, h[2] / hn)));
  const nx = -h[1], ny = h[0], nn = Math.hypot(nx, ny);
  const raan = nn > 1e-12 ? Math.atan2(ny, nx) : 0;
  let argp = 0;
  if (nn > 1e-12 && e > 1e-12) {
    argp = Math.acos(Math.max(-1, Math.min(1, (nx * ev[0] + ny * ev[1]) / (nn * e))));
    if (ev[2] < 0) argp = 2 * Math.PI - argp;
  }
  let nu = e > 1e-12 ? Math.acos(Math.max(-1, Math.min(1, (ev[0] * r[0] + ev[1] * r[1] + ev[2] * r[2]) / (e * rn)))) : 0;
  if (rv < 0) nu = 2 * Math.PI - nu;
  const E = 2 * Math.atan2(Math.sqrt(Math.max(0, 1 - e)) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
  return { a, e, i, raan: (raan + 2 * Math.PI) % (2 * Math.PI), argp, M: E - e * Math.sin(E) };
}

/** Position and velocity on an orbit at eccentric anomaly E. */
function stateAt(el: Elements, E: number): { r: V3; v: V3 } {
  const { a, e, i, raan, argp } = el;
  const mu = MU_EARTH;
  const cE = Math.cos(E), sE = Math.sin(E), q = Math.sqrt(1 - e * e);
  const xp = a * (cE - e), yp = a * q * sE;
  const rn = a * (1 - e * cE);
  const k = Math.sqrt(mu * a) / rn;
  const vx = -k * sE, vy = k * q * cE;
  const cO = Math.cos(raan), sO = Math.sin(raan), cw = Math.cos(argp), sw = Math.sin(argp), ci = Math.cos(i), si = Math.sin(i);
  const P: V3 = [cO * cw - sO * sw * ci, sO * cw + cO * sw * ci, sw * si];
  const Q: V3 = [-cO * sw - sO * cw * ci, -sO * sw + cO * cw * ci, cw * si];
  return {
    r: [xp * P[0] + yp * Q[0], xp * P[1] + yp * Q[1], xp * P[2] + yp * Q[2]],
    v: [vx * P[0] + vy * Q[0], vx * P[1] + vy * Q[1], vx * P[2] + vy * Q[2]],
  };
}

const sample = (t: number, el: Elements): OrbitSample => ({
  t, a: el.a, e: el.e, i: el.i, raan: el.raan, argp: el.argp,
  perigeeAlt: el.a * (1 - el.e) - R_EARTH, apogeeAlt: el.a * (1 + el.e) - R_EARTH,
});

// ─── Cowell ─────────────────────────────────────────────────────────────────

// Dormand–Prince 5(4) coefficients
const C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];
const A = [
  [],
  [1 / 5],
  [3 / 40, 9 / 40],
  [44 / 45, -56 / 15, 32 / 9],
  [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
  [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
];
const B5 = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0];
const B4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40];

function cowell(r0: V3, v0: V3, jd0: number, o: PropagationOptions): PropagationResult {
  const f = o.forces, sc = o.spacecraft;
  const n = bulgeExponent(elementsOf(r0, v0).i);
  const deriv = (t: number, y: number[]): number[] => {
    const a = acceleration([y[0], y[1], y[2]], [y[3], y[4], y[5]], jd0 + t / 86400, f, sc, n);
    return [y[3], y[4], y[5], a[0], a[1], a[2]];
  };
  let y = [...r0, ...v0];
  let t = 0, h = 30, steps = 0;
  const tol = o.tolerance ?? 1e-10;
  const every = o.duration / (o.samples ?? 600);
  const samples: OrbitSample[] = [sample(0, elementsOf(r0, v0))];
  let nextSample = every, lifetime: number | null = null;
  let lastProgress = 0;
  while (t < o.duration) {
    h = Math.min(h, o.duration - t);
    const k: number[][] = [deriv(t, y)];
    for (let s = 1; s < 7; s++) {
      const ys = y.map((yi, j) => yi + h * A[s].reduce((acc, aij, m) => acc + aij * k[m][j], 0));
      k.push(deriv(t + C[s] * h, ys));
    }
    const y5 = y.map((yi, j) => yi + h * B5.reduce((acc, b, m) => acc + b * k[m][j], 0));
    const y4 = y.map((yi, j) => yi + h * B4.reduce((acc, b, m) => acc + b * k[m][j], 0));
    const rn = Math.hypot(y5[0], y5[1], y5[2]);
    const err = Math.hypot(y5[0] - y4[0], y5[1] - y4[1], y5[2] - y4[2]) / rn;
    if (err > tol && h > 0.5) { h *= Math.max(0.2, 0.9 * (tol / err) ** 0.2); continue; }
    t += h;
    y = y5;
    steps++;
    h *= Math.min(4, 0.9 * (tol / Math.max(err, 1e-300)) ** 0.2);
    h = Math.min(h, 3600);
    if (rn - R_EARTH < REENTRY_ALTITUDE * 0.5) { lifetime = t; samples.push(sample(t, elementsOf([y[0], y[1], y[2]], [y[3], y[4], y[5]]))); break; }
    if (t >= nextSample || t >= o.duration) {
      const el = elementsOf([y[0], y[1], y[2]], [y[3], y[4], y[5]]);
      samples.push(sample(t, el));
      nextSample += every;
      if (el.a * (1 - el.e) - R_EARTH < REENTRY_ALTITUDE) { lifetime = t; break; }
    }
    if (o.onProgress && t / o.duration - lastProgress > 0.01) {
      lastProgress = t / o.duration;
      if (o.onProgress(lastProgress) === false) break;
    }
  }
  return { samples, lifetime, steps };
}

// ─── mean elements ──────────────────────────────────────────────────────────

/**
 * Averaged drag rates of a and e over one revolution, by Gauss's equations
 * with the drag along the air-relative velocity, sampled at 36 points of
 * eccentric anomaly (weighted by r/a, which turns them into mean anomaly).
 */
function dragRates(el: Elements, jd: number, f: ForceModel, sc: Spacecraft, n: number): { da: number; de: number } {
  const mu = MU_EARTH, N = 36;
  const sun = sunPosition(jd);
  let da = 0, de = 0;
  for (let k = 0; k < N; k++) {
    const E = (2 * Math.PI * (k + 0.5)) / N;
    const { r, v } = stateAt(el, E);
    const rn = Math.hypot(r[0], r[1], r[2]);
    const alt = (rn - R_EARTH) / 1000;
    const rho = harrisPriesterDensity(r, alt, sun, n, f.activity);
    if (rho === 0) continue;
    const vr: V3 = [v[0] + OMEGA_EARTH * r[1], v[1] - OMEGA_EARTH * r[0], v[2]];
    const vm = Math.hypot(vr[0], vr[1], vr[2]);
    const kd = -0.5 * rho * sc.cd * (sc.area / sc.mass) * vm;
    const ad: V3 = [kd * vr[0], kd * vr[1], kd * vr[2]];
    const w = rn / el.a / N;
    // da/dt = 2 a² / μ · (v · a_d)
    da += w * ((2 * el.a * el.a) / mu) * (v[0] * ad[0] + v[1] * ad[1] + v[2] * ad[2]);
    // de/dt = 2 (e + cos ν) a_t / v for a force along the velocity
    const vn = Math.hypot(v[0], v[1], v[2]);
    const at = (v[0] * ad[0] + v[1] * ad[1] + v[2] * ad[2]) / vn;
    const cE = Math.cos(E);
    const cosNu = (cE - el.e) / (1 - el.e * cE);
    de += w * ((2 * (el.e + cosNu)) / vn) * at;
  }
  return { da, de };
}

function meanElements(r0: V3, v0: V3, jd0: number, o: PropagationOptions): PropagationResult {
  const f = o.forces, sc = o.spacecraft;
  let el = elementsOf(r0, v0);
  const n = bulgeExponent(el.i);
  const every = o.duration / (o.samples ?? 600);
  const samples: OrbitSample[] = [sample(0, el)];
  let t = 0, steps = 0, nextSample = every, lifetime: number | null = null, lastProgress = 0;
  while (t < o.duration) {
    const p = el.a * (1 - el.e * el.e), nMean = Math.sqrt(MU_EARTH / el.a ** 3);
    const j2 = f.j2 ? 1.5 * J2_EARTH * (R_EARTH / p) ** 2 * nMean : 0;
    const dRaan = -j2 * Math.cos(el.i);
    const dArgp = j2 * (2 - 2.5 * Math.sin(el.i) ** 2);
    const drag = f.drag ? dragRates(el, jd0 + t / 86400, f, sc, n) : { da: 0, de: 0 };
    // a step that loses at most 0.5 % of the height above the reentry line
    const margin = el.a * (1 - el.e) - R_EARTH - REENTRY_ALTITUDE + 1000;
    let h = Math.min(6 * 3600, o.duration - t);
    if (drag.da < 0) h = Math.max(60, Math.min(h, (0.005 * margin) / -drag.da));
    el = {
      ...el,
      a: el.a + drag.da * h,
      e: Math.max(0, Math.min(0.99, el.e + drag.de * h)),
      raan: (el.raan + dRaan * h + 4 * Math.PI) % (2 * Math.PI),
      argp: (el.argp + dArgp * h + 4 * Math.PI) % (2 * Math.PI),
      M: el.M + nMean * h,
    };
    t += h;
    steps++;
    if (el.a * (1 - el.e) - R_EARTH < REENTRY_ALTITUDE) { lifetime = t; samples.push(sample(t, el)); break; }
    if (t >= nextSample || t >= o.duration) { samples.push(sample(t, el)); nextSample += every; }
    if (o.onProgress && t / o.duration - lastProgress > 0.01) {
      lastProgress = t / o.duration;
      if (o.onProgress(lastProgress) === false) break;
    }
  }
  return { samples, lifetime, steps };
}

/** Carry an orbit forward from ECI `r0`, `v0` (m, m/s) at Julian date `jd0`. */
export function propagate(r0: V3, v0: V3, jd0: number, o: PropagationOptions): PropagationResult {
  return o.method === 'cowell' ? cowell(r0, v0, jd0, o) : meanElements(r0, v0, jd0, o);
}
