/**
 * The DOM-free parts behind the lessons' pages (roadmap E03): the results file
 * and its checksum, the progress kept in storage, the WebMCP tools, the
 * charts and the radar as SVG text, and unit symbols in each language.
 */
import { describe, expect, it } from 'vitest';
import { clearRevealed, emptyProgress, flownMission, lessonProgress, loadProgress, recordGrade, recordRevealed, resultsFile, saveProgress, verifyResults, type KeyValueStore } from '../src/lessons/progress';
import { awaitingAnswers, regradeAnswers } from '../src/lessons/grader';
import { FlightLessons } from '../src/lessons/flight-lessons';
import { worksheetSource } from '../src/worksheets/build';
import type { WsFlight } from '../src/worksheets/flight-questions';
import { parseMissionDocument } from '../src/config/mission-file';
import { defaultMissionState, lessonConfig, missionConfigFromState } from '../src/lessons/config';
import { Simulation } from '../src/physics/simulation';
import { createLessonTools, type LessonToolsHost } from '../src/lessons/mcp-tools';
import { BUILTIN_LESSONS, allLessons } from '../src/lessons/catalog';
import { chartSvg, niceStep, radarSvg } from '../src/lessons/assessment/figures';
import { FLIGHT_DATA } from '../src/lessons/assessment/bank';
import { unitText } from '../src/lessons/text';
import type { LessonGrade } from '../src/lessons/types';

const memory = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } };
};

