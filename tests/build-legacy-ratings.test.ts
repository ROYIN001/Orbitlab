/**
 * FX-1 s2 (M-BUILD-006, after D-67 (a)): payload ratings a design kept before
 * an unfinished search could be told from a finished one. Since FX-1 PR1 only
 * a finished search is kept, but a record saved before it may hold a lower
 * bound or 0 kg as its rating. The owner's answer of 2026-10-06 (K1 card
 * `fx1-legacy-ratings`, option b): "คำนวณใหม่ให้อัตโนมัติเมื่อเปิดแบบจรวด" —
 * such ratings are computed again when the design is opened.
 *
 * A kept record says its ratings are final (`ratingsFinal`, beside the design,
 * not in the VehicleSpec); a record without it whose ratings open as computed
 * is searched again. A finished search replaces them and marks the record, in
 * one write; an unfinished one leaves the record as it was, to be tried again
 * at the next open. D-75: a rating-only recompute is not a design edit, so the
 * record's revision (`updated`) stays and the design does not read as edited.
 */
import { describe, expect, it } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { computedRatings } from '../src/design/ratings';
import { LocalDesignStore, isDesignOf, type DesignRecord, type DesignStorage } from '../src/design/design-store';
import { designRefFor } from '../src/design/design-ref';
import { designResult, draftFromSpec, partsDraft, ratingsSignature, remixDraft, type ExploreState, type RatingsRecord } from '../src/design/explore-model';
import { BUILD_RATING_OPTIONS, FinalRatings, ratingsNeedRecompute, ratingsRecord, recomputeKeptRatings } from '../src/ui/build/ratings-job';
import type { VehicleSpec } from '../src/types';

/** An Electron remix kept before FX-1 PR1 with what an unfinished search left: a LEO lower bound, and no GTO. */
const legacy = (): VehicleSpec => ({ ...structuredClone(vehicleById('electron')), id: 'my-electron', name: 'My Electron', derivedFrom: 'electron', payloadLEO: 120, payloadGTO: 0 });

function memory(): DesignStorage & { writes: number } {
  const data = new Map<string, string>();
  const m = { writes: 0, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { m.writes++; data.set(k, v); } };
  return m;
}

function storeWith(storage: DesignStorage): LocalDesignStore {
  let t = Date.parse('2026-09-26T12:00:00Z'), n = 0;
  return new LocalDesignStore(() => storage, () => new Date(t += 1000), () => `d${++n}`);
}

/** The design as the Build page opens it: what its ratings open as. */
function opened(rec: DesignRecord<'vehicle'>, ratings?: RatingsRecord) {
  const o = draftFromSpec(rec.design, rec.id);
  if (ratings) o.draft.ratings = ratings;
  const state: ExploreState = o.mode === 'remix'
    ? { mode: 'remix', remix: o.draft, parts: partsDraft('p', 'p') }
    : { mode: 'parts', parts: o.draft, remix: remixDraft('falcon9', 'r', 'r') };
  const r = designResult(state);
  if (!r.ok) throw new Error('the kept design opens');
  return r;
}

const asVehicle = (rec: DesignRecord | null): DesignRecord<'vehicle'> => {
  if (!rec || !isDesignOf(rec, 'vehicle')) throw new Error('a kept rocket');
  return rec;
};

