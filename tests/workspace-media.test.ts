import { afterEach, describe, expect, it, vi } from 'vitest';
import { profileMedia, trackKey } from '../src/workspace/media';
import { migrateLegacyMedia, deleteProfileMedia } from '../src/workspace/media-ownership';
import { previewMediaArchive, exportProfileMediaArchive, importProfileMediaArchive, MEDIA_MAX_BYTES } from '../src/workspace/media-archive';
import { bindWorkspaceStorage } from '../src/workspace/storage';
import { saveUserSoundtrack, loadUserSoundtrack, removeUserSoundtrack } from '../src/audio/soundtrack';
import { WorkspaceRepository, LEGACY_PROFILE_ID, PROFILE_CATALOG_KEY, type WorkspaceLocks, type WorkspaceMedia } from '../src/workspace/repository';

/** A transactional IndexedDB test double, retaining Blob bytes and running request callbacks before commit.
 * `refusePut` makes a put fail and abort its transaction, as a quota error does in a browser. */
function database(refusePut?: (value: Record<string, unknown>) => boolean) {
  const rows = new Map<string, Record<string, unknown>>();
  vi.stubGlobal('indexedDB', { open() {
    const request = { result: { close() {}, transaction(_store: string, mode: string) {
      let aborted = false, pending = 0;
      const working = new Map(rows);
      const tx = { error: null as Error | null, oncomplete: null as (() => void) | null, onabort: null as (() => void) | null,
        onerror: null as (() => void) | null, objectStore: () => store,
        abort() { aborted = true; tx.error = new Error('aborted'); queueMicrotask(() => tx.onabort?.()); } };
      function request<T>(operation: () => T) {
        pending++;
        const req = { result: undefined as T | undefined, error: null, onsuccess: null as (() => void) | null, onerror: null as (() => void) | null };
        queueMicrotask(() => {
          if (!aborted) { req.result = operation(); req.onsuccess?.(); }
          pending--;
          queueMicrotask(() => { if (pending === 0 && !aborted) { if (mode === 'readwrite') { rows.clear(); for (const [k, v] of working) rows.set(k, v); } tx.oncomplete?.(); } });
        });
        return req;
      }
      const store = {
        transaction: tx,
        get: (key: string) => request(() => working.get(key)),
        put: (value: Record<string, unknown>) => request(() => {
          if (refusePut?.(value)) { tx.abort(); return undefined; }
          working.set(value.id as string, value); return value.id;
        }),
        delete: (key: string) => request(() => { working.delete(key); return undefined; }),
        getAll: () => request(() => [...working.values()]), count: () => request(() => working.size),
        openCursor() {
          const entries = [...working.entries()]; let position = 0;
          pending++;
          const req = { result: null as { value: Record<string, unknown>; continue(): void } | null, error: null,
            onsuccess: null as (() => void) | null, onerror: null as (() => void) | null };
          const advance = () => { queueMicrotask(() => {
            if (aborted) { pending--; return; }
            const entry = entries[position++];
            if (entry) req.result = { value: entry[1], continue: advance };
            else { req.result = null; pending--; }
            req.onsuccess?.();
            if (!entry) queueMicrotask(() => { if (pending === 0 && !aborted) { rows.clear(); for (const [k, v] of working) rows.set(k, v); tx.oncomplete?.(); } });
          }); };
          advance(); return req;
        },
      };
      return tx;
    } }, onsuccess: null as (() => void) | null, onerror: null as (() => void) | null };
    queueMicrotask(() => request.onsuccess?.()); return request;
  } });
  return rows;
}
function localMemory() {
  const values = new Map<string, string>();
  return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
}
const locks: WorkspaceLocks = { request: async (_name, _options, run) => run({}) };
afterEach(() => vi.unstubAllGlobals());

