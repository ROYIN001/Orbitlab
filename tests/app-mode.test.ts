import { describe, expect, it } from 'vitest';
import {
  APP_MODES, MODE_STORAGE_KEY, experienceForMode, hashForMode, initialMode, loadMode, modeFromHash, saveMode, type ModeStore,
} from '../src/ui/app-mode';

function memory(entries: Record<string, string> = {}): ModeStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(entries));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } };
}

describe('app modes', () => {
  it('round-trips every mode through the URL hash', () => {
    for (const mode of APP_MODES) expect(modeFromHash(hashForMode(mode))).toBe(mode);
    expect(modeFromHash('#watch')).toBe('watch');
    expect(modeFromHash('#/ENGINEER')).toBe('engineer');
  });

  it('ignores the in-page anchors of the narrow layout and anything else', () => {
    for (const hash of ['', '#', '#setup', '#viewport', '#telemetry', '#/astronaut', '#/watch/extra']) {
      expect(modeFromHash(hash)).toBeNull();
    }
  });

  it('opens on the hash first, then the last workspace mode, else the home page', () => {
    expect(initialMode('#/engineer', memory({ [MODE_STORAGE_KEY]: 'explore' }))).toBe('engineer');
    expect(initialMode('', memory({ [MODE_STORAGE_KEY]: 'explore' }))).toBe('explore');
    expect(initialMode('', memory({ [MODE_STORAGE_KEY]: 'engineer' }))).toBe('engineer');
    // the viewer needs a launch picked, so a returning viewer lands on the home page
    expect(initialMode('', memory({ [MODE_STORAGE_KEY]: 'watch' }))).toBe('home');
    expect(initialMode('', memory({ [MODE_STORAGE_KEY]: 'stale' }))).toBe('home');
    expect(initialMode('#setup', memory())).toBe('home');
  });

  it('remembers the mode under its own key only, and survives denied storage', () => {
    const store = memory({ 'orbitlab.lang': 'th', 'orbitlab.experience': 'advanced' });
    saveMode('explore', store);
    expect(loadMode(store)).toBe('explore');
    expect(store.data.get('orbitlab.lang')).toBe('th');
    expect(store.data.get('orbitlab.experience')).toBe('advanced');
    const denied: ModeStore = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(loadMode(denied)).toBeNull();
    expect(() => saveMode('watch', denied)).not.toThrow();
    expect(initialMode('', denied)).toBe('home');
  });

  it('maps the workspace modes onto the mission builder layouts', () => {
    expect(experienceForMode('explore')).toBe('learning');
    expect(experienceForMode('engineer')).toBe('advanced');
    expect(experienceForMode('home')).toBeNull();
    expect(experienceForMode('watch')).toBeNull();
  });
});
