/**
 * LUI-01 (M-LAUNCH-027, CO-4 step 1): "Use for the next launch" in the loop
 * inspector of a paused Engineer flight keeps the flight, its recording and
 * the HUD; the tuning is held in the setup and flown from the next launch.
 */
import { press } from '../harness.mjs';

export const timeoutMs = 240_000;

const RESPOND_MS = 20_000;

/**
 * LUI-01 (M-LAUNCH-027): a tuning written into the setup from the loop
 * inspector while the flight is paused is held for the next launch. It used to
 * rebuild the pad preview, throwing the paused flight and its recording away.
 */
export default async function heldTuning(t) {
  const app = await t.open({ hash: '#/launch/engineer' });
  const { page } = app;
  const state = () => app.mcp('read_flight_state');
  await page.locator('#setup .launch-button').waitFor();
  await app.mcp('configure_mission', { physicsModel: 'sixDof' });
  if (!await press(t, app, page.locator('#setup .launch-button'), 'mouse', 'Launch')) return;
  await app.mcp('control_playback', { action: 'warp', warp: 5 });
  const flying = await t.until(async () => (await state()).cursorTimeS > 30, { timeoutMs: 120_000, intervalMs: 500 });
  if (!t.check(flying, 'the six-DOF flight did not fly to T+30 s')) return;
  await app.mcp('control_playback', { action: 'pause' });
  await page.waitForTimeout(500);
  const before = await state();
  const hudBefore = await page.evaluate(() => document.getElementById('hud')?.textContent ?? '');
  t.log(`paused at T+${before.cursorTimeS.toFixed(1)} s, recorded to T+${before.headTimeS.toFixed(1)} s`);

  // the 6-DOF flight controls start folded: open them as a person would
  const controls = page.locator('#rigid-controls details');
  if (!t.check(await t.until(() => controls.isVisible(), { timeoutMs: RESPOND_MS }), 'no 6-DOF flight controls in the six-DOF flight')) return;
  if (!await controls.evaluate((d) => d.open)) {
    await controls.locator('summary').scrollIntoViewIfNeeded();
    if (!await press(t, app, controls.locator('summary'), 'mouse', '6-DOF flight controls')) return;
  }
  const inspect = page.locator('#rigid-controls .rigid-inspect');
  if (!t.check(await t.until(() => inspect.isVisible(), { timeoutMs: RESPOND_MS }), 'no loop inspector button in the six-DOF flight')) return;
  await inspect.scrollIntoViewIfNeeded();
  if (!await press(t, app, inspect, 'mouse', 'loop inspector')) return;
  if (!await press(t, app, page.locator('.li-tab[data-tab="tuning"]'), 'mouse', 'Tuning tab')) return;
  const apply = page.getByRole('button', { name: 'Use for the next launch' });
  if (!t.check(await t.until(() => apply.isEnabled(), { timeoutMs: 5000 }), '"Use for the next launch" is not offered')) return;
  await apply.click();
  t.check(await t.until(() => page.getByText('Set in the mission setup: flown from the next launch.').isVisible(), { timeoutMs: 5000 }),
    'the tuning was not reported as set for the next launch');
  await page.waitForTimeout(1000);
  await app.shot('lui01-after-use-for-next-launch');

  const after = await state();
  const hudAfter = await page.evaluate(() => document.getElementById('hud')?.textContent ?? '');
  t.check(await page.evaluate(() => document.body.dataset.flightStage) === 'flight', 'the paused flight left the flight stage');
  t.check(after.hasMission && after.mode === 'live' && !after.playing, `the flight is not the paused live flight any more (${after.mode}, playing ${after.playing})`);
  t.check(after.cursorTimeS === before.cursorTimeS, `the flight's clock moved: T+${before.cursorTimeS} s → T+${after.cursorTimeS} s`);
  t.check(after.headTimeS === before.headTimeS && after.startTimeS === before.startTimeS,
    `the recording changed: T${before.startTimeS}…T+${before.headTimeS} s → T${after.startTimeS}…T+${after.headTimeS} s`);
  t.check(hudAfter === hudBefore, 'the HUD changed under the paused flight');
  // the setup holds the tuning: it is flown from the next launch
  const held = await page.evaluate(() => document.querySelector('#setup')?.dataset.running);
  t.check(held === 'true', `the setup is not the flown one any more (running ${held})`);
  app.checkErrors();
  await app.context.close();
}
