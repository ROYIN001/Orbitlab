import { describe, expect, it } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { satelliteById } from '../src/data/satellites';
import { VehicleModel } from '../src/physics/vehicle';
import { DEG, G0 } from '../src/physics/constants';
import { norm, scale, v3 } from '../src/physics/vec3';
import { stepRcs } from '../src/physics/rigid/actuators';
import { buildMassProperties, buildRigidVehicle, type RigidVehicleSnapshot } from '../src/physics/rigid/mass';
import { quatAngularDistance, quatFromAxisAngle, quatIdentity, type Mat3 } from '../src/physics/rigid/math';
import { RigidRuntime, type SnapshotProvider } from '../src/physics/rigid/runtime';

type Body = 'Falcon upper stage' | 'synthetic spacecraft';
function coastBody(body: Body): VehicleModel {
  const vehicle = new VehicleModel(vehicleById(body === 'Falcon upper stage' ? 'falcon9' : 'soyuz21a'),
    body === 'Falcon upper stage' ? 1000 : 7150, false, body === 'synthetic spacecraft' ? satelliteById('crew') : undefined);
  vehicle.activeIndex = vehicle.stages.length - 1;
  vehicle.fairingAttached = false;
  vehicle.stages.forEach(stage => {
    stage.attached = stage.index === vehicle.activeIndex;
    stage.boosters.forEach(booster => { booster.attached = false; });
  });
  vehicle.active!.propellant *= 0.65;
  return vehicle;
}

/** Inventory is redistributed inside the fixed dry budget. The gas component
 * and compensating shell/equipment masses retain their disclosed geometry;
 * every changed CG/tensor is rebuilt from components, not edited independently.
 * Scale consumed gas only at the base-factory boundary to respect its nominal
 * budget, then recover the actual changed inventory and consumed mass exactly. */
function inventoryProvider(vehicle: VehicleModel, factor: number): SnapshotProvider {
  return (_elapsed, consumed) => {
    const base = buildRigidVehicle(vehicle, { rcsConsumedKgByStage: Object.fromEntries(Object.entries(consumed).map(([id, used]) => [id, used / factor])) });
    const parts = base.components.map(part => {
      const reservoir = base.rcs.find(candidate => candidate.stageId === part.ownerId);
      if (!reservoir) return part;
      if (part.kind === 'rcs') return { ...part, mass: part.mass * factor,
        inertiaAtCenter: part.inertiaAtCenter.map(value => value * factor) as unknown as Mat3 };
      if (part.kind !== 'structure' && part.kind !== 'equipment') return part;
      const nonGasDry = base.components.filter(candidate => candidate.ownerId === part.ownerId && (candidate.kind === 'structure' || candidate.kind === 'equipment')).reduce((sum, candidate) => sum + candidate.mass, 0);
      const ratio = 1 - (factor - 1) * reservoir.initialPropellantKg / nonGasDry;
      if (!(ratio > 0)) throw new RangeError('Inventory exceeds available dry mass');
      return { ...part, mass: part.mass * ratio, inertiaAtCenter: part.inertiaAtCenter.map(value => value * ratio) as unknown as Mat3 };
    });
    return { ...base, ...buildMassProperties(parts), rcs: base.rcs.map(reservoir => ({ ...reservoir, initialPropellantKg: reservoir.initialPropellantKg * factor })) };
  };
}

describe('finite RCS inventory uncertainty in engine-off configurations', () => {
  for (const body of ['Falcon upper stage', 'synthetic spacecraft'] as const) {
    it.each([0.5, 1, 2])(`${body}: inventory factor %s preserves dry closure and settles all three axes`, factor => {
      const vehicle = coastBody(body), provider = inventoryProvider(vehicle, factor);
      const reference = buildRigidVehicle(vehicle), initial = provider(0, {});
      expect(initial.mass).toBeCloseTo(reference.mass, 9);
      expect(initial.rcs[0].initialPropellantKg).toBe(reference.rcs[0].initialPropellantKg * factor);
      expect(initial.engines.every(engine => engine.thrustBudgetN === 0)).toBe(true);
      const mainFuel = vehicle.active!.propellant;
      for (const axis of [v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, 1)]) {
        // Negligible gravity/zero atmospheric density isolates real paired jets.
        // This is a coast component fixture, not a complete orbital mission.
        const runtime = new RigidRuntime({ model: 'sixDof', wind: 'calm', seed: 42 }, 'inventory-coast-fixture');
        let state = { r: v3(1e12, 0, 0), v: v3(), attitudeQ: quatFromAxisAngle(axis, DEG), omegaBody: scale(axis, 0.1 * DEG) };
        let last: RigidVehicleSnapshot = initial, spent = 0, settled = 0;
        for (let tick = 0; tick < 6000; tick++) {
          const result = runtime.step(tick * 0.01, state, 0.01, v3(1, 0, 0), v3(0, 0, 1), provider);
          state = result.state; last = result.snapshot;
          const used = Object.values(runtime.consumed).reduce((sum, value) => sum + value, 0);
          expect(used).toBeGreaterThanOrEqual(spent);
          expect(used).toBeLessThanOrEqual(initial.rcs[0].initialPropellantKg);
          expect(last.mass).toBeCloseTo(initial.mass - used, 7);
          spent = used;
          settled = quatAngularDistance(state.attitudeQ, quatIdentity()) < 0.1 * DEG && norm(state.omegaBody) < 0.05 * DEG ? settled + 1 : 0;
          if (settled >= 200) break;
        }
        expect(settled, `${body}/${factor}: not settled for two seconds within the 60 s bound`).toBeGreaterThanOrEqual(200);
        expect(spent).toBeGreaterThan(0);
        expect(last.mass).toBeLessThan(initial.mass);
        expect(norm(state.v)).toBeLessThan(1e-7);
      }
      expect(vehicle.active!.propellant).toBe(mainFuel);
    }, 30000);

    it.each([0.5, 1, 2])(`${body}: inventory factor %s delivers only its finite jet impulse and then zero force`, factor => {
      const vehicle = coastBody(body), provider = inventoryProvider(vehicle, factor), start = provider(0, {});
      const gas = start.rcs[0].initialPropellantKg, jets = start.rcsThrusters;
      // One opposed roll couple: retain actual nozzle positions and capacity.
      const first = jets[0], opposite = jets.find(jet => jet.id !== first.id && norm({ x: jet.directionBody.x + first.directionBody.x, y: jet.directionBody.y + first.directionBody.y, z: jet.directionBody.z + first.directionBody.z }) < 1e-12)!;
      const pair = [first, opposite];
      const flow = pair.reduce((sum, jet) => sum + jet.maxThrust / (jet.isp * G0), 0);
      const dt = gas / flow * 1.25;
      const burn = stepRcs(pair, [1, 1], gas, dt, start.cg);
      expect(burn.consumedKg).toBeCloseTo(gas, 10);
      expect(burn.propellantKg).toBe(0);
      expect(burn.activeFraction).toBeCloseTo(0.8, 12);
      expect(norm(burn.wrench.momentBody)).toBeGreaterThan(0);
      const end = provider(dt, { [start.rcs[0].stageId]: gas });
      expect(end.mass).toBeCloseTo(start.mass - gas, 8);
      expect(end.components.some(part => part.kind === 'rcs')).toBe(false);
      const empty = stepRcs(pair, [1, 1], 0, 1, end.cg);
      expect(norm(empty.wrench.forceBody) + norm(empty.wrench.momentBody)).toBe(0);
    });
  }
});
