/**
 * The satellite builder's numbers and sentences on screen (roadmap D06;
 * Phase 4 map §2.7, track B): src/design/satellite-model.ts gives every
 * figure in SI with its unit and every sentence as a key and its values;
 * this says them in the reader's language, with each number beside its unit
 * (a budget table never splits the two across a line), and draws a list of
 * sentences with their level — "will not work", "warning", "note" look
 * different, and never by colour alone (the rocket builder's bd-say styles,
 * src/ui/build/design-text.ts). Shared by the Explore level's satellite
 * designer and the Engineer level's satellite bench.
 */
import { t } from '../../i18n';
import { RAD } from '../../physics/constants';
import type { Fig, FieldUnit, SatLevel, SatText, SatValue } from '../../design/satellite-model';
import { el, hhmm, num, sci } from '../orbit/dom';
import { unbroken } from './figures';

/** A distance, m, in m or km with the decimals its size needs. */
function distance(v: number): string {
  const a = Math.abs(v);
  if (a >= 1000) return `${num(v / 1000, a >= 100e3 ? 0 : a >= 10e3 ? 1 : 2)} ${t('u.km')}`;
  return `${num(v, a >= 100 ? 0 : a >= 10 ? 1 : 2)} ${t('u.m')}`;
}

/** A data rate, bit/s, in the unit its size reads best in. */
function rate(v: number): string {
  if (v >= 1e9) return `${num(v / 1e9, 2)} ${t('build.sat.u.Gbps')}`;
  if (v >= 1e6) return `${num(v / 1e6, v >= 1e8 ? 0 : 1)} ${t('build.sat.u.Mbps')}`;
  if (v >= 1e3) return `${num(v / 1e3, 1)} ${t('build.sat.u.kbps')}`;
  return `${num(v, v >= 10 ? 0 : 1)} ${t('build.sat.u.bps')}`;
}

/** A small or a large quantity: a plain number, or × 10ⁿ where it would need many zeros. */
const flexible = (v: number, d = 2): string => (v !== 0 && (Math.abs(v) < 0.01 || Math.abs(v) >= 1e6) ? sci(v, d) : num(v, Math.abs(v) < 1 ? 3 : d));

/**
 * The decimals a C_D·A/m (m²/kg) is shown with: four, and below 0.001 as
 * many more as keep three figures — a dense satellite's 0.00004 m²/kg read
 * as "0.0000" would sit under the 0.0001 it is held to and look equal to it.
 */
export const ballisticDigits = (v: number): number => (v > 0 && v < 1e-3 ? Math.min(10, 2 - Math.floor(Math.log10(v))) : 4);

/** A figure in its unit, as the app shows it; `digits` overrides the decimals where the unit's default is not right. */
export function sayFig(f: Fig, digits?: number): string {
  const v = f.value;
  if (!Number.isFinite(v)) return '—';
  const n = (d: number): string => num(v, digits ?? d);
  let s: string;
  switch (f.unit) {
    case 's': s = `${num(v / 60, digits ?? 1)} ${t('u.min')}`; break;
    case 'm': s = distance(v); break;
    case 'rad': s = `${num(v * RAD, digits ?? 1)}°`; break;
    case 'h': s = hhmm(v); break;
    case 'fraction': s = `${num(v * 100, digits ?? 1)} %`; break;
    case 'count': s = n(4); break;
    case 'ratio': s = `${n(1)} ×`; break;
    case 'per-year': s = n(0); break;
    case 'per-day': s = n(2); break;
    case 'W': s = `${n(Math.abs(v) < 10 ? 2 : Math.abs(v) < 100 ? 1 : 0)} ${t('build.sat.u.W')}`; break;
    case 'J': s = `${num(v / 3600, digits ?? (v / 3600 < 10 ? 1 : 0))} ${t('build.sat.u.Wh')}`; break;
    case 'W/m2': s = `${n(0)} ${t('build.sat.u.Wm2')}`; break;
    case 'm2': s = `${n(Math.abs(v) < 1 ? 3 : Math.abs(v) < 10 ? 2 : 1)} ${t('build.eng.u.m2')}`; break;
    case 'kg': s = `${n(Math.abs(v) < 100 ? 1 : 0)} ${t('u.kg')}`; break;
    case 'm2/kg': s = `${n(ballisticDigits(Math.abs(v)))} ${t('u.m2kg')}`; break;
    case 'kg/m3': s = `${v === 0 ? '0' : sci(v, 2)} ${t('build.sat.u.kgm3')}`; break;
    case 'm/s': s = `${n(1)} ${t('u.ms')}`; break;
    case 'm/s/yr': s = `${n(2)} ${t('build.sat.u.msYear')}`; break;
    case 'N·m': s = `${v === 0 ? '0' : sci(v, 2)} ${t('build.sat.u.Nm')}`; break;
    case 'N·m·s': s = `${flexible(v)} ${t('build.sat.u.Nms')}`; break;
    case 'A·m2': s = `${flexible(v)} ${t('build.sat.u.Am2')}`; break;
    case 'T': s = `${num(v * 1e6, digits ?? 1)} ${t('build.sat.u.uT')}`; break;
    case 'dB': s = `${n(1)} ${t('build.sat.u.dB')}`; break;
    case 'dBi': s = `${n(1)} ${t('build.sat.u.dBi')}`; break;
    case 'dBW': s = `${n(1)} ${t('build.sat.u.dBW')}`; break;
    case 'dBW/Hz': s = `${n(1)} ${t('build.sat.u.dBWHz')}`; break;
    case 'dB-Hz': s = `${n(1)} ${t('build.sat.u.dBHz')}`; break;
    case 'bit/s': s = rate(v); break;
    case 'bit': s = v >= 1e9 ? `${num(v / 1e9, 1)} ${t('build.sat.u.Gbit')}` : `${num(v / 1e6, 1)} ${t('build.sat.u.Mbit')}`; break;
  }
  // a number never leaves its unit on a line of its own
  return unbroken(s);
}

