/**
 * The screening for close approaches (roadmap M01) off the main thread
 * (P2.5): with a whole catalogue imported — some 30 000 objects — the search
 * took tens of seconds before its time filter (src/orbit/screening-filter.ts)
 * and can still take a second or more, which a page must not spend on its own
 * thread. The element sets go to a Web Worker, which makes them ready for SGP4
 * again and screens them (src/orbit/screening.ts); the approaches come back by
 * index. Where no module worker is to be had, the same runs here, a few
 * objects at a time between frames.
 */
import { screenInSlices, type Conjunction } from './screening';
import { skyObjects, type SkyObject } from './real-sky';
import type { ElementSet } from './tle';

export interface ScreeningRequest {
  self: ElementSet;
  others: ElementSet[];
  jd0: number;
  jd1: number;
  within: number;
  radius: number;
}

/** A conjunction as it crosses from the worker: the other object by its index in the request. */
export type ScreenedConjunction = Omit<Conjunction, 'other'> & { index: number };

export type ScreeningReply =
  | { type: 'progress'; fraction: number }
  | { type: 'result'; list: ScreenedConjunction[] }
  | { type: 'error'; message: string };

/** The work itself, wherever it runs: the objects rebuilt from their sets, screened, the others named by index. */
export async function screenSets(req: ScreeningRequest, onProgress: (fraction: number) => boolean | void, yieldTo?: () => Promise<void>): Promise<ScreenedConjunction[] | null> {
  const [self] = skyObjects([req.self], 'imported');
  const others = skyObjects(req.others, 'imported');
  const index = new Map<SkyObject, number>(others.map((o, k) => [o, k]));
  const list = await screenInSlices(self, others, req.jd0, req.jd1, req.within, req.radius, onProgress, yieldTo);
  return list && list.map(({ other, ...c }) => ({ ...c, index: index.get(other)! }));
}

/** Screen `self` against `others` in a worker; resolves with the approaches, their others as objects again. */
export function runScreeningJob(self: SkyObject, others: readonly SkyObject[], jd0: number, jd1: number, within: number, radius: number,
  signal: AbortSignal, onProgress: (fraction: number) => void): Promise<Conjunction[]> {
  const req: ScreeningRequest = { self: self.el, others: others.map((o) => o.el), jd0, jd1, within, radius };
  const back = (list: ScreenedConjunction[]): Conjunction[] => list.map(({ index, ...c }) => ({ ...c, other: others[index] }));
  return new Promise((resolve, reject) => {
    let worker: Worker | null = null;
    try { worker = new Worker(new URL('./screening.worker.ts', import.meta.url), { type: 'module' }); } catch { worker = null; }
    if (!worker) {
      screenSets(req, (f) => { onProgress(f); return !signal.aborted; }).then(
        (list) => (list ? resolve(back(list)) : reject(new DOMException('Cancelled', 'AbortError'))), reject);
      return;
    }
    const w = worker;
    const stop = (): void => { w.terminate(); reject(new DOMException('Cancelled', 'AbortError')); };
    signal.addEventListener('abort', stop, { once: true });
    w.onmessage = ({ data }: MessageEvent<ScreeningReply>) => {
      if (data.type === 'progress') { onProgress(data.fraction); return; }
      signal.removeEventListener('abort', stop);
      w.terminate();
      if (data.type === 'result') resolve(back(data.list)); else reject(new Error(data.message));
    };
    w.onerror = (e) => { signal.removeEventListener('abort', stop); w.terminate(); reject(new Error(e.message)); };
    w.postMessage(req);
  });
}
