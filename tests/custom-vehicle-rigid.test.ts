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
import { VEHICLES, vehicleById, vehicleDataId } from '../src/data/vehicles';
import { engineLayout } from '../src/data/engine-layout';
import { vehicleSpecProblems } from '../src/config/vehicle-spec';
import { VehicleModel } from '../src/physics/vehicle';
import { buildRigidVehicle, stageMassComponents } from '../src/physics/rigid/mass';
import {
  chamberGeometry, isCataloguePartId, PROPELLANT_LOADS, rcsGeometry, renderToBody, thrusterMomentArm,
} from '../src/physics/rigid/vehicle-data';
import { scale, v3 } from '../src/physics/vec3';
import type { BoosterGroupSpec, StageSpec, VehicleSpec } from '../src/types';
import { copyOf, scratchVehicles } from './custom-vehicle-harness';

const SCRATCH = scratchVehicles();
const [NEW_IDS, FALCON_FIVE, SOYUZ_MULTI] = SCRATCH;
const DEG = Math.PI / 180;
const circle = (d: number) => Math.PI * d * d / 4;
const parts = (spec: VehicleSpec): (StageSpec | BoosterGroupSpec)[] => spec.stages.flatMap((s) => [s, ...(s.boosters ?? [])]);
/** Every stage and strap-on id the catalogue flies, gathered here rather than asked of the library. */
const CATALOGUE_PARTS = new Set(VEHICLES.flatMap((v) => parts(v).map((p) => p.id)));

