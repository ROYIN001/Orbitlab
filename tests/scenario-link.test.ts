/**
 * T01 (Phase 4 map §4.1): the scenario link, the authoring page's lesson
 * writer, and the reader's warnings for an event no flight emits.
 *
 * Validation, as the map asks and fixed before the first run: the link
 * decodes to the same file; the v1 fixture is still written back byte for
 * byte (tests/case-lessons.test.ts, untouched); a written lesson reads back
 * to itself; and each criterion kind the form writes is evaluated on a
 * constructed flight (the headless loop) with a case that passes and one that
 * fails. The link lengths are measured here and quoted in
 * src/lessons/scenario-link.ts.
 */
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { BUILTIN_LESSONS } from '../src/lessons/catalog';
import { lessonConfig } from '../src/lessons/config';
import { flightEnded, gradeLesson } from '../src/lessons/grader';
import { lessonFileDocument, lessonFileText, parseLessonFile } from '../src/lessons/lesson-file';
import { SCENARIO_LINK_MAX, SCENARIO_PARAM, readScenarioParam, scenarioLink } from '../src/lessons/scenario-link';
import { DEFAULT_LOCKS, draftLesson, emptyText, lessonIdFrom, newDraft, type LessonDraft } from '../src/lessons/authoring';
import { decodeMissionParam, encodeMissionParam } from '../src/config/mission-file';
import { Simulation } from '../src/physics/simulation';
import type { Lesson } from '../src/lessons/types';
import type { MissionState } from '../src/config/mission-file';

