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
  g.document = { documentElement: { lang: '' } };
});
afterEach(() => {
  g.document = saved.document;
  Object.defineProperty(globalThis, 'navigator', { value: saved.navigator, configurable: true, writable: true });
  vi.restoreAllMocks();
});

function setController(controller: unknown): void {
  Object.defineProperty(globalThis, 'navigator', { value: { language: 'en-GB', serviceWorker: { controller } }, configurable: true, writable: true });
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
    setController({});
    const { i18n, loader } = await fresh();
    expect(loader.chunksCached()).toBe(true);
    await loader.loadStartupLanguages('th');
    expect([i18n.hasDict('en'), i18n.hasDict('ru'), i18n.hasDict('th')]).toEqual([true, false, true]);
  });

  it('resolves the same strings as the static dictionaries once loaded', async () => {
    const { i18n, loader } = await fresh();
    await loader.ensureLang('ru');
    await loader.ensureLang('th');
    const { ru } = await import('../src/i18n/ru');
    const { th } = await import('../src/i18n/th');
    for (const key of Object.keys(ru).slice(0, 200)) expect(i18n.tFor('ru', key)).toBe(ru[key].includes('{') ? i18n.tFor('ru', key) : ru[key]);
    expect(i18n.tFor('th', 'setup.dynamics.model')).toBe(th['setup.dynamics.model']);
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
    setController({});
    vi.doMock('../src/workspace/storage', () => ({ workspaceStorage: () => ({ getItem: () => 'th', setItem: () => {} }) }));
    const { i18n, loader } = await fresh();
    i18n.initLang();
    expect(i18n.getLang()).toBe('th');
    await loader.loadStartupLanguages(i18n.getLang());
    expect(i18n.hasDict('th')).toBe(true);
    vi.doUnmock('../src/workspace/storage');
  });
});
