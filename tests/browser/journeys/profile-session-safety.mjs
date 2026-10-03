/** Real Web Locks, fixed per-window owners, visit-only JSON recovery, and first profile open offline. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reloadDocument } from '../harness.mjs';
import { putWorkspaceFixture, workspaceBytes } from '../workspace-storage.mjs';

export const smoke = true;
export const timeoutMs = 420_000;
const record = (page) => page.evaluate(() => {
  const id = sessionStorage.getItem('orbitlab.profiles.selected.v1');
  return JSON.parse(localStorage.getItem(`orbitlab.profile.v1.${id}`));
});
const dialogOf = (page) => page.locator('#profile-dialog');
async function downloadWorkspace(page) {
  const dialog = dialogOf(page);
  await dialog.getByRole('button', { name: 'Profile backups', exact: true }).click();
  const promised = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export this learner’s workspace', exact: true }).click();
  return JSON.parse(readFileSync(await (await promised).path(), 'utf8'));
}

export default async function profileSessionSafety(t) {
  const app = await t.open({ hash: '#/lessons', contextOptions: { serviceWorkers: 'block' } });
  const { page } = app;
  await putWorkspaceFixture(page, {
    'orbitlab.lessons': JSON.stringify({ version: 1, lessons: { 'orbit-first': { attempts: 2, hintsShown: 1, passed: false } }, assessments: [], customLessons: [], customQuestions: [] }),
    'orbitlab.author.draft': JSON.stringify({ id: 'owner-a-draft', criteria: [] }),
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 }); await app.ready();
  const ownerA = await record(page);
  const bytesA = await workspaceBytes(page, ['orbitlab.lessons', 'orbitlab.author.draft']);

  // window.open intentionally clones the opener's sessionStorage, so this is
  // a second attempt to open A, rather than an unrelated chooser window.
  const popupPromise = page.waitForEvent('popup');
  await page.evaluate(() => { window.open(location.href, '_blank'); });
  const second = await popupPromise;
  const secondErrors = [];
  second.on('pageerror', (error) => secondErrors.push(error.message));
  await dialogOf(second).waitFor({ state: 'visible', timeout: 120_000 });
  assert.match(await dialogOf(second).innerText(), /already open in another tab/);
  assert.equal(await second.locator('#btn-profile').getAttribute('data-profile-status'), 'locked');
  assert.equal(await dialogOf(second).getByRole('button', { name: 'Rename', exact: true }).isDisabled(), true);
  assert.equal(await dialogOf(second).getByRole('button', { name: 'Delete profile', exact: true }).isDisabled(), true);
  const lockedBackup = await downloadWorkspace(second);
  assert.equal(lockedBackup.profiles[0].id, ownerA.id);
  assert.equal(lockedBackup.profiles[0].values['orbitlab.lessons'], bytesA['orbitlab.lessons']);
  await dialogOf(second).getByRole('button', { name: 'Back', exact: true }).click();
  t.log('Second window has a real locked owner; read-only JSON recovery works');

  // The locked reader may explicitly create a different owner. A stays fixed
  // in the first window; the directory change does not silently switch it.
  await dialogOf(second).getByRole('button', { name: 'Create a profile', exact: true }).click();
  await dialogOf(second).getByLabel('Learner name', { exact: true }).fill('Window B');
  await dialogOf(second).getByRole('button', { name: 'Create a profile', exact: true }).click();
  await reloadDocument(second, dialogOf(second).getByRole('button', { name: 'Confirm', exact: true }));
  const ownerB = await record(second);
  assert.notEqual(ownerB.id, ownerA.id);
  assert.equal(await second.locator('#btn-profile').getAttribute('data-profile-status'), 'durable');
  assert.equal((await record(page)).id, ownerA.id);
  assert.equal(await page.locator('#btn-profile').getAttribute('data-profile-status'), 'durable');
  const started = await second.evaluate(() => window.__mcp('start_lesson', { id: 'orbit-first' }));
  assert.equal(started.ok, true);
  assert.equal(JSON.parse((await record(second)).values['orbitlab.lessons']).lessons['orbit-first'].attempts, 0);
  assert.deepEqual(await workspaceBytes(page, ['orbitlab.lessons', 'orbitlab.author.draft']), bytesA);
  assert.equal((await record(second)).values['orbitlab.author.draft'], undefined);
  assert.deepEqual(secondErrors, []);
  await second.close();
  t.log('Different-profile windows save under fixed owners without changing A');

  // Remove the actual locking API before a fresh document boots. Its readable
  // saved data is exposed as a labelled visit-only copy, with no durable writer.
  await app.context.addInitScript(() => {
    Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 }); await app.ready();
  await dialogOf(page).waitFor({ state: 'visible' });
  assert.equal(await page.locator('#btn-profile').getAttribute('data-profile-status'), 'ephemeral');
  assert.match(await dialogOf(page).innerText(), /temporary: changes will be lost/);
  assert.equal(await dialogOf(page).getByRole('button', { name: 'Create a profile', exact: true }).isDisabled(), true);
  assert.equal(await dialogOf(page).getByRole('button', { name: 'Reset learning or tests', exact: true }).isDisabled(), true);
  // The old durable document may flush on pagehide. Compare after that
  // authorized flush, so this checks only the temporary document's behavior.
  const durableBefore = await page.evaluate((id) => localStorage.getItem(`orbitlab.profile.v1.${id}`), ownerA.id);
  const temporaryBackup = await downloadWorkspace(page);
  assert.equal(temporaryBackup.profiles[0].name, ownerA.name);
  assert.equal(temporaryBackup.profiles[0].values['orbitlab.lessons'], bytesA['orbitlab.lessons']);
  assert.equal(await page.evaluate((id) => localStorage.getItem(`orbitlab.profile.v1.${id}`), ownerA.id), durableBefore);
  app.checkErrors();
  await app.context.close();
  t.log('Unsupported locking is labelled temporary and still permits JSON recovery');

  // Untouched unreadable/newer drafts must remain exact bytes when real views
  // load fallback forms. Exporting is a transition flush, never an implicit edit.
  const untouched = await t.open({ hash: '#/home', contextOptions: { serviceWorkers: 'block' } });
  const rawDrafts = {
    'orbitlab.build.explore.v1': '{"v":99,"futureRocketDraft":true}',
    'orbitlab.build.satellite.v1': '{opaque satellite draft',
    'orbitlab.build.requirements.v1': '{"v":99,"futureRequirements":true}',
    'orbitlab.author.draft': '{opaque author draft',
    'orbitlab.author.design': '{"version":99,"futureDesignLesson":true}',
    'orbitlab.author.kind': 'future-kind',
    'orbitlab.worksheets': '{opaque worksheet form',
    'orbitlab.numeric-drafts.v1': '{"v":99,"futureNumberText":true}',
    'orbitlab.lessons': '{"version":99,"futureGrades":true}',
  };
  const rawKeys = Object.keys(rawDrafts);
  await putWorkspaceFixture(untouched.page, rawDrafts);
  await untouched.page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 }); await untouched.ready();
  const visit = async (hash, selector) => {
    await untouched.page.evaluate((hash) => { location.hash = hash; }, hash);
    await untouched.page.locator(selector).waitFor({ state: 'visible', timeout: 60_000 });
    assert.deepEqual(await workspaceBytes(untouched.page, rawKeys), rawDrafts);
  };
  await visit('#/build/explore', '.bx-grid:not([hidden])');
  await untouched.page.locator('[data-k="craft:satellite"]').click();
  await untouched.page.locator('.bsat-grid:not([hidden]) .bsat-summary').waitFor({ state: 'visible' });
  assert.deepEqual(await workspaceBytes(untouched.page, rawKeys), rawDrafts);
  await visit('#/build/engineer/requirements', '.brq-form');
  await visit('#/lessons/author', '.author');
  await visit('#/lessons/worksheets', '.ws-page');
  await untouched.page.locator('#btn-profile').click();
  await dialogOf(untouched.page).waitFor({ state: 'visible' });
  const untouchedBackup = await downloadWorkspace(untouched.page);
  for (const [key, value] of Object.entries(rawDrafts)) assert.equal(untouchedBackup.profiles[0].values[key], value);
  assert.deepEqual(await workspaceBytes(untouched.page, rawKeys), rawDrafts);
  untouched.checkErrors(); await untouched.context.close();
  t.log('Actual builder and instructor views plus JSON export preserve untouched opaque/newer draft bytes');

  // A new install has never loaded the profile UI. Its first open must work
  // offline from the production service worker's precache, including new chunks.
  const offline = await t.open({ hash: '#/home' });
  await offline.page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 90_000 });
  const initiallyLoaded = await offline.page.evaluate(() => performance.getEntriesByType('resource')
    .some((entry) => /\/(?:profile-dialog|profile-menu)-[^/?]+\.js$/.test(entry.name)));
  assert.equal(initiallyLoaded, false, 'profile dialog stays lazy before its first open');
  await offline.context.setOffline(true);
  await offline.page.locator('#btn-profile').click();
  await dialogOf(offline.page).waitFor({ state: 'visible', timeout: 30_000 });
  assert.match(await dialogOf(offline.page).innerText(), /Learner profiles/);
  assert.doesNotMatch(await dialogOf(offline.page).innerText(), /Could not|could not|profile\.[a-z]/);
  await offline.page.keyboard.press('Escape');
  assert.equal(await offline.page.evaluate(() => document.activeElement.id), 'btn-profile');
  offline.checkErrors();
  t.log('First profile-dialog open succeeds offline without eager startup import');
}
