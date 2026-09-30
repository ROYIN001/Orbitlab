/**
 * Shared by the Build section's text tests: a sentence given as a key and its
 * numbers (src/design/warning-text.ts's `DesignText`) can be said in every
 * language — the key is in en, ru and th, and the values fill its
 * placeholders, no more and no fewer.
 */
import { expect } from 'vitest';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';
import type { DesignText } from '../src/design/warning-text';

export const DICTS = { en, ru, th } as Record<string, Record<string, string>>;
export const placeholders = (s: string): string[] => [...new Set((s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).map((m) => m.slice(1, -1)))].sort();

/** The key exists in every dictionary. */
export function expectKey(key: string): void {
  for (const [lang, dict] of Object.entries(DICTS)) expect(dict[key], `${lang} ${key}`).toBeTypeOf('string');
}

export function expectSayable(text: DesignText): void {
  for (const [lang, dict] of Object.entries(DICTS)) {
    expect(dict[text.key], `${lang} ${text.key}`).toBeTypeOf('string');
    expect(placeholders(dict[text.key]), `${lang} ${text.key}`).toEqual(Object.keys(text.values).sort());
  }
  for (const v of Object.values(text.values)) {
    if (typeof v === 'object' && 'key' in v) expectKey(v.key);
    if (typeof v === 'object' && 'value' in v) expect(Number.isFinite(v.value), JSON.stringify(v)).toBe(true);
  }
}
