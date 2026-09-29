/**
 * Where the app's data come from (roadmap S04): one interface, `DataProvider`,
 * and two ways to be one.
 *
 * - **Offline** reads the snapshots bundled with the build under `public/data/`
 *   (precached by the service worker like every other file, so they are there
 *   with no network at all), each marked with the time of its newest reading.
 * - **Online** fetches each dataset from its source with a timeout and, on any
 *   failure — no network, a refused request, a slow server, an answer in a
 *   shape it does not expect — falls back to the snapshot and says why.
 *
 * DOM-free: the fetch is passed in, so the whole of it runs under test with
 * fakes (tests/data-provider.test.ts), and a later intranet or cloud source is
 * one more implementation of the same interface. The lifetime model reads the
 * space weather through it (R05); the flight reads no dataset.
 */
import type { DataMode } from './data-mode';
import { DATASETS, type DatasetId, type DatasetSource, type DatasetTypes } from './datasets';

export const SNAPSHOT_FORMAT = 'orbitlab.snapshot';
export const SNAPSHOT_VERSION = 1;

/** A bundled snapshot file. */
export interface Snapshot<T> {
  format: typeof SNAPSHOT_FORMAT;
  version: number;
  dataset: DatasetId;
  /** ISO 8601 UTC: the newest reading in it — the "data as of" */
  asOf: string;
  /** ISO 8601 UTC: when it was fetched from the source */
  fetched: string;
  source: DatasetSource;
  data: T;
}

export interface Dataset<T> {
  id: DatasetId;
  data: T;
  /** ISO 8601 UTC: the newest reading — shown as "data as of" */
  asOf: string;
  /** where these data came from this time */
  from: 'snapshot' | 'online';
  source: DatasetSource;
  /** online mode fell back to the snapshot: why */
  fallback?: string;
  /** online, but some parts are the snapshot's because their answers failed (P2.5): which, and why */
  partial?: { parts: string[]; reason: string };
  /** online data kept from an earlier fetch (a dataset with `minIntervalMs`): when they were fetched, ISO 8601 UTC */
  fetched?: string;
}

export interface DataProvider {
  readonly mode: DataMode;
  load<K extends DatasetId>(id: K, signal?: AbortSignal): Promise<Dataset<DatasetTypes[K]>>;
}

/** The slice of `fetch` the providers use. */
export type Fetcher = (url: string, init: { signal: AbortSignal; cache?: RequestCache }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** How long an online source may take before its snapshot answers instead, ms. */
export const ONLINE_TIMEOUT_MS = 8000;

/**
 * How long the bundled snapshot may take, ms (P2.5). It comes from the server
 * the page came from and nothing stands behind it, so its limit is for a
 * server that hangs, not for a slow source: a phone still starting the page
 * (the satellites' snapshot is 1 MB of JSON to read), or an intranet at
 * 150 kbit/s, must not lose the data. Under the online limit, a case lesson
 * opened from its link in Chromium lost the catalogue while the page was
 * still busy starting.
 */
export const SNAPSHOT_TIMEOUT_MS = 60_000;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isoTime = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));

/** A snapshot file's JSON, checked: the right format, version and dataset, and data that pass the dataset's own check. */
export function parseSnapshot<K extends DatasetId>(raw: unknown, id: K): Snapshot<DatasetTypes[K]> {
  if (!isObj(raw) || raw.format !== SNAPSHOT_FORMAT) throw new Error('not a snapshot');
  if (raw.version !== SNAPSHOT_VERSION) throw new Error(`snapshot version ${String(raw.version)}`);
  if (raw.dataset !== id) throw new Error(`a snapshot of ${String(raw.dataset)}, not ${id}`);
  if (!isoTime(raw.asOf) || !isoTime(raw.fetched)) throw new Error('snapshot without its dates');
  if (!DATASETS[id].valid(raw.data)) throw new Error('snapshot data malformed');
  return raw as unknown as Snapshot<DatasetTypes[K]>;
}

/** A snapshot for a dataset, as `scripts/refresh-snapshots.ts` writes it. */
export function makeSnapshot<K extends DatasetId>(id: K, data: DatasetTypes[K], asOf: string, fetched: Date): Snapshot<DatasetTypes[K]> {
  return { format: SNAPSHOT_FORMAT, version: SNAPSHOT_VERSION, dataset: id, asOf, fetched: fetched.toISOString(), source: DATASETS[id].source, data };
}

