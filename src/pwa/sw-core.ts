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
 * falls back on the system fonts.
 *
 * Written against the small slice of the service-worker API it uses, so the
 * whole of it runs under test with fakes (tests/pwa.test.ts). `sw.ts` is the
 * entry that hands it the real `self`.
 */

import type { PrecacheManifest } from './manifest';
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
/** Where a precache keeps the manifest it was filled from, beside the files. */
export const MANIFEST_KEY = '__precache-manifest.json';
/** The message the page sends to move onto a waiting worker. */
export const SKIP_WAITING = 'orbitlab:skip-waiting';

export const precacheName = (version: string): string => `${PRECACHE_PREFIX}${version}`;

/** Hosts whose responses are kept for offline use as they are fetched. */
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

export type Route = 'page' | 'precache' | 'runtime' | 'network';

/**
 * How a GET is answered: the page itself (any navigation inside the scope,
 * whatever its query — a mission link carries one) from the precached
 * `index.html`; a precached file from the cache; a font by
 * stale-while-revalidate; everything else from the network.
 */
export function routeFor(url: URL, mode: string, scope: URL, precached: ReadonlySet<string>): Route {
  if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname)) {
    if (mode === 'navigate') return 'page';
    const path = url.pathname.slice(scope.pathname.length);
    if (precached.has(path)) return 'precache';
    return 'network';
  }
  return RUNTIME_HOSTS.includes(url.hostname) ? 'runtime' : 'network';
}

async function readManifest(cache: CacheLike, scope: URL): Promise<PrecacheManifest | null> {
  const hit = await cache.match(new URL(MANIFEST_KEY, scope).href);
  if (!hit) return null;
  try { return await hit.json() as PrecacheManifest; } catch { return null; }
}

/**
 * Fill the new version's cache: a file an older cache holds at the same
 * revision is copied from it, everything else is downloaded (past the HTTP
 * cache, so a stale copy cannot be precached). Any failed download fails the
 * install, and the running version stays.
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

/** Answer one GET. */
export async function respond(scope: SwScope, manifest: PrecacheManifest, request: Request, precached: ReadonlySet<string>): Promise<Response> {
  const base = new URL(scope.registration.scope);
  const url = new URL(request.url);
  const route = routeFor(url, request.mode, base, precached);
  if (route === 'page' || route === 'precache') {
    const cache = await scope.caches.open(precacheName(manifest.version));
    const key = route === 'page' ? new URL('index.html', base).href : url.href;
    const hit = await cache.match(key, { ignoreSearch: true });
    return hit ?? scope.fetch(request);
  }
  if (route === 'runtime') {
    const cache = await scope.caches.open(RUNTIME_CACHE);
    const hit = await cache.match(request);
    const fresh = scope.fetch(request).then(async (response) => {
      // a no-cors stylesheet or font answers opaquely (status 0): keep it too
      if (response.ok || response.type === 'opaque') await cache.put(request, response.clone());
      return response;
    });
    if (hit) { fresh.catch(() => { /* offline: the cached copy stands */ }); return hit; }
    return fresh;
  }
  return scope.fetch(request);
}

interface InstallEvent { waitUntil(p: Promise<unknown>): void }
interface FetchEvent { request: Request; respondWith(r: Promise<Response>): void }
interface MessageEvent { data: unknown }

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
  }) as Listener);
  scope.addEventListener('fetch', ((event: FetchEvent) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(respond(scope, manifest, event.request, precached));
  }) as Listener);
}
