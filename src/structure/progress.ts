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
  /** "my experiment", or null before the learner makes one */
  experiment: EduDesign | null;
  /** which design the satellite shows: the learner's copy or the reference */
  showing: 'mine' | 'reference';
}

export const freshProgress = (): StructureProgress => ({
  model: 'soyuz-st31',
  mode: { 'soyuz-st31': 'explore', edusat: 'explore' },
  assembly: { 'soyuz-st31': { placed: {}, history: [] }, edusat: { placed: {}, history: [] } },
  completed: { 'soyuz-st31': null, edusat: null },
  experiment: null,
  showing: 'reference',
});

const own = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export interface ReadProgress {
  progress: StructureProgress;
  /** false when the stored record is from a newer version: keep it, do not write over it */
  writable: boolean;
}

/** Read a stored record (`raw` as stored, or null), restoring each assembly by `specs`' rules. */
export function readProgress(raw: string | null, specs: Record<StructureModelId, AssemblySpec>): ReadProgress {
  const fresh = freshProgress();
  if (raw === null) return { progress: fresh, writable: true };
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { progress: fresh, writable: false }; }
  if (!own(data) || typeof data.version !== 'number') return { progress: fresh, writable: false };
  if (data.version > STRUCTURE_STORE_VERSION) return { progress: fresh, writable: false };
  const p = fresh;
  if (STRUCTURE_MODELS.includes(data.model as StructureModelId)) p.model = data.model as StructureModelId;
  for (const m of STRUCTURE_MODELS) {
    const mode = own(data.mode) ? data.mode[m] : undefined;
    if (STRUCTURE_MODES.includes(mode as StructureMode)) p.mode[m] = mode as StructureMode;
    const placed = own(data.assembly) && own(data.assembly[m]) ? (data.assembly[m] as Record<string, unknown>).placed : undefined;
    p.assembly[m] = restoreAssembly(specs[m], placed);
    const done = own(data.completed) ? data.completed[m] : undefined;
    p.completed[m] = typeof done === 'string' && !Number.isNaN(Date.parse(done)) ? done : null;
  }
  if (isEduDesign(data.experiment)) p.experiment = { battery: data.experiment.battery, payload: data.experiment.payload };
  p.showing = data.showing === 'mine' && p.experiment ? 'mine' : 'reference';
  if (p.mode['soyuz-st31'] === 'experiment') p.mode['soyuz-st31'] = 'explore';
  return { progress: p, writable: true };
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
    experiment: p.experiment,
    showing: p.showing,
  });
}
