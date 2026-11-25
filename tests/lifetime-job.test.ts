/**
 * FX-4 s1 (M-ORBIT-005, M-PLATFORM-035; plan S10 §10.7): the lifetime run as
 * a job (src/physics/lifetime-job.ts) never passes a stopped run off as an
 * answer. A Stop given before the run begins rejects with an AbortError and
 * makes no worker; a run stopped part-way where no module worker can be made
 * rejects too, instead of resolving with the orbit as far as the propagator
 * got (which the lifetime window, the satellite bench and a design lesson's
 * key read as "still up after <that time>"). Runs that are not stopped give
 * the propagator's own answer, as before.
 *
 * Node has no `Worker`, so the job takes its inline path unless a test stubs
 * one: `noWorkers` makes the constructor throw, as a browser without module
 * workers does; `FakeWorker` stands for a worker the test answers itself.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MU_EARTH, R_EARTH } from '../src/physics/constants';
import { ECSS_LEVELS } from '../src/physics/propagator/activity';
import { propagate, type PropagationResult } from '../src/physics/propagator/propagate';
import { runLifetimeJob, type LifetimeReply, type LifetimeRequest } from '../src/physics/lifetime-job';

/** A 600 km circular orbit for a year, mean elements: it stays up, so only a Stop can end it early. */
function request(): LifetimeRequest {
  const r = R_EARTH + 600e3;
  return {
    r0: [r, 0, 0], v0: [0, Math.sqrt(MU_EARTH / r), 0], jd0: 2461305.5,
    options: {
      method: 'mean', duration: 365.25 * 86400, samples: 600, tolerance: 1e-9,
      forces: { j2: true, j3j4: false, drag: true, sun: false, moon: false, srp: false, activity: ECSS_LEVELS.moderate },
      spacecraft: { mass: 10, area: 0.134, cd: 2.2, cr: 1.2 },
    },
  };
}

class FakeWorker {
  static made: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<LifetimeReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly posted: unknown[] = [];
  terminated = false;
  constructor() { FakeWorker.made.push(this); }
  postMessage(message: unknown): void { this.posted.push(message); }
  terminate(): void { this.terminated = true; }
  reply(data: LifetimeReply): void { this.onmessage?.({ data } as MessageEvent<LifetimeReply>); }
}
const noWorkers = class { constructor() { throw new Error('no module workers'); } };
const answer: PropagationResult = { samples: [], lifetime: 86400, steps: 1 };

/** The three readers test `e instanceof DOMException && e.name === 'AbortError'`, so a Stop must reject with exactly that. */
async function expectCancelled(job: Promise<unknown>): Promise<void> {
  await expect(job).rejects.toBeInstanceOf(DOMException);
  await expect(job).rejects.toMatchObject({ name: 'AbortError' });
}

beforeEach(() => { FakeWorker.made = []; });
afterEach(() => { vi.unstubAllGlobals(); });

describe('a Stop before the run begins (M-PLATFORM-035)', () => {
  it('rejects with an AbortError and makes no worker', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const stop = new AbortController();
    stop.abort();
    const job = runLifetimeJob(request(), stop.signal, () => {});
    const made = FakeWorker.made.length;
    // a worker made anyway runs on to its answer, since the Stop came before the job listened
    for (const w of FakeWorker.made) w.reply({ type: 'result', result: answer });
    await expectCancelled(job);
    expect(made).toBe(0);
  });

  it('rejects where no module worker can be made, without running a step', async () => {
    vi.stubGlobal('Worker', noWorkers);
    const stop = new AbortController();
    stop.abort();
    const seen: number[] = [];
    await expectCancelled(runLifetimeJob(request(), stop.signal, (f) => seen.push(f)));
    expect(seen).toEqual([]);
  });
});

describe('a Stop part-way where no module worker can be made (M-ORBIT-005)', () => {
  it('rejects with an AbortError, not the orbit as far as the run got', async () => {
    vi.stubGlobal('Worker', noWorkers);
    const stop = new AbortController();
    await expectCancelled(runLifetimeJob(request(), stop.signal, (f) => { if (f > 0.2) stop.abort(); }));
  });
});

describe('runs that are not stopped are as before', () => {
  it('inline: the propagator\'s own answer, its progress rising', async () => {
    vi.stubGlobal('Worker', noWorkers);
    const req = request();
    const seen: number[] = [];
    const res = await runLifetimeJob(req, new AbortController().signal, (f) => seen.push(f));
    expect(res).toEqual(propagate(req.r0, req.v0, req.jd0, req.options));
    expect(seen.length).toBeGreaterThan(10);
    for (let k = 1; k < seen.length; k++) expect(seen[k]).toBeGreaterThan(seen[k - 1]);
  });

  it('in a worker: the request sent, progress passed on, the answer, a failure and a Stop', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const req = request();
    const seen: number[] = [];
    const done = runLifetimeJob(req, new AbortController().signal, (f) => seen.push(f));
    const [w] = FakeWorker.made;
    expect(w.posted).toEqual([req]);
    w.reply({ type: 'progress', fraction: 0.5 });
    w.reply({ type: 'result', result: answer });
    await expect(done).resolves.toBe(answer);
    expect(seen).toEqual([0.5]);
    expect(w.terminated).toBe(true);

    const failed = runLifetimeJob(req, new AbortController().signal, () => {});
    FakeWorker.made[1].reply({ type: 'error', message: 'step too small' });
    await expect(failed).rejects.toThrow('step too small');

    const stop = new AbortController();
    const stopped = runLifetimeJob(req, stop.signal, () => {});
    stop.abort();
    await expectCancelled(stopped);
    expect(FakeWorker.made[2].terminated).toBe(true);
  });
});
