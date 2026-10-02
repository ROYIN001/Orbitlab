/**
 * Run the browser journeys (tests/browser/journeys/*.mjs) against the
 * production build and exit non-zero if any failed.
 *
 *   node tests/browser/run.mjs [--smoke] [--base URL] [--dist DIR] [--shots DIR] [journey …]
 *
 * With no `--base`, `DIR` (default `dist`) is served under `/Orbitlab/` on a
 * free port (tests/browser/serve.mjs); build it first. `--smoke` keeps the
 * journeys that export `smoke = true`; naming journeys (file names without
 * `.mjs`) runs just those. Screenshots of every failed journey's pages go to
 * `--shots` (default `tests/browser/screenshots`).
 */
import { readdirSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launchBrowser, createJourney, DEFAULT_TIMEOUT_MS } from './harness.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const journeyDir = join(here, 'journeys');

export async function runJourneys({ names = [], smoke = false, base = null, dist = 'dist', shots = 'tests/browser/screenshots' } = {}) {
  const all = readdirSync(journeyDir).filter((f) => f.endsWith('.mjs')).sort();
  const unknown = names.filter((n) => !all.includes(`${n.replace(/\.mjs$/, '')}.mjs`));
  if (unknown.length) throw new Error(`no journey named ${unknown.join(', ')} (have: ${all.map((f) => basename(f, '.mjs')).join(', ')})`);
  const picked = [];
  for (const file of all) {
    const name = basename(file, '.mjs');
    if (names.length && !names.some((n) => n.replace(/\.mjs$/, '') === name)) continue;
    const mod = await import(pathToFileURL(join(journeyDir, file)).href);
    if (smoke && !names.length && !mod.smoke) continue;
    picked.push({ name, mod });
  }
  if (!picked.length) throw new Error('no journeys selected');

  const server = base ? null : await serve({ root: dist });
  const url = base ?? server.url;
  const distDir = base ? null : resolve(dist);
  const shotsDir = shots ? resolve(shots) : null;
  console.log(`browser journeys against ${url}: ${picked.map((j) => j.name).join(', ')}`);
  const results = [];
  const started = Date.now();
  try {
    for (const { name, mod } of picked) {
      // Contexts isolate storage, but still share Chromium's GPU process.
      // Give each journey fresh browser state; a failure is never retried.
      const browser = await launchBrowser();
      try {
        const t = createJourney({ name, browser, base: url, server, distDir, shots: shotsDir });
        const t0 = Date.now();
        console.log(`▶ ${name}`);
        const limit = mod.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        let timer;
        try {
          await Promise.race([
            mod.default(t),
            new Promise((_, no) => { timer = setTimeout(() => no(new Error(`timed out after ${limit / 1000} s`)), limit); }),
          ]);
        } catch (e) {
          t.fail(`threw: ${e?.stack ?? e}`);
        } finally {
          clearTimeout(timer);
        }
        if (t.failures.length) {
          const saved = await t.shotAll();
          if (saved.length) console.log(`  screenshots: ${saved.join(', ')}`);
        }
        await t.close();
        const seconds = (Date.now() - t0) / 1000;
        results.push({ name, failures: t.failures, seconds });
        console.log(`${t.failures.length ? '✗' : '✓'} ${name} (${seconds.toFixed(1)} s)`);
        if (process.env.GITHUB_ACTIONS) for (const f of t.failures) console.log(`::error title=browser journey ${name}::${String(f).split('\n')[0]}`);
      } finally {
        await browser.close().catch(() => {});
      }
    }
  } finally {
    await server?.close();
  }
  const failed = results.filter((r) => r.failures.length);
  console.log(`\n${results.length - failed.length}/${results.length} journeys passed in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  for (const r of failed) console.log(`  ✗ ${r.name}: ${r.failures.length} failure(s)`);
  return { results, ok: failed.length === 0 };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const opts = { names: [], smoke: false, base: null, dist: 'dist', shots: 'tests/browser/screenshots' };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--smoke') opts.smoke = true;
    else if (a === '--base') opts.base = args[++i];
    else if (a === '--dist') opts.dist = args[++i];
    else if (a === '--shots') opts.shots = args[++i];
    else if (a.startsWith('--')) { console.error(`unknown option ${a}`); process.exit(2); }
    else opts.names.push(a);
  }
  try {
    const { ok } = await runJourneys(opts);
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error(e?.stack ?? e);
    process.exit(2);
  }
}
