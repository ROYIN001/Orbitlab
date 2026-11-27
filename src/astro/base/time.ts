/**
 * Time scales of the astro base (PF-10): UTC, TAI, TT, UT1 and TDB on Julian
 * dates held in two parts, and the Earth-orientation values read between the
 * days of a table. Seconds, days, radians. Imports nothing.
 *
 * The leap-second and drift tables (TAI - UTC from 1960 on) are those of ERFA
 * 2.0.1.5 (liberfa), `dat.c`, read from the pyerfa 2.0.1.5 source archive. The
 * two-term TDB - TT series is the classical form with the work plan's numbers;
 * it is held to ERFA's `dtdb` in the tests, not taken from it.
 *
 * Conventions where the signatures leave room:
 * - A Jd2 may be split in any way on input. A conversion leaves `a` as given
 *   and moves the offset into `b`, as ERFA does; nothing is carried or
 *   renormalized, so `b` may leave [0, 1).
 * - UTC is the app's: every day has 86,400 s and 23:59:60 has no value of its
 *   own. TAI - UTC steps at 0 h UTC of the day after a leap second, and is
 *   constant through a UTC day from 1972 on.
 * - Before 1960-01-01 the value at that instant is held (ERFA gives 0); after
 *   the last leap second in the table the last value is held.
 * - A non-finite number in any input gives NaN in every number returned and
 *   nothing throws; `eopAt` is the exception, today's function for every instant.
 * - Each function returns a fresh object; an input is never changed.
 */
export interface Jd2 { a: number; b: number }
export const JD_J2000 = 2451545.0;
export const TT_MINUS_TAI = 32.184; // s

const NAN2 = (): Jd2 => ({ a: NaN, b: NaN });
/** True unless every argument is finite (x * 0 is 0 only for a finite x, and cannot overflow). */
const nonFinite = (...v: number[]) => v.reduce((s, x) => s + x * 0, 0) !== 0;
const DAY = 86400;
/** Modified Julian day number of a civil date, 0 h. */
const mjd = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 86400000 + 40587;

/** The Julian date in one number, split into the half-integer day at or before it and the rest. */
export function jd2(jd: number): Jd2 {
  if (nonFinite(jd)) return NAN2();
  const a = Math.floor(jd - 0.5) + 0.5;
  return { a, b: jd - a };
}

/** TAI - UTC from ERFA's `dat.c`: [year, month, value at the start, MJD of the drift's reference, drift in s/day]; the drift is 0 from 1972 on. */
const DAT: readonly (readonly [number, number, number, number, number])[] = [
  [1960, 1, 1.4178180, 37300.0, 0.0012960],
  [1961, 1, 1.4228180, 37300.0, 0.0012960],
  [1961, 8, 1.3728180, 37300.0, 0.0012960],
  [1962, 1, 1.8458580, 37665.0, 0.0011232],
  [1963, 11, 1.9458580, 37665.0, 0.0011232],
  [1964, 1, 3.2401300, 38761.0, 0.0012960],
  [1964, 4, 3.3401300, 38761.0, 0.0012960],
  [1964, 9, 3.4401300, 38761.0, 0.0012960],
  [1965, 1, 3.5401300, 38761.0, 0.0012960],
  [1965, 3, 3.6401300, 38761.0, 0.0012960],
  [1965, 7, 3.7401300, 38761.0, 0.0012960],
  [1965, 9, 3.8401300, 38761.0, 0.0012960],
  [1966, 1, 4.3131700, 39126.0, 0.0025920],
  [1968, 2, 4.2131700, 39126.0, 0.0025920],
  [1972, 1, 10.0, 0, 0],
  [1972, 7, 11.0, 0, 0],
  [1973, 1, 12.0, 0, 0],
  [1974, 1, 13.0, 0, 0],
  [1975, 1, 14.0, 0, 0],
  [1976, 1, 15.0, 0, 0],
  [1977, 1, 16.0, 0, 0],
  [1978, 1, 17.0, 0, 0],
  [1979, 1, 18.0, 0, 0],
  [1980, 1, 19.0, 0, 0],
  [1981, 7, 20.0, 0, 0],
  [1982, 7, 21.0, 0, 0],
  [1983, 7, 22.0, 0, 0],
  [1985, 7, 23.0, 0, 0],
  [1988, 1, 24.0, 0, 0],
  [1990, 1, 25.0, 0, 0],
  [1991, 1, 26.0, 0, 0],
  [1992, 7, 27.0, 0, 0],
  [1993, 7, 28.0, 0, 0],
  [1994, 7, 29.0, 0, 0],
  [1996, 1, 30.0, 0, 0],
  [1997, 7, 31.0, 0, 0],
  [1999, 1, 32.0, 0, 0],
  [2006, 1, 33.0, 0, 0],
  [2009, 1, 34.0, 0, 0],
  [2012, 7, 35.0, 0, 0],
  [2015, 7, 36.0, 0, 0],
  [2017, 1, 37.0, 0, 0],
];
const DAT_START = DAT.map((e) => mjd(e[0], e[1], 1));

