/**
 * EQ-6 step 3 (M-PLATFORM-031): the dictionary loader in a real browser, the
 * checks S09 names for the loader (`plan/S09-eq-identical-output.md:293`):
 *  - the first visit, before the service worker has installed the app, loads
 *    all three dictionaries and paints in the stored language (Thai here);
 *  - once a service worker controls the page, a reload loads only the
 *    language in use, and still paints in it;
 *  - offline, a switch to a language not yet loaded reads its dictionary from
 *    the cache, and the page changes language; then back to English;
 *  - offline, a reload in the chosen language (Russian) paints in Russian;
 *  - no page errors and no "used before it was loaded" console error.
 * The words checked are the topbar's `about.button` and the menu's `nav.setup`.
 */
export const smoke = true;
export const timeoutMs = 240_000;

const WORDS = {
  en: { about: 'About', setup: 'Mission' },
  ru: { about: 'О программе', setup: 'Миссия' },
  th: { about: 'เกี่ยวกับ', setup: 'ภารกิจ' },
};

/** The dictionary chunks this page has fetched since it loaded (from the network or the worker's cache). */
const dictChunks = (page) => page.evaluate(() => performance.getEntriesByType('resource')
  .map((e) => /\/assets\/(ru|th)-[\w-]{8}\.js$/.exec(new URL(e.name).pathname)?.[1]).filter(Boolean).sort());

const painted = (page) => page.evaluate(() => ({
  lang: document.documentElement.lang,
  about: document.querySelector('[data-i18n="about.button"]')?.textContent ?? null,
  setup: document.querySelector('[data-i18n="nav.setup"]')?.textContent ?? null,
}));

export default async function i18nLoader(t) {
  const app = await t.open({ lang: 'th' });
  const { page, context } = app;
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error' && /used before it was loaded/.test(m.text())) consoleErrors.push(m.text()); });
  const expect = async (lang, what) => {
    const got = await t.until(async () => { const p = await painted(page); return p.lang === lang && p.about === WORDS[lang].about && p.setup === WORDS[lang].setup ? p : null; }, { timeoutMs: 15_000 });
    t.check(!!got, `${what}: expected ${lang} (${JSON.stringify(WORDS[lang])}), got ${JSON.stringify(await painted(page))}`);
  };

  // 1. the first visit: no worker controls the page yet, so all three load
  t.check(!(await page.evaluate(() => !!navigator.serviceWorker?.controller)), 'a service worker controlled the first visit');
  await expect('th', 'first visit');
  const first = await dictChunks(page);
  t.log('first visit fetched', JSON.stringify(first));
  t.check(first.join() === 'ru,th', `the first visit fetched ${JSON.stringify(first)}, not both dictionary chunks`);

  // 2. installed: a reload fetches only the language in use
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 60_000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await app.ready();
  await expect('th', 'reload with the worker');
  const warm = await dictChunks(page);
  t.log('installed reload fetched', JSON.stringify(warm));
  t.check(warm.join() === 'th', `the installed reload fetched ${JSON.stringify(warm)}, not the Thai chunk alone`);

  // 3. offline: switch to Russian (not loaded on this page), then to English
  await context.setOffline(true);
  await page.locator('#lang-select').selectOption('ru');
  await expect('ru', 'offline switch to Russian');
  t.check((await dictChunks(page)).join() === 'ru,th', 'the Russian chunk was not read on the switch');
  await page.locator('#lang-select').selectOption('en');
  await expect('en', 'offline switch to English');
  await page.locator('#lang-select').selectOption('ru');
  await expect('ru', 'offline switch back to Russian');
  await app.shot('offline-ru');

  // 4. offline reload in the chosen language
  await page.reload({ waitUntil: 'domcontentloaded' });
  await app.ready();
  await expect('ru', 'offline reload');
  const offline = await dictChunks(page);
  t.check(offline.join() === 'ru', `the offline reload fetched ${JSON.stringify(offline)}, not the Russian chunk alone`);
  t.check(await page.locator('#lang-select').inputValue() === 'ru', 'the language menu does not show Russian after the offline reload');
  await context.setOffline(false);

  t.check(consoleErrors.length === 0, `console: ${consoleErrors.join(' | ')}`);
  app.checkErrors();
}
