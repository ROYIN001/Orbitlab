import { describe, expect, it, vi } from 'vitest';
import { SetupPanel } from '../src/ui/panel';
import type { MissionState } from '../src/config/mission-file';

/**
 * LUI-01 (M-LAUNCH-027): the setup tells the app how a change reached it, so
 * the app can hold an edit made during a flight for the next launch instead of
 * previewing it over the flight. The production methods run; only the DOM and
 * the mission arithmetic around them are stubbed.
 */
function panel(running: boolean) {
  const onChange = vi.fn();
  const p = Object.create(SetupPanel.prototype) as Record<string, unknown>;
  Object.assign(p, {
    running,
    state: { vehicleId: 'falcon9', satelliteId: 'iss', guidanceOverrides: {}, dynamics: { model: 'sixDof', wind: 'calm', seed: 20260919 } },
    cb: { onLaunch: vi.fn(), onReset: vi.fn(), onChange },
    fieldDrafts: new Map(), inputIssues: new Map(), fixMessage: '', tuneMessage: '', tunedFor: '',
    root: { querySelector: () => null },
    cancelTune: vi.fn(), refresh: vi.fn(), render: vi.fn(),
    missionSignature: () => '', isValid: () => true, getConfig: () => ({ from: 'panel' }),
    controlFieldKeys: () => [], applyExternalEdit: vi.fn(),
  });
  return { panel: p as unknown as SetupPanel, onChange };
}

describe('LUI-01: how a change reaches the app', () => {
  it('reports "Use for the next launch" in a flight as an edit', () => {
    const { panel: p, onChange } = panel(true);
    expect(p.applyControl({ feedForward: 0.5 })).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ from: 'panel' }, 'edit');
    // the setup holds it for the next launch
    expect(p.currentControl()).toEqual({ feedForward: 0.5 });
  });

  it('reports a restored mission as a replacement', () => {
    const { panel: p, onChange } = panel(true);
    p.restoreMission({ vehicleId: 'soyuz21a', satelliteId: 'iss', guidanceOverrides: {}, launchTime: new Date(0) } as unknown as MissionState);
    expect(onChange).toHaveBeenCalledWith({ from: 'panel' }, 'replace');
  });
});
