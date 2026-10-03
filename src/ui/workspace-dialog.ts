import { t } from '../i18n';
import { Modal } from './dialogs';
import type { WorkHost } from './workspace-host';
import type { WorkContent } from './workspace-content';

/** The small modal shell stays available even if a feature chunk cannot load. */
export class WorkDialog extends Modal {
  private readonly title = document.createElement('h2');
  private readonly status = document.createElement('p');
  private readonly holder = document.createElement('div');
  private content: WorkContent | null = null;
  private loading: Promise<void> | null = null;
  private failed = false;
  private message: string | null = null;

  constructor(dialog: HTMLDialogElement, private readonly host: WorkHost) {
    super(dialog);
    this.title.id = 'work-title';
    dialog.setAttribute('aria-labelledby', this.title.id);
    // Native dialog cancellation still closes My work. The same Escape must
    // not also reach the underlying lesson page's global navigation handler.
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') event.stopPropagation();
    });
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');
    this.body.append(this.title, this.status, this.holder);
  }

  override open(opener: HTMLElement | null = null): void {
    super.open(opener);
    void this.load();
  }

  override applyLanguage(): void {
    super.applyLanguage();
    this.title.textContent = t('work.title');
    this.content?.applyLanguage();
    this.status.textContent = this.message ? t(this.message) : this.failed ? t('work.loadFailed') : this.content ? '' : t('work.loading');
    if (this.failed) {
      const reload = document.createElement('button');
      reload.type = 'button';
      reload.textContent = t('work.reload');
      // Browsers cache failed native imports for this document. Reloading
      // gives the module a fresh fetch after connectivity has returned.
      reload.addEventListener('click', () => location.reload());
      this.holder.replaceChildren(reload);
    }
  }

  report(key: string): void {
    this.message = key;
    this.status.textContent = t(key);
  }

  private load(): Promise<void> {
    if (this.content) return Promise.resolve();
    if (this.loading) return this.loading;
    this.failed = false;
    this.holder.replaceChildren();
    this.applyLanguage();
    this.loading = import('./workspace-content').then(({ WorkContent }) => {
      this.content = new WorkContent(this.host);
      this.holder.replaceChildren(this.content.root);
      this.applyLanguage();
    }).catch(() => {
      this.failed = true;
      this.applyLanguage();
    }).finally(() => { this.loading = null; });
    return this.loading;
  }
}
