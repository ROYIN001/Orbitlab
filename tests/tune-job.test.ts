import { describe, expect, it, vi } from 'vitest';
import { runTuneJob, type TuneReply, type TuneWorker } from '../src/physics/tune-job';
import type { AutotuneOutcome } from '../src/physics/autotune';
import { DEFAULT_GUIDANCE } from '../src/physics/defaults';
import type { MissionConfig } from '../src/types';
import { AttitudeTuneRunner, runAttitudeTuneJob, solveAttitudeTune,
  type AttitudeTuneEnd, type AttitudeTuneReply, type AttitudeTuneRequest, type AttitudeTuneWorker } from '../src/physics/attitude-tune-job';
import { autoTune, type TuneResult } from '../src/physics/rigid/tuning';
import type { PlaneModel } from '../src/physics/rigid/linear';

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

// ─── the attitude-loop inspector's auto-tune (audit 2026-09-27 A17) ─────────

class FakeAttitudeWorker implements AttitudeTuneWorker {
  onmessage: AttitudeTuneWorker['onmessage'] = null;
  onerror: AttitudeTuneWorker['onerror'] = null;
  onmessageerror: AttitudeTuneWorker['onmessageerror'] = null;
  postMessage = vi.fn<(request: AttitudeTuneRequest) => void>();
  terminate = vi.fn<() => void>();

  reply(data: AttitudeTuneReply): void {
    this.onmessage?.({ data } as MessageEvent<AttitudeTuneReply>);
  }
  released(): boolean {
    return this.terminate.mock.calls.length === 1 && !this.onmessage && !this.onerror && !this.onmessageerror;
  }
}

/** A rigid double integrator behind a gimbal lag, at inertia `I` (kg·m²). */
function plant(I: number): PlaneModel {
  return { axis: 'z', n: 2, states: ['angle', 'rate'], A: [0, 1, 0, 0], B: [0, 1 / I], cAngle: [1, 0], cRate: [0, 1], cAero: [0, 0],
    actuator: 'engines', tau: 0.1 + I / 1e9, inertia: I, kTheta: 1.5, kOmega: 3 };
}

function attitudeRequest(): AttitudeTuneRequest {
  const planes = [1e6, 3e6, 1e7, 3e7, 6e7].map(plant);
  const verify = planes.map((p, i) => ({ t: 10 * i, plane: p }));
  // The search cases are other objects holding the same planes, as tuneCases gives them.
  return { cases: [verify[0], verify[2], verify[4]].map((c) => ({ ...c })), T: 0.01, targets: { pmDeg: 45, gmDb: 6 }, feedForward: 1, verify };
}

const tuneResult = (kTheta = 1): TuneResult => ({ gains: { kTheta, kOmega: 3, feedForward: 1 }, feasible: true, worst: { t: 0, stable: true }, cases: 5 });

