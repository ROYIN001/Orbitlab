import { describe, expect, it } from 'vitest';
import { CARD_IDS, DEFAULT_LAYOUT, PRESETS, choosePreset, parseTelemetryLayout, serializeTelemetryLayout, storesLayout, toggleCard, visibleCards } from '../src/ui/telemetry-layout';
import { CHART_IDS } from '../src/ui/telemetry-charts';

/** the cards before the flight wall: the default panel stays these */
const TODAY = [...CHART_IDS, 'losses', 'plan', 'debris'];

describe('R2.3 telemetry presets', () => {
  it('defaults to every card but the wall\'s, and falls back to it for unreadable, unknown or newer data', () => {
    expect([...PRESETS.all]).toEqual(TODAY);
    expect([...visibleCards(parseTelemetryLayout(null))]).toEqual(TODAY);
    for (const raw of ['{bad', '[]', '{"version":2,"preset":"orbit","custom":[]}', '{"version":1,"preset":"docking","custom":[]}', 'null']) {
      expect(parseTelemetryLayout(raw)).toEqual(DEFAULT_LAYOUT);
    }
  });

  it('round-trips a preset and a custom choice, dropping unknown cards', () => {
    const orbit = choosePreset(DEFAULT_LAYOUT, 'orbit');
    expect(parseTelemetryLayout(serializeTelemetryLayout(orbit))).toEqual(orbit);
    expect([...visibleCards(orbit)].sort()).toEqual([...PRESETS.orbit].sort());
    const raw = '{"version":1,"preset":"custom","custom":["mass","nope","altitude","mass"]}';
    expect(parseTelemetryLayout(raw).custom).toEqual(['altitude', 'mass']);
  });

  it('toggling a card turns the cards on screen into Custom without moving the others', () => {
    const flight = choosePreset(DEFAULT_LAYOUT, 'flight');
    const next = toggleCard(flight, 'mass', true);
    expect(next.preset).toBe('custom');
    expect(new Set(next.custom)).toEqual(new Set([...PRESETS.flight, 'mass']));
    const fewer = toggleCard(next, 'q', false);
    expect(fewer.custom.includes('q')).toBe(false);
    expect(fewer.custom.includes('altitude')).toBe(true);
  });

  it('keeps the custom list while a fixed preset is chosen', () => {
    const custom = toggleCard(DEFAULT_LAYOUT, 'pitch', false);
    const dyn = choosePreset(custom, 'dynamics');
    expect(visibleCards(dyn).has('pitch')).toBe(true);
    expect(visibleCards(choosePreset(dyn, 'custom')).has('pitch')).toBe(false);
  });

  it('every preset shows at least one card and only known cards', () => {
    for (const cards of Object.values(PRESETS)) {
      expect(cards.length).toBeGreaterThan(0);
      for (const c of cards) expect(CARD_IDS).toContain(c);
    }
  });

  it('F2: the wall preset parses and shows exactly the status and track cards', () => {
    const wall = parseTelemetryLayout('{"version":1,"preset":"wall","custom":["mass"]}');
    expect(wall).toEqual({ version: 1, preset: 'wall', custom: ['mass'] });
    expect([...visibleCards(wall)]).toEqual(['status', 'track']);
    expect(CARD_IDS.slice(-2)).toEqual(['status', 'track']);
  });

  it('F2: the wall preset is never written; every other layout is', () => {
    expect(storesLayout(choosePreset(DEFAULT_LAYOUT, 'wall'))).toBe(false);
    for (const p of ['all', 'flight', 'dynamics', 'orbit', 'custom'] as const) expect(storesLayout(choosePreset(DEFAULT_LAYOUT, p)), p).toBe(true);
    // ticking a box on the wall makes Custom, which is stored
    expect(storesLayout(toggleCard(choosePreset(DEFAULT_LAYOUT, 'wall'), 'q', true))).toBe(true);
  });

  it('F2: a custom list stored by an older build parses unchanged', () => {
    const raw = '{"version":1,"preset":"custom","custom":["altitude","q","losses","debris"]}';
    expect(parseTelemetryLayout(raw)).toEqual({ version: 1, preset: 'custom', custom: ['altitude', 'q', 'losses', 'debris'] });
    expect(serializeTelemetryLayout(parseTelemetryLayout(raw))).toBe(raw);
  });
});
