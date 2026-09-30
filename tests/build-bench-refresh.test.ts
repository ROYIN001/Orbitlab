import { describe, expect, it, vi } from 'vitest';
import { EngineerLevel } from '../src/ui/build/engineer-level';
import { vehicleById } from '../src/data/vehicles';
import { TunnelPanel } from '../src/ui/build/tunnel-panel';
import { defaultTunnelChoice, validTunnelPayload } from '../src/design/tunnel-view';

// Exercise the real async source/sweep handlers without constructing canvas panels.
// Browser journeys separately verify their rendered controls.
const harness = (store: object) => Object.assign(Object.create(EngineerLevel.prototype), {
  sourceId: 'saved:d1', savedUpdated: 'old', chosen: true, visible: false, loadSeq: 0,
  store, host: { exploreDesign: () => null }, picker: { set: vi.fn() },
  setEntries: vi.fn(), setBench: vi.fn(), afterPick: vi.fn(),
});

describe('saved Engineer bench revisions', () => {
  it('refreshes the selected saved design after Explore updates the same record', async () => {
    const spec = structuredClone(vehicleById('falcon9'));
    spec.stages[0].engine.count = 10;
    const saved = { id: 'd1', kind: 'vehicle', name: 'Ten engines', created: 'then', updated: 'new', design: spec };
    const store = { list: vi.fn(async () => [saved]), get: vi.fn(async () => saved) };
    const level = harness(store);
    await level.refreshSources();
    await Promise.resolve();
    await Promise.resolve();
    expect(level.setBench).toHaveBeenCalledWith(expect.objectContaining({ spec, name: 'Ten engines' }));
    expect(level.savedUpdated).toBe('new');
    level.setBench.mockClear();
    await level.refreshSources();
    expect(level.setBench).not.toHaveBeenCalled(); // keep locally computed ratings until the stored source changes
    expect(store.get).toHaveBeenCalledTimes(1);
  });

  it('drops a delayed saved revision after the user chooses a catalogue source', async () => {
    let deliver!: (v: unknown) => void;
    const spec = vehicleById('falcon9');
    const saved = { id: 'd1', kind: 'vehicle', name: 'Saved', created: 'then', updated: 'new', design: spec };
    const level = harness({ list: async () => [saved], get: () => new Promise((resolve) => { deliver = resolve; }) });
    await level.refreshSources();
    level.pick('soyuz21a');
    deliver(saved);
    await Promise.resolve();
    await Promise.resolve();
    expect(level.sourceId).toBe('soyuz21a');
    expect(level.setBench).toHaveBeenCalledTimes(1);
    expect(level.setBench).toHaveBeenCalledWith(expect.objectContaining({ spec: vehicleById('soyuz21a') }));
  });
});

describe('wind tunnel payload validation on every sweep path', () => {
  it('clears previous results for blank/nonfinite, negative, or too-large payload, and recovers with zero', () => {
    const spec = vehicleById('falcon9');
    const panel = Object.assign(Object.create(TunnelPanel.prototype), {
      spec, choice: defaultTunnelChoice(spec, 1000), range: 'small', quantity: 'cN',
    });
    panel.sweep();
    expect(Number.isFinite(panel.result.cgX)).toBe(true);
    for (const bad of [NaN, Infinity, -Infinity, -1, 500001]) {
      panel.choice.payloadKg = bad;
      panel.sweep();
      expect([panel.result, panel.map, panel.lines]).toEqual([null, null, null]);
      panel.range = 'wide';
      panel.choice.stagesGone = 1;
      panel.sweep();
      expect([panel.result, panel.map, panel.lines]).toEqual([null, null, null]);
    }
    panel.choice.payloadKg = 0;
    panel.sweep();
    expect(Number.isFinite(panel.result.cgX)).toBe(true);
    expect(panel.map.values.flat().every(Number.isFinite)).toBe(true);
    expect(validTunnelPayload(500000)).toBe(true);
  });
});
