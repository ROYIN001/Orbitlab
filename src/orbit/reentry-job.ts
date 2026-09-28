/**
 * A re-entry prediction (roadmap M03) off the main thread (P2.5): fitting the
 * ballistic coefficient to a history of element sets runs the orbit down a
 * dozen times, and an eccentric orbit is carried by Cowell with the Sun and
 * the Moon — seconds, either of them, which a page must not spend on its own
 * thread. The element sets go to a Web Worker, which fits B where it is asked
 * to (src/orbit/ballistic.ts) and predicts from the latest set
 * (src/orbit/reentry.ts). Where no module worker is to be had, the same runs
 * here after a frame.
 */
import { propagate } from '../physics/propagator/propagate';
import type { Activity } from '../physics/propagator/activity';
import type { Spacecraft } from '../physics/propagator/forces';
import { ballisticFromDecayRate, ballisticFromSets, craftOfB } from './ballistic';
import { reentryOf, reentryRun, type Reentry } from './reentry';
import type { ElementSet } from './tle';

/** How the drag is had: fitted to the latest set's decay rate, fitted to a history of sets, or from the mass and size given. */
export type DragFrom = 'decay' | 'history' | 'size';

export interface ReentryRequest {
  /** the object's element sets, any order; the prediction starts from the latest */
  sets: ElementSet[];
  from: DragFrom;
  /** for `size` */
  craft: Omit<Spacecraft, 'cr'>;
  activity: Activity;
  horizonDays: number;
}

/** The ballistic coefficient used, m²/kg, and the prediction; a null prediction when the fit found no B. */
export interface ReentryAnswer { b: number | null; reentry: Reentry | null }

export type ReentryReply =
  | { type: 'progress'; fraction: number }
  | { type: 'result'; answer: ReentryAnswer }
  | { type: 'error'; message: string };

const epochOf = (el: ElementSet): number => el.jdEpoch + el.jdEpochFrac;

/** The work itself, wherever it runs. */
export function predictFromRequest(req: ReentryRequest, onProgress: (fraction: number) => boolean | void): ReentryAnswer {
  const latest = req.sets.reduce((p, q) => (epochOf(q) > epochOf(p) ? q : p));
  let craft = req.craft, b: number | null = (req.craft.cd * req.craft.area) / req.craft.mass;
  if (req.from !== 'size') {
    b = req.from === 'history' ? ballisticFromSets(req.sets, req.activity) : ballisticFromDecayRate(latest, req.activity);
    if (b === null) return { b: null, reentry: null };
    craft = craftOfB(b);
  }
  const run = reentryRun(latest, craft, req.activity, req.horizonDays);
  return { b, reentry: reentryOf(run, propagate(run.r0, run.v0, run.jd0, { ...run.options, onProgress })) };
}

/** Predict in a worker; resolves with the answer. */
export function runReentryJob(req: ReentryRequest, signal: AbortSignal, onProgress: (fraction: number) => void): Promise<ReentryAnswer> {
  return new Promise((resolve, reject) => {
    let worker: Worker | null = null;
    try { worker = new Worker(new URL('./reentry.worker.ts', import.meta.url), { type: 'module' }); } catch { worker = null; }
    if (!worker) {
      setTimeout(() => {
        try { resolve(predictFromRequest(req, (f) => { onProgress(f); return !signal.aborted; })); } catch (e) { reject(e); }
      }, 0);
      return;
    }
    const w = worker;
    const stop = (): void => { w.terminate(); reject(new DOMException('Cancelled', 'AbortError')); };
    signal.addEventListener('abort', stop, { once: true });
    w.onmessage = ({ data }: MessageEvent<ReentryReply>) => {
      if (data.type === 'progress') { onProgress(data.fraction); return; }
      signal.removeEventListener('abort', stop);
      w.terminate();
      if (data.type === 'result') resolve(data.answer); else reject(new Error(data.message));
    };
    w.onerror = (e) => { signal.removeEventListener('abort', stop); w.terminate(); reject(new Error(e.message)); };
    w.postMessage(req);
  });
}
