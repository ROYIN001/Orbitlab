/** Probe helpers: Apollo 11's watch-mission flight with a change, flown point-mass as the tests fly it. */
import { Simulation } from '../../src/physics/simulation';
import { vehicleById } from '../../src/data/vehicles';
import { guidanceForVehicle } from '../../src/physics/defaults';
import { watchMissionSettings } from '../../src/ui/watch-missions';
import type { OrbitSpec } from '../../src/types';

export const S = watchMissionSettings('apollo11');

export interface Change { launchTime?: Date; orbit?: Partial<OrbitSpec>; vehicleId?: string; satelliteId?: string }

export function make(change: Change): Simulation {
  const vehicleId = change.vehicleId ?? S.vehicleId;
  return new Simulation({
    vehicleId, satelliteId: change.satelliteId ?? S.satelliteId, siteId: S.siteId, orbit: { ...S.orbit, ...(change.orbit ?? {}) } as OrbitSpec,
    launchTime: change.launchTime ?? S.launchTime, padId: S.padId,
    ...(change.satelliteId ? {} : { payloadMassOverride: S.payloadMass }),
    guidance: guidanceForVehicle(vehicleById(vehicleId), undefined, 'pointMass'), guidanceResolved: true,
    failure: S.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
  }, { headless: true });
}

export function flyTo(sim: Simulation, until: number, onStep?: (sim: Simulation) => void): Simulation {
  let guard = 0;
  while (!sim.isFailed() && sim.state.status !== "landed" && !(sim.done && !sim.apollo.active) && sim.state.t < until - 1e-6 && guard++ < 5_000_000) {
    sim.step(sim.suggestedDt());
    onStep?.(sim);
  }
  return sim;
}

export const log = (sim: Simulation, from = 0) => sim.events.filter((e) => e.t >= from).map((e) => `${(e.t / 3600).toFixed(3)}h ${e.key}${e.params ? ' ' + JSON.stringify(e.params) : ''}`).join('\n');
