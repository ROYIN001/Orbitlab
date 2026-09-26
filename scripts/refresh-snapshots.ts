/**
 * Fetch the data snapshots the app bundles for offline use (roadmap S04),
 * into public/data/: space weather from NOAA SWPC, and the satellite
 * catalogue from CelesTrak (R02). Run by hand (`npm run snapshots`), and by
 * the scheduled deploy (.github/workflows/deploy.yml), which builds the site
 * with what it fetched and never commits it.
 *
 * A dataset whose source cannot be reached keeps the snapshot already there
 * (the committed baseline, in a fresh checkout) and the run goes on: a
 * network error is tried again twice, a refusal (HTTP 4xx) is not — CelesTrak
 * asks that a refused request not be repeated. What each dataset got is
 * printed, a kept one as a GitHub Actions warning.
 *
 * Node 22.6 or newer, which runs TypeScript with its types stripped: this file
 * imports only src/provider/space-weather.ts and src/provider/satellites.ts,
 * which are self-contained for that reason. The files it writes are what
 * src/provider/data-provider.ts `parseSnapshot` reads (tests/data-provider.test.ts
 * reads the bundled ones).
 */
import { writeFileSync } from 'node:fs';
import { SWPC_F107_URL, SWPC_KP_URL, parseSwpc, validSpaceWeather } from '../src/provider/space-weather.ts';
import { SATELLITE_URLS, parseCelestrakGp, validSatelliteCatalog } from '../src/provider/satellites.ts';

class Refused extends Error {}

async function json(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Refused(`${url} answered ${res.status}`);
      return await res.json();
    } catch (error) {
      if (error instanceof Refused || attempt === 3) throw error;
      await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
}

/** Fetched one after another, not all at once: one source, one request at a time. */
async function all(urls: readonly string[]): Promise<unknown[]> {
  const out: unknown[] = [];
  for (const url of urls) out.push(await json(url));
  return out;
}

interface Refresh {
  id: string;
  file: string;
  source: { name: string; url: string };
  indent?: number;
  fetch(): Promise<{ data: unknown; asOf: string; summary: string }>;
}

const REFRESHES: Refresh[] = [
  {
    id: 'spaceWeather', file: 'space-weather.json', indent: 1,
    source: { name: 'NOAA Space Weather Prediction Center', url: 'https://www.swpc.noaa.gov/' },
    async fetch() {
      const { data, asOf } = parseSwpc(await json(SWPC_F107_URL), await json(SWPC_KP_URL));
      if (!validSpaceWeather(data)) throw new Error('the parsed data do not pass their own check');
      return { data, asOf, summary: `${data.f107.length} days of F10.7, ${data.kp.length} Kp readings` };
    },
  },
  {
    id: 'satellites', file: 'satellites.json',
    source: { name: 'CelesTrak', url: 'https://celestrak.org/NORAD/elements/' },
    async fetch() {
      const { data, asOf } = parseCelestrakGp(await all(SATELLITE_URLS));
      if (!validSatelliteCatalog(data)) throw new Error('the parsed data do not pass their own check');
      return { data, asOf, summary: data.groups.map((g) => `${g.id} ${g.sets.length}`).join(', ') };
    },
  },
];

for (const r of REFRESHES) {
  try {
    const fetched = new Date();
    const { data, asOf, summary } = await r.fetch();
    const snapshot = { format: 'orbitlab.snapshot', version: 1, dataset: r.id, asOf, fetched: fetched.toISOString(), source: r.source, data };
    writeFileSync(new URL(`../public/data/${r.file}`, import.meta.url), `${JSON.stringify(snapshot, null, r.indent)}\n`);
    console.log(`${r.id}: ${summary}, as of ${asOf}`);
  } catch (error) {
    console.log(`::warning::${r.id}: kept the snapshot already in public/data/ (${error instanceof Error ? error.message : String(error)})`);
  }
}
