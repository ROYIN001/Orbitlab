/**
 * Crew Dragon (roadmap C01): a payload flown in the open on top of Falcon 9,
 * without a fairing. The vehicle a mission flies then has no fairing, the
 * capsule and trunk are the nose, and nothing else carries it.
 */
import { describe, expect, it } from 'vitest';
import { missionVehicle, vehicleById } from '../src/data/vehicles';
import { satelliteById } from '../src/data/satellites';
import { VehicleModel } from '../src/physics/vehicle';
import { buildRigidVehicle } from '../src/physics/rigid/mass';
import { validateConfigInput } from '../src/config/validation';
import { watchMissionSettings } from '../src/ui/watch-missions';

const dragon = satelliteById('crewDragon');

describe('Crew Dragon on Falcon 9', () => {
  it('flies without the fairing, its own shape the nose', () => {
    const spec = missionVehicle('falcon9', dragon);
    expect(spec.fairing).toBeNull();
    expect(spec.exposedPayload).toEqual({ diameter: 4.0, length: 8.1, noseLength: 4.5 });
    expect(missionVehicle('falcon9', dragon)).toBe(spec);
    // any other payload keeps the catalogue's vehicle, fairing and all
    expect(missionVehicle('falcon9', satelliteById('cubesats'))).toBe(vehicleById('falcon9'));
  });

  it('puts the nose on the capsule and takes it away with the payload', () => {
    const spec = missionVehicle('falcon9', dragon);
    const vm = new VehicleModel(spec, dragon.mass);
    const withDragon = buildRigidVehicle(vm, { payloadDiameter: 4, payloadLength: 8.1 });
    const table = withDragon.aero.table!;
    // the stack is 8.1 m longer than the bare stages and the capsule's lift is near its top
    expect(withDragon.geometry.length).toBeCloseTo(vehicleById('falcon9').stages.reduce((h, st) => h + st.length, 0) + 8.1, 0);
    expect(table.cpX[0]).toBeGreaterThan(withDragon.geometry.length - 8.1);
    // without the fairing's 1.9 t, and with the 4 m capsule as the widest part
    expect(vm.totalMass()).toBeCloseTo(new VehicleModel(vehicleById('falcon9'), dragon.mass).totalMass() - 1900, 0);
    expect(vm.frontalArea()).toBeCloseTo(Math.PI * 2 * 2, 5);
    vm.payloadAttached = false;
    const bare = buildRigidVehicle(vm, { payloadDiameter: 4, payloadLength: 8.1 });
    expect(bare.aero.table!.cpX[0]).toBeLessThan(table.cpX[0]);
  });

  it('is carried by Falcon 9 only', () => {
    const s = watchMissionSettings('falcon9Demo2');
    expect(validateConfigInput(s)).toEqual([]);
    expect(validateConfigInput({ ...s, vehicleId: 'soyuz21a', siteId: 'baikonur' }).some((i) => i.field === 'setup.satellite')).toBe(true);
  });
});
