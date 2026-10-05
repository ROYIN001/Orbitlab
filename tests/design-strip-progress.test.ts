/**
 * M-LEARNING-001 (review P28): while a design lesson's lifetime check runs,
 * its progress ticks (~100 per check, `propagate.ts`) must not build the
 * strip again — a rebuild replaces the answer field the learner is typing
 * in, so its focus and caret are lost.
 *
 * Vitest runs in `node` here (vite.config.ts, no jsdom/happy-dom installed),
 * so the strip's decision is unit-tested through the pure functions
 * `lesson-mode.ts` calls (src/ui/lessons/strip-progress.ts), and the one line
 * of wiring — the progress callback — is checked in the source.
 */
import { describe, expect, it } from 'vitest';
import { checkingKeyPart, stripRebuilds } from '../src/ui/lessons/strip-progress';

/** The design strip's key as `paintDesign` builds it, with only the running check varying. */
const stripKey = (progress: number, record = false): string =>
  JSON.stringify(['en', 'd01', false, true, checkingKeyPart({ record, progress }), null, false, null, null, null, 0, {}, false, true, false]);

/** Progress ticks as the lifetime run reports them: 0.01, 0.02, …, 1. */
const TICKS = Array.from({ length: 100 }, (_, i) => (i + 1) / 100);

describe('design strip during a check (M-LEARNING-001)', () => {
  it('a progress tick is not something the strip key holds', () => {
    const first = checkingKeyPart({ record: true, progress: 0 });
    for (const p of TICKS) expect(checkingKeyPart({ record: true, progress: p })).toEqual(first);
    // whether the check hands in still shows (the strip says so), and no check is not a check
    expect(checkingKeyPart({ record: false, progress: 0 })).not.toEqual(first);
    expect(checkingKeyPart(null)).toBeNull();
  });

  it('ticks build the strip again zero times, with the learner typing or not', () => {
    for (const typing of [true, false]) {
      // the strip as the check starts: built once, answer field focused, value typed
      let lastKey = stripKey(0);
      const strip = { input: { value: '1.25', focused: typing } };
      const builtAtStart = strip.input;
      let rebuilds = 0;
      for (const p of TICKS) {
        const key = stripKey(p);
        if (stripRebuilds(lastKey, key, typing)) {
          rebuilds++;
          lastKey = key;
          strip.input = { value: '', focused: false }; // replaceChildren: a new field
        }
      }
      expect(rebuilds).toBe(0);
      expect(strip.input).toBe(builtAtStart);
      expect(strip.input.value).toBe('1.25');
      expect(strip.input.focused).toBe(typing);
    }
  });

  it('the typing guard holds over a changed key once a strip is built, not before', () => {
    expect(stripRebuilds('a', 'a', false)).toBe(false);
    expect(stripRebuilds('a', 'b', false)).toBe(true);
    expect(stripRebuilds('a', 'b', true)).toBe(false);
    expect(stripRebuilds('', 'b', true)).toBe(true);
  });

  it('the progress callback neither forgets the strip key nor builds the strip', () => {
    const src = Object.values(import.meta.glob('../src/ui/lessons/lesson-mode.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0];
    const call = /designLessonKey\(lesson, snapshot, job\.controller\.signal, \((\w+)\) => \{([^}]*)\}\)/.exec(src);
    expect(call, 'the design check passes a progress callback').not.toBeNull();
    const body = call![2];
    expect(body).not.toMatch(/lastStripKey\s*=/);
    expect(body).not.toMatch(/paintStrip\(/);
  });
});
