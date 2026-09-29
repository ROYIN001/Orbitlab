/**
 * Build → Orbit with no launch (roadmap D06, docs/ROADMAP-PART2-3.md; Phase 4
 * map §2.6 a, track C1): a designed satellite handed to the Orbit section as
 * the S03 hand-off (src/orbit/handoff.ts), placed in the orbit it was
 * designed for without a rocket flying it there. The Orbit section reads it
 * as it reads a flight's:
 * - the manoeuvre planner's craft is the design's engine and tanks
 *   (`craftFromHandoff`, src/orbit/budget.ts), so its Δv is the design's;
 * - the lifetime analysis (P07) flies the design's mass, drag area, C_D and
 *   C_R (`lifetimeSpacecraft`, `playgroundLifetimeCraft`), where the
 *   playground would otherwise fall back to the science class's 10 m².
 *
 * NO FORMAT CHANGE. A design's kind is one of the eight a hand-off carries
 * (tests/phase4-contracts.test.ts), and a design whose perigee is not above
 * the hand-off's 100 km, or with a figure `parseHandoff` refuses, is not
 * handed on (null): the design's checker is what tells the student why.
 *
 * THE DRAG AREA is the caller's to give, as `SatelliteAreaCore.dragArea`
 * (src/design/satellite-area.ts, track A4): the mean cross-section of the
 * body and wings tumbling at random, an estimate and labelled one. It is also
 * the area sunlight pressure sees in Cowell mode, as one area serves both in
 * the propagator (src/physics/propagator/forces.ts; map risk R8).
 *
 * DOM-free and free of the propagator (tests/propagator.test.ts): it imports
 * src/orbit only. SI and radians inside; the design's degrees and hours
 * (src/design/satellite-spec.ts) are converted here, in `designOrbit`.
 */
import { DEG } from '../physics/constants';
import { apsidesToAE, raanForLocalTime, stateAt, sunSynchronousInclination, type Orbit } from '../orbit/kepler';
import { handoffFromState, parseHandoff, type OrbitHandoff } from '../orbit/handoff';
import type { SatelliteAreaCore, SatelliteDesign } from './satellite-spec';

/**
 * The design's orbit as the Orbit section's (src/orbit/kepler.ts) at epoch
 * `jd`, made the way `presetOrbit` makes a preset's (src/orbit/presets.ts):
 * - the size and shape from the perigee and apogee altitudes (`apsidesToAE`);
 * - sun-synchronous (`sso`): the inclination that turns the node with the
 *   mean Sun at that size and shape (J2) — the flag is what the design asks
 *   for, so it wins over a stored number gone stale — and the node that puts
 *   the ascending pass at the local time `ltan` on `jd`, else at `raan`;
 *   the stored inclination only where no sun-synchronous one exists;
 * - otherwise the stored inclination and node (`raan`, else 0); `ltan` is
 *   read only with `sso`, as the design type says;
 * - the perigee on the ascending node (ω = 0), as a design has no argument
 *   of perigee, and the satellite at its perigee (M₀ = 0).
 */
export function designOrbit(orbit: SatelliteDesign['orbit'], jd: number): Orbit {
  const { a, e } = apsidesToAE(orbit.perigee, orbit.apogee);
  const i = (orbit.sso ? sunSynchronousInclination({ a, e }) : null) ?? orbit.inclination * DEG;
  const raan = orbit.sso && orbit.ltan !== undefined ? raanForLocalTime(orbit.ltan, jd) : (orbit.raan ?? 0) * DEG;
  return { a, e, i, raan, argp: 0, m0: 0, jd0: jd };
}

/** What the Build → Orbit hand-off needs besides the design. */
export interface DesignHandoffInput {
  /** the Julian date (UTC) the orbit starts on; the Launch panel's launch time is the one the student has set */
  jd: number;
  /** the drag area, m²: track A4's `dragArea` (an estimate) */
  dragArea: SatelliteAreaCore['dragArea'];
  /** for people, in the interface language: the caller's, as the Launch section's is (main.ts `orbitHandoffNow`) */
  label: string;
}

/**
 * The design, in its orbit at `input.jd`, as an S03 hand-off: the state from
 * `stateAt(designOrbit(…), 0, true)`; the wet mass (dry mass and propellant);
 * the drag area; the bus's C_D and C_R; the kind; the engine with its full
 * tanks, or none. Null when the hand-off would not read back
 * (`parseHandoff`): a perigee at or below 100 km, a figure not above zero.
 */
export function handoffFromDesign(design: SatelliteDesign, input: DesignHandoffInput): OrbitHandoff | null {
  const { r, v } = stateAt(designOrbit(design.orbit, input.jd), 0, true);
  const p = design.propulsion;
  const h = handoffFromState({
    r, v, jd: input.jd, label: input.label,
    spacecraft: {
      mass: design.bus.dryMass + (p ? p.propellant : 0),
      area: input.dragArea(design),
      cd: design.bus.cd,
      cr: design.bus.cr,
      kind: design.kind,
      propulsion: p ? { thrust: p.thrust, isp: p.isp, propellantMass: p.propellant } : null,
    },
  });
  return parseHandoff(h) ? h : null;
}
