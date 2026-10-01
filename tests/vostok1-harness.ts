/**
 * Vostok-1 flown from liftoff to the landing of its descent sphere (roadmap
 * C01), and what the flight has to match of the real one: point-mass in
 * tests/historical-vehicles.test.ts, six-DOF in tests/heavy/vostok1-return.test.ts.
 */
import { expect } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { Simulation } from '../src/physics/simulation';
import { guidanceForVehicle } from '../src/physics/defaults';
import { watchMissionSettings } from '../src/ui/watch-missions';

export function flyVostok1(model: 'pointMass' | 'sixDof'): Simulation {
  const s = watchMissionSettings('vostok1');
  const sim = new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
    payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, model), guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model, wind: 'calm', seed: 1 },
  }, { headless: true });
  let guard = 0;
  while (!sim.isFailed() && sim.state.t < 8000 && sim.state.status !== 'landed' && guard++ < 3_000_000) sim.step(sim.suggestedDt());
  return sim;
}

/**
 * The descent as flown (docs/PHYSICS.md §13.6): the retro-fire at 10:25:34
 * Moscow time, the separation at 10:36, the ejection at 10:42 and the sphere
 * down at 10:48, near Smelovka (51.27° N, 46.00° E).
 */
export function expectFlownVostok1(sim: Simulation): void {
  const log = sim.events.map((e) => `${Math.round(e.t)}:${e.key}`).join(' ');
  expect(sim.isFailed(), log).toBe(false);
  expect(sim.state.status).toBe('landed');
  expect(sim.state.abort?.kind).toBe('return');
  expect(sim.state.abort?.capsule).toBe('vostok');
  const at = (key: string) => sim.events.find((e) => e.key === key);
  expect(at('evt.deorbitPlanned')?.params?.t, log).toBe(4714);
  expect(at('evt.retroFire')!.t, log).toBeCloseTo(4714, 0);
  // the instrument module goes with the cables, ten minutes on, at about 130 km
  const sep = at('evt.vostokSeparation')!;
  expect(Math.abs(sep.t - 5340), log).toBeLessThan(5);
  expect(Math.abs(Number(sep.params!.alt) - 130)).toBeLessThan(25);
  // ejection at 7 km, within three minutes of 10:42; the sphere down within two of 10:48
  const ej = at('evt.ejection')!;
  expect(Math.abs(Number(ej.params!.alt) - 7000)).toBeLessThan(50);
  expect(Math.abs(ej.t - 5700), log).toBeLessThan(180);
  const down = at('evt.capsuleLanding')!;
  expect(Math.abs(down.t - 6060), log).toBeLessThan(120);
  // a ballistic entry: eight to ten g, as Gagarin felt it; about 10 m/s at the ground
  expect(Number(down.params!.g)).toBeGreaterThan(7.5);
  expect(Number(down.params!.g)).toBeLessThan(11);
  expect(Math.abs(Number(down.params!.speed) - 10.5)).toBeLessThan(1.5);
  // on the ground track into the Volga region, within 400 km of Smelovka: the real flight came down some
  // 300 km from its own aim, and the model's 280 km short of it is of that size
  const d2r = Math.PI / 180, lat = 51.27, lon = 46.0;
  const miss = 6371 * Math.acos(Math.min(1, Math.sin(lat * d2r) * Math.sin(sim.state.lat * d2r)
    + Math.cos(lat * d2r) * Math.cos(sim.state.lat * d2r) * Math.cos((sim.state.lon - lon) * d2r)));
  expect(miss, `${sim.state.lat.toFixed(2)} ${sim.state.lon.toFixed(2)}`).toBeLessThan(400);
}
