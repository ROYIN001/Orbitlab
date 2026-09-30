import { expect, it } from 'vitest';
import { lambert } from '../src/orbit/maneuvers';
import { MU_EARTH, R_EARTH } from '../src/physics/constants';
import { cross, norm, sub, type Vec3 } from '../src/physics/vec3';

/** Independent Cartesian RK4; does not call the production conic propagator. */
function integrate(r: Vec3, v: Vec3, dt: number, step: number): { r: Vec3; v: Vec3 } {
  let y = [r.x, r.y, r.z, v.x, v.y, v.z];
  const n = Math.ceil(dt / step), h = dt / n;
  const rate = (q: number[]): number[] => {
    const k = -MU_EARTH / Math.hypot(q[0], q[1], q[2]) ** 3;
    return [q[3], q[4], q[5], k * q[0], k * q[1], k * q[2]];
  };
  for (let j = 0; j < n; j++) {
    const a = rate(y), b = rate(y.map((q, i) => q + h * a[i] / 2));
    const c = rate(y.map((q, i) => q + h * b[i] / 2)), d = rate(y.map((q, i) => q + h * c[i]));
    y = y.map((q, i) => q + h * (a[i] + 2 * b[i] + 2 * c[i] + d[i]) / 6);
  }
  return { r: { x: y[0], y: y[1], z: y[2] }, v: { x: y[3], y: y[4], z: y[5] } };
}

it.each([[2800, false, 0.25], [2800, true, 0.25], [86400, false, 0.5]] as const)('reaches a near-antipodal target with independent integration, dt=%s longWay=%s', (dt, longWay, step) => {
  const r1 = { x: R_EARTH + 400e3, y: 0, z: 0 }, angle = 179.999999 * Math.PI / 180;
  const r2 = { x: (R_EARTH + 700e3) * Math.cos(angle), y: (R_EARTH + 700e3) * Math.sin(angle), z: 0 };
  const result = lambert(r1, r2, dt, longWay);
  expect(result).not.toBeNull();
  expect(Math.sign(cross(r1, result!.v1).z)).toBe(longWay ? -1 : 1);
  const fine = integrate(r1, result!.v1, dt, step), coarse = integrate(r1, result!.v1, dt, step * 2);
  expect(norm(sub(fine.r, coarse.r))).toBeLessThan(1e-3);
  expect(norm(sub(fine.v, coarse.v))).toBeLessThan(1e-6);
  expect(norm(sub(fine.r, r2))).toBeLessThan(1);
  expect(norm(sub(fine.v, result!.v2))).toBeLessThan(1e-3);
});

it.each([false, true])('rejects exactly collinear endpoints without an orbital plane, longWay=%s', (longWay) => {
  const r1 = { x: R_EARTH + 400e3, y: 0, z: 0 };
  for (const x of [R_EARTH + 700e3, -R_EARTH - 700e3]) {
    expect(lambert(r1, { x, y: 0, z: 0 }, 2800, longWay)).toBeNull();
  }
});
