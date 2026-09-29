/**
 * The Sun's activity and the geomagnetic field as the density reads them
 * (roadmap R05, P2.5): for each UT day, what NRLMSISE-00 asks for — the
 * previous day's 10.7 cm solar radio flux F10.7, its 81-day mean centred on
 * the day, and the day's planetary Ap — either held at one of ECSS's standard
 * levels, or measured day by day, then forecast by NOAA, then, beyond the
 * forecast, the Sun's mean cycle.
 *
 * The measured series is built from
 *
 * - GFZ's daily observed F10.7 and Ap since 1954 (src/data/solar-daily.json,
 *   loaded when first asked for), fixed at the build;
 * - the months after them from NOAA SWPC's observed monthly flux, and the
 *   last thirty days' daily flux (the space-weather dataset, offline from its
 *   snapshot, online from SWPC);
 * - the daily Ap of the last week from SWPC's 3-hourly Kp;
 * - SWPC's monthly forecast of the flux (expected, or the high or low side of
 *   its range) to the end of the forecast;
 * - beyond it, and for the Ap wherever none is measured, the mean of solar
 *   cycles 19 to 24 month by month from their minima (with its spread across
 *   them for the high and low sides), taken to repeat from cycle 25's
 *   minimum, eleven years at a time.
 *
 * Until P2.5 the series was monthly and the Ap beyond a measured week a
 * constant 13; a storm was a month's mean, and the Ap ignored the cycle.
 *
 * A series is plain arrays, so it crosses to the lifetime worker as it is.
 * DOM-free; tests/activity.test.ts.
 */
import type { SpaceWeather } from '../../provider/space-weather';

/** What NRLMSISE-00 reads of the Sun and the field for a day (solar flux units, 10⁻²² W m⁻² Hz⁻¹). */
export interface Indices {
  /** the previous day's observed F10.7 */
  f107: number;
  /** the 81-day mean of the observed F10.7, centred on the day */
  f107a: number;
  /** the day's planetary Ap */
  ap: number;
}

/** Indices day by day: day k (from 0 h UT of Julian date `from` + k) reads f107[k], f107a[k], ap[k]; held at the ends. */
export interface DailyActivity { from: number; f107: number[]; f107a: number[]; ap: number[] }

/** What the density reads: fixed indices or a series through time. */
export type Activity = Indices | DailyActivity;

/**
 * ECSS's levels of long-term solar and geomagnetic activity
 * (ECSS-E-ST-10-04C, 15 November 2008, Annex G): low F10.7 = F10.7avg = 65,
 * Ap = 0; moderate 140, 15; high (long-term) 250, 45 — the three its tables
 * of NRLMSISE-00 are given for.
 */
export const ECSS_LEVELS = {
  low: { f107: 65, f107a: 65, ap: 0 },
  moderate: { f107: 140, f107a: 140, ap: 15 },
  high: { f107: 250, f107a: 250, ap: 45 },
} as const satisfies Record<string, Indices>;
export type EcssLevel = keyof typeof ECSS_LEVELS;

/** The indices at `jd`. */
export function indicesAt(a: Activity, jd: number): Indices {
  if (!('from' in a)) return a;
  const n = a.f107.length;
  const k = Math.max(0, Math.min(n - 1, Math.floor(jd - a.from)));
  return { f107: a.f107[k], f107a: a.f107a[k], ap: a.ap[k] };
}

