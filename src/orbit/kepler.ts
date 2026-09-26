/**
 * The orbit playground's physics (roadmap O01, docs/ROADMAP-PART2-3.md): an
 * orbit given by its classical elements, carried forward by Kepler's equation
 * and, when asked, by the secular drift the Earth's oblateness (J2) gives the
 * node, the perigee and the mean motion; what the orbit is (period, speeds,
 * energy, the ground track's shift); Kepler's three laws as numbers that can
 * be checked; and Newton's cannon.
 *
 * DOM-free, SI units and radians, the simulator's ECI frame
 * (src/physics/orbital.ts, whose conversions it uses). The mean elements here
 * are first-order Brouwer/Kozai means — the same secular rates the launch
 * planner uses for sun-synchronous orbits — which is what a playground needs
 * and what the published repeat cycles of Earth-observation satellites are
 * computed with; tests/kepler.test.ts holds it to them.
 */
import { DEG, J2_EARTH, MU_EARTH, OMEGA_EARTH, R_EARTH } from '../physics/constants';
import {
  elementsFromState, gmst, meanFromTrue, stateFromElements, sunSyncInclination, trueFromMean, wrap2pi, wrapPi,
} from '../physics/orbital';
import type { Vec3 } from '../physics/vec3';

const TWO_PI = 2 * Math.PI;

/** An orbit at an epoch: mean classical elements, and where on it the satellite is then. */
export interface Orbit {
  /** semi-major axis, m */
  a: number;
  e: number;
  /** inclination, right ascension of the ascending node, argument of perigee, rad */
  i: number;
  raan: number;
  argp: number;
  /** mean anomaly at the epoch, rad */
  m0: number;
  /** the epoch, Julian date (UTC) */
  jd0: number;
}

/** An orbit from its perigee and apogee altitudes above the equatorial radius, m. */
export function apsidesToAE(perigeeAlt: number, apogeeAlt: number): { a: number; e: number } {
  const rp = R_EARTH + Math.min(perigeeAlt, apogeeAlt), ra = R_EARTH + Math.max(perigeeAlt, apogeeAlt);
  return { a: (rp + ra) / 2, e: (ra - rp) / (ra + rp) };
}

/** The orbit a state vector is on (osculating elements taken as the mean ones), at Julian date `jd`. */
export function orbitFromState(r: Vec3, v: Vec3, jd: number): Orbit {
  const el = elementsFromState(r, v);
  return { a: el.a, e: el.e, i: el.i, raan: el.raan, argp: el.argp, m0: el.e < 1 ? meanFromTrue(el.nu, el.e) : 0, jd0: jd };
}

/** Whether the orbit is a closed one that clears the ground. */
export const isBound = (o: Pick<Orbit, 'a' | 'e'>): boolean => o.e >= 0 && o.e < 1 && o.a > 0;
export const perigeeRadius = (o: Pick<Orbit, 'a' | 'e'>): number => o.a * (1 - o.e);
export const apogeeRadius = (o: Pick<Orbit, 'a' | 'e'>): number => o.a * (1 + o.e);
/** The orbit passes below the surface (the equatorial radius): it hits the Earth. */
export const hitsEarth = (o: Pick<Orbit, 'a' | 'e'>): boolean => perigeeRadius(o) < R_EARTH;

// ─── J2's secular drift ─────────────────────────────────────────────────────

export interface SecularRates {
  /** rad/s: the node's regression, the perigee's rotation, and the mean anomaly's rate */
  raanDot: number;
  argpDot: number;
  meanMotion: number;
}

/**
 * Secular rates, first order in J2 (Vallado, *Fundamentals of Astrodynamics
 * and Applications*, §9.6): Ω̇ = −3/2 n J2 (R/p)² cos i,
 * ω̇ = 3/4 n J2 (R/p)² (5 cos² i − 1), Ṁ = n [1 + 3/4 J2 (R/p)² √(1−e²) (3 cos² i − 1)].
 * With `j2` off, the two-body rates: Kepler's orbit, which never turns.
 */
export function secularRates(o: Pick<Orbit, 'a' | 'e' | 'i'>, j2: boolean): SecularRates {
  const n = Math.sqrt(MU_EARTH / (o.a * o.a * o.a));
  if (!j2) return { raanDot: 0, argpDot: 0, meanMotion: n };
  const p = o.a * (1 - o.e * o.e), k = J2_EARTH * (R_EARTH / p) ** 2, c = Math.cos(o.i);
  return {
    raanDot: -1.5 * n * k * c,
    argpDot: 0.75 * n * k * (5 * c * c - 1),
    meanMotion: n * (1 + 0.75 * k * Math.sqrt(1 - o.e * o.e) * (3 * c * c - 1)),
  };
}

