/**
 * Computed payload ratings (roadmap D03, D04; the Phase 3 map, question 7): the
 * heaviest payload a vehicle is found to deliver to its rating orbits, LEO
 * and GTO, by flying it. ESTIMATES, labelled as such wherever they are shown:
 * they are this model's capability, not a manufacturer's figure.
 *
 * A custom vehicle's typed `payloadLEO` / `payloadGTO` are whatever its
 * designer typed (or its origin's, for a remix), and the pre-flight verdict
 * trusts them. These are measured instead, so the builder can write them into
 * the design (`PartsDesign.ratings`, src/design/assemble.ts).
 *
 * THE RATING ORBITS are the catalogue's own:
 * - LEO: the vehicle's (or its origin's, `vehicleDataId`) `RATING_ORBITS` LEO
 *   entry in src/data/vehicles.ts where it has one — Soyuz-2's 240 km at
 *   51.6° from Baikonur, Long March 2D's 200 km at 41° from Jiuquan — and
 *   otherwise the fleet-wide convention the catalogue states for
 *   `payloadLEO` (Vega-C's entry: "the capability to a LOW (about 200 km)
 *   reference orbit"): 200 km circular at the site's lowest inclination, from
 *   the vehicle's first site.
 * - GTO: the `RATING_ORBITS` GTO entry if one is ever added, else the orbit
 *   the fleet grades `payloadGTO` against (tests/fleet-harness.ts, the `gto`
 *   preset): 250 × 35 786 km at the site's lowest inclination, from the first
 *   site.
 *
 * WHAT "DELIVERS" MEANS: at payload m,
 * 1. the setup panel's own verdict (`missionVerdict`, src/config/verdict.ts)
 *    on that orbit, with the insertion probe (`probeInsertion`,
 *    src/physics/autotune.ts) always flown, is not a failure. The rating the
 *    verdict would check the payload against is set to m itself, so no typed
 *    rating takes part; what is left is exactly what the verdict fails a
 *    flyable mission for: a single-shot stack short of the orbit on paper,
 *    one stranded below it, post-ascent burns beyond the stack's Δv, and a
 *    probe flight that does not reach orbit;
 * 2. and the Δv the launcher has left where the probe stopped
 *    (`InsertionProbe.dvLeft`) covers the burns the plan still asks for
 *    (`dvEstimateBurns`), for a stack that can light again.
 * Why the second: the probe stops at the first orbit above the insertion
 * floor, which on the way to GTO is the parking orbit, and the verdict's burn
 * budget is a bound that counts the whole last stage as still full after the
 * ascent. With the first alone, Falcon 9's GTO rating came out 2.05 times its
 * published one and Ariane 64's 2.29 times — about what each lifts to LEO
 * (recorded in tests/design-ratings.test.ts). The burns are counted as the
 * planner counts them, impulsive, so a low-thrust kick stage's rating is
 * still on the generous side.
 *
 * THE SEARCH is a bisection on the payload between 0 and a physical ceiling:
 * the payload at which the vehicle's ideal Δv (`idealDeltaV`) equals the
 * orbit's perigee speed less the Earth's rotation credit, i.e. with no loss at
 * all — no flight is needed to know nothing heavier flies. It stops when the
 * bracket is within `resolution` of the ceiling, or at the time budget or the
 * flight budget, and says which (`converged`, `stoppedBy`) and how many probe
 * flights it took. The rating is the bracket's lower end: a payload that was
 * flown and delivered. It assumes delivery is monotone in payload, which is
 * how every vehicle in the fleet matrix behaves; a design that is not would
 * give a lower end that still flew.
 *
 * Cost: 7–95 ms a probe flight (`probeInsertion`), about 8–10 flights a
 * rating at the default resolution; tests/design-ratings.test.ts records its
 * own runtime.
 *
 * DOM-free except for the verdict's text, which it builds and discards. SI.
 */
import type { MissionConfig, OrbitSpec, VehicleSpec } from '../types';
import { RATING_ORBITS, isCatalogueVehicle, vehicleById, vehicleDataId } from '../data/vehicles';
import { orbitById } from '../data/orbits';
import { siteById } from '../data/sites';
import { satelliteById } from '../data/satellites';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../physics/defaults';
import { DEG, R_EARTH, RAD } from '../physics/constants';
import { inertialLaunchAzimuth, visViva } from '../physics/orbital';
import { ascentInclinationFor, earthRotationCredit, launchDirection, planMission, resolveTarget, type MissionPlan } from '../physics/mission';
import { idealDeltaV } from '../physics/vehicle';
import { probeInsertion } from '../physics/autotune';
import { missionVerdict } from '../config/verdict';

export type RatingClass = 'LEO' | 'GTO';

export interface RatingOrbitRef {
  rating: RatingClass;
  orbit: OrbitSpec;
  siteId: string;
  /** where the orbit comes from: the vehicle's `RATING_ORBITS` entry, or the fleet's convention */
  from: 'ratingOrbits' | 'convention';
}