describe('attitude auto-tune worker job', () => {
  it('sends the whole request once, forwards progress, and releases its worker with the answer', async () => {
    const controller = new AbortController(), worker = new FakeAttitudeWorker(), progress = vi.fn();
    const request = attitudeRequest();
    const job = runAttitudeTuneJob(request, controller.signal, progress, () => worker);
    expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith(request);
    worker.reply({ type: 'progress', progress: { cases: 3, verify: 5 } });
    expect(progress).toHaveBeenCalledExactlyOnceWith({ cases: 3, verify: 5 });
    expect(worker.terminate).not.toHaveBeenCalled();
    worker.reply({ type: 'result', result: tuneResult() });
    await expect(job).resolves.toEqual(tuneResult());
    expect(worker.released()).toBe(true);
  });

  it('terminates the worker at once when cancelled, and ignores what it sends afterwards', async () => {
    const controller = new AbortController(), worker = new FakeAttitudeWorker(), progress = vi.fn();
    const job = runAttitudeTuneJob(attitudeRequest(), controller.signal, progress, () => worker);
    const late = worker.onmessage!;
    const rejected = expect(job).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    expect(worker.released()).toBe(true);
    await rejected;
    late({ data: { type: 'progress', progress: { cases: 1, verify: 1 } } } as MessageEvent<AttitudeTuneReply>);
    late({ data: { type: 'result', result: tuneResult() } } as MessageEvent<AttitudeTuneReply>);
    expect(progress).not.toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it.each(['reply', 'runtime', 'decode', 'post'] as const)('rejects a %s failure and releases the worker', async (kind) => {
    const worker = new FakeAttitudeWorker();
    if (kind === 'post') worker.postMessage.mockImplementation(() => { throw new Error('clone failed'); });
    const job = runAttitudeTuneJob(attitudeRequest(), new AbortController().signal, vi.fn(), () => worker);
    const rejected = expect(job).rejects.toThrow();
    if (kind === 'reply') worker.reply({ type: 'error', message: 'search failed' });
    else if (kind === 'runtime') worker.onerror!({ message: 'worker crashed' } as ErrorEvent);
    else if (kind === 'decode') worker.onmessageerror!({ data: undefined } as MessageEvent<unknown>);
    await rejected;
    expect(worker.released()).toBe(true);
  });

  it('does not build a worker for a request cancelled before it starts, and rejects one that cannot be built', async () => {
    const controller = new AbortController();
    controller.abort();
    const create = vi.fn(() => new FakeAttitudeWorker());
    await expect(runAttitudeTuneJob(attitudeRequest(), controller.signal, vi.fn(), create)).rejects.toMatchObject({ name: 'AbortError' });
    expect(create).not.toHaveBeenCalled();
    await expect(runAttitudeTuneJob(attitudeRequest(), new AbortController().signal, vi.fn(), () => { throw new Error('no workers'); }))
      .rejects.toThrow('no workers');
  });

  it('answers in the worker exactly as on the main thread, the structured clone keeping the shared planes', () => {
    const request = attitudeRequest();
    const direct = autoTune(request.cases, request.T, request.targets, request.feedForward, request.verify);
    const cloned = structuredClone(request);
    expect(cloned.cases[1].plane).toBe(cloned.verify[2].plane);
    const progress = vi.fn();
    expect(solveAttitudeTune(cloned, progress)).toEqual(direct);
    expect(progress).toHaveBeenCalledExactlyOnceWith({ cases: 3, verify: 5 });
  });
});

describe('attitude auto-tune runner: run identity, cancellation and stale answers', () => {
  function runner() {
    const workers: FakeAttitudeWorker[] = [];
    const tuner = new AttitudeTuneRunner(() => { const w = new FakeAttitudeWorker(); workers.push(w); return w; });
    const handlers = () => ({ onProgress: vi.fn(), onEnd: vi.fn<(end: AttitudeTuneEnd) => void>() });
    return { tuner, workers, handlers };
  }
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('reports progress and then the answer once, while the inputs still match', async () => {
    const { tuner, workers, handlers } = runner(), h = handlers();
    tuner.start(attitudeRequest(), 'a', () => 'a', h);
    expect(tuner.busy).toBe(true);
    expect(tuner.inputs).toBe('a');
    workers[0].reply({ type: 'progress', progress: { cases: 3, verify: 5 } });
    workers[0].reply({ type: 'result', result: tuneResult(2) });
    await settle();
    expect(h.onProgress).toHaveBeenCalledOnce();
    expect(h.onEnd).toHaveBeenCalledExactlyOnceWith({ kind: 'result', result: tuneResult(2) });
    expect(tuner.busy).toBe(false);
    expect(workers[0].released()).toBe(true);
  });

  it('drops an answer that arrives after the inputs changed', async () => {
    const { tuner, workers, handlers } = runner(), h = handlers();
    let inputs = 'pitch';
    tuner.start(attitudeRequest(), inputs, () => inputs, h);
    inputs = 'roll';
    workers[0].reply({ type: 'result', result: tuneResult() });
    await settle();
    expect(h.onEnd).toHaveBeenCalledExactlyOnceWith({ kind: 'stale' });
  });

  it('cancels at once: the worker is terminated, cancellation is reported once, and nothing from that run follows', async () => {
    const { tuner, workers, handlers } = runner(), h = handlers();
    tuner.start(attitudeRequest(), 'a', () => 'a', h);
    const late = workers[0].onmessage!;
    tuner.cancel();
    expect(h.onEnd).toHaveBeenCalledExactlyOnceWith({ kind: 'cancelled' });
    expect(tuner.busy).toBe(false);
    expect(workers[0].released()).toBe(true);
    late({ data: { type: 'progress', progress: { cases: 1, verify: 1 } } } as MessageEvent<AttitudeTuneReply>);
    late({ data: { type: 'result', result: tuneResult() } } as MessageEvent<AttitudeTuneReply>);
    await settle();
    expect(h.onProgress).not.toHaveBeenCalled();
    expect(h.onEnd).toHaveBeenCalledOnce();
    tuner.cancel();
    expect(h.onEnd).toHaveBeenCalledOnce();
  });

  it('invalidates a run whose inputs no longer match, and keeps one that still does', async () => {
    const { tuner, workers, handlers } = runner(), h = handlers();
    tuner.start(attitudeRequest(), 'a', () => 'a', h);
    expect(tuner.invalidate('a')).toBe(false);
    expect(tuner.busy).toBe(true);
    expect(tuner.invalidate('b')).toBe(true);
    expect(h.onEnd).toHaveBeenCalledExactlyOnceWith({ kind: 'stale' });
    expect(workers[0].released()).toBe(true);
    expect(tuner.invalidate('c')).toBe(false);
    await settle();
    expect(h.onEnd).toHaveBeenCalledOnce();
  });

  it('ends the previous run as stale when a new one starts, and reports only the new one\'s answer', async () => {
    const { tuner, workers, handlers } = runner(), first = handlers(), second = handlers();
    tuner.start(attitudeRequest(), 'a', () => 'b', first);
    const late = workers[0].onmessage!;
    tuner.start(attitudeRequest(), 'b', () => 'b', second);
    expect(first.onEnd).toHaveBeenCalledExactlyOnceWith({ kind: 'stale' });
    late({ data: { type: 'result', result: tuneResult(9) } } as MessageEvent<AttitudeTuneReply>);
    workers[1].reply({ type: 'result', result: tuneResult(4) });
    await settle();
    expect(first.onEnd).toHaveBeenCalledOnce();
    expect(second.onEnd).toHaveBeenCalledExactlyOnceWith({ kind: 'result', result: tuneResult(4) });
  });

  it('reports a worker that cannot be built or fails as an error, once', async () => {
    const failing = new AttitudeTuneRunner(() => { throw new Error('no workers'); }), h = { onProgress: vi.fn(), onEnd: vi.fn() };
    failing.start(attitudeRequest(), 'a', () => 'a', h);
    await settle();
    expect(h.onEnd).toHaveBeenCalledExactlyOnceWith({ kind: 'error', message: 'no workers' });
    expect(failing.busy).toBe(false);
    const { tuner, workers, handlers } = runner(), g = handlers();
    tuner.start(attitudeRequest(), 'a', () => 'a', g);
    workers[0].onerror!({ message: 'worker crashed' } as ErrorEvent);
    await settle();
    expect(g.onEnd).toHaveBeenCalledExactlyOnceWith({ kind: 'error', message: 'worker crashed' });
    expect(workers[0].released()).toBe(true);
  });
});
