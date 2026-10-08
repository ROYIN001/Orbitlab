/** da67341's project-archive mission check: lines 12-15, 17 and 38-55 of da67341:src/projects/validation.ts, verbatim. */
import type { MissionDocument } from '../../../src/config/mission-file';
import { validateConfigInput, type ConfigInput } from '../../../src/config/validation';
import { defaultMissionState } from '../../../src/lessons/config';
import { MISSION_FORMAT_VERSION, parseMissionDocument } from './mission-file';

export const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.length <= 100_000;
const id = (v: unknown): v is string => text(v) && v.length > 0 && v.length <= 200;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const date = (v: unknown): v is string => text(v) && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));

export function validMission(value: unknown): value is MissionDocument {
  if (!record(value) || !record(value.mission) || !Number.isInteger(value.version)
    || (value.version as number) > MISSION_FORMAT_VERSION) return false;
  const m = value.mission;
  // The forgiving mission upgrader drops these fields in older versions.
  // An archive must reject that loss instead of claiming a complete restore.
  if ((value.version as number) < 2 && m.vehicleSpec !== undefined
    || (value.version as number) < 3 && m.satelliteSpec !== undefined) return false;
  if (!['vehicleId', 'satelliteId', 'siteId', 'orbitId'].every((k) => id(m[k])) || !date(m.launchTime)
    || !record(m.orbit) || !record(m.guidanceOverrides) || !record(m.failure)
    || !finite(m.payloadMass) || typeof m.boosterRecovery !== 'boolean') return false;
  try {
    if (validateConfigInput({ ...m, launchTime: new Date(m.launchTime) } as unknown as ConfigInput).length) return false;
    const parsed = parseMissionDocument(value, defaultMissionState());
    return parsed.usable && parsed.issues.length === 0;
  } catch { return false; }
}

