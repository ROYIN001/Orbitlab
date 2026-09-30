/**
 * A designed satellite flies in Launch (roadmap D06, docs/ROADMAP-PART2-3.md;
 * Phase 4 map §2.6 c, the owner's option B of 2026-09-29): the design
 * becomes the `SatelliteSpec` a mission carries inline
 * (`MissionConfig.satelliteSpec`, C2), and "Fly it" hands the Launch section
 * a mission document with that spec, a vehicle and the design's own orbit as
 * the target — the way the rocket designer's "Fly it" hands it a rocket
 * (src/design/build-handoff.ts).
 *
 * THE SPEC (`satelliteSpecFromDesign`), every figure the design's own:
 * - the mass, dry mass and propellant (`wetMass`), flown as the payload;
 * - its engine, thrust and Isp, with the propellant's share of the whole,
 *   when it is a chemical one — which the Launch section flies as a last
 *   stage (`VehicleModel`), for the apogee burns of a geostationary orbit;
 * - its size from the bus's edges, and a box's section (`crossSection`), so
 *   the fairing-fit estimate measures its corners;
 * - the drag area this builder shows (`dragArea`, src/design/satellite-area.ts)
 *   with the bus's C_D and C_R, which the S03 hand-off takes after the flight;
 * - its kind, which draws it; `derivedFrom` the catalogue class its template
 *   was drawn from, where there is one (NAPA-2 and the THEOS-2 class have
 *   none); the designer's name as typed, never translated.
 *
 * WHAT LAUNCH CANNOT FLY AS IT IS, decided here and said on screen:
 * - an ELECTRIC ENGINE — an Isp above the 480 s of a chemical engine, the
 *   spec's bound (src/config/satellite-spec.ts): Launch flies a satellite's
 *   engine as a burn, and an electric thruster's months-long spiral is not
 *   one. The satellite flies with NO engine of its own, its propellant still
 *   in its mass; the Build → Orbit hand-off and the planner keep the engine.
 * - an engine with no propellant: nothing to burn, so no engine either.
 * - a design under the spec's 1 kg floor cannot happen: the design's checker
 *   shares the floor, and the edges and the propellant's share
 *   (src/config/satellite-design.ts, tests/d06-satellite-design.test.ts).
 * - a C_D·A/m outside what anything in orbit has (`B_RANGE`), which the
 *   builder already warns of: the spec's checker refuses it, and "Fly it" is
 *   held back with the reason (`DesignLaunch.problems`).
 *
 * THE TARGET (`designTargetOrbit`): an orbit preset when the design's orbit
 * is one — placed as `presetDesignOrbit` places it: the same apsides, the
 * same sun-synchronous flag and local time, or the same inclination and node
 * — otherwise the custom target the mission file already takes, with the
 * design's apsides, its inclination (or `'sso'`, which Launch works out for
 * the size as the design does), its node's local time or right ascension
 * where it fixes one, and the perigee on the node (ω = 0, as the design's
 * figures take it). A preset whose inclination is the launch site's
 * (`'site'`) or whose perigee is not on the node (Molniya, Tundra) is never
 * taken for a design: its orbit would change with the site or the perigee.
 *
 * THE MISSION (`designMission`): the vehicle given — the Launch section's
 * own (a custom one included, S02) or one the student picks — from its site
 * (the Launch section's where that vehicle flies from it, else its first),
 * point mass unless asked, calm air, no failure; the launch time the Launch
 * section's, or for a target whose plane is set the first window after it,
 * as the readiness review does (`reviewLaunchTime`). The document is
 * version 3 because it carries the spec (src/config/mission-file.ts).
 *
 * DOM-free. It reads src/orbit and src/config, never the propagator
 * (tests/propagator.test.ts). tests/d06-satellite-launch.test.ts flies a
 * designed NAPA-2 and a THEOS-2-class design headless to their orbits.
 */
