/**
 * A flight lesson's numbers on its strip, in the reader's decimal sign
 * (task W, Phase 4's last check). A Russian teacher's scenario showed its
 * criterion as "35786.0 ± 10 км" beside a design lesson's "6,8 %": the
 * flight strip wrote its bounds and values with `toFixed` and JavaScript's
 * own number text, the design strip (T01, design-text.ts) in the reader's
 * locale. Both now write "35786,0" in Russian and "35786.0" in English and
 * Thai, with no thousands grouping, as the strip always has, and a no-break
 * space between a value and its unit. The grader's numbers are untouched:
 * this only says them.
 */
import { getLang } from '../../i18n';
import { MEASURES } from '../../lessons/measures';
import type { MeasureId } from '../../lessons/types';
import { unitText } from '../../lessons/text';

/** A number in the reader's decimal sign, no grouping: with `digits`, to exactly that many decimals; without, as written. */
export const decimal = (v: number, digits?: number): string => v.toLocaleString(getLang(), digits === undefined
  ? { maximumFractionDigits: 10, useGrouping: false }
  : { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false });

/**
 * What follows a number for its unit: the degree sign right after it, as the
 * app writes an angle everywhere else ("97.52°"; ГОСТ 8.417 and the SI
 * brochure put no space before °), any other unit after a no-break space
 * ("35786,0 км"), and nothing for a measure with no unit.
 */
export const unitAfter = (unit: string): string => (!unit ? '' : unit === '°' ? '°' : ` ${unitText(unit)}`);

/** A flight measure's value with its unit, to the measure's own decimals (as `formatMeasure` gives it, in the reader's decimal sign). */
export function measureText(measure: MeasureId, value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const def = MEASURES[measure];
  return `${decimal(value, def.digits)}${unitAfter(def.unit)}`;
}