/** TAI - UTC, s, at a UTC instant. */
export function taiMinusUtc(utc: Jd2): number {
  if (nonFinite(utc.a, utc.b)) return NaN;
  const t = (utc.a - 2400000.5) + utc.b;
  let day = Math.floor(t);
  let fd = t - day;
  if (day < DAT_START[0]) { day = DAT_START[0]; fd = 0; }
  let i = DAT.length - 1;
  while (i > 0 && day < DAT_START[i]) i--;
  const e = DAT[i];
  return e[4] === 0 ? e[2] : e[2] + (day + fd - e[3]) * e[4];
}

export function utcToTai(utc: Jd2): Jd2 {
  if (nonFinite(utc.a, utc.b)) return NAN2();
  return { a: utc.a, b: utc.b + taiMinusUtc(utc) / DAY };
}

/** One correction pass: u0 = tai - (TAI - UTC)(tai read as UTC), then tai - (TAI - UTC)(u0). */
export function taiToUtc(tai: Jd2): Jd2 {
  if (nonFinite(tai.a, tai.b)) return NAN2();
  const u0 = { a: tai.a, b: tai.b - taiMinusUtc(tai) / DAY };
  return { a: tai.a, b: tai.b - taiMinusUtc(u0) / DAY };
}

export function taiToTt(tai: Jd2): Jd2 {
  if (nonFinite(tai.a, tai.b)) return NAN2();
  return { a: tai.a, b: tai.b + TT_MINUS_TAI / DAY };
}
export function ttToTai(tt: Jd2): Jd2 {
  if (nonFinite(tt.a, tt.b)) return NAN2();
  return { a: tt.a, b: tt.b - TT_MINUS_TAI / DAY };
}
export const utcToTt = (utc: Jd2): Jd2 => taiToTt(utcToTai(utc));
export const ttToUtc = (tt: Jd2): Jd2 => taiToUtc(ttToTai(tt));

/**
 * TDB - TT, s: the classical two-term form in the Earth's mean anomaly, with the numbers the work plan
 * gives (S20 wave 1, Task 2). It corresponds to the largest term of ERFA's `dtdb.c` and that term's first
 * harmonic; ERFA `dtdb` is what it is held to (within 50 microseconds, 1960 to 2060), not where it comes from.
 */
export function tdbMinusTt(tt: Jd2): number {
  if (nonFinite(tt.a, tt.b)) return NaN;
  const g = (357.53 + 0.98560028 * ((tt.a - JD_J2000) + tt.b)) * (Math.PI / 180);
  return 0.001657 * Math.sin(g) + 0.000014 * Math.sin(2 * g);
}

/** UT1 from UTC, dut1 = UT1 - UTC in s. */
export function utcToUt1(utc: Jd2, dut1: number): Jd2 {
  if (nonFinite(utc.a, utc.b, dut1)) return NAN2();
  return { a: utc.a, b: utc.b + dut1 / DAY };
}

/** Julian centuries since J2000, part by part. */
export function julianCenturies(t: Jd2): number {
  if (nonFinite(t.a, t.b)) return NaN;
  return ((t.a - JD_J2000) + t.b) / 36525;
}

/** Daily values at 0 h UTC from `from` (YYYY-MM-DD): UT1 - UTC in s, the pole in arcseconds. */
export interface EopTable { from: string; dut1: number[]; xp: number[]; yp: number[] }
/** UT1 - UTC in s, the pole in rad, and where the instant lies against the table. */
export interface Eop { dut1: number; xp: number; yp: number; quality: 'data' | 'held' | 'none' }

/** Arcseconds to radians. */
const ARCSEC = Math.PI / (180 * 3600);

/**
 * Earth orientation at a UTC instant, the arithmetic of src/orbit/earth-orientation.ts copied operation
 * for operation: linear between days, the nearest held beyond the ends, a leap-second day keeping its own
 * UT1 - UTC. Today's function for every instant, non-finite ones included.
 */
export function eopAt(table: EopTable | null, utc: Jd2): Eop {
  if (!table) return { dut1: 0, xp: 0, yp: 0, quality: 'none' };
  const jd = utc.a + utc.b;
  const start = Date.parse(`${table.from}T00:00:00Z`) / 86400000 + 2440587.5;
  const n = table.dut1.length;
  const x = jd - start;
  if (x <= 0) return { dut1: table.dut1[0], xp: table.xp[0] * ARCSEC, yp: table.yp[0] * ARCSEC, quality: x === 0 ? 'data' : 'held' };
  if (x >= n - 1) return { dut1: table.dut1[n - 1], xp: table.xp[n - 1] * ARCSEC, yp: table.yp[n - 1] * ARCSEC, quality: x === n - 1 ? 'data' : 'held' };
  const k = Math.floor(x), f = x - k;
  const lerp = (a: number[]) => a[k] + (a[k + 1] - a[k]) * f;
  const dut1 = Math.abs(table.dut1[k + 1] - table.dut1[k]) > 0.5 ? table.dut1[k] : lerp(table.dut1);
  return { dut1, xp: lerp(table.xp) * ARCSEC, yp: lerp(table.yp) * ARCSEC, quality: x > 0 && x < n - 1 ? 'data' : 'held' };
}
