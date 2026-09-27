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
 * One sampling step serves every pair of a screening, so that the satellite
 * screened is carried by SGP4 once for the whole catalogue (P2.5; with a
 * catalogue of 30 000 imported, that is half the work).
 *
 * Since P2.5 a near-Earth object's radial band is the one SGP4's radius
 * stays in over the window, not its perigee and apogee with a margin, which
 * an object coming down leaves (`bandsOverlap`). A time filter
 * (src/orbit/screening-filter.ts) then says for each pair when the two can
 * come within the limit at all: near the line where their planes cross,
 * both at the same end of it at once, at heights that can meet. Only those
 * stretches are searched, on the same samples the whole search would take
 * there, so the answer is the whole search's to the last bit, some twenty to
 * forty times sooner for a satellite in the crowded band at 700 km
 * (docs/VALIDATION.md §7). Pairs the filter cannot vouch for — deep space,
 * nearly coplanar, coming down within the window — are searched whole. The
 * whole search stays callable (`{ filter: false }`): it is the reference the
 * filter is held to (tests/screening-filter.test.ts).
 *
 * DOM-free; the work is cut into slices (`screenInSlices`) so that a page can
 * stay responsive and stop it, and src/orbit/screening-job.ts runs it in a
 * worker. tests/conjunction.test.ts.
 */
import { v3 } from '../physics/vec3';
import { closeApproaches, collisionProbability, rtnAxes, rtnToFrame, type Approach, type Ephemeris, type Mat3, type Probability } from './conjunction';
import { skyFacts, type SkyObject } from './real-sky';
import { radiusBand, timeFilter } from './screening-filter';
import { minutesSinceEpoch, sgp4 } from './sgp4';
import { uncertaintyAt, type Sigma } from './uncertainty';

/** The mean orbit's perigee and apogee differ from the osculating ones by J2's short-period swing: some kilometres, and a margin for it (deep space only since P2.5). */
const BAND_MARGIN = 30e3;

/** SGP4's TEME state in m and m/s, taken as inertial (src/orbit/real-sky.ts). */
export function ephemerisOf(o: SkyObject): Ephemeris {
  const r = [0, 0, 0], v = [0, 0, 0];
  return (jd) => (sgp4(o.sat, minutesSinceEpoch(o.sat, jd), r, v) === 0
    ? { r: v3(r[0] * 1e3, r[1] * 1e3, r[2] * 1e3), v: v3(v[0] * 1e3, v[1] * 1e3, v[2] * 1e3) }
    : null);
}

/**
 * An object's band of radii, m from the Earth's centre: SGP4's own over the
 * window where it can be given, else perigee to apogee at the epoch — from the
 * ground up for an object SGP4 brings down within the window.
 */
function band(o: SkyObject, jd0?: number, jd1?: number): { lo: number; hi: number; sgp4: boolean } {
  const b = jd0 !== undefined && jd1 !== undefined ? radiusBand(o, jd0, jd1) : null;
  if (Array.isArray(b)) return { lo: b[0], hi: b[1], sgp4: true };
  const f = skyFacts(o), re = o.sat.radiusearthkm * 1e3;
  return { lo: b === 'down' ? re : re + f.perigeeAlt, hi: re + f.apogeeAlt, sgp4: false };
}

/**
 * Whether two objects' radial bands come within `within` m of each other
 * (the apogee–perigee filter of Hoots et al. 1984). Given the window
 * (P2.5), a near-Earth object's band is the one SGP4's radius stays in over
 * it (src/orbit/screening-filter.ts, `radiusBand`), which needs no margin
 * and holds for an object that is coming down: a perigee and apogee at the
 * epoch with 30 km either way do not — SGP4 takes the fastest-decaying
 * objects of a catalogue up to 346 km below their perigee within a week (the
 * P2.5 diagnosis). A deep-space object keeps its perigee and apogee and the
 * 30 km margin.
 */
