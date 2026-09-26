/**
 * What satellites are for (roadmap O04, docs/ROADMAP-PART2-3.md), as the
 * numbers an engineer works them out with:
 *
 * - communications from a geostationary satellite: where a dish on the
 *   ground points (azimuth, elevation, range, on the WGS-84 ellipsoid), how
 *   much of the Earth the satellite sees above a minimum elevation, how long
 *   a signal takes up and down, and the link budget of the downlink —
 *   free-space loss, the dish's gain, G/T, C/N₀ and Eb/N₀;
 * - Earth observation from a sun-synchronous orbit: the swath a camera's
 *   field of view covers from its height, its ground sample distance, and
 *   how often a nadir-looking camera can come back over a place.
 *
 * DOM-free, SI units and radians. The formulas are the textbook ones
 * (Maral & Bousquet, *Satellite Communications Systems*; Wertz et al.,
 * *Space Mission Engineering: The New SMAD*); tests/applications.test.ts
 * holds them to their closed forms, to exact special cases, and to the
 * published orbits of Thailand's own Earth-observation satellites.
 */
import { MU_EARTH, R_EARTH, SIDEREAL_DAY } from '../physics/constants';
import { dot, norm, sub, v3, type Vec3 } from '../physics/vec3';

/** The speed of light, m/s (exact, SI). */
export const C_LIGHT = 299_792_458;
/** Boltzmann's constant in decibels, 10·log₁₀(1.380 649 × 10⁻²³) dBW/(K·Hz): −228.6. */
export const BOLTZMANN_DB = 10 * Math.log10(1.380649e-23);

/** WGS-84: the equatorial radius, m, and the flattening. */
export const WGS84 = { a: 6_378_137, f: 1 / 298.257223563 } as const;
const E2 = WGS84.f * (2 - WGS84.f);

/** The geostationary radius: a circle turning once a sidereal day, m (42 164 km). */
export const GEO_RADIUS = Math.cbrt(MU_EARTH * (SIDEREAL_DAY / (2 * Math.PI)) ** 2);

export interface GroundStation {
  /** geodetic latitude and longitude, rad (east positive), height above the ellipsoid, m */
  lat: number;
  lon: number;
  h: number;
}

/** A point on the WGS-84 ellipsoid, in the Earth-fixed frame, m. */
export function geodeticToEcef(s: GroundStation): Vec3 {
  const sl = Math.sin(s.lat), cl = Math.cos(s.lat);
  const n = WGS84.a / Math.sqrt(1 - E2 * sl * sl);
  return v3((n + s.h) * cl * Math.cos(s.lon), (n + s.h) * cl * Math.sin(s.lon), (n * (1 - E2) + s.h) * sl);
}

/** A geostationary satellite over longitude `lon` (rad), in the Earth-fixed frame, m. */
export const geoEcef = (lon: number, r = GEO_RADIUS): Vec3 => v3(r * Math.cos(lon), r * Math.sin(lon), 0);

/** An inertial position `r` (ECI) in the Earth-fixed frame, the Earth turned by sidereal angle `theta`. */
export function eciToEcef(r: Vec3, theta: number): Vec3 {
  const c = Math.cos(theta), s = Math.sin(theta);
  return v3(c * r.x + s * r.y, -s * r.x + c * r.y, r.z);
}

export interface LookAngles {
  /** from north through east, rad in [0, 2π) */
  azimuth: number;
  /** above the local horizon (the ellipsoid's tangent plane), rad */
  elevation: number;
  /** the slant range, m */
  range: number;
}

/**
 * Where a dish at `station` points to see a satellite at `sat` (Earth-fixed,
 * m): the line of sight in the station's east–north–up axes, "up" along the
 * ellipsoid's normal (the geodetic vertical a spirit level finds).
 */
