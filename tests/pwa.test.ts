/**
 * The offline app (roadmap U03): the precache manifest the build writes, and
 * the service worker's install, clean-up and answers, run against fakes of
 * the Cache and fetch APIs. tests/browser/pwa-offline.mjs checks the same in
 * a real browser with the network cut.
 */
import { describe, expect, it } from 'vitest';
import { build, type Rollup } from 'vite';
import {
  MANIFEST_KEY, PRECACHE_PREFIX, RUNTIME_CACHE, SKIP_WAITING, installServiceWorker, precache, precacheName, prune, respond, routeFor,
  type CacheLike, type CachesLike, type PrecacheManifest, type SwScope,
} from '../src/pwa/sw-core';
import { SKIP_WAITING_MESSAGE } from '../src/pwa/register';
import { DATA_CACHE, DATA_HOSTS } from '../src/pwa/sw-core';
import { DATA_HOSTS as DATASET_HOSTS } from '../src/provider/datasets';
import { PRECACHE_PLACEHOLDER, injectPrecacheManifest, precacheManifest, precacheable } from '../src/pwa/manifest';

const SCOPE = 'https://example.github.io/Orbitlab/';

class FakeCache implements CacheLike {
  readonly store = new Map<string, Response>();
  private key(r: RequestInfo | URL, ignoreSearch = false): string {
    const url = new URL(typeof r === 'string' ? r : r instanceof URL ? r.href : r.url);
    if (ignoreSearch) url.search = '';
    return url.href;
  }
  async match(r: RequestInfo | URL, o?: { ignoreSearch?: boolean }) {
    if (!o?.ignoreSearch) return this.store.get(this.key(r))?.clone();
    const want = this.key(r, true);
    for (const [k, v] of this.store) if (this.key(k, true) === want) return v.clone();
    return undefined;
  }
  async put(r: RequestInfo | URL, response: Response) { this.store.set(this.key(r), response); }
}

class FakeCaches implements CachesLike {
  readonly caches = new Map<string, FakeCache>();
  async open(name: string) { if (!this.caches.has(name)) this.caches.set(name, new FakeCache()); return this.caches.get(name)!; }
  async keys() { return [...this.caches.keys()]; }
  async delete(name: string) { return this.caches.delete(name); }
}

function fakeScope(server: Record<string, string>, online = { on: true }) {
  const fetched: string[] = [];
  const listeners = new Map<string, (e: never) => void>();
  const scope: SwScope & { fetched: string[]; listeners: typeof listeners; skipped: number; claimed: number } = {
    registration: { scope: SCOPE },
    caches: new FakeCaches(),
    fetched, listeners, skipped: 0, claimed: 0,
    async fetch(input: RequestInfo | URL) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      fetched.push(url);
      if (!online.on) throw new TypeError('offline');
      const body = server[url];
      return body === undefined ? new Response('missing', { status: 404 }) : new Response(body, { status: 200 });
    },
    async skipWaiting() { scope.skipped++; },
    clients: { async claim() { scope.claimed++; } },
    addEventListener(type: string, l: (e: never) => void) { listeners.set(type, l); },
  };
  return scope;
}

const manifestOf = (files: Record<string, string>): PrecacheManifest =>
  precacheManifest(Object.entries(files).map(([url, body]) => {
    const revision = REVISIONS.get(body);
    if (revision === undefined) throw new Error(`manifestOf: no revision for the fixture body of ${url}`);
    return { url, revision };
  }));

const serverOf = (files: Record<string, string>) => Object.fromEntries(Object.entries(files).map(([u, b]) => [SCOPE + u, b]));

const V1 = { 'index.html': '<html>v1</html>', 'assets/index-a.js': 'main v1', 'assets/flight.worker-a.js': 'worker v1', 'textures/earth.jpg': 'EARTH' };
const V2 = { 'index.html': '<html>v2</html>', 'assets/index-b.js': 'main v2', 'assets/flight.worker-a.js': 'worker v1', 'textures/earth.jpg': 'EARTH' };
// The build's revision of each body: the first 16 hex digits of its SHA-256 (vite.config.ts)
const REVISIONS = new Map(await Promise.all([...Object.values(V1), ...Object.values(V2)].map(async (body) => [body,
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)))]
    .map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16)] as const)));

