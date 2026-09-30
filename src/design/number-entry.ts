/**
 * Numbers the reader types into the Build section's boxes (roadmap D02–D05:
 * a stretch, a payload, a structural ratio, an Isp), read and shown the way
 * the reader writes them.
 *
 * WHY NOT `<input type="number">`. A Russian reader writes 0,08; Chromium's
 * number box silently drops the comma and hands over 008 — a structural
 * ratio of 8, a payload 100 times too heavy — and a phone's Russian decimal
 * keyboard offers the comma first. The boxes are text boxes with a decimal
 * keyboard (`inputmode="decimal"`, as the lessons' answer boxes are), and
 * this module does what the browser did not: it reads a comma or a point as
 * the decimal mark, spaces as thousands, any minus sign, and refuses
 * everything else (NaN, which the model then refuses by name, as it refuses
 * an empty box). An English or Thai "11,400" is eleven thousand four hundred
 * — a comma in the thousands' places is a grouping there — while a Russian
 * "11,400" is eleven and four tenths, as a Russian means it.
 *
 * A value goes back into a box without grouping (the reader edits it) and
 * with the reader's decimal mark: 0,0592 in Russian, 0.0592 in English and
 * Thai, as the figures around it are written (`num`, `toLocaleString`).
 *
 * DOM-free; tests/design-number-entry.test.ts.
 */

export type EntryLang = 'en' | 'ru' | 'th';

/** The decimal mark a reader of `lang` writes: the one `toLocaleString` uses for the language. */
export const decimalMark = (lang: EntryLang): '.' | ',' => (lang === 'ru' ? ',' : '.');

/** every space a number may be grouped with: space, no-break, narrow no-break, thin, figure */
const SPACES = /[\s    ]/g;
/** a plain decimal, possibly signed, possibly in scientific notation; never hex, never two marks */
const PLAIN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
/** thousands grouped by commas: 11,400 or 1,234,567.5 */
const COMMA_GROUPED = /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d*)?$/;

/** What `raw`, typed by a reader of `lang`, says; NaN when it is not one number. */
export function parseTyped(raw: string, lang: EntryLang): number {
  let s = raw.replace(SPACES, '').replace(/[−‒–—]/g, '-');
  if (!s) return Number.NaN;
  if (lang !== 'ru' && COMMA_GROUPED.test(s)) s = s.replace(/,/g, '');
  else if (!s.includes('.')) s = s.replace(',', '.');
  return PLAIN.test(s) ? Number(s) : Number.NaN;
}

/** `v` as it goes into a box for a reader of `lang`: at most six decimals, no trailing zeros, no grouping. */
export function typedText(v: number, lang: EntryLang): string {
  if (!Number.isFinite(v)) return '';
  const s = String(+v.toFixed(6));
  return decimalMark(lang) === ',' ? s.replace('.', ',') : s;
}

/**
 * The value the arrow keys give: `v` moved by `dir` steps of `step`, kept
 * within [min, max], and rounded to the step's own decimals so that 0.1 + 0.2
 * shows as 0.3. A box that holds no number starts from `min`.
 */
export function stepTyped(v: number, dir: 1 | -1, o: { min: number; max: number; step: number }): number {
  const start = Number.isFinite(v) ? v : o.min;
  const decimals = Math.max(0, -Math.floor(Math.log10(o.step) + 1e-9));
  const next = +(start + dir * o.step).toFixed(Math.min(decimals + 2, 12));
  return Math.min(o.max, Math.max(o.min, next));
}
