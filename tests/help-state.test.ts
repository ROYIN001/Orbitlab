import { describe, expect, it } from 'vitest';
import { GuideProgress, GUIDE_STORAGE_KEY, type GuideStore } from '../src/ui/help-state';

function memoryStore(initial: string | null = null): GuideStore {
  const values = new Map<string, string>();
  if (initial !== null) values.set(GUIDE_STORAGE_KEY, initial);
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}

describe('optional first-use guide', () => {
  it('persists skipping across visits and can still be reopened deliberately', () => {
    const store = memoryStore();
    const first = new GuideProgress(store);
    expect(first.visible).toBe(true);
    first.dismiss();
    const nextVisit = new GuideProgress(store);
    expect(nextVisit.visible).toBe(false);
    nextVisit.restart();
    expect(nextVisit.visible).toBe(true);
    expect(nextVisit.step).toBe(0);
    expect(new GuideProgress(store).visible).toBe(false);
  });

  it('keeps the guide visible until its final action and remembers completion', () => {
    const store = memoryStore();
    const guide = new GuideProgress(store);
    guide.next(); guide.next();
    expect(guide.visible).toBe(true);
    expect(new GuideProgress(store).visible).toBe(true);
    guide.next();
    expect(guide.visible).toBe(false);
    expect(new GuideProgress(store).visible).toBe(false);
  });

  it('moves past "choose a Quick start example" when a whole mission is handed over (Phase 3, "Fly it")', () => {
    const store = memoryStore();
    const guide = new GuideProgress(store);
    guide.missionGiven();
    expect([guide.visible, guide.step]).toEqual([true, 1]);
    // nothing is stored: the next visit starts at the beginning again
    expect(new GuideProgress(store).step).toBe(0);
    // a guide further on stays where it is, and a dismissed one stays hidden
    guide.next(); guide.missionGiven();
    expect(guide.step).toBe(2);
    const dismissed = new GuideProgress(memoryStore('dismissed'));
    dismissed.missionGiven();
    expect([dismissed.visible, dismissed.step]).toEqual([false, 0]);
  });

  it('does not treat malformed stored data as a dismissal', () => {
    for (const value of ['false', '{}', 'completed', '']) expect(new GuideProgress(memoryStore(value)).visible).toBe(true);
  });

  it('remains dismissible for the session when storage is missing or denied', () => {
    const denied: GuideStore = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    for (const storage of [null, denied]) {
      const guide = new GuideProgress(storage);
      expect(guide.visible).toBe(true);
      guide.dismiss();
      expect(guide.visible).toBe(false);
      guide.restart();
      expect(guide.visible).toBe(true);
    }
  });
});
