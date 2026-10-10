import { describe, expect, it } from 'vitest';
import { emptyProgress, loadProgress, saveProgress } from '../src/lessons/progress';
import { BUILTIN_LESSONS } from '../src/lessons/catalog';
import { BUILTIN_QUESTIONS } from '../src/lessons/assessment/bank';
import { WORKSPACE_KEYS, type RawStorage } from '../src/workspace/registry';
import { LEGACY_PROFILE_ID, PROFILE_CATALOG_KEY, PROFILE_SELECTED_KEY, WorkspaceRepository,
  parseWorkspaceArchive, profileStorageKey, type WorkspaceLocks, type WorkspaceMedia } from '../src/workspace/repository';
function memory() {
  const values = new Map<string, string>();
  let denied: string | null = null;
  const store: RawStorage = {
    get length() { return values.size; }, key: (i) => [...values.keys()][i] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => { if (denied === k) throw new Error('Quota exceeded'); values.set(k, v); },
    removeItem: (k) => { values.delete(k); },
  };
  return { values, store, deny: (key: string | null) => { denied = key; } };
}
class Locks implements WorkspaceLocks {
  private held = new Set<string>();
  private waiting = new Map<string, (() => void)[]>();
  async request<T>(name: string, options: { ifAvailable?: boolean }, run: (lock: unknown | null) => Promise<T>): Promise<T> {
    if (options.ifAvailable && this.held.has(name)) return run(null);
    if (this.held.has(name)) await new Promise<void>((resolve) => { const q = this.waiting.get(name) ?? []; q.push(resolve); this.waiting.set(name, q); });
    this.held.add(name);
    try { return await run({ name }); }
    finally { this.held.delete(name); this.waiting.get(name)?.shift()?.(); }
  }
}
function setup() {
  const disk = memory(), session = memory(), locks = new Locks(); let n = 0;
  const repo = (media?: WorkspaceMedia) => new WorkspaceRepository(disk.store, session.store, locks, media, () => `p-${++n}`);
  return { disk, session, locks, repo };
}
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };

