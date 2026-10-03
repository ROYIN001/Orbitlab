/** Destructive ownership operations load only for a pending migration/deletion, never with the application shell. */
import { openMediaDatabase, trackKey, MEDIA_STORE } from './media';

async function mutateTracks(run: (store: IDBObjectStore, value: Record<string, unknown>) => void): Promise<void> {
  const db = await openMediaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readwrite'), store = tx.objectStore(MEDIA_STORE), cursor = store.openCursor();
    cursor.onsuccess = () => { const c = cursor.result; if (c) { run(store, c.value as Record<string, unknown>); c.continue(); } };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? cursor.error ?? new Error('Media transaction failed')); };
  });
}
/** Atomic, idempotent transfer; already-owned records are never reassigned. */
export async function migrateLegacyMedia(profileId: string): Promise<void> {
  await mutateTracks((store, value) => {
    if (typeof value.id !== 'string' || typeof value.profileId === 'string') return;
    const id = trackKey(profileId, value.id);
    const req = store.get(id);
    req.onsuccess = () => {
      if (req.result !== undefined) { store.transaction.abort(); return; }
      store.put({ ...value, id, missionId: value.id, profileId });
      store.delete(value.id as string);
    };
  });
}
export async function deleteProfileMedia(profileId: string): Promise<void> {
  await mutateTracks((store, value) => { if (value.profileId === profileId && typeof value.id === 'string') store.delete(value.id); });
}
