/**
 * My Work backup/recovery through visible buttons, real downloads and file
 * chooser uploads. Controlled storage fixtures in a fresh test context stand
 * for previously saved work; they are deliberately not claims of flown or
 * graded learner activity. Import itself always runs through the public UI.
 * No simulator runs or application methods are injected into the page.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export const smoke = true;
// About 155 s on the shared software-WebGL runner: leave CI headroom for
// the three real page reloads and the deliberately oversized file upload.
export const timeoutMs = 240_000;

const KEYS = {
  mission: 'orbitlab.mission', designs: 'orbitlab.designs', progress: 'orbitlab.lessons', notebook: 'orbitlab.experiments.v1',
};
const JOURNAL = 'orbitlab.project-import.recovery.v1';
const SENTINEL = 'project-journey.unrelated';
const AT = '2026-10-02T12:00:00.000Z';
const fixture = (name) => JSON.parse(readFileSync(new URL(`../../fixtures/recheck/${name}`, import.meta.url), 'utf8'));

function savedWork() {
  const scenario = fixture('scenario.orbitlab-lesson.json');
  const results = fixture('results.orbitlab-results.json');
  const mission = structuredClone(scenario.lessons.find((l) => l.id === 'class-leo').mission);
  const record = results.progress.lessons['class-power'];
  const design = structuredClone((record.last ?? record.passedRecord).design);
  return {
    mission,
    designs: { version: 1, designs: [{ id: 'backup-satellite', kind: 'satellite', name: 'Backup journey satellite', created: AT, updated: AT, design }] },
    progress: { version: 1, lessons: { 'orbit-first': { attempts: 1, hintsShown: 0, passed: true,
      last: { at: AT, verdict: 'pass', criteria: [], answers: {}, hintsShown: 0 } } }, assessments: [],
      customLessons: [structuredClone(scenario.lessons.find((l) => l.id === 'class-leo'))], customQuestions: [] },
    notebook: { version: 1, experiments: [{ id: 'backup-experiment', createdAt: AT, title: 'Backup journey experiment',
      prediction: 'A lighter payload raises apogee', variable: 'payloadMass', conclusion: 'Awaiting the controlled trial',
      baseline: { label: 'Saved baseline', capturedAt: AT, mission: structuredClone(mission), actions: [], app: 'journey-fixture',
        t: 1, clock: 1, status: 'ascent', complete: false, source: 'recorded-telemetry', sampleCount: 2,
        sampleStart: 0, sampleEnd: 1, figures: [] } }] },
  };
}

async function putFixture(page, data) {
  await page.evaluate(({ keys, data, sentinel }) => {
    for (const [section, key] of Object.entries(keys)) localStorage.setItem(key, JSON.stringify(data[section]));
    localStorage.setItem(sentinel, 'unrelated browser data must stay private');
  }, { keys: KEYS, data, sentinel: SENTINEL });
}

const browserBytes = (page) => page.evaluate((keys) => Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)])), [...Object.values(KEYS), JOURNAL, SENTINEL]);

async function openBackups(page) {
  await page.locator('#btn-work').click();
  await page.locator('#work-dialog[open]').waitFor();
  await page.locator('#work-tab-backups').click();
  await page.locator('#btn-project-open').waitFor();
}

async function upload(page, name, buffer) {
  const chooser = page.waitForEvent('filechooser');
  await page.locator('#btn-project-open').click();
  await (await chooser).setFiles({ name, mimeType: 'application/json', buffer });
}

async function downloadedJson(page, selector) {
  const event = page.waitForEvent('download');
  await page.locator(selector).click();
  const download = await event;
  assert.equal(await download.failure(), null, 'the browser completed the download');
  const path = await download.path();
  assert.ok(path, 'the actual download has readable bytes');
  return { value: JSON.parse(readFileSync(path, 'utf8')), name: download.suggestedFilename() };
}

async function navigate(page, section, mode) {
  await page.locator(`button[data-nav-toggle="${section}"]:visible`).click();
  await page.locator(`a[href="#/${section}/${mode}"]:visible`).click();
}

export default async function projectBackups(t) {
  const source = savedWork();
  const app = await t.open({ hash: '#/home', contextOptions: { acceptDownloads: true } });
  const { page } = app;
  page.setDefaultTimeout(30_000);
  t.log('scope: controlled browser-saved fixtures; visible export/import controls; no flight or learner-pass claim');
  await putFixture(page, source);
  await openBackups(page);
  const downloaded = await downloadedJson(page, '#btn-project-export');
  assert.match(downloaded.name, /\.orbitlab-project\.json$/);
  assert.equal(downloaded.value.format, 'orbitlab.project');
  assert.equal(downloaded.value.version, 1);
  assert.deepEqual(downloaded.value.data, source, 'all four browser-saved sections survive the actual download');
  assert.deepEqual(Object.keys(downloaded.value.data).sort(), Object.keys(KEYS).sort(), 'only documented sections are exported');
  assert.ok(!JSON.stringify(downloaded.value).includes('unrelated browser data'), 'unrelated storage stays out of the download');
  t.log('downloaded and verified all four saved sections; unrelated storage excluded');
  const backupBytes = Buffer.from(JSON.stringify(downloaded.value));

  // An already loaded browser with conflicting work is the important case:
  // a storage-only restore without page/model reload would leave stale UI.
  const existing = structuredClone(source);
  existing.mission.mission.payloadMass = 5000;
  existing.designs.designs[0].id = 'existing-satellite';
  existing.designs.designs[0].name = 'Existing browser satellite';
  existing.progress.lessons['orbit-first'] = { attempts: 4, hintsShown: 1, passed: false };
  existing.progress.customLessons = [];
  existing.notebook.experiments[0].title = 'Existing browser experiment';
  await putFixture(page, existing);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await app.ready();
  assert.equal(new URL(page.url()).hash, '#/home', 'the restore begins on the same home hash used after import');
  await openBackups(page);
  const before = await browserBytes(page);
  await upload(page, downloaded.name, backupBytes);
  await page.locator('.projects-preview').waitFor();
  assert.deepEqual(await browserBytes(page), before, 'opening a valid backup only previews; it makes no storage writes');
  const choices = page.locator('.projects-preview select[data-section]');
  assert.equal(await choices.count(), 4, 'preview shows all four supported sections');
  assert.deepEqual(await choices.evaluateAll((nodes) => nodes.map((node) => node.value)), ['keep', 'keep', 'keep', 'keep'],
    'every conflicting section defaults to Keep browser data');
  assert.equal(await page.locator('#btn-project-apply').isDisabled(), true, 'no overwrite is enabled before a replacement choice');
  const previewText = await page.locator('.projects-preview').innerText();
  assert.match(previewText, /Lessons: 1; assessments: 0; custom lessons: 1; custom questions: 0/);
  assert.match(previewText, /replaces its entire collection/);
  assert.match(previewText, /reloads the app/);

  for (const section of Object.keys(KEYS)) await page.locator(`select[data-section="${section}"]`).selectOption('replace');
  assert.deepEqual(await browserBytes(page), before, 'selecting replacement still leaves data untouched until Restore');
  // Keep both hash AND search unchanged here: navigating to the same URL
  // without location.reload would appear successful while retaining models.
  assert.equal(new URL(page.url()).search, '');
  await page.evaluate(() => { window.__projectBeforeReload = true; });
  const reloaded = page.waitForEvent('domcontentloaded', { timeout: 60_000 });
  await page.locator('#btn-project-apply').click();
  await reloaded;
  await app.ready();
  assert.equal(await page.evaluate(() => window.__projectBeforeReload), undefined, 'Restore really reloaded the document even though the home hash was unchanged');
  assert.equal(new URL(page.url()).search, '');
  assert.equal(new URL(page.url()).hash, '#/home');
  const restored = await browserBytes(page);
  for (const [section, key] of Object.entries(KEYS)) assert.deepEqual(JSON.parse(restored[key]), source[section], `${section} restored exactly`);
  assert.equal(restored[JOURNAL], null, 'the successful transaction cleared its recovery journal');
  assert.equal(restored[SENTINEL], before[SENTINEL], 'unrelated browser data survived restore');
  assert.match(await page.locator('#btn-lessons .lesson-badge').innerText(), /^1\//, 'lesson progress was reloaded into the live model');
  t.log('preview/default conflicts and same-URL restore passed; restored bytes and progress model verified');

  await openBackups(page);
  await page.locator('#work-tab-notebook').click();
  assert.match(await page.locator('.experiment-notebook select[data-focus="entries"]').innerText(), /Backup journey experiment/,
    'the notebook model reread restored entries');
  assert.ok(!(await page.locator('.experiment-notebook').innerText()).includes('Existing browser experiment'));
  await page.locator('#work-tab-backups').click();
  const intact = await browserBytes(page);
  for (const [name, bytes, notice] of [
    ['malformed.json', Buffer.from('{'), /does not match a supported project schema/],
    ['future.json', Buffer.from(JSON.stringify({ ...downloaded.value, version: 999 })), /newer project format/],
    ['invalid-progress.json', Buffer.from(JSON.stringify({ ...downloaded.value, data: { progress: { version: 1, lessons: null } } })), /does not match a supported project schema/],
    ['oversize.json', Buffer.alloc(8_000_001, 32), /8 MB limit/],
  ]) {
    await upload(page, name, bytes);
    await page.locator('.projects-status').filter({ hasText: notice }).waitFor();
    assert.equal(await page.locator('.projects-preview').count(), 0, `${name}: rejected file has no apply preview`);
    assert.deepEqual(await browserBytes(page), intact, `${name}: every original storage value stayed untouched`);
  }
  t.log('malformed, newer-version, invalid nested schema and oversized files all rejected without writes');

  // Independently test query cleanup. Using a query during the first import
  // would mask the same-URL regression above by forcing navigation anyway.
  await upload(page, downloaded.name, backupBytes);
  await page.locator('.projects-preview').waitFor();
  await page.locator('select[data-section="mission"]').selectOption('replace');
  const m = `j${Buffer.from(JSON.stringify(existing.mission)).toString('base64url')}`;
  const scenario = `j${Buffer.from(JSON.stringify({ format: 'orbitlab.lessons', version: 3, lessons: source.progress.customLessons })).toString('base64url')}`;
  await page.evaluate(({ m, scenario }) => {
    const address = new URL(location.href);
    address.searchParams.set('m', m); address.searchParams.set('scenario', scenario); address.searchParams.set('lesson', 'orbit-first');
    history.replaceState(null, '', address);
  }, { m, scenario });
  const queryReloaded = page.waitForEvent('domcontentloaded', { timeout: 60_000 });
  await page.locator('#btn-project-apply').click();
  await queryReloaded;
  await app.ready();
  assert.equal(new URL(page.url()).search, '', 'mission/scenario/lesson share parameters cannot replay over restored data');
  assert.equal(new URL(page.url()).hash, '#/home');
  const afterQueryRestore = await browserBytes(page);
  for (const [section, key] of Object.entries(KEYS)) assert.deepEqual(JSON.parse(afterQueryRestore[key]), source[section], `${section} survived query cleanup`);
  t.log('independent restore cleared mission/scenario/lesson queries');

  // Read the active mission through its visible export control, and the
  // saved design through its list. Storage equality alone is insufficient.
  await navigate(page, 'launch', 'engineer');
  const activeMission = await downloadedJson(page, '#btn-mission-save');
  assert.equal(activeMission.value.mission.payloadMass, source.mission.mission.payloadMass, 'the live setup reread the restored mission');
  assert.equal(activeMission.value.mission.vehicleId, source.mission.mission.vehicleId);
  await navigate(page, 'build', 'explore');
  await page.locator('[data-k="craft:satellite"]').click();
  await page.locator('.bsat-grid:not([hidden]) .bsat-store').filter({ hasText: 'Backup journey satellite' }).waitFor();
  assert.ok(!(await page.locator('.bsat-grid:not([hidden]) .bsat-store').innerText()).includes('Existing browser satellite'),
    'the design list reread the restored collection');
  app.checkErrors();
  t.log('actual backup download, four-section preview/conflicts, same-hash reload, restored models, query cleanup and four rejected files passed');
}
