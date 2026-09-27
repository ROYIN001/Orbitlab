/**
 * An uncontrolled re-entry predicted from an element set (roadmap M03): the
 * set's mean orbit carried down by the long-term propagator's mean elements
 * (J2 and drag in the R05 density, with the Sun's activity as measured or
 * held) until its perigee is under 120 km, where it is lost within a
 * revolution or two; an eccentric orbit, a rocket stage left in a transfer
 * orbit, by Cowell with the Sun's and the Moon's pull until it is down (P2.5,
 * `ECCENTRIC`).
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
 * stages' published re-entries, and tests/ballistic.test.ts, with the drag
 * fitted to the element sets (P2.5), to the rocket stages of 2023–2025 and to
 * NAPA-2.
 */
import { propagate, type OrbitSample, type PropagationResult } from '../physics/propagator/propagate';
import type { LifetimeRequest } from '../physics/lifetime-job';
import type { Activity } from '../physics/propagator/activity';
import type { Spacecraft } from '../physics/propagator/forces';
import { meanStart } from './mean-state';
import { satrecFrom, sgp4 } from './sgp4';
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
  /** the orbit along the way (mean, or osculating for an eccentric one) */
  samples: OrbitSample[];
}

/** A tumbling cylinder's mean cross-section, m²: a quarter of its surface, as for any convex body tumbling at random (Cauchy). */
export const tumblingCylinderArea = (length: number, diameter: number): number =>
  (Math.PI * diameter * length + (Math.PI * diameter * diameter) / 2) / 4;

/** A tumbling box's mean cross-section, m²: a quarter of its surface (P2.5, for a CubeSat). */
export const tumblingBoxArea = ([x, y, z]: readonly [number, number, number]): number => (x * y + y * z + z * x) / 2;

/**
 * From this eccentricity on, an orbit is carried by Cowell with the Sun and
 * the Moon (P2.5). A transfer orbit's perigee is moved up and down by tens of
 * kilometres over weeks by their pull, and that, more than anything, sets
 * when it comes down: with the mean elements, which leave them out, not one of
 * the eight transfer-orbit stages of 2023–2025 came down within 400 days;
 * with them, five came down within 25 % of the day (tests/ballistic.test.ts).
 */
export const ECCENTRIC = 0.1;

/**
 * The run that predicts the re-entry of the object an element set
 * describes, looking up to `horizonDays` ahead: a near-circular orbit by the
 * mean elements, in well under a second; an eccentric one (`ECCENTRIC`) by
 * Cowell from SGP4's state at the epoch, with J2–J4, the Sun and the Moon,
 * until it is down — some seconds, so a page runs it off its own thread
 * (src/physics/lifetime-job.ts) and reads it with `reentryOf`.
 */
export function reentryRun(el: ElementSet, craft: Omit<Spacecraft, 'cr'>, activity: Activity, horizonDays = 365): LifetimeRequest {
  const s = meanStart(el);
  const sat = satrecFrom(el);
  const r = [0, 0, 0], v = [0, 0, 0];
  const spacecraft = { ...craft, cr: 1.3 };
  if (sat.ecco >= ECCENTRIC && sgp4(sat, 0, r, v) === 0) {
    return {
      r0: [r[0] * 1e3, r[1] * 1e3, r[2] * 1e3], v0: [v[0] * 1e3, v[1] * 1e3, v[2] * 1e3], jd0: s.jd,
      options: {
        method: 'cowell', duration: horizonDays * 86400, samples: 400, tolerance: 1e-9, untilDown: true, spacecraft,
        forces: { j2: true, j3j4: true, drag: true, sun: true, moon: true, srp: false, activity },
      },
    };
  }
  return {
    r0: s.r, v0: s.v, jd0: s.jd,
    options: {
      method: 'mean', duration: horizonDays * 86400, samples: 400, spacecraft,
      forces: { j2: true, j3j4: false, drag: true, sun: false, moon: false, srp: false, activity },
    },
  };
}

/** The re-entry a run found, with its window. */
export function reentryOf(run: LifetimeRequest, res: PropagationResult): Reentry {
  const from = run.jd0;
  if (res.lifetime === null) return { from, jd: null, window: null, samples: res.samples };
  const left = res.lifetime / 86400;
  return {
    from, jd: from + left,
    window: [from + left * (1 - WINDOW_FRACTION), from + left * (1 + WINDOW_FRACTION)],
    samples: res.samples,
  };
}

/** Predict the re-entry of the object an element set describes, here and now (`reentryRun`). */
export function predictReentry(el: ElementSet, craft: Omit<Spacecraft, 'cr'>, activity: Activity, horizonDays = 365): Reentry {
  const run = reentryRun(el, craft, activity, horizonDays);
  return reentryOf(run, propagate(run.r0, run.v0, run.jd0, run.options));
}
