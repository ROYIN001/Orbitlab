/**
 * What the built-in lessons share: the date they fly on and a short way to
 * write a lesson's mission as the document a mission file holds (U01).
 */
import { MISSION_FORMAT, MISSION_FORMAT_VERSION, type MissionDocument } from '../../config/mission-file';
import { DEFAULT_FAILURE } from '../../physics/defaults';
import { orbitById } from '../../data/orbits';
import type { OrbitSpec } from '../../types';

/** Every built-in lesson flies from the same moment, so a worked solution flies the same flight every time. */
export const LESSON_LAUNCH = '2026-09-15T12:00:00.000Z';

export function missionDoc(m: Partial<MissionDocument['mission']> & { vehicleId: string; siteId: string; satelliteId: string; payloadMass: number; orbitId: string; orbit?: OrbitSpec }): MissionDocument {
  return {
    format: MISSION_FORMAT,
    version: MISSION_FORMAT_VERSION,
    mission: {
      launchTime: LESSON_LAUNCH,
      guidanceOverrides: {},
      failure: { ...DEFAULT_FAILURE },
      boosterRecovery: false,
      ...m,
      orbit: m.orbit ?? { ...orbitById(m.orbitId) },
    },
  };
}
