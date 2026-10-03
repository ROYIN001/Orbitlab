/** File backups of supported browser work. Never enumerate storage or include preferences/accounts. */
import { MISSION_STORE_KEY, type MissionDocument } from '../config/mission-file';
import { DESIGN_STORE_KEY } from '../design/design-store';
import { PROGRESS_STORAGE_KEY, type ProgressData } from '../lessons/progress';
import { NOTEBOOK_STORAGE_KEY, validateNotebookData, type NotebookData } from '../experiments/notebook';
import { record, safeJson, validDesigns, validMission, validProgress, type ProjectDesigns } from './validation';

export const PROJECT_FORMAT = 'orbitlab.project';
export const PROJECT_VERSION = 1;
export const PROJECT_MAX_BYTES = 8_000_000;
export const PROJECT_FILE_EXTENSION = '.orbitlab-project.json';
export const PROJECT_SECTIONS = ['mission', 'designs', 'progress', 'notebook'] as const;
export type ProjectSection = typeof PROJECT_SECTIONS[number];
export const PROJECT_STORAGE_KEYS: Readonly<Record<ProjectSection, string>> = {
  mission: MISSION_STORE_KEY, designs: DESIGN_STORE_KEY, progress: PROGRESS_STORAGE_KEY, notebook: NOTEBOOK_STORAGE_KEY,
};
/** Transaction-only journal: never exported, and never treated as application data. */
export const PROJECT_RECOVERY_KEY = 'orbitlab.project-import.recovery.v1';
export interface ProjectStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface ProjectData {
  mission?: MissionDocument;
  designs?: ProjectDesigns;
  progress?: ProgressData;
  notebook?: NotebookData;
}
export interface ProjectArchive {
  format: typeof PROJECT_FORMAT;
  version: 1;
  exportedAt: string;
  data: ProjectData;
}
export type ProjectErrorCode = 'invalid' | 'oversize' | 'newer' | 'storage' | 'changed' | 'pending' | 'rollback' | 'recoveryConflict';
export class ProjectError extends Error {
  constructor(readonly code: ProjectErrorCode, readonly section?: ProjectSection) {
    super(section ? `${code}: ${section}` : code);
    this.name = 'ProjectError';
  }
}
const size = (text: string): number => new TextEncoder().encode(text).byteLength;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function validateSection(section: ProjectSection, value: unknown): boolean {
  try {
    if (!safeJson(value)) return false;
    if (section === 'mission') return validMission(value);
    if (section === 'designs') return validDesigns(value);
    if (section === 'progress') return validProgress(value);
    return validateNotebookData(value) !== null;
  } catch { return false; }
}

export function parseProjectArchive(text: string): ProjectArchive {
  if (text.length > PROJECT_MAX_BYTES || size(text) > PROJECT_MAX_BYTES) throw new ProjectError('oversize');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new ProjectError('invalid'); }
  if (!record(value) || value.format !== PROJECT_FORMAT || !Number.isInteger(value.version)) throw new ProjectError('invalid');
  if ((value.version as number) > PROJECT_VERSION) throw new ProjectError('newer');
  if (value.version !== PROJECT_VERSION || typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt))
    || !record(value.data) || !safeJson(value) || Object.keys(value).some((key) => !['format', 'version', 'exportedAt', 'data'].includes(key))
    || Object.keys(value.data).some((key) => !PROJECT_SECTIONS.includes(key as ProjectSection))) throw new ProjectError('invalid');
  for (const section of PROJECT_SECTIONS) {
    if (Object.hasOwn(value.data, section) && !validateSection(section, value.data[section])) throw new ProjectError('invalid', section);
  }
  return clone(value) as unknown as ProjectArchive;
}

export function projectArchiveText(archive: ProjectArchive): string {
  const text = `${JSON.stringify(archive, null, 2)}\n`;
  parseProjectArchive(text);
  return text;
}

