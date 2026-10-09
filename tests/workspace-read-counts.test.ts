import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RawStorage } from '../src/workspace/registry';
import { LEGACY_PROFILE_ID, PROFILE_SELECTED_KEY, WorkspaceError, WorkspaceRepository, profileStorageKey,
  type ProfileCounts, type ProfileListRow, type WorkspaceLocks } from '../src/workspace/repository';
import type { ProfileDialogSnapshot, ProfileItem, UnreadableProfileItem } from '../src/ui/profiles/profile-dialog';
import { createProfileMenuHost } from '../src/ui/profiles/profile-menu';
import { AppProfiles } from '../src/ui/profiles/app-profiles';

let current: WorkspaceRepository | null = null;
vi.mock('../src/workspace/session', () => ({ workspaceRepository: () => current }));

function memory() {
  const values = new Map<string, string>(), reads: string[] = [];
  const store: RawStorage = {
    get length() { return values.size; }, key: (i) => [...values.keys()][i] ?? null,
    getItem: (k) => { reads.push(k); return values.get(k) ?? null; }, setItem: (k, v) => { values.set(k, v); }, removeItem: (k) => { values.delete(k); },
  };
  return { values, store, reads };
}
class Locks implements WorkspaceLocks {
  private held = new Set<string>();
  async request<T>(name: string, options: { ifAvailable?: boolean }, run: (lock: unknown | null) => Promise<T>): Promise<T> {
    if (this.held.has(name)) { if (options.ifAvailable) return run(null); throw new Error('test double: contended'); }
    this.held.add(name);
    try { return await run({ name }); } finally { this.held.delete(name); }
  }
}
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };
const lessons = JSON.stringify({ version: 1, lessons: { a: {}, b: {} }, assessments: [1], customLessons: [1, 2], customQuestions: [] });

/** Three learners with work, the third cut short; `selected` is this tab's selection. */
async function device(selected: string) {
  const disk = memory(), session = memory(), locks = new Locks(); let n = 0;
  const repo = () => new WorkspaceRepository(disk.store, session.store, locks, undefined, () => `p-${++n}`);
  const first = await repo().initialize();
  first.binding!.setItem('orbitlab.lessons', lessons);
  first.binding!.setItem('orbitlab.designs', JSON.stringify({ version: 1, designs: [{}, {}] }));
  first.binding!.setItem('orbitlab.build.explore.v1', '{"v":1}');
  await first.create('Bea');
  const broken = await first.create('Broken'); first.close(); await tick();
  disk.values.set(profileStorageKey(broken.id), disk.values.get(profileStorageKey(broken.id))!.slice(0, -12));
  session.values.set(PROFILE_SELECTED_KEY, selected);
  return { disk, session, repo };
}

/** 007b039's `profileRow()`, inlined so the oracle does not run the code under test (review finding 1). */
function oldRow(r: WorkspaceRepository, id: string): ProfileListRow {
  try { const record = r.read(id), { values, version: _v, ...meta } = record; return { ...meta, counts: countsOf(values), state: 'ok' }; } catch (error) {
    if (!(error instanceof WorkspaceError) || !['invalid', 'newer', 'missing'].includes(error.code)) throw error;
    let name: string | undefined, raw: string | null = null;
    try { raw = r.rawProfile(id); } catch { /* none */ }
    if (raw === null) return { id, state: 'missing' };
    try { const data = JSON.parse(raw); if (data && typeof data === 'object' && !Array.isArray(data) && typeof data.name === 'string' && data.name.trim()) name = data.name.trim().slice(0, 100); } catch { /* none */ }
    return { id, state: error.code === 'newer' ? 'newer' : 'unreadable', name };
  }
}
function countsOf(values: Record<string, string>): ProfileCounts {
  const read = (key: string): Record<string, unknown> => { try { const v = JSON.parse(values[key] ?? 'null'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };
  const p = read('orbitlab.lessons'), d = read('orbitlab.designs'), n = read('orbitlab.experiments.v1');
  return { lessons: p.lessons && typeof p.lessons === 'object' && !Array.isArray(p.lessons) ? Object.keys(p.lessons).length : 0,
    assessments: Array.isArray(p.assessments) ? p.assessments.length : 0,
    designs: Array.isArray(d.designs) ? d.designs.length : 0, experiments: Array.isArray(n.experiments) ? n.experiments.length : 0 };
}
/** The chooser snapshot as 007b039 built it: a row per catalogue id, a second read() per readable row, and active() for the name. */
function before(r: WorkspaceRepository, snapshot: ProfileDialogSnapshot, ids: string[]): ProfileDialogSnapshot {
  const profiles: ProfileItem[] = [], unreadable: UnreadableProfileItem[] = [];
  try {
    const rows = ids.map((id) => oldRow(r, id));
    for (const row of rows) {
      if (row.state !== 'ok') { unreadable.push(row); continue; }
      const values = r.read(row.id).values;
      let data: { customLessons?: unknown; customQuestions?: unknown } | null = null;
      try { data = JSON.parse(values['orbitlab.lessons'] ?? 'null'); } catch { /* none */ }
      profiles.push({ ...row, counts: { ...row.counts,
        drafts: Object.keys(values).filter((key) => /^(orbitlab\.build\.(explore|satellite|requirements)\.v1|orbitlab\.author\.(draft|design|kind)|orbitlab\.worksheets)$/.test(key)).length,
        customLessons: Array.isArray(data?.customLessons) ? data.customLessons.length : 0,
        customQuestions: Array.isArray(data?.customQuestions) ? data.customQuestions.length : 0 } });
    }
  } catch { profiles.length = 0; unreadable.length = 0; }
  let name = ''; try { name = r.active()?.name ?? ''; } catch { /* '' */ }
  const activeId = name && r.binding?.valid ? r.binding.profileId : null;
  return { profiles, unreadable, activeId, lessons: snapshot.lessons, status: activeId ? r.status : 'chooser' };
}
const same = (r: WorkspaceRepository, ids: string[]) => {
  const snapshot = createProfileMenuHost(r, () => {}, () => {}).snapshot();
  expect(JSON.stringify(snapshot)).toBe(JSON.stringify(before(r, snapshot, ids)));
  return snapshot;
};
const IDS = [LEGACY_PROFILE_ID, 'p-1', 'p-2'];

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); current = null; });

