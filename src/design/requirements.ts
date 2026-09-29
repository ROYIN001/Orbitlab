/**
 * What a mission asks of a satellite, the input of the requirements solver
 * (roadmap D07, docs/ROADMAP-PART2-3.md; Phase 4 map §3, step 0.3). Types
 * only for now: the shape D07's solver, its trade table and the design
 * lessons (T01) compile against. From it D07 derives candidate orbits and a
 * `SatelliteDesign` (src/design/satellite-spec.ts), which the D06 bench then
 * recomputes with the D06 cores, so D07 never shows a number differently
 * from D06.
 *
 * Stored as a student types it, like a `SatelliteDesign`: degrees and hours
 * where the screen shows them, SI otherwise (m, bit, years). DOM-free, and
 * free of the propagator (tests/propagator.test.ts), which is why `activity`
 * is spelt out rather than taken from src/physics/propagator/activity.ts;
 * tests/phase4-contracts.test.ts holds the two to the same three levels.
 */

export interface MissionRequirements {
  /** the place to be seen: geodetic latitude and longitude, deg (east positive), and its name as typed */
  target: { lat: number; lon: number; name: string };
  /** the coarsest ground sample distance acceptable, m */
  gsd: number;
  /** the longest gap allowed between two looks at the target, days */
  revisitDays: number;
  /** only looks in daylight count */
  daylightOnly: boolean;
  /** a required local time of the ascending node, h: then only sun-synchronous orbits are candidates */
  ltan?: number;
  /** the life asked for, years */
  lifeYears: number;
  /**
   * The Sun's and the geomagnetic field's activity the lifetime is found
   * for: one of ECSS's fixed levels (ECSS-E-ST-10-04C, Annex G), never the
   * measured series, so a result reproduces.
   */
  activity: 'low' | 'moderate' | 'high';
  /** the data to bring down each day, bit */
  dataPerDay: number;
  /** the ground stations it may use: `STATIONS` ids (src/orbit/applications-setup.ts) */
  stations: string[];
  /** the lowest elevation a station works at, deg */
  minElDeg: number;
  /** '25y': down within 25 years of the end of the mission (IADC), by drag or by a burn; 'none': no rule */
  disposal: '25y' | 'none';
}
