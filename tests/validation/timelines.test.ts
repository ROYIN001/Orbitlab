/**
 * Soyuz-2.1a, Electron and Ariane 64 in the point-mass model against published
 * launch timelines (docs/VALIDATION.md §3). Same tolerances, same rule as the
 * Falcon 9 comparison: the rows that disagree are listed by name, and the test
 * fails when the set changes in either direction.
 */
import { describe, expect, it } from 'vitest';
import { flyMission } from './flight-harness';
import { TIMELINE_REFERENCES } from './reference-data';
import { formatRows, timelineRows } from './compare';

/** Measured 2026-09-25 on main @ 844ffca. */
const DISAGREEMENTS: Record<string, readonly string[]> = {
  soyuzMs25: ['insertion/apogee'],
  electronNtt: ['seco/time', 'kickSep/time'],
  ariane64Va267: [],
};

describe('published launch timelines (point mass)', () => {
  it('has a disagreement list for every reference and nothing else', () => {
    expect(Object.keys(DISAGREEMENTS).sort()).toEqual(TIMELINE_REFERENCES.map((r) => r.id).sort());
  });

  it.each(TIMELINE_REFERENCES.map((r) => [r.id, r] as const))('%s', (id, ref) => {
    // run on past the cut-off so a separation a few seconds later is recorded
    const flown = flyMission(ref.mission, 'pointMass', { after: 10 });
    expect(flown.failed).toBe(false);
    const rows = timelineRows(ref, flown);
    for (const r of rows) expect(Number.isFinite(r.model), r.key).toBe(true);
    const disagree = rows.filter((r) => !r.agrees).map((r) => r.key.slice(id.length + 1));
    expect(disagree, `\n${formatRows(rows)}`).toEqual(DISAGREEMENTS[id]);
  });
});
