import { type Vec3, cross, dot, norm, scale } from '../vec3';

/** Hamilton, scalar first. Active rotation from Body (+X nose) to ECI. */
export interface Quat { w: number; x: number; y: number; z: number }
/** Row-major matrix; inertia entries are about the CG, expressed in body axes. */
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];

export const quatIdentity = (): Quat => ({ w: 1, x: 0, y: 0, z: 0 });
export const quatConjugate = (q: Quat): Quat => ({ w: q.w, x: -q.x, y: -q.y, z: -q.z });
export const quatNorm = (q: Quat): number => Math.hypot(q.w, q.x, q.y, q.z);
export function quatNormalize(q: Quat): Quat {
  const n = quatNorm(q);
  if (!(n > 0) || !Number.isFinite(n)) throw new RangeError('Quaternion must be finite and nonzero');
  return { w: q.w / n, x: q.x / n, y: q.y / n, z: q.z / n };
}

/** Composition: rotate by b, then a. Never canonicalize the sign during integration.
 * Reference: NASA/JPL NAIF Rotation Required Reading, "Quaternion Arithmetic"
 * https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/req/rotation.html
 */
export function quatMultiply(a: Quat, b: Quat): Quat {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

export function quatFromAxisAngle(axis: Vec3, angleRad: number): Quat {
  const length = norm(axis);
  if (!Number.isFinite(angleRad) || !Number.isFinite(length) || !(length > 0)) {
    throw new RangeError('Axis-angle requires a finite nonzero axis and finite angle');
  }
  const k = Math.sin(angleRad / 2) / length;
  return { w: Math.cos(angleRad / 2), x: axis.x * k, y: axis.y * k, z: axis.z * k };
}

export function quatRotate(q: Quat, v: Vec3): Vec3 {
  const u = quatNormalize(q);
  const twiceCross = scale(cross(u, v), 2);
  const secondCross = cross(u, twiceCross);
  return {
    x: v.x + u.w * twiceCross.x + secondCross.x,
    y: v.y + u.w * twiceCross.y + secondCross.y,
    z: v.z + u.w * twiceCross.z + secondCross.z,
  };
}
export const quatInverseRotate = (q: Quat, v: Vec3): Vec3 => quatRotate(quatConjugate(q), v);

export function quatToMatrix(q: Quat): Mat3 {
  const { w, x, y, z } = quatNormalize(q);
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
    2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
    2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
  ];
}

/** Accept only proper rotations: a reflected render basis is not an attitude. */
export function quatFromMatrix(m: Mat3): Quat {
  if (m.length !== 9 || !m.every(Number.isFinite)) throw new RangeError('Rotation matrix must contain nine finite values');
  const gram = matMul(matTranspose(m), m);
  const det = m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6])
    + m[2] * (m[3] * m[7] - m[4] * m[6]);
  if (gram.some((value, index) => Math.abs(value - (index % 4 === 0 ? 1 : 0)) > 1e-10)
    || Math.abs(det - 1) > 1e-10) throw new RangeError('Rotation matrix must be orthonormal with determinant +1');
  const trace = m[0] + m[4] + m[8];
  let q: Quat;
  if (trace > 0) {
    const s = 2 * Math.sqrt(1 + trace);
    q = { w: s / 4, x: (m[7] - m[5]) / s, y: (m[2] - m[6]) / s, z: (m[3] - m[1]) / s };
  } else if (m[0] > m[4] && m[0] > m[8]) {
    const s = 2 * Math.sqrt(1 + m[0] - m[4] - m[8]);
    q = { w: (m[7] - m[5]) / s, x: s / 4, y: (m[1] + m[3]) / s, z: (m[2] + m[6]) / s };
  } else if (m[4] > m[8]) {
    const s = 2 * Math.sqrt(1 + m[4] - m[0] - m[8]);
    q = { w: (m[2] - m[6]) / s, x: (m[1] + m[3]) / s, y: s / 4, z: (m[5] + m[7]) / s };
  } else {
    const s = 2 * Math.sqrt(1 + m[8] - m[0] - m[4]);
    q = { w: (m[3] - m[1]) / s, x: (m[2] + m[6]) / s, y: (m[5] + m[7]) / s, z: s / 4 };
  }
  return quatNormalize(q);
}