export interface ComputedRating {
  /** the heaviest payload flown and delivered, kg (0 when even an empty stack is not delivered) — an estimate */
  kg: number;
  /** the bracket's upper end: the lightest payload found not to deliver, or the ceiling, kg */
  failsAtKg: number;
  /** the no-loss ceiling the search started from, kg */
  ceilingKg: number;
  orbit: RatingOrbitRef;
  /** probe flights flown for this rating */
  flights: number;
  /** the bracket closed to the resolution */
  converged: boolean;
  /** what stopped it before it converged */
  stoppedBy?: 'timeBudget' | 'flightBudget';
  /** the verdict's cause at `failsAtKg`, when a payload was found not to deliver */
  failCause?: string;
}

export interface ComputedRatings {
  payloadLEO: ComputedRating;
  payloadGTO: ComputedRating;
  /** probe flights in all */
  flights: number;
  /** wall time, ms */
  elapsedMs: number;
  /** always true: these are the model's figures, not published ones */
  estimate: true;
}

export interface RatingOptions {
  /** wall-time budget for both ratings, ms (default 8 000) */
  timeBudgetMs?: number;
  /** probe flights allowed for both ratings (default 40) */
  maxFlights?: number;
  /** stop when the bracket is narrower than this fraction of the ceiling (default 0.005) */
  resolution?: number;
  /** the clock, ms (default `performance.now`) */
  now?: () => number;
  /** the launch date, for the flights (default 2026-09-15 12:00 UTC, the fleet tests') */
  launchTime?: Date;
}

const DEFAULT_LAUNCH = new Date(Date.UTC(2026, 8, 15, 12, 0, 0));
/** The fleet-wide convention for `payloadLEO`: about 200 km (Vega-C's entry in src/data/vehicles.ts). */
export const CONVENTION_LEO_ALTITUDE = 200e3;

/** The orbits a vehicle's ratings are measured to (the module comment says which and why). */
export function ratingOrbits(spec: VehicleSpec): { LEO: RatingOrbitRef; GTO: RatingOrbitRef } {
  const refs = RATING_ORBITS[vehicleDataId(spec)] ?? [];
  // the orbit preset a user sets by hand, with these numbers: no name of its own to translate
  const custom = orbitById('custom');
  const from = (rating: RatingClass): RatingOrbitRef | null => {
    const r = refs.find((o) => o.rating === rating);
    return r ? {
      rating, siteId: r.siteId, from: 'ratingOrbits',
      orbit: { ...custom, perigee: r.perigeeKm * 1e3, apogee: r.apogeeKm * 1e3, inclination: r.inclinationDeg, argPerigee: 0, raanMode: 'free' },
    } : null;
  };
  const site = spec.sites[0];
  const gto = orbitById('gto');
  return {
    LEO: from('LEO') ?? { rating: 'LEO', siteId: site, from: 'convention',
      orbit: { ...custom, perigee: CONVENTION_LEO_ALTITUDE, apogee: CONVENTION_LEO_ALTITUDE, inclination: 'site', argPerigee: 0, raanMode: 'free' } },
    GTO: from('GTO') ?? { rating: 'GTO', siteId: site, from: 'convention', orbit: { ...gto, raanMode: 'free' } },
  };
}

/**
 * Whether `spec` delivers `payloadKg` to `ref`: the verdict, with the probe,
 * is not a failure. `flew` is whether a probe flight was needed.
 */
export function delivers(spec: VehicleSpec, ref: RatingOrbitRef, payloadKg: number, launchTime = DEFAULT_LAUNCH): { ok: boolean; flew: boolean; cause: string } {
  // The rating the verdict compares with is the payload itself: no typed
  // rating takes part. Every class's, because the verdict files the orbit by
  // its own reading (`orbitClassOf`), not by `ref.rating`: a LEO rating orbit
  // at 95° or more is "sso" to it, and would be capped by a typed payloadSSO.
  const cap = Math.max(1, payloadKg);
  const rated: VehicleSpec = { ...spec, payloadLEO: cap, payloadGTO: cap, ...(spec.payloadSSO !== undefined ? { payloadSSO: cap } : {}) };
  const site = siteById(ref.siteId);
  // A catalogue entry flies as itself; anything else inline, as a custom vehicle does.
  const catalogue = isCatalogueVehicle(spec.id) && vehicleById(spec.id) === spec;
  const satellite = satelliteById('cubesats');
  const cfg: MissionConfig = {
    vehicleId: spec.id, ...(catalogue ? {} : { vehicleSpec: spec }),
    satelliteId: 'cubesats', siteId: ref.siteId, orbit: ref.orbit, launchTime,
    guidance: guidanceForVehicle(spec, DEFAULT_GUIDANCE, 'pointMass'), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: payloadKg,
    dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 },
  };
  let plan: MissionPlan | null = null;
  try { plan = planMission(cfg, site, spec); } catch { plan = null; }
  const inclinationDeg = resolveTarget(ref.orbit, site, launchTime).inclination * RAD;
  const verdictWith = (insertion: ReturnType<typeof probeInsertion> | null) => missionVerdict({
    spec: rated, site, orbit: ref.orbit, satellite,
    payloadMass: payloadKg, inclinationDeg, plan, insertion, failureMode: 'none', siteReassigned: false,
  });
  // The static verdict first: a stack it already fails needs no flight.
  const statically = verdictWith(null);
  if (statically.level === 'fail') return { ok: false, flew: false, cause: statically.cause };
  const insertion = probeInsertion(cfg);
  const flown = verdictWith(insertion);
  if (flown.level === 'fail') return { ok: false, flew: true, cause: flown.cause };
  // After the insertion: what the stack has left must cover the burns the
  // plan still asks for. Only a stack that can light again has any (the
  // verdict's own rule, `missionCapability`); the rating payload is inert.
  if (plan && plan.dvEstimateBurns > 0) {
    const last = spec.stages[spec.stages.length - 1];
    const relights = plan.weakFinalStage || last.restartable === true;
    if ((relights ? insertion.dvLeft : 0) < plan.dvEstimateBurns) return { ok: false, flew: true, cause: 'burnsAfterInsertion' };
  }
  return { ok: true, flew: true, cause: flown.cause };
}

