import { describe, expect, it } from 'vitest';
import { DEG } from '../src/physics/constants';
import { dot, v3 } from '../src/physics/vec3';
import { vehicleById } from '../src/data/vehicles';
import { VehicleModel } from '../src/physics/vehicle';
import { buildRigidVehicle } from '../src/physics/rigid/mass';
import { aerodynamicWrench, staticAeroMoment, type Aero6DofSpec } from '../src/physics/rigid/aero';
import { atMach, crossflowDragCoefficient, detachedAeroTable } from '../src/physics/rigid/aero-tables';
import { RigidRuntime } from '../src/physics/rigid/runtime';

/** Normal-force coefficient and its centre of pressure (body x) at one angle, from the full wrench. */
function normalAt(spec: Aero6DofSpec, mach: number, angle: number, cgX = 0) {
  const speed = 300, density = 1;
  const load = aerodynamicWrench(spec, { density, speedOfSound: speed / mach, omegaBody: v3(), cgBody: v3(cgX),
    airVelocityBody: v3(speed * Math.cos(angle), 0, speed * Math.sin(angle)) });
  const qS = 0.5 * density * speed * speed * spec.referenceArea;
  // Moment about y from a normal force along -z acting at x: M_y = (x - cg) * F_z * -1.
  return { cn: -load.forceBody.z / qS, ca: -load.forceBody.x / qS, cpX: cgX + load.momentBody.y / load.forceBody.z * -1, load };
}

function stack(id: string) {
  const vm = new VehicleModel(vehicleById(id), 1000);
  return { vm, snapshot: buildRigidVehicle(vm) };
}

