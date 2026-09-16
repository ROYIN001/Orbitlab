/**
 * Mission planning: resolves the target orbit, computes launch azimuth,
 * parking-orbit altitude, the post-ascent burn sequence and launch windows.
 */
import type { MissionConfig, OrbitSpec, SatelliteSpec, VehicleSpec } from '../types';
import type { SiteExtra } from '../data/sites';
import { satelliteById } from '../data/satellites';
import { DEG, R_EARTH, OMEGA_EARTH, SIDEREAL_DAY } from './constants';
import { VehicleModel } from './vehicle';
import {
  circularSpeed, visViva, inertialLaunchAzimuth, rotatingLaunchAzimuth, sunSyncInclination,
  raanFromLaunch, gmst, julianDate, sunRightAscension, nodalPrecessionRate, wrap2pi, wrapPi,
} from './orbital';

export interface ResolvedTarget {
  perigee: number;
  apogee: number;
  a: number;
  e: number;
  /** rad */
  inclination: number;
  /** rad */
  argp: number;
  /** desired RAAN, rad, or null if unconstrained */
  raan: number | null;
  raanMode: OrbitSpec['raanMode'];
}

export type BurnKind = 'raiseApoapsis' | 'shapeAtApoapsis' | 'circularize';

export interface BurnPlan {
  id: string;
  kind: BurnKind;
  /** where to burn for raiseApoapsis: argument of latitude (rad), the nearest node, or as soon as possible */
  atU: number | 'node' | 'asap';
  targetApoapsis?: number;
  targetPeriapsis?: number;
  targetInclination?: number;
  dvEstimate: number;
  done: boolean;
  /** planned maximum duration of the current pass, s (set when scheduled) */
  maxDuration?: number;
  /** apoapsis adjustment burns: true when the apoapsis has to come down (retrograde) */
  lowering?: boolean;
}

export interface MissionPlan {
  target: ResolvedTarget;
  /** inclination flown during ascent, rad */
  ascentInclination: number;
  descending: boolean;
  azimuthInertial: number;
  azimuthRotating: number;
  insertionAltitude: number;
  /** apoapsis of the insertion orbit (== insertionAltitude for a circular parking orbit) */
  insertionApoapsis: number;
  /** the final stage is a low-thrust kick stage: insert into an ellipse and circularise at apogee */
  weakFinalStage: boolean;
  burns: BurnPlan[];
  launchTime: Date;
  jd0: number;
  gmst0: number;
  raanExpected: number;
  /** plane change performed at apogee, deg */
  planeChangeDeg: number;
  /** whether the target inclination is directly reachable from the site */
  inclinationReachable: boolean;
  dvEstimateBurns: number;
}

/** ISS reference plane (approximate): RAAN at epoch and J2 regression. */
const ISS_EPOCH = Date.UTC(2026, 0, 1, 0, 0, 0);
const ISS_RAAN0 = 200 * DEG;
const ISS_A = R_EARTH + 420e3;
const ISS_INC = 51.64 * DEG;

export function issRaanAt(date: Date): number {
  const rate = nodalPrecessionRate(ISS_A, 0.0005, ISS_INC); // rad/s (negative)
  const dt = (date.getTime() - ISS_EPOCH) / 1000;
  return wrap2pi(ISS_RAAN0 + rate * dt);
}

/** RAAN for a given local time of ascending node (hours) at a date. */
export function raanFromLtan(date: Date, ltanHours: number): number {
  const alphaSun = sunRightAscension(julianDate(date));
  return wrap2pi(alphaSun + (ltanHours - 12) * 15 * DEG);
}

export function resolveInclination(orbit: OrbitSpec, site: SiteExtra): number {
  const a = R_EARTH + (orbit.perigee + orbit.apogee) / 2;
  if (orbit.inclination === 'sso') return sunSyncInclination(a, Math.abs(orbit.apogee - orbit.perigee) / (2 * a));
  if (orbit.inclination === 'site') return site.minInclination * DEG;
  return orbit.inclination * DEG;
}

