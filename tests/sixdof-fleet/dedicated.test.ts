import { describe, expect, it } from 'vitest';
import { Simulation } from '../../src/physics/simulation';
import { vehicleById } from '../../src/data/vehicles';
import { orbitById } from '../../src/data/orbits';
import { siteById } from '../../src/data/sites';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../../src/physics/defaults';
import { launchWindows, resolveTarget } from '../../src/physics/mission';
import { RAD } from '../../src/physics/constants';
import { achievedElements, LAUNCH_TIME } from '../fleet-harness';

/**
 * The two vehicles with no accepted row in the fleet matrix, each on the real
 * mission tests/fleet-defaults.test.ts flies them on instead ("dedicated
 * missions"), here as rigid bodies. Soyuz-2.1a's — the crewed spacecraft to the
 * station orbit from Baikonur — is the six-DOF reference mission of
 * tests/rigid-simulation.test.ts; Long March 2D's is flown here: an
 * Earth-observation satellite into the 600 km sun-synchronous orbit from
 * Jiuquan at 25, 50 and 90 % of the 1 300 kg rating, the satellite raising its
 * own perigee on its 22 N engine over as many as seven passes.
 */
describe('six-DOF dedicated missions', () => {
  it.each([325, 650, 1170])('Long March 2D delivers %i kg to the sun-synchronous orbit from Jiuquan', (mass) => {
    const orbit = orbitById('sso'), site = siteById('jiuquan');
    const sim = new Simulation({
      vehicleId: 'longmarch2d', satelliteId: 'earthObs', siteId: 'jiuquan', orbit,
      launchTime: launchWindows(orbit, site, LAUNCH_TIME, 1)[0].time,
      guidance: guidanceForVehicle(vehicleById('longmarch2d'), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true,
      failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: mass,
      dynamics: { model: 'sixDof', wind: 'calm', seed: 20260919 },
    }, { headless: true });
    while (!sim.done && sim.state.t < 24 * 3600) sim.step(sim.suggestedDt());
    const keys = sim.events.map((e) => e.key), log = JSON.stringify(sim.events.slice(-6).map((e) => e.key));
    for (const k of ['evt.impact', 'evt.vehicleLost', 'evt.structuralFailure', 'evt.offTargetOrbit', 'evt.insufficientDv']) {
      expect(keys, log).not.toContain(k);
    }
    expect(keys, log).toContain('evt.targetOrbit');
    expect(sim.state.status, log).toBe('orbit');
    // The regular test's bands, on the orbit the satellite flies.
    const el = achievedElements(sim);
    expect(Math.abs(el.periapsisAlt - 600e3) / 1e3, log).toBeLessThanOrEqual(15);
    expect(Math.abs(el.apoapsisAlt - 600e3) / 1e3, log).toBeLessThanOrEqual(15);
    expect(Math.abs(el.i - resolveTarget(orbit, site, LAUNCH_TIME).inclination) * RAD, log).toBeLessThanOrEqual(0.3);
  });
});
