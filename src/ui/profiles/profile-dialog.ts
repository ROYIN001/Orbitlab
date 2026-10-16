import { Modal } from '../dialogs';
import { profileText as text, type ProfileTextKey } from './text';
import './profiles.css';

export type ProfileResetScope = 'learning' | 'exams' | 'all';
export type ProfileChange = 'switch' | 'create' | 'delete' | 'reset' | 'import';
export interface ProfileCounts {
  lessons: number; assessments: number; designs: number; experiments: number;
  drafts?: number; customLessons?: number; customQuestions?: number; audio?: number;
}
export interface ProfileItem { id: string; name: string; counts: ProfileCounts }
/** A stored profile this version cannot read: shown with an explanation, kept byte for byte until the user decides. */
export interface UnreadableProfileItem { id: string; state: 'unreadable' | 'newer' | 'missing'; name?: string }
export interface ProfileDialogSnapshot {
  profiles: readonly ProfileItem[];
  unreadable?: readonly UnreadableProfileItem[];
  activeId: string | null;
  status?: 'durable' | 'ephemeral' | 'locked' | 'chooser';
  /** Only lessons with saved history: the selector does not create a new progress entry. */
  lessons?: readonly { id: string; title: string }[];
}
/** Mutation callbacks own storage and the safe flush/seal/reload transition. UI never changes the owner itself. */
export interface ProfileDialogHost {
  snapshot(): ProfileDialogSnapshot;
  create(name: string): Promise<void> | void;
  rename(id: string, name: string): Promise<void> | void;
  switchTo(id: string): Promise<void> | void;
  remove(id: string): Promise<void> | void;
  reset(scope: ProfileResetScope, lessonId?: string): Promise<void> | void;
  exportBackup(profileId?: string): Promise<void> | void;
  prepareChange(action: ProfileChange): Promise<boolean | void> | boolean | void;
  reload?(): void;
  /** `skipped` counts stored profiles left out because this version cannot read them. */
  /** `exported: false` when nothing readable was left to export (no file was downloaded). */
  exportAll?(): Promise<{ skipped: number; exported?: boolean } | void> | { skipped: number; exported?: boolean } | void;
  exportRaw?(profileId: string): Promise<void> | void;
  exportMedia?(profileId?: string): Promise<void> | void;
  importMedia?(file: File, profileId: string, mode: 'keep' | 'replace'): Promise<void> | void;
  previewMedia?(file: File): Promise<{ profileName: string; tracks: number }>;
  previewImport?(file: File): Promise<ProfileImportPreview>;
  importBackup?(file: File, options: ProfileImportOptions): Promise<void> | void;
}
export interface ProfileImportPreview {
  legacy: boolean; profiles: readonly { name: string; counts: ProfileCounts }[]; mediaIncluded: false;
  quarantinedValues?: number;
  recoveryValues?: number;
}
export interface ProfileImportOptions { targetId?: string; mode: 'keep' | 'replace'; name?: string; allProfiles: boolean }
type Screen = { kind: 'list' } | { kind: 'name'; id?: string; value: string }
  | { kind: 'switch' | 'delete' | 'deleteUnreadable'; id: string } | { kind: 'create'; name: string }
  | { kind: 'reset'; scope: ProfileResetScope; lessonId?: string; oneLesson: boolean }
  | { kind: 'backups' } | { kind: 'import'; file: File; preview: ProfileImportPreview; options: ProfileImportOptions }
  | { kind: 'media'; file: File; profileId: string; mode: 'keep' | 'replace'; preview?: { profileName: string; tracks: number } };
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, value?: string): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  if (cls) element.className = cls;
  if (value !== undefined) element.textContent = value;
  return element;
};
function errorReason(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const messages: Record<string, ProfileTextKey> = {
    storage: 'errorStorage', invalid: 'errorInvalid', newer: 'errorNewer', stale: 'errorStale', missing: 'errorMissing',
    limit: 'errorLimit', oversize: 'errorOversize', pending: 'errorPending', locked: 'locked',
  };
  return messages[code] ? text(messages[code]) : error instanceof Error ? error.message : String(error);
}
const rowText = (profile: UnreadableProfileItem): string =>
  text(profile.state === 'newer' ? 'rowNewer' : profile.state === 'missing' ? 'rowMissing' : 'rowUnreadable');
