import { parseWorkspaceArchive, workspaceImportWarnings, WORKSPACE_FORMAT, WORKSPACE_MAX_BYTES, WorkspaceError, type WorkspaceRepository, type WorkspaceArchive } from '../../workspace/repository';
import { ProfileDialog, type ProfileDialogHost, type ProfileDialogSnapshot, type ProfileCounts, type ProfileItem, type UnreadableProfileItem } from './profile-dialog';
import { downloadBlob } from '../download';

/** Backup/readout adapters are loaded with the menu, not during app startup. */
class ProfileMenuHost {
  readonly host: ProfileDialogHost;
  constructor(private readonly repo: WorkspaceRepository,
    private readonly applyLanguage: () => void, private readonly reloadWorkspace: () => void,
    private readonly recordedLessons?: () => { id: string; title: string }[] | undefined) {
    this.host = {
      snapshot: () => this.snapshot(),
      prepareChange: () => this.repo.prepareChange(),
      create: async (name) => {
        const created = await this.repo.create(name);
        await this.repo.select(created.id);
        this.reloadWorkspace();
      },
      rename: async (id, name) => {
        await this.repo.rename(id, name);
        this.applyLanguage();
        window.dispatchEvent(new CustomEvent('orbitlab-profile-name-changed'));
      },
      switchTo: async (id) => { await this.repo.select(id); this.reloadWorkspace(); },
      remove: async (id) => {
        const activeId = this.snapshot().activeId;
        await this.repo.delete(id);
        if (id === activeId) this.reloadWorkspace();
        else this.applyLanguage();
      },
      reset: async (scope, lessonId) => { await this.repo.reset(scope, lessonId); this.reloadWorkspace(); },
      exportBackup: async (id) => {
        await this.repo.prepareChange();
        this.download(this.repo.exportProfile(id));
      },
      exportAll: async () => {
        await this.repo.prepareChange();
        const skipped = this.repo.listWithStatus().filter((row) => row.state !== 'ok').length;
        this.download(this.repo.exportAll());
        return { skipped };
      },
      exportRaw: async (id) => {
        const raw = this.repo.rawProfile(id);
        downloadBlob(new Blob([raw], { type: 'application/json' }), `Orbitlab-${new Date().toISOString().slice(0, 10)}-stored-profile-${id}.json`);
      },
      previewImport: async (file) => {
        const raw = await this.archiveText(file);
        const archive = await parseWorkspaceArchive(raw);
        return { legacy: JSON.parse(raw).format !== WORKSPACE_FORMAT, mediaIncluded: false, ...await workspaceImportWarnings(archive),
          profiles: archive.profiles.map((p) => ({ name: p.name, counts: this.importCounts(p.values) })),
        };
      },
      importBackup: async (file, options) => {
        const raw = await this.archiveText(file);
        if (options.allProfiles) {
          await this.repo.importProfiles(raw);
          this.applyLanguage();
          return;
        }
        const imported = await this.repo.importArchive(raw, options);
        if (!options.targetId) {
          await this.repo.select(imported.id);
          this.reloadWorkspace();
        } else if (!this.repo.binding?.valid) this.reloadWorkspace();
        else this.applyLanguage();
      },
      exportMedia: async (id) => {
        if (this.repo.status !== 'durable') throw new WorkspaceError('locked');
        const target = id ?? this.repo.binding?.profileId;
        if (!target) throw new WorkspaceError('missing');
        // Only the target is read; audio of an unreadable profile can still be saved before a delete.
        const profile = this.repo.profileRow(target);
        await this.repo.prepareChange();
        const { exportProfileMediaArchive } = await import('../../workspace/media-archive');
        const blob = await exportProfileMediaArchive(profile.id, profile.name ?? profile.id);
        downloadBlob(blob, `Orbitlab-${new Date().toISOString().slice(0, 10)}.orbitlab-audio`);
      },
      previewMedia: async (file) => {
        const { previewMediaArchive } = await import('../../workspace/media-archive');
        const preview = await previewMediaArchive(file);
        return { profileName: preview.profileName, tracks: preview.tracks.length };
      },
      importMedia: async (file, profileId, mode) => {
        const binding = this.repo.binding;
        if (this.repo.status !== 'durable' || !binding || binding.profileId !== profileId) throw new WorkspaceError('locked');
        const { importProfileMediaArchive } = await import('../../workspace/media-archive');
        await importProfileMediaArchive(file, binding, mode);
      },
      reload: () => location.reload(),
    };
  }

