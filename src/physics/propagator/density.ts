/**
 * The density of the upper atmosphere for long-term orbit decay (roadmap P07,
 * R05), 100–1000 km: how much air there is on average at a height, and how it
 * is spread around the Earth through the day.
 *
 * - **The level** is NRLMSISE-00's, averaged over the day and the seasons, as
 *   ECSS tabulates it for three levels of solar and geomagnetic activity
 *   (ECSS-E-ST-10-04C, 15 November 2008, Annex G, Tables G-1 to G-3: low,
 *   moderate and high long-term; `ECSS_LEVELS` in activity.ts). Between them
 *   and a little beyond, the logarithm of the density is interpolated in the
 *   inverse of the exospheric temperature that the IPS relation gives for
 *   F10.7 and Ap, T = 900 + 2.5 (F10.7 − 70) + 1.5 Ap K (IPS Radio and Space
 *   Services, "Satellite Orbital Decay Calculations", Australian Bureau of
 *   Meteorology) — the thermosphere's scale height grows with T, so log ρ
 *   goes roughly as 1/T. Above 900 km, the last row's level carries the
 *   Harris–Priester profile on.
 * - **The spread** is Harris–Priester's, as Montenbruck & Gill give it
 *   (*Satellite Orbits*, §3.5.2, Table 3.8): the diurnal bulge, densest a
 *   little after local noon, 30° east of the Sun, thinnest before dawn —
 *   its minimum-to-maximum ratio at each height, normalised so that its
 *   average over the globe is the level above.
 *
 * The indices themselves — fixed at one of ECSS's levels, or measured and
 * forecast month by month — are activity.ts's. Used by the long-term
 * propagator only: the ascent keeps its own atmosphere
 * (src/physics/atmosphere.ts). tests/activity.test.ts holds the model to the
 * ECSS tables and its decay to satellites' published re-entry dates.
 */
import type { V3 } from './ephemeris';
import { R_EARTH } from '../constants';
import { ECSS_LEVELS, type Indices } from './activity';

/** Altitude, km; minimum and maximum density, g/km³ (1e-12 kg/m³). */
const TABLE: readonly (readonly [number, number, number])[] = [
  [100, 4.974e5, 4.974e5], [120, 2.490e4, 2.490e4], [130, 8.377e3, 8.710e3], [140, 3.899e3, 4.059e3],
  [150, 2.122e3, 2.215e3], [160, 1.263e3, 1.344e3], [170, 8.008e2, 8.758e2], [180, 5.283e2, 6.010e2],
  [190, 3.617e2, 4.297e2], [200, 2.557e2, 3.162e2], [210, 1.839e2, 2.396e2], [220, 1.341e2, 1.853e2],
  [230, 9.949e1, 1.455e2], [240, 7.488e1, 1.157e2], [250, 5.709e1, 9.308e1], [260, 4.403e1, 7.555e1],
  [270, 3.430e1, 6.182e1], [280, 2.697e1, 5.095e1], [290, 2.139e1, 4.226e1], [300, 1.708e1, 3.526e1],
  [320, 1.099e1, 2.511e1], [340, 7.214e0, 1.819e1], [360, 4.824e0, 1.337e1], [380, 3.274e0, 9.955e0],
  [400, 2.249e0, 7.492e0], [420, 1.558e0, 5.684e0], [440, 1.091e0, 4.355e0], [460, 7.701e-1, 3.362e0],
  [480, 5.474e-1, 2.612e0], [500, 3.916e-1, 2.042e0], [520, 2.819e-1, 1.605e0], [540, 2.042e-1, 1.267e0],
  [560, 1.488e-1, 1.005e0], [580, 1.092e-1, 7.997e-1], [600, 8.070e-2, 6.390e-1], [620, 6.012e-2, 5.123e-1],
  [640, 4.519e-2, 4.121e-1], [660, 3.430e-2, 3.325e-1], [680, 2.632e-2, 2.691e-1], [700, 2.043e-2, 2.185e-1],
  [720, 1.607e-2, 1.779e-1], [740, 1.281e-2, 1.452e-1], [760, 1.036e-2, 1.190e-1], [780, 8.496e-3, 9.776e-2],
  [800, 7.069e-3, 8.059e-2], [840, 4.680e-3, 5.741e-2], [880, 3.200e-3, 4.210e-2], [920, 2.210e-3, 3.130e-2],
  [960, 1.560e-3, 2.360e-2], [1000, 1.150e-3, 1.810e-2],
];

