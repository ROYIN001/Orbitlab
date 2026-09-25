import { describe, expect, it } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { satelliteById } from '../src/data/satellites';
import { VehicleModel } from '../src/physics/vehicle';
import { add, cross, norm, scale, sub, v3 } from '../src/physics/vec3';
import { buildDetachedStage, buildMassProperties, buildRigidVehicle, cylinderInertia, stageMassComponents, type MassComponent } from '../src/physics/rigid/mass';
import { bodyToRender, chamberGeometry, getRigidVehicleGeometry, rcsGeometry, renderToBody } from '../src/physics/rigid/vehicle-data';
import { assertSPD } from '../src/physics/rigid/math';

describe('component mass properties', () => {
  it('matches independent solid/shell cylinder formulas and an asymmetric composite fixture', () => {
    expect(cylinderInertia(12, 2, 6)).toEqual([24, 0, 0, 0, 48, 0, 0, 0, 48]);
    expect(cylinderInertia(12, 2, 6, true)).toEqual([48, 0, 0, 0, 60, 0, 0, 0, 60]);
    const components: MassComponent[] = [
      { id: 'a', ownerId: 'a', kind: 'structure', mass: 2, centerBody: v3(), inertiaAtCenter: cylinderInertia(2, 1, 2) },
      { id: 'b', ownerId: 'b', kind: 'structure', mass: 3, centerBody: v3(4, 3, 2), inertiaAtCenter: cylinderInertia(3, 2, 4) },
    ];
    const result = buildMassProperties(components);
    expect(result.mass).toBe(5);
    expect(result.cg.x).toBeCloseTo(2.4, 12); expect(result.cg.y).toBeCloseTo(1.8, 12); expect(result.cg.z).toBeCloseTo(1.2, 12);
    const expected = [22.6, -14.4, -9.6, -14.4, 193 / 6, -7.2, -9.6, -7.2, 229 / 6];
    result.inertia.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 11));
    const translated = buildMassProperties(components.map(c => ({ ...c, centerBody: add(c.centerBody, v3(100, -50, 8)) })));
    translated.inertia.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 10));
  });

  it('rejects impossible mass/inertia and treats an empty body explicitly', () => {
    const component: MassComponent = { id: 'a', ownerId: 'a', kind: 'structure', mass: 1, centerBody: v3(), inertiaAtCenter: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
    expect(() => buildMassProperties([{ ...component, mass: -1 }])).toThrow();
    expect(() => buildMassProperties([{ ...component, inertiaAtCenter: [4, 0, 0, 0, 1, 0, 0, 0, 1] }])).toThrow(/Nonphysical/);
    expect(() => buildMassProperties([{ ...component, mass: 0 }])).toThrow(/massless/);
    expect(buildMassProperties([])).toMatchObject({ mass: 0, cg: v3(), inertia: [0, 0, 0, 0, 0, 0, 0, 0, 0] });
  });

  it('moves settled propellant CG smoothly while closing mass and keeping a positive tensor', () => {
    const stage = vehicleById('falcon9').stages[0];
    let previousCG = Infinity;
    for (let step = 100; step >= 0; step--) {
      const remaining = stage.propellantMass * step / 100;
      const properties = buildMassProperties(stageMassComponents(stage, remaining));
      expect(properties.mass).toBeCloseTo(stage.dryMass + remaining, 7);
      expect(() => assertSPD(properties.inertia)).not.toThrow();
      expect(Number.isFinite(properties.cg.x)).toBe(true);
      // Individual distributions stay in the body; no NaN at empty tanks.
      expect(properties.cg.x).toBeGreaterThan(0); expect(properties.cg.x).toBeLessThan(stage.length);
      if (step >= 50) expect(properties.cg.x).toBeLessThanOrEqual(previousCG + 1e-9);
      previousCG = properties.cg.x;
    }
    expect(() => stageMassComponents(stage, -1)).toThrow();
    expect(() => stageMassComponents(stage, stage.propellantMass + 1)).toThrow();
  });
});