describe('owned user recordings and separate binary archives', () => {
  it('atomically migrates legacy mission-only ownership and deletes exactly one owner', async () => {
    const rows = database();
    rows.set('soyuzIss', { id: 'soyuzIss', blob: new Blob(['legacy']), t0: 60, name: 'legacy.mp3' });
    rows.set('B:soyuzIss', { id: 'B:soyuzIss', profileId: 'B', missionId: 'soyuzIss', blob: new Blob(['other']), t0: 2, name: 'other.mp3' });
    await migrateLegacyMedia('A'); expect(rows.has('soyuzIss')).toBe(false);
    expect(await (rows.get('A:soyuzIss')!.blob as Blob).text()).toBe('legacy');
    await migrateLegacyMedia('A'); expect(rows.size).toBe(2);
    await deleteProfileMedia('A'); expect(rows.has('A:soyuzIss')).toBe(false); expect(rows.has('B:soyuzIss')).toBe(true);
  });
  it('aborts legacy migration on a destination collision without discarding either original', async () => {
    const rows = database();
    rows.set('soyuzIss', { id: 'soyuzIss', blob: new Blob(['legacy']), t0: 60, name: 'legacy' });
    rows.set('A:soyuzIss', { id: 'A:soyuzIss', profileId: 'A', missionId: 'soyuzIss', blob: new Blob(['owned']), t0: 2, name: 'owned' });
    await expect(migrateLegacyMedia('A')).rejects.toThrow(); expect(rows.size).toBe(2);
    expect(await (rows.get('soyuzIss')!.blob as Blob).text()).toBe('legacy');
  });
  it('M-PLATFORM-010 (D-68): moves the non-colliding legacy recordings one by one and leaves the colliding original in place, unowned', async () => {
    const rows = database();
    const legacy = (id: string, text: string) => ({ id, blob: new Blob([text]), t0: 60, name: `${text}.mp3` });
    rows.set('apollo11', legacy('apollo11', 'apollo'));
    rows.set('soyuzIss', legacy('soyuzIss', 'legacy'));
    rows.set('artemis1', legacy('artemis1', 'artemis'));
    rows.set('A:soyuzIss', { id: 'A:soyuzIss', profileId: 'A', missionId: 'soyuzIss', blob: new Blob(['owned']), t0: 2, name: 'owned.mp3' });
    rows.set('B:apollo11', { id: 'B:apollo11', profileId: 'B', missionId: 'apollo11', blob: new Blob(['other']), t0: 3, name: 'other.mp3' });
    const original = rows.get('soyuzIss'), owned = rows.get('A:soyuzIss'), other = rows.get('B:apollo11');
    await expect(migrateLegacyMedia('A')).resolves.toBe(1);
    const mine = await profileMedia('A');
    expect(mine.map((track) => track.missionId).sort()).toEqual(['apollo11', 'artemis1', 'soyuzIss']);
    expect(mine.find((track) => track.missionId === 'apollo11')).toMatchObject({ id: 'A:apollo11', profileId: 'A', t0: 60, name: 'apollo.mp3' });
    expect(await (rows.get('A:apollo11')!.blob as Blob).text()).toBe('apollo');
    expect(await (rows.get('A:artemis1')!.blob as Blob).text()).toBe('artemis');
    expect(rows.has('apollo11')).toBe(false); expect(rows.has('artemis1')).toBe(false);
    // Neither colliding copy is deleted, rewritten or given an owner; another learner's audio is untouched.
    expect(rows.get('soyuzIss')).toBe(original); expect(rows.get('soyuzIss')!.profileId).toBeUndefined();
    expect(rows.get('A:soyuzIss')).toBe(owned); expect(rows.get('B:apollo11')).toBe(other);
    expect(await (rows.get('soyuzIss')!.blob as Blob).text()).toBe('legacy');
    expect(await (rows.get('A:soyuzIss')!.blob as Blob).text()).toBe('owned');
    expect(rows.size).toBe(5);
    await expect(migrateLegacyMedia('A')).resolves.toBe(1); expect(rows.size).toBe(5); expect(rows.get('soyuzIss')).toBe(original);
  });
  it('M-PLATFORM-010 (D-68): one failed move keeps that original and does not undo the others; a retry moves the rest', async () => {
    let refuse = true;
    const rows = database((value) => refuse && value.id === 'A:artemis1');
    rows.set('apollo11', { id: 'apollo11', blob: new Blob(['apollo']), t0: 1, name: 'apollo.mp3' });
    rows.set('artemis1', { id: 'artemis1', blob: new Blob(['artemis']), t0: 2, name: 'artemis.mp3' });
    rows.set('vostok1', { id: 'vostok1', blob: new Blob(['vostok']), t0: 3, name: 'vostok.mp3' });
    await expect(migrateLegacyMedia('A')).rejects.toThrow();
    expect([...rows.keys()].sort()).toEqual(['A:apollo11', 'A:vostok1', 'artemis1']);
    expect(await (rows.get('artemis1')!.blob as Blob).text()).toBe('artemis');
    refuse = false;
    await expect(migrateLegacyMedia('A')).resolves.toBe(0);
    expect([...rows.keys()].sort()).toEqual(['A:apollo11', 'A:artemis1', 'A:vostok1']);
  });
  it('M-PLATFORM-010 (D-68): a start with one colliding recording finishes the migration, says so once and does not walk the media store again', async () => {
    const rows = database();
    rows.set('apollo11', { id: 'apollo11', blob: new Blob(['apollo']), t0: 1, name: 'apollo.mp3' });
    rows.set('soyuzIss', { id: 'soyuzIss', blob: new Blob(['legacy']), t0: 60, name: 'legacy.mp3' });
    rows.set('artemis1', { id: 'artemis1', blob: new Blob(['artemis']), t0: 2, name: 'artemis.mp3' });
    const own = trackKey(LEGACY_PROFILE_ID, 'soyuzIss');
    rows.set(own, { id: own, profileId: LEGACY_PROFILE_ID, missionId: 'soyuzIss', blob: new Blob(['owned']), t0: 2, name: 'owned.mp3' });
    let runs = 0;
    const media: WorkspaceMedia = { migrate: async (id) => { runs++; return migrateLegacyMedia(id); }, delete: deleteProfileMedia };
    const storage = localMemory(), session = localMemory();
    const first = await new WorkspaceRepository(storage, session, locks, media).initialize();
    expect(first.status).toBe('durable'); expect(runs).toBe(1);
    expect(JSON.parse(storage.getItem(PROFILE_CATALOG_KEY)!).mediaMigrated).toBe(true);
    expect(first.notices).toEqual(['media-collisions-kept']);
    expect((await profileMedia(LEGACY_PROFILE_ID)).map((track) => track.missionId).sort()).toEqual(['apollo11', 'artemis1', 'soyuzIss']);
    expect(await (rows.get('soyuzIss')!.blob as Blob).text()).toBe('legacy'); expect(await (rows.get(own)!.blob as Blob).text()).toBe('owned');
    first.close();
    const next = await new WorkspaceRepository(storage, session, locks, media).initialize();
    expect(runs).toBe(1); expect(next.notices).toEqual([]); expect(rows.size).toBe(4); next.close();
  });
  it('uses captured profile IDs for user upload/load/removal and does not touch another owner with the same mission/name', async () => {
    database(); const storage = localMemory(), session = localMemory(), repo = await new WorkspaceRepository(storage, session, locks).initialize();
    const a = repo.binding!;
    bindWorkspaceStorage(a, (fn) => repo.registerFlush(fn), (write) => ({ ...a.token(write), durable: true }));
    await saveUserSoundtrack('soyuzIss', new Blob(['A']), 'same.mp3', 60);
    expect(await (await loadUserSoundtrack('soyuzIss'))!.blob.text()).toBe('A');
    const b = await repo.create('B'); await repo.select(b.id);
    const next = await new WorkspaceRepository(storage, session, locks).initialize(), binding = next.binding!;
    bindWorkspaceStorage(binding, (fn) => next.registerFlush(fn), (write) => ({ ...binding.token(write), durable: true }));
    expect(await loadUserSoundtrack('soyuzIss')).toBeNull();
    await saveUserSoundtrack('soyuzIss', new Blob(['B']), 'same.mp3', 2); await removeUserSoundtrack('soyuzIss');
    expect((await profileMedia(a.profileId))).toHaveLength(1); expect((await profileMedia(binding.profileId))).toHaveLength(0);
    next.close();
  });
  it('round-trips binary bytes with explicit target ownership and Keep Existing default', async () => {
    const rows = database();
    rows.set(trackKey('A', 'soyuzIss'), { id: trackKey('A', 'soyuzIss'), profileId: 'A', missionId: 'soyuzIss', blob: new Blob([new Uint8Array([0, 255, 3])], { type: 'audio/mpeg' }), t0: 60, name: 'same.mp3' });
    const blob = await exportProfileMediaArchive('A', 'Learner A');
    const preview = await previewMediaArchive(blob); expect(preview.profileName).toBe('Learner A'); expect(preview.tracks).toHaveLength(1);
    const r = await new WorkspaceRepository(localMemory(), localMemory(), locks).initialize();
    const binding = r.binding!;
    expect(await importProfileMediaArchive(blob, binding)).toBe(1);
    const own = (await profileMedia(binding.profileId))[0]; expect([...new Uint8Array(await own.blob.arrayBuffer())]).toEqual([0, 255, 3]);
    expect(await importProfileMediaArchive(blob, binding)).toBe(0);
    expect(rows.has(trackKey('A', 'soyuzIss'))).toBe(true); r.close();
  });
  it('rejects unsupported/corrupt binary manifests and stale/temporary owners without importing bytes', async () => {
    database(); await expect(previewMediaArchive(new Blob(['bad']))).rejects.toThrow();
    const fake = { size: MEDIA_MAX_BYTES + 1 } as Blob; await expect(previewMediaArchive(fake)).rejects.toMatchObject({ code: 'oversize' });
    const r = await new WorkspaceRepository(localMemory(), localMemory(), locks).initialize(), bound = r.binding!;
    const blob = await exportProfileMediaArchive('missing', 'Empty'); await r.reset('all');
    await expect(importProfileMediaArchive(blob, bound)).rejects.toMatchObject({ code: 'stale' }); r.close();
    const temporary = await new WorkspaceRepository(localMemory(), localMemory()).initialize();
    await expect(importProfileMediaArchive(blob, temporary.binding!)).rejects.toMatchObject({ code: 'locked' }); temporary.close();
  });
});
