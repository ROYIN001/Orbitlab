/**
 * Two-body orbital mechanics utilities in an Earth-centered inertial (ECI)
 * frame: +Z toward the north pole, +X toward the vernal equinox at the
 * reference epoch, right-handed.
 */
import { MU_EARTH, R_EARTH, OMEGA_EARTH, J2_EARTH, DEG } from './constants';
import { Vec3, v3, add, sub, scale, dot, cross, norm, normalize } from './vec3';

export interface OrbitalElements {
  /** semi-major axis, m (negative for hyperbolic) */
  a: number;
  /** eccentricity */
  e: number;
  /** inclination, rad */
  i: number;
  /** right ascension of ascending node, rad */
  raan: number;
  /** argument of periapsis, rad */
  argp: number;
  /** true anomaly, rad */
  nu: number;
  /** specific orbital energy, J/kg */
  energy: number;
  /** specific angular momentum magnitude, m^2/s */
  h: number;
  /** apoapsis altitude above R_EARTH, m (Infinity if unbound) */
  apoapsisAlt: number;
  /** periapsis altitude above R_EARTH, m */
  periapsisAlt: number;
  /** orbital period, s (Infinity if unbound) */
  period: number;
  /** argument of latitude (argp + nu), rad */
  u: number;
}

const TWO_PI = 2 * Math.PI;
export const wrap2pi = (x: number): number => ((x % TWO_PI) + TWO_PI) % TWO_PI;
export const wrapPi = (x: number): number => {
  const w = wrap2pi(x);
  return w > Math.PI ? w - TWO_PI : w;
};

/** Classical orbital elements from a state vector. */
export function elementsFromState(r: Vec3, v: Vec3, mu = MU_EARTH): OrbitalElements {
  const rm = norm(r);
  const vm2 = dot(v, v);
  const hVec = cross(r, v);
  const h = norm(hVec);
  const energy = vm2 / 2 - mu / rm;
  const a = -mu / (2 * energy);
  // eccentricity vector
  const eVec = sub(scale(cross(v, hVec), 1 / mu), scale(r, 1 / rm));
  const e = norm(eVec);
  const i = Math.acos(Math.max(-1, Math.min(1, hVec.z / h)));
  // node vector
  const nVec = v3(-hVec.y, hVec.x, 0);
  const n = norm(nVec);
  let raan = 0;
  if (n > 1e-10) {
    raan = Math.acos(Math.max(-1, Math.min(1, nVec.x / n)));
    if (nVec.y < 0) raan = TWO_PI - raan;
  }
  let argp = 0;
  let nu: number;
  if (n > 1e-10 && e > 1e-10) {
    argp = Math.acos(Math.max(-1, Math.min(1, dot(nVec, eVec) / (n * e))));
    if (eVec.z < 0) argp = TWO_PI - argp;
  }
  if (e > 1e-10) {
    nu = Math.acos(Math.max(-1, Math.min(1, dot(eVec, r) / (e * rm))));
    if (dot(r, v) < 0) nu = TWO_PI - nu;
  } else {
    // circular: measure from node (or from x-axis if equatorial)
    if (n > 1e-10) {
      nu = Math.acos(Math.max(-1, Math.min(1, dot(nVec, r) / (n * rm))));
      if (r.z < 0) nu = TWO_PI - nu;
    } else {
      nu = Math.acos(r.x / rm);
      if (r.y < 0) nu = TWO_PI - nu;
    }
  }
  const u = wrap2pi(argp + nu);
  const rp = (h * h) / mu / (1 + e);
  const periapsisAlt = rp - R_EARTH;
  let apoapsisAlt = Infinity;
  let period = Infinity;
  if (e < 1 && a > 0) {
    apoapsisAlt = a * (1 + e) - R_EARTH;
    period = TWO_PI * Math.sqrt((a * a * a) / mu);
  }
  return { a, e, i, raan, argp, nu, energy, h, apoapsisAlt, periapsisAlt, period, u };
}

