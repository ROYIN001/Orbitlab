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
 * Where the sphere came down: 1.5 km from Gagarin's landing place (the
 * monument, 51°16′14″ N 45°59′50″ E) toward the Volga (OKB-1's report, via
 * Zak, RussianSpaceWeb). The direction, due west here, is an estimate.
 */
export const SPHERE_LANDING = { lat: 51.2707, lon: 45.9973 - 1.5 / (111.32 * Math.cos(51.2707 * Math.PI / 180)) };

/** Great-circle distance, km, from the sphere's place to the simulation's landing (geodetic latitude). */
export function vostok1Miss(sim: Simulation): number {
  const d2r = Math.PI / 180, { lat, lon } = SPHERE_LANDING;
  return 6371 * Math.acos(Math.min(1, Math.sin(lat * d2r) * Math.sin(sim.state.lat * d2r)
    + Math.cos(lat * d2r) * Math.cos(sim.state.lat * d2r) * Math.cos((sim.state.lon - lon) * d2r)));
}

/**
 * The descent as flown (docs/PHYSICS.md §13.6): the TDU-1's pressurising
 * command at 10:25:04.2 Moscow time and its launch command 2.2 s later, the
 * fuel out at 132 m/s of 136 and the timer's cut-off at 10:25:48.2 (OKB-1's
 * report; Baturin); the straps at 10:36 and the cables a few seconds on; the
 * hatch at 7 km and the seat 2 s later, about 10:42; the sphere down at
 * 10:48, by Smelovka.
 */
export function expectFlownVostok1(sim: Simulation): void {
  const log = sim.events.map((e) => `${e.t.toFixed(1)}:${e.key}`).join(' ');
  expect(sim.isFailed(), log).toBe(false);
  expect(sim.state.status).toBe('landed');
  expect(sim.state.abort?.kind).toBe('return');
  expect(sim.state.abort?.capsule).toBe('vostok');
  const at = (key: string) => sim.events.find((e) => e.key === key);
  expect(at('evt.deorbitPlanned')?.params?.t, log).toBeCloseTo(4684.2, 6);
  // the TDU-1 to a tenth of a second: launch command, the fuel out short of the integrator's 136 m/s, the cut-off
  expect(Math.abs(at('evt.retroFire')!.t - 4686.4), log).toBeLessThan(0.5);
  const out = at('evt.retroShortfall')!;
  expect(Math.abs(out.t - 4726.4), log).toBeLessThan(0.5);
  expect(Math.abs(Number(out.params!.dv) - 132), log).toBeLessThan(0.5);
  expect(out.params!.planned).toBe(136);
  const cut = at('evt.retroCutoff')!;
  expect(Math.abs(cut.t - 4728.2), log).toBeLessThan(0.5);
  // the venting spun the pair at "no less than 30°/s"
  expect(Math.abs(Number(cut.params!.rate) - 30)).toBeLessThan(3);
  // no main command, so no separation until the thermal sensors' straps at 10:36; the cables a few seconds on,
  // 130–170 km up by the sources
  const straps = at('evt.vostokStraps')!, sep = at('evt.vostokSeparation')!;
  expect(Math.abs(straps.t - 5340), log).toBeLessThan(1);
  expect(sep.t - straps.t, log).toBeGreaterThan(0);
  expect(sep.t - straps.t, log).toBeLessThan(10);
  expect(Math.abs(Number(sep.params!.alt) - 145), log).toBeLessThan(25);
  // the hatch at 7 km above WGS-84 by the barometric sensors, the seat 2 s later, within three minutes of 10:42
  const hatch = at('evt.hatchOff')!, ej = at('evt.ejection')!;
  expect(Math.abs(Number(hatch.params!.alt) - 7000), log).toBeLessThan(50);
  expect(Math.abs(ej.t - hatch.t - 2), log).toBeLessThan(0.1);
  expect(Math.abs(ej.t - 5700), log).toBeLessThan(180);
  // the sphere down within two minutes of 10:48
  const down = at('evt.capsuleLanding')!;
  expect(Math.abs(down.t - 6060), log).toBeLessThan(120);
  // a ballistic entry: eight to ten g, as Gagarin felt it; about 10 m/s at the ground, 2,100 kg
  expect(Number(down.params!.g)).toBeGreaterThan(7.5);
  expect(Number(down.params!.g)).toBeLessThan(11);
  expect(Math.abs(Number(down.params!.speed) - 10)).toBeLessThan(1.5);
  expect(Math.abs(sim.state.mass - 2100)).toBeLessThan(30);
  // where the sphere came down, by its geodetic latitude: the TDU-1's pitch is still to be reconstructed from
  // it, so the miss is held loosely for now
  const miss = vostok1Miss(sim);
  expect(miss, `${sim.state.lat.toFixed(3)} N ${sim.state.lon.toFixed(3)} E, ${miss.toFixed(0)} km`).toBeLessThan(400);
}
