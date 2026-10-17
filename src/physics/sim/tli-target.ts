/**
 * The translunar injection worked out for a launch other than Apollo 11's own
 * (roadmap C01, docs/PHYSICS.md §13.10; the owner's decision of 2026-10-17):
 * when to relight the S-IVB and the conic `TliGuidance` is to steer it onto,
 * so that the flight reaches the perilune the midcourse correction aims at —
 * its height, its time and its latitude — from the parking orbit this launch
 * reached.
 *
 * The conic's plane is one of those through the Moon's place at the arrival:
 * first the one nearest the parking orbit's, then the one turned about the
 * Moon's line that the burn steers into with the least effort (∫a² of the
 * steering that takes the stack's distance from the plane and its speed across
 * it out by the burn's end), tilted across that line by k so that the approach
 * passes the Moon where it should. In it, its perigee is w round from the
 * Moon's direction, as far above the stack as the flown conic's was above the
 * flown parking orbit, and its energy is C3; the burn is lit half its length
 * before the stack passes the perigee's direction. Three unknowns, (C3, w, k),
 * for three misses, in three passes of Newton's method, the Jacobian by
 * differences:
 *
 * 1. as an impulse at the perigee, against the B-plane — where the approach's
 *    asymptote passes the Moon (B·T, B·R) and when its perilune is, from the
 *    osculating hyperbola about the Moon six hours before the arrival, flown
 *    with every force of the coast — the B-vector aimed at the perilune's
 *    height in the plane through the approach nearest the Moon's equator,
 *    turning against the Moon's turning, as Apollo's did. These misses stay
 *    nearly linear even where the approach would hit the Moon, so the method
 *    converges from the first guess: the point of the parking orbit from which
 *    an ellipse in its plane meets the Moon at the arrival (Kepler's equation,
 *    two bodies);
 * 2. as the burn itself, against the same B-plane: from the parking orbit's
 *    state at the ignition, the cut-off `TliGuidance` predicts for its own
 *    steering — the engine's start-up, mixture shift and tail-off, the Earth
 *    with its J2 — the steering it will fly;
 * 3. the burn again, against the true perilune: the coast from that cut-off
 *    with every force (`coastToPerilune`), its height, time and latitude.
 *
 * What the last pass returns is the burn the flight will fly: its cut-off
 * mass says whether the S-IVB has the propellant for it.
 */
import { MU_EARTH } from '../constants';
import { elementsFromState, wrap2pi, wrapPi } from '../orbital';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import { coast, coastToPerilune, solve3, type CislunarState } from '../lunar/cislunar';
import { MU_MOON, R_MOON, moonState } from '../lunar/ephemeris';
import { eciToSelenographic, moonBodyToEci } from '../lunar/orientation';
import { TliGuidance, type TliTarget } from './tli-guidance';

/** Where the flight is to arrive: the perilune's altitude above `R_MOON` (m), its mission time (s) and selenographic latitude (deg). */
export interface TliAim { perilune: number; time: number; lat: number }

/**
 * The S-IVB's second burn: its operating points from the ignition on (`from`,
 * s after it), its start-up and tail-off time constants, and the stack's mass
 * at a mission time before it (the parking orbit's vent taking its share).
 */
export interface TliBurn {
  points: { from: number; thrust: number; isp: number }[];
  startupS: number;
  tailoffS: number;
  mass: (t: number) => number;
}

/**
 * The injection: the ignition's mission time (s), the conic, the angle of its
 * plane from the parking orbit's at the ignition (rad), the cut-off the steering predicts
 * (mission time, s; mass, kg) and the perilune that cut-off reaches (altitude
 * above `R_MOON`, m; mission time, s; latitude, deg).
 */
export interface TliPlan {
  ignition: number;
  target: TliTarget;
  plane: number;
  cutoff: { t: number; m: number };
  perilune: { alt: number; t: number; lat: number };
}

/** The B-plane is taken this long before the arrival aimed at, s: well inside the Moon's sphere of influence. */
const B_PLANE_LEAD = 6 * 3600;
/** The burn's pass is done when the perilune is this close to the aim: km, minutes, km of latitude. */
const TOL = [1, 0.05, 1];
/**
 * Newton's iterations a pass may take: the tilt moves at most 0.6° an iteration, and the launches that fly
 * (docs/development/reports/argon4-fu-apollo.md) converge in fewer; one that has not by then is given up.
 */