describe('ratings kept before FX-1 PR1 are computed again when the design is opened', () => {
  it('a record without the mark is searched again: the finished result replaces the kept ratings, in one write', async () => {
    const storage = memory();
    const s = storeWith(storage);
    const rec = asVehicle(await s.save({ kind: 'vehicle', name: 'My Electron', design: legacy() }));
    const open = opened(rec);
    expect(open.ratings).toBe('computed');
    expect(ratingsNeedRecompute(rec, open.ratings)).toBe(true);
    const writes = storage.writes;
    let runs = 0;
    const outcome = await recomputeKeptRatings(rec, open.ratings, async () => {
      runs++;
      return ratingsRecord(open.signature, computedRatings(open.spec, BUILD_RATING_OPTIONS));
    }, s);
    expect(outcome).toBe('recomputed');
    expect(runs).toBe(1);
    expect(storage.writes - writes).toBe(1);
    const fresh = computedRatings(open.spec, BUILD_RATING_OPTIONS);
    const kept = asVehicle(await s.get(rec.id));
    expect(kept.ratingsFinal).toBe(true);
    expect([kept.design.payloadLEO, kept.design.payloadGTO]).toEqual([fresh.payloadLEO.kg, fresh.payloadGTO.kg]);
    expect(kept.design.payloadGTO).toBeGreaterThan(0);
    // opened again, it is not searched again
    expect(ratingsNeedRecompute(kept, opened(kept).ratings)).toBe(false);
  }, 60_000);

  it('a record whose ratings carry the mark is not searched again, and nothing is written', async () => {
    const storage = memory();
    const s = storeWith(storage);
    const rec = asVehicle(await s.save({ kind: 'vehicle', name: 'My Electron', design: legacy(), ratingsFinal: true }));
    expect(rec.ratingsFinal).toBe(true);
    const writes = storage.writes;
    let runs = 0;
    const outcome = await recomputeKeptRatings(rec, opened(rec).ratings, async () => { runs++; return null; }, s);
    expect(outcome).toBe('final');
    expect(runs).toBe(0);
    expect(storage.writes).toBe(writes);
  });

  it('a design whose ratings are not computed ones (published, a base\'s, none) is not searched', () => {
    expect(ratingsNeedRecompute({}, 'published')).toBe(false);
    expect(ratingsNeedRecompute({}, 'base')).toBe(false);
    expect(ratingsNeedRecompute({}, 'none')).toBe(false);
    expect(ratingsNeedRecompute({}, 'computed')).toBe(true);
  });

  it('a search that cannot finish leaves the kept ratings and no mark, and is tried again at the next open', async () => {
    const storage = memory();
    const s = storeWith(storage);
    const rec = asVehicle(await s.save({ kind: 'vehicle', name: 'My Electron', design: legacy() }));
    const open = opened(rec);
    const writes = storage.writes;
    // stopped at its flight limit: unfinished, so nothing of it is kept (FX-1 PR1)
    const unfinished = await recomputeKeptRatings(rec, open.ratings,
      async () => ratingsRecord(open.signature, computedRatings(open.spec, { ...BUILD_RATING_OPTIONS, maxFlights: 3 })), s);
    expect(unfinished).toBe('unfinished');
    // Stop pressed, or the worker failed
    const stopped = await recomputeKeptRatings(rec, open.ratings, () => Promise.reject(new DOMException('Cancelled', 'AbortError')), s);
    expect(stopped).toBe('unfinished');
    expect(storage.writes).toBe(writes);
    const kept = asVehicle(await s.get(rec.id));
    expect(kept).toEqual(rec);
    expect(kept.ratingsFinal).toBeUndefined();
    expect(ratingsNeedRecompute(kept, opened(kept).ratings)).toBe(true);
    // the next open finishes it
    const again = await recomputeKeptRatings(kept, open.ratings, async () => ({ signature: open.signature, payloadLEO: 150, payloadGTO: 40 }), s);
    expect(again).toBe('recomputed');
    expect(asVehicle(await s.get(rec.id)).design).toMatchObject({ payloadLEO: 150, payloadGTO: 40 });
  });

  it('D-75: the recompute is not a design edit — the revision stays, and the design does not read as edited', async () => {
    const s = storeWith(memory());
    const rec = asVehicle(await s.save({ kind: 'vehicle', name: 'My Electron', design: legacy() }));
    const before = designRefFor('vehicle', { name: rec.name, recordId: rec.id, design: rec.design }, rec.design.id, rec);
    const open = opened(rec);
    await recomputeKeptRatings(rec, open.ratings, async () => ({ signature: open.signature, payloadLEO: 150, payloadGTO: 40 }), s);
    const kept = asVehicle(await s.get(rec.id));
    expect(kept.updated).toBe(rec.updated);
    expect(kept.created).toBe(rec.created);
    expect((await s.list()).map((d) => d.updated)).toEqual([rec.updated]);
    // what the Build page flies once the search has given the draft its new ratings: the kept design, so the same revision, not edited
    const flown = opened(rec, { signature: open.signature, payloadLEO: 150, payloadGTO: 40 }).spec;
    expect(flown).toMatchObject({ payloadLEO: 150, payloadGTO: 40 });
    const after = designRefFor('vehicle', { name: rec.name, recordId: rec.id, design: flown }, rec.design.id, kept);
    expect(after).toEqual({ ...before, edited: false });
    expect(after.revision).toBe(rec.updated);
  });

  it('the store\'s rating-only write refuses anything but the ratings, and a design it does not keep', async () => {
    const storage = memory();
    const s = storeWith(storage);
    const rec = asVehicle(await s.save({ kind: 'vehicle', name: 'My Electron', design: legacy() }));
    const writes = storage.writes;
    expect(await s.rerate(rec.id, { ...rec.design, maxQ: 1 })).toBeNull();
    expect(await s.rerate(rec.id, { ...rec.design, name: 'Other' })).toBeNull();
    expect(await s.rerate('nope', rec.design)).toBeNull();
    expect(storage.writes).toBe(writes);
    expect(ratingsSignature({ ...rec.design, payloadLEO: 1 })).toBe(ratingsSignature(rec.design));
  });

  it('an ordinary save keeps the mark only when it is given: an edit saved with ratings not known final drops it', async () => {
    const s = storeWith(memory());
    const rec = asVehicle(await s.save({ kind: 'vehicle', name: 'My Electron', design: legacy(), ratingsFinal: true }));
    const edited = asVehicle(await s.save({ id: rec.id, kind: 'vehicle', name: 'My Electron', design: { ...rec.design, maxQ: 40000 } }));
    expect(edited.ratingsFinal).toBeUndefined();
  });
});

