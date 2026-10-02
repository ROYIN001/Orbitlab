import { t } from '../../i18n';
import {
  PROJECT_FILE_EXTENSION, PROJECT_MAX_BYTES, PROJECT_RECOVERY_KEY, PROJECT_SECTIONS, ProjectError,
  exportProjectArchive, importProjectArchive, parseProjectArchive, previewProjectImport, projectArchiveText, projectCounts,
  recoverProjectImport, type ProjectCounts, type ProjectPreview, type ProjectSection, type ProjectStorage,
} from '../../projects/archive';
import { downloadBlob } from '../download';
import { button, el } from '../orbit/dom';
import './projects.css';

export interface ProjectsHost {
  isBusy(): boolean;
  /** Reload all restored models (the application uses a page reload). Called only after a committed import. */
  onImported(sections: ProjectSection[]): void;
}

export class ProjectsPanel {
  readonly root = el('section', 'projects-panel');
  private preview: ProjectPreview | null = null;
  private readonly selected = new Set<ProjectSection>();
  private message: { key: string; section?: ProjectSection } | null = null;
  private busy = false;
  private pendingRecovery = false;
  private fileName = '';

  constructor(private readonly host: ProjectsHost, private readonly storage: () => ProjectStorage = () => localStorage) {
    this.root.id = 'project-backups';
    this.root.setAttribute('aria-labelledby', 'project-backups-title');
  }

  section(): HTMLElement { this.refresh(); return this.root; }
  refresh(): void {
    try { this.pendingRecovery = this.storage().getItem(PROJECT_RECOVERY_KEY) !== null; }
    catch { this.message ??= { key: 'projects.error.storage' }; }
    this.render();
  }

  private failure(error: unknown): void {
    this.message = error instanceof ProjectError
      ? { key: `projects.error.${error.code}`, section: error.section }
      : { key: 'projects.error.storage' };
    if (error instanceof ProjectError && ['rollback', 'pending', 'recoveryConflict'].includes(error.code)) this.pendingRecovery = true;
    this.refresh();
  }

  private reload(sections: ProjectSection[]): void {
    try { this.host.onImported(sections); }
    catch { this.message = { key: 'projects.reloadNeeded' }; this.render(); }
  }

  saveFile(): void {
    if (this.busy || this.host.isBusy()) { this.message = { key: 'projects.busy' }; this.render(); return; }
    try {
      const archive = exportProjectArchive(this.storage());
      downloadBlob(new Blob([projectArchiveText(archive)], { type: 'application/json' }),
        `orbitlab-project-${archive.exportedAt.slice(0, 10)}${PROJECT_FILE_EXTENSION}`);
      this.message = { key: 'projects.exported' };
      this.render();
    } catch (error) { this.failure(error); }
  }

  async openFile(file: File): Promise<void> {
    if (this.busy || this.host.isBusy()) return;
    this.busy = true;
    this.preview = null;
    this.selected.clear();
    this.message = null;
    this.render();
    try {
      if (file.size > PROJECT_MAX_BYTES) throw new ProjectError('oversize');
      const archive = parseProjectArchive(await file.text());
      this.preview = previewProjectImport(archive, this.storage());
      this.fileName = file.name;
      for (const section of PROJECT_SECTIONS) {
        if (Object.hasOwn(archive.data, section) && this.preview.before[section] === null) this.selected.add(section);
      }
    } catch (error) { this.failure(error); }
    finally { this.busy = false; this.render(); }
  }

  private apply(): void {
    if (!this.preview || this.busy) return;
    if (this.host.isBusy()) { this.message = { key: 'projects.busy' }; this.render(); return; }
    try {
      const changed = importProjectArchive(this.preview, [...this.selected], this.storage());
      if (!changed.length) return;
      this.preview = null;
      this.selected.clear();
      this.message = { key: 'projects.imported' };
      this.render();
      this.reload(changed);
    } catch (error) { this.failure(error); }
  }

  private recover(): void {
    if (this.host.isBusy()) { this.message = { key: 'projects.busy' }; this.render(); return; }
    try {
      const restored = recoverProjectImport(this.storage());
      this.preview = null;
      this.message = { key: 'projects.recovered' };
      this.refresh();
      if (restored) this.reload([...PROJECT_SECTIONS]);
    } catch (error) { this.failure(error); }
  }

