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
  // Every comparison with NaN is false, so without this guard a NaN Mach number
  // falls through the whole table and returns the hypersonic 0.22 (audit item
  // B40(9)) — the smallest value in the curve, exactly when something has gone
  // wrong and the drag should not be quietly minimised.
  if (!Number.isFinite(mach)) return CD_TABLE[0][1];
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

/**
 * Drag coefficient of a *blunt, tumbling* body — a spent stage, a jettisoned
 * booster, a fairing half — at Mach `mach`.
 *
 * `cd0` is the body's subsonic/free-molecular value (1.2 for a tumbling stage,
 * 1.5 for a fairing half, 2.2 for a blunt spent stage in free molecular flow).
 * The Mach dependence is much weaker than a slender launcher's: a transonic
 * rise of about 20 % and a mild hypersonic fall, rather than the 3× swing of
 * `dragCoefficient`. Shape only — the magnitude is the caller's `cd0`.
 */
export function tumblingDragCoefficient(cd0: number, mach: number): number {
  if (!Number.isFinite(mach) || mach <= 0.8) return cd0;
  if (mach < 1.2) return cd0 * (1 + (0.2 * (mach - 0.8)) / 0.4);
  if (mach < 5) return cd0 * (1.2 - (0.25 * (mach - 1.2)) / 3.8);
  return cd0 * 0.95;
}

/** Dynamic pressure, Pa */
export function dynamicPressure(rho: number, vAir: number): number {
  return 0.5 * rho * vAir * vAir;
}