const ITERATIONS = 12;

/** On the ellipse with perigee radius `rp` and semi-major axis `a`: the true anomaly at radius `R` (rad) and the time from perigee to it (s). */
function ellipseTo(rp: number, a: number, R: number): { nu: number; t: number } {
  const e = 1 - rp / a, nu = Math.acos(Math.max(-1, Math.min(1, (a * (1 - e * e) / R - 1) / e)));
  const E = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2));
  return { nu, t: (E - e * Math.sin(E)) * Math.sqrt(a ** 3 / MU_EARTH) };
}

/**
 * From the parking orbit at `t`: the semi-major axis of the ellipse, its
 * perigee `rp` here, that reaches the Moon's distance at the arrival, and how
 * far ahead of where it reaches it the Moon then is, round the orbit's plane
 * (rad, the orbit's way).
 */
function inPlane(jd0: number, s: CislunarState, t: number, arrival: number, rp: number): { miss: number; a: number } {
  const n = normalize(cross(s.r, s.v)), m = moonState(jd0 + arrival / 86400).r, u = normalize(s.r), R = norm(m);
  let lo = (rp + R) / 2, hi = 50 * R;
  for (let i = 0; i < 60; i++) {
    const a = (lo + hi) / 2;
    if (ellipseTo(rp, a, R).t > arrival - t) lo = a; else hi = a;
  }
  const a = (lo + hi) / 2, mp = sub(m, scale(n, dot(m, n)));
  return { miss: wrapPi(wrap2pi(Math.atan2(dot(cross(u, mp), n), dot(u, mp))) - ellipseTo(rp, a, R).nu), a };
}

/**
 * How far the approach from `s` at `t0` misses (km, km, min): the B-vector of
 * its osculating hyperbola about the Moon `B_PLANE_LEAD` before the arrival
 * against the one that puts the perilune at its height (the Moon's pull
 * focusing the approach), in the plane through the approach nearest the
 * Moon's equator, retrograde — along T and R; and the perilune's time. Null
 * if the stack is not on a hyperbola about the Moon then.
 */
function bPlaneMiss(jd0: number, t0: number, s: CislunarState, aim: TliAim): number[] | null {
  const t = aim.time - B_PLANE_LEAD, x = coast(jd0, t0, s, t), m = moonState(jd0 + t / 86400);
  const q = { r: sub(x.r, m.r), v: sub(x.v, m.v) };
  const r = norm(q.r), v2 = dot(q.v, q.v), vinf2 = v2 - (2 * MU_MOON) / r, hv = cross(q.r, q.v);
  const ev = scale(sub(scale(q.r, v2 - MU_MOON / r), scale(q.v, dot(q.r, q.v))), 1 / MU_MOON), e = norm(ev);
  if (!(vinf2 > 0 && e > 1)) return null;
  const eh = scale(ev, 1 / e), hh = normalize(hv);
  // the incoming asymptote, and the B-vector from the Moon's centre to where it passes
  const S = add(scale(eh, 1 / e), scale(cross(hh, eh), Math.sqrt(1 - 1 / (e * e))));
  const B = scale(cross(S, hh), norm(hv) / Math.sqrt(vinf2));
  const mb = moonBodyToEci(jd0 + aim.time / 86400), pole = v3(mb[2], mb[5], mb[8]);
  const rp = R_MOON + aim.perilune, n = sub(scale(S, dot(pole, S)), pole);
  const want = scale(normalize(cross(S, n)), rp * Math.sqrt(1 + (2 * MU_MOON) / (rp * vinf2)));
  const T = normalize(cross(S, pole)), R = cross(S, T), d = sub(B, want);
  // the time to the perilune on the hyperbola, from its hyperbolic anomaly
  const ia = vinf2 / MU_MOON, F = Math.acosh(Math.max(1, (1 + r * ia) / e)) * Math.sign(dot(q.r, q.v));
  const tp = t - (e * Math.sinh(F) - F) / Math.sqrt(MU_MOON * ia ** 3);
  return [dot(d, T) / 1e3, dot(d, R) / 1e3, (tp - aim.time) / 60];
}

/** `x` turned by `a` (rad) about the unit vector `u`. */
const turn = (x: Vec3, u: Vec3, a: number): Vec3 => add(add(scale(x, Math.cos(a)), scale(cross(u, x), Math.sin(a))), scale(u, dot(u, x) * (1 - Math.cos(a))));

