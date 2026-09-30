/**
 * Columbia home (roadmap C01, docs/PHYSICS.md §13.14): the aim of the burn
 * for home at the Earth's entry interface, and the command module's lifting
 * entry and its parachutes.
 *
 * The command module flew into the air at a trim angle that gave it lift, a
 * third of its drag, and steered where it came down by rolling that lift
 * about the air-relative velocity: up to fly further, down to fall shorter,
 * and to either side, reversing when the target drifted too far off to the
 * other. So does this: the bank angle's size found, every two seconds, by a
 * prediction of the rest of the entry held at it (a bisection to the range to
 * the target), its side kept towards the target within a band that narrows
 * as the speed falls. Below 24,000 ft the forward heat shield goes and the
 * two drogues open, at 10,000 ft the three mains, reefed, then in full.
 */
import { density } from '../atmosphere';
import { G0, MU_EARTH, OMEGA_EARTH, R_EARTH } from '../constants';
import { gravityJ2 } from '../gravity';
import { rk4Step } from '../integrator';
import { elementsFromState, gmst, propagateKepler, timeToPeriapsis } from '../orbital';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import { cislunarRk4, cislunarStep, type CislunarState } from '../lunar/cislunar';

/** The entry interface, 400,000 ft up (MR Table 7-VII). */
export const EI_ALT = 400000 * 0.3048;

/**
 * The command module in the hypersonic flow: 3.91 m across its heat shield,
 * a drag coefficient of 1.29 and lift 0.30 of its drag at its trim (round
 * values for the Apollo CM's; approximate).
 */
export const CM_AERO = { area: Math.PI * 1.955 * 1.955, cd: 1.29, ld: 0.3 };

/**
 * The earth landing system (Apollo 11 press kit): the forward heat shield off
 * and two reefed 16.5-ft drogues at 24,000 ft; the three 83.3-ft mains at
 * 10,000 ft (the model's round figure), reefed in two stages; 31 ft/s at the
 * splash on three. The mains' drag area is the one that gives that speed at
 * the landing mass at sea level; the drogues' a drag coefficient of 0.55 on
 * their area; the reefing's steps the model's.
 */
export const CHUTES = {
  drogueAlt: 24000 * 0.3048,
  mainAlt: 10000 * 0.3048,
  drogueCdA: 2 * 0.55 * Math.PI * (16.5 * 0.3048 / 2) ** 2,
  mainCdA: (splashMass: number) => (2 * splashMass * G0) / (1.225 * (31 * 0.3048) ** 2),
  drogueReef: [[8, 0.45]] as readonly [number, number][],
  mainReef: [[6, 0.1], [10, 0.35]] as readonly [number, number][],
};

/** The fraction of a canopy's drag area open `since` s after its deployment, by its reefing steps. */
export function opened(since: number, reef: readonly [number, number][]): number {
  if (since < 0) return 0;
  for (const [until, f] of reef) if (since < until) return f;
  return 1;
}

/** The air's velocity relative to a point: the atmosphere turns with the Earth. */
export function airVelocity(r: Vec3, v: Vec3): Vec3 {
  return sub(v, cross(v3(0, 0, OMEGA_EARTH), r));
}

/**
 * The command module's aerodynamic acceleration at `r`, `v` (ECI): drag along
 * the air-relative velocity and, without the parachutes, lift at its L/D
 * across it, rolled by `bank` (rad; 0 lift up, positive to the right).
 */
export function cmAerodynamics(r: Vec3, v: Vec3, bank: number, mass: number, chuteCdA: number): Vec3 {
  const va = airVelocity(r, v), sp = norm(va);
  if (sp < 1e-6) return v3();
  const rho = density(norm(r) - R_EARTH), q = 0.5 * rho * sp * sp, vh = scale(va, 1 / sp);
  const drag = scale(vh, (-q * (CM_AERO.cd * CM_AERO.area + chuteCdA)) / mass);
  if (chuteCdA > 0) return drag;
  const up = normalize(r), liftUp = normalize(sub(up, scale(vh, dot(up, vh)))), right = normalize(cross(vh, liftUp));
  const lift = (q * CM_AERO.cd * CM_AERO.area * CM_AERO.ld) / mass;
  return add(drag, scale(add(scale(liftUp, Math.cos(bank)), scale(right, Math.sin(bank))), lift));
}

/** The load, g, past which the guidance rolls the lift up while the CM is still falling (the model's). */
const LOAD_LIMIT = 5;

