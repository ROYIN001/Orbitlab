import { describe, expect, it, vi } from 'vitest';
import { runTuneJob, type TuneReply, type TuneWorker } from '../src/physics/tune-job';
import type { AutotuneOutcome } from '../src/physics/autotune';
import { DEFAULT_GUIDANCE } from '../src/physics/defaults';
import type { MissionConfig } from '../src/types';

/** A transport fake: no simulator, browser event loop, or expensive tuning grid. */
class FakeWorker implements TuneWorker {
  onmessage: TuneWorker['onmessage'] = null;
  onerror: TuneWorker['onerror'] = null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
  postMessage = vi.fn<(config: MissionConfig) => void>();
  terminate = vi.fn<() => void>();

  reply(data: TuneReply): void {
    this.onmessage?.({ data } as MessageEvent<TuneReply>);
  }
}

function config(): MissionConfig {
  return {
    vehicleId: 'falcon9', satelliteId: 'comsat', siteId: 'cape',
    orbit: {
      id: 'custom', name: 'Custom target',
      perigee: 300e3, apogee: 35786e3, inclination: 32,
      argPerigee: 180, raanMode: 'fixed', raan: 70,
      description: 'Transport fixture, not a flight acceptance case',
    },
    launchTime: new Date('2026-09-19T10:30:00Z'),
    guidance: { ...DEFAULT_GUIDANCE, kickAngle: 4 }, guidanceResolved: true,
    failure: { mode: 'engineOut', time: 92, stage: 0 },
    boosterRecovery: true, payloadMassOverride: 4500,
  };
}

function outcome(): AutotuneOutcome {
  const guidance = { ...DEFAULT_GUIDANCE, kickAngle: 6, maxTurnRate: 0.6 };
  const best = {
    kickAngle: guidance.kickAngle, maxTurnRate: guidance.maxTurnRate,
    loftAltitude: guidance.loftAltitude, guidance,
    success: true, dvRemaining: 2200, maxQ: 29000,
    minAltitudeClosedLoop: 130e3, tInsertion: 480, reason: 'ok',
    residual: [], missionOnTarget: true, missionMisses: [],
  };
  return { best, results: [best] };
}

function setup() {
  const controller = new AbortController();
  const worker = new FakeWorker();
  const createWorker = vi.fn(() => worker);
  const onProgress = vi.fn();
  const addListener = vi.spyOn(controller.signal, 'addEventListener');
  const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
  const cfg = config();
  const promise = runTuneJob(cfg, controller.signal, onProgress, createWorker);
  const assertReleased = () => {
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.onmessage).toBeNull();
    expect(worker.onerror).toBeNull();
    expect(worker.onmessageerror).toBeNull();
    expect(removeListener).toHaveBeenCalledOnce();
    expect(removeListener).toHaveBeenCalledWith('abort', addListener.mock.calls[0][1]);
  };
  return { controller, worker, onProgress, cfg, promise, assertReleased };
}

