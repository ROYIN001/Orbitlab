/**
 * The site is usable without choosing a learner (owner, 2026-10-14): a new tab,
 * a deleted learner or an unreadable selection opens a learner by itself — the
 * one whose work was saved last, or a new one — and the landing page is not
 * covered by the Learner profiles dialog. The chooser opens on its own only
 * when no learner can be opened or made at all.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RawStorage } from '../src/workspace/registry';
import { LEGACY_PROFILE_ID, PROFILE_CATALOG_KEY, PROFILE_MAX_COUNT, PROFILE_SELECTED_KEY, WorkspaceRepository,
  profileStorageKey, type WorkspaceLocks } from '../src/workspace/repository';
import { AppProfiles } from '../src/ui/profiles/app-profiles';

let current: WorkspaceRepository | null = null;
vi.mock('../src/workspace/session', () => ({ workspaceRepository: () => current }));
const opened = vi.hoisted(() => ({ count: 0 }));
vi.mock('../src/ui/profiles/profile-menu', () => ({
  createProfileMenu: () => ({ isOpen: false, open() { opened.count++; }, openReset() {}, applyLanguage() {} }),
}));

function memory() {
  const values = new Map<string, string>();
  const store: RawStorage = {
    get length() { return values.size; }, key: (i) => [...values.keys()][i] ?? null,
    getItem: (k) => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }, removeItem: (k) => { values.delete(k); },
  };
  return { values, store };
}
class Locks implements WorkspaceLocks {
  readonly held = new Set<string>();
  async request<T>(name: string, options: { ifAvailable?: boolean }, run: (lock: unknown | null) => Promise<T>): Promise<T> {
    if (this.held.has(name)) { if (options.ifAvailable) return run(null); throw new Error('test double: contended'); }
    this.held.add(name);
    try { return await run({ name }); } finally { this.held.delete(name); }
  }
}
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };
/** One browser: a shared disk and locks; every `tab()` is a new tab with its own, empty session. */
function browser() {
  const disk = memory(), locks = new Locks(); let n = 0;
  const tab = (session = memory()) => ({ session, repo: new WorkspaceRepository(disk.store, session.store, locks, undefined, () => `p-${++n}`) });
  return { disk, locks, tab };
}
const later = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => { current?.close(); current = null; opened.count = 0; vi.unstubAllGlobals(); });

