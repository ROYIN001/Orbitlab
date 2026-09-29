/**
 * Eclipses and the β angle (roadmap D06, docs/ROADMAP-PART2-3.md; Phase 4
 * map §2.2 A): how long a satellite spends in the Earth's shadow each
 * revolution, which sets the battery it needs and how much more the array
 * must make in sunlight to charge it (src/orbit/power.ts).
 *
 * The β angle is the Sun's elevation above the orbit plane. At β = 0 the
 * Sun lies in the plane and the satellite crosses the middle of the shadow,
 * the longest eclipse; as |β| grows the path through the shadow shortens,
 * and above β* = asin(R/(R + h)) it misses the shadow altogether. The node
 * drifts under J2 and the Sun moves along the ecliptic, so β, and with it
 * the eclipse, changes over a season: `worstEclipse` looks for the longest.
 *
 * Two ways to the same shadow, one to check the other:
 * - `eclipseFraction` / `eclipseDuration`, the closed form for a circular
 *   orbit (SMAD's, as reproduced in TU Delft's reader, App. H; Rickman,
 *   NASA TFAWS, slides 116–118), given h and β;
 * - `sampledEclipse`, which walks one revolution of any closed orbit along
 *   `stateAt` and asks `inSunlight` at each step, refining each edge by
 *   bisection.
 * tests/eclipse.test.ts holds the closed form to SMAD's table and TFAWS's
 * curve (V-E1, V-E2) and the sampled shadow to the closed form (V-E3).
 *
 * MODEL CHOICES (map risk R7): the Sun is `sunDirectionEci`
 * (src/physics/orbital.ts, the Astronomical Almanac's low-precision
 * formula) and the shadow `inSunlight`'s cylinder of radius `R_EARTH`
 * (src/orbit/passes.ts) — the pair held to Skyfield's ISS shadow edges
 * within ±3 s (tests/passes.test.ts). The closed form uses the same sphere
 * of radius `R_EARTH`. The shadow is the umbra of a Sun at infinity: no
 * penumbra (seconds at low altitude, Rickman TFAWS 2002), no oblateness,
 * no atmosphere.
 *
 * WHERE THE TWO PART. The closed form holds the Sun still and uses the
 * two-body period. The real shadow moves with the Sun (about 1° a day, the
 * way the satellite goes round) and, under J2, the plane turns under it:
 * the sampled eclipse is longer by about the eclipse × P/(1 year) — a third
 * of a second in low orbit, ten seconds at GEO — and J2 changes the rate of
 * the argument of latitude by about 0.1 % in low orbit (faster at the ISS's
 * 51.6°, slower sun-synchronous), the eclipse by as much the other way.
 * Both are real; the closed form is what the textbooks tabulate.
 *
 * DOM-free, SI units and radians inside.
 */
import { R_EARTH } from '../physics/constants';
import { planeNormal, sunDirectionEci } from '../physics/orbital';
import { dot } from '../physics/vec3';
import { orbitFacts, stateAt, type Orbit } from './kepler';
import { inSunlight } from './passes';
import type { EclipseCore, SampledEclipse, WorstEclipse } from './satellite-cores';

export type { SampledEclipse, WorstEclipse } from './satellite-cores';

const DAY = 86400;

// ─── the β angle ────────────────────────────────────────────────────────────

/**
 * The β angle at Julian date `jd`, rad, in [−π/2, π/2]: the Sun's elevation
 * above the orbit plane, positive when the Sun is on the side the orbit's
 * angular momentum points to (north of a prograde orbit; Rickman, TFAWS
 * 2023, slides 96–97). asin(ŝ · n̂), ŝ = `sunDirectionEci(jd)` and n̂ =
 * `planeNormal(i, Ω)` with the node Ω drifted to `jd` — by J2's secular rate
 * when `j2`, which is what makes β cycle over weeks in low orbit (D06).
 */
export function betaAngle(o: Orbit, jd: number, j2: boolean): number {
  const raan = stateAt(o, (jd - o.jd0) * DAY, j2).raan;
  const s = dot(sunDirectionEci(jd), planeNormal(o.i, raan));
  return Math.asin(Math.max(-1, Math.min(1, s)));
}

