/**
 * The Structure section's record in a learner's profile, through the profile
 * repository the app binds (src/workspace/repository.ts): a stored record the
 * section cannot read is written over only after the repository has set the
 * old copy aside, byte for byte — what the section tells the learner
 * (`store.damaged`). Read and written through the storage the app gives the
 * section (`structureEnv().storage`, src/ui/structure-loader.ts), which is
 * what the section's own save goes through (src/ui/structure/store.ts
 * `save`): a write kept, a read-only profile's refusal and a browser's
 * refusal each told apart.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceError, WorkspaceRepository, type WorkspaceLocks } from '../src/workspace/repository';
import { bindWorkspaceStorage, workspaceStorage } from '../src/workspace/storage';
import { STRUCTURE_STORE_KEY, freshProgress, readProgress, writeProgress } from '../src/structure/progress';
import { SOYUZ_ASSEMBLY } from '../src/structure/soyuz';
import { EDUSAT_ASSEMBLY } from '../src/structure/edusat';
import { StructureStore } from '../src/ui/structure/store';
import { STRUCTURE_PROFILE_KEY, structureEnv, type StructureLoaderHost } from '../src/ui/structure-loader';
import { loadedAdapters } from './structure-harness';

const QUARANTINE = 'orbitlab.import.quarantine.v1';
const specs = { 'soyuz-st31': SOYUZ_ASSEMBLY, edusat: EDUSAT_ASSEMBLY };
/** The storage the app hands the section (its other doors are not gone through here). */
const storage = () => structureEnv({} as StructureLoaderHost).storage;

beforeEach(() => { vi.stubGlobal('addEventListener', () => {}); });
afterEach(() => { vi.unstubAllGlobals(); });

function memory() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
const locks: WorkspaceLocks = { request: async (_name, _options, run) => run({}) };
async function profile() {
  const repo = await new WorkspaceRepository(memory(), memory(), locks).initialize();
  const binding = repo.binding!;
  bindWorkspaceStorage(binding, (fn) => repo.registerFlush(fn), (write) => ({ ...binding.token(write), durable: true }));
  return repo;
}

describe('the Structure section\'s record in the profile', () => {
  for (const damaged of ['{not json', '[1,2]', '{"version":"1"}', '{"version":0}', '{"version":1,"model":"edusat",']) {
    it(`sets aside a record it cannot read before writing over it: ${damaged}`, async () => {
      const repo = await profile();
      repo.binding!.setItem(STRUCTURE_STORE_KEY, damaged);
      expect(STRUCTURE_PROFILE_KEY).toBe(STRUCTURE_STORE_KEY);
      const read = readProgress(storage().read(), specs);
      expect(read).toMatchObject({ writable: true, note: 'damaged' });
      // the section's save, through the storage the app gives it
      expect(storage().write(writeProgress(read.progress))).toBe('ok');
      expect(readProgress(workspaceStorage().getItem(STRUCTURE_STORE_KEY), specs)).toEqual({ progress: freshProgress(), writable: true, note: null });
      expect(JSON.parse(workspaceStorage().getItem(QUARANTINE)!).entries).toContainEqual({ key: STRUCTURE_STORE_KEY, raw: damaged });
      repo.close();
    });
  }

  it('leaves a newer version\'s record alone (the section does not write while it is there)', async () => {
    const repo = await profile();
    const newer = JSON.stringify({ version: 2, model: 'edusat', future: { kept: true } });
    repo.binding!.setItem(STRUCTURE_STORE_KEY, newer);
    // the section itself, on the app's storage: it reads the note, works, and its saves leave the record as it was
    const env = { ...structureEnv({} as StructureLoaderHost), go: () => {}, href: () => '#' };
    const store = new StructureStore(env, await loadedAdapters(env));
    expect(store.storeNote).toBe('newer');
    store.open('explore', 'edusat', 'assemble');
    store.hold('frame');
    store.save();
    expect(workspaceStorage().getItem(STRUCTURE_STORE_KEY)).toBe(newer);
    repo.close();
  });

  it('refuses a read-only tab\'s write with the profile\'s own error, which the section says as such', async () => {
    const disk = memory(), first = await new WorkspaceRepository(disk, memory(), { request: async (_n, _o, run) => run({}) }).initialize();
    // a second tab on the same learner: the lock is held, so its binding is read-only
    const second = await new WorkspaceRepository(disk, memory(), { request: async (_n, _o, run) => run(null) }).initialize();
    expect(() => second.binding!.setItem(STRUCTURE_STORE_KEY, writeProgress(freshProgress()))).toThrow(WorkspaceError);
    try { second.binding!.setItem(STRUCTURE_STORE_KEY, '{}'); } catch (error) { expect((error as WorkspaceError).code).toBe('locked'); }
    // through the section's storage that refusal is 'readonly' (the learner is told another tab holds the profile), not a failure of the browser's
    const binding = second.binding!;
    bindWorkspaceStorage(binding, (fn) => second.registerFlush(fn), (write) => ({ ...binding.token(write), durable: true }));
    expect(storage().write(writeProgress(freshProgress()))).toBe('readonly');
    first.close(); second.close();
  });

  it('tells a profile that takes no writes from a browser that refuses one, and reads nothing where nothing can be read', () => {
    // no learner chosen: the app's storage refuses in its own words
    bindWorkspaceStorage(null, () => () => {}, () => ({ durable: false }) as never);
    expect(storage().write('{}')).toBe('readonly');
    expect(storage().read()).toBeNull();
    // the browser refusing the write (full, blocked)
    const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => {} };
    bindWorkspaceStorage(full, () => () => {}, () => ({ durable: false }) as never);
    expect(storage().write('{}')).toBe('failed');
  });
});