describe('profile-owned browser workspace', () => {
  it('migrates the complete allowlist and recovery bytes without normalizing malformed/newer data or touching device keys', async () => {
    const env = setup();
    for (const [i, key] of WORKSPACE_KEYS.entries()) env.disk.values.set(key, key === 'orbitlab.student' ? 'Same name' : `raw-${i}`);
    env.disk.values.set('orbitlab.lessons', '{"version":99,"future":true}');
    env.disk.values.set('orbitlab.lessons.recovery.2', '{bad bytes');
    env.disk.values.set('orbitlab.dataset.cache', 'shared'); env.disk.values.set('auth.token', 'private');
    const r = await env.repo().initialize(), binding = r.binding!;
    expect(r.status).toBe('durable'); expect(r.active()?.name).toBe('Same name');
    for (const [i, key] of WORKSPACE_KEYS.entries()) expect(binding.getItem(key)).toBe(key === 'orbitlab.lessons' ? '{"version":99,"future":true}' : key === 'orbitlab.student' ? 'Same name' : `raw-${i}`);
    expect(binding.getItem('orbitlab.lessons.recovery.2')).toBe('{bad bytes');
    expect(env.disk.values.get('orbitlab.dataset.cache')).toBe('shared'); expect(env.disk.values.get('auth.token')).toBe('private');
    expect(env.disk.values.has('orbitlab.mission')).toBe(false);
    expect(() => binding.removeItem('orbitlab.dataset.cache')).toThrow();
    r.close();
  });
  it('recovers an interrupted migration marker write with original bytes intact and no duplicate profile', async () => {
    const env = setup(); env.disk.values.set('orbitlab.build.explore.v1', '{partial: invalid}'); env.disk.deny(PROFILE_CATALOG_KEY);
    const interrupted = await env.repo().initialize();
    expect(interrupted.status).toBe('ephemeral'); expect(env.disk.values.get('orbitlab.build.explore.v1')).toBe('{partial: invalid}');
    expect(env.disk.values.has(profileStorageKey(LEGACY_PROFILE_ID))).toBe(true);
    env.disk.deny(null); interrupted.close();
    const retry = await env.repo().initialize();
    expect(retry.list()).toHaveLength(1); expect(retry.binding!.getItem('orbitlab.build.explore.v1')).toBe('{partial: invalid}');
    retry.close();
  });
  it('retains both snapshots when a legacy app changes source bytes during a migration interruption', async () => {
    const env = setup(); env.disk.values.set('orbitlab.mission', 'old snapshot'); env.disk.deny(PROFILE_CATALOG_KEY);
    const interrupted = await env.repo().initialize(); interrupted.close(); env.disk.deny(null);
    env.disk.values.set('orbitlab.mission', 'new snapshot');
    const retry = await env.repo().initialize();
    expect(retry.list()).toHaveLength(2); expect(retry.read(LEGACY_PROFILE_ID).values['orbitlab.mission']).toBe('new snapshot');
    expect(retry.read('legacy-recovery-v1').values['orbitlab.mission']).toBe('old snapshot'); expect(retry.status).toBe('chooser'); retry.close();
  });
  it('isolates all work for duplicate names and fences late saves when switching A → B → A', async () => {
    const env = setup(), a = await env.repo().initialize();
    const old = a.binding!;
    for (const key of WORKSPACE_KEYS) old.setItem(key, `A:${key}`);
    const b = await a.create(a.active()!.name);
    let flushed = false; a.registerFlush(() => { flushed = true; old.setItem('orbitlab.author.draft', 'flushed-A'); });
    await a.select(b.id); expect(flushed).toBe(true); expect(() => old.setItem('orbitlab.mission', 'late-A')).toThrow();
    await tick(); const second = await env.repo().initialize();
    expect(second.active()?.id).toBe(b.id); for (const key of WORKSPACE_KEYS) expect(second.binding!.getItem(key)).toBeNull();
    second.binding!.setItem('orbitlab.mission', 'B mission'); await second.select(LEGACY_PROFILE_ID); await tick();
    const firstAgain = await env.repo().initialize();
    expect(firstAgain.binding!.getItem('orbitlab.mission')).toBe('A:orbitlab.mission');
    expect(firstAgain.binding!.getItem('orbitlab.author.draft')).toBe('flushed-A'); firstAgain.close();
  });
  it('makes a second tab read-only under one owner lock and lets it choose a different owner without flushing the locked draft', async () => {
    const env = setup(), owner = await env.repo().initialize(), other = await env.repo().initialize();
    expect(other.status).toBe('locked'); expect(() => other.binding!.setItem('orbitlab.mission', 'racy')).toThrow();
    other.registerFlush(() => { throw new Error('must not flush another owner'); });
    const created = await other.create('Other'); await other.select(created.id); await tick();
    const unlocked = await env.repo().initialize(); expect(unlocked.status).toBe('durable');
    expect(owner.binding!.getItem('orbitlab.mission')).toBeNull(); unlocked.close(); owner.close();
  });
  it('uses a visit-only copy when Web Locks are absent, with no mutation of durable originals', async () => {
    const disk = memory(), session = memory(); disk.values.set('orbitlab.mission', 'original');
    const r = await new WorkspaceRepository(disk.store, session.store).initialize();
    expect(r.status).toBe('ephemeral'); r.binding!.setItem('orbitlab.mission', 'visit');
    expect(r.binding!.getItem('orbitlab.mission')).toBe('visit'); expect(disk.values.get('orbitlab.mission')).toBe('original');
    expect(disk.values.has(PROFILE_CATALOG_KEY)).toBe(false); r.close();
  });
  it('resets one lesson or exams while preserving authored teaching content and other personal work, fencing the old epoch', async () => {
    const env = setup(), r = await env.repo().initialize(), p = emptyProgress();
    p.lessons = { one: { attempts: 2, hintsShown: 3, passed: true, reveals: 1, revealed: { answer: [42] } }, two: { attempts: 1, hintsShown: 0, passed: false } };
    p.customLessons = [{ ...structuredClone(BUILTIN_LESSONS[0]), id: 'my-lesson' }];
    p.customQuestions = [{ ...structuredClone(BUILTIN_QUESTIONS[0]), id: 'my-question', custom: true }];
    p.assessments = [{ kind: 'pre', seed: 1, startedAt: '2026-10-03T00:00:00Z', questions: [], answers: [] }];
    const binding = r.binding!; saveProgress(p, binding); binding.setItem('orbitlab.author.draft', 'authored draft'); binding.setItem('orbitlab.mission', 'mission');
    binding.setItem('orbitlab.lessons.recovery', JSON.stringify(p)); await r.reset('learning', 'one');
    expect(() => saveProgress(p, binding)).not.toThrow(); expect(saveProgress(p, binding)).toBe(false);
    r.close(); await tick(); const reopened = await env.repo().initialize(), after = loadProgress(reopened.binding!);
    expect(after.lessons.one).toBeUndefined(); expect(after.lessons.two.attempts).toBe(1); expect(after.assessments).toHaveLength(1);
    expect(after.customLessons).toEqual(p.customLessons); expect(after.customQuestions).toEqual(p.customQuestions);
    expect(reopened.binding!.getItem('orbitlab.author.draft')).toBe('authored draft'); expect(reopened.binding!.getItem('orbitlab.mission')).toBe('mission');
    await reopened.reset('exams'); reopened.close(); await tick(); const last = await env.repo().initialize();
    expect(loadProgress(last.binding!).assessments).toEqual([]); expect(loadProgress(last.binding!).lessons.two.attempts).toBe(1); last.close();
  });
  it('leaves reset source and owner epoch untouched when quota blocks the atomic record commit', async () => {
    const env = setup(), r = await env.repo().initialize(), p = emptyProgress();
    p.lessons.one = { attempts: 1, passed: false, hintsShown: 1 }; saveProgress(p, r.binding!);
    const before = env.disk.values.get(profileStorageKey(LEGACY_PROFILE_ID)); env.disk.deny(profileStorageKey(LEGACY_PROFILE_ID));
    await expect(r.reset('all')).rejects.toThrow(); expect(env.disk.values.get(profileStorageKey(LEGACY_PROFILE_ID))).toBe(before);
    expect(r.binding!.valid).toBe(true); expect(loadProgress(r.binding!).lessons.one.attempts).toBe(1); r.close();
  });
  it('refuses reset with a pending project rollback or malformed progress, preserving recovery bytes', async () => {
    const env = setup(), r = await env.repo().initialize(); r.binding!.setItem('orbitlab.lessons', '{broken');
    await expect(r.reset('all')).rejects.toThrow(); expect(r.binding!.getItem('orbitlab.lessons')).toBe('{broken');
    r.binding!.setItem('orbitlab.project-import.recovery.v1', '{pending}'); await expect(r.reset('all')).rejects.toThrow(); r.close();
  });
  it('round-trips raw drafts/preferences and all owner metadata, defaults imports to Keep Existing, and preserves the 8 MB limit', async () => {
    const env = setup(), r = await env.repo().initialize();
    r.binding!.setItem('orbitlab.build.satellite.v1', '{"v":99,"future":"preserved"}'); r.binding!.setItem('orbitlab.notation', 'gost');
    const exported = r.exportProfile(); expect(exported.media.included).toBe(false);
    const imported = await r.importArchive(JSON.stringify(exported), { name: 'duplicate' });
    expect(r.read(imported.id).values).toEqual(r.read(LEGACY_PROFILE_ID).values);
    r.binding!.setItem('orbitlab.notation', 'iso');
    await r.importArchive(JSON.stringify(exported), { targetId: LEGACY_PROFILE_ID });
    expect(r.read(LEGACY_PROFILE_ID).values['orbitlab.notation']).toBe('iso');
    expect(() => r.binding!.setItem('orbitlab.notation', 'stale')).toThrow();
    await expect(parseWorkspaceArchive(' '.repeat(8_000_001))).rejects.toMatchObject({ code: 'oversize' }); r.close();
  });
  it('preserves invalid/newer primary records and external rollback journals as inert recovery bytes', async () => {
    const env = setup(), r = await env.repo().initialize(), source = r.exportProfile();
    source.profiles[0].values['orbitlab.lessons'] = '{"version":99,"future":"raw"}';
    source.profiles[0].values['orbitlab.project-import.recovery.v1'] = '{forged-journal}';
    const imported = await r.importArchive(JSON.stringify(source));
    const values = r.read(imported.id).values;
    expect(values['orbitlab.lessons']).toBeUndefined(); expect(values['orbitlab.project-import.recovery.v1']).toBeUndefined();
    const recovery = JSON.parse(values['orbitlab.import.quarantine.v1']).entries;
    expect(recovery).toContainEqual({ key: 'orbitlab.lessons', raw: '{"version":99,"future":"raw"}' });
    expect(recovery).toContainEqual({ key: 'orbitlab.project-import.recovery.v1', raw: '{forged-journal}' });
    expect(r.notices).toContain('quarantined-import-data'); r.close();
  });
  it('does not publish any imported owner if quota interrupts a multi-profile catalogue commit', async () => {
    const env = setup(), r = await env.repo().initialize(); await r.create('Second'); const archive = r.exportAll();
    const before = [...env.disk.values.entries()]; env.disk.deny(PROFILE_CATALOG_KEY);
    await expect(r.importProfiles(JSON.stringify(archive))).rejects.toThrow();
    expect([...env.disk.values.entries()]).toEqual(before); env.disk.deny(null); expect(r.list()).toHaveLength(2); r.close();
  });
  it('restores a multi-profile archive only as fresh owners with duplicate names kept distinct', async () => {
    const env = setup(), r = await env.repo().initialize(); const b = await r.create('Learner 1');
    const all = r.exportAll(); expect(all.profiles).toHaveLength(2);
    const result = await r.importProfiles(JSON.stringify(all));
    expect(result).toHaveLength(2); expect(result.map((p) => p.id)).not.toContain(b.id); expect(r.list()).toHaveLength(4); r.close();
  });
  it('continues an interrupted media/profile deletion from its tombstone without silently recreating a last owner', async () => {
    const env = setup(); let denied = true, deleted = 0;
    const media: WorkspaceMedia = { migrate: async () => {}, delete: async () => { if (denied) throw new Error('media denied'); deleted++; } };
    const r = await env.repo(media).initialize(); r.binding!.setItem('orbitlab.mission', 'deleted work');
    await expect(r.delete(LEGACY_PROFILE_ID)).rejects.toThrow();
    expect(JSON.parse(env.disk.values.get(PROFILE_CATALOG_KEY)!).profiles[LEGACY_PROFILE_ID].deleting).toBe(true); r.close(); await tick();
    denied = false; const reopened = await env.repo(media).initialize();
    expect(deleted).toBe(1); expect(reopened.status).toBe('chooser'); expect(reopened.list()).toEqual([]);
    expect(env.disk.values.has(profileStorageKey(LEGACY_PROFILE_ID))).toBe(false);
    expect(env.session.values.get(PROFILE_SELECTED_KEY)).toBe(''); reopened.close();
  });
});

