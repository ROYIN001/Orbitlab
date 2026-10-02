/** Optional instructor pages load on demand, survive navigation, and open offline. */
export const smoke = true;
export const timeoutMs = 240_000;

const authorChunk = /\/author-view-[^/]+\.js(?:\?.*)?$/;
const checkChunk = /\/check-view-[^/]+\.js(?:\?.*)?$/;

async function navigate(page, view) {
  await page.evaluate((hash) => { location.hash = hash; }, `#/lessons${view ? `/${view}` : ''}`);
  await page.waitForSelector(`body[data-lessons-page="${view || 'catalog'}"]`);
}

export default async function instructorLoading(t) {
  // Blocking the worker lets this context delay and fail real module requests.
  const app = await t.open({ hash: '#/lessons', contextOptions: { serviceWorkers: 'block' } });
  const { page } = app;
  const requested = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name));
  t.check(!requested.some((url) => authorChunk.test(url) || checkChunk.test(url)), 'instructor code stays out of the initial page load');

  let release;
  const held = new Promise((resolve) => { release = resolve; });
  let requestedAuthor = false;
  await page.route(authorChunk, async (request) => {
    requestedAuthor = true;
    await held;
    await request.continue();
  });
  try {
    await navigate(page, 'author');
    t.check(await t.until(() => requestedAuthor), 'opening the author tab requests its module');
    t.check(await page.locator('.lessons-page-body[aria-busy="true"] [role="status"]').count() === 1, 'pending page announces loading');
    await page.selectOption('#lang-select', 'ru');
    t.check(/Загруз/.test(await page.locator('.lessons-page-body [role="status"]').textContent()), 'loading feedback follows a language change');
    await navigate(page, '');
    const response = page.waitForResponse((r) => authorChunk.test(r.url()));
    release();
    const loaded = await response;
    // Wait for evaluation, not just response headers: the stale completion is
    // the behavior under test, and must have had a chance to paint the page.
    await page.evaluate((url) => import(url).then(() => undefined), loaded.url());
    await page.waitForFunction(() => !document.querySelector('.lessons-page-body[aria-busy]'));
    t.check(await page.locator('.author').count() === 0, 'a completed import cannot replace the catalogue after leaving the tab');
  } finally {
    release();
    await page.unroute(authorChunk);
  }

  await navigate(page, 'author');
  await page.waitForSelector('.author');
  t.check(/[А-Яа-я]/.test(await page.locator('.author h2').textContent()), 'reopening renders in the current language');
  const title = page.locator('.author-text input').first();
  await title.fill('Deferred page draft');
  await page.selectOption('#lang-select', 'th');
  t.check(/[\u0e00-\u0e7f]/.test(await page.locator('.author h2').textContent()), 'loaded author page follows language changes');
  t.check(await title.inputValue() === 'Deferred page draft', 'language changes preserve the author draft');
  await navigate(page, '');
  await navigate(page, 'author');
  await page.waitForSelector('.author');
  t.check(await title.inputValue() === 'Deferred page draft', 'revisiting preserves the author draft');

  // A failed first fetch has visible recovery and leaves navigation usable.
  await page.route(checkChunk, (request) => request.abort());
  await navigate(page, 'check');
  await page.waitForSelector('.lessons-page-body [role="alert"]');
  t.check(await page.locator('.lessons-page-body[aria-busy]').count() === 0, 'a failed load clears the busy state');
  t.check(await page.locator('.lessons-page-body > button').count() === 1, 'a failed load offers a reload');
  await navigate(page, '');
  t.check(await page.locator('.lessons-page-body [role="alert"]').count() === 0, 'leaving a failed page restores normal navigation');
  app.checkErrors();
  await app.context.close();

  // Neither instructor page has been opened in this context when connectivity
  // is lost: the service worker must already hold both dynamic modules.
  const offline = await t.open({ hash: '#/lessons', viewport: 'mobile' });
  await offline.page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 60_000 });
  const cached = await offline.page.evaluate(async () => {
    const name = (await caches.keys()).find((key) => key.startsWith('orbitlab-precache-'));
    return (await (await caches.open(name)).keys()).map((request) => request.url);
  });
  t.check(cached.some((url) => authorChunk.test(url)), 'the author module is precached');
  t.check(cached.some((url) => checkChunk.test(url)), 'the check module is precached');
  await offline.context.setOffline(true);
  await navigate(offline.page, 'author');
  await offline.page.waitForSelector('.author');
  await navigate(offline.page, 'check');
  await offline.page.waitForSelector('.recheck');
  t.check(await offline.page.locator('.recheck input[type="file"]').count() === 2, 'offline checking still accepts result and lesson files');
  await offline.page.reload();
  await offline.ready();
  await offline.page.waitForSelector('.recheck');
  offline.checkErrors();
}
