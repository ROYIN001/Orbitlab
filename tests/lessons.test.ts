/**
 * Lessons with set tasks and automatic grading (roadmap E03): the built-in
 * lessons read cleanly in three languages, each point-mass lesson's worked
 * solution passes and a wrong flight fails, and the grader and the lesson file
 * reader behave as documented. The six-DOF lesson's solution is flown in
 * tests/heavy/lessons-sixdof.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { launchWindows } from '../src/physics/mission';
import { siteById } from '../src/data/sites';
import { BUILTIN_ISSUES, BUILTIN_LESSONS, allLessons, lessonNumber } from '../src/lessons/catalog';
import { lessonConfig } from '../src/lessons/config';
import { answerMatches, awaitingAnswers, brokenLocks, flightEnded, gradeLesson, regradeAnswers, type LessonAnswers } from '../src/lessons/grader';
import { MEASURES } from '../src/lessons/measures';
import { LESSON_FORMAT, lessonFileText, parseLessonFile, readLesson, type FileIssue } from '../src/lessons/lesson-file';
import { localText } from '../src/lessons/text';
import type { MissionState } from '../src/config/mission-file';
import type { Lesson, LessonFlight } from '../src/lessons/types';

const lesson = (id: string): Lesson => {
  const l = BUILTIN_LESSONS.find((x) => x.id === id);
  if (!l) throw new Error(`no lesson ${id}`);
  return l;
};

/** Fly a lesson's mission, with the student's edits, until it ends for grading. */
function fly(l: Lesson, edit?: (s: MissionState) => void, limit = 20000): Simulation {
  const sim = new Simulation(lessonConfig(l.mission, edit), { headless: true });
  let guard = 0;
  while (!flightEnded(l, sim) && !sim.done && sim.state.t < limit && guard++ < 2_000_000) sim.step(sim.suggestedDt());
  return sim;
}

/** Answers taken from the flight itself, as a student who worked them out exactly would type them. */
function exactAnswers(l: Lesson, flight: LessonFlight): LessonAnswers {
  const out: Record<string, number> = {};
  for (const c of l.criteria) if (c.kind === 'answer') out[c.id] = MEASURES[c.measure].read(flight)!;
  return out;
}

const log = (sim: Simulation): string => sim.events.map((e) => `${e.t.toFixed(0)} ${e.key} ${JSON.stringify(e.params ?? {})}`).join('\n');
const verdict = (l: Lesson, sim: Simulation, answers?: LessonAnswers) => {
  const g = gradeLesson(l, sim, answers ?? exactAnswers(l, sim));
  return { verdict: g.verdict, detail: JSON.stringify(g) + '\n' + log(sim) };
};

const CYRILLIC = /\p{Script=Cyrillic}/u;
const THAI = /\p{Script=Thai}/u;

describe('the built-in lessons', () => {
  it('read without a single issue, every text in all three languages', () => {
    expect(BUILTIN_ISSUES).toEqual([]);
    expect(BUILTIN_LESSONS.length).toBe(19);
  });

  it('carry Russian in Cyrillic and Thai in Thai script in every text', () => {
    for (const l of BUILTIN_LESSONS) {
      const texts = [l.title, l.brief, ...(l.debrief ? [l.debrief] : []), ...l.hints,
        ...l.criteria.flatMap((c) => [...(c.label ? [c.label] : []), ...(c.kind === 'answer' ? [c.prompt] : [])])];
      for (const text of texts) {
        expect(text.ru, `${l.id}: ${text.en}`).toMatch(CYRILLIC);
        expect(text.th, `${l.id}: ${text.en}`).toMatch(THAI);
      }
    }
  });

  it('are numbered 1.1 … 5.3 without a gap, eighteen written and the one waiting for its roadmap item listed as coming', () => {
    const numbers = allLessons().map(lessonNumber);
    expect(numbers).toEqual(['1.1', '1.2', '1.3', '1.4', '1.5', '2.1', '2.2', '2.3', '2.4', '3.1', '3.2', '3.3', '4.1', '4.2', '4.3', '4.4', '5.1', '5.2', '5.3']);
    expect(BUILTIN_LESSONS.filter((l) => l.comingSoon).map((l) => l.id)).toEqual(['adv-history']);
    for (const l of BUILTIN_LESSONS.filter((x) => !x.comingSoon)) {
      expect(l.hints.length, l.id).toBe(3);
      expect(l.criteria.length, l.id).toBeGreaterThan(0);
    }
  });

  it('come back unchanged through a lesson file', () => {
    const parsed = parseLessonFile(JSON.parse(lessonFileText(BUILTIN_LESSONS)), new Set());
    expect(parsed.issues).toEqual([]);
    expect(parsed.lessons).toEqual(BUILTIN_LESSONS);
  });
});

