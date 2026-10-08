/**
 * EO-STO-1, the differential storage oracle (plan S10 §10.1 rule 3, §10.3 PR 3).
 *
 * One sequence of storage operations runs twice: against the code in src/,
 * and against tests/eo-sto/ref/, byte-for-byte copies of main's files at
 * 23ede7f (what the app stores today): src/workspace/{repository,registry,
 * archive}.ts for the repository, and src/config/mission-file.ts,
 * src/design/design-ref.ts and src/ui/workspace-mission.ts for the page's
 * mission, which decide when `orbitlab.mission` is written and its bytes. The
 * modules those files import from outside the copies re-export the live ones.
 * After every step the oracle compares, byte for byte: every key and value on
 * the shared disk (localStorage), each tab's sessionStorage, the step's return
 * value or error code, each tab's status, notices and binding, and the media
 * calls.
 *
 * An identical-output PR runs it unchanged and leaves ref/ alone. A PR whose
 * stored bytes move here is not identical-output (S07 stop rule) and has to
 * say so; its review decides about ref/.
 *
 * `MissionPage` is src/main.ts's mission store and restore (the §10.3.1 paths)
 * played over a profile's storage with each side's mission code, so the same
 * sequences cover them. It plays main.ts's order of calls; main.ts itself and
 * the hand-off to Orbit (in memory only) are not copied.
 */
import { vi } from 'vitest';
import * as live from '../../src/workspace/repository';
import * as ref from './ref/workspace/repository';
import type { RawStorage } from '../../src/workspace/registry';
import * as liveMissionFile from '../../src/config/mission-file';
import * as refMissionFile from './ref/config/mission-file';
import type { MissionState } from '../../src/config/mission-file';
import { orbitById } from '../../src/data/orbits';
import { DEFAULT_FAILURE } from '../../src/physics/defaults';
import { defaultDynamics } from '../../src/physics/rigid/config';
import * as liveDesignRef from '../../src/design/design-ref';
import * as refDesignRef from './ref/design/design-ref';
import type { DesignRef } from '../../src/design/design-ref';
import * as liveWorkspaceMission from '../../src/ui/workspace-mission';
import * as refWorkspaceMission from './ref/ui/workspace-mission';
import type { MissionOrigin, WorkspaceMission } from '../../src/ui/workspace-mission';
import { handoffDocument } from '../../src/design/build-handoff';
import { partsDraft, partsResult } from '../../src/design/explore-model';

export interface Binding extends RawStorage { readonly profileId: string; readonly epoch: number; readonly valid: boolean; readonly durable: boolean }
/** The repository's public face, which both copies have. */
export interface Repo {
  status: string; readonly notices: string[]; binding: Binding | null;
  initialize(): Promise<unknown>; close(): void;
  list(): unknown[]; listWithStatus(): unknown[]; profileRow(id: string): unknown; rawProfile(id: string): string;
  create(name: string): Promise<{ id: string }>; rename(id: string, name: string): Promise<void>;
  select(id: string): Promise<void>; delete(id: string): Promise<void>; reset(scope: 'learning' | 'exams' | 'all', lessonId?: string): Promise<void>;
  exportProfile(id?: string): unknown; exportAll(): unknown; importProfiles(text: string): Promise<unknown>;
  importArchive(text: string, options?: { targetId?: string; mode?: 'keep' | 'replace'; name?: string }): Promise<unknown>;
}
/** The mission's origin rules, which both copies of WorkspaceMission have. */
export type MissionRules = Pick<WorkspaceMission, 'origin' | 'viewing' | 'loaded' | 'adopt' | 'restoring' | 'restored' | 'persists' | 'entering'>;
/** The page's mission code, which both copies have: mission-file.ts, design-ref.ts and workspace-mission.ts. */
export interface MissionCode {
  loadStoredMission: typeof liveMissionFile.loadStoredMission; saveStoredMission: typeof liveMissionFile.saveStoredMission;
  missionDocument: typeof liveMissionFile.missionDocument; parseMissionDocument: typeof liveMissionFile.parseMissionDocument;
  designRefFor: typeof liveDesignRef.designRefFor; parseDesignRef: typeof liveDesignRef.parseDesignRef; refFlies: typeof liveDesignRef.refFlies;
  startupMission: typeof liveWorkspaceMission.startupMission; WorkspaceMission: new () => MissionRules;
}
export const LIVE_MISSION: MissionCode = { ...liveMissionFile, ...liveDesignRef, ...liveWorkspaceMission };
const REF_MISSION: MissionCode = { ...refMissionFile, ...refDesignRef, ...refWorkspaceMission };
export interface Impl {
  name: string;
  make(storage: RawStorage, session: RawStorage, locks: live.WorkspaceLocks | undefined, media: live.WorkspaceMedia, ids: () => string): Repo;
  archiveText(archive: unknown): string;
  /** what the page writes and restores the mission with */
  mission: MissionCode;
}
export const CURRENT: Impl = {
  name: 'src/workspace', make: (...a) => new live.WorkspaceRepository(...a), archiveText: (a) => live.workspaceArchiveText(a as live.WorkspaceArchive),
  mission: LIVE_MISSION,
};
export const REFERENCE: Impl = {
  name: 'ref 23ede7f', make: (...a) => new ref.WorkspaceRepository(...a), archiveText: (a) => ref.workspaceArchiveText(a as ref.WorkspaceArchive),
  mission: REF_MISSION,
};

