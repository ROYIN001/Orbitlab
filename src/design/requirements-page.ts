/**
 * The requirements page's model (roadmap D07, docs/ROADMAP-PART2-3.md; Phase 4
 * map §3): what the page at `#/build/engineer/requirements` asks, what it runs
 * and what it shows, DOM-free. The page itself (src/ui/build/requirements-page.ts)
 * only draws this.
 *
 * THE FORM is a `MissionRequirements` (src/design/requirements.ts) as a student
 * types it — the data a day in Gbit, the camera's tilt and the plane in
 * degrees — plus the template the satellite starts from and the repeat cycles
 * to try. Every number box has its bounds here (`REQUIREMENT_LIMITS`), the
 * checker `requirementsProblems` refuses a form outside them by name, and a
 * figure the satellite design keeps (the life, the lowest elevation) takes the
 * design checker's own bounds (src/config/satellite-design.ts), so a row can
 * always be opened on the bench.
 *
 * THE RUN is two jobs the page starts in workers: the lifetime search
 * (src/orbit/lifetime-altitude-job.ts, `lifetimeRequest`) and the trade table
 * (src/design/requirement-trades-job.ts), whose options are the D06 bench's
 * own figures for the template (`tradeOptionsFor`): its antenna's gain less
 * its pointing loss, its receiving station, the wavelength the bench reads the
 * diffraction limit at. So a row's link and camera are the numbers the bench
 * gives the same satellite. The rows are capped (`MAX_ROWS`): the table grows
 * fast with the days of the cycles (D measured 0.25 s a row for 26-day
 * cycles), so the page says how many rows and about how long before it runs.
 *
 * THE ROW OPENED on the bench (`benchDesign`) is `designFromRow`'s design with
 * the array and the battery sized again by the D06 model itself: D07 sizes
 * them with the closed-form eclipse at the worst β and, where only daylight
 * looks count, with the payload off in the shadow; the bench samples the
 * orbit and keeps every load on (its stated assumption). Without this the
 * bench would say the array is short on a row the table says works (a THEOS-2
 * row: 16 % short). `compareWithBench` then sets every figure the row and the
 * bench both give side by side, and names why the ones that differ differ, so
 * the page never shows a number that the bench gives differently without
 * saying so (map §3: "D07 never shows a number differently from D06").
 *
 * The cores throw English `RangeError`s; `errorKey` maps each to a sentence
 * of the page's own, so none is ever shown raw.
 *
 * DOM-free and free of the propagator (tests/propagator.test.ts): the
 * lifetime search's answers come in as plain data. tests/d07-requirements-page.test.ts.
 */
import { DEG } from '../physics/constants';
import { SATELLITE_LIMITS, satelliteDesignProblems } from '../config/satellite-design';
import { SATELLITE_TEMPLATES } from '../data/satellite-templates';
import { STATIONS } from '../orbit/applications-setup';
import { LINK_MARGIN_THRESHOLD } from '../orbit/link';
import type { AltitudeForLifetime, AltitudesRequest } from '../orbit/lifetime-altitude';
import { DESIGN_ACTIVITY_LEVELS, type EcssLevel } from '../orbit/satellite-air';
import type { MissionRequirements } from './requirements';
import {
  REQUIREMENTS, designFromRow, lifetimeRequest, repeatCycles, type RepeatCycle, type Requirement, type TradeOptions, type TradeRow,
} from './requirement-trades';
import { DIFFRACTION_WAVELENGTH, RX_DEFAULTS, RX_DISH_EFFICIENCY, designFigures, designFromTemplate, fieldByPath, type Fig, type SatelliteFigures } from './satellite-model';
import { dishGain } from '../orbit/applications';
import { wetMass } from './satellite-area';
import type { SatelliteDesign } from './satellite-spec';

// ─── the form ───────────────────────────────────────────────────────────────

/** The places the page offers to look at: the app's stations in Thailand and Russia (src/orbit/applications-setup.ts), or a place typed. */
export type TargetId = 'bangkok' | 'chiangMai' | 'hatYai' | 'stPetersburg' | 'moscow' | 'custom';
export const REQ_TARGETS: readonly TargetId[] = ['bangkok', 'chiangMai', 'hatYai', 'stPetersburg', 'moscow', 'custom'];

