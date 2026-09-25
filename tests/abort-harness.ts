/** Crewed Soyuz flights for the launch-abort tests (roadmap G06). */
import { Simulation } from '../src/physics/simulation';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import type { FailureMode } from '../src/types';

export const ABORT_LAUNCH = new Date('2026-09-20T12:00:00Z');

/** A crewed Soyuz-2.1a to the station from Baikonur, with a failure armed. */
export function crewedSoyuz(mode: FailureMode, time: number, model: 'sixDof' | 'pointMass' = 'sixDof', satelliteId = 'crew'): Simulation {
  return new Simulation({ vehicleId: 'soyuz21a', satelliteId, siteId: 'baikonur', orbit: orbitById('iss'), launchTime: ABORT_LAUNCH,
    guidance: guidanceForVehicle(vehicleById('soyuz21a'), DEFAULT_GUIDANCE, model), guidanceResolved: true,
    failure: { mode, time, stage: 0 }, boosterRecovery: false, dynamics: { model, wind: 'calm', seed: 1 } }, { headless: true });
}

/** Fly until the crew is down (or the flight ends otherwise), keeping the highest point of the escape. */
export function flyAbort(sim: Simulation, limit = 3000): { apogee: number; bodies: string[] } {
  let apogee = 0;
  const bodies: string[] = [];
  while (sim.state.status !== 'landed' && sim.state.status !== 'failed' && sim.state.t < limit) {
    sim.step(sim.suggestedDt());
    const a = sim.state.abort;
    if (a) {
      apogee = Math.max(apogee, sim.state.altitude);
      if (bodies[bodies.length - 1] !== a.body) bodies.push(a.body);
    }
  }
  return { apogee, bodies };
}
