/** Compute workers must run without downloading the application's dictionaries. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE, guidanceForVehicle } from '../src/physics/defaults';
import type { ReadinessReply, ReadinessRequest } from '../src/ui/build/readiness-job';

// Fail at module evaluation if either worker acquires any runtime i18n import,
// including one several modules away from the worker entry point.
vi.mock('../src/i18n', () => { throw new Error('Compute workers must not load dictionaries'); });

afterEach(() => vi.unstubAllGlobals());

describe('language-free compute workers', () => {
  it('loads the ratings worker without dictionaries', async () => {
    const worker = { onmessage: null };
    vi.stubGlobal('self', worker);
    await import('../src/ui/build/ratings.worker');
    expect(worker.onmessage).toBeTypeOf('function');
  });

  it('reviews a mission and sends a structured-cloneable verdict without dictionaries', async () => {
    const replies: ReadinessReply[] = [];
    const worker: {
      onmessage: ((event: MessageEvent<ReadinessRequest>) => void) | null;
      postMessage(reply: ReadinessReply): void;
    } = { onmessage: null, postMessage: (reply) => replies.push(structuredClone(reply)) };
    vi.stubGlobal('self', worker);
    await import('../src/ui/build/readiness.worker');
    const spec = vehicleById('falcon9');
    worker.onmessage!({ data: {
      id: 7, vehicleId: spec.id,
      mission: {
        satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'),
        launchTime: new Date('2026-10-02T12:00:00Z'),
        guidance: guidanceForVehicle(spec), guidanceResolved: true,
        failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: 1000,
      },
    } } as MessageEvent<ReadinessRequest>);
    expect(replies).toHaveLength(1);
    const result = replies[0];
    expect(result.id).toBe(7);
    expect(result.type).toBe('result');
    if (result.type !== 'result') throw new Error(result.message);
    expect(result.result.canFly).toBe(true);
    expect(result.result.verdict?.cause).toBe('ready');
    expect(result.result.verdict?.messages.length).toBeGreaterThan(0);
    expect(result.result.verdict).not.toHaveProperty('text');
  });
});