describe('tuning worker lifecycle', () => {
  it('forwards the complete requested mission and resolves after progress, releasing its worker', async () => {
    const job = setup();
    expect(job.worker.postMessage).toHaveBeenCalledExactlyOnceWith(job.cfg);
    // Catch accidental request normalization: failures, epoch, recovery and the
    // final target must reach the worker along with the swept guidance values.
    const sent = job.worker.postMessage.mock.calls[0][0];
    expect(sent.failure).toEqual({ mode: 'engineOut', time: 92, stage: 0 });
    expect(sent.orbit).toEqual(job.cfg.orbit);
    expect(sent.launchTime.toISOString()).toBe('2026-09-19T10:30:00.000Z');
    expect(sent.boosterRecovery).toBe(true);
    expect(sent.payloadMassOverride).toBe(4500);
    const progress = { phase: 'mission' as const, completed: 1, total: 5 };
    job.worker.reply({ type: 'progress', progress });
    expect(job.onProgress).toHaveBeenCalledExactlyOnceWith(progress);
    expect(job.worker.terminate).not.toHaveBeenCalled();
    const result = outcome();
    job.worker.reply({ type: 'result', result });
    await expect(job.promise).resolves.toEqual(result);
    job.assertReleased();
    job.controller.abort();
    expect(job.worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('does not create a worker or call progress for a pre-aborted request', async () => {
    const controller = new AbortController();
    controller.abort();
    const createWorker = vi.fn(() => new FakeWorker());
    const progress = vi.fn();
    await expect(runTuneJob(config(), controller.signal, progress, createWorker))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(createWorker).not.toHaveBeenCalled();
    expect(progress).not.toHaveBeenCalled();
  });

  it('cancels immediately and ignores queued callbacks from that job while a new job runs', async () => {
    const oldJob = setup();
    const staleMessage = oldJob.worker.onmessage!;
    const staleError = oldJob.worker.onerror!;
    const rejected = expect(oldJob.promise).rejects.toMatchObject({ name: 'AbortError' });
    oldJob.controller.abort();
    await rejected;
    oldJob.assertReleased();
    const newJob = setup();
    staleMessage({ data: { type: 'progress', progress: { phase: 'ascent', completed: 99, total: 99 } } } as MessageEvent<TuneReply>);
    staleMessage({ data: { type: 'result', result: outcome() } } as MessageEvent<TuneReply>);
    staleError({ message: 'late worker failure' } as ErrorEvent);
    expect(oldJob.onProgress).not.toHaveBeenCalled();
    expect(newJob.onProgress).not.toHaveBeenCalled();
    expect(newJob.worker.terminate).not.toHaveBeenCalled();
    const emptyResult: AutotuneOutcome = { best: null, results: [] };
    newJob.worker.reply({ type: 'result', result: emptyResult });
    await expect(newJob.promise).resolves.toEqual(emptyResult);
    newJob.assertReleased();
    expect(oldJob.worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('does not revive a completed job when captured handlers fire again', async () => {
    const job = setup();
    const message = job.worker.onmessage!;
    const error = job.worker.onerror!;
    const result = outcome();
    job.worker.reply({ type: 'result', result });
    await expect(job.promise).resolves.toEqual(result);
    message({ data: { type: 'progress', progress: { phase: 'ascent', completed: 1, total: 1 } } } as MessageEvent<TuneReply>);
    message({ data: { type: 'error', message: 'late response' } } as MessageEvent<TuneReply>);
    error({ message: 'late runtime failure' } as ErrorEvent);
    expect(job.onProgress).not.toHaveBeenCalled();
    job.assertReleased();
  });

  it.each(['reply', 'runtime'] as const)('rejects a worker %s error and releases resources', async (kind) => {
    const job = setup();
    const rejected = expect(job.promise).rejects.toThrow('worker failed');
    if (kind === 'reply') job.worker.reply({ type: 'error', message: 'worker failed' });
    else job.worker.onerror!({ message: 'worker failed' } as ErrorEvent);
    await rejected;
    job.assertReleased();
  });

  it.each([new Error('clone failed'), 'clone failed'])('cleans up if posting the request throws (%s)', async (error) => {
    const controller = new AbortController();
    const worker = new FakeWorker();
    const removed = vi.spyOn(controller.signal, 'removeEventListener');
    worker.postMessage.mockImplementation(() => { throw error; });
    await expect(runTuneJob(config(), controller.signal, vi.fn(), () => worker)).rejects.toThrow('clone failed');
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.onmessage).toBeNull();
    expect(worker.onerror).toBeNull();
    expect(removed).toHaveBeenCalledOnce();
  });

  it('rejects a worker-construction failure without registering an abort listener', async () => {
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, 'addEventListener');
    await expect(runTuneJob(config(), controller.signal, vi.fn(), () => { throw new Error('worker unavailable'); }))
      .rejects.toThrow('worker unavailable');
    expect(add).not.toHaveBeenCalled();
  });

  it('rechecks cancellation after worker construction and never starts that cancelled work', async () => {
    const controller = new AbortController();
    const worker = new FakeWorker();
    const job = runTuneJob(config(), controller.signal, vi.fn(), () => {
      controller.abort();
      return worker;
    });
    // Assert synchronously first so a missed abort cannot leave this test
    // waiting for the promise until the suite timeout.
    expect(worker.postMessage).not.toHaveBeenCalled();
    await expect(job).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.onmessage).toBeNull();
  });

  it('rejects and releases the worker if the progress consumer throws', async () => {
    const controller = new AbortController();
    const worker = new FakeWorker();
    const job = runTuneJob(config(), controller.signal, () => { throw new Error('progress consumer failed'); }, () => worker);
    const rejected = expect(job).rejects.toThrow('progress consumer failed');
    expect(() => worker.reply({ type: 'progress', progress: { phase: 'ascent', completed: 1, total: 2 } }))
      .not.toThrow();
    await rejected;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.onmessage).toBeNull();
  });

  it('rejects undecodable worker responses instead of leaving the job pending', async () => {
    const job = setup();
    expect(job.worker.onmessageerror).toBeTypeOf('function');
    const rejected = expect(job.promise).rejects.toThrow(/decode/i);
    job.worker.onmessageerror!({ data: undefined } as MessageEvent<unknown>);
    await rejected;
    job.assertReleased();
  });
});
