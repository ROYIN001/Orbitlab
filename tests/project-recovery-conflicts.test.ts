import { describe, expect, it } from 'vitest';
import { missionDocument } from '../src/config/mission-file';
import { defaultMissionState } from '../src/lessons/config';
import {
  PROJECT_FORMAT, PROJECT_RECOVERY_KEY, PROJECT_STORAGE_KEYS, importProjectArchive, previewProjectImport,
  recoverProjectImport, type ProjectArchive, type ProjectStorage,
} from '../src/projects/archive';

describe('interrupted project recovery conflicts', () => {
  it('preserves newer browser work and its journal before any recovery write, even when an earlier section is recoverable', () => {
    const keys = PROJECT_STORAGE_KEYS;
    const values = new Map<string, string>([[keys.mission, 'original mission'], [keys.designs, 'original designs']]);
    const store: ProjectStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }, removeItem: (k) => { values.delete(k); } };
    let denied = false;
    const failing: ProjectStorage = { ...store,
      setItem: (k, v) => { if (k === keys.designs) denied = true; if (denied) throw new Error('Storage unavailable'); store.setItem(k, v); },
      removeItem: (k) => { if (denied) throw new Error('Storage unavailable'); store.removeItem(k); },
    };
    const archive: ProjectArchive = { format: PROJECT_FORMAT, version: 1, exportedAt: '2026-10-02T12:00:00.000Z',
      data: { mission: missionDocument(defaultMissionState()), designs: { version: 1, designs: [] } } };
    expect(() => importProjectArchive(previewProjectImport(archive, failing), ['mission', 'designs'], failing))
      .toThrowError(expect.objectContaining({ code: 'rollback' }));
    expect(values.get(keys.mission)).not.toBe('original mission');
    // The user continues working after storage becomes usable again. The
    // conflict is the second section, so checking and restoring in one loop
    // would incorrectly change the mission before noticing it.
    values.set(keys.designs, 'newly saved design work');
    const before = new Map(values);
    expect(() => recoverProjectImport(store)).toThrowError(expect.objectContaining({ code: 'recoveryConflict', section: 'designs' }));
    expect(values).toEqual(before);
    const journal = JSON.parse(values.get(PROJECT_RECOVERY_KEY)!);
    expect(journal.before).toEqual({ mission: 'original mission', designs: 'original designs' });
    expect(journal.after.mission).toBe(JSON.stringify(archive.data.mission));
  });

  it('refuses a later deletion while a journal is still importing', () => {
    const keys = PROJECT_STORAGE_KEYS;
    const values = new Map([[PROJECT_RECOVERY_KEY, JSON.stringify({ version: 1, phase: 'importing',
      before: { mission: 'old' }, after: { mission: 'imported' } })]]);
    const store: ProjectStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }, removeItem: (k) => { values.delete(k); } };
    expect(store.getItem(keys.mission)).toBeNull();
    const before = new Map(values);
    expect(() => recoverProjectImport(store)).toThrowError(expect.objectContaining({ code: 'recoveryConflict' }));
    expect(values).toEqual(before);
  });
});
