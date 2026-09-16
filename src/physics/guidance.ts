/**
 * Ascent guidance: vertical rise → pitch-over kick → zero-angle-of-attack
 * gravity turn → closed-loop pitch/yaw steering into the insertion orbit.
 *
 * The closed-loop vertical channel is a linear-tangent law (the acceleration
 * profile is linear in time) written as two separable terms so that it stays
 * well behaved when the vehicle cannot fly the nominal profile:
 *
 *   a_z = (v_zT − v_z)/T            terminal vertical-speed nulling
 *       + clamp(−B·T/2, ±a_corr)    bounded altitude correction
 *
 * The unbounded version (the textbook two-point boundary solution) demands
 * arbitrarily large accelerations when the altitude error is large compared
 * with what the remaining burn can fix; the bound turns that into a graceful
 * "climb as fast as you usefully can" command instead of a command that
 * saturates the pitch limit for minutes at a time.
 *
 * Three further limits keep the law physical:
 *  - a dynamic-pressure angle-of-attack budget (q·α), so guidance has almost
 *    no authority in dense air and full authority above ~60 km;
 *  - a thrust-limited pitch cap: when the stage cannot hold altitude at any
 *    attitude, pointing the thrust up only costs horizontal acceleration, so
 *    the pitch is capped at the value that leaves the vehicle highest when the
 *    horizontal speed reaches the insertion speed;
 *  - an apoapsis ceiling: once the vehicle is near the insertion altitude with
 *    the osculating apoapsis already at (or above) the insertion apoapsis there
 *    is nothing to gain from climbing, so the pitch ceiling is squeezed toward
 *    level flight (or below it, above the insertion altitude). Together with
 *    the apoapsis cut-off in `Simulation.checkAscent` this is what stops the
 *    "parking orbit at 198 × 21 500 km" runaway.
 */
import type { GuidanceParams } from '../types';
import { DEG, MU_EARTH, R_EARTH } from './constants';
import { Vec3, v3, add, scale, dot, cross, norm, normalize, slerpLimited } from './vec3';
import { enuFrame, elementsFromState } from './orbital';

export type AscentPhase = 'vertical' | 'kick' | 'gravityTurn' | 'closedLoop';

export interface GuidanceCommand {
  dir: Vec3;
  throttle: number;
  pitchDeg: number;
  phase: AscentPhase;
  /** apoapsis altitude the current plan expects at cut-off, m */
  predictedApoapsis: number;
}

/**
 * Angle-of-attack budget: the product q·α a launcher may fly, Pa·rad.
 * 2100 Pa·rad ≈ 3° at 40 kPa, 12° at 10 kPa, unlimited below ~1 kPa — the
 * usual shape of a structural/aerodynamic q·α placard.
 */
export const Q_ALPHA_BUDGET = 2100;

/** Highest altitude a stage aims for while another launcher stage is still to come, m. */
export const BOOSTER_TARGET_CEILING = 200e3;
const ALPHA_MIN = 1.5 * DEG;
const ALPHA_MAX = 60 * DEG;

/** Maximum angle of attack (rad) allowed at dynamic pressure q (Pa). */
export function alphaBudget(q: number): number {
  if (q < 150) return Math.PI;
  return Math.max(ALPHA_MIN, Math.min(ALPHA_MAX, Q_ALPHA_BUDGET / q));
}

/**
 * Unit normal of the orbit plane that contains rHat and has inclination inc,
 * choosing the solution closest to `currentNormal`. When the requested
 * inclination is lower than the latitude of rHat the closest achievable
 * plane (inclination = |latitude|) is returned.
 */
