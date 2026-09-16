/**
 * Ascent guidance: vertical rise → pitch-over kick → zero-angle-of-attack
 * gravity turn → closed-loop pitch/yaw steering into the parking orbit.
 */
import type { GuidanceParams } from '../types';
import { DEG, MU_EARTH, R_EARTH } from './constants';
import { Vec3, v3, add, scale, dot, cross, norm, normalize } from './vec3';
import { enuFrame, elementsFromState } from './orbital';

export type AscentPhase = 'vertical' | 'kick' | 'gravityTurn' | 'closedLoop';

export interface GuidanceCommand {
  dir: Vec3;
  throttle: number;
  pitchDeg: number;
  phase: AscentPhase;
  predictedApoapsis: number;
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
  /** index of the active stage */
  stageIndex: number;
  /** the active stage is the last strong one and a low-thrust kick stage completes the insertion */
  lastStrongStage: boolean;
  /** thrust acceleration of that kick stage at hand-off, m/s² */
  weakStageAccel: number;
  isFirstStage: boolean;
  maxQThrottle?: { qStart: number; throttle: number };
  maxAccel: number;
}

export class AscentGuidance {
  phase: AscentPhase = 'vertical';
  private kickStart = -1;
  private kickEnd = -1;
  /** kick-stage hand-off decision (frozen per stage) */
  private handoffStage = -1;
  private handoff: { hT: number; vzT: number } | null = null;
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

    // phase transitions
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
    // Hand over to closed-loop steering once dynamic pressure is low enough for an
    // angle of attack to be harmless (or at the altitude ceiling as a fallback).
    if (this.phase === 'gravityTurn' && ((inp.q < 1000 && inp.altitude > 30e3 && inp.t > 40) || inp.altitude >= p.gravityTurnEnd)) this.phase = 'closedLoop';

