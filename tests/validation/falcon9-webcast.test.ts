/**
 * Falcon 9 Block 5 in the point-mass model against webcast telemetry of five
 * real flights (docs/VALIDATION.md §2).
 *
 * The tolerances are fixed in `reference-data.ts` and were chosen before any of
 * these comparisons was flown. The rows the model does NOT meet them on are
 * listed below by name: they are the measured disagreements, each explained in
 * docs/VALIDATION.md, and not a licence to widen the tolerance. The test fails
 * when the set changes in either direction — a row that starts to agree is as
 * much news as one that stops — so the document has to be updated with it.
 */
import { describe, expect, it } from 'vitest';
import { flyMission } from './flight-harness';
import { FALCON9_REFERENCES, TOLERANCE } from './reference-data';
import { falcon9Rows, formatRows } from './compare';

/** Measured 2026-09-25 on main @ 844ffca. */
const DISAGREEMENTS: Record<string, readonly string[]> = {
  crs16: ['T+100/speed', 'meco/time', 'ses1/time'],
  ssoA: ['maxQ/time', 'T+100/speed', 'meco/altitude'],
  iridium8: ['maxQ/time', 'T+100/speed', 'meco/time', 'meco/speed'],
  bangabandhu1: ['maxQ/time', 'T+100/altitude', 'T+140/altitude', 'T+140/speed', 'meco/time', 'meco/speed', 'ses1/time', 'seco1/altitude'],
  gps3sv01: ['maxQ/time', 'T+100/altitude', 'T+140/altitude', 'ses1/time', 'seco1/altitude'],
};

describe('Falcon 9 against webcast telemetry (point mass)', () => {
  it('has a disagreement list for every reference flight and nothing else', () => {
    expect(Object.keys(DISAGREEMENTS).sort()).toEqual(FALCON9_REFERENCES.map((r) => r.id).sort());
  });

  it('tolerances are the ones docs/VALIDATION.md states', () => {
    expect(TOLERANCE.time(100)).toBeCloseTo(10);
    expect(TOLERANCE.time(20)).toBe(3);
    expect(TOLERANCE.speed(1000)).toBeCloseTo(105);
    expect(TOLERANCE.altitude(60e3)).toBeCloseTo(10e3);
  });

  it.each(FALCON9_REFERENCES.map((r) => [r.id, r] as const))('%s', (id, ref) => {
    const flown = flyMission(ref.mission, 'pointMass');
    expect(flown.failed).toBe(false);
    const rows = falcon9Rows(ref, flown);
    // every milestone was reached: a missing event is a NaN, never a pass
    for (const r of rows) expect(Number.isFinite(r.model), r.key).toBe(true);
    const disagree = rows.filter((r) => !r.agrees).map((r) => r.key.slice(id.length + 1));
    expect(disagree, `\n${formatRows(rows)}`).toEqual(DISAGREEMENTS[id]);
  });

  it('keeps the first-stage recovery reserve in proportion to the real one', () => {
    // A derived check that does not depend on the absolute burn time: how much
    // earlier a booster that is flown home cuts off than the expended one.
    // Real: CRS-16 (RTLS) 145 s and GPS III SV01 (expended) 168 s, ratio 0.863;
    // the events file rounds each to 1 s, so the ratio is good to ±0.006.
    // Allowed: ±0.03, the scatter of the three drone-ship flights' own ratios
    // (143, 150 and 152 s over 168 s: 0.851–0.905) about their mean.
    const rtls = flyMission(FALCON9_REFERENCES.find((r) => r.id === 'crs16')!.mission, 'pointMass').eventTime('evt.meco')!;
    const expended = flyMission(FALCON9_REFERENCES.find((r) => r.id === 'gps3sv01')!.mission, 'pointMass').eventTime('evt.meco')!;
    expect(Math.abs(rtls / expended - 145 / 168)).toBeLessThanOrEqual(0.03);
  });
});
