import { describe, expect, it } from 'vitest';
import { missionStage, previewsChange, setupCollapsed } from '../src/ui/flight-lifecycle';

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

  // LUI-01 (M-LAUNCH-027): "Use for the next launch" pressed in a paused flight
  // rebuilt the pad preview and threw the flight and its recording away.
  it('previews an edit only while setting up; a flight or its result keeps the edit for the next launch', () => {
    expect(previewsChange('setup', false, 'edit')).toBe(true);
    expect(previewsChange('flight', false, 'edit')).toBe(false);
    expect(previewsChange('analysis', false, 'edit')).toBe(false);
    // nothing previews over a running clock, as before
    expect(previewsChange('setup', true, 'edit')).toBe(false);
    expect(previewsChange('flight', true, 'edit')).toBe(false);
  });

  it('previews a mission replaced on purpose (a template, a viewer launch, a saved mission) in any stage', () => {
    expect(previewsChange('setup', false, 'replace')).toBe(true);
    expect(previewsChange('flight', false, 'replace')).toBe(true);
    expect(previewsChange('analysis', false, 'replace')).toBe(true);
    expect(previewsChange('flight', true, 'replace')).toBe(false);
  });
});
