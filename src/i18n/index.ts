import { en } from './en';
import { ru } from './ru';
import { th } from './th';

export type Lang = 'en' | 'ru' | 'th';
const DICTS: Record<Lang, Record<string, string>> = { en, ru, th };
let current: Lang = 'en';
const listeners: Array<(l: Lang) => void> = [];

export function getLang(): Lang {
  return current;
}
export function setLang(l: Lang): void {
  current = l;
  try { localStorage.setItem('orbitlab.lang', l); } catch { /* ignore */ }
  document.documentElement.lang = l;
  for (const fn of listeners) fn(l);
}
export function onLangChange(fn: (l: Lang) => void): void {
  listeners.push(fn);
}
export function initLang(): void {
  let l: Lang = 'en';
  try {
    const stored = localStorage.getItem('orbitlab.lang') as Lang | null;
    if (stored && DICTS[stored]) l = stored;
    else {
      const nav = (navigator.language || 'en').slice(0, 2);
      if (nav === 'ru' || nav === 'th') l = nav;
    }
  } catch { /* ignore */ }
  current = l;
  document.documentElement.lang = l;
}

/** Translate a key with {param} substitution; falls back to English, then the key. */
export function t(key: string, params?: Record<string, string | number>): string {
  return tFor(current, key, params);
}

/** Translate frozen/exported content without changing the UI's language. */
export function tFor(lang: Lang, key: string, params?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

/** CLDR's plural categories, in the order a counted word lists its forms (`tCount`). */
const PLURAL_ORDER: readonly Intl.LDMLPluralRule[] = ['zero', 'one', 'two', 'few', 'many', 'other'];

/**
 * A count and the word it counts, in the reader's language (Phase 4 stage
 * 3b, task I2: the satellite builder's pages said "1 days" and "1 years").
 *
 * The smallest plural the dictionaries can hold as they are — one line per
 * key, the same keys in every language, `{param}` placeholders alike: the
 * key's value lists the word's forms separated by "|", one for each plural
 * category the language has, in CLDR's order (zero, one, two, few, many,
 * other). English "day|days" (one, other); Russian "день|дня|дней|дня"
 * (one, few, many, other: 1 день, 2 дня, 5 дней, 1,5 дня); Thai "วัน"
 * alone, since Thai has no plural. The form is the one `Intl.PluralRules`
 * gives the count as it is shown, with `digits` decimals ("1.0 years" is
 * plural in English, as CLDR has it); the count is written as the pages
 * write a number (`toLocaleString` with those decimals) and kept on its
 * word's line by a no-break space. The forms are the nominative's, so a
 * sentence puts the count where Russian takes that case (after a colon,
 * or "через", "за", "на" with a masculine word). A value with fewer forms
 * than the language has categories gives its last form for the rest.
 */
export function tCount(key: string, count: number, digits = 0): string {
  return tCountFor(current, key, count, digits);
}

/** `tCount` in a given language. */
export function tCountFor(lang: Lang, key: string, count: number, digits = 0): string {
  const forms = (DICTS[lang][key] ?? en[key] ?? key).split('|');
  const shown = { minimumFractionDigits: digits, maximumFractionDigits: digits };
  let at = forms.length - 1;
  try {
    const rules = new Intl.PluralRules(lang, shown);
    const categories = PLURAL_ORDER.filter((c) => rules.resolvedOptions().pluralCategories.includes(c));
    const i = categories.indexOf(rules.select(count));
    if (i >= 0) at = Math.min(i, forms.length - 1);
  } catch { /* no plural rules here: the last form, the general one */ }
  let number: string;
  try { number = count.toLocaleString(lang, shown); } catch { number = count.toFixed(digits); }
  return `${number}\u00a0${forms[at]}`;
}

/** Apply translations to all elements carrying data-i18n attributes. */
export function applyStatic(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n!);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle!);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel!));
  });
}