export function planeNormalThrough(rHat: Vec3, inc: number, currentNormal: Vec3): Vec3 {
  let e1 = cross(v3(0, 0, 1), rHat);
  if (norm(e1) < 1e-9) e1 = v3(1, 0, 0);
  e1 = normalize(e1);
  const e2 = cross(rHat, e1); // north-ish, e2.z = cos(lat)
  const cosLat = e2.z;
  let s = Math.abs(cosLat) > 1e-9 ? Math.cos(inc) / cosLat : 1;
  s = Math.max(-1, Math.min(1, s));
  const phi1 = Math.asin(s);
  const phi2 = Math.PI - phi1;
  const n1 = add(scale(e1, Math.cos(phi1)), scale(e2, Math.sin(phi1)));
  const n2 = add(scale(e1, Math.cos(phi2)), scale(e2, Math.sin(phi2)));
  return dot(n1, currentNormal) >= dot(n2, currentNormal) ? n1 : n2;
}

export interface GuidanceInputs {
  t: number;
  r: Vec3;
  v: Vec3;
  vAir: Vec3;
  /** altitude above the pad, m */
  altitudeAGL: number;
  /** altitude above mean radius, m */
  altitude: number;
  /** dynamic pressure, Pa */
  q: number;
  /** full-thrust acceleration available (vacuum), m/s^2 */
  thrustAccelFull: number;
  /** current thrust acceleration at the commanded throttle, m/s^2 */
  thrustAccel: number;
  /** estimated burn time to deliver a given delta-v with the remaining stages, s */
  timeToGo: (dv: number) => number;
  /** remaining burn time of the current stage (with its boosters), s */
  stageBurnTimeLeft: number;
  /** ideal delta-v still available from the current stage, m/s */
  stageDvLeft: number;
  /** thrust acceleration of the next launcher stage at its ignition, m/s^2 (-1 if none) */
  nextStageAccel: number;
  /** osculating apoapsis altitude now, m (Infinity when unbound) */
  apoapsisAlt: number;
  isFirstStage: boolean;
  maxQThrottle?: { qStart: number; throttle: number };
  maxAccel: number;
}

export class AscentGuidance {
  phase: AscentPhase = 'vertical';
  private kickStart = -1;
  private kickEnd = -1;
  private readonly params: GuidanceParams;
  private readonly azimuthRotating: number;
  private readonly ascentInclination: number;
  private readonly insertionAltitude: number;
  private readonly insertionApoapsis: number;
  lastPitch = 90;

  constructor(params: GuidanceParams, azimuthRotating: number, ascentInclination: number, insertionAltitude: number, insertionApoapsis = insertionAltitude) {
    this.params = params;
    this.azimuthRotating = azimuthRotating;
    this.ascentInclination = ascentInclination;
    this.insertionAltitude = insertionAltitude;
    this.insertionApoapsis = Math.max(insertionApoapsis, insertionAltitude);
  }

