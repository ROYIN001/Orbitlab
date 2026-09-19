/** Coherent starting missions. These only build settings; they never launch. */
import type { ConfigInput } from '../config/validation';
import { assertConfigInput } from '../config/validation';
import { orbitById } from '../data/orbits';
import { siteById } from '../data/sites';
import { DEFAULT_FAILURE } from '../physics/defaults';
import { launchWindows } from '../physics/mission';

export type QuickstartId = 'leo' | 'iss' | 'gto';
export interface QuickstartMission extends ConfigInput { orbitId: string }

export function quickstartMission(id: QuickstartId, from: Date = new Date()): QuickstartMission {
  if (!Number.isFinite(from.getTime())) throw new Error('Quick start requires a valid date');
  const iss = id === 'iss';
  const orbit = { ...orbitById(id) };
  const siteId = iss ? 'baikonur' : 'cape';
  const launchTime = iss
    ? launchWindows(orbit, siteById(siteId), from, 1)[0]?.time
    : new Date(from.getTime());
  if (!launchTime) throw new Error('No matching launch window was found');
  const mission: QuickstartMission = {
    vehicleId: iss ? 'soyuz21a' : 'falcon9',
    siteId,
    satelliteId: iss ? 'crew' : id === 'gto' ? 'comsat' : 'cubesats',
    payloadMass: iss ? 7150 : id === 'gto' ? 5500 : 1000,
    orbitId: id, orbit, launchTime: new Date(launchTime.getTime()),
    guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
  };
  assertConfigInput(mission);
  return mission;
}
