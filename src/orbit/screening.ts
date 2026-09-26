/**
 * Screening the catalogue for close approaches to one satellite (roadmap
 * M01), as CelesTrak's SOCRATES does with the same public element sets: every
 * object whose radial band overlaps the satellite's is carried by SGP4 beside
 * it, and each approach nearer than the limit is reported with its time, its
 * miss distance and — from the estimated uncertainty of both element sets
 * (R04, src/orbit/uncertainty.ts) and the size the user gives the pair — an
 * estimated probability of collision.
 *
 * That probability is only as good as the uncertainty behind it, and an
 * element set's is hundreds of metres to kilometres: Kelso's analysis of the
 * Iridium 33–Cosmos 2251 collision (AAS 09-368, 2009) found the pair ranked
 * 152nd among the week's predicted approaches when they hit. The screening
 * shows how often objects pass close, not which pass will be a collision.
 *
 * DOM-free; the work is cut into slices (`screenInSlices`) so that a page can
 * stay responsive and stop it. tests/conjunction.test.ts.
 */
import { v3 } from '../physics/vec3';
import { closeApproaches, collisionProbability, rtnAxes, rtnToFrame, type Approach, type Ephemeris, type Mat3, type Probability } from './conjunction';
import { skyFacts, type SkyObject } from './real-sky';
import { minutesSinceEpoch, sgp4 } from './sgp4';
import { uncertaintyAt, type Sigma } from './uncertainty';

/** The mean orbit's perigee and apogee differ from the osculating ones by J2's short-period swing: some kilometres, and a margin for it. */
const BAND_MARGIN = 30e3;

/** SGP4's TEME state in m and m/s, taken as inertial (src/orbit/real-sky.ts). */
export function ephemerisOf(o: SkyObject): Ephemeris {
  const r = [0, 0, 0], v = [0, 0, 0];
  return (jd) => (sgp4(o.sat, minutesSinceEpoch(o.sat, jd), r, v) === 0
    ? { r: v3(r[0] * 1e3, r[1] * 1e3, r[2] * 1e3), v: v3(v[0] * 1e3, v[1] * 1e3, v[2] * 1e3) }
    : null);
}

/** Whether two objects' radial bands, perigee to apogee, come within `within` m of each other (Hoots et al. 1984). */
export function bandsOverlap(a: SkyObject, b: SkyObject, within: number): boolean {
  const fa = skyFacts(a), fb = skyFacts(b);
  return Math.max(fa.perigeeAlt, fb.perigeeAlt) - Math.min(fa.apogeeAlt, fb.apogeeAlt) <= within + BAND_MARGIN;
}

/** A diagonal covariance from standard deviations in an orbit's own axes. */
const diag = (s: Sigma): Mat3 => [[s.radial ** 2, 0, 0], [0, s.along ** 2, 0], [0, 0, s.cross ** 2]];

export interface Conjunction {
  other: SkyObject;
  approach: Approach;
  /** each set's estimated uncertainty at the closest approach (R04) */
  sigma: { self: Sigma; other: Sigma };
  /** the estimated probability of collision for a pair of that combined radius */
  probability: Probability;
}

/** One pair's approaches in the window, with their estimated probabilities. */
export function screenPair(self: SkyObject, other: SkyObject, jd0: number, jd1: number, within: number, radius: number): Conjunction[] {
  const step = Math.min(300, skyFacts(self).period / 20, skyFacts(other).period / 20);
  return closeApproaches(ephemerisOf(self), ephemerisOf(other), jd0, jd1, within, step).map((approach) => {
    const sa = uncertaintyAt(self, approach.tca).sigma, sb = uncertaintyAt(other, approach.tca).sigma;
    const probability = collisionProbability(approach.a, rtnToFrame(diag(sa), rtnAxes(approach.a)), approach.b, rtnToFrame(diag(sb), rtnAxes(approach.b)), radius);
    return { other, approach, sigma: { self: sa, other: sb }, probability };
  });
}

/** The objects worth searching against `self`: not itself, placed by SGP4, in an overlapping band; each catalogue number once. */
export function candidates(self: SkyObject, catalogue: readonly SkyObject[], within: number): SkyObject[] {
  const seen = new Set<number>([self.el.satnum]);
  const out: SkyObject[] = [];
  for (const o of catalogue) {
    if (seen.has(o.el.satnum)) continue;
    seen.add(o.el.satnum);
    if (o.sat.error === 0 && bandsOverlap(self, o, within)) out.push(o);
  }
  return out;
}

/** Every approach to `self` from the catalogue in the window, nearest first. */
export function screen(self: SkyObject, catalogue: readonly SkyObject[], jd0: number, jd1: number, within: number, radius: number): Conjunction[] {
  return candidates(self, catalogue, within).flatMap((o) => screenPair(self, o, jd0, jd1, within, radius))
    .sort((p, q) => p.approach.miss - q.approach.miss);
}

/**
 * `screen`, a few objects at a time: `onProgress` gets the fraction done
 * between slices, and returning false from it stops the search (the answer is
 * then null). `yieldTo` hands control back between slices — a timeout in a
 * page, nothing in a test.
 */
export async function screenInSlices(
  self: SkyObject, catalogue: readonly SkyObject[], jd0: number, jd1: number, within: number, radius: number,
  onProgress: (fraction: number) => boolean | void, yieldTo: () => Promise<void> = () => new Promise((r) => setTimeout(r, 0)),
): Promise<Conjunction[] | null> {
  const list = candidates(self, catalogue, within);
  const found: Conjunction[] = [];
  let last = performance.now();
  for (let k = 0; k < list.length; k++) {
    found.push(...screenPair(self, list[k], jd0, jd1, within, radius));
    if (performance.now() - last > 40) {
      if (onProgress((k + 1) / list.length) === false) return null;
      await yieldTo();
      last = performance.now();
    }
  }
  onProgress(1);
  return found.sort((p, q) => p.approach.miss - q.approach.miss);
}
