import { describe, expect, it } from 'vitest';
import { PROFILE_TEXT, profileText, type ProfileTextKey } from '../src/ui/profiles/text';

describe('learner profile messages', () => {
  it('localizes every destructive scope and preserves substitution fields in all languages', () => {
    const keys = Object.keys(PROFILE_TEXT.en) as ProfileTextKey[];
    for (const lang of ['th', 'ru'] as const) {
      expect(Object.keys(PROFILE_TEXT[lang]).sort()).toEqual([...keys].sort());
      for (const key of keys) {
        const placeholders = (value: string) => [...value.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
        expect(PROFILE_TEXT[lang][key].trim(), `${lang}: ${key}`).not.toBe('');
        expect(placeholders(PROFILE_TEXT[lang][key]), `${lang}: ${key}`).toEqual(placeholders(PROFILE_TEXT.en[key]));
      }
    }
  });
  it('keeps the selected learner identifiable in confirmation and export messages', () => {
    for (const lang of ['en', 'th', 'ru'] as const) {
      for (const key of ['entry', 'active', 'switchTitle', 'createTitle', 'deleteTitle', 'resetTitle'] as const) {
        const message = profileText(key, { name: 'สมชาย {team} <A>' }, lang);
        expect(message).toContain('สมชาย {team} <A>');
        expect(message).not.toContain('{name}');
      }
      expect(profileText('mediaSource', { name: 'Learner {count}', count: 3 }, lang)).toContain('Learner {count}');
    }
  });
});
