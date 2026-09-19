import { DEFAULT_FAILURE, DEFAULT_GUIDANCE } from '../src/physics/defaults';
import { quickstartMission } from '../src/ui/quickstart';
import { defaultDynamics } from '../src/physics/rigid/config';
import type { MissionConfig } from '../src/types';

export function rigidMission(id: 'leo' | 'iss' = 'leo'): MissionConfig {
  const q = quickstartMission(id, new Date('2026-09-15T12:00:00Z'));
  return { vehicleId: q.vehicleId, siteId: q.siteId, satelliteId: q.satelliteId, orbit: q.orbit,
    launchTime: q.launchTime, guidance: { ...DEFAULT_GUIDANCE }, failure: { ...DEFAULT_FAILURE },
    payloadMassOverride: q.payloadMass, boosterRecovery: false, dynamics: defaultDynamics(q.vehicleId) };
}