describe('R1.6 PR4: fewer reads and parses, the same results (M-PLATFORM-003/005/006)', () => {
  it('M-PLATFORM-003: start-up parses the selected legacy record 3 times, not 4, and stores the same bytes', async () => {
    const env = await device(LEGACY_PROFILE_ID), raw = env.disk.values.get(profileStorageKey(LEGACY_PROFILE_ID))!;
    const parse = vi.spyOn(JSON, 'parse');
    const r = await env.repo().initialize();
    const parsed = parse.mock.calls.filter(([text]) => text === raw).length;
    parse.mockRestore();
    expect(r.status).toBe('durable'); expect(r.binding!.getItem('orbitlab.lessons')).toBe(lessons);
    expect(env.disk.values.get(profileStorageKey(LEGACY_PROFILE_ID))).toBe(raw);
    expect(parsed).toBe(3); r.close();
  });

  for (const [label, selected] of [['durable', LEGACY_PROFILE_ID], ['chooser', '']] as const) {
    it(`M-PLATFORM-005: one snapshot reads the catalogue once and each record once (${label}), and equals the old snapshot`, async () => {
      const env = await device(selected), r = await env.repo().initialize(), host = createProfileMenuHost(r, () => {}, () => {});
      expect(r.status).toBe(label);
      env.disk.reads.length = 0;
      const snapshot = host.snapshot();
      expect(env.disk.reads.length).toBe(1 + 3);
      expect(JSON.stringify(snapshot)).toBe(JSON.stringify(before(r, snapshot, IDS)));
      expect(snapshot.profiles.map((p) => p.counts)).toEqual([
        { lessons: 2, assessments: 1, designs: 2, experiments: 0, drafts: 1, customLessons: 2, customQuestions: 0 },
        { lessons: 0, assessments: 0, designs: 0, experiments: 0, drafts: 0, customLessons: 0, customQuestions: 0 },
      ]);
      r.close();
    });
  }

  it('M-PLATFORM-005: a locked tab and a visit-only tab get the old snapshot', async () => {
    const env = await device(LEGACY_PROFILE_ID), owner = await env.repo().initialize(), locked = await env.repo().initialize();
    expect(locked.status).toBe('locked');
    same(locked, IDS);
    const visit = await new WorkspaceRepository(env.disk.store, env.session.store).initialize();
    expect(visit.status).toBe('ephemeral');
    same(visit, [LEGACY_PROFILE_ID]);
    // review finding 3: a visit-only row's values are a copy, not the live record
    (visit.rows()[0].values as Record<string, string>)['orbitlab.lessons'] = 'changed';
    expect(visit.binding!.getItem('orbitlab.lessons')).toBe(lessons);
    owner.close(); locked.close(); visit.close();
  });

  it('M-PLATFORM-005 review: the open learner\'s record damaged after start, and another learner that cannot be read at all', async () => {
    const env = await device(LEGACY_PROFILE_ID), r = await env.repo().initialize();
    const key = profileStorageKey(LEGACY_PROFILE_ID), good = env.disk.values.get(key)!;
    env.disk.values.set(key, good.slice(0, -12));
    expect(same(r, IDS).activeId).toBeNull();
    env.disk.values.set(key, good);
    const getItem = env.disk.store.getItem;
    env.disk.store.getItem = (k) => { if (k === profileStorageKey('p-1')) throw new DOMException('denied', 'SecurityError'); return getItem(k); };
    const snapshot = same(r, IDS);
    expect(snapshot.profiles).toEqual([]); expect(snapshot.activeId).toBe(LEGACY_PROFILE_ID);
    env.disk.store.getItem = getItem; r.close();
  });

  it('M-PLATFORM-006: showing the learner\'s name parses no lessons, designs or experiments', async () => {
    const env = await device(LEGACY_PROFILE_ID), r = await env.repo().initialize(); current = r;
    const label = { textContent: '' }, element = () => ({ hidden: false, textContent: '', title: '', dataset: {} as Record<string, string>,
      addEventListener() {}, setAttribute() {}, append() {}, querySelector: () => label });
    vi.stubGlobal('window', { addEventListener() {} });
    vi.stubGlobal('document', { documentElement: {}, createElement: element });
    const profiles = new AppProfiles({} as HTMLDialogElement, element() as unknown as HTMLButtonElement, element() as unknown as HTMLElement);
    const parse = vi.spyOn(JSON, 'parse');
    expect(profiles.name()).toBe('Learner 1');
    expect(parse.mock.calls.filter(([text]) => text === lessons)).toEqual([]);
    parse.mockRestore();
    // review finding 2: an unreadable open record gives '' as before (no open learner: the chooser cases above, activeId null)
    const key = profileStorageKey(LEGACY_PROFILE_ID), good = env.disk.values.get(key)!;
    env.disk.values.set(key, good.slice(0, -12)); expect(profiles.name()).toBe('');
    env.disk.values.set(key, good); r.close();
  });
});
