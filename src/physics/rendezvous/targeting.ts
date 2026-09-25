/**
 * Burn targeting for a rendezvous (roadmap G07), on the dynamics the flight
 * is actually flown on.
 *
 * Every burn the planner asks for is an impulse at a given instant, found by
 * shooting: propagate the spacecraft under J2 to the arrival instant, compare
 * with where it has to be, and correct the impulse with Newton's method on a
 * finite-difference Jacobian. No Keplerian Lambert solution is trusted to
 * describe a trajectory the J2 integrator will fly differently; a Kepler or
 * Clohessy–Wiltshire estimate only seeds the iteration.
 */
import { gravityJ2 } from '../gravity';
import { rk4Step } from '../integrator';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import type { PointState } from './station';

/** Integration step of the targeting propagations, s. */
const STEP = 5;

/** A coast under J2 from `s` for `duration` seconds. */
export function coastJ2(s: PointState, duration: number, step = STEP): PointState {
  let state: PointState = { r: { ...s.r }, v: { ...s.v } };
  let t = 0;
  while (t < duration - 1e-9) {
    const h = Math.min(step, duration - t);
    state = rk4Step(0, state, h, (_t, r) => gravityJ2(r));
    t += h;
  }
  return state;
}

/** Solve a 3×3 linear system by Cramer's rule; null when singular. */
function solve3(m: number[][], b: number[]): number[] | null {
  const det = (a: number[][]) => a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const d = det(m);
  if (!Number.isFinite(d) || Math.abs(d) < 1e-30) return null;
  return [0, 1, 2].map((k) => det(m.map((row, i) => row.map((x, j) => (j === k ? b[i] : x)))) / d);
}

export interface InterceptResult { dv: Vec3; miss: number; iterations: number }

/**
 * The impulse at `s` that puts the spacecraft at `target` after `duration`
 * seconds of J2 coast, starting from the guess `dv0`.
 *
 * @returns null when Newton's method does not converge to within `tolerance` m
 */
export function interceptImpulse(s: PointState, duration: number, target: Vec3, dv0: Vec3, tolerance = 1, maxIterations = 12): InterceptResult | null {
  let dv = { ...dv0 };
  const at = (d: Vec3) => coastJ2({ r: s.r, v: add(s.v, d) }, duration).r;
  for (let k = 0; k < maxIterations; k++) {
    const p = at(dv);
    const err = sub(p, target);
    const miss = norm(err);
    if (miss < tolerance) return { dv, miss, iterations: k };
    const h = 0.05;
    const cols = [v3(h, 0, 0), v3(0, h, 0), v3(0, 0, h)].map((e) => {
      const q = at(add(dv, e));
      return [(q.x - p.x) / h, (q.y - p.y) / h, (q.z - p.z) / h];
    });
    const jac = [0, 1, 2].map((i) => [cols[0][i], cols[1][i], cols[2][i]]);
    const step = solve3(jac, [-err.x, -err.y, -err.z]);
    if (!step) return null;
    // damp a step that would more than double the impulse: far from the solution the model is not linear
    const len = Math.hypot(step[0], step[1], step[2]), limit = Math.max(20, norm(dv));
    const k2 = len > limit ? limit / len : 1;
    dv = v3(dv.x + step[0] * k2, dv.y + step[1] * k2, dv.z + step[2] * k2);
  }
  const miss = norm(sub(at(dv), target));
  return miss < tolerance ? { dv, miss, iterations: maxIterations } : null;
}

/**
 * The impulse in the orbit's plane at `s` after which the spacecraft is at
 * an apsis at radius `radius` after `duration` seconds of J2 coast: a
 * transfer that arrives level, whatever the orbit it starts from. Newton's
 * method on the radial and along-track components, from the guess `dv0`.
 *
 * @returns null when it does not converge to within a metre and a millimetre per second
 */
export function apsisImpulse(s: PointState, duration: number, radius: number, dv0: Vec3, maxIterations = 12): Vec3 | null {
  const rHat = normalize(s.r);
  const tHat = normalize(cross(cross(s.r, s.v), s.r));
  const shot = (a: number, b: number) => {
    const e = coastJ2({ r: s.r, v: add(s.v, add(dv0, add(scale(rHat, a), scale(tHat, b)))) }, duration);
    const r = norm(e.r);
    return [r - radius, dot(e.r, e.v) / r];
  };
  let a = 0, b = 0;
  for (let k = 0; k < maxIterations; k++) {
    const f = shot(a, b);
    if (Math.abs(f[0]) < 1 && Math.abs(f[1]) < 1e-3) return add(dv0, add(scale(rHat, a), scale(tHat, b)));
    const h = 0.05;
    const fa = shot(a + h, b), fb = shot(a, b + h);
    const j11 = (fa[0] - f[0]) / h, j12 = (fb[0] - f[0]) / h, j21 = (fa[1] - f[1]) / h, j22 = (fb[1] - f[1]) / h;
    const det = j11 * j22 - j12 * j21;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
    a += (-f[0] * j22 + f[1] * j12) / det;
    b += (-j11 * f[1] + j21 * f[0]) / det;
  }
  return null;
}
