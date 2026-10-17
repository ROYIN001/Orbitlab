/**
 * Probe: the TLI solver, the conic tied to the stack: its perigee where the stack is at the burn's
 * middle τ, its plane the parking orbit's there turned about the stack's radius by the yaw ψ, its energy
 * C3. Newton's method on (τ, C3, ψ) against the B-plane (B·T, B·R) and the perilune's time, from the
 * osculating hyperbola about the Moon six hours before the arrival; then the B-plane's aim corrected by
 * the true perilune (a coast to it, every force) until the conic reaches it.
 */
import { MU_EARTH } from '../../src/physics/constants';
import { elementsFromState, wrap2pi, wrapPi } from '../../src/physics/orbital';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../../src/physics/vec3';
import { coast, coastToPerilune, solve3, type CislunarState } from '../../src/physics/lunar/cislunar';
import { MU_MOON, R_MOON, moonState } from '../../src/physics/lunar/ephemeris';
import { moonBodyToEci } from '../../src/physics/lunar/orientation';
import type { TliTarget } from '../../src/physics/sim/tli-guidance';

export interface TliPlan { t: number; dv: number; yaw: number; target: TliTarget }
export interface TliAim { perilune: number; time: number }

export const trace: string[] = [];
const T = (s: string) => { if ((globalThis as { __tliTrace?: boolean }).__tliTrace) trace.push(s); };

const B_PLANE_LEAD = 6 * 3600;

function ellipseTo(rp: number, a: number, R: number): { nu: number; t: number } {
  const e = 1 - rp / a, nu = Math.acos(Math.max(-1, Math.min(1, (a * (1 - e * e) / R - 1) / e)));
  const E = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2));
  return { nu, t: (E - e * Math.sin(E)) * Math.sqrt(a ** 3 / MU_EARTH) };
}

function inPlane(jd0: number, s: CislunarState, t: number, arrival: number, rp: number): { miss: number; a: number } {
  const n = normalize(cross(s.r, s.v)), m = moonState(jd0 + arrival / 86400).r, u = normalize(s.r);
  const R = norm(m);
  let lo = (rp + R) / 2, hi = 50 * R;
  for (let i = 0; i < 60; i++) {
    const a = (lo + hi) / 2;
    if (ellipseTo(rp, a, R).t > arrival - t) lo = a; else hi = a;
  }
  const a = (lo + hi) / 2, mp = sub(m, scale(n, dot(m, n)));
  return { miss: wrapPi(wrap2pi(Math.atan2(dot(cross(u, mp), n), dot(u, mp))) - ellipseTo(rp, a, R).nu), a };
}

/** The B-plane miss (km, km, min) against the B-vector of the perilune's height in the plane nearest the Moon's equator, retrograde. */
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
  const Th = normalize(cross(S, pole)), Rh = cross(S, Th), d = sub(B, want);
  const ia = vinf2 / MU_MOON, F = Math.acosh(Math.max(1, (1 + r * ia) / e)) * Math.sign(dot(q.r, q.v));
  const tp = t - (e * Math.sinh(F) - F) / Math.sqrt(MU_MOON * ia ** 3);
  return [dot(d, Th) / 1e3, dot(d, Rh) / 1e3, (tp - aim.time) / 60];
}

const turn = (x: Vec3, u: Vec3, a: number): Vec3 => add(add(scale(x, Math.cos(a)), scale(cross(u, x), Math.sin(a))), scale(u, dot(u, x) * (1 - Math.cos(a))));

export function planTli(jd0: number, park: (t: number) => CislunarState, from: number, to: number, rp: number, _span: number, aim: TliAim): TliPlan | null {
  const arrival = aim.time;
  // where: the burn's middle at which the in-plane ellipse meets the Moon
  let t0 = NaN;
  for (let t = from, last = inPlane(jd0, park(t), t, arrival, rp).miss; t + 60 <= to; t += 60) {
    const next = inPlane(jd0, park(t + 60), t + 60, arrival, rp).miss;
    if (last > 0 && next <= 0 && last - next < 1) { t0 = t; break; }
    last = next;
  }
  T(`scan t0 ${t0}`);
  if (!(t0 >= from)) return null;
  let lo = t0, hi = t0 + 60;
  for (let i = 0; i < 16; i++) {
    const m = (lo + hi) / 2;
    if (inPlane(jd0, park(m), m, arrival, rp).miss > 0) lo = m; else hi = m;
  }
  const tau0 = (lo + hi) / 2, s0 = park(tau0), u0 = normalize(s0.r), np0 = normalize(cross(s0.r, s0.v));
  const m = moonState(jd0 + arrival / 86400).r;
  const psi0 = Math.atan(-dot(np0, m) / dot(cross(u0, np0), m));
  const conic = ([tau, c3, psi]: number[]) => {
    const s = park(tau), u = normalize(s.r), n = turn(normalize(cross(s.r, s.v)), u, psi);
    return { t: tau, n, park: s, s: { r: scale(u, rp), v: scale(normalize(cross(n, u)), Math.sqrt((2 * MU_EARTH) / rp + c3)) } };
  };
  const steps = [2, 200, 2e-5], caps = [120, 5e4, 0.01];
  const solve = (x: number[], a: TliAim): number[] | null => {
    for (let it = 0; ; it++) {
      const c = conic(x), f0 = bPlaneMiss(jd0, c.t, c.s, a);
      T(`it ${it} x ${x.map((v) => v.toPrecision(8)).join(' ')} f ${f0?.map((v) => v.toFixed(2)).join(' ')}`);
      if (!f0 || it >= 25) return null;
      if (Math.abs(f0[0]) < 2 && Math.abs(f0[1]) < 2 && Math.abs(f0[2]) < 0.05) return x;
      const J: number[][] = [[], [], []];
      for (let k = 0; k < 3; k++) {
        const ck = conic(x.map((v, i) => (i === k ? v + steps[k] : v))), fk = bPlaneMiss(jd0, ck.t, ck.s, a);
        if (!fk) return null;
        for (let i = 0; i < 3; i++) J[i][k] = (fk[i] - f0[i]) / steps[k];
      }
      const step = solve3(J, f0.map((v) => -v));
      if (!step) return null;
      const hold = Math.min(1, ...step.map((v, i) => caps[i] / Math.abs(v)));
      x = x.map((v, i) => v + step[i] * hold);
      if (Math.abs(x[0] - tau0) > 3000) return null;
    }
  };
  let proxy = { ...aim };
  let x = solve([tau0, -MU_EARTH / inPlane(jd0, s0, tau0, arrival, rp).a, psi0], proxy);
  for (let k = 0; x && k < 4; k++) {
    const c = conic(x), p = coastToPerilune(jd0, c.t, c.s, aim.time + 12 * 3600);
    T(`refine ${k}: perilune ${p ? (p.altitude / 1e3).toFixed(2) : 'none'} km at ${p ? (p.t - aim.time).toFixed(1) : '-'} s`);
    if (!p) return null;
    const dh = aim.perilune - p.altitude, dt = aim.time - p.t;
    if (Math.abs(dh) < 1e3 && Math.abs(dt) < 2) break;
    proxy = { perilune: proxy.perilune + dh, time: proxy.time + dt };
    x = solve(x, proxy);
  }
  if (!x) return null;
  const c = conic(x), el = elementsFromState(c.s.r, c.s.v);
  return { t: c.t, dv: norm(sub(c.s.v, c.park.v)), yaw: x[2], target: { c3: 2 * el.energy, e: el.e, inc: el.i, raan: el.raan, argp: el.argp } };
}
