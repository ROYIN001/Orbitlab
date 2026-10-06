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
import type { RatingsRecord } from '../../design/explore-model';
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
