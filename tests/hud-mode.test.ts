/**
 * The HUD card's three-state machine (`src/ui/hudmode.ts`).
 *
 * The rules are small but every one of them is a bug that was easy to write:
 * a cycle that offers `full` on a phone, a stored value from an older build
 * taken at face value, a `localStorage` that throws in a private window and
 * takes the whole HUD down with it. None of that needs a DOM, so none of it is
 * tested through one.
 */
import { describe, expect, it } from 'vitest';
import {
  coerceHudMode,
  HUD_MODE_STORAGE_KEY,
  isHudMode,
  loadHudMode,
  nextHudMode,
  saveHudMode,
  type HudMode,
  type ModeStore,
} from '../src/ui/hudmode';

/** A `Storage`-shaped map, and one that refuses every call. */
function memoryStore(initial?: string): ModeStore & { value: string | null } {
  return {
    value: initial ?? null,
    getItem(key: string): string | null {
      return key === HUD_MODE_STORAGE_KEY ? this.value : null;
    },
    setItem(key: string, value: string): void {
      if (key === HUD_MODE_STORAGE_KEY) this.value = value;
    },
  };
}

const hostileStore: ModeStore = {
  getItem(): string | null {
    throw new DOMException('The operation is insecure.');
  },
  setItem(): void {
    throw new DOMException('The operation is insecure.');
  },
};

describe('HUD card mode', () => {
  it('cycles compact → full → hidden → compact on a desktop', () => {
    const seen: HudMode[] = [];
    let mode: HudMode = 'compact';
    for (let i = 0; i < 4; i++) {
      mode = nextHudMode(mode, false);
      seen.push(mode);
    }
    expect(seen).toEqual(['full', 'hidden', 'compact', 'full']);
  });

  it('skips the full grid at phone width', () => {
    const seen: HudMode[] = [];
    let mode: HudMode = 'compact';
    for (let i = 0; i < 4; i++) {
      mode = nextHudMode(mode, true);
      seen.push(mode);
    }
    expect(seen).toEqual(['hidden', 'compact', 'hidden', 'compact']);
    // …and a `full` carried over from a wider window steps on from what the
    // phone is actually showing (compact), not from the stored preference.
    expect(nextHudMode('full', true)).toBe('hidden');
    expect(coerceHudMode('full', true)).toBe('compact');
    expect(coerceHudMode('hidden', true)).toBe('hidden');
    expect(coerceHudMode('full', false)).toBe('full');
  });

  it('defaults to compact and rejects anything else in storage', () => {
    expect(loadHudMode(memoryStore(), false)).toBe('compact');
    expect(loadHudMode(null, false)).toBe('compact');
    expect(loadHudMode(memoryStore('enormous'), false)).toBe('compact');
    expect(loadHudMode(memoryStore('Full'), false)).toBe('compact');
    expect(isHudMode('full')).toBe(true);
    expect(isHudMode('Full')).toBe(false);
    expect(isHudMode(undefined)).toBe(false);
  });

  it('round-trips a remembered choice', () => {
    const store = memoryStore();
    saveHudMode(store, 'full');
    expect(store.value).toBe('full');
    expect(loadHudMode(store, false)).toBe('full');
    // the same recording read on a phone shows the compact card, and the stored
    // preference is left alone so the desktop gets it back
    expect(loadHudMode(store, true)).toBe('compact');
    expect(store.value).toBe('full');
  });

  it('survives a storage that throws', () => {
    expect(loadHudMode(hostileStore, false)).toBe('compact');
    expect(() => saveHudMode(hostileStore, 'hidden')).not.toThrow();
  });
});
