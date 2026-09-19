import { describe, expect, it } from 'vitest';
import { EXPERIENCE_STORAGE_KEY, loadExperience, saveExperience, type ExperienceStore } from '../src/ui/experience';

describe('learning/advanced preference', () => {
  it('defaults to learning for missing or stale values', () => {
    for (const value of [null, '', 'old-mode', 'learning']) {
      expect(loadExperience({ getItem: () => value, setItem: () => {} })).toBe('learning');
    }
  });
  it('persists advanced mode only under its own preference key', () => {
    const data = new Map<string, string>([['orbitlab.hud.layout', 'keep'], ['orbitlab.lang', 'th']]);
    const store: ExperienceStore = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } };
    saveExperience('advanced', store);
    expect(data.get(EXPERIENCE_STORAGE_KEY)).toBe('advanced');
    expect(loadExperience(store)).toBe('advanced');
    expect(data.get('orbitlab.hud.layout')).toBe('keep');
    expect(data.get('orbitlab.lang')).toBe('th');
    saveExperience('learning', store);
    expect(loadExperience(store)).toBe('learning');
  });
  it('works when storage access is denied', () => {
    const denied: ExperienceStore = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(loadExperience(denied)).toBe('learning');
    expect(() => saveExperience('advanced', denied)).not.toThrow();
  });
});
