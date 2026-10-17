/**
 * The WGS-84 ellipsoid: where the ground is, and the geodetic latitude and
 * height of a position.
 *
 * The launch sites stand on it (D-51, plan R4.5: the owner's "ทำพร้อมกัน",
 * 2026-10-17): a site's latitude is geodetic, its altitude a height above the
 * ellipsoid (`groundPositionEci`, src/physics/orbital.ts). Every height the
 * flight reads for the air or the ground is the height above it: the air
 * lies on the geoid, within about a hundred metres of the ellipsoid, and the
 * ground with it, and the ellipsoid falls below the 6,378.137 km sphere by
 * 21.4 km × sin²(latitude): 4.9 km at the Cape, 11.0 km at Baikonur, 13.2 km at
 * Vostochny, 16.9 km at Plesetsk. Orbit heights — perigee, apogee, the
 * insertion targets — stay the radius less 6,378.137 km (`R_EARTH`), the
 * catalogues' convention (McDowell, GCAT, "Orbits"; docs/PHYSICS.md §13.6).
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

/**
 * Geodetic latitude (rad) and height above the WGS-84 ellipsoid (m) of an
 * Earth-centred position (m), for the flight's hot paths: one pass of
 * Bowring's formula with its sines and cosines taken from the ratios (no
 * trigonometric call), and the height as p·cos φ + z·sin φ − a·√(1 − e²sin²φ),
 * which holds at the poles. Measured against the exact inverse of
 * `geodeticToCartesian` from −30 km to the Moon's distance: the height to
 * 0.25 µm (4 nm below 2000 km), the latitude to 1e-8 rad. About nine times
 * faster than `geodetic`, which the long-term propagator keeps.
 */
export function geodeticFast(x: number, y: number, z: number): { lat: number; h: number } {
  const p = Math.sqrt(x * x + y * y);
  const u = z * A, w = p * B, q = Math.sqrt(u * u + w * w);
  if (!(q > 0)) return { lat: 0, h: -A };
  const s = u / q, c = w / q;
  const Y = z + EP2 * B * s * s * s, X = p - E2 * A * c * c * c, k = Math.sqrt(X * X + Y * Y);
  const sl = Y / k, cl = X / k;
  return { lat: Math.atan2(Y, X), h: p * cl + z * sl - A * Math.sqrt(1 - E2 * sl * sl) };
}

/** Height above the WGS-84 ellipsoid, m, of a position, m (`geodeticFast`'s, without the latitude's atan2). */
export function geodeticHeight(r: Vec3): number {
  const x = r.x, y = r.y, z = r.z, p = Math.sqrt(x * x + y * y);
  const u = z * A, w = p * B, q = Math.sqrt(u * u + w * w);
  if (!(q > 0)) return -A;
  const s = u / q, c = w / q;
  const Y = z + EP2 * B * s * s * s, X = p - E2 * A * c * c * c, k = Math.sqrt(X * X + Y * Y);
  const sl = Y / k, cl = X / k;
  return p * cl + z * sl - A * Math.sqrt(1 - E2 * sl * sl);
}

/** Geodetic latitude, rad, of a position, m. */
export function geodeticLatitude(r: Vec3): number {
  return geodetic(r.x, r.y, r.z).lat;
}

/**
 * Earth-centred position, m, of a point at geodetic latitude `lat` and
 * longitude `lon` (rad, the longitude counted in whatever frame the caller
 * turns it into) and height `h` above the ellipsoid, m.
 */
export function geodeticToCartesian(lat: number, lon: number, h: number): Vec3 {
  const sl = Math.sin(lat), cl = Math.cos(lat);
  const n = A / Math.sqrt(1 - E2 * sl * sl);
  const p = (n + h) * cl;
  return { x: p * Math.cos(lon), y: p * Math.sin(lon), z: (n * (1 - E2) + h) * sl };
}

/** Geocentric latitude, rad, of the point at geodetic latitude `lat` (rad) and height `h` (m) above the ellipsoid. */
export function geocentricLatitude(lat: number, h = 0): number {
  const sl = Math.sin(lat), cl = Math.cos(lat);
  const n = A / Math.sqrt(1 - E2 * sl * sl);
  return Math.atan2((n * (1 - E2) + h) * sl, (n + h) * cl);
}