describe('precache manifest (U03)', () => {
  it('orders its entries, leaves out the worker, maps and dotfiles, and versions by content', () => {
    const m = precacheManifest([{ url: 'b.js', revision: '2' }, { url: 'sw.js', revision: 'x' }, { url: 'a.js', revision: '1' }, { url: 'a.js.map', revision: '1' }, { url: '.nojekyll', revision: '1' }]);
    expect(m.entries.map((e) => e.url)).toEqual(['a.js', 'b.js']);
    expect(precacheManifest([{ url: 'a.js', revision: '1' }, { url: 'b.js', revision: '2' }]).version).toBe(m.version);
    expect(precacheManifest([{ url: 'a.js', revision: '1' }, { url: 'b.js', revision: '3' }]).version).not.toBe(m.version);
    expect(precacheable('assets/tune.worker-x.js')).toBe(true);
  });

  it('leaves out the landing page\'s pictures, a set per language fetched as they are shown', () => {
    expect(precacheable('home/watch.th.webp')).toBe(false);
    expect(precacheManifest([{ url: 'home/watch.en.webp', revision: '1' }, { url: 'textures/earth.jpg', revision: '1' }]).entries.map((e) => e.url))
      .toEqual(['textures/earth.jpg']);
    // only a path that starts there: a file elsewhere that merely has the word in it is precached
    expect(precacheable('assets/home-x.js')).toBe(true);
  });

  it('leaves out the soundtrack on the public site, and precaches it for the intranet zip (D-7)', () => {
    const files = [{ url: 'audio/soyuz-ms-27-nasa.mp3', revision: '1' }, { url: 'audio/CREDITS.txt', revision: '1' }, { url: 'textures/earth.jpg', revision: '1' }];
    expect(precacheable('audio/soyuz-ms-27-nasa.mp3')).toBe(false);
    expect(precacheManifest(files).entries.map((e) => e.url)).toEqual(['textures/earth.jpg']);
    // ORBITLAB_PRECACHE_AUDIO=1 in the build
    expect(precacheable('audio/soyuz-ms-27-nasa.mp3', { precacheAudio: true })).toBe(true);
    expect(precacheManifest(files, { precacheAudio: true }).entries.map((e) => e.url))
      .toEqual(['audio/CREDITS.txt', 'audio/soyuz-ms-27-nasa.mp3', 'textures/earth.jpg']);
    // the flag brings back only the soundtrack: the other on-demand files stay out
    expect(precacheable('home/watch.th.webp', { precacheAudio: true })).toBe(false);
    expect(precacheable('assets/audio-x.js')).toBe(true);
  });

  it('writes the manifest over the placeholder, in any quoting the minifier chose', () => {
    const m = manifestOf(V1);
    for (const q of ["'", '"', '`']) {
      const code = injectPrecacheManifest(`const m=JSON.parse(${q}${PRECACHE_PLACEHOLDER}${q});`, m);
      expect(JSON.parse(new Function(`return ${code.slice('const m=JSON.parse('.length, -2)}`)())).toEqual(m);
    }
    expect(() => injectPrecacheManifest('no placeholder', m)).toThrow();
  });
});

