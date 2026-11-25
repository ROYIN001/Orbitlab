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
import { afterAll, describe, expect, it } from 'vitest';
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
  execFileSync(file: string, args: string[], options: { cwd: string; encoding: 'utf8'; stdio: 'pipe' }): string;
}
const load = (id: string): Promise<unknown> => import(/* @vite-ignore */ id);
const fs = (await load('node:fs')) as FsModule;
const { execFileSync } = (await load('node:child_process')) as ChildProcessModule;
const { tmpdir } = (await load('node:os')) as { tmpdir(): string };
const { execPath } = (await load('node:process')) as { execPath: string };
const { fileURLToPath } = (await load('node:url')) as { fileURLToPath(url: URL): string };

const dir = fs.mkdtempSync(`${tmpdir()}/orbitlab-refresh-`);
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
// the script, what it imports and the snapshot it keeps from, each where the script looks for it
for (const file of ['scripts/refresh-snapshots.ts', 'src/provider/space-weather.ts', 'src/provider/satellites.ts', 'src/provider/earth-orientation.ts', 'public/data/satellites.json']) {
  fs.mkdirSync(`${dir}/${file.slice(0, file.lastIndexOf('/'))}`, { recursive: true });
  fs.copyFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), `${dir}/${file}`);
}
// fetch answers from answers.json, a status or a body, and 503 for any other URL (NOAA, the IERS); each URL asked is printed
fs.writeFileSync(`${dir}/stub.mjs`, `import { readFileSync } from 'node:fs';
const answers = JSON.parse(readFileSync(new URL('./answers.json', import.meta.url), 'utf8'));
globalThis.fetch = async (url) => {
  console.log('asked ' + url);
  const a = url in answers ? answers[url] : 503;
  return typeof a === 'number' ? new Response('stub', { status: a }) : new Response(JSON.stringify(a));
};
`);
const SNAPSHOT = `${dir}/public/data/satellites.json`;
const committed = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));

/** One run of the copy: what it printed, and how many times it asked CelesTrak. */
function refresh(answers: Record<string, unknown>): { out: string; asked: number } {
  fs.writeFileSync(`${dir}/answers.json`, JSON.stringify(answers));
  const out = execFileSync(execPath, ['--experimental-strip-types', '--import', './stub.mjs', 'scripts/refresh-snapshots.ts'], { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
  return { out, asked: out.split('\n').filter((l) => l.startsWith('asked https://celestrak.org/')).length };
}

const SET = (norad: number): OmmRecord => ({
  OBJECT_NAME: `SAT ${norad}`, OBJECT_ID: '2000-001A', EPOCH: '2026-11-24T12:00:00.000000', MEAN_MOTION: 15.5, ECCENTRICITY: 0.0007,
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
  it('asks every query, and keeps from the snapshot only the group of the one that found nothing', () => {
    const { out, asked } = refresh({ ...FRESH, [SATELLITE_URLS[MISS]]: 404 });
    expect(asked).toBe(SATELLITE_URLS.length);
    expect(out).toContain(`::warning::satellites: thai kept from the snapshot already in public/data/ (${SATELLITE_URLS[MISS]} answered 404)`);
    const groups = parseCelestrakGp(SATELLITE_URLS.map((u) => FRESH[u])).data.groups;
    expect(JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')).data.groups).toEqual(groups.map((g, gi) => (g.id === 'thai' ? committed.data.groups[gi] : g)));
  }, 30_000);

  it('keeps the whole snapshot otherwise, and asks no more after a refusal', () => {
    const cases: [string, Record<string, unknown>, number][] = [
      [`${SATELLITE_URLS[MISS + 1]} answered 403`, { ...FRESH, [SATELLITE_URLS[MISS]]: 404, [SATELLITE_URLS[MISS + 1]]: 403 }, MISS + 2],
      [SATELLITE_URLS.map((u) => `${u} answered 404`).join('; '), Object.fromEntries(SATELLITE_URLS.map((u) => [u, 404])), SATELLITE_URLS.length],
      ['an answer was null', { ...FRESH, [SATELLITE_URLS[MISS]]: 404, [SATELLITE_URLS[0]]: null }, SATELLITE_URLS.length],
    ];
    for (const [why, answers, asks] of cases) {
      const before = fs.readFileSync(SNAPSHOT, 'utf8');
      const { out, asked } = refresh(answers);
      expect(asked, why).toBe(asks);
      expect(out).toContain(`::warning::satellites: kept the snapshot already in public/data/ (${why}`);
      expect(fs.readFileSync(SNAPSHOT, 'utf8'), why).toBe(before);
    }
  }, 30_000);
});
