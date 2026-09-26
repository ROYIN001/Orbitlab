/**
 * The satellite catalogue as a dataset (roadmap R02): chosen groups of the
 * US Space Force's general-perturbations element sets, as CelesTrak publishes
 * them in the OMM keywords of CCSDS 502.0-B-3 (its "JSON" format,
 * https://celestrak.org/NORAD/documentation/gp-data-formats.php). The groups
 * are the roadmap's: the space stations, Thailand's satellites, the four
 * navigation constellations, the weather satellites, and a debris set — the
 * fragments of Fengyun-1C, destroyed by an anti-satellite test in 2007 and
 * still in orbit.
 *
 * Each group is kept as CelesTrak sends it, object for object and number for
 * number, checked here and turned into SGP4's elements by src/orbit/omm.ts
 * where it is used. The same `parseCelestrakGp` makes the dataset from the
 * online answers and from what scripts/refresh-snapshots.ts fetches, so the
 * snapshot and the live data cannot differ in shape.
 *
 * CelesTrak takes new element sets every two hours and blocks addresses that
 * fetch the same file more often (its GP data documentation, FAQ addendum of
 * 2024), so online this dataset is fetched at most once in two hours
 * (`SATELLITES_MIN_INTERVAL_MS`, kept by src/provider/data-provider.ts).
 *
 * Self-contained on purpose (type-only imports at most): the snapshot script
 * runs it under Node without a bundler.
 */

export const CELESTRAK_GP_URL = 'https://celestrak.org/NORAD/elements/gp.php';

/** CelesTrak's own update rate: no need, and no welcome, to ask more often. */
export const SATELLITES_MIN_INTERVAL_MS = 2 * 3600 * 1000;

/** One element set in the OMM keywords, as CelesTrak's JSON gives it. */
export interface OmmRecord {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  /** ISO 8601 UTC without a zone: `2026-09-26T09:35:46.493952` */
  EPOCH: string;
  /** rev/day */
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  /** degrees */
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  EPHEMERIS_TYPE: number;
  CLASSIFICATION_TYPE: string;
  NORAD_CAT_ID: number;
  ELEMENT_SET_NO: number;
  REV_AT_EPOCH: number;
  /** 1/earth radii */
  BSTAR: number;
  /** as in the two-line format: ṅ/2 in rev/day², n̈/6 in rev/day³ */
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
}

export type SatGroupId = 'stations' | 'thai' | 'gnss' | 'weather' | 'debris';

/**
 * Thailand's satellites by catalogue number (src/data/thai-satellites.ts has
 * each one's facts and sources): THEOS-2, THEOS, NAPA-1, Thaicom 4, 6, 7, 8.
 * Thaicom 7 is catalogued as AsiaSat 6, so it is asked for by number.
 */
export const THAI_NORAD_IDS: readonly number[] = [58016, 33396, 46320, 28786, 39500, 40141, 41552];

export const SAT_GROUPS: readonly { id: SatGroupId; queries: readonly string[]; only?: readonly number[] }[] = [
  { id: 'stations', queries: ['GROUP=stations'] },
  { id: 'thai', queries: ['NAME=THEOS', 'NAME=NAPA', 'NAME=THAICOM', 'CATNR=40141'], only: THAI_NORAD_IDS },
  { id: 'gnss', queries: ['GROUP=gnss'] },
  { id: 'weather', queries: ['GROUP=weather'] },
  { id: 'debris', queries: ['GROUP=fengyun-1c-debris'] },
];

/** The online answers the dataset is made of, in order. */
export const SATELLITE_URLS: readonly string[] = SAT_GROUPS.flatMap((g) => g.queries.map((q) => `${CELESTRAK_GP_URL}?${q}&FORMAT=json`));