/** State vector from classical elements (a, e, i, raan, argp, nu). */
export function stateFromElements(
  a: number,
  e: number,
  i: number,
  raan: number,
  argp: number,
  nu: number,
  mu = MU_EARTH,
): { r: Vec3; v: Vec3 } {
  const p = a * (1 - e * e);
  const rm = p / (1 + e * Math.cos(nu));
  // perifocal frame
  const rP = v3(rm * Math.cos(nu), rm * Math.sin(nu), 0);
  const sf = Math.sqrt(mu / p);
  const vP = v3(-sf * Math.sin(nu), sf * (e + Math.cos(nu)), 0);
  const q = perifocalToEci(i, raan, argp);
  return { r: q(rP), v: q(vP) };
}

/** Returns a function rotating perifocal vectors into ECI. */
export function perifocalToEci(i: number, raan: number, argp: number): (p: Vec3) => Vec3 {
  const cO = Math.cos(raan), sO = Math.sin(raan);
  const ci = Math.cos(i), si = Math.sin(i);
  const cw = Math.cos(argp), sw = Math.sin(argp);
  const m11 = cO * cw - sO * sw * ci, m12 = -cO * sw - sO * cw * ci, m13 = sO * si;
  const m21 = sO * cw + cO * sw * ci, m22 = -sO * sw + cO * cw * ci, m23 = -cO * si;
  const m31 = sw * si, m32 = cw * si, m33 = ci;
  return (p: Vec3) => v3(
    m11 * p.x + m12 * p.y + m13 * p.z,
    m21 * p.x + m22 * p.y + m23 * p.z,
    m31 * p.x + m32 * p.y + m33 * p.z,
  );
}

/** Unit normal of an orbit plane with given inclination and RAAN. */
export function planeNormal(i: number, raan: number): Vec3 {
  return v3(Math.sin(raan) * Math.sin(i), -Math.cos(raan) * Math.sin(i), Math.cos(i));
}

/** Circular orbital speed at radius r. */
export const circularSpeed = (r: number, mu = MU_EARTH): number => Math.sqrt(mu / r);

/** Vis-viva speed at radius r on an orbit with semi-major axis a. */
export const visViva = (r: number, a: number, mu = MU_EARTH): number =>
  Math.sqrt(Math.max(0, mu * (2 / r - 1 / a)));

/** Escape speed at radius r. */
export const escapeSpeed = (r: number, mu = MU_EARTH): number => Math.sqrt((2 * mu) / r);

/** Eccentric anomaly from true anomaly. */
export function eccentricFromTrue(nu: number, e: number): number {
  return Math.atan2(Math.sqrt(1 - e * e) * Math.sin(nu), e + Math.cos(nu));
}
/** Mean anomaly from true anomaly. */
export function meanFromTrue(nu: number, e: number): number {
  const E = eccentricFromTrue(nu, e);
  return wrap2pi(E - e * Math.sin(E));
}
/** True anomaly from mean anomaly (Newton iteration on Kepler's equation). */
export function trueFromMean(M: number, e: number): number {
  M = wrap2pi(M);
  let E = e < 0.8 ? M : Math.PI;
  for (let k = 0; k < 30; k++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return wrap2pi(2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2)));
}

/**
 * Time (s, >= 0) from the current state until the argument of latitude reaches
 * uTarget (rad). Uses Kepler's equation; only for bound orbits.
 */
export function timeToArgumentOfLatitude(el: OrbitalElements, uTarget: number, mu = MU_EARTH): number {
  if (!(el.e < 1)) return 0;
  const n = Math.sqrt(mu / (el.a * el.a * el.a));
  const nuTarget = wrap2pi(uTarget - el.argp);
  const Mnow = meanFromTrue(el.nu, el.e);
  const Mtarget = meanFromTrue(nuTarget, el.e);
  return wrap2pi(Mtarget - Mnow) / n;
}

