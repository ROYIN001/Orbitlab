/**
 * A body falling through the air on its own, its heights read on the WGS-84
 * ellipsoid as the return it came from reads them (C01: Vostok-1's
 * instrument module and its pieces, the hatch, the seat and Gagarin;
 * src/physics/geodesy.ts): a point mass under J2 gravity and its drag, by
 * RK4, and its contact with the ground found within the step.
 */
import { atmosphere } from '../atmosphere';
import { OMEGA_EARTH, RAD } from '../constants';
import { geodetic, geodeticHeight } from '../geodesy';
import { gravityJ2 } from '../gravity';
import { rk4Step, type PointState } from '../integrator';
import { eciToLatLon } from '../orbital';
import { addScaled, cross, norm, sub, v3, type Vec3 } from '../vec3';
import type { Debris } from './types';
import type { DebrisEnvironment, DebrisFlight, DebrisFlightResult } from './debris';

const EARTH_RATE = v3(0, 0, OMEGA_EARTH);

/** The air's velocity past a body, ECI: its own less the turning Earth's and the wind's. */
export function airVelocity(r: Vec3, v: Vec3, wind: Vec3): Vec3 {
  return sub(sub(v, cross(EARTH_RATE, r)), wind);
}

/** Height above the ground under a point, m: above WGS-84, less the ground's own height. */
export function heightAboveGround(r: Vec3, env: DebrisEnvironment): number {
  return geodeticHeight(r) - env.groundElevation(r);
}

/**
 * One RK4 step of `h` s from `t`: J2 gravity and a drag area `cda(t, mach)`
 * m² (drag coefficient × area) on `mass` kg, in the air at the body's height
 * above WGS-84 and the wind `wind` (held over the step).
 */
export function fallStep(s: PointState, t: number, h: number, mass: number, cda: (t: number, mach: number) => number, wind: Vec3): PointState {
  return rk4Step(t, s, h, (tt, r, v) => {
    const a = gravityJ2(r), alt = geodeticHeight(r);
    if (alt > 1000e3) return a;
    const atm = atmosphere(Math.max(0, alt));
    const air = airVelocity(r, v, wind), speed = norm(air);
    if (!(atm.rho > 0) || speed < 1e-3) return a;
    return addScaled(a, air, -0.5 * atm.rho * speed * cda(tt, speed / atm.a) / mass);
  });
}

/**
 * Step `h` s; if that takes the body into the ground, step again to where it
 * meets it (one secant on the height above the ground, good to centimetres
 * at the speeds anything here touches down at).
 */
export function fallStepToGround(s: PointState, t: number, h: number, mass: number, cda: (t: number, mach: number) => number,
  env: DebrisEnvironment): { state: PointState; h: number; contact: boolean } {
  const wind = env.wind(s.r, t);
  const next = fallStep(s, t, h, mass, cda, wind);
  const h1 = heightAboveGround(next.r, env);
  if (h1 > 0) return { state: next, h, contact: false };
  const h0 = Math.max(0, heightAboveGround(s.r, env));
  const f = h0 / Math.max(1e-9, h0 - h1);
  const hc = Math.max(1e-6, h * f);
  return { state: fallStep(s, t, hc, mass, cda, wind), h: hc, contact: true };
}

/** Where a body is, geodetic latitude and longitude, degrees, at mission time `t`. */
export function placeOf(r: Vec3, t: number, env: DebrisEnvironment): { lat: number; lon: number } {
  return { lat: geodetic(r.x, r.y, r.z).lat * RAD, lon: eciToLatLon(r, env.theta(t)).lon * RAD };
}

/**
 * A body come down: at rest from `t` (the tracker turns it with the Earth
 * from then), its place kept. No event: what Vostok-1 dropped on the steppe
 * on the way down was not a stage coming down.
 */
export function comeDown(d: Debris, t: number, env: DebrisEnvironment, outcome: NonNullable<Debris['outcome']>): void {
  d.alive = false;
  d.outcome = outcome;
  d.restT = t;
  d.impact = placeOf(d.r, t, env);
}

/**
 * A plain body falling to the ground with a fixed drag area, tumbling (C01:
 * Vostok-1's hatch No. 1, and the ejection seat once Gagarin has left it):
 * no heating, no event, at rest where it lands.
 */
export class FallingBody implements DebrisFlight {
  /**
   * @param t mission time of the state `d` holds
   * @param cda its drag area, m² (drag coefficient × mean area)
   */
  constructor(private t: number, private readonly cda: number) {}

  step(d: Debris, to: number, env: DebrisEnvironment): DebrisFlightResult {
    const cda = () => this.cda;
    while (this.t < to - 1e-9 && d.alive) {
      const air = norm(airVelocity(d.r, d.v, v3()));
      const h = Math.min(to - this.t, air > 100 ? 0.05 : 0.2);
      const step = fallStepToGround({ r: d.r, v: d.v }, this.t, h, d.mass, cda, env);
      d.r = step.state.r; d.v = step.state.v;
      this.t += step.h;
      const u = airVelocity(d.r, d.v, env.wind(d.r, this.t)), speed = norm(u);
      if (speed > 1) d.dir = { x: -u.x / speed, y: -u.y / speed, z: -u.z / speed };
      if (step.contact) comeDown(d, this.t, env, 'impact');
    }
    return { events: [] };
  }
}
