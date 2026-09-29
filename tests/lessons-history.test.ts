/**
 * The historical missions of track 5 (roadmap C01): Sputnik-1, Vostok-1 and
 * Apollo 11 on the vehicles, pads, dates and orbits they flew. Each lesson's
 * worked solution passes and its flight as set up fails; the solution flights
 * are also checked against the published record.
 */
import { describe, expect, it } from 'vitest';
import { BUILTIN_LESSONS } from '../src/lessons/catalog';

import { MEASURES } from '../src/lessons/measures';
import type { Lesson } from '../src/lessons/types';
import { Simulation } from '../src/physics/simulation';
import { lessonConfig } from '../src/lessons/config';
import { flightEnded, gradeLesson } from '../src/lessons/grader';
import type { MissionState } from '../src/config/mission-file';

/** Fly a lesson's mission, with the student's edits, until it ends for grading. */
function fly(l: Lesson, edit?: (s: MissionState) => void): Simulation {
  const sim = new Simulation(lessonConfig(l.mission, edit), { headless: true });
  let guard = 0;
  while (!flightEnded(l, sim) && !sim.done && sim.state.t < 20000 && guard++ < 5_000_000) sim.step(sim.suggestedDt());
  return sim;
}

const lesson = (id: string): Lesson => BUILTIN_LESSONS.find((x) => x.id === id)!;
const log = (sim: ReturnType<typeof fly>): string => sim.events.map((e) => `${e.t.toFixed(0)} ${e.key}`).join(' ');
const at = (sim: ReturnType<typeof fly>, key: string) => sim.events.find((e) => e.key === key)?.t;

describe('track 5, historical missions', () => {
  it('5.3 Sputnik-1: PS-1 reaches the 215 × 939 km orbit with its 96-minute period; Object D does not reach orbit', { timeout: 120_000 }, () => {
    const l = lesson('adv-history');
    const solved = fly(l, (s) => { s.payloadMass = 83.6; });
    const period = MEASURES['orbit.period'].read(solved)!;
    expect(gradeLesson(l, solved, { period }).verdict, log(solved)).toBe('pass');
    // the record: 215 × 939 km, 96.2 min, boosters off at T+116 s, the core out at T+295 s
    expect(MEASURES['orbit.perigee'].read(solved)!).toBeCloseTo(215, -1);
    expect(MEASURES['orbit.apogee'].read(solved)!).toBeGreaterThan(900);
    expect(MEASURES['orbit.apogee'].read(solved)!).toBeLessThan(980);
    expect(period).toBeCloseTo(96.2, 0);
    expect(at(solved, 'evt.boosterSep')!).toBeCloseTo(117, -1);
    expect(gradeLesson(l, solved, { period: period + 1 }).verdict).toBe('fail');
    // Object D, 1.3 t: the core runs dry short of orbital speed
    const objectD = fly(l);
    expect(objectD.state.status, log(objectD)).not.toBe('orbit');
    expect(gradeLesson(l, objectD, { period }).verdict).toBe('fail');
  });

  it('5.4 Vostok-1: the 181 × 327 km orbit Gagarin reached passes; the planned 181 × 230 km one does not', { timeout: 120_000 }, () => {
    const l = lesson('adv-vostok');
    const solved = fly(l, (s) => { s.orbit = { ...s.orbit, apogee: 327e3 }; });
    const period = MEASURES['orbit.period'].read(solved)!;
    expect(gradeLesson(l, solved, { period }).verdict, log(solved)).toBe('pass');
    expect(period).toBeCloseTo(89.3, 0);
    // Blok E lights as Blok A cuts off, and the fairing goes at T+156 s as flown
    expect(at(solved, 'evt.fairingSep')!).toBeCloseTo(156, 0);
    expect(gradeLesson(l, solved, { period: period - 1 }).verdict).toBe('fail');
    const planned = fly(l);
    expect(planned.state.status, log(planned)).toBe('orbit');
    expect(gradeLesson(l, planned, { period: MEASURES['orbit.period'].read(planned)! }).verdict).toBe('fail');
  });

  it('5.5 Apollo 11: the S-IVB relights for the translunar injection; the parking orbit alone does not pass', { timeout: 180_000 }, () => {
    const l = lesson('adv-apollo');
    const solved = fly(l, (s) => { s.orbit = { ...s.orbit, apogee: 370000e3 }; });
    const dv = MEASURES['burnDv.raise'].read(solved)!;
    expect(gradeLesson(l, solved, { dv }).verdict, log(solved)).toBe('pass');
    // the record: S-IC cut-off at T+162 s, a TLI of about 3.1 km/s
    expect(at(solved, 'evt.meco')!).toBeCloseTo(162, -1);
    expect(dv).toBeGreaterThan(2900);
    expect(dv).toBeLessThan(3300);
    expect(gradeLesson(l, solved, { dv: dv * 1.1 }).verdict).toBe('fail');
    const parked = fly(l);
    expect(parked.state.status, log(parked)).toBe('orbit');
    expect(MEASURES['orbit.apogee'].read(parked)!).toBeLessThan(300);
    expect(gradeLesson(l, parked).verdict).toBe('fail');
  });
});
