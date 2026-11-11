/**
 * The Structure section's models: each id of `STRUCTURE_MODELS`
 * (src/structure/types.ts) with the adapter that gives it to the screens.
 * A new model is added here, with its id there, its addresses in
 * src/ui/app-mode.ts and its words in text.ts
 * (tests/structure-registry.test.ts holds the four together).
 */
import type { StructureMode } from '../../../structure/progress';
import { STRUCTURE_MODELS, type StructureModelId } from '../../../structure/types';
import type { StructureEnv } from '../env';
import { edusatAdapter } from './edusat';
import { soyuzAdapter } from './soyuz';
import type { ModelAdapter } from './types';

const MAKERS: Readonly<Record<StructureModelId, (env: StructureEnv) => ModelAdapter>> = {
  'soyuz-st31': soyuzAdapter,
  edusat: edusatAdapter,
};

export function makeAdapters(env: StructureEnv): Record<StructureModelId, ModelAdapter> {
  return Object.fromEntries(STRUCTURE_MODELS.map((m) => [m, MAKERS[m](env)])) as Record<StructureModelId, ModelAdapter>;
}

/** A model's pages: its own (exploring), and one for each further activity it has — the addresses the app's router knows. */
export function modelPages(adapters: Readonly<Record<StructureModelId, Pick<ModelAdapter, 'activities'>>>): string[] {
  return STRUCTURE_MODELS.flatMap((m) => adapters[m].activities.map((a) => pageOf(m, a)));
}

/** The page of a model's activity: `<model>` for exploring, `<model>/<activity>` for the others. */
export const pageOf = (model: StructureModelId, mode: StructureMode): string => (mode === 'explore' ? model : `${model}/${mode}`);

/** The model and activity a page names, or null. */
export function fromPage(page: string | undefined): { model: StructureModelId; mode: StructureMode } | null {
  if (!page) return null;
  const [model, mode = 'explore'] = page.split('/');
  if (!(STRUCTURE_MODELS as readonly string[]).includes(model) || !['explore', 'assemble', 'experiment'].includes(mode)) return null;
  return { model: model as StructureModelId, mode: mode as StructureMode };
}
