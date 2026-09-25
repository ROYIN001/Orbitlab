/**
 * The page's side of the offline app (roadmap U03): register the service
 * worker in a production build, say once when the app is ready to work
 * offline, and offer a reload when a new deploy has installed beside the
 * running version. The dev server never registers one.
 */
import { t } from '../i18n';

/**
 * The message that moves a waiting worker on: `SKIP_WAITING` in sw-core.ts,
 * spelled out here (tests/pwa.test.ts holds them equal) because importing it
 * would make sw-core a chunk the page and the worker share, and a classic
 * service worker cannot import one.
 */
export const SKIP_WAITING_MESSAGE = 'orbitlab:skip-waiting';

/** How often an open tab asks whether a new version was deployed. */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const sw = navigator.serviceWorker;
  // A page opened with no worker in control is the first install.
  const firstInstall = !sw.controller;
  let reloading = false;
  sw.addEventListener('controllerchange', () => {
    if (firstInstall || reloading) return;
    reloading = true;
    location.reload();
  });
  sw.register('./sw.js').then((registration) => {
    const offer = (worker: ServiceWorker): void => {
      toast(t('pwa.updateReady'), t('pwa.reload'), () => worker.postMessage(SKIP_WAITING_MESSAGE));
    };
    if (registration.waiting && sw.controller) offer(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state !== 'installed') return;
        if (sw.controller) offer(worker);
        else toast(t('pwa.offlineReady'));
      });
    });
    setInterval(() => { void registration.update().catch(() => { /* offline */ }); }, UPDATE_CHECK_MS);
  }).catch(() => { /* no worker: the app still runs online */ });
}

function toast(text: string, action?: string, onAction?: () => void): void {
  document.getElementById('pwa-toast')?.remove();
  const box = document.createElement('div');
  box.id = 'pwa-toast';
  box.className = 'pwa-toast';
  box.setAttribute('role', 'status');
  const p = document.createElement('span');
  p.textContent = text;
  box.append(p);
  if (action && onAction) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pwa-toast-action';
    b.textContent = action;
    b.addEventListener('click', () => { b.disabled = true; onAction(); });
    box.append(b);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'pwa-toast-close';
  close.setAttribute('aria-label', t('share.dismiss'));
  close.textContent = '×';
  close.addEventListener('click', () => box.remove());
  box.append(close);
  document.body.append(box);
  if (!action) setTimeout(() => box.remove(), 8000);
}