/** Columns are the body basis vectors expressed in ECI. */
export const quatFromBasis = (x: Vec3, y: Vec3, z: Vec3): Quat =>
  quatFromMatrix([x.x, y.x, z.x, x.y, y.y, z.y, x.z, y.z, z.z]);

/** Small-angle-safe shortest rotation distance; q and -q are identical. */
export function quatAngularDistance(a: Quat, b: Quat): number {
  const d = quatMultiply(quatConjugate(quatNormalize(a)), quatNormalize(b));
  return 2 * Math.atan2(Math.hypot(d.x, d.y, d.z), Math.abs(d.w));
}

export function quatSlerp(a: Quat, b: Quat, fraction: number): Quat {
  if (!Number.isFinite(fraction)) throw new RangeError('SLERP fraction must be finite');
  const x = quatNormalize(a);
  let y = quatNormalize(b);
  let cosine = x.w * y.w + dot(x, y);
  if (cosine < 0) {
    y = { w: -y.w, x: -y.x, y: -y.y, z: -y.z };
    cosine = -cosine;
  }
  const theta = Math.acos(Math.min(1, cosine));
  const s = Math.sin(theta);
  const ka = s < 1e-8 ? 1 - fraction : Math.sin((1 - fraction) * theta) / s;
  const kb = s < 1e-8 ? fraction : Math.sin(fraction * theta) / s;
  return quatNormalize({ w: ka * x.w + kb * y.w, x: ka * x.x + kb * y.x,
    y: ka * x.y + kb * y.y, z: ka * x.z + kb * y.z });
}

export function matVecMul(m: Mat3, v: Vec3): Vec3 {
  return { x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
    y: m[3] * v.x + m[4] * v.y + m[5] * v.z,
    z: m[6] * v.x + m[7] * v.y + m[8] * v.z };
}
export const matTranspose = (m: Mat3): Mat3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
export function matMul(a: Mat3, b: Mat3): Mat3 {
  const out = Array<number>(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    out[3 * i + j] = a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j];
  }
  return out as unknown as Mat3;
}

/** Scaled Cholesky factorization also rejects nonfinite, nonsymmetric, singular
 * and indefinite input. SPD does not by itself certify a physical mass model. */
function cholesky(m: Mat3): readonly [number, number, number, number, number, number, number] {
  const size = Math.max(...m.map(Math.abs));
  if (m.length !== 9 || !m.every(Number.isFinite) || !(size > 0)) throw new RangeError('Inertia must be finite SPD');
  const symmetryTolerance = 32 * Number.EPSILON * size;
  if (Math.abs(m[1] - m[3]) > symmetryTolerance || Math.abs(m[2] - m[6]) > symmetryTolerance
    || Math.abs(m[5] - m[7]) > symmetryTolerance) throw new RangeError('Inertia must be symmetric');
  const a = Math.sqrt(m[0] / size);
  const b = m[3] / size / a;
  const c = m[6] / size / a;
  const d = Math.sqrt(m[4] / size - b * b);
  const e = (m[7] / size - b * c) / d;
  const f = Math.sqrt(m[8] / size - c * c - e * e);
  if (![a, b, c, d, e, f].every(Number.isFinite) || !(a > 0 && d > 0 && f > 0)) {
    throw new RangeError('Inertia must be positive definite');
  }
  return [a, b, c, d, e, f, size];
}
export function assertSPD(m: Mat3): void { cholesky(m); }
/** Solve I x = b without a matrix inverse, preserving all products of inertia. */
export function solveSPD(m: Mat3, v: Vec3): Vec3 {
  if (![v.x, v.y, v.z].every(Number.isFinite)) throw new RangeError('Solve vector must be finite');
  const [a, b, c, d, e, f, size] = cholesky(m);
  const y0 = v.x / size / a;
  const y1 = (v.y / size - b * y0) / d;
  const y2 = (v.z / size - c * y0 - e * y1) / f;
  const z = y2 / f;
  const y = (y1 - e * z) / d;
  const x = (y0 - b * y - c * z) / a;
  if (![x, y, z].every(Number.isFinite)) throw new RangeError('Inertia solve overflow');
  return { x, y, z };
}
