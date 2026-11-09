/**
 * The Structure & Assembly section's shared vocabulary (owner's request,
 * 2026-11-09; docs/development/reports/structure-assembly-pilot.md).
 *
 * A model is read at one of three depths, Orbitlab's own levels: `watch`
 * (พื้นฐาน, the main assemblies), `explore` (ทดลอง, subsystems, joints,
 * options) and `engineer` (วิศวกร, parameters, units, sources, method). The
 * depth changes what is shown, never the physical data: one model, one
 * parts list, one set of figures under all three.
 *
 * DOM-free (tests/architecture.test.ts holds src/structure to it).
 */

/** How a figure or a shape is known — kept apart so an unknown detail never reads as a fact. */
export type Certainty =
  /** a document or a standard states it (with its source) */
  | 'documented'
  /** drawn from photographs, its main dimensions from documents */
  | 'image'
  /** an estimate for learning: representative positions, routes, typical values */
  | 'estimated'
  /** a choice this pilot makes for its scenario (the educational satellite's loads and orbit) */
  | 'assumed';

export const CERTAINTIES: readonly Certainty[] = ['documented', 'image', 'estimated', 'assumed'];

/**
 * What kind of part, for the colour-by-kind view: load-bearing structure,
 * mounting points and joints, walls and skins, mechanisms, equipment inside,
 * and propulsion (engines and their lines).
 */
export type PartCategory = 'load' | 'mount' | 'wall' | 'mechanism' | 'equipment' | 'propulsion';

export const PART_CATEGORIES: readonly PartCategory[] = ['wall', 'load', 'mount', 'mechanism', 'equipment', 'propulsion'];

/** The section's two models in this pilot. */
export type StructureModelId = 'soyuz-st31' | 'edusat';

export const STRUCTURE_MODELS: readonly StructureModelId[] = ['soyuz-st31', 'edusat'];

/** Orbitlab's three levels, as the depth a model is read at (src/ui/app-mode.ts's `AppLevel`, without importing the UI). */
export type Depth = 'watch' | 'explore' | 'engineer';

/** A figure with how it is known and where from. */
export interface Fact {
  /** what it is (the model's own language: Thai for this pilot's content) */
  label: string;
  value: string;
  certainty: Certainty;
  sourceIds: readonly string[];
}

/** A public source a figure or shape follows. */
export interface StructureSource {
  id: string;
  title: string;
  publisher?: string;
  url?: string;
  /** what it supports, and what it does not */
  supports?: string;
  scope?: string;
}
