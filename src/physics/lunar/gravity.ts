/**
 * The Moon's own gravity field beyond a point mass (roadmap C01,
 * docs/PHYSICS.md §13.11): its degree-2 terms, the oblateness J2 and the
 * equatorial ellipticity C22 — the Moon's long axis pointed at the Earth —
 * from the GRAIL field (Konopliv et al., *JGR Planets* 118, 2013; GL0660B,
 * unnormalized, reference radius 1,738 km). What moves a low lunar orbit's
 * pericynthion by kilometres in a day — the mascons, the higher degrees — is
 * not here (§13.11).
 */
import { v3, type Vec3 } from '../vec3';
import { MU_MOON } from './ephemeris';
import { moonBodyToEci } from './orientation';

/** Reference radius of the coefficients, m. */
export const MOON_REF_RADIUS = 1738.0e3;
/** J2 = −C20, unnormalized. */
export const MOON_J2 = 2.0330e-4;
/** C22, unnormalized. */
export const MOON_C22 = 2.2382e-5;

/**
 * The acceleration the degree-2 field adds to the point mass's at `rel`, the
 * spacecraft's position from the Moon's centre (ECI of date, m), at UTC Julian
 * date `jd`; `body` is the Moon's body-to-ECI matrix when the caller has it.
 */
export function moonDegree2(rel: Vec3, jd: number, body = moonBodyToEci(jd)): Vec3 {
  const m = body;
  // into the body frame: Mᵀ · rel
  const x = m[0] * rel.x + m[3] * rel.y + m[6] * rel.z;
  const y = m[1] * rel.x + m[4] * rel.y + m[7] * rel.z;
  const z = m[2] * rel.x + m[5] * rel.y + m[8] * rel.z;
  const r2 = x * x + y * y + z * z, r = Math.sqrt(r2), r5 = r2 * r2 * r;
  const R2 = MOON_REF_RADIUS * MOON_REF_RADIUS;
  // J2: −∇ of (μ/r) J2 (R/r)² P2(sin φ)
  const kJ = (-1.5 * MOON_J2 * MU_MOON * R2) / r5, zz = (5 * z * z) / r2;
  let ax = kJ * x * (1 - zz), ay = kJ * y * (1 - zz), az = kJ * z * (3 - zz);
  // C22: ∇ of 3 μ R² C22 (x² − y²) / r⁵
  const kC = (3 * MU_MOON * R2 * MOON_C22) / r5, q = (x * x - y * y) / r2;
  ax += kC * (2 * x - 5 * x * q);
  ay += kC * (-2 * y - 5 * y * q);
  az += kC * (-5 * z * q);
  // back to the ECI: M · a
  return v3(m[0] * ax + m[1] * ay + m[2] * az, m[3] * ax + m[4] * ay + m[5] * az, m[6] * ax + m[7] * ay + m[8] * az);
}
