#!/usr/bin/env node
/** Production startup baseline; does not change application code or browser defaults.
 * Run after npm run build, with no other CPU-heavy jobs:
 * CHROMIUM=/usr/bin/chromium node scripts/stage1-baseline.mjs --out tests/browser/artifacts/stage1
 * Fresh browser contexts measure first visits; reloads measure installed PWA visits.
 * This loopback/SwiftShader benchmark is not a real phone, WAN benchmark, or field INP.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import os from 'node:os';
import { serve } from '../tests/browser/serve.mjs';
import { launchBrowser } from '../tests/browser/harness.mjs';

const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = resolve(outAt >= 0 ? args[outAt + 1] : 'tests/browser/artifacts/stage1');
const runsAt = args.indexOf('--runs');
const runs = runsAt >= 0 ? Number(args[runsAt + 1]) : 3;
if (!Number.isInteger(runs) || runs < 1 || runs > 10) throw new Error('--runs must be 1–10');
await mkdir(out, { recursive: true });
const build = JSON.parse(await readFile('dist/build-info.json', 'utf8'));
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!commit.startsWith(build.commit)) throw new Error('dist build does not match HEAD; run npm run build');

const assetSizes = [];
for (const name of (await readdir('dist/assets')).sort()) {
  if (!/\.(js|css)$/.test(name)) continue;
  const body = await readFile(join('dist/assets', name));
  assetSizes.push({ name, rawBytes: body.length, gzipBytes: gzipSync(body).length });
}
const server = await serve();
const browser = await launchBrowser();
const result = {
  recordedAt: new Date().toISOString(), commit, build,
  environment: {
    node: process.version, chromium: browser.version(), platform: `${os.platform()} ${os.arch()}`,
    cpuQuota: (await readFile('/sys/fs/cgroup/cpu.max', 'utf8').catch(() => 'unknown')).trim(),
    memoryLimitBytes: (await readFile('/sys/fs/cgroup/memory.max', 'utf8').catch(() => 'unknown')).trim(),
    rendering: 'SwiftShader software WebGL; deviceScaleFactor=1',
    network: 'Loopback static server, uncompressed HTTP, no network/CPU throttling',
  },
  methodology: {
    runsPerViewport: runs, sampleDurationMs: 10000,
    cold: 'New context: empty HTTP cache, Cache Storage, localStorage, and service workers; same browser process/OS cache; default guide and offline data mode retained',
    warm: 'Reload the same context after serviceWorker.ready; require an active service-worker controller',
    ready: 'First 10 ms timer observation of window.orbitlab.started === true; includes the initial mission preview',
    resources: 'Page Resource Timing entries at end of sample; service-worker precache requests are not included',
    resourceDuration: 'Raw durations are retained; negative values are browser timing anomalies, flagged invalid and excluded from interpretation',
    lcp: 'Latest LCP observer entry during the sample, not a field Core Web Vitals result',
    frame: 'requestAnimationFrame callback cadence after app ready, not proof of GPU-presented FPS',
    limits: 'Small laboratory sample on shared cloud CPU/software rendering; not a physical phone or WAN experience; screenshots are taken after measurements',
  },
  assetSizes, samples: [],
};
const checkpoint = () => writeFile(join(out, 'performance.json'), `${JSON.stringify(result, null, 2)}\n`);

function instrumentation() {
  performance.setResourceTimingBufferSize(2000);
  const state = window.__stage1 = { appReadyMs: null, loadingHiddenMs: null, lcpMs: null, longTasks: [] };
  for (const type of ['longtask', 'largest-contentful-paint']) {
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (type === 'longtask') state.longTasks.push({ startMs: e.startTime, durationMs: e.duration });
          else state.lcpMs = e.startTime;
        }
      }).observe({ type, buffered: true });
    } catch { /* API availability is recorded by null/empty measurements. */ }
  }
  const timer = setInterval(() => {
    if (state.loadingHiddenMs === null && document.getElementById('loading')?.classList.contains('hidden')) state.loadingHiddenMs = performance.now();
    if (window.orbitlab?.started) {
      state.appReadyMs = performance.now();
      clearInterval(timer);
    }
  }, 10);
}

