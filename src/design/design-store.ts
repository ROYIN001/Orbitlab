import { workspaceStorage } from '../workspace/storage';
/**
 * Where the user's designs are kept (roadmap S05): the rocket builders of
 * Phase 3 save vehicles here, the satellite builder of Phase 4 satellites
 * (docs/ROADMAP-PART2-3.md).
 *
 * `DesignStore` is the interface; `LocalDesignStore` keeps designs in this
 * browser. A school's intranet server or a cloud account would implement the
 * same interface later — which is why it is asynchronous although
 * localStorage is not. Every design can also leave the browser as a file,
 * `*.orbitlab.json`, versioned the way the mission file is
 * (src/config/mission-file.ts): a format name, a version number, and a
 * reader that says what it could not use.
 *
 * No account and no personal data: a design holds what its designer typed
 * and when it was saved, nothing else. DOM-free; tests/design-store.test.ts
 * runs it against fake storage.
 */
import type { VehicleSpec } from '../types';
import { NOT_A_FIELD as NOT_A_VEHICLE_FIELD, vehicleSpecProblems, vehicleSpecText } from '../config/vehicle-spec';
import { NOT_A_FIELD as NOT_A_SATELLITE_FIELD, satelliteDesignProblems, satelliteDesignText } from '../config/satellite-design';
import type { SatelliteDesign } from './satellite-spec';
import { canonicalJson } from './design-ref';

/**
 * What a design is of: a rocket (Phase 3's builders) or a satellite (D06,
 * Phase 4 map §2.4). A new kind is a new value, not a field that changes
 * meaning, so the store and the file stay at version 1: an older build
 * refuses a satellite file as `invalid`, and keeps a satellite record raw
 * (risk R4, `Entry` below).
 */
export interface DesignKinds {
  vehicle: VehicleSpec;
  satellite: SatelliteDesign;
}
export type DesignKind = keyof DesignKinds;
export const DESIGN_KINDS: readonly DesignKind[] = ['vehicle', 'satellite'];

/** Each kind's own check, shared with everything else that reads one (a vehicle's is S02's, a satellite's D06's). */
const PROBLEMS: { readonly [K in DesignKind]: (design: unknown) => string | null } = {
  vehicle: (design) => {
    const issues = vehicleSpecProblems(design);
    return issues.length ? vehicleSpecText(issues) : null;
  },
  satellite: (design) => {
    const issues = satelliteDesignProblems(design);
    return issues.length ? satelliteDesignText(issues) : null;
  },
};

/** One kept design; `K` a kind, or all of them (then `isDesignOf` narrows it). */
export interface DesignRecord<K extends DesignKind = DesignKind> {
  /** the store's key for it */
  id: string;
  kind: K;
  /** what its designer calls it */
  name: string;
  /** ISO 8601 UTC */
  created: string;
  updated: string;
  design: DesignKinds[K];
  /**
   * A rocket's payload ratings are final: kept by a build that keeps only a
   * finished search (FX-1 PR1, M-BUILD-006), or there are none of its own.
   * Absent on a record kept before: its ratings are computed again when it is
   * opened (FX-1 s2; owner, 2026-10-06). Beside the design, not in it, so the
   * design and its file are as they were; an older build ignores it.
   */
  ratingsFinal?: true;
}

/** A record of any kind as one of kind `kind`, or not: its design is then that kind's (the store checked it on the way in). */
export function isDesignOf<K extends DesignKind>(record: DesignRecord, kind: K): record is DesignRecord<K> {
  return record.kind === kind;
}

export type DesignSummary = Pick<DesignRecord, 'id' | 'kind' | 'name' | 'created' | 'updated'>;

/** A design to save: a new one (no id) or a change to one kept already. */
export type DesignInput<K extends DesignKind = DesignKind> = Pick<DesignRecord<K>, 'kind' | 'name' | 'design' | 'ratingsFinal'> & { id?: string };

export type DesignStoreErrorCode = 'unavailable' | 'full' | 'invalid' | 'notFound' | 'collection';
/** Why a store could not do what it was asked; `message` says it to a person. */
export class DesignStoreError extends Error {
  constructor(readonly code: DesignStoreErrorCode, message: string) {
    super(message);
    this.name = 'DesignStoreError';
  }
}

export interface DesignStore {
  /** the designs kept, newest change first, of one kind or all */
  list(kind?: DesignKind): Promise<DesignSummary[]>;
  get(id: string): Promise<DesignRecord | null>;
  /** keep a new design, or a change to one; rejects with a `DesignStoreError` */
  save<K extends DesignKind>(input: DesignInput<K>): Promise<DesignRecord<K>>;
  /**
   * A rocket's ratings computed again, and nothing else (D-75: not a design
   * edit): the design kept with `design`'s ratings, marked final, its revision
   * (`updated`) unchanged. null, and nothing written, when no rocket is kept
   * by that id or `design` differs from it in more than its ratings.
   */
  rerate(id: string, design: DesignKinds['vehicle']): Promise<DesignRecord<'vehicle'> | null>;
  /** false when there was nothing by that id */
  remove(id: string): Promise<boolean>;
}

