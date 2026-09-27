/**
 * The Sun's activity and the geomagnetic field as the lifetime model reads
 * them (roadmap R05): the 10.7 cm solar radio flux F10.7 and the daily
 * planetary Ap, either held at one of ECSS's standard levels or measured
 * month by month — then forecast by NOAA, then, beyond the forecast, the Sun
 * taken to repeat itself eleven years on.
 *
 * The measured series is built from
 *
 * - GFZ's monthly means since 1947 (src/data/solar-history.ts), fixed;
 * - the months after them from NOAA SWPC's observed monthly flux, and the
 *   last thirty days' daily flux (the space-weather dataset, offline from its
 *   snapshot, online from SWPC);
 * - the daily Ap of the last week from SWPC's 3-hourly Kp;
 * - SWPC's monthly forecast of the flux (expected, or the high or low side of
 *   its range) to the end of the forecast;
 * - where no Ap is measured, its long-term mean.
 *
 * A series is plain arrays, so it crosses to the lifetime worker as it is.
 * DOM-free; tests/activity.test.ts.
 */
import { SOLAR_HISTORY } from '../../data/solar-history';
import type { SpaceWeather } from '../../provider/space-weather';

/** F10.7 (solar flux units, 10⁻²² W m⁻² Hz⁻¹; a monthly or 81-day mean) and the daily planetary Ap. */
export interface Indices { f107: number; ap: number }

/** Values at Julian dates (UT, ascending), read by linear interpolation and held at the ends. */
export interface Track { jd: number[]; v: number[] }
export interface ActivitySeries { f107: Track; ap: Track }

/** What the density reads: fixed indices or a series through time. */
export type Activity = Indices | ActivitySeries;

/**
 * ECSS's levels of long-term solar and geomagnetic activity
 * (ECSS-E-ST-10-04C, 15 November 2008, Annex G): low F10.7 = 65, Ap = 0;
 * moderate 140, 15; high (long-term) 250, 45 — the three the NRLMSISE-00
 * profiles of src/physics/propagator/density.ts are tabulated for.
 */
export const ECSS_LEVELS = {
  low: { f107: 65, ap: 0 },
  moderate: { f107: 140, ap: 15 },
  high: { f107: 250, ap: 45 },
} as const satisfies Record<string, Indices>;
export type EcssLevel = keyof typeof ECSS_LEVELS;

/**
 * Ap where none is measured: 13, the mean daily Ap over solar cycles 19 to 24
 * (1954-04 to 2019-11: 13.2, from GFZ's file of the indices,
 * https://doi.org/10.5880/Kp.0001). SWPC forecasts no Ap beyond a few weeks.
 */
export const AP_CLIMATOLOGY = 13;

/** A solar cycle, for the Sun beyond NOAA's forecast: eleven years, as 132 months. */
export const CYCLE_MONTHS = 132;

/** The indices at `jd`. */
export function indicesAt(a: Activity, jd: number): Indices {
  if (typeof a.f107 === 'number') return a as Indices;
  const s = a as ActivitySeries;
  return { f107: read(s.f107, jd), ap: read(s.ap, jd) };
}

/** Linear interpolation in a track, held at its ends. */
export function read(t: Track, jd: number): number {
  const { jd: x, v } = t;
  const n = x.length;
  if (jd <= x[0]) return v[0];
  if (jd >= x[n - 1]) return v[n - 1];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (x[mid] <= jd) lo = mid; else hi = mid;
  }
  return v[lo] + ((v[hi] - v[lo]) * (jd - x[lo])) / (x[hi] - x[lo]);
}

/**
 * The 3-hourly ap for a Kp (0 to 9 in thirds; SWPC writes 2.33 for 2+ … ):
 * Bartels's table, as GFZ gives it (Matzka et al. 2021,
 * https://doi.org/10.1029/2020SW002641).
 */
const AP_OF_KP = [0, 2, 3, 4, 5, 6, 7, 9, 12, 15, 18, 22, 27, 32, 39, 48, 56, 67, 80, 94, 111, 132, 154, 179, 207, 236, 300, 400];
export function kpToAp(kp: number): number {
  return AP_OF_KP[Math.max(0, Math.min(27, Math.round(kp * 3)))];
}

/** The daily Ap — the mean of its eight 3-hourly ap — for each UT day the Kp readings cover in full. */
export function dailyAp(kp: SpaceWeather['kp']): { date: string; ap: number }[] {
  const days = new Map<string, number[]>();
  for (const r of kp) {
    const date = r.time.slice(0, 10);
    days.set(date, [...(days.get(date) ?? []), kpToAp(r.kp)]);
  }
  return [...days].filter(([, aps]) => aps.length === 8)
    .map(([date, aps]) => ({ date, ap: aps.reduce((s, x) => s + x, 0) / 8 }));
}

