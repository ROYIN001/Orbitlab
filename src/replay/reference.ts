/**
 * A reference flight to compare against (roadmap U02): PEG against IGM, one
 * set of autopilot gains against another, a nominal flight against one with a
 * control-system failure. It is the part of a recording a comparison needs —
 * the telemetry, the events, the path in space and the mission it flew — kept
 * when the user pins a flight, and saved to or read from a file so a
 * comparison can span days.
 *
 * Pure: `referenceFromFlight` takes plain arrays, the file is plain JSON, and
 * `alignTrajectory` puts the reference's path where it would be had it
 * launched when the flight on screen did.
 */
import type { SimEvent } from '../physics/simulation';
import type { TelemetrySample } from '../physics/sim/types';
import type { MissionDocument } from '../config/mission-file';
import { MISSION_FORMAT } from '../config/mission-file';
import { gmst } from '../physics/orbital';

/** The telemetry a comparison draws and tabulates. */
export const REFERENCE_FIELDS = ['t', 'alt', 'vInertial', 'vAir', 'q', 'gLoad', 'mass', 'pitch', 'ap', 'pe', 'inc', 'dvRemaining', 'downrange'] as const;
export type ReferenceSample = Pick<TelemetrySample, (typeof REFERENCE_FIELDS)[number]>;

export interface ReferenceFlight {
  /** what the user sees it called: vehicle, guidance law, and what differs */
  label: string;
  mission: MissionDocument;
  /** Julian date of T = 0 */
  launchJd: number;
  telemetry: ReferenceSample[];
  events: SimEvent[];
  /** the vehicle's path, ECI metres, with the mission time of each point */
  path: { t: number[]; x: number[]; y: number[]; z: number[] };
}

export const FLIGHT_FORMAT = 'orbitlab.flight';
export const FLIGHT_FORMAT_VERSION = 1;
export const FLIGHT_FILE_EXTENSION = '.orbitlab-flight.json';

/** Samples a reference keeps: finer than any chart draws, small enough to save. */
export const REFERENCE_SAMPLES = 6000;
/** Points of its path: the 3-D line needs no more. */
export const REFERENCE_PATH_POINTS = 4000;

function decimate<T>(rows: readonly T[], max: number): T[] {
  if (rows.length <= max) return rows.slice();
  const stride = Math.ceil(rows.length / max);
  const out = rows.filter((_, i) => i % stride === 0);
  if (out[out.length - 1] !== rows[rows.length - 1]) out.push(rows[rows.length - 1]);
  return out;
}

const round = (v: number, digits: number): number => (Number.isFinite(v) ? Number(v.toFixed(digits)) : v);

/** Keep what a comparison needs of a flight. */
export function referenceFromFlight(o: {
  label: string; mission: MissionDocument; launchJd: number;
  telemetry: readonly TelemetrySample[]; events: readonly SimEvent[];
  path: readonly { t: number; r: { x: number; y: number; z: number } }[];
}): ReferenceFlight {
  const telemetry = decimate(o.telemetry, REFERENCE_SAMPLES).map((s) => {
    const row = {} as Record<string, number>;
    for (const k of REFERENCE_FIELDS) row[k] = round(s[k], k === 't' ? 3 : 4);
    return row as unknown as ReferenceSample;
  });
  const points = decimate(o.path, REFERENCE_PATH_POINTS);
  return {
    label: o.label, mission: JSON.parse(JSON.stringify(o.mission)) as MissionDocument, launchJd: o.launchJd,
    telemetry,
    events: o.events.map((e) => ({ ...e, ...(e.params ? { params: { ...e.params } } : {}) })),
    path: {
      t: points.map((p) => round(p.t, 3)),
      x: points.map((p) => Math.round(p.r.x)), y: points.map((p) => Math.round(p.r.y)), z: points.map((p) => Math.round(p.r.z)),
    },
  };
}

/**
 * The reference's path turned about the Earth's axis by the difference in
 * sidereal angle between the two launches, so it lies over the same ground as
 * it did — beside the flight on screen when both left the same pad, whatever
 * day each flew.
 */
export function alignTrajectory(ref: ReferenceFlight, launchJd: number): { x: number; y: number; z: number }[] {
  const d = gmst(launchJd) - gmst(ref.launchJd);
  const c = Math.cos(d), s = Math.sin(d);
  return ref.path.x.map((x, i) => ({ x: c * x - s * ref.path.y[i], y: s * x + c * ref.path.y[i], z: ref.path.z[i] }));
}

export function flightFileText(ref: ReferenceFlight): string {
  return JSON.stringify({ format: FLIGHT_FORMAT, version: FLIGHT_FORMAT_VERSION, flight: ref });
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const numbers = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => typeof n === 'number');

