import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundtrackPanel, parseOffset } from '../src/ui/soundtrack-panel';

const storage = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), remove: vi.fn() }));
vi.mock('../src/audio/soundtrack', () => ({
  BUNDLED_SOUNDTRACKS: {}, loadUserSoundtrack: storage.load,
  saveUserSoundtrack: storage.save, removeUserSoundtrack: storage.remove,
}));
vi.mock('../src/ui/watch-missions', () => ({ WATCH_MISSIONS: [{ id: 'soyuzIss', titleKey: 'snd.title' }] }));

/** The panel's native event handlers run unchanged; only the DOM/storage boundary is replaced. */
class Element {
  children: Element[] = [];
  listeners = new Map<string, (() => void)[]>();
  dataset: Record<string, string> = {};
  className = ''; textContent = ''; value = ''; type = ''; hidden = false;
  files: File[] = [];
  append(...children: Element[]) { this.children.push(...children); }
  setAttribute() {}
  addEventListener(type: string, fn: () => void) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]); }
  dispatch(type: string) { for (const fn of this.listeners.get(type) ?? []) fn(); }
  click() { this.dispatch('click'); }
}
type StoredRecord = { id: string; blob: Blob; name: string; t0: number };
let record: StoredRecord | null;
const flush = async () => { await new Promise((resolve) => setTimeout(resolve, 0)); };
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>((r) => { resolve = r; }); return { promise, resolve }; };
function panel() {
  const changed = vi.fn();
  const root = new SoundtrackPanel(changed).render() as unknown as Element;
  const row = root.children[2].children[0];
  return { changed, status: row.children[1], offset: row.children[2].children[1], remove: row.children[4], file: row.children[5] };
}

beforeEach(() => {
  vi.clearAllMocks();
  record = { id: 'soyuzIss', blob: new Blob(['audio']), name: 'qa.mp3', t0: 0 };
  storage.load.mockImplementation(async () => record && { ...record });
  storage.save.mockImplementation(async (id: string, blob: Blob, name: string, t0: number) => { record = { id, blob, name, t0 }; });
  storage.remove.mockImplementation(async () => { record = null; });
  vi.stubGlobal('document', { createElement: () => new Element() });
});
afterEach(() => vi.unstubAllGlobals());

describe('launch recording offset edits', () => {
  it('persists an existing offset with the same recording and restores it when reopened', async () => {
    const original = { ...record! }, p = panel(); await flush();
    p.offset.value = '1:00'; p.offset.dispatch('change'); await flush();
    expect(record).toEqual({ ...original, t0: 60 });
    expect(record!.blob).toBe(original.blob);
    expect(p.changed).toHaveBeenCalledWith('soyuzIss');
    const reopened = panel(); await flush();
    expect(reopened.offset.value).toBe('1:00');
  });

  it('keeps an offset as a draft when no recording exists and uses it for the subsequent upload', async () => {
    record = null; const p = panel(); await flush();
    p.offset.value = '1:07:11'; p.offset.dispatch('change'); await flush();
    expect(storage.save).not.toHaveBeenCalled(); expect(p.changed).not.toHaveBeenCalled();
    p.file.files = [new File(['new'], 'new.mp3')]; p.file.dispatch('change'); await flush();
    expect(record).toMatchObject({ name: 'new.mp3', t0: 4031 });
  });

  it.each(['bad', '9'.repeat(309), `${'9'.repeat(308)}:0`])('rejects invalid or overflowing offset %s', async (value) => {
    const p = panel(); await flush(); p.offset.value = value; p.offset.dispatch('change'); await flush();
    expect(parseOffset(value)).toBeNull();
    expect(storage.save).not.toHaveBeenCalled(); expect(p.changed).not.toHaveBeenCalled();
    expect(record!.t0).toBe(0); expect(p.status.textContent).toContain('Write the liftoff time');
  });

  it('does not replace an edit with a late initial storage read', async () => {
    const read = deferred(); storage.load.mockImplementation(async () => { await read.promise; return { ...record! }; });
    const p = panel(); p.offset.value = '1:00'; p.offset.dispatch('input'); p.offset.dispatch('change');
    read.resolve(); await flush();
    expect(p.offset.value).toBe('1:00'); expect(record!.t0).toBe(60);
  });

  it('orders an in-flight edit before removal so it cannot resurrect the recording', async () => {
    const p = panel(); await flush(); const write = deferred();
    storage.save.mockImplementation(async (id: string, blob: Blob, name: string, t0: number) => {
      await write.promise; record = { id, blob, name, t0 };
    });
    p.offset.value = '1:00'; p.offset.dispatch('change'); await flush();
    p.remove.click(); await flush(); write.resolve(); await flush();
    expect(record).toBeNull(); expect(p.remove.hidden).toBe(true);
  });

  it('orders replacement after an in-flight edit, preserving the newly uploaded blob', async () => {
    const p = panel(); await flush(); const write = deferred();
    storage.save.mockImplementationOnce(async (id: string, blob: Blob, name: string, t0: number) => {
      await write.promise; record = { id, blob, name, t0 };
    });
    p.offset.value = '1:00'; p.offset.dispatch('change'); await flush();
    const replacement = new File(['replacement'], 'replacement.mp3');
    p.file.files = [replacement]; p.file.dispatch('change'); write.resolve(); await flush();
    expect(record).toMatchObject({ name: replacement.name, t0: 60 }); expect(record!.blob).toBe(replacement);
  });

  it('reports a failed save without accepting it and still permits a later retry', async () => {
    const p = panel(); await flush(); storage.save.mockRejectedValueOnce(new Error('quota'));
    p.offset.value = '1:00'; p.offset.dispatch('change'); await flush();
    expect(record!.t0).toBe(0); expect(p.changed).not.toHaveBeenCalled();
    expect(p.status.textContent).toContain('could not save');
    p.offset.value = '2:00'; p.offset.dispatch('change'); await flush();
    expect(record!.t0).toBe(120); expect(p.changed).toHaveBeenCalledTimes(1);
  });

  it('keeps the recording and remove button after deletion fails, then permits a retry', async () => {
    const p = panel(); await flush(); storage.remove.mockRejectedValueOnce(new Error('delete denied'));
    p.remove.click(); await flush();
    expect(record!.name).toBe('qa.mp3'); expect(p.remove.hidden).toBe(false);
    expect(p.changed).not.toHaveBeenCalled(); expect(p.status.textContent).toContain('could not save');
    p.remove.click(); await flush();
    expect(record).toBeNull(); expect(p.remove.hidden).toBe(true); expect(p.changed).toHaveBeenCalledTimes(1);
  });
});
