import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHECK_MESSAGE, PREPARE_MESSAGE, checkClassroom } from '../src/classroom/readiness';
import { classroomEn, classroomRu, classroomTh } from '../src/i18n/classroom';
import { precacheManifest } from '../src/pwa/manifest';
import {
  MANIFEST_KEY, OFFLINE_CHECK, OFFLINE_PREPARE, installServiceWorker, offlineResources, precache, precacheName, prepareOffline,
  type CacheLike, type SwScope,
} from '../src/pwa/sw-core';
import type { OfflineReply } from '../src/pwa/offline-protocol';

const BASE = 'https://example.test/Orbitlab/';
const SCRIPT = `${BASE}assets/index-a.js`;
const FILES = {
  'index.html': '<html>installed build</html>',
  'assets/index-a.js': 'app',
  'assets/flight.worker-a.js': 'worker',
  'data/space-weather.json': JSON.stringify({ asOf: '2026-09-24', data: {} }),
  'lessons/packs/ipst-basic.orbitlab-lesson.json': JSON.stringify({ pack: { id: 'ipst-basic', title: { en: 'Basic' }, contents: [{ id: 'first' }] } }),
};
const manifest = precacheManifest(await Promise.all(Object.entries(FILES).map(async ([url, body]) => ({
  url, revision: [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)))]
    .map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16),
}))));

function fixture() {
  const caches = new Map<string, Map<string, Response>>();
  const listeners = new Map<string, (event: never) => void>();
  const server = new Map(Object.entries(FILES).map(([path, body]) => [BASE + path, body]));
  const state = { online: true, storageFails: false, quotaFails: false, skipped: 0 };
  const key = (request: RequestInfo | URL) => typeof request === 'string' ? request : request instanceof URL ? request.href : request.url;
  const scope: SwScope = {
    registration: { scope: BASE },
    caches: {
      async keys() { if (state.storageFails) throw new Error('storage blocked'); return [...caches.keys()]; },
      async open(name) {
        if (state.storageFails) throw new Error('storage blocked');
        if (!caches.has(name)) caches.set(name, new Map());
        const store = caches.get(name)!;
        return {
          async match(request) { return store.get(key(request))?.clone(); },
          async put(request, response) {
            if (state.quotaFails) throw new DOMException('full', 'QuotaExceededError');
            store.set(key(request), response.clone());
          },
        } satisfies CacheLike;
      },
      async delete(name) { return caches.delete(name); },
    },
    async fetch(input) {
      if (!state.online) throw new TypeError('offline');
      const body = server.get(key(input));
      return new Response(body ?? 'missing', { status: body === undefined ? 404 : 200 });
    },
    async skipWaiting() { state.skipped++; },
    clients: { async claim() {} },
    addEventListener(type, listener) { listeners.set(type, listener); },
  };
  return { scope, state, caches, server, listeners, active: () => caches.get(precacheName(manifest.version))! };
}

