/** Verify offline claims against a real installed cache, eviction and recovery. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const smoke = true;
export const timeoutMs = 240_000;

export default async function classroomPreparation(t) {
  const app = await t.open({ hash: '#/lessons', viewport: { width: 960, height: 700 } });
  const { page, context } = app;
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 });
  const open = async () => {
    await page.click('#btn-work');
    await page.click('#work-tab-classroom');
    await page.waitForSelector('#classroom-preparation:not([data-readiness="checking"])');
  };
  const check = async () => {
    await page.click('#btn-classroom-check');
    await page.waitForSelector('#classroom-preparation:not([data-readiness="checking"])');
  };
  const prepare = async () => {
    await page.click('#btn-classroom-prepare');
    await page.waitForSelector('#classroom-preparation:not([data-readiness="checking"])');
  };
  const ready = () => page.getAttribute('#classroom-preparation', 'data-readiness');
  await open();
  await page.focus('#classroom-pack');
  await page.selectOption('#classroom-pack', 'ipst-earth-space');
  await page.waitForSelector('#classroom-preparation:not([data-readiness="checking"])');
  t.check(await page.evaluate(() => document.activeElement?.id) === 'classroom-pack', 'pack selection lost keyboard focus');
  await page.focus('#btn-classroom-check');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#classroom-preparation:not([data-readiness="checking"])');
  t.check(await page.evaluate(() => document.activeElement?.id) === 'btn-classroom-check', 'keyboard resource check lost focus');
  await prepare();
  t.check(await ready() === 'ready', 'the installed selected pack was not ready');
  const text = await page.textContent('#classroom-preparation');
  t.check(/Current build:/.test(text) && /2026-/.test(text), 'build and cached dataset dates were not shown');
  t.check(/MiB/.test(text), 'saved resource size was not shown');
  t.check(await page.locator('#classroom-pack option').count() === 6, 'the five curriculum packs and all-packs option were not offered');
  await page.keyboard.press('Escape');
  t.check(await page.locator('#work-dialog').evaluate((dialog) => !dialog.open), 'Escape did not close My Work');
  t.check(new URL(page.url()).hash === '#/lessons', 'Escape closed the underlying lessons page');

  // A fresh page and the chosen pack actually load with the network cut.
  await context.setOffline(true);
  await page.reload();
  await app.ready();
  await page.waitForSelector('.lesson-pack[data-pack="ipst-earth-space"] .lesson-card-item');
  await open();
  await page.selectOption('#classroom-pack', 'ipst-earth-space');
  await page.waitForSelector('#classroom-preparation:not([data-readiness="checking"])');
  t.check(await ready() === 'ready', 'disconnected readiness depended on network availability');
  await page.keyboard.press('Escape');
  const opened = await app.mcp('start_lesson', { id: 'ipst-a-kepler3' });
  t.check(opened.ok, `the selected pack lesson did not open offline: ${JSON.stringify(opened)}`);
  const launched = await app.mcp('launch_mission', {});
  t.check(launched.ok, 'the offline lesson could not launch');
  await app.mcp('control_playback', { action: 'warp', warp: 1000 });
  const flown = await t.until(async () => (await app.mcp('read_flight_state', {})).headTimeS > 10,
    { timeoutMs: 60_000, intervalMs: 1000 });
  t.check(flown, 'the selected lesson physics worker did not run offline');
  await app.mcp('control_playback', { action: 'pause' });
  await open();

  // Simulate a browser evicting an essential worker after a successful check.
  const missing = await page.evaluate(async () => {
    const name = (await caches.keys()).find((n) => n.startsWith('orbitlab-precache-'));
    const cache = await caches.open(name);
    const request = (await cache.keys()).find((r) => /flight\.worker-[^/]+\.js$/.test(r.url));
    await cache.delete(request);
    return new URL(request.url).pathname;
  });
  await check();
  t.check(await ready() === 'incomplete', 'an evicted required worker was falsely reported ready');
  t.check((await page.textContent('#classroom-preparation')).includes(missing.split('/').pop()), 'the missing worker was not identified');
  await prepare();
  t.check(await ready() === 'incomplete', 'failed disconnected repair was falsely reported ready');
  t.check(/could not be downloaded/.test(await page.textContent('#classroom-status')), 'the disconnected repair error was not actionable');
  await context.setOffline(false);
  await page.waitForSelector('#classroom-preparation:not([data-readiness="checking"])');
  await prepare();
  t.check(await ready() === 'ready', 'exact-version repair did not restore readiness');

  // An intact marker and parseable JSON cannot hide bytes from another build.
  await page.evaluate(async () => {
    const name = (await caches.keys()).find((n) => n.startsWith('orbitlab-precache-'));
    const cache = await caches.open(name);
    await cache.put(new URL('./data/space-weather.json', location.href).href,
      new Response('{"asOf":"2099-01-01","data":{}}', { headers: { 'content-type': 'application/json' } }));
  });
  await check();
  t.check(await ready() === 'incomplete', 'wrong-version cached bytes were falsely reported ready');
  t.check(!(await page.textContent('#classroom-preparation')).includes('2099-01-01'), 'an unverified snapshot date was presented as bundled data');
  await prepare();
  t.check(await ready() === 'ready', 'corrupt cached bytes did not repair to the active version');

  // Browser cache access failure is reported without an unhandled page error.
  const worker = context.serviceWorkers()[0];
  await worker.evaluate(() => {
    Object.defineProperty(caches, 'keys', { configurable: true, value: async () => { throw new DOMException('Denied', 'SecurityError'); } });
  });
  try {
    await check();
    t.check(await ready() === 'incomplete', 'denied cache storage was falsely reported ready');
    t.check(/storage permissions/.test(await page.textContent('#classroom-status')), 'cache storage failure was not explained');
  } finally { await worker.evaluate(() => { delete caches.keys; }); }
  await check();
  t.check(await ready() === 'ready', 'readiness did not recover after cache access was restored');

  if (t.server) {
    const original = readFileSync(join(t.distDir, 'sw.js'), 'utf8');
    t.server.override('sw.js', `${original}\n// classroom update ${Date.now()}\n`);
    try {
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        window.__classroomRegistration = registration;
        const ids = new WeakMap();
        let nextId = 0;
        const worker = (value) => {
          if (!value) return null;
          if (!ids.has(value)) ids.set(value, ++nextId);
          return { id: ids.get(value), state: value.state };
        };
        window.__classroomUpdateEvents = [];
        window.__classroomUpdateState = (event) => {
          const state = { event, controller: worker(navigator.serviceWorker.controller),
            active: worker(registration.active), waiting: worker(registration.waiting), installing: worker(registration.installing) };
          if (window.__classroomUpdateEvents.length < 20) window.__classroomUpdateEvents.push(state);
          return state;
        };
        navigator.serviceWorker.addEventListener('controllerchange', () => window.__classroomUpdateState('controllerchange'));
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          window.__classroomUpdateState('updatefound');
          installing?.addEventListener('statechange', () => window.__classroomUpdateState(`worker-${installing.state}`));
        });
        window.__classroomUpdateState('before-update');
      });
      await page.evaluate(() => window.__classroomRegistration.update());
      // Await the resolved state of the live registration. The async
      // waitForFunction predicate used here previously returned too early.
      const installed = await t.until(() => page.evaluate(() => window.__classroomRegistration.waiting?.state === 'installed'
        && !window.__classroomRegistration.installing), { timeoutMs: 60_000, intervalMs: 100 });
      if (!installed) throw new Error('the update did not finish installing as a waiting worker');
      await page.evaluate(() => {
        window.__classroomBeforePrepare = { controller: navigator.serviceWorker.controller,
          waiting: window.__classroomRegistration.waiting };
        window.__classroomUpdateState('before-prepare');
      });
      await prepare();
      t.log('update lifecycle', JSON.stringify(await page.evaluate(() => {
        window.__classroomUpdateState('after-prepare');
        return window.__classroomUpdateEvents;
      })));
      t.check(/update is waiting/.test(await page.textContent('#classroom-preparation')), 'a waiting update was not explained');
      t.check(await page.evaluate(() => window.__classroomRegistration.waiting?.state === 'installed'), 'preparation did not preserve the installed waiting update');
      t.check(await page.evaluate(() => navigator.serviceWorker.controller === window.__classroomBeforePrepare.controller), 'preparation changed the active service worker');
      t.check(await page.evaluate(() => window.__classroomRegistration.waiting === window.__classroomBeforePrepare.waiting), 'preparation replaced the waiting service worker');
    } finally { t.server.override('sw.js', null); }
  }
  await app.shot('verified');
  app.checkErrors();
}