/** The templates a requirement can start from: those with a camera, as D07 sizes one from the GSD asked. */
export const REQ_TEMPLATES: readonly string[] = SATELLITE_TEMPLATES.filter((tp) => tp.design.payload !== null).map((tp) => tp.id);

export interface RequirementsForm {
  /** the `SATELLITE_TEMPLATES` id the satellite starts from (one of `REQ_TEMPLATES`) */
  template: string;
  target: TargetId;
  /** the place typed, deg (north and east positive): read only for `custom` */
  lat: number;
  lon: number;
  /** the coarsest ground sample distance, m */
  gsd: number;
  /** the longest gap between looks, days */
  revisitDays: number;
  daylightOnly: boolean;
  /** sun-synchronous at `ltan` (h), else at `inclination` (deg) with its node at 0 */
  sso: boolean;
  ltan: number;
  inclination: number;
  lifeYears: number;
  activity: EcssLevel;
  /** the data to bring down a day, Gbit (10⁹ bit) */
  dataGbit: number;
  /** `STATIONS` ids */
  stations: string[];
  minElDeg: number;
  disposal: '25y' | 'none';
  /** how far the camera tilts either side, deg (0: straight down only) */
  tiltDeg: number;
  /** the repeat cycles tried, days: the shortest, and the longest (null: the revisit asked, rounded up — the core's default) */
  minDays: number;
  maxDays: number | null;
}

/** A form to start from: the THEOS-2-class imager over Bangkok, sun-synchronous with the descending node at 10:15, as THEOS-2 flies. */
export const DEFAULT_FORM: Readonly<RequirementsForm> = {
  template: 'theos2', target: 'bangkok', lat: 13.7563, lon: 100.5018,
  gsd: 0.5, revisitDays: 5, daylightOnly: true, sso: true, ltan: 22.25, inclination: 51.6,
  lifeYears: 5, activity: 'moderate', dataGbit: 100, stations: ['bangkok'], minElDeg: 10, disposal: '25y',
  tiltDeg: 30, minDays: 1, maxDays: null,
};

/**
 * Each number box's bounds, in the units the box shows. The life and the
 * lowest elevation are the design checker's (`SATELLITE_LIMITS`), since the
 * opened design keeps them; the rest are plausibility bounds that keep every
 * core in its range: a GSD from 5 cm, a revisit to two months, a tilt short
 * of the horizon, cycles of 1 to 30 days (`MAX_ROWS` then caps the rows).
 */
export const REQUIREMENT_LIMITS = {
  lat: [-90, 90],
  lon: [-180, 180],
  gsd: [0.05, 1000],
  revisitDays: [0.1, 60],
  ltan: [0, 24],
  inclination: [0, 180],
  lifeYears: SATELLITE_LIMITS.lifeYears,
  dataGbit: [0, 100_000],
  minElDeg: SATELLITE_LIMITS.minElDeg,
  tiltDeg: [0, 60],
  days: [1, 30],
} as const satisfies Record<string, readonly [number, number]>;

export type ReqNumberField = 'lat' | 'lon' | 'gsd' | 'revisitDays' | 'ltan' | 'inclination' | 'lifeYears' | 'dataGbit' | 'minElDeg' | 'tiltDeg' | 'minDays' | 'maxDays';

/** A field's bounds. */
export const limitsOf = (f: ReqNumberField): readonly [number, number] =>
  (f === 'minDays' || f === 'maxDays' ? REQUIREMENT_LIMITS.days : REQUIREMENT_LIMITS[f]);

/** What the checker refuses: the field (or the form) and the sentence's key, with its values. */
export interface ReqIssue {
  field: ReqNumberField | 'template' | 'stations' | 'activity';
  key: string;
  values?: Record<string, number>;
}

/**
 * Everything wrong with a form, each by its field: a number outside its box's
 * bounds or not a number, cycles that are not whole days or run backwards, no
 * station, a template with no camera. An empty list is a form the cores take.
 */
