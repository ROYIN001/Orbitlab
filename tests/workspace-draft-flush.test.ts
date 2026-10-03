import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceRepository, type WorkspaceLocks } from '../src/workspace/repository';
import { bindWorkspaceStorage } from '../src/workspace/storage';
import { SatelliteWorkspace } from '../src/ui/build/satellite-workspace';
import { SATELLITE_DRAFT_KEY, designFromTemplate } from '../src/design/satellite-model';
const callbacks = new Map<string, (() => void)[]>();
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('addEventListener', (kind: string, callback: () => void) => { const list = callbacks.get(kind) ?? []; list.push(callback); callbacks.set(kind, list); });
});
afterEach(() => { callbacks.clear(); vi.useRealTimers(); vi.unstubAllGlobals(); });
function memory() {
  const values = new Map<string, string>(); let denied = false;
  return { values, deny(value: boolean) { denied = value; }, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { if (denied) throw new Error('Quota'); values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
const locks: WorkspaceLocks = { request: async (_name, _options, run) => run({}) };
async function workspace() {
  const disk = memory(), session = memory(), repo = await new WorkspaceRepository(disk, session, locks).initialize(), binding = repo.binding!;
  bindWorkspaceStorage(binding, (fn) => repo.registerFlush(fn), (write) => ({ ...binding.token(write), durable: true }));
  return { disk, session, repo };
}
const future = '{ "v": 99, "unrecognized": "preserve exact whitespace and future bytes" }';

describe('personal draft writes only after actual edits', () => {
  it('does not replace an untouched unsupported satellite draft on construction, backup, timer advancement or pagehide', async () => {
    const { repo } = await workspace(); repo.binding!.setItem(SATELLITE_DRAFT_KEY, future); new SatelliteWorkspace();
    await repo.prepareChange(); vi.advanceTimersByTime(1000); for (const call of callbacks.get('pagehide') ?? []) call();
    expect(repo.exportProfile().profiles[0].values[SATELLITE_DRAFT_KEY]).toBe(future);
    expect(repo.binding!.getItem('orbitlab.import.quarantine.v1')).toBeNull(); repo.close();
  });
  it('blocks switching on a failed actual satellite edit, then retries and preserves the original unsupported bytes', async () => {
    const { repo, disk } = await workspace(); repo.binding!.setItem(SATELLITE_DRAFT_KEY, future); const other = await repo.create('Other');
    const editor = new SatelliteWorkspace(); editor.rename('My actual edit'); disk.deny(true);
    await expect(repo.select(other.id)).rejects.toThrow('Quota'); expect(repo.binding!.valid).toBe(true);
    expect(repo.binding!.getItem(SATELLITE_DRAFT_KEY)).toBe(future);
    disk.deny(false); await repo.prepareChange();
    expect(JSON.parse(repo.binding!.getItem(SATELLITE_DRAFT_KEY)!).design.name).toBe('My actual edit');
    expect(JSON.parse(repo.binding!.getItem('orbitlab.import.quarantine.v1')!).entries).toContainEqual({ key: SATELLITE_DRAFT_KEY, raw: future }); repo.close();
  });
  it('strictly flushes a pending personal edit from the put-aside desk while a temporary lesson is open', async () => {
    const { repo } = await workspace(); const editor = new SatelliteWorkspace(); editor.rename('Personal pending edit');
    editor.enterLesson({ start: designFromTemplate('napa2', 'lesson-desk', 'Temporary lesson'), date: '2026-10-03', level: editor.activityLevel, locked: [] });
    editor.rename('Temporary lesson edit'); await repo.prepareChange();
    expect(JSON.parse(repo.binding!.getItem(SATELLITE_DRAFT_KEY)!).design.name).toBe('Personal pending edit'); repo.close();
  });
  it('never stores a temporary lesson edit over an untouched unsupported personal draft', async () => {
    const { repo } = await workspace(); repo.binding!.setItem(SATELLITE_DRAFT_KEY, future); const editor = new SatelliteWorkspace();
    editor.enterLesson({ start: designFromTemplate('napa2', 'lesson-desk', 'Temporary lesson'), date: '2026-10-03', level: editor.activityLevel, locked: [] });
    editor.rename('Temporary edit'); await repo.prepareChange(); vi.advanceTimersByTime(1000);
    expect(repo.binding!.getItem(SATELLITE_DRAFT_KEY)).toBe(future); repo.close();
  });
});
