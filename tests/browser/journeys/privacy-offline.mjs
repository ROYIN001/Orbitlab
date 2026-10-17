/**
 * The privacy statement (M-LEARNING-047, ED-INST-1): public/privacy.html is
 * not precached (owner, 2026-10-16): About's link loads it from the network
 * like any page — the page itself, not the app (src/pwa/sw-core.ts `routeFor`,
 * route `static`) — and its copy is kept, so with the network cut it still
 * opens, in each language, at that language's section.
 * tests/privacy-inventory.test.ts holds the page's list to the code.
 */
export const smoke = false;
export const timeoutMs = 240_000;

const HEADINGS = { th: 'ความเป็นส่วนตัว', en: 'Privacy', ru: 'Конфиденциальность' };

export default async function privacyOffline(t) {
  const app = await t.open({ lang: 'th' });
  const { page, context } = app;
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 60_000 });
  const cached = await page.evaluate(async () => {
    const pre = (await caches.keys()).find((n) => n.startsWith('orbitlab-precache-'));
    return pre ? (await (await caches.open(pre)).keys()).map((r) => new URL(r.url).pathname) : [];
  });
  t.check(cached.length > 0, 'nothing precached');
  t.check(!cached.some((p) => p.endsWith('/privacy.html')), 'privacy.html is precached, but the owner chose to load it on demand');

  // online: open it once from About, from the network
  const about = async (lang) => {
    await page.locator('#lang-select').selectOption(lang);
    await page.evaluate(() => document.getElementById('btn-about').click());
    const link = page.locator('#about-dialog a[href*="privacy.html"]');
    await link.waitFor({ state: 'attached', timeout: 10_000 });
    const href = await link.getAttribute('href');
    const label = (await link.textContent())?.trim() ?? '';
    await page.keyboard.press('Escape');
    t.check(href?.endsWith(`privacy.html#${lang}`), `${lang}: About links to ${href}`);
    t.check(label.length > 0, `${lang}: the privacy link has no text`);
    return href;
  };
  const online = await context.newPage();
  const first = await online.goto(await about('th'), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  t.check(first?.ok(), `online: privacy.html did not load (${first?.status()})`);
  t.check(await online.locator('section#th h2').count() === 1, 'online: the link opened the app instead of the statement');
  await online.close();

  await context.setOffline(true);
  await page.reload();
  await app.ready();
  for (const lang of ['th', 'en', 'ru']) {
    const href = await about(lang);
    const doc = await context.newPage();
    const response = await doc.goto(href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    t.check(response?.ok(), `${lang}: privacy.html did not open offline from its kept copy (${response?.status()})`);
    t.check(await doc.locator('#loading').count() === 0, `${lang}: the link opened the app instead of the statement`);
    const heading = doc.locator(`section#${lang}[lang="${lang}"] h2`);
    const text = (await heading.textContent()) ?? '';
    t.check(text.startsWith(HEADINGS[lang]), `${lang}: the section heading reads "${text}"`);
    t.check(await heading.isVisible(), `${lang}: the section is not shown`);
    // the legal sentences the owner held back (2026-10-16) stay in the file but are not shown
    t.check(!(await doc.evaluate(() => /PDPA|Safari|GitHub Pages/.test(document.body.innerText))), `${lang}: a held sentence is shown`);
    await doc.close();
  }
  await app.shot('offline-about');
  app.checkErrors();
}
