/**
 * Local design storage (roadmap S05): designs kept in this browser behind the
 * `DesignStore` interface, and a design as a `.orbitlab.json` file, versioned
 * like the mission file. Run against fake storage: one that works, one that
 * refuses, one that is full.
 */
import { describe, expect, it } from 'vitest';
import {
  DESIGN_FORMAT, DESIGN_FORMAT_VERSION, DESIGN_STORE_KEY, DesignStoreError, LocalDesignStore, designDocument, designFileName,
  designFileText, parseDesignDocument, readDesignFileText, type DesignStorage, type DesignStore,
} from '../src/design/design-store';
import { vehicleById } from '../src/data/vehicles';
import type { VehicleSpec } from '../src/types';

const rocket = (id = 'my-falcon', extra: Partial<VehicleSpec> = {}): VehicleSpec =>
  ({ ...structuredClone(vehicleById('falcon9')), id, name: 'My Falcon', derivedFrom: 'falcon9', ...extra });

function memory(): DesignStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } };
}

/** A clock that ticks a second a call, and ids in order. */
function store(storage: DesignStorage): DesignStore {
  let t = Date.parse('2026-09-26T12:00:00Z'), n = 0;
  return new LocalDesignStore(() => storage, () => new Date(t += 1000), () => `d${++n}`);
}

