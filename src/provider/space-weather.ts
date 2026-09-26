/**
 * Space weather as a dataset (roadmap S04, for R05): the Sun's 10.7 cm radio
 * flux (F10.7) and the planetary Kp index, from NOAA's Space Weather
 * Prediction Center — the two indices an upper-atmosphere density model
 * reads. Nothing in the physics reads them yet; R05 will feed them to the
 * lifetime model's density (src/physics/propagator/density.ts).
 *
 * The same `parseSwpc` turns SWPC's own answers into the dataset whether the
 * app fetched them online or `scripts/refresh-snapshots.ts` fetched them to
 * bundle a snapshot, so the two can never disagree about the shape.
 *
 * Self-contained on purpose (type-only imports at most): the snapshot script
 * runs it under Node without a bundler.
 */

/** SWPC's observed F10.7 (Penticton, three readings a day) and the 3-hourly planetary Kp of the last week. */
export const SWPC_F107_URL = 'https://services.swpc.noaa.gov/json/f107_cm_flux.json';
export const SWPC_KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';

export interface SpaceWeather {
  /**
   * Daily observed F10.7 at 20:00 UT (the "noon" Penticton reading, the one
   * the indices are built from), solar flux units (10⁻²² W m⁻² Hz⁻¹), oldest
   * first. Dates are UTC, `YYYY-MM-DD`.
   */
  f107: { date: string; flux: number }[];
  /** 3-hourly planetary Kp (0–9, in thirds), oldest first; times are ISO 8601 UTC. */
  kp: { time: string; kp: number }[];
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** SWPC writes UT without a zone: `2026-09-25T20:00:00`. */
function utc(tag: unknown): Date | null {
  if (typeof tag !== 'string' || !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z?$/.test(tag)) return null;
  const d = new Date(`${tag.replace(' ', 'T').replace(/Z$/, '')}Z`);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** Rows of an SWPC product: objects, or the older table of arrays under a header row. */
function rows(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) throw new Error('not a list');
  if (raw.length && Array.isArray(raw[0])) {
    const [head, ...body] = raw as unknown[][];
    return body.map((r) => Object.fromEntries(head.map((k, i) => [String(k), r[i]])));
  }
  return raw.filter(isObj);
}

/**
 * The dataset from SWPC's two answers, keeping the last `days` of F10.7, and
 * the time of its newest reading — the "data as of". Throws on an answer that
 * is not what SWPC sends, so a changed format is a fallback, not bad data.
 */
export function parseSwpc(f107Raw: unknown, kpRaw: unknown, days = 30): { data: SpaceWeather; asOf: string } {
  const f107 = rows(f107Raw)
    .filter((r) => r.reporting_schedule === 'Noon' || String(r.time_tag).slice(11, 13) === '20')
    .map((r) => ({ at: utc(r.time_tag), flux: typeof r.flux === 'string' ? Number(r.flux) : r.flux }))
    .filter((r): r is { at: Date; flux: number } => !!r.at && finite(r.flux) && r.flux > 0 && r.flux < 1000)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const byDay = new Map<string, number>();
  for (const r of f107) byDay.set(r.at.toISOString().slice(0, 10), r.flux);
  const kp = rows(kpRaw)
    .map((r) => ({ at: utc(r.time_tag), kp: typeof r.Kp === 'string' ? Number(r.Kp) : r.Kp }))
    .filter((r): r is { at: Date; kp: number } => !!r.at && finite(r.kp) && r.kp >= 0 && r.kp <= 9)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  if (!byDay.size || !kp.length) throw new Error('no readings');
  const data: SpaceWeather = {
    f107: [...byDay].slice(-days).map(([date, flux]) => ({ date, flux })),
    kp: kp.map((r) => ({ time: r.at.toISOString(), kp: r.kp })),
  };
  const newest = Math.max(f107[f107.length - 1].at.getTime(), kp[kp.length - 1].at.getTime());
  return { data, asOf: new Date(newest).toISOString() };
}

/** A space-weather dataset, from a snapshot or a cache: every reading finite and in range. */
export function validSpaceWeather(data: unknown): data is SpaceWeather {
  if (!isObj(data) || !Array.isArray(data.f107) || !Array.isArray(data.kp) || !data.f107.length || !data.kp.length) return false;
  return data.f107.every((r) => isObj(r) && typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && finite(r.flux) && r.flux > 0 && r.flux < 1000)
    && data.kp.every((r) => isObj(r) && !!utc(r.time) && finite(r.kp) && r.kp >= 0 && r.kp <= 9);
}
