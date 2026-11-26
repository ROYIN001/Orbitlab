/**
 * The dictionary loader (EQ-6 step 3, M-PLATFORM-031). Only the app's start
 * (`src/main.ts`) imports this module: its `import()` must stay out of every
 * worker's graph (tests/i18n-worker-path.test.ts).
 *
 * The start loads the language in use before the app is built. It loads the
 * other two as well, as before this step, unless a service worker controls
 * the page: a worker activates only once its install has stored every file
 * of the build, these chunks among them, so a later switch reads them from
 * that cache, offline too (S09: lazy only when every language's chunk is in
 * the cache before a lazy path is used).
 */
import { hasDict, registerDict } from './index';
import type { Lang } from './index';

const LANGS: readonly Lang[] = ['en', 'ru', 'th'];

const LOADERS: Record<Exclude<Lang, 'en'>, () => Promise<Record<string, string>>> = {
  ru: () => import('./ru').then((m) => m.ru),
  th: () => import('./th').then((m) => m.th),
};
const pending = new Map<Lang, Promise<void>>();

/** Load a language's dictionary if it is not in memory yet; a failed load can be tried again. */
export function ensureLang(l: Lang): Promise<void> {
  if (l === 'en' || hasDict(l)) return Promise.resolve();
  let p = pending.get(l);
  if (!p) {
    p = LOADERS[l]().then((d) => registerDict(l, d));
    pending.set(l, p);
    p.catch(() => pending.delete(l));
  }
  return p;
}

/** Every chunk is in the cache when a service worker controls the page (see above). */
export function chunksCached(): boolean {
  try { return !!navigator.serviceWorker?.controller; } catch { return false; }
}

/** Before the app is built: the language in use, and the others unless their chunks are cached. */
export function loadStartupLanguages(l: Lang): Promise<unknown> {
  return Promise.all(chunksCached() ? [ensureLang(l)] : LANGS.map(ensureLang));
}
