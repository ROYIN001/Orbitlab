import type { MissionConfig } from '../types';
import type { AutotuneOutcome, TuneProgress } from './autotune';

export type TuneReply = { type: 'progress'; progress: TuneProgress }
  | { type: 'result'; result: AutotuneOutcome } | { type: 'error'; message: string };

/** Small worker contract, injectable for cancellation/race regression tests. */
export interface TuneWorker {
  onmessage: ((event: MessageEvent<TuneReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(config: MissionConfig): void;
  terminate(): void;
}

export function runTuneJob(config: MissionConfig, signal: AbortSignal,
  onProgress: (progress: TuneProgress) => void,
  createWorker: () => TuneWorker = () => new Worker(new URL('./tune.worker.ts', import.meta.url), { type: 'module' }),
): Promise<AutotuneOutcome> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Tuning cancelled', 'AbortError')); return; }
    const worker = createWorker();
    let settled = false;
    const finish = (result?: AutotuneOutcome, error?: Error): void => {
      if (settled) return;
      settled = true;
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      signal.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(result!);
    };
    const abort = (): void => finish(undefined, new DOMException('Tuning cancelled', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }) => {
      if (settled) return;
      try {
        if (data.type === 'progress') onProgress(data.progress);
        else if (data.type === 'error') finish(undefined, new Error(data.message));
        else finish(data.result);
      } catch (error) {
        // A failing progress consumer must not strand a running worker or keep
        // the UI awaiting a promise that will never report that failure.
        finish(undefined, error instanceof Error ? error : new Error(String(error)));
      }
    };
    worker.onerror = (event) => finish(undefined, new Error(event.message));
    worker.onmessageerror = () => finish(undefined, new Error('Unable to decode tuning worker response'));
    // An injected factory can abort synchronously. Adding a listener after that
    // event does not replay it, so do not post work when setup was cancelled.
    if (signal.aborted) { abort(); return; }
    try { worker.postMessage(config); } catch (error) { finish(undefined, error instanceof Error ? error : new Error(String(error))); }
  });
}
