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
  precacheManifest(Object.entries(files).map(([url, body]) => ({ url, revision: String(body.length) + body })));

const serverOf = (files: Record<string, string>) => Object.fromEntries(Object.entries(files).map(([u, b]) => [SCOPE + u, b]));

const V1 = { 'index.html': '<html>v1</html>', 'assets/index-a.js': 'main v1', 'assets/flight.worker-a.js': 'worker v1', 'textures/earth.jpg': 'EARTH' };
const V2 = { 'index.html': '<html>v2</html>', 'assets/index-b.js': 'main v2', 'assets/flight.worker-a.js': 'worker v1', 'textures/earth.jpg': 'EARTH' };

describe('precache manifest (U03)', () => {
  it('orders its entries, leaves out the worker, maps and dotfiles, and versions by content', () => {
    const m = precacheManifest([{ url: 'b.js', revision: '2' }, { url: 'sw.js', revision: 'x' }, { url: 'a.js', revision: '1' }, { url: 'a.js.map', revision: '1' }, { url: '.nojekyll', revision: '1' }]);
    expect(m.entries.map((e) => e.url)).toEqual(['a.js', 'b.js']);
    expect(precacheManifest([{ url: 'a.js', revision: '1' }, { url: 'b.js', revision: '2' }]).version).toBe(m.version);
    expect(precacheManifest([{ url: 'a.js', revision: '1' }, { url: 'b.js', revision: '3' }]).version).not.toBe(m.version);
    expect(precacheable('assets/tune.worker-x.js')).toBe(true);
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

  it('installs a new deploy beside the old one, downloading only what changed, then drops the old one', async () => {
    const sw = fakeScope({ ...serverOf(V1), ...serverOf(V2) });
    const m1 = manifestOf(V1), m2 = manifestOf(V2);
    await precache(sw, m1);
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

  it('keeps fonts for offline use: the cached copy first, refreshed when online', async () => {
    const online = { on: true };
    const font = 'https://fonts.gstatic.com/s/dmsans/x.woff2';
    const sw = fakeScope({ [font]: 'FONT' }, online);
    const m = manifestOf(V1);
    expect(await (await respond(sw, m, new Request(font), new Set())).text()).toBe('FONT');
    online.on = false;
    expect(await (await respond(sw, m, new Request(font), new Set())).text()).toBe('FONT');
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
    for (const f of ['earth_atmos_2048.jpg', 'earth_clouds_1024.png', 'earth_lights_2048.png', 'earth_normal_2048.jpg', 'earth_specular_2048.jpg']) {
      expect(urls).toContain(`textures/${f}`);
    }
    expect(urls).toEqual(expect.arrayContaining(['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png']));
  }, 120_000);
});
