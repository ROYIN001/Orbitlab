import { WorkspaceError, WorkspaceRepository, type WorkspaceLocks } from './repository';
import type { RawStorage } from './registry';
import { bindWorkspaceStorage } from './storage';
export { workspaceStorage, workspaceOwner, registerWorkspaceFlush } from './storage';
let repository: WorkspaceRepository | null = null;
export function workspaceRepository(): WorkspaceRepository | null { return repository; }
export async function initializeWorkspace(): Promise<WorkspaceRepository> {
  let storage: RawStorage, session: RawStorage, available = true;
  const memory = (): RawStorage => {
    const values = new Map<string, string>();
    return { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }, removeItem: (k) => { values.delete(k); } };
  };
  try { storage = localStorage; } catch { storage = memory(); available = false; }
  try { session = sessionStorage; } catch { session = memory(); available = false; }
  const locks: WorkspaceLocks | undefined = available && typeof navigator !== 'undefined' && navigator.locks
    ? { request: (name, options, callback) => navigator.locks.request(name, options, callback) } : undefined;
  repository = new WorkspaceRepository(storage, session, locks, {
    migrate: async (profileId) => { const { migrateLegacyMedia } = await import('./media-ownership'); await migrateLegacyMedia(profileId); },
    delete: async (profileId) => { const { deleteProfileMedia } = await import('./media-ownership'); await deleteProfileMedia(profileId); },
  });
  await repository.initialize();
  const initialized = repository;
  bindWorkspaceStorage(initialized.binding, (flush) => initialized.registerFlush(flush), (write) => {
    const binding = initialized.binding;
    if (!binding) throw new WorkspaceError('missing');
    return { ...binding.token(write), durable: initialized.status !== 'ephemeral' };
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if ((event.key === 'orbitlab.profiles.catalog.v1' || event.key === `orbitlab.profile.v1.${repository?.binding?.profileId}`) && repository?.binding) {
        try { repository.binding.assertCurrent(); }
        catch { repository.binding.invalidate(); window.dispatchEvent(new CustomEvent('orbitlab-profile-conflict')); }
      }
    });
  }
  return repository;
}