describe('progress and the results file', () => {
  it('keeps the first passing flight and the last one, through storage', () => {
    const store = memory();
    const p = emptyProgress();
    const base = { lessonId: 'orbit-first', criteria: [], answers: {}, hintsShown: 1, mission: BUILTIN_LESSONS[0].mission };
    recordGrade(p, { ...base, at: '1', verdict: 'fail' });
    recordGrade(p, { ...base, at: '2', verdict: 'pass' });
    recordGrade(p, { ...base, at: '3', verdict: 'fail' });
    saveProgress(p, store);
    const back = loadProgress(store);
    expect(back.lessons['orbit-first'].passed).toBe(true);
    expect(back.lessons['orbit-first'].passedRecord?.at).toBe('2');
    expect(back.lessons['orbit-first'].last?.at).toBe('3');
    expect(loadProgress(memory())).toEqual(emptyProgress());
    const broken = memory(); broken.setItem('orbitlab.lessons', '{nope');
    expect(loadProgress(broken)).toEqual(emptyProgress());
  });

  it('keeps the mission as flown: every lesson\'s configuration reads back unchanged (audit 2026-09-27 A11)', () => {
    for (const lesson of BUILTIN_LESSONS.filter((l) => !l.comingSoon)) {
      // the guidance changed, the docking profile, the pad: what a student's edits and the lessons touch
      const cfg = new Simulation(lessonConfig(lesson.mission, (s) => {
        s.guidanceOverrides = { ...s.guidanceOverrides, maxAccel: 21 };
        if (s.rendezvous) s.rendezvous = { ...s.rendezvous, profile: 'twoOrbit' };
      }), { headless: true }).cfg;
      const doc = JSON.parse(JSON.stringify(flownMission(cfg)));
      const parsed = parseMissionDocument(doc, defaultMissionState());
      expect(parsed.issues, lesson.id).toEqual([]);
      expect(missionConfigFromState(parsed.state), lesson.id).toEqual(cfg);
      expect(doc.mission.guidanceOverrides.maxAccel, lesson.id).toBe(21);
    }
    // the payload flown when the mission gives no override: the satellite's own
    const cfg = lessonConfig(BUILTIN_LESSONS[0].mission);
    expect(flownMission({ ...cfg, payloadMassOverride: undefined }).mission.payloadMass).toBeGreaterThan(0);
  });

  it('says whether the progress was kept: a store that throws is reported, not swallowed (audit 2026-09-27 A19)', () => {
    const p = emptyProgress();
    p.lessons['orbit-first'] = { attempts: 1, hintsShown: 0, passed: false };
    const store = memory();
    expect(saveProgress(p, store)).toBe(true);
    expect(loadProgress(store).lessons['orbit-first'].attempts).toBe(1);
    // a private window that refuses storage, or storage that is full
    const refusing: KeyValueStore = { getItem: () => null, setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); } };
    expect(saveProgress(p, refusing)).toBe(false);
    const denied: KeyValueStore = { getItem: () => { throw new DOMException('denied', 'SecurityError'); }, setItem: () => { throw new DOMException('denied', 'SecurityError'); } };
    expect(saveProgress(p, denied)).toBe(false);
    expect(loadProgress(denied)).toEqual(emptyProgress());
  });

  it('writes a results file whose checksum shows an edit', async () => {
    const p = emptyProgress();
    p.lessons['orbit-first'] = { attempts: 2, hintsShown: 0, passed: true };
    const file = await resultsFile(p, new Date('2026-09-25T10:00:00Z'), 'Student A', { percent: 60 });
    expect(file.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(await verifyResults(file)).toBe(true);
    const edited = JSON.parse(JSON.stringify(file));
    edited.progress.lessons['orbit-first'].attempts = 1;
    expect(await verifyResults(edited)).toBe(false);
    expect(file.progress).not.toHaveProperty('customLessons');
  });

  // owner decision D-6: a pass on answers shown is recorded as such, and never as an unaided pass
  it('carries a pass with help in the results file, apart from an unaided pass', async () => {
    const p = emptyProgress();
    const base = { lessonId: 'orbit-first', criteria: [], answers: {}, hintsShown: 0 };
    recordGrade(p, { ...base, at: '1', verdict: 'passedWithHelp', revealed: ['period'] });
    const helped = p.lessons['orbit-first'];
    expect(helped).toMatchObject({ passed: false, passedWithHelp: true });
    expect(helped.passedRecord).toBeUndefined();
    const file = await resultsFile(p, new Date('2026-09-30T10:00:00Z'));
    expect(file.version).toBe(1);
    expect(file.progress.lessons['orbit-first'].last).toMatchObject({ verdict: 'passedWithHelp', revealed: ['period'] });
    expect(await verifyResults(file)).toBe(true);
    // turned into an unaided pass by hand, the file no longer verifies
    const edited = JSON.parse(JSON.stringify(file));
    edited.progress.lessons['orbit-first'].last.verdict = 'pass';
    expect(await verifyResults(edited)).toBe(false);
    // an unaided pass later is the one kept as passed
    recordGrade(p, { ...base, at: '2', verdict: 'pass' });
    expect(p.lessons['orbit-first']).toMatchObject({ passed: true, passedWithHelp: true, passedRecord: { at: '2' } });
  });

  // owner decision D-6: "Clear the answers I have seen" forgets the values shown, and nothing else
  it('clears only the values shown: attempts, hints, answers and what was recorded stay', () => {
    const p = emptyProgress();
    const base = { lessonId: 'orbit-first', criteria: [], answers: { period: 94.6 }, hintsShown: 2 };
    recordGrade(p, { ...base, at: '1', verdict: 'pass' });
    recordGrade(p, { ...base, at: '2', verdict: 'passedWithHelp', revealed: ['period'] });
    const kept = lessonProgress(p, 'orbit-first');
    kept.attempts = 3;
    kept.hintsShown = 2;
    recordRevealed(p, 'orbit-first', { period: 94.6, speed: 7.61 });
    recordRevealed(p, 'orbit-first', { period: 94.6 });
    recordRevealed(p, 'orbit-first', { speed: Number.NaN }); // nothing finite shown: not a reveal
    expect(kept.reveals).toBe(2);
    const before = JSON.parse(JSON.stringify(kept));
    clearRevealed(p, 'orbit-first');
    const { revealed, ...rest } = before;
    expect(revealed).toEqual({ period: [94.6], speed: [7.61] });
    expect(p.lessons['orbit-first']).toEqual(rest);
    // the count of reveals survives clearing, so the teacher can still see the answers were shown
    expect(p.lessons['orbit-first'].reveals).toBe(2);
    // a lesson never opened is not created by clearing it
    clearRevealed(p, 'never-opened');
    expect(p.lessons).not.toHaveProperty('never-opened');
  });
});

