import { MU_EARTH, R_EARTH, J2_EARTH, OMEGA_EARTH } from './constants';
import { Vec3, v3, norm } from './vec3';

/** Point-mass gravitational acceleration. */
export function gravity(r: Vec3, mu = MU_EARTH): Vec3 {
  const rm = norm(r);
  const f = -mu / (rm * rm * rm);
  return v3(r.x * f, r.y * f, r.z * f);
}

/** Point-mass gravity plus the J2 oblateness perturbation. */
export function gravityJ2(r: Vec3, mu = MU_EARTH): Vec3 {
  const rm = norm(r);
  const rm2 = rm * rm;
  const f = -mu / (rm2 * rm);
  const z2 = r.z * r.z;
  const k = (1.5 * J2_EARTH * mu * R_EARTH * R_EARTH) / (rm2 * rm2 * rm);
  const five = (5 * z2) / rm2;
  return v3(
    r.x * f + k * r.x * (five - 1),
    r.y * f + k * r.y * (five - 1),
    r.z * f + k * r.z * (five - 3),
  );
}

/**
 * The gravity a body at rest on the turning Earth feels, m/s²: the J2 field
 * and the centrifugal term ω²(x, y, 0). On the WGS-84 ellipsoid it is the
 * normal gravity of Somigliana's formula to a few parts in a million, and it
 * points along the ellipsoid's normal (tests/wgs84-sites.test.ts).
 */
export function effectiveGravityJ2(r: Vec3): Vec3 {
  const g = gravityJ2(r), w2 = OMEGA_EARTH * OMEGA_EARTH;
  return v3(g.x + w2 * r.x, g.y + w2 * r.y, g.z);
}
