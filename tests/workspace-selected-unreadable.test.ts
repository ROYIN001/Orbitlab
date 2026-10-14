import { describe, expect, it } from 'vitest';
import type { RawStorage } from '../src/workspace/registry';
import { LEGACY_PROFILE_ID, PROFILE_CATALOG_KEY, PROFILE_SELECTED_KEY, WorkspaceRepository, profileStorageKey,
  type WorkspaceLocks } from '../src/workspace/repository';

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
type Damage = 'unreadable' | 'newer' | 'missing';
const damage: Record<Damage, (raw: string) => string | null> = {
  unreadable: (raw) => raw.slice(0, -12),
  newer: (raw) => JSON.stringify({ ...JSON.parse(raw), version: 99, extra: { from: 'a newer app' } }),
  missing: () => null,
};

/** The device's learners, the selected one damaged; `only` keeps the first (legacy) learner as the device's only one. */
async function selectedDamaged(state: Damage, only: boolean) {
  const disk = memory(), session = memory(), locks = new Locks(); let n = 0;
  const repo = () => new WorkspaceRepository(disk.store, session.store, locks, undefined, () => `p-${++n}`);
  const first = await repo().initialize();
  first.binding!.setItem('orbitlab.mission', 'healthy work');
  const id = only ? LEGACY_PROFILE_ID : (await first.create('Other')).id;
  first.close(); await tick();
  const key = profileStorageKey(id), next = damage[state](disk.values.get(key)!);
  if (next === null) disk.values.delete(key); else disk.values.set(key, next);
  session.values.set(PROFILE_SELECTED_KEY, id);
  return { disk, session, locks, repo, id };
}

describe('R1.6-FU-SEL: an unreadable, newer or missing selected learner is kept, and the visit opens on a readable one', () => {
  for (const state of ['unreadable', 'newer', 'missing'] as const) {
    it(`${state}: the healthy learner opens, the damaged row is listed with its state and its bytes are kept`, async () => {
      const env = await selectedDamaged(state, false), before = new Map(env.disk.values);
      const r = await env.repo().initialize();
      // Owner, 2026-10-14: the site is usable without choosing; the damaged learner waits in Learner profiles.
      expect(r.status).toBe('durable'); expect(r.binding!.profileId).toBe(LEGACY_PROFILE_ID);
      expect(r.binding!.getItem('orbitlab.mission')).toBe('healthy work');
      expect(r.notices).toContain(state === 'unreadable' ? 'invalid' : state);
      expect(r.listWithStatus().map((row) => [row.id, row.state])).toEqual([[LEGACY_PROFILE_ID, 'ok'], [env.id, state]]);
      expect([...env.locks.held]).toEqual([`orbitlab-profile-owner-v1:${LEGACY_PROFILE_ID}`]);
      expect(new Map(env.disk.values)).toEqual(before);
      expect(env.session.values.get(PROFILE_SELECTED_KEY)).toBe(LEGACY_PROFILE_ID);
      // The row can be backed up byte for byte (not for a missing record).
      if (state !== 'missing') expect(r.rawProfile(env.id)).toBe(before.get(profileStorageKey(env.id)));
      r.close(); await tick(); expect(env.locks.held.size).toBe(0);
      const reload = await env.repo().initialize();
      expect(reload.status).toBe('durable'); expect(reload.binding!.profileId).toBe(LEGACY_PROFILE_ID);
      expect(new Map(env.disk.values)).toEqual(before); reload.close();
    });
  }
  it('review: other errors at the read step still open visit-only, and release the lock', async () => {
    const env = await selectedDamaged('unreadable', false), key = profileStorageKey(env.id), getItem = env.disk.store.getItem;
    env.disk.values.set(key, JSON.stringify({ ...JSON.parse(env.disk.values.get(profileStorageKey(LEGACY_PROFILE_ID))!), id: env.id }));
    env.disk.store.getItem = (k) => { if (k === key) throw new DOMException('denied', 'SecurityError'); return getItem(k); };
    const r = await env.repo().initialize();
    expect(r.status).toBe('ephemeral'); expect(r.notices).toContain('storage');
    await tick(); expect(env.locks.held.size).toBe(0); r.close();
    // The catalogue turns newer while the owner lock is awaited: visit-only, not an empty chooser.
    env.disk.store.getItem = getItem; env.disk.values.set(key, 'cut');
    const locks = env.locks as unknown as { request: Locks['request'] }, request = locks.request.bind(env.locks);
    locks.request = async (name, options, run) => {
      if (name.startsWith('orbitlab-profile-owner-v1:')) env.disk.values.set(PROFILE_CATALOG_KEY, '{"version":2,"profiles":{}}');
      return request(name, options, run);
    };
    const raced = await env.repo().initialize();
    expect(raced.status).toBe('ephemeral'); expect(raced.notices).toContain('newer'); raced.close();
  });
  it('the device\'s only learner, unreadable, in a new tab: a new learner opens; the unreadable row is kept and can be deleted', async () => {
    const env = await selectedDamaged('unreadable', true), key = profileStorageKey(LEGACY_PROFILE_ID), bytes = env.disk.values.get(key);
    env.session.values.clear();
    const r = await env.repo().initialize();
    expect(r.status).toBe('durable'); expect(r.binding!.profileId).toBe('p-1');
    expect(r.binding!.getItem('orbitlab.mission')).toBeNull();
    expect(r.listWithStatus().map((row) => [row.id, row.state, row.name])).toEqual([[LEGACY_PROFILE_ID, 'unreadable', undefined], ['p-1', 'ok', 'Learner 1']]);
    expect(env.disk.values.get(key)).toBe(bytes); r.close(); await tick();
    // The next start opens the same new learner; no second one is made.
    const reload = await env.repo().initialize(); expect(reload.binding!.profileId).toBe('p-1');
    await reload.delete(LEGACY_PROFILE_ID);
    expect(env.disk.values.has(key)).toBe(false); expect(reload.listWithStatus().map((row) => row.id)).toEqual(['p-1']); reload.close();
  });
});
