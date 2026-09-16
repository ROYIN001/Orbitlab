/**
 * Minimal 3-vector helpers on plain objects. Kept free of Three.js so the
 * physics can run in Node (tests, autotune workers) without a DOM.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const v3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
export const clone = (a: Vec3): Vec3 => ({ x: a.x, y: a.y, z: a.z });
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const norm = (a: Vec3): number => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
export const norm2 = (a: Vec3): number => a.x * a.x + a.y * a.y + a.z * a.z;
export const normalize = (a: Vec3): Vec3 => {
  const n = norm(a);
  return n > 0 ? scale(a, 1 / n) : v3(0, 0, 0);
};
/** a + b*s */
export const addScaled = (a: Vec3, b: Vec3, s: number): Vec3 => ({
  x: a.x + b.x * s,
  y: a.y + b.y * s,
  z: a.z + b.z * s,
});
export const dist = (a: Vec3, b: Vec3): number => norm(sub(a, b));
export const negate = (a: Vec3): Vec3 => ({ x: -a.x, y: -a.y, z: -a.z });
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});
/** Angle between two vectors, radians */
export const angleBetween = (a: Vec3, b: Vec3): number => {
  const d = dot(a, b) / (norm(a) * norm(b));
  return Math.acos(Math.max(-1, Math.min(1, d)));
};
/** Rotate vector v about unit axis k by angle theta (Rodrigues). */
export const rotateAxis = (v: Vec3, k: Vec3, theta: number): Vec3 => {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const kxv = cross(k, v);
  const kdv = dot(k, v);
  return {
    x: v.x * c + kxv.x * s + k.x * kdv * (1 - c),
    y: v.y * c + kxv.y * s + k.y * kdv * (1 - c),
    z: v.z * c + kxv.z * s + k.z * kdv * (1 - c),
  };
};
/**
 * Slew unit vector `from` toward unit vector `to` by at most `maxAngle` radians.
 */
export const slerpLimited = (from: Vec3, to: Vec3, maxAngle: number): Vec3 => {
  const ang = angleBetween(from, to);
  if (ang <= maxAngle || ang < 1e-9) return normalize(to);
  let axis = cross(from, to);
  if (norm(axis) < 1e-12) {
    // anti-parallel: pick any perpendicular axis
    axis = Math.abs(from.x) < 0.9 ? cross(from, v3(1, 0, 0)) : cross(from, v3(0, 1, 0));
  }
  return normalize(rotateAxis(from, normalize(axis), maxAngle));
};
