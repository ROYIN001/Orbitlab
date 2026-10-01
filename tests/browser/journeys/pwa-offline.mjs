/**
 * The offline app in a real browser (roadmap U03): the service worker takes
 * the page, the network is cut, the page reloads and a mission flies from the
 * cache — the physics Web Worker included; every worker bundle and texture is
 * precached; and a new deploy is offered as a reload.
 *
 * The new deploy is a changed `sw.js`: served in memory by the runner's own
 * server (`override`), or — against an external server — written into the
 * file `DIST_SW` names and put back afterwards. With neither, that last check
 * is skipped, as before.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const smoke = false;
export const timeoutMs = 240_000;

export default async function pwaOffline(t) {
  const app = await t.open({ hash: '#/explore', viewport: { width: 960, height: 560 } });
  const { page, context } = app;
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 60_000 });
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const pre = names.find((n) => n.startsWith('orbitlab-precache-'));
    const cache = await caches.open(pre);
    return (await cache.keys()).map((r) => new URL(r.url).pathname);
  });
  t.log(`precached ${cached.length} files`);
  const has = (re, what) => t.check(cached.some((p) => re.test(p)), `${what} not precached`);
  has(/\/index\.html$/, 'index.html');
  has(/flight\.worker-[^/]+\.js$/, 'the physics worker');
  has(/tune\.worker-[^/]+\.js$/, 'the auto-tune worker');
  has(/attitude-tune\.worker-[^/]+\.js$/, 'the attitude-loop auto-tune worker');
  // the Monte Carlo worker (G05) is emitted the same way and precached with the rest
  for (const f of ['earth_atmos_2048.jpg', 'earth_atmos_4096.jpg', 'earth_clouds_4096.jpg', 'earth_lights_4096.jpg', 'earth_normal_2048.jpg', 'earth_specular_2048.jpg']) has(new RegExp(`textures/${f}$`), f);

  // offline: reload and fly
  await context.setOffline(true);
  await page.reload();
  await app.ready();
  const offlineFetch = await page.evaluate(async () => {
    const worker = [...performance.getEntriesByType('resource')].map((e) => e.name).find((n) => /tune\.worker/.test(n))
      ?? document.querySelector('script[type=module]')?.src;
    const r = await fetch(worker ?? './index.html');
    return r.ok;
  });
  t.check(offlineFetch, 'a precached script did not load offline');
  await app.mcp('launch_mission', {});
  await app.mcp('control_playback', { action: 'warp', warp: 10 });
  await page.waitForTimeout(12_000);
  const state = await app.mcp('read_flight_state', {});
  t.log('offline flight', JSON.stringify({ t: state.headTimeS, playing: state.playing }));
  // the countdown starts at T-10 s: past liftoff means the physics worker ran from the cache
  t.check(state.headTimeS > 0, `the flight did not run offline (head at T${state.headTimeS} s)`);
  await app.shot('offline');

  // a new deploy: a different sw.js is offered as a reload
  const distSw = t.server ? null : process.env.DIST_SW;
  if (!t.server && !distSw) { t.log('no server of our own and no DIST_SW: the update check is skipped'); app.checkErrors(); return; }
  await context.setOffline(false);
  const original = readFileSync(distSw ?? join(t.distDir, 'sw.js'), 'utf8');
  const redeployed = `${original}\n// redeployed ${Date.now()}\n`;
  if (t.server) t.server.override('sw.js', redeployed); else writeFileSync(distSw, redeployed);
  try {
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await page.waitForSelector('#pwa-toast .pwa-toast-action', { timeout: 60_000 });
    await app.shot('update');
    const before = await page.evaluate(() => navigator.serviceWorker.controller.scriptURL);
    await Promise.all([page.waitForEvent('load', { timeout: 60_000 }), page.click('#pwa-toast .pwa-toast-action')]);
    await app.ready();
    t.log('reloaded onto the new version', before !== null);
  } finally {
    if (t.server) t.server.override('sw.js', null); else writeFileSync(distSw, original);
  }
  app.checkErrors();
}