/** Whether the CM, falling, is past the load limit: the guidance rolls its lift up. */
function limited(r: Vec3, v: Vec3, m: number): boolean {
  const va = airVelocity(r, v), sp = norm(va);
  if (dot(va, r) >= 0) return false;
  const load = (0.5 * density(norm(r) - R_EARTH) * sp * sp * CM_AERO.cd * CM_AERO.area * Math.hypot(1, CM_AERO.ld)) / m / G0;
  return load > LOAD_LIMIT;
}

/** Geocentric latitude and east longitude (rad) of an ECI position at UTC Julian date `jd`. */
export function earthFixed(r: Vec3, jd: number): { lat: number; lon: number } {
  const rm = norm(r);
  let lon = Math.atan2(r.y, r.x) - gmst(jd);
  lon = Math.atan2(Math.sin(lon), Math.cos(lon));
  return { lat: Math.asin(r.z / rm), lon };
}

/** The great-circle angle between two points on the Earth (rad). */
function arc(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const s = Math.sin((b.lat - a.lat) / 2) ** 2 + Math.cos(a.lat) * Math.cos(b.lat) * Math.sin((b.lon - a.lon) / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** The point on the Earth's surface under a latitude and longitude, ECI at `jd`, unit. */
function surfaceUnit(p: { lat: number; lon: number }, jd: number): Vec3 {
  const lam = p.lon + gmst(jd);
  return v3(Math.cos(p.lat) * Math.cos(lam), Math.cos(p.lat) * Math.sin(lam), Math.sin(p.lat));
}

/**
 * The command module's entry guidance to `target` (geocentric latitude and
 * east longitude, rad): lift up through the first plunge to its pull-out, then every two
 * seconds the bank's size by the predicted range, its side towards the
 * target; rolled lift up while falling past 5 g; held once the speed is under
 * 700 m/s.
 */
export class EntryGuidance {
  bank = 0;
  private next = -Infinity;
  private side = 0;
  private pulledOut = false;
  constructor(private readonly jd0: number, private readonly target: { lat: number; lon: number }) {}

  /**
   * Where the entry held at `bank` — the load limit applied as the guidance
   * applies it — ends, at the drogues' height: the arc from here to there
   * less the arc to the target (rad).
   */
  private predict(t: number, r: Vec3, v: Vec3, bank: number, mass: number): number {
    let s = { r, v }, tt = t;
    for (let i = 0; i < 1000 && norm(s.r) - R_EARTH > CHUTES.drogueAlt; i++) {
      const b = limited(s.r, s.v, mass) ? 0 : bank;
      const n = rk4Step(tt, s, 4, (_t: number, x: Vec3, u: Vec3) => add(gravityJ2(x), cmAerodynamics(x, u, b, mass, 0)));
      s = { r: n.r, v: n.v }; tt += 4;
    }
    const here = earthFixed(r, this.jd0 + t / 86400), end = earthFixed(s.r, this.jd0 + tt / 86400);
    return arc(here, end) - arc(here, this.target);
  }

  /** The bank angle now (rad), for the CM at `r`, `v` (ECI) of mass `m`: the guided one, or lift up at the load limit. */
  update(t: number, r: Vec3, v: Vec3, m: number): number {
    this.guide(t, r, v, m);
    return this.pulledOut && limited(r, v, m) ? 0 : this.bank;
  }

  /** The guided bank angle, every two seconds. */
  private guide(t: number, r: Vec3, v: Vec3, m: number): void {
    if (t < this.next) return;
    this.next = t + 2;
    const va = airVelocity(r, v), sp = norm(va), vh = scale(va, 1 / Math.max(1e-6, sp));
    const up = normalize(r), right = normalize(cross(vh, normalize(sub(up, scale(vh, dot(up, vh))))));
    // the side: towards the target, reversed when it lies too far the other way
    const tgt = surfaceUnit(this.target, this.jd0 + t / 86400);
    const cross0 = dot(tgt, right), band = ((0.1 + 0.6 * (sp / 7800) ** 2) * Math.PI) / 180;
    if (this.side === 0) this.side = cross0 >= 0 ? 1 : -1;
    else if (Math.sign(cross0) !== this.side && Math.abs(Math.asin(Math.max(-1, Math.min(1, cross0)))) > band) this.side = -this.side;
    // lift up through the first plunge, until the climb turns upward: the pull-out
    if (!this.pulledOut) {
      if (dot(va, up) > 0) this.pulledOut = true;
      else { this.bank = 0; return; }
    }
    if (sp < 700) return;
    // the size: a bisection on the predicted overshoot, more bank falling shorter
    let lo = 0, hi = Math.PI;
    const f = (b: number) => this.predict(t, r, v, this.side * b, m);
    if (f(lo) <= 0) { this.bank = 0; return; }
    if (f(hi) >= 0) { this.bank = this.side * hi; return; }
    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2;
      if (f(mid) > 0) lo = mid; else hi = mid;
    }
    this.bank = this.side * (lo + hi) / 2;
  }
}

/** The entry interface, coasted to: its time, state, space-fixed flight-path angle (deg), geocentric latitude and longitude (deg). */
export interface EntryInterface { t: number; state: CislunarState; fpa: number; lat: number; lon: number; speed: number }

/** Coast from `t0` until the flight falls through the entry interface, or `tMax`: null if it does not. */
export function coastToEntryInterface(jd0: number, t0: number, s0: CislunarState, tMax: number): EntryInterface | null {
  let t = t0, s = s0;
  const alt = (x: CislunarState) => norm(x.r) - R_EARTH;
  while (t < tMax) {
    const dt = Math.min(cislunarStep(jd0, t, s), 60, tMax - t);
    const next = cislunarRk4(jd0, t, s, dt);
    if (alt(next) <= EI_ALT && dot(next.r, next.v) < 0) {
      let a = 0, b = dt;
      for (let i = 0; i < 40 && b - a > 0.01; i++) {
        const c = (a + b) / 2;
        if (alt(cislunarRk4(jd0, t, s, c)) > EI_ALT) a = c; else b = c;
      }
      const st = cislunarRk4(jd0, t, s, b), rm = norm(st.r), sp = norm(st.v), jd = jd0 + (t + b) / 86400;
      const p = earthFixed(st.r, jd);
      return { t: t + b, state: st, fpa: (Math.asin(dot(st.r, st.v) / (rm * sp)) * 180) / Math.PI, lat: (p.lat * 180) / Math.PI, lon: (p.lon * 180) / Math.PI, speed: sp };
    }
    t += dt; s = next;
  }
  return null;
}

/** The closest approach to the Earth in vacuum: its time, altitude (m), geocentric latitude and longitude (deg). */
export interface Perigee { t: number; alt: number; lat: number; lon: number }

/** Coast from `t0` to the closest approach to the Earth, the atmosphere left out; null if there is none before `tMax`. */
export function coastToPerigee(jd0: number, t0: number, s0: CislunarState, tMax: number): Perigee | null {
  let t = t0, s = s0, rate = dot(s.r, s.v);
  while (t < tMax) {
    const dt = Math.min(cislunarStep(jd0, t, s), 60, tMax - t);
    const next = cislunarRk4(jd0, t, s, dt), nrate = dot(next.r, next.v);
    if (rate < 0 && nrate >= 0) {
      let a = 0, b = dt;
      const d = (x: number) => norm(cislunarRk4(jd0, t, s, x).r);
      for (let i = 0; i < 40 && b - a > 0.01; i++) {
        const c = b - (b - a) * 0.618, e = a + (b - a) * 0.618;
        if (d(c) < d(e)) b = e; else a = c;
      }
      const x = (a + b) / 2, st = cislunarRk4(jd0, t, s, x), p = earthFixed(st.r, jd0 + (t + x) / 86400);
      return { t: t + x, alt: norm(st.r) - R_EARTH, lat: (p.lat * 180) / Math.PI, lon: (p.lon * 180) / Math.PI };
    }
    t += dt; s = next; rate = nrate;
  }
  return null;
}

/**
 * The vacuum perigee of an entry interface's state (time s, geocentric
 * latitude and east longitude deg, altitude m, speed m/s, space-fixed
 * flight-path angle and heading deg): the conic it was on, carried on to its
 * perigee.
 */
export function perigeeOfEntry(jd0: number, e: { t: number; lat: number; lon: number; alt: number; speed: number; fpa: number; heading: number }): Perigee {
  const d = Math.PI / 180, lat = e.lat * d, lam = e.lon * d + gmst(jd0 + e.t / 86400);
  const up = v3(Math.cos(lat) * Math.cos(lam), Math.cos(lat) * Math.sin(lam), Math.sin(lat));
  const east = normalize(cross(v3(0, 0, 1), up)), north = cross(up, east);
  const g = e.fpa * d, h = e.heading * d;
  const r = scale(up, R_EARTH + e.alt), v = add(scale(up, e.speed * Math.sin(g)), scale(add(scale(north, Math.cos(h)), scale(east, Math.sin(h))), e.speed * Math.cos(g)));
  const el = elementsFromState(r, v), dtp = timeToPeriapsis(el);
  const p = propagateKepler(r, v, dtp), f = earthFixed(p.r, jd0 + (e.t + dtp) / 86400);
  return { t: e.t + dtp, alt: norm(p.r) - R_EARTH, lat: f.lat / d, lon: f.lon / d };
}

/** What an aim at the Earth asks for: the vacuum perigee's altitude (m), time (s) and latitude (deg). */
export interface EntryAim { alt: number; time: number; lat: number }

/** An engine a burn is flown on: its thrust (N), specific impulse (s), and the mass it starts on (kg). */
export interface BurnEngine { thrust: number; isp: number; mass: number }

/** A burn from `t0` along `dv`'s direction until its size is in, on `engine` — or, without one, the impulse. */
export function flyBurn(jd0: number, t0: number, s: CislunarState, dv: Vec3, engine?: BurnEngine): { t: number; state: CislunarState } {
  if (!engine) return { t: t0, state: { r: s.r, v: add(s.v, dv) } };
  const dir = normalize(dv), size = norm(dv), mdot = engine.thrust / (engine.isp * G0);
  let t = t0, st = s, m = engine.mass, done = 0;
  while (size - done > 1e-6) {
    const a = engine.thrust / m, dt = Math.min(0.5, (size - done) / a), m0 = m, t1 = t;
    st = cislunarRk4(jd0, t, st, dt, (tt) => scale(dir, engine.thrust / (m0 - mdot * (tt - t1))));
    done += (engine.thrust / mdot) * Math.log(m0 / (m0 - mdot * dt)); m -= mdot * dt; t += dt;
  }
  return { t, state: st };
}

/**
 * The burn, m/s (ECI), from `t0` that puts the vacuum perigee on `aim` —
 * flown on `engine` as a burn along a fixed direction, or an impulse —:
 * Newton's method on the three misses against its components, the Jacobian by
 * differences, from `from`, each step no more than 20 m/s.
 */
export function targetEntry(jd0: number, t0: number, s: CislunarState, aim: EntryAim, from: Vec3 = v3(), engine?: BurnEngine): Vec3 | null {
  const tMax = aim.time + 24 * 3600;
  const miss = (dv: Vec3): number[] | null => {
    const b = flyBurn(jd0, t0, s, dv, engine);
    const p = coastToPerigee(jd0, b.t, b.state, tMax);
    if (!p) return null;
    // a hundred metres of height, a second of time and a thousandth of a degree of latitude weigh alike
    return [(p.alt - aim.alt) / 100, p.t - aim.time, (p.lat - aim.lat) / 0.001];
  };
  let dv = from;
  for (let it = 0; it < 15; it++) {
    const m0 = miss(dv);
    if (!m0) return null;
    if (Math.abs(m0[0]) < 1 && Math.abs(m0[1]) < 1 && Math.abs(m0[2]) < 1) return dv;
    // (a finite burn's differences a little wider, over its steps' own granularity)
    const h = engine ? 0.1 : 0.01, J: number[][] = [[], [], []];
    for (let k = 0; k < 3; k++) {
      const mk = miss(add(dv, v3(k === 0 ? h : 0, k === 1 ? h : 0, k === 2 ? h : 0)));
      if (!mk) return null;
      for (let i = 0; i < 3; i++) J[i][k] = (mk[i] - m0[i]) / h;
    }
    const step = solve3(J, m0.map((x) => -x));
    if (!step) return null;
    const len = Math.hypot(step[0], step[1], step[2]), k = len > 20 ? 20 / len : 1;
    dv = add(dv, v3(step[0] * k, step[1] * k, step[2] * k));
  }
  const m = miss(dv);
  return m && Math.abs(m[0]) < 20 && Math.abs(m[1]) < 20 && Math.abs(m[2]) < 20 ? dv : null;
}

function solve3(A: number[][], b: number[]): number[] | null {
  const det = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(A);
  if (!(Math.abs(D) > 1e-12)) return null;
  const col = (k: number) => A.map((row, i) => row.map((x, j) => (j === k ? b[i] : x)));
  return [det(col(0)) / D, det(col(1)) / D, det(col(2)) / D];
}

/** The Earth's pull and the CM's aerodynamics together, for the entry's integration. */
export function entryAcceleration(bank: number, mass: number, chuteCdA: number) {
  return (_t: number, r: Vec3, v: Vec3): Vec3 => add(gravityJ2(r, MU_EARTH), cmAerodynamics(r, v, bank, mass, chuteCdA));
}
