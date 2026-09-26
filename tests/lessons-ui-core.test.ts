/**
 * The DOM-free parts behind the lessons' pages (roadmap E03): the results file
 * and its checksum, the progress kept in storage, the WebMCP tools, the
 * charts and the radar as SVG text, and unit symbols in each language.
 */
import { describe, expect, it } from 'vitest';
import { emptyProgress, loadProgress, recordGrade, resultsFile, saveProgress, verifyResults, type KeyValueStore } from '../src/lessons/progress';
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
    const out = tool(host(false), 'list_lessons').execute({}) as { lessons: Array<{ id: string; passed: boolean; written: boolean }> };
    expect(out.lessons).toHaveLength(21);
    expect(out.lessons[0]).toMatchObject({ id: 'orbit-first', passed: true, written: true });
    expect(out.lessons.filter((l) => l.written)).toHaveLength(21);
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