/**
 * Newton's method on `f` from `x` (three unknowns, three misses), the Jacobian by differences `steps`, each step
 * held to `caps`; `f` is told which calls are the iterates (true) and which the differences about them (false).
 */
function newton(f: (x: number[], iterate: boolean) => number[] | null, x: number[], steps: number[], caps: number[], done: (m: number[]) => boolean,
  iterations: number): number[] | null {
  for (let it = 0; it < iterations; it++) {
    const f0 = f(x, true);
    if (!f0) return null;
    if (done(f0)) return x;
    const J: number[][] = [[], [], []];
    for (let k = 0; k < 3; k++) {
      const fk = f(x.map((v, i) => (i === k ? v + steps[k] : v)), false);
      if (!fk) return null;
      for (let i = 0; i < 3; i++) J[i][k] = (fk[i] - f0[i]) / steps[k];
    }
    const step = solve3(J, f0.map((v) => -v));
    if (!step) return null;
    const hold = Math.min(1, ...step.map((v, i) => caps[i] / Math.abs(v)));
    x = x.map((v, i) => v + step[i] * hold);
  }
  return null;
}

/**
 * The injection whose burn has its middle between `from` and `to` (mission
 * times, s) on the parking orbit `park` gives the state of, aimed at `aim`:
 * the conic's perigee `climb` (m) above the stack where it passes the
 * perigee's direction, the ignition `lead` s before that. Null when none is
 * found.
 */