import type { DynamicsConfig, OrbitSpec, SatelliteSpec, VehicleSpec } from '../types';
import { ORBIT_PRESETS, orbitById } from '../data/orbits';
import { isCatalogueSatellite } from '../data/satellites';
import { satelliteTemplateById } from '../data/satellite-templates';
import { DEFAULT_FAILURE } from '../physics/defaults';
import { PART_ID_PATTERN } from '../config/vehicle-spec';
import { SATELLITE_LIMITS as SPEC_LIMITS, satelliteSpecProblems, type SatelliteSpecIssue } from '../config/satellite-spec';
import { validateConfigInput, type ValidationIssue } from '../config/validation';
import { missionDocument, type MissionDocument, type MissionState } from '../config/mission-file';
import { HANDOFF_SEED } from './build-handoff';
import { reviewLaunchTime } from './review-model';
import { presetDesignOrbit } from './satellite-model';
import { dragArea, wetMass } from './satellite-area';
import { isCatalogueEntry } from './warnings';
import type { SatelliteDesign } from './satellite-spec';

/**
 * What the satellite flies with in Launch: its own engine; none (it has
 * none); none because it is electric (an Isp above a chemical engine's); none
 * because its tanks are empty.
 */
export type LaunchEngine = 'own' | 'none' | 'electric' | 'empty';

export interface DesignLaunch {
  spec: SatelliteSpec;
  engine: LaunchEngine;
  /** what the spec's checker refuses (none for a sound design whose C_D·A/m is one anything in orbit has) */
  problems: SatelliteSpecIssue[];
}

/** The Isp range Launch flies a satellite's engine in, s: a chemical engine's (the spec's bound). */
export const LAUNCH_ISP = SPEC_LIMITS.isp;

/** The id a design flies under: its own where the spec takes it, else one made from it (a catalogue id, or text a spec id cannot be). */
export function launchSpecId(design: Pick<SatelliteDesign, 'id'>): string {
  const id = design.id;
  if (PART_ID_PATTERN.test(id) && !isCatalogueSatellite(id)) return id;
  let h = 5381;
  for (let k = 0; k < id.length; k++) h = ((h * 33) ^ id.charCodeAt(k)) >>> 0;
  return `design-${h.toString(36)}`;
}

/** What the design's engine is in Launch (see the module's note). */
export function launchEngine(design: Pick<SatelliteDesign, 'propulsion'>): LaunchEngine {
  const p = design.propulsion;
  if (!p) return 'none';
  if (!(p.isp >= LAUNCH_ISP[0] && p.isp <= LAUNCH_ISP[1])) return 'electric';
  return p.propellant > 0 ? 'own' : 'empty';
}

/**
 * A preset's orbit, and the design's, are the same orbit: the same apsides
 * (to half a metre, a stored value's rounding), the same sun-synchronous
 * flag, and the same node — the same local time with the flag, the same
 * inclination and right ascension (or none) without it.
 */
function sameOrbit(a: SatelliteDesign['orbit'], b: SatelliteDesign['orbit']): boolean {
  if (Math.abs(a.perigee - b.perigee) > 0.5 || Math.abs(a.apogee - b.apogee) > 0.5 || a.sso !== b.sso) return false;
  const same = (x?: number, y?: number): boolean => (x === undefined ? y === undefined : y !== undefined && Math.abs(x - y) <= 1e-9);
  if (a.sso) return same(a.ltan, b.ltan) && (a.ltan !== undefined || same(a.raan, b.raan));
  return Math.abs(a.inclination - b.inclination) <= 1e-9 && same(a.raan, b.raan);
}