export function exportProjectArchive(storage: ProjectStorage, now = new Date()): ProjectArchive {
  const data: Record<string, unknown> = {};
  try {
    if (storage.getItem(PROJECT_RECOVERY_KEY) !== null) throw new ProjectError('pending');
    for (const section of PROJECT_SECTIONS) {
      const raw = storage.getItem(PROJECT_STORAGE_KEYS[section]);
      if (raw === null) continue;
      if (raw.length > PROJECT_MAX_BYTES) throw new ProjectError('oversize', section);
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { throw new ProjectError('invalid', section); }
      if (!validateSection(section, parsed)) throw new ProjectError('invalid', section);
      data[section] = parsed;
    }
  } catch (error) {
    if (error instanceof ProjectError) throw error;
    throw new ProjectError('storage');
  }
  return parseProjectArchive(JSON.stringify({ format: PROJECT_FORMAT, version: PROJECT_VERSION, exportedAt: now.toISOString(), data }));
}

export interface ProjectCounts {
  mission: number; designs: number; lessons: number; assessments: number; customLessons: number; customQuestions: number; experiments: number;
}
export function projectCounts(data: ProjectData): ProjectCounts {
  return { mission: data.mission ? 1 : 0, designs: data.designs?.designs.length ?? 0,
    lessons: Object.keys(data.progress?.lessons ?? {}).length, assessments: data.progress?.assessments.length ?? 0,
    customLessons: data.progress?.customLessons.length ?? 0, customQuestions: data.progress?.customQuestions.length ?? 0,
    experiments: data.notebook?.experiments.length ?? 0 };
}
export interface ProjectPreview {
  archive: ProjectArchive;
  /** Exact bytes prevent a stale preview overwriting work changed by another tab. */
  before: Record<ProjectSection, string | null>;
  existing: ProjectData;
  unreadable: ProjectSection[];
}
export function previewProjectImport(archive: ProjectArchive, storage: ProjectStorage): ProjectPreview {
  const checked = parseProjectArchive(JSON.stringify(archive));
  const before = {} as ProjectPreview['before'], existing: Record<string, unknown> = {}, unreadable: ProjectSection[] = [];
  try {
    if (storage.getItem(PROJECT_RECOVERY_KEY) !== null) throw new ProjectError('pending');
    for (const section of PROJECT_SECTIONS) {
      const raw = storage.getItem(PROJECT_STORAGE_KEYS[section]);
      before[section] = raw;
      if (raw === null) continue;
      let value: unknown;
      try { value = raw.length <= PROJECT_MAX_BYTES ? JSON.parse(raw) : undefined; } catch { /* report damaged browser data */ }
      if (validateSection(section, value)) existing[section] = value;
      else unreadable.push(section);
    }
  } catch (error) {
    if (error instanceof ProjectError) throw error;
    throw new ProjectError('storage');
  }
  return { archive: checked, before, existing: existing as ProjectData, unreadable };
}

interface RecoveryJournal {
  version: 1;
  phase: 'importing' | 'restoring';
  before: Partial<Record<ProjectSection, string | null>>;
  after: Partial<Record<ProjectSection, string>>;
}
/**
 * Check every selected section before changing any recovery value. A later
 * browser save belongs to its author: a pending journal is not permission to
 * erase it. localStorage has no multi-key transaction or cross-tab lock, so
 * this detects observed conflicts, not edits racing between browser calls.
 */
function checkRecoveryConflicts(storage: ProjectStorage, journal: RecoveryJournal): void {
  for (const section of PROJECT_SECTIONS) {
    if (!Object.hasOwn(journal.before, section)) continue;
    const current = storage.getItem(PROJECT_STORAGE_KEYS[section]);
    if (current !== journal.before[section] && current !== journal.after[section]
      // A previous rollback may have freed this slot before storage refused
      // restoration. An absent slot cannot distinguish a later deletion.
      && !(journal.phase === 'restoring' && current === null)) throw new ProjectError('recoveryConflict', section);
  }
}

