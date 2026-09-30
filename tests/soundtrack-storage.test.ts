import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadUserSoundtrack, removeUserSoundtrack, saveUserSoundtrack } from '../src/audio/soundtrack';

type Callback = (() => void) | null;
const flush = async () => { await new Promise((resolve) => setTimeout(resolve, 0)); };
function indexedDb() {
  const request = { result: undefined as unknown, error: null as Error | null, onsuccess: null as Callback, onerror: null as Callback };
  const store = { put: vi.fn(() => request), get: vi.fn(() => request), delete: vi.fn(() => request) };
  const transaction = { error: null as Error | null, oncomplete: null as Callback, onabort: null as Callback, onerror: null as Callback,
    objectStore: vi.fn(() => store), abort: vi.fn() };
  const database = { transaction: vi.fn(() => transaction), close: vi.fn() };
  vi.stubGlobal('indexedDB', { open() {
    const opening = { result: database, onsuccess: null as Callback, onerror: null as Callback };
    queueMicrotask(() => opening.onsuccess?.()); return opening;
  } });
  return { request, transaction, database, store };
}
function observe<T>(promise: Promise<T>) {
  const result: { state: 'pending' | 'fulfilled' | 'rejected'; value?: T; error?: unknown } = { state: 'pending' };
  void promise.then((value) => { result.state = 'fulfilled'; result.value = value; }, (error: unknown) => { result.state = 'rejected'; result.error = error; });
  return result;
}
afterEach(() => vi.unstubAllGlobals());

describe('recording storage transaction results', () => {
  it('does not announce a save before the transaction commits, then closes its connection', async () => {
    const db = indexedDb(), saved = observe(saveUserSoundtrack('soyuzIss', new Blob(['qa']), 'qa.mp3', 60));
    await flush(); db.request.result = 'soyuzIss'; db.request.onsuccess?.(); await flush();
    expect(saved.state).toBe('pending'); expect(db.database.close).not.toHaveBeenCalled();
    db.transaction.oncomplete?.(); await flush();
    expect(saved.state).toBe('fulfilled'); expect(db.database.close).toHaveBeenCalledTimes(1);
  });

  it('rejects a late transaction abort even after the write request succeeded', async () => {
    const db = indexedDb(), saved = observe(saveUserSoundtrack('soyuzIss', new Blob(['qa']), 'qa.mp3', 60));
    await flush(); db.request.onsuccess?.(); await flush();
    const failure = new Error('commit aborted'); db.transaction.error = failure; db.transaction.onabort?.(); await flush();
    expect(saved).toMatchObject({ state: 'rejected', error: failure }); expect(db.database.close).toHaveBeenCalledTimes(1);
  });

  it('propagates deletion errors and closes once even when error is followed by abort', async () => {
    const db = indexedDb(), removed = observe(removeUserSoundtrack('soyuzIss')); await flush();
    const failure = new Error('delete denied'); db.request.error = failure;
    db.request.onerror?.(); db.transaction.onerror?.(); db.transaction.onabort?.(); await flush();
    expect(removed).toMatchObject({ state: 'rejected', error: failure }); expect(db.database.close).toHaveBeenCalledTimes(1);
  });

  it('accepts a committed delete whose request result is undefined', async () => {
    const db = indexedDb(), removed = observe(removeUserSoundtrack('soyuzIss')); await flush();
    db.request.onsuccess?.(); db.transaction.oncomplete?.(); await flush();
    expect(removed).toEqual({ state: 'fulfilled', value: undefined }); expect(db.database.close).toHaveBeenCalledTimes(1);
  });

  it('returns the read result only after transaction completion', async () => {
    const db = indexedDb(), loaded = observe(loadUserSoundtrack('soyuzIss')); await flush();
    const track = { id: 'soyuzIss', name: 'qa.mp3', blob: new Blob(['qa']), t0: 60 };
    db.request.result = track; db.request.onsuccess?.(); await flush();
    expect(loaded.state).toBe('pending'); db.transaction.oncomplete?.(); await flush();
    expect(loaded).toEqual({ state: 'fulfilled', value: track }); expect(db.database.close).toHaveBeenCalledTimes(1);
  });

  it('keeps the no-user-track fallback for a failed read', async () => {
    const db = indexedDb(), loaded = observe(loadUserSoundtrack('soyuzIss')); await flush();
    db.request.error = new Error('read denied'); db.request.onerror?.(); db.transaction.onerror?.(); await flush();
    expect(loaded).toEqual({ state: 'fulfilled', value: null }); expect(db.database.close).toHaveBeenCalledTimes(1);
  });

  it('keeps graceful reads when IndexedDB is unavailable, but rejects writes and removals', async () => {
    vi.stubGlobal('indexedDB', undefined);
    expect(await loadUserSoundtrack('soyuzIss')).toBeNull();
    await expect(saveUserSoundtrack('soyuzIss', new Blob(['qa']), 'qa.mp3', 60)).rejects.toThrow();
    await expect(removeUserSoundtrack('soyuzIss')).rejects.toThrow();
  });

  it.each(['transaction', 'request'] as const)('closes a connection when %s setup throws synchronously', async (phase) => {
    const db = indexedDb(), failure = new Error('synchronous storage failure');
    if (phase === 'transaction') db.database.transaction.mockImplementation(() => { throw failure; });
    else db.store.put.mockImplementation(() => { throw failure; });
    await expect(saveUserSoundtrack('soyuzIss', new Blob(['qa']), 'qa.mp3', 60)).rejects.toBe(failure);
    expect(db.database.close).toHaveBeenCalledTimes(1);
    if (phase === 'request') expect(db.transaction.abort).toHaveBeenCalledTimes(1);
  });
});
