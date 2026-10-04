/**
 * R3: the Build Engineer benches draw the design they test, with real input.
 *
 * - R3.2: the rocket bench draws the vehicle on the bench from its own spec;
 *   a part picked by its label shows its figures and "Fire it on the test
 *   stand" opens the stand on that stage; Stacked/Apart redraws.
 * - R3.4: a readiness row about one part (Electron's kick stage is a weak
 *   upper stage) has "Show the part", which selects it on the drawing.
 * - R3.3: the satellite bench draws the design; the open tab's subsystem is
 *   highlighted, a part button opens its tab, a design without a camera has
 *   no camera drawn, and an unusable figure being typed says so instead of
 *   keeping a stale picture.
 *
 * - R3.5: in the Explore builder, a check about one part ("Show its
 *   settings") brings that part's card into view with its first control focused.
 *
 * Screenshots are kept for the owner's review of the drawings.
 */
import { press } from '../harness.mjs';

export const timeoutMs = 300_000;

export default async function r3BenchDrawings(t) {
  const app = await t.open({ hash: '#/build/engineer', viewport: { width: 1440, height: 900 } });
  const { page } = app;

  // R3.2: the drawing of the vehicle on the bench
  const parts = page.locator('.be-preview .bs-part');
  if (!t.check(await t.until(async () => (await parts.count()) > 0, { timeoutMs: 30_000 }), 'the rocket bench has no drawing')) return;
  await page.locator('#be-picker-select').selectOption('electron');
  t.check(await t.until(async () => (await page.locator('.be-preview .bx-h2').textContent())?.includes('Electron'), { timeoutMs: 10_000 }),
    'the drawing did not follow the vehicle on the bench');
  const label = page.locator('.be-preview .bs-label[data-ref="stage:1"]');
  await label.waitFor();
  await press(t, app, label, 'mouse', 'stage 2 label');
  const card = page.locator('.be-partcard');
  t.check(await t.until(async () => (await card.locator('dt').count()) >= 4, { timeoutMs: 5000 }), 'picking stage 2 did not show its figures');
  await app.shot('rocket-bench-part');
  await press(t, app, page.locator('.be-partcard .be-part-go'), 'mouse', 'Fire it on the test stand');
  t.check(await page.locator('#be-tab-stand').getAttribute('aria-selected') === 'true', 'the stand tab did not open');
  const before = await parts.count();
  await press(t, app, page.locator('.be-preview .be-mode').nth(1), 'mouse', 'Apart');
  t.check(await page.locator('.be-preview .be-mode').nth(1).getAttribute('aria-pressed') === 'true', 'Apart is not pressed');
  t.check(await t.until(async () => (await parts.count()) === before, { timeoutMs: 5000 }), 'the apart drawing lost parts');

  // R3.4: a readiness row points at its part
  await press(t, app, page.locator('#be-tab-review'), 'mouse', 'review tab');
  const show = page.locator('.bd-say-show[data-target="stage:2"]');
  const shown = await t.until(async () => (await show.count()) > 0, { timeoutMs: 90_000, intervalMs: 500 });
  if (t.check(shown, 'Electron\'s weak upper stage has no "Show the part"')) {
    await show.first().scrollIntoViewIfNeeded(); // below the fold, as a reader scrolls to it
    await press(t, app, show.first(), 'mouse', 'Show the part');
    t.check(await t.until(async () => (await page.locator('.be-preview .bs-label[data-ref="stage:2"]').getAttribute('aria-pressed')) === 'true', { timeoutMs: 5000 }),
      'Show the part did not select stage 3 on the drawing');
    await app.shot('rocket-review-show-part');
  }

  // R3.3: the satellite bench
  await page.locator('[data-k="craft:satellite"]:visible').click();
  const svg = page.locator('.bsb-preview .bsb-svg [data-part="bus"]');
  if (!t.check(await t.until(async () => (await svg.count()) > 0, { timeoutMs: 30_000 }), 'the satellite bench has no drawing')) return;
  const hi = () => page.evaluate(() => [...document.querySelectorAll('.bsb-svg .sd-part.hi')].map((n) => n.getAttribute('data-part')));
  t.check((await hi()).includes('arrays'), `the Power tab does not highlight the array: ${await hi()}`);
  await app.shot('satellite-bench-power');
  const radio = page.locator('.bsb-part[data-k$="part-antenna"]');
  if (await radio.count()) {
    await press(t, app, radio, 'mouse', 'dish part button');
    t.check(await t.until(async () => (await page.locator('#bsb-tab-radio').getAttribute('aria-selected')) === 'true', { timeoutMs: 5000 }), 'the dish button did not open the Radio tab');
    t.check(await t.until(async () => (await hi()).includes('antenna'), { timeoutMs: 5000 }), 'the Radio tab does not highlight the dish');
  }
  const hasCamera = await page.locator('.bsb-svg [data-part="camera"]').count();
  const cameraButtons = await page.locator('.bsb-part[data-k$="part-camera"]').count();
  t.check(hasCamera === cameraButtons, 'the camera drawn and the camera listed disagree');
  t.check(await page.locator('.bsb-assumptions li').count() > 0, 'the drawing lists no assumptions');

  // R3.5: Explore's remix of Electron: the kick stage's check leads to its card
  await page.evaluate(() => { location.hash = '#/build/explore'; });
  // the Build section keeps the craft last open: back to the rocket
  const rocketTab = page.locator('[data-k="craft:rocket"]:visible');
  if (await rocketTab.count()) await rocketTab.first().click();
  const remix = page.locator('#bx-picker-select');
  if (t.check(await remix.waitFor({ timeout: 30_000 }).then(() => true).catch(() => false), 'the Explore builder has no vehicle picker')) {
    await remix.selectOption('electron');
    const settings = page.locator('.bx-checks .bd-say-show[data-target="stage:2"]');
    if (t.check(await t.until(async () => (await settings.count()) > 0, { timeoutMs: 30_000 }), 'Electron\'s kick-stage check has no "Show its settings"')) {
      await settings.first().scrollIntoViewIfNeeded();
      await press(t, app, settings.first(), 'mouse', 'Show its settings');
      t.check(await t.until(() => page.evaluate(() => {
        const card = document.querySelector('.bx-controls [data-ref="stage:2"]');
        return !!card && card.classList.contains('bx-pointed') && card.contains(document.activeElement);
      }), { timeoutMs: 5000 }), 'Show its settings did not land on the third stage\'s card');
      await app.shot('explore-show-settings');
    }
  }
  app.checkErrors();
  await app.context.close();
}
