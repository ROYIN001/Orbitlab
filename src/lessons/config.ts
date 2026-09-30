/**
 * A lesson's mission as the simulation flies it, without the setup panel
 * (roadmap E03): the tests fly each lesson's worked solution headlessly, and
 * the lesson file reader needs a mission to read documents against.
 */
import type { MissionConfig } from '../types';
import { copyMission, parseMissionDocument, type MissionDocument, type MissionState } from '../config/mission-file';
import { guidanceForVehicle } from '../physics/defaults';
import { DEFAULT_FAILURE } from '../physics/defaults';
import { defaultDynamics } from '../physics/rigid/config';
import { orbitById } from '../data/orbits';
import { missionSatellite, satelliteById } from '../data/satellites';
import { missionVehicle } from '../data/vehicles';

/** The setup panel's opening mission (`SetupPanel`'s constructor), at a fixed time. */
export function defaultMissionState(launchTime = new Date(Date.UTC(2026, 8, 15, 12))): MissionState {
  return {
    vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbitId: 'iss', orbit: { ...orbitById('iss') },
    launchTime, guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    payloadMass: satelliteById('crew').mass, dynamics: defaultDynamics('soyuz21a'),
  };
}

/**
 * What `SetupPanel.getConfig` builds from the same state, a custom rocket or
 * satellite included (roadmap T01/T02, Phase 4 map §4.1): both are resolved
 * through `missionVehicle` and `missionSatellite`, as the simulation resolves
 * them, and the mission's inline `vehicleSpec` and `satelliteSpec` are kept,
 * so a teacher's lesson on a rocket or satellite of the class's own, and the
 * instructor's re-check of a flight of one, fly that design. Before, this
 * called `vehicleById`, which throws for any id the catalogue does not hold,
 * and dropped the vehicle spec. The satellite is resolved only to fail here,
 * on a mission whose satellite id is not its spec's, rather than at launch.
 */
export function missionConfigFromState(s: MissionState): MissionConfig {
  missionSatellite(s);
  const guidance = { ...guidanceForVehicle(missionVehicle(s), undefined, s.dynamics?.model), ...s.guidanceOverrides };
  return {
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: { ...s.orbit },
    // the mission's own rocket and satellite fly as the setup panel flies them (T01, D06)
    ...(s.vehicleSpec ? { vehicleSpec: structuredClone(s.vehicleSpec) } : {}),
    ...(s.satelliteSpec ? { satelliteSpec: structuredClone(s.satelliteSpec) } : {}),
    launchTime: new Date(s.launchTime.getTime()), guidance, failure: { ...s.failure },
    boosterRecovery: s.boosterRecovery, payloadMassOverride: s.payloadMass,
    ...(s.boosterRecovery && s.recoveryPlan ? { recoveryPlan: structuredClone(s.recoveryPlan) } : {}),
    ...(s.padId ? { padId: s.padId } : {}),
    ...(s.rendezvous ? { rendezvous: { ...s.rendezvous } } : {}),
    guidanceResolved: true,
    dynamics: s.dynamics ? { ...s.dynamics } : undefined,
  };
}

/** A lesson's mission document as a mission state (the document has been checked when the lesson was read). */
export function missionStateOf(doc: MissionDocument): MissionState {
  const parsed = parseMissionDocument(doc, defaultMissionState());
  return copyMission(parsed.state);
}

/** A lesson's mission with the student's edits, as a flight configuration. */
export function lessonConfig(doc: MissionDocument, edit?: (state: MissionState) => void): MissionConfig {
  const state = missionStateOf(doc);
  edit?.(state);
  return missionConfigFromState(state);
}
