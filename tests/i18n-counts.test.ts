/**
 * A count and its word (Phase 4 stage 3b, task I2, item 5): the satellite
 * builder's pages said "1 days" and "1 years". `tCount` (src/i18n/index.ts)
 * picks the word's plural form for the count as shown, through
 * `Intl.PluralRules`, from a value that lists the forms in CLDR's order.
 *
 * CRITERIA, fixed before the first run (exact strings: grammar, not a
 * measurement):
 * - English one|other: 1 day, 0 days, 2 days, and "1.0 days" when one
 *   decimal is shown (CLDR: a visible fraction is plural);
 * - Russian one|few|many|other: 1 день, 2 дня, 5 дней, 11 дней, 21 день,
 *   22 дня, 0 дней, and 1,5 дня (a fraction takes "other", the genitive
 *   singular);
 * - Thai has one form: 1 วัน, 5 วัน;
 * - the number and its word are held together by a no-break space;
 * - every word key (`*.n.*` under build.sat, build.req and lesson.check)
 *   lists as many forms as its language has categories (2, 4, 1), none empty;
 * - no English value under build.sat, build.req or lesson.check puts a
 *   count straight before "days", "years", "orbits", "results" or "steps"
 *   any more: each takes the count with its word (`tCount`) — ADDED AFTER
 *   THE FIRST RUN: "{cycle}" is excluded, a repeat cycle's name ("the 15/1
 *   orbit"), not a count, which the first run caught in three keys;
 * - the sentences changed, filled with a count of 1, say it in the singular
 *   in English and in the nominative singular in Russian.
 */
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';
import { setLang, t, tCount, tCountFor } from '../src/i18n';

const NBSP = ' ';
const say = (s: string): string => s.split(NBSP).join(' ');

function withLang<T>(lang: 'en' | 'ru' | 'th', fn: () => T): T {
  const g = globalThis as { document?: unknown };
  if (!g.document) g.document = { documentElement: {} };
  setLang(lang);
  try { return fn(); } finally { setLang('en'); }
}

