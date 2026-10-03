/** One IndexedDB transaction owns each media migration/delete. Profile JSON and media are separate stores. */
export const MEDIA_DATABASE = 'orbitlab-soundtracks';
export const MEDIA_STORE = 'tracks';
export interface ProfileTrack { id: string; profileId: string; missionId: string; blob: Blob; t0: number; name: string }
export const trackKey = (profileId: string, missionId: string): string => `${profileId}:${missionId}`;
export function openMediaDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(MEDIA_DATABASE, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function mediaTransaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openMediaDatabase();
  return new Promise((resolve, reject) => {
    let tx: IDBTransaction | undefined, result: T, settled = false;
    const fail = (error: unknown) => { if (settled) return; settled = true; db.close(); reject(error); };
    try {
      tx = db.transaction(MEDIA_STORE, mode);
      const req = run(tx.objectStore(MEDIA_STORE));
      req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => { if (settled) return; settled = true; db.close(); resolve(result); };
      tx.onerror = tx.onabort = () => fail(tx!.error ?? req.error ?? new Error('Media storage failed'));
    } catch (error) { try { tx?.abort(); } catch { /* inactive */ } fail(error); }
  });
}
export async function profileMedia(profileId: string): Promise<ProfileTrack[]> {
  const rows = await mediaTransaction<ProfileTrack[]>('readonly', (store) => store.getAll());
  return rows.filter((row) => row.profileId === profileId);
}
