/**
 * Flight between the Earth and the Moon (roadmap C01, docs/PHYSICS.md §13.10):
 * the forces — the Earth with its J2, the Moon and the Sun as third bodies,
 * all in the simulation's geocentric mean-of-date frame — a propagator whose
 * step follows the nearer body, the closest approach to the Moon, and the
 * targeting of a midcourse correction by differential correction.
 */
import { MU_EARTH } from '../constants';
import { gravityJ2 } from '../gravity';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import { MU_MOON, MU_SUN, R_MOON, moonState, sunState, thirdBody } from './ephemeris';
import { eciToSelenographic, moonBodyToEci, selenographicToEci } from './orientation';
import { moonDegree2 } from './gravity';

export interface CislunarState { r: Vec3; v: Vec3 }

/**
 * The Moon's sphere of influence as Mission Control drew it, m from the Moon's
 * centre: Apollo 11 crossed into it 33,822 n mi above the Moon, where the
 * displays switched to the Moon (the Public Affairs commentary at 61:39:55,
 * Apollo 11 Flight Journal; its 186,437 n mi from the Earth, 2,990 ft/s and
 * 3,772 ft/s are altitudes and speeds this model's flight has there to 40 km
 * and 1 m/s). Laplace's a (m/M)^(2/5) would put it at 66,200 km.
 */
export const LUNAR_SOI = 33822 * 1852 + R_MOON;

/** Within this distance of the Moon its degree-2 field is added to its point mass, m (at the edge, 10⁻¹¹ of its pull). */
const MOON_FIELD_RANGE = 100000e3;

/**
 * The Moon's and the Sun's pull at `r`, as third bodies, at mission time `t`
 * of a launch at UTC Julian date `jd0`; near the Moon, its J2 and C22 too.
 */
export function lunisolar(jd0: number, t: number, r: Vec3): Vec3 {
  const jd = jd0 + t / 86400, moon = moonState(jd).r;
  let a = add(thirdBody(r, moon, MU_MOON), thirdBody(r, sunState(jd).r, MU_SUN));
  const rel = sub(r, moon);
  if (dot(rel, rel) < MOON_FIELD_RANGE * MOON_FIELD_RANGE) a = add(a, moonDegree2(rel, jd));
  return a;
}

/** The gravitational acceleration at `r`, mission time `t`, for a launch at UTC Julian date `jd0`. */
export function cislunarGravity(jd0: number, t: number, r: Vec3): Vec3 {
  return add(gravityJ2(r), lunisolar(jd0, t, r));
}

/**
 * The step a coast wants, s: a hundredth of the time it takes to cross its
 * distance from the nearer body at its speed relative to it — 8 s in a low
 * Earth orbit, 12 s in a low lunar orbit, two minutes between the two.
 */
export function cislunarStep(jd0: number, t: number, s: CislunarState): number {
  const m = moonState(jd0 + t / 86400);
  const tauE = norm(s.r) / Math.max(1, norm(s.v));
  const tauM = norm(sub(s.r, m.r)) / Math.max(1, norm(sub(s.v, m.v)));
  return Math.max(1, Math.min(120, 0.01 * Math.min(tauE, tauM)));
}

function rk4(jd0: number, t: number, s: CislunarState, dt: number, extra?: (t: number, r: Vec3, v: Vec3) => Vec3): CislunarState {
  const f = (tt: number, r: Vec3, v: Vec3) => (extra ? add(cislunarGravity(jd0, tt, r), extra(tt, r, v)) : cislunarGravity(jd0, tt, r));
  const k1v = f(t, s.r, s.v), k1r = s.v;
  const k2v = f(t + dt / 2, add(s.r, scale(k1r, dt / 2)), add(s.v, scale(k1v, dt / 2))), k2r = add(s.v, scale(k1v, dt / 2));
  const k3v = f(t + dt / 2, add(s.r, scale(k2r, dt / 2)), add(s.v, scale(k2v, dt / 2))), k3r = add(s.v, scale(k2v, dt / 2));
  const k4v = f(t + dt, add(s.r, scale(k3r, dt)), add(s.v, scale(k3v, dt))), k4r = add(s.v, scale(k3v, dt));
  return {
    r: add(s.r, scale(add(add(k1r, scale(k2r, 2)), add(scale(k3r, 2), k4r)), dt / 6)),
    v: add(s.v, scale(add(add(k1v, scale(k2v, 2)), add(scale(k3v, 2), k4v)), dt / 6)),
  };
}

