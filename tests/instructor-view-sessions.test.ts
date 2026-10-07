import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLang, t } from '../src/i18n';
import { renderAuthor, type AuthorHost } from '../src/ui/lessons/author-view';
import { renderWorksheets, type WorksheetHost } from '../src/ui/lessons/worksheet-view';
import { WorkspaceRepository, type WorkspaceLocks } from '../src/workspace/repository';
import { bindWorkspaceStorage } from '../src/workspace/storage';

/**
 * M-LEARNING-004: the worksheets and author tabs are built anew each time they are opened, in one document.
 * Opening them again must not add a flusher, an edit whose save failed must not come back over a newer one at
 * the profile switch, and opening them without an edit must keep the class code and write nothing.
 */
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
const locks: WorkspaceLocks = { request: async (_name, _options, run) => run({}) };

/** A real profile repository over a storage double that fails while denied and succeeds after. */
async function workspace() {
  const values = new Map<string, string>(); let denied = false, writes = 0;
  const disk = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { if (denied) throw new DOMException('quota', 'QuotaExceededError'); writes++; values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  const session = new Map<string, string>();
  const repo = await new WorkspaceRepository(disk, {
    getItem: (key) => session.get(key) ?? null, setItem: (key, value) => { session.set(key, value); }, removeItem: (key) => { session.delete(key); },
  }, locks).initialize();
  const binding = repo.binding!, first = binding.profileId, live = new Set<() => void | Promise<void>>();
  bindWorkspaceStorage(binding, (flush) => {
    live.add(flush); const detach = repo.registerFlush(flush);
    return () => { live.delete(flush); detach(); };
  }, (write) => ({ ...binding.token(write), durable: true }));
  vi.stubGlobal('document', {
    documentElement: {}, createElement: (tag: string) => new ElementStub(tag),
    createTextNode: (text: string) => { const node = new ElementStub('#text'); node.textContent = text; return node; },
  });
  vi.stubGlobal('HTMLInputElement', ElementStub); vi.stubGlobal('Option', OptionStub);
  return {
    repo, live,
    deny: (value: boolean) => { denied = value; },
    writes: () => writes,
    /** what the first profile keeps under this key once the switch has flushed and closed it */
    stored: (key: string): string | undefined => JSON.parse(repo.rawProfile(first)).values[key],
  };
}
const open = <T>(render: (container: HTMLElement) => T): ElementStub => {
  const container = new ElementStub('div'); render(container as unknown as HTMLElement); return container;
};
const labelled = (container: ElementStub, label: string): ElementStub =>
  container.all().find((node) => node.tag === 'label' && node.children[0]?.textContent === label)!.children[1];
afterEach(() => { setLang('en'); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('worksheets and author tabs opened again in one document', () => {
  it('keeps one flusher per document however often the tabs are opened', async () => {
    const disk = await workspace();
    open((c) => renderWorksheets(worksheetHost, c));
    const afterFirst = disk.live.size;
    open((c) => renderWorksheets(worksheetHost, c)); open((c) => renderWorksheets(worksheetHost, c));
    expect(disk.live.size).toBe(afterFirst);
    open((c) => renderAuthor(authorHost, c));
    const afterAuthor = disk.live.size;
    open((c) => renderAuthor(authorHost, c)); open((c) => renderAuthor(authorHost, c));
    expect(disk.live.size).toBe(afterAuthor);
    disk.repo.close();
  });

  it('carries a worksheet edit whose save failed to the next opening, and a newer edit there survives the profile switch', async () => {
    const disk = await workspace(); const other = await disk.repo.create('Other');
    const first = open((c) => renderWorksheets(worksheetHost, c));
    const older = first.all().find((node) => node.tag === 'textarea')!;
    disk.deny(true); older.value = 'Older class list'; older.dispatch('input'); disk.deny(false);
    const second = open((c) => renderWorksheets(worksheetHost, c));
    const newer = second.all().find((node) => node.tag === 'textarea')!;
    expect.soft(newer.value).toBe('Older class list');
    newer.value = 'Newer class list'; newer.dispatch('input');
    await disk.repo.select(other.id);
    expect(JSON.parse(disk.stored('orbitlab.worksheets')!).students).toBe('Newer class list');
  });

  it('carries an author edit whose save failed to the next opening, and a newer edit there survives the profile switch', async () => {
    const disk = await workspace(); const other = await disk.repo.create('Other');
    const first = open((c) => renderAuthor(authorHost, c));
    const older = labelled(first, t('lesson.author.id'));
    disk.deny(true); older.value = 'class-older-edit'; older.dispatch('input'); disk.deny(false);
    const second = open((c) => renderAuthor(authorHost, c));
    const newer = labelled(second, t('lesson.author.id'));
    expect.soft(newer.value).toBe('class-older-edit');
    newer.value = 'class-newer-edit'; newer.dispatch('input');
    await disk.repo.select(other.id);
    expect(JSON.parse(disk.stored('orbitlab.author.draft')!).id).toBe('class-newer-edit');
  });

  it('keeps one class code when the worksheets are opened twice without an edit, and writes nothing', async () => {
    const disk = await workspace();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.9);
    const before = disk.writes();
    const first = labelled(open((c) => renderWorksheets(worksheetHost, c)), t('ws.classCode')).value;
    const second = labelled(open((c) => renderWorksheets(worksheetHost, c)), t('ws.classCode')).value;
    expect(second).toBe(first);
    await disk.repo.prepareChange();
    expect(disk.writes()).toBe(before);
    expect(disk.repo.binding!.getItem('orbitlab.worksheets')).toBeNull();
    disk.repo.close();
  });
});
