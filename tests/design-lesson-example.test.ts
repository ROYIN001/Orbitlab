/**
 * The example design lesson shipped as a file with the app (roadmap T01, map
 * §4.1): public/lessons/napa2-power.orbitlab-lesson.json, opened from the
 * lessons page like any teacher's file — it is not a built-in lesson. Held to
 * the built-in lessons' rules (every text in English, Russian and Thai, a
 * debrief and hints), read through the same reader every copy of the app
 * uses, and graded on the design it starts from (fails) and on one with more
 * cells (passes). Exact constructions, fixed before the first run.
 */
import { describe, expect, it } from 'vitest';
import exampleText from '../public/lessons/napa2-power.orbitlab-lesson.json?raw';
import { withValue } from '../src/design/satellite-model';
import { designLessonStart, designValuesNow } from '../src/design/design-lesson-key';
import { lifetimeNow } from '../src/orbit/lifetime-now';
import { brokenDesignLocks, designLessonOptions, gradeDesign } from '../src/lessons/design-lesson';
import { lessonFileText, parseLessonFile } from '../src/lessons/lesson-file';
import { BUILTIN_LESSONS } from '../src/lessons/catalog';
import { isDesignLesson, type DesignKey, type DesignLesson } from '../src/lessons/types';
import type { SatelliteDesign } from '../src/design/satellite-spec';

const at = (d: SatelliteDesign, path: string, v: number): SatelliteDesign => withValue(d, path, v);

function keyFor(l: DesignLesson, design: SatelliteDesign): DesignKey {
  return { ...designValuesNow(design, designLessonOptions(l), lifetimeNow), lockBroken: brokenDesignLocks(l.locked, designLessonStart(l.start), design) };
}

describe('the example design lesson file (T01)', () => {
  it('reads the example lesson shipped with the app: NAPA-2 to a 10 % power margin, in three languages', () => {
    const parsed = parseLessonFile(JSON.parse(exampleText), new Set());
    expect(parsed.issues).toEqual([]);
    expect(JSON.parse(exampleText).version).toBe(3);
    const l = parsed.lessons[0];
    expect(isDesignLesson(l)).toBe(true);
    if (!isDesignLesson(l)) return;
    expect(lessonFileText(parsed.lessons)).toBe(exampleText);
    // a file, not a built-in lesson
    expect(BUILTIN_LESSONS.some((b) => b.id === l.id)).toBe(false);
    // every text in all three scripts (the built-in lessons' rule, tests/lessons.test.ts)
    const texts = [l.title, l.brief, l.debrief!, ...l.hints, ...l.criteria.flatMap((c) => (c.kind === 'answer' ? [c.prompt] : []))];
    for (const x of texts) {
      expect(x.ru ?? '').toMatch(/\p{Script=Cyrillic}/u);
      expect(x.th ?? '').toMatch(/\p{Script=Thai}/u);
    }
    expect(l.hints).toHaveLength(3);
    // NAPA-2 as it flew fails it (+6.8 %); the same with more cells, nothing locked moved, passes
    const start = designLessonStart(l.start);
    const eclipse = keyFor(l, start).values['sat.eclipseMax']!;
    const answers = { [l.criteria.find((c) => c.kind === 'answer')!.id]: eclipse };
    expect(gradeDesign(l, keyFor(l, start), answers).verdict).toBe('fail');
    const better = at(start, 'power.arrayArea', 0.08);
    expect(gradeDesign(l, keyFor(l, better), answers).verdict).toBe('pass');
    // lowering the loads instead breaks a lock
    expect(gradeDesign(l, keyFor(l, at(start, 'power.payloadW', 2)), answers).lockBroken).toEqual(['power.payloadW']);
  }, 60_000);
});