describe('six-DOF for custom vehicles (D03): the constructed vehicles', () => {
  it('are valid custom vehicles, and reach the branches no catalogue stage does', () => {
    for (const spec of SCRATCH) expect({ [spec.id]: vehicleSpecProblems(spec) }).toEqual({ [spec.id]: [] });
    expect(parts(NEW_IDS).map((p) => [p.id, CATALOGUE_PARTS.has(p.id)]))
      .toEqual([['x1', false], ['xl', false], ['xs', false], ['x2', false], ['x3', false]]);
    // The library's test of a new id says the same, part by part.
    for (const spec of [...VEHICLES, ...SCRATCH]) for (const p of parts(spec)) {
      expect(isCataloguePartId(p.id), `${spec.id} ${p.id}`).toBe(CATALOGUE_PARTS.has(p.id));
    }
    expect(isCataloguePartId('spacecraft')).toBe(false);
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

describe('six-DOF for custom vehicles (D03): aerodynamic tables of the design flown', () => {
  const table = (spec: VehicleSpec) => buildRigidVehicle(new VehicleModel(spec, 1000)).aero.table!;
  const base = (): VehicleSpec => {
    const { derivedFrom: _, ...spec } = copyOf('falcon9');
    return { ...spec, id: 'scratch-aero' };
  };

  it('keeps one table per design, not per id: a stretched stage moves the centre of pressure by the stretch', () => {
    const short = base(), long = structuredClone(short);
    const stretch = 6.5;
    long.stages[0].length += stretch;
    const before = table(short), after = table(long);
    // The same design twice is the same table (the cache still works).
    expect(table(short)).toBe(before);
    // Slender-body theory: the normal-force slope is 2·(area gained)/S, and a
    // longer cylinder gains no area, so C_Nα is the same at every Mach; every
    // lift term (the fairing's joint, its ogive, the carried-over lift behind
    // it) sits above the stretched stage and moves up by exactly the stretch,
    // and the side area grows by diameter × stretch. Identities, to 1e-9 m.
    expect(after.normalSlope).toEqual(before.normalSlope);
    after.cpX.forEach((x, i) => expect(x - before.cpX[i]).toBeCloseTo(stretch, 9));
    expect(after.planformArea - before.planformArea).toBeCloseTo(short.stages[0].diameter * stretch, 9);
  });

  it('gives a widened first stage under the same id the slope slender-body theory gives its base', () => {
    const narrow = base(), wide = structuredClone(narrow);
    wide.stages[0].diameter = 4.2;
    const before = buildRigidVehicle(new VehicleModel(narrow, 1000)).aero, after = buildRigidVehicle(new VehicleModel(wide, 1000)).aero;
    // The 5.2 m fairing is still the widest part, so the reference area is the same.
    expect(after.referenceArea).toBe(before.referenceArea);
    // Subsonic (no carried-over lift up to Mach 0.8) a pointed body's C_Nα is
    // 2·A_base/S whatever the steps above the base: the terms telescope.
    // Held to 1e-12 relative, fixed before the comparison.
    const S = before.referenceArea;
    for (const [aero, d] of [[before, narrow.stages[0].diameter], [after, 4.2]] as const) {
      aero.table!.mach.forEach((m, i) => {
        if (m <= 0.8) expect(aero.table!.normalSlope[i] / (2 * circle(d) / S)).toBeCloseTo(1, 12);
      });
    }
    expect(after.table!.normalSlope[0]).not.toBe(before.table!.normalSlope[0]);
  });
});

describe('six-DOF for custom vehicles (D03): a solid stage the catalogue does not know', () => {
  it('burns it as a grain from the bore, exactly as the catalogue motor of the same size', () => {
    const z9 = vehicleById('vegac').stages.find((s) => s.id === 'z9')!;
    const x3 = NEW_IDS.stages[2];
    expect(x3).toEqual({ ...z9, id: 'x3', name: 'Solid third stage' });
    const unowned = (list: ReturnType<typeof stageMassComponents>) => list.map(({ id: _, ownerId: __, ...c }) => c);
    for (const fill of [1, 0.5, 0.1, 0]) {
      expect(unowned(stageMassComponents(x3, fill * x3.propellantMass))).toEqual(unowned(stageMassComponents(z9, fill * z9.propellantMass)));
    }
    // A thick-walled tube about its axis: I = m (r_o² + r_i²)/2, the case at
    // 0.95 R and, full, the bore at 0.3 R (the model's estimated grain). To 1e-12 relative.
    const R = x3.diameter / 2, full = stageMassComponents(x3, x3.propellantMass);
    expect(full.map((c) => c.kind)).toEqual(['structure', 'equipment', 'fuel']);
    const grain = full.find((c) => c.kind === 'fuel')!;
    expect(grain.centerBody.x).toBe(x3.length / 2);
    expect(grain.inertiaAtCenter[0] / (x3.propellantMass * ((0.95 * R) ** 2 + (0.3 * R) ** 2) / 2)).toBeCloseTo(1, 12);
    // A liquid stage the catalogue does not know still has its two tanks.
    expect(stageMassComponents(NEW_IDS.stages[1], NEW_IDS.stages[1].propellantMass).map((c) => c.kind))
      .toEqual(['structure', 'equipment', 'fuel', 'oxidizer']);
  });

  it('reaches no catalogue stage: every catalogue solid has its grain entry, and only they do', () => {
    for (const spec of VEHICLES) for (const p of parts(spec)) {
      expect(PROPELLANT_LOADS[p.id]?.family === 'solid', `${spec.id} ${p.id}`).toBe(!!p.engine.solid);
    }
  });
});

describe('six-DOF for custom vehicles (D03): attitude thrusters', () => {
  it('gives an upper stage the catalogue does not know the generic three-axis set, and its first stage none', () => {
    const snapshot = buildRigidVehicle(new VehicleModel(NEW_IDS, 1000));
    const byStage = new Map(snapshot.rcs.map((r) => [r.stageId, r]));
    expect(byStage.get('x1')).toMatchObject({ initialPropellantKg: 0, thrusters: [] });
    for (const stage of NEW_IDS.stages.slice(1)) {
      const set = byStage.get(stage.id)!;
      // Falcon 9's second-stage installation: 50 N cold gas at 60 s, the gas
      // the lesser of 10 % of the dry mass and 30 kg (estimates, E).
      expect(set.initialPropellantKg, stage.id).toBe(Math.min(0.1 * stage.dryMass, 30));
      expect(set.thrusters, stage.id).toHaveLength(12);
      for (const jet of set.thrusters) expect([jet.maxThrust, jet.isp], stage.id).toEqual([50, 60]);
    }
  });

  it('gives the generic set the roll authority of a couple across the stage, F·d', () => {
    // The Zefiro 9 third stage alone: one chamber on the axis, so no roll of its own.
    const vm = new VehicleModel(NEW_IDS, 1000);
    vm.separateStage(vm.stages[0], 100);
    vm.jettisonFairing();
    vm.separateStage(vm.stages[1], 200);
    const snapshot = buildRigidVehicle(vm);
    const x3 = NEW_IDS.stages[2];
    let roll = 0;
    for (const jet of snapshot.rcsThrusters) roll += Math.max(0, scale(thrusterMomentArm(jet, snapshot.cg), jet.maxThrust).x);
    // Each sense has two 50 N jets pushing opposite ways at ±R: a couple of
    // 2·F·R = F·d. To 1e-9 relative, fixed before the comparison.
    expect(roll / (50 * x3.diameter)).toBeCloseTo(1, 9);
  });

  it('changes nothing for a catalogue stage id, on any vehicle', () => {
    for (const spec of [...VEHICLES, FALCON_FIVE, SOYUZ_MULTI]) spec.stages.forEach((stage, index) => {
      const at = v3(1, 0, 0);
      expect(rcsGeometry(vehicleDataId(spec), stage, at, index), `${spec.id} ${stage.id}`).toEqual(rcsGeometry(vehicleDataId(spec), stage, at));
    });
  });
});