/** WGS-84's flattening. */
const FLATTENING = 1 / 298.257223563;

/**
 * Height above the WGS-84 ellipsoid, km, of an ECI position, m: the distance
 * less the ellipsoid's radius at the point's geocentric latitude,
 * a (1 − f sin²φ), good to some tens of metres below 1000 km. Both tables are
 * of height above the ellipsoid (Montenbruck & Gill evaluate Harris–Priester
 * at the geodetic height); over a sphere of the equatorial radius, a
 * satellite at 50° of latitude would read 12 km low and meet a third more
 * air than there is.
 */
export function heightKm(r: V3): number {
  const rn = Math.hypot(r[0], r[1], r[2]);
  const s = r[2] / rn;
  return (rn - R_EARTH * (1 - FLATTENING * s * s)) / 1000;
}

/** Exponential interpolation in the table: [ρ_min, ρ_max], kg/m³; zero above 1000 km, the top row below 100. */
export function harrisPriesterBounds(altKm: number): [number, number] {
  if (altKm > 1000) return [0, 0];
  const h = Math.max(100, altKm);
  let i = 0;
  while (i < TABLE.length - 2 && TABLE[i + 1][0] <= h) i++;
  const [h0, mn0, mx0] = TABLE[i], [h1, mn1, mx1] = TABLE[i + 1];
  const f = (h - h0) / (h1 - h0);
  const interp = (a: number, b: number) => a * (b / a) ** f;
  return [interp(mn0, mn1) * 1e-12, interp(mx0, mx1) * 1e-12];
}

/** Lag of the bulge's apex behind the Sun, rad (30° east of the subsolar point). */
const BULGE_LAG = 30 * Math.PI / 180;

/**
 * Harris–Priester's own density (mean solar activity) at an ECI position `r`
 * (m) and altitude (km) with the Sun at `sun` (ECI, any length): the table's
 * minimum rising to its maximum as cos^n of half the angle from the bulge's
 * apex. n = 2 suits low inclinations and 6 polar orbits (Montenbruck & Gill).
 */
export function harrisPriesterDensity(r: V3, altKm: number, sun: V3, n = 4): number {
  const [mn, mx] = harrisPriesterBounds(altKm);
  if (mx === 0) return 0;
  const ra = Math.atan2(sun[1], sun[0]) + BULGE_LAG;
  const sr = Math.hypot(sun[0], sun[1], sun[2]);
  const dec = Math.asin(sun[2] / sr);
  const eb: V3 = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  const rr = Math.hypot(r[0], r[1], r[2]);
  const cosPsi = (r[0] * eb[0] + r[1] * eb[1] + r[2] * eb[2]) / rr;
  const bulge = ((1 + cosPsi) / 2) ** (n / 2);
  return mn + (mx - mn) * bulge;
}

/** The exponent for an inclination, rad: 2 at the equator to 6 at the pole. */
export function bulgeExponent(inclination: number): number {
  const s = Math.abs(Math.sin(inclination));
  return 2 + 4 * s * s;
}

// ─── the level, from NRLMSISE-00 ────────────────────────────────────────────

/**
 * NRLMSISE-00's total density averaged over the day and the seasons, kg/m³,
 * at ECSS's low, moderate and high long-term activity: altitude, km, then the
 * three (ECSS-E-ST-10-04C, Annex G, Tables G-1 to G-3, the ρ column).
 */
