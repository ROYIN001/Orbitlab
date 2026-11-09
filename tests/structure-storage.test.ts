/**
 * The Structure section's record in a learner's profile, through the profile
 * repository the app binds (src/workspace/repository.ts): a stored record the
 * section cannot read is written over only after the repository has set the
 * old copy aside, byte for byte — what the section tells the learner
 * (`store.damaged`) — and the write goes through `workspaceStorage()`, as
 * the section's own save does (src/ui/structure/structure-screen.ts `saveNow`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceError, WorkspaceRepository, type WorkspaceLocks } from '../src/workspace/repository';
import { bindWorkspaceStorage, workspaceStorage } from '../src/workspace/storage';
import { STRUCTURE_STORE_KEY, freshProgress, readProgress, writeProgress } from '../src/structure/progress';
import { SOYUZ_ASSEMBLY } from '../src/structure/soyuz';
import { EDUSAT_ASSEMBLY } from '../src/structure/edusat';

const QUARANTINE = 'orbitlab.import.quarantine.v1';
const specs = { 'soyuz-st31': SOYUZ_ASSEMBLY, edusat: EDUSAT_ASSEMBLY };

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
      const read = readProgress(workspaceStorage().getItem(STRUCTURE_STORE_KEY), specs);
      expect(read).toMatchObject({ writable: true, note: 'damaged' });
      // the section's save, as `saveNow` makes it
      workspaceStorage().setItem(STRUCTURE_STORE_KEY, writeProgress(read.progress));
      expect(readProgress(workspaceStorage().getItem(STRUCTURE_STORE_KEY), specs)).toEqual({ progress: freshProgress(), writable: true, note: null });
      expect(JSON.parse(workspaceStorage().getItem(QUARANTINE)!).entries).toContainEqual({ key: STRUCTURE_STORE_KEY, raw: damaged });
      repo.close();
    });
  }

  it('leaves a newer version\'s record alone (the section does not write while it is there)', async () => {
    const repo = await profile();
    const newer = JSON.stringify({ version: 2, model: 'edusat', future: { kept: true } });
    repo.binding!.setItem(STRUCTURE_STORE_KEY, newer);
    expect(readProgress(workspaceStorage().getItem(STRUCTURE_STORE_KEY), specs)).toMatchObject({ writable: false, note: 'newer' });
    expect(workspaceStorage().getItem(STRUCTURE_STORE_KEY)).toBe(newer);
    repo.close();
  });

  it('refuses a read-only tab\'s write with the profile\'s own error, which the section says as such', async () => {
    const disk = memory(), first = await new WorkspaceRepository(disk, memory(), { request: async (_n, _o, run) => run({}) }).initialize();
    // a second tab on the same learner: the lock is held, so its binding is read-only
    const second = await new WorkspaceRepository(disk, memory(), { request: async (_n, _o, run) => run(null) }).initialize();
    expect(() => second.binding!.setItem(STRUCTURE_STORE_KEY, writeProgress(freshProgress()))).toThrow(WorkspaceError);
    try { second.binding!.setItem(STRUCTURE_STORE_KEY, '{}'); } catch (error) { expect((error as WorkspaceError).code).toBe('locked'); }
    first.close(); second.close();
  });
});