export function requirementsProblems(f: RequirementsForm): ReqIssue[] {
  const out: ReqIssue[] = [];
  const check = (field: ReqNumberField, v: number, integer = false): void => {
    const [min, max] = limitsOf(field);
    if (!Number.isFinite(v)) out.push({ field, key: 'build.req.bad.number' });
    else if (v < min || v > max) out.push({ field, key: 'build.req.bad.range', values: { min, max } });
    else if (integer && !Number.isInteger(v)) out.push({ field, key: 'build.req.bad.whole' });
  };
  if (!REQ_TEMPLATES.includes(f.template)) out.push({ field: 'template', key: 'build.req.bad.template' });
  if (f.target === 'custom') { check('lat', f.lat); check('lon', f.lon); }
  check('gsd', f.gsd);
  check('revisitDays', f.revisitDays);
  if (f.sso) check('ltan', f.ltan); else check('inclination', f.inclination);
  check('lifeYears', f.lifeYears);
  if (!DESIGN_ACTIVITY_LEVELS.includes(f.activity)) out.push({ field: 'activity', key: 'build.req.bad.activity' });
  check('dataGbit', f.dataGbit);
  if (!f.stations.length) out.push({ field: 'stations', key: 'build.req.bad.stations' });
  else if (f.stations.some((id) => !STATIONS.some((s) => s.id === id))) out.push({ field: 'stations', key: 'build.req.bad.stations' });
  check('minElDeg', f.minElDeg);
  check('tiltDeg', f.tiltDeg);
  check('minDays', f.minDays, true);
  if (f.maxDays !== null) check('maxDays', f.maxDays, true);
  const range = cycleRange(f);
  if (Number.isFinite(range.min) && Number.isFinite(range.max) && range.min > range.max) out.push({ field: 'minDays', key: 'build.req.bad.days' });
  return out;
}

/** The place's coordinates, deg: the station's for a named place, the typed ones for `custom`. */
export function targetOf(f: Pick<RequirementsForm, 'target' | 'lat' | 'lon'>): { lat: number; lon: number } {
  if (f.target === 'custom') return { lat: f.lat, lon: f.lon };
  const s = STATIONS.find((x) => x.id === f.target)!;
  return { lat: s.lat, lon: s.lon };
}

/** Gbit a day as the core's bit a day: 10⁹ bit to the Gbit (57.6 Gbit is 57.6·10⁹ bit, exactly). */
export const gbitToBits = (gbit: number): number => gbit * 1e9;

/** The form as the cores take it (a checked form: `requirementsProblems` empty). */
export function missionRequirements(f: RequirementsForm): MissionRequirements {
  const { lat, lon } = targetOf(f);
  const req: MissionRequirements = {
    target: { lat, lon, name: f.target },
    gsd: f.gsd, revisitDays: f.revisitDays, daylightOnly: f.daylightOnly,
    lifeYears: f.lifeYears, activity: f.activity, dataPerDay: gbitToBits(f.dataGbit),
    stations: [...f.stations], minElDeg: f.minElDeg, disposal: f.disposal,
  };
  if (f.sso) req.ltan = f.ltan;
  return req;
}

/** The node's local time at the other side of the orbit, h: a descending node at 10:15 is an ascending one at 22:15. */
export const otherNode = (ltan: number): number => (((ltan + 12) % 24) + 24) % 24;

/**
 * Restore a form kept in this browser (a convenience: anything unreadable
 * gives the default back, field by field).
 */
export function restoreForm(text: string | null): RequirementsForm {
  const out: RequirementsForm = { ...DEFAULT_FORM, stations: [...DEFAULT_FORM.stations] };
  if (!text) return out;
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return out; }
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  const num = (k: keyof RequirementsForm): void => { if (typeof r[k] === 'number' && Number.isFinite(r[k])) (out as unknown as Record<string, unknown>)[k] = r[k]; };
  for (const k of ['lat', 'lon', 'gsd', 'revisitDays', 'ltan', 'inclination', 'lifeYears', 'dataGbit', 'minElDeg', 'tiltDeg', 'minDays'] as const) num(k);
  if (r.maxDays === null || (typeof r.maxDays === 'number' && Number.isFinite(r.maxDays))) out.maxDays = r.maxDays as number | null;
  if (typeof r.template === 'string' && REQ_TEMPLATES.includes(r.template)) out.template = r.template;
  if (typeof r.target === 'string' && (REQ_TARGETS as readonly string[]).includes(r.target)) out.target = r.target as TargetId;
  for (const k of ['daylightOnly', 'sso'] as const) if (typeof r[k] === 'boolean') out[k] = r[k] as boolean;
  if (typeof r.activity === 'string' && (DESIGN_ACTIVITY_LEVELS as readonly string[]).includes(r.activity)) out.activity = r.activity as EcssLevel;
  if (r.disposal === '25y' || r.disposal === 'none') out.disposal = r.disposal;
  if (Array.isArray(r.stations)) {
    const ids = r.stations.filter((s): s is string => typeof s === 'string' && STATIONS.some((x) => x.id === s));
    if (ids.length) out.stations = [...new Set(ids)];
  }
  return out;
}