/** Rollback frees replaced values before restoring originals, so quota cannot trap a larger original. */
function rollback(storage: ProjectStorage, journal: RecoveryJournal): void {
  checkRecoveryConflicts(storage, journal);
  if (journal.phase !== 'restoring') {
    journal.phase = 'restoring';
    storage.setItem(PROJECT_RECOVERY_KEY, JSON.stringify(journal));
  }
  for (const section of PROJECT_SECTIONS) {
    if (!Object.hasOwn(journal.before, section)) continue;
    const raw = journal.before[section]!;
    if (storage.getItem(PROJECT_STORAGE_KEYS[section]) !== raw) storage.removeItem(PROJECT_STORAGE_KEYS[section]);
  }
  for (const section of PROJECT_SECTIONS) {
    if (!Object.hasOwn(journal.before, section)) continue;
    const raw = journal.before[section]!;
    if (raw !== null && storage.getItem(PROJECT_STORAGE_KEYS[section]) !== raw) storage.setItem(PROJECT_STORAGE_KEYS[section], raw);
  }
  storage.removeItem(PROJECT_RECOVERY_KEY);
}

/** Retry an interrupted import. Original bytes remain in the journal until restoration succeeds. */
export function recoverProjectImport(storage: ProjectStorage): boolean {
  let raw: string | null;
  try { raw = storage.getItem(PROJECT_RECOVERY_KEY); } catch { throw new ProjectError('storage'); }
  if (raw === null) return false;
  let journal: unknown;
  try { journal = JSON.parse(raw); } catch { throw new ProjectError('rollback'); }
  if (!record(journal) || journal.version !== 1 || !['importing', 'restoring'].includes(journal.phase as string)
    || !record(journal.before) || !record(journal.after)
    || Object.entries(journal.before).some(([key, value]) => !PROJECT_SECTIONS.includes(key as ProjectSection) || (value !== null && typeof value !== 'string'))
    || Object.entries(journal.after).some(([key, value]) => !Object.hasOwn(journal.before as object, key) || typeof value !== 'string')
    || Object.keys(journal.before).some((key) => !Object.hasOwn(journal.after as object, key))) {
    throw new ProjectError('rollback');
  }
  try { rollback(storage, journal as unknown as RecoveryJournal); }
  catch (error) { if (error instanceof ProjectError) throw error; throw new ProjectError('rollback'); }
  return true;
}

/** Explicit choices replace only named sections. Omitted sections keep their byte-exact browser data. */
export function importProjectArchive(preview: ProjectPreview, replace: readonly ProjectSection[], storage: ProjectStorage): ProjectSection[] {
  const archive = parseProjectArchive(JSON.stringify(preview.archive));
  const selected = PROJECT_SECTIONS.filter((section) => replace.includes(section) && Object.hasOwn(archive.data, section));
  if (!selected.length) return [];
  const journal: RecoveryJournal = { version: 1, phase: 'importing', before: {}, after: {} };
  try {
    if (storage.getItem(PROJECT_RECOVERY_KEY) !== null) throw new ProjectError('pending');
    for (const section of selected) {
      const current = storage.getItem(PROJECT_STORAGE_KEYS[section]);
      if (current !== preview.before[section]) throw new ProjectError('changed', section);
      journal.before[section] = current;
      journal.after[section] = JSON.stringify(archive.data[section]);
    }
    // A failed journal write never changes active data. Keep the original bytes even if later rollback is denied.
    storage.setItem(PROJECT_RECOVERY_KEY, JSON.stringify(journal));
  } catch (error) {
    if (error instanceof ProjectError) throw error;
    throw new ProjectError('storage');
  }
  try {
    for (const section of selected) storage.setItem(PROJECT_STORAGE_KEYS[section], journal.after[section]!);
    storage.removeItem(PROJECT_RECOVERY_KEY);
  } catch {
    try { rollback(storage, journal); }
    catch (error) { if (error instanceof ProjectError) throw error; throw new ProjectError('rollback'); }
    throw new ProjectError('storage');
  }
  return selected;
}