const rowName = (profile: UnreadableProfileItem): string => profile.name ?? text('unreadableName');
type MessageKey = 'error' | 'backupDone' | 'backupPartial' | 'backupNoneReadable' | 'mediaDone';

/** Native modal with explicit destructive scopes and a chooser after active/last-profile deletion. */
export class ProfileDialog extends Modal {
  private screen: Screen = { kind: 'list' };
  private busy = false;
  private message: { key: MessageKey; reason?: string } | null = null;

  constructor(dialog: HTMLDialogElement, private readonly host: ProfileDialogHost) {
    super(dialog);
    dialog.id ||= 'profile-dialog';
    dialog.classList.add('profile-dialog');
    dialog.setAttribute('aria-labelledby', 'profile-title');
    dialog.addEventListener('keydown', (event) => { if (event.key === 'Escape') event.stopPropagation(); });
    dialog.addEventListener('cancel', (event) => { if (!this.canClose()) event.preventDefault(); });
  }

  override open(opener: HTMLElement | null = null): void {
    this.screen = { kind: 'list' };
    this.message = null;
    super.open(opener);
  }

  openReset(opener: HTMLElement | null = null, lessonId?: string): void {
    this.screen = { kind: 'reset', scope: 'learning', lessonId, oneLesson: !!lessonId };
    this.message = null;
    super.open(opener);
  }

  override close(): void { if (this.canClose()) super.close(); }
  /** `close()` and Escape read live; a render passes the snapshot it drew (M-PLATFORM-005). */
  private canClose(snapshot = this.host.snapshot()): boolean { return !this.busy && !!snapshot.activeId; }

  override applyLanguage(): void {
    const focusKey = document.activeElement instanceof HTMLElement && this.el.contains(document.activeElement)
      ? document.activeElement.dataset.profileFocus : undefined;
    super.applyLanguage();
    this.render();
    if (focusKey) this.el.querySelector<HTMLElement>(`[data-profile-focus="${focusKey}"]`)?.focus();
  }

  private button(key: ProfileTextKey, action: () => void, kind = ''): HTMLButtonElement {
    const button = node('button', kind, text(key));
    button.type = 'button';
    button.disabled = this.busy;
    button.dataset.profileFocus = key;
    button.addEventListener('click', action);
    return button;
  }
  private go(screen: Screen): void { this.screen = screen; this.message = null; this.render(); }
  private actions(...buttons: HTMLButtonElement[]): HTMLElement {
    const row = node('div', 'profile-actions'); row.append(...buttons); return row;
  }
  private async run(action: () => Promise<void> | void, change?: ProfileChange): Promise<void> {
    if (this.busy) return;
    this.busy = true; this.message = null; this.render();
    try {
      if (change && await this.host.prepareChange(change) === false) return;
      await action();
      this.screen = { kind: 'list' };
    } catch (error) {
      this.message = { key: 'error', reason: errorReason(error) };
    } finally { this.busy = false; this.render(); }
  }
  /** Export without leaving the screen; `done` picks the status line from the host's result. */
  private async keep<T>(task: () => T | Promise<T>, done: (result?: T) => MessageKey = () => 'backupDone'): Promise<void> {
    if (this.busy) return;
    const screen = this.screen; let result: T | undefined;
    await this.run(async () => { result = await task(); });
    this.screen = screen;
    this.message ??= { key: done(result) };
    this.render();
  }
  private backup(id?: string): void { void this.keep(() => this.host.exportBackup(id)); }
  private counts(counts: Partial<ProfileCounts>): HTMLElement {
    const box = node('section', 'profile-counts');
    box.append(node('h3', undefined, text('countsTitle')));
    const list = node('dl');
    for (const [key, value] of Object.entries(counts)) {
      if (value === undefined) continue;
      list.append(node('dt', undefined, text(key as keyof ProfileCounts)), node('dd', undefined, String(value)));
    }
    box.append(list); return box;
  }

