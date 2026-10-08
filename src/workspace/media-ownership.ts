/** Destructive ownership operations load only for a pending migration/deletion, never with the application shell. */
import { mediaTransaction, openMediaDatabase, trackKey, MEDIA_STORE } from './media';

async function mutateTracks(run: (store: IDBObjectStore, value: Record<string, unknown>) => void): Promise<void> {
  const db = await openMediaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readwrite'), store = tx.objectStore(MEDIA_STORE), cursor = store.openCursor();
    cursor.onsuccess = () => { const c = cursor.result; if (c) { run(store, c.value as Record<string, unknown>); c.continue(); } };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? cursor.error ?? new Error('Media transaction failed')); };
  });
}
/**
 * Moves legacy mission-only recordings to the owner one track at a time, each in its own transaction
 * (D-68, amending R1.1). A recording whose owned key is already taken stays where it is, unowned: neither copy
 * is changed or deleted. One failed move keeps that original and does not undo the others; it rejects after
 * every track was tried, so the next start retries only what is left. Resolves with the number left in place.
 * Idempotent; already-owned records are never reassigned.
 */
export async function migrateLegacyMedia(profileId: string): Promise<number> {
  const legacy = (await mediaTransaction<Record<string, unknown>[]>('readonly', (store) => store.getAll()))
    .flatMap((value) => typeof value.id === 'string' && typeof value.profileId !== 'string' ? [value.id] : []);
  if (!legacy.length) return 0;
  const db = await openMediaDatabase();
  let kept = 0, failure: unknown = null;
  for (const missionId of legacy) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(MEDIA_STORE, 'readwrite'), store = tx.objectStore(MEDIA_STORE), id = trackKey(profileId, missionId);
        const source = store.get(missionId), target = store.get(id);
        target.onsuccess = () => {
          const value = source.result as Record<string, unknown> | undefined;
          if (!value || typeof value.profileId === 'string') return;
          if (target.result !== undefined) { kept++; return; }
          store.put({ ...value, id, missionId, profileId });
          store.delete(missionId);
        };
        tx.oncomplete = () => resolve();
        tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('Media transaction failed'));
      });
    } catch (error) { failure ??= error; }
  }
  db.close();
  if (failure !== null) throw failure;
  return kept;
}
export async function deleteProfileMedia(profileId: string): Promise<void> {
  await mutateTracks((store, value) => { if (value.profileId === profileId && typeof value.id === 'string') store.delete(value.id); });
}
