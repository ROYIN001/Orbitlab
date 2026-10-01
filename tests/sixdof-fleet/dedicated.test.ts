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
 *
 * And one mission the matrix cannot fly: Soyuz-2.1b to the sun-synchronous
 * orbit, which the matrix would fly from Baikonur, its first site, and no
 * Baikonur azimuth reaches. From Plesetsk, with 4 t, the Fregat's parking
 * orbit climbs to a 617.6 km apex under J2 for the 600 km circle, and the
 * circularisation has to go before the apex trim: the other order turned the
 * stage round twice, and its attitude gas did not last (docs/VALIDATION.md §3).
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

  it('Soyuz-2.1b delivers 4 t to the sun-synchronous orbit from Plesetsk', () => {
    const orbit = orbitById('sso'), site = siteById('plesetsk');
    const sim = new Simulation({
      vehicleId: 'soyuz21b', satelliteId: 'weather', siteId: 'plesetsk', orbit,
      launchTime: launchWindows(orbit, site, LAUNCH_TIME, 1)[0].time,
      guidance: guidanceForVehicle(vehicleById('soyuz21b'), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true,
      failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: 4000,
      dynamics: { model: 'sixDof', wind: 'calm', seed: 20260919 },
    }, { headless: true });
    while (!sim.done && sim.state.t < 10 * 3600) sim.step(sim.suggestedDt());
    const keys = sim.events.map((e) => e.key), log = JSON.stringify(sim.events.slice(-6).map((e) => e.key));
    for (const k of ['evt.impact', 'evt.vehicleLost', 'evt.structuralFailure', 'evt.offTargetOrbit', 'evt.burnAlignmentTimeout']) {
      expect(keys, log).not.toContain(k);
    }
    expect(sim.state.status, log).toBe('orbit');
    // The circularisation first, the apex trim last, and no revolution lost
    // waiting for a perigee: about 1.8 h. The other order ran 3.4 h and ended
    // off target.
    const kinds = sim.events.filter((e) => e.key === 'evt.burnStart').map((e) => e.params?.kind);
    expect(kinds, log).toEqual(['shapeAtApoapsis', 'raiseApoapsis']);
    expect(sim.events.find((e) => e.key === 'evt.targetOrbit')?.t ?? Infinity, log).toBeLessThan(2 * 3600);
    const el = achievedElements(sim);
    expect(Math.abs(el.periapsisAlt - 600e3) / 1e3, log).toBeLessThanOrEqual(12);
    expect(Math.abs(el.apoapsisAlt - 600e3) / 1e3, log).toBeLessThanOrEqual(12);
    expect(Math.abs(el.i - resolveTarget(orbit, site, LAUNCH_TIME).inclination) * RAD, log).toBeLessThanOrEqual(0.3);
  });
});
