/**
 * The translunar injection worked out for a launch other than Apollo 11's own
 * (roadmap C01, docs/PHYSICS.md §13.10; the owner's decision of 2026-10-17):
 * the conic, from the parking orbit the launch reached, that takes the stack to
 * the Moon at the arrival aimed at, the perilune at its height, the orbit about
 * the Moon turning the way the Moon does — the five elements `TliGuidance`
 * flies the S-IVB onto — and when the stack is to pass its perigee, which
 * times the burn. The plane of the orbit about the Moon is left to the
 * midcourse correction, which turns it over the landing site for a few metres
 * a second where the injection would pay hundreds.
 *
 * Two steps. Where on the parking orbit: the point from which a burn along the
 * flight path onto an ellipse that reaches the Moon's distance at the arrival
 * reaches it where the Moon will be, in the orbit's plane (Kepler's equation,
 * two bodies). Then the conic, its perigee where the stack passes it: its
 * energy, its perigee's direction and its plane's tilt across the Moon's line
 * by Newton's method on misses in the B-plane — where the approach's asymptote
 * passes the Moon and when its perilune is, from the osculating hyperbola
 * about the Moon six hours before the arrival, flown with every force of the
 * coast; these stay nearly linear even when the approach would hit the Moon.
 * The misses: the B-vector's length the perilune's height (the Moon's pull
 * focusing the approach), the perilune's time, and the conic in the parking
 * orbit's plane — or, where the Moon is too far out of that plane for the
 * perilune's height, tilted only as far as it has to be.
 *
 * An impulse at a point of the parking orbit cannot stand in for the burn: the
 * Moon's place is nearly opposite that point, a plane through both nearly free
 * to turn about the line between them, and one tilted out of the parking
 * orbit's by more than a few tenths of a degree is one the S-IVB, steering for
 * six minutes, cannot reach.
 */
import { MU_EARTH } from '../../src/physics/constants';
import { elementsFromState, wrap2pi, wrapPi } from '../../src/physics/orbital';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../../src/physics/vec3';
import { coast, solve3, type CislunarState } from '../../src/physics/lunar/cislunar';
import { MU_MOON, R_MOON, moonState } from '../../src/physics/lunar/ephemeris';
import { moonBodyToEci } from '../../src/physics/lunar/orientation';
import type { TliTarget } from '../../src/physics/sim/tli-guidance';

/**
 * The injection: the conic it leaves the stack on, when the stack passes the
 * direction of its perigee (s), and the change of velocity there from the
 * parking orbit's to the conic's perigee's — the impulse it stands for (m/s).
 */
export interface TliPlan { t: number; dv: number; target: TliTarget }

/** Where the flight is to arrive: the perilune's altitude above `R_MOON` (m) and its mission time (s). */
export interface TliAim { perilune: number; time: number }

/** The B-plane is taken this long before the arrival aimed at, s: well inside the Moon's sphere of influence. */
const B_PLANE_LEAD = 6 * 3600;
export const trace: string[] = [];
const T = (x: string) => { if ((globalThis as { __tliTrace?: boolean }).__tliTrace) trace.push(x); };

/** On the ellipse with perigee radius `rp` and semi-major axis `a`: the true anomaly at radius `R` (rad) and the time from perigee to it (s). */
function ellipseTo(rp: number, a: number, R: number): { nu: number; t: number } {
  const e = 1 - rp / a, nu = Math.acos(Math.max(-1, Math.min(1, (a * (1 - e * e) / R - 1) / e)));
  const E = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2));
  return { nu, t: (E - e * Math.sin(E)) * Math.sqrt(a ** 3 / MU_EARTH) };
}

/**
 * From the parking orbit at `t`: the semi-major axis of the ellipse, its
 * perigee here, that reaches the Moon's distance at the arrival, and how far
 * ahead of where it reaches it the Moon then is, round the orbit's plane (rad,
 * the orbit's way).
 */