// E03: the strip once printed the expected value after a wrong answer, and typing it in then passed
describe('an answer shown to the student', () => {
  const lesson = BUILTIN_LESSONS.find((l) => l.id === 'orbit-first')!;
  // the grade taken when lesson 1.1's flight ended: the orbit reached, the two answers awaited
  const frozen: LessonGrade = { lessonId: 'orbit-first', final: true, verdict: 'open', lockBroken: [], t: 900,
    criteria: [{ id: 'orbit', state: 'pass', value: null }, { id: 'period', state: 'pending', value: null, expected: 94.6 }, { id: 'speed', state: 'pending', value: null, expected: 7.61 }] };

  it('is only marked wrong, and a right answer after a wrong one still passes', () => {
    const wrong = regradeAnswers(lesson, frozen, { period: 90, speed: 7.61 });
    expect(wrong.verdict).toBe('fail');
    expect(wrong.criteria.find((c) => c.id === 'period')).toMatchObject({ state: 'fail', value: 90 });
    expect(wrong.criteria.some((c) => c.revealed)).toBe(false);
    expect(regradeAnswers(lesson, frozen, { period: 94.6, speed: 7.61 }).verdict).toBe('pass');
  });

  // owner decision D-6: it once failed for good, and lesson 1.1, the same flight every time, could never be passed again here
  it('once shown, passes only with help — on this flight and on the same flight flown again — until cleared', () => {
    const p = emptyProgress();
    recordRevealed(p, 'orbit-first', { period: 94.6 });
    const revealed = lessonProgress(p, 'orbit-first').revealed!;
    // the value shown, typed in: passed with help, never an unaided pass, and marked as shown
    const typed = regradeAnswers(lesson, frozen, { period: 94.6, speed: 7.61 }, revealed);
    expect(typed.verdict).toBe('passedWithHelp');
    expect(typed.criteria.find((c) => c.id === 'period')).toMatchObject({ state: 'pass', revealed: true });
    expect(typed.criteria.find((c) => c.id === 'speed')).toMatchObject({ state: 'pass' });
    expect(typed.criteria.find((c) => c.id === 'speed')).not.toHaveProperty('revealed');
    // a wrong answer after the answers were shown still fails
    const wrong = regradeAnswers(lesson, frozen, { period: 90, speed: 7.61 }, revealed);
    expect(wrong.verdict).toBe('fail');
    expect(wrong.criteria.find((c) => c.id === 'period')).toMatchObject({ state: 'fail', revealed: true });
    // shown before anything is typed: the answer is still awaited
    const untyped = regradeAnswers(lesson, frozen, {}, revealed);
    expect(untyped.criteria.find((c) => c.id === 'period')).toMatchObject({ state: 'pending', revealed: true });
    expect(untyped.verdict).toBe('open');
    expect(awaitingAnswers(lesson, untyped)).toEqual(['period', 'speed']);
    // a lock broken, or a criterion failed, is still a fail whatever was shown
    expect(regradeAnswers(lesson, { ...frozen, lockBroken: ['setup.orbit'] }, { period: 94.6, speed: 7.61 }, revealed).verdict).toBe('fail');
    // recorded as passed with help: the lesson is not counted as passed
    recordGrade(p, { lessonId: 'orbit-first', at: '1', verdict: typed.verdict, criteria: typed.criteria, answers: { period: 94.6, speed: 7.61 }, hintsShown: 0, revealed: ['period'] });
    expect(lessonProgress(p, 'orbit-first')).toMatchObject({ passed: false, passedWithHelp: true });
    // cleared: the same flight flown again can pass unaided
    clearRevealed(p, 'orbit-first');
    expect(lessonProgress(p, 'orbit-first').revealed).toBeUndefined();
    const fresh = regradeAnswers(lesson, frozen, { period: 94.6, speed: 7.61 }, lessonProgress(p, 'orbit-first').revealed);
    expect(fresh.verdict).toBe('pass');
    expect(fresh.criteria.some((c) => c.revealed)).toBe(false);
    recordRevealed(p, 'orbit-first', { period: 94.6 });
    // a flight whose answer is another number (a different orbit) can still pass
    const other: LessonGrade = { ...frozen, criteria: frozen.criteria.map((c) => (c.id === 'period' ? { ...c, expected: 101.3 } : c)) };
    expect(regradeAnswers(lesson, other, { period: 101.3, speed: 7.61 }, revealed).verdict).toBe('pass');
    // kept through storage, the number once
    recordRevealed(p, 'orbit-first', { period: 94.6, speed: Number.NaN });
    const store = memory();
    saveProgress(p, store);
    expect(loadProgress(store).lessons['orbit-first'].revealed).toEqual({ period: [94.6] });
  });
});

