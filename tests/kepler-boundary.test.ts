import { expect, it } from 'vitest';
import { orbitFromState, stateAt, type Orbit } from '../src/orbit/kepler';
import { MU_EARTH } from '../src/physics/constants';
import { norm, sub, type Vec3 } from '../src/physics/vec3';

const rp = 7e6;
const orbit = (e: number, m0 = 0): Orbit => ({ a: rp / (1 - e), e, m0, i: 0, raan: 0, argp: 0, jd0: 2461312.5 });
/** Independent Cartesian integration from analytic periapsis conditions. */
function reference(e: number, t: number, maxStep: number): { r: Vec3; v: Vec3 } {
  let y = [rp, 0, 0, 0, Math.sqrt(MU_EARTH * (1 + e) / rp), 0];
  const count = Math.ceil(Math.abs(t) / maxStep), h = t / count;
  const rate = (q: number[]): number[] => {
    const k = -MU_EARTH / Math.hypot(q[0], q[1], q[2]) ** 3;
    return [q[3], q[4], q[5], k * q[0], k * q[1], k * q[2]];
  };
  for (let j = 0; j < count; j++) {
    const a = rate(y), b = rate(y.map((q, i) => q + h * a[i] / 2));
    const c = rate(y.map((q, i) => q + h * b[i] / 2)), d = rate(y.map((q, i) => q + h * c[i]));
    y = y.map((q, i) => q + h * (a[i] + 2 * b[i] + 2 * c[i] + d[i]) / 6);
  }
  return { r: { x: y[0], y: y[1], z: y[2] }, v: { x: y[3], y: y[4], z: y[5] } };
}

for (const e of [.999999, .999999999, 1.000000001, 1.000001]) {
  it.each([-3600, 3600])(`propagates e=${e} for signed %s seconds from periapsis`, (t) => {
    const expected = reference(e, t, .25), coarse = reference(e, t, .5), actual = stateAt(orbit(e), t, false);
    expect(norm(sub(expected.r, coarse.r))).toBeLessThan(1e-3);
    expect(norm(sub(expected.v, coarse.v))).toBeLessThan(1e-6);
    expect(norm(sub(actual.r, expected.r))).toBeLessThan(1);
    expect(norm(sub(actual.v, expected.v))).toBeLessThan(1e-3);
    expect(Number.isFinite(actual.nu)).toBe(true);
  });
}

it.each([.999999, .999999999])('keeps analytic apsides at mean anomaly zero and pi, e=%s', (e) => {
  for (const m0 of [0, Math.PI]) {
    const o = orbit(e, m0), at = stateAt(o, 0, false), radius = m0 === 0 ? rp : o.a * (1 + e);
    expect(Math.abs(norm(at.r) / radius - 1)).toBeLessThan(1e-12);
    expect(Math.abs(norm(at.v) / Math.sqrt(MU_EARTH * (m0 === 0 ? 1 + e : 1 - e) / radius) - 1)).toBeLessThan(1e-12);
  }
});

for (const e of [.999999, .999999999, 1.000000001]) {
  it.each([-3600, 3600])(`preserves independent Cartesian states through the conic handoff, e=${e}, t=%s`, (t) => {
    const independent = reference(e, t, .25);
    const recovered = orbitFromState(independent.r, independent.v, 2461312.5 + t / 86400);
    const again = stateAt(recovered, 0, false);
    expect(norm(sub(again.r, independent.r))).toBeLessThan(1);
    expect(norm(sub(again.v, independent.v))).toBeLessThan(1e-3);
  });
}