  update(inp: GuidanceInputs): GuidanceCommand {
    const p = this.params;
    const { east, north, up } = enuFrame(inp.r);
    const downrange = add(scale(north, Math.cos(this.azimuthRotating)), scale(east, Math.sin(this.azimuthRotating)));
    let dir = up;
    let pitchDeg = 90;
    let predictedApoapsis = 0;

    // ---------------------------------------------------------------- phases
    if (this.phase === 'vertical' && inp.altitudeAGL > p.pitchOverAltitude) {
      this.phase = 'kick';
      this.kickStart = inp.t;
    }
    if (this.phase === 'kick') {
      const vAirMag = norm(inp.vAir);
      const angFromVertical = vAirMag > 1 ? Math.acos(Math.max(-1, Math.min(1, dot(inp.vAir, up) / vAirMag))) : 0;
      if (inp.t - this.kickStart >= p.kickDuration && angFromVertical >= p.kickAngle * DEG) {
        this.phase = 'gravityTurn';
        this.kickEnd = inp.t;
      }
    }
    // Hand over to closed-loop steering once the angle-of-attack budget is wide
    // enough for the command to be followed (q below ~4 kPa), or at the
    // altitude ceiling as a fallback.
    if (this.phase === 'gravityTurn' && ((inp.q < 4000 && inp.altitude > 25e3 && inp.t > 30) || inp.altitude >= p.gravityTurnEnd)) {
      this.phase = 'closedLoop';
    }

    // --------------------------------------------------- closed-loop steering
    const closedLoopDir = (): Vec3 => {
      const rm = norm(inp.r);
      const rHat = up;
      const vz = dot(inp.v, up);
      const vh = add(inp.v, scale(up, -vz));
      const vhMag = norm(vh);
      const curNormal = normalize(cross(inp.r, inp.v));
      const nDes = planeNormalThrough(rHat, this.ascentInclination, curNormal);
      const hDir = normalize(cross(nDes, rHat));
      // effective gravity: gravity reduced by the centrifugal term of the horizontal speed
      const gEff = MU_EARTH / (rm * rm) - (vhMag * vhMag) / rm;
      const rIns = R_EARTH + this.insertionAltitude;
      const aIns = (rIns + R_EARTH + this.insertionApoapsis) / 2;
      const vIns = Math.sqrt(MU_EARTH * (2 / rIns - 1 / aIns)); // perigee speed of the insertion orbit
      const dvRem = Math.max(30, vIns - vhMag);
      // Planning horizon: burn time of the remaining stages, capped so that a weak
      // final stage does not force an inefficient loft.
      const T = Math.max(12, Math.min(p.maxTimeToGo, inp.timeToGo(dvRem)));
      // Lofted hand-off: when the next stage cannot hold altitude at hand-off
      // speed (Centaur-class upper stages) the current stage has to hand over
      // *climbing*, so that the ballistic arc keeps the stack high while the
      // weak stage builds horizontal speed. The loft is expressed as the apex
      // the arc should reach, and turned into the vertical speed the booster
      // must still have at its own cut-off:  v_zT = sqrt(2 g_eff Δh).
      // While a launcher stage is still to come, the booster aims no higher than
      // the staging ceiling: its job is to leave the atmosphere and build speed,
      // not to reach the final altitude. Aiming the booster at a high direct
      // insertion altitude makes it climb steeply and arrive slow and eccentric.
      const hT = inp.nextStageAccel > 0
        ? Math.min(this.insertionAltitude, BOOSTER_TARGET_CEILING)
        : this.insertionAltitude;
      let vzT = 0;
      let Tplan = T;
      if (p.loftAltitude > 0 && inp.nextStageAccel > 0 && inp.stageBurnTimeLeft > 3 && inp.stageBurnTimeLeft < T - 10) {
        const vhMeco = vhMag + 0.9 * inp.stageDvLeft;
        const gEffMeco = Math.max(0.5, MU_EARTH / (rm * rm) - (vhMeco * vhMeco) / rm);
        if (inp.nextStageAccel < 0.8 * gEffMeco) {
          vzT = Math.sqrt(2 * gEffMeco * p.loftAltitude);
          Tplan = Math.max(12, inp.stageBurnTimeLeft);
        }
      }
      const aT = Math.max(0.1, inp.thrustAccel);
      // linear-tangent profile a_z(t) = A + B t with h(Tplan) = hT, v_z(Tplan) = v_zT
      const B = (12 * (inp.altitude + 0.5 * Tplan * (vz + vzT) - hT)) / (Tplan * Tplan * Tplan);
      const aNull = (vzT - vz) / Tplan;
      // Bounded altitude correction. Unbounded this term is −B·Tplan/2 and blows up
      // whenever the altitude error cannot be flown out in the time available.
      const aCorrMax = Math.max(1.5, 0.6 * aT);
      const aCorr = Math.max(-aCorrMax, Math.min(aCorrMax, -B * Tplan * 0.5));
      const aZ = aNull + aCorr;
      let sinTheta = (aZ + gEff) / aT;
      sinTheta = Math.max(-1, Math.min(1, sinTheta));
      let theta = Math.asin(sinTheta) / DEG;
      // Thrust-limited cap. Pointing the thrust `theta` off the velocity vector
      // costs (1 − cos theta) of the horizontal acceleration; when the stage
      // cannot hold altitude at any attitude (g_eff > a_T, every hydrogen upper
      // stage with a heavy payload) that steering loss buys nothing, because
      // what ends the deficit is horizontal speed, not vertical thrust. Pick
      // the pitch that leaves the vehicle highest at the moment the horizontal
      // speed reaches the insertion speed; when the stage is strong enough the
      // optimum is pitchMax and this cap never binds.
      const D = Math.max(50, vIns - vhMag);
      let capTheta = p.pitchMax;
      let bestH = -Infinity;
      for (let k = 0; k <= 10; k++) {
        const th = (p.pitchMin + ((p.pitchMax - p.pitchMin) * k) / 10) * DEG;
        const u = aT * Math.cos(th);
        if (u < 0.05) continue;
        const tg = Math.min(D / u, 3000);
        const hEnd = inp.altitude + vz * tg + 0.5 * (aT * Math.sin(th) - gEff) * tg * tg;
        if (hEnd > bestH) {
          bestH = hEnd;
          capTheta = th / DEG;
        }
      }
      theta = Math.min(theta, capTheta);
      // Apoapsis ceiling: there is no point climbing once the osculating
      // apoapsis already reaches the insertion apoapsis. The ceiling is squeezed
      // from pitchMax down over one "excess apoapsis" band, which keeps the
      // steering continuous instead of switching. It only applies to a stage
      // that could hold altitude if it wanted to (g_eff < a_T); for a
      // thrust-deficient stage the apoapsis is not the problem — the periapsis
      // is — and the cap above already governs. The floor is level flight
      // unless the vehicle is also above the insertion altitude, in which case
      // it may descend toward it.
      const band = Math.max(15e3, 0.08 * this.insertionApoapsis);
      if (gEff < aT && inp.altitude > this.insertionAltitude - band) {
        const excess = isFinite(inp.apoapsisAlt) ? (inp.apoapsisAlt - this.insertionApoapsis) / band : 4;
        const f = Math.max(0, Math.min(1, excess));
        const floorTheta = inp.altitude > this.insertionAltitude - 15e3 ? p.pitchMin : Math.min(0, p.pitchMax);
        const pitchCeiling = p.pitchMax + f * (floorTheta - p.pitchMax);
        theta = Math.min(pitchCeiling, theta);
      }
      theta = Math.max(p.pitchMin, Math.min(p.pitchMax, theta));
      predictedApoapsis = inp.altitude + vz * Tplan + 0.5 * aZ * Tplan * Tplan;
      pitchDeg = theta;
      // yaw feedback: null the out-of-plane velocity component over ~min(T, 90 s)
      const vOut = dot(inp.v, nDes);
      const aLat = -vOut / Math.min(T, 90);
      const lat = Math.max(-0.35, Math.min(0.35, aLat / aT));
      const inPlane = add(scale(hDir, Math.cos(theta * DEG)), scale(up, Math.sin(theta * DEG)));
      return normalize(add(scale(inPlane, Math.sqrt(Math.max(0, 1 - lat * lat))), scale(nDes, lat)));
    };

    switch (this.phase) {
      case 'vertical':
        dir = up;
        pitchDeg = 90;
        break;
      case 'kick': {
        const f = Math.min(1, (inp.t - this.kickStart) / Math.max(0.1, p.kickDuration));
        const theta = p.kickAngle * DEG * f;
        dir = normalize(add(scale(up, Math.cos(theta)), scale(downrange, Math.sin(theta))));
        pitchDeg = 90 - theta / DEG;
        break;
      }
      case 'gravityTurn': {
        const vAirMag = norm(inp.vAir);
        let vDir = vAirMag > 1 ? scale(inp.vAir, 1 / vAirMag) : up;
        // Pitch-program limit: do not let the commanded pitch fall faster than
        // maxTurnRate. Flying the nose above the velocity vector costs angle of
        // attack, so the deviation is charged against the q·α budget below.
        const pitchNow = Math.asin(Math.max(-1, Math.min(1, dot(vDir, up))));
        const pitchMinRad = (90 - p.kickAngle - p.maxTurnRate * Math.max(0, inp.t - this.kickEnd)) * DEG;
        if (pitchNow < pitchMinRad && pitchMinRad > 0) {
          const horiz = normalize(add(vDir, scale(up, -dot(vDir, up))));
          vDir = normalize(add(scale(horiz, Math.cos(pitchMinRad)), scale(up, Math.sin(pitchMinRad))));
        }
        // Blend toward the closed-loop command as the atmosphere thins out.
        const wQ = inp.t > 30 && inp.altitude > 20e3 ? smoothstep((12000 - inp.q) / 8000) : 0;
        const blendWidth = 20e3;
        const w = Math.max(wQ, smoothstep((inp.altitude - (p.gravityTurnEnd - blendWidth)) / blendWidth));
        if (w > 0) {
          const cl = closedLoopDir();
          dir = normalize(add(scale(vDir, 1 - w), scale(cl, w)));
        } else {
          dir = vDir;
        }
        pitchDeg = Math.asin(Math.max(-1, Math.min(1, dot(dir, up)))) / DEG;
        break;
      }
      case 'closedLoop':
        dir = closedLoopDir();
        break;
    }

    // Angle-of-attack placard: whatever the guidance asks for, the vehicle only
    // flies the part of it that the q·α budget allows.
    if (this.phase !== 'vertical' && inp.q > 150) {
      const vAirMag = norm(inp.vAir);
      if (vAirMag > 30) {
        const vDir = scale(inp.vAir, 1 / vAirMag);
        dir = slerpLimited(vDir, dir, alphaBudget(inp.q));
        pitchDeg = Math.asin(Math.max(-1, Math.min(1, dot(dir, up)))) / DEG;
      }
    }

    // ------------------------------------------------------------- throttle
    let throttle = 1;
    if (inp.isFirstStage && inp.maxQThrottle && inp.q > inp.maxQThrottle.qStart) throttle = inp.maxQThrottle.throttle;
    if (inp.thrustAccelFull > inp.maxAccel && inp.maxAccel > 0) throttle = Math.min(throttle, inp.maxAccel / inp.thrustAccelFull);
    this.lastPitch = pitchDeg;
    return { dir, throttle, pitchDeg, phase: this.phase, predictedApoapsis };
  }
}

