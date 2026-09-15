/**
 * Drag coefficient of a slender launch vehicle vs Mach number.
 * Generic curve: subsonic plateau, transonic rise, supersonic decay.
 * Values are typical for a cylindrical body with a conical/ogive nose.
 */
const CD_TABLE: [number, number][] = [
  [0.0, 0.30],
  [0.6, 0.30],
  [0.8, 0.34],
  [0.95, 0.48],
  [1.05, 0.62],
  [1.2, 0.64],
  [1.5, 0.58],
  [2.0, 0.50],
  [3.0, 0.40],
  [4.0, 0.34],
  [6.0, 0.28],
  [10.0, 0.24],
  [25.0, 0.22],
];

export function dragCoefficient(mach: number): number {
  if (mach <= CD_TABLE[0][0]) return CD_TABLE[0][1];
  for (let i = 1; i < CD_TABLE.length; i++) {
    if (mach <= CD_TABLE[i][0]) {
      const [m0, c0] = CD_TABLE[i - 1];
      const [m1, c1] = CD_TABLE[i];
      return c0 + ((c1 - c0) * (mach - m0)) / (m1 - m0);
    }
  }
  return CD_TABLE[CD_TABLE.length - 1][1];
}

/** Dynamic pressure, Pa */
export function dynamicPressure(rho: number, vAir: number): number {
  return 0.5 * rho * vAir * vAir;
}
