import { readFileSync } from 'node:fs';

/** Recorded CI seconds by journey name: each journey that is not held, and any held one that kept its entry (shard-seconds.json; its _notes say where they come from). */
export const JOURNEY_SECONDS = Object.fromEntries(Object.entries(JSON.parse(readFileSync(new URL('./shard-seconds.json', import.meta.url), 'utf8')))
  .filter(([name]) => !name.startsWith('_')));

/**
 * Partition the already selected, sorted journeys (names, or run.mjs's { name, mod }); never silently run an empty shard.
 * Longest first by recorded seconds (ties by name, in the file-name order run.mjs and the plan list journeys in), each
 * goes to the shard with the least total so far (ties to the lowest shard), and a shard keeps the input order. The
 * partition depends only on the names and the seconds, so the runner, run-browser.mjs and the aggregate agree on it.
 */
export function selectShard(journeys, shard = null, seconds = JOURNEY_SECONDS) {
  if (shard === null) return journeys;
  const match = /^(\d+)\/(\d+)$/.exec(shard);
  if (!match) throw new Error('shard must be N/M, for example 1/2');
  const part = Number(match[1]), total = Number(match[2]);
  if (!Number.isSafeInteger(part) || !Number.isSafeInteger(total) || part < 1 || part > total) {
    throw new Error('shard requires 1 <= N <= M');
  }
  if (total > journeys.length) throw new Error('shard count exceeds selected journeys');
  const names = journeys.map(journey => typeof journey === 'string' ? journey : journey.name);
  for (const name of names) {
    // only a positive number: "30" and [30] pass > 0 but add as strings, and a journey then lands in no shard
    if (!(Number.isFinite(seconds[name]) && seconds[name] > 0)) throw new Error(`${name} has no recorded seconds: add its seconds to tests/browser/shard-seconds.json (its _notes say how)`);
  }
  const file = index => `${names[index]}.mjs`; // r2-transport-fit-clock.mjs sorts before r2-transport-fit.mjs
  const longest = names.map((_, index) => index).sort((a, b) => seconds[names[b]] - seconds[names[a]] || (file(a) < file(b) ? -1 : file(a) > file(b) ? 1 : 0));
  const loads = Array(total).fill(0), owner = [];
  for (const index of longest) {
    owner[index] = loads.indexOf(Math.min(...loads));
    loads[owner[index]] += seconds[names[index]];
  }
  return journeys.filter((_, index) => owner[index] === part - 1);
}
