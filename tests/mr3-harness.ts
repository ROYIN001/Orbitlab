/**
 * Mercury-Redstone 3 flown from liftoff to splashdown (roadmap C01), and what
 * the flight has to match of the real one: point-mass in
 * tests/historical-vehicles.test.ts, six-DOF in tests/heavy/mercury-redstone.test.ts.
 */
import { expect } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { Simulation } from '../src/physics/simulation';
import { guidanceForVehicle } from '../src/physics/defaults';
import { watchMissionSettings } from '../src/ui/watch-missions';

export function flyMr3(model: 'pointMass' | 'sixDof'): Simulation {
  const s = watchMissionSettings('mr3');
  const sim = new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
    payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, model), guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model, wind: 'calm', seed: 1 },
  }, { headless: true });
  while (!sim.isFailed() && sim.state.t < 1200 && sim.state.status !== 'landed') sim.step(sim.suggestedDt());
  return sim;
}

/** The postlaunch report's timeline and landing point, within the model's own margins (docs/PHYSICS.md §13.7). */
export function expectFlownMr3(sim: Simulation): void {
  const log = sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
  expect(sim.isFailed(), log).toBe(false);
  expect(sim.state.status).toBe('landed');
  expect(sim.state.abort?.kind).toBe('return');
  const at = (key: string) => sim.events.find((e) => e.key === key);
  expect(at('evt.suborbitalTarget'), log).toBeDefined();
  // three retros from 314 s, drogue 578 s, main 615 s, splashdown 922 s
  expect(sim.events.filter((e) => e.key === 'evt.retroFire')).toHaveLength(3);
  expect(Math.abs(at('evt.retroFire')!.t - 314.1), log).toBeLessThan(15);
  expect(Math.abs(at('evt.escapeDrogue')!.t - 578.1), log).toBeLessThan(20);
  expect(Math.abs(at('evt.escapeMain')!.t - 614.8), log).toBeLessThan(20);
  const splash = at('evt.capsuleSplashdown')!;
  expect(Math.abs(splash.t - 922), log).toBeLessThan(30);
  // 11.0 g at the peak of the entry
  expect(Math.abs(Number(splash.params!.g) - 11)).toBeLessThan(1.5);
  // 487 km downrange, within 25 km of where Freedom 7 came down (27°13.7' N, 75°53' W)
  expect(Math.abs(sim.state.downrange / 1000 - 487.3)).toBeLessThan(25);
  const d2r = Math.PI / 180, lat = 27 + 13.7 / 60, lon = -(75 + 53 / 60);
  const miss = 6371 * Math.acos(Math.min(1, Math.sin(lat * d2r) * Math.sin(sim.state.lat * d2r)
    + Math.cos(lat * d2r) * Math.cos(sim.state.lat * d2r) * Math.cos((sim.state.lon - lon) * d2r)));
  expect(miss).toBeLessThan(25);
}
