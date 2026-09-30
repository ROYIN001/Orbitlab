/**
 * "Fly it": a design from the Build section handed to the Launch section
 * (roadmap D02, D03; the Phase 3 map, §3.1) as the mission document every
 * other way into Launch uses — a link, a file, the page's own copy
 * (src/config/mission-file.ts, version 2, with the vehicle inline as
 * `vehicleSpec`). The Launch panel reads it with `parseMissionDocument`,
 * which holds it to the same checks as a file (`validateConfigInput`, the
 * custom-vehicle validator included), and restores it with `restoreMission`.
 *
 * THE MISSION. The vehicle, carrying the payload the Build section worked its
 * figures out at, from the vehicle's own first launch site, to the 500 km
 * low-orbit preset (`leo`: circular, at the site's lowest inclination) — the
 * orbit a first flight of a new rocket is judged by, and one the student can
 * change in the Launch panel. The payload is the rideshare dispenser, the one
 * satellite with no propulsion and no mission of its own, so the mass is the
 * design's and nothing else. The launch time is the Launch panel's. Failures
 * off, no booster recovery, the vehicle's own guidance programme.
 *
 * DYNAMICS ARE SET EXPLICITLY. A custom vehicle would otherwise get the
 * catalogue default, six-DOF for every vehicle that has six-DOF data
 * (`defaultDynamics`), and roadmap D03 flies custom vehicles point-mass by
 * default: their six-DOF behaviour is generic where the catalogue's is the
 * vehicle's own (src/physics/rigid/vehicle-data.ts). So the document says
 * `pointMass`, or `sixDof` only when the student ticked the experimental
 * option; calm air, the fleet tests' seed.
 *
 * THE ENGINEER LEVEL'S READINESS REVIEW (roadmap D04) hands over the mission
 * it reviewed, not the preset: the orbit and site the student chose
 * (`HandoffMission`), and the launch time the review flew — the first launch
 * window after the Launch panel's time for a plane that has one — so that
 * what flies in Launch is what was reviewed. A vehicle reviewed as it is in
 * the catalogue goes by its id alone: a mission document carries a
 * `vehicleSpec` only for a vehicle no catalogue has (src/config/mission-file.ts).
 *
 * DOM-free. tests/design-handoff.test.ts parses the document with the Launch
 * panel's own parser and flies it.
 */
import type { DynamicsConfig, VehicleSpec } from '../types';
import { missionDocument, type MissionDocument } from '../config/mission-file';
import { orbitById } from '../data/orbits';
import { DEFAULT_FAILURE } from '../physics/defaults';
import { isCatalogueEntry } from './warnings';

/** The orbit preset "Fly it" targets. */
export const HANDOFF_ORBIT = 'leo';
/** The payload "Fly it" carries: a mass and nothing else. */
export const HANDOFF_SATELLITE = 'cubesats';
/** The seed the fleet tests fly (calm air does not use it; a wind the student picks does). */
export const HANDOFF_SEED = 20260919;
/** The least payload an orbital mission may carry (src/config/validation.ts, `setup.payloadMass`). */
export const HANDOFF_MIN_PAYLOAD = 1;

/** Where a vehicle is handed over to fly: an orbit preset and a launch site. */
export interface HandoffMission {
  orbitId: string;
  siteId: string;
}

/**
 * The mission document "Fly it" hands to the Launch section: `spec` carrying
 * `payloadKg`, by default to the 500 km preset from its first site, or where
 * `where` says (the readiness review's mission).
 */
export function handoffDocument(spec: VehicleSpec, payloadKg: number, launchTime: Date, model: DynamicsConfig['model'] = 'pointMass',
  where: HandoffMission = { orbitId: HANDOFF_ORBIT, siteId: spec.sites[0] }): MissionDocument {
  return missionDocument({
    vehicleId: spec.id, ...(isCatalogueEntry(spec) ? {} : { vehicleSpec: structuredClone(spec) }),
    satelliteId: HANDOFF_SATELLITE, siteId: where.siteId,
    orbitId: where.orbitId, orbit: { ...orbitById(where.orbitId) },
    launchTime: new Date(launchTime.getTime()),
    payloadMass: Math.max(HANDOFF_MIN_PAYLOAD, payloadKg),
    guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    dynamics: { model, wind: 'calm', seed: HANDOFF_SEED },
  });
}