  private render(): void {
    const focused = document.activeElement;
    const restoreFocus = this.isOpen && (!focused || focused === document.body || this.el.contains(focused));
    const focusKey = focused instanceof HTMLElement ? focused.dataset.profileFocus : undefined;
    const snapshot = this.host.snapshot();
    const active = snapshot.profiles.find((item) => item.id === snapshot.activeId);
    const readonly = snapshot.status === 'locked' || snapshot.status === 'ephemeral';
    const title = node('h2', undefined, text('title')); title.id = 'profile-title';
    const content = node('div', 'profile-content');
    content.append(node('p', 'profile-local-note', text('local')));
    if (active) content.append(node('p', 'profile-current-name', text('active', { name: active.name })));
    else content.append(node('p', 'profile-chooser-note', text('chooser')));
    if (readonly) {
      const warning = node('p', 'profile-warning', text(snapshot.status! as 'locked' | 'ephemeral'));
      warning.setAttribute('role', 'status'); content.append(warning);
    }
    if (this.host.reload && (readonly || !snapshot.activeId)) content.append(this.button('reload', () => this.host.reload?.()));
    if (this.screen.kind === 'list') this.list(content, snapshot, readonly);
    else if (this.screen.kind === 'name') this.nameForm(content, snapshot, readonly);
    else if (this.screen.kind === 'reset') this.resetForm(content, snapshot, active, readonly);
    else if (this.screen.kind === 'backups') this.backups(content, snapshot, readonly);
    else if (this.screen.kind === 'import') this.importForm(content, snapshot, readonly);
    else if (this.screen.kind === 'media') this.mediaConfirmation(content, snapshot, readonly);
    else this.confirmation(content, snapshot, readonly);
    const status = node('p', `profile-status${this.message?.key === 'error' ? ' profile-error' : ''}`);
    status.setAttribute('role', this.message?.key === 'error' ? 'alert' : 'status');
    status.setAttribute('aria-live', 'polite');
    const key = this.message?.key;
    status.textContent = this.busy ? text('busy') : key ? text(key, { reason: this.message!.reason ?? '' })
      + (key === 'backupPartial' || key === 'backupNoneReadable' ? ' ' + text('backupEach') : '') : '';
    this.body.replaceChildren(title, content, status);
    const close = this.el.querySelector<HTMLButtonElement>('.dialog-close');
    if (close) close.disabled = !this.canClose(snapshot);
    if (this.busy) this.body.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button,input,select').forEach((item) => { item.disabled = true; });
    if (restoreFocus) {
      // Replacing an async form removes the focused button. Keep Escape in
      // this dialog, rather than letting it navigate the lesson underneath.
      const previous = focusKey ? this.el.querySelector<HTMLElement>(`[data-profile-focus="${focusKey}"]:not([disabled])`) : null;
      const next = previous ?? this.el.querySelector<HTMLElement>('button:not([disabled]),input:not([disabled]):not([hidden]),select:not([disabled])');
      if (next) next.focus();
      else { this.el.tabIndex = -1; this.el.focus(); }
    }
  }
  private list(content: HTMLElement, snapshot: ProfileDialogSnapshot, readonly: boolean): void {
    const list = node('ul', 'profile-list');
    for (const profile of snapshot.profiles) {
      const row = node('li', 'profile-list-row'); row.dataset.profileId = profile.id;
      row.append(node('strong', 'profile-list-name', profile.name));
      const current = profile.id === snapshot.activeId;
      if (current) row.append(node('span', 'profile-current-tag', text('current')));
      const open = this.button('switch', () => this.go({ kind: 'switch', id: profile.id }));
      open.disabled = this.busy || current || snapshot.status === 'ephemeral';
      const rename = this.button('rename', () => this.go({ kind: 'name', id: profile.id, value: profile.name }));
      const remove = this.button('delete', () => this.go({ kind: 'delete', id: profile.id }), 'profile-danger-text');
      rename.disabled ||= readonly; remove.disabled ||= readonly;
      row.append(this.actions(open, rename, remove)); list.append(row);
    }
    for (const profile of snapshot.unreadable ?? []) {
      const row = node('li', 'profile-list-row profile-unreadable-row'); row.dataset.profileId = profile.id;
      const missing = profile.state === 'missing';
      row.append(node('strong', 'profile-list-name', rowName(profile)), node('p', 'profile-warning', missing ? rowText(profile) : `${rowText(profile)} ${text('rowKept')}`));
      const remove = this.rowButton('delete', profile, () => this.go({ kind: 'deleteUnreadable', id: profile.id }), 'profile-danger-text');
      remove.disabled ||= readonly;
      const buttons = missing ? [remove] : [this.rowButton('exportRaw', profile, () => this.saveRaw(profile.id)), remove];
      row.append(this.actions(...buttons)); list.append(row);
    }
    if (!snapshot.profiles.length && !snapshot.unreadable?.length) content.append(node('p', undefined, text('empty')));
    content.append(list);
    const create = this.button('create', () => this.go({ kind: 'name', value: '' }), 'profile-primary');
    create.disabled ||= snapshot.status === 'ephemeral';
    const reset = this.button('reset', () => this.go({ kind: 'reset', scope: 'learning', oneLesson: false }));
    reset.disabled ||= !snapshot.activeId || readonly;
    const backups = this.button('backups', () => this.go({ kind: 'backups' }));
    content.append(this.actions(create, reset, backups));
  }
  private nameForm(content: HTMLElement, snapshot: ProfileDialogSnapshot, readonly: boolean): void {
    if (this.screen.kind !== 'name') return;
    const screen = this.screen;
    const form = node('form', 'profile-name-form');
    const label = node('label', undefined, text('name'));
    const input = node('input'); input.type = 'text'; input.maxLength = 80; input.required = true;
    input.autocomplete = 'off'; input.value = screen.value; input.dataset.profileFocus = 'name';
    input.addEventListener('input', () => { screen.value = input.value; }); label.append(input);
    const submit = this.button(screen.id ? 'save' : 'create', () => form.requestSubmit(), 'profile-primary');
    submit.disabled ||= screen.id ? readonly : snapshot.status === 'ephemeral';
    form.append(label, node('p', undefined, text('createLead')), this.actions(this.button('back', () => this.go({ kind: 'list' })), submit));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = screen.value.trim();
      if (!name || name.length > 80) { this.message = { key: 'error', reason: text('invalidName') }; this.render(); return; }
      if (screen.id) void this.run(() => this.host.rename(screen.id!, name));
      else this.go({ kind: 'create', name });
    }); content.append(form);
  }
  /** Switch, create and delete; `deleteUnreadable` is the delete of a record this version cannot read:
   *  explicit, with its state explained and copies offered first (S10 §10.1 rule 2). */
  private confirmation(content: HTMLElement, snapshot: ProfileDialogSnapshot, readonly: boolean): void {
    const screen = this.screen;
    if (screen.kind !== 'switch' && screen.kind !== 'delete' && screen.kind !== 'create' && screen.kind !== 'deleteUnreadable') return;
    const kind = screen.kind === 'deleteUnreadable' ? 'delete' : screen.kind;
    const broken = screen.kind === 'deleteUnreadable' ? snapshot.unreadable?.find((item) => item.id === screen.id) : undefined;
    const profile = screen.kind === 'create' || screen.kind === 'deleteUnreadable' ? null : snapshot.profiles.find((item) => item.id === screen.id);
    if (screen.kind !== 'create' && !profile && !broken) { this.screen = { kind: 'list' }; this.list(content, snapshot, readonly); return; }
    const name = screen.kind === 'create' ? screen.name : broken ? rowName(broken) : profile!.name;
    content.append(node('h3', undefined, text(`${kind}Title`, { name })));
    if (broken) content.append(node('p', 'profile-warning', rowText(broken)));
    const deleting = kind === 'delete';
    content.append(node('p', deleting ? 'profile-warning' : '', text(deleting ? 'deleteLead' : 'transition')));
    if (broken) {
      if (broken.state !== 'missing') content.append(this.button('exportRaw', () => this.saveRaw(broken.id)));
      this.mediaExport(content, snapshot, broken.id);
    } else if (deleting) {
      content.append(this.counts(profile!.counts));
      if (profile!.id === snapshot.activeId) content.append(node('p', 'profile-warning', text('deleteActive')));
      content.append(this.button('backup', () => this.backup(profile!.id)));
      content.append(node('p', 'profile-warning', text('jsonMedia')));
      this.mediaExport(content, snapshot, profile!.id);
    }
    const confirm = this.button(deleting ? 'deleteConfirm' : 'confirm', () => {
      if (screen.kind === 'create') void this.run(() => this.host.create(screen.name), 'create');
      else if (screen.kind === 'switch') void this.run(() => this.host.switchTo(screen.id), 'switch');
      else void this.run(() => this.host.remove(screen.id), 'delete');
    }, deleting ? 'profile-danger' : 'profile-primary');
    confirm.disabled ||= deleting && readonly;
    content.append(this.actions(this.button('cancel', () => this.go({ kind: 'list' })), confirm));
  }
  private resetForm(content: HTMLElement, snapshot: ProfileDialogSnapshot, active: ProfileItem | undefined, readonly: boolean): void {
    if (this.screen.kind !== 'reset') return;
    const screen = this.screen;
    if (!active) { this.screen = { kind: 'list' }; this.list(content, snapshot, readonly); return; }
    content.append(node('h3', undefined, text('resetTitle', { name: active.name })), node('p', undefined, text('resetLead')));
    const label = node('label', undefined, text('scope')); const select = node('select'); select.dataset.profileFocus = 'scope';
    select.setAttribute('aria-label', text('scope'));
    for (const key of ['learning', 'exams', 'all', 'lesson'] as const) {
      const option = node('option', undefined, text(key)); option.value = key;
      if (key === 'lesson') option.disabled = !snapshot.lessons?.length;
      select.append(option);
    }
    select.value = screen.oneLesson ? 'lesson' : screen.scope;
    select.addEventListener('change', () => {
      this.go({ kind: 'reset', scope: select.value === 'lesson' ? 'learning' : select.value as ProfileResetScope,
        oneLesson: select.value === 'lesson', lessonId: screen.lessonId ?? snapshot.lessons?.[0]?.id });
    }); label.append(select); content.append(label);
    if (screen.oneLesson) {
      const lessonLabel = node('label', undefined, text('chooseLesson')); const lesson = node('select'); lesson.dataset.profileFocus = 'lesson';
      lesson.setAttribute('aria-label', text('chooseLesson'));
      for (const item of snapshot.lessons ?? []) { const option = node('option', undefined, item.title); option.value = item.id; lesson.append(option); }
      screen.lessonId ??= snapshot.lessons?.[0]?.id;
      lesson.value = screen.lessonId ?? '';
      lesson.addEventListener('change', () => { screen.lessonId = lesson.value; this.render(); });
      lessonLabel.append(lesson); content.append(lessonLabel);
      if (!snapshot.lessons?.length) content.append(node('p', undefined, text('noLessons')));
    }
    content.append(this.counts({
      ...(screen.scope !== 'exams' ? { lessons: screen.oneLesson ? Number(!!screen.lessonId && snapshot.lessons?.some((item) => item.id === screen.lessonId)) : active.counts.lessons } : {}),
      ...(screen.scope !== 'learning' ? { assessments: active.counts.assessments } : {}),
    }), node('p', 'profile-warning', text('resetEffects')), this.button('backup', () => this.backup(active.id)));
    const confirm = this.button('resetConfirm', () => void this.run(() => this.host.reset(screen.scope, screen.oneLesson ? screen.lessonId : undefined), 'reset'), 'profile-danger');
    confirm.disabled ||= readonly || (screen.oneLesson && !snapshot.lessons?.some((item) => item.id === screen.lessonId));
    content.append(this.actions(this.button('cancel', () => this.go({ kind: 'list' })), confirm));
  }

  private filePicker(key: ProfileTextKey, accept: string, action: (file: File) => void, disabled = false): HTMLElement {
    const input = node('input'); input.type = 'file'; input.accept = accept; input.hidden = true;
    input.addEventListener('change', () => { const file = input.files?.[0]; if (file) action(file); input.value = ''; });
    const button = this.button(key, () => input.click()); button.disabled ||= disabled;
    const holder = node('div', 'profile-file-picker'); holder.append(button, input); return holder;
  }
  private backups(content: HTMLElement, snapshot: ProfileDialogSnapshot, readonly: boolean): void {
    content.append(node('h3', undefined, text('backups')), node('p', 'profile-warning', text('jsonMedia')));
    const current = snapshot.activeId;
    const single = this.button('exportProfile', () => this.backup(current ?? undefined));
    // A JSON snapshot also lets a visit-only or locked reader preserve the
    // scoped data it can read. It never enables a durable mutation or media write.
    single.disabled ||= !current;
    content.append(single);
    if (this.host.exportAll) {
      const all = this.button('exportAll', () => this.backupAll()); all.disabled ||= readonly; content.append(all);
    }
    if (this.host.exportMedia) {
      const media = this.button('exportMedia', () => this.exportAudio(current ?? undefined)); media.disabled ||= !current || readonly; content.append(media);
    }
    if (this.host.previewImport && this.host.importBackup) content.append(this.filePicker('importBackup', '.json,application/json', (file) => void this.preview(file), readonly));
    if (this.host.importMedia) content.append(this.filePicker('importMedia', '.orbitlab-audio,application/octet-stream', (file) => {
      if (current) void this.previewAudio(file, current);
    }, !current || readonly));
    content.append(this.actions(this.button('back', () => this.go({ kind: 'list' }))));
  }
  private backupAll(): void {
    void this.keep(() => this.host.exportAll?.(), (result) =>
      result?.exported === false ? 'backupNoneReadable' : result?.skipped ? 'backupPartial' : 'backupDone');
  }
  /** A row action whose accessible name and focus key include the profile, so rows can be told apart. */
  private rowButton(key: ProfileTextKey, profile: UnreadableProfileItem, action: () => void, kind = ''): HTMLButtonElement {
    const button = this.button(key, action, kind);
    button.setAttribute('aria-label', `${text(key)}: ${rowName(profile)}`);
    button.dataset.profileFocus = `${key}:${profile.id}`;
    return button;
  }
  /** Audio export only reads media; it needs real (not visit-only) storage, never the owner lock. */
  private mediaExport(content: HTMLElement, snapshot: ProfileDialogSnapshot, id: string): void {
    if (!this.host.exportMedia) return;
    const button = this.button('exportMedia', () => this.exportAudio(id));
    if (snapshot.status === 'ephemeral') { button.disabled = true; content.append(button, node('p', undefined, text('mediaUnavailable'))); }
    else content.append(button);
  }
  private saveRaw(id: string): void { void this.keep(() => this.host.exportRaw?.(id)); }
  private exportAudio(id?: string): void { void this.keep(() => this.host.exportMedia?.(id)); }
  private async preview(file: File): Promise<void> {
    if (!this.host.previewImport || this.busy) return;
    this.busy = true; this.message = null; this.render();
    try {
      const preview = await this.host.previewImport(file);
      if (!preview.profiles.length) throw new Error(text('empty'));
      this.screen = { kind: 'import', file, preview, options: { mode: 'keep', allProfiles: preview.profiles.length > 1, name: preview.profiles[0].name } };
    } catch (error) { this.message = { key: 'error', reason: errorReason(error) }; }
    finally { this.busy = false; this.render(); }
  }
  private importForm(content: HTMLElement, snapshot: ProfileDialogSnapshot, readonly: boolean): void {
    if (this.screen.kind !== 'import') return;
    const screen = this.screen;
    content.append(node('h3', undefined, text('importBackup')), node('p', undefined, text('importLead')),
      node('p', 'profile-warning', text('jsonMedia')), node('h3', undefined, text('sourceProfiles')));
    for (const profile of screen.preview.profiles) content.append(node('strong', undefined, profile.name), this.counts(profile.counts));
    if (screen.preview.legacy) content.append(node('p', 'profile-warning', text('legacy')));
    if (screen.preview.quarantinedValues || screen.preview.recoveryValues) content.append(node('p', 'profile-warning', text('quarantine', {
      count: screen.preview.quarantinedValues ?? screen.preview.recoveryValues ?? 0,
    })));
    if (screen.options.allProfiles) content.append(node('p', undefined, text('multiImport')));
    else {
      const targetLabel = node('label', undefined, text('destination')); const target = node('select'); target.dataset.profileFocus = 'destination';
      target.setAttribute('aria-label', text('destination'));
      const newProfile = node('option', undefined, text('newProfile')); newProfile.value = ''; target.append(newProfile);
      for (const profile of snapshot.profiles) { const option = node('option', undefined, profile.name); option.value = profile.id; target.append(option); }
      target.value = screen.options.targetId ?? '';
      target.addEventListener('change', () => { screen.options.targetId = target.value || undefined; screen.options.mode = 'keep'; this.render(); });
      targetLabel.append(target); content.append(targetLabel);
      if (!screen.options.targetId) {
        const nameLabel = node('label', undefined, text('importName')); const name = node('input'); name.value = screen.options.name ?? '';
        name.maxLength = 80; name.dataset.profileFocus = 'importName'; name.addEventListener('input', () => { screen.options.name = name.value; });
        nameLabel.append(name); content.append(nameLabel);
      } else {
        const modeLabel = node('label', undefined, text('merge')); const mode = node('select'); mode.dataset.profileFocus = 'merge';
        mode.setAttribute('aria-label', text('merge'));
        for (const [value, key] of [['keep', 'keep'], ['replace', 'replace']] as const) { const option = node('option', undefined, text(key)); option.value = value; mode.append(option); }
        mode.value = screen.options.mode; mode.addEventListener('change', () => { screen.options.mode = mode.value as 'keep' | 'replace'; this.render(); });
        modeLabel.append(mode); content.append(modeLabel);
        if (screen.options.mode === 'replace') content.append(node('p', 'profile-warning', text('replaceWarning')),
          this.button('backup', () => this.backup(screen.options.targetId)));
      }
    }
    const confirm = this.button('importConfirm', () => {
      if (!screen.options.allProfiles && !screen.options.targetId && !screen.options.name?.trim()) {
        this.message = { key: 'error', reason: text('invalidName') }; this.render(); return;
      }
      void this.run(() => this.host.importBackup?.(screen.file, { ...screen.options }), 'import');
    }, screen.options.mode === 'replace' ? 'profile-danger' : 'profile-primary');
    confirm.disabled ||= readonly;
    content.append(this.actions(this.button('cancel', () => this.go({ kind: 'backups' })), confirm));
  }
  private mediaConfirmation(content: HTMLElement, snapshot: ProfileDialogSnapshot, readonly: boolean): void {
    if (this.screen.kind !== 'media') return;
    const screen = this.screen; const profile = snapshot.profiles.find((item) => item.id === screen.profileId);
    content.append(node('h3', undefined, text('importMedia')), node('p', undefined, text('active', { name: profile?.name ?? '' })),
      node('p', 'profile-warning', text('mediaWarning')));
    if (screen.preview) content.append(node('p', undefined, text('mediaSource', { name: screen.preview.profileName, count: screen.preview.tracks })));
    const modeLabel = node('label', undefined, text('merge')); const mode = node('select'); mode.dataset.profileFocus = 'merge';
    mode.setAttribute('aria-label', text('merge'));
    for (const [value, key] of [['keep', 'keep'], ['replace', 'replace']] as const) { const option = node('option', undefined, text(key)); option.value = value; mode.append(option); }
    mode.value = screen.mode; mode.addEventListener('change', () => { screen.mode = mode.value as 'keep' | 'replace'; this.render(); });
    modeLabel.append(mode); content.append(modeLabel);
    if (this.host.exportMedia) content.append(this.button('exportMedia', () => this.exportAudio(screen.profileId)));
    const confirm = this.button('confirm', () => void this.run(async () => {
      await this.host.importMedia?.(screen.file, screen.profileId, screen.mode);
      this.message = { key: 'mediaDone' };
    }, 'import'), 'profile-primary'); confirm.disabled ||= readonly || !profile;
    content.append(this.actions(this.button('cancel', () => this.go({ kind: 'backups' })), confirm));
  }
  private async previewAudio(file: File, profileId: string): Promise<void> {
    if (this.busy) return;
    this.busy = true; this.message = null; this.render();
    try {
      const preview = await this.host.previewMedia?.(file);
      this.screen = { kind: 'media', file, profileId, mode: 'keep', preview };
    } catch (error) { this.message = { key: 'error', reason: errorReason(error) }; }
    finally { this.busy = false; this.render(); }
  }
}