/** A Storage double (insertion-ordered, with `key`/`length`); `deny` makes writes of one key fail as a full quota does. */
export function memory() {
  const values = new Map<string, string>();
  let denied: string | null = null;
  const store: RawStorage = {
    get length() { return values.size; }, key: (i) => [...values.keys()][i] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => { if (denied === k) throw new DOMException('quota', 'QuotaExceededError'); values.set(k, v); },
    removeItem: (k) => { values.delete(k); },
  };
  return { values, store, deny: (key: string | null) => { denied = key; } };
}
/** Web Locks shared by the tabs of one browser. */
class Locks implements live.WorkspaceLocks {
  private held = new Set<string>();
  private waiting = new Map<string, (() => void)[]>();
  async request<T>(name: string, options: { ifAvailable?: boolean }, run: (lock: unknown | null) => Promise<T>): Promise<T> {
    if (options.ifAvailable && this.held.has(name)) return run(null);
    if (this.held.has(name)) await new Promise<void>((resolve) => { const q = this.waiting.get(name) ?? []; q.push(resolve); this.waiting.set(name, q); });
    this.held.add(name);
    try { return await run({ name }); } finally { this.held.delete(name); this.waiting.get(name)?.shift()?.(); }
  }
}

interface Tab { session: ReturnType<typeof memory>; repo: Repo | null; page: MissionPage | null; ids: number }
/** One browser: a disk, Web Locks and media store shared by its tabs, each tab with its own session. */
export class World {
  readonly disk = memory();
  readonly media: string[] = [];
  readonly tabs = new Map<string, Tab>();
  private readonly locks = new Locks();
  constructor(readonly impl: Impl) {}
  /** Opens a tab, or reloads it: a new repository over the shared disk and the tab's own session. Its status. */
  async open(name: string, o: { locks?: boolean } = {}): Promise<string> {
    const tab = this.tabs.get(name) ?? { session: memory(), repo: null, page: null, ids: 0 };
    this.tabs.set(name, tab);
    tab.repo?.close(); tab.page = null;
    const media = { migrate: async (id: string) => { this.media.push(`migrate ${id}`); }, delete: async (id: string) => { this.media.push(`delete ${id}`); } };
    tab.repo = this.impl.make(this.disk.store, tab.session.store, o.locks === false ? undefined : this.locks, media, () => `${name.toLowerCase()}-${++tab.ids}`);
    await tab.repo.initialize();
    return tab.repo.status;
  }
  repo(name: string): Repo { return this.tabs.get(name)!.repo!; }
  binding(name: string): Binding { return this.repo(name).binding!; }
  /** The tab's page, started on its profile's storage the way main.ts starts (Home when `lean`), with this side's mission code. */
  page(name: string, lean = false): MissionPage {
    const tab = this.tabs.get(name)!;
    return tab.page ??= new MissionPage(tab.repo!.binding!, lean, this.impl.mission);
  }
}

export type Step = [label: string, act: (w: World) => unknown];
export interface Entry {
  step: string; result: string; disk: [string, string][]; media: string[];
  tabs: Record<string, { session: [string, string][]; status: string; notices: string[]; binding: string | null }>;
}
const errorText = (e: unknown): string => e instanceof Error ? `${e.name}: ${(e as { code?: string }).code ?? e.message}` : String(e);
/** The value, or the error as a trace writes it, for a step that goes on after a refusal. */
export const attempt = (act: () => unknown): unknown => { try { return act(); } catch (e) { return `throws ${errorText(e)}`; } };

