/**
 * The historical missions of roadmap C01 flown as rigid bodies — six-DOF is
 * what the setup panel gives a student who picks one of these vehicles. The
 * lessons fly them point-mass (tests/lessons-history.test.ts); here Sputnik-1
 * and Vostok-1 reach the orbits they flew, and Apollo 11's translunar
 * injection is flown without the ten-day ellipse breaking the J2 forecast.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../../src/physics/simulation';
import { BUILTIN_LESSONS } from '../../src/lessons/catalog';
import { lessonConfig } from '../../src/lessons/config';
import { MEASURES } from '../../src/lessons/measures';
import type { MissionState } from '../../src/config/mission-file';
import { defaultDynamics } from '../../src/physics/rigid/config';

/** A lesson's mission with the student's edit, flown as the panel flies it by default — a rigid body. */
function flySixDof(id: string, edit: (s: MissionState) => void): Simulation {
  const lesson = BUILTIN_LESSONS.find((l) => l.id === id)!;
  const sim = new Simulation(lessonConfig(lesson.mission, (s) => {
    edit(s);
    s.dynamics = defaultDynamics(s.vehicleId); // what the panel gives the vehicle
  }), { headless: true });
  let guard = 0;
  while (!sim.done && sim.state.t < 4000 && guard++ < 20_000_000) sim.step(sim.suggestedDt());
  return sim;
}
const log = (sim: Simulation) => sim.events.map((e) => `${e.t.toFixed(0)} ${e.key}`).join(' ');

describe('historical missions as rigid bodies', () => {
  it('Sputnik-1 reaches its 215 × 939 km orbit', { timeout: 900_000 }, () => {
    const sim = flySixDof('adv-history', (s) => { s.payloadMass = 83.6; });
    expect(sim.events.some((e) => e.key === 'evt.targetOrbit'), log(sim)).toBe(true);
    expect(MEASURES['orbit.perigee'].read(sim)!).toBeCloseTo(215, -1);
    expect(MEASURES['orbit.apogee'].read(sim)!).toBeGreaterThan(900);
  });

  it('Vostok-1 reaches its 181 × 327 km orbit', { timeout: 900_000 }, () => {
    const sim = flySixDof('adv-vostok', (s) => { s.orbit = { ...s.orbit, apogee: 327e3 }; });
    expect(sim.state.status, log(sim)).toBe('orbit');
    // the osculating orbit at cut-off is 181 × 324 km, as the point-mass flight's
    const el = sim.state.elements;
    expect(el.periapsisAlt / 1e3).toBeCloseTo(181, -1);
    expect(el.apoapsisAlt / 1e3).toBeCloseTo(327, -1);
    // a rigid body is judged on the extremes of its next revolution under J2,
    // which on this 65° ellipse reach 343 km: over the 2 % the sequencer allows,
    // so the flight is reported off target (see docs/SIXDOF-VEHICLE-DATA.md)
    expect(MEASURES['orbit.apogee'].read(sim)!).toBeGreaterThan(327);
    expect(MEASURES['orbit.apogee'].read(sim)!).toBeLessThan(350);
  });

  it('Apollo 11: the S-IVB relights for the translunar injection', { timeout: 900_000 }, () => {
    const sim = flySixDof('adv-apollo', (s) => { s.orbit = { ...s.orbit, apogee: 370000e3 }; });
    expect(sim.state.status, log(sim)).toBe('orbit');
    expect(MEASURES['orbit.apogee'].read(sim)!, log(sim)).toBeGreaterThan(300000);
    expect(MEASURES['burnDv.raise'].read(sim)!).toBeGreaterThan(2900);
  });
});