// ─── what the run costs ─────────────────────────────────────────────────────

/** The most rows the page works out in one run: some 400 of up to 11-day cycles, a minute or two on a laptop. */
export const MAX_ROWS = 400;
/** Seconds a row takes for each day of its cycle: D's 0.25 s for a 26-day row (the revisit and the contact walk the cycle), on a laptop. */
export const SECONDS_PER_ROW_DAY = 0.25 / 26;
/**
 * The days the revisit is walked over where the looks do not repeat with the
 * cycle — daylight looks from an orbit that is not sun-synchronous — passed to
 * the table as its `revisitWindow` (the core's own default, 60 days).
 */
export const REVISIT_WINDOW_DAYS = 60;
/**
 * Seconds one of the lifetime search's P07 runs takes: a little to start, and
 * more for each year it flies (a run that lasts flies them all). Fitted to the
 * searches measured here, 21 runs each: 9.1 s for 5 and 30 years, 21.0 s for
 * 30 and 55, 6.6 s for 0.1 and 25.1, and the track's 9.9 s for 10 and 35 (a
 * flat 0.45 s a run said "about 10 s" for a 30-year life's 21 s).
 */
export const SECONDS_PER_LIFETIME_RUN = 0.05;
export const SECONDS_PER_LIFETIME_RUN_YEAR = 0.02;
/** P07 runs the search makes for each of its years: the two ends and the halvings from 150–5 000 km to ±5 km (`expectedRuns`, src/orbit/lifetime-altitude.ts). */
export const RUNS_PER_SEARCH = 11;

/** The cycles tried, days: the form's, the longest defaulting to the revisit asked rounded up (the core's own default). */
export function cycleRange(f: Pick<RequirementsForm, 'minDays' | 'maxDays' | 'revisitDays'>): { min: number; max: number } {
  return { min: f.minDays, max: f.maxDays ?? Math.max(1, Math.ceil(f.revisitDays)) };
}

/** Every repeat cycle the run tries (a checked form), highest orbit first: `repeatCycles` from the shortest to the longest days asked. */
export function candidateCycles(f: RequirementsForm): RepeatCycle[] {
  const { min, max } = cycleRange(f);
  return repeatCycles(max, f.sso, f.sso ? 0 : f.inclination * DEG).filter((c) => c.days >= min).map((c) => ({ revs: c.revs, days: c.days }));
}

/** What the run will take: rows, and about how long each job, s, on a laptop (a school tablet takes several times as long, map risk R5). */
export interface RunCost {
  rows: number;
  /** the rows' cycles, days: the shortest and the longest found */
  minDays: number;
  maxDays: number;
  tableSeconds: number;
  /** 0 when the lifetime search's answers are kept from the last run (no years to search) */
  lifetimeSeconds: number;
  /** more rows than `MAX_ROWS`: the page will not run it */
  tooMany: boolean;
}

/**
 * The open window the revisit of a form's rows is walked over, days: none
 * (null) where the looks repeat with the cycle, sun-synchronous or by night
 * and day alike, else `REVISIT_WINDOW_DAYS` (`tradeRow`: `periodic`).
 */
export const revisitWindowOf = (f: Pick<RequirementsForm, 'sso' | 'daylightOnly'>): number | null =>
  (f.sso || !f.daylightOnly ? null : REVISIT_WINDOW_DAYS);

/**
 * What a run will take. A row walks its cycle twice, for the revisit and for
 * the contact (`SECONDS_PER_ROW_DAY` is for a cycle-day of both); where the
 * looks do not repeat with the cycle (`window`, `revisitWindowOf`), the revisit
 * walks the open window instead: some 60 days, so a 1-day row costs some 30
 * times as much (measured in Chromium here: 90 such rows of 1 to 5 days, 10.0 s,
 * against 1.4 s for the 94 sun-synchronous ones).
 */