function inPlane(jd0: number, s: CislunarState, t: number, arrival: number): { miss: number; a: number } {
  const n = normalize(cross(s.r, s.v)), m = moonState(jd0 + arrival / 86400).r, u = normalize(s.r);
  const rp = norm(s.r), R = norm(m);
  let lo = (rp + R) / 2, hi = 50 * R;
  for (let i = 0; i < 60; i++) {
    const a = (lo + hi) / 2;
    if (ellipseTo(rp, a, R).t > arrival - t) lo = a; else hi = a;
  }
  const a = (lo + hi) / 2, mp = sub(m, scale(n, dot(m, n)));
  return { miss: wrapPi(wrap2pi(Math.atan2(dot(cross(u, mp), n), dot(u, mp))) - ellipseTo(rp, a, R).nu), a };
}

/**
 * How far the approach from `s` at `t0` misses `aim` (km, km, min): the
 * B-vector, from its osculating hyperbola about the Moon `B_PLANE_LEAD` before
 * the arrival (a fixed time, so that it is smooth in the conic), against the
 * one that puts the perilune at its height (the Moon's pull focusing the
 * approach) in the plane through the approach nearest the Moon's equator, the
 * orbit turning against the Moon's turning, as Apollo's did (its 1.25° to the
 * equator was 178.75° by the right hand) — along T and R; and the perilune's
 * time. Null if the stack is not on a hyperbola about the Moon then.
 */
