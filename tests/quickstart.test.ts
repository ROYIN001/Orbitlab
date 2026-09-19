import { describe, expect, it } from 'vitest';
import { quickstartMission, type QuickstartId } from '../src/ui/quickstart';
import { validateConfigInput } from '../src/config/validation';
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { guidanceForVehicle } from '../src/physics/defaults';
import { elementsFromState, wrapPi } from '../src/physics/orbital';
import { RAD } from '../src/physics/constants';

const EPOCH = new Date('2026-09-20T12:00:00Z');

describe('quick-start mission settings', () => {
  it('does not alias settings between selections or mutate the provided date', () => {
    const a = quickstartMission('leo', EPOCH);
    a.orbit.perigee = 123;
    a.failure.mode = 'thrustLoss';
    a.launchTime.setUTCFullYear(2030);
    const b = quickstartMission('leo', EPOCH);
    expect(b.orbit.perigee).toBe(500000);
    expect(b.failure.mode).toBe('none');
    expect(EPOCH.toISOString()).toBe('2026-09-20T12:00:00.000Z');
  });

  it('prefills ISS with the next available aligned window', () => {
    const mission = quickstartMission('iss', EPOCH);
    expect(mission.launchTime.getTime()).toBeGreaterThanOrEqual(EPOCH.getTime());
    expect(mission.launchTime.getTime() - EPOCH.getTime()).toBeLessThan(24 * 3600e3);
    expect(validateConfigInput(mission)).toEqual([]);
  });

  it.each<QuickstartId>(['leo', 'iss', 'gto'])('%s starter reaches its advertised orbit in the model', (id) => {
    const settings = quickstartMission(id, EPOCH);
    expect(validateConfigInput(settings)).toEqual([]);
    const sim = new Simulation({
      vehicleId: settings.vehicleId, satelliteId: settings.satelliteId, siteId: settings.siteId,
      orbit: settings.orbit, launchTime: settings.launchTime, payloadMassOverride: settings.payloadMass,
      guidance: guidanceForVehicle(vehicleById(settings.vehicleId)), guidanceResolved: true,
      failure: settings.failure, boosterRecovery: false,
    });
    let guard = 0;
    // Crewed spacecraft separates in parking orbit and then raises its own
    // orbit; payload separation alone is not completion of the ISS mission.
    while (sim.state.t < 20000 && !(sim.state.payloadSeparated && sim.events.some((event) => event.key === 'evt.targetOrbit')) && !sim.state.destroyed && guard++ < 220000) sim.advance(1);
    const achieved = elementsFromState(sim.state.r, sim.state.v);
    const target = sim.plan.target;
    expect(sim.state.destroyed).toBe(false);
    expect(sim.state.payloadSeparated, `${id}: ${sim.state.status} at ${sim.state.t}`).toBe(true);
    expect(sim.events.some((event) => event.key === 'evt.targetOrbit')).toBe(true);
    expect(Math.abs(achieved.apoapsisAlt - target.apogee)).toBeLessThanOrEqual(Math.max(10000, target.apogee * 0.02));
    const transfer = target.apogee - target.perigee > 50000;
    expect(Math.abs(achieved.periapsisAlt - target.perigee)).toBeLessThanOrEqual(transfer ? Math.max(15000, target.perigee * 0.05) : Math.max(10000, target.perigee * 0.02));
    expect(Math.abs(achieved.i - target.inclination) * RAD).toBeLessThanOrEqual(0.3);
    if (target.raan !== null) expect(Math.abs(wrapPi(achieved.raan - target.raan)) * RAD).toBeLessThanOrEqual(1.5);
  }, 20000);
});