/** What a design must be, whatever it came from; null when it is sound. */
export function designProblems(kind: unknown, name: unknown, design: unknown): string | null {
  if (!DESIGN_KINDS.includes(kind as DesignKind)) return `unknown kind of design ${JSON.stringify(kind)}`;
  if (typeof name !== 'string' || !name.trim() || name.length > 80) return 'a design needs a name of 1 to 80 characters';
  return PROBLEMS[kind as DesignKind](design);
}

// ─── in this browser ────────────────────────────────────────────────────────

/** The slice of `Storage` the local store uses. */
export interface DesignStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }

export const DESIGN_STORE_KEY = 'orbitlab.designs';
const STORE_VERSION = 1;

interface Stored { version: number; designs: unknown[] }

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const isRecord = (d: unknown): d is DesignRecord => isObj(d) && typeof d.id === 'string' && typeof d.created === 'string'
  && typeof d.updated === 'string' && designProblems(d.kind, d.name, d.design) === null;

/**
 * Designs kept in this browser's workspaceStorage(), under one key. A storage that
 * refuses (a private window, a policy) makes `list` empty and `save` reject
 * with `unavailable`; a full one rejects with `full`: a design is someone's
 * work, and losing it silently is the one thing this must not do. A record
 * that does not read back as a sound design is left out of the list, not
 * deleted.
 */
export class LocalDesignStore implements DesignStore {
  constructor(private readonly storage: () => DesignStorage = () => workspaceStorage(),
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () => `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`) {}

  /** Keep unreadable records byte-for-data intact when another design is changed. */
  private raw(forWrite = false): unknown[] {
    let text: string | null;
    try { text = this.storage().getItem(DESIGN_STORE_KEY); } catch {
      if (forWrite) throw new DesignStoreError('unavailable', 'This browser does not allow the app to read its saved designs.');
      return [];
    }
    if (!text) return [];
    let stored: unknown;
    try { stored = JSON.parse(text); } catch { stored = null; }
    if (!isObj(stored) || stored.version !== STORE_VERSION || !Array.isArray(stored.designs)) {
      // A damaged or newer store cannot safely be rewritten in our schema.
      if (forWrite) throw new DesignStoreError('collection', 'The saved design collection is damaged or uses an unsupported version; it has been left unchanged.');
      return [];
    }
    return stored.designs;
  }

  private read(): DesignRecord[] { return this.raw().filter(isRecord); }

  private write(designs: unknown[]): void {
    const text = JSON.stringify({ version: STORE_VERSION, designs } satisfies Stored);
    let storage: DesignStorage;
    try { storage = this.storage(); } catch { throw new DesignStoreError('unavailable', 'This browser does not allow the app to keep anything.'); }
    try { storage.setItem(DESIGN_STORE_KEY, text); } catch (error) {
      const full = error instanceof Error && /quota/i.test(`${error.name} ${error.message}`);
      throw new DesignStoreError(full ? 'full' : 'unavailable', full ? 'This browser\'s storage for the app is full.' : 'This browser does not allow the app to keep anything.');
    }
  }

  async list(kind?: DesignKind): Promise<DesignSummary[]> {
    return this.read().filter((d) => !kind || d.kind === kind)
      .sort((a, b) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0))
      .map(({ id, kind: k, name, created, updated }) => ({ id, kind: k, name, created, updated }));
  }

  async get(id: string): Promise<DesignRecord | null> {
    const hit = this.read().find((d) => d.id === id);
    return hit ? clone(hit) : null;
  }

  async save<K extends DesignKind>(input: DesignInput<K>): Promise<DesignRecord<K>> {
    const problem = designProblems(input.kind, input.name, input.design);
    if (problem) throw new DesignStoreError('invalid', problem);
    const designs = this.raw(true);
    const at = this.now().toISOString();
    const existing = input.id !== undefined ? designs.find((d): d is DesignRecord => isRecord(d) && d.id === input.id) : undefined;
    if (input.id !== undefined && !existing) throw new DesignStoreError('notFound', `No design ${input.id} is kept here.`);
    const record = {
      id: existing?.id ?? this.newId(), kind: input.kind, name: input.name.trim(),
      created: existing?.created ?? at, updated: at, design: clone(input.design), ...(input.ratingsFinal ? { ratingsFinal: true } : {}),
    } as DesignRecord<K>;
    this.write(existing ? designs.map((d) => (d === existing ? record : d)) : [...designs, record]);
    return clone(record);
  }

  async rerate(id: string, design: DesignKinds['vehicle']): Promise<DesignRecord<'vehicle'> | null> {
    const designs = this.raw(true);
    const existing = designs.find((d): d is DesignRecord<'vehicle'> => isRecord(d) && d.id === id && d.kind === 'vehicle');
    const bare = ({ payloadLEO: _l, payloadGTO: _g, payloadSSO: _s, ...rest }: DesignKinds['vehicle']): string => canonicalJson(rest);
    if (!existing || PROBLEMS.vehicle(design) !== null || bare(existing.design) !== bare(design)) return null;
    const record: DesignRecord<'vehicle'> = { ...existing, design: clone(design), ratingsFinal: true };
    this.write(designs.map((d) => (d === existing ? record : d)));
    return clone(record);
  }

  async remove(id: string): Promise<boolean> {
    const designs = this.raw(true);
    const kept = designs.filter((d) => !isRecord(d) || d.id !== id);
    if (kept.length === designs.length) return false;
    this.write(kept);
    return true;
  }
}

