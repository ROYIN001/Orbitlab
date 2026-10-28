/**
 * The owner's Soyuz Anatomy models (public/anatomy/, owner 2026-10-28). A
 * crewed Soyuz-2.1a flight is drawn with the model's outside
 * (src/render/anatomy.ts): its meshes fetched once and mounted in each stage's
 * place, and the strap-ons drawn from it as debris once they go. A Progress
 * MS mission mounts the Progress page's model. Build's Watch level opens the
 * page whole for Soyuz-2.1a (both payloads) and 2.1b, and for no other
 * vehicle, unloads it on close and leaves the browser's history as it was,
 * so Back still steps the app (src/ui/build/anatomy-dialog.ts). Console
 * errors (shader failures among them) fail it.
 */
export const timeoutMs = 360_000;

export default async function soyuzAnatomy(t) {
  const app = await t.open({ hash: '#/launch/engineer' });
  const { page } = app;
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  await page.locator('#setup .launch-button').waitFor();

  const mounted = (variant) => t.until(() => page.evaluate((v) => document.body.dataset.anatomy === v, variant), { timeoutMs: 60_000 });
  const parts = () => page.evaluate(() => {
    const names = {};
    window.orbitlab.rocket.group.traverse((o) => { if (o.name.startsWith('anatomy:')) names[o.name] = (names[o.name] ?? 0) + 1; });
    return names;
  });

  // ── a crewed Soyuz-2.1a: the Soyuz MS page's model, every part in its place
  const configured = await app.mcp('configure_mission', { vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'crew', orbitId: 'iss', physicsModel: 'pointMass' });
  t.check(configured.ok, `configure_mission (crewed Soyuz-2.1a): ${JSON.stringify(configured).slice(0, 300)}`);
  if (!t.check(await mounted('soyuz-ms'), 'the Soyuz MS model was never mounted')) { await app.context.close(); return; }
  const crewed = await parts();
  t.check(crewed['anatomy:core'] === 1 && crewed['anatomy:booster'] === 4 && crewed['anatomy:stage3'] === 1
    && crewed['anatomy:fairing-left'] === 1 && crewed['anatomy:fairing-right'] === 1 && crewed['anatomy:escape'] === 1
    && crewed['anatomy:payload'] === 1, `the crewed stack's model parts: ${JSON.stringify(crewed)}`);
  await app.shot('crewed-pad');

  // past the strap-ons' separation: they fly on, drawn from the model
  const launched = await app.mcp('launch_mission', {});
  t.check(launched.ok, `launch_mission: ${JSON.stringify(launched).slice(0, 300)}`);
  await app.mcp('control_playback', { action: 'warp', warp: 100 });
  const past = await t.until(async () => (await app.mcp('read_flight_state')).headTimeS > 125, { timeoutMs: 180_000, intervalMs: 500 });
  t.check(past, 'the flight did not get past the strap-ons\' separation (T+118 s)');
  await app.mcp('control_playback', { action: 'pause' });
  // the debris is built as the scene draws the frame it first appears in
  const spent = () => page.evaluate(() => {
    const rocket = window.orbitlab.rocket.group;
    let n = 0;
    window.orbitlab.scene.scene.traverse((o) => { if (o.name === 'anatomy:booster' && !rocket.getObjectById(o.id)) n++; });
    return n;
  });
  t.check(await t.until(async () => (await spent()) === 4, { timeoutMs: 30_000 }), `${await spent()} spent strap-ons drawn from the model, not 4`);
  await app.shot('strap-ons-away');

  // ── a Progress MS: the Progress page's model, its spacecraft drawn as the page draws it
  const cargo = await app.mcp('configure_mission', { vehicleId: 'soyuz21a', siteId: 'baikonur', satelliteId: 'progress', orbitId: 'iss', physicsModel: 'pointMass' });
  t.check(cargo.ok, `configure_mission (Progress MS): ${JSON.stringify(cargo).slice(0, 300)}`);
  if (t.check(await mounted('progress-ms-26'), 'the Progress MS-26 model was never mounted')) {
    const progress = await parts();
    t.check(progress['anatomy:payload'] === 1 && !progress['anatomy:escape'], `the cargo stack's model parts: ${JSON.stringify(progress)}`);
  }

  // ── Build: the pages whole, for the two Soyuz vehicles only
  await app.goto('#/build/watch');
  const open = page.locator('.bs-anatomy-open');
  await page.selectOption('#bs-picker-select', 'falcon9');
  t.check(await t.until(async () => (await open.count()) === 0), 'Falcon 9 offers a Soyuz Anatomy page');
  await page.selectOption('#bs-picker-select', 'soyuz21b');
  t.check(await t.until(async () => (await open.count()) === 1), 'Soyuz-2.1b offers no Anatomy page');
  await page.selectOption('#bs-picker-select', 'soyuz21a');
  await open.waitFor({ timeout: 10_000 });
  const history = await page.evaluate(() => history.length);
  await open.click();
  const dialog = page.locator('dialog.bs-anatomy');
  await dialog.waitFor({ state: 'visible', timeout: 10_000 });
  const title = () => page.evaluate(() => document.querySelector('.bs-anatomy-frame')?.contentDocument?.querySelector('#anatomy-content') ? document.querySelector('.bs-anatomy-frame').contentDocument.title : '');
  t.check(await t.until(async () => (await title()).includes('Soyuz-2.1a'), { timeoutMs: 60_000 }), `the Soyuz MS page did not open (title "${await title()}")`);
  await page.locator('.bs-anatomy [data-k="progress-ms-26"]').click();
  t.check(await t.until(async () => (await title()).includes('Progress MS-26'), { timeoutMs: 60_000 }), `the Progress MS-26 page did not open (title "${await title()}")`);
  await app.shot('build-anatomy');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden', timeout: 10_000 });
  // the dialog's `close` event, which removes the page's frame, comes in a task after it is hidden
  const frames = () => page.evaluate(() => document.querySelectorAll('.bs-anatomy-frame').length);
  t.check(await t.until(async () => (await frames()) === 0), `closing the dialog left ${await frames()} page frame(s) loaded`);
  const after = await page.evaluate(() => history.length);
  t.check(after === history, `opening a page, switching it and closing the dialog added ${after - history} history entr(ies): Back would step the hidden frame`);
  t.check(await page.evaluate(() => document.activeElement?.classList.contains('bs-anatomy-open')), 'closing the dialog did not hand the focus back to its button');

  t.check(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);
  app.checkErrors();
  await app.context.close();
}