export function bandsOverlap(a: SkyObject, b: SkyObject, within: number, jd0?: number, jd1?: number): boolean {
  const ba = band(a, jd0, jd1), bb = band(b, jd0, jd1);
  return Math.max(ba.lo, bb.lo) - Math.min(ba.hi, bb.hi) <= within + (ba.sgp4 && bb.sgp4 ? 0 : BAND_MARGIN);
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

/**
 * An ephemeris that keeps what it computed, for the object screened against
 * a whole catalogue (P2.5): on a step shared by every pair its samples are
 * the same times each time, and SGP4 is run for them once.
 */
export function cachedEphemeris(o: SkyObject): Ephemeris {
  const base = ephemerisOf(o), kept = new Map<number, ReturnType<Ephemeris>>();
  return (jd) => {
    let s = kept.get(jd);
    if (s === undefined) {
      s = base(jd);
      if (kept.size > 100_000) kept.clear();
      kept.set(jd, s);
    }
    return s;
  };
}

/**
 * One pair's approaches in the window, with their estimated probabilities;
 * `selfEph` and `step` shared across a screening. With `windows` (Julian
 * dates, from the time filter) only those stretches are searched; [] searches
 * nothing.
 */
export function screenPair(self: SkyObject, other: SkyObject, jd0: number, jd1: number, within: number, radius: number,
  selfEph: Ephemeris = ephemerisOf(self), step = Math.min(300, skyFacts(self).period / 20, skyFacts(other).period / 20),
  windows?: ReadonlyArray<readonly [number, number]> | null): Conjunction[] {
  if (windows && windows.length === 0) return [];
  return closeApproaches(selfEph, ephemerisOf(other), jd0, jd1, within, step, windows ?? undefined).map((approach) => {
    const sa = uncertaintyAt(self, approach.tca).sigma, sb = uncertaintyAt(other, approach.tca).sigma;
    const probability = collisionProbability(approach.a, rtnToFrame(diag(sa), rtnAxes(approach.a)), approach.b, rtnToFrame(diag(sb), rtnAxes(approach.b)), radius);
    return { other, approach, sigma: { self: sa, other: sb }, probability };
  });
}

const atEpochR = [0, 0, 0], atEpochV = [0, 0, 0];

/**
 * Whether SGP4 takes an element set at its own epoch. Asked afresh (P2.5):
 * `sat.error` holds whatever the set's last propagation gave, so a screening
 * run before — or the page drawing the object at a moment after it came
 * down — would otherwise change which objects the next screening searches.
 */
const takenAtEpoch = (o: SkyObject): boolean => sgp4(o.sat, 0, atEpochR, atEpochV) === 0;

/**
 * The objects worth searching against `self`: not itself, taken by SGP4 at
 * their epoch, in an overlapping band (over the window from `jd0` to `jd1`
 * when given; see `bandsOverlap`); each catalogue number once.
 */
export function candidates(self: SkyObject, catalogue: readonly SkyObject[], within: number, jd0?: number, jd1?: number): SkyObject[] {
  const seen = new Set<number>([self.el.satnum]);
  const mine = band(self, jd0, jd1);
  const out: SkyObject[] = [];
  for (const o of catalogue) {
    if (seen.has(o.el.satnum)) continue;
    seen.add(o.el.satnum);
    const b = band(o, jd0, jd1);
    const overlap = Math.max(mine.lo, b.lo) - Math.min(mine.hi, b.hi) <= within + (mine.sgp4 && b.sgp4 ? 0 : BAND_MARGIN);
    if (overlap && takenAtEpoch(o)) out.push(o);
  }
  return out;
}

/** One sampling step for the whole screening: a twentieth of the shortest period among the pairs, at most five minutes. */
function commonStep(self: SkyObject, list: readonly SkyObject[]): number {
  let shortest = skyFacts(self).period;
  for (const o of list) shortest = Math.min(shortest, skyFacts(o).period);
  return Math.min(300, shortest / 20);
}

/** How the time filter dealt with a screening's pairs. */
export interface FilterStats {
  /** the pairs whose bands overlap */
  pairs: number;
  /** searched over the whole window (the filter could not vouch for them, or was off) */
  whole: number;
  /** not searched at all: they cannot come within the limit */
  none: number;
  /** the stretches searched, over the other pairs */
  windows: number;
}

export interface ScreenOptions {
  /** the time filter (P2.5; the default); false searches every pair over the whole window — the reference the filter is held to */
  filter?: boolean;
  /** counts of what the filter did, added to */
  stats?: FilterStats;
}

/** The windows each pair is searched in, for one screening: null (the whole window) for every pair when the filter is off. */
function windowsFor(self: SkyObject, jd0: number, jd1: number, within: number, options: ScreenOptions): (o: SkyObject) => [number, number][] | null {
  const pick = options.filter === false ? () => null : timeFilter(self, jd0, jd1, within);
  const stats = options.stats;
  if (!stats) return pick;
  return (o) => {
    const w = pick(o);
    stats.pairs++;
    if (w === null) stats.whole++;
    else if (w.length === 0) stats.none++;
    else stats.windows += w.length;
    return w;
  };
}

/** Every approach to `self` from the catalogue in the window, nearest first. */
export function screen(self: SkyObject, catalogue: readonly SkyObject[], jd0: number, jd1: number, within: number, radius: number,
  options: ScreenOptions = {}): Conjunction[] {
  const list = candidates(self, catalogue, within, jd0, jd1);
  const eph = cachedEphemeris(self), step = commonStep(self, list);
  const windows = windowsFor(self, jd0, jd1, within, options);
  return list.flatMap((o) => screenPair(self, o, jd0, jd1, within, radius, eph, step, windows(o)))
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
  options: ScreenOptions = {},
): Promise<Conjunction[] | null> {
  const list = candidates(self, catalogue, within, jd0, jd1);
  const eph = cachedEphemeris(self), step = commonStep(self, list);
  const windows = windowsFor(self, jd0, jd1, within, options);
  const found: Conjunction[] = [];
  let last = performance.now();
  for (let k = 0; k < list.length; k++) {
    found.push(...screenPair(self, list[k], jd0, jd1, within, radius, eph, step, windows(list[k])));
    if (performance.now() - last > 40) {
      if (onProgress((k + 1) / list.length) === false) return null;
      await yieldTo();
      last = performance.now();
    }
  }
  onProgress(1);
  return found.sort((p, q) => p.approach.miss - q.approach.miss);
}
