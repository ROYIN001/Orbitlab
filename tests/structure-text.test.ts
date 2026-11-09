/**
 * The Structure section's own text (src/ui/structure/text.ts) held to the
 * dictionaries' rules (tests/i18n.test.ts): the same keys in Thai, English
 * and Russian, no empty or padded value, the same {placeholders}, Arabic
 * numerals in Thai, Thai and Russian text that is not English left as it
 * was; and every key the section's code names exists.
 */
import { describe, expect, it } from 'vitest';
import { STRUCTURE_TEXT } from '../src/ui/structure/text';

const SRC = import.meta.glob(['../src/ui/structure/*.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const [th, en, ru] = [STRUCTURE_TEXT.th, STRUCTURE_TEXT.en, STRUCTURE_TEXT.ru];
const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('the Structure section\'s text', () => {
  it('has the same keys in all three languages', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(th).sort());
    expect(Object.keys(ru).sort()).toEqual(Object.keys(th).sort());
  });

  it('has no empty, padded or double-spaced value, and the same placeholders everywhere', () => {
    for (const [lang, dict] of Object.entries({ th, en, ru })) {
      for (const [k, v] of Object.entries(dict)) {
        expect(v.trim(), `${lang}: ${k}`).toBe(v);
        expect(v.length, `${lang}: ${k}`).toBeGreaterThan(0);
        expect(v.includes('  '), `${lang}: ${k}`).toBe(false);
        expect(placeholders(v), `${lang}: ${k}`).toEqual(placeholders(th[k]));
      }
    }
  });

  /** Names kept as they are in every language: the models', and the sections they hand on to. */
  const NAMES = new Set(['model.soyuz-st31', 'model.edusat', 'go.where.orbit', 'go.where.launch']);

  it('writes Thai with Arabic numerals, and translates what is English', () => {
    for (const [k, v] of Object.entries(th)) expect(/[๐-๙]/.test(v), k).toBe(false);
    for (const [k, v] of Object.entries(en)) {
      if (NAMES.has(k) || !/[a-z]{3,}/.test(v)) continue;
      expect(/[฀-๿]/.test(th[k]), `th: ${k}`).toBe(true);
      expect(/[Ѐ-ӿ]/.test(ru[k]), `ru: ${k}`).toBe(true);
    }
  });

  it('has every key the section\'s code asks for by name', () => {
    const named = new Set<string>();
    for (const text of Object.values(SRC)) for (const m of text.matchAll(/\btx\('([\w.-]+)'/g)) named.add(m[1]);
    for (const k of named) expect(th[k], k).toBeDefined();
  });
});
