/**
 * Two-body propagation of the astro base (PF-15): one universal-variable step
 * for the ellipse, the parabola and the hyperbola. Metres, seconds, m^3/s^2.
 */
import type { State } from './frames';

/** Cap on the passes of the solver (the bracket's own growth is capped apart). */
export const KEPLER_MAX_ITER = 100;
const MAX_BRACKET = 2200;

/** True unless every argument is finite (x * 0 is 0 only for a finite x, and cannot overflow). */
const nonFinite = (...a: number[]) => a.reduce((s, v) => s + v * 0, 0) !== 0;
const NAN_STATE = (): State => ({ r: { x: NaN, y: NaN, z: NaN }, v: { x: NaN, y: NaN, z: NaN } });

/**
 * Stumpff functions c2 = (1 - cos z) / z^2 and c3 = (z - sin z) / z^3 with
 * psi = z^2 (z imaginary for psi < 0). The series of c_k = sum (-psi)^j / (2j + k)!
 * serves wherever |psi| < 1; beyond, c2 is taken in its half-angle form
 * 2 sin^2(z/2) / z^2 (sinh for psi < 0), which keeps the digits the textbook form loses.
 */
function stumpff(psi: number): [number, number] {
  if (Math.abs(psi) < 1) {
    let t2 = 1 / 2, t3 = 1 / 6, c2 = 0, c3 = 0;
    for (let j = 0; j < 12; j++) {
      c2 += t2;
      c3 += t3;
      t2 *= -psi / ((2 * j + 3) * (2 * j + 4));
      t3 *= -psi / ((2 * j + 4) * (2 * j + 5));
    }
    return [c2, c3];
  }
  if (psi > 0) {
    const z = Math.sqrt(psi), h = Math.sin(z / 2);
    return [(2 * h * h) / psi, (z - Math.sin(z)) / (psi * z)];
  }
  const z = Math.sqrt(-psi), h = Math.sinh(z / 2);
  return [(2 * h * h) / -psi, (Math.sinh(z) - z) / (-psi * z)];
}

/**
 * The state dt seconds later on the two-body orbit through s, for any conic.
 * mu in m^3/s^2. The universal variable chi is found by Newton's method kept
 * inside a bracket (the time is monotonic in chi), at most KEPLER_MAX_ITER
 * passes, so it always ends. dt = 0 returns the input; r = 0, mu <= 0 or any
 * non-finite input gives NaN in every number. A state with r parallel to v is
 * outside the contract.
 */
export function keplerUniversal(s: State, dt: number, mu: number): State {
  const { r, v } = s;
  if (nonFinite(r.x, r.y, r.z, v.x, v.y, v.z, dt, mu)) return NAN_STATE();
  const r0 = Math.hypot(r.x, r.y, r.z);
  if (!(r0 > 0) || !(mu > 0) || !(Number.isFinite(r0))) return NAN_STATE();
  if (dt === 0) return { r: { ...r }, v: { ...v } };

  const sm = Math.sqrt(mu);
  const v2 = v.x * v.x + v.y * v.y + v.z * v.z;
  const sig0 = (r.x * v.x + r.y * v.y + r.z * v.z) / sm; // r0.v0 / sqrt(mu)
  const alpha = 2 / r0 - v2 / mu; // 1/a
  const zr = (r0 * v2) / mu - 1; // 1 - alpha r0

  // F(chi) = t(chi) - dt and its slope r(chi) / sqrt(mu)
  const eval_ = (chi: number) => {
    const x2 = chi * chi, psi = alpha * x2;
    const [c2, c3] = stumpff(psi);
    const t = (sig0 * x2 * c2 + zr * x2 * chi * c3 + r0 * chi) / sm;
    const rr = x2 * c2 + sig0 * chi * (1 - psi * c3) + r0 * (1 - psi * c2);
    return { f: t - dt, d: rr / sm, c2, c3 };
  };

  // bracket: [0, w] for dt > 0, [-w, 0] for dt < 0, doubled until the sign changes
  const sgn = dt > 0 ? 1 : -1;
  const guess = (sm * dt) / r0;
  let w = Math.min(Math.abs(guess), Math.sqrt(r0)); // growing from a small start keeps sinh and sin finite
  let lo = 0, hi = 0;
  for (let k = 0; k < MAX_BRACKET; k++) {
    const f = sgn * eval_(sgn * w).f;
    if (!(f < 0)) break; // reached, or beyond what a double holds
    w *= 2;
  }
  if (sgn > 0) hi = w; else lo = -w;

  let chi = Math.min(hi, Math.max(lo, guess));
  for (let k = 0; k < KEPLER_MAX_ITER; k++) {
    const e = eval_(chi);
    if (e.f === 0) break;
    if (e.f > 0) hi = chi; else lo = chi;
    let next = chi - e.f / e.d;
    if (Math.abs(next - chi) <= 4 * Number.EPSILON * Math.abs(chi)) { chi = next; break; } // the Newton step is below the last bits
    if (!(next > lo && next < hi)) next = lo + (hi - lo) / 2; // outside the bracket (or not a number): bisect
    chi = next;
    if (hi - lo <= 64 * Number.EPSILON * Math.abs(chi)) break; // the bracket is down to rounding noise in t(chi)
  }

  const { c2, c3 } = eval_(chi);
  const x2 = chi * chi, psi = alpha * x2;
  const f = 1 - (x2 * c2) / r0;
  const g = dt - (x2 * chi * c3) / sm;
  const p = { x: f * r.x + g * v.x, y: f * r.y + g * v.y, z: f * r.z + g * v.z };
  const rn = Math.hypot(p.x, p.y, p.z);
  const fd = (sm * chi * (psi * c3 - 1)) / (rn * r0);
  const gd = 1 - (x2 * c2) / rn;
  return {
    r: p,
    v: { x: fd * r.x + gd * v.x, y: fd * r.y + gd * v.y, z: fd * r.z + gd * v.z },
  };
}