export function lookAngles(station: GroundStation, sat: Vec3): LookAngles {
  const p = geodeticToEcef(station);
  const rho = sub(sat, p), range = norm(rho);
  const sl = Math.sin(station.lat), cl = Math.cos(station.lat), so = Math.sin(station.lon), co = Math.cos(station.lon);
  const east = v3(-so, co, 0), north = v3(-sl * co, -sl * so, cl), up = v3(cl * co, cl * so, sl);
  const e = dot(rho, east), n = dot(rho, north), u = dot(rho, up);
  // into [0, 2π) — due north (atan2 of −0) is 0, not 2π
  const azimuth = ((Math.atan2(e, n) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  // straight overhead u/range rounds to a hair over 1
  return { azimuth, elevation: Math.asin(Math.max(-1, Math.min(1, u / range))), range };
}

/**
 * How far round the Earth a satellite at radius `r` is seen above elevation
 * `minEl`: the Earth central angle from the point under it to the edge of
 * its footprint, γ = acos(R cos ε / r) − ε (spherical Earth). For a
 * geostationary satellite at 0° elevation, 81.3°.
 */
export function footprintAngle(r: number, minEl: number): number {
  return Math.acos(Math.min(1, (R_EARTH * Math.cos(minEl)) / r)) - minEl;
}

/** The share of the Earth's surface within central angle γ of a point: (1 − cos γ)/2 (42.4 % for GEO at 0°). */
export const coverageFraction = (gamma: number): number => (1 - Math.cos(gamma)) / 2;

/** The footprint's edge on the map: `n` points of the small circle γ from (lat, lon), rad. */
export function footprintCircle(lat: number, lon: number, gamma: number, n = 180): { lat: number; lon: number }[] {
  const out: { lat: number; lon: number }[] = [];
  for (let k = 0; k <= n; k++) {
    const az = (2 * Math.PI * k) / n;
    const la = Math.asin(Math.sin(lat) * Math.cos(gamma) + Math.cos(lat) * Math.sin(gamma) * Math.cos(az));
    const lo = lon + Math.atan2(Math.sin(az) * Math.sin(gamma) * Math.cos(lat), Math.cos(gamma) - Math.sin(lat) * Math.sin(la));
    out.push({ lat: la, lon: Math.atan2(Math.sin(lo), Math.cos(lo)) });
  }
  return out;
}

/**
 * The time a signal takes over a path, s. Up to a geostationary satellite
 * and down again to a station under it: 2 × 35 786 km / c = 238.7 ms, and
 * a question and its answer twice that.
 */
export const signalDelay = (...ranges: number[]): number => ranges.reduce((s, r) => s + r, 0) / C_LIGHT;

// ─── the link budget ────────────────────────────────────────────────────────

/** The free-space path loss over `d` m at `f` Hz, dB: 20·log₁₀(4πdf/c). */
export const freeSpaceLoss = (d: number, f: number): number => 20 * Math.log10((4 * Math.PI * d * f) / C_LIGHT);

/** A dish's gain, dBi: 10·log₁₀(η (πDf/c)²) for diameter D, m, efficiency η, at f Hz. */
export const dishGain = (diameter: number, f: number, efficiency: number): number =>
  10 * Math.log10(efficiency * ((Math.PI * diameter * f) / C_LIGHT) ** 2);

export interface LinkInput {
  /** the satellite's EIRP towards the station, dBW */
  eirp: number;
  /** the carrier frequency, Hz */
  frequency: number;
  /** the slant range, m */
  range: number;
  /** the receiving dish: diameter, m, and aperture efficiency */
  diameter: number;
  efficiency: number;
  /** the receiving system's noise temperature, K */
  noiseTemperature: number;
  /** everything else lost on the way — atmosphere, rain, pointing — dB */
  losses: number;
  /** the data rate carried, bit/s */
  dataRate: number;
}

export interface LinkBudget {
  /** dB */
  pathLoss: number;
  /** dBi */
  gain: number;
  /** dB/K */
  gOverT: number;
  /** received carrier power, dBW */
  carrier: number;
  /** carrier to noise density, dBHz, and energy per bit to noise density, dB */
  cOverN0: number;
  ebOverN0: number;
}

/** The downlink budget: C/N₀ = EIRP − L_fs − L + G/T − k, and Eb/N₀ = C/N₀ − 10·log₁₀(R_b). */
export function linkBudget(l: LinkInput): LinkBudget {
  const pathLoss = freeSpaceLoss(l.range, l.frequency);
  const gain = dishGain(l.diameter, l.frequency, l.efficiency);
  const gOverT = gain - 10 * Math.log10(l.noiseTemperature);
  const carrier = l.eirp - pathLoss - l.losses + gain;
  const cOverN0 = l.eirp - pathLoss - l.losses + gOverT - BOLTZMANN_DB;
  return { pathLoss, gain, gOverT, carrier, cOverN0, ebOverN0: cOverN0 - 10 * Math.log10(l.dataRate) };
}

// ─── Earth observation ──────────────────────────────────────────────────────

/**
 * The swath a camera with full field of view `fov` (rad) covers looking
 * straight down from `h` m, on a spherical Earth, m: the edge of the view
 * meets the ground at Earth central angle asin(((R+h)/R)·sin(fov/2)) − fov/2
 * from the point below (SMAD's geometry); the flat-Earth 2h·tan(fov/2) is
 * the limit for a narrow view. Null where the view spills past the horizon.
 */
export function swathWidth(h: number, fov: number): number | null {
  const eta = fov / 2, s = ((R_EARTH + h) / R_EARTH) * Math.sin(eta);
  if (s >= 1) return null;
  return 2 * R_EARTH * (Math.asin(s) - eta);
}

/** The field of view that gives a swath `swath` m from `h` m (the inverse of `swathWidth`), rad. */
export function fovForSwath(h: number, swath: number): number {
  const lambda = swath / (2 * R_EARTH);
  // the edge's nadir angle: tan η = R sin λ / (R + h − R cos λ)
  return 2 * Math.atan2(R_EARTH * Math.sin(lambda), R_EARTH + h - R_EARTH * Math.cos(lambda));
}

/** The ground sample distance straight down, m: height × pixel pitch / focal length. */
export const groundSampleDistance = (h: number, pixelPitch: number, focalLength: number): number => (h * pixelPitch) / focalLength;

/**
 * How far to the side of its track a satellite at `h` m can look when it
 * tilts by `offNadir` (rad), measured along the ground, m: half the swath of
 * a view that wide. THEOS-2 tilts up to 45°.
 */
export const sideReach = (h: number, offNadir: number): number | null => {
  const w = swathWidth(h, 2 * offNadir);
  return w === null ? null : w / 2;
};

/**
 * How far apart at latitude `lat` the day's tracks are, m: the circle of
 * latitude shared among the revolutions of a day. An optical camera images
 * on the daylight passes only, one a revolution; what a strip `swath` wide
 * covers of the gap between two is swath / spacing.
 */
export const dailyTrackSpacing = (revsPerDay: number, lat: number): number => (2 * Math.PI * R_EARTH * Math.cos(lat)) / revsPerDay;

/**
 * The spacing of the tracks at the equator once the ground track has
 * repeated — `revs` revolutions in its cycle — m: the grid a satellite
 * looking straight down is limited to (40 075 km / 385 = 104 km for THEOS-2).
 */
export const repeatGridSpacing = (revs: number): number => (2 * Math.PI * R_EARTH) / revs;

/** Where the point under a satellite at inertial `r` is, the Earth turned by `theta`, rad. */
export function subSatellite(r: Vec3, theta: number): { lat: number; lon: number } {
  const e = eciToEcef(r, theta), rm = norm(e);
  return { lat: Math.asin(e.z / rm), lon: Math.atan2(e.y, e.x) };
}