export function runCost(cycles: readonly RepeatCycle[], years: readonly number[], window: number | null = null): RunCost {
  const days = cycles.map((c) => c.days);
  return {
    rows: cycles.length,
    minDays: days.length ? Math.min(...days) : 0,
    maxDays: days.length ? Math.max(...days) : 0,
    // the cycle-days walked, the revisit's and the contact's, halved: the cycle's days where the looks repeat with it
    tableSeconds: days.reduce((s, d) => s + (d + Math.max(d, window ?? d)) / 2, 0) * SECONDS_PER_ROW_DAY,
    // each of the years searched (`lifetimeRequest`'s, none when they are kept): its runs, each longer the more years it flies
    lifetimeSeconds: years.reduce((s, y) => s + RUNS_PER_SEARCH * (SECONDS_PER_LIFETIME_RUN + SECONDS_PER_LIFETIME_RUN_YEAR * y), 0),
    tooMany: cycles.length > MAX_ROWS,
  };
}

// ─── the run's inputs ───────────────────────────────────────────────────────

/** The template's design (a fresh copy, its own id): what every row starts from. */
export const templateDesign = (id: string): SatelliteDesign => designFromTemplate(id, `req-${id}`, id);

/**
 * The trade table's options for a template, read off the D06 bench's own
 * figures for it (`designFigures`), so a row's link and camera are the
 * bench's: the transmitting antenna's gain less its pointing loss (D07's
 * `eirp` has no pointing term, and a gain lowered by the loss gives the same
 * EIRP), the receiving station's dish gain, noise temperature and losses as
 * the bench reads them (`RX_DEFAULTS` where the design has none; no separate
 * implementation loss, as the bench counts none), and the bench's
 * wavelength for the diffraction limit (`DIFFRACTION_WAVELENGTH`). The link
 * is held to the bench's 3 dB (`LINK_MARGIN_THRESHOLD`).
 */
export function tradeOptionsFor(
  template: SatelliteDesign, f: RequirementsForm, jd0: number, lifetime: AltitudeForLifetime[] | null, fig?: SatelliteFigures,
): Omit<TradeOptions, 'onProgress'> {
  const figures = fig ?? designFigures(template, jd0, { level: f.activity });
  const c = template.comms;
  return {
    jd0,
    cycles: candidateCycles(f),
    ...(f.sso ? {} : { inclination: f.inclination * DEG, raan: 0 }),
    txGain: figures.link.txGain.value - figures.link.pointingLoss.value,
    ground: {
      rxGain: dishGain(c.rxAntennaD ?? RX_DEFAULTS.rxAntennaD, c.frequency, RX_DISH_EFFICIENCY),
      systemTemperature: c.rxNoiseK ?? RX_DEFAULTS.rxNoiseK,
      losses: c.losses ?? RX_DEFAULTS.losses,
      implementationLoss: 0,
    },
    margin: LINK_MARGIN_THRESHOLD,
    wavelength: DIFFRACTION_WAVELENGTH,
    tilt: f.tiltDeg * DEG,
    lifetime,
    revisitWindow: REVISIT_WINDOW_DAYS,
  };
}

/** The lifetime search's request for a form (`lifetimeRequest`: the life, and the life plus 25 years with the 25-year rule). */
export function lifetimeRequestFor(template: SatelliteDesign, f: RequirementsForm, jd0: number): AltitudesRequest {
  const req = missionRequirements(f);
  return lifetimeRequest(req, template, { jd0, ...(f.sso ? {} : { inclination: f.inclination * DEG, raan: 0 }) });
}

/** A key for a lifetime request: the same key, the same answers (the search is deterministic), so a run again after a Stop keeps them. */
export const lifetimeKey = (r: AltitudesRequest): string => JSON.stringify(r);

// ─── the cores' errors, in the page's words ─────────────────────────────────

/**
 * The page's sentence for an error a job or a core threw: a Stop is
 * `stopped`; each of the cores' `RangeError`s (their English is never shown)
 * has a key of its own, found by its message; anything else is `failed`.
 * A worker hands its error back as a plain `Error` with the same message.
 */
