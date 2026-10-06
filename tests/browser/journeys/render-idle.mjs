/**
 * The launch scene is not drawn while it cannot be seen. A modal dialog (the
 * profile chooser) over a live flight stops the renderer's frames, while the
 * flight, its clock and its recording go on; closing the dialog draws again.
 * (On a software GPU the scene drawn behind the chooser cost about 9
 * CPU-seconds every 3 s and stalled the learner-profiles reload.)
 */
export const timeoutMs = 240_000;

export default async function renderIdle(t) {
  const app = await t.open({ hash: '#/launch/engineer' });
  const { page } = app;
  await page.locator('#setup .launch-button').waitFor();
  const launched = await app.mcp('launch_mission', {});
  t.check(launched.ok && launched.playing, `launch_mission: ${JSON.stringify(launched)}`);
  const sample = () => page.evaluate(async () => ({
    frames: window.orbitlab.scene.renderer.info.render.frame,
    recorded: window.orbitlab.recorder.frames.length,
    clock: (await window.__mcp('read_flight_state')).frame.timeS,
  }));
  const drawing = async (what) => {
    const a = await sample();
    t.check(await t.until(async () => (await sample()).frames > a.frames + 5, { timeoutMs: 20_000 }), `the scene is not drawn ${what}`);
  };
  await drawing('in flight');

  await page.locator('#btn-profile').click();
  const dialog = page.locator('#profile-dialog');
  await dialog.waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(500);
  const before = await sample();
  await page.waitForTimeout(3000);
  const after = await sample();
  t.log(`chooser open 3 s: frames +${after.frames - before.frames}, recorded +${after.recorded - before.recorded}, clock +${(after.clock - before.clock).toFixed(1)} s`);
  t.check(after.frames === before.frames, `the scene was drawn ${after.frames - before.frames} times behind the modal chooser`);
  t.check(after.clock > before.clock + 1, `the mission clock stopped behind the chooser (${before.clock} → ${after.clock})`);
  t.check(after.recorded > before.recorded, `the recording stopped behind the chooser (${before.recorded} → ${after.recorded})`);

  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden', timeout: 10_000 });
  await drawing('again once the chooser is closed');
  app.checkErrors();
  await app.context.close();
}
