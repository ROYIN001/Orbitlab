import { workspaceRepository } from '../../workspace/session';
import { WorkspaceError, type WorkspaceRepository } from '../../workspace/repository';
import type { ProfileDialog } from './profile-dialog';
import { profileContextText as profileText } from './context-text';
import './context.css';

/** Shell integration has one immutable document owner. A transition ends this
 * document instead of rebinding existing editors, workers or a live flight. */
export class AppProfiles {
  private readonly repo: WorkspaceRepository;
  private dialog: ProfileDialog | null = null;
  private loading: Promise<ProfileDialog> | null = null;

  constructor(private readonly dialogElement: HTMLDialogElement, private readonly button: HTMLButtonElement, private readonly notice: HTMLElement,
    private readonly recordedLessons?: () => { id: string; title: string }[] | undefined) {
    const repo = workspaceRepository();
    if (!repo) throw new WorkspaceError('missing');
    this.repo = repo;

    button.addEventListener('click', () => this.open(button));
    window.addEventListener('orbitlab-profile-conflict', () => {
      this.applyLanguage();
      if (!this.dialog?.isOpen) this.open();
    });
    window.addEventListener('orbitlab-workspace-storage-error', () => this.applyLanguage());
    this.applyLanguage();
    // A deleted last/active owner always gets an explicit chooser. Locked or
    // temporary work is explained before the user starts editing.
    if (this.repo.status !== 'durable') queueMicrotask(() => this.open());
  }

  name(): string {
    try { return this.repo.active()?.name ?? ''; }
    catch { return ''; }
  }

  private load(): Promise<ProfileDialog> {
    if (this.dialog) return Promise.resolve(this.dialog);
    if (!this.loading) this.loading = import('./profile-menu').then(({ createProfileMenu }) => {
      this.dialog = createProfileMenu(this.dialogElement, this.repo, () => this.applyLanguage(), () => this.reloadWorkspace(), this.recordedLessons);
      return this.dialog;
    });
    return this.loading;
  }

  private loadFailed(): void {
    this.notice.hidden = false;
    this.notice.textContent = profileText('moduleFailed');
    const reload = document.createElement('button');
    reload.type = 'button';
    reload.textContent = '↻';
    reload.setAttribute('aria-label', profileText('moduleFailed'));
    reload.addEventListener('click', () => location.reload());
    this.notice.append(' ', reload);
  }

  open(opener: HTMLElement | null = null): void { void this.load().then((dialog) => dialog.open(opener)).catch(() => this.loadFailed()); }
  openReset(opener: HTMLElement | null = null, lessonId?: string): void {
    void this.load().then((dialog) => dialog.openReset(opener, lessonId)).catch(() => this.loadFailed());
  }
  reloadAfterImport(): void { this.repo.close(); this.reloadWorkspace(); }

  applyLanguage(): void {
    const name = this.name();
    const label = name ? profileText('entry', { name }) : profileText('title');
    this.button.querySelector('#profile-label')!.textContent = label;
    this.button.title = label;
    this.button.setAttribute('aria-label', label);
    this.button.dataset.profileStatus = this.repo.status;
    const conflict = !this.repo.binding?.valid && this.repo.status === 'durable';
    const key = conflict ? 'chooser' : this.repo.status === 'ephemeral' ? 'ephemeral' : this.repo.status === 'locked' ? 'locked'
      : this.repo.notices.includes('storage-write-failed') ? 'storageWriteFailed'
      : this.repo.notices.includes('media-migration-pending') ? 'mediaMigrationPending'
      : this.repo.notices.length ? 'recoveryNotice' : null;
    this.notice.hidden = key === null;
    this.notice.textContent = key ? profileText(key) : '';
    if (this.dialog?.isOpen) this.dialog.applyLanguage();
  }

  private reloadWorkspace(): void {
    // Shared query/lesson inputs belong to the old visit. They must not replace
    // the new learner's saved mission when the shell boots again.
    history.replaceState(null, '', `${location.pathname}#/home`);
    location.reload();
  }
}
