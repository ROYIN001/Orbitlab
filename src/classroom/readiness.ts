import type { OfflineFailure, OfflineReply, OfflineResources } from '../pwa/offline-protocol';

export type ClassroomError = OfflineFailure | 'unsupported' | 'uncontrolled' | 'timeout';
export interface ClassroomReadiness {
  resources?: OfflineResources;
  error?: ClassroomError;
  waiting: boolean;
  storage: { usage?: number; quota?: number; unavailable: boolean };
  checkedAt: number;
}

// Do not import sw-core at runtime: the service worker is a classic script.
export const CHECK_MESSAGE = 'orbitlab:offline-check';
export const PREPARE_MESSAGE = 'orbitlab:offline-prepare';

async function message(worker: ServiceWorker, prepare: boolean): Promise<OfflineReply> {
  const channel = new MessageChannel();
  return new Promise((resolve, reject) => {
    const close = (): void => { clearTimeout(timer); channel.port1.close(); channel.port2.close(); };
    const timer = setTimeout(() => { close(); reject(new Error('timeout')); }, 45_000);
    channel.port1.onmessage = (event: MessageEvent<OfflineReply>) => { close(); resolve(event.data); };
    try {
      worker.postMessage({
        type: prepare ? PREPARE_MESSAGE : CHECK_MESSAGE,
        pageScript: document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src ?? '',
      }, [channel.port2]);
    } catch { close(); reject(new Error('uncontrolled')); }
  });
}

async function controller(container: ServiceWorkerContainer): Promise<ServiceWorker> {
  if (container.controller) return container.controller;
  return new Promise((resolve, reject) => {
    const changed = (): void => {
      if (!container.controller) return;
      clearTimeout(timer);
      container.removeEventListener('controllerchange', changed);
      resolve(container.controller);
    };
    const timer = setTimeout(() => {
      container.removeEventListener('controllerchange', changed);
      reject(new Error('uncontrolled'));
    }, 45_000);
    container.addEventListener('controllerchange', changed);
  });
}

/** Readiness comes from the active worker and its cache, never the network indicator. */
export async function checkClassroom(prepare = false): Promise<ClassroomReadiness> {
  const result: ClassroomReadiness = { waiting: false, storage: { unavailable: true }, checkedAt: Date.now() };
  try {
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      result.storage = { usage: estimate.usage, quota: estimate.quota, unavailable: false };
    }
  } catch { /* Cache verification still works when the storage estimate is unavailable. */ }
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) {
    return { ...result, error: 'unsupported' };
  }
  try {
    const sw = navigator.serviceWorker;
    let registration = await sw.getRegistration();
    // Preparation verifies/repairs the active version. Deployment checks
    // belong to register.ts: a parallel update job here can supersede a
    // waiting worker while we are reporting its readiness.
    if (prepare) registration ??= await sw.register('./sw.js');
    result.waiting = !!registration?.waiting;
    if (!prepare && !sw.controller) return { ...result, error: 'uncontrolled' };
    const active = prepare ? await controller(sw) : sw.controller!;
    // An unregistered worker can still control this open tab, although it
    // will not protect the next navigation. Require its live registration.
    if (!registration?.active) return { ...result, error: 'uncontrolled' };
    const reply = await message(active, prepare);
    result.resources = reply.resources;
    result.error = reply.error;
    result.waiting = !!registration?.waiting;
    if (sw.controller !== active) { result.error = 'version'; result.resources = undefined; }
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    result.error = code === 'timeout' || code === 'uncontrolled' ? code : 'storage';
  }
  result.checkedAt = Date.now();
  return result;
}