/** The unit a number box shows its value in, beside the box (the model's `SHOWN` scales it). */
export function fieldUnitText(u: FieldUnit): string {
  switch (u) {
    case 'km': return t('u.km');
    // the degree sign, as the Orbit section's boxes write it ('u.deg' is kept for the HUD's own wiring, tests/i18n.test.ts RESERVED)
    case 'deg': return '°';
    case 'h': return t('build.sat.u.h');
    case 'years': return t('build.sat.u.years');
    case 'kg': return t('u.kg');
    case 'm': return t('u.m');
    case 'm2': return t('build.eng.u.m2');
    case 'W': return t('build.sat.u.W');
    case 'Wh': return t('build.sat.u.Wh');
    case 'percent': return '%';
    case 'N': return t('u.N');
    case 's': return t('u.s');
    case 'ms': return t('u.ms');
    case 'kgm2': return t('build.sat.u.kgm2');
    case 'Nms': return t('build.sat.u.Nms');
    case 'Am2': return t('build.sat.u.Am2');
    case 'GHz': return t('build.sat.u.GHz');
    case 'dB': return t('build.sat.u.dB');
    case 'Mbps': return t('build.sat.u.Mbps');
    case 'K': return t('build.sat.u.K');
    case 'um': return t('build.sat.u.um');
    case 'bits': return t('build.sat.u.bits');
    case 'count': case 'plain': return '';
  }
}

const sayValue = (v: SatValue): string => (typeof v === 'string' ? v : 'key' in v ? t(v.key) : sayFig(v));

/** The sentence alone, its numbers filled in. */
export function saySat(s: SatText): string {
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(s.values)) values[k] = sayValue(v);
  return t(s.key, values);
}

const LEVEL_KEY: Record<SatLevel, string> = { fail: 'build.sat.level.fail', warn: 'build.sat.level.warn', note: 'build.sat.level.note' };
const LEVEL_GLYPH: Record<SatLevel, string> = { fail: '✕', warn: '!', note: '≈' };

/** One sentence: its level as a word and a mark, the sentence, and a technical detail if any (the rocket builder's look). */
export function satTextItem(s: SatText): HTMLLIElement {
  const li = el('li', `bd-say bd-say-${s.level}`);
  const tag = el('span', 'bd-say-tag');
  const glyph = el('span', 'bd-say-glyph', LEVEL_GLYPH[s.level]);
  glyph.setAttribute('aria-hidden', 'true');
  tag.append(glyph, ` ${t(LEVEL_KEY[s.level])}`);
  li.append(tag, el('span', 'bd-say-body', saySat(s)));
  if (s.detail) {
    const more = el('details', 'bd-say-detail');
    more.append(el('summary', undefined, t('build.ex.detail')));
    const code = el('code', undefined, s.detail);
    code.lang = 'en';
    more.append(code);
    li.append(more);
  }
  return li;
}

export function satTextList(items: readonly SatText[]): HTMLUListElement {
  const ul = el('ul', 'bd-say-list');
  ul.append(...items.map(satTextItem));
  return ul;
}

/** A table of figures: each row a label and its value (with its unit), as a definition list that keeps each pair together. */
export function figureTable(rows: readonly (readonly [string, string, string?])[]): HTMLDListElement {
  const dl = el('dl', 'bsat-dl');
  for (const [label, value, note] of rows) {
    const row = el('div', 'bsat-row');
    const dt = el('dt', undefined, label);
    if (note) dt.append(' ', el('em', 'bs-est', note));
    // each figure keeps its number and unit on one line; a pair ("520 km × 540 km", "35 min (37 %)") may part between its figures
    const dd = el('dd');
    for (const part of value.split(/( × | \/ | \()/)) {
      if (/^( × | \/ | \()$/.test(part)) dd.append(part);
      else if (part) dd.append(el('span', 'bsat-nw', part));
    }
    row.append(dt, dd);
    dl.append(row);
  }
  return dl;
}
