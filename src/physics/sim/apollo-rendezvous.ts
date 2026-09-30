/**
 * Eagle back to Columbia (roadmap C01, docs/PHYSICS.md §13.13): the ascent
 * stage's guidance off the Moon and the targeting of the rendezvous that
 * followed, the coelliptic sequence as the Apollo 11 LM flew it.
 *
 * The ascent (P12): a vertical rise, then the fixed-thrust ascent engine
 * steered so that its height and rate of climb reach the insertion's at the
 * cut-off — the energy-optimal law for a position and a velocity at a time
 * (as the descent's, §13.12) along the local vertical and across the CSM's
 * plane — the rest of the thrust going down range, until the speed down
 * range is the insertion's.
 *
 * The rendezvous, on the LM's thrusters: the coelliptic sequence initiation
 * (CSI) raises the orbit so that half a revolution later it is a set height
 * under the CSM's; the constant differential height maneuver (CDH) makes the
 * two orbits coelliptic — the same line of apsides, the height between them the
 * same all the way round; terminal phase initiation (TPI), when the CSM stands
 * at a set elevation above the LM's horizon, puts the LM on the path that
 * meets the CSM after it has flown a set angle round the Moon; the midcourse
 * corrections put it back on that path. Relative states only matter, so the
 * propagator the caller hands in may work in any inertial frame.
 */
import { APS } from '../../data/apollo11';
import { MU_MOON } from '../lunar/ephemeris';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';

export interface OrbitState { r: Vec3; v: Vec3 }

/** A state carried from one time to another under the flight's own forces. */
export type Propagate = (t0: number, s: OrbitState, t1: number) => OrbitState;

/** The ascent engine's thrust (N) and specific impulse (s) `since` s after its ignition. */
export function apsPoint(since: number): { thrust: number; isp: number } {
  const [a, b] = APS;
  const f = Math.max(0, Math.min(1, (since - a.t) / (b.t - a.t)));
  return { thrust: a.thrust + f * (b.thrust - a.thrust), isp: a.isp + f * (b.isp - a.isp) };
}

/**
 * P12's steering off the Moon, for the ascent stage relative to the Moon's
 * centre: straight up for the vertical rise, then at the insertion's radius,
 * climb rate and down-range speed by the cut-off, into the plane with normal
 * `n` (the CSM's, pointing along its angular momentum).
 */
export class AscentGuidance {
  constructor(
    private readonly target: { r: number; vr: number; vh: number },
    private readonly n: Vec3,
    private readonly ignition: number,
    private readonly vertical: number,
  ) {}

  /** Down range, radially and across: the frame the steering is in. */
  private axes(r: Vec3): { up: Vec3; down: Vec3 } {
    const up = normalize(r);
    return { up, down: normalize(cross(this.n, up)) };
  }

  /** The speed still to gain down range, m/s. */
  toGo(r: Vec3, v: Vec3): number {
    return this.target.vh - dot(v, this.axes(r).down);
  }

  /**
   * The thrust's direction now, for the stage at `r`, `v` (from the Moon's
   * centre) with thrust acceleration `aT` and exhaust speed `ve` (m/s).
   */
  steer(t: number, r: Vec3, v: Vec3, aT: number, ve: number): Vec3 {
    const { up, down } = this.axes(r);
    if (t - this.ignition < this.vertical) return up;
    const rm = norm(r), vr = dot(v, up), vh = dot(v, down), y = dot(r, this.n), vy = dot(v, this.n);
    // the time to the cut-off by the rocket equation, on the speed still to gain; the law's gains held as if
    // eight seconds were left for the last eight
    const vg = Math.hypot(this.target.vh - vh, this.target.vr - vr, vy);
    const tgo = (ve / aT) * (1 - Math.exp(-vg / ve));
    const T = Math.max(8, tgo);
    const g = MU_MOON / (rm * rm) - (vh * vh) / rm;
    const aR = (6 * (this.target.r - rm - vr * T)) / (T * T) - (2 * (this.target.vr - vr)) / T + g;
    const aY = (6 * (-y - vy * T)) / (T * T) + (2 * vy) / T;
    const lim = 0.95 * aT;
    const ar = Math.max(-lim, Math.min(lim, aR)), ay = Math.max(-lim, Math.min(lim, aY));
    const ad = Math.sqrt(Math.max(0, aT * aT - ar * ar - ay * ay));
    return normalize(add(add(scale(up, ar), scale(this.n, ay)), scale(down, ad)));
  }
}

