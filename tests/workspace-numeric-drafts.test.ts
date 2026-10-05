import { describe, expect, it } from 'vitest';
import { WorkspaceRepository, type WorkspaceLocks } from '../src/workspace/repository';
import { bindWorkspaceStorage } from '../src/workspace/storage';
import { rememberNumericText, rememberedNumericText } from '../src/workspace/numeric-drafts';
import { keptDraftsText, partsDraft, remixDraft, restoreKeptDrafts, designResult } from '../src/design/explore-model';
import { DEFAULT_FORM, restoreForm } from '../src/design/requirements-page';
function memory() {
  const values = new Map<string, string>(); let deny = false;
  return { values, setDenied(value: boolean) { deny = value; },
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => { if (deny) throw new Error('Quota'); values.set(k, v); },
    removeItem: (k: string) => { values.delete(k); } };
}
const locks: WorkspaceLocks = { request: async (_name, _options, run) => run({}) };
async function bound() {
  const storage = memory(), session = memory(), repo = await new WorkspaceRepository(storage, session, locks).initialize();
  const binding = repo.binding!;
  bindWorkspaceStorage(binding, (fn) => repo.registerFlush(fn), (write) => ({ ...binding.token(write), durable: true }));
  return { repo, storage, session };
}
describe('unfinished literal numeric work', () => {
  it('keeps unfinished exponent/comma text separately from NaN and restores only the matching design/model', async () => {
    const { repo } = await bound();
    rememberNumericText('rocket:my-a', 'payload', '1e-', Number.NaN);
    rememberNumericText('satellite:my-b', 'battery', '0,08', 0.08);
    expect(rememberedNumericText('rocket:my-a', 'payload', Number.NaN)).toBe('1e-');
    expect(rememberedNumericText('rocket:my-c', 'payload', Number.NaN)).toBeNull();
    expect(rememberedNumericText('satellite:my-b', 'battery', 0.08)).toBe('0,08');
    expect(rememberedNumericText('satellite:my-b', 'battery', 0.1)).toBeNull();
    const saved = repo.exportProfile().profiles[0].values['orbitlab.numeric-drafts.v1'];
    expect(saved).toContain('1e-'); expect(saved).toContain('0,08'); repo.close();
  });
  it('does not rewrite an untouched unknown numeric draft merely because a field is read before backup', async () => {
    const { repo } = await bound(), raw = '{ "v": 99, "futureFields": { "unfinished": "1e-" } }';
    repo.binding!.setItem('orbitlab.numeric-drafts.v1', raw);
    expect(rememberedNumericText('rocket:unknown', 'payload', Number.NaN)).toBeNull();
    await repo.prepareChange(); expect(repo.exportProfile().profiles[0].values['orbitlab.numeric-drafts.v1']).toBe(raw);
    expect(repo.binding!.getItem('orbitlab.import.quarantine.v1')).toBeNull(); repo.close();
  });
  it('prevents profile switching after a failed literal draft save until the strict flush succeeds', async () => {
    const { repo, storage } = await bound(); const next = await repo.create('Next');
    rememberedNumericText('requirements', 'gsd', Number.NaN); storage.setDenied(true);
    rememberNumericText('requirements', 'gsd', '-', Number.NaN);
    await expect(repo.select(next.id)).rejects.toThrow('Quota'); expect(repo.binding!.valid).toBe(true);
    storage.setDenied(false); await repo.prepareChange();
    expect(repo.binding!.getItem('orbitlab.numeric-drafts.v1')).toContain('"text":"-"'); repo.close();
  });
  it('does not leak literal text between learners with identical design IDs', async () => {
    const { repo, storage, session } = await bound(); rememberNumericText('rocket:same-id', 'payload', 'A-', Number.NaN);
    const other = await repo.create('Same name'); await repo.select(other.id);
    const b = await new WorkspaceRepository(storage, session, locks).initialize(), binding = b.binding!;
    bindWorkspaceStorage(binding, (fn) => b.registerFlush(fn), (write) => ({ ...binding.token(write), durable: true }));
    expect(rememberedNumericText('rocket:same-id', 'payload', Number.NaN)).toBeNull(); b.close();
  });
  it('restores unfinished rocket engine/booster counts and stretch as invalid draft fields instead of discarding the whole design', () => {
    const state = { mode: 'parts' as const, remix: remixDraft('falcon9', 'my-remix', 'Remix'), parts: partsDraft('my-parts', 'Parts') };
    state.parts.edit.stages[0].engine.count = Number.NaN;
    state.parts.edit.groups.push({ body: 'gem63', count: Number.NaN });
    state.remix.edit.stages[0].stretch = Number.NaN;
    const restored = restoreKeptDrafts(keptDraftsText({ state, defaults: { remix: 'Remix', parts: 'Parts' } }));
    expect(restored).not.toBeNull(); expect(restored!.state.parts.edit.stages[0].engine.count).toBeNaN();
    expect(restored!.state.parts.edit.groups[0].count).toBeNaN(); expect(restored!.state.remix.edit.stages[0].stretch).toBeNaN();
    expect(designResult(restored!.state).ok).toBe(false);
  });
  it('restores an unfinished requirements number as invalid while retaining the intentionally nullable maximum duration', () => {
    const original = { ...DEFAULT_FORM, gsd: Number.NaN, maxDays: null };
    const restored = restoreForm(JSON.stringify(original)); expect(restored.gsd).toBeNaN(); expect(restored.maxDays).toBeNull();
  });
  it('retains unsupported raw bytes before a forgiving loader first saves a newer profile record', async () => {
    const { repo } = await bound(), original = '{"version":99,"mission":{"unknown":"still mine"}}';
    repo.binding!.setItem('orbitlab.mission', original); repo.binding!.setItem('orbitlab.mission', '{"version":3,"mission":{}}');
    expect(JSON.parse(repo.binding!.getItem('orbitlab.import.quarantine.v1')!).entries).toContainEqual({ key: 'orbitlab.mission', raw: original }); repo.close();
  });
});

