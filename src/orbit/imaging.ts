/**
 * The satellite builder's camera (roadmap D06, docs/ROADMAP-PART2-3.md;
 * Phase 4 map §2.2 F): what O04's nadir-only `groundSampleDistance`
 * (src/orbit/applications.ts) leaves out when a student designs the camera —
 * how the ground sample grows as the camera tilts, the smallest detail its
 * aperture can resolve, and the data rate its pixels make as the ground
 * slides by.
 *
 * A module of its own beside applications.ts, so O04's file is unchanged;
 * it builds on `groundSampleDistance`, so at nadir the two agree to the bit.
 *
 * UNITS. SI and radians. The Earth is the sphere of radius `R_EARTH`, as in
 * `swathWidth` and `sideReach` and every D06 closed form (map risk R7).
 *
 * VALIDATION (tests/imaging.test.ts). `imagingDataRate` is held to TU Delft's
 * worked example (V-G4). `offNadirGsd` and `diffractionGsd` have no free
 * worked example (map §2.2 F): they are held to self-consistency only — the
 * nadir value, a ray traced to the sphere, `sideReach`'s slope, the Airy
 * pattern's first dark ring — and the UI should say so.
 */
import { MU_EARTH, R_EARTH } from '../physics/constants';
import { groundSampleDistance } from './applications';
import type { ImagingCore } from './satellite-cores';

/**
 * The speed of the point below a circular orbit at altitude `h` (m) over the
 * ground, m/s: the orbital speed √(μ/r) scaled to the surface, ·R/r (D06;
 * TU Delft reader Eq. [140]). It leaves out the Earth turning beneath, as
 * that equation does. At the equator the surface moves east at 465 m/s,
 * 465·cos i m/s of it along the track, which the speed over the ground loses
 * (i < 90°) or gains (i > 90°), so the error depends on the inclination i:
 * - sun-synchronous (about 98°): some 65 m/s gained, so the ground slides
 *   along the track up to about 1 % faster than this;
 * - prograde orbits: slower than this, about 4 % at the ISS's 51.6° and
 *   6.6 % for an equatorial orbit at 500 km;
 * - geostationary: the point below does not move over the ground at all,
 *   where this still gives 465 m/s.
 * Away from the equator the share falls as cos(latitude).
 */
export function groundSpeed(h: number): number {
  const r = R_EARTH + h;
  return Math.sqrt(MU_EARTH / r) * (R_EARTH / r);
}

/**
 * The ground sample distance of a camera tilted `offNadir` rad across its
 * track at altitude `h`, pitch `pitch` and focal length `focalLength` (all
 * m), m (D06, map §2.2 F):
 * - along the track p·ρ/f — the slant range ρ in place of the height, the
 *   ground there square to the line of sight;
 * - across it p·ρ/(f·cos θ_inc) — the ground also leans away, by the
 *   incidence θ_inc at the target, sin θ_inc = (r/R)·sin(offNadir).
 * ρ = (r² − R²)/(r·cos η + R·cos θ_inc), the near root of the triangle of the
 * Earth's centre, the satellite and the target, written without the
 * cancellation of r·cos η − R·cos θ_inc.
 *
 * At nadir both are `groundSampleDistance(h, p, f)`, returned as that, so the
 * figure O04 shows is the same number to the bit. A view grazing the horizon
 * has an infinite cross-track sample; past the horizon, or pointed away from
 * the Earth (90° or more from nadir), it sees no ground, and both are
 * Infinity.
 *
 * No free worked example (map §2.2 F): tests/imaging.test.ts holds it to a
 * ray traced to the sphere, and to `sideReach`.
 */
export function offNadirGsd(h: number, pitch: number, focalLength: number, offNadir: number): { along: number; cross: number } {
  if (offNadir === 0) {
    const g = groundSampleDistance(h, pitch, focalLength);
    return { along: g, cross: g };
  }
  const r = R_EARTH + h;
  const sinInc = (r / R_EARTH) * Math.abs(Math.sin(offNadir));
  // no ground: past the horizon, or pointed away from the Earth altogether
  // (beyond 90° |sin| shrinks again, and the near root would be negative)
  if (sinInc > 1 || Math.cos(offNadir) <= 0) return { along: Infinity, cross: Infinity };
  const cosInc = Math.sqrt(1 - sinInc * sinInc);
  const rho = (h * (2 * R_EARTH + h)) / (r * Math.cos(offNadir) + R_EARTH * cosInc);
  const along = groundSampleDistance(rho, pitch, focalLength);
  return { along, cross: along / cosInc };
}

/**
 * The smallest detail an aperture of diameter `aperture` (m) can separate at
 * wavelength `wavelength` (m) from `h` m straight down, m: 1.22·λ·h/D
 * (D06). Rayleigh's criterion, the angle to the first dark ring of the Airy
 * pattern, 1.2197·λ/D, rounded as optics texts round it. A camera whose
 * `groundSampleDistance` is finer than this is limited by its aperture, not
 * its pixels.
 *
 * No free worked example (map §2.2 F): tests/imaging.test.ts holds the 1.22
 * to the Airy pattern's first zero, and checks the direction against
 * Sentinel-2's published pupil and bands.
 */
export function diffractionGsd(h: number, aperture: number, wavelength: number): number {
  return (1.22 * wavelength * h) / aperture;
}

/**
 * The data rate of a push-broom camera, bit/s: `pixels` across the track, of
 * `bits` each, one line for every `gsd` m the ground slides by at
 * `groundSpeed(h)` — pixels·bits·v_ground/GSD, before compression (D06;
 * TU Delft reader Eqs. [138]–[140], held to its p. 183 example, V-G4).
 */
export function imagingDataRate(pixels: number, bits: number, gsd: number, h: number): number {
  return (pixels * bits * groundSpeed(h)) / gsd;
}

export const imagingCore = { offNadirGsd, diffractionGsd, imagingDataRate } satisfies ImagingCore;
