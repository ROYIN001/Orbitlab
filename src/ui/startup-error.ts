import { t } from '../i18n';
import { WebGLContextError } from '../render/webgl-renderer';
import './startup-error.css';

function translated<K extends keyof HTMLElementTagNameMap>(tag: K, key: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.dataset.i18n = key;
  node.textContent = t(key);
  return node;
}

/** Keep a failed startup actionable, including when the browser cannot create a 3-D context. */
export function showStartupError(error: unknown): void {
  const loading = document.getElementById('loading');
  if (!loading) return;
  const webgl = error instanceof WebGLContextError;
  const content = document.createElement('div');
  const title = translated('h2', webgl ? 'startup.webglTitle' : 'startup.title');
  title.id = 'startup-error-title';
  title.tabIndex = -1;
  content.append(title, translated('p', webgl ? 'startup.webglHelp' : 'startup.help'));
  if (webgl) {
    const steps = document.createElement('ol');
    for (const key of ['startup.closeTabs', 'startup.browser', 'startup.acceleration']) {
      steps.append(translated('li', key));
    }
    content.append(steps);
  }
  const reload = translated('button', 'startup.reload');
  reload.type = 'button';
  reload.className = 'launch-button';
  reload.addEventListener('click', () => location.reload());
  const details = document.createElement('details');
  const message = document.createElement('p');
  // An error can contain a URL or browser-supplied text. Never interpret it as markup.
  message.textContent = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  details.append(translated('summary', 'startup.details'), message);
  content.append(reload, details);
  loading.replaceChildren(content);
  loading.classList.remove('hidden');
  loading.classList.add('startup-error');
  loading.dataset.startupError = webgl ? 'webgl' : 'generic';
  loading.setAttribute('role', 'region');
  loading.setAttribute('aria-labelledby', title.id);
  title.focus();
}
