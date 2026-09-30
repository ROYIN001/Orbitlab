/**
 * The attitude-loop inspector's auto-tune (roadmap E04) off the main thread.
 *
 * The search in `rigid/tuning.ts` is synchronous and checks its answer on every
 * model the flight recorded, so on a long six-DOF flight it held the page for
 * seconds. It runs in a worker here, like the launch pitch tuner
 * (`tune-job.ts`): cancellation terminates the worker, and a run whose inputs
 * changed while it searched is dropped rather than written over the new ones.
 */
import { autoTune, type TuneCase, type TuneResult, type TuneTargets } from './rigid/tuning';

/**
 * One search: the arguments of `autoTune`. Sent as one message, so a plane
 * shared by `cases` and `verify` stays one object after the structured clone —
 * `autoTune` skips the cases it already searched on by that identity.
 */
export interface AttitudeTuneRequest {
  cases: readonly TuneCase[];
  T: number;
  targets: TuneTargets;
  feedForward: number;
  verify: readonly TuneCase[];
}

/** What the worker is searching over, sent once it has the request. */
export interface AttitudeTuneProgress { cases: number; verify: number }

export type AttitudeTuneReply = { type: 'progress'; progress: AttitudeTuneProgress }
  | { type: 'result'; result: TuneResult } | { type: 'error'; message: string };

/** The worker's body, here so it can be run and tested without one. */
export function solveAttitudeTune(request: AttitudeTuneRequest, onProgress: (progress: AttitudeTuneProgress) => void = () => {}): TuneResult {
  onProgress({ cases: request.cases.length, verify: request.verify.length });
  return autoTune(request.cases, request.T, request.targets, request.feedForward, request.verify);
}

/** Small worker contract, injectable for cancellation/race regression tests. */
export interface AttitudeTuneWorker {
  onmessage: ((event: MessageEvent<AttitudeTuneReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(request: AttitudeTuneRequest): void;
  terminate(): void;
}

export const createAttitudeTuneWorker = (): AttitudeTuneWorker =>
  new Worker(new URL('./attitude-tune.worker.ts', import.meta.url), { type: 'module' });

const cancelled = () => new DOMException('Tuning cancelled', 'AbortError');
const asError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

/** One search in a worker of its own; the worker is released however it ends. */
export function runAttitudeTuneJob(request: AttitudeTuneRequest, signal: AbortSignal,
  onProgress: (progress: AttitudeTuneProgress) => void,
  createWorker: () => AttitudeTuneWorker = createAttitudeTuneWorker,
): Promise<TuneResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(cancelled()); return; }
    const worker = createWorker();
    let settled = false;
    const finish = (result?: TuneResult, error?: Error): void => {
      if (settled) return;
      settled = true;
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      signal.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(result!);
    };
    const abort = (): void => finish(undefined, cancelled());
    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }) => {
      if (settled) return;
      try {
        if (data.type === 'progress') onProgress(data.progress);
        else if (data.type === 'error') finish(undefined, new Error(data.message));
        else finish(data.result);
      } catch (error) {
        finish(undefined, asError(error));
      }
    };
    worker.onerror = (event) => finish(undefined, new Error(event.message));
    worker.onmessageerror = () => finish(undefined, new Error('Unable to decode tuning worker response'));
    // An injected factory can abort synchronously; the listener does not replay that.
    if (signal.aborted) { abort(); return; }
    try { worker.postMessage(request); } catch (error) { finish(undefined, asError(error)); }
  });
}

/** How a run ended: its answer, cancelled by the user, dropped because its inputs changed, or failed. */
export type AttitudeTuneEnd = { kind: 'result'; result: TuneResult } | { kind: 'cancelled' } | { kind: 'stale' } | { kind: 'error'; message: string };

export interface AttitudeTuneHandlers {
  onProgress(progress: AttitudeTuneProgress): void;
  /** Called exactly once per run, and never for a run that another has replaced. */
  onEnd(end: AttitudeTuneEnd): void;
}

/**
 * At most one search at a time, each with a run id: only the newest run reports,
 * and it reports once. `inputs` is a signature of what the search was asked
 * (channel, scope, targets, feed-forward, flight); an answer that arrives after
 * the signature changed ends the run as stale instead.
 */
export class AttitudeTuneRunner {
  private run = 0;
  private active: { id: number; controller: AbortController; inputs: string; handlers: AttitudeTuneHandlers } | null = null;

  constructor(private createWorker: () => AttitudeTuneWorker = createAttitudeTuneWorker) {}

  get busy(): boolean { return this.active !== null; }
  /** The signature the running search was started with. */
  get inputs(): string | undefined { return this.active?.inputs; }

  start(request: AttitudeTuneRequest, inputs: string, currentInputs: () => string, handlers: AttitudeTuneHandlers): void {
    this.stop('stale');
    const id = ++this.run, controller = new AbortController();
    const active = { id, controller, inputs, handlers };
    this.active = active;
    const current = () => this.active === active;
    const end = (value: AttitudeTuneEnd) => { if (!current()) return; this.active = null; handlers.onEnd(value); };
    // A worker that cannot be built or sent the request rejects the job like any other failure.
    runAttitudeTuneJob(request, controller.signal, (progress) => { if (current()) handlers.onProgress(progress); }, this.createWorker).then(
      (result) => end(currentInputs() === inputs ? { kind: 'result', result } : { kind: 'stale' }),
      (error: unknown) => end({ kind: 'error', message: asError(error).message }),
    );
  }

  /** Cancel the running search, reporting it at once. */
  cancel(): void { this.stop('cancelled'); }

  /** Drop the running search if what it was asked no longer matches; true when it did. */
  invalidate(inputs: string): boolean {
    if (!this.active || this.active.inputs === inputs) return false;
    this.stop('stale');
    return true;
  }

  private stop(kind: 'cancelled' | 'stale'): void {
    const active = this.active;
    if (!active) return;
    this.active = null;
    active.controller.abort();
    active.handlers.onEnd({ kind });
  }
}
