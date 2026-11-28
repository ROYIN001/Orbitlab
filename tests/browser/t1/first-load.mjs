/**
 * The app's first load, three times over (plan S20-T1, Task A, Step 5): the time to ready, the
 * requests and their bytes, and every console error, so that two builds' first loads can be put
 * side by side. No bound is set on the time; the pass is that the app is ready each time with no
 * console error.
 *
 *   node tests/browser/t1/first-load.mjs <dist folder or URL> <out.json> [lifetime digest]
 *
 * With a folder it serves it under /Orbitlab/ (tests/browser/serve.mjs). With a URL (`http://…/`,
 * for instance the development server of `npx vite`) it serves nothing itself, and it also starts
 * one worker from its source, `new Worker('<URL>src/physics/lifetime.worker.ts', { type: 'module' })`,
 * posts the lifetime request of tests/fixtures/t1/requests.json, and passes only when the digest of
 * the answers equals the lifetime worker's digest on the baseline: the one below, measured by
 * tests/browser/t1/worker-digests.mjs (tests/browser/t1/README.md, "Measured on the baseline"), or
 * the third argument, a digest or an output of worker-digests.mjs to take it from.
 *
 * Each of the three runs is a new browser context (so an empty cache) with service workers blocked:
 * it opens the app's opening page, waits as the journeys' `app.ready()` does (`#loading.hidden`,
 * tests/browser/harness.mjs), and records the time from navigation start to ready (read in the
 * page, `performance.now()` when `#loading` has the class `hidden`), the requests made from the
 * navigation until ready (count, and transferred bytes: response headers and encoded body, as
 * Playwright's `request.sizes()` gives them; a dedicated worker's requests included) and, for
 * information, the same once no request has started for two seconds (at most 30 s after ready).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../serve.mjs';
import { launchBrowser } from '../harness.mjs';
import { RUN_TIMEOUT_MS, freshPage, runInPage } from './worker-digests.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const REQUESTS = resolve(here, '../../fixtures/t1/requests.json');

/** The lifetime worker's digest on the baseline, efd6fd7 (README, "Measured on the baseline"). */
export const BASELINE_LIFETIME_DIGEST = 'cfecb3372a0575384bdddd1706cdda62e4aab9f2f845f4f4758b682ee50a3eac';

const RUNS = 3;
const READY_TIMEOUT_MS = 120_000;
const QUIET_MS = 2_000;
const SETTLE_CAP_MS = 30_000;

async function once(browser, base) {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 800 }, locale: 'en-GB' });
  const page = await context.newPage();
  const consoleErrors = [];
  const failed = [];
  const requests = [];
  let lastStart = Date.now();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`page error: ${e.message}`));
  page.on('request', (r) => { requests.push({ request: r, ready: false }); lastStart = Date.now(); });
  page.on('requestfailed', (r) => failed.push(`${r.url()}: ${r.failure()?.errorText}`));
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: READY_TIMEOUT_MS });
    const readyMs = await page.evaluate((timeout) => new Promise((done, fail) => {
      const el = () => document.querySelector('#loading');
      const check = () => { if (el()?.classList.contains('hidden')) { done(performance.now()); return true; } return false; };
      if (check()) return;
      const obs = new MutationObserver(() => { if (check()) obs.disconnect(); });
      obs.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
      setTimeout(() => { obs.disconnect(); fail(new Error(`not ready within ${timeout / 1000} s`)); }, timeout);
    }), READY_TIMEOUT_MS);
    const atReady = requests.length;
    for (const r of requests) r.ready = true;
    // settle: no new request for QUIET_MS, at most SETTLE_CAP_MS
    const settleEnd = Date.now() + SETTLE_CAP_MS;
    while (Date.now() < settleEnd && Date.now() - lastStart < QUIET_MS) await new Promise((r) => setTimeout(r, 200));
    const sized = async (list) => {
      let bytes = 0;
      for (const { request } of list) {
        const s = await request.sizes().catch(() => null);
        if (s) bytes += s.responseHeadersSize + s.responseBodySize;
      }
      return bytes;
    };
    const toReady = requests.slice(0, atReady);
    return {
      ready: true, readyMs: Math.round(readyMs), requests: toReady.length, bytes: await sized(toReady),
      settled: { requests: requests.length, bytes: await sized(requests) },
      files: toReady.map(({ request }) => new URL(request.url()).pathname),
      consoleErrors, failed,
    };
  } catch (error) {
    return { ready: false, error: String(error?.message ?? error).split('\n')[0], consoleErrors, failed };
  } finally {
    await context.close();
  }
}

