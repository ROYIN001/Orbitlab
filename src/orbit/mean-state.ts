/**
 * An element set as the start of the long-term propagator (roadmap R05, for
 * M03): the position and velocity whose two-body elements are the set's mean
 * elements, so that the mean-element method (src/physics/propagator/propagate.ts)
 * starts from the orbit the set describes rather than from one osculating
 * point of it — for a low orbit J2 alone swings the osculating semi-major axis
 * by several kilometres a revolution, a sizeable error in a lifetime.
 *
 * The semi-major axis is SGP4's own: from the mean motion with Kozai's
 * convention undone (Hoots & Roehrich, Spacetrack Report No. 3), in the
 * simulator's μ. The angles are TEME's, taken as the simulator's inertial
 * frame (they differ by the equation of the equinoxes, about a second of
 * arc, nothing to the air).
 */
import { MU_EARTH } from '../physics/constants';
import { stateFromElements, trueFromMean } from '../physics/orbital';
import type { V3 } from '../physics/propagator/ephemeris';
import { satrecFrom } from './sgp4';
import type { ElementSet } from './tle';

export interface MeanStart {
  r: V3;
  v: V3;
  /** the set's epoch, Julian date (UTC) */
  jd: number;
  /** mean semi-major axis, m */
  a: number;
}

export function meanStart(el: ElementSet): MeanStart {
  const s = satrecFrom(el);
  const n = s.no_unkozai / 60; // rad/min → rad/s
  const a = Math.cbrt(MU_EARTH / (n * n));
  const { r, v } = stateFromElements(a, s.ecco, s.inclo, s.nodeo, s.argpo, trueFromMean(s.mo, s.ecco));
  return { r: [r.x, r.y, r.z], v: [v.x, v.y, v.z], jd: el.jdEpoch + el.jdEpochFrac, a };
}
