/**
 * Starship Flight 5 flown with its booster caught and its ship flown home, for
 * tests/ship-descent.test.ts and tests/heavy/starship-flight5.test.ts.
 */
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, guidanceForVehicle } from '../src/physics/defaults';
import { defaultDynamics } from '../src/physics/rigid/config';
import type { MissionConfig } from '../src/types';

/** Flight 5's trajectory: 213 × −15 km at 26.2°, no deorbit burn. */
export const FLIGHT5_ORBIT = { ...orbitById('custom'), perigee: -15e3, apogee: 213e3, inclination: 26.2, suborbital: true };

export function flight5Config(model: 'pointMass' | 'sixDof'): MissionConfig {
  const spec = vehicleById('starship');
  const dynamics = model === 'sixDof' ? defaultDynamics('starship') : undefined;
  return {
    vehicleId: 'starship', satelliteId: 'cubesats', siteId: 'starbase', orbit: FLIGHT5_ORBIT,
    launchTime: new Date('2024-10-13T12:25:00Z'), payloadMassOverride: 0,
    guidance: guidanceForVehicle(spec, undefined, dynamics?.model), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: true, recoveryPlan: { core: { kind: 'landingZone', zoneId: 'olm' } },
    ...(dynamics ? { dynamics } : {}),
  };
}

/** Fly until the ship is down (or the flight is lost), s of mission time at most `tMax`. */
export function flyHome(sim: Simulation, tMax = 5000): Simulation {
  while (sim.state.t < tMax && !sim.isFailed() && sim.state.status !== 'landed') sim.step(sim.suggestedDt());
  return sim;
}
