/**
 * The trade table (roadmap D07; src/design/requirement-trades.ts) off the
 * main thread. Each row walks the ground track over its repeat cycle for the
 * revisit and runs the pass search over it for the contact — tens of
 * milliseconds for a short cycle, a few hundred for a 26-day one on a laptop
 * and several times that on a school tablet (map risk R5) — and the rows
 * multiply with the days asked (37 cycles of up to 3 days, some 750 of up to
 * 16). So the table runs in a Web Worker with its progress shown and a Stop,
 * and here after a frame where no module worker is to be had, as the
 * lifetime search does (src/orbit/lifetime-altitude-job.ts).
 *
 * The request is plain data — the requirements, the template, the options
 * without their callback, the lifetime search's answers — so it crosses into
 * the worker as it is; the rows come back by structured clone, which keeps
 * the Infinity and NaN a row's ratios can hold (JSON would not).
 */
import type { MissionRequirements } from './requirements';
import { tradeTable, type TradeOptions, type TradeRow } from './requirement-trades';
import type { SatelliteDesign } from './satellite-spec';

export interface TradesRequest {
  req: MissionRequirements;
  template: SatelliteDesign;
  opts: Omit<TradeOptions, 'onProgress'>;
}

export type TradesReply =
  | { type: 'progress'; fraction: number }
  | { type: 'result'; rows: TradeRow[] }
  | { type: 'error'; message: string };

/** The table in a worker; resolves with its rows, highest orbit first; a Stop rejects with an AbortError. */
export function runTradesJob(r: TradesRequest, signal: AbortSignal, onProgress: (fraction: number) => void): Promise<TradeRow[]> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
    let worker: Worker | null = null;
    try { worker = new Worker(new URL('./requirement-trades.worker.ts', import.meta.url), { type: 'module' }); } catch { worker = null; }
    if (!worker) {
      setTimeout(() => {
        try { resolve(tradeTable(r.req, r.template, { ...r.opts, onProgress: (f) => { onProgress(f); return !signal.aborted; } })); } catch (e) { reject(e); }
      }, 0);
      return;
    }
    const w = worker;
    const stop = (): void => { w.terminate(); reject(new DOMException('Cancelled', 'AbortError')); };
    signal.addEventListener('abort', stop, { once: true });
    w.onmessage = ({ data }: MessageEvent<TradesReply>) => {
      if (data.type === 'progress') { onProgress(data.fraction); return; }
      signal.removeEventListener('abort', stop);
      w.terminate();
      if (data.type === 'result') resolve(data.rows); else reject(new Error(data.message));
    };
    w.onerror = (e) => { signal.removeEventListener('abort', stop); w.terminate(); reject(new Error(e.message)); };
    w.postMessage(r);
  });
}
