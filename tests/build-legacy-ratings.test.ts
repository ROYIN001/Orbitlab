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
import { BUILD_RATING_OPTIONS, ratingsNeedRecompute, ratingsRecord, recomputeKeptRatings } from '../src/ui/build/ratings-job';
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
