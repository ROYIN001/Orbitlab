/**
 * The service worker's logic (roadmap U03): Orbitlab installed as an app and
 * working without a network — in a classroom, a dormitory, on a train.
 *
 * Every file the build emits (the page, its scripts, every Web Worker's
 * bundle, the textures, the icons) is precached at install, listed in a
 * manifest the build writes into `sw.js` (`vite.config.ts`, `pwaPlugin`). A
 * new deploy is a new manifest, so a new worker, which installs next to the
 * running one — copying every file whose revision has not changed from the
 * old cache rather than downloading it again — and waits; the page offers to
 * reload onto it (`src/pwa/register.ts`). The fonts come from Google Fonts
 * and are cached the first time they load; offline before that, the page
 * falls back on the system fonts. The landing page's pictures of the app are
 * the same (`ON_DEMAND_PREFIXES`): one language's set of them is all a visitor
 * needs, so none is precached, and each is kept once it has been seen. The
 * launch soundtrack is too, on the public site: kept whole on its first play.
 *
 * The data snapshots the offline mode reads (`public/data/`, roadmap S04) are
 * files of the build like any other, so they are precached with it. What the
 * online mode fetches from its sources (`DATA_HOSTS`) goes to the network
 * first, and its last answer is kept for when the network is gone — an app
 * switched online and then taken offline still has the data it last saw,
 * dated by their own "as of", before the snapshot's.
 *
 * Written against the small slice of the service-worker API it uses, so the
 * whole of it runs under test with fakes (tests/pwa.test.ts). `sw.ts` is the
 * entry that hands it the real `self`.
 */

import { onDemand, type PrecacheManifest } from './manifest';
import type { OfflineReply, OfflineResources } from './offline-protocol';
export type { PrecacheEntry, PrecacheManifest } from './manifest';

/** The parts of `CacheStorage` / `Cache` the worker uses. */
export interface CacheLike {
  match(request: RequestInfo | URL, options?: { ignoreSearch?: boolean }): Promise<Response | undefined>;
  put(request: RequestInfo | URL, response: Response): Promise<void>;
}
export interface CachesLike {
  open(name: string): Promise<CacheLike>;
  keys(): Promise<string[]>;
  delete(name: string): Promise<boolean>;
}

type Listener = (event: never) => void;

/** The parts of `ServiceWorkerGlobalScope` the worker uses. */
export interface SwScope {
  registration: { scope: string };
  caches: CachesLike;
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  addEventListener(type: string, listener: Listener): void;
}

export const PRECACHE_PREFIX = 'orbitlab-precache-';
export const RUNTIME_CACHE = 'orbitlab-runtime';
/** S04: the online datasets' last answers */
export const DATA_CACHE = 'orbitlab-data';
/** Where a precache keeps the manifest it was filled from, beside the files. */
export const MANIFEST_KEY = '__precache-manifest.json';
/** The message the page sends to move onto a waiting worker. */
export const SKIP_WAITING = 'orbitlab:skip-waiting';
export const OFFLINE_CHECK = 'orbitlab:offline-check';
export const OFFLINE_PREPARE = 'orbitlab:offline-prepare';

export const precacheName = (version: string): string => `${PRECACHE_PREFIX}${version}`;

/** Hosts whose responses are kept for offline use as they are fetched. */
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
/**
 * S04: the hosts the online datasets come from. Written out here rather than
 * imported from src/provider/datasets.ts: the worker must stay one classic
 * script, and a module it shared with the page would become a chunk it
 * imports. tests/pwa.test.ts holds the two lists together.
 */
export const DATA_HOSTS: readonly string[] = ['services.swpc.noaa.gov', 'celestrak.org'];

export type Route = 'page' | 'precache' | 'runtime' | 'data' | 'network';

/**
 * How a GET is answered: the page itself (any navigation inside the scope,
 * whatever its query — a mission link carries one) from the precached
 * `index.html`; a precached file from the cache; a font, or a file of the
 * app's fetched on demand, by stale-while-revalidate; an online dataset
 * network-first, from its last answer when the network fails (S04);
 * everything else from the network.
 */
