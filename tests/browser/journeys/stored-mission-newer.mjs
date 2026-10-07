/**
 * R1.6 PR 2b (M-PLAN-031): a stored mission this version cannot keep whole is
 * read, not written over. Replace the saved mission's bytes with what a newer
 * Orbitlab would keep (version 99, settings this version does not know), then:
 *
 * - reload in Engineer: the page opens on it, says it came from a newer
 *   version, and its bytes are unchanged;
 * - reload on Home and take the "continue" card: the bytes are unchanged;
 * - a mission with a setting this version puts back to its default (a
 *   negative payload) is not saved over either;
 * - the user's own edit is what replaces it, in this version's format;
 * - a mission of this version is restored as before.
 */
import { putWorkspaceFixture, workspaceBytes } from '../workspace-storage.mjs';

export const timeoutMs = 240_000;

const KEY = 'orbitlab.mission';

export default async function storedMissionNewer(t) {
  const app = await t.open({ hash: '#/launch/engineer' });
  const { page } = app;
  const set = await app.mcp('configure_mission', { vehicleId: 'falcon9', siteId: 'cape', orbitId: 'leo', payloadMassKg: 1234 });
  if (!t.check(set.ok, `configure_mission: ${JSON.stringify(set).slice(0, 200)}`)) return;
  const raw = async () => (await workspaceBytes(page, [KEY]))[KEY];
  const saved = await t.until(async () => { const s = JSON.parse((await raw()) ?? 'null'); return s?.mission?.payloadMass === 1234 ? s : null; }, { timeoutMs: 10_000 });
  if (!t.check(saved, 'the configured mission was not stored')) return;

  // Start-up is over once the scene draws again (its frame count, as render-idle
  // reads it). `#loading.hidden` comes earlier: init (src/main.ts) sets it before
  // the start-up mission is loaded, and on a software GPU the next frame then
  // waits about 8 s for the GPU process (textures, shader programs) while the page
  // itself is idle. A click made in that time spends it in Playwright's
  // "stable" check, inside the click's own 30 s.
  const frames = () => page.evaluate(() => window.orbitlab.scene.renderer.info.render.frame);
  const drawing = async () => {
    // two frames: the first may be start-up's own, drawn before that wait
    for (let k = 0; k < 2; k++) {
      const before = await frames();
      if (!await t.until(async () => (await frames()) > before, { timeoutMs: 60_000 })) return false;
    }
    return true;
  };
  const reload = async (hash) => {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
    await app.ready();
    t.check(await drawing(), `the scene did not draw after reloading on ${hash}`);
  };
  const keptAfter = async (bytes, what) => t.check((await raw()) === bytes, `${what} wrote over the stored mission: ${(await raw())?.slice(0, 160)}`);

  // a newer version's mission
  const newer = JSON.stringify({ ...saved, version: 99, future: { kept: true }, mission: { ...saved.mission, futureSetting: 7 } });
  await putWorkspaceFixture(page, { [KEY]: newer });
  await reload('#/launch/engineer');
  const payload = () => page.locator('#setup [data-field="setup.payloadMass"]').first().inputValue().catch(() => null);
  t.check(await t.until(async () => /^1\s?,?234$/.test((await payload()) ?? ''), { timeoutMs: 5000 }), `the newer mission was not read: ${await payload()} kg`);
  t.check(/newer version/.test(await page.locator('.share-notice').first().textContent() ?? ''), 'the notice does not say the mission came from a newer version');
  await keptAfter(newer, 'opening Engineer on a newer mission');
  await putWorkspaceFixture(page, { [KEY]: newer }); // each path on its own
  await reload('#/home');
  const resume = page.locator('#home-screen .home-resume');
  if (t.check(await resume.waitFor({ timeout: 15_000 }).then(() => true).catch(() => false), 'Home offers no "continue" card')) {
    await resume.click();
    await page.waitForTimeout(1000);
    await keptAfter(newer, 'Home\'s "continue" card on a newer mission');
  }

  // a setting put back to its default
  const reset = JSON.stringify({ ...saved, mission: { ...saved.mission, payloadMass: -1 } });
  await putWorkspaceFixture(page, { [KEY]: reset });
  await reload('#/launch/engineer');
  await keptAfter(reset, 'opening Engineer on a mission with a setting reset');

  // the user's edit replaces it, in this version's format
  const edit = await app.mcp('configure_mission', { payloadMassKg: 900 });
  t.check(edit.ok, `configure_mission (edit): ${JSON.stringify(edit).slice(0, 200)}`);
  const edited = await t.until(async () => { const s = JSON.parse((await raw()) ?? 'null'); return s?.mission?.payloadMass === 900 ? s : null; }, { timeoutMs: 10_000 });
  t.check(edited && edited.version === saved.version, `the user's edit was not stored: ${(await raw())?.slice(0, 160)}`);

  // a mission of this version, restored as before
  const current = await raw();
  await reload('#/launch/engineer');
  t.check(await t.until(async () => /^900$/.test((await payload()) ?? ''), { timeoutMs: 5000 }), `the stored mission was not restored: ${await payload()} kg`);
  await keptAfter(current, 'restoring a mission of this version');
  app.checkErrors();
}
