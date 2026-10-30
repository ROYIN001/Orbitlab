/**
 * M-LAUNCH-008: the phone flight bar's play/pause button always carries the
 * name of what it does now, in the language in force — first paint included,
 * and again whenever the language changes (the label used to be written only
 * when the glyph changed).
 */
import { press } from '../harness.mjs';

export const timeoutMs = 120_000;

const NAMES = { en: ['Play', 'Pause'], th: ['เล่น', 'หยุดชั่วคราว'], ru: ['Воспроизведение', 'Пауза'] };

export default async function r2PhoneBarName(t) {
  const app = await t.open({ hash: '#/launch/engineer', viewport: 'mobile', touch: true });
  const { page } = app;
  await page.locator('#setup .launch-button').waitFor();
  await app.mcp('launch_mission', {});
  t.check(await t.until(() => page.evaluate(() => document.body.dataset.setup === 'collapsed'), { timeoutMs: 20_000 }), 'the setup did not collapse');
  await press(t, app, page.locator('#btn-play'), 'touch', 'pause from the top controls'); // paused
  await page.locator('#telemetry').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  t.check(await t.until(() => page.locator('#mobile-flight-bar').isVisible(), { timeoutMs: 5000 }), 'no compact flight bar');
  const name = () => page.evaluate(() => { const b = document.getElementById('mfb-play'); return [b.getAttribute('aria-label'), b.title]; });
  const named = async (want, what) => t.check(await t.until(async () => { const [a, ti] = await name(); return a === want && ti === want; }, { timeoutMs: 3000 }),
    `${what}: the phone bar's button is "${JSON.stringify(await name())}", not "${want}"`);
  // a button as index.html ships it (never synced) and paused: the next frames name it
  await page.evaluate(() => { const b = document.getElementById('mfb-play'); b.removeAttribute('aria-label'); b.removeAttribute('title'); b.textContent = '▶'; });
  await named(NAMES.en[0], 'paused, as shipped');
  for (const lang of ['th', 'ru', 'en']) {
    await page.selectOption('#lang-select', lang);
    await named(NAMES[lang][0], `paused, language ${lang}`);
  }
  await press(t, app, page.locator('#mfb-play'), 'touch', 'phone bar play'); // running
  await named(NAMES.en[1], 'running, en');
  for (const lang of ['th', 'ru', 'en']) {
    await page.selectOption('#lang-select', lang);
    await named(NAMES[lang][1], `running, language ${lang}`);
  }
  app.checkErrors();
  await app.context.close();
}