export function routeFor(url: URL, mode: string, scope: URL, precached: ReadonlySet<string>): Route {
  if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname)) {
    if (mode === 'navigate') return 'page';
    const path = url.pathname.slice(scope.pathname.length);
    if (precached.has(path)) return 'precache';
    return onDemand(path) ? 'runtime' : 'network';
  }
  if (RUNTIME_HOSTS.includes(url.hostname)) return 'runtime';
  return DATA_HOSTS.includes(url.hostname) ? 'data' : 'network';
}

async function readManifest(cache: CacheLike, scope: URL): Promise<PrecacheManifest | null> {
  const hit = await cache.match(new URL(MANIFEST_KEY, scope).href);
  if (!hit?.ok) return null;
  try { return await hit.json() as PrecacheManifest; } catch { return null; }
}

async function contentRevision(body: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', body);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/** Inspect the controlling worker's cache, including every resource and its completion marker. */
export async function offlineResources(scope: SwScope, manifest: PrecacheManifest, pageScript: string): Promise<OfflineResources> {
  const base = new URL(scope.registration.scope);
  const exists = (await scope.caches.keys()).includes(precacheName(manifest.version));
  const cache = exists ? await scope.caches.open(precacheName(manifest.version)) : null;
  const installed = cache ? await readManifest(cache, base) : null;
  const resources: OfflineResources = {
    version: manifest.version, complete: false,
    pageMatches: manifest.entries.some((entry) => new URL(entry.url, base).href === pageScript),
    total: manifest.entries.length, cached: 0, bytes: 0, missing: [], dates: {}, packs: {},
  };
  for (const entry of manifest.entries) {
    const hit = await cache?.match(new URL(entry.url, base).href);
    if (!hit?.ok) { resources.missing.push(entry.url); continue; }
    const body = await hit.arrayBuffer();
    // Public URLs are mutable across deploys. A completion marker does not
    // prove that an install racing a deployment received the right bytes.
    if (await contentRevision(body) !== entry.revision) { resources.missing.push(entry.url); continue; }
    resources.cached++;
    resources.bytes += body.byteLength;
    if (entry.url.startsWith('data/') || entry.url.startsWith('lessons/packs/')) {
      try {
        const data = JSON.parse(new TextDecoder().decode(body));
        if (entry.url.startsWith('data/')) resources.dates[entry.url] = typeof data.asOf === 'string' ? data.asOf : null;
        if (data.pack && typeof data.pack.id === 'string' && typeof data.pack.title?.en === 'string' && Array.isArray(data.pack.contents)) {
          resources.packs[data.pack.id] = { title: data.pack.title, count: data.pack.contents.length };
        }
      } catch { resources.missing.push(entry.url); }
    }
  }
  resources.complete = resources.pageMatches && resources.missing.length === 0 &&
    installed?.version === manifest.version && JSON.stringify(installed.entries) === JSON.stringify(manifest.entries);
  return resources;
}

/**
 * Repair only missing files of the active version. A deployment can replace
 * an unhashed public URL: prove its content revision before putting it in the
 * active cache. Failed downloads leave every existing cached response intact.
 * This never activates a waiting worker or prunes another version's cache.
 */
export async function prepareOffline(scope: SwScope, manifest: PrecacheManifest, pageScript: string): Promise<OfflineReply> {
  let resources: OfflineResources;
  try { resources = await offlineResources(scope, manifest, pageScript); }
  catch { return { error: 'storage' }; }
  if (!resources.pageMatches) return { resources, error: 'version' };
  if (resources.complete) return { resources };
  const base = new URL(scope.registration.scope);
  try {
    const cache = await scope.caches.open(precacheName(manifest.version));
    const installed = await readManifest(cache, base);
    const trusted = installed?.version === manifest.version && JSON.stringify(installed.entries) === JSON.stringify(manifest.entries);
    for (const entry of manifest.entries) {
      const path = entry.url;
      if (trusted && !resources.missing.includes(path)) continue;
      let response: Response;
      try {
        // With a missing completion marker, prove existing bytes too before
        // accepting them as a fully installed version.
        const kept = !resources.missing.includes(path) ? await cache.match(new URL(path, base).href) : undefined;
        response = kept ?? await scope.fetch(new URL(path, base).href, { cache: 'reload' });
        if (!response.ok) return { resources, error: 'download' };
      } catch { return { resources, error: 'download' }; }
      const revision = await contentRevision(await response.clone().arrayBuffer());
      if (revision !== entry.revision) return { resources, error: 'version' };
      await cache.put(new URL(path, base).href, response);
    }
    // Only a fully repaired manifest earns its completion marker.
    await cache.put(new URL(MANIFEST_KEY, base).href, new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/json' } }));
    return { resources: await offlineResources(scope, manifest, pageScript) };
  } catch { return { resources, error: 'storage' }; }
}

/**
 * Fill the new version's cache: a file an older cache holds at the same
 * revision is copied from it, everything else is downloaded (past the HTTP
 * cache, so a stale copy cannot be precached). Any failed download fails the
 * install, and the running version stays. So does a download whose bytes are
 * not its manifest revision (a deploy landing mid-install), checked as the
 * repair path checks it: it is never put, and no completion marker is written.
 */
export async function precache(scope: SwScope, manifest: PrecacheManifest): Promise<void> {
  const base = new URL(scope.registration.scope);
  const cache = await scope.caches.open(precacheName(manifest.version));
  const reusable = new Map<string, CacheLike>();
  for (const name of await scope.caches.keys()) {
    if (!name.startsWith(PRECACHE_PREFIX) || name === precacheName(manifest.version)) continue;
    const old = await scope.caches.open(name);
    const oldManifest = await readManifest(old, base);
    for (const e of oldManifest?.entries ?? []) reusable.set(`${e.url}|${e.revision}`, old);
  }
  await Promise.all(manifest.entries.map(async (entry) => {
    const url = new URL(entry.url, base).href;
    const old = reusable.get(`${entry.url}|${entry.revision}`);
    const kept = old ? await old.match(url) : undefined;
    if (kept) { await cache.put(url, kept); return; }
    const response = await scope.fetch(url, { cache: 'reload' });
    if (!response.ok) throw new Error(`precache: ${entry.url} answered ${response.status}`);
    const revision = await contentRevision(await response.clone().arrayBuffer());
    if (revision !== entry.revision) throw new Error(`precache: ${entry.url} answered revision ${revision}, not ${entry.revision}`);
    await cache.put(url, response);
  }));
  await cache.put(new URL(MANIFEST_KEY, base).href, new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/json' } }));
}

/** Drop every precache but this version's. */
export async function prune(scope: SwScope, manifest: PrecacheManifest): Promise<void> {
  for (const name of await scope.caches.keys()) {
    if (name.startsWith(PRECACHE_PREFIX) && name !== precacheName(manifest.version)) await scope.caches.delete(name);
  }
}

/**
 * Part of a cached response, as a `206 Partial Content`: what a media element
 * asks for when it seeks. A range it cannot satisfy gets a 416.
 */
export async function rangeResponse(whole: Response, range: string): Promise<Response> {
  const body = await whole.blob();
  const size = body.size;
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let start = m && m[1] !== '' ? Number(m[1]) : NaN;
  let end = m && m[2] !== '' ? Number(m[2]) : size - 1;
  // "bytes=-500": the last 500 bytes
  if (m && m[1] === '' && m[2] !== '') { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  if (!Number.isFinite(start) || start >= size || end < start) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  end = Math.min(end, size - 1);
  const headers = new Headers(whole.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  return new Response(body.slice(start, end + 1), { status: 206, headers });
}

/** Answer one GET. */
export async function respond(scope: SwScope, manifest: PrecacheManifest, request: Request, precached: ReadonlySet<string>): Promise<Response> {
  const base = new URL(scope.registration.scope);
  const url = new URL(request.url);
  const route = routeFor(url, request.mode, base, precached);
  if (route === 'page' || route === 'precache') {
    const cache = await scope.caches.open(precacheName(manifest.version));
    const key = route === 'page' ? new URL('index.html', base).href : url.href;
    const hit = await cache.match(key, { ignoreSearch: true });
    if (!hit) return scope.fetch(request);
    // an <audio> element seeks with Range requests; a cached whole file answers them (V01)
    const range = request.headers?.get('range');
    return range ? rangeResponse(hit, range) : hit;
  }
  if (route === 'runtime') {
    const cache = await scope.caches.open(RUNTIME_CACHE);
    // An <audio> element asks only for ranges, and a cache keeps no partial
    // answer: the first one fetches the whole file and keeps it, and every
    // range, then and offline, is cut from that copy (D-7). Offline before
    // that first play, the fetch fails and the page plays no recording.
    const range = request.headers?.get('range');
    if (range) {
      const kept = await cache.match(url.href);
      if (kept) return rangeResponse(kept, range);
      const whole = await scope.fetch(url.href);
      if (whole.status !== 200) return whole;
      await cache.put(url.href, whole.clone());
      return rangeResponse(whole, range);
    }
    const hit = await cache.match(request);
    const fresh = scope.fetch(request).then(async (response) => {
      // a no-cors stylesheet or font answers opaquely (status 0): keep it too
      if (response.ok || response.type === 'opaque') await cache.put(request, response.clone());
      return response;
    });
    if (hit) { fresh.catch(() => { /* offline: the cached copy stands */ }); return hit; }
    return fresh;
  }
  if (route === 'data') {
    // Network first: online mode asked for the source's current answer. Its
    // last good one stands in when the network fails; with none, the failure
    // goes back to the page, whose provider falls back on the snapshot.
    const cache = await scope.caches.open(DATA_CACHE);
    try {
      const response = await scope.fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      const hit = await cache.match(request);
      if (hit) return hit;
      throw error;
    }
  }
  return scope.fetch(request);
}

interface InstallEvent { waitUntil(p: Promise<unknown>): void }
interface FetchEvent { request: Request; respondWith(r: Promise<Response>): void }
interface MessageEvent { data: unknown; ports?: Array<{ postMessage(message: OfflineReply): void }>; waitUntil?(p: Promise<unknown>): void }

export function installServiceWorker(scope: SwScope, manifest: PrecacheManifest): void {
  const precached = new Set(manifest.entries.map((e) => e.url));
  scope.addEventListener('install', ((event: InstallEvent) => {
    event.waitUntil(precache(scope, manifest));
  }) as Listener);
  scope.addEventListener('activate', ((event: InstallEvent) => {
    // The first version takes the open page at once, so it works offline
    // without a reload; a later one only activates when the page asked for it.
    event.waitUntil(prune(scope, manifest).then(() => scope.clients.claim()));
  }) as Listener);
  scope.addEventListener('message', ((event: MessageEvent) => {
    if (event.data === SKIP_WAITING) void scope.skipWaiting();
    const request = event.data as { type?: string; pageScript?: string } | null;
    const port = event.ports?.[0];
    if (!port || !request || typeof request.pageScript !== 'string' ||
      (request.type !== OFFLINE_CHECK && request.type !== OFFLINE_PREPARE)) return;
    const work = request.type === OFFLINE_PREPARE
      ? prepareOffline(scope, manifest, request.pageScript)
      : offlineResources(scope, manifest, request.pageScript).then((resources): OfflineReply => ({ resources }));
    const reply = work.then((result) => port.postMessage(result), () => port.postMessage({ error: 'storage' }));
    event.waitUntil?.(reply);
  }) as Listener);
  scope.addEventListener('fetch', ((event: FetchEvent) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(respond(scope, manifest, event.request, precached));
  }) as Listener);
}