  name(): string {
    try { return this.repo.active()?.name ?? ''; }
    catch { return ''; }
  }

  private counts(values: Readonly<Record<string, string>>, base: ProfileCounts): ProfileCounts {
    const result: ProfileCounts = { ...base };
    result.drafts = Object.keys(values).filter((key) => /^(orbitlab\.build\.(explore|satellite|requirements)\.v1|orbitlab\.author\.(draft|design|kind)|orbitlab\.worksheets)$/.test(key)).length;
    try {
      const data = JSON.parse(values['orbitlab.lessons'] ?? 'null');
      result.customLessons = Array.isArray(data?.customLessons) ? data.customLessons.length : 0;
      result.customQuestions = Array.isArray(data?.customQuestions) ? data.customQuestions.length : 0;
    } catch { /* Damaged personal bytes stay available in the raw backup. */ }
    return result;
  }

  private importCounts(values: Readonly<Record<string, string>>): ProfileCounts {
    const read = (key: string): Record<string, unknown> => {
      try { return JSON.parse(values[key] ?? '{}') ?? {}; } catch { return {}; }
    };
    const progress = read('orbitlab.lessons'), designs = read('orbitlab.designs'), notebook = read('orbitlab.experiments.v1');
    return this.counts(values, {
      lessons: progress.lessons && typeof progress.lessons === 'object' ? Object.keys(progress.lessons).length : 0,
      assessments: Array.isArray(progress.assessments) ? progress.assessments.length : 0,
      designs: Array.isArray(designs.designs) ? designs.designs.length : 0,
      experiments: Array.isArray(notebook.experiments) ? notebook.experiments.length : 0,
    });
  }

  private async archiveText(file: File): Promise<string> {
    if (file.size > WORKSPACE_MAX_BYTES) throw new WorkspaceError('oversize');
    return file.text();
  }

  private snapshot(): ProfileDialogSnapshot {
    const profiles: ProfileItem[] = [], unreadable: UnreadableProfileItem[] = [];
    try {
      for (const row of this.repo.listWithStatus()) {
        if (row.state !== 'ok') { unreadable.push({ id: row.id, state: row.state, name: row.name }); continue; }
        const { state: _state, ...p } = row;
        profiles.push({ ...p, counts: this.counts(this.repo.read(p.id).values, p.counts) });
      }
    } catch { /* The chooser explains inaccessible storage; never overwrite it. */ }
    const activeId = this.name() && this.repo.binding?.valid ? this.repo.binding.profileId : null;
    const lessons = activeId ? this.recordedLessons?.() ?? [] : [];
    return { profiles, unreadable, activeId, lessons, status: activeId ? this.repo.status : 'chooser' };
  }

  private download(archive: WorkspaceArchive): void {
    const date = archive.exportedAt.slice(0, 10);
    downloadBlob(new Blob([JSON.stringify(archive, null, 2) + '\n'], { type: 'application/json' }), `Orbitlab-${date}.orbitlab-workspace.json`);
  }

}

/** Test seam: the storage-facing host without the dialog DOM. */
export function createProfileMenuHost(repo: WorkspaceRepository, changed: () => void, reload: () => void): ProfileDialogHost {
  return new ProfileMenuHost(repo, changed, reload).host;
}

export function createProfileMenu(element: HTMLDialogElement, repo: WorkspaceRepository,
  changed: () => void, reload: () => void, lessons?: () => { id: string; title: string }[] | undefined): ProfileDialog {
  const owner = new ProfileMenuHost(repo, changed, reload, lessons);
  return new ProfileDialog(element, owner.host);
}
