/**
 * scripts/refresh-snapshots.ts run as the Pages job runs it, on a copy in a
 * temporary folder with `fetch` stubbed: nothing is fetched and the repo's
 * public/data/ is never written. A satellite query that finds nothing
 * (CelesTrak's 404, as NAME=NAPA since NAPA-1 re-entered on 2026-11-02) keeps
 * only its own group from the snapshot already there (P2.5); every other
 * failure keeps the whole snapshot, as before. Not one of the files the Pages
 * job runs on the refreshed data.
 *
 * The project has no node types (tsconfig: vite/client only), so node's
 * modules are loaded as tests/repo-hygiene.test.ts loads them.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SATELLITE_URLS, SAT_GROUPS, parseCelestrakGp, type OmmRecord } from '../src/provider/satellites';

interface FsModule {
  mkdtempSync(prefix: string): string;
  mkdirSync(path: string, options: { recursive: true }): void;
  copyFileSync(from: string, to: string): void;
  readFileSync(path: string, encoding: 'utf8'): string;
  writeFileSync(path: string, data: string): void;
  rmSync(path: string, options: { recursive: true; force: true }): void;
}
interface ChildProcessModule {
  execFileSync(file: string, args: string[], options: { cwd: string; encoding: 'utf8'; stdio: 'pipe'; timeout: number }): string;
}
const load = (id: string): Promise<unknown> => import(/* @vite-ignore */ id);
const fs = (await load('node:fs')) as FsModule;
const { execFileSync } = (await load('node:child_process')) as ChildProcessModule;
const { tmpdir } = (await load('node:os')) as { tmpdir(): string };
const { execPath } = (await load('node:process')) as { execPath: string };
const { fileURLToPath } = (await load('node:url')) as { fileURLToPath(url: URL): string };