/** Run `work` with a signal that aborts after `ms`, or when `outer` does. */
async function withTimeout<T>(ms: number, outer: AbortSignal | undefined, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(new Error(`no answer within ${ms / 1000} s`)), ms);
  const onOuter = () => ctl.abort(outer?.reason);
  if (outer?.aborted) ctl.abort(outer.reason);
  else outer?.addEventListener('abort', onOuter, { once: true });
  try { return await work(ctl.signal); }
  finally { clearTimeout(timer); outer?.removeEventListener('abort', onOuter); }
}

/** The bundled snapshots: nothing leaves the machine (or the intranet the app is served from). */
export class OfflineProvider implements DataProvider {
  readonly mode = 'offline' as const;
  /** @param base the app's base URL (the snapshots are relative to it); @param fetcher `fetch`, or a fake */
  constructor(private readonly base: string, private readonly fetcher: Fetcher, private readonly timeoutMs = SNAPSHOT_TIMEOUT_MS) {}

  async load<K extends DatasetId>(id: K, signal?: AbortSignal): Promise<Dataset<DatasetTypes[K]>> {
    const url = new URL(DATASETS[id].snapshot, this.base).href;
    const snap = await withTimeout(this.timeoutMs, signal, async (s) => {
      const res = await this.fetcher(url, { signal: s });
      if (!res.ok) throw new Error(`the snapshot of ${id} answered ${res.status}`);
      return parseSnapshot(await res.json(), id);
    });
    return { id, data: snap.data, asOf: snap.asOf, from: 'snapshot', source: snap.source };
  }
}

/**
 * Online answers kept for a dataset that must not be asked for too often
 * (`DatasetDef.minIntervalMs`): the body a URL answered, or its refusal
 * (an HTTP status), and when.
 */
export interface RecentAnswers {
  get(url: string): Promise<{ at: number; body?: unknown; status?: number } | null>;
  put(url: string, entry: { at: number; body?: unknown; status?: number }): Promise<void>;
}

/** Kept for as long as the page is open. */
export class MemoryRecent implements RecentAnswers {
  private readonly map = new Map<string, { at: number; body?: unknown; status?: number }>();
  async get(url: string) { return this.map.get(url) ?? null; }
  async put(url: string, entry: { at: number; body?: unknown; status?: number }) { this.map.set(url, entry); }
}

/** The slice of the browser's Cache Storage `CacheStorageRecent` uses. */
export interface RecentCaches {
  open(name: string): Promise<{ match(url: string): Promise<{ json(): Promise<unknown> } | undefined>; put(url: string, response: Response): Promise<void> }>;
}

/**
 * Kept across reloads in the browser's Cache Storage, where there is one (a
 * secure page); where there is none, or it fails, in memory. Nothing in it
 * leaves the machine.
 */
export class CacheStorageRecent implements RecentAnswers {
  static readonly NAME = 'orbitlab-recent-answers';
  private readonly memory = new MemoryRecent();
  constructor(private readonly caches: RecentCaches | null) {}

  async get(url: string) {
    const kept = await this.memory.get(url);
    if (kept || !this.caches) return kept;
    try {
      const hit = await (await this.caches.open(CacheStorageRecent.NAME)).match(url);
      const entry = hit ? await hit.json() as { at?: unknown; body?: unknown; status?: unknown } : null;
      if (!entry || typeof entry.at !== 'number') return null;
      return { at: entry.at, body: entry.body, status: typeof entry.status === 'number' ? entry.status : undefined };
    } catch { return null; }
  }

  async put(url: string, entry: { at: number; body?: unknown; status?: number }) {
    await this.memory.put(url, entry);
    if (!this.caches) return;
    try {
      await (await this.caches.open(CacheStorageRecent.NAME)).put(url, new Response(JSON.stringify(entry), { headers: { 'content-type': 'application/json' } }));
    } catch { /* memory keeps it for this visit */ }
  }
}

/** A source's refusal to answer (P2.5): the rest of its questions are not asked. */
class Refusal extends Error {}

/** The sources themselves, with the snapshot behind them. */
export class OnlineProvider implements DataProvider {
  readonly mode = 'online' as const;
  constructor(
    private readonly offline: OfflineProvider, private readonly fetcher: Fetcher, private readonly timeoutMs = ONLINE_TIMEOUT_MS,
    private readonly recent: RecentAnswers = new MemoryRecent(), private readonly now: () => number = () => Date.now(),
  ) {}