export function resolveTarget(orbit: OrbitSpec, site: SiteExtra, launchTime: Date): ResolvedTarget {
  const perigee = Math.min(orbit.perigee, orbit.apogee);
  const apogee = Math.max(orbit.perigee, orbit.apogee);
  const rp = R_EARTH + perigee;
  const ra = R_EARTH + apogee;
  const a = (rp + ra) / 2;
  const e = (ra - rp) / (ra + rp);
  const inclination = resolveInclination(orbit, site);
  let raan: number | null = null;
  switch (orbit.raanMode) {
    case 'fixed': raan = (orbit.raan ?? 0) * DEG; break;
    case 'iss': raan = issRaanAt(launchTime); break;
    case 'ltan': raan = raanFromLtan(launchTime, orbit.ltan ?? 10.5); break;
    default: raan = null;
  }
  return { perigee, apogee, a, e, inclination, argp: orbit.argPerigee * DEG, raan, raanMode: orbit.raanMode };
}

/** Lowest inclination the site can reach directly (prograde), rad. */
export function ascentInclinationFor(target: ResolvedTarget, site: SiteExtra): { inc: number; reachable: boolean } {
  const lat = Math.abs(site.latitude) * DEG;
  const it = target.inclination;
  if (it <= Math.PI / 2) {
    const minInc = Math.max(site.minInclination * DEG, lat + 0.05 * DEG);
    return { inc: Math.max(it, minInc), reachable: it >= minInc - 1e-6 };
  }
  const maxInc = Math.PI - lat - 0.05 * DEG;
  return { inc: Math.min(it, maxInc), reachable: it <= maxInc + 1e-6 };
}

export function insertionAltitudeFor(target: ResolvedTarget): number {
  return target.perigee <= 300e3 ? target.perigee : 200e3;
}

/** Apsis error below which a correction burn is not worth flying, m. */
export const APOAPSIS_TOLERANCE = 8e3;

/**
 * Highest apoapsis a launcher will fly straight out of the ascent instead of
 * reaching it with a separate transfer burn.
 */
export const DIRECT_APOAPSIS_CAP = 2000e3;

/**
 * Highest circular orbit the ascent is aimed straight at when nothing can burn
 * after cut-off, m. A stage that burns continuously into a circular orbit much
 * above this arrives with its apoapsis already past the target (measured, see
 * the note in `planMission`), so above it the launcher is aimed at a transfer
 * orbit instead.
 */
export const DIRECT_INSERTION_CEILING = 300e3;

/** Apoapsis of the insertion ellipse a kick stage is handed (capped). */
export function insertionApoapsisFor(target: ResolvedTarget, hIns: number): number {
  return Math.max(hIns, Math.min(target.apogee, DIRECT_APOAPSIS_CAP));
}

/**
 * Direction-independent estimate of the post-ascent burn sequence to go from an
 * insertion orbit hIns × haIns at inclination `ascentInc` to the target orbit.
 *
 * `haIns` may be above or below the target apoapsis: an overshoot (the ascent
 * cut off late, or the apoapsis guard fired) is corrected by the same burn with
 * a retrograde impulse, which is why the burn kind is `raiseApoapsis` in both
 * cases.
 */