export interface SatelliteCatalog {
  groups: { id: SatGroupId; sets: OmmRecord[] }[];
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const EPOCH_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;

/** An OMM record with every keyword SGP4 needs, of the right type and in range. */
export function validOmm(r: unknown): r is OmmRecord {
  if (!isObj(r)) return false;
  return typeof r.OBJECT_NAME === 'string' && typeof r.OBJECT_ID === 'string'
    && typeof r.EPOCH === 'string' && EPOCH_RE.test(r.EPOCH) && Number.isFinite(Date.parse(`${r.EPOCH}Z`))
    && finite(r.MEAN_MOTION) && r.MEAN_MOTION > 0
    && finite(r.ECCENTRICITY) && r.ECCENTRICITY >= 0 && r.ECCENTRICITY < 1
    && finite(r.INCLINATION) && r.INCLINATION >= 0 && r.INCLINATION <= 180
    && finite(r.RA_OF_ASC_NODE) && finite(r.ARG_OF_PERICENTER) && finite(r.MEAN_ANOMALY)
    && finite(r.EPHEMERIS_TYPE) && typeof r.CLASSIFICATION_TYPE === 'string'
    && finite(r.NORAD_CAT_ID) && Number.isInteger(r.NORAD_CAT_ID) && r.NORAD_CAT_ID > 0
    && finite(r.ELEMENT_SET_NO) && finite(r.REV_AT_EPOCH)
    && finite(r.BSTAR) && finite(r.MEAN_MOTION_DOT) && finite(r.MEAN_MOTION_DDOT);
}

/** The catalogue, from a snapshot or a cache: every group there, every set sound. */
export function validSatelliteCatalog(data: unknown): data is SatelliteCatalog {
  if (!isObj(data) || !Array.isArray(data.groups)) return false;
  const ids = SAT_GROUPS.map((g) => g.id);
  return data.groups.length === ids.length
    && data.groups.every((g, k) => isObj(g) && g.id === ids[k] && Array.isArray(g.sets) && g.sets.every(validOmm));
}

/**
 * The dataset from CelesTrak's answers to `SATELLITE_URLS`, in that order,
 * and its "data as of" — the newest element set's epoch. A group's sets are
 * sorted by catalogue number, each object once. Throws on an answer that is
 * not a list of element sets or on an empty group: a changed format, or a
 * group gone, is a fallback to the snapshot, not an empty sky.
 */
export function parseCelestrakGp(answers: unknown[]): { data: SatelliteCatalog; asOf: string } {
  if (answers.length !== SATELLITE_URLS.length) throw new Error(`${answers.length} answers for ${SATELLITE_URLS.length} queries`);
  let k = 0, newest = -Infinity;
  const groups = SAT_GROUPS.map((g) => {
    const byId = new Map<number, OmmRecord>();
    for (let q = 0; q < g.queries.length; q++) {
      const answer = answers[k++];
      if (!Array.isArray(answer)) throw new Error(`${g.id}: not a list of element sets`);
      for (const r of answer) {
        if (!validOmm(r)) throw new Error(`${g.id}: an element set without its keywords`);
        if (g.only && !g.only.includes(r.NORAD_CAT_ID)) continue;
        byId.set(r.NORAD_CAT_ID, pick(r));
      }
    }
    const sets = [...byId.values()].sort((a, b) => a.NORAD_CAT_ID - b.NORAD_CAT_ID);
    if (!sets.length) throw new Error(`${g.id}: no element sets`);
    for (const s of sets) newest = Math.max(newest, Date.parse(`${s.EPOCH}Z`));
    return { id: g.id, sets };
  });
  return { data: { groups }, asOf: new Date(newest).toISOString() };
}

/** The OMM keywords SGP4 uses, and no others (CelesTrak sends no others; a copy keeps the snapshot to them). */
function pick(r: OmmRecord): OmmRecord {
  return {
    OBJECT_NAME: r.OBJECT_NAME, OBJECT_ID: r.OBJECT_ID, EPOCH: r.EPOCH, MEAN_MOTION: r.MEAN_MOTION,
    ECCENTRICITY: r.ECCENTRICITY, INCLINATION: r.INCLINATION, RA_OF_ASC_NODE: r.RA_OF_ASC_NODE,
    ARG_OF_PERICENTER: r.ARG_OF_PERICENTER, MEAN_ANOMALY: r.MEAN_ANOMALY, EPHEMERIS_TYPE: r.EPHEMERIS_TYPE,
    CLASSIFICATION_TYPE: r.CLASSIFICATION_TYPE, NORAD_CAT_ID: r.NORAD_CAT_ID, ELEMENT_SET_NO: r.ELEMENT_SET_NO,
    REV_AT_EPOCH: r.REV_AT_EPOCH, BSTAR: r.BSTAR, MEAN_MOTION_DOT: r.MEAN_MOTION_DOT, MEAN_MOTION_DDOT: r.MEAN_MOTION_DDOT,
  };
}
