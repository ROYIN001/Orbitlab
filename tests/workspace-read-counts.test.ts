import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RawStorage } from '../src/workspace/registry';
import { LEGACY_PROFILE_ID, PROFILE_SELECTED_KEY, WorkspaceRepository, profileStorageKey,
  type WorkspaceLocks } from '../src/workspace/repository';
import type { ProfileDialogSnapshot } from '../src/ui/profiles/profile-dialog';
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

/** The chooser snapshot as 007b039 built it: listWithStatus(), a second read() per readable row, and active() for the name. */
function before(r: WorkspaceRepository, snapshot: ProfileDialogSnapshot): ProfileDialogSnapshot {
  const profiles: ProfileDialogSnapshot['profiles'] = [], unreadable: NonNullable<ProfileDialogSnapshot['unreadable']> = [];
  for (const row of r.listWithStatus()) {
    if (row.state !== 'ok') { unreadable.push(row); continue; }
    const values = r.read(row.id).values;
    const data = JSON.parse(values['orbitlab.lessons'] ?? 'null');
    profiles.push({ ...row, counts: { ...row.counts,
      drafts: Object.keys(values).filter((key) => /^(orbitlab\.build\.(explore|satellite|requirements)\.v1|orbitlab\.author\.(draft|design|kind)|orbitlab\.worksheets)$/.test(key)).length,
      customLessons: Array.isArray(data?.customLessons) ? data.customLessons.length : 0,
      customQuestions: Array.isArray(data?.customQuestions) ? data.customQuestions.length : 0 } });
  }
  const activeId = r.active()?.name && r.binding?.valid ? r.binding.profileId : null;
  return { profiles, unreadable, activeId, lessons: snapshot.lessons, status: activeId ? r.status : 'chooser' };
}

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
      expect(snapshot).toEqual(before(r, snapshot));
      expect(JSON.stringify(snapshot)).toBe(JSON.stringify(before(r, snapshot)));
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
    const lockedSnapshot = createProfileMenuHost(locked, () => {}, () => {}).snapshot();
    expect(JSON.stringify(lockedSnapshot)).toBe(JSON.stringify(before(locked, lockedSnapshot)));
    const visit = await new WorkspaceRepository(env.disk.store, env.session.store).initialize();
    expect(visit.status).toBe('ephemeral');
    const visitSnapshot = createProfileMenuHost(visit, () => {}, () => {}).snapshot();
    expect(JSON.stringify(visitSnapshot)).toBe(JSON.stringify(before(visit, visitSnapshot)));
    owner.close(); locked.close(); visit.close();
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
    parse.mockRestore(); r.close();
  });
});
