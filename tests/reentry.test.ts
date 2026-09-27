/**
 * An uncontrolled re-entry predicted from an element set (roadmap M03),
 * against the four Long March 5B core stages: each predicted from its first
 * element set, a tumbling cylinder of GCAT's size and mass, C_D 2.2, the Sun
 * as measured, against its re-entry as GCAT records it. The tolerance — the
 * re-entry inside the ±20 % window the prediction gives, the agencies'
 * convention — was fixed before the comparison.
 */
import { describe, expect, it } from 'vitest';
import { CZ5B_STAGES } from '../src/data/cz5b';
import { WINDOW_FRACTION, predictReentry, tumblingCylinderArea } from '../src/orbit/reentry';
import { elementsFromRecord } from '../src/orbit/omm';
import { ECSS_LEVELS, measuredActivity } from '../src/physics/propagator/activity';

const jdOf = (iso: string): number => Date.parse(iso) / 86400000 + 2440587.5;
const measured = measuredActivity(null).series;

describe('re-entry prediction (M03)', () => {
  it('takes a tumbling body\'s mean cross-section as a quarter of its surface', () => {
    // a cylinder as long as it is wide: 3πD²/8
    expect(tumblingCylinderArea(2, 2)).toBeCloseTo((3 * Math.PI * 4) / 8, 12);
    // the core stage: 31.7 m × 5.0 m
    expect(tumblingCylinderArea(31.7, 5)).toBeCloseTo(134.3, 1);
  });

  it('gives a window of ±20 % of the time left', () => {
    const s = CZ5B_STAGES[1];
    const p = predictReentry(elementsFromRecord(s.elements), { mass: s.mass, area: tumblingCylinderArea(s.length, s.diameter), cd: 2.2 }, measured);
    const left = p.jd! - p.from;
    expect(p.window![0]).toBeCloseTo(p.jd! - WINDOW_FRACTION * left, 9);
    expect(p.window![1]).toBeCloseTo(p.jd! + WINDOW_FRACTION * left, 9);
    // a stage far higher stays up past a short horizon
    const high = { ...s.elements, MEAN_MOTION: 15.2 };
    expect(predictReentry(elementsFromRecord(high), { mass: s.mass, area: 134.3, cd: 2.2 }, measured, 30).jd).toBeNull();
  });

  it.each(CZ5B_STAGES.map((s) => [s.name, s] as const))('%s came down inside the window predicted from its first element set', (_, s) => {
    const p = predictReentry(elementsFromRecord(s.elements), { mass: s.mass, area: tumblingCylinderArea(s.length, s.diameter), cd: 2.2 }, measured);
    const actual = jdOf(s.reentry);
    const msg = `predicted ${((p.jd! - p.from)).toFixed(2)} d, actual ${(actual - p.from).toFixed(2)} d`;
    expect(actual, msg).toBeGreaterThanOrEqual(p.window![0]);
    expect(actual, msg).toBeLessThanOrEqual(p.window![1]);
  });

  it('is nearer the mark with the Sun as measured than with a fixed moderate Sun, on average', () => {
    const err = (activity: typeof measured | typeof ECSS_LEVELS.moderate) => CZ5B_STAGES.reduce((sum, s) => {
      const p = predictReentry(elementsFromRecord(s.elements), { mass: s.mass, area: tumblingCylinderArea(s.length, s.diameter), cd: 2.2 }, activity);
      const actual = jdOf(s.reentry);
      return sum + Math.abs((p.jd! - p.from) / (actual - p.from) - 1);
    }, 0) / CZ5B_STAGES.length;
    // measured: 7.6 % on average; moderate: 23 %
    expect(err(measured)).toBeLessThan(err(ECSS_LEVELS.moderate));
  });
});