describe('each lesson, flown as solved and flown wrong', () => {
  it('1.1 your first orbit: the orbit and both numbers worked out pass; a wrong period fails', () => {
    const l = lesson('orbit-first');
    const sim = fly(l);
    const { verdict: ok, detail } = verdict(l, sim);
    expect(ok, detail).toBe('pass');
    // what a student would type from the formulas
    const r = 6378.137 + 500;
    const period = 2 * Math.PI * Math.sqrt(r ** 3 / 398600.4418) / 60;
    const speed = Math.sqrt(398600.4418 / r);
    expect(gradeLesson(l, sim, { period, speed }).verdict).toBe('pass');
    expect(gradeLesson(l, sim, { period: 90, speed }).verdict).toBe('fail');
    expect(gradeLesson(l, sim, { period }).verdict).toBe('open');
    expect(awaitingAnswers(l, gradeLesson(l, sim, { period }))).toEqual(['speed']);
  });

  it('1.2 into the station\'s plane: the next window passes; the panel\'s own time misses the node', () => {
    const l = lesson('orbit-iss-plane');
    const solved = fly(l, (s) => { s.launchTime = launchWindows(s.orbit, siteById(s.siteId), s.launchTime, 1)[0].time; });
    expect(verdict(l, solved).verdict, verdict(l, solved).detail).toBe('pass');
    const wrong = fly(l);
    const g = gradeLesson(l, wrong);
    expect(g.verdict).toBe('fail');
    expect(g.criteria.find((c) => c.id === 'node')!.state).toBe('fail');
    expect(g.criteria.find((c) => c.id === 'inclination')!.state).toBe('pass');
  });

  it('1.3 a Hohmann transfer: the apogee burn from vis-viva passes; a burn from the wrong ellipse fails', () => {
    const l = lesson('orbit-hohmann');
    const sim = fly(l);
    // the student's vis-viva: from a 200 × 2 000 km ellipse to the 2 000 km circle
    const mu = 398600.4418, R = 6378.137, ra = R + 2000, a = (R + 200 + ra) / 2;
    const burn = (Math.sqrt(mu / ra) - Math.sqrt(mu * (2 / ra - 1 / a))) * 1000;
    const period = 2 * Math.PI * Math.sqrt(ra ** 3 / mu) / 60;
    const { verdict: ok, detail } = verdict(l, sim, { burn, period });
    expect(ok, detail).toBe('pass');
    // a student who treats the whole climb from the ground as the transfer
    const wrongA = (R + ra) / 2;
    const wrongBurn = (Math.sqrt(mu / ra) - Math.sqrt(mu * (2 / ra - 1 / wrongA))) * 1000;
    expect(gradeLesson(l, sim, { burn: wrongBurn, period }).verdict).toBe('fail');
  });

  it('1.4 payload and Δv: 18 t passes; the 19.5 t the panel starts with, and a timid 17 t, fail', () => {
    const l = lesson('orbit-payload');
    const solved = fly(l, (s) => { s.payloadMass = 18000; });
    expect(verdict(l, solved).verdict, verdict(l, solved).detail).toBe('pass');
    expect(gradeLesson(l, fly(l)).verdict).toBe('fail');
    const timid = gradeLesson(l, fly(l, (s) => { s.payloadMass = 17000; }));
    expect(timid.verdict).toBe('fail');
    expect(timid.criteria.find((c) => c.id === 'payload')!.state).toBe('fail');
  });

  it('1.4 grades the same long after the insertion, when the payload has separated and the Δv shown is its own', () => {
    const l = lesson('orbit-payload');
    const sim = fly(l, (s) => { s.payloadMass = 18000; });
    const atEnd = gradeLesson(l, sim);
    const until = sim.state.t + 3600;
    while (sim.state.t < until) sim.step(sim.suggestedDt());
    expect(sim.events.some((e) => e.key === 'evt.payloadSep'), log(sim)).toBe(true);
    expect(sim.telemetry[sim.telemetry.length - 1].dvRemaining).toBe(0);
    expect(gradeLesson(l, sim)).toEqual({ ...atEnd, t: sim.state.t });
  });

  it('1.5 range safety: Vandenberg passes; Cape Canaveral flies the orbit but is not licensed for it', () => {
    const l = lesson('orbit-range-safety');
    const solved = fly(l, (s) => { s.siteId = 'vandenberg'; });
    expect(verdict(l, solved).verdict, verdict(l, solved).detail).toBe('pass');
    const cape = gradeLesson(l, fly(l));
    expect(cape.verdict).toBe('fail');
    expect(cape.criteria.find((c) => c.id === 'licence')!.state).toBe('fail');
  });

  it('3.1 one engine out: 18 t passes; 19 t does not reach the orbit, and 17 t is more than had to come off', () => {
    const l = lesson('fail-engine-out');
    const solved = fly(l, (s) => { s.payloadMass = 18000; });
    expect(solved.events.some((e) => e.key === 'evt.engineOut')).toBe(true);
    expect(verdict(l, solved).verdict, verdict(l, solved).detail).toBe('pass');
    expect(gradeLesson(l, fly(l)).verdict).toBe('fail');
    expect(gradeLesson(l, fly(l, (s) => { s.payloadMass = 17000; })).verdict).toBe('fail');
  });

  it('3.2 a stuck gyro: without the FDIR the vehicle breaks up, and the lesson fails', { timeout: 120_000 }, () => {
    const l = lesson('fail-gyro-fdir');
    const sim = fly(l, undefined, 120);
    expect(sim.state.status, log(sim)).toBe('failed');
    const g = gradeLesson(l, sim);
    expect(g.final).toBe(true);
    expect(g.verdict).toBe('fail');
    expect(g.lockBroken).toEqual([]);
  });

  it('3.2 a stuck gyro: turning the FDIR on keeps the failure the lesson set, and changing the failure breaks the lock', () => {
    const l = lesson('fail-gyro-fdir');
    const on = lessonConfig(l.mission, (s) => { s.dynamics!.controlFaults!.fdir = true; });
    const flight = { cfg: on } as LessonFlight;
    expect(brokenLocks(l, flight)).toEqual([]);
    const other = lessonConfig(l.mission, (s) => { s.dynamics!.controlFaults!.faults = []; });
    expect(brokenLocks(l, { cfg: other } as LessonFlight)).toEqual(['setup.faults']);
  });

  it('3.3 the crew\'s escape: the crew lands, and the peak load read from the flight passes; a guess of 5 g fails', { timeout: 120_000 }, () => {
    const l = lesson('fail-abort');
    const sim = fly(l, undefined, 4000);
    expect(sim.events.some((e) => e.key === 'evt.abortCrewSafe'), log(sim)).toBe(true);
    const peak = MEASURES['abort.maxG'].read(sim)!;
    expect(peak).toBeGreaterThan(8);
    expect(peak).toBeLessThan(20);
    expect(verdict(l, sim).verdict, verdict(l, sim).detail).toBe('pass');
    expect(gradeLesson(l, sim, { peak: 5 }).verdict).toBe('fail');
  });
});

