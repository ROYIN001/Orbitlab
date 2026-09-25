/**
 * A Monte Carlo set (roadmap G05) flown in a pool of workers, one run at a time per worker, so the
 * page stays responsive and the results arrive as they are flown. DOM-free: the worker factory is
 * injected (tests fly the runs in-process), and `MonteCarloJob` is what the window and the WebMCP
 * tool both read.
 */
import type { MissionConfig, VehicleSpec } from '../types';
import { vehicleById } from '../data/vehicles';
import {
  drawLayout, missionTargetsOf, monteCarloCsv, monteCarloLaws, summarizeMonteCarlo,
  type DrawSlot, type GuidanceLaw, type InsertionTarget, type MeasurePoint, type MonteCarloConfig, type MonteCarloRun, type MonteCarloSummary,
} from './monte-carlo';

export interface MonteCarloRequest { cfg: MissionConfig; mc: MonteCarloConfig; index: number; law: GuidanceLaw }
export type MonteCarloReply = { type: 'run'; run: MonteCarloRun } | { type: 'error'; index: number; law: GuidanceLaw; message: string };

/** The worker contract, injectable for tests. */
export interface MonteCarloWorker {
  onmessage: ((event: MessageEvent<MonteCarloReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(request: MonteCarloRequest): void;
  terminate(): void;
}
export const createMonteCarloWorker = (): MonteCarloWorker =>
  new Worker(new URL('./monte-carlo.worker.ts', import.meta.url), { type: 'module' }) as unknown as MonteCarloWorker;

/** Workers to fly with: all the machine's cores but one (the page's), at most 16. */
export function defaultWorkerCount(): number {
  const cores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency > 0 ? navigator.hardwareConcurrency : 2;
  return Math.max(1, Math.min(16, cores - 1));
}

export type MonteCarloState = 'running' | 'done' | 'stopped';

export class MonteCarloJob {
  readonly runs: MonteCarloRun[] = [];
  readonly spec: VehicleSpec;
  readonly layout: DrawSlot[];
  /** what the runs are aimed at, at the end of the mission and at the ascent's cut-off */
  readonly targets: Record<MeasurePoint, InsertionTarget>;
  readonly laws: GuidanceLaw[];
  readonly total: number;
  readonly startedAt = Date.now();
  finishedAt?: number;
  state: MonteCarloState = 'running';
  private queue: { index: number; law: GuidanceLaw }[] = [];
  private workers: MonteCarloWorker[] = [];
  /** the run each worker is flying */
  private current = new Map<MonteCarloWorker, { index: number; law: GuidanceLaw }>();
  private cached?: { n: number; summary: MonteCarloSummary };

  constructor(readonly cfg: MissionConfig, readonly mc: MonteCarloConfig, private readonly options: {
    workers?: number; createWorker?: () => MonteCarloWorker; onChange?: (job: MonteCarloJob) => void; now?: () => number;
  } = {}) {
    this.spec = vehicleById(cfg.vehicleId);
    this.layout = drawLayout(this.spec);
    if (cfg.orbit.suborbital) throw new Error('A Monte Carlo set reads orbits: a suborbital target has none.');
    this.targets = missionTargetsOf(cfg);
    this.laws = monteCarloLaws(cfg, mc);
    // Every law flies run k before any flies run k + 1, so a set stopped early still compares like with like.
    for (let index = 0; index < mc.runs; index++) for (const law of this.laws) this.queue.push({ index, law });
    this.total = this.queue.length;
    const count = Math.max(1, Math.min(options.workers ?? defaultWorkerCount(), this.total));
    for (let i = 0; i < count; i++) this.spawn();
  }

  get workerCount(): number { return this.workers.length; }

  private spawn(): void {
    const worker = (this.options.createWorker ?? createMonteCarloWorker)();
    this.workers.push(worker);
    worker.onmessage = ({ data }) => this.received(worker, data);
    worker.onerror = (event) => {
      event.preventDefault?.();
      // A worker that died takes its run with it: record the run as lost and fly on with a fresh worker.
      const job = this.current.get(worker);
      if (this.state !== 'running' || !job) return;
      worker.onmessage = null; worker.onerror = null; worker.terminate();
      this.workers = this.workers.filter((w) => w !== worker);
      this.received(worker, { type: 'error', ...job, message: event.message || 'worker error' }, false);
      if (this.state === 'running' && this.queue.length) this.spawn();
    };
    this.next(worker);
  }

  private next(worker: MonteCarloWorker): void {
    if (this.state !== 'running') return;
    const job = this.queue.shift();
    if (!job) { if (this.current.size === 0) this.finish('done'); return; }
    this.current.set(worker, job);
    worker.postMessage({ cfg: this.cfg, mc: this.mc, index: job.index, law: job.law });
  }

  private received(worker: MonteCarloWorker, reply: MonteCarloReply, fliesOn = true): void {
    if (this.state !== 'running') return;
    this.current.delete(worker);
    if (reply.type === 'run') this.runs.push(reply.run);
    else {
      // A run the physics threw on is a lost run, with the message as its reason: one bad run must not end a set.
      this.runs.push({ index: reply.index, law: reply.law, outcome: 'lost', reason: `error: ${reply.message}`, onTarget: false,
        maxQkPa: NaN, maxQAlpha: NaN, z: [], ms: 0 });
    }
    this.options.onChange?.(this);
    if (fliesOn) this.next(worker);
    else if (this.state === 'running' && !this.queue.length && this.current.size === 0) this.finish('done');
  }

  private finish(state: MonteCarloState): void {
    if (this.state !== 'running') return;
    this.state = state;
    this.finishedAt = (this.options.now ?? Date.now)();
    for (const w of this.workers) { w.onmessage = null; w.onerror = null; w.terminate(); }
    this.options.onChange?.(this);
  }

  stop(): void { this.finish('stopped'); }

  /** Runs flown, of the set's total; the time left from the mean run time and the workers flying. */
  progress(): { done: number; total: number; etaS: number | null } {
    const done = this.runs.length, flown = this.runs.filter((r) => r.ms > 0);
    const mean = flown.length ? flown.reduce((a, r) => a + r.ms, 0) / flown.length : NaN;
    const left = this.total - done;
    return { done, total: this.total, etaS: this.state === 'running' && Number.isFinite(mean) ? left * mean / 1000 / Math.max(1, this.workers.length) : null };
  }

  summary(): MonteCarloSummary {
    if (this.cached?.n !== this.runs.length) this.cached = { n: this.runs.length, summary: summarizeMonteCarlo(this.runs, this.layout, this.mc.dispersions, this.targets) };
    return this.cached.summary;
  }

  csv(): string { return monteCarloCsv(this.runs, this.layout, this.mc.dispersions); }
}