describe('the local design store (S05)', () => {
  it('keeps a design, lists it newest first, changes it and forgets it', async () => {
    const s = store(memory());
    const a = await s.save({ kind: 'vehicle', name: 'My Falcon', design: rocket() });
    const b = await s.save({ kind: 'vehicle', name: '  Stretched  ', design: rocket('stretched') });
    expect(a).toMatchObject({ id: 'd1', kind: 'vehicle', name: 'My Falcon', created: '2026-09-26T12:00:01.000Z' });
    expect(b.name).toBe('Stretched');
    expect((await s.list()).map((d) => d.id)).toEqual(['d2', 'd1']);
    expect(await s.get('d1')).toEqual(a);
    // a change keeps the id and the creation time
    const changed = await s.save({ id: 'd1', kind: 'vehicle', name: 'My Falcon II', design: rocket('my-falcon', { maxQ: 40000 }) });
    expect(changed).toMatchObject({ id: 'd1', created: a.created, name: 'My Falcon II' });
    expect(changed.updated > a.updated).toBe(true);
    expect((await s.list('vehicle')).map((d) => d.id)).toEqual(['d1', 'd2']);
    expect((await s.get('d1'))!.design.maxQ).toBe(40000);
    expect(await s.remove('d2')).toBe(true);
    expect(await s.remove('d2')).toBe(false);
    expect((await s.list()).map((d) => d.name)).toEqual(['My Falcon II']);
  });

  it('shares nothing with what it was given or what it gives back', async () => {
    const s = store(memory());
    const design = rocket();
    const saved = await s.save({ kind: 'vehicle', name: 'X', design });
    design.stages[0].dryMass = 1;
    saved.design.stages[0].dryMass = 2;
    expect((await s.get(saved.id))!.design.stages[0].dryMass).toBe(vehicleById('falcon9').stages[0].dryMass);
  });

  it('refuses a design that is not one, and a change to one it does not keep', async () => {
    const s = store(memory());
    await expect(s.save({ kind: 'vehicle', name: 'Bad', design: rocket('bad', { maxQ: NaN }) }))
      .rejects.toMatchObject({ code: 'invalid', message: 'maxQ must be a finite number (got NaN)' });
    await expect(s.save({ kind: 'vehicle', name: '', design: rocket() })).rejects.toMatchObject({ code: 'invalid' });
    await expect(s.save({ kind: 'satellite' as 'vehicle', name: 'Sat', design: rocket() })).rejects.toMatchObject({ code: 'invalid' });
    await expect(s.save({ id: 'nothing', kind: 'vehicle', name: 'X', design: rocket() })).rejects.toMatchObject({ code: 'notFound' });
    expect(await s.list()).toEqual([]);
  });

  it('says so when the browser will not keep anything, or is full, and loses nothing it had', async () => {
    const denied: DesignStorage = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('SecurityError'); } };
    const s = store(denied);
    expect(await s.list()).toEqual([]);
    expect(await s.get('d1')).toBeNull();
    await expect(s.save({ kind: 'vehicle', name: 'X', design: rocket() })).rejects.toBeInstanceOf(DesignStoreError);
    await expect(s.save({ kind: 'vehicle', name: 'X', design: rocket() })).rejects.toMatchObject({ code: 'unavailable' });
    // no storage at all (the accessor itself throws)
    const none = new LocalDesignStore(() => { throw new Error('no localStorage'); });
    expect(await none.list()).toEqual([]);
    await expect(none.save({ kind: 'vehicle', name: 'X', design: rocket() })).rejects.toMatchObject({ code: 'unavailable' });
    // full: the save fails, and what was kept is still there
    const m = memory();
    const full = store({ getItem: m.getItem, setItem: (k, v) => { if (m.data.has(k)) throw new DOMException('exceeded', 'QuotaExceededError'); m.setItem(k, v); } });
    await full.save({ kind: 'vehicle', name: 'First', design: rocket() });
    await expect(full.save({ kind: 'vehicle', name: 'Second', design: rocket('second') })).rejects.toMatchObject({ code: 'full' });
    expect((await full.list()).map((d) => d.name)).toEqual(['First']);
  });

  it('leaves a damaged record out rather than failing or deleting it', async () => {
    const m = memory();
    const s = store(m);
    await s.save({ kind: 'vehicle', name: 'Good', design: rocket() });
    const kept = JSON.parse(m.data.get(DESIGN_STORE_KEY)!);
    const broken = { id: 'broken', kind: 'vehicle', name: 'Broken', created: 'x', updated: 'x', design: { stages: 'none' } };
    kept.designs.push(broken);
    m.data.set(DESIGN_STORE_KEY, JSON.stringify(kept));
    expect((await s.list()).map((d) => d.name)).toEqual(['Good']);
    expect(await s.get('broken')).toBeNull();
    // not deleted by a save or a remove either (R4): written back as it was
    await s.save({ kind: 'vehicle', name: 'Another', design: rocket('another') });
    expect(await s.remove('d1')).toBe(true);
    expect(await s.remove('broken')).toBe(false);
    expect(JSON.parse(m.data.get(DESIGN_STORE_KEY)!).designs.map((d: { id: string }) => d.id)).toEqual(['broken', 'd2']);
    expect(JSON.parse(m.data.get(DESIGN_STORE_KEY)!).designs[0]).toEqual(broken);
    m.data.set(DESIGN_STORE_KEY, 'not json');
    expect(await s.list()).toEqual([]);
  });

  /**
   * Risk R4 of the Phase 4 map: a record of a kind this build does not know —
   * a newer build's satellite (D06), say, read by an older build a PWA still
   * serves — is not the older build's to drop. It stays out of the list, and
   * every save and remove writes it back unchanged and in its place. The kind
   * here is one no build will ever know, so the test holds when satellites do
   * join the store.
   */
  it('keeps a record of a kind it does not know through saves and removes (R4)', async () => {
    const m = memory();
    const s = store(m);
    const first = await s.save({ kind: 'vehicle', name: 'First', design: rocket() });
    const newer = {
      id: 'from-a-newer-build', kind: 'kindFromTheFuture', name: 'Not mine to drop', created: '2027-01-01T00:00:00.000Z',
      updated: '2027-01-02T00:00:00.000Z', design: { anything: [1, 2.5, 'three'], nested: { deep: null } }, extra: 'a field I do not know',
    };
    const stored = JSON.parse(m.data.get(DESIGN_STORE_KEY)!);
    stored.designs.push(newer);
    m.data.set(DESIGN_STORE_KEY, JSON.stringify(stored));
    const ids = () => JSON.parse(m.data.get(DESIGN_STORE_KEY)!).designs.map((d: { id: string }) => d.id);
    const raw = () => JSON.parse(m.data.get(DESIGN_STORE_KEY)!).designs.find((d: { id: string }) => d.id === newer.id);

    // unseen by this build
    expect((await s.list()).map((d) => d.id)).toEqual(['d1']);
    expect(await s.get(newer.id)).toBeNull();
    // a new design: appended after it, the record kept as it was
    await s.save({ kind: 'vehicle', name: 'Second', design: rocket('second') });
    expect(ids()).toEqual(['d1', newer.id, 'd2']);
    expect(raw()).toEqual(newer);
    // a change to a design: made in place, the record kept
    await s.save({ id: first.id, kind: 'vehicle', name: 'First, changed', design: rocket('my-falcon', { maxQ: 40000 }) });
    expect(ids()).toEqual(['d1', newer.id, 'd2']);
    expect(raw()).toEqual(newer);
    // a remove: the design goes, the record stays
    expect(await s.remove('d1')).toBe(true);
    expect(ids()).toEqual([newer.id, 'd2']);
    expect(raw()).toEqual(newer);
    // nor can it be removed or overwritten through its id: this build cannot read it
    expect(await s.remove(newer.id)).toBe(false);
    await expect(s.save({ id: newer.id, kind: 'vehicle', name: 'Overwrite', design: rocket() })).rejects.toMatchObject({ code: 'notFound' });
    expect(ids()).toEqual([newer.id, 'd2']);
    expect(raw()).toEqual(newer);
    // the layout is the same version 1
    expect(JSON.parse(m.data.get(DESIGN_STORE_KEY)!).version).toBe(1);
    expect(DESIGN_FORMAT_VERSION).toBe(1);
  });
});

