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

describe('D-36.A3: a failure added in flight is used only when confirmed', () => {
  const spec = { kind: 'gyroBias', time: 40, units: [1], axis: 'pitch', magnitude: 1 } as const;
  const flying = (answer: string) => {
    const made = panel(true);
    const onApplyNow = vi.fn(() => answer);
    const p = made.panel as unknown as Record<string, unknown>;
    p.cb = { ...(p.cb as object), onApplyNow };
    return { ...made, onApplyNow };
  };

  it('holds a draft without touching the flight or the setup', () => {
    const { panel: p, onChange, onApplyNow } = flying('injected');
    p.draftFault({ ...spec, units: [1] });
    expect(onApplyNow).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(p.state.dynamics?.controlFaults).toBeUndefined();
  });

  it('"Use now" sends the draft to the flight, then keeps it in the setup for the next launch', () => {
    const { panel: p, onChange, onApplyNow } = flying('injected');
    p.draftFault({ ...spec, units: [1] });
    expect(p.useFaultNow()).toBe('injected');
    expect(onApplyNow).toHaveBeenCalledWith(spec);
    expect(p.state.dynamics?.controlFaults?.faults).toEqual([spec]);
    expect(onChange).toHaveBeenCalledWith({ from: 'panel' }, 'edit');
    expect(p.useFaultNow()).toBe('noDraft');
  });

  it('keeps the draft and the setup as they were when the flight refuses it', () => {
    const { panel: p, onChange } = flying('notLive');
    p.draftFault({ ...spec, units: [1] });
    expect(p.useFaultNow()).toBe('notLive');
    expect(p.state.dynamics?.controlFaults).toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
  });
});
