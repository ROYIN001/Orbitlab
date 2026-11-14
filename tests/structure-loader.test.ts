/**
 * The Structure section as the app holds it (src/ui/structure-loader.ts):
 * its place while its code is on its way, what happens when the code
 * arrives or cannot be had, and the retry — which loads the page again only
 * when the page can be had, so that a learner offline keeps the rest of the
 * app. With the loader's own `load`, `reload` and `reachable` given by the
 * test, and a stand-in for the few things of a document the note is made of.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLang, t } from '../src/i18n';
import type { StructureSection } from '../src/ui/structure/env';
import { StructureLoader, type StructureLoaderHost } from '../src/ui/structure-loader';

/** As much of an element as the loader's note uses. */
interface FakeElement {
  tag: string; style: Record<string, string>; dataset: Record<string, string>; textContent: string; className: string; type: string;
  children: FakeElement[]; attrs: Record<string, string>; listeners: Record<string, (() => void)[]>;
  append(...nodes: FakeElement[]): void; replaceChildren(...nodes: FakeElement[]): void; setAttribute(name: string, value: string): void; addEventListener(type: string, fn: () => void): void;
}
const element = (tag: string): FakeElement => {
  const e: FakeElement = {
    tag, style: {}, dataset: {}, textContent: '', className: '', type: '', children: [], attrs: {}, listeners: {},
    append: (...nodes) => { e.children.push(...nodes); },
    replaceChildren: (...nodes) => { e.children = nodes; },
    setAttribute: (name, value) => { e.attrs[name] = value; },
    addEventListener: (type, fn) => { (e.listeners[type] ??= []).push(fn); },
  };
  return e;
};
const all = (e: FakeElement): FakeElement[] => [e, ...e.children.flatMap(all)];
const said = (root: FakeElement): string => all(root).map((e) => e.textContent).filter(Boolean).join(' | ');
const retry = (root: FakeElement): FakeElement | undefined => all(root).find((e) => e.dataset.k === 'structure-retry');

const host = {} as StructureLoaderHost;
type Loaded = Awaited<ReturnType<NonNullable<ConstructorParameters<typeof StructureLoader>[2]>>>;

/** A loader whose chunk the test settles by hand, counting reloads. */
function make(reachable = true) {
  const root = element('div');
  const shown: unknown[][] = [];
  let hidden = 0, relang = 0;
  const section: StructureSection = { show: (...a) => { shown.push(a); }, hide: () => { hidden++; }, applyLanguage: () => { relang++; }, onKey: () => {} };
  const pending: { resolve(): void; reject(): void }[] = [];
  const load = (): Promise<Loaded> => new Promise((resolve, reject) => {
    pending.push({ resolve: () => resolve({ createStructureSection: () => section } as unknown as Loaded), reject: () => reject(new Error('no chunk')) });
  });
  let reloads = 0;
  const loader = new StructureLoader(root as unknown as HTMLElement, host, load, () => { reloads++; }, () => Promise.resolve(reachable));
  const settle = async (): Promise<void> => { for (let k = 0; k < 4; k++) await Promise.resolve(); };
  return { root, loader, pending, shown, settle, counts: () => ({ reloads, hidden, relang, loads: pending.length }) };
}

beforeEach(() => { vi.stubGlobal('document', { createElement: element, documentElement: element('html') }); setLang('th'); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('the section while its code is on its way', () => {
  it('says it is loading, fetches once, and shows what was last asked for when the code arrives', async () => {
    const { root, loader, pending, shown, settle, counts } = make();
    loader.show('explore', 'edusat/assemble');
    expect(said(root)).toContain(t('data.loading'));
    expect(retry(root)).toBeUndefined();
    loader.show('engineer', 'soyuz-st31');
    expect(counts().loads).toBe(1);
    pending[0].resolve();
    await settle();
    expect(shown).toEqual([['engineer', 'soyuz-st31', 'explore']]);
    expect(loader.section).not.toBeNull();
    // from then on the section is shown directly
    loader.show('watch', 'edusat/experiment');
    expect(shown[1]).toEqual(['watch', 'edusat', 'experiment']);
    expect(counts().loads).toBe(1);
  });

  it('does not show a section left before its code arrived', async () => {
    const { loader, pending, shown, settle } = make();
    loader.show('explore', 'edusat');
    loader.hide();
    pending[0].resolve();
    await settle();
    expect(loader.section).not.toBeNull();
    expect(shown).toEqual([]);
  });
});

describe('the section\'s code cannot be had', () => {
  it('says so with a way to try again, in the language on screen', async () => {
    const { root, loader, pending, settle, counts } = make();
    loader.show('explore', 'edusat');
    pending[0].reject();
    await settle();
    expect(said(root)).toContain(t('lesson.page.loadFailed'));
    expect(retry(root)?.textContent).toBe(t('sky.retry'));
    expect(counts().reloads).toBe(0);
    setLang('en');
    loader.applyLanguage();
    expect(said(root)).toContain('This page could not be loaded');
    expect(retry(root)?.textContent).toBe(t('sky.retry'));
  });

  it('a retry that fails too loads the page again — once, and only when the page can be had', async () => {
    const online = make(true);
    online.loader.show('explore', 'edusat');
    online.pending[0].reject();
    await online.settle();
    retry(online.root)!.listeners.click[0]();
    expect(said(online.root)).toContain(t('data.loading'));
    online.pending[1].reject();
    await online.settle();
    expect(online.counts().reloads).toBe(1);

    // the network still down and nothing to answer for the page: the note stays, with its retry, and the app is not replaced
    const offline = make(false);
    offline.loader.show('explore', 'edusat');
    offline.pending[0].reject();
    await offline.settle();
    retry(offline.root)!.listeners.click[0]();
    offline.pending[1].reject();
    await offline.settle();
    expect(offline.counts().reloads).toBe(0);
    expect(said(offline.root)).toContain(t('lesson.page.loadFailed'));
    expect(retry(offline.root)).toBeDefined();
  });

  it('a retry that brings the code shows the section, with no reload', async () => {
    const { root, loader, pending, shown, settle, counts } = make();
    loader.show('explore', 'edusat');
    pending[0].reject();
    await settle();
    retry(root)!.listeners.click[0]();
    pending[1].resolve();
    await settle();
    expect(shown).toEqual([['explore', 'edusat', 'explore']]);
    expect(counts().reloads).toBe(0);
  });

  it('says nothing over another section when the failure comes after it was left', async () => {
    const { root, loader, pending, settle } = make();
    loader.show('explore', 'edusat');
    loader.hide();
    const before = root.children.length;
    pending[0].reject();
    await settle();
    expect(root.children.length).toBe(before);
    // asked for again, the failure is said (the browser keeps a module's failed fetch: there is nothing to fetch again without the retry)
    loader.show('explore', 'edusat');
    expect(said(root)).toContain(t('lesson.page.loadFailed'));
  });
});
