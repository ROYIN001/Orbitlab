/**
 * Mission planning: resolves the target orbit, computes launch azimuth,
 * parking-orbit altitude, the post-ascent burn sequence and launch windows.
 */
import type { MissionConfig, OrbitSpec, VehicleSpec } from '../types';
import type { SiteExtra } from '../data/sites';
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

/**
 * Direction-independent estimate of the post-ascent burn sequence.
 */
export function planBurns(target: ResolvedTarget, ascentInc: number, hIns: number, haIns = hIns): BurnPlan[] {
  const burns: BurnPlan[] = [];
  const tol = 2e3;
  const rIns = R_EARTH + hIns;
  const rA = R_EARTH + target.apogee;
  const rP = R_EARTH + target.perigee;
  const needPlane = Math.abs(target.inclination - ascentInc) > 0.05 * DEG;
  const circularTarget = Math.abs(target.apogee - target.perigee) < 1e3;
  const aIns = (rIns + R_EARTH + haIns) / 2;
  let vAtApo = visViva(R_EARTH + haIns, aIns);
  let rApo = R_EARTH + haIns;
  if (target.apogee > haIns + tol) {
    const aT = (rIns + rA) / 2;
    const dv = visViva(rIns, aT) - visViva(rIns, aIns);
    burns.push({
      id: 'raise', kind: 'raiseApoapsis',
      atU: needPlane ? 'node' : circularTarget ? 'asap' : target.argp,
      targetApoapsis: target.apogee, dvEstimate: dv, done: false,
    });
    vAtApo = visViva(rA, aT);
    rApo = rA;
  }
  if (target.perigee > hIns + tol || needPlane) {
    const aF = (rApo + rP) / 2;
    const v2 = visViva(rApo, aF);
    const di = target.inclination - ascentInc;
    const dv = Math.sqrt(Math.max(0, vAtApo * vAtApo + v2 * v2 - 2 * vAtApo * v2 * Math.cos(di)));
    burns.push({
      id: 'shape', kind: 'shapeAtApoapsis', atU: 0,
      targetPeriapsis: target.perigee, targetInclination: target.inclination, dvEstimate: dv, done: false,
    });
  }
  return burns;
}

export function planMission(cfg: MissionConfig, site: SiteExtra, _vehicle: VehicleSpec): MissionPlan {
  const target = resolveTarget(cfg.orbit, site, cfg.launchTime);
  const { inc: ascentInclination, reachable } = ascentInclinationFor(target, site);
  const descending = ascentInclination > 75 * DEG ? site.descendingForPolar : false;
  const lat = site.latitude * DEG;
  const insertionAltitude = Math.max(cfg.guidance.parkingAltitude > 0 ? cfg.guidance.parkingAltitude : 0, insertionAltitudeFor(target));
  const vOrb = circularSpeed(R_EARTH + insertionAltitude);
  const azimuthInertial = inertialLaunchAzimuth(lat, ascentInclination, descending) ?? Math.PI / 2;
  const azimuthRotating = rotatingLaunchAzimuth(lat, ascentInclination, vOrb, descending) ?? azimuthInertial;
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
  let insertionApoapsis = insertionAltitude;
  if (weakFinalStage) {
    // Only insert into an ellipse if the strong stages can actually reach its perigee
    // speed (ideal delta-v minus typical losses plus the Earth-rotation credit).
    const strongSpec = { ..._vehicle, stages: _vehicle.stages.slice(0, -1) };
    const kickMass = last.dryMass + last.propellantMass;
    const dvStrong = new VehicleModel(strongSpec, payload + kickMass, cfg.boosterRecovery).deltaVRemaining();
    const rIns = R_EARTH + insertionAltitude;
    const vRot = OMEGA_EARTH * R_EARTH * Math.cos(lat) * Math.sin(azimuthInertial);
    const haCandidate = Math.max(insertionAltitude, Math.min(target.apogee, 2000e3));
    const aEll = (rIns + R_EARTH + haCandidate) / 2;
    const vPerigee = visViva(rIns, aEll);
    const required = vPerigee + 1450 - vRot + 150;
    if (dvStrong >= required) insertionApoapsis = haCandidate;
  }
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
