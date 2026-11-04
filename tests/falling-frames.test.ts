/**
 * The frames a spent stage falling through the air needs, as the recorder keeps
 * them (src/replay/recorder.ts). While the vehicle coasts in orbit the recorder
 * keeps a frame every 10–30 s, and a replay draws a falling body between two of
 * them on the cubic through both frames' states (`interpolateFrames`). Inside
 * one such span drag slows a Sputnik booster from 2.3 to 0.3 km/s, and the cubic
 * draws it up to 1.6 km from where it was, ahead of or behind it along its path.
 * Hard thinning made it worse: spans of minutes, tens of km off.
 *
 * Point-mass flights here: they record in a second. The simulation holds a
 * point-mass body's state between its steps (about 19 s in Sputnik's orbit), so
 * the truth between them is the body re-flown densely from each step's state
 * with the simulation's own forces, landing within a metre of the next.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { FlightRecorder } from '../src/replay/recorder';
import { interpolateFrames } from '../src/physics/frame';
import { R_EARTH } from '../src/physics/constants';
import { dist, norm } from '../src/physics/vec3';
import { vehicleById } from '../src/data/vehicles';
import { guidanceForVehicle } from '../src/physics/defaults';
import { watchMissionSettings } from '../src/ui/watch-missions';
import { bodyStep, refly, type BodyStep } from './dense-fall';

/**
 * Point-mass Sputnik to `until` (its boosters are down by T+720 s), recorded within `maxFrames`; each booster's
 * state at every step it falls below 100 km.
 */
function sputnik(maxFrames?: number, until = 720) {
  const m = watchMissionSettings('sputnik1', new Date('2026-09-22T03:00:00Z'));
  const sim = new Simulation({ vehicleId: m.vehicleId, satelliteId: m.satelliteId, siteId: m.siteId, orbit: m.orbit, padId: m.padId,
    launchTime: m.launchTime, payloadMassOverride: m.payloadMass, guidance: guidanceForVehicle(vehicleById(m.vehicleId), undefined, 'pointMass'),
    guidanceResolved: true, failure: m.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 } }, { headless: true });
  const rec = new FlightRecorder(maxFrames);
  rec.start(sim);
  const steps: BodyStep[] = [];
  let last = -1;
  while (sim.state.t < until) {
    rec.advance(sim.state.t < 720 ? 1 : 60, 5000);
    if (sim.state.t === last) continue;
    last = sim.state.t;
    for (const d of sim.debris) {
      if (d.alive && /Blok B/.test(d.name) && norm(d.r) - R_EARTH < 100e3) steps.push(bodyStep(sim.state.t, d));
    }
  }
  // the whole flight is flown point-mass and the boosters come down while the core coasts in orbit
  expect(sim.state.status).toBe('orbit');
  expect(sim.debris.filter((d) => /Blok B/.test(d.name) && !d.alive && d.outcome === 'impact')).toHaveLength(4);
  return { sim, rec, steps };
}

/** The furthest any booster is drawn from where it was, at every second of its fall below 100 km in orbit. */
function worstDrawn(rec: FlightRecorder, steps: BodyStep[]): { worst: number; samples: number } {
  let worst = 0, samples = 0;
  const frames = rec.frames;
  for (let i = 0; i + 1 < steps.length; i++) {
    const p = steps[i];
    const q = steps.slice(i + 1).find((s) => s.id === p.id);
    if (!q || q.t - p.t > 60) continue;
    for (const truth of refly(p, q)) {
      const k = frames.findIndex((f) => f.t > truth.t) - 1;
      const a = frames[k], b = frames[k + 1];
      if (!a || !b || a.status !== 'orbit') continue;
      const drawn = interpolateFrames(a, b, truth.t).debris.find((d) => d.id === p.id);
      if (!drawn?.alive) continue;
      samples++;
      worst = Math.max(worst, dist(drawn.r, truth.r));
    }
  }
  return { worst, samples };
}

