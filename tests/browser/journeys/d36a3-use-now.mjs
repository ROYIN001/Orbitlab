/**
 * D-36.A3 (owner, 2026-10-05), CO-4: in a six-DOF Engineer flight, a new
 * control-system failure composed in ⚙ Setup changes nothing until "Use now";
 * then the flight takes it, its recording is kept, and the values past their
 * window (the vehicle) stay locked.
 */
import { press } from '../harness.mjs';

export const timeoutMs = 240_000;

const RESPOND_MS = 20_000;

export default async function useNow(t) {
  const app = await t.open({ hash: '#/launch/engineer' });
  const { page } = app;
  const state = () => app.mcp('read_flight_state');
  const faultEvents = async () => (await app.mcp('get_events', {})).events.filter((e) => e.key === 'evt.controlFault');
  await page.locator('#setup .launch-button').waitFor();
  await app.mcp('configure_mission', { physicsModel: 'sixDof' });
  if (!await press(t, app, page.locator('#setup .launch-button'), 'mouse', 'Launch')) return;
  await app.mcp('control_playback', { action: 'warp', warp: 5 });
  const flying = await t.until(async () => (await state()).cursorTimeS > 30, { timeoutMs: 120_000, intervalMs: 500 });
  if (!t.check(flying, 'the six-DOF flight did not fly to T+30 s')) return;
  await app.mcp('control_playback', { action: 'pause' });
  // the worker delivers the frames it had in flight for a second or two after
  // the pause: wait until the cursor and the head hold still across two reads
  let last = null;
  const settled = await t.until(async () => {
    const s = await state();
    const same = last && s.cursorTimeS === last.cursorTimeS && s.headTimeS === last.headTimeS;
    last = s;
    return same ? s : null;
  }, { timeoutMs: RESPOND_MS, intervalMs: 1000 });
  if (!t.check(settled, `the paused flight did not settle (cursor T+${last?.cursorTimeS} s, head T+${last?.headTimeS} s)`)) return;
  const before = await state();
  t.log(`paused at T+${before.cursorTimeS.toFixed(1)} s, recorded to T+${before.headTimeS.toFixed(1)} s`);

  // ⚙ Setup, the failures section, a new failure drafted for this flight
  if (!await press(t, app, page.locator('#btn-setup'), 'mouse', '⚙ Setup')) return;
  if (!t.check(await t.until(() => page.locator('#setup').isVisible(), { timeoutMs: 5000 }), '⚙ Setup did not show the setup')) return;
  const faults = page.locator('#setup details[data-section="faults"]');
  if (!await faults.evaluate((d) => d.open)) {
    await faults.locator('summary').scrollIntoViewIfNeeded();
    if (!await press(t, app, faults.locator('summary'), 'mouse', 'failures section')) return;
  }
  const draftAdd = faults.locator('.fault-draft button', { hasText: 'Add a failure' });
  if (!t.check(await t.until(() => draftAdd.isEnabled(), { timeoutMs: RESPOND_MS }), 'no new failure offered in the live six-DOF flight')) return;
  await draftAdd.scrollIntoViewIfNeeded();
  if (!await press(t, app, draftAdd, 'mouse', 'Add a failure (draft)')) return;
  const useNowBtn = faults.getByRole('button', { name: 'Use now' });
  if (!t.check(await t.until(() => useNowBtn.isVisible(), { timeoutMs: 5000 }), '"Use now" is not offered for the draft')) return;
  await page.waitForTimeout(1000);
  await app.shot('d36a3-draft-before-use-now');

  // nothing has reached the flight yet
  const drafted = await state();
  t.check((await faultEvents()).length === 0, 'a failure struck before "Use now" was pressed');
  t.check(drafted.headTimeS === before.headTimeS && drafted.startTimeS === before.startTimeS && drafted.cursorTimeS === before.cursorTimeS,
    `the flight changed before "Use now": T${before.startTimeS}…T+${before.headTimeS} s → T${drafted.startTimeS}…T+${drafted.headTimeS} s`);
  t.check(await page.locator('#setup select[data-field="setup.vehicle"]').isDisabled(), 'the vehicle is editable in flight');

  await useNowBtn.scrollIntoViewIfNeeded();
  if (!await press(t, app, useNowBtn, 'mouse', 'Use now')) return;
  await app.mcp('control_playback', { action: 'play' });
  const struck = await t.until(async () => ((await faultEvents()).length ? true : null), { timeoutMs: 60_000, intervalMs: 500 });
  t.check(struck, 'the failure did not strike after "Use now"');
  await app.mcp('control_playback', { action: 'pause' });
  await app.shot('d36a3-after-use-now');

  const after = await state();
  t.check(after.hasMission && after.startTimeS === before.startTimeS && after.headTimeS >= before.headTimeS,
    `the recording was not kept: T${before.startTimeS}…T+${before.headTimeS} s → T${after.startTimeS}…T+${after.headTimeS} s`);
  t.check(await page.locator('#setup select[data-field="setup.vehicle"]').isDisabled(), 'the vehicle became editable in flight');
  // the failure is in the setup's list, flown from the pad next launch
  t.check(await faults.locator('.fault-row').count() >= 1, 'the failure used now is not in the setup for the next launch');
  t.check(await page.evaluate(() => document.querySelector('#setup')?.dataset.running) === 'true', 'the setup is not the flown one any more');
  app.checkErrors();
  await app.context.close();
}