describe('reference vehicle mass and geometry closure', () => {
  it.each(['falcon9', 'soyuz21a'])('%s closes wet, partly drained, staged and fairing-free masses', id => {
    const vm = new VehicleModel(vehicleById(id), 1000);
    const original = JSON.stringify(vm);
    const initial = buildRigidVehicle(vm);
    expect(initial.mass).toBeCloseTo(vm.totalMass(), 8);
    expect(JSON.stringify(vm)).toBe(original);
    for (const stage of vm.stages) {
      stage.propellant *= 0.35;
      for (const booster of stage.boosters) booster.propellant *= 0.67;
    }
    expect(buildRigidVehicle(vm).mass).toBeCloseTo(vm.totalMass(), 8);
    vm.jettisonFairing();
    expect(buildRigidVehicle(vm).mass).toBeCloseTo(vm.totalMass(), 8);
    for (const booster of vm.stages[0].boosters) vm.jettisonBooster(booster, 100);
    vm.separateStage(vm.stages[0], 200);
    const upper = buildRigidVehicle(vm);
    expect(upper.mass).toBeCloseTo(vm.totalMass(), 8);
    expect(upper.activeBase.x).toBeGreaterThan(0);
  });

  it.each(['falcon9', 'soyuz21a'])('%s includes spacecraft propulsion mass exactly once', id => {
    const vm = new VehicleModel(vehicleById(id), 7150, false, satelliteById('crew'));
    const result = buildRigidVehicle(vm);
    expect(result.mass).toBeCloseTo(vm.totalMass(), 8);
    expect(result.components.filter(c => c.ownerId === 'spacecraft').reduce((sum, c) => sum + c.mass, 0)).toBeCloseTo(7150, 8);
    expect(result.components.some(c => c.ownerId === 'payload')).toBe(false);
  });

  it('preserves partition mass and tensor when recombining actual owner components', () => {
    const result = buildRigidVehicle(new VehicleModel(vehicleById('soyuz21a'), 1000));
    const ids = [...new Set(result.components.map(c => c.ownerId))];
    const children = ids.map(id => buildMassProperties(result.components.filter(c => c.ownerId === id)));
    const merged = buildMassProperties(children.map((child, i): MassComponent => ({ id: String(i), ownerId: String(i), kind: 'structure',
      mass: child.mass, centerBody: child.cg, inertiaAtCenter: child.inertia })));
    expect(merged.mass).toBeCloseTo(result.mass, 8);
    merged.inertia.forEach((value, i) => expect(value).toBeCloseTo(result.inertia[i], 6));
  });

  it('uses a proper mesh/body mapping, explicit adapters and the drawn Soyuz booster placements', () => {
    const x = renderToBody(v3(1, 0, 0)), y = renderToBody(v3(0, 1, 0)), z = renderToBody(v3(0, 0, 1));
    expect(norm(sub(cross(x, y), z))).toBeLessThan(1e-15);
    expect(bodyToRender(renderToBody(v3(2, 3, 4)))).toEqual(v3(2, 3, 4));
    const falcon = getRigidVehicleGeometry(vehicleById('falcon9'));
    const soyuz = getRigidVehicleGeometry(vehicleById('soyuz21a'));
    expect(falcon.length).toBeCloseTo(72.394, 10);
    // the 4.11 × 11.43 m fairing stands flush on Blok I, its adapter inside its own length
    expect(soyuz.length).toBeCloseTo(46.849, 10);
    expect(falcon.stageBases[1].x).toBe(42);
    expect(falcon.payloadBase.x - falcon.fairingBase.x).toBeCloseTo(0.5, 12);
    const expected = [v3(0, 0, 2.815), v3(0, -2.815, 0), v3(0, 0, -2.815), v3(0, 2.815, 0)];
    soyuz.boosters.forEach((p, i) => expect(norm(sub(p.baseBody, expected[i]))).toBeLessThan(1e-12));
  });

  it('subtracts finite RCS consumption inside the dry mass rather than adding a new mass', () => {
    const vm = new VehicleModel(vehicleById('falcon9'), 1000);
    const wet = buildRigidVehicle(vm);
    const depleted = buildRigidVehicle(vm, { rcsConsumedKgByStage: { s1: 100, s2: 12 } });
    expect(wet.mass - depleted.mass).toBeCloseTo(112, 8);
    expect(depleted.components.some(c => c.id === 's1.rcs')).toBe(false);
    expect(depleted.components.find(c => c.id === 's2.rcs')?.mass).toBe(18);
    expect(() => buildRigidVehicle(vm, { rcsConsumedKgByStage: { s1: 101 } })).toThrow();
  });

  it.each(['falcon9', 'soyuz21a'])('%s evaluates RK trial mass/CG without consuming legacy fuel', id => {
    const vm = new VehicleModel(vehicleById(id), 1000, id === 'falcon9');
    // lit five seconds ago, so past its start-up transient
    vm.igniteStage(vm.stages[0], -5); vm.stages[0].boosters.forEach(b => vm.igniteBooster(b));
    const thrust = vm.thrust(0, 101325, 0.8);
    const op = { pressure: 101325, coreThrottle: thrust.coreThrottle, boosterThrottle: thrust.boosterThrottle };
    const before = JSON.stringify(vm), initial = buildRigidVehicle(vm, op);
    const trial = buildRigidVehicle(vm, { ...op, propellantOffsetSeconds: 0.005 });
    expect(initial.mass - trial.mass).toBeCloseTo(thrust.mdot * 0.005, 7);
    expect(norm(sub(initial.cg, trial.cg))).toBeGreaterThan(0);
    expect(JSON.stringify(vm)).toBe(before);
    const end = buildRigidVehicle(vm, { ...op, propellantOffsetSeconds: 10000 });
    const floor = vm.stages[0].spec.propellantMass * vm.recoveryReserve;
    const corePropellant = end.components.filter(c => c.ownerId === vm.stages[0].spec.id && ['fuel', 'oxidizer'].includes(c.kind)).reduce((n, c) => n + c.mass, 0);
    expect(corePropellant).toBeCloseTo(floor, 7);
  });
});

