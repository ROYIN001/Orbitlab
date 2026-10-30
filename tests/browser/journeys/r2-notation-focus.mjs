/**
 * M-LAUNCH-025: choosing a notation in the telemetry panel mid-flight keeps the
 * keyboard (and a screen reader) on the select that was used. The panel is
 * rebuilt for the new symbols; its select is a new element, and the focus fell
 * to the page.
 */
export const timeoutMs = 120_000;

export default async function r2NotationFocus(t) {
  const app = await t.open({ hash: '#/launch/engineer' });
  const { page } = app;
  await page.locator('#setup .launch-button').waitFor();
  await app.mcp('launch_mission', {});
  t.check(await t.until(() => page.evaluate(() => document.body.dataset.setup === 'collapsed'), { timeoutMs: 20_000 }), 'the setup did not collapse');
  const select = page.locator('#telemetry .notation-section select');
  await select.focus();
  await select.selectOption('gost');
  const where = () => page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}${a.closest('.notation-section') ? ' in the notation section' : ''}` : 'none'; });
  t.check(await t.until(async () => (await where()) === 'SELECT in the notation section', { timeoutMs: 3000 }), `after choosing GOST the focus is on ${await where()}, not on the notation select`);
  t.check(await select.inputValue() === 'gost', 'the notation select does not show the choice');
  await select.selectOption('iso');
  t.check(await t.until(async () => (await where()) === 'SELECT in the notation section', { timeoutMs: 3000 }), `after choosing ISO the focus is on ${await where()}`);
  app.checkErrors();
  await app.context.close();
}
