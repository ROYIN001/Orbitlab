/** A lesson's text in the interface language (roadmap E03), English where it has none. */
import { getLang, type Lang } from '../i18n';
import type { LocalText } from './types';

export function localText(text: LocalText | undefined, lang: Lang = getLang()): string {
  if (!text) return '';
  return (lang === 'en' ? text.en : text[lang]) ?? text.en;
}
