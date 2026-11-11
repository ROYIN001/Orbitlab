/**
 * The Structure & Assembly section's entry: the one module the app loads the
 * section by (src/ui/structure-loader.ts, a dynamic import the first time the
 * section opens). The bundler names the chunk after this file —
 * `structure-*.js`, with the section's styles as `structure-*.css` — which
 * is how budgets.json counts them.
 *
 * Nothing here, or under it, imports the app at run time: what the section
 * needs of the app comes in as `env` (src/ui/structure/env.ts,
 * tests/structure-boundary.test.ts).
 */
import type { StructureEnv, StructureSection } from './env';
import { StructureScreen } from './structure-screen';
import { bindLanguage } from './text';

export function createStructureSection(root: HTMLElement, env: StructureEnv): StructureSection {
  bindLanguage(env.lang);
  return new StructureScreen(root, env);
}
