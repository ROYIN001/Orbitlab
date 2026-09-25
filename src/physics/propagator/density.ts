/**
 * The density of the upper atmosphere for long-term orbit decay (roadmap
 * P07): the Harris–Priester model as Montenbruck & Gill give it (*Satellite
 * Orbits*, §3.5.2, Table 3.8), 100–1000 km. It carries the diurnal bulge — the
 * air is densest a little after local noon, 30° east of the Sun, and
 * thinnest before dawn — which a static profile does not, and scales with
 * solar activity.
 *
 * The table is for mean solar activity (F10.7 ≈ 150). The upper atmosphere
 * swells with the Sun's ultraviolet output, so at 500 km a quiet Sun leaves
 * several times less air than the mean and an active one several times more:
 * `SOLAR_ACTIVITY` takes that as ±0.45 decades of density above 500 km,
 * tapering to nothing at 120 km — a fit to the spread between the
 * CIRA-72/MSIS profiles at F10.7 = 70 and 250, good to a factor of two, which
 * is the honest accuracy of any lifetime prediction a solar cycle ahead.
 *
 * Used by the long-term propagator only: the ascent keeps its own
 * atmosphere (src/physics/atmosphere.ts).
 */
import type { V3 } from './ephemeris';

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

export type SolarActivity = 'low' | 'mean' | 'high';

/** Decades of density the Sun's activity adds (high) or takes away (low) at an altitude, km. */
export function solarActivityDecades(altKm: number, activity: SolarActivity): number {
  if (activity === 'mean') return 0;
  const ramp = Math.max(0, Math.min(1, (altKm - 120) / 380));
  return (activity === 'high' ? 0.45 : -0.45) * ramp;
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
 * Density at an ECI position `r` (m) and altitude (km) with the Sun at
 * `sun` (ECI, any length): the table's minimum rising to its maximum as
 * cos^n of half the angle from the bulge's apex. n = 2 suits low
 * inclinations and 6 polar orbits (Montenbruck & Gill).
 */
export function harrisPriesterDensity(r: V3, altKm: number, sun: V3, n = 4, activity: SolarActivity = 'mean'): number {
  const [mn, mx] = harrisPriesterBounds(altKm);
  if (mx === 0) return 0;
  const ra = Math.atan2(sun[1], sun[0]) + BULGE_LAG;
  const sr = Math.hypot(sun[0], sun[1], sun[2]);
  const dec = Math.asin(sun[2] / sr);
  const eb: V3 = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  const rr = Math.hypot(r[0], r[1], r[2]);
  const cosPsi = (r[0] * eb[0] + r[1] * eb[1] + r[2] * eb[2]) / rr;
  const bulge = ((1 + cosPsi) / 2) ** (n / 2);
  return (mn + (mx - mn) * bulge) * 10 ** solarActivityDecades(altKm, activity);
}

/** The exponent for an inclination, rad: 2 at the equator to 6 at the pole. */
export function bulgeExponent(inclination: number): number {
  const s = Math.abs(Math.sin(inclination));
  return 2 + 4 * s * s;
}