describe('a design as a file (S05)', () => {
  it('round-trips through its file, versioned like the mission file', async () => {
    const s = store(memory());
    const record = await s.save({ kind: 'vehicle', name: 'My Falcon', design: rocket() });
    const doc = designDocument(record);
    expect(doc).toMatchObject({ format: DESIGN_FORMAT, version: DESIGN_FORMAT_VERSION, kind: 'vehicle', name: 'My Falcon', created: record.created });
    const back = parseDesignDocument(readDesignFileText(designFileText(doc)));
    expect(back.issues).toEqual([]);
    expect(back.input).toEqual({ kind: 'vehicle', name: 'My Falcon', design: record.design });
    // and into another store
    const other = store(memory());
    const imported = await other.save(back.input!);
    expect(imported.design).toEqual(record.design);
    expect(designFileName(record)).toBe('my-falcon-vehicle.orbitlab.json');
    expect(designFileName({ name: 'จรวด ทดลอง #1', kind: 'vehicle' })).toBe('จรวด-ทดลอง-1-vehicle.orbitlab.json');
    expect(designFileName({ name: '???', kind: 'vehicle' })).toBe('design-vehicle.orbitlab.json');
  });

  it('refuses what is not a design file, and a design that is not sound, saying why', () => {
    for (const raw of [null, 'text', 42, {}, { format: 'orbitlab.mission', version: 1 }, { format: DESIGN_FORMAT, version: 0 }, { format: DESIGN_FORMAT, version: '1' }]) {
      expect(parseDesignDocument(raw)).toEqual({ input: null, issues: [{ code: 'format' }] });
    }
    const doc = designDocument({ id: 'd1', kind: 'vehicle', name: 'X', created: 'c', updated: 'u', design: rocket() });
    const broken = JSON.parse(JSON.stringify(doc));
    broken.design.stages[1].engine.ispVac = 3000;
    expect(parseDesignDocument(broken)).toEqual({ input: null, issues: [{ code: 'invalid', detail: 'stages[1].engine.ispVac must be at most 480 (got 3000)' }] });
    expect(readDesignFileText('not json')).toBeNull();
  });

  it('reads a newer file as far as it can, and says so', () => {
    const doc = { ...designDocument({ id: 'd1', kind: 'vehicle', name: 'X', created: 'c', updated: 'u', design: rocket() }), version: DESIGN_FORMAT_VERSION + 1 };
    const back = parseDesignDocument(JSON.parse(JSON.stringify(doc)));
    expect(back.issues).toEqual([{ code: 'newerVersion' }]);
    expect(back.input?.design).toEqual(rocket());
  });
});