/** Time until apoapsis (nu = pi). */
export function timeToApoapsis(el: OrbitalElements, mu = MU_EARTH): number {
  return timeToArgumentOfLatitude(el, el.argp + Math.PI, mu);
}
/** Time until periapsis (nu = 0). */
export function timeToPeriapsis(el: OrbitalElements, mu = MU_EARTH): number {
  return timeToArgumentOfLatitude(el, el.argp, mu);
}

/** Propagate a Keplerian state by dt seconds (two-body, analytic). */
export function propagateKepler(r: Vec3, v: Vec3, dt: number, mu = MU_EARTH): { r: Vec3; v: Vec3 } {
  const el = elementsFromState(r, v, mu);
  if (!(el.e < 1) || el.a <= 0) {
    // hyperbolic/parabolic: fall back to a short numeric step chain (rare in this app)
    let rr = r, vv = v;
    const steps = Math.max(1, Math.ceil(Math.abs(dt) / 10));
    const h = dt / steps;
    for (let k = 0; k < steps; k++) {
      const a1 = scale(rr, -mu / Math.pow(norm(rr), 3));
      const rMid = add(rr, scale(vv, h / 2));
      const a2 = scale(rMid, -mu / Math.pow(norm(rMid), 3));
      rr = add(add(rr, scale(vv, h)), scale(a1, h * h / 2));
      vv = add(vv, scale(add(a1, a2), h / 2));
    }
    return { r: rr, v: vv };
  }
  const n = Math.sqrt(mu / (el.a * el.a * el.a));
  const M = meanFromTrue(el.nu, el.e) + n * dt;
  const nu = trueFromMean(M, el.e);
  return stateFromElements(el.a, el.e, el.i, el.raan, el.argp, nu, mu);
}

