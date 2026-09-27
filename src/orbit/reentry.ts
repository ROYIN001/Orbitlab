/**
 * An uncontrolled re-entry predicted from an element set (roadmap M03): the
 * set's mean orbit carried down by the long-term propagator's mean elements
 * (J2 and drag in the R05 density, with the Sun's activity as measured or
 * held) until its perigee is under 120 km, where it is lost within a
 * revolution or two.
 *
 * The window is ±20 % of the time left, the convention of the agencies that
 * make these predictions: ESA takes it as about two standard deviations of
 * the combined errors, and found its own predictions outside it in about 5 %
 * of 15 campaigns (H. Klinkrad, "Methods and procedures for re-entry
 * predictions at ESA", 6th European Conference on Space Debris, 2013); the
 * Aerospace Corporation quotes the same. So the window is wide days before
 * and narrows with each later element set — the prediction is only as good
 * as the time left. This model's own error, measured on seven spheres of known
 * size (R05), was 0 to 22 % early: it is a teaching model, not an agency's.
 *
 * DOM-free; tests/reentry.test.ts holds it to the four Long March 5B core
 * stages' published re-entries.
 */
import { propagate, type OrbitSample } from '../physics/propagator/propagate';
import type { Activity } from '../physics/propagator/activity';
import type { Spacecraft } from '../physics/propagator/forces';
import { meanStart } from './mean-state';
import type { ElementSet } from './tle';

/** The window's half-width as a fraction of the time left (Klinkrad 2013; the Aerospace Corporation). */
export const WINDOW_FRACTION = 0.2;

export interface Reentry {
  /** the element set's epoch, Julian date (UTC) */
  from: number;
  /** the predicted re-entry, Julian date; null when it stays up past the horizon */
  jd: number | null;
  /** earliest and latest, Julian dates */
  window: [number, number] | null;
  /** the mean orbit along the way */
  samples: OrbitSample[];
}

/** A tumbling cylinder's mean cross-section, m²: a quarter of its surface, as for any convex body tumbling at random (Cauchy). */
export const tumblingCylinderArea = (length: number, diameter: number): number =>
  (Math.PI * diameter * length + (Math.PI * diameter * diameter) / 2) / 4;

/** Predict the re-entry of the object an element set describes, looking up to `horizonDays` ahead. */
export function predictReentry(el: ElementSet, craft: Omit<Spacecraft, 'cr'>, activity: Activity, horizonDays = 365): Reentry {
  const s = meanStart(el);
  const res = propagate(s.r, s.v, s.jd, {
    method: 'mean', duration: horizonDays * 86400, samples: 400,
    forces: { j2: true, j3j4: false, drag: true, sun: false, moon: false, srp: false, activity },
    spacecraft: { ...craft, cr: 1.3 },
  });
  if (res.lifetime === null) return { from: s.jd, jd: null, window: null, samples: res.samples };
  const left = res.lifetime / 86400;
  return {
    from: s.jd, jd: s.jd + left,
    window: [s.jd + left * (1 - WINDOW_FRACTION), s.jd + left * (1 + WINDOW_FRACTION)],
    samples: res.samples,
  };
}
