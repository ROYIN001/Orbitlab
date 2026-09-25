/**
 * The space station a rendezvous flies to (roadmap G07): its orbit, flown
 * under the same J2 gravity as the spacecraft, and the local frame the
 * approach is judged in.
 *
 * The station's orbit is not measured weather but a reference: the plane of
 * the ISS model the launch windows already use (`issRaanAt`), a circle at the
 * station's altitude, and a phase set, as flight control sets it with the
 * station's reboosts in the weeks before a launch, so that at the
 * spacecraft's insertion the station is where the chosen profile needs it
 * (`Rendezvous.start`). Drag is left out for both vehicles alike: the station
 * loses some 50–100 m a day, nothing over a rendezvous.
 */
import { MU_EARTH, R_EARTH } from '../constants';
import { gravityJ2 } from '../gravity';
import { rk4Step } from '../integrator';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';

export interface PointState { r: Vec3; v: Vec3 }

/** The station's reference orbit: altitude, inclination (ISS, 2026). */
export const STATION = {
  altitude: 418e3,
  inclination: 51.64,
} as const;

/** Integration step of the station's ephemeris, s. */
const STEP = 5;

/**
 * The station's trajectory from an initial state, integrated in fixed steps
 * and kept, so any instant is a cubic Hermite interpolation between two
 * stored states: the same answer whatever order it is asked in, which a
 * replay and a scrub need.
 */
export class StationEphemeris {
  private readonly states: PointState[];

  constructor(readonly t0: number, initial: PointState) {
    this.states = [{ r: { ...initial.r }, v: { ...initial.v } }];
  }

  /** The station at mission time `t` (not before `t0`). */
  at(t: number): PointState {
    const u = Math.max(0, (t - this.t0) / STEP);
    const i = Math.floor(u);
    while (this.states.length < i + 2) {
      const last = this.states[this.states.length - 1];
      this.states.push(rk4Step(0, last, STEP, (_t, r) => gravityJ2(r)));
    }
    const a = this.states[i], b = this.states[i + 1], s = u - i;
    // cubic Hermite on position with velocity as the tangent, and its derivative for velocity
    const s2 = s * s, s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    const d00 = (6 * s2 - 6 * s) / STEP, d10 = 3 * s2 - 4 * s + 1, d01 = (-6 * s2 + 6 * s) / STEP, d11 = 3 * s2 - 2 * s;
    const mix = (pa: Vec3, va: Vec3, pb: Vec3, vb: Vec3, c0: number, c1: number, c2: number, c3: number): Vec3 =>
      v3(c0 * pa.x + c1 * va.x + c2 * pb.x + c3 * vb.x, c0 * pa.y + c1 * va.y + c2 * pb.y + c3 * vb.y, c0 * pa.z + c1 * va.z + c2 * pb.z + c3 * vb.z);
    return {
      r: mix(a.r, a.v, b.r, b.v, h00, h10 * STEP, h01, h11 * STEP),
      v: mix(a.r, a.v, b.r, b.v, d00, d10, d01, d11),
    };
  }
}

/**
 * The station's local vertical, local horizontal frame (LVLH), as the ISS
 * flies and reports it: x along the velocity (V-bar), z to the Earth's centre
 * (R-bar), y opposite the orbit's angular momentum. Unit vectors in ECI.
 */
export interface Lvlh { x: Vec3; y: Vec3; z: Vec3; omega: Vec3 }

export function lvlhFrame(st: PointState): Lvlh {
  const z = normalize(scale(st.r, -1));
  const h = cross(st.r, st.v);
  const y = normalize(scale(h, -1));
  const x = cross(y, z);
  // the frame turns at the orbital rate about −y
  const omega = scale(h, 1 / dot(st.r, st.r));
  return { x, y, z, omega };
}

/** A position and velocity relative to the station, in its LVLH axes (the frame's rotation taken out of the velocity). */
export function toLvlh(st: PointState, body: PointState): PointState {
  const f = lvlhFrame(st);
  const dr = sub(body.r, st.r), dv = sub(sub(body.v, st.v), cross(f.omega, dr));
  return { r: v3(dot(dr, f.x), dot(dr, f.y), dot(dr, f.z)), v: v3(dot(dv, f.x), dot(dv, f.y), dot(dv, f.z)) };
}

/** A point given in the station's LVLH axes, back in ECI. */
export function fromLvlh(st: PointState, rel: PointState): PointState {
  const f = lvlhFrame(st);
  const dr = add(add(scale(f.x, rel.r.x), scale(f.y, rel.r.y)), scale(f.z, rel.r.z));
  const dvRot = add(add(scale(f.x, rel.v.x), scale(f.y, rel.v.y)), scale(f.z, rel.v.z));
  return { r: add(st.r, dr), v: add(add(st.v, dvRot), cross(f.omega, dr)) };
}

/** A circular orbit's state at argument of latitude `u` in the plane (`raan`, `inc`), radius `a`, rad. */
export function circularState(a: number, inc: number, raan: number, u: number): PointState {
  const cO = Math.cos(raan), sO = Math.sin(raan), ci = Math.cos(inc), si = Math.sin(inc), cu = Math.cos(u), su = Math.sin(u);
  const r = v3(a * (cO * cu - sO * su * ci), a * (sO * cu + cO * su * ci), a * su * si);
  const vc = Math.sqrt(MU_EARTH / a);
  const v = v3(vc * (-cO * su - sO * cu * ci), vc * (-sO * su + cO * cu * ci), vc * cu * si);
  return { r, v };
}

/** The station's reference radius, m. */
export const STATION_RADIUS = R_EARTH + STATION.altitude;

/** Distance between two states, m. */
export const range = (a: PointState, b: PointState): number => norm(sub(a.r, b.r));