// ─── the closed form (circular orbits) ──────────────────────────────────────

/**
 * β*, rad: the β above which a circular orbit at altitude `h` (m) never
 * enters the cylindrical shadow, asin(R/(R + h)) — 70.03° at the ISS's
 * 408 km (Rickman, TFAWS 2023, slide 118: "none above about 70°"), 8.7° at
 * GEO, which is why a geostationary satellite sees eclipses only within
 * about three weeks of each equinox (D06).
 */
export function criticalBeta(h: number): number {
  if (!(h >= 0)) throw new RangeError(`the altitude must be 0 m or more (got ${h})`);
  return Math.asin(R_EARTH / (R_EARTH + h));
}

/**
 * The share of a circular orbit at altitude `h` (m) spent in the Earth's
 * cylindrical shadow at β (rad), 0–1 (D06, V-E1, V-E2):
 *
 *   f = (1/π)·acos(√(h² + 2Rh) / ((R + h)·cos β))   while |β| < β*,
 *   f = 0                                            otherwise.
 *
 * SMAD's form, as reproduced in TU Delft's reader (App. H) and derived on
 * Rickman's TFAWS slides 116–117 (the entry angle θ from orbit noon has
 * sin θ = √((R/(R+h))² − sin²β)/cos β, and the shadowed arc is 2(π − θ);
 * the two forms are the same). At h = 0 it is one half — the ground's own
 * night at the equinox. Circular orbits only: for an ellipse use
 * `sampledEclipse`.
 */
export function eclipseFraction(h: number, beta: number): number {
  const bStar = criticalBeta(h);
  if (!(Math.abs(beta) < bStar)) {
    if (Number.isNaN(beta)) throw new RangeError('β must be a number');
    return 0;
  }
  const r = R_EARTH + h;
  const x = Math.sqrt(h * h + 2 * R_EARTH * h) / (r * Math.cos(beta));
  return Math.acos(Math.min(1, x)) / Math.PI;
}

/** The two-body period of a circular orbit at altitude `h` (m), s: `orbitFacts(…).period`, so the number is computed one way only. */
export function circularPeriod(h: number): number {
  return orbitFacts({ a: R_EARTH + h, e: 0, i: 0, raan: 0, argp: 0, m0: 0, jd0: 0 }, false).period;
}

/**
 * The eclipse of a circular orbit at altitude `h` (m) and β (rad), s:
 * `eclipseFraction` × the two-body period — the "max eclipse" column of
 * SMAD's Earth Satellite Parameters table at β = 0 (V-E1): 36.11 min at
 * 400 km, 35.29 min at 700 km, 69.41 min at GEO.
 */
export function eclipseDuration(h: number, beta: number): number {
  return eclipseFraction(h, beta) * circularPeriod(h);
}

// ─── the shadow sampled (any closed orbit) ──────────────────────────────────

/** Edges are bisected until they are this well placed, s. */
const EDGE_TOLERANCE = 1e-3;

/**
 * The shadow over the revolution that starts at `jd` (D06, V-E3): the orbit
 * walked every `step` s or less along `stateAt`, `inSunlight` asked at each
 * point, and each change from light to shadow or back refined by bisection
 * to 1 ms, so the answer does not depend on the step — except that a shadow
 * shorter than `step` can fall between two samples and be missed.
 *
 * Any eccentricity below 1, which is what the closed form cannot do: an
 * ellipse's eclipse depends on where the perigee is. The revolution is the
 * nodal period (the argument of latitude going once round) with `j2`, the
 * two-body period without; the fraction is the shadow over it. `j2` is on
 * unless asked, as the app's orbits are J2 mean elements; V-E3 turns it off
 * to compare with the two-body closed form.
 */