/** The osculating orbit of a state about the Moon: its eccentricity vector and semi-latus rectum (m). */
function conic(s: OrbitState): { e: Vec3; p: number; h: Vec3 } {
  const h = cross(s.r, s.v), rm = norm(s.r);
  const e = sub(scale(cross(s.v, h), 1 / MU_MOON), scale(s.r, 1 / rm));
  return { e, p: dot(h, h) / MU_MOON, h };
}

/** The radius the orbit of `c` has in the direction of `r`, m (both about the Moon's centre). */
export function radiusAlong(c: OrbitState, r: Vec3): number {
  const k = conic(c);
  return k.p / (1 + dot(k.e, normalize(r)));
}

/**
 * How far the CSM (`c`) is above the LM (`l`): the CSM's orbit's radius where
 * the LM is, less the LM's, m — the coelliptic sequence's ΔH.
 */
export function heightBelow(c: OrbitState, l: OrbitState): number {
  return radiusAlong(c, l.r) - norm(l.r);
}

/** The CSM's elevation above the LM's local horizontal, deg. */
export function elevation(c: OrbitState, l: OrbitState): number {
  const los = normalize(sub(c.r, l.r));
  return (Math.asin(Math.max(-1, Math.min(1, dot(los, normalize(l.r))))) * 180) / Math.PI;
}

/** The LM's local horizontal, forward, in its orbit's plane. */
function forward(l: OrbitState): Vec3 {
  const up = normalize(l.r);
  return normalize(cross(normalize(cross(l.r, l.v)), up));
}

/**
 * CSI: the impulse along the LM's local horizontal, at `t`, that puts it
 * `dh` m under the CSM's orbit at the CDH's time `tCdh` — a secant search on
 * the impulse's size from `guess` m/s.
 */
export function csiImpulse(propagate: Propagate, t: number, l: OrbitState, c: OrbitState, tCdh: number, dh: number, guess: number): Vec3 | null {
  const f = forward(l);
  const cAt = propagate(t, c, tCdh);
  const miss = (dv: number) => heightBelow(cAt, propagate(t, { r: l.r, v: add(l.v, scale(f, dv)) }, tCdh)) - dh;
  let x0 = guess, x1 = guess * 1.1 + 0.5, f0 = miss(x0), f1 = miss(x1);
  for (let i = 0; i < 12 && Math.abs(f1) > 20; i++) {
    const d = f1 - f0;
    if (!(Math.abs(d) > 1e-9)) break;
    const x2 = x1 - (f1 * (x1 - x0)) / d;
    x0 = x1; f0 = f1; x1 = Math.max(-100, Math.min(100, x2)); f1 = miss(x1);
  }
  return Math.abs(f1) < 200 ? scale(f, x1) : null;
}

/**
 * CDH: the impulse, in the LM's plane, that makes its orbit coelliptic with
 * the CSM's — the same line of apsides and the height between them the same
 * all the way round: semi-major axis the CSM's less the height now, the
 * eccentricity scaled to keep a·e — and its speed across the CSM's plane
 * taken out.
 */
export function cdhImpulse(l: OrbitState, c: OrbitState): Vec3 {
  const kc = conic(c), n = normalize(kc.h);
  const up = normalize(l.r), rm = norm(l.r);
  const ec = norm(kc.e), ac = kc.p / (1 - ec * ec);
  const dh = heightBelow(c, l);
  const a = ac - dh, e = (ac * ec) / a, p = a * (1 - e * e);
  // the true anomaly of the LM's position on the CSM's line of apsides
  const eHat = ec > 1e-9 ? scale(kc.e, 1 / ec) : up, side = normalize(cross(n, eHat));
  const nu = Math.atan2(dot(up, side), dot(up, eHat));
  const vr = Math.sqrt(MU_MOON / p) * e * Math.sin(nu), vh = Math.sqrt(MU_MOON * p) / rm;
  const fwd = normalize(cross(n, up));
  const want = add(scale(up, vr), scale(fwd, vh));
  const now = sub(l.v, scale(n, dot(l.v, n)));
  return add(sub(want, now), scale(n, -dot(l.v, n)));
}

