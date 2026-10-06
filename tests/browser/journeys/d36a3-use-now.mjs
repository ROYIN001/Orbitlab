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
  // The worker still answers the time it was asked for before the pause (up to
  // two `advance` requests, src/session/session.ts MAX_OUTSTANDING), and each
  // answer moves the live instant — the cursor — even when it stores no new
  // frame. On a busy machine the worker can be starved for more than a second
  // between those answers, so two equal reads are not enough: also wait until
  // the session has no request outstanding.
  const outstanding = () => page.evaluate(() => {
    const pending = window.orbitlab?.session?.pendingAdvance;
    return pending instanceof Set ? pending.size : null;
  });
  if (!t.check(await outstanding() !== null, 'cannot read the session\'s outstanding requests (window.orbitlab.session.pendingAdvance)')) return;
  let last = null;
  const settled = await t.until(async () => {
    const s = await state();
    const same = last && s.cursorTimeS === last.cursorTimeS && s.headTimeS === last.headTimeS && await outstanding() === 0;
    last = s;
    return same ? s : null;
  }, { timeoutMs: RESPOND_MS, intervalMs: 1000 });
  if (!t.check(settled, `the paused flight did not settle (cursor T+${last?.cursorTimeS} s, head T+${last?.headTimeS} s, outstanding ${await outstanding()})`)) return;
  const before = await state();
  t.log(`paused at T+${before.cursorTimeS} s, recorded to T+${before.headTimeS} s`);

  // ⚙ Setup, the failures section, a new failure drafted for this flight
  if (!await press(t, app, page.locator('#btn-setup'), 'mouse', '⚙ Setup')) return;
  if (!t.check(await t.until(() => page.locator('#setup').isVisible(), { timeoutMs: 5000 }), '⚙ Setup did not show the setup')) return;
  const faults = page.locator('#setup details[data-section="faults"]');
  if (!await faults.evaluate((d) => d.open)) {
    await faults.locator('summary').scrollIntoViewIfNeeded();
    if (!await press(t, app, faults.locator('summary'), 'mouse', 'failures section')) return;
  }
  // the flight was launched with no failures (the default): a new one is still offered
  const draftAdd = faults.locator('.fault-draft-add', { hasText: 'Add a failure to this flight' });
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
    `the flight changed before "Use now": T${before.startTimeS}…T+${before.headTimeS} s, cursor T+${before.cursorTimeS} s (${before.mode}) → `
    + `T${drafted.startTimeS}…T+${drafted.headTimeS} s, cursor T+${drafted.cursorTimeS} s (${drafted.mode})`);
  t.check(await page.locator('#setup select[data-field="setup.vehicle"]').isDisabled(), 'the vehicle is editable in flight');

  await useNowBtn.scrollIntoViewIfNeeded();
  if (!await press(t, app, useNowBtn, 'mouse', 'Use now')) return;
  t.check(await t.until(() => faults.locator('.fault-draft-status', { hasText: 'Used in this flight' }).isVisible(), { timeoutMs: 5000 }),
    'no confirmation after "Use now"');
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
  app.checkErrors();
  await app.context.close();
}
