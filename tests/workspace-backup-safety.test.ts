import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RawStorage } from '../src/workspace/registry';
import { LEGACY_PROFILE_ID, PROFILE_CATALOG_KEY, WORKSPACE_MAX_BYTES, WorkspaceRepository, parseWorkspaceArchive,
  profileStorageKey, type WorkspaceLocks, type WorkspaceMedia } from '../src/workspace/repository';
import { createProfileMenuHost } from '../src/ui/profiles/profile-menu';
// What origin/main (095806a) downloaded for normalWorkspace() below, read as text (`?raw`: the project has no Node types).
import mainProfileBytes from './fixtures/workspace-export/main-095806a-profile.json?raw';
import mainAllBytes from './fixtures/workspace-export/main-095806a-all.json?raw';

const calls = vi.hoisted(() => ({ downloads: [] as { blob: Blob; filename: string }[] }));
vi.mock('../src/ui/download', () => ({ downloadBlob: (blob: Blob, filename: string) => { calls.downloads.push({ blob, filename }); } }));

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
const utf8 = (text: string): number => new TextEncoder().encode(text).byteLength;

function setup() {
  const disk = memory(), session = memory(), locks = new Locks(), deleted: string[] = []; let n = 0;
  const media: WorkspaceMedia = { migrate: async () => {}, delete: async (id) => { deleted.push(id); } };
  const repo = () => new WorkspaceRepository(disk.store, session.store, locks, media, () => `p-${++n}`);
  return { disk, session, media, deleted, repo };
}

/**
 * Fills `key` of profile `id` with Thai text (3 UTF-8 bytes per character, the realistic way a backup nears 8 MB
 * while localStorage still holds it) so that the COMPACT export of `exportOf()` is exactly `target` bytes.
 */
function fillCompactTo(r: WorkspaceRepository, id: string, key: string, target: number, exportOf: () => unknown): void {
  const set = (value: string) => r.mutate(id, (record) => { record.values[key] = value; });
  set('');
  // The filler needs no JSON escaping, so the compact export grows by exactly its UTF-8 bytes.
  const missing = target - utf8(JSON.stringify(exportOf()));
  set('ก'.repeat(Math.floor(missing / 3)) + 'x'.repeat(missing % 3));
}

beforeEach(() => {
  calls.downloads.length = 0;
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-06T08:30:00.000Z'));
});
afterEach(() => { vi.useRealTimers(); });

describe('R1.6 PR6: every backup the app saves can be restored (M-PLATFORM-008)', () => {
  it('Export (one learner): compact JSON under 8 MB but indented over it downloads a file that import accepts', async () => {
    const env = setup(), r = await env.repo().initialize(), host = createProfileMenuHost(r, () => {}, () => {});
    fillCompactTo(r, LEGACY_PROFILE_ID, 'orbitlab.mission', WORKSPACE_MAX_BYTES - 8, () => r.exportProfile());
    expect(utf8(JSON.stringify(r.exportProfile()))).toBe(WORKSPACE_MAX_BYTES - 8);
    expect(utf8(JSON.stringify(r.exportProfile(), null, 2) + '\n')).toBeGreaterThan(WORKSPACE_MAX_BYTES);
    await host.exportBackup(LEGACY_PROFILE_ID);
    expect(calls.downloads).toHaveLength(1);
    const { blob, filename } = calls.downloads[0], text = await blob.text();
    expect(filename).toBe('Orbitlab-2026-10-06.orbitlab-workspace.json');
    // The menu's import refuses a file over WORKSPACE_MAX_BYTES before reading it (profile-menu archiveText).
    expect(blob.size).toBeLessThanOrEqual(WORKSPACE_MAX_BYTES);
    const restored = await parseWorkspaceArchive(text);
    expect(restored.profiles[0].values).toEqual(r.read(LEGACY_PROFILE_ID).values);
    expect(text).toBe(JSON.stringify(JSON.parse(text)));
    r.close();
  });
  it('Export all: two learners whose compact backup fits but indented does not download a restorable file', async () => {
    const env = setup(), r = await env.repo().initialize(), host = createProfileMenuHost(r, () => {}, () => {});
    const second = await r.create('ผู้เรียนคนที่สอง');
    r.mutate(second.id, (record) => { record.values['orbitlab.lessons'] = 'ข'.repeat(1_000_000); });
    fillCompactTo(r, LEGACY_PROFILE_ID, 'orbitlab.designs', WORKSPACE_MAX_BYTES, () => r.exportAll());
    expect(utf8(JSON.stringify(r.exportAll()))).toBe(WORKSPACE_MAX_BYTES);
    await expect(host.exportAll!()).resolves.toEqual({ skipped: 0, exported: true });
    const text = await calls.downloads[0].blob.text();
    expect(calls.downloads[0].blob.size).toBeLessThanOrEqual(WORKSPACE_MAX_BYTES);
    const restored = await parseWorkspaceArchive(text);
    expect(restored.profiles.map((p) => p.name)).toEqual(['Learner 1', 'ผู้เรียนคนที่สอง']);
    expect(restored.profiles[1].values['orbitlab.lessons']).toBe('ข'.repeat(1_000_000));
    r.close();
  });
  it('a backup that does not fit even compact is still refused with oversize and nothing is downloaded', async () => {
    const env = setup(), r = await env.repo().initialize(), host = createProfileMenuHost(r, () => {}, () => {});
    fillCompactTo(r, LEGACY_PROFILE_ID, 'orbitlab.mission', WORKSPACE_MAX_BYTES + 1, () => r.exportProfile(LEGACY_PROFILE_ID));
    await expect(host.exportBackup(LEGACY_PROFILE_ID)).rejects.toMatchObject({ code: 'oversize' });
    await expect(host.exportAll!()).rejects.toMatchObject({ code: 'oversize' });
    expect(calls.downloads).toHaveLength(0); r.close();
  });
});