/**
 * TPI and the midcourse corrections: the impulse at `t` that brings the LM to
 * where the CSM will be at `tInt` — Newton's method on the miss against the
 * impulse's three components, the Jacobian by differences.
 */
export function interceptImpulse(propagate: Propagate, t: number, l: OrbitState, c: OrbitState, tInt: number): Vec3 | null {
  const aim = propagate(t, c, tInt).r;
  let dv = v3();
  const at = (x: Vec3) => sub(propagate(t, { r: l.r, v: add(l.v, x) }, tInt).r, aim);
  for (let it = 0; it < 10; it++) {
    const m0 = at(dv);
    if (norm(m0) < 1) return dv;
    const h = 0.01, J: number[][] = [[], [], []];
    for (let k = 0; k < 3; k++) {
      const e = v3(k === 0 ? h : 0, k === 1 ? h : 0, k === 2 ? h : 0), mk = at(add(dv, e));
      J[0][k] = (mk.x - m0.x) / h; J[1][k] = (mk.y - m0.y) / h; J[2][k] = (mk.z - m0.z) / h;
    }
    const step = solve3(J, [-m0.x, -m0.y, -m0.z]);
    if (!step) return null;
    const len = Math.hypot(step[0], step[1], step[2]), k = len > 10 ? 10 / len : 1;
    dv = add(dv, v3(step[0] * k, step[1] * k, step[2] * k));
  }
  return norm(at(dv)) < 50 ? dv : null;
}

function solve3(A: number[][], b: number[]): number[] | null {
  const det = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(A);
  if (!(Math.abs(D) > 1e-12)) return null;
  const col = (k: number) => A.map((row, i) => row.map((x, j) => (j === k ? b[i] : x)));
  return [det(col(0)) / D, det(col(1)) / D, det(col(2)) / D];
}

/**
 * The terminal phase's braking gates: the closing speed held at each range —
 * 30 ft/s from 6,000 ft, 20 from 3,000, 10 from 1,500, 5 from 500 — and then
 * slowing to a stop at the station-keeping distance (m, m/s).
 */
const GATES: readonly [number, number][] = [[6000 * 0.3048, 30 * 0.3048], [3000 * 0.3048, 20 * 0.3048], [1500 * 0.3048, 10 * 0.3048], [500 * 0.3048, 5 * 0.3048]];
export const STATIONKEEPING_M = 30;
export function closingSpeed(range: number): number {
  if (range >= GATES[0][0]) return GATES[0][1];
  for (let i = 1; i < GATES.length; i++) {
    if (range >= GATES[i][0]) {
      const [r0, v0] = GATES[i - 1], [r1, v1] = GATES[i];
      return v1 + ((range - r1) / (r0 - r1)) * (v0 - v1);
    }
  }
  const [r1, v1] = GATES[GATES.length - 1];
  return Math.max(0, ((range - STATIONKEEPING_M) / (r1 - STATIONKEEPING_M)) * v1);
}

/**
 * The braking's command: the thrust acceleration (m/s², at most `aMax`) that
 * brings the LM's speed relative to the CSM to the closing speed along the
 * line of sight, the sideways drift taken out, for the LM at `l` and the CSM
 * at `c`; `close` the closing speed wanted (m/s).
 */
export function brakingAcceleration(l: OrbitState, c: OrbitState, close: number, aMax: number): Vec3 {
  const rel = sub(c.r, l.r), u = normalize(rel);
  const w = sub(l.v, c.v);
  const want = scale(u, close);
  const a = scale(sub(want, w), 1 / 10);
  const m = norm(a);
  return m > aMax ? scale(a, aMax / m) : a;
}