    const closedLoopDir = (): Vec3 => {
      // Explicit vertical-channel guidance: choose the vertical thrust component so
      // that altitude reaches the insertion altitude with zero vertical speed at the
      // moment the horizontal speed reaches orbital speed (time-to-go from the
      // remaining propellant). The vertical acceleration profile is linear in time
      // (a_z = A + B t), which is the linear-tangent form of optimal ascent steering.
      const rm = norm(inp.r);
      const rHat = up;
      const vz = dot(inp.v, up);
      const vh = add(inp.v, scale(up, -vz));
      const vhMag = norm(vh);
      const curNormal = normalize(cross(inp.r, inp.v));
      const nDes = planeNormalThrough(rHat, this.ascentInclination, curNormal);
      const hDir = normalize(cross(nDes, rHat));
      const gEff = MU_EARTH / (rm * rm) - (vhMag * vhMag) / rm;
      const rIns = R_EARTH + this.insertionAltitude;
      const aIns = (rIns + R_EARTH + this.insertionApoapsis) / 2;
      const vCirc = Math.sqrt(MU_EARTH * (2 / rIns - 1 / aIns)); // perigee speed of the insertion orbit
      const dvRem = Math.max(30, vCirc - vhMag);
      // Planning horizon: burn time of the remaining stages, capped so that a weak
      // final stage does not force an inefficient loft (a coast + circularisation
      // handles that case instead).
      const T = Math.max(12, Math.min(p.maxTimeToGo, inp.timeToGo(dvRem)));
      // Two-segment plan when the next stage is too weak to hold altitude at hand-off:
      // the current stage targets a state (hT, vzT) from which a ballistic arc under the
      // reduced effective gravity g2 peaks at the insertion altitude by the time the next
      // stage has gained enough horizontal speed to sustain level flight.
      // Lofted hand-off: when the next stage cannot hold altitude at hand-off speed
      // (Centaur-class upper stages), the current stage aims for an apex above the
      // insertion altitude at its own burnout; the upper stage then descends while it
      // builds horizontal speed. The loft is a tunable (auto-tuned) parameter.
      let hT = this.insertionAltitude;
      let vzT = 0;
      let Tplan = T;
      if (inp.lastStrongStage && this.handoffStage !== inp.stageIndex) {
        // Decide once, when the last strong stage takes over: will it fall short of the
        // insertion speed so that the kick stage (Briz-M, Fregat...) has to make it up with
        // a long, low-thrust burn during which it cannot hold altitude? If so, hand over on
        // a rising arc whose apex sits at the insertion altitude halfway through that burn,
        // so the sag on the way down is recovered from the climb on the way up.
        this.handoffStage = inp.stageIndex;
        this.handoff = null;
        const shortfall = vCirc - (vhMag + 0.95 * inp.stageDvLeft);
        const vhHand = vCirc - shortfall;
        const g2 = MU_EARTH / (rIns * rIns) - (vhHand * vhHand) / rIns;
        // (only when the hand-off is clearly suborbital: near orbital speed the "arc" is an
        // orbit and its apex lies far downrange, so the parabolic model does not apply)
        if (shortfall > 60 && g2 > 0.6 && inp.weakStageAccel > 0) {
          const tWeak = Math.min(900, shortfall / inp.weakStageAccel);
          let vzH = (g2 * tWeak) * 0.25;
          const hTop = this.insertionAltitude + 10e3;
          const hMin = 130e3; // never hand over below this altitude: shrink the arc instead
          if (hTop - (vzH * vzH) / (2 * g2) < hMin) vzH = Math.sqrt(Math.max(0, 2 * g2 * (hTop - hMin)));
          this.handoff = { hT: hTop - (vzH * vzH) / (2 * g2), vzT: vzH };
        }
      }
      if (inp.lastStrongStage && this.handoff && inp.stageBurnTimeLeft > 3) {
        hT = this.handoff.hT + p.loftAltitude;
        vzT = this.handoff.vzT;
        Tplan = Math.max(12, inp.stageBurnTimeLeft);
      } else if (inp.nextStageAccel > 0 && inp.stageBurnTimeLeft > 3 && inp.stageBurnTimeLeft < T - 10) {
        const vhMeco = vhMag + 0.9 * inp.stageDvLeft;
        const gEffMeco = Math.max(0, MU_EARTH / (rm * rm) - (vhMeco * vhMeco) / rm);
        if (inp.nextStageAccel < 0.6 * gEffMeco) {
          hT = this.insertionAltitude + p.loftAltitude;
          Tplan = Math.max(12, inp.stageBurnTimeLeft);
        }
      }
      const B = (12 * (inp.altitude + 0.5 * Tplan * (vz + vzT) - hT)) / (Tplan * Tplan * Tplan);
      const A = (vzT - vz) / Tplan - 0.5 * B * Tplan;
      const aT = Math.max(0.1, inp.thrustAccel);
      let sinTheta = (A + gEff) / aT;
      sinTheta = Math.max(-1, Math.min(1, sinTheta));
      let theta = Math.asin(sinTheta) / DEG;
      theta = Math.max(p.pitchMin, Math.min(p.pitchMax, theta));
      predictedApoapsis = inp.altitude + vz * Tplan + 0.5 * A * Tplan * Tplan + (B * Tplan * Tplan * Tplan) / 6;
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
        // Pitch-program limit: do not let the commanded pitch fall faster than maxTurnRate.
        // A low-T/W vehicle would otherwise turn over too quickly while its airspeed is low.
        const pitchNow = Math.asin(Math.max(-1, Math.min(1, dot(vDir, up))));
        const pitchMinRad = (90 - p.kickAngle - p.maxTurnRate * Math.max(0, inp.t - this.kickEnd)) * DEG;
        if (pitchNow < pitchMinRad && pitchMinRad > 0) {
          const horiz = normalize(add(vDir, scale(up, -dot(vDir, up))));
          vDir = normalize(add(scale(horiz, Math.cos(pitchMinRad)), scale(up, Math.sin(pitchMinRad))));
        }
        const wQ = inp.t > 40 && inp.altitude > 25e3 ? smoothstep((6000 - inp.q) / 5000) : 0;
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

    // throttle
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
    const rA = R_EARTH + (targetApoapsis ?? 0);
    const a = (rm + Math.max(rA, rm)) / 2;
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
