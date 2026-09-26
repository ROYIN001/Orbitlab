/**
 * Eleven flights of ten vehicles in the six-DOF model against published
 * launch timelines (docs/VALIDATION.md §3 and §4): the references and tolerances of
 * `tests/validation/timelines.test.ts`, flown in the default flight model.
 * The rows listed below are the measured disagreements; the test fails when
 * the set changes in either direction.
 */
import { describe, expect, it } from 'vitest';
import { flyMission } from '../validation/flight-harness';
import { TIMELINE_REFERENCES } from '../validation/reference-data';
import { formatRows, timelineRows } from '../validation/compare';

/** Measured 2026-09-26 (the first three on main @ 844ffca, unchanged since). */
const DISAGREEMENTS: Record<string, readonly string[]> = {
  soyuzMs25: ['fairing/altitude', 'coreSep/altitude', 'insertion/apogee'],
  electronNtt: ['fairing/time', 'seco/time', 'kickSep/time'],
  ariane64Va267: ['fairing/altitude'],
  atlasJuno: ['fairing/time'],
  pslvC52: ['glSep/altitude', 'alSep/altitude', 'alSep/speed', 'ps1Sep/altitude', 'ps1Sep/speed', 'heatShield/time', 'heatShield/speed',
    'ps3Sep/time', 'ps3Sep/altitude', 'ps4Cutoff/time', 'ps4Cutoff/altitude'],
  h3F3: ['fairing/time', 'fairing/altitude', 'meco/altitude', 'stageSep/altitude', 'seli1/altitude', 'seco1/time', 'seco1/altitude'],
  h2aF50: ['srbSep/time', 'seco/time'],
  vegaVV25: ['z40Sep/time', 'fairing/time', 'z9Sep/time'],
  protonT14R: ['maxQ/time', 'fairing/time'],
  fhArabsat: ['maxQ/time', 'beco/time', 'boosterSep/time', 'meco/time', 'stageSep/time', 'ses1/time', 'fairing/time'],
  angaraF2: ['fairing/time'],
};

describe('published launch timelines (six-DOF)', () => {
  it('has a disagreement list for every reference and nothing else', () => {
    expect(Object.keys(DISAGREEMENTS).sort()).toEqual(TIMELINE_REFERENCES.map((r) => r.id).sort());
  });

  it.each(TIMELINE_REFERENCES.map((r) => [r.id, r] as const))('%s', { timeout: 900_000 }, (id, ref) => {
    const flown = flyMission(ref.mission, 'sixDof', { after: ref.after ?? 10 });
    expect(flown.failed).toBe(false);
    const rows = timelineRows(ref, flown);
    for (const r of rows) expect(Number.isFinite(r.model), r.key).toBe(true);
    const disagree = rows.filter((r) => !r.agrees).map((r) => r.key.slice(id.length + 1));
    expect(disagree, `\n${formatRows(rows)}`).toEqual(DISAGREEMENTS[id]);
  });
});