export function errorKey(e: unknown): string {
  if (e && typeof e === 'object' && (e as { name?: unknown }).name === 'AbortError') return 'build.req.err.stopped';
  const m = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  const known: readonly (readonly [RegExp, string])[] = [
    [/maxDays must be|whole number of days|revs must be a whole number/, 'build.req.err.days'],
    [/without a local time of the node/, 'build.req.err.plane'],
    [/not a station/, 'build.req.err.station'],
    [/carries no camera/, 'build.req.err.camera'],
    [/no sun-synchronous orbit/, 'build.req.err.noSso'],
    [/not an ECSS level/, 'build.req.err.level'],
    [/must be above zero|the volume must be|the contact must be|days must be more than 0/, 'build.req.err.input'],
    [/years must be more than 0|the range must be|the tolerance must be|the spacecraft needs/, 'build.req.err.lifetime'],
    [/a circular orbit only|not a regulation|the margin must be|the EIRP, the losses/, 'build.req.err.power'],
    [/not a sound design/, 'build.req.err.design'],
  ];
  for (const [re, key] of known) if (re.test(m)) return key;
  return 'build.req.err.failed';
}

// ─── what a row says ────────────────────────────────────────────────────────

/**
 * A row's life: it lasts; it is held against the drag (the Δv over the life);
 * or it sits inside the search's bracket, where the search cannot say. `engine`:
 * the template's tanks hold some Δv to hold it with; without (NAPA-2), the Δv
 * is only what holding it would take, and the row comes down within its life.
 */
export type LifeState =
  | { kind: 'none' }
  | { kind: 'lasts' }
  | { kind: 'held'; holdDv: number; perYear: number; engine: boolean }
  | { kind: 'notProven'; holdDv: number; perYear: number; engine: boolean };

/**
 * The lifetime column (D07): what `TradeRow.life` means with the search's
 * bracket. The core counts a row inside the bracket (between an altitude
 * that came down and one that lasted, 10 km apart) as not lasting, which
 * with no engine is an infinite ratio: the page says "not proven to last"
 * instead.
 */
export function lifeState(row: TradeRow, lifetime: readonly AltitudeForLifetime[] | null): LifeState {
  if (!row.life) return { kind: 'none' };
  if (row.life.lasts) return { kind: 'lasts' };
  const s = lifetime?.[0];
  const inside = !!s && s.outcome === 'found' && row.altitude > s.lo && row.altitude < s.hi;
  return { kind: inside ? 'notProven' : 'held', holdDv: row.life.holdDv, perYear: row.life.holdDvPerYear, engine: row.dvAvailable > 0 };
}

/**
 * The disposal column: nothing asked, down in time by drag alone, or a burn
 * — the core's range, from the Δv to lower the perigee to the altitude whose
 * circle comes down in time (too little) to the Δv for Hull's 50 km perigee
 * (enough; the verdict uses this one) — or a burn because the row sits inside
 * the search's bracket, where the search cannot say it comes down in time.
 */
export type DisposalState =
  | { kind: 'none' }
  | { kind: 'inTime' }
  | { kind: 'burn'; dvLow: number; dvHigh: number }
  | { kind: 'notProven'; dvLow: number; dvHigh: number };

export function disposalState(row: TradeRow, lifetime: readonly AltitudeForLifetime[] | null): DisposalState {
  if (!row.disposal) return { kind: 'none' };
  if (!row.disposal.burn) return { kind: 'inTime' };
  const s = lifetime?.[1];
  const inside = !!row.life?.lasts && !!s && s.outcome === 'found' && row.altitude > s.lo && row.altitude < s.hi;
  return { kind: inside ? 'notProven' : 'burn', dvLow: row.disposal.dvLow, dvHigh: row.disposal.dvHigh };
}

/**
 * How a requirement stands on a row, for the "binds" column: a ratio (what
 * the orbit needs over what is allowed or carried; 1 at the edge), or, where
 * the core's ratio is infinite, why — never seen, no contact, no engine to
 * hold it or bring it down, or not proven by the search.
 */
export type Standing =
  | { kind: 'ratio'; value: number }
  | { kind: 'neverSeen' } | { kind: 'noContact' } | { kind: 'noEngine' }
  | { kind: 'notProvenLife' } | { kind: 'notProvenDown' };

export function standing(row: TradeRow, k: Requirement, lifetime: readonly AltitudeForLifetime[] | null): Standing {
  const r = row.ratios[k];
  if (Number.isFinite(r)) return { kind: 'ratio', value: r };
  switch (k) {
    case 'revisit': return { kind: 'neverSeen' };
    case 'data': return { kind: 'noContact' };
    case 'lifetime': return lifeState(row, lifetime).kind === 'notProven' ? { kind: 'notProvenLife' } : { kind: 'noEngine' };
    case 'disposal': return disposalState(row, lifetime).kind === 'notProven' || lifeState(row, lifetime).kind === 'notProven'
      ? { kind: 'notProvenDown' } : { kind: 'noEngine' };
    default: return { kind: 'ratio', value: r };
  }
}

