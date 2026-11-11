/**
 * What the Structure section is given by the app it runs in
 * (src/structure/env.ts says why nothing is imported): the app's power model
 * and hand-off, the learner's profile storage, its WebGL and input rules, its
 * gzip reader, its language and its addresses. src/ui/structure-loader.ts
 * builds one and loads the section with it.
 */
import type { PowerEnv } from '../../structure/env';
import type { HandoffEnv } from '../../structure/handoff';
import type { Depth, StructureModelId } from '../../structure/types';
import type { ViewerGl } from '../../render/structure-viewer';
import type { Lang } from './text';

/** The learner's profile, for the section's one record (`orbitlab.structure.v1`). */
export interface StructureStorage {
  /** the stored record's text; null when there is none, or storage cannot be read */
  read(): string | null;
  /**
   * Keep `text`: 'ok'; 'readonly' when the profile refuses this tab's writes
   * (read-only, changed in another tab) or no learner is chosen; 'failed'
   * when the browser refuses (storage full or blocked).
   */
  write(text: string): 'ok' | 'readonly' | 'failed';
  /** call `save` whenever the app flushes a learner's work (a profile switch, the page closing) */
  onFlush(save: () => void): void;
}

export interface StructureEnv {
  power: PowerEnv;
  handoff: HandoffEnv;
  storage: StructureStorage;
  gl: ViewerGl;
  /** a gzip-compressed file inflated (given back as it is when it is not compressed) */
  inflate(buffer: ArrayBuffer): Promise<ArrayBuffer>;
  /** the interface language */
  lang(): Lang;
  /** the section's address at a depth and model: a link's target */
  href(level: Depth, model: StructureModelId): string;
  /** go there (a history entry, so Back returns) */
  go(level: Depth, model: StructureModelId): void;
}

/** The section as the app holds it. */
export interface StructureSection {
  /** show the section at a depth, on a model's page if the address names one */
  show(level: Depth, model?: StructureModelId): void;
  /** off screen: fetches cancelled, the model's GPU resources freed; the state stays */
  hide(): void;
  applyLanguage(): void;
  onKey(e: KeyboardEvent): void;
}