describe('classroom offline readiness', () => {
  it('checks the active page, all installed files and cached dataset dates while disconnected', async () => {
    const f = fixture();
    await precache(f.scope, manifest);
    f.state.online = false;
    const result = await offlineResources(f.scope, manifest, SCRIPT);
    expect(result.complete).toBe(true);
    expect(result.cached).toBe(Object.keys(FILES).length);
    expect(result.bytes).toBe(Object.values(FILES).reduce((n, body) => n + new TextEncoder().encode(body).byteLength, 0));
    expect(result.dates['data/space-weather.json']).toBe('2026-09-24');
    expect(result.packs['ipst-basic']).toEqual({ title: { en: 'Basic' }, count: 1 });
    expect((await offlineResources(f.scope, manifest, `${BASE}assets/index-new.js`)).complete).toBe(false);
  });

  it('never calls an empty, partial, or evicted cache ready and checking creates no cache', async () => {
    const f = fixture();
    expect((await offlineResources(f.scope, manifest, SCRIPT)).complete).toBe(false);
    expect(f.caches.size).toBe(0);
    await precache(f.scope, manifest);
    f.active().delete(BASE + MANIFEST_KEY);
    expect((await offlineResources(f.scope, manifest, SCRIPT)).complete).toBe(false);
    await precache(f.scope, manifest);
    f.active().delete(BASE + 'assets/flight.worker-a.js');
    const result = await offlineResources(f.scope, manifest, SCRIPT);
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual(['assets/flight.worker-a.js']);
  });

  it('repairs the exact version, preserves another waiting cache, and never activates an update', async () => {
    const f = fixture();
    await precache(f.scope, manifest);
    await f.scope.caches.open(precacheName('waiting'));
    f.active().delete(BASE + 'assets/flight.worker-a.js');
    const repaired = await prepareOffline(f.scope, manifest, SCRIPT);
    expect(repaired.error).toBeUndefined();
    expect(repaired.resources?.complete).toBe(true);
    expect(f.caches.has(precacheName('waiting'))).toBe(true);
    expect(f.state.skipped).toBe(0);
  });

  it('does not rewrite an already complete cache when storage has no room for new writes', async () => {
    const f = fixture();
    await precache(f.scope, manifest);
    f.state.quotaFails = true;
    const result = await prepareOffline(f.scope, manifest, SCRIPT);
    expect(result.error).toBeUndefined();
    expect(result.resources?.complete).toBe(true);
  });

  it('rejects a newer public file instead of mixing versions in the active cache', async () => {
    const f = fixture();
    await precache(f.scope, manifest);
    const path = 'data/space-weather.json';
    f.active().delete(BASE + path);
    f.server.set(BASE + path, '{"asOf":"new deploy"}');
    const result = await prepareOffline(f.scope, manifest, SCRIPT);
    expect(result.error).toBe('version');
    expect(result.resources?.complete).toBe(false);
    expect(f.active().has(BASE + path)).toBe(false);
    expect(await f.active().get(BASE + 'index.html')?.text()).toBe(FILES['index.html']);
  });

  it('verifies existing bytes when rebuilding a missing installation marker', async () => {
    const f = fixture();
    await precache(f.scope, manifest);
    f.active().delete(BASE + MANIFEST_KEY);
    f.active().set(BASE + 'index.html', new Response('different build'));
    f.server.set(BASE + 'index.html', 'different build');
    expect((await prepareOffline(f.scope, manifest, SCRIPT)).error).toBe('version');
    expect(f.active().has(BASE + MANIFEST_KEY)).toBe(false);
  });

  it('rejects valid-looking bytes from a different deploy even with the original completion marker', async () => {
    const f = fixture();
    await precache(f.scope, manifest);
    f.active().set(BASE + 'assets/index-a.js', new Response('different app code'));
    f.active().set(BASE + 'data/space-weather.json', new Response('{"asOf":"2030-01-01","data":{}}'));
    const checked = await offlineResources(f.scope, manifest, SCRIPT);
    expect(checked.complete).toBe(false);
    expect(checked.missing).toEqual(['assets/index-a.js', 'data/space-weather.json']);
    expect(checked.dates['data/space-weather.json']).toBeUndefined();
    const repaired = await prepareOffline(f.scope, manifest, SCRIPT);
    expect(repaired.error).toBeUndefined();
    expect(repaired.resources?.complete).toBe(true);
    expect(repaired.resources?.dates['data/space-weather.json']).toBe('2026-09-24');
  });

  it('reports unavailable downloads, denied storage and quota failures without false readiness', async () => {
    const f = fixture();
    await precache(f.scope, manifest);
    f.active().delete(BASE + 'assets/flight.worker-a.js');
    f.state.online = false;
    expect((await prepareOffline(f.scope, manifest, SCRIPT)).error).toBe('download');
    f.state.online = true; f.state.quotaFails = true;
    expect((await prepareOffline(f.scope, manifest, SCRIPT)).error).toBe('storage');
    expect(f.active().has(BASE + 'assets/flight.worker-a.js')).toBe(false);
    f.state.storageFails = true;
    expect(await prepareOffline(f.scope, manifest, SCRIPT)).toEqual({ error: 'storage' });
  });

  it('holds the worker alive until its resource reply and agrees on protocol names', async () => {
    expect(CHECK_MESSAGE).toBe(OFFLINE_CHECK); expect(PREPARE_MESSAGE).toBe(OFFLINE_PREPARE);
    const f = fixture();
    await precache(f.scope, manifest);
    installServiceWorker(f.scope, manifest);
    let pending: Promise<unknown> | undefined, reply: OfflineReply | undefined;
    f.listeners.get('message')!({
      data: { type: CHECK_MESSAGE, pageScript: SCRIPT },
      ports: [{ postMessage(result: OfflineReply) { reply = result; } }],
      waitUntil(work: Promise<unknown>) { pending = work; },
    } as never);
    await pending;
    expect(reply?.resources?.complete).toBe(true);
    expect(f.state.skipped).toBe(0);
  });

  it('covers each preparation and error state in all three languages', () => {
    for (const dict of [classroomRu, classroomTh]) expect(Object.keys(dict).sort()).toEqual(Object.keys(classroomEn).sort());
  });
});

describe('classroom page readiness', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  const browser = (registration: boolean, storageDenied = false, waiting = false) => {
    const worker = {
      postMessage(_data: unknown, ports: MessagePort[]) {
        ports[0].postMessage({ resources: { complete: true, pageMatches: true, version: manifest.version } });
      },
    };
    const update = waiting ? { state: 'installed', postMessage: vi.fn() } : null;
    const installed = { active: worker, waiting: update,
      update: vi.fn(async () => { installed.waiting = null; }) };
    vi.stubEnv('PROD', true);
    vi.stubGlobal('window', { isSecureContext: true });
    vi.stubGlobal('document', { querySelector: () => ({ src: SCRIPT }) });
    vi.stubGlobal('navigator', {
      onLine: false,
      serviceWorker: { controller: worker, getRegistration: async () => registration ? installed : undefined },
      storage: { async estimate() { if (storageDenied) throw new Error('denied'); return { quota: 100, usage: 20 }; } },
    });
    return installed;
  };

  it('requires an active registration even while an unregistered worker controls the old tab', async () => {
    browser(false);
    const result = await checkClassroom();
    expect(result.error).toBe('uncontrolled');
    expect(result.resources).toBeUndefined();
  });

  it('uses the installed resource reply while disconnected and treats storage estimates separately', async () => {
    browser(true, true);
    const result = await checkClassroom();
    expect(result.error).toBeUndefined();
    expect(result.resources?.complete).toBe(true);
    expect(result.storage.unavailable).toBe(true);
  });

  it('prepares the active cache without superseding an already waiting update', async () => {
    const registration = browser(true, false, true);
    const waiting = registration.waiting!;
    const result = await checkClassroom(true);
    expect(result.error).toBeUndefined();
    expect(result.resources?.complete).toBe(true);
    expect(result.waiting).toBe(true);
    expect(registration.waiting).toBe(waiting);
    expect(waiting.postMessage).not.toHaveBeenCalled();
    expect(registration.update).not.toHaveBeenCalled();
  });

  it('does not leave background update jobs behind a successful preparation', async () => {
    const registration = browser(true);
    const result = await checkClassroom(true);
    expect(result.error).toBeUndefined();
    expect(result.resources?.complete).toBe(true);
    expect(registration.update).not.toHaveBeenCalled();
  });
});
