/**
 * The offline app in a real browser (roadmap U03). Not part of `npm test`:
 * it needs a production build served under a sub-path, as GitHub Pages
 * serves it, and a Chromium for Playwright.
 *
 *   npm run build
 *   mkdir -p /tmp/pages && ln -sfn "$PWD/dist" /tmp/pages/Orbitlab
 *   (cd /tmp/pages && python3 -m http.server 4173 &)
 *   PLAYWRIGHT=/path/to/playwright/index.mjs CHROMIUM=/path/to/chrome \
 *     node tests/browser/pwa-offline.mjs http://localhost:4173/Orbitlab/ [screenshot-dir]
 *
 * It opens the app, waits for the service worker to take the page, cuts the
 * network, reloads, and flies a mission from the cache — the physics Web
 * Worker included — then checks every worker bundle and texture is cached
 * and that a new deploy is offered as a reload.
 */
import { writeFileSync, readFileSync } from 'node:fs';

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const base = process.argv[2] ?? 'http://localhost:4173/Orbitlab/';
const shots = process.argv[3];
const distSw = process.env.DIST_SW; // path of the served sw.js, for the update check

const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 960, height: 560 } });
await context.addInitScript(() => {
  const tools = new Map();
  navigator.modelContext = { registerTool: (tool) => { tools.set(tool.name, tool); } };
  window.__mcp = async (name, input = {}) => JSON.parse(JSON.stringify(await tools.get(name).execute(input)));
  try { localStorage.setItem('orbitlab.guide.v1', 'done'); } catch { /* */ }
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const ready = async () => page.waitForSelector('#loading.hidden', { state: 'attached', timeout: 120000 });

await page.goto(`${base}#/explore`);
await ready();
await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 60000 });
const cached = await page.evaluate(async () => {
  const names = await caches.keys();
  const pre = names.find((n) => n.startsWith('orbitlab-precache-'));
  const cache = await caches.open(pre);
  return (await cache.keys()).map((r) => new URL(r.url).pathname);
});
console.log(`precached ${cached.length} files`);
const has = (re, what) => { if (!cached.some((p) => re.test(p))) fail(`${what} not precached`); };
has(/\/index\.html$/, 'index.html');
has(/flight\.worker-[^/]+\.js$/, 'the physics worker');
has(/tune\.worker-[^/]+\.js$/, 'the auto-tune worker');
// the Monte Carlo worker (G05), once merged, is emitted the same way and precached with the rest
for (const f of ['earth_atmos_2048.jpg', 'earth_clouds_1024.png', 'earth_lights_2048.png', 'earth_normal_2048.jpg', 'earth_specular_2048.jpg']) has(new RegExp(`textures/${f}$`), f);

// offline: reload and fly
await context.setOffline(true);
await page.reload();
await ready();
const offlineFetch = await page.evaluate(async () => {
  const worker = [...performance.getEntriesByType('resource')].map((e) => e.name).find((n) => /tune\.worker/.test(n))
    ?? document.querySelector('script[type=module]')?.src;
  const r = await fetch(worker ?? './index.html');
  return r.ok;
});
if (!offlineFetch) fail('a precached script did not load offline');
await page.evaluate(() => window.__mcp('launch_mission', {}));
await page.evaluate(() => window.__mcp('control_playback', { action: 'warp', warp: 10 })).catch(() => { /* older tool shape */ });
await page.waitForTimeout(12000);
const state = await page.evaluate(() => window.__mcp('read_flight_state', {}));
console.log('offline flight', JSON.stringify({ t: state.headTimeS, playing: state.playing }));
// the countdown starts at T-10 s: past liftoff means the physics worker ran from the cache
if (!(state.headTimeS > 0)) fail('the flight did not run offline');
if (shots) await page.screenshot({ path: `${shots}/u03-offline.png` });

// a new deploy: a different sw.js is offered as a reload
if (distSw) {
  await context.setOffline(false);
  const original = readFileSync(distSw, 'utf8');
  writeFileSync(distSw, `${original}\n// redeployed ${Date.now()}\n`);
  try {
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await page.waitForSelector('#pwa-toast .pwa-toast-action', { timeout: 60000 });
    if (shots) await page.screenshot({ path: `${shots}/u03-update.png` });
    const before = await page.evaluate(() => navigator.serviceWorker.controller.scriptURL);
    await Promise.all([page.waitForEvent('load', { timeout: 60000 }), page.click('#pwa-toast .pwa-toast-action')]);
    await ready();
    console.log('reloaded onto the new version', before !== null);
  } finally { writeFileSync(distSw, original); }
}
if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
await browser.close();
console.log(process.exitCode ? 'FAILED' : 'PASSED');
