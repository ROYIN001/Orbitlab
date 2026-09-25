/**
 * The six-DOF lesson's worked solution (roadmap E03, lesson 3.2): with the
 * FDIR on, the three inertial units outvote the one whose gyros stuck, and the
 * flight reaches its orbit. The wrong flight (FDIR off) is in tests/lessons.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../../src/physics/simulation';
import { BUILTIN_LESSONS } from '../../src/lessons/catalog';
import { lessonConfig } from '../../src/lessons/config';
import { flightEnded, gradeLesson } from '../../src/lessons/grader';

describe('lesson 3.2, a stuck gyro and the FDIR', () => {
  it('passes with the FDIR on', { timeout: 900_000 }, () => {
    const lesson = BUILTIN_LESSONS.find((l) => l.id === 'fail-gyro-fdir')!;
    const sim = new Simulation(lessonConfig(lesson.mission, (s) => { s.dynamics!.controlFaults!.fdir = true; }), { headless: true });
    let guard = 0;
    while (!flightEnded(lesson, sim) && !sim.done && sim.state.t < 8000 && guard++ < 20_000_000) sim.step(sim.suggestedDt());
    const grade = gradeLesson(lesson, sim);
    expect(grade.verdict, JSON.stringify(grade) + sim.events.map((e) => `\n${e.t.toFixed(1)} ${e.key}`).join('')).toBe('pass');
  });
});
