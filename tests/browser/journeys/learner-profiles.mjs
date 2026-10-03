/** Profile identity, A/B separation, scoped reset, last-profile chooser and localized keyboard UI. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export const smoke = true;
export const timeoutMs = 480_000;
const fixture = JSON.parse(readFileSync(new URL('../../fixtures/lessons/v1.orbitlab-lesson.json', import.meta.url), 'utf8'));
const MEDIA_MAGIC = Buffer.from('ORBITLAB-MEDIA-1\n');
function mediaFixture(profileId, name) {
  // A valid 0.1 s silent PCM WAV also stays safe if the watch player loads it.
  const data = Buffer.alloc(44 + 1600);
  data.write('RIFF', 0); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(8000, 24); data.writeUInt32LE(16000, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(1600, 40);
  const header = Buffer.from(JSON.stringify({ version: 1, profileId, profileName: name,
    tracks: [{ missionId: 'soyuz-ms', name: 'A recording', t0: 0, type: 'audio/wav', bytes: data.length }] }));
  const length = Buffer.alloc(4); length.writeUInt32LE(header.length);
  return Buffer.concat([MEDIA_MAGIC, length, header, data]);
}
function mediaHeader(bytes) {
  assert.ok(bytes.subarray(0, MEDIA_MAGIC.length).equals(MEDIA_MAGIC));
  const length = bytes.readUInt32LE(MEDIA_MAGIC.length);
  return JSON.parse(bytes.subarray(MEDIA_MAGIC.length + 4, MEDIA_MAGIC.length + 4 + length).toString('utf8'));
}
async function downloadBytes(page, action) {
  const promised = page.waitForEvent('download'); await action();
  return readFileSync(await (await promised).path());
}
const activeRecord = (page) => page.evaluate(() => {
  const id = sessionStorage.getItem('orbitlab.profiles.selected.v1');
  return JSON.parse(localStorage.getItem(`orbitlab.profile.v1.${id}`));
});
async function reloadAfter(app, action) {
  await Promise.all([app.page.waitForEvent('load'), action()]);
  await app.ready();
}
async function createLearner(app, name) {
  const dialog = app.page.locator('#profile-dialog');
  await dialog.getByRole('button', { name: 'Create a profile', exact: true }).click();
  await dialog.getByLabel('Learner name', { exact: true }).fill(name);
  await dialog.getByRole('button', { name: 'Create a profile', exact: true }).click();
  assert.match(await dialog.innerText(), /Live flights are not restored/);
  await reloadAfter(app, () => dialog.getByRole('button', { name: 'Confirm', exact: true }).click());
  assert.match(await app.page.locator('#btn-profile').getAttribute('aria-label'), new RegExp(name));
}
async function switchLearner(app, name) {
  await app.page.locator('#btn-profile').click();
  const row = app.page.locator('.profile-list-row').filter({ has: app.page.locator('strong', { hasText: name }) });
  await row.getByRole('button', { name: 'Open this workspace', exact: true }).click();
  await reloadAfter(app, () => app.page.locator('#profile-dialog').getByRole('button', { name: 'Confirm', exact: true }).click());
}

export default async function learnerProfiles(t) {
  const app = await t.open({ hash: '#/lessons', contextOptions: { serviceWorkers: 'block' } });
  const { page } = app;
  await page.locator('#btn-profile').click();
  const dialog = page.locator('#profile-dialog');
  await dialog.waitFor({ state: 'visible', timeout: 30_000 });
  assert.match(await dialog.innerText(), /not online accounts/);
  await dialog.locator('.profile-list-row').getByRole('button', { name: 'Rename', exact: true }).click();
  await dialog.getByLabel('Learner name', { exact: true }).fill('Learner A');
  await dialog.getByRole('button', { name: 'Save name', exact: true }).click();
  await dialog.locator('.profile-current-name').filter({ hasText: 'Learner A' }).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'btn-profile');
  assert.match(await page.locator('.lessons-page-bar').innerText(), /Learner A/);

  // Seed a real valid custom lesson plus a recorded grade. This fixture has no
  // synthetic storage schema: it is the application's published lesson format.
  await page.evaluate((lesson) => {
    const id = sessionStorage.getItem('orbitlab.profiles.selected.v1');
    const key = `orbitlab.profile.v1.${id}`; const record = JSON.parse(localStorage.getItem(key));
    const custom = { ...lesson, id: 'profile-a-custom', title: { en: 'A personal lesson', th: 'บทเรียนของ A', ru: 'Личный урок A' } };
    record.values['orbitlab.lessons'] = JSON.stringify({ version: 1, lessons: { 'orbit-first': { attempts: 2, hintsShown: 1, passed: false, revealed: { period: [95] } } }, assessments: [], customLessons: [custom], customQuestions: [] });
    record.values['orbitlab.author.draft'] = JSON.stringify({ sentinel: 'A-owned draft' });
    localStorage.setItem(key, JSON.stringify(record));
  }, fixture.lessons[0]);
  await page.reload(); await app.ready();
  t.log('A renamed; valid custom lesson, history and author draft loaded');
  assert.match(await page.locator('.lesson-catalog').innerText(), /A personal lesson/);
  await page.locator('.lesson-assess button').click();
  await page.getByRole('button', { name: 'Start the test', exact: true }).click();
  await page.locator('.assess-question').waitFor();
  const before = await activeRecord(page);
  assert.equal(JSON.parse(before.values['orbitlab.lessons']).assessments.length, 1);

  await page.locator('#btn-profile').click();
  await createLearner(app, 'Learner B');
  const b = await activeRecord(page);
  assert.notEqual(b.id, before.id);
  assert.equal(b.values['orbitlab.author.draft'], undefined);
  const bProgress = b.values['orbitlab.lessons'] ? JSON.parse(b.values['orbitlab.lessons']) : { lessons: {}, assessments: [], customLessons: [] };
  assert.equal(Object.keys(bProgress.lessons).length, 0);
  assert.equal(bProgress.assessments.length, 0);
  assert.equal(bProgress.customLessons.length, 0);
  await switchLearner(app, 'Learner A');
  await page.evaluate(() => { location.hash = '#/lessons/test'; });
  await page.locator('.assess-question').waitFor();
  assert.equal((await activeRecord(page)).values['orbitlab.author.draft'], before.values['orbitlab.author.draft']);
  t.log('A → B → A isolated; saved unfinished test resumed');

  // Reset tests only, then learning only; personal teaching content and drafts remain.
  await page.evaluate(() => { location.hash = '#/lessons'; });
  await page.locator('.lesson-catalog [data-profile-action="reset"]').click();
  await dialog.getByLabel('Records to remove', { exact: true }).selectOption('exams');
  assert.match(await dialog.locator('.profile-counts').innerText(), /Tests\s+1/);
  await reloadAfter(app, () => dialog.getByRole('button', { name: 'Delete these records', exact: true }).click());
  let progress = JSON.parse((await activeRecord(page)).values['orbitlab.lessons']);
  assert.equal(progress.assessments.length, 0);
  assert.equal(progress.lessons['orbit-first'].attempts, 2);
  assert.equal(progress.customLessons.length, 1);
  await page.evaluate(() => { location.hash = '#/lessons'; });
  await page.locator('.lesson-catalog [data-profile-action="reset"]').click();
  assert.match(await dialog.locator('.profile-counts').innerText(), /Lessons with history\s+1/);
  await reloadAfter(app, () => dialog.getByRole('button', { name: 'Delete these records', exact: true }).click());
  progress = JSON.parse((await activeRecord(page)).values['orbitlab.lessons']);
  assert.deepEqual(progress.lessons, {});
  assert.equal(progress.customLessons.length, 1);
  assert.equal((await activeRecord(page)).values['orbitlab.author.draft'], before.values['orbitlab.author.draft']);
  t.log('Tests-only and learning-only reset preserved personal content and author draft');
  await page.evaluate(() => { location.hash = '#/lessons'; });
  await page.locator('.lesson-catalog').waitFor({ state: 'visible' });

  // Modal localization, narrow layout, and Escape retain the underlying route.
  for (const lang of ['th', 'ru']) {
    await page.locator('#lang-select').selectOption(lang);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#btn-profile').click();
    await dialog.waitFor({ state: 'visible', timeout: 30_000 });
    const size = await dialog.evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    assert.ok(size.scroll <= size.width + 2, `${lang}: profile dialog fits a mobile screen`);
    assert.doesNotMatch(await dialog.innerText(), /(?:profile|work)\.[a-z]/);
    await page.keyboard.press('Escape');
    assert.equal(new URL(page.url()).hash, '#/lessons');
  }
  await page.locator('#lang-select').selectOption('en');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator('#btn-profile').click();

  // Review an all-work JSON backup before importing it as a separate learner.
  await dialog.getByRole('button', { name: 'Profile backups', exact: true }).click();
  assert.match(await dialog.innerText(), /JSON files exclude uploaded audio/);
  const audioInput = () => dialog.locator('.profile-file-picker').filter({ has: page.getByRole('button', { name: 'Restore uploaded audio to this learner', exact: true }) }).locator('input');
  await audioInput().setInputFiles({ name: 'learner-a.orbitlab-audio', mimeType: 'application/octet-stream', buffer: mediaFixture(before.id, 'Learner A') });
  await dialog.getByLabel('Existing records', { exact: true }).waitFor();
  assert.equal(await dialog.getByLabel('Existing records', { exact: true }).inputValue(), 'keep');
  assert.match(await dialog.innerText(), /Audio from Learner A: 1 track/);
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  await dialog.locator('.profile-list-row').first().waitFor();
  await dialog.getByRole('button', { name: 'Profile backups', exact: true }).click();
  const audio = await downloadBytes(page, () => dialog.getByRole('button', { name: 'Export this learner’s uploaded audio', exact: true }).click());
  assert.equal(mediaHeader(audio).tracks.length, 1);
  const bytes = await downloadBytes(page, () => dialog.getByRole('button', { name: 'Export this learner’s workspace', exact: true }).click());
  const archive = JSON.parse(bytes.toString('utf8'));
  assert.equal(archive.format, 'orbitlab.workspace');
  assert.equal(archive.media.included, false);
  assert.equal(archive.profiles[0].name, 'Learner A');
  assert.equal(archive.profiles[0].values['orbitlab.author.draft'], before.values['orbitlab.author.draft']);
  const backupInput = dialog.locator('.profile-file-picker').filter({ has: page.getByRole('button', { name: 'Import a workspace backup', exact: true }) }).locator('input');
  await backupInput.setInputFiles({ name: 'reviewed.orbitlab-workspace.json', mimeType: 'application/json', buffer: bytes });
  await dialog.getByLabel('Import destination', { exact: true }).waitFor();
  assert.equal(await dialog.getByLabel('Import destination', { exact: true }).inputValue(), '', 'backup import defaults to a new learner');
  await dialog.getByLabel('Name for the new learner', { exact: true }).fill('Learner A copy');
  await reloadAfter(app, () => dialog.getByRole('button', { name: 'Import the reviewed file', exact: true }).click());
  const imported = await activeRecord(page);
  assert.notEqual(imported.id, before.id);
  assert.equal(imported.values['orbitlab.author.draft'], before.values['orbitlab.author.draft']);
  assert.equal(JSON.parse(imported.values['orbitlab.lessons']).customLessons.length, 1);
  t.log('All-work JSON backup reviewed and imported into a new learner');
  await page.locator('#btn-profile').click();
  await dialog.getByRole('button', { name: 'Profile backups', exact: true }).click();
  const copyAudio = await downloadBytes(page, () => dialog.getByRole('button', { name: 'Export this learner’s uploaded audio', exact: true }).click());
  assert.equal(mediaHeader(copyAudio).tracks.length, 0, 'JSON restore does not silently acquire another learner’s audio');
  await audioInput().setInputFiles({ name: 'learner-a.orbitlab-audio', mimeType: 'application/octet-stream', buffer: audio });
  await dialog.getByLabel('Existing records', { exact: true }).waitFor();
  assert.equal(await dialog.getByLabel('Existing records', { exact: true }).inputValue(), 'keep');
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  await dialog.locator('.profile-list-row').first().waitFor();
  t.log('Binary audio validated, exported and explicitly restored to a separate owner');
  await dialog.locator('.profile-list-row').filter({ hasText: 'Learner A copy' }).getByRole('button', { name: 'Delete profile', exact: true }).click();
  await reloadAfter(app, () => dialog.getByRole('button', { name: 'Delete this learner and their work', exact: true }).click());
  await dialog.waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => sessionStorage.getItem('orbitlab.profiles.selected.v1')), '', 'active deletion does not select another learner silently');
  const audioOwners = await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('orbitlab-soundtracks'); open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result; const transaction = db.transaction('tracks'); const read = transaction.objectStore('tracks').getAll();
      read.onsuccess = () => { resolve(read.result.map((item) => item.profileId)); db.close(); };
      read.onerror = () => { reject(read.error); db.close(); };
    };
  }));
  assert.equal(audioOwners.filter((id) => id === imported.id).length, 0);
  assert.equal(audioOwners.filter((id) => id === before.id).length, 1, 'deleting the copy preserves the original learner’s audio');
  await dialog.locator('.profile-list-row').filter({ hasText: 'Learner A' }).getByRole('button', { name: 'Open this workspace', exact: true }).click();
  await reloadAfter(app, () => dialog.getByRole('button', { name: 'Confirm', exact: true }).click());
  await page.locator('#btn-profile').click();
  const bRow = dialog.locator('.profile-list-row').filter({ hasText: 'Learner B' });
  await bRow.getByRole('button', { name: 'Delete profile', exact: true }).click();
  assert.match(await dialog.innerText(), /Other learners are kept/);
  await dialog.getByRole('button', { name: 'Delete this learner and their work', exact: true }).click();
  await dialog.locator('.profile-list-row').filter({ hasText: 'Learner B' }).waitFor({ state: 'detached' });
  await dialog.locator('.profile-list-row').getByRole('button', { name: 'Delete profile', exact: true }).click();
  assert.match(await dialog.innerText(), /choose or create a learner explicitly/);
  await reloadAfter(app, () => dialog.getByRole('button', { name: 'Delete this learner and their work', exact: true }).click());
  await dialog.waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  assert.equal(await dialog.evaluate((element) => element.open), true, 'last-profile deletion requires an explicit learner choice');
  assert.equal(await page.locator('.profile-list-row').count(), 0);
  await createLearner(app, 'Learner C');
  assert.notEqual((await activeRecord(page)).id, before.id);
  app.checkErrors();
}