const MSIS: readonly (readonly [number, number, number, number])[] = [
  [100, 6.180e-07, 5.730e-07, 5.640e-07], [120, 1.880e-08, 2.030e-08, 2.220e-08],
  [140, 3.080e-09, 3.440e-09, 3.930e-09], [160, 9.490e-10, 1.200e-09, 1.540e-09],
  [180, 3.700e-10, 5.460e-10, 7.870e-10], [200, 1.630e-10, 2.840e-10, 4.570e-10],
  [220, 7.800e-11, 1.610e-10, 2.860e-10], [240, 3.970e-11, 9.600e-11, 1.870e-10],
  [260, 2.130e-11, 5.970e-11, 1.270e-10], [280, 1.180e-11, 3.830e-11, 8.870e-11],
  [300, 6.800e-12, 2.520e-11, 6.310e-11], [320, 4.010e-12, 1.690e-11, 4.560e-11],
  [340, 2.410e-12, 1.160e-11, 3.340e-11], [360, 1.470e-12, 7.990e-12, 2.470e-11],
  [380, 9.140e-13, 5.600e-12, 1.850e-11], [400, 5.750e-13, 3.960e-12, 1.400e-11],
  [420, 3.660e-13, 2.830e-12, 1.060e-11], [440, 2.350e-13, 2.030e-12, 8.130e-12],
  [460, 1.530e-13, 1.470e-12, 6.260e-12], [480, 1.010e-13, 1.070e-12, 4.840e-12],
  [500, 6.790e-14, 7.850e-13, 3.760e-12], [520, 4.630e-14, 5.780e-13, 2.940e-12],
  [540, 3.210e-14, 4.290e-13, 2.310e-12], [560, 2.280e-14, 3.190e-13, 1.820e-12],
  [580, 1.650e-14, 2.390e-13, 1.430e-12], [600, 1.230e-14, 1.800e-13, 1.140e-12],
  [620, 9.370e-15, 1.360e-13, 9.060e-13], [640, 7.330e-15, 1.040e-13, 7.230e-13],
  [660, 5.880e-15, 7.980e-14, 5.790e-13], [680, 4.830e-15, 6.160e-14, 4.650e-13],
  [700, 4.040e-15, 4.800e-14, 3.750e-13], [720, 3.440e-15, 3.760e-14, 3.030e-13],
  [740, 2.980e-15, 2.980e-14, 2.460e-13], [760, 2.610e-15, 2.380e-14, 2.000e-13],
  [780, 2.310e-15, 1.920e-14, 1.630e-13], [800, 2.060e-15, 1.570e-14, 1.340e-13],
  [820, 1.850e-15, 1.290e-14, 1.100e-13], [840, 1.670e-15, 1.070e-14, 9.060e-14],
  [860, 1.510e-15, 9.030e-15, 7.500e-14], [880, 1.380e-15, 7.670e-15, 6.230e-14],
  [900, 1.260e-15, 6.590e-15, 6.000e-14],
];

/** The IPS relation: the exospheric temperature, K, for F10.7 and Ap. */
export function exosphericTemperature(i: Indices): number {
  return 900 + 2.5 * (i.f107 - 70) + 1.5 * i.ap;
}

/** 1/T at ECSS's three levels: the nodes of the interpolation. */
const X = [ECSS_LEVELS.low, ECSS_LEVELS.moderate, ECSS_LEVELS.high].map((l) => 1 / exosphericTemperature(l));

/**
 * NRLMSISE-00's density averaged over the day at `altKm` (held at 100 and
 * 900 km beyond them) for the indices, kg/m³: exponential in altitude between
 * the table's rows, log-linear in 1/T between (and on beyond) its levels.
 */
export function meanDensity(altKm: number, i: Indices): number {
  const h = Math.max(100, Math.min(900, altKm));
  const j = Math.min(MSIS.length - 2, Math.floor((h - 100) / 20));
  const f = (h - MSIS[j][0]) / 20;
  const lg = [1, 2, 3].map((c) => Math.log10(MSIS[j][c]) * (1 - f) + Math.log10(MSIS[j + 1][c]) * f);
  // held within 600–2000 K: the relation's reach, and far past any month on record
  const x = 1 / Math.max(600, Math.min(2000, exosphericTemperature(i)));
  const out = x >= X[1]
    ? lg[1] + ((lg[0] - lg[1]) * (x - X[1])) / (X[0] - X[1])
    : lg[1] + ((lg[2] - lg[1]) * (X[1] - x)) / (X[1] - X[2]);
  return 10 ** out;
}

/** Harris–Priester's density averaged over the globe at a height: the bulge's cos^n averages 1/(n/2 + 1). */
function harrisPriesterMean(altKm: number, n: number): number {
  const [mn, mx] = harrisPriesterBounds(altKm);
  return mn + (mx - mn) / (n / 2 + 1);
}

/**
 * The density the propagator uses, kg/m³: at an ECI position `r` (m) and
 * altitude (km), the Sun at `sun`, bulge exponent `n`, for the indices —
 * Harris–Priester's spread through the day at NRLMSISE-00's level.
 */
export function airDensity(r: V3, altKm: number, sun: V3, n: number, i: Indices): number {
  const hp = harrisPriesterDensity(r, altKm, sun, n);
  if (hp === 0) return 0;
  const h = Math.max(100, Math.min(900, altKm));
  return hp * (meanDensity(h, i) / harrisPriesterMean(h, n));
}
