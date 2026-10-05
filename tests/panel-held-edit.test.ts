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

/** Just enough of the DOM for the panel to build one section; the elements are kept as a tree to look into. */
class FakeEl {
  children: FakeEl[] = []; dataset: Record<string, string> = {}; attrs: Record<string, string> = {};
  className = ''; textContent = ''; type = ''; value = ''; disabled = false; checked = false; selected = false; open = false;
  classList = { add: (c: string) => { this.className += ` ${c}`; } };
  constructor(readonly tagName: string) {}
  append(...c: FakeEl[]): void { this.children.push(...c); }
  appendChild(c: FakeEl): FakeEl { this.children.push(c); return c; }
  setAttribute(k: string, v: string): void { this.attrs[k] = v; }
  getAttribute(k: string): string | null { return this.attrs[k] ?? null; }
  addEventListener(): void {}
  find(cls: string): FakeEl | undefined {
    if (this.className.split(' ').includes(cls)) return this;
    for (const c of this.children) { const hit = c.find(cls); if (hit) return hit; }
    return undefined;
  }
}

describe('D-36.A3: the failures section in a live six-DOF flight', () => {
  const build = (controlFaults: object | undefined, live = true): FakeEl => {
    vi.stubGlobal('document', { createElement: (tag: string) => new FakeEl(tag) });
    try {
      const { panel: p } = panel(true);
      const r = p as unknown as Record<string, unknown>;
      (r.state as { dynamics: Record<string, unknown> }).dynamics.controlFaults = controlFaults;
      r.flight = { stage: 'flight', sixDof: true, live, failed: false };
      r.faultDraft = null; r.draftStatus = ''; r.flightT = 31.2;
      return (r.faultsSection as () => FakeEl).call(p);
    } finally {
      vi.unstubAllGlobals();
    }
  };

  it('offers a new failure in a flight launched with none (the default)', () => {
    const section = build(undefined);
    const draft = section.find('fault-draft');
    expect(draft).toBeDefined();
    const add = draft!.find('fault-draft-add');
    expect(add?.tagName).toBe('button');
    expect(add?.disabled).toBe(false);
    expect(draft!.find('fault-draft-status')?.getAttribute('role')).toBe('status');
  });

  it('offers it beside a list the flight already carries', () => {
    expect(build({ faults: [{ kind: 'gyroBias', time: 50, units: [1], axis: 'pitch', magnitude: 1 }] }).find('fault-draft-add')).toBeDefined();
  });

  it('offers nothing new while scrubbed back into the recording', () => {
    expect(build(undefined, false).find('fault-draft')).toBeUndefined();
  });
});
