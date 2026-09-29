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
import { satelliteById } from '../data/satellites';
import { vehicleById } from '../data/vehicles';

/** The setup panel's opening mission (`SetupPanel`'s constructor), at a fixed time. */
export function defaultMissionState(launchTime = new Date(Date.UTC(2026, 8, 15, 12))): MissionState {
  return {
    vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbitId: 'iss', orbit: { ...orbitById('iss') },
    launchTime, guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    payloadMass: satelliteById('crew').mass, dynamics: defaultDynamics('soyuz21a'),
  };
}

/** What `SetupPanel.getConfig` builds from the same state. */
export function missionConfigFromState(s: MissionState): MissionConfig {
  const guidance = { ...guidanceForVehicle(vehicleById(s.vehicleId), undefined, s.dynamics?.model), ...s.guidanceOverrides };
  return {
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: { ...s.orbit },
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