describe('R1.6 PR1: numeric draft cap (M-LEARNING-005)', () => {
  it('keeps typing effective after 1,000 remembered fields and stays within the 1,000 fields × 1,000 characters cap', async () => {
    const { repo } = await bound(); let model = Number.NaN;
    // The callers remember the literal text first, then hand the number to the model.
    const typed = (scope: string, key: string, text: string): void => { const n = Number(text); rememberNumericText(scope, key, text, n); model = n; };
    for (let i = 0; i < 1000; i++) rememberNumericText('fill', `f${i}`, `${i}.0`, i);
    expect(() => typed('rocket:new', 'payload', '1500')).not.toThrow(); expect(model).toBe(1500);
    expect(rememberedNumericText('rocket:new', 'payload', 1500)).toBe('1500');
    let fields = JSON.parse(repo.binding!.getItem('orbitlab.numeric-drafts.v1')!).fields as Record<string, unknown>;
    expect(Object.keys(fields)).toHaveLength(1000); expect(fields['fill\u0000f0']).toBeUndefined(); expect(fields['fill\u0000f999']).toBeDefined();
    const long = `1${'0'.repeat(1000)}`;
    expect(() => typed('rocket:new', 'payload', long)).not.toThrow(); expect(model).toBe(Number(long));
    fields = JSON.parse(repo.binding!.getItem('orbitlab.numeric-drafts.v1')!).fields as Record<string, { text: string }>;
    expect(Object.keys(fields).length).toBeLessThanOrEqual(1000);
    expect(Object.values(fields).every((field) => (field as { text: string }).text.length <= 1000)).toBe(true);
    expect(() => typed(`s${'x'.repeat(400)}`, 'payload', '7')).not.toThrow(); expect(model).toBe(7); repo.close();
  });
});