/** Sample an orbit ellipse (N points) for drawing. */
export function sampleOrbit(el: OrbitalElements, N = 180, mu = MU_EARTH): Vec3[] {
  const pts: Vec3[] = [];
  if (!(el.e < 1)) return pts;
  for (let k = 0; k <= N; k++) {
    const nu = (k / N) * TWO_PI;
    pts.push(stateFromElements(el.a, el.e, el.i, el.raan, el.argp, nu, mu).r);
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Time, Earth rotation, Sun
// ---------------------------------------------------------------------------

/** Julian date from a JS Date (UTC). */
export function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Greenwich Mean Sidereal Time, rad, from Julian date (IAU 1982 formula). */
export function gmst(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  let s = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
  return wrap2pi(s * DEG);
}

/** ECI position of a ground point (geodetic-ish spherical model). */
export function groundPositionEci(latRad: number, lonRad: number, altM: number, theta: number): Vec3 {
  const R = R_EARTH + altM;
  const lam = lonRad + theta;
  return v3(R * Math.cos(latRad) * Math.cos(lam), R * Math.cos(latRad) * Math.sin(lam), R * Math.sin(latRad));
}

/** Inertial velocity of a point fixed to the rotating Earth. */
export function groundVelocityEci(rEci: Vec3): Vec3 {
  return cross(v3(0, 0, OMEGA_EARTH), rEci);
}

/** Geographic latitude/longitude (rad) from an ECI position and sidereal angle. */
export function eciToLatLon(r: Vec3, theta: number): { lat: number; lon: number; alt: number } {
  const rm = norm(r);
  const lat = Math.asin(r.z / rm);
  const lon = wrapPi(Math.atan2(r.y, r.x) - theta);
  return { lat, lon, alt: rm - R_EARTH };
}

/** Local East/North/Up unit vectors at an ECI position. */
export function enuFrame(r: Vec3): { east: Vec3; north: Vec3; up: Vec3 } {
  const up = normalize(r);
  let east = cross(v3(0, 0, 1), up);
  if (norm(east) < 1e-9) east = v3(0, 1, 0);
  east = normalize(east);
  const north = cross(up, east);
  return { east, north, up };
}

/** Unit vector toward the Sun in ECI (low-precision solar ephemeris). */
export function sunDirectionEci(jd: number): Vec3 {
  const n = jd - 2451545.0;
  const L = wrap2pi((280.46 + 0.9856474 * n) * DEG);
  const g = wrap2pi((357.528 + 0.9856003 * n) * DEG);
  const lambda = L + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG;
  const eps = (23.439 - 0.0000004 * n) * DEG;
  return v3(Math.cos(lambda), Math.cos(eps) * Math.sin(lambda), Math.sin(eps) * Math.sin(lambda));
}

/** Right ascension of the Sun, rad. */
export function sunRightAscension(jd: number): number {
  const s = sunDirectionEci(jd);
  return wrap2pi(Math.atan2(s.y, s.x));
}

// ---------------------------------------------------------------------------
// Launch geometry
// ---------------------------------------------------------------------------

/**
 * Inertial launch azimuth (rad, clockwise from north) to reach inclination i
 * from latitude lat. Returns null if i < |lat| (unreachable without a dogleg).
 * `descending` selects the southbound (second) solution.
 */
export function inertialLaunchAzimuth(latRad: number, incRad: number, descending = false): number | null {
  const c = Math.cos(incRad) / Math.cos(latRad);
  if (Math.abs(c) > 1) return null;
  const beta = Math.asin(c); // northbound solution
  return descending ? Math.PI - beta : beta;
}

/**
 * Launch azimuth in the rotating frame (rad), correcting the inertial azimuth
 * for Earth's rotation, for a target circular orbit speed vOrbit (m/s).
 */
export function rotatingLaunchAzimuth(latRad: number, incRad: number, vOrbit: number, descending = false): number | null {
  const bi = inertialLaunchAzimuth(latRad, incRad, descending);
  if (bi === null) return null;
  const vEq = OMEGA_EARTH * R_EARTH * Math.cos(latRad);
  const num = vOrbit * Math.sin(bi) - vEq;
  const den = vOrbit * Math.cos(bi);
  return Math.atan2(num, den);
}

/**
 * Sun-synchronous inclination (rad) for a circular orbit of semi-major axis a.
 * From the J2 nodal precession rate matched to 360°/year.
 */
export function sunSyncInclination(a: number, e = 0): number {
  const rate = (2 * Math.PI) / (365.2422 * 86400); // rad/s
  const n = Math.sqrt(MU_EARTH / (a * a * a));
  const p = a * (1 - e * e);
  const cosi = -(rate * 2 * p * p) / (3 * n * J2_EARTH * R_EARTH * R_EARTH);
  return Math.acos(Math.max(-1, Math.min(1, cosi)));
}

/** Secular J2 nodal precession rate, rad/s. */
export function nodalPrecessionRate(a: number, e: number, i: number): number {
  const n = Math.sqrt(MU_EARTH / (a * a * a));
  const p = a * (1 - e * e);
  return -1.5 * n * J2_EARTH * (R_EARTH / p) * (R_EARTH / p) * Math.cos(i);
}

/** Secular J2 apsidal rotation rate, rad/s. */
export function apsidalRotationRate(a: number, e: number, i: number): number {
  const n = Math.sqrt(MU_EARTH / (a * a * a));
  const p = a * (1 - e * e);
  return 0.75 * n * J2_EARTH * (R_EARTH / p) * (R_EARTH / p) * (5 * Math.cos(i) * Math.cos(i) - 1);
}

/**
 * The RAAN an orbit gets when launching from (lat, inertial longitude λ) with
 * inclination i, northbound (ascending) or southbound. Spherical trigonometry:
 * sin(u) = sin(lat)/sin(i); cos(Δλ) = cos(u)/cos(lat).
 */
export function raanFromLaunch(latRad: number, inertialLonRad: number, incRad: number, descending = false): number {
  const si = Math.sin(incRad);
  let sinu = si > 1e-9 ? Math.sin(latRad) / si : 0;
  sinu = Math.max(-1, Math.min(1, sinu));
  let u = Math.asin(sinu);
  if (descending) u = Math.PI - u;
  // Δλ = atan2(sin u * cos i, cos u)
  const dlam = Math.atan2(Math.sin(u) * Math.cos(incRad), Math.cos(u));
  return wrap2pi(inertialLonRad - dlam);
}
