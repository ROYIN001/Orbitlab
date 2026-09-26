/** A lesson's text in the interface language (roadmap E03), English where it has none. */
import { getLang, type Lang } from '../i18n';
import type { LocalText } from './types';

export function localText(text: LocalText | undefined, lang: Lang = getLang()): string {
  if (!text) return '';
  return (lang === 'en' ? text.en : text[lang]) ?? text.en;
}

/** Unit symbols as each language prints them (ru after ГОСТ 8.417, th as the setup panel writes them). */
const UNITS: Readonly<Record<string, Partial<Record<Lang, string>>>> = {
  'km': { ru: 'км', th: 'กม.' },
  'km/s': { ru: 'км/с', th: 'กม./วินาที' },
  'm/s': { ru: 'м/с', th: 'ม./วินาที' },
  'm/s²': { ru: 'м/с²', th: 'ม./วินาที²' },
  'min': { ru: 'мин', th: 'นาที' },
  's': { ru: 'с', th: 'วินาที' },
  'kg': { ru: 'кг', th: 'กก.' },
  'kPa': { ru: 'кПа' },
  'dB': { ru: 'дБ' },
  't': { ru: 'т', th: 'ตัน' },
  'kN': { ru: 'кН' },
  'rad/s': { ru: 'рад/с' },
  'm': { ru: 'м', th: 'ม.' },
  'h': { ru: 'ч', th: 'ชม.' },
};

export function unitText(unit: string, lang: Lang = getLang()): string {
  return UNITS[unit]?.[lang] ?? unit;
}
