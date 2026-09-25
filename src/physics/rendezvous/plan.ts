/**
 * Planning a rendezvous (roadmap G07): the nominal burns of a profile from
 * the spacecraft's state at separation, and the station placed where that
 * plan meets it.
 *
 * The plan is flown forward first, under J2, with each burn as an impulse at
 * its centre: the phasing burns (and the correction) posigrade along the
 * horizontal at the sizes the profile gives, then the transfer, which puts
 * the spacecraft at the aim point's height half a transfer later, arriving
 * level (at an apsis). Where it is then is where the braking burn sets it
 * closing on the station and the automatic approach takes over; the station is then put ahead of it by the aim point's
 * distance, on a circle at its own height in the same plane, and flown back to
 * the separation. That is the phase flight control sets the station at with
 * its reboosts for each launch (docs/PHYSICS.md §9.2), and it makes every
 * profile the nominal one for the flight that is actually flown.
 */
import { MU_EARTH } from '../constants';
import { gravityJ2 } from '../gravity';
import { rk4Step } from '../integrator';
import { add, cross, dot, norm, normalize, scale, sub, type Vec3 } from '../vec3';
import { AIM_POINT, APPROACH, PROFILES, type BurnId, type BurnKind, type RendezvousProfileId } from './profiles';
import { StationEphemeris, fromLvlh, toLvlh, type PointState } from './station';
import { apsisImpulse, coastJ2 } from './targeting';

export type { BurnId, BurnKind };

export interface PlannedBurn {
  id: BurnId;
  kind: BurnKind;
  /** mission time of the impulse the burn is centred on, s */
  t: number;
  /** the nominal impulse, ECI, m/s (re-solved from the actual state when flown) */
  dv: Vec3;
}

export interface RendezvousPlan {
  profile: RendezvousProfileId;
  /** separation, s */
  t0: number;
  burns: PlannedBurn[];
  /** arrival at the aim point, s */
  tArrive: number;
  station: StationEphemeris;
  /** the station's lead over the spacecraft at the transfer in the nominal plan, rad (the phasing correction aims at it) */
  leadAtTransfer: number;
  /** the nominal state at each burn, before it */
  nominal: Partial<Record<BurnId, PointState>>;
}

/** The unit along-track direction: horizontal, in the plane, forward. */
function alongTrack(s: PointState): Vec3 {
  const h = cross(s.r, s.v);
  return normalize(cross(h, s.r));
}

/** The impulse that raises the apoapsis to radius `ra` with a burn along the horizontal. */
export function raiseImpulse(s: PointState, ra: number): Vec3 {
  const r = norm(s.r), t = alongTrack(s);
  const vh = dot(s.v, t);
  const vp = Math.sqrt(MU_EARTH * (2 / r - 2 / (r + ra)));
  return scale(t, vp - vh);
}

/** Half the period of the transfer ellipse between radii `r1` and `r2`, s. */
export const halfTransfer = (r1: number, r2: number): number => Math.PI * Math.sqrt(((r1 + r2) / 2) ** 3 / MU_EARTH);

/** The station's lead over the spacecraft along the station's orbit, rad (positive: the station is ahead). */
export function leadAngle(sc: PointState, st: PointState): number {
  const h = normalize(cross(st.r, st.v));
  const a = normalize(sc.r), b = normalize(st.r);
  return Math.atan2(dot(cross(a, b), h), dot(a, b));
}

/** A coast backwards in time under J2. */
function coastBack(s: PointState, duration: number, step = 5): PointState {
  let state: PointState = { r: { ...s.r }, v: { ...s.v } };
  let t = 0;
  while (t < duration - 1e-9) {
    const h = Math.min(step, duration - t);
    state = rk4Step(0, state, -h, (_t, r) => gravityJ2(r));
    t += h;
  }
  return state;
}

const burned = (s: PointState, dv: Vec3): PointState => ({ r: s.r, v: add(s.v, dv) });

/**
 * The braking burn at the aim point: it leaves the spacecraft closing on the
 * station at the automatic approach's speed, straight at it in the station's
 * frame, as Soyuz MS-28's first braking burn left it closing for the next
 * ones (the approach brakes the rest on the thrusters).
 */
export function brakeImpulse(st: PointState, s: PointState): Vec3 {
  const rel = toLvlh(st, s);
  const wanted = fromLvlh(st, { r: rel.r, v: scale(normalize(rel.r), -APPROACH.farSpeed) });
  return sub(wanted.v, s.v);
}

/** A posigrade impulse of `dv` along the horizontal. */
export const posigrade = (s: PointState, dv: number): Vec3 => scale(alongTrack(s), dv);

/**
 * The nominal plan of `profile` from the state `s0` at separation (`t0`),
 * and the station phased to it.
 *
 * @param stationRadius the station's orbital radius, m
 */
export function planRendezvous(profileId: RendezvousProfileId, t0: number, s0: PointState, stationRadius: number): RendezvousPlan {
  const p = PROFILES[profileId];
  const rAim = stationRadius - AIM_POINT.z;
  const burns: PlannedBurn[] = [];
  const nominal: Partial<Record<BurnId, PointState>> = {};
  let s = s0, t = t0, tArrive = NaN;
  for (const b of p.burns) {
    const tb = t0 + b.t;
    if (!(tb > t + 30)) throw new RangeError(`Profile ${profileId}: ${b.id} must come after the burn before it`);
    s = coastJ2(s, tb - t);
    t = tb;
    nominal[b.id] = s;
    if (b.kind === 'transfer') {
      // to the aim point's height, arriving there level half a transfer later
      tArrive = tb + halfTransfer(norm(s.r), rAim);
      const guess = raiseImpulse(s, rAim);
      const dv = apsisImpulse(s, tArrive - tb, rAim, guess) ?? guess;
      burns.push({ id: b.id, kind: b.kind, t: tb, dv });
      s = coastJ2(burned(s, dv), tArrive - tb);
      break;
    }
    const dv = posigrade(s, b.dv ?? 0);
    burns.push({ id: b.id, kind: b.kind, t: tb, dv });
    s = burned(s, dv);
  }
  if (!Number.isFinite(tArrive)) throw new RangeError(`Profile ${profileId} has no transfer`);
  const sArr = s;
  nominal.brake = sArr;
  // the station: ahead of the spacecraft by the aim point's distance, on its own circle, in the spacecraft's plane
  const rSt = norm(sArr.r) + AIM_POINT.z;
  const h = normalize(cross(sArr.r, sArr.v));
  const theta = -AIM_POINT.x / rSt;
  const rHat = normalize(sArr.r);
  const dir = add(scale(rHat, Math.cos(theta)), scale(cross(h, rHat), Math.sin(theta)));
  const stArr: PointState = { r: scale(dir, rSt), v: scale(cross(h, dir), Math.sqrt(MU_EARTH / rSt)) };
  const station = new StationEphemeris(t0, coastBack(stArr, tArrive - t0));
  burns.push({ id: 'brake', kind: 'brake', t: tArrive, dv: brakeImpulse(station.at(tArrive), sArr) });
  const transfer = burns.find((b) => b.kind === 'transfer')!;
  return { profile: profileId, t0, burns, tArrive, station, leadAtTransfer: leadAngle(nominal[transfer.id]!, station.at(transfer.t)), nominal };
}