export function sampledEclipse(o: Orbit, jd: number, step: number, j2 = true): SampledEclipse {
  if (!(o.e >= 0 && o.e < 1)) throw new RangeError(`the orbit must be closed, 0 ≤ e < 1 (got ${o.e})`);
  if (!(step > 0) || !Number.isFinite(step)) throw new RangeError(`the step must be more than 0 s (got ${step})`);
  const period = orbitFacts(o, j2).nodalPeriod;
  const t0 = (jd - o.jd0) * DAY;
  const lit = (t: number): boolean => inSunlight(stateAt(o, t, j2).r, o.jd0 + t / DAY);
  // equal steps no longer than `step`, the last one ending exactly a revolution on
  const n = Math.max(1, Math.ceil(period / step));
  let dark = 0, ta = t0, la = lit(t0);
  for (let k = 1; k <= n; k++) {
    const tb = t0 + (period * k) / n, lb = lit(tb);
    if (!la && !lb) dark += tb - ta;
    else if (la !== lb) {
      let lo = ta, hi = tb;
      while (hi - lo > EDGE_TOLERANCE) {
        const mid = (lo + hi) / 2;
        if (lit(mid) === la) lo = mid;
        else hi = mid;
      }
      const edge = (lo + hi) / 2;
      dark += la ? tb - edge : edge - ta;
    }
    ta = tb;
    la = lb;
  }
  return { duration: dark, fraction: dark / period };
}

// ─── the worst of a season ──────────────────────────────────────────────────

/** Samples a revolution is walked in for the season's sweep: 1° of mean motion. */
const SWEEP_SAMPLES = 360;
/** The sweep's spacing, days. */
const SWEEP_DAYS = 1;
/** The golden ratio's conjugate, for the refining search. */
const PHI = (Math.sqrt(5) - 1) / 2;

/**
 * The longest eclipse over the `days` from `jd0` (D06): the shadow sampled
 * one revolution a day (`sampledEclipse`, with J2, so any eccentricity),
 * as β sweeps with the node's drift and the Sun's motion; then the day
 * either side of the longest searched by golden section to a minute. Its
 * `jd` is the start of that revolution, and `beta` the β half a revolution
 * later, in the middle of it.
 *
 * The sweep walks each revolution in 1° steps of mean motion, so an eclipse
 * shorter than that (15 s in low orbit) can be missed; for the worst case
 * this matters only when every eclipse of the season is that short. For a
 * circular orbit the answer is the closed form at the smallest |β| of the
 * season, lengthened by the Sun's motion (see the module's note):
 * tests/eclipse.test.ts holds it to that at the ISS's orbit and at GEO.
 */
export function worstEclipse(o: Orbit, jd0: number, days: number): WorstEclipse {
  if (!(days >= 0) || !Number.isFinite(days)) throw new RangeError(`days must be 0 or more (got ${days})`);
  const period = orbitFacts(o, true).nodalPeriod;
  const step = period / SWEEP_SAMPLES;
  const at = (jd: number): number => sampledEclipse(o, jd, step, true).duration;
  const n = Math.max(1, Math.ceil(days / SWEEP_DAYS));
  let best = jd0, bestD = at(jd0);
  for (let k = 1; k <= n; k++) {
    const jd = jd0 + (days * k) / n, d = at(jd);
    if (d > bestD) { best = jd; bestD = d; }
  }
  if (bestD > 0 && days > 0) {
    // golden section over the neighbouring samples, to a minute
    const half = days / n;
    let a = Math.max(jd0, best - half), b = Math.min(jd0 + days, best + half);
    let c = b - PHI * (b - a), d = a + PHI * (b - a);
    let fc = at(c), fd = at(d);
    while (b - a > 60 / DAY) {
      if (fc > fd) { b = d; d = c; fd = fc; c = b - PHI * (b - a); fc = at(c); }
      else { a = c; c = d; fc = fd; d = a + PHI * (b - a); fd = at(d); }
    }
    const mid = (a + b) / 2, dm = at(mid);
    if (dm > bestD) { best = mid; bestD = dm; }
  }
  return { jd: best, beta: betaAngle(o, best + period / 2 / DAY, true), fraction: bestD / period, duration: bestD };
}

/** The module against its contract (src/orbit/satellite-cores.ts). */
export const eclipseCore = { betaAngle, eclipseFraction, eclipseDuration, sampledEclipse, worstEclipse } satisfies EclipseCore;