function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

/**
 * Velocity-to-be-gained steering for orbital burns. Returns the desired
 * inertial velocity at the current position for the given burn objective.
 */
export function desiredVelocity(
  r: Vec3,
  v: Vec3,
  kind: 'raiseApoapsis' | 'shapeAtApoapsis' | 'circularize',
  targetApoapsis: number | undefined,
  targetPeriapsis: number | undefined,
  targetInclination: number | undefined,
  fixedNormal?: Vec3,
): Vec3 {
  const rm = norm(r);
  const rHat = scale(r, 1 / rm);
  const curNormal = normalize(cross(r, v));
  if (kind === 'raiseApoapsis') {
    // Also used to lower an apoapsis that overshot: the desired speed is simply
    // the speed of the transfer ellipse at this radius, above or below the
    // current speed.
    const rA = R_EARTH + (targetApoapsis ?? 0);
    const a = (rm + Math.max(rA, rm * 0.5)) / 2;
    const speed = Math.sqrt(MU_EARTH * (2 / rm - 1 / a));
    const hDir = normalize(cross(curNormal, rHat));
    return scale(hDir, speed);
  }
  // shapeAtApoapsis / circularize: current radius becomes apoapsis (or the circular radius)
  const rP = R_EARTH + (targetPeriapsis ?? rm - R_EARTH);
  const a = (rm + Math.min(rP, rm)) / 2;
  const speed = Math.sqrt(MU_EARTH * (2 / rm - 1 / a));
  const nDes = fixedNormal ?? (targetInclination !== undefined ? planeNormalThrough(rHat, targetInclination, curNormal) : curNormal);
  const hDir = normalize(cross(nDes, rHat));
  return scale(hDir, speed);
}

/** Convenience: current osculating elements. */
export const osculating = elementsFromState;
