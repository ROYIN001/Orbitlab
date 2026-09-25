/**
 * The orbit-lifetime run (roadmap P07) off the main thread: `propagate` in a
 * Web Worker, with progress and cancellation, and inline where no module
 * worker is to be had.
 */
import { propagate, type PropagationOptions, type PropagationResult } from './propagator/propagate';
import type { V3 } from './propagator/ephemeris';

export interface LifetimeRequest { r0: V3; v0: V3; jd0: number; options: Omit<PropagationOptions, 'onProgress'> }
export type LifetimeReply = { type: 'progress'; fraction: number } | { type: 'result'; result: PropagationResult } | { type: 'error'; message: string };

export function runLifetimeJob(req: LifetimeRequest, signal: AbortSignal, onProgress: (fraction: number) => void): Promise<PropagationResult> {
  return new Promise((resolve, reject) => {
    let worker: Worker | null = null;
    try { worker = new Worker(new URL('./lifetime.worker.ts', import.meta.url), { type: 'module' }); } catch { worker = null; }
    if (!worker) {
      // no module workers: run here, between frames
      setTimeout(() => {
        try { resolve(propagate(req.r0, req.v0, req.jd0, { ...req.options, onProgress: (f) => { onProgress(f); return !signal.aborted; } })); }
        catch (e) { reject(e); }
      }, 0);
      return;
    }
    const w = worker;
    const stop = (): void => { w.terminate(); reject(new DOMException('Cancelled', 'AbortError')); };
    signal.addEventListener('abort', stop, { once: true });
    w.onmessage = ({ data }: MessageEvent<LifetimeReply>) => {
      if (data.type === 'progress') { onProgress(data.fraction); return; }
      signal.removeEventListener('abort', stop);
      w.terminate();
      if (data.type === 'result') resolve(data.result); else reject(new Error(data.message));
    };
    w.onerror = (e) => { signal.removeEventListener('abort', stop); w.terminate(); reject(new Error(e.message)); };
    w.postMessage(req);
  });
}
