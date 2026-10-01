/**
 * Lifetime → altitude (roadmap D07, docs/ROADMAP-PART2-3.md; Phase 4 map §3
 * item 3): the lowest circular orbit a satellite can be left in and still
 * stay up for the years its mission asks — the lifetime analysis (P07) turned
 * round. Below it the satellite must carry propellant to make up the drag
 * (`holdDvPerYear`); far above it, the 25-year rule needs a burn to bring it
 * down (the requirements solver, src/design/requirement-trades.ts, asks for
 * both altitudes).
 *
 * THE SEARCH. Bisection over the circular altitude, each trial a run of P07's
 * mean-element method (`propagate`, src/physics/propagator/propagate.ts: J2
 * and drag in NRLMSISE-00, Sun, Moon and sunlight pressure left out) for the
 * years asked: a trial that is still up at the end lasts, one that comes down
 * does not. Lifetime grows with altitude (the air thins about tenfold every
 * 100–150 km up there; tests/d07-lifetime-altitude.test.ts checks it on a
 * ladder of altitudes), so the bracket halves each run until it is 10 km wide:
 * the altitude returned, its middle, is within ±5 km of where the lifetime is
 * the years asked. From 150–5 000 km that is two runs at the ends and nine in
 * between. It runs in a worker with progress and a Stop
 * (src/orbit/lifetime-altitude-job.ts), as P07's own run does.
 *
 * REPRODUCIBLE. The air is one of ECSS's fixed levels (ECSS-E-ST-10-04C,
 * Annex G), never the measured series, which the deploy job refreshes
 * daily; so a result can be checked again later and come out the same
 * (map §3: `MissionRequirements.activity`).
 *
 * The orbit is circular, sun-synchronous at a local time of the ascending
 * node or at a fixed inclination and node; its drag area is the tumbling
 * estimate the builder shows (src/design/satellite-area.ts), and the same
 * number drives the result. src/design must not import the propagator
 * (tests/propagator.test.ts), so this lives in src/orbit and the design side
 * reads only its results. DOM-free, SI units and radians.
 */
import { R_EARTH } from '../physics/constants';
import { stateFromElements } from '../physics/orbital';
import { propagate } from '../physics/propagator/propagate';
import { ECSS_LEVELS, type EcssLevel } from '../physics/propagator/activity';
import type { ForceModel, Spacecraft } from '../physics/propagator/forces';
import { dragMakeupPerYear, YEAR } from './disposal';
import { raanForLocalTime, sunSynchronousInclination, type Orbit } from './kepler';
import { REPEAT_SEARCH } from './playground-model';

export type { EcssLevel } from '../physics/propagator/activity';

/** The plane of the circular orbits tried: sun-synchronous with its ascending node at `ltan` h on the epoch, or a fixed inclination and node, rad. */
export type LifetimePlane = { sso: true; ltan: number } | { sso: false; inclination: number; raan: number };

/** What the search is for. */
export interface AltitudeSearch {
  /** the years the satellite must stay up (Julian years) */
  years: number;
  /** mass, drag area, C_D, C_R (the area is the tumbling estimate) */
  spacecraft: Spacecraft;
  level: EcssLevel;
  plane: LifetimePlane;
  /** the epoch, Julian date (UTC): where the Sun is when the run starts */
  jd0: number;
  /** the altitudes searched between, m (default the repeat-orbit range, 150–5 000 km) */
  lo?: number;
  hi?: number;
  /** half the final bracket, m (default 5 km) */
  tolerance?: number;
}

/** One trial. */
export interface LifetimeRun {
  /** m */
  altitude: number;
  /** s from the epoch to re-entry; null: still up after `years` */
  lifetime: number | null;
}