export function planBurns(target: ResolvedTarget, ascentInc: number, hIns: number, haIns = hIns, incTol = 0.05 * DEG): BurnPlan[] {
  const burns: BurnPlan[] = [];
  const rIns = R_EARTH + hIns;
  const rA = R_EARTH + target.apogee;
  const rP = R_EARTH + target.perigee;
  const needPlane = Math.abs(target.inclination - ascentInc) > incTol;
  const circularTarget = Math.abs(target.apogee - target.perigee) < 1e3;
  const aIns = (rIns + R_EARTH + haIns) / 2;
  let vAtApo = visViva(R_EARTH + haIns, aIns);
  let rApo = R_EARTH + haIns;
  // Apoapsis adjustment at periapsis. Needed when the target apoapsis is above
  // the insertion apoapsis, and also when the insertion apoapsis overshot the
  // target by more than the tolerance (then the burn is retrograde).
  // The threshold matches the accuracy the mission is judged on (about 2 % or
  // 10 km): chasing a smaller error costs more than it buys and, on a nearly
  // circular orbit, there is no well-defined periapsis to burn at.
  const apoMismatch = target.apogee - haIns;
  if (Math.abs(apoMismatch) > Math.max(APOAPSIS_TOLERANCE, 0.018 * target.apogee)) {
    const aT = (rIns + rA) / 2;
    const dv = Math.abs(visViva(rIns, aT) - visViva(rIns, aIns));
    burns.push({
      id: 'raise', kind: 'raiseApoapsis',
      atU: needPlane ? 'node' : circularTarget ? 'asap' : target.argp,
      targetApoapsis: target.apogee, dvEstimate: dv, done: false,
    });
    vAtApo = visViva(rA, aT);
    rApo = rA;
  }
  // The periapsis is judged on the same accuracy the mission is judged on as
  // the apoapsis above. Chasing a 5 km shortfall costs a whole revolution —
  // the burn is flown at the apoapsis — for a correction the target tolerance
  // does not ask for, which is how a mission that inserted on target ended up
  // deploying its payload 45 minutes later than it had to.
  const peTol = Math.max(APOAPSIS_TOLERANCE, 0.018 * target.perigee);
  if (target.perigee > hIns + peTol || needPlane) {
    const aF = (rApo + rP) / 2;
    const v2 = visViva(rApo, aF);
    const di = target.inclination - ascentInc;
    const dv = Math.sqrt(Math.max(0, vAtApo * vAtApo + v2 * v2 - 2 * vAtApo * v2 * Math.cos(di)));
    burns.push({
      id: 'shape', kind: 'shapeAtApoapsis', atU: 0,
      targetPeriapsis: target.perigee, targetInclination: target.inclination, dvEstimate: dv, done: false,
    });
  }
  // A trim that has to bring the apoapsis *down* is flown at the periapsis. If
  // the periapsis still has to be raised as well, raising it first is half a
  // revolution closer than waiting for the current, low periapsis to come round
  // again — so the shape burn goes first in that case.
  if (burns.length === 2 && apoMismatch < 0) burns.reverse();
  return burns;
}

/**
 * Re-plan the remaining burns from an orbit that was actually achieved. Called
 * after every cut-off so that a short, long or lofted ascent is corrected by
 * the following burns instead of flying a plan that was made before liftoff.
 */
export function replanBurns(target: ResolvedTarget, el: { periapsisAlt: number; apoapsisAlt: number; i: number }): BurnPlan[] {
  if (!isFinite(el.apoapsisAlt)) return [];
  // A plane error smaller than the accuracy the mission is judged on is not
  // worth a burn — and near the equator the closest reachable plane through the
  // current position may not even be the target inclination, so such a burn
  // would be a no-op that the re-planner then schedules again forever.
  return planBurns(target, el.i, el.periapsisAlt, Math.max(el.periapsisAlt, el.apoapsisAlt), 0.25 * DEG);
}

/**
 * Whether the launch azimuth needed for `inc` lies inside the site's
 * range-safety window. `minInclination` only constrains prograde launches, so
 * this is what decides whether a site can fly a retrograde (sun-synchronous)
 * mission at all.
 */
export function azimuthAllowedFor(site: SiteExtra, inc: number): boolean {
  const lat = site.latitude * DEG;
  const descending = inc > 75 * DEG ? site.descendingForPolar : false;
  const vOrb = circularSpeed(R_EARTH + 300e3);
  const az = rotatingLaunchAzimuth(lat, inc, vOrb, descending);
  if (az === null) return false;
  const deg = ((az / DEG) % 360 + 360) % 360;
  const lo = ((site.azimuthMin % 360) + 360) % 360;
  const hi = ((site.azimuthMax % 360) + 360) % 360;
  return lo <= hi ? deg >= lo && deg <= hi : deg >= lo || deg <= hi;
}

/**
 * Whether anything at all can light an engine after the ascent cuts off: the
 * stage that flies the ascent restarts, a kick stage sits above it, or the
 * spacecraft carries its own propulsion.
 *
 * This is the plan-time counterpart of `Simulation.canReigniteAfterCutoff`, and
 * it decides the shape of the insertion orbit: a stack that cannot burn again
 * has to be aimed at the orbit the mission actually wants, because the orbit it
 * is in at cut-off is final. Soyuz-2.1a with an inert payload is exactly that
 * case — aiming it at a 200 km parking orbit leaves it sitting there with
 * kilometres per second of Blok I propellant and no way to spend it.
 */
export function canBurnAfterAscent(vehicle: VehicleSpec, satellite: SatelliteSpec, weakFinalStage: boolean): boolean {
  if (weakFinalStage) return true;
  const last = vehicle.stages[vehicle.stages.length - 1];
  if (last.restartable) return true;
  const p = satellite.propulsion;
  return !!p && p.propellantFraction > 0 && p.thrust > 0;
}

