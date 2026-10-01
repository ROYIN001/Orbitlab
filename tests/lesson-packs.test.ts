/**
 * The lesson packs the app ships (roadmap T03; the T03 research's packs B, A,
 * P, R and S): the committed files under public/lessons/packs/ are what
 * their sources write, they read with no issue at the version their lessons
 * need, every text is in all three scripts, every code is of a known kind,
 * and no pack lesson takes a built-in id. Then each point-mass lesson's
 * worked solution is flown headless and passes, and a wrong answer or a wrong
 * flight fails (the tests/lessons.test.ts pattern). None of these missions is
 * in the fleet matrix exactly as the lesson sets it (a window time, a
 * payload, an orbit the matrix does not fly), so each is flown here before it
 * ships. The six-DOF lessons (S1–S3) are flown in
 * tests/heavy/lesson-packs-sixdof.test.ts.
 *
 * Tolerances: the lessons' own, from the research (fixed before any flight)
 * except four, set after seeing the flights and said where they are used —
 * P1's period (5 min, so both the computed and the textbook sidereal-day
 * answers pass), S2's navigation bound (heavy test), and R1's period (0.4
 * min) and R2's semi-major axis (20 km), widened from the research's 0.2 min
 * and 10 km after measuring how the osculating elements a late frame grades
 * swing under J₂ (the last describe below).
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { launchWindows } from '../src/physics/mission';
import { siteById } from '../src/data/sites';
import { BUILTIN_CASE_LESSONS, BUILTIN_LESSONS } from '../src/lessons/catalog';
import { lessonConfig } from '../src/lessons/config';
import { flightEnded, gradeLesson, type LessonAnswers } from '../src/lessons/grader';
import { MEASURES } from '../src/lessons/measures';
import { lessonFileVersion } from '../src/lessons/lesson-file';
import { BUNDLED_PACKS, packLessons, packPath, readPackText, type ResolvedPack } from '../src/lessons/packs';
import { PACK_SOURCES, packFileText } from '../src/lessons/pack-sources';
import { precacheable } from '../src/pwa/manifest';
import { allLessons } from '../src/lessons/catalog';
import { flightRecord } from '../src/lessons/progress';
import { checkRecord } from '../src/lessons/recheck';
import { appBuildId } from '../src/build-info';
import { CURRICULUM_KINDS, type Lesson, type LocalText } from '../src/lessons/types';
import type { MissionState } from '../src/config/mission-file';

const FILES = import.meta.glob('../public/lessons/packs/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const SRC = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const fileText = (id: string): string => {
  const text = FILES[`../public/${packPath(id)}`];
  if (text === undefined) throw new Error(`no file for ${id}`);
  return text;
};
const PACKS: ResolvedPack[] = BUNDLED_PACKS.map((id) => {
  const pack = readPackText(fileText(id), packPath(id));
  if (!pack) throw new Error(`${id} is not a pack`);
  return pack;
});

/** A pack lesson as the app reads it: from the committed file. */
const lesson = (id: string): Lesson => {
  const l = packLessons(PACKS).find((x) => x.id === id);
  if (!l || l.kind === 'case') throw new Error(`no flight lesson ${id}`);
  return l;
};

/** Fly a lesson's mission, with the student's edits, until it ends for grading. */
function fly(l: Lesson, edit?: (s: MissionState) => void, limit = 200_000): Simulation {
  const sim = new Simulation(lessonConfig(l.mission, edit), { headless: true });
  let guard = 0;
  while (!flightEnded(l, sim) && !sim.done && sim.state.t < limit && guard++ < 5_000_000) sim.step(sim.suggestedDt());
  return sim;
}
const why = (l: Lesson, sim: Simulation, answers: LessonAnswers) =>
  `${JSON.stringify(gradeLesson(l, sim, answers))}\n${sim.events.map((e) => `${e.t.toFixed(0)} ${e.key}`).join('\n')}`;
/** The next window, as the setup panel's "Next window" sets it. */
const nextWindow = (s: MissionState) => { s.launchTime = launchWindows(s.orbit, siteById(s.siteId), s.launchTime, 1)[0].time; };

// what a student types, worked from the numbers on screen
const MU = 398600.4418, R = 6378.137;
/**
 * The reached heights as the event log's "Target orbit achieved" line gives
 * them, in whole km: the moment of insertion, where the flight is graded.
 * Later the osculating heights on screen swing by tens of km under J₂ (a GTO's
 * a by ±27 km over an orbit, measured), which is why the briefs send students
 * to this line.
 */