/** The payload at which ideal Δv equals the orbit's perigee speed less the rotation credit: nothing heavier can fly, kg. */
function ceiling(spec: VehicleSpec, ref: RatingOrbitRef, launchTime: Date): number {
  const site = siteById(ref.siteId);
  const target = resolveTarget(ref.orbit, site, launchTime);
  const { inc } = ascentInclinationFor(target, site);
  const lat = site.latitude * DEG;
  const vRot = earthRotationCredit(lat, inertialLaunchAzimuth(lat, inc, launchDirection(site, inc).descending) ?? Math.PI / 2);
  const rp = R_EARTH + target.perigee;
  const need = visViva(rp, (rp + R_EARTH + target.apogee) / 2) - vRot;
  if (idealDeltaV(spec, 0) < need) return 0;
  let lo = 0;
  let hi = 1000;
  while (idealDeltaV(spec, hi) >= need && hi < 1e7) { lo = hi; hi *= 2; }
  for (let k = 0; k < 60 && hi - lo > 1; k++) {
    const mid = (lo + hi) / 2;
    if (idealDeltaV(spec, mid) >= need) lo = mid;
    else hi = mid;
  }
  return hi;
}

/**
 * The vehicle's LEO and GTO ratings, computed by flying it (see the module
 * comment). Estimates; `flights` and `elapsedMs` say what they cost.
 */
export function computedRatings(spec: VehicleSpec, opts: RatingOptions = {}): ComputedRatings {
  const now = opts.now ?? (() => performance.now());
  const t0 = now();
  const budget = opts.timeBudgetMs ?? 8000;
  const maxFlights = opts.maxFlights ?? 40;
  const resolution = opts.resolution ?? 0.005;
  const launchTime = opts.launchTime ?? DEFAULT_LAUNCH;
  const orbits = ratingOrbits(spec);
  let flights = 0;
  const rate = (ref: RatingOrbitRef): ComputedRating => {
    const ceil = ceiling(spec, ref, launchTime);
    let used = 0;
    let lo = 0;
    let hi = ceil;
    let emptyDelivered = false;
    let failCause: string | undefined;
    const result = (converged: boolean, stoppedBy?: ComputedRating['stoppedBy']): ComputedRating => ({
      kg: emptyDelivered ? Math.floor(lo) : 0, failsAtKg: hi, ceilingKg: ceil, orbit: ref, flights: used, converged,
      ...(stoppedBy ? { stoppedBy } : {}), ...(failCause ? { failCause } : {}),
    });
    const outOfBudget = (): ComputedRating['stoppedBy'] | null =>
      (now() - t0 > budget ? 'timeBudget' : flights >= maxFlights ? 'flightBudget' : null);
    const tryAt = (m: number) => {
      const r = delivers(spec, ref, m, launchTime);
      if (r.flew) { used++; flights++; }
      return r;
    };
    if (ceil <= 0) return result(true);
    // The empty stack first: if even that is not delivered, the rating is 0.
    let stop = outOfBudget();
    if (stop) return result(false, stop);
    const empty = tryAt(0);
    if (!empty.ok) {
      hi = 0;
      failCause = empty.cause;
      return result(true);
    }
    emptyDelivered = true;
    while (hi - lo > resolution * ceil) {
      stop = outOfBudget();
      if (stop) return result(false, stop);
      const mid = (lo + hi) / 2;
      const r = tryAt(mid);
      if (r.ok) lo = mid;
      else { hi = mid; failCause = r.cause; }
    }
    return result(true);
  };
  const payloadLEO = rate(orbits.LEO);
  const payloadGTO = rate(orbits.GTO);
  return { payloadLEO, payloadGTO, flights, elapsedMs: now() - t0, estimate: true };
}
