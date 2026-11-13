/**
 * What the Structure section keeps for a learner, in their profile
 * (`orbitlab.structure.v1`, src/workspace/registry.ts): the model and activity
 * last open, each model's assembly so far and when it was first completed,
 * and "my experiment" — a copy of the reference design, never the reference
 * itself. It touches nothing else of the profile: missions, designs and
 * lessons stay as they are.
 *
 * Read defensively: a missing, damaged or newer record reads as a fresh one
 * (and the section does not write over a newer one: `writable`), a stored
 * assembly is restored by the assembly rules (`restoreAssembly`), an unknown
 * option is dropped. DOM-free.
 */
import { restoreAssembly, type AssemblySpec, type AssemblyState, type Placement } from './assembly';
import { isEduDesign, type EduDesign } from './edusat-design';
import { STRUCTURE_MODELS, type StructureModelId } from './types';

export const STRUCTURE_STORE_KEY = 'orbitlab.structure.v1';
export const STRUCTURE_STORE_VERSION = 1;

export type StructureMode = 'explore' | 'assemble' | 'experiment';
export const STRUCTURE_MODES: readonly StructureMode[] = ['explore', 'assemble', 'experiment'];

export interface StructureProgress {
  model: StructureModelId;
  mode: Record<StructureModelId, StructureMode>;
  assembly: Record<StructureModelId, AssemblyState>;
  /** when the model was first assembled complete (ISO time), or null */
  completed: Record<StructureModelId, string | null>;
  /**
   * The rocket put together in the launch site's order (owner, 2026-11-13):
   * its own state beside the reference order's, whether that order is the
   * one on screen, and when it was first completed.
   */
  site: AssemblyState;
  siteOn: boolean;
  siteCompleted: string | null;
  /** "my experiment", or null before the learner makes one */
  experiment: EduDesign | null;
  /** which design the experiment shows: the learner's copy or the reference (the other activities always show the reference) */
  showing: 'mine' | 'reference';
  /** the step-by-step helper is open (the learner's choice; it opens nothing by itself) */
  guide: boolean;
}

export const freshProgress = (): StructureProgress => ({
  model: 'soyuz-st31',
  mode: { 'soyuz-st31': 'explore', edusat: 'explore' },
  assembly: { 'soyuz-st31': { placed: {}, history: [] }, edusat: { placed: {}, history: [] } },
  completed: { 'soyuz-st31': null, edusat: null },
  site: { placed: {}, history: [] },
  siteOn: false,
  siteCompleted: null,
  experiment: null,
  showing: 'reference',
  guide: false,
});

const own = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export interface ReadProgress {
  progress: StructureProgress;
  /** false when the stored record is from a newer version: keep it, do not write over it */
  writable: boolean;
  /**
   * What was wrong with the stored record, for the learner to be told: one
   * that could not be read (written over by the next save; the profile sets
   * the old copy aside, src/workspace/repository.ts), or a newer version's
   * (left alone, so nothing here is saved); null when it was fine or absent.
   */
  note: 'damaged' | 'newer' | null;
}

/**
 * Names a record may carry from before they changed, by model: the first
 * version of this section called the satellite's side panels and faces on
 * the specification's ±Y by the picture's z (its −z is the specification's
 * +Y). A record kept from then is read with today's names, so its
 * placements are not dropped as unknown.
 */
const STORED_RENAMES: Partial<Record<StructureModelId, Readonly<Record<string, string>>>> = {
  edusat: { 'panel-nz': 'panel-py', 'panel-pz': 'panel-ny', 'face-nz': 'face-py', 'face-pz': 'face-ny' },
};

/** A stored `placed` record with the units and places it names given today's names. */
function renamed(model: StructureModelId, placed: unknown): unknown {
  const names = STORED_RENAMES[model];
  if (!names || !own(placed)) return placed;
  const now = (id: string): string => (Object.hasOwn(names, id) ? names[id] : id);
  return Object.fromEntries(Object.entries(placed).map(([unit, at]) => [now(unit), own(at) && typeof at.slot === 'string' ? { ...at, slot: now(at.slot) } : at]));
}

/** Read a stored record (`raw` as stored, or null), restoring each assembly by `specs`' rules (and the launch site's order by `site`'s, where given). */
export function readProgress(raw: string | null, specs: Record<StructureModelId, AssemblySpec>, site?: AssemblySpec): ReadProgress {
  const fresh = freshProgress();
  if (raw === null) return { progress: fresh, writable: true, note: null };
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { progress: fresh, writable: true, note: 'damaged' }; }
  if (!own(data) || typeof data.version !== 'number' || data.version < 1) return { progress: fresh, writable: true, note: 'damaged' };
  if (data.version > STRUCTURE_STORE_VERSION) return { progress: fresh, writable: false, note: 'newer' };
  const p = fresh;
  if (STRUCTURE_MODELS.includes(data.model as StructureModelId)) p.model = data.model as StructureModelId;
  for (const m of STRUCTURE_MODELS) {
    const mode = own(data.mode) ? data.mode[m] : undefined;
    if (STRUCTURE_MODES.includes(mode as StructureMode)) p.mode[m] = mode as StructureMode;
    const placed = own(data.assembly) && own(data.assembly[m]) ? (data.assembly[m] as Record<string, unknown>).placed : undefined;
    p.assembly[m] = restoreAssembly(specs[m], renamed(m, placed));
    const done = own(data.completed) ? data.completed[m] : undefined;
    p.completed[m] = typeof done === 'string' && !Number.isNaN(Date.parse(done)) ? done : null;
  }
  if (site) {
    p.site = restoreAssembly(site, own(data.site) ? data.site.placed : undefined);
    p.siteOn = data.siteOn === true;
    p.siteCompleted = typeof data.siteCompleted === 'string' && !Number.isNaN(Date.parse(data.siteCompleted)) ? data.siteCompleted : null;
  }
  if (isEduDesign(data.experiment)) p.experiment = { battery: data.experiment.battery, payload: data.experiment.payload };
  p.showing = data.showing === 'mine' && p.experiment ? 'mine' : 'reference';
  p.guide = data.guide === true;
  if (p.mode['soyuz-st31'] === 'experiment') p.mode['soyuz-st31'] = 'explore';
  return { progress: p, writable: true, note: null };
}

/** The record to store. Each assembly keeps its placements only (its undo history is the visit's). */
export function writeProgress(p: StructureProgress): string {
  const placed = (s: AssemblyState): Record<string, Placement> => ({ ...s.placed });
  return JSON.stringify({
    version: STRUCTURE_STORE_VERSION,
    model: p.model,
    mode: p.mode,
    assembly: Object.fromEntries(STRUCTURE_MODELS.map((m) => [m, { placed: placed(p.assembly[m]) }])),
    completed: p.completed,
    site: { placed: placed(p.site) },
    siteOn: p.siteOn,
    siteCompleted: p.siteCompleted,
    experiment: p.experiment,
    showing: p.showing,
    guide: p.guide,
  });
}