/** The requirements a row does not meet, and the one that binds, as the core gives them (`unmet` in `REQUIREMENTS` order). */
export const rowUnmet = (row: TradeRow): readonly Requirement[] => REQUIREMENTS.filter((k) => row.unmet.includes(k));

// ─── the charts ─────────────────────────────────────────────────────────────

const YEAR = 365.25 * 86400;

/**
 * Lifetime against altitude, from the lifetime search's own P07 runs: each
 * run that came down is a point (altitude, lifetime); a run that lasted its
 * years gives no lifetime, only "at least", so it is not drawn. Sorted by
 * altitude, one point per altitude (both searches may fly the same one).
 * Altitudes m, lifetimes years.
 */
export function lifetimePoints(results: readonly AltitudeForLifetime[]): { altitude: number; years: number }[] {
  const byAlt = new Map<number, number>();
  for (const r of results) for (const run of r.runs) if (run.lifetime !== null) byAlt.set(run.altitude, run.lifetime / YEAR);
  return [...byAlt.entries()].map(([altitude, years]) => ({ altitude, years })).sort((a, b) => a.altitude - b.altitude);
}

/** Aperture against altitude, one point per row (m, m), lowest first: 1.22·λ·h/GSD, a straight line through the origin. */
export function aperturePoints(rows: readonly TradeRow[]): { altitude: number; aperture: number }[] {
  return rows.map((r) => ({ altitude: r.altitude, aperture: r.aperture })).sort((a, b) => a.altitude - b.altitude);
}

// ─── the row opened on the bench ────────────────────────────────────────────

export type BenchDesign =
  | { ok: true; design: SatelliteDesign; figures: SatelliteFigures; txRaised: boolean }
  | { ok: false; key: string; field?: string };

/**
 * The design a row opens on the D06 bench (map §3, "Output"): `designFromRow`
 * — the row's orbit, the life asked, the camera for the GSD, the transmitter
 * and rate for the data — then, with D06's figures for it, the array and the
 * battery the bench itself says the longest eclipse needs (`areaNeeded`,
 * `batteryNeeded`), so the bench shows them met. A transmitter below the
 * bench's smallest (1 mW) is raised to it, which only adds link margin. A
 * figure still outside the bench's bounds (a focal length past 100 m, an
 * aperture past 20 m) refuses the row, naming the field (its i18n key).
 * `level` is the ECSS level the bench reads the air at; `jd` its date.
 */
export function benchDesign(template: SatelliteDesign, row: TradeRow, req: MissionRequirements, jd: number, level: EcssLevel,
  id: string, name: string): BenchDesign {
  const from = designFromRow(template, row, req);
  if (!from) return { ok: false, key: 'build.req.open.noContact' };
  const d = JSON.parse(JSON.stringify(from)) as SatelliteDesign;
  d.id = id;
  d.name = name;
  const minTx = SATELLITE_LIMITS.txPowerW[0];
  const txRaised = d.comms.txPowerW < minTx;
  if (txRaised) d.comms.txPowerW = minTx;
  const refused = (): BenchDesign | null => {
    const issues = satelliteDesignProblems(d);
    if (!issues.length) return null;
    const field = fieldByPath(issues[0].path.replace(/\[(\d+)\]/g, '.$1'));
    return { ok: false, key: 'build.req.open.outside', ...(field ? { field: field.key } : {}) };
  };
  const first = refused();
  if (first) return first;
  const sized = designFigures(d, jd, { level });
  d.power = { ...d.power, arrayArea: sized.power.areaNeeded.value, batteryWh: sized.power.batteryNeeded.value / 3600 };
  const second = refused();
  if (second) return second;
  return { ok: true, design: d, figures: designFigures(d, jd, { level }), txRaised };
}

/** Why a figure the row and the bench both give differs (an i18n key), or null where they are the same. */
export type CompareWhy =
  | 'build.req.cmp.why.eclipse' | 'build.req.cmp.why.array' | 'build.req.cmp.why.battery'
  | 'build.req.cmp.why.rate' | 'build.req.cmp.why.txRaised';

export interface CompareLine {
  /** the figure's name (an i18n key) */
  key: string;
  row: Fig;
  bench: Fig;
  /** the same to 1e-9, relative */
  same: boolean;
  why: CompareWhy | null;
}

