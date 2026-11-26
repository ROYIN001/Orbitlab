/**
 * WGS-84 geodesy of the astro base (PF-12): geodetic <-> Earth-centred
 * coordinates, the local frame and normal gravity. Radians, metres, seconds.
 * Works in any Earth-centred frame whose z axis is the spin axis.
 */
export interface V3 { x: number; y: number; z: number }
export interface Geodetic { lat: number; lon: number; h: number }

/** WGS-84 (NIMA TR8350.2): equatorial radius, m; flattening. */
export const WGS84_A = 6378137;
export const WGS84_F = 1 / 298.257223563;
export const WGS84_B = WGS84_A * (1 - WGS84_F);
export const WGS84_E2 = WGS84_F * (2 - WGS84_F);

const NAN3 = (): V3 => ({ x: NaN, y: NaN, z: NaN });
/** True unless every argument is finite (x * 0 is 0 only for a finite x, and cannot overflow). */
const nonFinite = (...a: number[]) => a.reduce((s, v) => s + v * 0, 0) !== 0;

/**
 * Bowring's iteration on the reduced latitude, run to convergence under a
 * fixed cap, so it ends for every input; good from -10 km to 40,000 km.
 * Height is p cos(lat) + z sin(lat) - a sqrt(1 - e2 sin^2(lat)), which stays
 * accurate at the poles. A non-finite input gives NaN in every number.
 */
export function geodeticFromEcef(r: V3): Geodetic {
  if (nonFinite(r.x, r.y, r.z)) return { lat: NaN, lon: NaN, h: NaN };
  const p = Math.hypot(r.x, r.y);
  let th = Math.atan2(r.z * WGS84_A, p * WGS84_B);
  let lat = 0;
  const ep2 = WGS84_E2 / (1 - WGS84_E2);
  for (let pass = 0; pass < 12; pass++) {
    const s = Math.sin(th), c = Math.cos(th);
    lat = Math.atan2(r.z + ep2 * WGS84_B * s * s * s, p - WGS84_E2 * WGS84_A * c * c * c);
    const next = Math.atan2((1 - WGS84_F) * Math.sin(lat), Math.cos(lat));
    const done = next === th; // no change in the last bit
    th = next;
    if (done) break;
  }
  const sl = Math.sin(lat);
  const h = p * Math.cos(lat) + r.z * sl - WGS84_A * Math.sqrt(1 - WGS84_E2 * sl * sl);
  const lon = Math.atan2(r.y, r.x);
  // atan2 gives -pi for y = -0, x < 0; the range is (-pi, pi].
  return { lat, lon: lon === -Math.PI ? Math.PI : lon, h };
}

export function ecefFromGeodetic(lat: number, lon: number, h: number): V3 {
  if (nonFinite(lat, lon, h)) return NAN3();
  const sl = Math.sin(lat), cl = Math.cos(lat);
  const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * sl * sl);
  return {
    x: (n + h) * cl * Math.cos(lon),
    y: (n + h) * cl * Math.sin(lon),
    z: (n * (1 - WGS84_E2) + h) * sl,
  };
}

/** Unit normal to the ellipsoid, outward: the direction height grows in. */
export function ellipsoidNormal(lat: number, lon: number): V3 {
  if (nonFinite(lat, lon)) return NAN3();
  const cl = Math.cos(lat);
  return { x: cl * Math.cos(lon), y: cl * Math.sin(lon), z: Math.sin(lat) };
}

export function enuBasis(lat: number, lon: number): { east: V3; north: V3; up: V3 } {
  if (nonFinite(lat, lon)) return { east: NAN3(), north: NAN3(), up: NAN3() };
  const sl = Math.sin(lat), cl = Math.cos(lat), so = Math.sin(lon), co = Math.cos(lon);
  return {
    east: { x: -so, y: co, z: 0 },
    north: { x: -sl * co, y: -sl * so, z: cl },
    up: { x: cl * co, y: cl * so, z: sl },
  };
}

/** Somigliana's formula with the published WGS-84 constants, m/s^2 on the ellipsoid. */
export function normalGravity(lat: number): number {
  const s2 = Math.sin(lat) ** 2;
  return 9.7803253359 * (1 + 0.00193185265241 * s2) / Math.sqrt(1 - 0.00669437999014 * s2);
}
