/**
 * The station's Russian docking ports a Soyuz or Progress uses (roadmap G07),
 * in the station's body axes: x forward along the velocity (the US segment's
 * end), y to starboard, z to nadir — the ISS's own frame, which it flies
 * aligned with the local vertical/local horizontal (+XVV), so a nadir port is
 * approached from below along the R-bar, a zenith port from above, the aft
 * port from behind along the V-bar.
 *
 * Positions are estimates from the station's layout, not a released drawing:
 * the centre of mass is taken at the S0 truss above Destiny, and the modules
 * are laid aft of it by their lengths (Destiny 8.5 m, Unity 5.5 m, PMA-1
 * 1.9 m, Zarya 12.6 m, Zvezda 13.1 m). Rassvet hangs below Zarya's forward
 * end, Poisk above Zvezda's forward node with Nauka below it and Prichal
 * below Nauka, and Zvezda's own aft port closes the segment — about 13, 26,
 * 26 and 38 m behind the centre of mass. docs/PHYSICS.md §9.2.
 */
import { v3, type Vec3 } from '../vec3';

export type PortId = 'rassvet' | 'poisk' | 'prichal' | 'zvezdaAft';

export interface DockingPort {
  id: PortId;
  /** the docking plane's centre, station body axes, m */
  position: Vec3;
  /** unit vector out of the port, along which it is approached (station body axes) */
  axis: Vec3;
}

export const PORTS: Record<PortId, DockingPort> = {
  rassvet: { id: 'rassvet', position: v3(-13.2, 0, 8.1), axis: v3(0, 0, 1) },
  poisk: { id: 'poisk', position: v3(-26.1, 0, -6.1), axis: v3(0, 0, -1) },
  prichal: { id: 'prichal', position: v3(-26.1, 0, 18.7), axis: v3(0, 0, 1) },
  zvezdaAft: { id: 'zvezdaAft', position: v3(-37.6, 0, 0), axis: v3(-1, 0, 0) },
};

export const PORT_IDS = Object.keys(PORTS) as PortId[];

/**
 * Where a port's docking target stands from the port's centre, station body
 * axes, m: 1.1 m to one side on the hull (forward for a nadir or zenith port,
 * down for the aft one). The spacecraft's TV camera is mounted the same
 * distance to the same side of its probe, so the target's cross sits on its
 * disc when the probe is on the port's axis.
 */
export function targetOffset(port: DockingPort): Vec3 {
  return Math.abs(port.axis.x) > 0.5 ? v3(0, 0, TARGET_OFFSET) : v3(TARGET_OFFSET, 0, 0);
}

/** The docking target's distance from the port's centre, m. */
export const TARGET_OFFSET = 1.1;