describe('per-vehicle six-DOF aerodynamic tables', () => {
  it('builds a table for each reference vehicle from its own layout', () => {
    for (const id of ['falcon9', 'soyuz21a']) {
      const { snapshot } = stack(id);
      const table = snapshot.aero.table!;
      expect(table).toBeDefined();
      expect(table.normalSlope.every(Number.isFinite)).toBe(true);
      expect(table.cpX.every((x) => x > 0 && x < snapshot.geometry.length + 1)).toBe(true);
      expect(table.planformArea).toBeGreaterThan(snapshot.aero.referenceArea);
      // As built, the table's centre of pressure is used unshifted.
      expect(snapshot.aero.cpBody.x).toBe(table.cpX[0]);
    }
  });

  it('adds the supersonic lift carried over behind the nose', () => {
    for (const id of ['falcon9', 'soyuz21a']) {
      const table = stack(id).snapshot.aero.table!;
      expect(atMach(table, table.normalSlope, 1.5)).toBeGreaterThan(atMach(table, table.normalSlope, 0.5));
    }
    // On Falcon 9, whose lift is all at the fairing, that moves the centre of
    // pressure aft; on Soyuz the strap-on noses are further aft still.
    const f9 = stack('falcon9').snapshot.aero.table!;
    expect(atMach(f9, f9.cpX, 1.5)).toBeLessThan(atMach(f9, f9.cpX, 0.5) - 5);
  });

  it('puts the lift of Soyuz strap-on noses aft of the Falcon 9 fairing lift, relative to length', () => {
    const f9 = stack('falcon9').snapshot, soyuz = stack('soyuz21a').snapshot;
    const f9Cp = f9.aero.table!.cpX[0] / f9.geometry.length, soyuzCp = soyuz.aero.table!.cpX[0] / soyuz.geometry.length;
    expect(f9Cp).toBeGreaterThan(0.8);
    expect(soyuzCp).toBeLessThan(0.6);
  });

  it('grows the normal force faster than the slope with angle and moves the centre of pressure aft', () => {
    const { snapshot } = stack('falcon9');
    const aero = snapshot.aero, cg = snapshot.cg.x;
    const small = normalAt(aero, 1.5, 2 * DEG, cg), large = normalAt(aero, 1.5, 20 * DEG, cg);
    // Viscous crossflow: C_N grows faster than sin α.
    expect(large.cn / Math.sin(20 * DEG)).toBeGreaterThan(1.5 * small.cn / Math.sin(2 * DEG));
    expect(large.cpX).toBeLessThan(small.cpX - 5);
    // Both components always oppose the air-relative motion.
    expect(dot(large.load.forceBody, v3(Math.cos(20 * DEG), 0, Math.sin(20 * DEG)))).toBeLessThan(0);
  });

  it('follows the crossflow drag coefficient through the transonic rise', () => {
    expect(crossflowDragCoefficient(0.3)).toBeCloseTo(1.2, 10);
    expect(crossflowDragCoefficient(1)).toBeGreaterThan(1.6);
    expect(crossflowDragCoefficient(4)).toBeLessThan(crossflowDragCoefficient(1.2));
  });

  it('charges a tumbling stage for its whole side, not twice its end', () => {
    // A 12:1 stage broadside: η C_dc (L d / S) is about ten times the old C_N = 2.
    const length = 44, diameter = 3.66, area = Math.PI * diameter * diameter / 4;
    const table = detachedAeroTable(length, diameter, 1.0, area);
    const spec: Aero6DofSpec = { referenceArea: area, referenceLength: length, cpBody: v3(table.cpX[0]), cdMach: [[0, 1], [25, 1]],
      normalSlopePerRad: 2, rateDamping: v3(), validAngleRad: 15 * DEG, table };
    const broadside = normalAt(spec, 0.5, 90 * DEG, length / 2);
    expect(broadside.cn).toBeGreaterThan(8);
    expect(broadside.cn).toBeLessThan(14);
    expect(Math.abs(broadside.ca)).toBeLessThan(1e-9);
    // Broadside, the load acts at the middle of the side.
    expect(broadside.cpX).toBeCloseTo(length / 2, 6);
  });

  it('is continuous through broadside between nose-first and base-first flow', () => {
    const table = detachedAeroTable(40, 3.7, 1.0, 10.75, { gridFins: true });
    const spec: Aero6DofSpec = { referenceArea: 10.75, referenceLength: 40, cpBody: v3(table.cpX[0]), cdMach: [[0, 1], [25, 1]],
      normalSlopePerRad: 2, rateDamping: v3(), validAngleRad: 15 * DEG, table };
    const before = normalAt(spec, 0.8, 90 * DEG - 1e-6, 15), after = normalAt(spec, 0.8, 90 * DEG + 1e-6, 15);
    expect(after.cn).toBeCloseTo(before.cn, 4);
    expect(after.cpX).toBeCloseTo(before.cpX, 3);
  });

  it('gives a recovery stage flying engines first a centre of pressure moved aft by its grid fins', () => {
    const plain = detachedAeroTable(40, 3.7, 1.0, 10.75), fins = detachedAeroTable(40, 3.7, 1.0, 10.75, { gridFins: true });
    expect(fins.baseNormalSlope).toBeGreaterThan(plain.baseNormalSlope);
    // Flying base first, "aft" is towards the top of the stage (+x).
    expect(fins.baseCpX).toBeGreaterThan(plain.baseCpX + 5);
  });

  it('halves the crossflow on a fairing half-shell', () => {
    const shell = detachedAeroTable(13, 5.2, 1.3, 10.6, { halfShell: true }), whole = detachedAeroTable(13, 5.2, 1.3, 10.6);
    expect(shell.planformArea).toBeCloseTo(whole.planformArea / 2, 10);
  });

  it('changes the stack table at booster separation and fairing jettison', () => {
    const { vm, snapshot } = stack('soyuz21a');
    for (const booster of vm.stages[0].boosters) vm.jettisonBooster(booster, 118);
    const core = buildRigidVehicle(vm);
    // Without the strap-on noses the lift is at the top: the centre of pressure moves forward.
    expect(core.aero.table!.cpX[0]).toBeGreaterThan(snapshot.aero.table!.cpX[0] + 5);
    expect(core.aero.table!.planformArea).toBeLessThan(snapshot.aero.table!.planformArea);
    const falcon = stack('falcon9');
    falcon.vm.separateStage(falcon.vm.stages[0], 160);
    const upper = buildRigidVehicle(falcon.vm);
    falcon.vm.jettisonFairing();
    const bare = buildRigidVehicle(falcon.vm);
    expect(bare.aero.table).not.toBe(upper.aero.table);
    expect(bare.aero.table!.normalSlope[0]).not.toBeCloseTo(upper.aero.table!.normalSlope[0], 3);
  });

  it('flies a released payload as a blunt body, not as the stack it left', () => {
    const { vm } = stack('falcon9');
    vm.jettisonFairing();
    for (const st of vm.stages) vm.separateStage(st, 500);
    const released = buildRigidVehicle(vm, { payloadDiameter: 1, payloadLength: 1.2 });
    const table = released.aero.table!;
    // Only the payload is left: its whole length is the body, and its drag is the point-mass model's 2.2.
    expect(table.planformArea).toBeCloseTo(1.2, 10);
    expect(table.planformX).toBeCloseTo(released.activeBase.x + 0.6, 10);
    expect(released.aero.cdMach[0][1]).toBeCloseTo(2.2, 10);
  });

  it('limits the ascent angle to the largest one whose static moment the trim share can hold', () => {
    const vm = new VehicleModel(vehicleById('falcon9'), 1000);
    const snapshot = buildRigidVehicle(vm, { pressure: 101325, coreThrottle: 1 });
    const runtime = new RigidRuntime({ model: 'sixDof', wind: 'calm', seed: 42 });
    const loose = runtime.ascentAngleLimit(snapshot, 5_000, 0.8), tight = runtime.ascentAngleLimit(snapshot, 35_000, 1.5);
    expect(tight).toBeLessThan(loose);
    expect(tight).toBeGreaterThan(0);
    // At the limit the static moment is (to the bisection's tolerance) what the trim share holds.
    const atLimit = staticAeroMoment(snapshot.aero, 1.5, 35_000, tight, snapshot.cg);
    const beyond = staticAeroMoment(snapshot.aero, 1.5, 35_000, tight * 1.05, snapshot.cg);
    expect(beyond).toBeGreaterThan(atLimit);
    expect(runtime.ascentAngleLimit(snapshot, 0, 1)).toBe(Math.PI);
    expect(loose).toBeLessThanOrEqual(snapshot.aero.validAngleRad);
  });
});