/** Runs the steps on a fresh world, the clock at 2026-10-07T08:00:00Z plus one second a step. */
export async function trace(impl: Impl, steps: Step[]): Promise<Entry[]> {
  const w = new World(impl), out: Entry[] = [];
  vi.useFakeTimers({ toFake: ['Date'] });
  try {
    for (const [i, [label, act]] of steps.entries()) {
      vi.setSystemTime(Date.UTC(2026, 9, 7, 8, 0, i));
      let result: string;
      try { result = JSON.stringify(await act(w)) ?? 'undefined'; } catch (e) { result = `throws ${errorText(e)}`; }
      const tabs: Entry['tabs'] = {};
      for (const [name, t] of w.tabs) {
        const b = t.repo?.binding;
        tabs[name] = { session: [...t.session.values], status: t.repo?.status ?? '', notices: [...t.repo?.notices ?? []],
          binding: b ? `${b.profileId} epoch ${b.epoch} ${b.valid ? 'valid' : 'sealed'} ${b.durable ? 'durable' : 'visit-only'}` : null };
      }
      out.push({ step: label, result, disk: [...w.disk.values].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)), media: [...w.media], tabs });
    }
  } finally {
    for (const t of w.tabs.values()) t.repo?.close();
    vi.useRealTimers();
  }
  return out;
}

const clip = (s: string, at: number): string => `${at > 60 ? '…' : ''}${s.slice(Math.max(0, at - 60), at + 60)}${s.length > at + 60 ? '…' : ''}`;
function differ(where: string, a: string, b: string): string {
  let at = 0;
  while (at < a.length && a[at] === b[at]) at++;
  return `${where} differs at character ${at}:\n  ${CURRENT.name}: ${clip(a, at)}\n  ${REFERENCE.name}: ${clip(b, at)}`;
}
/** '' when the two traces are the same byte for byte; otherwise the first difference, step and place named. */
export function firstDifference(a: Entry[], b: Entry[]): string {
  if (a.length !== b.length) return `${a.length} steps against ${b.length}`;
  for (const [i, x] of a.entries()) {
    const y = b[i], at = `step ${i + 1} "${x.step}"`;
    if (x.result !== y.result) return differ(`${at}: the result`, x.result, y.result);
    const dx = new Map(x.disk), dy = new Map(y.disk);
    for (const key of new Set([...dx.keys(), ...dy.keys()])) {
      if (dx.get(key) !== dy.get(key)) return differ(`${at}: localStorage["${key}"]`, dx.get(key) ?? '(none)', dy.get(key) ?? '(none)');
    }
    const [tx, ty, mx, my] = [JSON.stringify(x.tabs), JSON.stringify(y.tabs), JSON.stringify(x.media), JSON.stringify(y.media)];
    if (tx !== ty) return differ(`${at}: the tabs (session, status, notices, binding)`, tx, ty);
    if (mx !== my) return differ(`${at}: the media calls`, mx, my);
  }
  return '';
}
/** EO-STO-1: the steps on both repositories; the current trace, and '' or the first difference. */
export async function differential(steps: Step[], current: Impl = CURRENT): Promise<{ current: Entry[]; diff: string }> {
  const a = await trace(current, steps), b = await trace(REFERENCE, steps);
  return { current: a, diff: firstDifference(a, b) };
}
/** The value a step left under a workspace key, read from the profile's stored record. */
export function storedValue(e: Entry, profileId: string, key: string): string | undefined {
  const raw = new Map(e.disk).get(live.profileStorageKey(profileId));
  return raw === undefined ? undefined : (JSON.parse(raw) as { values: Record<string, string> }).values[key];
}

// ─── the page's mission (src/main.ts on 23ede7f, line numbers in brackets) ───

export const FROM = new Date('2026-09-25T06:00:00Z');
/**
 * `orbitlab.mission` as a build from before #77 and #80 stored it: the bytes
 * da67341's own `saveStoredMission` wrote for a Falcon 9 mission with Engineer
 * settings (run once on da67341's source; the probe is not kept).
 */
export const PRE77_MISSION = '{"format":"orbitlab.mission","version":2,"mission":{"vehicleId":"falcon9","satelliteId":"cubesats","siteId":"cape","orbitId":"leo","orbit":{"id":"leo","name":"Low Earth orbit (500 km)","perigee":500000,"apogee":500000,"inclination":"site","argPerigee":0,"raanMode":"free","description":"Generic circular LEO at the minimum inclination of the launch site."},"launchTime":"2026-09-25T06:00:00.000Z","payloadMass":1000,"guidanceOverrides":{"kickAngle":4.5},"failure":{"mode":"thrustLoss","time":95,"stage":1},"boosterRecovery":true,"recoveryPlan":{"core":{"kind":"droneShip"}},"dynamics":{"model":"sixDof","wind":"shear","seed":4242}}}';
/** What Build's "Fly it" hands over: a parts design as a mission document (build-handoff.ts), and its reference as Build makes it (build-screen.ts, with `m`'s designRefFor). */
export function flownDesign(m: MissionCode = LIVE_MISSION): { doc: unknown; design: DesignRef } {
  const draft = partsDraft('parts-t1', 'Parts'), r = partsResult(draft);
  if (!r.ok) throw new Error('the parts design was refused');
  return { doc: JSON.parse(JSON.stringify(handoffDocument(r.spec, 5000, FROM))),
    design: m.designRefFor('vehicle', { name: 'Parts', recordId: 'd-parts', design: draft }, r.spec.id, { id: 'd-parts', updated: '2026-10-04T12:30:00.000Z', design: draft }) };
}
/**
 * The panel's mission, the page's stored copy (`orbitlab.mission`) and the
 * design reference beside it. Writes go through `store`, a profile's binding,
 * and fail silently there as `saveStoredMission` lets them (a read-only tab).
 * Every read, write and origin rule is `m`'s: the live code, or 23ede7f's copy.
 */
