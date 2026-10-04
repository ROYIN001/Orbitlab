import { describe, expect, it } from 'vitest';
import { CARD_IDS, DEFAULT_LAYOUT, PRESETS, choosePreset, parseTelemetryLayout, serializeTelemetryLayout, toggleCard, visibleCards } from '../src/ui/telemetry-layout';

describe('R2.3 telemetry presets', () => {
  it('defaults to every card, and falls back to it for unreadable, unknown or newer data', () => {
    expect([...visibleCards(parseTelemetryLayout(null))]).toEqual([...CARD_IDS]);
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
});
