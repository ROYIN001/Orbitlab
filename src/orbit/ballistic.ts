/**
 * The ballistic coefficient B = C_D A / m fitted to an object's own decay
 * (roadmap P2.5, for M03), instead of a mass and a size typed in. It is how
 * the agencies predict a re-entry: the drag term is fitted to the tracking,
 * which takes in whatever the density model gets wrong along with the
 * object's attitude and shape (Klinkrad, "Methods and procedures for
 * re-entry predictions at ESA", 2013; Pardini and Anselmo on the re-entry
 * campaigns of the IADC).
 *
 * Two ways, by what there is:
 *
 * - **One element set**: its first derivative of the mean motion, ṅ (the set
 *   carries ṅ/2), is the orbit's decay rate as the element sets' makers fitted
 *   it from the tracking. The semi-major axis falls as ȧ = −(2/3)(a/n) ṅ; the
 *   mean-element drag rate at the set's epoch, in the NRLMSISE-00 air of that
 *   day, is proportional to B, so the B that gives the same ȧ follows at once.
 *   A set whose ṅ is not positive (the first sets after a launch often carry
 *   none) gives nothing.
 * - **Two or more sets** of the same object: B such that the mean orbit
 *   carried from the earliest set falls to the latest set's mean semi-major
 *   axis at the latest set's epoch.
 *
 * DOM-free; tests/ballistic.test.ts holds it to the spheres' known B and to
 * the re-entries of the rocket stages of 2023–2025.
 */
import { MU_EARTH } from '../physics/constants';
import { dragRates, elementsOf, propagate } from '../physics/propagator/propagate';
import type { Activity } from '../physics/propagator/activity';
import type { ForceModel, Spacecraft } from '../physics/propagator/forces';
import { meanStart } from './mean-state';
import type { ElementSet } from './tle';
import { B_RANGE } from './ballistic-range';

/** B's plausible range (src/orbit/ballistic-range.ts, where the launch side reads it without the propagator). */
export { B_RANGE };

/** A spacecraft standing for a ballistic coefficient alone: C_D A / m = b. */
export const craftOfB = (b: number): Omit<Spacecraft, 'cr'> => ({ mass: 1, area: b, cd: 1 });

/** The mean-element forces a re-entry is carried by (as src/orbit/reentry.ts). */
const forces = (activity: Activity): ForceModel => ({ j2: true, j3j4: false, drag: true, sun: false, moon: false, srp: false, activity });

/**
 * B from one element set's decay rate, m²/kg; null when the set carries no
 * decay (ṅ ≤ 0) or it gives a B outside `B_RANGE`.
 */
export function ballisticFromDecayRate(el: ElementSet, activity: Activity): number | null {
  // ElementSet.ndot is ṅ/2 in rad/min²
  const nDot = (2 * el.ndot) / 3600;
  if (!(nDot > 0)) return null;
  const s = meanStart(el);
  const n = Math.sqrt(MU_EARTH / s.a ** 3);
  const observed = -(2 / 3) * (s.a / n) * nDot;
  const bRef = 0.01;
  const model = dragRates(elementsOf(s.r, s.v), s.jd, forces(activity), { ...craftOfB(bRef), cr: 1 }).da;
  if (!(model < 0)) return null;
  const b = bRef * (observed / model);
  return b >= B_RANGE[0] && b <= B_RANGE[1] ? b : null;
}

/** The mean semi-major axis an element set gives, m. */
const meanA = (el: ElementSet): number => meanStart(el).a;

/**
 * B such that the mean orbit carried from the earliest set reaches the
 * latest one's mean semi-major axis at its epoch, m²/kg; null with fewer than
 * two sets a day apart, or when no B in `B_RANGE` does it.
 *
 * What is matched is the time the orbit takes to fall to the latest set's
 * semi-major axis, which shortens steadily as B grows, rather than the
 * semi-major axis at the latest epoch, which a larger B takes past the
 * re-entry line; the root is found by regula falsi (the Illinois variant) on
 * log B, bracketed by `B_RANGE`.
 */
export function ballisticFromSets(sets: readonly ElementSet[], activity: Activity): number | null {
  const sorted = [...sets].sort((p, q) => (p.jdEpoch + p.jdEpochFrac) - (q.jdEpoch + q.jdEpochFrac));
  const first = sorted[0], last = sorted[sorted.length - 1];
  const s = meanStart(first);
  const t1 = (last.jdEpoch + last.jdEpochFrac - s.jd) * 86400;
  if (!(t1 >= 86400)) return null;
  const target = meanA(last);
  if (target >= s.a) return null;
  const horizon = 4 * t1;
  /** log of the time to fall to the target with B = e^x, less log t1; the horizon's when it does not get there */
  const g = (x: number): number => {
    const res = propagate(s.r, s.v, s.jd, { method: 'mean', duration: horizon, forces: forces(activity), spacecraft: { ...craftOfB(Math.exp(x)), cr: 1 }, samples: 1200 });
    const smp = res.samples;
    let t = res.lifetime ?? horizon;
    for (let k = 1; k < smp.length; k++) {
      if (smp[k].a <= target) {
        const f = (smp[k - 1].a - target) / (smp[k - 1].a - smp[k].a);
        t = smp[k - 1].t + f * (smp[k].t - smp[k - 1].t);
        break;
      }
    }
    return Math.log(t) - Math.log(t1);
  };
  let lo = Math.log(B_RANGE[0]), hi = Math.log(B_RANGE[1]);
  let glo = g(lo), ghi = g(hi);
  // the least drag must be too slow and the most too fast
  if (!(glo > 0 && ghi < 0)) return null;
  let x = lo, side = 0;
  for (let k = 0; k < 60; k++) {
    x = (lo * ghi - hi * glo) / (ghi - glo);
    const gx = g(x);
    if (Math.abs(gx) < 1e-4) break;
    if (gx > 0) { lo = x; glo = gx; if (side === 1) ghi /= 2; side = 1; }
    else { hi = x; ghi = gx; if (side === -1) glo /= 2; side = -1; }
  }
  return Math.exp(x);
}
