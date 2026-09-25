/**
 * Soyuz-2.1a, Electron and Ariane 64 in the six-DOF model against published
 * launch timelines (docs/VALIDATION.md §3): the references and tolerances of
 * `tests/validation/timelines.test.ts`, flown in the default flight model.
 * The rows listed below are the measured disagreements; the test fails when
 * the set changes in either direction.
 */
import { describe, expect, it } from 'vitest';
import { flyMission } from '../validation/flight-harness';
import { TIMELINE_REFERENCES } from '../validation/reference-data';
import { formatRows, timelineRows } from '../validation/compare';

/** Measured 2026-09-25 on main @ 844ffca. */
const DISAGREEMENTS: Record<string, readonly string[]> = {
  soyuzMs25: ['fairing/altitude', 'coreSep/altitude', 'insertion/apogee'],
  electronNtt: ['fairing/time', 'seco/time', 'kickSep/time'],
  ariane64Va267: ['fairing/altitude'],
};

describe('published launch timelines (six-DOF)', () => {
  it('has a disagreement list for every reference and nothing else', () => {
    expect(Object.keys(DISAGREEMENTS).sort()).toEqual(TIMELINE_REFERENCES.map((r) => r.id).sort());
  });

  it.each(TIMELINE_REFERENCES.map((r) => [r.id, r] as const))('%s', { timeout: 900_000 }, (id, ref) => {
    const flown = flyMission(ref.mission, 'sixDof', { after: 10 });
    expect(flown.failed).toBe(false);
    const rows = timelineRows(ref, flown);
    for (const r of rows) expect(Number.isFinite(r.model), r.key).toBe(true);
    const disagree = rows.filter((r) => !r.agrees).map((r) => r.key.slice(id.length + 1));
    expect(disagree, `\n${formatRows(rows)}`).toEqual(DISAGREEMENTS[id]);
  });
});