export interface OrbitState {
  /** seconds since the epoch */
  t: number;
  r: Vec3;
  v: Vec3;
  /** true anomaly and the node and perigee as they have drifted, rad */
  nu: number;
  raan: number;
  argp: number;
  /** Greenwich sidereal angle, rad, and the sub-satellite point, rad and m */
  theta: number;
  lat: number;
  lon: number;
  alt: number;
}

/** Where the satellite is `t` seconds after the epoch. */
export function stateAt(o: Orbit, t: number, j2: boolean): OrbitState {
  const rates = secularRates(o, j2);
  const raan = wrap2pi(o.raan + rates.raanDot * t), argp = wrap2pi(o.argp + rates.argpDot * t);
  const nu = trueFromMean(o.m0 + rates.meanMotion * t, o.e);
  const { r, v } = stateFromElements(o.a, o.e, o.i, raan, argp, nu);
  const theta = gmst(o.jd0 + t / 86400);
  const rm = Math.hypot(r.x, r.y, r.z);
  return { t, r, v, nu, raan, argp, theta, lat: Math.asin(r.z / rm), lon: wrapPi(Math.atan2(r.y, r.x) - theta), alt: rm - R_EARTH };
}

// ─── what the orbit is ──────────────────────────────────────────────────────

export interface OrbitFacts {
  /** anomalistic period (two-body), s, and the nodal period with the drift, s */
  period: number;
  nodalPeriod: number;
  revsPerDay: number;
  perigeeAlt: number;
  apogeeAlt: number;
  /** speeds at perigee and apogee (vis-viva), m/s */
  vPerigee: number;
  vApogee: number;
  /** specific orbital energy, J/kg; specific angular momentum, m²/s */
  energy: number;
  h: number;
  /** Kepler's second law: the area the radius sweeps each second, m²/s (h/2) */
  arealVelocity: number;
  /** Kepler's third law: T²/a³, s²/m³ — the same for every orbit of the Earth (4π²/μ) */
  keplerConstant: number;
  /** rad/s */
  raanDot: number;
  argpDot: number;
  /** the ground track's step west at the equator from one ascending node to the next, rad */
  trackShift: number;
  /** the node keeps pace with the Sun to within 1 % (a sun-synchronous orbit) */
  sunSynchronous: boolean;
}

/** The mean Sun's motion along the equator, rad/s (one turn per tropical year). */
export const SUN_RATE = TWO_PI / (365.2422 * 86400);

export function orbitFacts(o: Orbit, j2: boolean): OrbitFacts {
  const n = Math.sqrt(MU_EARTH / (o.a * o.a * o.a));
  const rates = secularRates(o, j2);
  const rp = perigeeRadius(o), ra = apogeeRadius(o);
  const h = Math.sqrt(MU_EARTH * o.a * (1 - o.e * o.e));
  const period = TWO_PI / n;
  const nodalPeriod = TWO_PI / (rates.meanMotion + rates.argpDot);
  return {
    period, nodalPeriod, revsPerDay: 86400 / nodalPeriod,
    perigeeAlt: rp - R_EARTH, apogeeAlt: ra - R_EARTH,
    vPerigee: h / rp, vApogee: h / ra,
    energy: -MU_EARTH / (2 * o.a), h, arealVelocity: h / 2,
    keplerConstant: (period * period) / (o.a * o.a * o.a),
    raanDot: rates.raanDot, argpDot: rates.argpDot,
    trackShift: (OMEGA_EARTH - rates.raanDot) * nodalPeriod,
    sunSynchronous: j2 && Math.abs(rates.raanDot - SUN_RATE) < 0.01 * SUN_RATE,
  };
}

/**
 * The mean Sun's right ascension at Julian date `jd`, rad: the fictitious
 * Sun that keeps mean solar time, moving along the equator at `SUN_RATE`
 * (its mean longitude, 280.460° at J2000.0 plus 0.9856474° a day — the
 * Astronomical Almanac's low-precision solar formula).
 */
export function meanSunRightAscension(jd: number): number {
  return wrap2pi((280.46 + 0.9856474 * (jd - 2451545.0)) * DEG);
}

/**
 * The mean local solar time at the ascending node, hours in [0, 24): 12 h
 * when the node points at the mean Sun. This is the LTAN a sun-synchronous
 * mission is specified by (Landsat's and Sentinel-2's 10:30 is at the
 * descending node, twelve hours from this one). The launch planner's
 * `raanFromLtan` (src/physics/mission.ts) aims at the true Sun instead; the
 * two differ by the equation of time, at most about 16 minutes.
 */
export function nodeLocalTime(raan: number, jd: number): number {
  const h = 12 + (wrapPi(raan - meanSunRightAscension(jd)) / TWO_PI) * 24;
  return ((h % 24) + 24) % 24;
}

