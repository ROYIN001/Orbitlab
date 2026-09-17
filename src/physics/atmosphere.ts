/**
 * Earth atmosphere model.
 *
 * 0–86 km: US Standard Atmosphere 1976 (7 layers, hydrostatic with linear
 *          temperature lapse rates) — gives temperature, pressure, density
 *          and speed of sound. Accurate for max-Q and drag-loss calculations.
 * 86–1000 km: piecewise exponential density (Vallado, "Fundamentals of
 *          Astrodynamics", table 8-4). Used for upper-atmosphere drag and
 *          orbital decay.
 */

const R_AIR = 287.05287; // J/(kg K)
const GAMMA = 1.4;
const G0 = 9.80665;
const R_EARTH_USSA = 6356766; // m, used for geopotential altitude

interface Layer {
  hb: number; // base geopotential altitude, m
  Tb: number; // base temperature, K
  L: number; // lapse rate, K/m
  Pb: number; // base pressure, Pa
}

// Bases computed from the USSA-76 definition.
const LAYERS: Layer[] = [
  { hb: 0, Tb: 288.15, L: -0.0065, Pb: 101325 },
  { hb: 11000, Tb: 216.65, L: 0, Pb: 22632.06 },
  { hb: 20000, Tb: 216.65, L: 0.001, Pb: 5474.889 },
  { hb: 32000, Tb: 228.65, L: 0.0028, Pb: 868.0187 },
  { hb: 47000, Tb: 270.65, L: 0, Pb: 110.9063 },
  { hb: 51000, Tb: 270.65, L: -0.0028, Pb: 66.93887 },
  { hb: 71000, Tb: 214.65, L: -0.002, Pb: 3.956420 },
];
const H_MAX_USSA = 86000;

// Vallado exponential model: [base altitude km, density kg/m^3, scale height km]
//
// The 86 km row is NOT the published one. Vallado's table quotes 6.958e-6 with a
// 5.5 km scale height, which is discontinuous at both ends of its own interval:
// it is 5.1 % below the USSA-76 value the branch above hands over (6.95793e-6 at
// 86 km) and decays to 3.190e-6 at 90 km where the next row starts at 3.396e-6 —
// a 6.4 % density *inversion* in the middle of the decay band, i.e. drag with a
// discontinuous, wrong-signed derivative (audit item B29). The row is re-derived
// here so that it is continuous with both: base density = the USSA-76 value at
// 86 km, scale height H = 4 km / ln(6.958e-6 / 3.396e-6) = 5.575 km, which lands
// exactly on the 90 km row. Every other node in the table is continuous to
// better than 0.04 % and is left as published.
const EXP_TABLE: [number, number, number][] = [
  [86, 6.95793e-6, 5.575],
  [90, 3.396e-6, 5.382],
  [100, 5.297e-7, 5.877],
  [110, 9.661e-8, 7.263],
  [120, 2.438e-8, 9.473],
  [130, 8.484e-9, 12.636],
  [140, 3.845e-9, 16.149],
  [150, 2.07e-9, 22.523],
  [180, 5.464e-10, 29.74],
  [200, 2.789e-10, 37.105],
  [250, 7.248e-11, 45.546],
  [300, 2.418e-11, 53.628],
  [350, 9.518e-12, 53.298],
  [400, 3.725e-12, 58.515],
  [450, 1.585e-12, 60.828],
  [500, 6.967e-13, 63.822],
  [600, 1.454e-13, 71.835],
  [700, 3.614e-14, 88.667],
  [800, 1.17e-14, 124.64],
  [900, 5.245e-15, 181.05],
  [1000, 3.019e-15, 268.0],
];

export interface AtmoState {
  /** temperature K */
  T: number;
  /** pressure Pa */
  p: number;
  /** density kg/m^3 */
  rho: number;
  /** speed of sound m/s */
  a: number;
}

/**
 * Atmospheric state at geometric altitude h (m above the mean surface).
 */
export function atmosphere(h: number): AtmoState {
  if (h < 0) h = 0;
  if (h <= H_MAX_USSA) {
    // geopotential altitude
    const hg = (R_EARTH_USSA * h) / (R_EARTH_USSA + h);
    let layer = LAYERS[0];
    for (let i = LAYERS.length - 1; i >= 0; i--) {
      if (hg >= LAYERS[i].hb) {
        layer = LAYERS[i];
        break;
      }
    }
    const dh = hg - layer.hb;
    const T = layer.Tb + layer.L * dh;
    let p: number;
    if (Math.abs(layer.L) < 1e-12) {
      p = layer.Pb * Math.exp((-G0 * dh) / (R_AIR * layer.Tb));
    } else {
      p = layer.Pb * Math.pow(layer.Tb / T, G0 / (R_AIR * layer.L));
    }
    const rho = p / (R_AIR * T);
    const a = Math.sqrt(GAMMA * R_AIR * T);
    return { T, p, rho, a };
  }
  // Exponential extension
  const hk = h / 1000;
  let row = EXP_TABLE[EXP_TABLE.length - 1];
  for (let i = EXP_TABLE.length - 1; i >= 0; i--) {
    if (hk >= EXP_TABLE[i][0]) {
      row = EXP_TABLE[i];
      break;
    }
  }
  const rho = row[1] * Math.exp(-(hk - row[0]) / row[2]);
  // USSA-76 holds the mesopause temperature at 186.87 K from 86 to 91 km before
  // the thermosphere starts; above that it rises toward ~1000 K. Only matters
  // for Mach-number bookkeeping, where density is negligible anyway.
  const T = Math.min(1000, 186.87 + Math.max(0, hk - 91) * 8);
  const p = rho * R_AIR * T;
  const a = Math.sqrt(GAMMA * R_AIR * T);
  return { T, p, rho, a };
}

/** Density only (fast path for propagation). */
export function density(h: number): number {
  return atmosphere(h).rho;
}

/** Ambient pressure, Pa (0 above 1000 km). */
export function pressure(h: number): number {
  if (h > 1000e3) return 0;
  return atmosphere(h).p;
}