/** The indices' mean over the days from `jd0` to `jd1` (at least the first day's). */
export function indicesOver(a: Activity, jd0: number, jd1: number): Indices {
  if (!('from' in a)) return a;
  const n = a.f107.length;
  const k0 = Math.max(0, Math.min(n - 1, Math.floor(jd0 - a.from)));
  const k1 = Math.max(k0 + 1, Math.min(n, Math.floor(jd1 - a.from)));
  let f107 = 0, f107a = 0, ap = 0;
  for (let k = k0; k < k1; k++) { f107 += a.f107[k]; f107a += a.f107a[k]; ap += a.ap[k]; }
  const m = k1 - k0;
  return { f107: f107 / m, f107a: f107a / m, ap: ap / m };
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

// ─── the daily history and the mean cycle ───────────────────────────────────

/** GFZ's daily indices as bundled: the observed F10.7 and the Ap of each UT day from `from` to `to` (YYYY-MM-DD). */
export interface SolarDaily { from: string; to: string; f107: number[]; ap: number[] }

let history: Promise<SolarDaily> | null = null;
/** The bundled daily history, loaded once, when first needed (it is some 200 kB). */
export function loadSolarDaily(): Promise<SolarDaily> {
  return history ??= import('../../data/solar-daily.json').then((m) => m.default as SolarDaily);
}

/**
 * The months that began solar cycles 19 to 25: the minima of the 13-month
 * smoothed sunspot number (SILSO, Royal Observatory of Belgium,
 * https://www.sidc.be/SILSO/cyclesminmax).
 */
export const CYCLE_MINIMA = ['1954-04', '1964-10', '1976-03', '1986-09', '1996-08', '2008-12', '2019-12'] as const;

/** A solar cycle, for the Sun beyond NOAA's forecast: eleven years, as 132 months. */
export const CYCLE_MONTHS = 132;

export interface MeanCycle {
  /** month by month from a minimum (132): the mean over cycles 19–24 of the monthly mean observed F10.7, sfu */
  f107: number[];
  /** its standard deviation across the six cycles, sfu */
  f107sd: number[];
  /** the mean of the monthly mean Ap */
  ap: number[];
}

/** The Julian date of 0 h UT on a calendar date. */
const jdOf = (y: number, m: number, d: number): number => Date.UTC(y, m - 1, d) / 86400000 + 2440587.5;
const jdOfDate = (s: string): number => jdOf(Number(s.slice(0, 4)), Number(s.slice(5, 7)), Number(s.slice(8, 10)));
/** A month, YYYY-MM, as a count of months. */
const monthIndex = (ym: string): number => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;
const monthName = (k: number): string => `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`;
/** The count of months of a Julian date. */
const monthOfJd = (jd: number): number => {
  const d = new Date((jd - 2440587.5) * 86400000);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
};
/** Where a Julian date falls in its month, 0 at its middle, as months (−0.5 to 0.5). */
const monthFraction = (jd: number): number => {
  const k = monthOfJd(jd), y = Math.floor(k / 12), m = (k % 12) + 1;
  const a = jdOf(y, m, 1), b = jdOf(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1);
  return (jd - a) / (b - a) - 0.5;
};

/** The monthly means of a daily history, by month count. */
function monthlyMeans(h: SolarDaily): Map<number, { f107: number; ap: number }> {
  const from = jdOfDate(h.from);
  const sums = new Map<number, [number, number, number]>();
  for (let k = 0; k < h.f107.length; k++) {
    const m = monthOfJd(from + k + 0.5);
    const s = sums.get(m) ?? [0, 0, 0];
    s[0] += h.f107[k]; s[1] += h.ap[k]; s[2]++;
    sums.set(m, s);
  }
  return new Map([...sums].map(([m, [f, a, n]]) => [m, { f107: f / n, ap: a / n }]));
}

/** The mean of cycles 19 to 24, month by month from their minima, from a daily history that covers them. */
export function meanCycle(h: SolarDaily): MeanCycle {
  const months = monthlyMeans(h);
  const out: MeanCycle = { f107: [], f107sd: [], ap: [] };
  for (let m = 0; m < CYCLE_MONTHS; m++) {
    const f: number[] = [], a: number[] = [];
    for (const start of CYCLE_MINIMA.slice(0, 6)) {
      const v = months.get(monthIndex(start) + m);
      if (!v) throw new Error(`the history lacks ${monthName(monthIndex(start) + m)}`);
      f.push(v.f107); a.push(v.ap);
    }
    const mean = f.reduce((s, x) => s + x, 0) / f.length;
    out.f107.push(mean);
    out.f107sd.push(Math.sqrt(f.reduce((s, x) => s + (x - mean) ** 2, 0) / (f.length - 1)));
    out.ap.push(a.reduce((s, x) => s + x, 0) / a.length);
  }
  return out;
}

// ─── the measured series ────────────────────────────────────────────────────

export type ForecastSide = 'expected' | 'high' | 'low';

export interface MeasuredActivity {
  series: DailyActivity;
  /** the last day of measured flux, YYYY-MM-DD (the history's, or the end of SWPC's last month) */
  measuredTo: string;
  /** the last day of the recent daily flux, YYYY-MM-DD, when the dataset has any newer than the history */
  recentTo: string | null;
  /** the last month of NOAA's forecast, YYYY-MM; null without one */
  forecastTo: string | null;
  /** from when the Sun's mean cycle is taken, YYYY-MM */
  repeatFrom: string;
}

/**
 * The measured, then forecast, series from the daily history and the
 * space-weather dataset (null: the history alone), running `years` past the
 * last forecast month.
 */
export function measuredActivity(h: SolarDaily, sw: SpaceWeather | null, side: ForecastSide = 'expected', years = 60): MeasuredActivity {
  const cycle = meanCycle(h);
  const from = jdOfDate(h.from);
  const firstMinimum = monthIndex(CYCLE_MINIMA[CYCLE_MINIMA.length - 1]);
  /** the mean cycle at a Julian date, between its months' middles, from cycle 25's minimum on */
  const cycleAt = (values: number[], jd: number): number => {
    const x = monthOfJd(jd) - firstMinimum + monthFraction(jd);
    const k = Math.floor(x), f = x - k;
    const at = (i: number) => values[((i % CYCLE_MONTHS) + CYCLE_MONTHS) % CYCLE_MONTHS];
    return at(k) * (1 - f) + at(k + 1) * f;
  };
  const sided = (jd: number): number => {
    const mean = cycleAt(cycle.f107, jd);
    const sd = cycleAt(cycle.f107sd, jd);
    return side === 'high' ? mean + sd : side === 'low' ? Math.max(65, mean - sd) : mean;
  };

  // the observed flux and the Ap of each day from the history's first
  const obs: number[] = [...h.f107];
  const ap: (number | null)[] = [...h.ap];
  let measured = obs.length - 1;
  const dayOf = (date: string): number => Math.round(jdOfDate(date) - from);
  const setDay = (k: number, f: number | null, a: number | null): void => {
    while (obs.length <= k) { obs.push(NaN); ap.push(null); }
    if (f !== null) obs[k] = f;
    if (a !== null) ap[k] = a;
  };

  // SWPC's months after the history, as their means through each day
  for (const r of sw?.monthly ?? []) {
    const k = monthIndex(r.month), y = Math.floor(k / 12), m = (k % 12) + 1;
    const a = dayOf(`${y}-${String(m).padStart(2, '0')}-01`);
    const b = dayOf(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`);
    if (b - 1 <= measured) continue;
    for (let d = Math.max(a, measured + 1); d < b; d++) setDay(d, r.f107, null);
    measured = b - 1;
  }
  const measuredTo = new Date((from + measured - 2440587.5) * 86400000).toISOString().slice(0, 10);
  // the last thirty days' flux, each on its day
  let recentTo: string | null = null;
  for (const r of sw?.f107 ?? []) {
    const k = dayOf(r.date);
    if (k <= h.f107.length - 1) continue;
    setDay(k, r.flux, null);
    recentTo = r.date;
    measured = Math.max(measured, k);
  }
  // the last week's Ap from Kp
  for (const r of dailyAp(sw?.kp ?? [])) {
    const k = dayOf(r.date);
    if (k > h.ap.length - 1) setDay(k, null, r.ap);
  }

  // NOAA's forecast after the last measurement, between its months' middles
  const fc = (sw?.forecast ?? []).filter((r) => {
    const k = monthIndex(r.month), y = Math.floor(k / 12), m = (k % 12) + 1;
    return dayOf(`${y}-${String(m).padStart(2, '0')}-15`) > measured;
  });
  const forecastTo = fc.length ? fc[fc.length - 1].month : null;
  const lastMonth = forecastTo ? monthIndex(forecastTo) : monthOfJd(from + measured);
  const repeatFrom = monthName(lastMonth + 1);
  const end = dayOf(`${monthName(lastMonth + 1 + years * 12)}-01`);
  const centre = (month: string): number => {
    const k = monthIndex(month), y = Math.floor(k / 12), m = (k % 12) + 1;
    return (jdOf(y, m, 1) + jdOf(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1)) / 2 - from;
  };
  const fcValue = (r: (typeof fc)[number]) => (side === 'high' ? r.high : side === 'low' ? r.low : r.f107);
  const fcX = fc.map((r) => centre(r.month)), fcY = fc.map(fcValue);
  const repeatDay = dayOf(`${repeatFrom}-01`);
  for (let k = measured + 1; k < end; k++) {
    const jd = from + k + 0.5;
    let f: number;
    if (fc.length && k < repeatDay) {
      // between the months' middles; before the first, from the last measured day
      const x = k + 0.5;
      const j = fcX.findIndex((c) => c >= x);
      if (j === 0) {
        const x0 = measured + 0.5, y0 = obs[measured];
        f = y0 + ((fcY[0] - y0) * (x - x0)) / (fcX[0] - x0);
      } else if (j < 0) f = fcY[fcY.length - 1];
      else f = fcY[j - 1] + ((fcY[j] - fcY[j - 1]) * (x - fcX[j - 1])) / (fcX[j] - fcX[j - 1]);
    } else f = sided(jd);
    setDay(k, f, null);
  }
  // any day still without a flux (a gap before SWPC's last days) takes the line between its neighbours
  for (let k = 0; k < obs.length; k++) {
    if (!Number.isNaN(obs[k])) continue;
    let b = k;
    while (b < obs.length && Number.isNaN(obs[b])) b++;
    const a = k - 1;
    if (b === obs.length) { for (let j = k; j < b; j++) obs[j] = obs[a]; break; }
    for (let j = k; j < b; j++) obs[j] = obs[a] + ((obs[b] - obs[a]) * (j - a)) / (b - a);
    k = b;
  }

  // what the model reads: the previous day's flux, the 81-day mean centred on the day, the day's Ap
  const n = obs.length;
  const prefix = [0];
  for (let k = 0; k < n; k++) prefix.push(prefix[k] + obs[k]);
  const series: DailyActivity = { from, f107: [], f107a: [], ap: [] };
  for (let k = 0; k < n; k++) {
    series.f107.push(obs[Math.max(0, k - 1)]);
    const lo = Math.max(0, k - 40), hi = Math.min(n - 1, k + 40);
    series.f107a.push((prefix[hi + 1] - prefix[lo]) / (hi - lo + 1));
    series.ap.push(ap[k] ?? cycleAt(cycle.ap, from + k + 0.5));
  }
  return { series, measuredTo, recentTo, forecastTo, repeatFrom };
}