/** The node that puts the ascending node at mean local time `hours` on Julian date `jd`, rad. */
export function raanForLocalTime(hours: number, jd: number): number {
  return wrap2pi(meanSunRightAscension(jd) + ((hours - 12) / 24) * TWO_PI);
}

/** The sun-synchronous inclination for this size and shape of orbit (with J2), rad; null where none exists. */
export function sunSynchronousInclination(o: Pick<Orbit, 'a' | 'e'>): number | null {
  const i = sunSyncInclination(o.a, o.e);
  // sunSyncInclination clamps cos i to [−1, 1]: at the clamp no inclination turns the node fast enough
  return Math.abs(Math.cos(i)) >= 1 - 1e-12 ? null : i;
}

/**
 * The circular orbit whose ground track repeats after `revs` revolutions in
 * `days` days, sun-synchronous when `sso` (else at inclination `i`): the
 * semi-major axis, found by bisection on the repeat condition
 * revs · T_N · (ω⊕ − Ω̇) = days · 2π. This is how the altitude of an
 * Earth-observation satellite is chosen.
 */
export function repeatOrbit(revs: number, days: number, sso: boolean, i = 0): { a: number; i: number } {
  const condition = (a: number): { f: number; i: number } => {
    const inc = sso ? sunSyncInclination(a) : i;
    const f = orbitFacts({ a, e: 0, i: inc, raan: 0, argp: 0, m0: 0, jd0: 0 }, true);
    return { f: revs * f.nodalPeriod * (OMEGA_EARTH - f.raanDot) - days * TWO_PI, i: inc };
  };
  let lo = R_EARTH + 150e3, hi = R_EARTH + 5000e3;
  for (let k = 0; k < 100; k++) {
    const mid = (lo + hi) / 2;
    if (condition(mid).f > 0) hi = mid; else lo = mid;
  }
  const a = (lo + hi) / 2;
  return { a, i: condition(a).i };
}

// ─── the ground track ───────────────────────────────────────────────────────

export interface TrackPoint { t: number; lat: number; lon: number; alt: number }

/** The sub-satellite points from `t0` to `t1` s after the epoch, `n` of them. */
export function groundTrack(o: Orbit, t0: number, t1: number, n: number, j2: boolean): TrackPoint[] {
  const out: TrackPoint[] = [];
  for (let k = 0; k < n; k++) {
    const t = t0 + ((t1 - t0) * k) / Math.max(1, n - 1);
    const s = stateAt(o, t, j2);
    out.push({ t, lat: s.lat, lon: s.lon, alt: s.alt });
  }
  return out;
}

// ─── Kepler's laws ──────────────────────────────────────────────────────────

/**
 * Kepler's second law, to be seen: the orbit cut into `count` arcs the
 * satellite flies in equal times (equal steps of mean anomaly). Returns the
 * true anomalies of the cuts, `count + 1` of them from perigee round to
 * perigee; the sectors they make with the focus all have the same area.
 */
export function equalTimeCuts(e: number, count: number): number[] {
  const cuts: number[] = [];
  for (let k = 0; k <= count; k++) cuts.push(k === count ? TWO_PI : trueFromMean((TWO_PI * k) / count, e));
  return cuts;
}

/** The area the radius sweeps between two true anomalies, m² (the sector at the focus). */
export function sectorArea(o: Pick<Orbit, 'a' | 'e'>, nu1: number, nu2: number): number {
  // area = (h/2) · Δt, with the time from Kepler's equation
  const h = Math.sqrt(MU_EARTH * o.a * (1 - o.e * o.e)), n = Math.sqrt(MU_EARTH / o.a ** 3);
  let dM = meanFromTrue(wrap2pi(nu2), o.e) - meanFromTrue(wrap2pi(nu1), o.e);
  if (nu2 - nu1 >= TWO_PI - 1e-12) dM = TWO_PI;
  else if (dM < 0) dM += TWO_PI;
  return (h / 2) * (dM / n);
}

// ─── Newton's cannon ────────────────────────────────────────────────────────

export type CannonOutcome = 'impact' | 'orbit' | 'escape';

export interface CannonShot {
  outcome: CannonOutcome;
  /** the path in the plane of the shot, Earth's centre at the origin, the cannon at (0, r₀), m */
  path: { x: number; y: number }[];
  /**
   * when the ball is at each point of the path, s after the shot — from
   * Kepler's second law, dt = r² dν / h, so a drawing that moves the ball by
   * these times shows it slow at the top and fast at the bottom
   */
  times: number[];
  /** the speeds that matter at the cannon's height, m/s: a circle, and escape */
  vCircular: number;
  vEscape: number;
  /** for an impact: how far round the Earth, m along the surface, and how long, s */
  range?: number;
  flightTime?: number;
  /** for an orbit: its period, s, and how high it gets, m above the surface */
  period?: number;
  apogeeAlt?: number;
}