describe('the grader', () => {
  it('does not grade a flight still on the pad, and breaks a lock the moment the flight differs', () => {
    const l = lesson('orbit-payload');
    const sim = new Simulation(lessonConfig(l.mission, (s) => { s.siteId = 'ksc39a'; }), { headless: true });
    const g = gradeLesson(l, sim);
    expect(g.final).toBe(false);
    expect(g.lockBroken).toEqual(['setup.site']);
    expect(g.verdict).toBe('fail');
  });

  it('fails a bound on a peak as soon as it is broken, before the flight ends', () => {
    const l: Lesson = { ...lesson('orbit-first'), criteria: [{ id: 'q', kind: 'measure', measure: 'maxQ', max: 15 }, { id: 'orbit', kind: 'outcome', is: 'target' }] };
    const sim = new Simulation(lessonConfig(l.mission), { headless: true });
    while (sim.state.t < 15) sim.step(sim.suggestedDt());
    expect(gradeLesson(l, sim).criteria[0].state).toBe('passing');
    while (sim.state.t < 70) sim.step(sim.suggestedDt());
    const g = gradeLesson(l, sim);
    expect(g.final).toBe(false);
    expect(g.criteria[0].state).toBe('fail');
    expect(g.criteria[1].state).toBe('pending');
    expect(g.verdict).toBe('fail');
  });

  it('keeps the grade taken at the end, checking only the answers again', () => {
    const l = lesson('orbit-first');
    const sim = fly(l);
    const frozen = gradeLesson(l, sim);
    const exact = exactAnswers(l, sim);
    expect(regradeAnswers(l, frozen, exact)).toEqual(gradeLesson(l, sim, exact));
    expect(regradeAnswers(l, frozen, { ...exact, period: 80 }).verdict).toBe('fail');
    expect(regradeAnswers(l, frozen, { period: exact.period }).verdict).toBe('open');
  });

  it('matches an answer within the larger of its absolute and relative tolerance', () => {
    expect(answerMatches(10.9, 10, 1)).toBe(true);
    expect(answerMatches(11.1, 10, 1)).toBe(false);
    expect(answerMatches(104, 100, undefined, 5)).toBe(true);
    expect(answerMatches(106, 100, 1, 5)).toBe(false);
  });

  it('reads the text in the language asked for, English where a text has none', () => {
    expect(localText({ en: 'a', ru: 'б' }, 'ru')).toBe('б');
    expect(localText({ en: 'a', ru: 'б' }, 'th')).toBe('a');
  });
});

