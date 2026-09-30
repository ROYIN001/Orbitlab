/**
 * What a designed orbit sees (roadmap D07, docs/ROADMAP-PART2-3.md; Phase 4
 * map §3 items 1 and 2): how often a camera or a radar on it comes back over
 * a place, and how long its ground stations hear it each day. These are the
 * two numbers an Earth-observation mission is specified by — "revisit" and
 * "data brought down" — and the two that the requirements solver
 * (src/design/requirement-trades.ts) trades against the altitude.
 *
 * REVISIT is found by brute force, not by a formula: the ground track
 * (`groundTrack`, src/orbit/kepler.ts, J2 mean elements) is walked at a fixed
 * step, every close approach to the place is found and refined, and each one
 * where the place falls inside the instrument's reach is a look. The gaps
 * between looks are what is reported — the longest and the mean — never the
 * "days to cover" a grid argument gives (docs/VALIDATION.md, O04 notes: a
 * repeat grid says when every place has been seen once, not how long any one
 * place waits). tests/d07-coverage.test.ts holds it to Landsat's and Sentinel's
 * published revisits, to the repeat-grid bound, and to a second, slower brute
 * force with no refinement.
 *
 * CONTACT is the R03 pass search (`findPassesOf`, src/orbit/passes.ts, held
 * to Skyfield through `findPasses`) run on the Kepler orbit's elevation, the
 * passes over several stations merged so that time heard by two at once
 * counts once.
 *
 * MODEL CHOICES (map risk R7). The ground is the sphere of radius `R_EARTH`,
 * as in `swathWidth` and `sideReach` (src/orbit/applications.ts): the place's
 * direction from the Earth's centre is taken from its WGS-84 position
 * (`geodeticToEcef`), and distances across the track are arcs of that sphere.
 * The Earth turns by `gmst`, the frame of every Kepler orbit in the app. The
 * Sun is `sunDirectionEci`; a place is in daylight when the Sun is above its
 * horizon (its geodetic vertical), as the overflights' `daylight` is (M02).
 *
 * DOM-free, SI units and radians inside; times are Julian dates (UTC), gaps
 * are days.
 */
import { MU_EARTH, OMEGA_EARTH, R_EARTH } from '../physics/constants';
import { gmst, sunDirectionEci } from '../physics/orbital';
import { cross, dot, norm, scale, sub, v3, type Vec3 } from '../physics/vec3';
import { eciToEcef, geodeticToEcef, lookAngles, type GroundStation } from './applications';
import { groundTrack, orbitFacts, stateAt, type Orbit } from './kepler';
import { findPassesOf } from './passes';

const DAY = 86400;
const PHI = (Math.sqrt(5) - 1) / 2;
/** A look's closest approach is refined to this, s. */
const REFINE = 1e-3;
/** Samples per chunk of the walk, so a year's walk never holds a year of points at once. */
const CHUNK = 4096;

/**
 * Where the instrument can see, m across the track on the ground (positive
 * to the right of the direction of travel): a number is a half-width either
 * side of the track (a fixed camera's swath / 2, or that plus `sideReach`
 * for one that tilts, map §3 item 2); a pair is a band on one side, as a
 * radar's incidence limits make one (`reachEdges`, src/orbit/sensors.ts).
 */
export type Reach = number | readonly [number, number];

/** One look at the place. */
export interface RevisitLook {
  /** the closest approach, Julian date (UTC) */
  jd: number;
  /** the place's distance from the track then, m along the ground, positive to the right of the direction of travel */
  across: number;
  /** the satellite was heading north */
  ascending: boolean;
  /** the Sun's elevation at the place then, rad */
  sunElevation: number;
}

export interface Revisit {
  /** every look counted, in time order */
  looks: RevisitLook[];
  /** days between successive looks; with `periodic`, the gap across the end of the window too */
  gaps: number[];
  /** the longest gap, days; Infinity when there are too few looks to have one (none; or one, not periodic) */
  maxGap: number;
  /** the mean gap, days (with `periodic`, the window over the number of looks); Infinity likewise */
  meanGap: number;
  /** days from the window's start to the first look, and from the last look to its end (Infinity with no look) */
  firstAfter: number;
  lastBefore: number;
}

