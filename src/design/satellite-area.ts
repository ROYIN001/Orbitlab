/**
 * The drag area a designed satellite flies in the lifetime analysis (roadmap
 * D06, docs/ROADMAP-PART2-3.md; Phase 4 map §2.2 G): the one number that
 * ties the builder's bus and arrays to P07, where the air decides how long
 * the satellite stays up and whether it comes down within 25 years.
 *
 * A satellite at the end of its life is not held pointing; it tumbles. A
 * convex body tumbling at random shows the flow, on average, a quarter of
 * its surface (Cauchy) — the rule `tumblingBoxArea` already applies to
 * NAPA-2 (src/orbit/reentry.ts, P2.5). Wings on booms are flat plates: a
 * plate tumbling at random shows a quarter of its two sides, half its
 * one-sided area. Cells fixed to the body, or round a spinning drum, are the
 * body's own faces and add nothing. So the area is an ESTIMATE, and the
 * screen labels it one: a satellite still holding its attitude shows other
 * areas (Hull, NTRS 20130000278, §30.6.1: one that settles gravity-gradient
 * with its arrays deployed likely shows more). It replaces, for a designed
 * satellite, the class areas the lifetime falls back on
 * (src/physics/propagator/spacecraft.ts, estimates "within a factor of two"),
 * because it is worked from the design's own edges and wings.
 *
 * One area, two forces: the propagator's `Spacecraft.area` serves drag and
 * sunlight pressure alike (src/physics/propagator/forces.ts; map risk R8).
 * Sunlight pressure acts only in Cowell mode, and the mean-element method the
 * lifetime runs by leaves it out; the screen says so beside this area.
 *
 * DOM-free. src/design must not import the propagator (tests/propagator.test.ts),
 * so this reads src/orbit only, and the four numbers P07 takes are typed as
 * the S03 hand-off carries them (`HandoffSpacecraft`, src/orbit/handoff.ts).
 * It still brings the propagator and NRLMSISE-00 along at run time, through
 * `tumblingBoxArea` (src/orbit/reentry.ts) and `B_RANGE`
 * (src/orbit/ballistic.ts): the guard reads direct imports only, and the
 * app's main bundle holds them already (src/worksheets/cases.ts), but a
 * worker that imports this file takes them in too. It is the only file in
 * src/design that does.
 * tests/d06-satellite-area.test.ts holds it to NAPA-2 (B = 0.0134 m²/kg and
 * its lifetime within 25 %, docs/VALIDATION.md §7) and to TU Delft p. 138.
 */
import { B_RANGE } from '../orbit/ballistic';
import type { HandoffSpacecraft } from '../orbit/handoff';
import { tumblingBoxArea } from '../orbit/reentry';
import type { SatelliteAreaCore, SatelliteDesign } from './satellite-spec';

function positive(name: string, x: number): void {
  if (!(Number.isFinite(x) && x > 0)) throw new RangeError(`${name} must be above zero: ${x}`);
}

/** The satellite's mass with its tanks full, kg: the dry mass and the propellant. */
export function wetMass(design: Pick<SatelliteDesign, 'bus' | 'propulsion'>): number {
  positive('bus.dryMass', design.bus.dryMass);
  const propellant = design.propulsion?.propellant ?? 0;
  if (!(Number.isFinite(propellant) && propellant >= 0)) throw new RangeError(`propulsion.propellant must be zero or more: ${propellant}`);
  return design.bus.dryMass + propellant;
}

/**
 * The mean cross-section the satellite shows the air tumbling at random, m²
 * (an estimate, see above): the bus as a box of its edges, a quarter of its
 * surface, plus half the one-sided area of the arrays when they are wings
 * that track the Sun (`mount: 'tracking'`), which is the quarter of a plate's
 * two sides — the same as `tumblingBoxArea` of a box of no thickness.
 */
export function dragArea(design: Pick<SatelliteDesign, 'bus' | 'power'>): number {
  const { width, height, depth } = design.bus.size;
  positive('bus.size.width', width);
  positive('bus.size.height', height);
  positive('bus.size.depth', depth);
  const body = tumblingBoxArea([width, height, depth]);
  if (design.power.mount !== 'tracking') return body;
  const wings = design.power.arrayArea;
  if (!(Number.isFinite(wings) && wings >= 0)) throw new RangeError(`power.arrayArea must be zero or more: ${wings}`);
  return body + wings / 2;
}

/**
 * The ballistic coefficient B = C_D·A/m, m²/kg, with the drag area above and
 * the wet mass (the lifetime from insertion is flown with full tanks, as the
 * S03 hand-off carries them). Shown against `B_RANGE` (`ballisticProblem`).
 */
export function ballisticCoefficient(design: Pick<SatelliteDesign, 'bus' | 'power' | 'propulsion'>): number {
  positive('bus.cd', design.bus.cd);
  return (design.bus.cd * dragArea(design)) / wetMass(design);
}

/**
 * Where a ballistic coefficient falls outside what anything in orbit has,
 * `B_RANGE` (src/orbit/ballistic.ts: a dense sphere, 1e-4 m²/kg, to a sheet
 * of foil, 1 m²/kg): `'low'` or `'high'`, or null inside it. A code, not a
 * sentence: the screen words it (src/design/warning-text.ts's pattern).
 */
export function ballisticProblem(b: number): 'low' | 'high' | null {
  if (!(b >= B_RANGE[0])) return 'low';
  if (!(b <= B_RANGE[1])) return 'high';
  return null;
}

/**
 * The four numbers the lifetime analysis flies (P07's `Spacecraft`, typed as
 * the S03 hand-off carries them): the wet mass, the drag area, and the bus's
 * C_D and C_R. The Build → Orbit hand-off and the D06 bench's own lifetime
 * both take them from here, so the area is never worked out two ways.
 */
export function lifetimeSpacecraft(design: Pick<SatelliteDesign, 'bus' | 'power' | 'propulsion'>): Pick<HandoffSpacecraft, 'mass' | 'area' | 'cd' | 'cr'> {
  positive('bus.cd', design.bus.cd);
  positive('bus.cr', design.bus.cr);
  return { mass: wetMass(design), area: dragArea(design), cd: design.bus.cd, cr: design.bus.cr };
}

export const satelliteAreaCore = { dragArea, ballisticCoefficient } satisfies SatelliteAreaCore;