const heights = (sim: Simulation) => {
  const e = sim.events.find((x) => x.key === 'evt.targetOrbit');
  if (!e) throw new Error('no target orbit');
  return { hp: Number(e.params!.pe), ha: Number(e.params!.ap) };
};
const circle = (h: number) => {
  const r = R + h;
  return { speed: Math.sqrt(MU / r), period: 2 * Math.PI * Math.sqrt(r ** 3 / MU) / 60 };
};
const ellipse = (hp: number, ha: number) => {
  const rp = R + hp, ra = R + ha, a = (rp + ra) / 2;
  return { a, e: (ra - rp) / (ra + rp), period: 2 * Math.PI * Math.sqrt(a ** 3 / MU) / 60, vp: Math.sqrt(MU * (2 / rp - 1 / a)) };
};

const CYRILLIC = /\p{Script=Cyrillic}/u;
const THAI = /\p{Script=Thai}/u;
const scripts = (text: LocalText, where: string) => {
  expect(text.ru, `${where}: ${text.en}`).toMatch(CYRILLIC);
  expect(text.th, `${where}: ${text.en}`).toMatch(THAI);
  // the app writes Thai numbers with Arabic numerals (tests/i18n.test.ts)
  expect(text.th, where).not.toMatch(/[๐-๙]/);
};