export interface RevisitOptions {
  /**
   * The window is one period of a pattern that repeats — a repeat-ground-track
   * orbit's cycle — so the gap from the last look to the first look of the
   * next window counts, and a look at the window's very end is the next
   * window's first (the window is [start, end)).
   */
  periodic?: boolean;
  /** the walk's step, s (default: 1/60 of a revolution, never more than a minute, as `findPassesOf` samples) */
  step?: number;
  /** the Sun's elevation above which the place is in daylight, rad (default 0: above the horizon) */
  minSunElevation?: number;
  /** with J2's drift (default true, as the app's orbits are J2 mean elements) */
  j2?: boolean;
}

const unit = (p: Vec3): Vec3 => scale(p, 1 / norm(p));

/** The point below the satellite, as a unit vector in the Earth-fixed frame. */
function below(o: Orbit, t: number, j2: boolean): Vec3 {
  const s = stateAt(o, t, j2);
  return unit(eciToEcef(s.r, s.theta));
}

/** The Sun's elevation at `place` at `jd`, rad: its direction turned with the Earth, against the place's geodetic vertical. */
export function sunElevationAt(place: GroundStation, jd: number): number {
  const s = eciToEcef(sunDirectionEci(jd), gmst(jd));
  const up = v3(Math.cos(place.lat) * Math.cos(place.lon), Math.cos(place.lat) * Math.sin(place.lon), Math.sin(place.lat));
  return Math.asin(Math.max(-1, Math.min(1, dot(s, up))));
}

/** The largest angle at the Earth's centre the reach spans, rad. */
function reachAngle(reach: Reach): number {
  if (typeof reach === 'number') return Math.abs(reach) / R_EARTH;
  return Math.max(Math.abs(reach[0]), Math.abs(reach[1])) / R_EARTH;
}

function withinReach(across: number, reach: Reach): boolean {
  if (typeof reach === 'number') return Math.abs(across) <= reach;
  const lo = Math.min(reach[0], reach[1]), hi = Math.max(reach[0], reach[1]);
  return across >= lo && across <= hi;
}

/**
 * The gaps between looks at `target` from orbit `o` over the `days` from
 * Julian date `jd0` (D07, map §3 item 2): a look is a pass whose track comes
 * within `reach` of the place (`Reach`), and, with `daylightOnly`, while the
 * Sun is up there (an optical camera; a radar sees by night too).
 *
 * The brute force: the ground track (`groundTrack`) is walked at `step`; every
 * local minimum of the angle between the point below and the place that
 * could be within reach — the sampled angle no more than the reach plus what
 * the point below can move in one step — is refined by golden section to a
 * millisecond, and the place's signed distance from the track is read there,
 * where it is square to the track. The time of a look is good to some
 * hundredths of a second, not the millisecond: the Earth's turn is read from
 * a Julian date, which holds the time to 40 µs, so the ground moves under the
 * track in steps of up to 19 m, and for a place far off the track those steps
 * outweigh how little the distance changes near its closest. The walk runs
 * one step past each end of the window, so an approach at an edge is found;
 * a pass the step could skip would have to be over within one step, which at
 * a minute is shorter than any pass of a satellite above the air.
 */
