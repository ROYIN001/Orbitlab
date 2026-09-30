/**
 * Where the Moon and the Sun are, in the simulation's inertial frame, well
 * enough to fly to the Moon (roadmap C01, docs/PHYSICS.md §13.10).
 *
 * The simulation's ECI is the mean equator and equinox of date — its Earth
 * turns by the mean sidereal time (`gmst`). The ephemerides are the ICRF's
 * (J2000's, to 17 milliarcseconds), so they are precessed to the date
 * (IAU 1976: Lieske et al. 1977); nutation, nine arc-seconds, is left out as
 * the Earth's own rotation leaves it out.
 *
 * For Apollo 11's week, 1969-07-16 13:00 to 07-24 18:00 TDB, the positions
 * and velocities are JPL's DE441 (`src/data/ephemeris-1969.ts`), interpolated
 * by cubic Hermite between the hourly states: metres. Outside it, the
 * low-precision series of `ephemeris-series.ts` (the lifetime propagator's) — a few hundred kilometres
 * for the Moon — which only the drawing uses.
 */
import { MOON_1969, SUN_1969 } from '../../data/ephemeris-1969';
import { moonPosition as moonSeries, sunPosition as sunSeries } from '../ephemeris-series';
import { v3, type Vec3 } from '../vec3';

/** The Moon's gravitational parameter, m³/s² (DE441). */
export const MU_MOON = 4.902800066e12;
/** The Sun's, m³/s². */
export const MU_SUN = 1.32712440018e20;
/** The Moon's mean radius, m (IAU). */
export const R_MOON = 1737.4e3;
/**
 * TDB − UTC in July 1969, s: TT − TAI 32.184 s, and TAI − UTC 7.56 s on the
 * drifting UTC of 1968–1971 (4.2131700 s + 0.002592 s a day from MJD 39126;
 * USNO); TDB − TT is under two milliseconds.
 */
export const TDB_MINUS_UTC_1969 = 39.75;

const ARCSEC = Math.PI / 180 / 3600;

export interface BodyState { r: Vec3; v: Vec3 }

/** The IAU 1976 precession matrix from J2000 to the mean equator and equinox of `jd`, row-major. */
export function precessionFromJ2000(jd: number): number[] {
  const T = (jd - 2451545.0) / 36525;
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) * ARCSEC;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) * ARCSEC;
  const theta = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) * ARCSEC;
  const cz = Math.cos(zeta), sz = Math.sin(zeta), cZ = Math.cos(z), sZ = Math.sin(z), ct = Math.cos(theta), st = Math.sin(theta);
  return [
    cz * ct * cZ - sz * sZ, -sz * ct * cZ - cz * sZ, -st * cZ,
    cz * ct * sZ + sz * cZ, -sz * ct * sZ + cz * cZ, -st * sZ,
    cz * st, -sz * st, ct,
  ];
}

const apply = (m: number[], x: number, y: number, z: number): Vec3 =>
  v3(m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z);

type Table = { jd0: number; stepHours: number; count: number; data: readonly number[] };

/** Cubic Hermite between the table's hourly states, km and km/s in the ICRF; null outside it. */
function interpolate(table: Table, jdTdb: number): { r: [number, number, number]; v: [number, number, number] } | null {
  const h = table.stepHours / 24;
  const x = (jdTdb - table.jd0) / h;
  const i = Math.floor(x);
  if (i < 0 || i >= table.count - 1) return null;
  const s = x - i, dt = h * 86400;
  const a = table.data, k0 = i * 6, k1 = k0 + 6;
  const h00 = 2 * s ** 3 - 3 * s * s + 1, h10 = s ** 3 - 2 * s * s + s, h01 = -2 * s ** 3 + 3 * s * s, h11 = s ** 3 - s * s;
  const d00 = (6 * s * s - 6 * s) / dt, d10 = (3 * s * s - 4 * s + 1), d01 = (-6 * s * s + 6 * s) / dt, d11 = (3 * s * s - 2 * s);
  const r: [number, number, number] = [0, 0, 0], v: [number, number, number] = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const p0 = a[k0 + c], p1 = a[k1 + c], m0 = a[k0 + 3 + c], m1 = a[k1 + 3 + c];
    r[c] = h00 * p0 + h10 * dt * m0 + h01 * p1 + h11 * dt * m1;
    v[c] = d00 * p0 + d10 * m0 + d01 * p1 + d11 * m1;
  }
  return { r, v };
}

function state(table: Table, series: (jd: number) => [number, number, number], jdUtc: number): BodyState {
  const jdTdb = jdUtc + TDB_MINUS_UTC_1969 / 86400;
  const p = precessionFromJ2000(jdUtc);
  const hit = interpolate(table, jdTdb);
  if (hit) {
    return { r: apply(p, hit.r[0] * 1e3, hit.r[1] * 1e3, hit.r[2] * 1e3), v: apply(p, hit.v[0] * 1e3, hit.v[1] * 1e3, hit.v[2] * 1e3) };
  }
  // the series, J2000's ecliptic turned to its equator, precessed; the velocity by a central difference
  const d = 60 / 86400;
  const a = series(jdUtc - d), b = series(jdUtc + d), c = series(jdUtc);
  return { r: apply(p, c[0], c[1], c[2]), v: apply(p, (b[0] - a[0]) / 120, (b[1] - a[1]) / 120, (b[2] - a[2]) / 120) };
}

/** The Moon's geocentric position (m) and velocity (m/s) at UTC Julian date `jd`, mean equator of date. */
export function moonState(jd: number): BodyState {
  return state(MOON_1969, moonSeries, jd);
}

/** The Sun's geocentric position (m) and velocity (m/s) at UTC Julian date `jd`, mean equator of date. */
export function sunState(jd: number): BodyState {
  return state(SUN_1969, sunSeries, jd);
}

/** Whether `jd` (UTC) is inside the DE441 table, where the Moon is known to metres. */
export function inEphemerisTable(jd: number): boolean {
  const jdTdb = jd + TDB_MINUS_UTC_1969 / 86400;
  return jdTdb >= MOON_1969.jd0 && jdTdb <= MOON_1969.jd0 + ((MOON_1969.count - 1) * MOON_1969.stepHours) / 24;
}

/**
 * The third-body pull of a body at `rb` (geocentric) on a point at `r`, in the
 * geocentric frame: its direct pull less its pull on the Earth, m/s².
 */
export function thirdBody(r: Vec3, rb: Vec3, mu: number): Vec3 {
  const dx = rb.x - r.x, dy = rb.y - r.y, dz = rb.z - r.z;
  const d3 = Math.pow(dx * dx + dy * dy + dz * dz, 1.5);
  const b3 = Math.pow(rb.x * rb.x + rb.y * rb.y + rb.z * rb.z, 1.5);
  return v3(mu * (dx / d3 - rb.x / b3), mu * (dy / d3 - rb.y / b3), mu * (dz / d3 - rb.z / b3));
}