export interface AltitudeForLifetime {
  years: number;
  /**
   * 'found': the bracket closed on the altitude; 'belowRange': even the
   * bottom of the range lasts (the answer is at most `lo`); 'aboveRange':
   * even its top comes down sooner (no altitude in range lasts).
   */
  outcome: 'found' | 'belowRange' | 'aboveRange';
  /** m: the middle of the final bracket, within `tolerance` of the answer ('found'); `lo` ('belowRange'); null ('aboveRange') */
  altitude: number | null;
  /** the final bracket, m: an orbit at `lo` comes down before `years` (unless 'belowRange'), one at `hi` lasts them (unless 'aboveRange') */
  lo: number;
  hi: number;
  runs: LifetimeRun[];
}

/** The mean-element method's forces at a fixed ECSS level: J2 and drag, what it flies (Sun, Moon and sunlight pressure it leaves out). */
export function meanForces(level: EcssLevel): ForceModel {
  if (!Object.hasOwn(ECSS_LEVELS, level)) throw new RangeError(`not an ECSS level: ${String(level)}`);
  return { j2: true, j3j4: false, drag: true, sun: false, moon: false, srp: false, activity: ECSS_LEVELS[level] };
}

/** The circular orbit at altitude `h` (m) in `plane` on Julian date `jd0`, as the playground's `Orbit`. */
export function circularOrbit(h: number, plane: LifetimePlane, jd0: number): Orbit {
  const a = R_EARTH + h;
  if (plane.sso) {
    const i = sunSynchronousInclination({ a, e: 0 });
    if (i === null) throw new RangeError(`no sun-synchronous orbit at ${Math.round(h / 1e3)} km`);
    return { a, e: 0, i, raan: raanForLocalTime(plane.ltan, jd0), argp: 0, m0: 0, jd0 };
  }
  return { a, e: 0, i: plane.inclination, raan: plane.raan, argp: 0, m0: 0, jd0 };
}

/**
 * P07's mean-element run from the circular orbit at altitude `h` for
 * `duration` s: the lifetime, s, or null if still up at the end. `onProgress`
 * is the propagator's (return false to stop; a stopped run throws an
 * AbortError rather than pass for one that stayed up).
 */
export function lifetimeAt(
  h: number, s: Pick<AltitudeSearch, 'spacecraft' | 'level' | 'plane' | 'jd0'>, duration: number,
  onProgress?: (fraction: number) => boolean | void,
): number | null {
  const o = circularOrbit(h, s.plane, s.jd0);
  const { r, v } = stateFromElements(o.a, 0, o.i, o.raan, 0, 0);
  let stopped = false;
  const res = propagate([r.x, r.y, r.z], [v.x, v.y, v.z], s.jd0, {
    method: 'mean', duration, forces: meanForces(s.level), spacecraft: s.spacecraft, samples: 60,
    onProgress: onProgress && ((f) => { if (onProgress(f) === false) { stopped = true; return false; } return true; }),
  });
  if (stopped) throw new DOMException('Cancelled', 'AbortError');
  return res.lifetime;
}

/** Runs a search of this range and tolerance takes: the two ends, then the halvings. */
export function expectedRuns(lo: number, hi: number, tolerance: number): number {
  return 2 + Math.max(0, Math.ceil(Math.log2((hi - lo) / (2 * tolerance))));
}

function check(s: AltitudeSearch): { lo: number; hi: number; tol: number } {
  const lo = s.lo ?? REPEAT_SEARCH.min, hi = s.hi ?? REPEAT_SEARCH.max, tol = s.tolerance ?? 5e3;
  if (!(s.years > 0) || !Number.isFinite(s.years)) throw new RangeError(`years must be more than 0 (got ${s.years})`);
  if (!(lo > 0 && hi > lo && Number.isFinite(hi))) throw new RangeError(`the range must be 0 < lo < hi (got ${lo}, ${hi})`);
  if (!(tol > 0)) throw new RangeError(`the tolerance must be more than 0 m (got ${tol})`);
  const sc = s.spacecraft;
  if (!(sc.mass > 0 && sc.area >= 0 && sc.cd > 0) || ![sc.mass, sc.area, sc.cd].every(Number.isFinite)) {
    throw new RangeError('the spacecraft needs a mass and C_D above zero and an area of zero or more');
  }
  return { lo, hi, tol };
}

