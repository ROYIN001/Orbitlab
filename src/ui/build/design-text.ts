/**
 * The builder's warnings, refusals and estimates on screen (roadmap D02,
 * D03): src/design/warning-text.ts gives each a key and its numbers; this
 * says them in the reader's language, with the numbers in the units the rest
 * of the app shows, and draws a list of them with their level — "will not
 * fly" and "warning" look different, and an estimate is marked as one. Shared
 * by the Explore level and, later, the Engineer level.
 */
import { t } from '../../i18n';
import { G0 } from '../../physics/constants';
import type { DesignText, TextLevel, TextNumber, TextSubject, TextValue } from '../../design/warning-text';
import { el, num } from '../orbit/dom';
import { mass } from './figures';

/** A number in its unit, as the app shows it. */
export function sayNumber(n: TextNumber): string {
  const v = n.value;
  switch (n.unit) {
    case 'tw': return num(v, 2);
    case 'accel': return `${num(v, 1)} ${t('build.u.ms2')}`;
    case 'g': return num(v / G0, 1);
    case 'speed': return `${num(v)} ${t('u.ms')}`;
    case 'percent': return `${num(v * 100, 1)} %`;
    case 'm': return `${num(v, v % 1 ? 2 : 0)} ${t('u.m')}`;
    case 'kN': return `${num(v / 1000)} ${t('u.kN')}`;
    case 'mass': return mass(v);
    case 'kPa': return `${num(v / 1000)} ${t('u.kPa')}`;
    case 'km': return `${num(v / 1000)} ${t('u.km')}`;
    case 'count': return num(v);
  }
}

const sayValue = (v: TextValue): string => (typeof v === 'string' ? v : 'key' in v ? t(v.key) : sayNumber(v));

/** What a sentence is about, as its lead: "Stage 2", "Strap-on group 1", "Fairing". */
export function saySubject(s: TextSubject): string {
  if (s.kind === 'stage') return t('build.say.stage', { n: s.n });
  if (s.kind === 'strapOns') return t('build.say.strapOns', { n: s.n });
  return t('build.say.fairing');
}

/** The sentence alone, its numbers filled in. */
export function sayText(d: DesignText): string {
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(d.values)) values[k] = sayValue(v);
  return t(d.key, values);
}

const LEVEL_KEY: Record<TextLevel, string> = { fail: 'build.ex.level.fail', warn: 'build.ex.level.warn', note: 'build.ex.level.note', default: 'build.ex.level.default' };
const LEVEL_GLYPH: Record<TextLevel, string> = { fail: '✕', warn: '!', note: '≈', default: '=' };

/** One item: its level as a word and a mark (never colour alone), what it is about, the sentence, and a technical detail if any. */
export function designTextItem(d: DesignText): HTMLLIElement {
  const li = el('li', `bd-say bd-say-${d.level}`);
  const tag = el('span', 'bd-say-tag');
  const glyph = el('span', 'bd-say-glyph', LEVEL_GLYPH[d.level]);
  glyph.setAttribute('aria-hidden', 'true');
  tag.append(glyph, ` ${t(LEVEL_KEY[d.level])}`);
  const body = el('span', 'bd-say-body');
  if (d.subject) body.append(el('strong', undefined, `${saySubject(d.subject)}: `));
  body.append(sayText(d));
  li.append(tag, body);
  if (d.detail) {
    const more = el('details', 'bd-say-detail');
    more.append(el('summary', undefined, t('build.ex.detail')));
    const code = el('code', undefined, d.detail);
    code.lang = 'en';
    more.append(code);
    li.append(more);
  }
  return li;
}

export function designTextList(items: readonly DesignText[]): HTMLUListElement {
  const ul = el('ul', 'bd-say-list');
  ul.append(...items.map(designTextItem));
  return ul;
}