describe('spatial thrust and finite authority data', () => {
  it('retains the upstream throttle for physical chamber telemetry without applying it twice to force', () => {
    const spec = vehicleById('falcon9'), vm = new VehicleModel(spec, 1000);
    vm.igniteStage(vm.stages[0], 0); vm.stages[0].engineFraction = 8 / 9;
    const powered = buildRigidVehicle(vm, { coreThrottle: 0.6 });
    expect(powered.engines.find(e => e.id === 's1.engine.0')!.upstreamThrottle).toBe(0);
    expect(powered.engines.find(e => e.id === 's1.engine.8')!.upstreamThrottle).toBe(0.6);
    expect(powered.engines.find(e => e.id === 's2.engine.0')!.upstreamThrottle).toBe(0);
    const returning = buildDetachedStage('falcon9', spec.stages[0], 3000, { coreThrottle: 0.08, activeEngineIndices: [8] });
    expect(returning.engines.find(e => e.id === 's1.engine.8')!.upstreamThrottle).toBe(0.08);
    expect(returning.engines.filter(e => e.engineIndex !== 8).every(e => e.upstreamThrottle === 0)).toBe(true);
    expect(returning.engines.reduce((sum, e) => sum + e.thrustBudgetN, 0)).toBeCloseTo(spec.stages[0].engine.thrustVac * 0.08, 10);
  });

  it('keeps a finite payload-only aerodynamic area and the supplied payload dimensions after launcher separation', () => {
    const vm = new VehicleModel(vehicleById('falcon9'), 1000);
    vm.jettisonFairing();
    vm.stages.forEach(stage => vm.separateStage(stage, 0));
    expect(vm.frontalArea()).toBe(0);
    const snapshot = buildRigidVehicle(vm, { payloadDiameter: 1, payloadLength: 1.2 });
    expect(snapshot.mass).toBe(1000);
    expect(snapshot.aero.referenceArea).toBeCloseTo(Math.PI / 4, 12);
    expect(snapshot.aero.referenceLength).toBeCloseTo(1.2, 12);
    expect(snapshot.cg.x - snapshot.activeBase.x).toBeCloseTo(0.6, 12);
    expect(snapshot.inertia).toEqual(cylinderInertia(1000, 0.5, 1.2));
  });

  it.each(['falcon9', 'soyuz21a'])('%s preserves current pressure/throttle/failure force and flow budgets', id => {
    const vm = new VehicleModel(vehicleById(id), 1000);
    vm.igniteStage(vm.stages[0], 0);
    vm.stages[0].boosters.forEach(b => vm.igniteBooster(b));
    for (const pressure of [0, 25000, 101325]) for (const throttle of [0.4, 0.8, 1]) for (const fraction of [1, 8 / 9, 0.5, 0]) {
      vm.stages[0].engineFraction = fraction;
      const thrust = vm.thrust(10, pressure, throttle);
      const rigid = buildRigidVehicle(vm, { pressure, coreThrottle: thrust.coreThrottle, boosterThrottle: thrust.boosterThrottle });
      expect(rigid.engines.reduce((n, e) => n + e.thrustBudgetN, 0)).toBeCloseTo(thrust.thrust, 6);
      expect(rigid.engines.reduce((n, e) => n + e.massFlowKgS, 0)).toBeCloseTo(thrust.mdot, 9);
    }
  });

  it('places Falcon engine-out off axis while a central-only recovery engine has no roll authority', () => {
    const spec = vehicleById('falcon9'), vm = new VehicleModel(spec, 1000);
    vm.igniteStage(vm.stages[0], 0); vm.stages[0].engineFraction = 8 / 9;
    const state = buildRigidVehicle(vm, { pressure: 0, coreThrottle: 1 });
    expect(state.engines.find(e => e.id === 's1.engine.0')?.thrustBudgetN).toBe(0);
    const moment = state.engines.reduce((sum, e) => add(sum, cross(sub(e.positionBody, state.cg), scale(e.directionBody, e.thrustBudgetN))), v3());
    expect(norm(moment)).toBeGreaterThan(1e5);
    const landing = buildDetachedStage('falcon9', spec.stages[0], 20000, { coreThrottle: 0.4, activeEngineIndices: [8] });
    const running = landing.engines.filter(e => e.thrustBudgetN > 0);
    expect(running.map(e => e.id)).toEqual(['s1.engine.8']);
    expect(cross(sub(running[0].positionBody, landing.cg), v3(100, 20, 30)).x).toBe(0);
    expect(landing.mass).toBeCloseTo(45600, 9);
  });

  it('models Soyuz fixed mains and verniers as six/eight-chamber shared-feed clusters', () => {
    const spec = vehicleById('soyuz21a');
    const core = chamberGeometry('blokA', 'blokA', spec.stages[0].engine, 2.95 / 2);
    const upper = chamberGeometry('blokI', 'blokI', spec.stages[1].engine, 2.66 / 2);
    const b = spec.stages[0].boosters![0];
    const booster = chamberGeometry('blokBVGD.0', 'blokBVGD', b.engine, b.diameter / 2);
    expect([core.length, upper.length, booster.length]).toEqual([8, 8, 6]);
    for (const cluster of [core, upper, booster]) {
      expect(new Set(cluster.map(c => c.clusterId)).size).toBe(1);
      expect(cluster.reduce((n, c) => n + c.thrustFraction, 0)).toBeCloseTo(1, 14);
      expect(cluster.filter(c => c.kind === 'main').every(c => c.gimbalAxesBody.length === 0)).toBe(true);
      expect(cluster.filter(c => c.kind === 'vernier').every(c => c.gimbalAxesBody.length === 1)).toBe(true);
    }
  });

  it('provides force pairs with independent signed torques and no synthetic Soyuz coast RCS', () => {
    const stage = vehicleById('falcon9').stages[0], data = rcsGeometry('falcon9', stage);
    expect(data.thrusters.length).toBe(12);
    for (const [axis, key] of [['roll', 'x'], ['pitch', 'y'], ['yaw', 'z']] as const) {
      const pair = data.thrusters.filter(t => t.id.includes(`.${axis}.1.`));
      const force = pair.reduce((sum, t) => add(sum, scale(t.directionBody, t.maxThrust)), v3());
      const moment = pair.reduce((sum, t) => add(sum, cross(t.positionBody, scale(t.directionBody, t.maxThrust))), v3());
      expect(norm(force)).toBeLessThan(1e-10); expect(moment[key]).toBeGreaterThan(0);
      expect(norm(moment)).toBeCloseTo(moment[key], 10);
    }
    expect(rcsGeometry('soyuz21a', vehicleById('soyuz21a').stages[1]).initialPropellantKg).toBe(0);
  });
});
