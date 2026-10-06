/**
 * Computed payload ratings (roadmap D03, D04; src/design/ratings.ts) off the
 * main thread: the 6–20 probe flights a design's LEO and GTO ratings take
 * (1–2 s on a laptop, more on a school tablet) run in a Web Worker, which
 * reports each flight as it lands so the screen can show the search going,
 * and is stopped by terminating it. Where no module worker is to be had, the
 * search runs here, after the screen has painted its progress line.
 */
import { t } from '../../i18n';
import type { VehicleSpec } from '../../types';
import { ratingsSearch, type ComputedRating, type ComputedRatings, type RatingClass } from '../../design/ratings';
import { ratingsSignature, type RatingsRecord, type RatingsSource } from '../../design/explore-model';
import type { DesignRecord, DesignStore } from '../../design/design-store';
import { mass } from './figures';
import { BUILD_RATING_OPTIONS } from './ratings-budget';

export { BUILD_RATING_OPTIONS };

/** A search that stopped before both ratings converged: what stopped it, and the payloads it did deliver. */
export interface UnfinishedRatings {
  stoppedBy: NonNullable<ComputedRating['stoppedBy']>;
  /** probe flights flown in all */
  flights: number;
  /** each rating as far as it got: `kg` is the rating when `converged`, else the heaviest payload delivered so far */
  leo: { kg: number; converged: boolean };
  gto: { kg: number; converged: boolean };
}

/** null when both ratings converged: only then are they the vehicle's ratings. */
export function unfinishedRatings(r: ComputedRatings): UnfinishedRatings | null {
  if (r.payloadLEO.converged && r.payloadGTO.converged) return null;
  const { stoppedBy } = !r.payloadLEO.converged ? r.payloadLEO : r.payloadGTO;
  if (!stoppedBy) throw new Error('an unconverged rating says what stopped it');
  const part = ({ kg, converged }: ComputedRating) => ({ kg, converged });
  return { stoppedBy, flights: r.flights, leo: part(r.payloadLEO), gto: part(r.payloadGTO) };
}

/** The ratings record a design keeps, or null for an unfinished search: nothing of it is kept. */
export function ratingsRecord(signature: string, r: ComputedRatings): RatingsRecord | null {
  return unfinishedRatings(r) ? null : { signature, payloadLEO: r.payloadLEO.kg, payloadGTO: r.payloadGTO.kg };
}

/** What the screen says of an unfinished search. */
export function unfinishedRatingsText(u: UnfinishedRatings): string {
  const part = (orbit: string, { kg, converged }: UnfinishedRatings['leo']): string =>
    t(converged ? 'build.ex.ratings.part.found' : kg > 0 ? 'build.ex.ratings.part.atLeast' : 'build.ex.ratings.part.none',
      { orbit: t(orbit), kg: kg > 0 ? mass(kg) : t('build.ex.ratings.nothing') });
  return t(u.stoppedBy === 'timeBudget' ? 'build.ex.ratings.unfinished.time' : 'build.ex.ratings.unfinished.flights',
    { n: u.flights, leo: part('build.ex.ratings.leo', u.leo), gto: part('build.ex.ratings.gto', u.gto) });
}

/**
 * Whether a kept design's ratings are to be computed again when it is opened
 * (FX-1 s2; owner, 2026-10-06, "คำนวณใหม่ให้อัตโนมัติเมื่อเปิดแบบจรวด"): they
 * open as computed ones, and the record does not say they are final — it was
 * kept before only a finished search was kept (FX-1 PR1), so they may be a
 * lower bound or 0 kg.
 */
export function ratingsNeedRecompute(record: Pick<DesignRecord, 'ratingsFinal'>, opened: RatingsSource): boolean {
  return opened === 'computed' && record.ratingsFinal !== true;
}

