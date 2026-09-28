/**
 * The Build section's stage-by-stage figures (src/design/stage-table.ts):
 * the budget core's phases gathered under their stages, nothing lost and
 * nothing added. Each stage's figures are the budget core's own
 * (tests/design-budget.test.ts holds those to the rocket equation). The one
 * tolerance, fixed before the first run: a stage's Δv, the sum of its
 * phases, added in another grouping than the core's total, to 1e-9 relative.
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { vehicleFigures } from '../src/design/budget';
import { WATCH_PAYLOAD_SHARE, stageRows, stageTable, watchPayload } from '../src/design/stage-table';

describe('the stage table', () => {
  it('works at half the rated LEO payload, as the fleet tests fly', () => {
    expect(WATCH_PAYLOAD_SHARE).toBe(0.5);
    for (const v of VEHICLES) expect(watchPayload(v)).toBe(v.payloadLEO / 2);
  });

  for (const v of VEHICLES) {
    it(`${v.id}: one row per stage, the phases all there, in order`, () => {
      const payload = watchPayload(v);
      const fig = vehicleFigures(v, payload);
      const table = stageTable(v, payload);
      expect(table.rows.map((r) => r.stageId)).toEqual(v.stages.filter((s) => !s.isSpacecraft).map((s) => s.id));
      expect(table.rows.flatMap((r) => r.phases)).toEqual(fig.phases);
      let sum = 0;
      for (const r of table.rows) {
        const s = fig.stages[r.stageIndex];
        expect(r).toMatchObject({ twIgnition: s.twIgnition, ignitionMass: s.ignitionMass, structuralRatio: s.structuralRatio, propellantFraction: s.propellantFraction, boosters: s.boosters });
        expect(r.phases.every((p) => p.stageIndex === r.stageIndex)).toBe(true);
        sum += r.dv;
      }
      expect(Math.abs(sum - table.totalDv) / table.totalDv).toBeLessThanOrEqual(1e-9);
      expect(table).toMatchObject({ totalDv: fig.totalDv, liftoffMass: fig.liftoffMass, liftoffTW: fig.liftoffTW, payloadKg: payload, payloadFraction: fig.payloadFraction });
    });
  }

  it('splits a strap-on stage into its parallel phase and the core alone', () => {
    const [first, second] = stageRows(vehicleFigures(vehicleById('soyuz21a'), 3715));
    expect(first.phases.map((p) => p.phase)).toEqual(['parallel', 'core']);
    expect(first.boosters).toEqual([expect.objectContaining({ id: 'blokBVGD', count: 4 })]);
    expect(second.phases.map((p) => p.phase)).toEqual(['serial']);
    expect(second.boosters).toEqual([]);
  });
});
