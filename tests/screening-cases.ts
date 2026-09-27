/**
 * The cases the screening's time filter (roadmap M01, P2.5;
 * src/orbit/screening-filter.ts) is held to: a wide set of primaries against
 * the bundled catalogue (public/data/satellites.json, every group), and the
 * comparison of the filtered screening with the full search it must agree
 * with. Shared by tests/screening-filter.test.ts and the larger sweep in
 * tests/heavy/screening-filter.test.ts.
 *
 * The criterion was fixed before the first comparison was run: the same
 * objects, each approach's time of closest approach within 1 ms and its miss
 * within 1 mm — no approach dropped, none added.
 */
import { expect } from 'vitest';
import { elementsFromRecord } from '../src/orbit/omm';
import type { OmmRecord } from '../src/provider/satellites';
import { skyObjects, type SkyObject } from '../src/orbit/real-sky';
import { screen, type FilterStats } from '../src/orbit/screening';
import { parseSnapshot } from '../src/provider/data-provider';

const SNAPSHOT_FILE = import.meta.glob('../public/data/satellites.json', { import: 'default', eager: true }) as Record<string, unknown>;
const snap = parseSnapshot(Object.values(SNAPSHOT_FILE)[0], 'satellites');

/** Every object of the bundled snapshot, all groups. */
export const catalogue: SkyObject[] = snap.data.groups.flatMap((g) => skyObjects(g.sets.map(elementsFromRecord), g.id));

/** The screenings start at noon on the snapshot's day (its sets date from 2026-09-26). */
export const JD0 = Date.parse('2026-09-26T12:00:00Z') / 86400000 + 2440587.5;

/** A constructed element set (not a real object's): the orbits the snapshot has none of. */
const made = (norad: number, name: string, fields: Partial<OmmRecord>): SkyObject => skyObjects([elementsFromRecord({
  OBJECT_NAME: name, OBJECT_ID: '2026-000A', EPOCH: '2026-09-26T00:00:00.000000', MEAN_MOTION: 15, ECCENTRICITY: 0.001,
  INCLINATION: 50, RA_OF_ASC_NODE: 100, ARG_OF_PERICENTER: 90, MEAN_ANOMALY: 0, EPHEMERIS_TYPE: 0,
  CLASSIFICATION_TYPE: 'U', NORAD_CAT_ID: norad, ELEMENT_SET_NO: 999, REV_AT_EPOCH: 1, BSTAR: 0, MEAN_MOTION_DOT: 0,
  MEAN_MOTION_DDOT: 0, ...fields,
} as OmmRecord)], 'imported')[0];

const real = (satnum: number): SkyObject => {
  const o = catalogue.find((x) => x.el.satnum === satnum);
  if (!o) throw new Error(`${satnum} is not in the snapshot`);
  return o;
};

export interface Primary { label: string; self: SkyObject }

/**
 * The primaries: real sets where the snapshot has one, constructed ones
 * (labelled) where it has none. Near-Earth ones go through the filter; the
 * deep-space ones (SDP4) are searched whole, and are here to show it.
 */
