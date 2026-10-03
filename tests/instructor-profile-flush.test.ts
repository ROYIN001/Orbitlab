import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLang, t } from '../src/i18n';
import { renderAuthor, type AuthorHost } from '../src/ui/lessons/author-view';
import { renderWorksheets, type WorksheetHost } from '../src/ui/lessons/worksheet-view';
import { bindWorkspaceStorage } from '../src/workspace/storage';

/** Exercise the real view's input handlers and registered transition flush, without image/export machinery. */
class ElementStub {
  className = ''; textContent = ''; value = ''; type = ''; name = ''; checked = false;
  children: ElementStub[] = [];
  attributes = new Map<string, string>();
  listeners = new Map<string, Array<() => void>>();
  constructor(readonly tag = 'input') {}
  append(...items: ElementStub[]): void { this.children.push(...items); }
  replaceChildren(...items: ElementStub[]): void { this.children = items; }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  dispatch(type: string): void { for (const listener of this.listeners.get(type) ?? []) listener(); }
  all(): ElementStub[] { return [this, ...this.children.flatMap((child) => child.all())]; }
}
class OptionStub extends ElementStub {
  constructor(text: string, value = '', _default = false, selected = false) {
    super('option'); this.textContent = text; this.value = value; this.checked = selected;
  }
}
const authorHost: AuthorHost = { mission: () => null, knownEvents: () => new Set(), tryLesson: () => {}, page: () => 'https://example.test/' };
const worksheetHost = { flight: () => null, lesson: () => null, progress: () => ({ customQuestions: [] }) } as unknown as WorksheetHost;
function fixture(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial)), writes: string[] = [];
  let failedKey: string | null = null;
  const flushes: Array<() => void | Promise<void>> = [];
  bindWorkspaceStorage({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (key === failedKey) throw new DOMException('quota', 'QuotaExceededError');
      writes.push(key); values.set(key, value);
    },
    removeItem: (key) => { values.delete(key); },
  }, (flush) => { flushes.push(flush); return () => {}; }, () => ({ profileId: 'A', epoch: 1, durable: true, assert: () => {} }));
  vi.stubGlobal('document', {
    documentElement: {}, createElement: (tag: string) => new ElementStub(tag),
    createTextNode: (text: string) => { const node = new ElementStub('#text'); node.textContent = text; return node; },
  });
  vi.stubGlobal('HTMLInputElement', ElementStub); vi.stubGlobal('Option', OptionStub);
  return { values, writes, deny: (key: string | null) => { failedKey = key; }, flush: async () => { for (const flush of flushes) await flush(); } };
}
afterEach(() => { setLang('en'); vi.unstubAllGlobals(); });

describe('instructor forms before profile transition', () => {
  it('leaves opaque drafts and worksheet bytes unchanged through rendering, language changes and untouched flushes', async () => {
    const original = {
      'orbitlab.author.draft': '{future flight draft',
      'orbitlab.author.design': '{"version":99,"futureDesign":true}',
      'orbitlab.author.kind': 'future-kind',
      'orbitlab.worksheets': '{future worksheet',
      'orbitlab.numeric-drafts.v1': '{"v":99,"future":true}',
    };
    const disk = fixture(original);
    const author = renderAuthor(authorHost, new ElementStub('div') as unknown as HTMLElement);
    const sheets = renderWorksheets(worksheetHost, new ElementStub('div') as unknown as HTMLElement);
    author.applyLanguage(); sheets.applyLanguage(); await disk.flush();
    expect(Object.fromEntries(disk.values)).toEqual(original);
    expect(disk.writes).toEqual([]);
  });

  it('saves only the edited author kind, preserves the inactive draft and retries quota failures strictly', async () => {
    const future = '{"version":99,"futureDesign":true}';
    const disk = fixture({ 'orbitlab.author.draft': '{unreadable flight', 'orbitlab.author.design': future });
    const container = new ElementStub('div');
    renderAuthor(authorHost, container as unknown as HTMLElement);
    const id = container.all().find((node) => node.tag === 'input' && node.value.startsWith('class-'))!;
    disk.deny('orbitlab.author.draft');
    id.value = 'class-edited-flight'; id.dispatch('input');
    await expect(disk.flush()).rejects.toThrow('quota');
    expect(disk.values.get('orbitlab.author.draft')).toBe('{unreadable flight');
    expect(disk.values.get('orbitlab.author.design')).toBe(future);
    disk.deny(null); await disk.flush();
    expect(JSON.parse(disk.values.get('orbitlab.author.draft')!).id).toBe('class-edited-flight');
    expect(disk.values.get('orbitlab.author.design')).toBe(future);
    const afterRetry = disk.writes.length; await disk.flush(); expect(disk.writes).toHaveLength(afterRetry);

    const criterion = container.all().find((node) => node.tag === 'select' && node.className === 'author-kind')!;
    criterion.value = 'measure'; criterion.dispatch('change');
    const measure = container.all().find((node) => node.tag === 'select' && node.attributes.get('aria-label') === t('lesson.author.measure'))!;
    measure.value = 'orbit.period'; measure.dispatch('change');
    expect(JSON.parse(disk.values.get('orbitlab.author.draft')!).criteria[0]).toMatchObject({ kind: 'measure', measure: 'orbit.period' });
    expect(disk.values.get('orbitlab.author.design')).toBe(future);

    const design = container.all().filter((node) => node.name === 'author-kind')[1];
    disk.deny('orbitlab.author.kind'); design.checked = true; design.dispatch('change');
    await expect(disk.flush()).rejects.toThrow('quota');
    expect(disk.values.get('orbitlab.author.design')).toBe(future);
    disk.deny(null); await disk.flush();
    expect(disk.values.get('orbitlab.author.kind')).toBe('design');
    expect(disk.values.get('orbitlab.author.design')).toBe(future);

    const add = container.all().find((node) => node.tag === 'button' && node.textContent === `+ ${t('lesson.author.add')}`)!;
    add.dispatch('click');
    expect(JSON.parse(disk.values.get('orbitlab.author.design')!).criteria).toHaveLength(2);
    expect(JSON.parse(disk.values.get('orbitlab.author.draft')!).id).toBe('class-edited-flight');
  });

  it('retains worksheet edits after a quota failure, blocks transition and clears pending only after a successful retry', async () => {
    const original = '{unreadable worksheet';
    const disk = fixture({ 'orbitlab.worksheets': original });
    const container = new ElementStub('div');
    const view = renderWorksheets(worksheetHost, container as unknown as HTMLElement);
    const students = container.all().find((node) => node.tag === 'textarea')!;
    disk.deny('orbitlab.worksheets'); students.value = 'Learner A'; students.dispatch('input');
    view.applyLanguage();
    await expect(disk.flush()).rejects.toThrow('quota');
    expect(disk.values.get('orbitlab.worksheets')).toBe(original);
    disk.deny(null); await disk.flush();
    expect(JSON.parse(disk.values.get('orbitlab.worksheets')!).students).toBe('Learner A');
    const afterRetry = disk.writes.length; await disk.flush(); view.applyLanguage(); await disk.flush();
    expect(disk.writes).toHaveLength(afterRetry);
  });
});