const V1 = Object.values(import.meta.glob('./fixtures/lessons/v1.orbitlab-lesson.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0];
const PAGE = 'https://example.github.io/Orbitlab/?m=old#/launch/explore';
const KNOWN_EVENTS = new Set(Object.keys(en).filter((k) => /^evt\.[a-zA-Z]+$/.test(k)));
const lesson = (id: string): Lesson => BUILTIN_LESSONS.find((l) => l.id === id)!;

/** A scenario on lesson 1.1's mission: on target, the apogee to the mission's within 5 km, the period typed, SECO seen. */
function draft(): LessonDraft {
  return {
    ...newDraft('class-first-orbit'),
    title: { en: 'Our first orbit', ru: 'Наша первая орбита', th: 'วงโคจรแรกของเรา' },
    brief: { en: 'Fly Falcon 9 to 500 km and read the period.', ru: 'Выведите Falcon 9 на 500 км и определите период.', th: 'บิน Falcon 9 ไปที่ 500 กม. แล้วอ่านคาบ' },
    hints: [{ en: 'T = 2π√(a³/μ)', ru: 'T = 2π√(a³/μ)', th: 'T = 2π√(a³/μ)' }],
    criteria: [
      { kind: 'outcome', is: 'target' },
      { kind: 'measure', measure: 'orbit.apogee', target: 'mission', tol: 5 },
      { kind: 'answer', measure: 'orbit.period', tol: 0.5, prompt: { en: 'Period (min)', ru: 'Период (мин)', th: 'คาบ (นาที)' } },
      { kind: 'event', key: 'evt.seco', present: true },
    ],
  };
}

describe('the scenario link (T01)', () => {
  it('carries a lesson file and reads back to the same file, and a mission link still works', async () => {
    const lessons = [lesson('orbit-first')];
    const link = await scenarioLink(PAGE, lessons);
    const url = new URL(link.url);
    expect(url.search.startsWith(`?${SCENARIO_PARAM}=z`)).toBe(true);
    expect(url.hash).toBe('');
    expect(url.searchParams.has('m')).toBe(false);
    const back = await readScenarioParam(url.searchParams.get(SCENARIO_PARAM)!);
    expect(back).toEqual(JSON.parse(JSON.stringify(lessonFileDocument(lessons))));
    const parsed = parseLessonFile(back, new Set());
    expect(parsed.issues).toEqual([]);
    expect(lessonFileText(parsed.lessons)).toBe(lessonFileText(lessons));
    // the generalised codec still carries a mission
    expect(await decodeMissionParam(await encodeMissionParam(lessons[0].mission))).toEqual(JSON.parse(JSON.stringify(lessons[0].mission)));
    await expect(readScenarioParam('q123')).rejects.toThrow();
  });

  it('is offered while short enough, and not past it (lengths measured here)', async () => {
    const one = await scenarioLink(PAGE, [lesson('orbit-first')]);
    const written = draftLesson(draft(), lesson('orbit-first').mission, KNOWN_EVENTS).lesson!;
    const authored = await scenarioLink(PAGE, [written]);
    const fixture = await scenarioLink(PAGE, parseLessonFile(JSON.parse(V1), new Set()).lessons);
    const all = await scenarioLink(PAGE, BUILTIN_LESSONS.filter((l) => !l.comingSoon));
    // Measured on the first run (a probe, then written here): lesson 1.1 alone 3 470 characters, the
    // authored lesson (short texts) 1 248, the two-lesson v1 fixture (16 237 bytes pretty-printed)
    // 6 536, every written built-in lesson 52 837. Held within 2 %, a band set AFTER that measurement:
    // another zlib build may deflate a few bytes differently, and the verdicts below are what matters.
    expect([one.length, authored.length, fixture.length, all.length]).toEqual([one.url.length, authored.url.length, fixture.url.length, all.url.length]);
    const measured = [3470, 1248, 6536, 52837];
    [one.length, authored.length, fixture.length, all.length].forEach((n, i) => expect(Math.abs(n / measured[i] - 1), `link ${i}: ${n}`).toBeLessThan(0.02));
    expect([one.fits, authored.fits, fixture.fits, all.fits]).toEqual([true, true, true, false]);
    expect(fixture.length).toBeLessThanOrEqual(SCENARIO_LINK_MAX);
    expect(all.length).toBeGreaterThan(SCENARIO_LINK_MAX);
  });
});

describe('the authoring page\'s writer (T01)', () => {
  it('writes a lesson every copy of the app reads back to itself', () => {
    const { lesson: l, issues } = draftLesson(draft(), lesson('orbit-first').mission, KNOWN_EVENTS);
    expect(issues).toEqual([]);
    expect(l).not.toBeNull();
    expect(l!.id).toBe('class-first-orbit');
    expect(l!.track).toBe(9);
    expect(l!.locked).toEqual([...DEFAULT_LOCKS]);
    expect(l!.criteria.map((c) => c.id)).toEqual(['c1', 'c2', 'c3', 'c4']);
    const text = lessonFileText([l!]);
    expect(JSON.parse(text).version).toBe(1);
    const parsed = parseLessonFile(JSON.parse(text), new Set(), KNOWN_EVENTS);
    expect(parsed.issues).toEqual([]);
    expect(lessonFileText(parsed.lessons)).toBe(text);
  });

  it('warns of an event no flight emits, as a criterion and as the end of the flight', () => {
    const d = { ...draft(), endEvent: 'evt.dockd' };
    d.criteria = [...d.criteria, { kind: 'event', key: 'evt.stageSeparation', present: true }];
    const { lesson: l, issues } = draftLesson(d, lesson('orbit-first').mission, KNOWN_EVENTS);
    expect(l).not.toBeNull();
    expect(issues.map((i) => `${i.level}:${i.code}:${i.detail}`)).toEqual(['warn:event:evt.stageSeparation', 'warn:event:evt.dockd']);
    // …and so does "Open lesson file" when the page passes its events
    const file = JSON.parse(lessonFileText([l!]));
    expect(parseLessonFile(file, new Set(), KNOWN_EVENTS).issues.map((i) => i.detail)).toEqual(['evt.stageSeparation', 'evt.dockd']);
    expect(parseLessonFile(file, new Set()).issues).toEqual([]);
    // the built-in lessons name only events a flight emits
    expect(parseLessonFile(JSON.parse(lessonFileText(BUILTIN_LESSONS)), new Set(), KNOWN_EVENTS).issues).toEqual([]);
  });

  it('writes a text given without English with another language standing in, and says so', () => {
    const d = { ...draft(), title: { en: '', ru: '', th: 'วงโคจรแรกของเรา' }, brief: { ...emptyText(), ru: 'Выведите Falcon 9.' } };
    const { lesson: l, issues } = draftLesson(d, lesson('orbit-first').mission, KNOWN_EVENTS);
    expect(l!.title).toEqual({ en: 'วงโคจรแรกของเรา', th: 'วงโคจรแรกของเรา' });
    expect(issues.map((i) => `${i.where}:${i.code}:${i.detail}`)).toEqual([
      'title:translation:en=th', 'brief:translation:en=ru', 'lesson (class-first-orbit).title:translation:ru', 'lesson (class-first-orbit).brief:translation:th',
    ]);
  });

  it('refuses what the reader refuses, and says why', () => {
    const noTitle = draftLesson({ ...draft(), title: emptyText() }, lesson('orbit-first').mission);
    expect(noTitle.lesson).toBeNull();
    expect(noTitle.issues.some((i) => i.level === 'error' && i.detail === 'en')).toBe(true);
    const noArea = draftLesson({ ...draft(), domains: [] }, lesson('orbit-first').mission);
    expect(noArea.lesson).toBeNull();
    const noTol = draftLesson({ ...draft(), criteria: [{ kind: 'answer', measure: 'orbit.period', prompt: { en: 'T', ru: 'T', th: 'T' } }] }, lesson('orbit-first').mission);
    expect(noTol.issues.map((i) => `${i.code}:${i.detail}`)).toContain('missing:tol');
    expect(noTol.lesson).toBeNull();
    expect(draftLesson({ ...draft(), criteria: [] }, lesson('orbit-first').mission).lesson).toBeNull();
    expect(lessonIdFrom('Our first orbit!')).toBe('class-our-first-orbit');
    expect(lessonIdFrom('วงโคจรแรก')).toBe('class-lesson');
  });

  it('refuses a built-in lesson\'s id, a range no flight can meet and a negative tolerance, which the reader would take', () => {
    const m = lesson('orbit-first').mission;
    const refusals = (d: LessonDraft) => {
      const r = draftLesson(d, m, KNOWN_EVENTS);
      return { written: r.lesson !== null, errors: r.issues.filter((i) => i.level === 'error').map((i) => `${i.where}:${i.code}:${i.detail}`) };
    };
    // a built-in id: every catalogue leaves the teacher's lesson out, and its link or "Try it now" opens lesson 1.1
    expect(refusals({ ...draft(), id: 'orbit-first' })).toEqual({ written: false, errors: ['id:builtinId:orbit-first'] });
    expect(refusals({ ...draft(), id: ' case-theos2 ' }).errors).toEqual(['id:builtinId:case-theos2']);
    expect(refusals({ ...draft(), criteria: [{ kind: 'measure', measure: 'orbit.apogee', min: 600, max: 400 }] })).toEqual({ written: false, errors: ['criteria[0]:invalid:range'] });
    expect(refusals({ ...draft(), criteria: [{ kind: 'measure', measure: 'orbit.apogee', min: 500, max: 500 }] }).written).toBe(true);
    expect(refusals({ ...draft(), criteria: [{ kind: 'measure', measure: 'orbit.apogee', target: 'mission', tol: -5 }] }).errors).toEqual(['criteria[0]:invalid:negative']);
    expect(refusals({ ...draft(), criteria: [{ kind: 'answer', measure: 'orbit.period', tolPct: -1, prompt: { en: 'T', ru: 'T', th: 'T' } }] }).errors).toEqual(['criteria[0]:invalid:negative']);
    // the reader itself still takes such a file (another tool may have written it): only the writer refuses
    const raw = JSON.parse(lessonFileText([{ ...draftLesson(draft(), m).lesson!, criteria: [{ id: 'c1', kind: 'measure', measure: 'orbit.apogee', min: 600, max: 400 }] }]));
    expect(parseLessonFile(raw, new Set()).lessons).toHaveLength(1);
  });

  it('grades each kind of criterion it writes: a flight that passes it and one that fails it', () => {
    const written = draftLesson(draft(), lesson('orbit-first').mission, KNOWN_EVENTS).lesson!;
    const fly = (l: Lesson, edit?: (s: MissionState) => void) => {
      const sim = new Simulation(lessonConfig(l.mission, edit), { headless: true });
      while (!flightEnded(l, sim) && sim.state.t < 20_000) sim.step(sim.suggestedDt());
      return sim;
    };
    const good = fly(written);
    const period = gradeLesson(written, good).criteria.find((c) => c.id === 'c3')!.expected!;
    const pass = gradeLesson(written, good, { c3: period + 0.3 });
    expect(pass.criteria.map((c) => c.state)).toEqual(['pass', 'pass', 'pass', 'pass']);
    expect(pass.verdict).toBe('pass');
    // the answer: outside its 0.5 min
    expect(gradeLesson(written, good, { c3: period + 0.7 }).criteria[2].state).toBe('fail');
    // the outcome and the apogee: 20 t is too heavy for the 500 km orbit (340 km apogee; the payload lock is broken too)
    const heavy = gradeLesson(written, fly(written, (s) => { s.payloadMass = 20_000; }), { c3: period });
    expect(heavy.criteria.slice(0, 2).map((c) => c.state)).toEqual(['fail', 'fail']);
    expect(heavy.lockBroken).toEqual(['setup.payloadMass']);
    // the measure alone: a 5 km band an apogee 20 km higher misses
    const band = draftLesson({ ...draft(), criteria: [{ kind: 'measure', measure: 'orbit.apogee', target: 480, tol: 5 }] }, lesson('orbit-first').mission).lesson!;
    expect(gradeLesson(band, good).criteria[0].state).toBe('fail');
    const wide = draftLesson({ ...draft(), criteria: [{ kind: 'measure', measure: 'orbit.apogee', min: 480, max: 520 }] }, lesson('orbit-first').mission).lesson!;
    expect(gradeLesson(wide, good).criteria[0].state).toBe('pass');
    // the event: SECO happens; a docking does not
    const docked = draftLesson({ ...draft(), criteria: [{ kind: 'event', key: 'evt.docked', present: true }] }, lesson('orbit-first').mission).lesson!;
    expect(gradeLesson(docked, good).criteria[0].state).toBe('fail');
    const noDock = draftLesson({ ...draft(), criteria: [{ kind: 'event', key: 'evt.docked', present: false }] }, lesson('orbit-first').mission).lesson!;
    expect(gradeLesson(noDock, good).criteria[0].state).toBe('pass');
  }, 120_000);
});
