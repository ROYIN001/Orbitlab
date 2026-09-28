/**
 * The flight readiness review (roadmap D04; src/design/readiness.ts) off the
 * main thread. A review of a vehicle of one's own always flies its probe, a
 * headless point-mass flight of 7–95 ms on a laptop and several times that on
 * a school tablet, and the review runs again on every change the student
 * makes; so it runs in a Web Worker, one for the panel's life, and the page
 * keeps drawing while it flies. A newer review supersedes an older one: the
 * older one's answer is dropped when it arrives (it costs at most one probe,
 * so it is not worth killing the worker for). Where no module worker is to be
 * had, the review runs here, after the screen has painted its progress line.
 *
 * A catalogue vehicle is sent by its id, not its spec: the review knows the
 * catalogue by identity (`isCatalogueEntry`), and a copy that crossed into
 * the worker would be reviewed as a vehicle of one's own.
 *
 * The worker has no reader's language: the review's one text, the verdict's,
 * comes back in English and the caller says it again (`readinessVerdict`).
 */
import type { VehicleSpec } from '../../types';
import { readiness, type Readiness, type ReadinessMission } from '../../design/readiness';
import { isCatalogueEntry } from '../../design/warnings';

export interface ReadinessRequest {
  id: number;
  vehicleId?: string;
  spec?: VehicleSpec;
  mission: ReadinessMission;
}

export type ReadinessReply =
  | { id: number; type: 'result'; result: Readiness }
  | { id: number; type: 'error'; message: string };

const superseded = (): DOMException => new DOMException('Superseded', 'AbortError');

export class ReadinessRunner {
  /** undefined until first asked for; null where no module worker can be made */
  private worker: Worker | null | undefined;
  private seq = 0;
  private waiting: { id: number; resolve: (r: Readiness) => void; reject: (e: unknown) => void } | null = null;

  /** Review `spec` for `mission`; an earlier review still waiting is rejected with an AbortError. */
  run(spec: VehicleSpec, mission: ReadinessMission): Promise<Readiness> {
    this.cancel();
    const id = ++this.seq;
    return new Promise<Readiness>((resolve, reject) => {
      this.waiting = { id, resolve, reject };
      const w = this.ensureWorker();
      if (!w) {
        setTimeout(() => {
          if (this.waiting?.id !== id) return;
          this.waiting = null;
          try { resolve(readiness(spec, mission)); } catch (e) { reject(e); }
        }, 30);
        return;
      }
      const req: ReadinessRequest = isCatalogueEntry(spec) ? { id, vehicleId: spec.id, mission } : { id, spec, mission };
      w.postMessage(req);
    });
  }

  /** Drop the review waiting, if any. */
  cancel(): void {
    const w = this.waiting;
    this.waiting = null;
    w?.reject(superseded());
  }

  dispose(): void {
    this.cancel();
    this.worker?.terminate();
    this.worker = undefined;
  }

  private ensureWorker(): Worker | null {
    if (this.worker !== undefined) return this.worker;
    try {
      const w = new Worker(new URL('./readiness.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = ({ data }: MessageEvent<ReadinessReply>) => {
        const waiting = this.waiting;
        if (!waiting || waiting.id !== data.id) return;
        this.waiting = null;
        if (data.type === 'result') waiting.resolve(data.result);
        else waiting.reject(new Error(data.message));
      };
      w.onerror = (e) => {
        // a worker that cannot run at all: this review and every later one on this thread
        e.preventDefault();
        this.worker?.terminate();
        this.worker = null;
        const waiting = this.waiting;
        this.waiting = null;
        waiting?.reject(new Error(e.message || 'readiness worker failed'));
      };
      this.worker = w;
    } catch {
      this.worker = null;
    }
    return this.worker;
  }
}