// ─── the measured series ────────────────────────────────────────────────────

/** The Julian date of a UTC calendar date. */
const jdOf = (y: number, m: number, d: number): number => Date.UTC(y, m - 1, d) / 86400000 + 2440587.5;
/** A month, YYYY-MM, as a count of months. */
const monthIndex = (ym: string): number => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;
const monthName = (k: number): string => `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`;
/** The middle of a month, as a Julian date. */
const monthCentre = (k: number): number => {
  const y = Math.floor(k / 12), m = (k % 12) + 1;
  return (jdOf(y, m, 1) + jdOf(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1)) / 2;
};

export type ForecastSide = 'expected' | 'high' | 'low';

export interface MeasuredActivity {
  series: ActivitySeries;
  /** the last month of measured flux, YYYY-MM */
  measuredTo: string;
  /** the last day of the recent daily flux, YYYY-MM-DD, when the dataset has any newer than the months */
  recentTo: string | null;
  /** the last month of NOAA's forecast, YYYY-MM; null without one */
  forecastTo: string | null;
  /** from when the Sun is taken to repeat itself, YYYY-MM */
  repeatFrom: string;
}

/**
 * The measured, then forecast, series from the space-weather dataset (null:
 * the fixed history alone), running `years` past its last forecast month.
 */
export function measuredActivity(sw: SpaceWeather | null, side: ForecastSide = 'expected', years = 60): MeasuredActivity {
  const f: Track = { jd: [], v: [] }, ap: Track = { jd: [], v: [] };
  const push = (t: Track, jd: number, v: number): void => {
    if (t.jd.length && jd <= t.jd[t.jd.length - 1]) return;
    t.jd.push(jd); t.v.push(v);
  };
  // GFZ's months
  const first = monthIndex(SOLAR_HISTORY.from);
  SOLAR_HISTORY.f107.forEach((v, k) => push(f, monthCentre(first + k), v));
  SOLAR_HISTORY.ap.forEach((v, k) => push(ap, monthCentre(first + k), v));
  let last = first + SOLAR_HISTORY.f107.length - 1;
  // SWPC's months after them; SWPC publishes no monthly Ap, so the mean holds from here
  for (const r of sw?.monthly ?? []) {
    const k = monthIndex(r.month);
    if (k > last) { push(f, monthCentre(k), r.f107); last = k; }
  }
  const measuredTo = monthName(last);
  push(ap, monthCentre(first + SOLAR_HISTORY.ap.length), AP_CLIMATOLOGY);
  // the last thirty days' flux, as one mean at their middle, when they are newer than the months
  let recentTo: string | null = null;
  const days = (sw?.f107 ?? []).map((r) => ({ jd: jdOf(Number(r.date.slice(0, 4)), Number(r.date.slice(5, 7)), Number(r.date.slice(8, 10))) + 0.5, flux: r.flux }));
  if (days.length) {
    const mid = (days[0].jd + days[days.length - 1].jd) / 2;
    if (mid > f.jd[f.jd.length - 1]) {
      push(f, mid, days.reduce((s, d) => s + d.flux, 0) / days.length);
      recentTo = sw!.f107[sw!.f107.length - 1].date;
    }
  }
  // the last week's Ap from Kp, between stretches of the long-term mean
  const recentAp = dailyAp(sw?.kp ?? []).map((r) => ({ jd: jdOf(Number(r.date.slice(0, 4)), Number(r.date.slice(5, 7)), Number(r.date.slice(8, 10))) + 0.5, ap: r.ap }));
  if (recentAp.length) {
    push(ap, recentAp[0].jd - 1, AP_CLIMATOLOGY);
    for (const r of recentAp) push(ap, r.jd, r.ap);
    push(ap, recentAp[recentAp.length - 1].jd + 1, AP_CLIMATOLOGY);
  }
  // NOAA's forecast after the last measurement
  let forecastTo: string | null = null;
  for (const r of sw?.forecast ?? []) {
    const k = monthIndex(r.month), jd = monthCentre(k);
    if (jd <= f.jd[f.jd.length - 1]) continue;
    push(f, jd, side === 'high' ? r.high : side === 'low' ? r.low : r.f107);
    forecastTo = r.month;
    last = k;
  }
  // then the Sun repeating itself, a cycle on, month by month
  const repeatFrom = monthName(last + 1);
  for (let k = last + 1; k <= last + years * 12; k++) push(f, monthCentre(k), read(f, monthCentre(k - CYCLE_MONTHS)));
  push(ap, f.jd[f.jd.length - 1], AP_CLIMATOLOGY);
  return { series: { f107: f, ap }, measuredTo, recentTo, forecastTo, repeatFrom };
}