/** The Launch section's target for the design's orbit: a preset where it is one, else a custom target (see the module's note). */
export function designTargetOrbit(design: Pick<SatelliteDesign, 'orbit'>): { orbitId: string; orbit: OrbitSpec } {
  const o = design.orbit;
  for (const p of ORBIT_PRESETS) {
    if (p.id === 'custom' || p.inclination === 'site' || p.argPerigee !== 0 || p.suborbital) continue;
    if (sameOrbit(presetDesignOrbit(p.id), o)) return { orbitId: p.id, orbit: { ...p } };
  }
  const byLtan = o.sso && o.ltan !== undefined;
  const orbit: OrbitSpec = {
    ...orbitById('custom'),
    perigee: o.perigee, apogee: o.apogee, inclination: o.sso ? 'sso' : o.inclination, argPerigee: 0,
    raanMode: byLtan ? 'ltan' : o.raan !== undefined ? 'fixed' : 'free',
  };
  if (byLtan) orbit.ltan = o.ltan;
  else if (o.raan !== undefined) orbit.raan = o.raan;
  return { orbitId: 'custom', orbit };
}

/** The design as the satellite a mission carries inline (see the module's note). Check it with `designLaunch`. */
export function satelliteSpecFromDesign(design: SatelliteDesign): SatelliteSpec {
  const mass = wetMass(design);
  const p = design.propulsion;
  const origin = satelliteTemplateById(design.template)?.derivedFrom ?? null;
  const spec: SatelliteSpec = {
    id: launchSpecId(design), kind: design.kind, name: design.name.trim(), mass,
    typicalOrbit: designTargetOrbit(design).orbitId, description: '',
    size: { width: design.bus.size.width, height: design.bus.size.height, depth: design.bus.size.depth },
    crossSection: 'box',
    area: dragArea(design), cd: design.bus.cd, cr: design.bus.cr,
  };
  if (p && launchEngine(design) === 'own') spec.propulsion = { thrust: p.thrust, isp: p.isp, propellantFraction: p.propellant / mass };
  if (origin && isCatalogueSatellite(origin)) spec.derivedFrom = origin;
  return spec;
}

/** The spec, what its engine is in Launch, and what the spec's checker refuses in it. */
export function designLaunch(design: SatelliteDesign): DesignLaunch {
  const spec = satelliteSpecFromDesign(design);
  return { spec, engine: launchEngine(design), problems: satelliteSpecProblems(spec) };
}

/** What flies the design in Launch. */
export interface DesignFlight {
  /** the vehicle: a catalogue one, or the Launch section's own custom one (S02), carried inline */
  vehicle: VehicleSpec;
  /** the launch site: taken where the vehicle flies from it, else the vehicle's first */
  siteId?: string;
  /** the Launch section's launch time; a target whose plane is set waits for the first window after it */
  from: Date;
  model?: DynamicsConfig['model'];
}

/** The mission "Fly it" hands the Launch section, as its state (see the module's note). */
export function designMission(design: SatelliteDesign, f: DesignFlight): MissionState {
  const { spec } = designLaunch(design);
  const { orbitId, orbit } = designTargetOrbit(design);
  const siteId = f.siteId !== undefined && f.vehicle.sites.includes(f.siteId) ? f.siteId : f.vehicle.sites[0];
  return {
    vehicleId: f.vehicle.id, ...(isCatalogueEntry(f.vehicle) ? {} : { vehicleSpec: structuredClone(f.vehicle) }),
    satelliteId: spec.id, satelliteSpec: spec, siteId, orbitId, orbit,
    launchTime: reviewLaunchTime(orbit, siteId, f.from),
    payloadMass: spec.mass,
    guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    dynamics: { model: f.model ?? 'pointMass', wind: 'calm', seed: HANDOFF_SEED },
  };
}

/** The mission as the document the Launch section reads (version 3: it carries the spec). */
export const designMissionDocument = (design: SatelliteDesign, f: DesignFlight): MissionDocument => missionDocument(designMission(design, f));

/**
 * What the Launch section's checks would refuse in the mission (a target out
 * of its range, a vehicle that cannot carry it, the spec): none for a sound
 * design within `B_RANGE` on a vehicle that flies from its site. A mission
 * with issues is not handed over, since the Launch section would put each
 * refused value back to a default and fly something else.
 */
export function designMissionIssues(design: SatelliteDesign, f: DesignFlight): ValidationIssue[] {
  return validateConfigInput(designMission(design, f));
}