/** Equal to 1e-9 relative: what "the same number" means between the row and the bench (map §3 validation, closed forms). */
export const sameFigure = (a: number, b: number): boolean => a === b || Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));

/**
 * Every figure the row and the opened design's bench both give, side by side
 * (the bench's from `designFigures`, one number one way), and why each that
 * differs differs:
 * - the longest eclipse: the row's closed form at the worst β against the
 *   bench's sampled orbit (0.1 % or so);
 * - the array and the battery: sized again by the bench (`benchDesign`), for
 *   its eclipse and its loads, the same in sunlight and shadow;
 * - the highest rate at the margin: the row's with the template's
 *   transmitter, the bench's with the design's, sized for the data asked;
 * - the link margin, where the transmitter was raised to the bench's
 *   smallest.
 */
export function compareWithBench(row: TradeRow, req: MissionRequirements, template: SatelliteDesign, opened: Extract<BenchDesign, { ok: true }>): CompareLine[] {
  const { design: d, figures: fig } = opened;
  const out: CompareLine[] = [];
  const line = (key: string, row: Fig, bench: Fig, why: CompareWhy | null): void => {
    const same = sameFigure(row.value, bench.value);
    out.push({ key, row, bench, same, why: same ? null : why });
  };
  line('build.req.col.h', { value: row.altitude, unit: 'm' }, fig.orbit.perigee, null);
  line('build.req.col.i', { value: row.inclination, unit: 'rad' }, fig.orbit.inclination, null);
  line('build.sat.f.focal', { value: row.focalLength, unit: 'm' }, { value: d.payload!.focalLength, unit: 'm' }, null);
  line('build.sat.f.aperture', { value: row.aperture, unit: 'm' }, { value: d.payload!.aperture, unit: 'm' }, null);
  if (fig.camera) {
    line('build.sat.r.gsd', { value: req.gsd, unit: 'm' }, fig.camera.gsd, null);
    line('build.req.cmp.diffraction', { value: req.gsd, unit: 'm' }, fig.camera.diffraction, null);
    if (fig.camera.swath) line('build.sat.r.swath', { value: row.swath, unit: 'm' }, fig.camera.swath, null);
  }
  line('build.sat.r.eclipseWorst', { value: row.power.eclipse, unit: 's' }, fig.eclipse.worst, 'build.req.cmp.why.eclipse');
  line('build.req.col.array', { value: row.power.arrayArea, unit: 'm2' }, fig.power.area, 'build.req.cmp.why.array');
  line('build.req.col.battery', { value: row.power.batteryWh * 3600, unit: 'J' }, fig.power.battery, 'build.req.cmp.why.battery');
  if (req.dataPerDay > 0 && Number.isFinite(row.requiredRate)) {
    line('build.req.cmp.dataRate', { value: row.requiredRate, unit: 'bit/s' }, { value: d.comms.dataRate, unit: 'bit/s' }, null);
    line('build.req.cmp.margin', { value: LINK_MARGIN_THRESHOLD, unit: 'dB' }, fig.link.margin, opened.txRaised ? 'build.req.cmp.why.txRaised' : null);
  }
  line('build.req.col.maxRate', { value: row.maxRate, unit: 'bit/s' }, fig.link.maxRate, 'build.req.cmp.why.rate');
  line('build.sat.r.dvAvailable', { value: row.dvAvailable, unit: 'm/s' }, fig.dv.available, null);
  line('build.req.cmp.mass', { value: wetMass(template), unit: 'kg' }, fig.mass.wet, null);
  return out;
}

/**
 * Where the design an opened row put on the bench stands now (the page sets
 * the row beside the bench's figures for it as opened): still there as opened
 * (`same`; a new name changes no figure), changed on the bench since
 * (`changed`), or another design in its place (`other`).
 */
export function benchNow(onBench: SatelliteDesign, opened: SatelliteDesign): 'same' | 'changed' | 'other' {
  if (onBench.id !== opened.id) return 'other';
  return JSON.stringify({ ...onBench, name: '' }) === JSON.stringify({ ...opened, name: '' }) ? 'same' : 'changed';
}

/** The name an opened row's design is given: its cycle and altitude, in the words the page passes. */
export const cycleText = (row: Pick<TradeRow, 'revs' | 'days'>): string => `${row.revs}/${row.days}`;
