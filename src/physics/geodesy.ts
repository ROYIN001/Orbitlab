/**
 * The WGS-84 ellipsoid: geodetic latitude and height of a position.
 *
 * The flight's own bookkeeping measures heights from a 6,378.137 km sphere
 * (`R_EARTH`), which is right where it is used: the ascent and the orbit fly
 * in radius, and the catalogues' heights are radius less 6,378 km (McDowell,
 * GCAT, "Orbits"). The air and the ground are not on that sphere. They lie
 * on the geoid, within a hundred metres of the ellipsoid, which falls below
 * the sphere by 21.4 km at the poles: 5.4 km at 30° N, 11.1 km at 46° N,
 * 13.0 km at 51° N. A body that decelerates in the air at those latitudes
 * meets it some 10 km lower in radius than the sphere would put it. So the
 * long-term propagator's density (propagator/density.ts) and a return from
 * orbit that asks for it (`DescentCapsule.datum`, rigid/escape.ts) read
 * their heights here.
 *
 * Heights and latitudes do not depend on the Earth's turn about its axis, so
 * an inertial position gives the same values as the Earth-fixed one.
 */
import type { Vec3 } from './vec3';

/** WGS-84 (NIMA TR8350.2): equatorial radius, m; flattening. */
export const WGS84_A = 6_378_137;
export const WGS84_F = 1 / 298.257223563;
const A = WGS84_A, F = WGS84_F;
const B = A * (1 - F), E2 = F * (2 - F), EP2 = (A * A - B * B) / (B * B);

/**
 * Geodetic latitude (rad) and height above the WGS-84 ellipsoid (m) of an
 * Earth-centred position (m): Bowring's formula, two passes (the second from
 * the reduced latitude of the first), good to a small fraction of a
 * millimetre from the ground to 2000 km.
 */
export function geodetic(x: number, y: number, z: number): { lat: number; h: number } {
  const p = Math.hypot(x, y);
  let lat = 0;
  let th = Math.atan2(z * A, p * B);
  for (let pass = 0; pass < 2; pass++) {
    const s = Math.sin(th), c = Math.cos(th);
    lat = Math.atan2(z + EP2 * B * s * s * s, p - E2 * A * c * c * c);
    th = Math.atan2((1 - F) * Math.sin(lat), Math.cos(lat));
  }
  const sl = Math.sin(lat), cl = Math.cos(lat);
  const n = A / Math.sqrt(1 - E2 * sl * sl);
  const h = Math.abs(cl) > 1e-3 ? p / cl - n : Math.abs(z) / Math.abs(sl) - n * (1 - E2);
  return { lat, h };
}

/** Height above the WGS-84 ellipsoid, m, of a position, m. */
export function geodeticHeight(r: Vec3): number {
  return geodetic(r.x, r.y, r.z).h;
}

/** Geodetic latitude, rad, of a position, m. */
export function geodeticLatitude(r: Vec3): number {
  return geodetic(r.x, r.y, r.z).lat;
}