describe('review follow-ups (D-25)', () => {
  it('ratings searched for another vehicle (the design edited during the search) are not written into the record', async () => {
    const storage = memory();
    const s = storeWith(storage);
    const rec = asVehicle(await s.save({ kind: 'vehicle', name: 'My Electron', design: legacy() }));
    const open = opened(rec);
    const edited = ratingsSignature({ ...rec.design, maxQ: 40000 });
    expect(edited).not.toBe(open.signature);
    const writes = storage.writes;
    const outcome = await recomputeKeptRatings(rec, open.ratings, async () => ({ signature: edited, payloadLEO: 150, payloadGTO: 40 }), s);
    expect(outcome).toBe('unfinished');
    expect(storage.writes).toBe(writes);
    const kept = asVehicle(await s.get(rec.id));
    expect(kept).toEqual(rec);
    expect(kept.ratingsFinal).toBeUndefined();
  });

  it('a store that cannot write leaves the record unmarked, to be tried again', async () => {
    const s = storeWith(memory());
    const rec = asVehicle(await s.save({ kind: 'vehicle', name: 'My Electron', design: legacy() }));
    const open = opened(rec);
    const full = { rerate: () => Promise.reject(new Error('full')) };
    const outcome = await recomputeKeptRatings(rec, open.ratings, async () => ({ signature: open.signature, payloadLEO: 150, payloadGTO: 40 }), full);
    expect(outcome).toBe('unfinished');
    expect(asVehicle(await s.get(rec.id)).ratingsFinal).toBeUndefined();
  });

  it('rerate refuses ratings the store would not take as a design (its own check), and writes nothing', async () => {
    const storage = memory();
    const s = storeWith(storage);
    const rec = asVehicle(await s.save({ kind: 'vehicle', name: 'My Electron', design: legacy() }));
    const writes = storage.writes;
    expect(await s.rerate(rec.id, { ...rec.design, payloadLEO: -1 })).toBeNull();
    expect(await s.rerate(rec.id, { ...rec.design, payloadGTO: Number.NaN })).toBeNull();
    expect(storage.writes).toBe(writes);
  });

  it('Save marks the record final only for ratings known final, or none of the design\'s own', () => {
    const final = new FinalRatings();
    const unknown = { signature: 's', payloadLEO: 120, payloadGTO: 0 };
    const finished = { signature: 's', payloadLEO: 315, payloadGTO: 137 };
    final.add(finished);
    expect(final.onSave('computed', unknown)).toBe(false);
    expect(final.onSave('computed', finished)).toBe(true);
    expect(final.onSave('computed', null)).toBe(false);
    expect(final.onSave('base', null)).toBe(false);
    expect(final.onSave('published', null)).toBe(true);
    expect(final.onSave('none', null)).toBe(true);
    expect(final.onSave(null, null)).toBe(false);
  });

  it('a kept record\'s mark is handed to the ratings it opens with, and only a mark that is there', async () => {
    const s = storeWith(memory());
    const marked = asVehicle(await s.save({ kind: 'vehicle', name: 'My Electron', design: legacy(), ratingsFinal: true }));
    const unmarked = asVehicle(await s.save({ kind: 'vehicle', name: 'My Electron', design: legacy() }));
    const final = new FinalRatings();
    const a = draftFromSpec(marked.design, marked.id).draft.ratings;
    const b = draftFromSpec(unmarked.design, unmarked.id).draft.ratings;
    expect(a).not.toBeNull();
    final.opened(marked, a);
    final.opened(unmarked, b);
    expect(final.onSave('computed', a)).toBe(true);
    expect(final.onSave('computed', b)).toBe(false);
  });

  it('a rename keeps the mark (the store keeps what it is given)', async () => {
    const s = storeWith(memory());
    const rec = asVehicle(await s.save({ kind: 'vehicle', name: 'My Electron', design: legacy(), ratingsFinal: true }));
    const renamed = asVehicle(await s.save({ id: rec.id, kind: 'vehicle', name: 'Renamed', design: { ...rec.design, name: 'Renamed' }, ...(rec.ratingsFinal ? { ratingsFinal: true } : {}) }));
    expect(renamed.ratingsFinal).toBe(true);
  });
});
