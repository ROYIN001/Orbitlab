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

/**
 * Every chunk is in the cache when Orbitlab's own service worker controls the
 * page (see above): a worker another app on the same origin registered does
 * not count.
 */
export function chunksCached(): boolean {
  try {
    const c = navigator.serviceWorker?.controller;
    return !!c && c.scriptURL === new URL('sw.js', document.baseURI).href;
  } catch { return false; }
}

/** The language the device asks for, before the workspace (and the stored choice) is open. */
function deviceHint(): Lang {
  try {
    const n = (navigator.language || 'en').slice(0, 2);
    return n === 'ru' || n === 'th' ? n : 'en';
  } catch { return 'en'; }
}

/**
 * Start fetching before the workspace opens (S09: prefetch alongside
 * `initializeWorkspace`): every dictionary when the chunks are not cached,
 * else the device's language. Errors wait for `loadStartupLanguages`.
 */
export function prefetchLanguages(): void {
  const targets: readonly Lang[] = chunksCached() ? [deviceHint()] : LANGS;
  for (const l of targets) ensureLang(l).catch(() => {});
}

/**
 * Before the app is built: the language in use, which the start needs; and,
 * when the chunks are not cached, the other two as well, as before this step,
 * though a failure of theirs does not stop the start (a switch tries again).
 */
export async function loadStartupLanguages(l: Lang): Promise<void> {
  const others = chunksCached() ? [] : LANGS.filter((o) => o !== l).map((o) => ensureLang(o).catch(() => {}));
  await Promise.all([ensureLang(l), ...others]);
}