describe('service worker (U03)', () => {
  it('routes the page (with any query), precached files, fonts and the rest', () => {
    const scope = new URL(SCOPE), pre = new Set(['assets/index-a.js']);
    expect(routeFor(new URL(`${SCOPE}?m=zAbc#/explore`), 'navigate', scope, pre)).toBe('page');
    expect(routeFor(new URL(`${SCOPE}assets/index-a.js`), 'no-cors', scope, pre)).toBe('precache');
    expect(routeFor(new URL(`${SCOPE}assets/other.js`), 'cors', scope, pre)).toBe('network');
    expect(routeFor(new URL('https://fonts.gstatic.com/s/dmsans/x.woff2'), 'cors', scope, pre)).toBe('runtime');
    expect(routeFor(new URL('https://example.github.io/Other/'), 'navigate', scope, pre)).toBe('network');
  });

  it('precaches every file of the build and answers from the cache offline', async () => {
    const online = { on: true };
    const sw = fakeScope(serverOf(V1), online);
    const m = manifestOf(V1);
    await precache(sw, m);
    expect(sw.fetched.sort()).toEqual(Object.keys(V1).map((u) => SCOPE + u).sort());
    online.on = false;
    const pre = new Set(m.entries.map((e) => e.url));
    // `new Request` refuses mode 'navigate', which only the browser sets
    const navigation = { url: `${SCOPE}?m=zAbc`, mode: 'navigate', method: 'GET' } as unknown as Request;
    expect(await (await respond(sw, m, navigation, pre)).text()).toBe('<html>v1</html>');
    const worker = await respond(sw, m, new Request(`${SCOPE}assets/flight.worker-a.js`), pre);
    expect(await worker.text()).toBe('worker v1');
    const texture = await respond(sw, m, new Request(`${SCOPE}textures/earth.jpg`), pre);
    expect(await texture.text()).toBe('EARTH');
  });

  it('fails the install when a file cannot be downloaded, so the running version stays', async () => {
    const server = serverOf(V1);
    delete server[`${SCOPE}textures/earth.jpg`];
    await expect(precache(fakeScope(server), manifestOf(V1))).rejects.toThrow(/earth/);
  });

  it('fails the install when a download answers other bytes than its revision, so no cache holds a mix of versions (FX-7 step 0)', async () => {
    // a deploy lands mid-install: the server already answers v2's index.html
    // under v1's manifest
    const sw = fakeScope({ ...serverOf(V1), [`${SCOPE}index.html`]: V2['index.html'] });
    const m1 = manifestOf(V1);
    await expect(precache(sw, m1)).rejects.toThrow(/index\.html/);
    const cache = await sw.caches.open(precacheName(m1.version)) as FakeCache;
    expect(cache.store.has(`${SCOPE}index.html`)).toBe(false);
    expect(cache.store.has(`${SCOPE}${MANIFEST_KEY}`)).toBe(false);
    for (const response of cache.store.values()) expect(await response.clone().text()).not.toBe(V2['index.html']);
  });

  it('keeps the running version whole when an update download answers other bytes, and installs once the bytes match', async () => {
    const server = serverOf(V1);
    const sw = fakeScope(server);
    const m1 = manifestOf(V1), m2 = manifestOf(V2);
    await precache(sw, m1);
    Object.assign(server, serverOf(V2)); // the next deploy
    const running = [...(await sw.caches.open(precacheName(m1.version)) as FakeCache).store.keys()].sort();
    server[`${SCOPE}assets/index-b.js`] = 'main v3';
    await expect(precache(sw, m2)).rejects.toThrow(/index-b\.js/);
    const old = await sw.caches.open(precacheName(m1.version)) as FakeCache;
    expect([...old.store.keys()].sort()).toEqual(running);
    expect(await (await old.match(`${SCOPE}index.html`))!.text()).toBe('<html>v1</html>');
    const next = await sw.caches.open(precacheName(m2.version)) as FakeCache;
    expect(next.store.has(`${SCOPE}assets/index-b.js`)).toBe(false);
    expect(next.store.has(`${SCOPE}${MANIFEST_KEY}`)).toBe(false);
    // the deploy settles: the same manifest now installs, with the same bytes as before the fix
    server[`${SCOPE}assets/index-b.js`] = 'main v2';
    await precache(sw, m2);
    expect(await (await next.match(`${SCOPE}assets/index-b.js`))!.text()).toBe('main v2');
    expect(await next.match(`${SCOPE}${MANIFEST_KEY}`)).toBeDefined();
  });

  it('does not carry wrong bytes forward from an older cache: it downloads that file again, verified (FX-7 step 0)', async () => {
    // a cache installed before the revision check holds other bytes under
    // the same revision and a completion marker
    const server = serverOf(V1);
    const sw = fakeScope(server);
    const m1 = manifestOf(V1), m2 = manifestOf(V2);
    await precache(sw, m1);
    await (await sw.caches.open(precacheName(m1.version))).put(`${SCOPE}textures/earth.jpg`, new Response('EARTH from another build'));
    Object.assign(server, serverOf(V2));
    sw.fetched.length = 0;
    await precache(sw, m2);
    expect(sw.fetched.sort()).toEqual([`${SCOPE}assets/index-b.js`, `${SCOPE}index.html`, `${SCOPE}textures/earth.jpg`]);
    const next = await sw.caches.open(precacheName(m2.version)) as FakeCache;
    expect(await (await next.match(`${SCOPE}textures/earth.jpg`))!.text()).toBe('EARTH');
  });

  it('fails the install when a wrong copy in an older cache cannot be replaced by a matching download', async () => {
    const server = serverOf(V1);
    const sw = fakeScope(server);
    const m1 = manifestOf(V1), m2 = manifestOf(V2);
    await precache(sw, m1);
    await (await sw.caches.open(precacheName(m1.version))).put(`${SCOPE}textures/earth.jpg`, new Response('EARTH from another build'));
    Object.assign(server, serverOf(V2), { [`${SCOPE}textures/earth.jpg`]: 'EARTH from another build' });
    await expect(precache(sw, m2)).rejects.toThrow(/earth\.jpg/);
    const next = await sw.caches.open(precacheName(m2.version)) as FakeCache;
    expect(next.store.has(`${SCOPE}textures/earth.jpg`)).toBe(false);
    expect(next.store.has(`${SCOPE}${MANIFEST_KEY}`)).toBe(false);
  });

  it('installs a new deploy beside the old one, downloading only what changed, then drops the old one', async () => {
    // V1 is installed while V1 is served; then V2 is deployed (index.html
    // changes under the same URL, so V1 must not be installed from V2's server)
    const server = serverOf(V1);
    const sw = fakeScope(server);
    const m1 = manifestOf(V1), m2 = manifestOf(V2);
    await precache(sw, m1);
    Object.assign(server, serverOf(V2));
    sw.fetched.length = 0;
    await precache(sw, m2);
    expect(sw.fetched.sort()).toEqual([`${SCOPE}assets/index-b.js`, `${SCOPE}index.html`]);
    const cache = await sw.caches.open(precacheName(m2.version)) as FakeCache;
    expect(await (await cache.match(`${SCOPE}textures/earth.jpg`))!.text()).toBe('EARTH');
    expect(await cache.match(`${SCOPE}${MANIFEST_KEY}`)).toBeDefined();
    await (await sw.caches.open(RUNTIME_CACHE)).put('https://fonts.gstatic.com/x.woff2', new Response('font'));
    await prune(sw, m2);
    expect(await sw.caches.keys()).toEqual([precacheName(m2.version), RUNTIME_CACHE]);
  });

  it('keeps a landing page picture once it has been seen, and answers with it offline', async () => {
    const scope = new URL(SCOPE), pre = new Set<string>();
    const shot = `${SCOPE}home/orbit.ru.webp`;
    expect(routeFor(new URL(shot), 'no-cors', scope, pre)).toBe('runtime');
    const online = { on: true };
    const sw = fakeScope({ [shot]: 'SHOT' }, online);
    const m = manifestOf(V1);
    expect(await (await respond(sw, m, new Request(shot), pre)).text()).toBe('SHOT');
    online.on = false;
    expect(await (await respond(sw, m, new Request(shot), pre)).text()).toBe('SHOT');
  });

  it('keeps the soundtrack whole on its first play, and cuts every later range from it offline (D-7)', async () => {
    const scope = new URL(SCOPE), pre = new Set<string>();
    const mp3 = `${SCOPE}audio/soyuz-ms-27-nasa.mp3`;
    // the default build: the soundtrack is fetched on demand
    expect(routeFor(new URL(mp3), 'no-cors', scope, pre)).toBe('runtime');
    // the intranet zip's build: it is in the precache, which is checked first
    expect(routeFor(new URL(mp3), 'no-cors', scope, new Set(['audio/soyuz-ms-27-nasa.mp3']))).toBe('precache');
    const online = { on: true };
    const sw = fakeScope({ [mp3]: '0123456789' }, online);
    const m = manifestOf(V1);
    const ranged = (range: string) => new Request(mp3, { headers: { range } });
    const first = await respond(sw, m, ranged('bytes=0-'), pre);
    expect(first.status).toBe(206);
    expect(await first.text()).toBe('0123456789');
    // the whole file was fetched once, without the range, and kept
    expect(sw.fetched).toEqual([mp3]);
    expect(await (await (await sw.caches.open(RUNTIME_CACHE)).match(mp3))!.text()).toBe('0123456789');
    online.on = false;
    const seek = await respond(sw, m, ranged('bytes=4-6'), pre);
    expect(seek.status).toBe(206);
    expect(await seek.text()).toBe('456');
    expect(seek.headers.get('content-range')).toBe('bytes 4-6/10');
    expect(sw.fetched).toEqual([mp3]);
    // offline before any play: the fetch fails, and the page plays no recording
    const other = `${SCOPE}audio/other.mp3`;
    await expect(respond(sw, m, new Request(other, { headers: { range: 'bytes=0-' } }), pre)).rejects.toThrow('offline');
    // a refusal is passed on and not kept
    online.on = true;
    expect((await respond(sw, m, new Request(other, { headers: { range: 'bytes=0-' } }), pre)).status).toBe(404);
    expect(await (await sw.caches.open(RUNTIME_CACHE)).match(other)).toBeUndefined();
  });

  it('keeps fonts for offline use: the cached copy first, refreshed when online', async () => {
    const online = { on: true };
    const font = 'https://fonts.gstatic.com/s/dmsans/x.woff2';
    const sw = fakeScope({ [font]: 'FONT' }, online);
    const m = manifestOf(V1);
    expect(await (await respond(sw, m, new Request(font), new Set())).text()).toBe('FONT');
    online.on = false;
    expect(await (await respond(sw, m, new Request(font), new Set())).text()).toBe('FONT');
  });

  it('routes an online dataset network-first, and answers from its last copy when the network is gone (S04)', async () => {
    const scope = new URL(SCOPE), pre = new Set<string>();
    const kp = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
    expect(routeFor(new URL(kp), 'cors', scope, pre)).toBe('data');
    // every host a dataset reads is one the worker keeps answers from
    expect(DATASET_HOSTS.filter((h) => !DATA_HOSTS.includes(h))).toEqual([]);
    const online = { on: true };
    const server: Record<string, string> = { [kp]: '[1]' };
    const sw = fakeScope(server, online);
    const m = manifestOf(V1);
    expect(await (await respond(sw, m, new Request(kp), pre)).text()).toBe('[1]');
    // online, the source's new answer wins over the kept one
    server[kp] = '[2]';
    expect(await (await respond(sw, m, new Request(kp), pre)).text()).toBe('[2]');
    online.on = false;
    expect(await (await respond(sw, m, new Request(kp), pre)).text()).toBe('[2]');
    expect(await sw.caches.keys()).toContain(DATA_CACHE);
    // with no copy kept, the failure reaches the page, whose provider falls back on the snapshot
    await expect(respond(sw, m, new Request('https://services.swpc.noaa.gov/json/other.json'), pre)).rejects.toThrow('offline');
    // a refusal is passed on and not kept
    online.on = true;
    const missing = 'https://services.swpc.noaa.gov/json/missing.json';
    expect((await respond(sw, m, new Request(missing), pre)).status).toBe(404);
    expect(await (await sw.caches.open(DATA_CACHE)).match(missing)).toBeUndefined();
  });

  it('agrees with the page on the message that moves a waiting version on', () => {
    expect(SKIP_WAITING_MESSAGE).toBe(SKIP_WAITING);
  });

  it('moves onto a waiting version only when the page asks, and claims the page when it activates', async () => {
    const sw = fakeScope(serverOf(V1));
    const m = manifestOf(V1);
    installServiceWorker(sw, m);
    expect([...sw.listeners.keys()].sort()).toEqual(['activate', 'fetch', 'install', 'message']);
    (sw.listeners.get('message') as (e: { data: unknown }) => void)({ data: 'something else' });
    expect(sw.skipped).toBe(0);
    (sw.listeners.get('message') as (e: { data: unknown }) => void)({ data: SKIP_WAITING });
    expect(sw.skipped).toBe(1);
    let done: Promise<unknown> = Promise.resolve();
    (sw.listeners.get('activate') as (e: { waitUntil(p: Promise<unknown>): void }) => void)({ waitUntil: (p) => { done = p; } });
    await done;
    expect(sw.claimed).toBe(1);
    expect((await sw.caches.keys()).filter((k) => k.startsWith(PRECACHE_PREFIX))).toEqual([]);
  });
});

