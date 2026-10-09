import { isWorkspaceKey, legacyValues, type RawStorage } from './registry';

export const PROFILE_CATALOG_KEY = 'orbitlab.profiles.catalog.v1';
export const PROFILE_SELECTED_KEY = 'orbitlab.profiles.selected.v1';
export const LEGACY_PROFILE_ID = 'legacy-v1';
export const PROFILE_MAX_COUNT = 40;
export const WORKSPACE_FORMAT = 'orbitlab.workspace';
export type WorkspaceStatus = 'durable' | 'ephemeral' | 'locked' | 'chooser';
export type WorkspaceErrorCode = 'storage' | 'invalid' | 'newer' | 'locked' | 'stale' | 'missing' | 'limit' | 'pending' | 'oversize';
export class WorkspaceError extends Error {
  constructor(readonly code: WorkspaceErrorCode) { super(code); this.name = 'WorkspaceError'; }
}
export interface WorkspaceLocks {
  request<T>(name: string, options: { ifAvailable?: boolean }, callback: (lock: unknown | null) => Promise<T>): Promise<T>;
}
export interface ProfileCounts { lessons: number; assessments: number; designs: number; experiments: number }
export interface ProfileSummary {
  id: string; name: string; createdAt: string; updatedAt: string; revision: number; epoch: number; counts: ProfileCounts;
}
/** A catalogue row. An unreadable or newer record is reported, never rewritten (M-PLATFORM-004). */
export type ProfileListRow = (ProfileSummary & { state: 'ok' }) | { id: string; state: 'unreadable' | 'newer' | 'missing'; name?: string };
interface ProfileRecord { version: 1; id: string; name: string; createdAt: string; updatedAt: string; revision: number; epoch: number; values: Record<string, string> }
interface Catalog { version: 1; profiles: Record<string, { deleting?: boolean }>; legacyId: string; mediaMigrated: boolean }
export interface WorkspaceArchive {
  format: typeof WORKSPACE_FORMAT; version: 1; exportedAt: string;
  profiles: { id: string; name: string; createdAt?: string; updatedAt?: string; revision?: number; epoch?: number; values: Record<string, string> }[];
  media: { included: false; reason: 'separate-binary-export' };
}
export interface ImportOptions { targetId?: string; mode?: 'keep' | 'replace'; name?: string }
/** `migrate` may resolve with the number of legacy recordings it left in place because the owner already had one (D-68). */
export interface WorkspaceMedia { migrate(profileId: string): Promise<number | void>; delete(profileId: string): Promise<void> }
const noMedia: WorkspaceMedia = { migrate: async () => {}, delete: async () => {} };
const ownRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const bytes = (text: string): number => new TextEncoder().encode(text).byteLength;
export const WORKSPACE_MAX_BYTES = 8_000_000;
const validId = (id: unknown): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id) && !['__proto__', 'constructor', 'prototype'].includes(id);
export const profileStorageKey = (id: string): string => `orbitlab.profile.v1.${id}`;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
function checkedName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 100) throw new WorkspaceError('invalid');
  return trimmed;
}
function parseRecord(raw: string | null): ProfileRecord {
  if (raw === null) throw new WorkspaceError('missing');
  let v: unknown;
  try { v = JSON.parse(raw); } catch { throw new WorkspaceError('invalid'); }
  if (ownRecord(v) && typeof v.version === 'number' && v.version > 1) throw new WorkspaceError('newer');
  if (!ownRecord(v) || v.version !== 1 || !validId(v.id) || typeof v.name !== 'string' || !v.name.trim()
    || typeof v.createdAt !== 'string' || typeof v.updatedAt !== 'string'
    || !Number.isSafeInteger(v.revision) || (v.revision as number) < 0 || !Number.isSafeInteger(v.epoch) || (v.epoch as number) < 0
    || !ownRecord(v.values) || Object.entries(v.values).some(([key, value]) => !isWorkspaceKey(key) || typeof value !== 'string')) throw new WorkspaceError('invalid');
  return v as unknown as ProfileRecord;
}
function counts(values: Record<string, string>): ProfileCounts {
  const read = (key: string): Record<string, unknown> => { try { const v: unknown = JSON.parse(values[key] ?? 'null'); return ownRecord(v) ? v : {}; } catch { return {}; } };
  const p = read('orbitlab.lessons'), d = read('orbitlab.designs'), n = read('orbitlab.experiments.v1');
  return { lessons: ownRecord(p.lessons) ? Object.keys(p.lessons).length : 0,
    assessments: Array.isArray(p.assessments) ? p.assessments.length : 0,
    designs: Array.isArray(d.designs) ? d.designs.length : 0, experiments: Array.isArray(n.experiments) ? n.experiments.length : 0 };
}
function summary(record: ProfileRecord): ProfileSummary {
  const { values, version: _version, ...meta } = record;
  return { ...meta, counts: counts(values) };
}
function preserveUnreadableOverwrite(record: ProfileRecord, key: string, next: string): void {
  const previous = record.values[key];
  if (previous === undefined || previous === next || key === 'orbitlab.import.quarantine.v1') return;
  const versioned: Record<string, number> = {
    'orbitlab.mission': 3, 'orbitlab.designs': 1, 'orbitlab.lessons': 1, 'orbitlab.experiments.v1': 1,
    'orbitlab.build.explore.v1': 1, 'orbitlab.build.satellite.v1': 1, 'orbitlab.numeric-drafts.v1': 1,
  };
  const draft = ['orbitlab.build.requirements.v1', 'orbitlab.author.draft', 'orbitlab.author.design', 'orbitlab.worksheets'].includes(key);
  if (!Object.hasOwn(versioned, key) && !draft) return;
  let unreadable = false;
  try {
    const data: unknown = JSON.parse(previous);
    unreadable = !ownRecord(data);
    if (ownRecord(data) && Object.hasOwn(versioned, key)) {
      const version = key.startsWith('orbitlab.build.') || key === 'orbitlab.numeric-drafts.v1' ? data.v : data.version;
      unreadable = typeof version !== 'number' || version < 1 || version > versioned[key];
      if (key === 'orbitlab.mission') unreadable ||= data.format !== 'orbitlab.mission' || !ownRecord(data.mission);
      if (key === 'orbitlab.designs') unreadable ||= !Array.isArray(data.designs);
      if (key === 'orbitlab.lessons') unreadable ||= !ownRecord(data.lessons) || !Array.isArray(data.assessments) || !Array.isArray(data.customLessons) || !Array.isArray(data.customQuestions);
      if (key === 'orbitlab.experiments.v1') unreadable ||= !Array.isArray(data.experiments);
      if (key === 'orbitlab.build.explore.v1') unreadable ||= !ownRecord(data.state) || !ownRecord(data.defaults);
      if (key === 'orbitlab.build.satellite.v1') unreadable ||= !ownRecord(data.design) || typeof data.defaultName !== 'string';
      if (key === 'orbitlab.numeric-drafts.v1') unreadable ||= !ownRecord(data.fields);
    }
    if (ownRecord(data) && (key === 'orbitlab.author.draft' || key === 'orbitlab.author.design')) unreadable ||= typeof data.id !== 'string' || !Array.isArray(data.criteria);
  } catch { unreadable = true; }
  if (!unreadable) return;
  const entries: { key: string; raw: string }[] = [{ key, raw: previous }];
  if (record.values['orbitlab.import.quarantine.v1']) entries.push({ key: 'orbitlab.import.quarantine.v1', raw: record.values['orbitlab.import.quarantine.v1'] });
  record.values['orbitlab.import.quarantine.v1'] = JSON.stringify({ version: 1, entries });
}
/** One immutable owner per document. Never resolve an active profile inside a late callback. */
export class WorkspaceBinding implements RawStorage {
  private sealed = false;
  readonly profileId: string;
  readonly epoch: number;
  constructor(private readonly repo: WorkspaceRepository, record: ProfileRecord, private readonly writable: boolean) {
    this.profileId = record.id; this.epoch = record.epoch;
  }
  get valid(): boolean { return !this.sealed; }
  get durable(): boolean { return this.repo.status !== 'ephemeral'; }
  invalidate(): void { this.sealed = true; }
  assertCurrent(write = false): void {
    if (this.sealed || this.repo.read(this.profileId).epoch !== this.epoch) throw new WorkspaceError('stale');
    if (write && !this.writable) throw new WorkspaceError('locked');
  }
  getItem(key: string): string | null {
    if (!isWorkspaceKey(key)) throw new WorkspaceError('invalid');
    this.assertCurrent(); return this.repo.read(this.profileId).values[key] ?? null;
  }
  setItem(key: string, value: string): void {
    if (!isWorkspaceKey(key)) throw new WorkspaceError('invalid');
    this.assertCurrent(true); this.repo.mutate(this.profileId, (record) => { preserveUnreadableOverwrite(record, key, value); record.values[key] = value; });
  }
  removeItem(key: string): void {
    if (!isWorkspaceKey(key)) throw new WorkspaceError('invalid');
    this.assertCurrent(true); this.repo.mutate(this.profileId, (record) => { delete record.values[key]; });
  }
  /** Used for async media operations: check both before starting and before completing. */
  token(write = true): { profileId: string; epoch: number; assert: () => void } {
    this.assertCurrent(write); return { profileId: this.profileId, epoch: this.epoch, assert: () => this.assertCurrent(write) };
  }
}
export class WorkspaceRepository {
  status: WorkspaceStatus = 'chooser';
  readonly notices: string[] = [];
  /** The learner whose own recordings kept legacy originals in place at this start (D-68), or null. */
  mediaCollisionOwner: string | null = null;
  binding: WorkspaceBinding | null = null;
  private release: (() => void) | null = null;
  private ephemeral: Record<string, ProfileRecord> | null = null;
  private fallbackCatalog: Catalog | null = null;
  private flushers = new Set<() => void | Promise<void>>();
  constructor(private readonly storage: RawStorage, private readonly session: RawStorage,
    private readonly locks?: WorkspaceLocks, private readonly media: WorkspaceMedia = noMedia,
    private readonly idFactory: () => string = () => crypto.randomUUID()) {}
  private catalog(): Catalog {
    if (this.fallbackCatalog) return clone(this.fallbackCatalog);
    let value: unknown;
    try { const raw = this.storage.getItem(PROFILE_CATALOG_KEY); value = raw === null ? null : JSON.parse(raw); } catch { throw new WorkspaceError('storage'); }
    if (ownRecord(value) && typeof value.version === 'number' && value.version > 1) throw new WorkspaceError('newer');
    if (!ownRecord(value) || value.version !== 1 || !ownRecord(value.profiles) || !validId(value.legacyId)
      || typeof value.mediaMigrated !== 'boolean' || Object.entries(value.profiles).some(([id, row]) => !validId(id) || !ownRecord(row)
        || (row.deleting !== undefined && row.deleting !== true))) throw new WorkspaceError('invalid');
    return value as unknown as Catalog;
  }
  private saveCatalog(catalog: Catalog): void {
    if (this.fallbackCatalog) this.fallbackCatalog = clone(catalog);
    else this.storage.setItem(PROFILE_CATALOG_KEY, JSON.stringify(catalog));
  }
  private async withCatalog<T>(run: () => Promise<T>): Promise<T> {
    if (this.ephemeral) return run();
    if (!this.locks) throw new WorkspaceError('locked');
    return this.locks.request('orbitlab-profile-catalog-v1', {}, async () => run());
  }
  private async hold(id: string): Promise<(() => void) | null> {
    if (this.ephemeral) return () => {};
    if (!this.locks) return null;
    let signal!: (value: (() => void) | null) => void;
    const acquired = new Promise<(() => void) | null>((resolve) => { signal = resolve; });
    void this.locks.request(`orbitlab-profile-owner-v1:${id}`, { ifAvailable: true }, async (lock) => {
      if (!lock) { signal(null); return; }
      await new Promise<void>((resolve) => { signal(resolve); });
    }).catch(() => signal(null));
    return acquired;
  }
  private record(values: Record<string, string>, name: string, id: string): ProfileRecord {
    const now = new Date().toISOString();
    return { version: 1, id, name: checkedName(name), createdAt: now, updatedAt: now, revision: 0, epoch: 0, values: clone(values) };
  }
  /** Throws `missing` unless the catalogue lists this profile and it is not being deleted. */
  private listed(id: string): void {
    const entry = this.catalog().profiles[id];
    if (!entry || entry.deleting) throw new WorkspaceError('missing');
  }
  read(id: string): ProfileRecord { this.listed(id); return clone(this.stored(id)); }
  /** The record itself, not a copy: callers only read it (M-PLATFORM-003/005). */
  private stored(id: string, raw = this.ephemeral ? null : this.storage.getItem(profileStorageKey(id))): ProfileRecord {
    const record = this.ephemeral ? this.ephemeral[id] : parseRecord(raw);
    if (!record || record.id !== id) throw new WorkspaceError('missing');
    return record;
  }
  private write(record: ProfileRecord): void {
    if (this.ephemeral) this.ephemeral[record.id] = clone(record);
    else this.storage.setItem(profileStorageKey(record.id), JSON.stringify(record));
  }
  mutate(id: string, run: (record: ProfileRecord) => void): void {
    const record = this.read(id); run(record); record.revision++; record.updatedAt = new Date().toISOString();
    try { this.write(record); } catch (error) {
      if (!this.notices.includes('storage-write-failed')) this.notices.push('storage-write-failed');
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('orbitlab-workspace-storage-error'));
      throw error;
    }
  }
  async initialize(): Promise<this> {
    // Unsupported locking is a clearly labelled visit-only workspace; never a racy durable writer.
    if (!this.locks) { this.initializeEphemeral(); return this; }
    try {
      await this.withCatalog(async () => {
        if (this.storage.getItem(PROFILE_CATALOG_KEY) === null) {
          const values = legacyValues(this.storage), key = profileStorageKey(LEGACY_PROFILE_ID);
          let initial: ProfileRecord;
          const old = this.storage.getItem(key);
          const recoveryId = 'legacy-recovery-v1', recoveryKey = profileStorageKey(recoveryId);
          if (old !== null) {
            initial = parseRecord(old);
            if (initial.id !== LEGACY_PROFILE_ID) throw new WorkspaceError('pending');
            if (JSON.stringify(initial.values) !== JSON.stringify(values)) {
              const recovery = this.storage.getItem(recoveryKey);
              if (recovery === null) this.write({ ...initial, id: recoveryId, name: `${initial.name.slice(0, 80)} (recovered)` });
              else if (JSON.stringify(parseRecord(recovery).values) !== JSON.stringify(initial.values)) throw new WorkspaceError('pending');
              initial = this.record(values, values['orbitlab.student']?.trim().slice(0, 100) || 'Learner 1', LEGACY_PROFILE_ID);
              this.write(initial);
              this.notices.push('migration-source-changed');
            }
          } else {
            const name = values['orbitlab.student']?.trim().slice(0, 100) || 'Learner 1';
            initial = this.record(values, name, LEGACY_PROFILE_ID); this.write(initial);
          }
          // Destination is verified before the migration marker; originals remain if quota interrupts here.
          if (this.storage.getItem(key) !== JSON.stringify(initial)) throw new WorkspaceError('storage');
          const profiles: Catalog['profiles'] = { [initial.id]: {} };
          if (this.storage.getItem(recoveryKey) !== null) { parseRecord(this.storage.getItem(recoveryKey)); profiles[recoveryId] = {}; }
          this.saveCatalog({ version: 1, profiles, legacyId: initial.id, mediaMigrated: false });
        }
        const catalog = this.catalog();
        for (const [id, entry] of Object.entries(catalog.profiles)) {
          if (!entry.deleting) continue;
          // A failed retry keeps its tombstone (and media) for the next start; other owners still open durably.
          try {
            const release = await this.hold(id);
            if (!release) continue;
            try { await this.finishDelete(id, catalog); } finally { release(); }
          } catch { if (!this.notices.includes('profile-delete-pending')) this.notices.push('profile-delete-pending'); }
        }
        if (!catalog.mediaMigrated) {
          // Collisions stay in place, unowned (D-68); the migration is still done, so no later start walks the store again.
          try {
            const kept = await this.media.migrate(catalog.legacyId); catalog.mediaMigrated = true; this.saveCatalog(catalog);
            if (kept) { this.notices.push('media-collisions-kept'); this.mediaCollisionOwner = catalog.legacyId; }
          } catch { this.notices.push('media-migration-pending'); }
        }
        // Remove only unchanged originals after the authoritative destination/catalogue commit.
        // An unreadable owner record keeps its bytes and the originals; cleanup is retried at the next start.
        if (catalog.profiles[catalog.legacyId] && !catalog.profiles[catalog.legacyId].deleting) {
          try {
            this.listed(catalog.legacyId); const original = this.stored(catalog.legacyId);
            for (const [key, value] of Object.entries(original.values)) {
              if (this.storage.getItem(key) === value) this.storage.removeItem(key);
            }
          } catch { if (!this.notices.includes('legacy-cleanup-pending')) this.notices.push('legacy-cleanup-pending'); }
        }
      });
      let selected: string | null = null;
      try { selected = this.session.getItem(PROFILE_SELECTED_KEY); } catch { this.notices.push('selection-not-persisted'); }
      const catalog = this.catalog();
      // Null on first install selects the migration owner; explicit empty selection means chooser.
      if (selected === null && Object.keys(catalog.profiles).length === 1 && catalog.profiles[catalog.legacyId]) {
        selected = catalog.legacyId;
        try { this.session.setItem(PROFILE_SELECTED_KEY, selected); } catch { this.notices.push('selection-not-persisted'); }
      }
      if (!selected || !catalog.profiles[selected] || catalog.profiles[selected].deleting) { this.status = 'chooser'; return this; }
      // Own the lock before reading so the failure path below releases it (an unreadable record must not hold it).
      const release = await this.hold(selected); this.release = release;
      let record: ProfileRecord;
      try { record = this.read(selected); } catch (error) {
        // An unreadable, newer or missing selection opens the chooser, where its row offers a copy and delete (R1.6-FU-SEL).
        // A catalogue that turned unreadable meanwhile throws here and still goes visit-only.
        if (!(error instanceof WorkspaceError) || !['invalid', 'newer', 'missing'].includes(error.code)) throw error;
        this.catalog(); release?.(); this.release = null; this.notices.push(error.code);
        try { this.session.setItem(PROFILE_SELECTED_KEY, ''); } catch { this.notices.push('selection-not-persisted'); }
        this.status = 'chooser'; return this;
      }
      this.status = release ? 'durable' : 'locked';
      this.binding = new WorkspaceBinding(this, record, !!release);
      return this;
    } catch (error) {
      this.release?.(); this.release = null;
      this.notices.push(error instanceof WorkspaceError ? error.code : 'storage');
      // Keep durable bytes untouched, expose a visit-only copy if durable storage cannot initialize.
      this.initializeEphemeral(); return this;
    }
  }
  private initializeEphemeral(): void {
    let values: Record<string, string> = {}, name = 'Learner 1', id = 'visit-only';
    try {
      const raw = this.storage.getItem(PROFILE_CATALOG_KEY);
      if (raw !== null) {
        const catalog = this.catalog();
        const selected = this.session.getItem(PROFILE_SELECTED_KEY) || catalog.legacyId;
        const record = parseRecord(this.storage.getItem(profileStorageKey(selected)));
        values = record.values; name = record.name; id = record.id;
      } else { values = legacyValues(this.storage); name = values['orbitlab.student']?.trim().slice(0, 100) || name; }
    } catch { this.notices.push('stored-work-unavailable'); }
    const record = this.record(values, name, id);
    this.ephemeral = { [id]: record }; this.fallbackCatalog = { version: 1, profiles: { [id]: {} }, legacyId: id, mediaMigrated: true };
    this.status = 'ephemeral'; this.binding = new WorkspaceBinding(this, record, true);
  }
  /** Readable profiles only; an unreadable row no longer hides the others (see listWithStatus). */
  list(): ProfileSummary[] {
    return this.listWithStatus().flatMap(({ state, ...profile }) => state === 'ok' ? [profile as ProfileSummary] : []);
  }
  listWithStatus(): ProfileListRow[] { return this.rows().map(({ values: _values, ...row }) => row as ProfileListRow); }
  /** Every catalogue row read once, with a readable row's values for the chooser's counts; the values are not a copy (M-PLATFORM-005). */
  rows(): (ProfileListRow & { values?: Readonly<Record<string, string>> })[] {
    return Object.entries(this.catalog().profiles).filter(([, row]) => !row.deleting).map(([id]) => this.row(id));
  }
  /** Reads only this owner. A record that cannot be parsed, is missing or is newer becomes a row with that state; its bytes are not touched. */
  profileRow(id: string): ProfileListRow { this.listed(id); const { values: _values, ...row } = this.row(id); return row as ProfileListRow; }
  private row(id: string): ProfileListRow & { values?: Readonly<Record<string, string>> } {
    const raw = this.raw(id);
    // A visit-only record is the live one: its values are copied so no caller can change it.
    try { const record = this.stored(id, raw); return { ...summary(record), state: 'ok', values: this.ephemeral ? clone(record.values) : record.values }; } catch (error) {
      if (!(error instanceof WorkspaceError) || !['invalid', 'newer', 'missing'].includes(error.code)) throw error;
      let name: string | undefined;
      if (raw === null) return { id, state: 'missing' };
      try { const data: unknown = JSON.parse(raw); if (ownRecord(data) && typeof data.name === 'string' && data.name.trim()) name = data.name.trim().slice(0, 100); } catch { /* no name */ }
      return { id, state: error.code === 'newer' ? 'newer' : 'unreadable', name };
    }
  }
  /** The stored bytes exactly as kept, for a backup of a record this version cannot read. */
  rawProfile(id: string): string {
    this.listed(id);
    const raw = this.raw(id);
    if (raw === null) throw new WorkspaceError('missing');
    return raw;
  }
  private raw(id: string): string | null {
    return this.ephemeral ? (this.ephemeral[id] ? JSON.stringify(this.ephemeral[id]) : null) : this.storage.getItem(profileStorageKey(id));
  }
  active(): ProfileSummary | null { return this.binding ? summary(this.read(this.binding.profileId)) : null; }
  registerFlush(flush: () => void | Promise<void>): () => void { this.flushers.add(flush); return () => this.flushers.delete(flush); }
  async prepareChange(): Promise<void> {
    if (!this.binding?.valid || this.status === 'locked' || this.status === 'chooser') return;
    for (const flush of this.flushers) await flush();
  }
  async create(name: string): Promise<ProfileSummary> {
    return this.withCatalog(async () => {
      const catalog = this.catalog();
      if (Object.keys(catalog.profiles).length >= PROFILE_MAX_COUNT) throw new WorkspaceError('limit');
      const id = this.idFactory(); if (!validId(id) || catalog.profiles[id]) throw new WorkspaceError('invalid');
      const record = this.record({}, name, id); this.write(record);
      catalog.profiles[id] = {};
      try { this.saveCatalog(catalog); } catch (error) { if (this.ephemeral) delete this.ephemeral[id]; else this.storage.removeItem(profileStorageKey(id)); throw error; }
      return summary(record);
    });
  }
  private async withOwner<T>(id: string, run: () => Promise<T>): Promise<T> {
    if (this.binding?.profileId === id) { this.binding.assertCurrent(true); return run(); }
    const release = await this.hold(id); if (!release) throw new WorkspaceError('locked');
    try { return await run(); } finally { release(); }
  }
  async rename(id: string, name: string): Promise<void> {
    const checked = checkedName(name);
    await this.withOwner(id, async () => this.mutate(id, (record) => { record.name = checked; record.values['orbitlab.student'] = checked; }));
  }
  async select(id: string): Promise<void> {
    this.read(id);
    await this.prepareChange();
    if (id !== this.binding?.profileId) {
      const probe = await this.hold(id); if (!probe) throw new WorkspaceError('locked'); probe();
    }
    try { this.session.setItem(PROFILE_SELECTED_KEY, id); } catch { throw new WorkspaceError('storage'); }
    this.close();
  }
  private async finishDelete(id: string, catalog: Catalog): Promise<void> {
    await this.media.delete(id);
    if (this.ephemeral) delete this.ephemeral[id]; else this.storage.removeItem(profileStorageKey(id));
    delete catalog.profiles[id]; this.saveCatalog(catalog);
  }
  async delete(id: string): Promise<void> {
    // A visit-only copy keeps the saved profile's real id, and media is the real store: never delete there (M-PLATFORM-009).
    if (this.ephemeral) throw new WorkspaceError('locked');
    await this.prepareChange();
    const active = this.binding?.profileId === id;
    try {
      await this.withOwner(id, () => this.withCatalog(async () => {
        // An unreadable or newer record can be deleted, but only by this explicit, user-confirmed call.
        const catalog = this.catalog(); this.profileRow(id);
        catalog.profiles[id] = { deleting: true }; this.saveCatalog(catalog);
        if (active) {
          this.binding?.invalidate(); this.status = 'chooser';
          try { this.session.setItem(PROFILE_SELECTED_KEY, ''); } catch { this.notices.push('selection-not-persisted'); }
        }
        await this.finishDelete(id, catalog);
      }));
    } finally { if (active && !this.binding?.valid) this.close(); }
  }
  async reset(scope: 'learning' | 'exams' | 'all', lessonId?: string): Promise<void> {
    const binding = this.binding; if (!binding) throw new WorkspaceError('missing'); binding.assertCurrent(true);
    const { validProgress } = await import('../projects/validation');
    binding.assertCurrent(true);
    this.mutate(binding.profileId, (record) => {
      if (record.values['orbitlab.project-import.recovery.v1'] !== undefined) throw new WorkspaceError('pending');
      for (const key of Object.keys(record.values)) {
        if (key !== 'orbitlab.lessons' && !/^orbitlab\.lessons\.recovery(?:\.[1-9][0-9]*)?$/.test(key)) continue;
        let progress: unknown;
        try { progress = JSON.parse(record.values[key]); } catch { throw new WorkspaceError('invalid'); }
        // Reject damaged recovery copies rather than discard personal teaching content inside them.
        if (!validProgress(progress)) throw new WorkspaceError('invalid');
        const data = progress as { lessons: Record<string, unknown>; assessments: unknown[] };
        if (scope !== 'exams') { if (lessonId) delete data.lessons[lessonId]; else data.lessons = {}; }
        if (scope !== 'learning') data.assessments = [];
        record.values[key] = JSON.stringify(progress);
      }
      record.epoch++;
    });
    binding.invalidate();
  }
  /** A fresh object (`read()` copies). The 8 MB limit applies to the text a backup saves: `workspaceArchiveText`. */
  exportProfile(id = this.binding?.profileId): WorkspaceArchive {
    if (!id) throw new WorkspaceError('missing');
    const record = this.read(id);
    return { format: WORKSPACE_FORMAT, version: 1, exportedAt: new Date().toISOString(),
      profiles: [{ id: record.id, name: record.name, createdAt: record.createdAt, updatedAt: record.updatedAt, revision: record.revision, epoch: record.epoch, values: record.values }], media: { included: false, reason: 'separate-binary-export' } };
  }
  exportAll(): WorkspaceArchive {
    return { format: WORKSPACE_FORMAT, version: 1, exportedAt: new Date().toISOString(),
      profiles: this.list().map((p) => { const r = this.read(p.id); return { id: r.id, name: r.name, createdAt: r.createdAt, updatedAt: r.updatedAt, revision: r.revision, epoch: r.epoch, values: r.values }; }),
      media: { included: false, reason: 'separate-binary-export' } };
  }
  /** Restore multiple archived owners as NEW identities; no existing profile is replaced. Catalogue publication is one atomic write. */
  async importProfiles(text: string): Promise<ProfileSummary[]> {
    const { parseWorkspaceArchive, checkedImportValues } = await import('./archive');
    const archive = parseWorkspaceArchive(text);
    return this.withCatalog(async () => {
      const catalog = this.catalog();
      if (Object.keys(catalog.profiles).length + archive.profiles.length > PROFILE_MAX_COUNT) throw new WorkspaceError('limit');
      const staged: ProfileRecord[] = [];
      try {
        for (const incoming of archive.profiles) {
          const id = this.idFactory();
          if (!validId(id) || catalog.profiles[id] || staged.some((record) => record.id === id)) throw new WorkspaceError('invalid');
          const checked = checkedImportValues(incoming.values);
          if (checked.quarantined && !this.notices.includes('quarantined-import-data')) this.notices.push('quarantined-import-data');
          const record = this.record(checked.values, incoming.name, id);
          this.write(record); staged.push(record);
        }
        for (const record of staged) catalog.profiles[record.id] = {};
        this.saveCatalog(catalog);
      } catch (error) {
        for (const record of staged) {
          try { if (this.ephemeral) delete this.ephemeral[record.id]; else this.storage.removeItem(profileStorageKey(record.id)); } catch { /* inaccessible unregistered bytes stay, never overwrite an existing owner */ }
        }
        throw error;
      }
      return staged.map(summary);
    });
  }
  async importArchive(text: string, options: ImportOptions = {}): Promise<ProfileSummary> {
    const { parseWorkspaceArchive, checkedImportValues } = await import('./archive');
    const archive = parseWorkspaceArchive(text);
    if (archive.profiles.length !== 1) throw new WorkspaceError('invalid');
    const incoming = archive.profiles[0];
    const checkedIncoming = checkedImportValues(incoming.values);
    if (checkedIncoming.quarantined && !this.notices.includes('quarantined-import-data')) this.notices.push('quarantined-import-data');
    if (!options.targetId) {
      const copy = { ...archive, profiles: [{ ...incoming, name: options.name || incoming.name }] };
      return (await this.importProfiles(JSON.stringify(copy)))[0];
    }
    await this.withOwner(options.targetId, async () => {
      this.mutate(options.targetId!, (record) => {
        if (record.values['orbitlab.project-import.recovery.v1'] !== undefined) throw new WorkspaceError('pending');
        for (const [key, value] of Object.entries(checkedIncoming.values)) {
          if (key === 'orbitlab.import.quarantine.v1' && record.values[key] !== undefined) {
            record.values[key] = JSON.stringify({ version: 1, entries: [{ key, raw: record.values[key] }, { key, raw: value }] });
          } else if (options.mode === 'replace' || record.values[key] === undefined) record.values[key] = value;
        }
        record.epoch++;
      });
      if (this.binding && this.binding.profileId === options.targetId) this.binding.invalidate();
    });
    return summary(this.read(options.targetId));
  }
  close(): void { this.binding?.invalidate(); this.release?.(); this.release = null; }
}
const fitsImport = (text: string): boolean => text.length <= WORKSPACE_MAX_BYTES && bytes(text) <= WORKSPACE_MAX_BYTES;
/**
 * The exact text a backup saves, checked against the import limit once (M-PLATFORM-008): the indented form as before,
 * or the compact form when only that fits, so every file the app writes can be restored.
 */
export function workspaceArchiveText(archive: WorkspaceArchive): string {
  const pretty = JSON.stringify(archive, null, 2) + '\n';
  if (fitsImport(pretty)) return pretty;
  const compact = JSON.stringify(archive);
  if (fitsImport(compact)) return compact;
  throw new WorkspaceError('oversize');
}
/** The strict legacy reader stays outside initial startup chunks. */
export async function parseWorkspaceArchive(text: string): Promise<WorkspaceArchive> {
  return (await import('./archive')).parseWorkspaceArchive(text);
}
export async function workspaceImportWarnings(archive: WorkspaceArchive): Promise<{ quarantinedValues: number; recoveryValues: number }> {
  return (await import('./archive')).workspaceImportWarnings(archive);
}