describe('a start opens a learner without asking', () => {
  it('the device\'s only learner is not the first one (Learner 1 deleted, another made): a new tab opens it', async () => {
    const b = browser(), first = await b.tab().repo.initialize();
    const own = await first.create('Royin001'); await first.delete(LEGACY_PROFILE_ID); first.close(); await tick();
    // before 2026-10-14 this tab stopped at the chooser, over the landing page
    const fresh = b.tab(), opened = await fresh.repo.initialize();
    expect(opened.status).toBe('durable'); expect(opened.active()?.name).toBe('Royin001');
    expect(fresh.session.values.get(PROFILE_SELECTED_KEY)).toBe(own.id);
    expect(opened.notices).toEqual([]); opened.close();
  });

  it('several learners: a new tab opens the one whose work was saved last; nothing is stored to pick it', async () => {
    const b = browser(), a = await b.tab().repo.initialize();
    const bea = await a.create('Bea'); await later(5);
    a.binding!.setItem('orbitlab.mission', 'Learner 1 worked last'); a.close(); await tick();
    let before = new Map(b.disk.values);
    let r = await b.tab().repo.initialize();
    expect(r.binding!.profileId).toBe(LEGACY_PROFILE_ID); expect(new Map(b.disk.values)).toEqual(before); r.close(); await tick();
    const t = b.tab(); t.session.values.set(PROFILE_SELECTED_KEY, bea.id);
    const beaTab = await t.repo.initialize(); await later(5); beaTab.binding!.setItem('orbitlab.mission', 'Bea worked last'); beaTab.close(); await tick();
    before = new Map(b.disk.values);
    r = await b.tab().repo.initialize();
    expect(r.binding!.profileId).toBe(bea.id); expect(r.binding!.getItem('orbitlab.mission')).toBe('Bea worked last');
    expect(new Map(b.disk.values)).toEqual(before); r.close();
  });

  it('the open learner deleted: the reload opens another; the last one deleted: the reload opens a new, empty one', async () => {
    const b = browser(), t = b.tab(), r = await t.repo.initialize();
    const bea = await r.create('Bea'); r.binding!.setItem('orbitlab.mission', 'gone');
    await r.delete(LEGACY_PROFILE_ID); expect(r.status).toBe('chooser'); await tick();
    const next = await b.tab(t.session).repo.initialize();
    expect(next.status).toBe('durable'); expect(next.binding!.profileId).toBe(bea.id);
    await next.delete(bea.id); await tick();
    const empty = await b.tab(t.session).repo.initialize();
    expect(empty.status).toBe('durable'); expect(empty.list().map((p) => p.name)).toEqual(['Learner 1']);
    expect(empty.binding!.profileId).not.toBe(LEGACY_PROFILE_ID); expect(empty.binding!.getItem('orbitlab.mission')).toBeNull();
    // the reload after that opens the same new learner, no second one
    empty.close(); await tick();
    const again = await b.tab().repo.initialize(); expect(again.list()).toHaveLength(1); again.close();
  });

  it('a second tab while the first owns the only learner: read-only on it, not the chooser', async () => {
    const b = browser(), owner = await b.tab().repo.initialize();
    const second = await b.tab().repo.initialize();
    expect(second.status).toBe('locked'); expect(second.binding!.profileId).toBe(LEGACY_PROFILE_ID);
    owner.close(); second.close();
  });

  it('the chooser only when no learner can be opened or made: every catalogue row unreadable and the limit reached', async () => {
    const b = browser(), profiles: Record<string, object> = {};
    for (let i = 0; i < PROFILE_MAX_COUNT; i++) { profiles[`x-${i}`] = {}; b.disk.values.set(profileStorageKey(`x-${i}`), '{cut'); }
    b.disk.values.set(PROFILE_CATALOG_KEY, JSON.stringify({ version: 1, profiles, legacyId: 'x-0', mediaMigrated: true }));
    const before = new Map(b.disk.values);
    const r = await b.tab().repo.initialize();
    expect(r.status).toBe('chooser'); expect(r.binding).toBeNull(); expect(new Map(b.disk.values)).toEqual(before); r.close();
  });
});

class ElementStub {
  hidden = false; textContent = ''; title = ''; dataset: Record<string, string> = {};
  readonly label = { textContent: '' };
  addEventListener(): void {}
  setAttribute(): void {}
  append(): void {}
  querySelector(): { textContent: string } { return this.label; }
}
async function shell(repo: WorkspaceRepository): Promise<number> {
  vi.stubGlobal('window', { addEventListener() {} });
  vi.stubGlobal('document', { documentElement: {}, createElement: () => new ElementStub() });
  current = repo;
  new AppProfiles({} as HTMLDialogElement, new ElementStub() as unknown as HTMLButtonElement, new ElementStub() as unknown as HTMLElement);
  await later(0); await later(0);
  return opened.count;
}

describe('the landing page is not covered by Learner profiles', () => {
  it('a durable, a read-only and a visit-only start leave the dialog closed', async () => {
    const b = browser(), owner = await b.tab().repo.initialize();
    expect(await shell(owner)).toBe(0);
    const second = await b.tab().repo.initialize(); expect(second.status).toBe('locked');
    expect(await shell(second)).toBe(0); second.close(); current = owner;
    const visit = await new WorkspaceRepository(memory().store, memory().store).initialize(); expect(visit.status).toBe('ephemeral');
    expect(await shell(visit)).toBe(0); owner.close();
  });
  it('only a start with no learner open shows the chooser', async () => {
    const b = browser(), r = await b.tab().repo.initialize();
    await r.delete(LEGACY_PROFILE_ID); expect(r.status).toBe('chooser');
    expect(await shell(r)).toBe(1);
  });
});
