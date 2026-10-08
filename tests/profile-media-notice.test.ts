import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLang } from '../src/i18n';
import { WorkspaceRepository, LEGACY_PROFILE_ID, PROFILE_CATALOG_KEY, PROFILE_SELECTED_KEY, profileStorageKey, type WorkspaceLocks } from '../src/workspace/repository';
import { AppProfiles } from '../src/ui/profiles/app-profiles';

/** The shell status line reads the repository this document opened; the profile menu itself is not part of this check. */
let current: WorkspaceRepository | null = null;
vi.mock('../src/workspace/session', () => ({ workspaceRepository: () => current }));
vi.mock('../src/ui/profiles/profile-menu', () => ({ createProfileMenu: () => ({ isOpen: false, open() {}, openReset() {}, applyLanguage() {} }) }));

function localMemory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
}
const locks: WorkspaceLocks = { request: async (_name, _options, run) => run({}) };
const record = (id: string, name: string) => JSON.stringify({ version: 1, id, name, createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z', revision: 0, epoch: 0, values: {} });
class ElementStub {
  hidden = false; textContent = ''; title = ''; dataset: Record<string, string> = {};
  readonly label = { textContent: '' };
  addEventListener(): void {}
  setAttribute(): void {}
  append(): void {}
  querySelector(): { textContent: string } { return this.label; }
}

/**
 * A device whose legacy media move was still pending (the build before D-68 aborted it on a collision): the first
 * learner "Ada" (legacy-v1) has her own recording for a mission that also has an original upload, and the device
 * has a second learner "Boris". This start finishes the move and leaves that one original in place.
 */
async function start(selected: string, legacy = record(LEGACY_PROFILE_ID, 'Ada'), notices = ['media-collisions-kept']):
  Promise<{ notice: ElementStub; repo: WorkspaceRepository; profiles: AppProfiles }> {
  vi.stubGlobal('window', { addEventListener() {} });
  vi.stubGlobal('document', { documentElement: {}, createElement: () => new ElementStub() });
  const storage = localMemory({
    [PROFILE_CATALOG_KEY]: JSON.stringify({ version: 1, profiles: { [LEGACY_PROFILE_ID]: {}, boris: {} }, legacyId: LEGACY_PROFILE_ID, mediaMigrated: false }),
    [profileStorageKey(LEGACY_PROFILE_ID)]: legacy,
    [profileStorageKey('boris')]: record('boris', 'Boris'),
  });
  const repo = await new WorkspaceRepository(storage, localMemory({ [PROFILE_SELECTED_KEY]: selected }), locks,
    { migrate: async () => 1, delete: async () => {} }).initialize();
  expect(repo.notices).toEqual(notices);
  current = repo;
  const notice = new ElementStub();
  const profiles = new AppProfiles({} as HTMLDialogElement, new ElementStub() as unknown as HTMLButtonElement, notice as unknown as HTMLElement);
  return { notice, repo, profiles };
}
afterEach(() => { setLang('en'); current?.close(); current = null; vi.unstubAllGlobals(); });

describe('legacy audio left in place (M-PLATFORM-010, D-68): the status line names the learner whose audio it is', () => {
  it('names the first learner while another learner is open, in every language', async () => {
    const { notice, repo, profiles } = await start('boris');
    expect(repo.status).toBe('durable'); expect(repo.active()?.name).toBe('Boris');
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toBe('For missions where Ada already had their own audio, the original uploaded audio was not moved. Both copies are kept; Ada’s own audio is used.');
    setLang('th'); profiles.applyLanguage();
    expect(notice.textContent).toBe('สำหรับภารกิจที่ Ada มีเสียงของตัวเองอยู่แล้ว เสียงที่อัปโหลดเดิมไม่ได้ย้ายเข้าโปรไฟล์ ยังเก็บไว้ทั้งสองไฟล์ และใช้เสียงของ Ada เอง');
    setLang('ru'); profiles.applyLanguage();
    expect(notice.textContent).toBe('Для миссий, где у учащегося «Ada» уже было своё аудио, исходное загруженное аудио не перенесено. Сохранены обе копии; используется аудио учащегося «Ada».');
  });
  it('names the first learner on the chooser, where no learner is open', async () => {
    const { notice, repo } = await start('');
    expect(repo.status).toBe('chooser'); expect(repo.binding).toBeNull();
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toBe('For missions where Ada already had their own audio, the original uploaded audio was not moved. Both copies are kept; Ada’s own audio is used.');
  });
  it('shows the general recovery notice, never an empty name, when the first learner’s record cannot be read', async () => {
    const { notice, repo } = await start('boris', '{broken', ['media-collisions-kept', 'legacy-cleanup-pending']);
    expect(repo.mediaCollisionOwner).toBe(LEGACY_PROFILE_ID);
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toBe('Saved data or the learner selection needs attention. Existing records have been kept; review a backup or reload before changing them.');
  });
});