async function main([target, outArg, expected]) {
  const isUrl = /^https?:\/\//.test(target);
  let want = BASELINE_LIFETIME_DIGEST;
  if (expected) want = /^[0-9a-f]{64}$/.test(expected) ? expected : JSON.parse(readFileSync(resolve(expected), 'utf8')).workers.lifetime.digest;
  const server = isUrl ? null : await serve({ root: target });
  const base = isUrl ? (target.endsWith('/') ? target : `${target}/`) : server.url;
  const browser = await launchBrowser();
  const out = { target: isUrl ? target : resolve(target), base, browser: browser.version(), runs: [] };
  let ok = true;
  try {
    for (let k = 0; k < RUNS; k++) {
      const r = await once(browser, base);
      out.runs.push(r);
      const pass = r.ready && r.consoleErrors.length === 0;
      if (!pass) ok = false;
      console.log(`${pass ? 'ok  ' : 'FAIL'} run ${k + 1}: ${r.ready ? `ready in ${(r.readyMs / 1000).toFixed(2)} s, ${r.requests} requests, ${(r.bytes / 1000).toFixed(1)} kB to ready; ${r.settled.requests} requests, ${(r.settled.bytes / 1000).toFixed(1)} kB once settled` : `not ready: ${r.error}`}${r.consoleErrors.length ? `; console errors: ${r.consoleErrors.join(' | ')}` : ''}`);
    }
    if (isUrl) {
      const requests = JSON.parse(readFileSync(REQUESTS, 'utf8'));
      const { context, page, consoleErrors } = await freshPage(browser, base, requests.workers.lifetime);
      let r;
      try {
        r = await page.evaluate(runInPage, { name: 'lifetime', url: `${base}src/physics/lifetime.worker.ts`, worker: 'src/physics/lifetime.worker.ts', timeoutMs: RUN_TIMEOUT_MS });
      } finally {
        await context.close();
      }
      const { raw: _raw, ...rest } = r;
      const pass = !r.failure && !r.afterEnd && !r.afterEndErrors && r.digest === want && consoleErrors.length === 0;
      out.sourceWorker = { ...rest, expected: want, consoleErrors, pass };
      if (!pass) ok = false;
      console.log(`${pass ? 'ok  ' : 'FAIL'} the lifetime worker from its source: ${r.failure ?? r.ended}, digest ${r.digest.slice(0, 12)} ${r.digest === want ? 'equals' : 'DIFFERS FROM'} the baseline's ${want.slice(0, 12)}${consoleErrors.length ? `; console errors: ${consoleErrors.join(' | ')}` : ''}`);
    }
  } finally {
    await browser.close();
    await server?.close();
  }
  out.ok = ok;
  writeFileSync(resolve(outArg), `${JSON.stringify(out, null, 2)}\n`);
  console.log(ok ? 'first load: ok' : 'first load: FAILED');
  return ok;
}

const args = process.argv.slice(2);
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (args.length < 2 || args.length > 3) {
    console.error('usage: node tests/browser/t1/first-load.mjs <dist folder or URL> <out.json> [lifetime digest or worker-digests out.json]');
    process.exit(2);
  }
  process.exit((await main(args)) ? 0 : 1);
}
