/**
 * The six-DOF lessons of the Russian 24.05.06 pack (roadmap T03; the T03
 * research's S1–S3), flown as solved and as set, from the committed pack file
 * public/lessons/packs/ru-24-05-06.orbitlab-lesson.json. Each is a
 * Soyuz-2.1a to the station's plane in the window, the accepted six-DOF
 * reference (docs/SIXDOF-ACCEPTANCE.md): crewed in S1 and S2, uncrewed in S3,
 * whose failed flight must end in the vehicle's loss to be graded (with a crew
 * the escape system lands them, and a lesson without that end event is never
 * graded: a finding, recorded in the pack's source). Run by hand with the
 * other heavy suites (`npm run test:heavy`); tests/lesson-packs.test.ts flies
 * the point-mass lessons.
 *
 * S2's bound (1 000 m to the third stage's cut-off) was set after a worked
 * flight, as the research asks: 773 m with the star tracker on, plus 25 %, is
 * 966 m, rounded up. Measured on 2026-10-01 at d9d00c3 before the bound was
 * written: 2 951 m with the tactical unit alone, 388 m with a navigation-grade
 * unit alone, 4 740 m with a MEMS unit and the star tracker, 3.2 m with GNSS.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../../src/physics/simulation';
import { lessonConfig } from '../../src/lessons/config';
import { flightEnded, gradeLesson, type LessonAnswers } from '../../src/lessons/grader';
import { MEASURES } from '../../src/lessons/measures';
import { packPath, readPackText } from '../../src/lessons/packs';
import { isFlightLesson, type Lesson } from '../../src/lessons/types';
import type { MissionState } from '../../src/config/mission-file';
import packText from '../../public/lessons/packs/ru-24-05-06.orbitlab-lesson.json?raw';

const PACK = readPackText(packText, packPath('ru-24-05-06'))!;
const lesson = (id: string): Lesson => {
  const l = PACK.lessons.find((x) => x.id === id);
  if (!l || !isFlightLesson(l)) throw new Error(`no flight lesson ${id}`);
  return l;
};

function fly(l: Lesson, edit?: (s: MissionState) => void): Simulation {
  const sim = new Simulation(lessonConfig(l.mission, edit), { headless: true });
  let guard = 0;
  while (!flightEnded(l, sim) && !sim.done && sim.state.t < 8000 && guard++ < 20_000_000) sim.step(sim.suggestedDt());
  return sim;
}
const why = (l: Lesson, sim: Simulation, answers: LessonAnswers = {}) =>
  `${JSON.stringify(gradeLesson(l, sim, answers))}${sim.events.map((e) => `\n${e.t.toFixed(1)} ${e.key}`).join('')}`;
const navigation = (nav: object) => (s: MissionState) => { s.dynamics = { ...s.dynamics!, navigation: { ...s.dynamics!.navigation, ...nav } }; };

describe('pack ru-24-05-06, the six-DOF lessons', () => {
  it('S1 margins at max-Q: the crossover and phase margin read off the inspector pass, the gain margin holds 6 dB; a misread phase margin fails', { timeout: 900_000 }, () => {
    const l = lesson('ru-soyuz-margins');
    const sim = fly(l);
    // read off the Bode plot to the inspector's precision
    const read = { wc: Math.round(MEASURES['loop.wcAtMaxQ'].read(sim)! * 100) / 100, pm: Math.round(MEASURES['loop.pmAtMaxQ'].read(sim)!) };
    expect(gradeLesson(l, sim, read).verdict, why(l, sim, read)).toBe('pass');
    expect(MEASURES['loop.gmAtMaxQ'].read(sim)!).toBeGreaterThan(6);
    // the phase itself read at the crossover, not 180° plus it
    expect(gradeLesson(l, sim, { ...read, pm: read.pm - 180 }).verdict).toBe('fail');
    expect(gradeLesson(l, sim, { ...read, wc: read.wc * 1.5 }).verdict).toBe('fail');
  });

  it('S2 inertial navigation without GNSS: as set the error passes 1 000 m; the star tracker, or a navigation-grade unit, keeps it inside; MEMS with the star tracker does not', { timeout: 1_800_000 }, () => {
    const l = lesson('ru-bins-astro');
    const asSet = fly(l);
    expect(gradeLesson(l, asSet).verdict, why(l, asSet)).toBe('fail');
    expect(MEASURES['nav.positionError'].read(asSet)!).toBeGreaterThan(1000);
    const star = fly(l, navigation({ starTracker: true }));
    expect(gradeLesson(l, star).verdict, why(l, star)).toBe('pass');
    const navGrade = fly(l, navigation({ grade: 'navigation' }));
    expect(gradeLesson(l, navGrade).verdict, why(l, navGrade)).toBe('pass');
    const mems = fly(l, navigation({ grade: 'mems', starTracker: true }));
    expect(gradeLesson(l, mems).verdict, why(l, mems)).toBe('fail');
    // GNSS back on breaks the lesson's own rule, whatever the error
    const gnss = fly(l, navigation({ gnss: true }));
    expect(gradeLesson(l, gnss).criteria.find((c) => c.id === 'gnss')!.state).toBe('fail');
  });

  it('S3 a stuck rate gyro: with the FDIR on unit 1 is isolated and the uncrewed Soyuz reaches orbit; as set the vehicle breaks up and the lesson fails', { timeout: 900_000 }, () => {
    const l = lesson('ru-fdir-dus');
    const on = fly(l, (s) => { s.dynamics!.controlFaults!.fdir = true; });
    const g = gradeLesson(l, on);
    expect(g.verdict, why(l, on)).toBe('pass');
    expect(g.lockBroken).toEqual([]);
    const off = fly(l);
    expect(off.state.status, why(l, off)).toBe('failed');
    const lost = gradeLesson(l, off);
    expect(lost.final).toBe(true);
    expect(lost.verdict).toBe('fail');
  });
});
