import { describe, expect, it, vi } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { defaultMonteCarlo } from '../src/physics/monte-carlo';
import { MonteCarloJob, type MonteCarloReply, type MonteCarloWorker } from '../src/physics/monte-carlo-job';
import type { MissionConfig } from '../src/types';

const mission = (): MissionConfig => ({
  vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'),
  launchTime: new Date('2026-09-15T12:00:00Z'),
  guidance: guidanceForVehicle(vehicleById('falcon9'), DEFAULT_GUIDANCE, 'sixDof'), guidanceResolved: true,
  failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
  dynamics: { model: 'sixDof', wind: 'crosswind', seed: 20260919 },
});

function worker(): MonteCarloWorker {
  return { onmessage: null, onerror: null, postMessage: vi.fn(), terminate: vi.fn() };
}
function complete(w: MonteCarloWorker, index = 0): void {
  w.onmessage?.({ data: { type: 'error', index, law: 'standard', message: 'named flight error' } } as MessageEvent<MonteCarloReply>);
}
function released(w: MonteCarloWorker): void {
  expect(w.terminate).toHaveBeenCalledOnce();
  expect(w.onmessage).toBeNull();
  expect(w.onerror).toBeNull();
}

describe('Monte Carlo worker failures release the pool (audit 2026-09-29)', () => {
  it('terminates already-created workers when constructing the next worker throws', () => {
    const first = worker();
    const createWorker = vi.fn().mockReturnValueOnce(first).mockImplementationOnce(() => { throw new Error('factory blocked'); });
    expect(() => new MonteCarloJob(mission(), { ...defaultMonteCarlo(), runs: 4 }, { workers: 2, createWorker })).toThrow('factory blocked');
    released(first);
  });

  it('terminates the partially constructed pool when the initial dispatch throws', () => {
    const first = worker(), second = worker();
    second.postMessage = vi.fn(() => { throw new Error('dispatch blocked'); });
    const createWorker = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    expect(() => new MonteCarloJob(mission(), { ...defaultMonteCarlo(), runs: 4 }, { workers: 2, createWorker })).toThrow('dispatch blocked');
    released(first);
    released(second);
  });

  it('loses the run and retires the worker when dispatching its next run throws, and flies on with the rest', () => {
    const first = worker(), second = worker();
    first.postMessage = vi.fn().mockImplementationOnce(() => {}).mockImplementationOnce(() => { throw new Error('later dispatch blocked'); });
    const createWorker = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const job = new MonteCarloJob(mission(), { ...defaultMonteCarlo(), runs: 4 }, { workers: 2, createWorker });
    complete(first);
    expect(job.state).toBe('running');
    expect(job.runs).toEqual([
      expect.objectContaining({ index: 0, outcome: 'lost', reason: 'error: named flight error' }),
      expect.objectContaining({ index: 2, outcome: 'lost', reason: 'error: later dispatch blocked' }),
    ]);
    released(first);
    complete(second, 1);
    complete(second, 3);
    expect(job.state).toBe('done');
    expect(job.runs).toHaveLength(4);
    expect(job.finishedAt).toBeDefined();
    released(second);
  });

  it('ends the set as failed, completed results kept, when the last worker crashes and cannot be replaced', () => {
    const first = worker();
    const createWorker = vi.fn().mockReturnValueOnce(first).mockImplementationOnce(() => { throw new Error('replacement blocked'); });
    const job = new MonteCarloJob(mission(), { ...defaultMonteCarlo(), runs: 4 }, { workers: 1, createWorker });
    complete(first);
    first.onerror?.({ message: 'worker crashed', preventDefault() {} } as ErrorEvent);
    expect(job.state).toBe('failed');
    expect(job.error).toBe('replacement blocked');
    expect(job.runs).toEqual([
      expect.objectContaining({ index: 0, reason: 'error: named flight error' }),
      expect.objectContaining({ index: 1, outcome: 'lost', reason: 'error: worker crashed' }),
    ]);
    expect(job.progress()).toEqual({ done: 2, total: 4, etaS: null });
    released(first);
  });

  it('ignores callbacks already queued when the user stops the job', () => {
    const first = worker();
    const job = new MonteCarloJob(mission(), { ...defaultMonteCarlo(), runs: 4 }, { workers: 1, createWorker: () => first });
    const staleCallback = first.onmessage!;
    job.stop();
    staleCallback({ data: { type: 'error', index: 0, law: 'standard', message: 'late result' } } as MessageEvent<MonteCarloReply>);
    job.stop();
    expect(job.runs).toEqual([]);
    expect(job.state).toBe('stopped');
    released(first);
  });
});
