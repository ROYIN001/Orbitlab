/**
 * R3.3: the bench's subsystem diagrams, as view models of the figures the
 * bench already shows (`designFigures`, src/design/satellite-model.ts) — the
 * same snapshot, so a diagram and its table cannot disagree, and no physics of
 * their own: every length, angle and time drawn is a figure, only placed.
 *
 * - Power: the orbit seen from above the Sun–Earth line, the arc spent in the
 *   Earth's shadow on the day the figures are read and on the year's worst
 *   day, as fractions of a revolution, and the minutes each comes to.
 * - Radio: the satellite over the ground station at the slant range the link
 *   is worked at, the transmitting beam's width, and the margin against the
 *   bench's floor.
 * - Camera: the field of view down to the ground at the altitude the camera is
 *   worked at, the swath it covers, and the ground sample distance.
 *
 * DOM-free and dictionary-free, like the drawing (./satellite-drawing.ts).
 */
import type { SatelliteFigures } from './satellite-model';

export interface EclipseDiagram {
  /** fraction of a revolution in shadow on the figures' day, and on the year's worst */
  shadow: number;
  worstShadow: number;
  /** s: the revolution, its time in shadow and in sunlight on the figures' day, the worst day's shadow */
  period: number;
  shadowTime: number;
  sunTime: number;
  worstShadowTime: number;
  /** rad: the Sun's angle to the orbit plane (β) on the figures' day */
  beta: number;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export function eclipseDiagram(f: SatelliteFigures): EclipseDiagram {
  const shadow = clamp01(f.eclipse.nowFraction.value);
  const worstShadow = clamp01(f.eclipse.worstFraction.value);
  const period = f.orbit.period.value;
  return {
    shadow, worstShadow, period,
    shadowTime: f.eclipse.now.value,
    sunTime: Math.max(0, period - f.eclipse.now.value),
    worstShadowTime: f.eclipse.worst.value,
    beta: f.eclipse.beta.value,
  };
}

export interface LinkDiagram {
  /** m, the slant range the link is worked at */
  range: number;
  /** rad, the transmitting beam's full width; null for an antenna with no beam to speak of */
  beamwidth: number | null;
  /** dB, the margin and the floor it is held to */
  margin: number;
  floor: number;
  /** the margin clears the floor */
  closes: boolean;
}

export function linkDiagram(f: SatelliteFigures, floor: number): LinkDiagram {
  const margin = f.link.margin.value;
  return { range: f.link.range.value, beamwidth: f.link.beamwidth?.value ?? null, margin, floor, closes: margin >= floor };
}

export interface FootprintDiagram {
  /** m, the altitude the camera is worked at */
  altitude: number;
  /** rad, the full field of view */
  fov: number;
  /** m, the swath on the ground (null where the model gives none: the field of view reaches past the Earth's limb) */
  swath: number | null;
  /** m, the ground sample distance straight down, and the diffraction limit's */
  gsd: number;
  diffraction: number;
  limitedBy: 'aperture' | 'pixels';
}

/** The camera's footprint, or null for a design without a camera. */
export function footprintDiagram(f: SatelliteFigures): FootprintDiagram | null {
  const c = f.camera;
  if (!c) return null;
  return { altitude: c.altitude.value, fov: c.fov.value, swath: c.swath?.value ?? null, gsd: c.gsd.value, diffraction: c.diffraction.value, limitedBy: c.limitedBy };
}
