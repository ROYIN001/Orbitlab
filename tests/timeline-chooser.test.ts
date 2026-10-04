import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../src/physics/simulation';
import { chooserEntries, chooserFocusMove } from '../src/ui/timeline-chooser';

const ev = (t: number, key: string): SimEvent => ({ t, key, severity: 'info' });

describe('R2.4 timeline event chooser', () => {
  it('lists every member in recorded order, equal times in emission order', () => {
    const a = ev(120.5, 'evt.meco');
    const b = ev(118.2, 'evt.boosterSep');
    const c = ev(120.5, 'evt.stageSep');
    const entries = chooserEntries([a, b, c], -10);
    expect(entries.map((e) => e.event)).toEqual([b, a, c]);
    // exact recorded identities and times, nothing rounded or invented
    expect(entries.map((e) => e.event.t)).toEqual([118.2, 120.5, 120.5]);
  });

  it('marks only the latest member at or before the cursor', () => {
    const members = [ev(10, 'a'), ev(20, 'b'), ev(30, 'c')];
    expect(chooserEntries(members, 5).some((e) => e.current)).toBe(false);
    expect(chooserEntries(members, 20).map((e) => e.current)).toEqual([false, true, false]);
    expect(chooserEntries(members, 25).map((e) => e.current)).toEqual([false, true, false]);
    expect(chooserEntries(members, 99).map((e) => e.current)).toEqual([false, false, true]);
  });

  it('does not reorder the caller\'s array', () => {
    const members = [ev(3, 'a'), ev(1, 'b')];
    chooserEntries(members, 0);
    expect(members.map((e) => e.t)).toEqual([3, 1]);
  });

  it('moves focus with arrows, Home and End, wrapping like a menu', () => {
    expect(chooserFocusMove('ArrowDown', 0, 3)).toBe(1);
    expect(chooserFocusMove('ArrowDown', 2, 3)).toBe(0);
    expect(chooserFocusMove('ArrowUp', 0, 3)).toBe(2);
    expect(chooserFocusMove('ArrowUp', -1, 3)).toBe(1);
    expect(chooserFocusMove('Home', 2, 3)).toBe(0);
    expect(chooserFocusMove('End', 0, 3)).toBe(2);
    expect(chooserFocusMove('ArrowLeft', 0, 3)).toBeNull();
    expect(chooserFocusMove('ArrowDown', 0, 0)).toBeNull();
  });
});