// E05: the Worksheets tab titled a flight's sheet with whatever lesson was open, a case lesson opened afterwards included
describe('the lesson a flight belongs to', () => {
  it('is the one it was flown in, whatever is open when its sheet is made, and none for a flight flown outside a lesson', () => {
    const owners = new FlightLessons<WsFlight, typeof BUILTIN_LESSONS[number]>();
    const flight = (siteId: string) => ({ cfg: { vehicleId: 'falcon9', siteId, launchTime: new Date('2026-09-15T12:00:00Z') } }) as unknown as WsFlight;
    const inLesson = flight('cape'), outside = flight('baikonur');
    const first = BUILTIN_LESSONS[0], second = BUILTIN_LESSONS[1];
    owners.claim(inLesson, first);
    // opening another lesson later does not take the flight over
    owners.claim(inLesson, second);
    expect(owners.lessonOf(inLesson)).toBe(first);
    expect(owners.lessonOf(outside)).toBeNull();
    expect(owners.lessonOf(null)).toBeNull();
    // the sheet's source, which titles it and seeds the students' numbers, follows
    expect(worksheetSource({ lesson: owners.lessonOf(inLesson) ?? undefined, flight: inLesson })).toBe(`lesson:${first.id}`);
    expect(worksheetSource({ lesson: owners.lessonOf(outside) ?? undefined, flight: outside })).toBe('mission:falcon9:baikonur:2026-09-15T12:00:00.000Z');
  });
});