// ─── as a file ──────────────────────────────────────────────────────────────

/** What the file says it is. */
export const DESIGN_FORMAT = 'orbitlab.design';
/**
 * The version of the layout below. Raise it when a field changes meaning and
 * teach `parseDesignDocument` to read the old one, as the mission file does.
 */
export const DESIGN_FORMAT_VERSION = 1;
export const DESIGN_FILE_EXTENSION = '.orbitlab.json';

export interface DesignDocument<K extends DesignKind = DesignKind> {
  format: typeof DESIGN_FORMAT;
  version: number;
  kind: K;
  name: string;
  created: string;
  updated: string;
  design: DesignKinds[K];
}

export function designDocument<K extends DesignKind>(record: DesignRecord<K>): DesignDocument<K> {
  return { format: DESIGN_FORMAT, version: DESIGN_FORMAT_VERSION, kind: record.kind, name: record.name,
    created: record.created, updated: record.updated, design: clone(record.design) };
}

export function designFileText(doc: DesignDocument): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

/** A file name for a design: its name made safe for any file system, and its kind. */
export function designFileName(record: Pick<DesignRecord, 'name' | 'kind'>): string {
  // a Latin letter drops its accent ("Café" → "cafe"); a Cyrillic letter keeps its own, as NFC puts it back: «й» and
  // «ё» are letters of their own, and «Мой спутник» came out as "мои-спутник" (review of task W)
  const slug = record.name.normalize('NFKD').replace(/([a-z])[̀-ͯ]+/gi, '$1').normalize('NFC').toLowerCase()
    .replace(/[^a-z0-9฀-๿Ѐ-ӿ]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'design';
  return `${slug}-${record.kind}${DESIGN_FILE_EXTENSION}`;
}

export interface ParsedDesign {
  /** the design to keep, or null when nothing in the file could be used */
  input: DesignInput | null;
  /**
   * what could not be used, or that the file is newer than this version; a newer file refused for fields of its
   * design this version does not know names them (`fields`, D-22)
   */
  issues: { code: 'format' | 'newerVersion' | 'invalid'; detail?: string; fields?: string[] }[];
}

/** D-22: the fields of a design this version does not know, as its kind's check names them; [] when it knows them all. */
function unknownFields(kind: DesignKind, design: unknown): string[] {
  const issues = kind === 'vehicle' ? vehicleSpecProblems(design) : satelliteDesignProblems(design);
  const notAField = kind === 'vehicle' ? NOT_A_VEHICLE_FIELD : NOT_A_SATELLITE_FIELD;
  return issues.filter((i) => i.message === notAField).map((i) => i.path);
}

/**
 * Read a design file: its format and version, then the design itself, held to
 * the same check the store applies. A design is all or nothing — half a
 * rocket is not a rocket — so a problem refuses it whole and says why. A newer
 * file (D-22) is taken when this version knows every field of its design, and
 * says it is newer; a field it does not know refuses the file whole, and the
 * refusal names each such field.
 */
export function parseDesignDocument(raw: unknown): ParsedDesign {
  if (!isObj(raw) || raw.format !== DESIGN_FORMAT || typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) {
    return { input: null, issues: [{ code: 'format' }] };
  }
  const issues: ParsedDesign['issues'] = raw.version > DESIGN_FORMAT_VERSION ? [{ code: 'newerVersion' }] : [];
  const problem = designProblems(raw.kind, raw.name, raw.design);
  if (problem) {
    const fields = issues.length && DESIGN_KINDS.includes(raw.kind as DesignKind) ? unknownFields(raw.kind as DesignKind, raw.design) : [];
    return { input: null, issues: [...issues, { code: 'invalid', detail: problem, ...(fields.length ? { fields } : {}) }] };
  }
  return { input: inputOf(raw.kind as DesignKind, (raw.name as string).trim(), clone(raw.design)), issues };
}

/** A design to keep, of the kind the file names: the check above has held `design` to that kind. */
function inputOf<K extends DesignKind>(kind: K, name: string, design: unknown): DesignInput<K> {
  return { kind, name, design: design as DesignKinds[K] };
}

/** A file's text back to the JSON it holds; null when it is not JSON. */
export function readDesignFileText(text: string): unknown {
  try { return JSON.parse(text); } catch { return null; }
}
