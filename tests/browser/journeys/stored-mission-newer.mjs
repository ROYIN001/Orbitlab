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
 *
 * While the mission is held, the notice also says it is kept as stored until
 * changed and that the first edit saves it in this app's format; the line goes
 * once the edit is stored, and a mission of this version never shows it
 * (r16-2b-notice).
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

  const reload = async (hash) => {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
    await app.ready();
    await page.waitForTimeout(1000);
  };
  const notice = async () => (await page.locator('.share-notice').first().textContent()) ?? '';
  const HELD = /kept as it was stored until you change it; your first edit saves it in this app's format/;
  const keptAfter = async (bytes, what) => t.check((await raw()) === bytes, `${what} wrote over the stored mission: ${(await raw())?.slice(0, 160)}`);

  // a newer version's mission
  const newer = JSON.stringify({ ...saved, version: 99, future: { kept: true }, mission: { ...saved.mission, futureSetting: 7 } });
  await putWorkspaceFixture(page, { [KEY]: newer });
  await reload('#/launch/engineer');
  const payload = () => page.locator('#setup [data-field="setup.payloadMass"]').first().inputValue().catch(() => null);
  t.check(await t.until(async () => /^1\s?,?234$/.test((await payload()) ?? ''), { timeoutMs: 5000 }), `the newer mission was not read: ${await payload()} kg`);
  t.check(/newer version/.test(await page.locator('.share-notice').first().textContent() ?? ''), 'the notice does not say the mission came from a newer version');
  t.check(HELD.test(await notice()), `the notice does not say the newer mission is kept as stored until changed: ${await notice()}`);
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
  t.check(HELD.test(await notice()), `the notice does not say the reset mission is kept as stored until changed: ${await notice()}`);

  // the user's edit replaces it, in this version's format
  const edit = await app.mcp('configure_mission', { payloadMassKg: 900 });
  t.check(edit.ok, `configure_mission (edit): ${JSON.stringify(edit).slice(0, 200)}`);
  const edited = await t.until(async () => { const s = JSON.parse((await raw()) ?? 'null'); return s?.mission?.payloadMass === 900 ? s : null; }, { timeoutMs: 10_000 });
  t.check(edited && edited.version === saved.version, `the user's edit was not stored: ${(await raw())?.slice(0, 160)}`);
  t.check(await t.until(async () => !HELD.test(await notice()), { timeoutMs: 5000 }), `the notice still says the mission is held after the edit was stored: ${await notice()}`);

  // a mission of this version, restored as before
  const current = await raw();
  await reload('#/launch/engineer');
  t.check(await t.until(async () => /^900$/.test((await payload()) ?? ''), { timeoutMs: 5000 }), `the stored mission was not restored: ${await payload()} kg`);
  await keptAfter(current, 'restoring a mission of this version');
  t.check(!HELD.test(await notice()), `a mission of this version is said to be held: ${await notice()}`);
  app.checkErrors();
}