export function revisitGaps(
  o: Orbit, target: GroundStation, reach: Reach, jd0: number, days: number, daylightOnly: boolean, opts: RevisitOptions = {},
): Revisit {
  if (!(days > 0) || !Number.isFinite(days)) throw new RangeError(`days must be more than 0 (got ${days})`);
  if (!(o.e >= 0 && o.e < 1)) throw new RangeError(`the orbit must be closed, 0 ≤ e < 1 (got ${o.e})`);
  const j2 = opts.j2 ?? true;
  const facts = orbitFacts(o, j2);
  const step = opts.step ?? Math.min(60, Math.min(facts.period, facts.nodalPeriod) / 60);
  if (!(step > 0) || !Number.isFinite(step)) throw new RangeError(`the step must be more than 0 s (got ${step})`);
  const minSun = opts.minSunElevation ?? 0;
  const periodic = !!opts.periodic;

  const p = unit(geodeticToEcef(target));
  const t0 = (jd0 - o.jd0) * DAY, span = days * DAY;
  const n = Math.max(2, Math.ceil(span / step));
  const dt = span / n;
  // the fastest the point below can move, rad/s: the perigee's angular rate, the node's drift and the Earth's turn
  const rp = o.a * (1 - o.e);
  const omegaMax = Math.sqrt(MU_EARTH * o.a * (1 - o.e * o.e)) / (rp * rp) + Math.abs(facts.raanDot) + OMEGA_EARTH;
  const gate = reachAngle(reach) + omegaMax * dt;
  const cosGate = gate >= Math.PI ? -1 : Math.cos(gate);

  // the walk: cos of the angle to the place, at t0 + j·dt for j = −1 … n + 1
  const count = n + 3;
  const c = new Float64Array(count);
  for (let j0 = 0; j0 < count; j0 += CHUNK) {
    const j1 = Math.min(count, j0 + CHUNK);
    const pts = groundTrack(o, t0 + (j0 - 1) * dt, t0 + (j1 - 2) * dt, j1 - j0, j2);
    for (let k = 0; k < pts.length; k++) {
      const q = pts[k], cl = Math.cos(q.lat);
      c[j0 + k] = cl * Math.cos(q.lon) * p.x + cl * Math.sin(q.lon) * p.y + Math.sin(q.lat) * p.z;
    }
  }

  const cosAt = (t: number): number => dot(below(o, t, j2), p);
  const looks: RevisitLook[] = [];
  let last = -Infinity;
  for (let j = 1; j < count - 1; j++) {
    if (!(c[j] >= c[j - 1] && c[j] > c[j + 1]) || c[j] < cosGate) continue;
    // golden section for the closest approach between the two neighbouring samples
    let a = t0 + (j - 2) * dt, b = t0 + j * dt;
    let x1 = b - PHI * (b - a), x2 = a + PHI * (b - a);
    let f1 = cosAt(x1), f2 = cosAt(x2);
    while (b - a > REFINE) {
      if (f1 < f2) { a = x1; x1 = x2; f1 = f2; x2 = a + PHI * (b - a); f2 = cosAt(x2); }
      else { b = x2; x2 = x1; f2 = f1; x1 = b - PHI * (b - a); f1 = cosAt(x1); }
    }
    const t = (a + b) / 2;
    if (t < t0 || (periodic ? t >= t0 + span : t > t0 + span)) continue;
    if (t - last < dt) continue; // the same approach found from two samples
    const u = below(o, t, j2), ahead = below(o, t + 0.5, j2), behind = below(o, t - 0.5, j2);
    const right = unit(cross(sub(ahead, behind), u));
    const across = R_EARTH * Math.atan2(dot(p, right), dot(p, u));
    if (!withinReach(across, reach)) continue;
    const jd = o.jd0 + t / DAY;
    const sunElevation = sunElevationAt(target, jd);
    if (daylightOnly && !(sunElevation > minSun)) continue;
    looks.push({ jd, across, ascending: ahead.z > behind.z, sunElevation });
    last = t;
  }

  const gaps: number[] = [];
  for (let k = 1; k < looks.length; k++) gaps.push(looks[k].jd - looks[k - 1].jd);
  // the window less the span of the looks: a difference of two nearby Julian dates is exact, so one look a
  // window gives exactly the window whatever its length (the window added to a date would round to 40 µs)
  if (periodic && looks.length > 0) gaps.push(days - (looks[looks.length - 1].jd - looks[0].jd));
  const maxGap = gaps.length ? Math.max(...gaps) : Infinity;
  const meanGap = !gaps.length ? Infinity : periodic ? days / looks.length : (looks[looks.length - 1].jd - looks[0].jd) / gaps.length;
  return {
    looks, gaps, maxGap, meanGap,
    firstAfter: looks.length ? looks[0].jd - jd0 : Infinity,
    lastBefore: looks.length ? jd0 + days - looks[looks.length - 1].jd : Infinity,
  };
}