export const PRIMARIES: Record<string, () => Primary> = {
  iss: () => ({ label: 'ISS (25544), 415 km, 51.6°', self: real(25544) }),
  sso700: () => ({ label: 'Landsat 8 (39084), 700 km sun-synchronous', self: real(39084) }),
  leo1200: () => ({ label: 'Yaogan-22 (40275), 1 200 km, 100.8°', self: real(40275) }),
  // Molniya: 12-hour period, e = 0.72, 63.4° (constructed)
  molniya: () => ({ label: 'a Molniya orbit (constructed)', self: made(99001, 'MOLNIYA (CONSTRUCTED)', { MEAN_MOTION: 2.00563, ECCENTRICITY: 0.72, INCLINATION: 63.4, ARG_OF_PERICENTER: 270 }) }),
  // a geostationary transfer orbit, 250 × 35 786 km at 27° (constructed)
  gto: () => ({ label: 'a geostationary transfer orbit, 250 × 35 786 km (constructed)', self: made(99002, 'GTO (CONSTRUCTED)', { MEAN_MOTION: 2.2782, ECCENTRICITY: 0.7283, INCLINATION: 27, ARG_OF_PERICENTER: 178, BSTAR: 1e-4 }) }),
  // a Hohmann transfer from 400 to 1 200 km, near-Earth: through the crowded band at 700–850 km (constructed)
  transfer: () => ({ label: 'a transfer from 400 to 1 200 km, e = 0.056 (constructed)', self: made(99003, 'TRANSFER (CONSTRUCTED)', { MEAN_MOTION: 14.275, ECCENTRICITY: 0.0557, INCLINATION: 97.5, ARG_OF_PERICENTER: 30, BSTAR: 5e-5 }) }),
  geo: () => ({ label: 'Thaicom 8 (41552), geostationary', self: real(41552) }),
  // decaying: the snapshot's lowest (269 × 277 km, B* 7.3e-4), and two constructed ones through the ISS's and the 700 km bands
  // that SGP4 brings down within the window: 156 × 701 km (SGP4's simplified drag, perigee under 220 km), down 43 h after
  // the start; 233 × 713 km, down after 35 h, whose drag polynomial the filter will not trust over a week (searched whole then)
  decaying: () => ({ label: 'HRC monoblock camera (66052), 270 km, decaying', self: real(66052) }),
  reentering: () => ({ label: 'an object at 156 × 701 km that re-enters after 43 h (constructed)', self: made(99004, 'REENTRY A (CONSTRUCTED)', { MEAN_MOTION: 15.45, ECCENTRICITY: 0.04, INCLINATION: 82, BSTAR: 0.01 }) }),
  falling: () => ({ label: 'an object at 233 × 713 km that re-enters after 35 h (constructed)', self: made(99005, 'REENTRY B (CONSTRUCTED)', { MEAN_MOTION: 15.3, ECCENTRICITY: 0.035, INCLINATION: 82, BSTAR: 0.05 }) }),
  // 481 × 495 km at the epoch with B* 0.05: SGP4 takes it below 400 km within the week, through the ISS's band (constructed)
  sinking: () => ({ label: 'an object at 481 × 495 km that SGP4 brings below 400 km in a week (constructed)', self: made(99006, 'SINKING (CONSTRUCTED)', { MEAN_MOTION: 15.25, ECCENTRICITY: 0.001, INCLINATION: 97, BSTAR: 0.05 }) }),
  // eccentric debris with heavy drag and elements 11 days old: 786 × 3 105 km, B* 0.039
  eccentric: () => ({ label: 'Fengyun-1C debris (30239), 786 × 3 105 km, B* 0.039', self: real(30239) }),
};

export interface Compared { reference: number; filtered: number; stats: FilterStats; ms: { reference: number; filtered: number } }

/** Screen `self` with and without the filter and hold the two to the criterion; returns the counts. */
export function compareScreenings(self: SkyObject, days: number, within: number, what: string): Compared {
  let t = performance.now();
  const reference = screen(self, catalogue, JD0, JD0 + days, within, 10, { filter: false });
  const tRef = performance.now() - t;
  const stats: FilterStats = { pairs: 0, whole: 0, none: 0, windows: 0 };
  t = performance.now();
  const filtered = screen(self, catalogue, JD0, JD0 + days, within, 10, { stats });
  const tFil = performance.now() - t;
  const left = [...filtered];
  const dropped: string[] = [];
  for (const r of reference) {
    const k = left.findIndex((f) => f.other.key === r.other.key && Math.abs(f.approach.tca - r.approach.tca) * 86400 <= 1e-3);
    if (k < 0) { dropped.push(`${r.other.key} at ${r.approach.tca}, ${r.approach.miss.toFixed(1)} m`); continue; }
    const f = left.splice(k, 1)[0];
    expect(Math.abs(f.approach.miss - r.approach.miss), `${what}: ${r.other.key} miss`).toBeLessThanOrEqual(1e-3);
  }
  expect(dropped, `${what}: dropped`).toEqual([]);
  expect(left.map((f) => `${f.other.key} at ${f.approach.tca}`), `${what}: added`).toEqual([]);
  return { reference: reference.length, filtered: filtered.length, stats, ms: { reference: tRef, filtered: tFil } };
}