/** A saved flight back to a reference; null when the file is not one this version can read. */
export function parseFlightFile(text: string): ReferenceFlight | null {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return null; }
  if (!isRecord(raw) || raw.format !== FLIGHT_FORMAT || typeof raw.version !== 'number' || raw.version < 1 || !isRecord(raw.flight)) return null;
  const f = raw.flight;
  if (typeof f.label !== 'string' || typeof f.launchJd !== 'number' || !Number.isFinite(f.launchJd)) return null;
  if (!isRecord(f.mission) || f.mission.format !== MISSION_FORMAT) return null;
  if (!Array.isArray(f.telemetry) || !f.telemetry.every((s) => isRecord(s) && REFERENCE_FIELDS.every((k) => typeof s[k] === 'number' || s[k] === null))) return null;
  if (!Array.isArray(f.events) || !f.events.every((e) => isRecord(e) && typeof e.t === 'number' && typeof e.key === 'string')) return null;
  const p = f.path;
  if (!isRecord(p) || !numbers(p.t) || !numbers(p.x) || !numbers(p.y) || !numbers(p.z)
    || p.x.length !== p.t.length || p.y.length !== p.t.length || p.z.length !== p.t.length) return null;
  // JSON has no NaN: a gap in a trace comes back as null, and is a gap again
  const telemetry = (f.telemetry as Record<string, number | null>[]).map((s) => {
    const row = {} as Record<string, number>;
    for (const k of REFERENCE_FIELDS) row[k] = s[k] ?? NaN;
    return row as unknown as ReferenceSample;
  });
  return { ...(f as unknown as ReferenceFlight), telemetry };
}

export function flightFileName(ref: ReferenceFlight): string {
  const m = ref.mission.mission;
  return `${m.vehicleId}-${m.siteId}-${m.launchTime.slice(0, 16).replace(/[:T]/g, '-')}${FLIGHT_FILE_EXTENSION}`;
}

// ─── the comparison ─────────────────────────────────────────────────────────

/** A figure both flights have, for the comparison table. */
export interface ComparedFigure {
  key: 'insertion' | 'perigee' | 'apogee' | 'inclination' | 'maxQ' | 'maxQTime' | 'maxG' | 'dvLeft' | `event:${string}`;
  unit: 's' | 'km' | 'deg' | 'kPa' | 'g' | 'm/s';
  current: number | null;
  reference: number | null;
}

/** Events whose times are compared, in flight order. */
export const COMPARED_EVENTS = ['evt.maxQ', 'evt.meco', 'evt.stageSep', 'evt.seco', 'evt.fairingSep', 'evt.parkingOrbit', 'evt.targetOrbit'];

const INSERTION = ['evt.parkingOrbit', 'evt.targetOrbit', 'evt.offTargetOrbit', 'evt.suborbitalTarget', 'evt.suborbitalOffTarget'];

interface Comparable { telemetry: readonly ReferenceSample[]; events: readonly SimEvent[] }

function figures(f: Comparable): Record<string, number | null> {
  const tel = f.telemetry;
  const out: Record<string, number | null> = {};
  const insertion = f.events.find((e) => INSERTION.includes(e.key));
  out.insertion = insertion?.t ?? null;
  // the orbit as the recording ends: after every burn the flight flew
  const last = tel[tel.length - 1] ?? null;
  const orbit = last;
  out.perigee = orbit && orbit.pe > -2000e3 ? orbit.pe / 1000 : null;
  out.apogee = orbit && orbit.ap > 0 && orbit.ap < 5e7 ? orbit.ap / 1000 : null;
  out.inclination = orbit ? orbit.inc : null;
  let q: ReferenceSample | null = null, g: ReferenceSample | null = null;
  for (const s of tel) {
    if (!q || s.q > q.q) q = s;
    if (!g || s.gLoad > g.gLoad) g = s;
  }
  out.maxQ = q ? q.q / 1000 : null;
  out.maxQTime = q ? q.t : null;
  out.maxG = g ? g.gLoad : null;
  out.dvLeft = last ? last.dvRemaining : null;
  for (const key of COMPARED_EVENTS) out[`event:${key}`] = f.events.find((e) => e.key === key)?.t ?? null;
  return out;
}

const UNITS: Record<string, ComparedFigure['unit']> = {
  insertion: 's', perigee: 'km', apogee: 'km', inclination: 'deg', maxQ: 'kPa', maxQTime: 's', maxG: 'g', dvLeft: 'm/s',
};

/** The figures of the flight on screen beside the reference's; rows neither flight has are left out. */
export function compareFlights(current: Comparable, reference: Comparable): ComparedFigure[] {
  const a = figures(current), b = figures(reference);
  return Object.keys(a)
    .filter((key) => a[key] !== null || b[key] !== null)
    .map((key) => ({ key: key as ComparedFigure['key'], unit: UNITS[key] ?? 's', current: a[key], reference: b[key] }));
}

/** The reference's samples inside a chart's window, so its axes are set by what is drawn. */
export function referenceWindow(tel: readonly ReferenceSample[], xMin: number, xMax: number, max = 600): ReferenceSample[] {
  let lo = 0, hi = tel.length;
  while (lo < hi && tel[lo].t < xMin) lo++;
  while (hi > lo && tel[hi - 1].t > xMax) hi--;
  return decimate(tel.slice(lo, hi), max);
}
