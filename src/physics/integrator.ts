import { Vec3, add, scale } from './vec3';

export interface PointState {
  r: Vec3;
  v: Vec3;
}

export type AccelFn = (t: number, r: Vec3, v: Vec3) => Vec3;

/** Classic 4th-order Runge–Kutta step for a point mass. */
export function rk4Step(t: number, s: PointState, dt: number, accel: AccelFn): PointState {
  const k1v = accel(t, s.r, s.v);
  const k1r = s.v;

  const r2 = add(s.r, scale(k1r, dt / 2));
  const v2 = add(s.v, scale(k1v, dt / 2));
  const k2v = accel(t + dt / 2, r2, v2);
  const k2r = v2;

  const r3 = add(s.r, scale(k2r, dt / 2));
  const v3_ = add(s.v, scale(k2v, dt / 2));
  const k3v = accel(t + dt / 2, r3, v3_);
  const k3r = v3_;

  const r4 = add(s.r, scale(k3r, dt));
  const v4 = add(s.v, scale(k3v, dt));
  const k4v = accel(t + dt, r4, v4);
  const k4r = v4;

  return {
    r: {
      x: s.r.x + (dt / 6) * (k1r.x + 2 * k2r.x + 2 * k3r.x + k4r.x),
      y: s.r.y + (dt / 6) * (k1r.y + 2 * k2r.y + 2 * k3r.y + k4r.y),
      z: s.r.z + (dt / 6) * (k1r.z + 2 * k2r.z + 2 * k3r.z + k4r.z),
    },
    v: {
      x: s.v.x + (dt / 6) * (k1v.x + 2 * k2v.x + 2 * k3v.x + k4v.x),
      y: s.v.y + (dt / 6) * (k1v.y + 2 * k2v.y + 2 * k3v.y + k4v.y),
      z: s.v.z + (dt / 6) * (k1v.z + 2 * k2v.z + 2 * k3v.z + k4v.z),
    },
  };
}