export function planMission(cfg: MissionConfig, site: SiteExtra, _vehicle: VehicleSpec): MissionPlan {
  const target = resolveTarget(cfg.orbit, site, cfg.launchTime);
  const { inc: ascentInclination, reachable } = ascentInclinationFor(target, site);
  const descending = ascentInclination > 75 * DEG ? site.descendingForPolar : false;
  const lat = site.latitude * DEG;
  const parkingOverride = cfg.guidance.parkingAltitude > 0 ? cfg.guidance.parkingAltitude : 0;
  const azimuthInertial = inertialLaunchAzimuth(lat, ascentInclination, descending) ?? Math.PI / 2;
  const jd0 = julianDate(cfg.launchTime);
  const gmst0 = gmst(jd0);
  const raanExpected = raanFromLaunch(lat, site.longitude * DEG + gmst0, ascentInclination, descending);
  // A final stage that cannot even hold altitude near orbital speed (Fregat, Briz-M,
  // Curie...) is treated as an orbital-manoeuvring stage: the strong stages insert
  // into an ellipse whose apogee is the target (capped) and the kick stage finishes.
  const last = _vehicle.stages[_vehicle.stages.length - 1];
  const payload = cfg.payloadMassOverride ?? 0;
  const lastMass = last.dryMass + last.propellantMass + payload + 1500;
  const aLast = (last.engine.count * last.engine.thrustVac) / lastMass;
  const weakFinalStage = _vehicle.stages.length > 1 && aLast < 1.6;
  const restartable = canBurnAfterAscent(_vehicle, satelliteById(cfg.satelliteId), weakFinalStage);
  // Ideal delta-v of the stages that have to deliver the perigee speed of the
  // insertion orbit: everything except a final stage too weak to fly the ascent
  // (Fregat, Briz-M, Curie...), which is an orbital-manoeuvring stage instead.
  const strongSpec = weakFinalStage ? { ..._vehicle, stages: _vehicle.stages.slice(0, -1) } : _vehicle;
  const carried = weakFinalStage ? last.dryMass + last.propellantMass : 0;
  const dvStrong = new VehicleModel(strongSpec, payload + carried, cfg.boosterRecovery).deltaVRemaining();
  const vRot = OMEGA_EARTH * R_EARTH * Math.cos(lat) * Math.sin(azimuthInertial);
  /**
   * Whether those stages can fly an ascent straight into the orbit h × ha.
   * Ideal delta-v needed = perigee speed + typical ascent losses (gravity, drag,
   * steering: 1450 m/s) − the Earth-rotation credit + 150 m/s of margin.
   */
  const ascentReaches = (h: number, ha: number): boolean => {
    const rIns = R_EARTH + h;
    return dvStrong >= visViva(rIns, (rIns + R_EARTH + ha) / 2) + 1450 - vRot + 150;
  };

  let insertionAltitude = Math.max(parkingOverride, insertionAltitudeFor(target));
  // The ascent flies straight into the transfer ellipse whose apogee is the
  // target (capped): that is what most launchers do, it saves a restart, and —
  // more importantly for the guidance — it gives the closed loop and the
  // apoapsis guard a target apoapsis that is the one the mission actually
  // needs, instead of a 200 km ceiling that a weak upper stage cannot respect.
  //
  // It is only flown when the stages that have to reach the perigee speed of
  // that ellipse can actually do so. Aiming a stack at an ellipse it cannot
  // reach is strictly worse than aiming it at the circular parking orbit it
  // can: the ascent burns to depletion short of both and ends suborbital,
  // where the parking orbit would have been reached and the remaining burns
  // (or the spacecraft's own engine) would have raised it. Soyuz-2.1a with a
  // crew ship to the ISS is exactly that case.
  const haCandidate = insertionApoapsisFor(target, insertionAltitude);
  let insertionApoapsis = insertionAltitude;
  if (haCandidate > insertionAltitude + 1e3 && ascentReaches(insertionAltitude, haCandidate)) {
    insertionApoapsis = haCandidate;
  }
  // Single-shot stack: nothing can light an engine after the ascent cuts off,
  // so a parking orbit is not a parking orbit — it is the final orbit. Aim the
  // ascent at the mission's own orbit instead, exactly as a real launcher
  // without a restartable upper stage does (direct insertion). The same
  // delta-v test as above decides: if the stack cannot reach the target
  // directly it is aimed at the parking orbit it can reach, which at least
  // leaves the payload in a stable orbit rather than in the sea.
  // Single-shot stack: nothing can light an engine after the ascent cuts off,
  // so a "parking orbit" is not a parking orbit — it is the final orbit, and
  // the apoapsis cap above (which exists so that a kick stage is handed a
  // sensible transfer) would strand the payload at 2000 km. Aim the ascent at
  // the target apoapsis instead, when the stack has the delta-v for it.
  //
  // The perigee is *not* raised to match a high target the same way: a stage
  // that burns continuously into a circular orbit well above the natural
  // insertion altitude arrives with its apoapsis already past the target.
  // Measured with Soyuz-2.1a + an inert payload, which is the only stack in
  // the fleet without a restart: aiming it straight at 500 × 500 km inserts at
  // 497 × 2474 km, and at 420 × 420 km it inserts at 417 × 441 km. Above
  // `DIRECT_INSERTION_CEILING` the launcher is therefore left aiming at the
  // transfer orbit it can fly accurately, and the mission ends `off target`
  // with the perigee low — which is what such a stack really does.
  if (!restartable && parkingOverride <= 0 && target.perigee <= DIRECT_INSERTION_CEILING) {
    const hFinal = target.perigee;
    const haFinal = Math.max(hFinal, target.apogee);
    if (haFinal > insertionApoapsis + 1e3 && ascentReaches(hFinal, haFinal)) {
      insertionAltitude = hFinal;
      insertionApoapsis = haFinal;
    }
  }
  const vOrb = circularSpeed(R_EARTH + insertionAltitude);
  const azimuthRotating = rotatingLaunchAzimuth(lat, ascentInclination, vOrb, descending) ?? azimuthInertial;
  const burns = planBurns(target, ascentInclination, insertionAltitude, insertionApoapsis);
  return {
    target, ascentInclination, descending, azimuthInertial, azimuthRotating, insertionAltitude, insertionApoapsis, weakFinalStage, burns,
    launchTime: cfg.launchTime, jd0, gmst0, raanExpected,
    planeChangeDeg: Math.abs(target.inclination - ascentInclination) / DEG,
    inclinationReachable: reachable,
    dvEstimateBurns: burns.reduce((s, b) => s + b.dvEstimate, 0),
  };
}

