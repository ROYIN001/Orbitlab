/**
 * Vostok-1 flown from liftoff to Gagarin on the ground (roadmap C01), and
 * what the flight has to match of the real one: point-mass in
 * tests/historical-vehicles.test.ts, six-DOF in tests/heavy/vostok1-return.test.ts.
 */
import { expect } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { Simulation } from '../src/physics/simulation';
import { guidanceForVehicle } from '../src/physics/defaults';
import { watchMissionById, watchMissionSettings } from '../src/ui/watch-missions';
import { compareEvents } from '../src/ui/flown';

/** When each flight's status first read 'landed', and whether it waited, the sphere down, for its pilot. */
const ENDED = new WeakMap<Simulation, { t: number; waited: boolean }>();

export function flyVostok1(model: 'pointMass' | 'sixDof'): Simulation {
  const s = watchMissionSettings('vostok1');
  const sim = new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
    payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, model), guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model, wind: 'calm', seed: 1 },
  }, { headless: true });
  let guard = 0, waited = false;
  while (!sim.isFailed() && sim.state.t < 8000 && sim.state.status !== 'landed' && guard++ < 3_000_000) {
    sim.step(sim.suggestedDt());
    if (sim.state.status === 'abort' && sim.state.note === 'vostokSphereDown') waited = true;
  }
  ENDED.set(sim, { t: sim.state.t, waited });
  // the instrument module's lightest remains may still be drifting down when Gagarin is down: fly on, the sphere
  // and he at rest, until every piece has burned up or come down
  while (!sim.isFailed() && sim.state.t < 10_000 && sim.debris.some((d) => d.fragmentOf !== undefined && d.alive)) sim.step(sim.suggestedDt());
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
 * instrument module broken up and gone; the hatch at 7 km and the seat 2 s
 * later, about 10:42; the sphere down at 10:48, by Smelovka; Gagarin out of
 * his seat at 4 km under his main, his reserve out too, and down at 10:53
 * (10:55 officially) close by the sphere.
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
  expectGagarinHome(sim, log);
  expectModuleGone(sim, log);
  // nothing of the return makes a stage's impact: not the hatch, the seat or the module's pieces
  expect(sim.events.filter((e) => e.key === 'evt.stageImpact' && e.t > 4684).map((e) => e.params?.name), log).toEqual([]);
}

/**
 * Gagarin's own descent (src/physics/sim/crew-descent.ts): on his seat's
 * stabilising chute to 4 km, out of the seat under the 83.5 m² main there,
 * the reserve out too at about 3 km, and down at about 5 m/s a few minutes
 * after the sphere, close by it; the flight ends only then.
 */
function expectGagarinHome(sim: Simulation, log: string): void {
  const at = (key: string) => sim.events.find((e) => e.key === key);
  const ej = at('evt.ejection')!, down = at('evt.capsuleLanding')!;
  const seat = at('evt.seatSeparation')!, main = at('evt.pilotMain')!, reserve = at('evt.pilotReserve')!, home = at('evt.pilotLanding')!;
  expect(seat, log).toBeDefined();
  expect(Math.abs(Number(seat.params!.alt) - 4000), log).toBeLessThan(100);
  expect(seat.t).toBeGreaterThan(ej.t);
  expect(main.t).toBeGreaterThan(seat.t);
  expect(Math.abs(Number(reserve.params!.alt) - 3000), log).toBeLessThan(100);
  expect(home, log).toBeDefined();
  expect(Number(home.params!.speed)).toBeGreaterThan(4);
  expect(Number(home.params!.speed)).toBeLessThan(7);
  // a few minutes after the sphere, within a few kilometres of it (calm air: the wind that day is not flown)
  expect(home.t - down.t, log).toBeGreaterThan(60);
  expect(home.t - down.t, log).toBeLessThan(900);
  expect(Number(home.params!.km), log).toBeLessThan(5);
  // on 10:53–10:55 to within five minutes
  const row = compareEvents(watchMissionById('vostok1')!.flown!, sim.events).find((r) => r.key === 'evt.pilotLanding')!;
  expect(Math.abs(row.delta!), log).toBeLessThan(300);
  // the flight waits for him, the sphere at rest, and ends ('landed') only once he is down
  const ended = ENDED.get(sim)!;
  expect(ended.waited).toBe(true);
  expect(ended.t).toBeGreaterThanOrEqual(home.t);
  expect(ended.t - home.t).toBeLessThan(1);
  expect(sim.state.note).toBe('vostokLanded');
  const body = (name: string) => sim.debris.find((d) => d.name === name)!;
  expect(body('pilot').outcome).toBe('landed');
  expect(body('pilot').crew?.phase).toBe('landed');
  expect(body('hatch').outcome).toBe('impact');
  expect(body('seat').outcome).toBe('impact');
}

/**
 * The instrument module (src/physics/sim/module-entry.ts): broken up at the
 * tools' conventional 78 km, and every piece burned up or on the ground.
 */
function expectModuleGone(sim: Simulation, log: string): void {
  const at = (key: string) => sim.events.find((e) => e.key === key);
  const sep = at('evt.vostokSeparation')!, breakup = at('evt.moduleBreakup')!, gone = at('evt.moduleBurnedUp')!;
  expect(breakup, log).toBeDefined();
  expect(breakup.t).toBeGreaterThan(sep.t);
  expect(Number(breakup.params!.alt)).toBeGreaterThan(70);
  expect(Number(breakup.params!.alt)).toBeLessThan(85);
  expect(gone, log).toBeDefined();
  const n = Number(breakup.params!.n);
  expect(Number(gone.params!.n)).toBe(n);
  expect(Number(gone.params!.burnt) + Number(gone.params!.survived)).toBe(n);
  const pieces = sim.debris.filter((d) => d.fragmentOf !== undefined);
  expect(pieces.length).toBeGreaterThan(0);
  for (const d of pieces) {
    expect(d.alive, d.name).toBe(false);
    expect(['burnup', 'impact']).toContain(d.outcome);
  }
  expect(sim.debris.find((d) => d.name === 'instrumentModule')?.outcome).toBe('burnup');
}
