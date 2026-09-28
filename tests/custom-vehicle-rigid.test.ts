/**
 * Six-DOF for custom vehicles: the fixes before roadmap D03 offers six-DOF as
 * experimental for a vehicle built from parts (docs/ROADMAP-PART2-3.md, D03).
 * What a stage the catalogue has no six-DOF data for gets — every engine's
 * thrust, its own aerodynamic tables, a solid grain, attitude thrusters — and
 * what stays with a catalogue origin only.
 *
 * The fleet-wide checks (the flight model's thrust in the chambers, three axes
 * of control in every configuration that burns) run over the same constructed
 * vehicles in tests/rigid-fleet.test.ts. That none of this reaches a catalogue
 * flight is pinned by tests/heavy/sixdof-fingerprint.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { engineLayout } from '../src/data/engine-layout';
import { vehicleSpecProblems } from '../src/config/vehicle-spec';
import { chamberGeometry, renderToBody } from '../src/physics/rigid/vehicle-data';
import { v3 } from '../src/physics/vec3';
import type { BoosterGroupSpec, StageSpec, VehicleSpec } from '../src/types';
import { scratchVehicles } from './custom-vehicle-harness';

const SCRATCH = scratchVehicles();
const [NEW_IDS, FALCON_FIVE, SOYUZ_MULTI] = SCRATCH;
const DEG = Math.PI / 180;
const parts = (spec: VehicleSpec): (StageSpec | BoosterGroupSpec)[] => spec.stages.flatMap((s) => [s, ...(s.boosters ?? [])]);
/** Every stage and strap-on id the catalogue flies, gathered here rather than asked of the library. */
const CATALOGUE_PARTS = new Set(VEHICLES.flatMap((v) => parts(v).map((p) => p.id)));

describe('six-DOF for custom vehicles (D03): the constructed vehicles', () => {
  it('are valid custom vehicles, and reach the branches no catalogue stage does', () => {
    for (const spec of SCRATCH) expect({ [spec.id]: vehicleSpecProblems(spec) }).toEqual({ [spec.id]: [] });
    expect(parts(NEW_IDS).map((p) => [p.id, CATALOGUE_PARTS.has(p.id)]))
      .toEqual([['x1', false], ['xl', false], ['xs', false], ['x2', false], ['x3', false]]);
    // The two ids with dedicated chamber branches, flown with another engine count than the catalogue's.
    expect(FALCON_FIVE.stages[0]).toMatchObject({ id: 's1', engine: { count: 5 } });
    expect(parts(SOYUZ_MULTI).map((p) => [p.id, p.engine.count])).toEqual([['blokA', 2], ['blokBVGD', 2], ['blokI', 3]]);
    // Not one catalogue object was touched on the way.
    expect(vehicleById('falcon9').stages[0].engine.count).toBe(9);
    expect(parts(vehicleById('soyuz21a')).map((p) => p.engine.count)).toEqual([1, 1, 1]);
  });
});

describe('six-DOF for custom vehicles (D03): every engine in the chambers', () => {
  // The chambers' thrust fractions are shares of ONE engine's thrust (the snapshot
  // multiplies them by `engineThrust`, which is per engine), so a part's must add
  // up to its engine count. An identity, held to 1e-12, fixed before any run.
  it('shares every engine among the chambers of every part, catalogue and custom', () => {
    for (const spec of [...VEHICLES, ...SCRATCH]) for (const p of parts(spec)) {
      const chambers = chamberGeometry(p.id, p.id, p.engine, p.diameter / 2);
      expect(chambers.reduce((sum, c) => sum + c.thrustFraction, 0), `${spec.id} ${p.id}`).toBeCloseTo(p.engine.count, 12);
    }
  });

  it('puts a stage with no layout of its own on the bells the renderer draws for it, with the generic 5° two-axis travel', () => {
    // [part, bells, engines per bell]: the generic ring draws at most eight
    // bells, a kept `s1` draws the octaweb whatever its count, and the R-7
    // blocks draw their four chambers (their verniers get no share: the generic
    // steering has none to give them).
    const expected: [StageSpec | BoosterGroupSpec, number, number][] = [
      [NEW_IDS.stages[0], 8, 12 / 8], [NEW_IDS.stages[0].boosters![0], 2, 1], [NEW_IDS.stages[1], 4, 1],
      [FALCON_FIVE.stages[0], 9, 5 / 9],
      [SOYUZ_MULTI.stages[0], 4, 2 / 4], [SOYUZ_MULTI.stages[0].boosters![0], 4, 2 / 4], [SOYUZ_MULTI.stages[1], 4, 3 / 4],
    ];
    for (const [p, bells, share] of expected) {
      const R = p.diameter / 2;
      const chambers = chamberGeometry(p.id, p.id, p.engine, R);
      const mains = chambers.filter((c) => c.kind === 'main');
      const drawn = engineLayout(p.id, p.engine, R);
      expect(mains, p.id).toHaveLength(bells);
      mains.forEach((c, i) => {
        const at = renderToBody(v3(drawn.nozzles[i].x, 0, drawn.nozzles[i].z));
        expect(c.positionBody.y, p.id).toBeCloseTo(at.y, 12);
        expect(c.positionBody.z, p.id).toBeCloseTo(at.z, 12);
        expect(c.thrustFraction, p.id).toBeCloseTo(share, 12);
        expect(c.maxGimbalRad, p.id).toBe(5 * DEG);
        expect(c.gimbalAxesBody, p.id).toEqual([v3(0, 1, 0), v3(0, 0, 1)]);
      });
      for (const vernier of chambers.filter((c) => c.kind === 'vernier')) expect(vernier.thrustFraction, p.id).toBe(0);
      // Every engine has a bell when there are fewer engines than bells, and no
      // two bells share an engine when there are more.
      expect(new Set(mains.map((c) => c.engineIndex)).size, p.id).toBe(Math.min(bells, p.engine.count));
    }
    // A single engine keeps the one on-axis chamber it always had.
    for (const p of [NEW_IDS.stages[0].boosters![1], NEW_IDS.stages[2]]) {
      const [only, ...rest] = chamberGeometry(p.id, p.id, p.engine, p.diameter / 2);
      expect(rest, p.id).toEqual([]);
      expect([only.thrustFraction, Math.hypot(only.positionBody.y, only.positionBody.z), only.maxGimbalRad], p.id).toEqual([1, 0, 5 * DEG]);
    }
  });
});
