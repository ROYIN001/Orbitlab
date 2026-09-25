/**
 * Falcon 9 Block 5 in the six-DOF model against webcast telemetry of five real
 * flights (docs/VALIDATION.md §2). The same references and tolerances as the
 * point-mass comparison in `tests/validation/falcon9-webcast.test.ts`; each
 * flight takes about a minute, so it runs with `npm run test:heavy`.
 *
 * The rows listed below are the measured disagreements, explained in
 * docs/VALIDATION.md; the test fails when the set changes in either direction.
 */
import { describe, expect, it } from 'vitest';
import { flyMission } from '../validation/flight-harness';
import { FALCON9_REFERENCES } from '../validation/reference-data';
import { falcon9Rows, formatRows } from '../validation/compare';

/** Measured 2026-09-25 on main @ 844ffca. */
const DISAGREEMENTS: Record<string, readonly string[]> = {
  crs16: ['T+100/altitude', 'T+100/speed', 'T+140/altitude', 'meco/time', 'ses1/time'],
  ssoA: ['maxQ/time', 'T+100/speed'],
  iridium8: ['maxQ/time', 'T+100/speed', 'T+140/altitude', 'meco/time'],
  bangabandhu1: ['maxQ/time', 'T+100/altitude', 'T+140/altitude', 'T+140/speed', 'meco/time', 'meco/speed', 'ses1/time', 'seco1/altitude'],
  gps3sv01: ['maxQ/time', 'T+100/altitude', 'T+140/altitude', 'meco/speed', 'ses1/time', 'seco1/altitude'],
};

describe('Falcon 9 against webcast telemetry (six-DOF)', () => {
  it('has a disagreement list for every reference flight and nothing else', () => {
    expect(Object.keys(DISAGREEMENTS).sort()).toEqual(FALCON9_REFERENCES.map((r) => r.id).sort());
  });

  it.each(FALCON9_REFERENCES.map((r) => [r.id, r] as const))('%s', { timeout: 900_000 }, (id, ref) => {
    const flown = flyMission(ref.mission, 'sixDof');
    expect(flown.failed).toBe(false);
    const rows = falcon9Rows(ref, flown);
    for (const r of rows) expect(Number.isFinite(r.model), r.key).toBe(true);
    const disagree = rows.filter((r) => !r.agrees).map((r) => r.key.slice(id.length + 1));
    expect(disagree, `\n${formatRows(rows)}`).toEqual(DISAGREEMENTS[id]);
  });
});