/** One RK4 step under the cislunar forces, with any extra acceleration (thrust). */
export function cislunarRk4(jd0: number, t: number, s: CislunarState, dt: number, extra?: (t: number, r: Vec3, v: Vec3) => Vec3): CislunarState {
  return rk4(jd0, t, s, dt, extra);
}

/** The closest approach to the Moon: mission time, the state, and its selenocentric state. */
export interface Perilune { t: number; state: CislunarState; rel: CislunarState; altitude: number }

/**
 * Coast from `t0` to the first closest approach to the Moon (the relative
 * range rate turning from closing to opening), before `tMax`; null if there is
 * none. The minimum is refined within its last step to a tenth of a second.
 */
export function coastToPerilune(jd0: number, t0: number, s0: CislunarState, tMax: number): Perilune | null {
  let t = t0, s = s0;
  const rel = (tt: number, st: CislunarState): CislunarState => {
    const m = moonState(jd0 + tt / 86400);
    return { r: sub(st.r, m.r), v: sub(st.v, m.v) };
  };
  let rr = rel(t, s), rate = dot(rr.r, rr.v);
  while (t < tMax) {
    const dt = Math.min(cislunarStep(jd0, t, s), tMax - t);
    const next = rk4(jd0, t, s, dt), nr = rel(t + dt, next), nrate = dot(nr.r, nr.v);
    if (rate < 0 && nrate >= 0) {
      // refine inside the step, a golden-section search on the range
      let a = 0, b = dt;
      const at = (x: number) => { const st = rk4(jd0, t, s, x); return { st, d: norm(rel(t + x, st).r) }; };
      for (let i = 0; i < 40 && b - a > 0.1; i++) {
        const c = b - (b - a) * 0.618, d = a + (b - a) * 0.618;
        if (at(c).d < at(d).d) b = d; else a = c;
      }
      const x = (a + b) / 2, st = at(x).st, re = rel(t + x, st);
      return { t: t + x, state: st, rel: re, altitude: norm(re.r) - R_MOON };
    }
    t += dt; s = next; rr = nr; rate = nrate;
  }
  return null;
}

/** Coast from `t0` to `t1`. */
export function coast(jd0: number, t0: number, s0: CislunarState, t1: number): CislunarState {
  let t = t0, s = s0;
  while (t < t1 - 1e-9) {
    const dt = Math.min(cislunarStep(jd0, t, s), t1 - t);
    s = rk4(jd0, t, s, dt);
    t += dt;
  }
  return s;
}

/**
 * What a midcourse correction aims the arrival at: the perilune's altitude and
 * two of its time, its latitude, and a site its orbit's plane passes over.
 */
export interface LunarAim {
  /** perilune altitude above `R_MOON`, m */
  perilune: number;
  /** its mission time, s */
  time?: number;
  /** the perilune's selenographic latitude, deg */
  lat?: number;
  /** a site the orbit's plane has to pass over, selenographic deg, and when */
  site?: { lat: number; lon: number; t: number };
  /** how long after the correction to look for the perilune, s */
  within?: number;
}

/**
 * How far the arrival misses, in the aim's own terms: the perilune's altitude
 * (m), then its time (s), its distance north of the latitude aimed at (m), the
 * site's distance from the orbit's plane (m) — whichever the aim names.
 */
export function arrivalMiss(jd0: number, t0: number, s: CislunarState, aim: LunarAim): number[] | null {
  const p = coastToPerilune(jd0, t0, s, (aim.time ?? t0) + (aim.within ?? 0) + 12 * 3600);
  if (!p) return null;
  const out = [p.altitude - aim.perilune];
  if (aim.time !== undefined) out.push(p.t - aim.time);
  if (aim.lat !== undefined) out.push((eciToSelenographic(p.rel.r, jd0 + p.t / 86400).lat - aim.lat) * (Math.PI / 180) * R_MOON);
  if (aim.site) {
    const h = normalize(cross(p.rel.r, p.rel.v));
    out.push(dot(selenographicToEci(aim.site.lat, aim.site.lon, R_MOON, jd0 + aim.site.t / 86400), h));
  }
  return out;
}

