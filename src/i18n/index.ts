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
  let s = DICTS[current][key] ?? en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
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