describe('the lessons over WebMCP', () => {
  const grade: LessonGrade = { lessonId: 'orbit-first', final: true, verdict: 'open', lockBroken: [], t: 900,
    criteria: [{ id: 'orbit', state: 'pass', value: null }, { id: 'period', state: 'pending', value: null, expected: 94.6 }, { id: 'speed', state: 'pending', value: null, expected: 7.61 }] };
  const host = (active: boolean): LessonToolsHost & { started: string[] } => {
    const started: string[] = [];
    return {
      started,
      catalogue: () => allLessons(),
      progress: () => ({ ...emptyProgress(), lessons: { 'orbit-first': { attempts: 3, hintsShown: 1, passed: true } } }),
      startLesson: (id) => { started.push(id); return id === 'nope' ? { ok: false, reason: 'no' } : { ok: true }; },
      activeLesson: () => (active ? { lesson: BUILTIN_LESSONS[0], grade, hintsShown: 1, awaiting: ['period', 'speed'] } : null),
      assessmentResult: () => null,
    };
  };
  const tool = (h: LessonToolsHost, name: string) => createLessonTools(h).find((t) => t.name === name)!;

  it('lists every lesson with the student\'s progress', () => {
    const out = tool(host(false), 'list_lessons').execute({}) as { lessons: Array<{ id: string; passed: boolean; written: boolean; kind: string }> };
    // twenty-one flight lessons and the three case lessons of track 6
    expect(out.lessons).toHaveLength(24);
    expect(out.lessons[0]).toMatchObject({ id: 'orbit-first', kind: 'flight', passed: true, written: true });
    expect(out.lessons.filter((l) => l.written)).toHaveLength(24);
    expect(out.lessons.filter((l) => l.kind === 'case')).toHaveLength(3);
  });

  // it once read "1 orbital mechanics, … 5 failures and safety, 6 basics": one off, so an attitude-control lesson (area 5) read as failures
  it('names the six areas as the lessons number them', () => {
    const description = tool(host(false), 'list_lessons').description;
    expect(description).toContain('(1 space basics, 2 orbital mechanics, 3 rocket performance and the atmosphere, 4 guidance and navigation, 5 attitude control, 6 failures and safety)');
    const areas = (id: string) => BUILTIN_LESSONS.find((l) => l.id === id)!.domains;
    expect(areas('orbit-first')[0]).toBe(2); // orbital mechanics
    expect(areas('ctl-inspector')).toContain(5); // attitude control
    expect(areas('fail-engine-out')[0]).toBe(6); // failures and safety
  });

  it('opens a lesson, and never gives away an answer\'s expected value', () => {
    const h = host(true);
    const started = tool(h, 'start_lesson').execute({ id: 'orbit-first' }) as { ok: boolean; criteria: unknown[] };
    expect(h.started).toEqual(['orbit-first']);
    expect(started.ok).toBe(true);
    const result = JSON.stringify(tool(h, 'get_lesson_result').execute({}));
    expect(result).not.toContain('94.6');
    expect(result).not.toContain('7.61');
    expect(result).toContain('"awaitingAnswers":["period","speed"]');
    expect(tool(host(false), 'get_lesson_result').execute({})).toEqual({ active: false });
    expect(tool(h, 'start_lesson').execute({ id: 'nope' })).toEqual({ ok: false, reason: 'no' });
    expect(() => tool(h, 'start_lesson').execute({})).toThrow();
    expect(tool(h, 'get_assessment_result').execute({})).toEqual({ taken: false });
  });

  // owner decision D-6: the verdict an assistant reads says a pass on answers shown was one with help
  it('reports a pass with help as such, in the grade and in the progress, and still not the value', () => {
    const lesson = BUILTIN_LESSONS[0];
    const p = emptyProgress();
    recordRevealed(p, lesson.id, { period: 94.6 });
    const helped = regradeAnswers(lesson, grade, { period: 94.6, speed: 7.61 }, lessonProgress(p, lesson.id).revealed);
    recordGrade(p, { lessonId: lesson.id, at: '1', verdict: helped.verdict, criteria: helped.criteria, answers: {}, hintsShown: 0, revealed: ['period'] });
    const h: LessonToolsHost = {
      catalogue: () => allLessons(), progress: () => p, startLesson: () => ({ ok: true }),
      activeLesson: () => ({ lesson, grade: helped, hintsShown: 0, awaiting: [] }), assessmentResult: () => null,
    };
    const result = tool(h, 'get_lesson_result').execute({}) as { verdict: string; criteria: Array<{ id: string; state: string; answerShown?: boolean; value?: unknown }> };
    expect(result.verdict).toBe('passedWithHelp');
    expect(result.criteria.find((c) => c.id === 'period')).toMatchObject({ state: 'pass', answerShown: true, value: undefined });
    expect(result.criteria.find((c) => c.id === 'speed')).not.toHaveProperty('answerShown');
    expect(JSON.stringify(result)).not.toContain('94.6');
    expect(tool(h, 'get_lesson_result').description).toContain('passedWithHelp');
    const listed = (tool(h, 'list_lessons').execute({}) as { lessons: Array<{ id: string; passed: boolean; passedWithHelp: boolean }> }).lessons;
    expect(listed.find((l) => l.id === lesson.id)).toMatchObject({ passed: false, passedWithHelp: true });
    expect(listed.find((l) => l.id === BUILTIN_LESSONS[1].id)).toMatchObject({ passed: false, passedWithHelp: false });
  });
});

describe('figures', () => {
  it('steps an axis by 1, 2 or 5 × 10ⁿ', () => {
    expect(niceStep(23)).toBe(5);
    expect(niceStep(540, 6)).toBe(100);
    expect(niceStep(0.9)).toBe(0.2);
  });

  it('draws a recorded flight and its comparison as polylines, the comparison dashed', () => {
    const svg = chartSvg(FLIGHT_DATA, ['f9-leo', 'f9-leo-engine-out'], 'thrust', { xLabel: 't, s', yLabel: 'F, kN', tMax: 200 });
    expect(svg.match(/<polyline/g)).toHaveLength(2);
    expect(svg.match(/stroke-dasharray/g)).toHaveLength(1);
    expect(svg).toContain('F, kN');
  });

  it('draws the radar with one polygon per test on four grid rings', () => {
    const svg = radarSvg(['a', 'b', 'c', 'd', 'e', 'f'], [[10, 20, 30, 40, 50, 60], [60, 50, 40, 30, 20, 10]]);
    expect(svg.match(/class="grid" fill="none"/g)).toHaveLength(4);
    expect(svg).toContain('radar-before');
    expect(svg).toContain('radar-after');
  });
});

it('writes unit symbols in each language', () => {
  expect(unitText('km/s', 'ru')).toBe('км/с');
  expect(unitText('min', 'th')).toBe('นาที');
  expect(unitText('kPa', 'th')).toBe('kPa');
  expect(unitText('°', 'ru')).toBe('°');
});
