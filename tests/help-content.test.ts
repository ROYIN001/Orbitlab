import { describe, expect, it } from 'vitest';
import { HELP_COPY } from '../src/ui/help-content';
import { GUIDE_STEPS } from '../src/ui/help-state';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';

/** Compare nested help sections as well as the flat button labels. */
function strings(value: unknown, path = ''): Record<string, string> {
  if (typeof value === 'string') return { [path]: value };
  if (value === null || typeof value !== 'object') return {};
  return Object.assign({}, ...Object.entries(value).map(([key, child]) => strings(child, `${path}.${key}`))) as Record<string, string>;
}

const placeholders = (text: string): string[] => (text.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();

describe('localized Help content', () => {
  const english = strings(HELP_COPY.en);
  for (const [lang, script] of [['ru', /\p{Script=Cyrillic}/u], ['th', /\p{Script=Thai}/u]] as const) {
    it(`${lang} covers every help section, preserves substitutions and is translated`, () => {
      const translated = strings(HELP_COPY[lang]);
      expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
      for (const [path, text] of Object.entries(translated)) {
        expect(text.trim(), path).not.toBe('');
        expect(placeholders(text), path).toEqual(placeholders(english[path]));
        expect(script.test(text), `${lang}${path}`).toBe(true);
      }
    });
  }

  it('has exactly the steps the first-use controls can navigate in every language', () => {
    for (const copy of Object.values(HELP_COPY)) {
      expect(copy.steps).toHaveLength(GUIDE_STEPS);
      expect(placeholders(copy.progress)).toEqual(['{step}']);
    }
  });

  it('points the ISS mission to Flight to the station, by its label in each language', () => {
    for (const [lang, dict] of [['en', en], ['ru', ru], ['th', th]] as const) {
      expect(Object.values(strings(HELP_COPY[lang])).join('\n'), lang).toContain(dict['setup.rendezvous']);
    }
  });
});