/**
 * Newton's thought experiment (*A Treatise of the System of the World*, 1728):
 * a cannon on a mountain `altitude` m high fires at `speed` m/s, `elevation`
 * rad above the horizontal, with no air. The ball flies a conic about the
 * Earth's centre — an ellipse that meets the ground, a closed orbit, or an
 * escape. The path is the exact Kepler conic, sampled.
 */
export function newtonsCannon(altitude: number, speed: number, elevation = 0, samples = 360): CannonShot {
  const r0 = R_EARTH + altitude;
  const vCircular = Math.sqrt(MU_EARTH / r0), vEscape = Math.sqrt(2 * MU_EARTH / r0);
  // the cannon at (0, r0), firing towards +x (eastward on the drawing)
  const r = { x: 0, y: r0, z: 0 }, v = { x: speed * Math.cos(elevation), y: speed * Math.sin(elevation), z: 0 };
  const hz = r.x * v.y - r.y * v.x; // negative: clockwise, seen from +z
  const energy = speed * speed / 2 - MU_EARTH / r0;
  const hm = Math.abs(hz);
  const p = hm * hm / MU_EARTH;
  const e = Math.sqrt(Math.max(0, 1 + 2 * energy * hm * hm / (MU_EARTH * MU_EARTH)));
  // true anomaly at launch: r0 = p/(1 + e cos ν0), outward speed v_r = (μ/h) e sin ν0
  const vr = (r.x * v.x + r.y * v.y) / r0;
  let nu0 = e > 1e-12 ? Math.acos(Math.max(-1, Math.min(1, (p / r0 - 1) / e))) : 0;
  if (vr < 0) nu0 = -nu0;
  // the polar angle of the path, measured clockwise from the cannon (the drawing's +y axis)
  const at = (nu: number): { x: number; y: number; rr: number } => {
    const rr = p / (1 + e * Math.cos(nu));
    const phi = nu - nu0;
    return { x: rr * Math.sin(phi), y: rr * Math.cos(phi), rr };
  };
  const shot: CannonShot = { outcome: 'orbit', path: [], times: [], vCircular, vEscape };
  if (speed <= 0 || hm === 0) return { ...shot, outcome: 'impact', path: [{ x: 0, y: r0 }], times: [0], range: 0, flightTime: 0 };
  // where r = R, past the launch: cos ν = (p/R − 1)/e
  const cosHit = e > 1e-12 ? (p / R_EARTH - 1) / e : 2;
  const hits = cosHit >= -1 && cosHit <= 1;
  let nuEnd: number;
  if (hits) {
    const nuHit = Math.acos(cosHit); // 0..π: the descending crossing is at 2π − nuHit
    nuEnd = 2 * Math.PI - nuHit;
    if (nuEnd <= nu0) nuEnd += 2 * Math.PI;
    shot.outcome = 'impact';
  } else if (e < 1) {
    nuEnd = nu0 + 2 * Math.PI;
    shot.outcome = 'orbit';
    const a = p / (1 - e * e);
    shot.period = 2 * Math.PI * Math.sqrt(a ** 3 / MU_EARTH);
    shot.apogeeAlt = a * (1 + e) - R_EARTH;
  } else {
    // out along the escape: until the ball is ten Earth radii away, short of the asymptote
    const nuMax = Math.acos(-1 / e) - 1e-6;
    const cosFar = (p / (10 * R_EARTH) - 1) / e;
    nuEnd = Math.min(nuMax, cosFar >= -1 && cosFar <= 1 ? Math.acos(cosFar) : nuMax);
    shot.outcome = 'escape';
  }
  const dNu = (nuEnd - nu0) / samples;
  let time = 0, rPrev = 0;
  for (let k = 0; k <= samples; k++) {
    const pt = at(nu0 + dNu * k);
    if (k > 0) time += ((rPrev * rPrev + pt.rr * pt.rr) / 2) * dNu / hm; // the trapezoid rule on r²/h
    shot.path.push({ x: pt.x, y: pt.y });
    shot.times.push(time);
    rPrev = pt.rr;
  }
  if (shot.outcome === 'impact') {
    shot.range = R_EARTH * (nuEnd - nu0);
    shot.flightTime = conicTime(p, e, nu0, nuEnd);
  }
  return shot;
}

/** Time of flight along an ellipse from ν₁ to ν₂ (ν₂ > ν₁), s. */
function conicTime(p: number, e: number, nu1: number, nu2: number): number {
  const a = p / (1 - e * e), n = Math.sqrt(MU_EARTH / a ** 3);
  const M = (nu: number): number => {
    const turns = Math.floor(nu / (2 * Math.PI));
    return meanFromTrue(nu - 2 * Math.PI * turns, e) + 2 * Math.PI * turns;
  };
  return (M(nu2) - M(nu1)) / n;
}
