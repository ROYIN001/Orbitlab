import { afterEach, describe, expect, it, vi } from 'vitest';
import { profileMedia, trackKey } from '../src/workspace/media';
import { migrateLegacyMedia, deleteProfileMedia } from '../src/workspace/media-ownership';
import { previewMediaArchive, exportProfileMediaArchive, importProfileMediaArchive, MEDIA_MAX_BYTES } from '../src/workspace/media-archive';
import { bindWorkspaceStorage } from '../src/workspace/storage';
import { saveUserSoundtrack, loadUserSoundtrack, removeUserSoundtrack } from '../src/audio/soundtrack';
import { WorkspaceRepository, type WorkspaceLocks } from '../src/workspace/repository';

/** A transactional IndexedDB test double, retaining Blob bytes and running request callbacks before commit. */
function database() {
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
        put: (value: Record<string, unknown>) => request(() => { working.set(value.id as string, value); return value.id; }),
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