// made when the tests run, not when the file is only collected (`vitest list`, as CI's plan job does), so nothing is left behind
let dir = '', SNAPSHOT = '', committedText = '';
let committed: { data: { groups: unknown[] } };
beforeAll(() => {
  dir = fs.mkdtempSync(`${tmpdir()}/orbitlab-refresh-`);
  // the script, what it imports and the snapshot it keeps from, each where the script looks for it
  for (const file of ['scripts/refresh-snapshots.ts', 'src/provider/space-weather.ts', 'src/provider/satellites.ts', 'src/provider/earth-orientation.ts', 'public/data/satellites.json']) {
    fs.mkdirSync(`${dir}/${file.slice(0, file.lastIndexOf('/'))}`, { recursive: true });
    fs.copyFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), `${dir}/${file}`);
  }
  // an ES module, as under the repo's package.json, whatever package.json is above the temporary folder
  fs.writeFileSync(`${dir}/package.json`, '{ "type": "module" }\n');
  // fetch answers from answers.json, a status or a body, and 503 for any other URL (NOAA, the IERS); each URL asked is printed
  fs.writeFileSync(`${dir}/stub.mjs`, `import { readFileSync } from 'node:fs';
const answers = JSON.parse(readFileSync(new URL('./answers.json', import.meta.url), 'utf8'));
globalThis.fetch = async (url) => {
  console.log('asked ' + url);
  const a = url in answers ? answers[url] : 503;
  return typeof a === 'number' ? new Response('stub', { status: a }) : new Response(JSON.stringify(a));
};
`);
  SNAPSHOT = `${dir}/public/data/satellites.json`;
  committedText = fs.readFileSync(SNAPSHOT, 'utf8');
  committed = JSON.parse(committedText);
});
afterAll(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

/** One run of the copy: what it printed, and how many times it asked CelesTrak. */
function refresh(answers: Record<string, unknown>): { out: string; asked: number } {
  fs.writeFileSync(`${dir}/answers.json`, JSON.stringify(answers));
  // the test's own time limit cannot stop a call that blocks: a child that hangs is stopped here
  const out = execFileSync(execPath, ['--experimental-strip-types', '--import', './stub.mjs', 'scripts/refresh-snapshots.ts'], { cwd: dir, encoding: 'utf8', stdio: 'pipe', timeout: 20_000 });
  return { out, asked: out.split('\n').filter((l) => l.startsWith('asked https://celestrak.org/')).length };
}

// older than every committed group's newest set (all of 2026-09-26), gnss's (a middle query's) the newest: a date taken from a kept group, or from the oldest, first or last set fetched, would show
const SET = (norad: number): OmmRecord => ({
  OBJECT_NAME: `SAT ${norad}`, OBJECT_ID: '2000-001A', EPOCH: norad === 1000 + owner.indexOf('gnss') ? '2026-09-01T12:00:00.000000' : '2026-08-01T12:00:00.000000', MEAN_MOTION: 15.5, ECCENTRICITY: 0.0007,
  INCLINATION: 51.6, RA_OF_ASC_NODE: 159.2, ARG_OF_PERICENTER: 184.2, MEAN_ANOMALY: 175.9, EPHEMERIS_TYPE: 0,
  CLASSIFICATION_TYPE: 'U', NORAD_CAT_ID: norad, ELEMENT_SET_NO: 999, REV_AT_EPOCH: 58744, BSTAR: 0.00059, MEAN_MOTION_DOT: 0.0003,
  MEAN_MOTION_DDOT: 0,
});
// a new set for each query; Thailand's are THEOS-2's, a number its group keeps
const owner = SAT_GROUPS.flatMap((g) => g.queries.map(() => g.id));
const FRESH = Object.fromEntries(SATELLITE_URLS.map((u, k) => [u, [SET(owner[k] === 'thai' ? 58016 : 1000 + k)]]));
// the Thai group's second query, NAME=NAPA: the one CelesTrak answers 404 since NAPA-1 re-entered
const MISS = owner.indexOf('thai') + 1;

describe('the snapshot script, run on a copy with fetch stubbed (P2.5)', () => {
  it('asks every query, and keeps from the snapshot only the groups whose query found nothing', () => {
    const { out, asked } = refresh({ ...FRESH, [SATELLITE_URLS[MISS]]: 404 });
    expect(asked).toBe(SATELLITE_URLS.length);
    expect(out).toContain(`::warning::satellites: thai kept from the snapshot already in public/data/ (${SATELLITE_URLS[MISS]} answered 404)`);
    const groups = parseCelestrakGp(SATELLITE_URLS.map((u) => FRESH[u])).data.groups;
    const written = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
    expect(written.data.groups).toEqual(groups.map((g, gi) => (g.id === 'thai' ? committed.data.groups[gi] : g)));
    // dated by the groups fetched (the stub's sets), not by the kept Thai sets of 2026-09-26
    expect(written.asOf).toBe('2026-09-01T12:00:00.000Z');
    // a 404 from every query but debris's, eight in five groups (more 404s than there are groups), from the committed file again: debris is still a group to fetch
    const allButDebris = SATELLITE_URLS.filter((_, k) => owner[k] !== 'debris');
    fs.writeFileSync(SNAPSHOT, committedText);
    expect(refresh({ ...FRESH, ...Object.fromEntries(allButDebris.map((u) => [u, 404])) }).out).toContain(`::warning::satellites: stations, thai, gnss, weather, imaging kept from the snapshot already in public/data/ (${allButDebris.map((u) => `${u} answered 404`).join('; ')})`);
    expect(JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')).data.groups).toEqual(groups.map((g, gi) => (g.id === 'debris' ? g : committed.data.groups[gi])));
  }, 30_000);

  it('keeps the whole snapshot otherwise, and asks no more after a refusal', () => {
    // a 404 in every group, while THEOS, THAICOM and CATNR=40141 answer: no group left to fetch
    const inEvery = SATELLITE_URLS.filter((_, k) => owner[k] !== 'thai' || k === MISS);
    // the snapshot's groups out of order: a kept group must still pass the catalogue's check
    const reordered = JSON.stringify({ ...committed, data: { groups: [...committed.data.groups].reverse() } });
    const cases: [string, Record<string, unknown>, number, string?][] = [
      [`${SATELLITE_URLS[MISS + 1]} answered 403`, { ...FRESH, [SATELLITE_URLS[MISS]]: 404, [SATELLITE_URLS[MISS + 1]]: 403 }, MISS + 2],
      [SATELLITE_URLS.map((u) => `${u} answered 404`).join('; '), Object.fromEntries(SATELLITE_URLS.map((u) => [u, 404])), SATELLITE_URLS.length],
      [inEvery.map((u) => `${u} answered 404`).join('; '), { ...FRESH, ...Object.fromEntries(inEvery.map((u) => [u, 404])) }, SATELLITE_URLS.length],
      ['an answer was null', { ...FRESH, [SATELLITE_URLS[MISS]]: 404, [SATELLITE_URLS[0]]: null }, SATELLITE_URLS.length],
      ['the parsed data do not pass their own check', { ...FRESH, [SATELLITE_URLS[MISS]]: 404 }, SATELLITE_URLS.length, reordered],
    ];
    for (const [why, answers, asks, snapshot] of cases) {
      if (snapshot) fs.writeFileSync(SNAPSHOT, snapshot);
      const before = fs.readFileSync(SNAPSHOT, 'utf8');
      const { out, asked } = refresh(answers);
      expect(asked, why).toBe(asks);
      expect(out, why).toContain(`::warning::satellites: kept the snapshot already in public/data/ (${why}`);
      expect(fs.readFileSync(SNAPSHOT, 'utf8'), why).toBe(before);
    }
    // the copy as committed again, byte for byte
    fs.writeFileSync(SNAPSHOT, committedText);
  }, 30_000);
});
