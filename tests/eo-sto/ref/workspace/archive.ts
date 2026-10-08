/** Strict external archive validation is loaded only when a backup is opened/imported. */
import { safeJson, validDesigns, validMission, validProgress } from '../projects/validation';
import { validateNotebookData } from '../experiments/notebook';
import { parseProjectArchive, PROJECT_STORAGE_KEYS, PROJECT_MAX_BYTES } from '../projects/archive';
import { isWorkspaceKey } from './registry';
import { WorkspaceError, WORKSPACE_FORMAT, PROFILE_MAX_COUNT, type WorkspaceArchive } from './repository';
const ownRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const bytes = (text: string): number => new TextEncoder().encode(text).byteLength;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const validId = (id: unknown): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id) && !['__proto__', 'constructor', 'prototype'].includes(id);
export function checkedImportValues(values: Record<string, string>): { values: Record<string, string>; quarantined: boolean } {
  const kept = clone(values), quarantined: { key: string; raw: string }[] = [];
  for (const [key, raw] of Object.entries(values)) {
    const primary = ['orbitlab.mission', 'orbitlab.designs', 'orbitlab.lessons', 'orbitlab.experiments.v1'].includes(key);
    const recovery = key === 'orbitlab.project-import.recovery.v1' || /^orbitlab\.lessons\.recovery(?:\.[1-9][0-9]*)?$/.test(key);
    if (!primary && !recovery) continue;
    let valid = false;
    if (!recovery) {
      try {
        const data: unknown = JSON.parse(raw);
        valid = safeJson(data) && (key === 'orbitlab.mission' ? validMission(data) : key === 'orbitlab.designs' ? validDesigns(data)
          : key === 'orbitlab.lessons' ? validProgress(data) : validateNotebookData(data) !== null);
      } catch { /* keep unknown bytes inert */ }
    }
    if (!valid) { quarantined.push({ key, raw }); delete kept[key]; }
  }
  if (quarantined.length) {
    // An earlier opaque quarantine record is itself preserved; it never becomes executable application data.
    if (kept['orbitlab.import.quarantine.v1']) quarantined.push({ key: 'orbitlab.import.quarantine.v1', raw: kept['orbitlab.import.quarantine.v1'] });
    kept['orbitlab.import.quarantine.v1'] = JSON.stringify({ version: 1, entries: quarantined });
  }
  return { values: kept, quarantined: quarantined.length > 0 };
}
export function parseWorkspaceArchive(text: string): WorkspaceArchive {
  if (text.length > PROJECT_MAX_BYTES || bytes(text) > PROJECT_MAX_BYTES) throw new WorkspaceError('oversize');
  let v: unknown;
  try { v = JSON.parse(text); } catch { throw new WorkspaceError('invalid'); }
  if (!ownRecord(v)) throw new WorkspaceError('invalid');
  if (v.format === 'orbitlab.project') {
    const old = parseProjectArchive(text), values: Record<string, string> = {};
    for (const [section, value] of Object.entries(old.data)) values[PROJECT_STORAGE_KEYS[section as keyof typeof PROJECT_STORAGE_KEYS]] = JSON.stringify(value);
    return { format: WORKSPACE_FORMAT, version: 1, exportedAt: old.exportedAt, profiles: [{ id: 'legacy-import', name: 'Imported project', values }],
      media: { included: false, reason: 'separate-binary-export' } };
  }
  if (v.format === WORKSPACE_FORMAT && typeof v.version === 'number' && v.version > 1) throw new WorkspaceError('newer');
  if (v.format !== WORKSPACE_FORMAT || v.version !== 1 || typeof v.exportedAt !== 'string' || !Number.isFinite(Date.parse(v.exportedAt))
    || !Array.isArray(v.profiles) || !v.profiles.length || v.profiles.length > PROFILE_MAX_COUNT || !ownRecord(v.media)
    || v.media.included !== false || v.media.reason !== 'separate-binary-export'
    || v.profiles.some((p: unknown) => !ownRecord(p) || !validId(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 100
      || (p.createdAt !== undefined && (typeof p.createdAt !== 'string' || !Number.isFinite(Date.parse(p.createdAt))))
      || (p.updatedAt !== undefined && (typeof p.updatedAt !== 'string' || !Number.isFinite(Date.parse(p.updatedAt))))
      || (p.revision !== undefined && (!Number.isSafeInteger(p.revision) || (p.revision as number) < 0))
      || (p.epoch !== undefined && (!Number.isSafeInteger(p.epoch) || (p.epoch as number) < 0))
      || !ownRecord(p.values) || Object.entries(p.values).some(([key, value]) => !isWorkspaceKey(key) || typeof value !== 'string'))) throw new WorkspaceError('invalid');
  return clone(v) as unknown as WorkspaceArchive;
}
export function workspaceImportWarnings(archive: WorkspaceArchive): { quarantinedValues: number; recoveryValues: number } {
  let quarantinedValues = 0, recoveryValues = 0;
  for (const profile of archive.profiles) {
    const checked = checkedImportValues(profile.values);
    for (const key of Object.keys(profile.values)) {
      if (checked.values[key] === undefined) {
        quarantinedValues++;
        if (key.includes('.recovery')) recoveryValues++;
      }
    }
  }
  return { quarantinedValues, recoveryValues };
}