describe('the bundled lesson packs', () => {
  it('are the five the research proposes, in its order, each file what its source writes', () => {
    expect(BUNDLED_PACKS).toEqual(Object.keys(PACK_SOURCES));
    expect(BUNDLED_PACKS).toEqual(['ipst-basic', 'ipst-earth-space', 'ipst-physics', 'rtaf-academy', 'ru-24-05-06']);
    expect(Object.keys(FILES).sort()).toEqual(BUNDLED_PACKS.map((id) => `../public/${packPath(id)}`).sort());
    for (const id of BUNDLED_PACKS) {
      const written = packFileText(id);
      expect(written.issues, id).toEqual([]);
      // a difference here: run `node --experimental-strip-types scripts/lesson-packs.ts`
      expect(fileText(id), id).toBe(written.text);
    }
  });

  it('read with no issue at all, at the version their lessons need, as drafts awaiting review', () => {
    for (const p of PACKS) {
      expect(p.issues, p.pack.id).toEqual([]);
      expect(p.pack.reviewed, p.pack.id).toBe(false);
      const doc = JSON.parse(fileText(p.pack.id)) as { version: number };
      // no version of its own (map §4.3): the lessons decide, and these fly catalogue rockets and satellites
      expect(doc.version, p.pack.id).toBe(lessonFileVersion(p.lessons));
      expect(doc.version, p.pack.id).toBe(1);
    }
  });

  it('carry the research\'s lessons: B1–B4, A1–A4, P1–P3, R1–R3 and R5, S1–S5', () => {
    expect(PACKS.map((p) => [p.pack.id, p.items.map((i) => i.lesson.id)])).toEqual([
      ['ipst-basic', ['ipst-b-forces', 'ipst-b-falling-around', 'orbit-payload', 'case-theos2']],
      ['ipst-earth-space', ['ipst-a-kepler3', 'ipst-a-sun-clock', 'case-theos2', 'adv-history']],
      ['ipst-physics', ['ipst-p-geo', 'ipst-p-starlink', 'orbit-payload', 'fail-engine-out']],
      ['rtaf-academy', ['rtaf-napa1-sso', 'rtaf-elements', 'ctl-inspector', 'ctl-margins', 'adv-docking']],
      ['ru-24-05-06', ['ru-soyuz-margins', 'ru-bins-astro', 'ru-fdir-dus', 'guid-monte-carlo', 'case-cz5b', 'case-iridium']],
    ]);
  });

  it('never take a built-in lesson\'s id, nor one another\'s, and number their own lessons track by pack', () => {
    const builtin = new Set([...BUILTIN_LESSONS, ...BUILTIN_CASE_LESSONS].map((l) => l.id));
    const own = PACKS.flatMap((p) => p.lessons.map((l) => l.id));
    expect(own.filter((id) => builtin.has(id))).toEqual([]);
    expect(new Set(own).size).toBe(own.length);
    PACKS.forEach((p, i) => {
      expect(p.lessons.map((l) => [l.track, l.order]), p.pack.id).toEqual(p.lessons.map((_, k) => [11 + i, k + 1]));
    });
    // a reference is the built-in lesson itself
    for (const p of PACKS) for (const item of p.items.filter((x) => x.reference)) expect(builtin.has(item.lesson.id)).toBe(true);
  });

  it('give every lesson, own or reused, at least one code of a known kind, and every reference a note', () => {
    for (const p of PACKS) for (const item of p.items) {
      expect(item.curriculum.length, `${p.pack.id}/${item.lesson.id}`).toBeGreaterThan(0);
      for (const c of item.curriculum) expect(CURRICULUM_KINDS).toContain(c.kind);
      if (item.reference) expect(item.note, `${p.pack.id}/${item.lesson.id}`).toBeDefined();
    }
  });

  it('write every text in Russian and Thai script, with three hints to each lesson', () => {
    for (const p of PACKS) {
      const { title, audience, framework, description } = p.pack;
      for (const [k, text] of Object.entries({ title, audience, framework, description: description! })) scripts(text, `${p.pack.id}.${k}`);
      for (const item of p.items) if (item.note) scripts(item.note, `${p.pack.id}/${item.lesson.id}.note`);
      for (const l of p.lessons) {
        expect(l.hints.length, l.id).toBe(3);
        const texts = [l.title, l.brief, ...(l.debrief ? [l.debrief] : []), ...l.hints,
          ...l.criteria.flatMap((c) => [...(c.label ? [c.label] : []), ...('prompt' in c ? [c.prompt] : [])])];
        texts.forEach((text, k) => scripts(text, `${l.id}[${k}]`));
      }
    }
  });

  it('are precached for offline use, and kept out of the app\'s own bundle', () => {
    for (const id of BUNDLED_PACKS) expect(precacheable(packPath(id)), id).toBe(true);
    // the sources are for scripts/lesson-packs.ts and the tests: no app module imports them
    const importers = Object.entries(SRC)
      .filter(([path]) => !path.includes('/pack-sources/'))
      .filter(([, text]) => /from\s+['"][^'"]*pack-sources/.test(text))
      .map(([path]) => path);
    expect(importers).toEqual([]);
  });
});

describe('each point-mass pack lesson, flown as solved and flown wrong', () => {
  it('B1 forces on a rocket: the peak acceleration and the time of max-Q read off the flight pass; 1 g and MECO\'s time fail', () => {
    const l = lesson('ipst-b-forces');
    const sim = fly(l);
    const peak = MEASURES.maxG.read(sim)!;
    const maxQ = MEASURES.maxQTime.read(sim)!;
    // read off the chart and the event log, to a chart's precision
    const read = { 'peak-g': Math.round(peak * 10) / 10, 'maxq-time': Math.round(maxQ) };
    expect(gradeLesson(l, sim, read).verdict, why(l, sim, read)).toBe('pass');
    expect(peak).toBeGreaterThan(4);
    expect(peak).toBeLessThan(5);
    expect(gradeLesson(l, sim, { ...read, 'peak-g': 1 }).verdict).toBe('fail');
    const meco = sim.events.find((e) => e.key === 'evt.meco')!.t;
    expect(gradeLesson(l, sim, { ...read, 'maxq-time': meco }).verdict).toBe('fail');
  });

  it('B2 falling around the Earth: v = √(GM/r) and T = 2πr/v for the reached height pass; v = √(g₀r) fails', () => {
    const l = lesson('ipst-b-falling-around');
    const sim = fly(l);
    const { hp, ha } = heights(sim);
    const c = circle((hp + ha) / 2);
    expect(gradeLesson(l, sim, c).verdict, why(l, sim, c)).toBe('pass');
    // surface gravity taken for the gravity up there
    const wrong = { ...c, speed: Math.sqrt(9.80665e-3 * (R + (hp + ha) / 2)) };
    expect(gradeLesson(l, sim, wrong).verdict).toBe('fail');
  });

  it('A1 Kepler\'s third law: a, T and e from the reached heights pass; a from the planned 250 × 35 786 km fails, as the brief warns', () => {
    const l = lesson('ipst-a-kepler3');
    const sim = fly(l);
    const { hp, ha } = heights(sim);
    const o = ellipse(hp, ha);
    const solved = { a: o.a, period: o.period, e: o.e };
    expect(gradeLesson(l, sim, solved).verdict, why(l, sim, solved)).toBe('pass');
    const planned = ellipse(250, 35786);
    expect(gradeLesson(l, sim, { ...solved, a: planned.a }).verdict).toBe('fail');
    // the Earth's radius forgotten
    expect(gradeLesson(l, sim, { ...solved, a: (hp + ha) / 2 }).verdict).toBe('fail');
  });

  it('A2 the Sun\'s time: the next window passes with the period from Kepler; the panel\'s own time misses the 10:30 plane', () => {
    const l = lesson('ipst-a-sun-clock');
    const solved = fly(l, nextWindow);
    const answer = { period: circle(600).period };
    expect(gradeLesson(l, solved, answer).verdict, why(l, solved, answer)).toBe('pass');
    const wrong = fly(l);
    const g = gradeLesson(l, wrong, answer);
    expect(g.verdict).toBe('fail');
    expect(g.criteria.find((c) => c.id === 'node')!.state).toBe('fail');
    expect(g.lockBroken).toEqual([]);
  });

  it('P1 the geostationary orbit: the period and speed computed for the reached height pass, and so do the textbook 1 436 min and 3.07 km/s; 24 hours fails', () => {
    const l = lesson('ipst-p-geo');
    const sim = fly(l);
    const { hp, ha } = heights(sim);
    const c = circle((hp + ha) / 2);
    expect(gradeLesson(l, sim, c).verdict, why(l, sim, c)).toBe('pass');
    expect(MEASURES['orbit.inclination'].read(sim)!).toBeLessThan(0.5);
    // the tolerance (5 min) was set after this flight was seen to stop about 80 km short of the
    // geostationary height (1 432 min): the sidereal day passes, the solar day does not
    const textbook = { period: 1436.07, speed: 3.0747 };
    expect(gradeLesson(l, sim, textbook).verdict, why(l, sim, textbook)).toBe('pass');
    expect(gradeLesson(l, sim, { ...textbook, period: 1440 }).verdict).toBe('fail');
  });

  it('P2 gravity as the centripetal force: v and T for the reached shell pass; surface gravity fails', () => {
    const l = lesson('ipst-p-starlink');
    const sim = fly(l);
    const { hp, ha } = heights(sim);
    const c = circle((hp + ha) / 2);
    expect(gradeLesson(l, sim, c).verdict, why(l, sim, c)).toBe('pass');
    const wrong = { ...c, speed: Math.sqrt(9.80665e-3 * (R + (hp + ha) / 2)) };
    expect(gradeLesson(l, sim, wrong).verdict).toBe('fail');
  });

  it('R1 the sun-synchronous inclination: J₂\'s cos i at 600 km and the period pass in the window; the prograde mirror and the panel\'s time fail', () => {
    const l = lesson('rtaf-napa1-sso');
    const solved = fly(l, nextWindow);
    // what a cadet computes from the hint's constants
    const a = R + 600, rate = 2 * Math.PI / (365.2422 * 86400), j2 = 1.0826e-3;
    const cosi = -2 * rate * a ** 3.5 / (3 * j2 * R ** 2 * Math.sqrt(MU));
    const answers = { inclination: Math.acos(cosi) * 180 / Math.PI, period: circle(600).period };
    expect(answers.inclination).toBeCloseTo(97.79, 2);
    expect(gradeLesson(l, solved, answers).verdict, why(l, solved, answers)).toBe('pass');
    expect(gradeLesson(l, solved, { ...answers, inclination: 180 - answers.inclination }).verdict).toBe('fail');
    const wrong = gradeLesson(l, fly(l), answers);
    expect(wrong.verdict).toBe('fail');
    expect(wrong.criteria.find((c) => c.id === 'node')!.state).toBe('fail');
  });

  it('R2 the elements: a, e and T from the reached heights pass, and vis-viva gives the speed after the burn; planned heights fail', () => {
    const l = lesson('rtaf-elements');
    const sim = fly(l);
    const { hp, ha } = heights(sim);
    const o = ellipse(hp, ha);
    const solved = { a: o.a, e: o.e, period: o.period };
    expect(gradeLesson(l, sim, solved).verdict, why(l, sim, solved)).toBe('pass');
    expect(gradeLesson(l, sim, { ...solved, a: ellipse(250, 35786).a }).verdict).toBe('fail');
    // the hint's check: vis-viva at perigee against the speed just after the burn
    expect(Math.abs(o.vp - MEASURES['orbit.speed'].read(sim)!)).toBeLessThan(0.02);
  });
});

describe('the instructor\'s check of a pack lesson', () => {
  it('re-flies a pack lesson\'s record from the packs\' own lessons, with no lesson file opened, and matches', () => {
    // the check page hands the packs' lessons to the re-check (src/ui/lessons/lesson-mode.ts `showCheck`)
    const l = lesson('ipst-a-kepler3');
    const sim = fly(l);
    const { hp, ha } = heights(sim);
    const o = ellipse(hp, ha);
    const answers = { a: o.a, period: o.period, e: o.e };
    const grade = gradeLesson(l, sim, answers);
    expect(grade.verdict).toBe('pass');
    const record = flightRecord({ at: new Date(0), grade, answers, hintsShown: 0, cfg: sim.cfg, clock: grade.t, actions: sim.actions, app: appBuildId() });
    const job = { file: 0, student: null, lessonId: l.id, which: ['passed' as const], record };
    const check = checkRecord(job, allLessons(packLessons(PACKS)));
    expect(check.status, JSON.stringify(check)).toBe('match');
    expect(check.recheckedVerdict).toBe('pass');
    // without the packs the lesson is not known
    expect(checkRecord(job, allLessons()).reason).toBe('noLesson');
  });
});

/**
 * A live page grades a flight at the first frame that shows its end
 * (src/lessons/grader.ts `gradeShown`), and its orbit measures are the
 * osculating ones of that frame. Under time warp the frame can come minutes
 * late, and under J₂ the osculating elements swing with the point of the orbit
 * (measured: a GTO's a by +16 km 300 s after insertion, 24 334-24 379 km over
 * an orbit; an SSO's period 96.33-96.72 min). The tolerances of 12.1 and
 * 14.2 (a), 14.1 (period) were set after that measurement so that the worked
 * answers pass graded that late; this holds them to it.
 */
describe('each worked solution, graded as late as a warped page may grade it', () => {
  /** Grade the flight again after it has coasted on `lag` s past its end, as a late frame would. */
  function lateVerdicts(l: Lesson, sim: Simulation, answers: LessonAnswers, lags: readonly number[]): Array<[number, string]> {
    const t0 = sim.state.t;
    return lags.map((lag) => {
      while (sim.state.t < t0 + lag) sim.step(Math.min(sim.suggestedDt(), t0 + lag - sim.state.t + 1e-9));
      return [lag, gradeLesson(l, sim, answers, true).verdict];
    });
  }
  const pass = (lags: readonly number[]) => lags.map((lag) => [lag, 'pass']);

  it('12.1 and 14.2 (a GTO): up to 1 000 s late', () => {
    const lags = [0, 30, 120, 300, 600, 1000];
    for (const id of ['ipst-a-kepler3', 'rtaf-elements']) {
      const l = lesson(id);
      const sim = fly(l);
      const { hp, ha } = heights(sim);
      const o = ellipse(hp, ha);
      expect(lateVerdicts(l, sim, { a: o.a, e: o.e, period: o.period }, lags), id).toEqual(pass(lags));
    }
  });

  it('11.2, 12.2, 13.2 and 14.1 (circles): anywhere on the next revolution', () => {
    const lags = Array.from({ length: 11 }, (_, k) => k * 600);
    const cases: Array<[string, ((s: MissionState) => void) | undefined, (sim: Simulation) => LessonAnswers]> = [
      ['ipst-b-falling-around', undefined, (sim) => { const { hp, ha } = heights(sim); return circle((hp + ha) / 2); }],
      ['ipst-a-sun-clock', nextWindow, () => ({ period: circle(600).period })],
      ['ipst-p-starlink', undefined, (sim) => { const { hp, ha } = heights(sim); return circle((hp + ha) / 2); }],
      ['rtaf-napa1-sso', nextWindow, () => {
        const a = R + 600, rate = 2 * Math.PI / (365.2422 * 86400);
        return { inclination: Math.acos(-2 * rate * a ** 3.5 / (3 * 1.0826e-3 * R ** 2 * Math.sqrt(MU))) * 180 / Math.PI, period: circle(600).period };
      }],
    ];
    for (const [id, edit, answers] of cases) {
      const l = lesson(id);
      const sim = fly(l, edit);
      expect(lateVerdicts(l, sim, answers(sim), lags), id).toEqual(pass(lags));
    }
  });
});