function bPlaneMiss(jd0: number, t0: number, s: CislunarState, aim: TliAim): number[] | null {
  const t = aim.time - B_PLANE_LEAD, x = coast(jd0, t0, s, t), m = moonState(jd0 + t / 86400);
  const q = { r: sub(x.r, m.r), v: sub(x.v, m.v) };
  const r = norm(q.r), v2 = dot(q.v, q.v), vinf2 = v2 - (2 * MU_MOON) / r, hv = cross(q.r, q.v);
  const ev = scale(sub(scale(q.r, v2 - MU_MOON / r), scale(q.v, dot(q.r, q.v))), 1 / MU_MOON), e = norm(ev);
  if (!(vinf2 > 0 && e > 1)) return null;
  const eh = scale(ev, 1 / e), hh = normalize(hv);
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
 * The injection whose burn, about `span` s long, has its middle between `from`
 * and `to` (mission times, s) on the parking orbit `park` gives the state of,
 * onto a conic with its perigee `rp` (m) from the Earth's centre, aimed at
 * `aim`: null when none is found.
 */
export function planTli(jd0: number, park: (t: number) => CislunarState, from: number, to: number, rp: number, span: number, aim: TliAim): TliPlan | null {
  const arrival = aim.time;
  // where: the burn's middle at which the in-plane ellipse meets the Moon, the miss turning from ahead to behind
  let t0 = NaN;
  for (let t = from, last = inPlane(jd0, park(t), t, arrival).miss; t + 60 <= to; t += 60) {
    const next = inPlane(jd0, park(t + 60), t + 60, arrival).miss;
    if (last > 0 && next <= 0 && last - next < 1) { t0 = t; break; }
    last = next;
  }
  T(`scan t0 ${t0} from ${from} to ${to}`);
  if (!(t0 >= from)) return null;
  let lo = t0, hi = t0 + 60;
  for (let i = 0; i < 16; i++) {
    const m = (lo + hi) / 2;
    if (inPlane(jd0, park(m), m, arrival).miss > 0) lo = m; else hi = m;
  }
  const tMid = (lo + hi) / 2, mid = park(tMid);
  // the planes through the Moon's place at the arrival: first the one nearest the parking orbit's
  const mHat = normalize(moonState(jd0 + arrival / 86400).r), np = normalize(cross(mid.r, mid.v));
  let base = normalize(sub(np, scale(mHat, dot(np, mHat))));
  // the conic of energy c3, its plane tilted by k across the Moon's line from `base`, its perigee w round from the
  // Moon's direction; when the stack passes its perigee's direction, and the conic's state there
  const conic = ([c3, w, k]: number[]) => {
    const n = sub(scale(base, Math.cos(k)), scale(mHat, Math.sin(k))), m = normalize(sub(mHat, scale(n, dot(mHat, n))));
    const p = add(scale(m, Math.cos(w)), scale(cross(n, m), Math.sin(w)));
    let t = tMid;
    for (let i = 0; i < 4; i++) {
      const s = park(t), u = normalize(s.r);
      t += Math.atan2(dot(cross(u, p), normalize(cross(s.r, s.v))), dot(u, p)) / (norm(s.v) / norm(s.r));
    }
    return { t, n, s: { r: scale(p, rp), v: scale(normalize(cross(n, p)), Math.sqrt((2 * MU_EARTH) / rp + c3)) } };
  };
  // Newton's method on the B-plane's misses, the Jacobian by differences, each step held to 0.05 km²/s² and 0.6°
  const steps = [200, 2e-5, 2e-5], caps = [5e4, 0.01, 0.01];
  const solve = (x: number[]): number[] | null => {
    for (let it = 0; ; it++) {
      const c = conic(x), f0 = bPlaneMiss(jd0, c.t, c.s, aim);
      T(`it ${it} x ${x.map((v) => v.toPrecision(7)).join(' ')} t ${c.t.toFixed(1)} f ${f0?.map((v) => v.toFixed(2)).join(' ')}`);
      if (!f0 || it >= 20) return null;
      if (Math.abs(f0[0]) < 20 && Math.abs(f0[1]) < 20 && Math.abs(f0[2]) < 0.5) return x;
      const J: number[][] = [[], [], []];
      for (let k = 0; k < 3; k++) {
        const ck = conic(x.map((v, i) => (i === k ? v + steps[k] : v))), fk = bPlaneMiss(jd0, ck.t, ck.s, aim);
        if (!fk) return null;
        for (let i = 0; i < 3; i++) J[i][k] = (fk[i] - f0[i]) / steps[k];
      }
      const step = solve3(J, f0.map((v) => -v));
      if (!step) return null;
      const hold = Math.min(1, ...step.map((v, i) => caps[i] / Math.abs(v)));
      x = x.map((v, i) => v + step[i] * hold);
    }
  };
  const m0 = normalize(sub(mHat, scale(base, dot(mHat, base))));
  const first = solve([-MU_EARTH / inPlane(jd0, mid, tMid, arrival).a, Math.atan2(dot(cross(m0, mid.r), base), dot(m0, mid.r)), -Math.asin(dot(np, mHat))]);
  T(`first ${first}`);
  if (!first) return null;
  // then turned about the Moon's line — which keeps where the plane passes the Moon — to the plane the burn steers into
  // with the least effort: ∫a² of the steering that takes out, by the burn's end, the stack's distance from it and speed
  // across it as its parking orbit would have them then (the parking orbit's own curve counted)
  const done = park(conic(first).t + span / 2), solved = conic(first).n;
  let best = Infinity, psi = 0;
  for (let a = -1.5; a <= 1.5; a += 0.005) {
    const n = turn(solved, mHat, a), y = dot(done.r, n), yd = dot(done.v, n);
    const effort = (12 * y * y) / span ** 3 - (12 * y * yd) / span ** 2 + (4 * yd * yd) / span;
    if (effort < best) { best = effort; psi = a; }
  }
  T(`turn psi ${psi} effort ${best}`);
  base = turn(base, mHat, psi);
  const x = solve(first);
  if (!x) return null;
  const c = conic(x), el = elementsFromState(c.s.r, c.s.v);
  return { t: c.t, dv: norm(sub(c.s.v, park(c.t).v)), target: { c3: 2 * el.energy, e: el.e, inc: el.i, raan: el.raan, argp: el.argp } };
}
