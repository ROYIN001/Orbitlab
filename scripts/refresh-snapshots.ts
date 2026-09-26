/**
 * Fetch the data snapshots the app bundles for offline use (roadmap S04),
 * into public/data/. Run by hand now (`npm run snapshots`); roadmap R02 runs
 * it in a scheduled GitHub Actions build that deploys the result without
 * committing it.
 *
 * Node 22.6 or newer, which runs TypeScript with its types stripped: this file
 * imports only src/provider/space-weather.ts, which is self-contained for that
 * reason. The file it writes is what src/provider/data-provider.ts
 * `parseSnapshot` reads (tests/data-provider.test.ts reads the bundled one).
 */
import { writeFileSync } from 'node:fs';
import { SWPC_F107_URL, SWPC_KP_URL, parseSwpc, validSpaceWeather } from '../src/provider/space-weather.ts';

async function json(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.json();
}

const fetched = new Date();
const { data, asOf } = parseSwpc(await json(SWPC_F107_URL), await json(SWPC_KP_URL));
if (!validSpaceWeather(data)) throw new Error('space weather: the parsed data do not pass their own check');
const snapshot = {
  format: 'orbitlab.snapshot', version: 1, dataset: 'spaceWeather', asOf, fetched: fetched.toISOString(),
  source: { name: 'NOAA Space Weather Prediction Center', url: 'https://www.swpc.noaa.gov/' }, data,
};
const path = new URL('../public/data/space-weather.json', import.meta.url);
writeFileSync(path, `${JSON.stringify(snapshot, null, 1)}\n`);
console.log(`space weather: ${data.f107.length} days of F10.7, ${data.kp.length} Kp readings, as of ${asOf}`);
