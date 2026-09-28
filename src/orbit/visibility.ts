/**
 * How a satellite looks from the ground (roadmap P2.5, for R03): where the
 * air lifts it to, and how bright it is.
 *
 * - **Refraction.** The air bends light down over the horizon, so a satellite
 *   is seen higher than it is: half a degree on the horizon, a few seconds of
 *   arc overhead. Sæmundsson's formula gives the lift of an object at true
 *   elevation h, R = 1.02′ / tan(h + 10.3/(h + 5.11)), h in degrees, for
 *   1010 hPa and 10 °C, scaled by (P/1010)(283/(273 + T)) for other air
 *   (J. Meeus, *Astronomical Algorithms*, 2nd ed., 1998, eq. 16.4). With it
 *   a pass rises and sets at the horizon one sees, seconds earlier and later
 *   than the geometric one.
 * - **Brightness.** A satellite's standard magnitude is its brightness fully
 *   lit at 1000 km (the convention of M. McCants's Quicksat magnitudes, from
 *   observers' estimates). From a range d and a phase angle φ (at the
 *   satellite, between the Sun and the observer), with the lit fraction of a
 *   sphere as the phase law, as the observers' conventions have it:
 *   m = m₀ + 5 log₁₀(d / 1000 km) − 2.5 log₁₀((1 + cos φ) / 2).
 *   Half lit (φ = 90°) is 0.75 magnitude fainter than fully lit: the 0.8
 *   between McCants's convention and Molczan's, which is at half phase. A real
 *   satellite flares and dims with its panels; this is the steady part, an
 *   estimate, and only for the satellites that have a standard magnitude.
 *
 * DOM-free; tests/visibility.test.ts holds the refraction to Skyfield's and
 * the brightness to its conventions.
 */
import type { Vec3 } from '../physics/vec3';

const DEG = Math.PI / 180;

/**
 * How much the air lifts an object at true elevation `el` (rad), rad, for
 * air at `pressureHpa` and `tempC`. Below −2° (nothing there is seen) it is
 * held at its value there.
 */
export function refraction(el: number, pressureHpa = 1010, tempC = 10): number {
  const h = Math.max(-2, el / DEG);
  const arcmin = 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * DEG);
  return (arcmin / 60) * DEG * (pressureHpa / 1010) * (283 / (273 + tempC));
}

/** The elevation an observer sees, rad, for a true one. */
export const apparentElevation = (el: number): number => el + refraction(el);

/** The phase angle at a satellite at `sat` seen from `observer` with the Sun in direction `sunDir` (unit; all in one frame), rad. */
export function phaseAngle(sat: Vec3, observer: Vec3, sunDir: Vec3): number {
  const ox = observer.x - sat.x, oy = observer.y - sat.y, oz = observer.z - sat.z;
  const on = Math.hypot(ox, oy, oz);
  const c = (ox * sunDir.x + oy * sunDir.y + oz * sunDir.z) / on;
  return Math.acos(Math.max(-1, Math.min(1, c)));
}

/** A satellite's magnitude from its standard magnitude (fully lit, 1000 km), its range (m) and its phase angle (rad). */
export function visualMagnitude(standard: number, range: number, phase: number): number {
  const lit = Math.max(1e-6, (1 + Math.cos(phase)) / 2);
  return standard + 5 * Math.log10(range / 1e6) - 2.5 * Math.log10(lit);
}

/** Satellites' standard magnitudes by catalogue number, as the bundled table has them. */
export type StandardMagnitudes = Readonly<Record<string, number>>;

let table: Promise<StandardMagnitudes> | null = null;
/** McCants's standard magnitudes (src/data/standard-magnitudes.json), loaded once when first needed. */
export function loadStandardMagnitudes(): Promise<StandardMagnitudes> {
  return table ??= import('../data/standard-magnitudes.json').then((m) => m.default.magnitudes as StandardMagnitudes);
}
