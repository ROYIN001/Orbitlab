/**
 * R3.5 (A01): Home's "Try a launch yourself" opens Explore on the
 * first-launch template, which says what it uses, without touching the
 * user's saved mission.
 *
 * - A user with a saved mission (1,234 kg set up in Engineer) opens the
 *   template: the note names the rocket and offers the way back; the eyebrow
 *   says it is the template; Home's "continue" card still shows 1,234 kg.
 * - "Back to my mission" brings the saved mission back and the note goes.
 * - The template changed (a WebMCP edit, as a panel edit) is the user's
 *   mission: the note goes, the eyebrow says a catalogue rocket, and it is
 *   the one stored.
 */
import { press } from '../harness.mjs';

export const timeoutMs = 240_000;

export default async function r3FirstLaunch(t) {
  const app = await t.open({ hash: '#/launch/engineer' });
  const { page } = app;
  const set = await app.mcp('configure_mission', { vehicleId: 'falcon9', siteId: 'cape', orbitId: 'leo', payloadMassKg: 1234 });
  if (!t.check(set.ok, `configure_mission: ${JSON.stringify(set).slice(0, 200)}`)) return;

  const home = async () => {
    await page.evaluate(() => { location.hash = '#/home'; });
    await page.locator('#home-screen .home-resume').waitFor({ timeout: 15_000 });
  };
  const resumeText = () => page.locator('#home-screen .home-resume-text').textContent();
  const tryIt = async (what) => {
    const button = page.locator('#home-screen [data-home-focus="try"]');
    await button.waitFor();
    await press(t, app, button, 'mouse', what);
    return t.until(async () => (await page.locator('#setup .template-note').count()) > 0, { timeoutMs: 15_000 });
  };
  const eyebrow = () => page.locator('#mission-eyebrow').textContent();

  await home();
  t.check(/1,234/.test(await resumeText() ?? ''), `the continue card does not show the saved 1,234 kg: "${await resumeText()}"`);

  // the template, the saved mission kept
  if (!t.check(await tryIt('Try a launch yourself'), 'the template opened without its note')) return;
  t.check(/#\/launch\/explore/.test(page.url()), `the template did not open Explore: ${page.url()}`);
  const note = page.locator('#setup .template-note');
  t.check(/Falcon 9/.test(await note.textContent() ?? ''), `the note does not say what it uses: "${await note.textContent()}"`);
  t.check(await note.locator('.template-back').isVisible(), 'a user with a saved mission is not offered the way back to it');
  t.check(await t.until(async () => /first-launch template/.test(await eyebrow() ?? ''), { timeoutMs: 5000 }),
    `the eyebrow does not say it is the template: "${await eyebrow()}"`);
  await app.shot('first-launch-template');
  await home();
  t.check(/1,234/.test(await resumeText() ?? ''), `opening the template replaced the saved mission: "${await resumeText()}"`);

  // back to the saved mission
  if (!t.check(await tryIt('Try a launch yourself, again'), 'the template did not open the second time')) return;
  const backButton = page.locator('#setup .template-back');
  await backButton.scrollIntoViewIfNeeded(); // in the setup's own scroll, as a reader scrolls to it
  await press(t, app, backButton, 'mouse', 'Back to my mission');
  t.check(await t.until(async () => (await page.locator('#setup .template-note').count()) === 0, { timeoutMs: 5000 }), 'the note stayed after going back');
  const payload = () => page.locator('#setup [data-field="setup.payloadMass"]').first().inputValue().catch(() => null);
  t.check(await t.until(async () => /^1\s?,?234$/.test((await payload()) ?? ''), { timeoutMs: 5000 }),
    `back to my mission gave ${await payload()} kg, not the saved 1,234`);
  t.check(!/first-launch template/.test(await eyebrow() ?? ''), 'the eyebrow still says template after going back');

  // the template changed is the user's
  await home();
  if (!t.check(await tryIt('Try a launch yourself, then change it'), 'the template did not open the third time')) return;
  const edit = await app.mcp('configure_mission', { payloadMassKg: 900 });
  t.check(edit.ok, `configure_mission (edit): ${JSON.stringify(edit).slice(0, 200)}`);
  t.check(await t.until(async () => (await page.locator('#setup .template-note').count()) === 0, { timeoutMs: 5000 }), 'the note stayed once the template was changed');
  t.check(await t.until(async () => /catalogue rocket/.test(await eyebrow() ?? ''), { timeoutMs: 5000 }),
    `the changed template is not the user's mission: "${await eyebrow()}"`);
  await home();
  t.check(/900/.test(await resumeText() ?? ''), `the changed template was not stored: "${await resumeText()}"`);
  app.checkErrors();
  await app.context.close();
}