export interface LaunchWindow {
  time: Date;
  descending: boolean;
  raanTarget: number;
}

/**
 * Next launch windows (up to `count`) after `from` for which the ascent plane
 * matches the target RAAN. Returns an empty list when RAAN is unconstrained.
 */
export function launchWindows(orbit: OrbitSpec, site: SiteExtra, from: Date, count = 4): LaunchWindow[] {
  const lat = site.latitude * DEG;
  const lon = site.longitude * DEG;
  const t0 = resolveTarget(orbit, site, from);
  if (t0.raan === null) return [];
  const { inc } = ascentInclinationFor(t0, site);
  const descending = inc > 75 * DEG ? site.descendingForPolar : false;
  const out: LaunchWindow[] = [];
  // Δλ between ascending node and site along the orbit is fixed for given lat/inc.
  const dlam = wrapPi(lon + gmst(julianDate(from)) - raanFromLaunch(lat, lon + gmst(julianDate(from)), inc, descending));
  let t = new Date(from.getTime());
  for (let k = 0; k < count; k++) {
    // iterate twice because the target RAAN itself drifts slowly with time
    let cand = t;
    for (let it = 0; it < 3; it++) {
      const tgt = resolveTarget(orbit, site, cand);
      const raanT = tgt.raan ?? 0;
      const lonINeeded = raanT + dlam;
      const g = gmst(julianDate(t)) + lon;
      const dtheta = wrap2pi(lonINeeded - g);
      let dt = dtheta / OMEGA_EARTH;
      if (dt < 60) dt += SIDEREAL_DAY;
      cand = new Date(t.getTime() + dt * 1000);
    }
    out.push({ time: cand, descending, raanTarget: resolveTarget(orbit, site, cand).raan ?? 0 });
    t = new Date(cand.getTime() + 120 * 1000);
  }
  return out;
}