describe('precache transfer without a second download (EQ-1, M-PLATFORM-021)', () => {
  /**
   * The browser's HTTP cache in front of the fake server. `held` is what the
   * page has just downloaded (an `undefined` value is a refusal it kept). A
   * request whose cache mode lets the browser answer from it gets that copy
   * without the network; one past it ('reload', 'no-store', 'no-cache') goes
   * to the server, and only those reach `network`.
   */
  function browserScope(server: Record<string, string>, held: Map<string, string | undefined>) {
    const sw = fakeScope(server);
    const network: Array<{ url: string; cache: RequestCache | undefined }> = [];
    const answer = (body: string | undefined) => body === undefined ? new Response('missing', { status: 404 }) : new Response(body, { status: 200 });
    sw.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const mode = init?.cache;
      if (mode !== 'reload' && mode !== 'no-store' && mode !== 'no-cache' && held.has(url)) return answer(held.get(url));
      network.push({ url, cache: mode });
      if (mode !== 'no-store') held.set(url, server[url]);
      return answer(server[url]);
    };
    return Object.assign(sw, { network });
  }

  const revisionOf = async (body: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)))]
    .map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);

  it('reuses on a first visit the copies the page has just downloaded, verified, and downloads only the rest', async () => {
    // the page loaded these before its worker installs; the physics worker has not run yet
    const held = new Map<string, string | undefined>(['index.html', 'assets/index-a.js', 'textures/earth.jpg'].map((u) => [SCOPE + u, V1[u as keyof typeof V1]]));
    const sw = browserScope(serverOf(V1), held);
    const m = manifestOf(V1);
    await precache(sw, m);
    expect(sw.network.map((r) => r.url)).toEqual([`${SCOPE}assets/flight.worker-a.js`]);
    const cache = await sw.caches.open(precacheName(m.version)) as FakeCache;
    for (const [url, body] of Object.entries(V1)) expect(await (await cache.match(SCOPE + url))!.text()).toBe(body);
    expect(await cache.match(`${SCOPE}${MANIFEST_KEY}`)).toBeDefined();
  });

  it('downloads again, past the HTTP cache, a held copy that is not its revision or was refused, and verifies the download', async () => {
    // v1's index.html is still held from an earlier visit, and a refusal of
    // v2's script was kept; the texture held is the right one
    const held = new Map<string, string | undefined>([
      [`${SCOPE}index.html`, V1['index.html']], [`${SCOPE}assets/index-b.js`, undefined], [`${SCOPE}textures/earth.jpg`, 'EARTH'],
    ]);
    const sw = browserScope(serverOf(V2), held);
    const m2 = manifestOf(V2);
    await precache(sw, m2);
    const past = sw.network.filter((r) => r.cache === 'reload').map((r) => r.url).sort();
    expect(past).toEqual([`${SCOPE}assets/index-b.js`, `${SCOPE}index.html`]);
    expect(sw.network.map((r) => r.url)).not.toContain(`${SCOPE}textures/earth.jpg`);
    const cache = await sw.caches.open(precacheName(m2.version)) as FakeCache;
    for (const [url, body] of Object.entries(V2)) expect(await (await cache.match(SCOPE + url))!.text()).toBe(body);
    expect(await cache.match(`${SCOPE}${MANIFEST_KEY}`)).toBeDefined();
  });

  it('fails the install when the held copy and the download past the HTTP cache are both other bytes, and the running version stays', async () => {
    const server = serverOf(V1);
    const sw = browserScope(server, new Map());
    const m1 = manifestOf(V1), m2 = manifestOf(V2);
    await precache(sw, m1);
    const running = [...(await sw.caches.open(precacheName(m1.version)) as FakeCache).store.keys()].sort();
    // v2 is deployed, then a third deploy lands mid-install: the browser
    // holds v1's index.html and the server already answers another one
    Object.assign(server, serverOf(V2), { [`${SCOPE}index.html`]: '<html>v3</html>' });
    await expect(precache(sw, m2)).rejects.toThrow(/index\.html/);
    expect(sw.network.filter((r) => r.url === `${SCOPE}index.html`).map((r) => r.cache)).toContain('reload');
    const next = await sw.caches.open(precacheName(m2.version)) as FakeCache;
    expect(next.store.has(`${SCOPE}index.html`)).toBe(false);
    expect(next.store.has(`${SCOPE}${MANIFEST_KEY}`)).toBe(false);
    const old = await sw.caches.open(precacheName(m1.version)) as FakeCache;
    expect([...old.store.keys()].sort()).toEqual(running);
    expect(await (await old.match(`${SCOPE}index.html`))!.text()).toBe('<html>v1</html>');
  });

  it('holds only a few files in memory at once: at most six are fetched, verified and stored together', async () => {
    const files = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`assets/chunk-${i}.js`, `chunk ${i}`]));
    const m = precacheManifest(await Promise.all(Object.entries(files).map(async ([url, body]) => ({ url, revision: await revisionOf(body) }))));
    const sw = fakeScope(serverOf(files));
    const cache = await sw.caches.open(precacheName(m.version)) as FakeCache;
    let open = 0, peak = 0;
    const fetch = sw.fetch;
    sw.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      peak = Math.max(peak, ++open);
      await new Promise((resolve) => setTimeout(resolve, 1));
      return fetch(input, init);
    };
    const put = cache.put.bind(cache);
    cache.put = async (r: RequestInfo | URL, response: Response) => {
      if (!String(r).endsWith(MANIFEST_KEY)) open--;
      return put(r, response);
    };
    await precache(sw, m);
    expect(peak).toBeLessThanOrEqual(6);
    expect(peak).toBeGreaterThan(1);
    expect(cache.store.size).toBe(21);
  });
});