async function sample(page) {
  await page.waitForFunction(() => window.__stage1?.appReadyMs !== null && window.orbitlab?.started, null, { timeout: 120000 });
  return page.evaluate(async () => {
    const start = performance.now();
    const ticks = [];
    await new Promise((done) => {
      const tick = now => {
        ticks.push(now);
        if (now - start >= 10000) done();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const gaps = ticks.slice(1).map((v, i) => v - ticks[i]).sort((a, b) => a - b);
    const percentile = p => gaps.length ? gaps[Math.min(gaps.length - 1, Math.ceil(gaps.length * p) - 1)] : null;
    const resources = performance.getEntriesByType('resource').map(e => ({
      path: new URL(e.name).pathname.replace(/^\/Orbitlab\//, ''), initiator: e.initiatorType,
      transferBytes: e.transferSize, encodedBytes: e.encodedBodySize, decodedBytes: e.decodedBodySize, durationMs: e.duration,
      durationValid: e.duration >= 0,
    }));
    const nav = performance.getEntriesByType('navigation')[0];
    const long = window.__stage1.longTasks;
    return {
      ...window.__stage1,
      domContentLoadedMs: nav.domContentLoadedEventEnd, loadEventMs: nav.loadEventEnd,
      firstContentfulPaintMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
      longTaskCount: long.length, longTaskTotalMs: long.reduce((n, e) => n + e.durationMs, 0),
      longestTaskMs: Math.max(0, ...long.map(e => e.durationMs)),
      frameSample: { actualDurationMs: performance.now() - start, callbacks: ticks.length,
        callbacksPerSecond: ticks.length > 1 ? (ticks.length - 1) * 1000 / (ticks.at(-1) - ticks[0]) : null,
        intervalP50Ms: percentile(0.5), intervalP95Ms: percentile(0.95) },
      serviceWorkerControlled: !!navigator.serviceWorker.controller,
      appPerformance: window.orbitlab.getPerformance(), resources,
    };
  });
}

try {
  for (const profile of [
    { name: 'desktop', viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false },
    { name: 'phone-viewport', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  ]) {
    for (let repetition = 1; repetition <= runs; repetition++) {
      const { name, ...contextOptions } = profile;
      const context = await browser.newContext({ ...contextOptions, locale: 'en-GB', deviceScaleFactor: 1 });
      await context.addInitScript(instrumentation);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      try {
        for (const visit of ['cold', 'warm']) {
          errors.length = 0;
          if (visit === 'cold') await page.goto(`${server.url}#/home`, { waitUntil: 'domcontentloaded', timeout: 120000 });
          else {
            await page.evaluate(() => Promise.race([
              navigator.serviceWorker.ready,
              new Promise((_, reject) => setTimeout(() => reject(new Error('service worker not ready in 120s')), 120000)),
            ]).then(() => true));
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
          }
          const metrics = await sample(page);
          if (visit === 'warm' && !metrics.serviceWorkerControlled) throw new Error('Warm visit is not service-worker controlled');
          result.samples.push({ profile: name, repetition, visit, ...metrics, pageErrors: [...errors] });
          await checkpoint();
          console.log(`${name} ${visit} ${repetition}/${runs}: ready ${metrics.appReadyMs.toFixed(0)} ms, rAF ${metrics.frameSample.callbacksPerSecond?.toFixed(1)}/s, errors ${errors.length}`);
          if (errors.length) throw new Error(`Page errors: ${errors.join('; ')}`);
          if (repetition === 1 && visit === 'cold') await page.screenshot({ path: join(out, `${name}.png`) });
        }
      } finally { await context.close(); }
    }
  }
} catch (error) {
  result.failure = String(error?.stack ?? error);
  await checkpoint();
  throw error;
} finally {
  await browser.close();
  await server.close();
}
await checkpoint();
console.log(`Saved ${result.samples.length} measurements to ${join(out, 'performance.json')}`);
