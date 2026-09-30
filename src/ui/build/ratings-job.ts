/**
 * Computed payload ratings (roadmap D03, D04; src/design/ratings.ts) off the
 * main thread: the 6–20 probe flights a design's LEO and GTO ratings take
 * (1–2 s on a laptop, more on a school tablet) run in a Web Worker, which
 * reports each flight as it lands so the screen can show the search going,
 * and is stopped by terminating it. Where no module worker is to be had, the
 * search runs here, after the screen has painted its progress line.
 */
import type { VehicleSpec } from '../../types';
import { computedRatings, type ComputedRatings, type RatingClass } from '../../design/ratings';

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
        try { resolve(computedRatings(spec, { onFlight: onProgress })); } catch (e) { reject(e); }
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