describe('a spent stage falling through the air, as the recorder keeps it', () => {
  it('keeps a frame at every step of a booster\'s fall while the core coasts in orbit', () => {
    const { rec, steps } = sputnik();
    const times = new Set(rec.frames.map((f) => f.t));
    // the steps of the fall below 60 km faster than 1 km/s, in the drag pulse
    const pulse = steps.filter((s) => norm(s.r) - R_EARTH < 60e3 && norm(s.v) > 1000 && rec.frames.find((f) => f.t >= s.t)?.status === 'orbit');
    expect(pulse.length).toBeGreaterThanOrEqual(6);
    // before: every other step, 38.5 s apart
    expect(pulse.filter((s) => !times.has(s.t)).map((s) => s.t)).toEqual([]);
  });

  it('draws it close to where it was between those frames', () => {
    const { rec, steps } = sputnik();
    const { worst, samples } = worstDrawn(rec, steps);
    expect(samples).toBeGreaterThan(100);
    // before: 1,596 m, 38.5 s spans in the drag pulse (every other step); the step itself is 19.25 s
    expect(worst).toBeLessThan(450);
  });

  it('keeps those frames, and draws it as close, when a long recording is thinned to its budget', () => {
    // five hours in orbit after the boosters are down, inside 800 frames: the orbit is thinned past a frame a minute
    const { rec, steps } = sputnik(800, 18000);
    expect(rec.stats().decimations).toBeGreaterThan(0);
    expect(rec.frames.length).toBeLessThanOrEqual(rec.frameLimit);
    expect(rec.frameLimit).toBe(800);
    // before: 4.7 km, on spans of 77 s
    expect(worstDrawn(rec, steps).worst).toBeLessThan(450);
    const times = new Set(rec.frames.map((f) => f.t));
    const pulse = steps.filter((s) => norm(s.r) - R_EARTH < 60e3 && norm(s.v) > 1000 && rec.frames.find((f) => f.t >= s.t)?.status === 'orbit');
    expect(pulse.filter((s) => !times.has(s.t)).map((s) => s.t)).toEqual([]);
  });

  it('keeps them through a long flight to the station, where thinning takes the rendezvous\'s frames too', () => {
    // Soyuz MS-25 flown on to the station: Blok A and the fairings come down during the rendezvous, whose frames are
    // not coast. Eight hours inside 800 frames leave the coast nothing to give, and the last passes thin anything.
    const m = watchMissionSettings('soyuzMs25', new Date('2026-09-22T03:00:00Z'));
    const sim = new Simulation({ vehicleId: m.vehicleId, satelliteId: m.satelliteId, siteId: m.siteId, orbit: m.orbit, padId: m.padId,
      launchTime: m.launchTime, payloadMassOverride: m.payloadMass, guidance: guidanceForVehicle(vehicleById(m.vehicleId), undefined, 'pointMass'),
      guidanceResolved: true, failure: m.failure, boosterRecovery: false, rendezvous: m.rendezvous,
      dynamics: { model: 'pointMass', wind: 'calm', seed: 1 } }, { headless: true });
    const rec = new FlightRecorder(800);
    rec.start(sim);
    const steps: BodyStep[] = [];
    let last = -1;
    while (sim.state.t < 30000) {
      rec.advance(sim.state.t < 1500 ? 1 : 300, 100000);
      if (sim.state.t === last) continue;
      last = sim.state.t;
      for (const d of sim.debris) if (d.alive && !d.recovery && norm(d.r) - R_EARTH < 100e3) steps.push(bodyStep(sim.state.t, d));
    }
    expect(sim.state.status).toBe('rendezvous');
    expect(rec.stats().decimations).toBeGreaterThan(10);
    expect(rec.frameLimit).toBe(800);
    let worst = 0, samples = 0;
    for (let i = 0; i + 1 < steps.length; i++) {
      const p = steps[i];
      const q = steps.slice(i + 1).find((s) => s.id === p.id);
      if (!q || q.t - p.t > 60) continue;
      for (const truth of refly(p, q)) {
        const k = rec.frames.findIndex((f) => f.t > truth.t) - 1;
        const a = rec.frames[k], b = rec.frames[k + 1];
        const da = a?.debris.find((d) => d.id === p.id);
        if (!a || !b || a.status !== 'rendezvous' || !da?.alive || !b.debris.find((d) => d.id === p.id)?.alive) continue;
        const drawn = interpolateFrames(a, b, truth.t).debris.find((d) => d.id === p.id)!.r;
        // the whole frame held across the spacecraft's change of configuration as it leaves the stage, a second long
        if (drawn.x === da.r.x && drawn.y === da.r.y && drawn.z === da.r.z) continue;
        samples++;
        worst = Math.max(worst, dist(drawn, truth.r));
      }
    }
    expect(samples).toBeGreaterThan(500);
    // before: 10.7 km, Blok A on a 60 s span; with the 5 s but no floor in thinning, 4.9 km
    expect(worst).toBeLessThan(100);
  });
});