describe('R1.6 PR1: start-up error paths keep the lock contract and durable profiles (M-PLATFORM-001/002)', () => {
  const tombstoned = (env: ReturnType<typeof setup>) => JSON.parse(env.disk.values.get(PROFILE_CATALOG_KEY)!).profiles[LEGACY_PROFILE_ID]?.deleting;
  it('M-PLATFORM-001: releases the owner lock when the selected record is truncated, keeping its bytes', async () => {
    const env = setup(), first = await env.repo().initialize(), other = await first.create('Other'); first.close(); await tick();
    const key = profileStorageKey(other.id), original = env.disk.values.get(key)!, truncated = original.slice(0, -12);
    env.disk.values.set(key, truncated); env.session.values.set(PROFILE_SELECTED_KEY, other.id);
    const broken = await env.repo().initialize();
    // R1.6-FU-SEL (owner, decision card q15 option A, 2026-10-09): the chooser, not visit-only, so the row's copy and delete are reachable.
    expect(broken.status).toBe('chooser'); expect(broken.notices).toContain('invalid');
    expect(broken.binding).toBeNull(); expect(env.disk.values.get(key)).toBe(truncated);
    // The record is restored while the first tab is still open: another tab must own it, not stay read-only.
    env.disk.values.set(key, original); env.session.values.set(PROFILE_SELECTED_KEY, other.id);
    const second = await env.repo().initialize();
    expect(second.status).toBe('durable'); second.binding!.setItem('orbitlab.mission', 'saved'); second.close(); broken.close();
  });
  it('M-PLATFORM-002: a rejecting tombstone retry keeps the tombstone and still opens a healthy profile durably at every start', async () => {
    const env = setup(); let calls = 0;
    const media: WorkspaceMedia = { migrate: async () => {}, delete: async () => { calls++; throw new Error('media denied'); } };
    const r = await env.repo(media).initialize(), healthy = await r.create('Healthy');
    r.binding!.setItem('orbitlab.mission', 'doomed'); await expect(r.delete(LEGACY_PROFILE_ID)).rejects.toThrow(); await tick();
    const recordBytes = env.disk.values.get(profileStorageKey(LEGACY_PROFILE_ID));
    env.session.values.set(PROFILE_SELECTED_KEY, healthy.id);
    for (const run of [1, 2]) {
      const next = await env.repo(media).initialize();
      expect(next.status).toBe('durable'); expect(next.active()?.id).toBe(healthy.id);
      expect(tombstoned(env)).toBe(true); expect(env.disk.values.get(profileStorageKey(LEGACY_PROFILE_ID))).toBe(recordBytes);
      expect(next.notices.length).toBeGreaterThan(0);
      next.binding!.setItem('orbitlab.mission', `saved ${run}`); next.close(); await tick();
    }
    expect(calls).toBe(3); expect(JSON.parse(env.disk.values.get(profileStorageKey(healthy.id))!).values['orbitlab.mission']).toBe('saved 2');
  });
  it('M-PLATFORM-002: an unreadable legacy record does not send a healthy selected profile into visit-only mode', async () => {
    const env = setup(), r = await env.repo().initialize(), healthy = await r.create('Healthy'); r.close(); await tick();
    const key = profileStorageKey(LEGACY_PROFILE_ID), truncated = env.disk.values.get(key)!.slice(0, -12);
    env.disk.values.set(key, truncated); env.session.values.set(PROFILE_SELECTED_KEY, healthy.id);
    const next = await env.repo().initialize();
    expect(next.status).toBe('durable'); expect(next.active()?.id).toBe(healthy.id); expect(next.notices.length).toBeGreaterThan(0);
    expect(env.disk.values.get(key)).toBe(truncated); next.close();
  });
});
