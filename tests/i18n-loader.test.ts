/**
 * EQ-6 step 3 (M-PLATFORM-031): the dictionary loader. Each test imports
 * fresh copies of `src/i18n` (the setup file `src/i18n/all.ts` filled the
 * shared copy with every dictionary), so it starts as the app does: English
 * only.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type I18n = typeof import('../src/i18n');
type Loader = typeof import('../src/i18n/loader');

async function fresh(): Promise<{ i18n: I18n; loader: Loader }> {
  vi.resetModules();
  const i18n = await import('../src/i18n');
  const loader = await import('../src/i18n/loader');
  return { i18n, loader };
}

const g = globalThis as unknown as { document?: unknown; navigator?: unknown };
let saved: { document: unknown; navigator: unknown };

beforeEach(() => {
  saved = { document: g.document, navigator: g.navigator };
  g.document = { documentElement: { lang: '' }, baseURI: 'https://example.test/Orbitlab/' };
});
afterEach(() => {
  g.document = saved.document;
  Object.defineProperty(globalThis, 'navigator', { value: saved.navigator, configurable: true, writable: true });
  vi.restoreAllMocks();
});

const OURS = { scriptURL: 'https://example.test/Orbitlab/sw.js' };
function setController(controller: unknown, language = 'en-GB'): void {
  Object.defineProperty(globalThis, 'navigator', { value: { language, serviceWorker: { controller } }, configurable: true, writable: true });
}

describe('EQ-6 step 3: the dictionary loader', () => {
  it('starts with English only', async () => {
    const { i18n } = await fresh();
    expect(i18n.hasDict('en')).toBe(true);
    expect(i18n.hasDict('ru')).toBe(false);
    expect(i18n.hasDict('th')).toBe(false);
  });

  it('without a controlling service worker, the start loads all three, as before', async () => {
    setController(null);
    const { i18n, loader } = await fresh();
    expect(loader.chunksCached()).toBe(false);
    await loader.loadStartupLanguages('en');
    expect((['en', 'ru', 'th'] as const).map(i18n.hasDict)).toEqual([true, true, true]);
  });

  it('with a controlling service worker, the start loads only the language in use', async () => {
    setController(OURS);
    const { i18n, loader } = await fresh();
    expect(loader.chunksCached()).toBe(true);
    await loader.loadStartupLanguages('th');
    expect([i18n.hasDict('en'), i18n.hasDict('ru'), i18n.hasDict('th')]).toEqual([true, false, true]);
  });

  it('resolves the same strings as the static dictionaries once loaded, every key', async () => {
    const { i18n, loader } = await fresh();
    await loader.ensureLang('ru');
    await loader.ensureLang('th');
    const { ru } = await import('../src/i18n/ru');
    const { th } = await import('../src/i18n/th');
    for (const [l, d] of [['ru', ru], ['th', th]] as const) {
      const wrong = Object.keys(d).filter((k) => i18n.tFor(l, k) !== d[k]);
      expect(wrong).toEqual([]);
    }
  });

  it('a worker of another app on the origin does not count as the chunks being cached', async () => {
    setController({ scriptURL: 'https://example.test/sw.js' });
    const { loader } = await fresh();
    expect(loader.chunksCached()).toBe(false);
  });

  it('prefetches every dictionary without a controller, and the device language with one', async () => {
    setController(null);
    let { i18n, loader } = await fresh();
    loader.prefetchLanguages();
    await loader.loadStartupLanguages('en');
    expect([i18n.hasDict('ru'), i18n.hasDict('th')]).toEqual([true, true]);
    setController(OURS, 'ru-RU');
    ({ i18n, loader } = await fresh());
    loader.prefetchLanguages();
    await loader.ensureLang('ru');
    expect([i18n.hasDict('ru'), i18n.hasDict('th')]).toEqual([true, false]);
  });

  it('a language other than the one in use that fails to load does not stop the start, and can be tried again', async () => {
    setController(null);
    vi.doMock('../src/i18n/ru', () => { throw new Error('offline'); });
    const { i18n, loader } = await fresh();
    await expect(loader.loadStartupLanguages('th')).resolves.toBeUndefined();
    expect([i18n.hasDict('ru'), i18n.hasDict('th')]).toEqual([false, true]);
    await expect(loader.ensureLang('ru')).rejects.toThrow();
    vi.doUnmock('../src/i18n/ru');
  });

  it('only src/main.ts imports the loader, and no app code imports the tests\' all-dictionaries module', async () => {
    const { readdirSync, readFileSync, statSync } = await import(/* @vite-ignore */ 'node:fs' as string) as {
      readdirSync(p: string): string[]; readFileSync(p: string, e: 'utf8'): string; statSync(p: string): { isDirectory(): boolean };
    };
    const root = new URL('../src/', import.meta.url).pathname;
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(d + f).isDirectory() ? walk(`${d}${f}/`) : [d + f]));
    const files = walk(root).filter((f) => /\.ts$/.test(f));
    const importers = (re: RegExp) => files.filter((f) => re.test(readFileSync(f, 'utf8'))).map((f) => f.slice(root.length)).sort();
    expect(importers(/from '\.{1,2}\/(?:[\w./-]*\/)?i18n\/loader'|from '\.\/loader'/)).toEqual(['main.ts']);
    expect(importers(/i18n\/all'|from '\.\/all'/)).toEqual([]);
  });

  it('loads each language once, however often it is asked', async () => {
    const { loader } = await fresh();
    const a = loader.ensureLang('ru');
    const b = loader.ensureLang('ru');
    expect(a).toBe(b);
    await a;
  });

  it('setLang refuses a language that is not loaded, and says so', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { i18n, loader } = await fresh();
    i18n.setLang('ru');
    expect(i18n.getLang()).toBe('en');
    expect(error).toHaveBeenCalledWith('i18n: the ru dictionary was used before it was loaded');
    await loader.ensureLang('ru');
    i18n.setLang('ru');
    expect(i18n.getLang()).toBe('ru');
  });

  it('tFor before a load gives English and says so in the console, once', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { i18n } = await fresh();
    const { en } = await import('../src/i18n/en');
    expect(i18n.tFor('th', 'setup.dynamics.model')).toBe(en['setup.dynamics.model']);
    i18n.tFor('th', 'setup.dynamics.title');
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('initLang keeps a stored language although its dictionary is not loaded yet', async () => {
    setController(OURS);
    vi.doMock('../src/workspace/storage', () => ({ workspaceStorage: () => ({ getItem: () => 'th', setItem: () => {} }) }));
    const { i18n, loader } = await fresh();
    i18n.initLang();
    expect(i18n.getLang()).toBe('th');
    await loader.loadStartupLanguages(i18n.getLang());
    expect(i18n.hasDict('th')).toBe(true);
    vi.doUnmock('../src/workspace/storage');
  });
});
