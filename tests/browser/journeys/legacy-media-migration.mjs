/** M-PLATFORM-010 (D-68): uploaded audio from before learner profiles moves to the first learner one track at a
 * time in real IndexedDB. A colliding original stays in place, unowned, with both copies kept, and the learner is told. */
import assert from 'node:assert/strict';

export const timeoutMs = 300_000;

/** Every stored track as plain data: key, owner and the blob's text. */
const tracks = (page) => page.evaluate(() => new Promise((resolve, reject) => {
  const open = indexedDB.open('orbitlab-soundtracks'); open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    const db = open.result, read = db.transaction('tracks').objectStore('tracks').getAll();
    read.onerror = () => { db.close(); reject(read.error); };
    read.onsuccess = async () => {
      db.close();
      const rows = await Promise.all(read.result.map(async (row) => ({ id: row.id, profileId: row.profileId ?? null,
        missionId: row.missionId ?? null, name: row.name, t0: row.t0, text: await row.blob.text() })));
      resolve(rows.sort((a, b) => a.id.localeCompare(b.id)));
    };
  };
}));

export default async function legacyMediaMigration(t) {
  const app = await t.open({ hash: '#/lessons', contextOptions: { serviceWorkers: 'block' } });
  const { page } = app;
  // Seed from a same-origin page that is not the app, so no running document writes or holds anything meanwhile:
  // an install from before learner profiles, with three mission-keyed uploads, where the first learner
  // (legacy-v1) already has its own recording for one of those missions.
  await page.goto(`${t.base}build-info.json`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.evaluate(() => new Promise((resolve, reject) => {
    localStorage.clear(); sessionStorage.clear();
    const open = indexedDB.open('orbitlab-soundtracks', 1); open.onerror = () => reject(open.error);
    open.onupgradeneeded = () => open.result.createObjectStore('tracks', { keyPath: 'id' });
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction('tracks', 'readwrite'), store = tx.objectStore('tracks');
      const audio = (text) => new Blob([text], { type: 'audio/wav' });
      store.clear();
      store.put({ id: 'apollo-11', blob: audio('original apollo'), t0: 5, name: 'apollo.wav' });
      store.put({ id: 'soyuz-ms', blob: audio('original soyuz'), t0: 60, name: 'soyuz.wav' });
      store.put({ id: 'artemis-1', blob: audio('original artemis'), t0: 9, name: 'artemis.wav' });
      store.put({ id: 'legacy-v1:soyuz-ms', profileId: 'legacy-v1', missionId: 'soyuz-ms', blob: audio('own soyuz'), t0: 2, name: 'own.wav' });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }));
  await app.goto('#/lessons');
  assert.equal(await page.locator('#btn-profile').getAttribute('data-profile-status'), 'durable');
  const catalogue = () => page.evaluate(() => JSON.parse(localStorage.getItem('orbitlab.profiles.catalog.v1')));
  assert.equal((await catalogue()).legacyId, 'legacy-v1');
  assert.equal((await catalogue()).mediaMigrated, true, 'the migration is finished, so later starts do not walk the media store again');
  assert.deepEqual(await tracks(page), [
    { id: 'legacy-v1:apollo-11', profileId: 'legacy-v1', missionId: 'apollo-11', name: 'apollo.wav', t0: 5, text: 'original apollo' },
    { id: 'legacy-v1:artemis-1', profileId: 'legacy-v1', missionId: 'artemis-1', name: 'artemis.wav', t0: 9, text: 'original artemis' },
    { id: 'legacy-v1:soyuz-ms', profileId: 'legacy-v1', missionId: 'soyuz-ms', name: 'own.wav', t0: 2, text: 'own soyuz' },
    { id: 'soyuz-ms', profileId: null, missionId: null, name: 'soyuz.wav', t0: 60, text: 'original soyuz' },
  ], 'non-colliding uploads moved; both colliding copies kept unchanged and the original left unowned');
  const notice = page.locator('#profile-storage-notice');
  assert.equal(await notice.isVisible(), true);
  assert.match(await notice.innerText(), /Some original audio was not moved: this learner already has audio for that mission\. Both copies are kept\./);
  t.log('Legacy uploads moved one by one; the colliding original kept in place and explained');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 }); await app.ready();
  assert.equal(await notice.isHidden(), true, 'a finished migration has nothing left to retry or report');
  assert.equal((await tracks(page)).length, 4);
  t.log('The next start leaves the media store as it is');
  app.checkErrors();
}
