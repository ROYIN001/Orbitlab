/**
 * Sputnik's four boosters falling through the air in a six-DOF recording, as
 * the app records it (src/replay/recorder.ts, `FALLING_INTERVAL`): they come
 * down while the core coasts in orbit, where the recorder kept a frame every
 * 30 s and a replay drew a booster up to 2.3 km from where it was. The truth is
 * the simulation's own state every second (`advance(1)`). About a minute.
 * Point-mass, where the steps limit the frames, in tests/falling-frames.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../../src/physics/simulation';
import { FlightRecorder } from '../../src/replay/recorder';
import { interpolateFrames } from '../../src/physics/frame';
import { R_EARTH } from '../../src/physics/constants';
import { dist, norm, type Vec3 } from '../../src/physics/vec3';
import { vehicleById } from '../../src/data/vehicles';
import { guidanceForVehicle } from '../../src/physics/defaults';
import { defaultDynamics } from '../../src/physics/rigid/config';
import { watchMissionSettings } from '../../src/ui/watch-missions';

describe('six-DOF Sputnik\'s boosters falling through the air, recorded', () => {
  it('keeps a frame every 5 s of their fall through the air, and draws them within 30 m of where they were', { timeout: 900_000 }, () => {
    const m = watchMissionSettings('sputnik1', new Date('2026-09-22T03:00:00Z'));
    const dynamics = defaultDynamics(m.vehicleId);
    expect(dynamics.model).toBe('sixDof');
    const sim = new Simulation({ vehicleId: m.vehicleId, satelliteId: m.satelliteId, siteId: m.siteId, orbit: m.orbit, padId: m.padId,
      launchTime: m.launchTime, payloadMassOverride: m.payloadMass, guidance: guidanceForVehicle(vehicleById(m.vehicleId), undefined, 'sixDof'),
      guidanceResolved: true, failure: m.failure, boosterRecovery: false, dynamics }, { headless: true });
    const rec = new FlightRecorder();
    rec.start(sim);
    const boosters = () => sim.debris.filter((d) => /Blok B/.test(d.name));
    const truth: { t: number; id: number; r: Vec3 }[] = [];
    while (sim.state.t < 1200 && !(sim.state.t > 400 && boosters().length === 4 && boosters().every((d) => !d.alive))) {
      rec.advance(1, 1e6);
      for (const d of boosters()) if (d.alive && norm(d.r) - R_EARTH < 100e3) truth.push({ t: sim.state.t, id: d.id, r: { ...d.r } });
    }
    expect(sim.state.status).toBe('orbit');
    expect(boosters().map((d) => d.outcome)).toEqual(['impact', 'impact', 'impact', 'impact']);
    const frames = rec.frames;
    let worst = 0, samples = 0, widest = 0;
    for (const p of truth) {
      const k = frames.findIndex((f) => f.t > p.t) - 1;
      const a = frames[k], b = frames[k + 1];
      if (!a || !b || a.status !== 'orbit' || p.t <= a.t) continue;
      const da = a.debris.find((d) => d.id === p.id), db = b.debris.find((d) => d.id === p.id);
      if (!da?.alive || !db?.alive) continue;
      samples++;
      // between 10 and 100 km up at both frames, the air the recorder keeps its 5 s through
      const inAir = (r: Vec3) => Math.abs(norm(r) - R_EARTH - 55e3) < 45e3;
      if (inAir(da.r) && inAir(db.r)) widest = Math.max(widest, b.t - a.t);
      worst = Math.max(worst, dist(interpolateFrames(a, b, p.t).debris.find((d) => d.id === p.id)!.r, p.r));
    }
    // their fall below 100 km while the core is in orbit: some 70 s each
    expect(samples).toBeGreaterThan(200);
    // before: a booster drawn 2,274 m from where it was, on 30 s spans (below 10 km the spans are 30 s again)
    expect(worst).toBeLessThan(30);
    expect(widest).toBeLessThanOrEqual(5 + 1e-6);
  });
});
