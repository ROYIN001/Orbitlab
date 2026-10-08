/**
 * Thai guidance and navigation terms (ED-I18N-1, M-LEARNING-029). Decided as
 * D5 in the 2026-09-28 plan and listed in docs/DECISIONS.md: guidance =
 * การนำวิถี, navigation = การนำร่อง, and "การนำทาง" is not used in the
 * engineering sense (it is left for moving around menus and pages, which no
 * Thai string currently says). Before this test the app said guidance in
 * three ways (การนำวิถี, การนำทาง, นำร่อง), navigation in two, and called the
 * attitude autopilot นำร่อง as well.
 *
 * Two checks:
 * - the rejected words, as raw text, in every source file under src/, the
 *   lesson files under public/lessons/ and index.html. The one compound kept
 *   is ดาวเทียมนำทาง, the established Thai name of a navigation (GNSS)
 *   satellite, which is the satellite's name and not the vehicle's
 *   navigation; "ดาวเทียมนำร่อง" would read as a pilot-project satellite.
 * - the concept, against the English it translates: นำร่อง only where the
 *   English says navigation, and นำวิถี never where it says navigation and
 *   not guidance. It reads the dictionaries key by key and every {en, th}
 *   pair of the lessons, the placement-test bank, the help and result copy,
 *   the profile copy and the shipped lesson packs.
 */
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { th } from '../src/i18n/th';
import { BUILTIN_CASE_LESSONS, BUILTIN_LESSONS, TRACKS } from '../src/lessons/catalog';
import { BUILTIN_QUESTIONS } from '../src/lessons/assessment/bank';
import { HELP_COPY } from '../src/ui/help-content';
import { RESULT_COPY } from '../src/ui/result-content';
import { PROFILE_TEXT } from '../src/ui/profiles/text';

const SRC = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const LESSON_FILES = import.meta.glob('../public/lessons/**/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const HTML = import.meta.glob('../index.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const NAVIGATION = 'นำร่อง';
const GUIDANCE = 'นำวิถี';
/** The established name of a GNSS satellite; see the header. */
const KEPT = 'ดาวเทียมนำทาง';
/** Rejected words: "นำทาง" for guidance or navigation, and the navigation word for the autopilot. */
const DENIED: readonly string[] = ['นำทาง', 'นำร่องอัตโนมัติ'];

const excerpt = (text: string, at: number): string => text.slice(Math.max(0, at - 24), at + 32).replace(/\s+/g, ' ');

interface Pair { where: string; en: string; th: string }

/** Every {en, th} text below `node`, and the strings of a {en: {…}, th: {…}} copy, path by path. */
function pairs(node: unknown, where: string, out: Pair[], seen = new WeakSet<object>()): Pair[] {
  if (!node || typeof node !== 'object' || seen.has(node)) return out;
  seen.add(node);
  const o = node as Record<string, unknown>;
  if (typeof o.en === 'string' && typeof o.th === 'string') out.push({ where, en: o.en, th: o.th });
  else if (o.en && o.th && typeof o.en === 'object' && typeof o.th === 'object') parallel(o.en, o.th, where, out);
  for (const [key, value] of Object.entries(o)) if (key !== 'en' && key !== 'th' && key !== 'ru') pairs(value, `${where}.${key}`, out, seen);
  return out;
}

function parallel(a: unknown, b: unknown, where: string, out: Pair[]): void {
  if (typeof a === 'string' && typeof b === 'string') out.push({ where, en: a, th: b });
  else if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const key of Object.keys(a)) parallel((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${where}.${key}`, out);
  }
}

function allPairs(): Pair[] {
  const out: Pair[] = Object.keys(en).map((key) => ({ where: `th.ts ${key}`, en: en[key], th: th[key] ?? '' }));
  pairs(BUILTIN_LESSONS, 'lessons', out);
  pairs(BUILTIN_CASE_LESSONS, 'case lessons', out);
  pairs(TRACKS, 'tracks', out);
  pairs(BUILTIN_QUESTIONS, 'bank', out);
  pairs(HELP_COPY, 'help', out);
  pairs(RESULT_COPY, 'result', out);
  pairs(PROFILE_TEXT, 'profiles', out);
  for (const [path, text] of Object.entries(LESSON_FILES)) pairs(JSON.parse(text), path.replace('../public/', ''), out);
  return out;
}

describe('Thai guidance and navigation terms (D5)', () => {
  it('reads the sources and the lesson files it is meant to scan', () => {
    expect(Object.keys(SRC).some((p) => p.endsWith('/src/i18n/th.ts'))).toBe(true);
    expect(Object.keys(LESSON_FILES).some((p) => p.includes('/lessons/packs/'))).toBe(true);
    const found = allPairs();
    for (const source of ['th.ts ', 'lessons.', 'tracks.', 'bank.', 'help.', 'result.', 'profiles.', 'lessons/packs/']) {
      expect(found.some((p) => p.where.startsWith(source)), source).toBe(true);
    }
  });

  it('uses no rejected word anywhere in the Thai text', () => {
    const hits: string[] = [];
    for (const [path, text] of Object.entries({ ...SRC, ...LESSON_FILES, ...HTML })) {
      text.split('\n').forEach((line, i) => {
        const kept = line.replaceAll(KEPT, '');
        for (const term of DENIED) {
          for (let at = kept.indexOf(term); at >= 0; at = kept.indexOf(term, at + term.length)) {
            hits.push(`${path.replace('../', '')}:${i + 1} «${term}»: …${excerpt(kept, at)}…`);
          }
        }
      });
    }
    expect(hits).toEqual([]);
  });

  it('says นำร่อง only for navigation, and นำวิถี never for navigation alone', () => {
    const wrong: string[] = [];
    for (const { where, en: english, th: thai } of allPairs()) {
      if (thai.includes(NAVIGATION) && !/navigat/i.test(english)) wrong.push(`${where}: «${NAVIGATION}» for "${english.slice(0, 80)}"`);
      if (thai.includes(GUIDANCE) && /navigat/i.test(english) && !/guid/i.test(english)) wrong.push(`${where}: «${GUIDANCE}» for "${english.slice(0, 80)}"`);
    }
    expect(wrong).toEqual([]);
  });

  it('quotes the ascent-guidance setup labels exactly in lesson 2.2\'s hint', () => {
    const peg = BUILTIN_LESSONS.find((l) => l.id === 'guid-peg');
    const hint = peg?.hints?.[0]?.th ?? '';
    expect(hint).toContain(th['setup.explicit.title'].replace(/ \(G01\)$/, ''));
    expect(hint).toContain(th['setup.explicit.law']);
  });
});
