/**
 * The privacy statement offline (M-LEARNING-047, ED-INST-1): public/privacy.html
 * is precached with the app; with the network cut, About's link opens it in
 * each language — the page itself, not the app (src/pwa/sw-core.ts `routeFor`) —
 * at that language's section. tests/privacy-inventory.test.ts holds the page's
 * list to the code.
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
  t.check(cached.some((p) => p.endsWith('/privacy.html')), 'privacy.html is not precached');

  await context.setOffline(true);
  await page.reload();
  await app.ready();
  for (const lang of ['th', 'en', 'ru']) {
    await page.locator('#lang-select').selectOption(lang);
    await page.evaluate(() => document.getElementById('btn-about').click());
    const link = page.locator('#about-dialog a[href*="privacy.html"]');
    await link.waitFor({ state: 'attached', timeout: 10_000 });
    const href = await link.getAttribute('href');
    const label = (await link.textContent())?.trim() ?? '';
    t.check(href?.endsWith(`privacy.html#${lang}`), `${lang}: About links to ${href}`);
    t.check(label.length > 0, `${lang}: the privacy link has no text`);
    await page.keyboard.press('Escape');

    const doc = await context.newPage();
    const response = await doc.goto(href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    t.check(response?.ok(), `${lang}: privacy.html did not load offline (${response?.status()})`);
    t.check(await doc.locator('#loading').count() === 0, `${lang}: the link opened the app instead of the statement`);
    const heading = doc.locator(`section#${lang}[lang="${lang}"] h2`);
    const text = (await heading.textContent()) ?? '';
    t.check(text.startsWith(HEADINGS[lang]), `${lang}: the section heading reads "${text}"`);
    t.check(await heading.isVisible(), `${lang}: the section is not shown`);
    await doc.close();
  }
  await app.shot('offline-about');
  app.checkErrors();
}
