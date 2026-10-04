import { describe, expect, it } from 'vitest';
import { missionStage, setupCollapsed } from '../src/ui/flight-lifecycle';

describe('R2.1 mission lifecycle', () => {
  it('is setup until launched, flight while it runs (paused or replaying), analysis when done', () => {
    expect(missionStage({ launched: false, done: false })).toBe('setup');
    // a finished preview that was never launched is still being set up
    expect(missionStage({ launched: false, done: true })).toBe('setup');
    expect(missionStage({ launched: true, done: false })).toBe('flight');
    expect(missionStage({ launched: true, done: true })).toBe('analysis');
  });

  it('collapses the setup only at the Engineer level, outside setup, unless shown on request', () => {
    expect(setupCollapsed('engineer', 'setup', false)).toBe(false);
    expect(setupCollapsed('engineer', 'flight', false)).toBe(true);
    expect(setupCollapsed('engineer', 'analysis', false)).toBe(true);
    expect(setupCollapsed('engineer', 'flight', true)).toBe(false);
    expect(setupCollapsed('explore', 'flight', false)).toBe(false);
    expect(setupCollapsed('watch', 'flight', false)).toBe(false);
  });
});