  async load<K extends DatasetId>(id: K, signal?: AbortSignal): Promise<Dataset<DatasetTypes[K]>> {
    const def = DATASETS[id];
    // a dataset no browser can fetch is its snapshot in either mode
    if (!def.online) return this.offline.load(id, signal);
    const online = def.online;
    const interval = def.minIntervalMs ?? 0;
    let oldest = Infinity;
    try {
      const { data, asOf, partial } = await withTimeout(this.timeoutMs, signal, async (s): Promise<{ data: DatasetTypes[K]; asOf: string; partial?: Dataset<DatasetTypes[K]>['partial'] }> => {
        // one question at a time to each host (P2.5: CelesTrak, asked for nine lists at once, answered some
        // without the header that lets a page read them); different hosts at once
        const queue = new Map<string, Promise<unknown>>();
        // a host that refused (403, 429, or a refusal kept from before) is asked nothing more this time
        const refused = new Map<string, unknown>();
        const inTurn = <T>(url: string, ask: () => Promise<T>): Promise<T> => {
          const host = new URL(url).hostname;
          // stopped meanwhile, or refused: the rest are not asked
          const go = (): Promise<T> => (s.aborted ? Promise.reject(s.reason) : refused.has(host) ? Promise.reject(refused.get(host))
            : ask().catch((e: unknown) => { if (e instanceof Refusal) refused.set(host, e); throw e; }));
          const turn = (queue.get(host) ?? Promise.resolve()).then(go, go);
          queue.set(host, turn.catch(() => undefined));
          return turn;
        };
        // P2.5: where the dataset can put its snapshot's part in place of a failed answer, one failure is not all
        const failure: { first: string | null } = { first: null };
        const ask = (url: string, fn: () => Promise<unknown>): Promise<unknown> => (!online.merge ? inTurn(url, fn) : inTurn(url, fn).catch((e: unknown) => {
          if (s.aborted) throw e;
          failure.first ??= e instanceof Error ? e.message : String(e);
          return null;
        }));
        const answers = await Promise.all(online.urls.map((url) => ask(url, async () => {
          const host = new URL(url).hostname;
          if (interval) {
            // asked too recently: the answer, or the refusal, of then
            const kept = await this.recent.get(url);
            if (kept && this.now() - kept.at < interval) {
              if (kept.status !== undefined) throw new Refusal(`${host} answered ${kept.status}; not asked again before ${new Date(kept.at + interval).toISOString()}`);
              oldest = Math.min(oldest, kept.at);
              return kept.body;
            }
          }
          // past the browser's HTTP cache: online means the source's current answer
          const res = await this.fetcher(url, { signal: s, cache: 'no-cache' });
          if (!res.ok) {
            if (interval) await this.recent.put(url, { at: this.now(), status: res.status });
            const message = `${host} answered ${res.status}`;
            throw res.status === 403 || res.status === 429 ? new Refusal(message) : new Error(message);
          }
          const body = await res.json();
          if (interval) await this.recent.put(url, { at: this.now(), body });
          return body;
        })));
        if (failure.first === null || !online.merge) return online.parse(answers);
        if (answers.every((a) => a === null)) throw new Error(failure.first);
        const snap = await this.offline.load(id, s);
        const merged = online.merge(answers, snap.data);
        return { data: merged.data, asOf: merged.asOf, partial: { parts: merged.parts, reason: failure.first } };
      });
      if (!def.valid(data)) throw new Error('the answer is not the dataset it should be');
      const set: Dataset<DatasetTypes[K]> = { id, data, asOf, from: 'online', source: def.source };
      if (partial) set.partial = partial;
      if (Number.isFinite(oldest)) set.fetched = new Date(oldest).toISOString();
      return set;
    } catch (error) {
      if (signal?.aborted) throw error;
      const reason = error instanceof Error ? error.message : String(error);
      return { ...await this.offline.load(id, signal), fallback: reason };
    }
  }
}

/** The provider for a mode; `recent` keeps online answers across providers (one for the page's life). */
export function createDataProvider(mode: DataMode, base: string, fetcher: Fetcher, recent?: RecentAnswers): DataProvider {
  const offline = new OfflineProvider(base, fetcher);
  return mode === 'online' ? new OnlineProvider(offline, fetcher, ONLINE_TIMEOUT_MS, recent) : offline;
}