/**
 * The lowest circular altitude whose P07 lifetime is at least `years`, by
 * bisection to ±`tolerance` (D07, map §3 item 3). `onProgress` gets the
 * fraction of the whole search done (return false to stop: the search then
 * throws an AbortError). `loFails` says the caller already knows an orbit at
 * `lo` comes down sooner (a longer search after a shorter one), so it is not
 * flown again.
 */
export function minAltitudeForLifetime(
  s: AltitudeSearch, onProgress?: (fraction: number) => boolean | void, loFails = false,
): AltitudeForLifetime {
  const range = check(s), tol = range.tol;
  let { lo, hi } = range;
  const duration = s.years * YEAR;
  const runs: LifetimeRun[] = [];
  const total = expectedRuns(lo, hi, tol) - (loFails ? 1 : 0);
  const trial = (h: number): boolean => {
    const k = runs.length;
    const lifetime = lifetimeAt(h, s, duration, onProgress && ((f) => onProgress(Math.min(1, (k + f) / total))));
    runs.push({ altitude: h, lifetime });
    return lifetime === null;
  };
  if (!loFails && trial(lo)) return { years: s.years, outcome: 'belowRange', altitude: lo, lo, hi, runs };
  if (!trial(hi)) return { years: s.years, outcome: 'aboveRange', altitude: null, lo, hi, runs };
  while (hi - lo > 2 * tol) {
    const mid = (lo + hi) / 2;
    if (trial(mid)) hi = mid; else lo = mid;
  }
  onProgress?.(1);
  return { years: s.years, outcome: 'found', altitude: (lo + hi) / 2, lo, hi, runs };
}

/** Several searches that differ only in the years, one after another; a longer one starts from where a shorter one's orbit came down. */
export interface AltitudesRequest extends Omit<AltitudeSearch, 'years'> {
  years: number[];
}

/**
 * `minAltitudeForLifetime` for each of `req.years` (answers in the order
 * asked). The requirements solver asks for two: the mission's life (below
 * that altitude the drag must be made up) and the life plus 25 years (above
 * that one, drag alone does not bring it down within 25 years of the end:
 * IADC-02-01 Rev. 4, doc p. 14, a decay orbit of "no more than a maximum of
 * 25 years"). A longer life needs a higher orbit, so each
 * search after the first starts from the bracket's bottom of the one before
 * when that one closed; `onProgress` gets the fraction of all of them.
 */
export function altitudesForLifetimes(req: AltitudesRequest, onProgress?: (fraction: number) => boolean | void): AltitudeForLifetime[] {
  const order = req.years.map((y, k) => ({ y, k })).sort((a, b) => a.y - b.y);
  const out: AltitudeForLifetime[] = new Array(req.years.length);
  let floor: number | null = null;
  order.forEach(({ y, k }, n) => {
    const s: AltitudeSearch = { ...req, years: y, ...(floor !== null ? { lo: floor } : {}) };
    const part = onProgress && ((f: number) => onProgress((n + f) / order.length));
    const r = minAltitudeForLifetime(s, part, floor !== null);
    out[k] = r;
    if (r.outcome === 'found' && r.lo > (floor ?? -Infinity)) floor = r.lo;
  });
  return out;
}

/**
 * The Δv a year to hold a circular orbit against the drag at a fixed ECSS
 * level, m/s a year: `dragMakeupPerYear` (src/orbit/disposal.ts) with the
 * level's indices, so the design side, which may not import the propagator,
 * can ask for it by the level's name.
 */
export function holdDvPerYear(o: Orbit, spacecraft: Spacecraft, level: EcssLevel): number {
  return dragMakeupPerYear(o, spacecraft, meanForces(level).activity);
}
