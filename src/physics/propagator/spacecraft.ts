/**
 * Drag and sunlight areas of the payloads (roadmap P07), for the orbit
 * lifetime: the mean cross-section a tumbling or Earth-pointing satellite
 * shows the flow, bus and solar arrays together. They are ESTIMATES from each
 * class's typical dimensions (the representative spacecraft in
 * src/data/satellites.ts), within a factor of two — and the lifetime scales
 * with them, so the dialog lets the user change them. C_D 2.2 is the usual
 * free-molecular value for a compact body; C_R 1.3 a mix of absorbing arrays
 * and reflective insulation.
 */
import type { SatelliteKind } from '../../types';
import type { Spacecraft } from './forces';

const AREA: Record<SatelliteKind, number> = {
  comsat: 35,     // 3 × 2 × 5 m bus and two ~ 30 m² wings
  earthObs: 12,   // Resurs-P / WorldView class, arrays included
  weather: 15,    // Elektro-L / GOES, one large wing
  navigation: 12, // GLONASS-K / GPS III
  science: 10,
  cubesats: 2,    // the dispenser, not the satellites it releases
  starlink: 20,   // the stack before it separates
  crew: 10,       // Soyuz MS with its two arrays
  crewDragon: 32, // 4.0 × 8.1 m capsule and trunk: a quarter of its 127 m² surface (a convex body's mean)
};

export function spacecraftFor(kind: SatelliteKind, mass: number): Spacecraft {
  return { mass, area: AREA[kind] ?? 10, cd: 2.2, cr: 1.3 };
}
