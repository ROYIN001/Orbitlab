/**
 * M-PLAN-027 (R3.4r, P1 a11y regression on the R3 benches): from the
 * keyboard, Stacked/Apart on the rocket bench and Deployed/Stowed on the
 * satellite bench keep the focus on the button pressed (the redraw dropped it
 * to the page); with "reduce motion" asked for, a readiness row's "Show the
 * part" brings the drawing into view without a smooth scroll.
 */
import { keyOn, press } from '../harness.mjs';

export const timeoutMs = 240_000;

/** The pressed state and the data-k / text of the control that has the keyboard. */
const focused = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return a && a !== document.body ? { k: a.dataset?.k ?? null, text: a.textContent?.trim() ?? '', pressed: a.getAttribute('aria-pressed') } : null;
});

export default async function benchA11y(t) {
  const app = await t.open({ hash: '#/build/engineer', viewport: { width: 1440, height: 900 }, contextOptions: { reducedMotion: 'reduce' } });
  const { page } = app;
  // every scroll the page asks for, with its behaviour
  await page.evaluate(() => {
    const calls = (window.__scrolls = []);
    const own = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (arg) { calls.push(typeof arg === 'object' && arg ? arg.behavior ?? 'auto' : 'auto'); return own.call(this, arg); };
  });

  const parts = page.locator('.be-preview .bs-part');
  if (!t.check(await t.until(async () => (await parts.count()) > 0, { timeoutMs: 30_000 }), 'the rocket bench has no drawing')) return;
  await page.locator('#be-picker-select').selectOption('electron');
  await t.until(async () => (await page.locator('.be-preview .bx-h2').textContent())?.includes('Electron'), { timeoutMs: 10_000 });

  // reduced motion: "Show the part" scrolls the drawing into view at once
  await press(t, app, page.locator('#be-tab-review'), 'mouse', 'review tab');
  const show = page.locator('.bd-say-show[data-target="stage:2"]');
  if (t.check(await t.until(async () => (await show.count()) > 0, { timeoutMs: 90_000, intervalMs: 500 }), 'Electron\'s weak upper stage has no "Show the part"')) {
    await show.first().scrollIntoViewIfNeeded();
    await page.evaluate(() => { window.__scrolls.length = 0; });
    await press(t, app, show.first(), 'mouse', 'Show the part');
    await t.until(async () => (await page.locator('.be-preview .bs-label[data-ref="stage:2"]').getAttribute('aria-pressed')) === 'true', { timeoutMs: 5000 });
    const scrolls = await page.evaluate(() => [...window.__scrolls]);
    t.check(!scrolls.includes('smooth'), `"Show the part" scrolled smoothly though reduced motion is asked for: ${JSON.stringify(scrolls)}`);
  }

  // Stacked/Apart from the keyboard: the focus stays on the button pressed (after the review: keys sent to a
  // lost focus land elsewhere on the page)
  await page.locator('.be-preview').scrollIntoViewIfNeeded();
  const modes = page.locator('.be-preview .be-mode');
  if (await keyOn(t, app, modes.nth(1), 'Enter', 'Apart')) {
    const f = await focused(page);
    t.check(f?.pressed === 'true' && /apart/i.test(f.text), `after Apart the keyboard is not on Apart: ${JSON.stringify(f)}`);
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Space');
    const g = await focused(page);
    t.check(g?.pressed === 'true' && /stack/i.test(g.text), `after Stacked the keyboard is not on Stacked: ${JSON.stringify(g)}`);
  }

  // Deployed/Stowed from the keyboard on the satellite bench
  await page.locator('[data-k="craft:satellite"]:visible').click();
  if (!t.check(await t.until(async () => (await page.locator('.bsb-preview .bsb-svg [data-part="bus"]').count()) > 0, { timeoutMs: 30_000 }), 'the satellite bench has no drawing')) return;
  await press(t, app, page.locator('#bsb-tab-power'), 'mouse', 'Power tab');
  const mount = page.locator('[data-k="sb:mount"]');
  if (await mount.count()) await mount.selectOption('tracking');
  const stow = page.locator('.bsb-pose[data-k$="pose-stowed"]');
  if (t.check(await t.until(async () => (await stow.count()) > 0, { timeoutMs: 5000 }), 'a design with wings has no stowed pose')
    && await keyOn(t, app, stow, 'Enter', 'Stowed')) {
    const f = await focused(page);
    t.check(f?.pressed === 'true' && /pose-stowed$/.test(f.k ?? ''), `after Stowed the keyboard is not on Stowed: ${JSON.stringify(f)}`);
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Space');
    const g = await focused(page);
    t.check(g?.pressed === 'true' && /pose-deployed$/.test(g.k ?? ''), `after Deployed the keyboard is not on Deployed: ${JSON.stringify(g)}`);
  }
  app.checkErrors();
}