/**
 * Compute a kept design's ratings again when it needs it (`run`: the search,
 * its finished result as a record, or null). A finished search replaces the
 * kept ratings and marks the record, in one write that is not a design edit
 * (D-75, `DesignStore.rerate`); an unfinished, stopped or failed one leaves
 * the record as it was, so the next open tries again.
 */
export async function recomputeKeptRatings(record: DesignRecord<'vehicle'>, opened: RatingsSource,
  run: () => Promise<RatingsRecord | null>, store: Pick<DesignStore, 'rerate'>): Promise<'final' | 'recomputed' | 'unfinished'> {
  if (!ratingsNeedRecompute(record, opened)) return 'final';
  const r = await run().catch(() => null);
  // ratings of another vehicle (the design edited while the search ran) are not this record's
  if (!r || r.signature !== ratingsSignature(record.design)) return 'unfinished';
  // the design as the page flies it with these ratings (explore-model.ts `remixResult`)
  const { payloadSSO: _kept, ...design } = record.design;
  const rated = await store.rerate(record.id, { ...design, payloadLEO: r.payloadLEO, payloadGTO: r.payloadGTO, ...(r.payloadSSO !== undefined ? { payloadSSO: r.payloadSSO } : {}) })
    .catch(() => null);
  return rated ? 'recomputed' : 'unfinished';
}

/**
 * Which ratings on screen are known final (FX-1 s2): a finished search's, the
 * readiness review's, or those a kept record opened with when it carried the
 * mark. Held in memory only: ratings restored from the browser's kept drafts
 * are not known final, and a record saved with them is searched again.
 */
export class FinalRatings {
  private readonly known = new WeakSet<RatingsRecord>();
  add(r: RatingsRecord | null): void { if (r) this.known.add(r); }
  /** a kept record opened with ratings `r`: final when the record says so */
  opened(record: Pick<DesignRecord, 'ratingsFinal'>, r: RatingsRecord | null): void { if (record.ratingsFinal === true) this.add(r); }
  /** whether a record saved now, with ratings of source `source` (null: nothing built), is marked final */
  onSave(source: RatingsSource | null, r: RatingsRecord | null): boolean {
    return source === 'computed' ? !!r && this.known.has(r) : source === 'published' || source === 'none';
  }
}

export type RatingsReply =
  | { type: 'progress'; rating: RatingClass; flights: number }
  | { type: 'result'; result: ComputedRatings }
  | { type: 'error'; message: string };

export function runRatingsJob(spec: VehicleSpec, signal: AbortSignal, onProgress: (rating: RatingClass, flights: number) => void): Promise<ComputedRatings> {
  return new Promise((resolve, reject) => {
    let worker: Worker | null = null;
    try { worker = new Worker(new URL('./ratings.worker.ts', import.meta.url), { type: 'module' }); } catch { worker = null; }
    if (!worker) {
      // no module workers: here, a flight at a time, so the progress line is
      // drawn and Stop is heard between flights (the first after a frame)
      const search = ratingsSearch(spec, { ...BUILD_RATING_OPTIONS, onFlight: onProgress });
      const step = (): void => {
        if (signal.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
        try {
          const next = search.next();
          if (next.done) resolve(next.value); else setTimeout(step, 0);
        } catch (e) { reject(e); }
      };
      setTimeout(step, 50);
      return;
    }
    const w = worker;
    const stop = (): void => { w.terminate(); reject(new DOMException('Cancelled', 'AbortError')); };
    signal.addEventListener('abort', stop, { once: true });
    w.onmessage = ({ data }: MessageEvent<RatingsReply>) => {
      if (data.type === 'progress') { onProgress(data.rating, data.flights); return; }
      signal.removeEventListener('abort', stop);
      w.terminate();
      if (data.type === 'result') resolve(data.result); else reject(new Error(data.message));
    };
    w.onerror = (e) => { signal.removeEventListener('abort', stop); w.terminate(); reject(new Error(e.message)); };
    w.postMessage(spec);
  });
}