export function planTli(jd0: number, park: (t: number) => CislunarState, from: number, to: number, climb: number, lead: number,
  burn: TliBurn, aim: TliAim): TliPlan | null {
  const arrival = aim.time, rpAt = (s: CislunarState) => norm(s.r) + climb;
  // where: the burn's middle at which the in-plane ellipse meets the Moon, the miss turning from ahead to behind
  let t0 = NaN;
  for (let t = from, last = inPlane(jd0, park(t), t, arrival, rpAt(park(t))).miss; t + 60 <= to; t += 60) {
    const next = inPlane(jd0, park(t + 60), t + 60, arrival, rpAt(park(t + 60))).miss;
    if (last > 0 && next <= 0 && last - next < 1) { t0 = t; break; }
    last = next;
  }
  if (!(t0 >= from)) return null;
  let lo = t0, hi = t0 + 60;
  for (let i = 0; i < 16; i++) {
    const m = (lo + hi) / 2;
    if (inPlane(jd0, park(m), m, arrival, rpAt(park(m))).miss > 0) lo = m; else hi = m;
  }
  const tMid = (lo + hi) / 2, mid = park(tMid);
  // the planes through the Moon's place at the arrival: first the one nearest the parking orbit's
  const mHat = normalize(moonState(jd0 + arrival / 86400).r), np = normalize(cross(mid.r, mid.v));
  let base = normalize(sub(np, scale(mHat, dot(np, mHat))));
  // the conic of (C3, w, k): its plane `base`'s tilted by k across the Moon's line, its perigee w round from the
  // Moon's direction; when the stack passes the perigee's direction (τ), and the conic's state there
  const conic = ([c3, w, k]: number[]) => {
    const n = sub(scale(base, Math.cos(k)), scale(mHat, Math.sin(k))), m = normalize(sub(mHat, scale(n, dot(mHat, n))));
    const p = add(scale(m, Math.cos(w)), scale(cross(n, m), Math.sin(w)));
    let t = tMid;
    for (let i = 0; i < 4; i++) {
      const s = park(t), u = normalize(s.r);
      t += Math.atan2(dot(cross(u, p), normalize(cross(s.r, s.v))), dot(u, p)) / (norm(s.v) / norm(s.r));
    }
    const rp = rpAt(park(t)), st = { r: scale(p, rp), v: scale(normalize(cross(n, p)), Math.sqrt((2 * MU_EARTH) / rp + c3)) };
    const el = elementsFromState(st.r, st.v);
    return { t, n, s: st, target: { c3, e: el.e, inc: el.i, raan: el.raan, argp: el.argp } };
  };
  const steps = [200, 2e-5, 2e-5], caps = [5e4, 0.01, 0.01];
  const near = (f: number[]) => Math.abs(f[0]) < 2 && Math.abs(f[1]) < 2 && Math.abs(f[2]) < 0.05;
  // 1. the impulse at τ against the B-plane ...
  const m0 = normalize(sub(mHat, scale(base, dot(mHat, base))));
  const impulse = (x0: number[]) => newton((x) => { const c = conic(x); return bPlaneMiss(jd0, c.t, c.s, aim); }, x0, steps, caps, near, ITERATIONS);
  const guess = impulse([-MU_EARTH / inPlane(jd0, mid, tMid, arrival, rpAt(mid)).a, Math.atan2(dot(cross(m0, mid.r), base), dot(m0, mid.r)),
    -Math.asin(dot(np, mHat))]);
  if (!guess) return null;
  // ... then the plane turned about the Moon's line, which keeps where it passes the Moon, to the one the burn steers
  // into with the least effort: ∫a² of the steering that takes out by the burn's end the stack's distance from the
  // plane and its speed across it, as its parking orbit would have them then — and the impulse solved again in it
  const done = park(conic(guess).t + lead), solved = conic(guess).n;
  let best = Infinity, psi = 0;
  for (let a = -1.5; a <= 1.5; a += 0.005) {
    const n = turn(solved, mHat, a), y = dot(done.r, n), yd = dot(done.v, n), T = 2 * lead;
    const effort = (12 * y * y) / T ** 3 - (12 * y * yd) / T ** 2 + (4 * yd * yd) / T;
    if (effort < best) { best = effort; psi = a; }
  }
  base = turn(base, mHat, psi);
  const first = impulse(guess);
  if (!first || Math.abs(conic(first).t - tMid) > 3000) return null;
  // 2. the burn as the steering will fly it: its cut-off, the steering solved afresh at each iterate and from the
  // iterate's for the differences about it
  let warm: { law: NonNullable<TliGuidance['law']>; tCut: number; ig: number } | undefined;
  const burnFrom = (x: number[], fresh: boolean) => {
    const c = conic(x), ig = c.t - lead, s = park(ig), m = burn.mass(ig);
    const g = new TliGuidance(c.target, { ignition: ig, startupS: burn.startupS, tailoffS: burn.tailoffS,
      points: burn.points.map((p) => ({ from: ig + p.from, thrust: p.thrust, isp: p.isp })) });
    if (!fresh && warm) { g.law = { ...warm.law, t0: ig, p0: warm.law.p0 + warm.law.p1 * (ig - warm.law.t0) }; g.tCut = warm.tCut + ig - warm.ig; }
    if (!g.update(ig, s.r, s.v, m) || !g.law) return null;
    const end = g.predict({ t: ig, r: s.r, v: s.v, m }, g.law, g.tCut);
    if (end && fresh) warm = { law: g.law, tCut: g.tCut, ig };
    return end && { c, ig, end, park: s };
  };
  // ... first against the B-plane, as the impulse was ...
  const second = newton((x, fresh) => {
    const b = burnFrom(x, fresh);
    return b && bPlaneMiss(jd0, b.end.t, { r: b.end.r, v: b.end.v }, aim);
  }, first, steps, caps, near, ITERATIONS);
  if (!second) return null;
  // ... then to the true perilune: its height, time and latitude (`coastToPerilune`, every force)
  const fly = (x: number[], fresh: boolean) => {
    const b = burnFrom(x, fresh);
    const p = b && coastToPerilune(jd0, b.end.t, { r: b.end.r, v: b.end.v }, arrival + 12 * 3600);
    return b && p ? { ...b, p: { alt: p.altitude, t: p.t, lat: eciToSelenographic(p.rel.r, jd0 + p.t / 86400).lat } } : null;
  };
  const miss = (x: number[], fresh: boolean) => {
    const o = fly(x, fresh);
    return o ? [(o.p.alt - aim.perilune) / 1e3, (o.p.t - arrival) / 60, ((o.p.lat - aim.lat) * Math.PI / 180) * R_MOON / 1e3] : null;
  };
  const x = newton(miss, second, steps, caps, (f) => f.every((v, i) => Math.abs(v) < TOL[i]), ITERATIONS);
  const o = x && fly(x, true);
  if (!x || !o) return null;
  const plane = Math.acos(Math.min(1, dot(o.c.n, normalize(cross(o.park.r, o.park.v)))));
  return { ignition: o.ig, target: o.c.target, plane, cutoff: { t: o.end.t, m: o.end.m }, perilune: o.p };
}
