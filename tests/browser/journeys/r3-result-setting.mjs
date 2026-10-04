/**
 * R3.5: a flight's result points at the setting worth looking at, by its typed
 * cause. A Falcon 9 flown with a premature separation armed in the setup ends
 * failed by that separation; its result offers "Show the setting", which at
 * the Engineer level brings back the collapsed setup (read-only, the flight's
 * own configuration) and lands on the failure field — changing nothing.
 */
import { press } from '../harness.mjs';

export const timeoutMs = 300_000;

export default async function r3ResultSetting(t) {
  const app = await t.open({ hash: '#/launch/engineer' });
  const { page } = app;
  const set = await app.mcp('configure_mission', { vehicleId: 'falcon9', siteId: 'cape', orbitId: 'leo', failureMode: 'prematureSep', failureTimeS: 20 });
  if (!t.check(set.ok, `configure_mission: ${JSON.stringify(set).slice(0, 200)}`)) return;
  const launched = await app.mcp('launch_mission', {});
  if (!t.check(launched.ok, `launch_mission: ${JSON.stringify(launched)}`)) return;
  await app.mcp('control_playback', { action: 'warp', warp: 10 });
  const button = page.locator('#mission-result .mission-result-setting');
  const shown = await t.until(() => button.isVisible(), { timeoutMs: 180_000, intervalMs: 1000 });
  const state = await app.mcp('read_flight_state');
  if (!t.check(shown, `no "Show the setting" on the result (status ${state.frame?.status} at T+${state.cursorTimeS?.toFixed(0)} s)`)) return;
  t.check(await button.getAttribute('data-field') === 'setup.failureMode', `the result points at ${await button.getAttribute('data-field')}, not the armed failure`);
  t.check(await page.evaluate(() => document.body.dataset.setup) === 'collapsed', 'the setup was not collapsed in flight');
  const before = await page.locator('#setup [data-field="setup.failureMode"]').evaluate((el) => el.value).catch(() => null);
  await button.scrollIntoViewIfNeeded();
  await press(t, app, button, 'mouse', 'Show the setting');
  const pointed = await t.until(() => page.evaluate(() => {
    const field = document.querySelector('#setup [data-field="setup.failureMode"]');
    const label = field?.closest('label');
    return !!field && document.body.dataset.setup === 'shown' && !!label?.classList.contains('field-pointed')
      && (document.activeElement === field || document.activeElement === label);
  }), { timeoutMs: 5000 });
  t.check(pointed, 'Show the setting did not open the setup on the failure field');
  t.check(await page.locator('#setup [data-field="setup.failureMode"]').isDisabled(), 'the flown configuration became editable');
  const after = await page.locator('#setup [data-field="setup.failureMode"]').evaluate((el) => el.value);
  t.check(before === null || after === before, `showing the setting changed it (${before} → ${after})`);
  t.check(after === 'prematureSep', `the field shows ${after}, not the failure that was flown`);
  await app.shot('result-show-setting');
  app.checkErrors();
  await app.context.close();
}
