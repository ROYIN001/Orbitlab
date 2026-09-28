/**
 * Numbers typed into the Build section's boxes (src/design/number-entry.ts):
 * a comma or a point as the decimal mark, spaces as thousands, the reader's
 * grouping read as the reader means it, junk refused. The cases are fixed
 * from how each language writes numbers, before the first run.
 */
import { describe, expect, it } from 'vitest';
import { decimalMark, parseTyped, stepTyped, typedText, type EntryLang } from '../src/design/number-entry';

const LANGS: readonly EntryLang[] = ['en', 'ru', 'th'];

describe('parseTyped', () => {
  it('reads a decimal comma as a decimal mark in every language (Chromium\'s number box read 0,08 as 008)', () => {
    for (const l of LANGS) {
      expect(parseTyped('0,08', l)).toBe(0.08);
      expect(parseTyped('0.08', l)).toBe(0.08);
      expect(parseTyped('1,5', l)).toBe(1.5);
      expect(parseTyped('421', l)).toBe(421);
    }
  });

  it('reads spaces of every kind as thousands, and any minus sign', () => {
    for (const l of LANGS) {
      expect(parseTyped('11 400', l)).toBe(11400);
      expect(parseTyped('11 400', l)).toBe(11400);
      expect(parseTyped('11 400', l)).toBe(11400);
      expect(parseTyped(' 5000 ', l)).toBe(5000);
      expect(parseTyped('−5', l)).toBe(-5);
      expect(parseTyped('-0,5', l)).toBe(-0.5);
    }
  });

  it('reads "11,400" as the reader means it: thousands in English and Thai, a decimal in Russian', () => {
    expect(parseTyped('11,400', 'en')).toBe(11400);
    expect(parseTyped('11,400', 'th')).toBe(11400);
    expect(parseTyped('1,234,567.5', 'en')).toBe(1234567.5);
    expect(parseTyped('11,400', 'ru')).toBe(11.4);
  });

  it('takes what is half typed as the number it is so far', () => {
    for (const l of LANGS) {
      expect(parseTyped('5.', l)).toBe(5);
      expect(parseTyped('0,', l)).toBe(0);
      expect(parseTyped('1e3', l)).toBe(1000);
    }
  });

  it('refuses what is not one number (NaN), never guessing', () => {
    for (const l of LANGS) {
      for (const bad of ['', '   ', 'abc', '0x10', '.', ',', '1,2,3', '1.234,5', '12kg', '--5', 'Infinity']) {
        expect(parseTyped(bad, l), `${l} "${bad}"`).toBeNaN();
      }
    }
    // a Russian number with both marks is ambiguous
    expect(parseTyped('1,234.5', 'ru')).toBeNaN();
  });
});

describe('typedText', () => {
  it('writes the reader\'s decimal mark, as toLocaleString does for the language, with no grouping', () => {
    for (const l of LANGS) {
      expect(decimalMark(l)).toBe((1.5).toLocaleString(l).charAt(1));
    }
    expect(typedText(0.0592, 'ru')).toBe('0,0592');
    expect(typedText(0.0592, 'en')).toBe('0.0592');
    expect(typedText(0.0592, 'th')).toBe('0.0592');
    expect(typedText(11400, 'ru')).toBe('11400');
    expect(typedText(12123.4567891, 'en')).toBe('12123.456789');
    expect(typedText(Number.NaN, 'en')).toBe('');
  });

  it('reads back what it writes, in every language', () => {
    for (const l of LANGS) {
      for (const v of [0, 0.0592, 1.8, 421, 11400, 59000, 12123.5, -3.25]) expect(parseTyped(typedText(v, l), l)).toBe(v);
    }
  });
});

describe('stepTyped', () => {
  const o = { min: 0.02, max: 0.5, step: 0.005 };
  it('moves by one step, kept within the limits and on the step\'s decimals', () => {
    expect(stepTyped(0.08, 1, o)).toBe(0.085);
    expect(stepTyped(0.08, -1, o)).toBe(0.075);
    expect(stepTyped(0.5, 1, o)).toBe(0.5);
    expect(stepTyped(0.02, -1, o)).toBe(0.02);
    expect(stepTyped(0.2, 1, { min: 0, max: 1, step: 0.1 })).toBe(0.3);
    expect(stepTyped(5000, 1, { min: 0, max: 1e6, step: 1 })).toBe(5001);
  });
  it('starts an empty box from its least value', () => {
    expect(stepTyped(Number.NaN, 1, o)).toBe(0.025);
  });
});
