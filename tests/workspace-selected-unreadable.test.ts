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

describe('R1.6-FU-SEL: an unreadable, newer or missing selected learner opens the chooser, not visit-only', () => {
  for (const state of ['unreadable', 'newer', 'missing'] as const) {
    it(`${state}: the chooser lists the row with its state, keeps its bytes, holds no lock, and stays the chooser on reload`, async () => {
      const env = await selectedDamaged(state, false), before = new Map(env.disk.values);
      const r = await env.repo().initialize();
      expect(r.status).toBe('chooser'); expect(r.binding).toBeNull();
      expect(r.notices).toContain(state === 'unreadable' ? 'invalid' : state);
      expect(r.listWithStatus().map((row) => [row.id, row.state])).toEqual([[LEGACY_PROFILE_ID, 'ok'], [env.id, state]]);
      await tick(); expect(env.locks.held.size).toBe(0);
      expect(new Map(env.disk.values)).toEqual(before);
      expect(env.session.values.get(PROFILE_SELECTED_KEY)).toBe('');
      const reload = await env.repo().initialize();
      expect(reload.status).toBe('chooser'); expect(new Map(env.disk.values)).toEqual(before);
      // From the chooser the row can be backed up byte for byte (not for a missing record) and the healthy learner opened.
      if (state !== 'missing') expect(reload.rawProfile(env.id)).toBe(before.get(profileStorageKey(env.id)));
      await reload.select(LEGACY_PROFILE_ID); r.close(); reload.close(); await tick();
      const healthy = await env.repo().initialize();
      expect(healthy.status).toBe('durable'); expect(healthy.binding!.getItem('orbitlab.mission')).toBe('healthy work'); healthy.close();
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
  it('the device\'s only learner, unreadable, in a new tab: the chooser with its row, which can be deleted', async () => {
    const env = await selectedDamaged('unreadable', true), key = profileStorageKey(LEGACY_PROFILE_ID), bytes = env.disk.values.get(key);
    env.session.values.clear();
    const r = await env.repo().initialize();
    expect(r.status).toBe('chooser');
    expect(r.listWithStatus()).toEqual([{ id: LEGACY_PROFILE_ID, state: 'unreadable', name: undefined }]);
    expect(env.disk.values.get(key)).toBe(bytes);
    const reload = await env.repo().initialize(); expect(reload.status).toBe('chooser'); r.close();
    await reload.delete(LEGACY_PROFILE_ID);
    expect(env.disk.values.has(key)).toBe(false); expect(reload.listWithStatus()).toEqual([]); reload.close();
  });
});
