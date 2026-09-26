/**
 * The six-DOF lessons' worked solutions (roadmap E03). Lesson 3.2: with the
 * FDIR on, the three inertial units outvote the one whose gyros stuck, and the
 * flight reaches its orbit. The wrong flight (FDIR off) is in tests/lessons.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../../src/physics/simulation';
import { BUILTIN_LESSONS } from '../../src/lessons/catalog';
import { lessonConfig } from '../../src/lessons/config';
import { flightEnded, gradeLesson } from '../../src/lessons/grader';
import { MEASURES } from '../../src/lessons/measures';

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

/** Fly a lesson to its end for grading, calling `during` at every step (a student's action in flight). */
function flyLesson(id: string, edit?: Parameters<typeof lessonConfig>[1], during?: (sim: Simulation) => void) {
  const lesson = BUILTIN_LESSONS.find((l) => l.id === id)!;
  const sim = new Simulation(lessonConfig(lesson.mission, edit), { headless: true });
  let guard = 0;
  while (!flightEnded(lesson, sim) && !sim.done && sim.state.t < 8000 && guard++ < 20_000_000) { during?.(sim); sim.step(sim.suggestedDt()); }
  return { lesson, sim };
}
const why = (grade: unknown, sim: Simulation) => JSON.stringify(grade) + sim.events.map((e) => `\n${e.t.toFixed(1)} ${e.key}`).join('');
const exactAnswers = (lesson: (typeof BUILTIN_LESSONS)[number], sim: Simulation) =>
  Object.fromEntries(lesson.criteria.flatMap((c) => (c.kind === 'answer' ? [[c.id, MEASURES[c.measure].read(sim)!]] : [])));

describe('round 2: the six-DOF lessons, solved', () => {
  it('2.3 inertial navigation: a tactical-grade unit keeps the error under 500 m to MECO', { timeout: 900_000 }, () => {
    const { lesson, sim } = flyLesson('guid-nav', (s) => { s.dynamics!.navigation = { grade: 'tactical', gnss: false }; });
    const grade = gradeLesson(lesson, sim);
    expect(grade.verdict, why(grade, sim)).toBe('pass');
  });

  it('4.1 reading the loop: the crossover and the phase margin read at max-Q pass', { timeout: 900_000 }, () => {
    const { lesson, sim } = flyLesson('ctl-inspector');
    const grade = gradeLesson(lesson, sim, exactAnswers(lesson, sim));
    expect(grade.verdict, why(grade, sim)).toBe('pass');
  });

  it('4.2 gains with margins: the default gains give 30° and 6 dB at max-Q', { timeout: 900_000 }, () => {
    const { lesson, sim } = flyLesson('ctl-margins', (s) => { s.dynamics!.control = { pitchYaw: { attitudeGain: 1.5, rateGain: 3 } }; });
    const grade = gradeLesson(lesson, sim);
    expect(grade.verdict, why(grade, sim)).toBe('pass');
  });

  it('4.3 a step test: the fast tuning overshoots past 6 %; the default gains hardly at all', { timeout: 900_000 }, () => {
    const step = (sim: Simulation) => {
      if (sim.state.t >= 65 && !sim.events.some((e) => e.key === 'evt.attitudeTestStep')) {
        sim.startAttitudeTest({ axis: 'z', sign: 1, kind: 'step', amplitudeRad: 2 * Math.PI / 180, holdS: 8 });
      }
    };
    const asIs = flyLesson('ctl-step', undefined, step);
    expect(MEASURES['step.overshoot'].read(asIs.sim)!).toBeGreaterThan(6);
    expect(gradeLesson(asIs.lesson, asIs.sim, exactAnswers(asIs.lesson, asIs.sim)).verdict).toBe('fail');
    const retuned = (s: Parameters<Parameters<typeof lessonConfig>[1] & object>[0]) => { s.dynamics!.control = { pitchYaw: { attitudeGain: 1.5, rateGain: 3 } }; };
    // no test flown: nothing to grade
    const none = flyLesson('ctl-step', retuned);
    expect(gradeLesson(none.lesson, none.sim).verdict).toBe('fail');
    const { lesson, sim } = flyLesson('ctl-step', retuned, step);
    const grade = gradeLesson(lesson, sim, exactAnswers(lesson, sim));
    expect(grade.verdict, why(grade, sim)).toBe('pass');
  });

  it('4.4 bending and the notch filter: with the filter on the rocket flies through max-Q', { timeout: 900_000 }, () => {
    const { lesson, sim } = flyLesson('ctl-notch', (s) => { s.dynamics!.flex = { bending: true, notch: true }; });
    const grade = gradeLesson(lesson, sim);
    expect(grade.verdict, why(grade, sim)).toBe('pass');
  });
});