describe('a teacher\'s lesson file', () => {
  const base = () => JSON.parse(JSON.stringify(lessonFileText([lesson('orbit-first')]))) as string;

  it('keeps the good lessons and leaves out one with an unknown hook, a measure that does not exist or no criteria, naming why', () => {
    const doc = JSON.parse(base());
    const good = doc.lessons[0];
    doc.lessons.push({ ...good, id: 'a', criteria: [{ id: 'x', kind: 'hook', hook: 'nope' }] });
    doc.lessons.push({ ...good, id: 'b', criteria: [{ id: 'x', kind: 'measure', measure: 'altitude', max: 1 }] });
    doc.lessons.push({ ...good, id: 'c', criteria: [] });
    doc.lessons.push({ ...good, id: 'orbit-first' });
    const parsed = parseLessonFile(doc, new Set());
    expect(parsed.usable).toBe(true);
    expect(parsed.lessons.map((l) => l.id)).toEqual(['orbit-first']);
    const codes = parsed.issues.map((i) => `${i.code}:${i.detail ?? ''}`);
    expect(codes).toEqual(['hook:nope', 'invalid:measure', 'missing:', 'duplicate:orbit-first']);
  });

  it('reads a lesson with a text in English only, and warns of each missing language', () => {
    const issues: FileIssue[] = [];
    const raw = JSON.parse(base()).lessons[0];
    raw.title = { en: 'Only English' };
    const l = readLesson(raw, 'lessons[0]', issues);
    expect(l?.title).toEqual({ en: 'Only English' });
    expect(issues.map((i) => `${i.level}:${i.code}:${i.detail}`)).toEqual(['warn:translation:ru', 'warn:translation:th']);
  });

  it('refuses a lesson whose mission cannot be flown as written, and a file that is not a lesson file', () => {
    const doc = JSON.parse(base());
    doc.lessons[0].mission.mission.siteId = 'plesetsk';
    const parsed = parseLessonFile(doc, new Set());
    expect(parsed.lessons).toEqual([]);
    expect(parsed.issues[0]).toMatchObject({ code: 'mission', detail: 'setup.site' });
    expect(parseLessonFile({ format: 'orbitlab.mission', version: 1 }, new Set()).usable).toBe(false);
    expect(parseLessonFile({ format: LESSON_FORMAT, version: 2, lessons: JSON.parse(base()).lessons }, new Set()).issues)
      .toEqual([{ where: 'document', code: 'newerVersion', level: 'warn' }]);
  });

  it('adds a teacher\'s lessons to the catalogue after the built-in ones of their track', () => {
    const custom = { ...lesson('orbit-first'), id: 'teacher-1', track: 1, order: 9 };
    const all = allLessons([custom]);
    expect(all.map((l) => l.id).indexOf('teacher-1')).toBe(5);
  });
});
