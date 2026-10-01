/**
 * The lifetime → altitude search (roadmap D07; src/orbit/lifetime-altitude.ts)
 * off the main thread: some ten of P07's mean-element runs, each up to the
 * mission's years, a second or so apiece on a laptop and several times that
 * on a school tablet (map risk R5) — so it runs in a Web Worker, with its
 * progress shown and a Stop that ends it. Where no module worker is to be
 * had it runs here after a frame, stopping when asked between the
 * propagator's steps, as the lifetime window's own run does
 * (src/physics/lifetime-job.ts).
 *
 * The request is plain data (the ECSS level by name, the plane, the craft),
 * so it crosses into the worker as it is; the design side builds it without
 * importing the propagator.
 */
import { altitudesForLifetimes, type AltitudeForLifetime, type AltitudesRequest } from './lifetime-altitude';

export type AltitudesReply =
  | { type: 'progress'; fraction: number }
  | { type: 'result'; results: AltitudeForLifetime[] }
  | { type: 'error'; message: string };

/** Search in a worker; resolves with one answer per `req.years`, in order; a Stop rejects with an AbortError. */
export function runAltitudesJob(req: AltitudesRequest, signal: AbortSignal, onProgress: (fraction: number) => void): Promise<AltitudeForLifetime[]> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
    let worker: Worker | null = null;
    try { worker = new Worker(new URL('./lifetime-altitude.worker.ts', import.meta.url), { type: 'module' }); } catch { worker = null; }
    if (!worker) {
      setTimeout(() => {
        try { resolve(altitudesForLifetimes(req, (f) => { onProgress(f); return !signal.aborted; })); } catch (e) { reject(e); }
      }, 0);
      return;
    }
    const w = worker;
    const stop = (): void => { w.terminate(); reject(new DOMException('Cancelled', 'AbortError')); };
    signal.addEventListener('abort', stop, { once: true });
    w.onmessage = ({ data }: MessageEvent<AltitudesReply>) => {
      if (data.type === 'progress') { onProgress(data.fraction); return; }
      signal.removeEventListener('abort', stop);
      w.terminate();
      if (data.type === 'result') resolve(data.results); else reject(new Error(data.message));
    };
    w.onerror = (e) => { signal.removeEventListener('abort', stop); w.terminate(); reject(new Error(e.message)); };
    w.postMessage(req);
  });
}
