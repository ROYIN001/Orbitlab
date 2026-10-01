/**
 * The air a designed satellite's figures are read in (roadmap D06,
 * docs/ROADMAP-PART2-3.md; Phase 4 map §2.2 C and D, track B).
 *
 * The satellite model (src/design/satellite-model.ts) may not import the
 * propagator (tests/propagator.test.ts), yet two of its figures read the
 * propagator's air: the drag make-up of the Δv budget (`dragMakeupPerYear`,
 * src/orbit/disposal.ts, which takes an `Activity`) and the aerodynamic
 * torque (`aeroTorque`, src/orbit/attitude.ts, which takes a density). This
 * module is the one door: it hands on ECSS's fixed levels of the Sun's
 * activity, and the NRLMSISE-00 density `airDensity` gives at a point — so
 * the builder's torque and budget, and the lifetime P07 flies, read one air.
 *
 * A FIXED LEVEL, never the measured series: a design's figures must come out
 * the same tomorrow as today (the Phase 4 map's reproducibility rule, R6; the
 * measured series grows with every refresh of the space-weather data), so the
 * builder reads ECSS-E-ST-10-04C's low, moderate or high long-term levels
 * (src/physics/propagator/activity.ts `ECSS_LEVELS`), moderate unless asked.
 *
 * DOM-free, SI units. tests/d06-satellite-model.test.ts holds the density to
 * `airDensity` itself.
 */
import { airDensity } from '../physics/propagator/density';
import { ECSS_LEVELS, type Activity, type EcssLevel, type Indices } from '../physics/propagator/activity';
import { stateAt, type Orbit } from './kepler';

export type { EcssLevel } from '../physics/propagator/activity';

/** ECSS's three levels, in their order: what a design's figures may be read at. */
export const DESIGN_ACTIVITY_LEVELS: readonly EcssLevel[] = Object.keys(ECSS_LEVELS) as EcssLevel[];

/** The level a design's figures are read at unless the student picks another: ECSS's moderate (F10.7 140, Ap 15). */
export const DEFAULT_ACTIVITY_LEVEL: EcssLevel = 'moderate';

/** The indices of an ECSS level, as the propagator and `dragMakeupPerYear` take them. */
export function levelActivity(level: EcssLevel): Indices & Activity {
  if (!Object.hasOwn(ECSS_LEVELS, level)) throw new RangeError(`not an ECSS level: ${String(level)}`);
  return ECSS_LEVELS[level];
}

/**
 * The air's density at the orbit's perigee at its epoch, kg/m³, at an ECSS
 * level: NRLMSISE-00 (`airDensity`) at the point where the orbit is lowest,
 * on the day and at the local time the orbit's epoch puts it (a designed
 * orbit starts at its perigee, src/design/satellite-handoff.ts). The worst
 * air the satellite meets on the orbit, for the aerodynamic torque's sizing;
 * the air a day or a night side away differs by a factor of two or three,
 * which is why the torque is an estimate. Zero above NRLMSISE-00's top.
 */
export function perigeeDensity(o: Orbit, level: EcssLevel): number {
  const { r } = stateAt({ ...o, m0: 0 }, 0, true);
  return airDensity([r.x, r.y, r.z], o.jd0, levelActivity(level));
}
