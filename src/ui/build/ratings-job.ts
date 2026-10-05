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
import { computedRatings, type ComputedRating, type ComputedRatings, type RatingClass } from '../../design/ratings';
import type { RatingsRecord } from '../../design/explore-model';
import { mass } from './figures';
import { BUILD_RATING_OPTIONS } from './ratings-budget';

export { BUILD_RATING_OPTIONS };

/** A search that stopped before both ratings converged: what stopped it, and the payloads it did deliver. */
export interface UnfinishedRatings {
  stoppedBy: NonNullable<ComputedRating['stoppedBy']>;
  /** probe flights flown in all */
  flights: number;
  /** the heaviest payload flown and delivered so far, kg: the rating is at least this */
  leoAtLeastKg: number;
  gtoAtLeastKg: number;
}

/** null when both ratings converged: only then are they the vehicle's ratings. */
export function unfinishedRatings(r: ComputedRatings): UnfinishedRatings | null {
  if (r.payloadLEO.converged && r.payloadGTO.converged) return null;
  const stopped = !r.payloadLEO.converged ? r.payloadLEO : r.payloadGTO;
  return { stoppedBy: stopped.stoppedBy ?? 'flightBudget', flights: r.flights, leoAtLeastKg: r.payloadLEO.kg, gtoAtLeastKg: r.payloadGTO.kg };
}

/** The ratings record a design keeps, or null for an unfinished search: nothing of it is kept. */
export function ratingsRecord(signature: string, r: ComputedRatings): RatingsRecord | null {
  return unfinishedRatings(r) ? null : { signature, payloadLEO: r.payloadLEO.kg, payloadGTO: r.payloadGTO.kg };
}

/** What the screen says of an unfinished search. */
export function unfinishedRatingsText(u: UnfinishedRatings): string {
  const atLeast = (kg: number): string => (kg > 0 ? mass(kg) : t('build.ex.ratings.unknown'));
  return t(u.stoppedBy === 'timeBudget' ? 'build.ex.ratings.unfinished.time' : 'build.ex.ratings.unfinished.flights',
    { n: u.flights, leo: atLeast(u.leoAtLeastKg), gto: atLeast(u.gtoAtLeastKg) });
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
      // no module workers: after a frame, so the progress line is on screen first
      setTimeout(() => {
        if (signal.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
        try { resolve(computedRatings(spec, { ...BUILD_RATING_OPTIONS, onFlight: onProgress })); } catch (e) { reject(e); }
      }, 50);
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