/**
 * The impulse, m/s (ECI), that puts the arrival on `aim`: Newton's method on
 * the three misses against the three components, the Jacobian by finite
 * differences, from no impulse; null if it does not converge. The misses are
 * scaled so that a kilometre of perilune, a minute of time and a kilometre of
 * plane weigh alike.
 */
export function targetMidcourse(jd0: number, t0: number, s: CislunarState, aim: LunarAim): Vec3 | null {
  // a kilometre of perilune, a minute of time and a kilometre of latitude or plane weigh alike
  const scales = [1e3, ...(aim.time !== undefined ? [60] : []), ...(aim.lat !== undefined ? [1e3] : []), ...(aim.site ? [1e3] : [])];
  const tols = [200, ...(aim.time !== undefined ? [2] : []), ...(aim.lat !== undefined ? [300] : []), ...(aim.site ? [300] : [])];
  if (scales.length !== 3) return null;
  const scaleMiss = (m: number[]): number[] => m.map((x, i) => x / scales[i]);
  let dv = v3();
  for (let iter = 0; iter < 12; iter++) {
    const m0 = arrivalMiss(jd0, t0, { r: s.r, v: add(s.v, dv) }, aim);
    if (!m0) return null;
    const f0 = scaleMiss(m0);
    if (m0.every((x, i) => Math.abs(x) < tols[i])) return dv;
    const J: number[][] = [[], [], []];
    const h = 0.02;
    for (let k = 0; k < 3; k++) {
      const e = v3(k === 0 ? h : 0, k === 1 ? h : 0, k === 2 ? h : 0);
      const mk = arrivalMiss(jd0, t0, { r: s.r, v: add(add(s.v, dv), e) }, aim);
      if (!mk) return null;
      const fk = scaleMiss(mk);
      for (let i = 0; i < 3; i++) J[i][k] = (fk[i] - f0[i]) / h;
    }
    const step = solve3(J, f0.map((x) => -x));
    if (!step) return null;
    // no more than 20 m/s a step: the misses are far from linear over more
    const len = Math.hypot(step[0], step[1], step[2]), k = len > 20 ? 20 / len : 1;
    dv = add(dv, v3(step[0] * k, step[1] * k, step[2] * k));
  }
  return null;
}

function solve3(A: number[][], b: number[]): number[] | null {
  const det = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(A);
  if (!(Math.abs(D) > 1e-12)) return null;
  const col = (k: number) => A.map((row, i) => row.map((x, j) => (j === k ? b[i] : x)));
  return [det(col(0)) / D, det(col(1)) / D, det(col(2)) / D];
}

/** The escape-free speed check: whether a state is bound to the Earth (negative geocentric energy). */
export const earthBound = (s: CislunarState): boolean => dot(s.v, s.v) / 2 - MU_EARTH / norm(s.r) < 0;

/** A lunar orbit's shape and tilt: apolune and perilune radii (m), semi-major axis (m), eccentricity, inclination to the Moon's equator (deg). */
export interface LunarOrbit { ra: number; rp: number; a: number; e: number; inc: number }

/** The osculating lunar orbit of a state relative to the Moon's centre, at UTC Julian date `jd`. */
export function lunarOrbit(rel: CislunarState, jd: number): LunarOrbit {
  const r = norm(rel.r), v2 = dot(rel.v, rel.v);
  const a = 1 / (2 / r - v2 / MU_MOON);
  const hv = cross(rel.r, rel.v), h = norm(hv);
  const e = Math.sqrt(Math.max(0, 1 - (h * h) / (MU_MOON * a)));
  const m = moonBodyToEci(jd);
  const inc = (Math.acos(Math.max(-1, Math.min(1, (hv.x * m[2] + hv.y * m[5] + hv.z * m[8]) / h))) * 180) / Math.PI;
  return { a, e, rp: a * (1 - e), ra: a > 0 ? a * (1 + e) : Infinity, inc };
}

