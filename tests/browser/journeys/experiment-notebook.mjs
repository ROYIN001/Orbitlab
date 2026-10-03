/**
 * Actual simulation + notebook controls. A deliberate setup-panel-only edit
 * is a regression sentinel: evidence must come from the flown configuration,
 * even if the panel differs. This does not fabricate flight results. Other
 * interactions use WebMCP and visible controls; viewport checks are emulation.
 */
import assert from 'node:assert/strict';
import { keyOn } from '../harness.mjs';

export const smoke = true;
export const timeoutMs = 240_000;

export default async function notebook(t) {
  const app = await t.open({ hash: '#/launch/explore' });
  const { page } = app;
  const configured = await app.mcp('configure_mission', {
    vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbitId: 'leo', payloadMassKg: 1000,
    launchTimeIso: '2026-10-02T12:00:00Z', physicsModel: 'pointMass', boosterRecovery: false,
  });
  assert.equal(configured.ok, true);
  assert.equal((await app.mcp('launch_mission')).ok, true);
  await app.mcp('control_playback', { action: 'warp', warp: 100 });
  assert.ok(await t.until(async () => (await app.mcp('read_flight_state')).frame.timeS >= 30, { timeoutMs: 90_000, intervalMs: 500 }), 'actual flight reaches T+30 s');
  await app.mcp('control_playback', { action: 'pause' });
  await app.mcp('seek', { timeS: 20 });
  await page.evaluate(() => { window.orbitlab.panel.state.payloadMass = 4321; });
  await keyOn(t, app, page.locator('#btn-work'), 'Enter', 'My work');
  await page.locator('.experiment-notebook').waitFor({ state: 'visible' });
  const notebook = page.locator('.experiment-notebook');
  await notebook.getByLabel('Experiment name', { exact: true }).fill('Payload provenance');
  await notebook.getByLabel('Prediction — what will change, and why?', { exact: true }).fill('Increasing payload should reduce remaining delta-v.');
  await notebook.getByLabel('Input to change', { exact: true }).selectOption('payloadMass');
  await keyOn(t, app, notebook.getByRole('button', { name: 'Save current flight as baseline', exact: true }), 'Enter', 'capture baseline');
  if ((await notebook.locator('.experiment-message').innerText()).includes('No usable flight')) {
    const diagnostic = await page.evaluate(() => {
      const input = window.orbitlab.workDialog.host.capture();
      if (!input) return { input: null, telemetry: window.orbitlab.sim?.telemetry.length };
      const { telemetry, events, ...rest } = input;
      return { ...rest, samples: telemetry.length, first: telemetry[0]?.t, last: telemetry.at(-1)?.t, visibleSamples: telemetry.filter((s) => s.t <= input.clock).length, events: events.length };
    });
    throw new Error(`Baseline rejected: ${JSON.stringify(diagnostic)}`);
  }
  await notebook.getByRole('button', { name: 'Save current flight as trial', exact: true }).waitFor();
  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('orbitlab.experiments.v1')));
  const baseline = stored.experiments[0].baseline;
  assert.equal(baseline.mission.mission.payloadMass, 1000, 'frozen evidence uses flown payload, not edited panel value');
  assert.equal(baseline.clock, 20, 'capture follows replay cursor');
  assert.equal(baseline.status, 'ascent');
  assert.equal(baseline.complete, false);
  assert.ok(baseline.sampleEnd <= 20 && baseline.t >= 30, 'recorded horizon and simulation horizon remain distinct');
  assert.match(await notebook.innerText(), /Trial missing/);
  await notebook.getByRole('button', { name: 'Save current flight as trial', exact: true }).click();
  assert.match(await notebook.innerText(), /No mission input changed/);
  assert.match(await notebook.innerText(), /partial results/);
  assert.equal(await notebook.getByLabel('Prediction — what will change, and why?', { exact: true }).getAttribute('readonly'), '');
  await notebook.getByLabel('4. Conclusion — does the evidence support your prediction? What remains uncertain?', { exact: true }).fill('No variable changed; this does not test the prediction.');
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem('orbitlab.experiments.v1')));
  assert.match(stored.experiments[0].conclusion, /No variable changed/);
  await notebook.getByRole('button', { name: 'Remove trial and conclusion', exact: true }).click();
  await page.keyboard.press('Escape');
  // Repeat the real mission with exactly the chosen input changed.
  assert.equal((await app.mcp('configure_mission', { payloadMassKg: 1100 })).ok, true);
  assert.equal((await app.mcp('launch_mission')).ok, true);
  await app.mcp('control_playback', { action: 'warp', warp: 100 });
  assert.ok(await t.until(async () => (await app.mcp('read_flight_state')).frame.timeS >= 30, { timeoutMs: 90_000, intervalMs: 500 }));
  await app.mcp('control_playback', { action: 'pause' });
  await app.mcp('seek', { timeS: 20 });
  await page.locator('#btn-work').click();
  await notebook.getByRole('button', { name: 'Save current flight as trial', exact: true }).click();
  const comparison = await notebook.innerText();
  assert.match(comparison, /Changed inputs: 1/);
  assert.doesNotMatch(comparison, /No mission input changed|More than one input changed|The input you selected did not change/);
  await notebook.getByLabel('4. Conclusion — does the evidence support your prediction? What remains uncertain?', { exact: true }).fill('Payload was the only input changed. These early partial results do not yet establish the final outcome.');
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem('orbitlab.experiments.v1')));
  assert.equal(stored.experiments[0].trial.mission.mission.payloadMass, 1100);
  assert.equal(stored.experiments[0].baseline.mission.mission.payloadMass, 1000);
  const [download] = await Promise.all([page.waitForEvent('download'), notebook.getByRole('button', { name: 'Download notebook', exact: true }).click()]);
  assert.equal(download.suggestedFilename(), 'orbitlab-experiments.json');
  assert.equal(await download.failure(), null);
  await app.shot('desktop');
  await notebook.locator('.experiment-table').scrollIntoViewIfNeeded();
  await app.shot('desktop-comparison');
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('#btn-work').evaluate((el) => el === document.activeElement), 'closing dialog restores opener focus');

  for (const lang of ['ru', 'th']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#lang-select').selectOption(lang);
    await page.locator('#btn-work').click();
    await notebook.waitFor({ state: 'visible' });
    assert.doesNotMatch(await notebook.innerText(), /exp\.[a-z]/, `${lang}: no untranslated notebook keys`);
    const fit = await page.locator('#work-dialog').evaluate((dialog) => ({ width: dialog.clientWidth, scroll: dialog.scrollWidth }));
    assert.ok(fit.scroll <= fit.width + 2, `${lang}: mobile dialog has no horizontal overflow`);
    await app.shot(`mobile-${lang}`);
    await page.keyboard.press('Escape');
    const buttonFit = await page.locator('#btn-work').evaluate((button) => {
      const box = button.getBoundingClientRect();
      const target = document.elementFromPoint((box.left + box.right) / 2, (box.top + box.bottom) / 2);
      return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight
        && !!target && (target === button || button.contains(target));
    });
    assert.ok(buttonFit, `${lang}: My work button fits and its centre is not covered`);
    if (lang === 'th') await app.shot('mobile-th-topbar');
  }
  app.checkErrors();
}
