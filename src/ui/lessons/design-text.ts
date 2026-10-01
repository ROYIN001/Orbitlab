/**
 * A design lesson's measures in the reader's language (roadmap T01): each
 * measure's name, its unit as the app writes it, and a value with its unit,
 * for the lesson strip, the writer and the check page. The keys are literals
 * (tests/i18n.test.ts finds each one).
 */
import { getLang, t } from '../../i18n';
import { DESIGN_MEASURES } from '../../lessons/design-lesson';
import type { DesignMeasureId } from '../../lessons/types';

export const DESIGN_MEASURE_KEY: Readonly<Record<DesignMeasureId, string>> = {
  'sat.mass': 'lesson.design.measure.sat.mass',
  'sat.eclipseMax': 'lesson.design.measure.sat.eclipseMax',
  'sat.powerMargin': 'lesson.design.measure.sat.powerMargin',
  'sat.batteryDod': 'lesson.design.measure.sat.batteryDod',
  'sat.dvMargin': 'lesson.design.measure.sat.dvMargin',
  'sat.linkMargin': 'lesson.design.measure.sat.linkMargin',
  'sat.dataPerDay': 'lesson.design.measure.sat.dataPerDay',
  'sat.gsd': 'lesson.design.measure.sat.gsd',
  'sat.swath': 'lesson.design.measure.sat.swath',
  'sat.revisitMax': 'lesson.design.measure.sat.revisitMax',
  'sat.lifetime': 'lesson.design.measure.sat.lifetime',
  'sat.wheelMargin': 'lesson.design.measure.sat.wheelMargin',
  'sat.disposal25y': 'lesson.design.measure.sat.disposal25y',
  'sat.torquerDipole': 'lesson.design.measure.sat.torquerDipole',
};

export const designMeasureName = (m: DesignMeasureId): string => t(DESIGN_MEASURE_KEY[m]);

/** A design measure's unit as the app writes it in each language; '' for a ratio or a yes/no. */
export function designUnitText(m: DesignMeasureId): string {
  switch (DESIGN_MEASURES[m].unit) {
    case 'kg': return t('u.kg');
    case 'min': return t('u.min');
    case '%': return '%';
    case 'm/s': return t('u.ms');
    case 'dB': return t('build.sat.u.dB');
    case 'Gbit': return t('lesson.design.u.gbitDay');
    case 'm': return t('u.m');
    case 'km': return t('u.km');
    case 'd': return t('lesson.design.u.days');
    case 'yr': return t('build.sat.u.years');
    case 'A·m²': return t('build.sat.u.Am2');
    default: return '';
  }
}

/** A number in the reader's own decimal sign. */
export const designNumber = (v: number, digits: number): string =>
  v.toLocaleString(getLang(), { maximumFractionDigits: digits, minimumFractionDigits: 0, useGrouping: false });

/**
 * A design measure's value with its unit, a no-break space between (a number
 * never leaves its unit on a line of its own): "6.8 %", "35.14 min"; a ratio
 * as "12.9 ×"; the 25-year rule as yes or no; a figure that does not apply as
 * "—"; a lifetime the run did not see the end of as "more than …".
 */
export function designValueText(m: DesignMeasureId, v: number | null | undefined, opts: { capped?: boolean; digits?: number } = {}): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  if (m === 'sat.disposal25y') return t(v >= 0.5 ? 'lesson.design.yes' : 'lesson.design.no');
  const digits = opts.digits ?? DESIGN_MEASURES[m].digits;
  const text = m === 'sat.wheelMargin' ? `${designNumber(v, digits)} ×` : `${designNumber(v, digits)} ${designUnitText(m)}`.replace(/ $/, '');
  return opts.capped ? t('lesson.design.moreThan', { value: text }) : text;
}