describe('a count and its word (I2, item 5)', () => {
  it('says English counts in the singular for one, and in the plural otherwise', () => {
    expect(say(tCountFor('en', 'build.req.n.days', 1))).toBe('1 day');
    expect(say(tCountFor('en', 'build.req.n.days', 0))).toBe('0 days');
    expect(say(tCountFor('en', 'build.req.n.days', 2))).toBe('2 days');
    expect(say(tCountFor('en', 'build.req.n.days', 1, 1))).toBe('1.0 days');
    expect(say(tCountFor('en', 'build.sat.n.years', 2.5, 1))).toBe('2.5 years');
    expect(say(tCountFor('en', 'build.req.n.orbits', 1234))).toBe('1,234 orbits');
    expect(tCountFor('en', 'build.req.n.days', 1)).toBe(`1${NBSP}day`);
  });

  it('gives Russian its three forms and the fraction\'s', () => {
    const d = (n: number, digits = 0): string => say(tCountFor('ru', 'build.req.n.days', n, digits));
    expect([1, 2, 5, 11, 21, 22, 0].map((n) => d(n))).toEqual(['1 день', '2 дня', '5 дней', '11 дней', '21 день', '22 дня', '0 дней']);
    expect(d(1.5, 1)).toBe('1,5 дня');
    expect(say(tCountFor('ru', 'build.sat.n.years', 1))).toBe('1 год');
    expect(say(tCountFor('ru', 'build.sat.n.years', 3))).toBe('3 года');
    expect(say(tCountFor('ru', 'build.sat.n.years', 26))).toBe('26 лет');
    expect(say(tCountFor('ru', 'lesson.check.n.results', 1))).toBe('1 результат');
    expect(say(tCountFor('ru', 'lesson.check.n.steps', 38636))).toBe('38 636 шагов');
  });

  it('gives Thai its one form', () => {
    expect(say(tCountFor('th', 'build.req.n.days', 1))).toBe('1 วัน');
    expect(say(tCountFor('th', 'build.req.n.days', 5))).toBe('5 วัน');
  });

  it('follows the interface language', () => {
    expect(withLang('ru', () => say(tCount('build.req.n.orbits', 2)))).toBe('2 орбиты');
    expect(withLang('en', () => say(tCount('build.req.n.orbits', 1)))).toBe('1 orbit');
  });

  it('lists as many forms as each language has categories', () => {
    const words = Object.keys(en).filter((k) => /^(build\.sat|build\.req|lesson\.check)\.n\.[a-zA-Z]+$/.test(k));
    expect(words.sort()).toEqual(['build.req.n.days', 'build.req.n.orbits', 'build.sat.n.years', 'lesson.check.n.results', 'lesson.check.n.steps']);
    for (const [name, dict, n] of [['en', en, 2], ['ru', ru, 4], ['th', th, 1]] as const) {
      expect(new Intl.PluralRules(name).resolvedOptions().pluralCategories.length, name).toBe(n);
      for (const k of words) {
        const forms = dict[k].split('|');
        expect(forms.length, `${name} ${k}`).toBe(n);
        for (const f of forms) expect(f.trim() === f && f !== '' && !/[{}]/.test(f), `${name} ${k}: "${f}"`).toBe(true);
      }
    }
  });

  it('leaves no count straight before its own noun on these pages', () => {
    const bare = Object.entries(en)
      .filter(([k]) => /^(build\.sat|build\.req|lesson\.check)\./.test(k))
      // "{cycle}" names a repeat cycle ("the 15/1 orbit"); it is not a count
      .filter(([, v]) => /\{(?!cycle\})[a-zA-Z]+\} (days?|years?|orbits?|results?|steps?)\b/.test(v))
      .map(([k]) => k);
    expect(bare).toEqual([]);
  });

  it('says one of each in the singular, in the sentences of the three pages', () => {
    const one = (lang: 'en' | 'ru' | 'th'): string[] => withLang(lang, () => [
      t('build.req.life.lasts', { years: tCount('build.sat.n.years', 1) }),
      t('build.req.f.maxDaysHint', { n: tCount('build.req.n.days', 1) }),
      // ADDED BY THE REVIEW: one cycle length is said as one (it read "repeat cycles of 1 to 1 day")
      t('build.req.costOne', { rows: tCount('build.req.n.orbits', 1), days: tCount('build.req.n.days', 1), table: '1' }),
      t('build.req.table.summary', { rows: tCount('build.req.n.orbits', 1), meet: '1', date: '2026-10-01', level: '' }),
      t('build.req.chart.downFound', { years: tCount('build.sat.n.years', 1), h: '500 km' }),
      t('lesson.check.summary', { total: tCount('lesson.check.n.results', 1), match: 1, borderline: 0, differs: 0, cannot: 0 }),
      t('lesson.check.flownTo', { t: '3 237.8', steps: tCount('lesson.check.n.steps', 1) }),
    ].map(say));
    const english = one('en');
    expect(english).toEqual([
      'lasts 1 year',
      'Empty: the longest wait asked, rounded up (1 day).',
      '1 orbit to try (a repeat cycle of 1 day). The table takes about 1 s on a laptop.',
      '1 orbit; meeting every requirement: 1. Worked out for 2026-10-01, solar activity: .',
      'It comes down within 1 year from below about 500 km.',
      '1 result checked — match: 1, borderline: 0, differ: 0, cannot be flown again: 0.',
      'Flown again to T+3 237.8 s in 1 step.',
    ]);
    const russian = one('ru');
    expect(russian[0]).toBe('продержится 1 год');
    expect(russian[1]).toContain('(1 день)');
    expect(russian[2]).toContain('Для перебора: 1 орбита (цикл повторения 1 день)');
    expect(russian[3]).toContain('Всего 1 орбита,');
    expect(russian[4]).toContain('не позже чем через 1 год');
    expect(russian[5]).toContain('Проверено: 1 результат.');
    expect(russian[6]).toBe('Повторён до T+3 237.8 с за 1 шаг расчёта.');
    for (const s of [...english, ...russian, ...one('th')]) expect(s).not.toMatch(/\{[a-zA-Z]+\}/);
  });
});
