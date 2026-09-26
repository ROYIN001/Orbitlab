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

/**
 * Measured 2026-09-26 with the published first-stage masses and the six-DOF
 * pitch programme fitted to these flights (docs/VALIDATION.md, F5); the lists
 * measured before each change are in that document.
 */
const DISAGREEMENTS: Record<string, readonly string[]> = {
  crs16: ['T+100/speed'],
  ssoA: ['T+100/speed', 'T+140/speed', 'meco/speed'],
  iridium8: ['maxQ/time', 'T+140/speed'],
  bangabandhu1: ['maxQ/time', 'T+140/altitude', 'meco/speed', 'ses1/time', 'seco1/altitude'],
  gps3sv01: ['maxQ/time', 'seco1/altitude'],
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
