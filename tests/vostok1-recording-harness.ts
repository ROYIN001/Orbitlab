/**
 * Vostok-1 recorded from liftoff to Gagarin on the ground (roadmap C01), as
 * the app records it (`FlightRecorder`, its own default ceiling), and what the
 * recording has to keep: under its frame ceiling and its memory without
 * thinning, its orbit a frame every 30 s, the last frame before the retro
 * sequence seconds before it, and a replay that never passes inside
 * the Earth. Point-mass in tests/vostok-replay.test.ts, six-DOF in
 * tests/heavy/vostok1-recording.test.ts.
 */
import { expect } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { Simulation } from '../src/physics/simulation';
import { guidanceForVehicle } from '../src/physics/defaults';
import { watchMissionSettings } from '../src/ui/watch-missions';
import { FlightRecorder } from '../src/replay/recorder';
import { ReplayPlayer } from '../src/replay/player';
import { norm } from '../src/physics/vec3';
import { R_EARTH } from '../src/physics/constants';

export function recordVostok1(model: 'pointMass' | 'sixDof'): { sim: Simulation; rec: FlightRecorder; peak: number } {
  const s = watchMissionSettings('vostok1');
  const sim = new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
    payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, model), guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model, wind: 'calm', seed: 1 },
  }, { headless: true });
  const rec = new FlightRecorder();
  rec.start(sim);
  let peak = 0, measured = 0;
  while (!sim.isFailed() && sim.state.t < 10_000 && !(sim.state.status === 'landed' && !sim.debris.some((d) => d.fragmentOf !== undefined && d.alive))) {
    rec.advance(5, 1e7);
    if (sim.state.t - measured >= 60) { measured = sim.state.t; peak = Math.max(peak, rec.stats().bytes - rec.stats().rotationBytes); }
  }
  return { sim, rec, peak: Math.max(peak, rec.stats().bytes - rec.stats().rotationBytes) };
}

/**
 * @param frameBytes the most the frames may hold by the recorder's calibrated
 *        estimate at any time, before the rotation tracks (`RecorderStats`)
 */
export function expectVostok1Recording(run: ReturnType<typeof recordVostok1>, frameBytes: number): void {
  const { sim, rec, peak } = run;
  const st = rec.stats();
  const log = `frames ${st.frames}/${rec.frameLimit}, ${st.decimations} thinnings, peak ${(peak / 1e6).toFixed(1)} MB, rotations ${(st.rotationBytes / 1e6).toFixed(1)} MB`;
  expect(sim.state.status, log).toBe('landed');
  expect(sim.state.note).toBe('vostokLanded');
  // under the ceiling untouched: nothing thinned, the ascent at its own cadence
  expect(st.decimations, log).toBe(0);
  expect(st.frames, log).toBeLessThan(rec.frameLimit);
  expect(peak, log).toBeLessThan(frameBytes);
  // the orbit: a frame every 30 s and the step after it (10 s, then every second, before the retro sequence)
  const deorbit = sim.cfg.orbit.deorbit!.time;
  const orbit = rec.frames.filter((f) => f.status === 'orbit');
  expect(orbit.length, log).toBeGreaterThan(130);
  for (let i = 1; i < orbit.length; i++) expect(orbit[i].t - orbit[i - 1].t, `T+${orbit[i - 1].t.toFixed(1)}`).toBeLessThan(40);
  // the frame a replay holds across the change to the returning spacecraft: a second before the retro sequence, or
  // the orbit's step before it
  expect(deorbit - orbit[orbit.length - 1].t, log).toBeLessThan(10);
  // and replayed at any second of it, the spacecraft is where it flew, above 150 km
  const player = new ReplayPlayer(rec);
  for (let t = orbit[0].t; t < deorbit; t += 7) {
    const f = player.frameAt(t)!;
    expect(norm(f.r) - R_EARTH, `T+${t.toFixed(0)}`).toBeGreaterThan(150e3);
  }
  // every event still on a frame of its own time, or (one a body's own flight timed inside a step: Gagarin down, the
  // module's last piece) between the frames of that step
  const off = rec.events.filter((e) => {
    const i = rec.indexAt(e.t), a = rec.frames[i], b = rec.frames[i + 1];
    return !(Math.abs(a.t - e.t) < 1e-9 || (b && Math.abs(b.t - e.t) < 1e-9) || (b && a.t <= e.t && e.t <= b.t && b.t - a.t <= 1 + 1e-9));
  }).map((e) => { const i = rec.indexAt(e.t); return `${e.key} T+${e.t.toFixed(3)} [${rec.frames[i].t.toFixed(3)}, ${rec.frames[i + 1]?.t.toFixed(3)}]`; });
  expect(off).toEqual([]);
}