describe('the build (U03)', () => {
  it('emits sw.js with every script, Web Worker bundle, texture and icon in its manifest', async () => {
    const result = await build({ logLevel: 'silent', build: { write: false } }) as Rollup.RollupOutput | Rollup.RollupOutput[];
    const output = (Array.isArray(result) ? result[0] : result).output;
    const sw = output.find((o) => o.fileName === 'sw.js');
    expect(sw?.type).toBe('chunk');
    const code = (sw as Rollup.OutputChunk).code;
    // a classic service worker: one self-contained script, no module imports
    expect((sw as Rollup.OutputChunk).imports).toEqual([]);
    expect(code).not.toMatch(/\bimport\s*[{*]|\bimport\s*\(|\bexport\s*[{*]/);
    const literal = /JSON\.parse\(("(?:[^"\\]|\\.)*")\)/.exec(code);
    const manifest = JSON.parse(JSON.parse(literal![1])) as PrecacheManifest;
    const urls = manifest.entries.map((e) => e.url);
    const emitted = output.map((o) => o.fileName).filter((f) => f !== 'sw.js');
    expect(urls).toEqual(expect.arrayContaining(emitted));
    expect(urls).toContain('index.html');
    expect(urls.filter((u) => /\.worker-.*\.js$/.test(u)).length).toBeGreaterThanOrEqual(2);
    for (const f of ['earth_atmos_2048.jpg', 'earth_atmos_4096.jpg', 'earth_clouds_4096.jpg', 'earth_lights_4096.jpg', 'earth_normal_2048.jpg', 'earth_specular_2048.jpg']) {
      expect(urls).toContain(`textures/${f}`);
    }
    expect(urls).toEqual(expect.arrayContaining(['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png']));
    // S04: the offline mode's data snapshots are files of the build like any other
    expect(urls).toContain('data/space-weather.json');
    // D-7: the default build leaves the soundtrack to the first play
    expect(urls.filter((u) => u.startsWith('audio/'))).toEqual([]);
  }, 120_000);
});

describe('media seeks from the cache (U03 with V01)', () => {
  it('answers a Range request with the part asked for', async () => {
    const { rangeResponse } = await import('../src/pwa/sw-core');
    const whole = () => new Response('0123456789', { headers: { 'content-type': 'audio/mpeg' } });
    const r = await rangeResponse(whole(), 'bytes=2-5');
    expect(r.status).toBe(206);
    expect(await r.text()).toBe('2345');
    expect(r.headers.get('content-range')).toBe('bytes 2-5/10');
    expect(r.headers.get('content-type')).toBe('audio/mpeg');
    expect(await (await rangeResponse(whole(), 'bytes=7-')).text()).toBe('789');
    expect(await (await rangeResponse(whole(), 'bytes=-3')).text()).toBe('789');
    expect((await rangeResponse(whole(), 'bytes=20-')).status).toBe(416);
  });
});