/**
 * How long a repeat-ground-track orbit takes to fly its pattern once, days:
 * `revs` nodal periods, which is the `days` of its cycle counted as turns of
 * the Earth under the orbit's node, 2π/(ω⊕ − Ω̇) s each (`repeatOrbit`,
 * src/orbit/kepler.ts). Only a sun-synchronous node keeps pace with the Sun,
 * so only then is each turn a solar day; a 31/2 orbit at 51.6°, whose node
 * drifts west, repeats in 1.966 days, and a window of 2 would count half a
 * revolution twice. The window to give `revisitGaps` with `periodic`, and
 * `contactTime` for the orbit's own daily mean.
 */
export function repeatPeriod(o: Orbit, revs: number, j2 = true): number {
  if (!(Number.isInteger(revs) && revs >= 1)) throw new RangeError(`revs must be a whole number, 1 or more (got ${revs})`);
  return (revs * orbitFacts(o, j2).nodalPeriod) / DAY;
}

// ─── contact with the ground stations ───────────────────────────────────────

/** One station's pass, as heard: Julian dates (UTC), cut to the window. */
export interface ContactPass {
  /** the index of the station in the list given */
  station: number;
  from: number;
  to: number;
}

export interface Contact {
  /** every pass over every station above the minimum elevation, in time order */
  passes: ContactPass[];
  /** the time heard by at least one station over the window, s (two at once count once) */
  seconds: number;
  /** that time a day, s */
  perDay: number;
}

/** The elevation of orbit `o` seen from `station` at Julian date `jd`, rad: `stateAt` turned with the Earth by `gmst`, then `lookAngles`. */
export function elevationOf(o: Orbit, station: GroundStation, jd: number, j2 = true): number {
  const s = stateAt(o, (jd - o.jd0) * DAY, j2);
  return lookAngles(station, eciToEcef(s.r, s.theta)).elevation;
}

/**
 * How long `stations` hear orbit `o` above elevation `minEl` (rad) over the
 * `days` from Julian date `jd0` (D07, map §3: "contact minutes per day"): the
 * passes over each station found by `findPassesOf` on the Kepler orbit's
 * elevation, cut to the window, and merged across stations. Over one repeat
 * of a repeat-ground-track orbit's pattern (`repeatPeriod`, which is its
 * cycle's days only when it is sun-synchronous) the daily mean is the orbit's
 * own: a pass cut at the window's start is the pass cut at its end.
 */
export function contactTime(o: Orbit, stations: readonly GroundStation[], minEl: number, jd0: number, days: number, j2 = true): Contact {
  if (!(days > 0) || !Number.isFinite(days)) throw new RangeError(`days must be more than 0 (got ${days})`);
  const facts = orbitFacts(o, j2);
  const period = Math.min(facts.period, facts.nodalPeriod);
  const jd1 = jd0 + days;
  const passes: ContactPass[] = [];
  stations.forEach((st, k) => {
    for (const p of findPassesOf((jd) => elevationOf(o, st, jd, j2), period, jd0, jd1, minEl)) {
      passes.push({ station: k, from: p.rise ?? jd0, to: p.set ?? jd1 });
    }
  });
  passes.sort((a, b) => a.from - b.from || a.to - b.to);
  let heard = 0, from = -Infinity, to = -Infinity;
  for (const p of passes) {
    if (p.from > to) { if (to > from) heard += to - from; from = p.from; to = p.to; }
    else to = Math.max(to, p.to);
  }
  if (to > from) heard += to - from;
  const seconds = heard * DAY;
  return { passes, seconds, perDay: seconds / days };
}
