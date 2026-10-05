import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RawStorage } from '../src/workspace/registry';
import { LEGACY_PROFILE_ID, PROFILE_CATALOG_KEY, PROFILE_MAX_COUNT, PROFILE_SELECTED_KEY, WorkspaceRepository,
  profileStorageKey, type WorkspaceLocks, type WorkspaceMedia } from '../src/workspace/repository';
import { createProfileMenuHost } from '../src/ui/profiles/profile-menu';

const calls = vi.hoisted(() => ({ downloads: [] as { blob: Blob; filename: string }[], media: [] as string[] }));
vi.mock('../src/ui/download', () => ({ downloadBlob: (blob: Blob, filename: string) => { calls.downloads.push({ blob, filename }); } }));
vi.mock('../src/workspace/media-archive', () => ({
  exportProfileMediaArchive: async (id: string, name: string) => { calls.media.push(`${id}:${name}`); return new Blob(['audio']); },
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
  private held = new Set<string>();
  async request<T>(name: string, options: { ifAvailable?: boolean }, run: (lock: unknown | null) => Promise<T>): Promise<T> {
    if (this.held.has(name)) { if (options.ifAvailable) return run(null); throw new Error('test double: contended'); }
    this.held.add(name);
    try { return await run({ name }); } finally { this.held.delete(name); }
  }
}
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };

/** Three profiles: the legacy one healthy, one truncated (`invalid`), one written by a newer version (99). */
async function threeProfiles(selected: string) {
  const disk = memory(), session = memory(), locks = new Locks(); let n = 0; const deleted: string[] = [];
  const media: WorkspaceMedia = { migrate: async () => {}, delete: async (id) => { deleted.push(id); } };
  const repo = () => new WorkspaceRepository(disk.store, session.store, locks, media, () => `p-${++n}`);
  const first = await repo().initialize();
  first.binding!.setItem('orbitlab.mission', 'healthy work');
  const broken = await first.create('Broken'), future = await first.create('Future'); first.close(); await tick();
  const brokenKey = profileStorageKey(broken.id), futureKey = profileStorageKey(future.id);
  disk.values.set(brokenKey, disk.values.get(brokenKey)!.slice(0, -12));
  const newer = JSON.parse(disk.values.get(futureKey)!); newer.version = 99; newer.extra = { from: 'a newer app' };
  disk.values.set(futureKey, JSON.stringify(newer));
  session.values.set(PROFILE_SELECTED_KEY, selected);
  const bytes = new Map([[brokenKey, disk.values.get(brokenKey)!], [futureKey, disk.values.get(futureKey)!]]);
  const unchanged = () => { for (const [key, value] of bytes) expect(disk.values.get(key)).toBe(value); };
  return { disk, session, repo, broken, future, brokenKey, futureKey, unchanged, deleted };
}

beforeEach(() => { calls.downloads.length = 0; calls.media.length = 0; });

describe('R1.6 PR2: one unreadable or newer profile no longer hides the others (M-PLATFORM-004)', () => {
  it('listWithStatus() returns every catalogue row with its state; list() keeps only the readable ones', async () => {
    const env = await threeProfiles(''), r = await env.repo().initialize();
    expect(r.status).toBe('chooser');
    expect(r.listWithStatus().map((row) => [row.id, row.state, row.name])).toEqual([
      [LEGACY_PROFILE_ID, 'ok', 'Learner 1'], [env.broken.id, 'unreadable', undefined], [env.future.id, 'newer', 'Future'],
    ]);
    expect(r.list().map((p) => p.id)).toEqual([LEGACY_PROFILE_ID]);
    env.unchanged(); r.close();
  });
  it('exportAll() exports the healthy profiles and does not fail on the others; raw bytes stay exportable', async () => {
    const env = await threeProfiles(LEGACY_PROFILE_ID), r = await env.repo().initialize();
    expect(r.status).toBe('durable');
    const archive = r.exportAll();
    expect(archive.profiles.map((p) => p.id)).toEqual([LEGACY_PROFILE_ID]);
    expect(archive.profiles[0].values['orbitlab.mission']).toBe('healthy work');
    expect(r.rawProfile(env.broken.id)).toBe(env.disk.values.get(env.brokenKey));
    expect(r.rawProfile(env.future.id)).toBe(env.disk.values.get(env.futureKey));
    env.unchanged(); r.close();
  });
  it('the chooser snapshot shows the healthy row plus the unreadable rows with their state, without writing', async () => {
    const env = await threeProfiles(''), r = await env.repo().initialize();
    const before = new Map(env.disk.values), host = createProfileMenuHost(r, () => {}, () => {});
    const snapshot = host.snapshot();
    expect(snapshot.profiles.map((p) => p.id)).toEqual([LEGACY_PROFILE_ID]);
    expect(snapshot.unreadable?.map((row) => [row.id, row.state, row.name])).toEqual([
      [env.broken.id, 'unreadable', undefined], [env.future.id, 'newer', 'Future'],
    ]);
    expect(new Map(env.disk.values)).toEqual(before); r.close();
  });
  it('the menu exports all healthy profiles, reports the skipped ones, saves raw copies, and audio export does not throw', async () => {
    const env = await threeProfiles(LEGACY_PROFILE_ID), r = await env.repo().initialize(), host = createProfileMenuHost(r, () => {}, () => {});
    expect(await host.exportAll!()).toEqual({ skipped: 2, exported: true });
    expect(JSON.parse(await calls.downloads[0].blob.text()).profiles.map((p: { id: string }) => p.id)).toEqual([LEGACY_PROFILE_ID]);
    await host.exportRaw!(env.broken.id);
    expect(await calls.downloads[1].blob.text()).toBe(env.disk.values.get(env.brokenKey));
    await expect(host.exportMedia!()).resolves.toBeUndefined();
    await expect(host.exportMedia!(env.future.id)).resolves.toBeUndefined();
    expect(calls.media).toEqual([`${LEGACY_PROFILE_ID}:Learner 1`, `${env.future.id}:Future`]);
    env.unchanged(); r.close();
  });
  it('an unreadable row is deleted only by an explicit delete(), with its media; the cap still counts it', async () => {
    const env = await threeProfiles(LEGACY_PROFILE_ID), r = await env.repo().initialize();
    for (const id of [env.broken.id, env.future.id]) {
      await expect(r.select(id)).rejects.toThrow(); await expect(r.rename(id, 'x')).rejects.toThrow();
    }
    env.unchanged();
    const catalogue = JSON.parse(env.disk.values.get(PROFILE_CATALOG_KEY)!);
    for (let i = Object.keys(catalogue.profiles).length; i < PROFILE_MAX_COUNT; i++) catalogue.profiles[`fill-${i}`] = {};
    env.disk.values.set(PROFILE_CATALOG_KEY, JSON.stringify(catalogue));
    await expect(r.create('One too many')).rejects.toThrow('limit');
    for (let i = 3; i < PROFILE_MAX_COUNT; i++) delete catalogue.profiles[`fill-${i}`];
    env.disk.values.set(PROFILE_CATALOG_KEY, JSON.stringify(catalogue));
    await r.delete(env.broken.id);
    expect(env.disk.values.has(env.brokenKey)).toBe(false); expect(env.deleted).toEqual([env.broken.id]);
    expect(r.listWithStatus().map((row) => row.id)).toEqual([LEGACY_PROFILE_ID, env.future.id]);
    expect(r.binding!.getItem('orbitlab.mission')).toBe('healthy work'); r.close();
  });
  it('review: audio export reads media from the chooser and fails only in visit-only mode', async () => {
    const env = await threeProfiles(''), r = await env.repo().initialize(), host = createProfileMenuHost(r, () => {}, () => {});
    expect(r.status).toBe('chooser');
    await expect(host.exportMedia!(LEGACY_PROFILE_ID)).resolves.toBeUndefined();
    await expect(host.exportMedia!(env.broken.id)).resolves.toBeUndefined();
    expect(calls.media).toEqual([`${LEGACY_PROFILE_ID}:Learner 1`, `${env.broken.id}:${env.broken.id}`]);
    env.unchanged(); r.close();
    const visit = await new WorkspaceRepository(env.disk.store, env.session.store).initialize();
    expect(visit.status).toBe('ephemeral');
    await expect(createProfileMenuHost(visit, () => {}, () => {}).exportMedia!(visit.binding!.profileId)).rejects.toThrow('locked');
    expect(calls.media).toHaveLength(2); env.unchanged();
  });
  it('review: Export all with no readable profile downloads nothing and reports it', async () => {
    const env = await threeProfiles(''), legacyKey = profileStorageKey(LEGACY_PROFILE_ID);
    env.disk.values.set(legacyKey, env.disk.values.get(legacyKey)!.slice(0, -5));
    const r = await env.repo().initialize(), host = createProfileMenuHost(r, () => {}, () => {});
    expect(await host.exportAll!()).toEqual({ skipped: 3, exported: false });
    expect(calls.downloads).toHaveLength(0); env.unchanged(); r.close();
  });
  it('review: a catalogue row whose record is gone is its own state, has no raw copy, and can be deleted', async () => {
    const env = await threeProfiles(LEGACY_PROFILE_ID);
    env.disk.values.delete(env.brokenKey);
    const r = await env.repo().initialize(), host = createProfileMenuHost(r, () => {}, () => {});
    expect(r.profileRow(env.broken.id)).toEqual({ id: env.broken.id, state: 'missing' });
    expect(host.snapshot().unreadable?.map((row) => row.state)).toEqual(['missing', 'newer']);
    expect(() => r.rawProfile(env.broken.id)).toThrow('missing');
    await r.delete(env.broken.id);
    expect(r.listWithStatus().map((row) => row.id)).toEqual([LEGACY_PROFILE_ID, env.future.id]); r.close();
  });
});
