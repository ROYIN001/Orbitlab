/**
 * M-LEARNING-012: the event log's line "Target orbit achieved: … period N min"
 * prints the period rounded to the minute (src/physics/sim/burns.ts
 * `reachTargetOrbit`), and that is inside the tolerance of the lessons that
 * ask the student to work the period out — the audit found it in the pack
 * lessons 11.2, 12.2, 13.1 and 13.2. A lesson marks such a number as an
 * `answer` criterion (src/lessons/types.ts), so while a lesson with an answer
 * on the period is open, every event line (the log, the HUD ticker, the
 * narration, the timeline: all through `localizeEventParams`) prints "?" for
 * it, in every language. With no lesson open, or one that does not ask for
 * the period, the line is as it was.
 *
 * Vitest runs in `node` here (no DOM), so the open lesson's wiring in
 * `lesson-mode.ts` is checked in its source, as tests/design-strip-progress.test.ts does.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { t, tFor, type Lang } from '../src/i18n';
import { localizeEventParams, withholdEventParams } from '../src/ui/names';
import { answerEventParams } from '../src/lessons/measures';
import { packFileText, PACK_SOURCES } from '../src/lessons/pack-sources';
import { BUILTIN_LESSONS } from '../src/lessons/catalog';
import { isFlightLesson, type Lesson } from '../src/lessons/types';

/** Every pack's flight lessons, as the app reads them from the pack files. */
const PACK_LESSONS: Lesson[] = Object.keys(PACK_SOURCES).flatMap((id) => packFileText(id).lessons).filter(isFlightLesson);
const lessonNumbered = (track: number, order: number): Lesson => {
  const found = PACK_LESSONS.find((l) => l.track === track && l.order === order);
  if (!found) throw new Error(`no pack lesson ${track}.${order}`);
  return found;
};

/** The params `reachTargetOrbit` puts on `evt.targetOrbit` (a Soyuz to the station's orbit). */
const TARGET = { ap: 421, pe: 418, inc: 51.64, raan: 123.4, period: 93, dv: 140 };
const LANGS: Lang[] = ['en', 'th', 'ru'];
/** The line as an event log in `lang` prints it (`t(e.key, localizeEventParams(…))`, src/ui/telemetry.ts). */
const line = (params: Record<string, string | number>, lang: Lang = 'en'): string => tFor(lang, 'evt.targetOrbit', localizeEventParams(null, params));

afterEach(() => withholdEventParams([]));

describe('the event log does not give away a lesson\'s answer (M-LEARNING-012)', () => {
  it.each([[11, 2], [12, 2], [13, 1], [13, 2]])('lesson %i.%i asks for the period, and while it is open the line prints "?" for it', (track, order) => {
    const lesson = lessonNumbered(track, order);
    expect(lesson.criteria.some((c) => c.kind === 'answer' && c.measure === 'orbit.period')).toBe(true);
    withholdEventParams(answerEventParams(lesson));
    for (const lang of LANGS) {
      const shown = line(TARGET, lang);
      expect(shown, `${lesson.id} in ${lang}`).toBe(tFor(lang, 'evt.targetOrbit', { ...TARGET, period: '?' }));
      expect(shown, `${lesson.id} in ${lang}`).not.toContain('93');
      // what the student is told to read from the line stays: the heights, the plane
      for (const v of ['418', '421', '51.64', '123.4']) expect(shown).toContain(v);
    }
  });

  it('with no lesson open, the line prints the period as before', () => {
    withholdEventParams([]);
    for (const lang of LANGS) {
      expect(line(TARGET, lang)).toBe(tFor(lang, 'evt.targetOrbit', TARGET));
      expect(line(TARGET, lang)).toContain('93');
    }
    // and nothing to change is still no new object (src/ui/names.ts)
    expect(localizeEventParams(null, TARGET)).toBe(TARGET);
  });

  it('a lesson that does not ask for the period leaves the line as it was', () => {
    const forces = lessonNumbered(11, 1);
    expect(forces.criteria.some((c) => c.kind === 'answer' && c.measure === 'orbit.period')).toBe(false);
    withholdEventParams(answerEventParams(forces));
    expect(line(TARGET)).toBe(t('evt.targetOrbit', TARGET));
    const plane = BUILTIN_LESSONS.find((l) => l.id === 'orbit-iss-plane');
    expect(plane && isFlightLesson(plane)).toBe(true);
    withholdEventParams(answerEventParams(plane as Lesson));
    expect(line(TARGET)).toBe(t('evt.targetOrbit', TARGET));
  });

  it('only the period is withheld, and only where an event carries one', () => {
    withholdEventParams(answerEventParams(lessonNumbered(11, 2)));
    expect(answerEventParams(lessonNumbered(11, 2))).toEqual(['period']);
    // the parking orbit's line has no period: unchanged, and no new object
    const parking = { pe: 200, ap: 500, inc: 28.5, dv: 900 };
    expect(localizeEventParams(null, parking)).toBe(parking);
    expect(t('evt.parkingOrbit', localizeEventParams(null, parking))).toBe(t('evt.parkingOrbit', parking));
  });

  it('closing the lesson prints the period again', () => {
    withholdEventParams(answerEventParams(lessonNumbered(13, 1)));
    expect(line(TARGET)).not.toContain('93');
    withholdEventParams([]);
    expect(line(TARGET)).toBe(t('evt.targetOrbit', TARGET));
  });
});

describe('the open lesson tells the event log what to withhold (lesson-mode.ts)', () => {
  const src = Object.values(import.meta.glob('../src/ui/lessons/lesson-mode.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0];
  /** A method's body in lesson-mode.ts, from its signature to the first line closing it at two spaces. */
  const methodBody = (signature: string): string => {
    const at = src.indexOf(`  ${signature}(`);
    expect(at, `lesson-mode.ts has a method ${signature}`).toBeGreaterThan(-1);
    return src.slice(at, src.indexOf('\n  }\n', at));
  };

  it('tellOrbit, called whenever the open lesson changes, sets the withheld params from the flight lesson open, or none', () => {
    const body = methodBody('private tellOrbit');
    expect(body).toMatch(/withholdEventParams\(a && isFlightLesson\(a\.lesson\) \? answerEventParams\(a\.lesson\) : \[\]\)/);
    // before the dedupe that only the Orbit section needs
    expect(body.indexOf('withholdEventParams(')).toBeLessThan(body.indexOf('this.orbitKey'));
    for (const m of ['startLesson', 'private startDesign', 'private startCase', 'exit']) expect(methodBody(m), m).toContain('this.tellOrbit()');
  });
});
