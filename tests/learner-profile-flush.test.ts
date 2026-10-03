import { describe, expect, it } from 'vitest';
import { emptyProgress, loadProgress, saveProgress } from '../src/lessons/progress';
import { lessonTransitionFlush } from '../src/ui/lessons/profile-progress';
import { PROFILE_SELECTED_KEY, WorkspaceRepository, profileStorageKey, type WorkspaceLocks } from '../src/workspace/repository';
import type { RawStorage } from '../src/workspace/registry';

function memory() {
  const values = new Map<string, string>(); let failKey: string | null = null;
  const store: RawStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { if (key === failKey) throw new DOMException('quota', 'QuotaExceededError'); values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
  return { store, values, deny: (key: string | null) => { failKey = key; } };
}
class Locks implements WorkspaceLocks {
  private held = new Set<string>();
  async request<T>(name: string, options: { ifAvailable?: boolean }, run: (lock: unknown | null) => Promise<T>): Promise<T> {
    if (this.held.has(name)) {
      if (options.ifAvailable) return run(null);
      throw new Error('Unexpected overlapping test lock');
    }
    this.held.add(name);
    try { return await run({ name }); } finally { this.held.delete(name); }
  }
}

describe('learning save before profile transition', () => {
  it('keeps the old owner on quota failure and saves its in-memory history on retry before opening B', async () => {
    const disk = memory(), session = memory(), locks = new Locks(); let id = 0;
    const repo = await new WorkspaceRepository(disk.store, session.store, locks, undefined, () => `new-${++id}`).initialize();
    const ownerA = repo.binding!;
    const progress = emptyProgress();
    progress.lessons['orbit-first'] = { attempts: 1, hintsShown: 0, passed: false };
    expect(saveProgress(progress, ownerA)).toBe(true);
    const b = await repo.create('Learner B');
    const before = ownerA.getItem('orbitlab.lessons');
    progress.lessons['orbit-first'].attempts = 2;
    progress.lessons['orbit-first'].hintsShown = 1;
    disk.deny(profileStorageKey(ownerA.profileId));
    let saved = saveProgress(progress, ownerA);
    expect(saved).toBe(false); // the ordinary UI save reports failure without throwing
    const detach = repo.registerFlush(lessonTransitionFlush(() => saved, () => { saved = saveProgress(progress, ownerA); return saved; }, () => 'Learning not saved'));
    await expect(repo.select(b.id)).rejects.toThrow('Learning not saved');
    expect(repo.binding).toBe(ownerA);
    expect(ownerA.valid).toBe(true);
    expect(session.values.get(PROFILE_SELECTED_KEY)).toBe(ownerA.profileId);
    expect(ownerA.getItem('orbitlab.lessons')).toBe(before);
    expect(repo.read(b.id).values['orbitlab.lessons']).toBeUndefined();

    disk.deny(null);
    await repo.select(b.id);
    expect(session.values.get(PROFILE_SELECTED_KEY)).toBe(b.id);
    const savedA = JSON.parse(repo.read(ownerA.profileId).values['orbitlab.lessons']);
    expect(savedA.lessons['orbit-first']).toMatchObject({ attempts: 2, hintsShown: 1 });
    expect(() => ownerA.setItem('orbitlab.lessons', JSON.stringify(progress))).toThrow();
    detach(); await Promise.resolve(); await Promise.resolve();
    const reopened = await new WorkspaceRepository(disk.store, session.store, locks).initialize();
    expect(reopened.active()?.id).toBe(b.id);
    expect(loadProgress(reopened.binding!)).toEqual(emptyProgress());
    reopened.close(); repo.close();
  });
  it('does not replace untouched newer progress with an empty fallback when switching profiles', async () => {
    const disk = memory(), session = memory(), locks = new Locks();
    const future = '{"version":99,"lessons":{"future-lesson":{"future-grade":true}}}';
    disk.values.set('orbitlab.lessons', future);
    const repo = await new WorkspaceRepository(disk.store, session.store, locks, undefined, () => 'new-owner').initialize();
    const owner = repo.binding!;
    const fallback = loadProgress(owner);
    expect(fallback).toEqual(emptyProgress());
    const b = await repo.create('Learner B');
    const detach = repo.registerFlush(lessonTransitionFlush(() => null, () => saveProgress(fallback, owner), () => 'Learning not saved'));
    await repo.select(b.id);
    expect(repo.read(owner.profileId).values['orbitlab.lessons']).toBe(future);
    expect(repo.read(owner.profileId).values['orbitlab.lessons.recovery']).toBeUndefined();
    expect(repo.read(owner.profileId).values['orbitlab.import.quarantine.v1']).toBeUndefined();
    detach(); repo.close();
  });
});
