/**
 * The instructor's re-check (roadmap T02, src/lessons/recheck.ts) off the main
 * thread: a class's flights flown again in a Web Worker, with progress and a
 * Stop, and on the main thread between frames where no module worker is to be
 * had (and in Node, where the tests run it). A point-mass re-fly takes a
 * fraction of a second on a laptop and several times that on a school tablet
 * (map risk R5); a class of thirty students with a few lessons each is
 * minutes of work the page must not freeze for.
 *
 * The worker sends each record's check as it is done, so a Stop keeps the
 * records checked so far: the promise resolves with them and `stopped` set,
 * rather than rejecting as the other jobs do — half a class checked is still
 * worth reading. Everything crosses by structured clone; nothing leaves the
 * device.
 */
import { appBuildId } from '../build-info';
import { checkResults, type FileCheck, type RecheckInput, type RecordCheck, type ResultsCheck } from './recheck';

export type RecheckReply =
  | { type: 'files'; files: FileCheck[]; total: number }
  | { type: 'record'; record: RecordCheck; done: number; total: number }
  | { type: 'result'; result: ResultsCheck }
  | { type: 'error'; message: string };

/** Progress as it comes: how many records are done, of how many, and the check so far. */
export type RecheckProgress = (done: number, total: number, sofar: ResultsCheck) => void;

export function runRecheckJob(input: RecheckInput, signal: AbortSignal, onProgress: RecheckProgress = () => {}): Promise<ResultsCheck> {
  return new Promise((resolve, reject) => {
    const sofar: ResultsCheck = { app: appBuildId(), files: [], records: [], stopped: false };
    let total = 0;
    if (signal.aborted) { resolve({ ...sofar, stopped: true }); return; }
    let worker: Worker | null = null;
    try {
      worker = typeof Worker === 'function' ? new Worker(new URL('./recheck.worker.ts', import.meta.url), { type: 'module' }) : null;
    } catch { worker = null; }
    if (!worker) {
      // no module workers: here, a record at a time, letting the page draw between them
      checkResults(input, {
        onFiles: (files, n) => { sofar.files = [...files]; total = n; onProgress(0, n, sofar); },
        onRecord: (record, done, n) => { sofar.records.push(record); onProgress(done, n, sofar); },
        stopped: () => signal.aborted,
        pause: () => new Promise((r) => setTimeout(r, 0)),
      }).then(resolve, reject);
      return;
    }
    const w = worker;
    const finish = (): void => { signal.removeEventListener('abort', stop); w.terminate(); };
    const stop = (): void => { finish(); resolve({ ...sofar, stopped: sofar.records.length < total || total === 0 }); };
    signal.addEventListener('abort', stop, { once: true });
    w.onmessage = ({ data }: MessageEvent<RecheckReply>) => {
      switch (data.type) {
        case 'files': sofar.files = data.files; total = data.total; onProgress(0, total, sofar); return;
        case 'record': sofar.records.push(data.record); onProgress(data.done, data.total, sofar); return;
        case 'result': finish(); resolve(data.result); return;
        case 'error': finish(); reject(new Error(data.message)); return;
      }
    };
    w.onerror = (e) => { e.preventDefault(); finish(); reject(new Error(e.message || 'recheck worker failed')); };
    w.postMessage(input);
  });
}