export class MissionPage {
  readonly ws: MissionRules;
  /** the panel's constructor default: the ISS crew launch */
  panel: MissionState = {
    vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbitId: 'iss', orbit: { ...orbitById('iss') },
    launchTime: new Date(FROM), guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    payloadMass: 7150, dynamics: defaultDynamics('soyuz21a'),
  };
  designRef: DesignRef | null = null;
  /** start-up [1002-1008]: the stored mission in a workspace mode, the viewer's launch on Home */
  constructor(readonly store: RawStorage, lean: boolean, readonly m: MissionCode = LIVE_MISSION) {
    this.ws = new m.WorkspaceMission();
    const stored = m.loadStoredMission(store);
    const start = m.startupMission({ link: false, lean, stored: stored !== null });
    if (start === 'demo') this.viewer('demo', this.panel);
    else if (start === 'stored') this.applyStored(stored);
    else { this.ws.adopt(); this.preview(); }
  }
  doc(): string { return JSON.stringify(this.m.missionDocument(this.panel)); }
  /** [1144-1147] */
  private currentRef(): DesignRef | null {
    if (this.designRef && !this.m.refFlies(this.designRef, this.panel)) this.designRef = null;
    return this.designRef;
  }
  /** every panel change previews [1836] */
  preview(): void { if (this.ws.persists(this.doc())) this.m.saveStoredMission(this.panel, this.store, this.currentRef()); }
  /** loadViewerMission [1137-1141] */
  viewer(origin: Exclude<MissionOrigin, 'workspace'>, mission: MissionState): void {
    this.ws.viewing(origin);
    this.panel = { ...structuredClone(mission), dynamics: defaultDynamics(mission.vehicleId) };
    this.preview();
    this.ws.loaded(this.doc());
  }
  /** applyStoredMission [1158-1173]; `share.apply` previews through the panel's change */
  applyStored(stored: unknown): void {
    this.ws.restoring();
    const parsed = this.m.parseMissionDocument(stored, this.panel);
    if (parsed.usable) this.panel = parsed.state;
    this.preview();
    const r = this.m.parseDesignRef(stored && typeof stored === 'object' ? (stored as { design?: unknown }).design : undefined);
    this.designRef = r && r !== 'invalid' && this.m.refFlies(r, this.panel) ? r : null;
    if (this.ws.restored(this.doc(), !parsed.issues.length)) this.m.saveStoredMission(this.panel, this.store, this.designRef);
  }
  /** entering Explore or Engineer, the launch on its pad: restoreWorkspaceMission [1226-1232] */
  enter(): void {
    const stored = this.m.loadStoredMission(this.store);
    if (this.ws.entering({ doc: this.doc(), stored: stored !== null, underway: false })) this.applyStored(stored);
  }
  /** Home's "try a launch yourself" and Watch's copy: openTemplate [1209-1218], in Explore */
  template(mission: MissionState): void { this.enter(); this.viewer('template', mission); }
  /** a panel edit, a quick start or a WebMCP edit */
  edit(change: (m: MissionState) => void): void { change(this.panel); this.preview(); }
  /** Build's "Fly it" [648-657], then `designFlown` once Build has read the saved record [1150-1155] */
  flyIt(doc: unknown, design: DesignRef): boolean {
    const parsed = this.m.parseMissionDocument(doc, this.panel);
    if (!parsed.usable) return false;
    this.panel = parsed.state; this.preview();
    this.m.saveStoredMission(this.panel, this.store);
    this.enter();
    if (!this.m.refFlies(design, this.panel)) return true;
    this.designRef = design;
    if (this.ws.origin === 'workspace') this.m.saveStoredMission(this.panel, this.store, design);
    return true;
  }
}
