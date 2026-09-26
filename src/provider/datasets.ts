/**
 * The datasets the app can load (roadmap S04), each with its bundled
 * snapshot and, for online mode, where it comes from and how the answers
 * become the dataset: space weather (S04, for R05's density model) and the
 * satellite catalogue (R02); launches (Launch Library 2) will join them.
 *
 * Online sources, as checked on 2026-09-26: NOAA SWPC, CelesTrak's GP JSON
 * and Launch Library 2 all answer `access-control-allow-origin: *`, so a
 * static page can read them directly. Space-Track is never a source: its user
 * agreement forbids redistribution, so its data only ever come in as a file
 * the user imports.
 */
import { SWPC_F107_URL, SWPC_KP_URL, parseSwpc, validSpaceWeather, type SpaceWeather } from './space-weather';
import { SATELLITES_MIN_INTERVAL_MS, SATELLITE_URLS, parseCelestrakGp, validSatelliteCatalog, type SatelliteCatalog } from './satellites';

export interface DatasetSource {
  /** who publishes it */
  name: string;
  /** where a person can see it */
  url: string;
}

export interface DatasetDef<T> {
  id: string;
  /** the bundled snapshot, relative to the app's base (under `public/`) */
  snapshot: string;
  source: DatasetSource;
  /** online: the URLs to fetch, and how their JSON answers, in that order, become the dataset and its "data as of" */
  online: { urls: readonly string[]; parse(answers: unknown[]): { data: T; asOf: string } };
  /** the dataset's data, from whichever side it came: checked, never trusted */
  valid(data: unknown): data is T;
  /**
   * online: ask the source no more often than this, ms — its answers (or its
   * refusal) are kept and used again until then (R02: CelesTrak's rule)
   */
  minIntervalMs?: number;
}

export interface DatasetTypes {
  spaceWeather: SpaceWeather;
  satellites: SatelliteCatalog;
}
export type DatasetId = keyof DatasetTypes;

export const DATASETS: { readonly [K in DatasetId]: DatasetDef<DatasetTypes[K]> } = {
  spaceWeather: {
    id: 'spaceWeather',
    snapshot: 'data/space-weather.json',
    source: { name: 'NOAA Space Weather Prediction Center', url: 'https://www.swpc.noaa.gov/' },
    online: { urls: [SWPC_F107_URL, SWPC_KP_URL], parse: ([f107, kp]) => parseSwpc(f107, kp) },
    valid: validSpaceWeather,
  },
  satellites: {
    id: 'satellites',
    snapshot: 'data/satellites.json',
    source: { name: 'CelesTrak', url: 'https://celestrak.org/NORAD/elements/' },
    online: { urls: SATELLITE_URLS, parse: parseCelestrakGp },
    valid: validSatelliteCatalog,
    minIntervalMs: SATELLITES_MIN_INTERVAL_MS,
  },
};

export const DATASET_IDS = Object.keys(DATASETS) as DatasetId[];

/** Hosts the online datasets are fetched from: the service worker keeps their answers for when the network goes (S04). */
export const DATA_HOSTS: readonly string[] = [...new Set(DATASET_IDS.flatMap((id) => DATASETS[id].online.urls.map((u) => new URL(u).hostname)))];
