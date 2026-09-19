import { describe, expect, it } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { VehicleModel } from '../src/physics/vehicle';
import { add, cross, norm, scale, sub, v3 } from '../src/physics/vec3';
import { buildMassProperties, buildRigidVehicle, cylinderInertia, type MassComponent } from '../src/physics/rigid/mass';
import { detachedOwnerPartitions, fairingHalfPartitions, partitionRigidSnapshot } from '../src/physics/rigid/partition';
import { quatFromAxisAngle, quatRotate } from '../src/physics/rigid/math';
import { rigidMomentum } from '../src/physics/rigid/staging';
import type { RigidState } from '../src/physics/rigid/integrator';

const state = (): RigidState => ({ r: v3(6378137, 300, 200), v: v3(20, 200, 30),
  attitudeQ: quatFromAxisAngle(v3(1, 2, 3), 0.7), omegaBody: v3(0.03, -0.02, 0.01) });

describe('component ownership staging adapter', () => {
  it.each(['falcon9', 'soyuz21a'])('%s staging conserves both momenta and retains spin-induced separation velocities', id => {
    const vm = new VehicleModel(vehicleById(id), 1000);
    vm.stages[0].propellant *= 0.2;
    const parent = buildRigidVehicle(vm), initial = state();
    const owners = [vm.stages[0].spec.id, ...parent.geometry.boosters.filter(b => b.stageIndex === 0).map(b => b.id)];
    const definitions = detachedOwnerPartitions(parent, [{ id: 'spent', ownerIds: owners, datumBody: parent.geometry.stageBases[0] }]);
    const child = partitionRigidSnapshot(initial, parent, definitions);
    expect(child.map(c => c.id)).toEqual(['active', 'spent']);
    const before = rigidMomentum(initial, { mass: parent.mass, inertiaBody: parent.inertia }, initial.r);
    const after = child.map(c => rigidMomentum(c.state, { mass: c.properties.mass, inertiaBody: c.properties.inertia }, initial.r));
    const linear = after.reduce((sum, p) => add(sum, p.linear), v3()), angular = after.reduce((sum, p) => add(sum, p.angular), v3());
    expect(norm(sub(linear, before.linear)) / norm(before.linear)).toBeLessThan(1e-12);
    expect(norm(sub(angular, before.angular)) / norm(before.angular)).toBeLessThan(1e-7);
    const omegaI = quatRotate(initial.attitudeQ, initial.omegaBody);
    for (const c of child) {
      const expectedVelocity = add(initial.v, cross(omegaI, quatRotate(initial.attitudeQ, c.offsetBody)));
      expect(norm(sub(c.state.v, expectedVelocity))).toBeLessThan(1e-12);
    }
  });

  it('separates four Soyuz booster owners, recentres local data and retains each mesh roll', () => {
    const parent = buildRigidVehicle(new VehicleModel(vehicleById('soyuz21a'), 1000));
    const definitions = detachedOwnerPartitions(parent, parent.geometry.boosters.map(b => ({ id: b.id, ownerIds: [b.id],
      datumBody: b.baseBody, bodyToParentQ: quatFromAxisAngle(v3(1, 0, 0), b.rotationAboutX) })));
    const children = partitionRigidSnapshot(state(), parent, definitions);
    expect(children.length).toBe(5);
    for (const child of children.slice(1)) {
      expect(child.properties.mass).toBeCloseTo(43384, 8);
      expect(Math.abs(child.properties.cg.y) + Math.abs(child.properties.cg.z)).toBeLessThan(1e-10);
      expect(child.properties.components.every(c => Math.abs(c.centerBody.y) + Math.abs(c.centerBody.z) < 1e-10)).toBe(true);
      expect(child.sourceOwnerIds).toEqual([child.id]);
    }
  });

  it('reconstructs full asymmetric component tensors in a rotated child frame', () => {
    const components: MassComponent[] = [
      { id: 'a1', ownerId: 'a', kind: 'equipment', mass: 3, centerBody: v3(1, 2, 3), inertiaAtCenter: cylinderInertia(3, 1, 2) },
      { id: 'a2', ownerId: 'a', kind: 'equipment', mass: 4, centerBody: v3(3, 4, 1), inertiaAtCenter: cylinderInertia(4, 2, 3) },
      { id: 'b', ownerId: 'b', kind: 'equipment', mass: 5, centerBody: v3(10, -3, 5), inertiaAtCenter: cylinderInertia(5, 1, 4) },
    ];
    const parent = buildMassProperties(components);
    expect(() => partitionRigidSnapshot(state(), parent, [{ id: 'a', ownerIds: ['a'], datumBody: v3(1, 1, 1),
      bodyToParentQ: quatFromAxisAngle(v3(1, 3, 5), 1.2) }, { id: 'b', ownerIds: ['b'] }])).not.toThrow();
  });

  it('models the disclosed co-located fairing halves without losing mass/tensor or adding unilateral kicks', () => {
    const parent = buildRigidVehicle(new VehicleModel(vehicleById('falcon9'), 1000));
    const beforeState = state(), definitions = fairingHalfPartitions(parent);
    const noKick = partitionRigidSnapshot(beforeState, parent, definitions);
    const left = noKick.find(c => c.id === 'fairing.0')!, right = noKick.find(c => c.id === 'fairing.1')!;
    expect(left.properties.mass).toBe(950); expect(right.properties.mass).toBe(950);
    expect(left.state.r).toEqual(right.state.r); expect(left.state.v).toEqual(right.state.v);
    const point = parent.components.find(c => c.id === 'fairing')!.centerBody;
    const kicked = partitionRigidSnapshot(beforeState, parent, definitions, [{ childAId: 'fairing.0', childBId: 'fairing.1',
      pointDatumBody: point, impulseOnABody: v3(0, 2375, 0) }]);
    const kl = kicked.find(c => c.id === 'fairing.0')!, kr = kicked.find(c => c.id === 'fairing.1')!;
    expect(norm(sub(kl.state.v, left.state.v))).toBeCloseTo(2.5, 12);
    expect(norm(add(sub(kl.state.v, left.state.v), sub(kr.state.v, right.state.v)))).toBeLessThan(1e-12);
    const before = rigidMomentum(beforeState, { mass: parent.mass, inertiaBody: parent.inertia }, beforeState.r);
    const momenta = kicked.map(c => rigidMomentum(c.state, { mass: c.properties.mass, inertiaBody: c.properties.inertia }, beforeState.r));
    expect(norm(sub(momenta.reduce((sum, p) => add(sum, p.angular), v3()), before.angular)) / norm(before.angular)).toBeLessThan(1e-7);
  });

  it('rejects missing, repeated, manufactured or displaced component ownership', () => {
    const parent = buildRigidVehicle(new VehicleModel(vehicleById('falcon9'), 1000)), s = state();
    expect(() => partitionRigidSnapshot(s, parent, [{ id: 'only', ownerIds: ['s1'] }])).toThrow(/ownership/);
    const all = [...new Set(parent.components.map(c => c.ownerId))];
    expect(() => partitionRigidSnapshot(s, parent, [{ id: 'a', ownerIds: all }, { id: 'b', ownerIds: ['s1'] }])).toThrow(/ownership/);
    expect(() => partitionRigidSnapshot(s, parent, [{ id: 'a', ownerIds: ['unknown'] }])).toThrow(/owner/);
    expect(() => partitionRigidSnapshot(s, parent, [{ id: 'a', components: parent.components.map(c => c.id !== 'fairing' ? c : { ...c, centerBody: add(c.centerBody, v3(0, 1, 0)) }) }])).toThrow(/relocate/);
    expect(() => partitionRigidSnapshot(s, parent, [{ id: 'a', components: parent.components.map(c => c.id !== 'fairing' ? c : { ...c, mass: c.mass / 2 }) }])).toThrow(/tensor/);
    expect(() => partitionRigidSnapshot(s, { ...parent, mass: parent.mass + 100 }, [{ id: 'a', ownerIds: all }])).toThrow(/mass/);
  });

  it('does not mutate input snapshot or let child component mutation affect the parent', () => {
    const parent = buildRigidVehicle(new VehicleModel(vehicleById('falcon9'), 1000));
    const before = JSON.stringify(parent), s = state(), stateBefore = JSON.stringify(s);
    const child = partitionRigidSnapshot(s, parent, detachedOwnerPartitions(parent, [{ id: 'spent', ownerIds: ['s1'] }]));
    child[0].properties.components[0].centerBody.x = 12345;
    child[0].state.v = scale(child[0].state.v, 2);
    expect(JSON.stringify(parent)).toBe(before); expect(JSON.stringify(s)).toBe(stateBefore);
  });
});