/** Mixed scripts, escapes, opaque newer bytes and two owners: the bytes origin/main (095806a) downloaded for this state. */
async function normalWorkspace() {
  const env = setup(), r = await env.repo().initialize();
  const b = r.binding!;
  b.setItem('orbitlab.student', 'สมชาย ใจดี');
  b.setItem('orbitlab.mission', JSON.stringify({ format: 'orbitlab.mission', version: 3,
    mission: { name: 'ภารกิจ "ทดสอบ" \\ 🚀', target: 'LEO', note: 'line 1\nline 2 end\ttab' } }));
  b.setItem('orbitlab.lessons', JSON.stringify({ version: 1, lessons: { intro: { attempts: 2, best: 0.75 } }, assessments: [],
    customLessons: [], customQuestions: [] }));
  b.setItem('orbitlab.designs', JSON.stringify({ version: 1, designs: [{ name: 'Союз-2.1б', stages: 3 }] }));
  b.setItem('orbitlab.build.satellite.v1', '{"v":99,"future":"preserved"}');
  b.setItem('orbitlab.notation', 'gost'); b.setItem('orbitlab.lang', 'th');
  const second = await r.create('Иван Петров');
  r.mutate(second.id, (record) => {
    record.values['orbitlab.experiments.v1'] = JSON.stringify({ version: 1, experiments: [{ id: 'e1', title: 'Δv ≈ 9.4 km/s' }] });
    record.values['orbitlab.worksheets'] = '{broken';
  });
  return { env, r, second };
}

describe('R1.6 PR6: a normal-size backup keeps the bytes main saved (M-PLATFORM-008, EO-EXP-1 style)', () => {
  it('Export (one learner) and Export all download byte for byte what origin/main downloaded', async () => {
    const { r } = await normalWorkspace(), host = createProfileMenuHost(r, () => {}, () => {});
    await host.exportBackup(LEGACY_PROFILE_ID);
    await host.exportAll!();
    expect(calls.downloads.map((d) => d.filename)).toEqual(['Orbitlab-2026-10-06.orbitlab-workspace.json', 'Orbitlab-2026-10-06.orbitlab-workspace.json']);
    expect(calls.downloads.map((d) => d.blob.type)).toEqual(['application/json', 'application/json']);
    expect(await calls.downloads[0].blob.text()).toBe(mainProfileBytes);
    expect(await calls.downloads[1].blob.text()).toBe(mainAllBytes);
    r.close();
  });
});

describe('R1.6 PR6: visit-only mode never deletes the real profile\'s audio (M-PLATFORM-009)', () => {
  it('delete() in visit-only mode is refused before media is touched; durable bytes stay', async () => {
    const env = setup(), first = await env.repo().initialize();
    first.binding!.setItem('orbitlab.mission', 'real work'); first.close(); await tick();
    const before = new Map(env.disk.values);
    // No Web Locks: the saved profile is opened as a visit-only copy under its real id.
    const visit = await new WorkspaceRepository(env.disk.store, env.session.store, undefined, env.media).initialize();
    expect(visit.status).toBe('ephemeral'); expect(visit.binding!.profileId).toBe(LEGACY_PROFILE_ID);
    const outcome = await visit.delete(LEGACY_PROFILE_ID).then(() => 'deleted', (error: { code?: string }) => error.code);
    // The media adapter is the real IndexedDB one: a call here would erase the saved profile's audio.
    expect(env.deleted).toEqual([]);
    expect(outcome).toBe('locked');
    await expect(createProfileMenuHost(visit, () => {}, () => {}).remove(LEGACY_PROFILE_ID)).rejects.toMatchObject({ code: 'locked' });
    expect(env.deleted).toEqual([]);
    expect(new Map(env.disk.values)).toEqual(before);
    expect(env.disk.values.has(profileStorageKey(LEGACY_PROFILE_ID))).toBe(true);
    expect(JSON.parse(env.disk.values.get(PROFILE_CATALOG_KEY)!).profiles[LEGACY_PROFILE_ID]).toEqual({});
    expect(visit.binding!.valid).toBe(true); expect(visit.binding!.getItem('orbitlab.mission')).toBe('real work');
    visit.close();
  });
  it('a durable delete still removes the record and its media (unchanged path)', async () => {
    const env = setup(), r = await env.repo().initialize(), other = await r.create('Other');
    await r.delete(other.id);
    expect(env.deleted).toEqual([other.id]); expect(env.disk.values.has(profileStorageKey(other.id))).toBe(false); r.close();
  });
});
