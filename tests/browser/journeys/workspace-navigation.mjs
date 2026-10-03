/** Lazy My Work shell, keyboard navigation, failure recovery and first-open offline. */
import assert from 'node:assert/strict';
import { keyOn, reloadDocument } from '../harness.mjs';

export const smoke = true;
export const timeoutMs = 240_000;

const CHUNK = /\/assets\/workspace-content-[^/?]+\.js$/;
const chunkLoaded = (page) => page.evaluate(() => performance.getEntriesByType('resource')
  .some((entry) => /\/workspace-content-[^/?]+\.js$/.test(entry.name)));

export default async function workspaceNavigation(t) {
  // Blocking workers here isolates actual page imports from background precaching.
  const app = await t.open({ hash: '#/home', contextOptions: { serviceWorkers: 'block' } });
  const { page } = app;
  assert.equal(await chunkLoaded(page), false, 'workspace JavaScript stays lazy before My Work opens');

  let releaseChunk;
  const gate = new Promise((resolve) => { releaseChunk = resolve; });
  let requested = false;
  await page.route(CHUNK, async (route) => {
    requested = true;
    await gate;
    await route.continue();
  });
  try {
    await keyOn(t, app, page.locator('#btn-work'), 'Enter', 'open My Work');
    assert.ok(await t.until(() => requested), 'opening the dialog requests its lazy chunk');
    assert.match(await page.locator('#work-dialog').innerText(), /Opening your work/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#work-dialog').evaluate((dialog) => dialog.open), false);
  } finally { releaseChunk(); }
  await page.locator('.work-content').waitFor({ state: 'attached' });
  assert.equal(await page.locator('#work-dialog').evaluate((dialog) => dialog.open), false, 'late import completion does not reopen a closed dialog');
  await page.unroute(CHUNK);
  await keyOn(t, app, page.locator('#btn-work'), 'Enter', 'reopen My Work');
  await keyOn(t, app, page.locator('#work-tab-notebook'), 'ArrowRight', 'next workspace tab');
  assert.equal(await page.locator('#work-tab-validation').getAttribute('aria-selected'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'work-tab-validation');
  await page.keyboard.press('End');
  assert.equal(await page.locator('#work-tab-backups').getAttribute('aria-selected'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'work-tab-backups');
  await page.keyboard.press('Home');
  assert.equal(await page.locator('#work-tab-notebook').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('.work-content [role="tabpanel"]:visible').count(), 1);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'btn-work', 'Escape returns focus to the opener');

  // Native dialog Escape must not also navigate the page underneath it.
  await page.evaluate(() => { location.hash = '#/lessons'; });
  await page.locator('.lesson-pack[data-pack="ipst-basic"]').waitFor();
  assert.equal(await page.locator('.lesson-review[data-review="pending"]').count(), 5);
  assert.equal(await page.locator('.lesson-pack-draft').count(), 5);
  await page.locator('#btn-work').click();
  await page.keyboard.press('Escape');
  assert.equal(new URL(page.url()).hash, '#/lessons', 'closing My Work preserves the underlying lesson route');

  await page.locator('#lang-select').selectOption('th');
  await page.locator('#btn-work').click();
  assert.doesNotMatch(await page.locator('#work-dialog').innerText(), /\b(?:work|exp)\.[a-z]/);
  await app.shot('thai-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  const fit = await page.locator('#work-dialog').evaluate((dialog) => ({ width: dialog.clientWidth, scroll: dialog.scrollWidth }));
  assert.ok(fit.scroll <= fit.width + 2, 'Thai mobile workspace has no horizontal overflow');
  await app.shot('thai-mobile');
  for (const lang of ['th', 'ru']) {
    if (lang === 'ru') {
      await page.keyboard.press('Escape');
      await page.locator('#lang-select').selectOption(lang);
      await page.locator('#btn-work').click();
    }
    await page.locator('#work-tab-classroom').click();
    await page.locator('#classroom-preparation:not([data-readiness="checking"])').waitFor();
    const layout = await page.locator('#work-dialog').evaluate((dialog) => ({ width: dialog.clientWidth, scroll: dialog.scrollWidth }));
    assert.ok(layout.scroll <= layout.width + 2, `${lang}: localized classroom controls fit a mobile viewport`);
    assert.doesNotMatch(await page.locator('#classroom-preparation').innerText(), /classroom\.[a-z]/);
  }
  app.checkErrors();
  await app.context.close();

  // A failed native import may be cached by the browser's module map. Recovery
  // must genuinely load the page after networking returns, not loop a failed promise.
  const failed = await t.open({ hash: '#/home', contextOptions: { serviceWorkers: 'block' } });
  let attempts = 0, requests = 0;
  failed.page.on('request', (request) => { if (CHUNK.test(request.url())) requests++; });
  await failed.page.route(CHUNK, async (route) => { attempts++; await route.abort('internetdisconnected'); });
  await failed.page.locator('#btn-work').click();
  await failed.page.getByRole('button', { name: /Try again|Reload page/ }).waitFor();
  assert.match(await failed.page.locator('#work-dialog').innerText(), /could not load/);
  await failed.page.unroute(CHUNK);
  const reload = failed.page.getByRole('button', { name: 'Reload page', exact: true });
  if (await reload.count()) {
    await reloadDocument(failed.page, () => reload.click(), failed.ready);
    await failed.page.locator('#btn-work').click();
  } else {
    await failed.page.getByRole('button', { name: 'Try again', exact: true }).click();
  }
  const recovered = await t.until(() => failed.page.locator('.work-content').isVisible(), { timeoutMs: 10_000 });
  t.log(`lazy recovery: ${attempts} blocked request(s), ${requests} total workspace requests, recovered=${!!recovered}`);
  t.check(recovered, `lazy import recovery remained failed after network restoration (${attempts} failed / ${requests} total workspace request(s)); a same-URL native import may be cached`);
  if (!recovered) await failed.shot('failed-recovery');
  failed.checkErrors();
  await failed.context.close();

  // A new context installs the app without visiting My Work. Its very first
  // workspace import must then succeed with networking disabled.
  const offline = await t.open({ hash: '#/home' });
  await offline.page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 });
  assert.equal(await chunkLoaded(offline.page), false, 'precaching does not eagerly import workspace code into the page');
  const precached = await offline.page.evaluate(async () => {
    const name = (await caches.keys()).find((key) => key.startsWith('orbitlab-precache-'));
    const cache = await caches.open(name);
    return (await cache.keys()).some((request) => /\/workspace-content-[^/?]+\.js$/.test(request.url));
  });
  assert.equal(precached, true, 'the lazy workspace chunk is in the installed cache');
  await offline.context.setOffline(true);
  await offline.page.locator('#btn-work').click();
  await offline.page.locator('.work-content').waitFor({ state: 'visible' });
  assert.equal(await offline.page.locator('.work-content [role="tab"]').count(), 4);
  assert.doesNotMatch(await offline.page.locator('#work-dialog').innerText(), /could not load|work\.[a-z]/);
  offline.checkErrors();
}