  private countLabel(section: ProjectSection, counts: ProjectCounts): string {
    if (section === 'progress') return t('projects.count.progress', {
      lessons: counts.lessons, assessments: counts.assessments, customLessons: counts.customLessons, customQuestions: counts.customQuestions,
    });
    return t('projects.count.items', { count: section === 'mission' ? counts.mission : section === 'designs' ? counts.designs : counts.experiments });
  }

  private render(): void {
    const title = el('h2', '', t('projects.title'));
    title.id = 'project-backups-title';
    const actions = el('div', 'projects-actions');
    const fileInput = el('input');
    fileInput.type = 'file';
    fileInput.accept = `${PROJECT_FILE_EXTENSION},.json,application/json`;
    fileInput.hidden = true;
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) void this.openFile(file);
    });
    const save = button('ghost-button', t('projects.export'), () => this.saveFile());
    const open = button('ghost-button', t('projects.open'), () => fileInput.click());
    save.id = 'btn-project-export'; open.id = 'btn-project-open';
    save.disabled = open.disabled = this.busy || this.pendingRecovery || this.host.isBusy();
    actions.append(save, open, fileInput);
    const status = el('p', 'projects-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    if (this.message) status.textContent = `${t(this.message.key)}${this.message.section ? ` ${t(`projects.section.${this.message.section}`)}.` : ''}`;
    else if (this.host.isBusy()) status.textContent = t('projects.busy');
    this.root.replaceChildren(title, el('p', '', t('projects.scope')), el('p', 'projects-note', t('projects.browserNote')), actions, status);
    if (this.pendingRecovery) {
      const recovery = el('div', 'projects-recovery');
      const retry = button('ghost-button', t('projects.recover'), () => this.recover());
      retry.disabled = this.host.isBusy();
      recovery.append(el('p', '', t('projects.error.pending')), retry);
      this.root.append(recovery);
    }
    if (!this.preview) return;
    const preview = el('section', 'projects-preview');
    preview.setAttribute('aria-labelledby', 'project-preview-title');
    const heading = el('h3', '', t('projects.preview'));
    heading.id = 'project-preview-title';
    preview.append(heading, el('p', 'projects-filename', this.fileName), el('p', '', t('projects.replaceNote')));
    const incoming = projectCounts(this.preview.archive.data), existing = projectCounts(this.preview.existing);
    let sections = 0;
    for (const section of PROJECT_SECTIONS) {
      if (!Object.hasOwn(this.preview.archive.data, section)) continue;
      sections++;
      const row = el('div', 'projects-preview-row');
      const info = el('div');
      const name = t(`projects.section.${section}`);
      info.append(el('strong', '', name), el('p', '', t('projects.fileCount', { detail: this.countLabel(section, incoming) })));
      const current = this.preview.unreadable.includes(section) ? t('projects.unreadable') : this.countLabel(section, existing);
      info.append(el('p', '', t('projects.browserCount', { detail: current })));
      const label = el('label', 'projects-choice', t('projects.choice', { section: name }));
      const select = el('select');
      select.dataset.section = section;
      const keep = el('option', '', t('projects.keep')); keep.value = 'keep';
      const replace = el('option', '', t(this.preview.before[section] === null ? 'projects.add' : 'projects.replace')); replace.value = 'replace';
      select.append(keep, replace);
      select.value = this.selected.has(section) ? 'replace' : 'keep';
      select.addEventListener('change', () => {
        if (select.value === 'replace') this.selected.add(section); else this.selected.delete(section);
        const apply = this.root.querySelector<HTMLButtonElement>('#btn-project-apply');
        if (apply) apply.disabled = this.selected.size === 0 || this.host.isBusy();
      });
      label.append(select); row.append(info, label); preview.append(row);
    }
    if (!sections) preview.append(el('p', '', t('projects.empty')));
    preview.append(el('p', 'projects-note', t('projects.reload')));
    const row = el('div', 'projects-actions');
    const apply = button('ghost-button', t('projects.apply'), () => this.apply());
    apply.id = 'btn-project-apply';
    apply.disabled = this.selected.size === 0 || this.host.isBusy();
    row.append(apply, button('ghost-button', t('projects.cancel'), () => { this.preview = null; this.selected.clear(); this.render(); }));
    preview.append(row); this.root.append(preview);
  }
}
