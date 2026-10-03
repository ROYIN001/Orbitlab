import { workspaceStorage } from '../workspace/storage';
/** Experiment evidence is plain JSON: frozen flown inputs, command journal and
 * observed figures, never a claim that a two-run comparison proves causation. */
import { MISSION_FORMAT, MISSION_FORMAT_VERSION, type MissionDocument } from '../config/mission-file';
import { parseUtcDateTime, validateConfigInput, type ConfigInput } from '../config/validation';
import { compareFlights, type ComparedFigure, type ReferenceSample } from '../replay/reference';
import { readActions, type FlightAction } from '../physics/sim/actions';
import type { SimEvent, SimStatus } from '../physics/simulation';

export const NOTEBOOK_STORAGE_KEY = 'orbitlab.experiments.v1';
export const NOTEBOOK_MAX_BYTES = 4_000_000;
export const NOTEBOOK_MAX_ENTRIES = 30;
const MAX_ACTIONS = 2000;
export const NOTEBOOK_TEXT_LIMIT = 4000;

export interface ExperimentRunInput {
  label: string;
  /** Use flownMission(sim.cfg), never the currently edited setup panel. */
  mission: MissionDocument;
  telemetry: readonly ReferenceSample[];
  events: readonly SimEvent[];
  actions: readonly FlightAction[];
  app: string;
  t: number;
  clock: number;
  status: SimStatus;
  complete: boolean;
}

export interface ExperimentFigure {
  key: ComparedFigure['key'];
  unit: ComparedFigure['unit'];
  value: number | null;
}

export interface ExperimentRun {
  label: string;
  capturedAt: string;
  mission: MissionDocument;
  actions: FlightAction[];
  app: string;
  t: number;
  clock: number;
  status: SimStatus;
  complete: boolean;
  /** Peaks are observations of this telemetry, not continuous-time extrema. */
  source: 'recorded-telemetry';
  sampleCount: number;
  sampleStart: number;
  sampleEnd: number;
  figures: ExperimentFigure[];
}

export interface ExperimentEntry {
  id: string;
  createdAt: string;
  title: string;
  prediction: string;
  /** Dot path into MissionDocument.mission; selected before the trial. */
  variable: string;
  baseline: ExperimentRun;
  trial?: ExperimentRun;
  conclusion: string;
}

export interface NotebookData { version: 1; experiments: ExperimentEntry[] }
export interface NotebookStore { getItem(key: string): string | null; setItem(key: string, value: string): void }
export type NotebookLoadStatus = 'empty' | 'loaded' | 'unavailable' | 'invalid';

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const string = (v: unknown, max = NOTEBOOK_TEXT_LIMIT): v is string => typeof v === 'string' && v.length <= max;
const date = (v: unknown): v is string => string(v, 40) && parseUtcDateTime(v, true) !== null;
const copy = <T>(v: T): T => structuredClone(v);

/** Reject excessive nesting, cyclic objects, non-JSON values and dangerous keys
 * before handing imported evidence to any of the domain readers. */
function boundedJson(value: unknown): boolean {
  let nodes = 0, characters = 0;
  const visit = (v: unknown, depth: number): boolean => {
    if (++nodes > 150_000 || depth > 24) return false;
    if (v === null || typeof v === 'boolean') return true;
    if (typeof v === 'number') return Number.isFinite(v);
    if (typeof v === 'string') { characters += v.length; return v.length <= 12_000 && characters <= NOTEBOOK_MAX_BYTES; }
    if (Array.isArray(v)) return v.length <= 10_000 && v.every((item) => visit(item, depth + 1));
    if (!record(v) || Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) return false;
    const entries = Object.entries(v);
    return entries.length <= 1000 && entries.every(([key, item]) => {
      characters += key.length;
      return key !== '__proto__' && key !== 'constructor' && key !== 'prototype' && key.length <= 180 && visit(item, depth + 1);
    });
  };
  return visit(value, 0);
}

function validMission(v: unknown): v is MissionDocument {
  if (!record(v) || v.format !== MISSION_FORMAT || !Number.isInteger(v.version)
    || (v.version as number) < 1 || (v.version as number) > MISSION_FORMAT_VERSION || !record(v.mission)) return false;
  const m = v.mission;
  if ((v.version as number) < 2 && m.vehicleSpec !== undefined || (v.version as number) < 3 && m.satelliteSpec !== undefined) return false;
  if (!['vehicleId', 'satelliteId', 'siteId', 'orbitId'].every((key) => string(m[key], 160) && !!m[key])
    || !date(m.launchTime) || !finite(m.payloadMass) || !record(m.orbit) || !record(m.guidanceOverrides)
    || !record(m.failure) || typeof m.boosterRecovery !== 'boolean') return false;
  try {
    return validateConfigInput({ ...m, launchTime: new Date(m.launchTime) } as unknown as ConfigInput).length === 0;
  } catch { return false; }
}

const STATUS = ['prelaunch', 'ascent', 'coast', 'burn', 'orbit', 'descent', 'abort', 'rendezvous', 'landed', 'failed'];
const FIGURE_UNITS: Record<string, ExperimentFigure['unit']> = {
  insertion: 's', perigee: 'km', apogee: 'km', inclination: 'deg', maxQ: 'kPa', maxQTime: 's', maxG: 'g', dvLeft: 'm/s',
  'event:evt.maxQ': 's', 'event:evt.meco': 's', 'event:evt.stageSep': 's', 'event:evt.seco': 's',
  'event:evt.fairingSep': 's', 'event:evt.parkingOrbit': 's', 'event:evt.targetOrbit': 's',
};

function validRun(v: unknown): v is ExperimentRun {
  if (!record(v) || !string(v.label, 300) || !date(v.capturedAt) || !validMission(v.mission)
    || !string(v.app, 160) || !v.app || !finite(v.t) || !finite(v.clock) || v.clock > v.t + 1e-6
    || typeof v.status !== 'string' || !STATUS.includes(v.status) || typeof v.complete !== 'boolean'
    || v.complete && Math.abs(v.clock - v.t) > 1e-6
    || v.source !== 'recorded-telemetry' || !Number.isInteger(v.sampleCount) || (v.sampleCount as number) < 1
    || (v.sampleCount as number) > 10_000_000 || !finite(v.sampleStart) || !finite(v.sampleEnd)
    || v.sampleStart > v.sampleEnd || v.sampleEnd > v.clock + 1e-6
    || !Array.isArray(v.actions) || v.actions.length > MAX_ACTIONS || !readActions(v.actions)
    || v.actions.some((a) => a.t > (v.t as number)) || !Array.isArray(v.figures) || v.figures.length > 15) return false;
  const seen = new Set<string>();
  return v.figures.every((f) => {
    if (!record(f) || typeof f.key !== 'string' || seen.has(f.key) || !Object.hasOwn(FIGURE_UNITS, f.key)
      || FIGURE_UNITS[f.key] !== f.unit || f.value !== null && !finite(f.value)) return false;
    if (finite(f.value) && (f.unit === 's' && f.value > (v.clock as number)
      || f.key === 'maxQTime' && (f.value < (v.sampleStart as number) || f.value > (v.sampleEnd as number)))) return false;
    seen.add(f.key);
    return true;
  });
}

/** Strict, bounded archive entry point. It never repairs or drops evidence. */
export function validateNotebookData(value: unknown): NotebookData | null {
  try {
    if (!boundedJson(value) || !record(value) || value.version !== 1 || !Array.isArray(value.experiments)
      || value.experiments.length > NOTEBOOK_MAX_ENTRIES) return null;
    const text = JSON.stringify(value);
    if (text.length > NOTEBOOK_MAX_BYTES || new TextEncoder().encode(text).byteLength > NOTEBOOK_MAX_BYTES) return null;
    const ids = new Set<string>();
    for (const e of value.experiments) {
      if (!record(e) || !string(e.id, 100) || !/^[\w-]+$/.test(e.id) || ids.has(e.id)
        || !date(e.createdAt) || !string(e.title, 160) || !e.title.trim() || !string(e.prediction) || !e.prediction.trim()
        || !string(e.variable, 180) || !/^[\w.-]+$/.test(e.variable) || !string(e.conclusion)
        || !validRun(e.baseline) || e.trial !== undefined && !validRun(e.trial)
        || !missionInputs(e.baseline.mission).some((item) => item.path === e.variable)) return null;
      ids.add(e.id);
    }
    return copy(value as unknown as NotebookData);
  } catch { return null; }
}

export function loadNotebook(store?: Pick<NotebookStore, 'getItem'>): { data: NotebookData; status: NotebookLoadStatus; revision: string | null } {
  const empty: NotebookData = { version: 1, experiments: [] };
  let revision: string | null = null;
  try {
    const raw = (store ?? workspaceStorage()).getItem(NOTEBOOK_STORAGE_KEY);
    revision = raw;
    if (raw === null) return { data: empty, status: 'empty', revision: null };
    const data = raw.length <= NOTEBOOK_MAX_BYTES ? validateNotebookData(JSON.parse(raw)) : null;
    return { data: data ?? empty, status: data ? 'loaded' : 'invalid', revision: raw };
  } catch (error) { return { data: empty, status: error instanceof SyntaxError ? 'invalid' : 'unavailable', revision }; }
}

export function saveNotebook(data: NotebookData, store?: Pick<NotebookStore, 'setItem'>): boolean {
  if (!validateNotebookData(data)) return false;
  try { (store ?? workspaceStorage()).setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify(data)); return true; } catch { return false; }
}

/** Refuse a stale editor's write. localStorage has no cross-tab transaction:
 * this catches changes visible before a save, not simultaneous writers. */
export function saveNotebookRevision(data: NotebookData, revision: string | null, store?: NotebookStore): 'saved' | 'changed' | 'unavailable' {
  try {
    const target = store ?? workspaceStorage();
    if (target.getItem(NOTEBOOK_STORAGE_KEY) !== revision) return 'changed';
    return saveNotebook(data, target) ? 'saved' : 'unavailable';
  } catch { return 'unavailable'; }
}

export type InputValue = string | number | boolean | null;
export interface MissionInput { path: string; value: InputValue }

/** Compare leaf values, so two changes within guidance never count as one.
 * Preset IDs and translated display names are metadata, not physics inputs. */
export function missionInputs(doc: MissionDocument): MissionInput[] {
  const out: MissionInput[] = [];
  const walk = (v: unknown, path: string, depth: number): void => {
    if (depth > 24) return;
    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out.push({ path, value: v }); return;
    }
    if (typeof v !== 'object' || !v) return;
    for (const [key, item] of Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) {
      if ((!path && key === 'orbitId') || (path === 'orbit' && ['id', 'name', 'description', 'nameKey', 'descriptionKey'].includes(key))) continue;
      walk(item, path ? `${path}.${key}` : key, depth + 1);
    }
  };
  walk(doc.mission, '', 0);
  return out;
}

export interface InputChange { path: string; before: InputValue | undefined; after: InputValue | undefined }
export function changedMissionInputs(a: MissionDocument, b: MissionDocument): InputChange[] {
  const before = new Map(missionInputs(a).map((item) => [item.path, item.value]));
  const after = new Map(missionInputs(b).map((item) => [item.path, item.value]));
  return [...new Set([...before.keys(), ...after.keys()])].sort().filter((key) => before.get(key) !== after.get(key))
    .map((path) => ({ path, before: before.get(path), after: after.get(path) }));
}

export type ComparisonNotice = 'missingTrial' | 'noChange' | 'multipleChanges' | 'wrongVariable' | 'differentBuild'
  | 'differentActions' | 'incomplete' | 'differentHorizon' | 'differentStatus' | 'windInactive';

function orderedJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(orderedJson).join(',')}]`;
  if (record(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${orderedJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function compareExperiment(entry: ExperimentEntry): { changes: InputChange[]; notices: ComparisonNotice[]; figures: ComparedFigure[] } {
  if (!entry.trial) return { changes: [], notices: ['missingTrial'], figures: [] };
  const a = entry.baseline, b = entry.trial;
  const changes = changedMissionInputs(a.mission, b.mission);
  const notices: ComparisonNotice[] = [];
  if (!changes.length) notices.push('noChange');
  if (changes.length > 1) notices.push('multipleChanges');
  if (changes.length && !changes.some((c) => c.path === entry.variable)) notices.push('wrongVariable');
  if (a.app !== b.app) notices.push('differentBuild');
  // A replay capture may keep commands from after its displayed instant for
  // reproducibility. Those commands cannot explain the figures shown yet.
  const observedActions = (run: ExperimentRun) => run.actions.filter((action) => action.t <= run.clock);
  if (orderedJson(observedActions(a)) !== orderedJson(observedActions(b))) notices.push('differentActions');
  if (!a.complete || !b.complete) notices.push('incomplete');
  if (Math.abs(a.sampleEnd - b.sampleEnd) > 0.5 || Math.abs(a.sampleStart - b.sampleStart) > 0.5) notices.push('differentHorizon');
  if (a.status !== b.status) notices.push('differentStatus');
  if (['dynamics.wind', 'dynamics.seed'].includes(entry.variable)
    && [a, b].some((run) => run.mission.mission.dynamics?.model !== 'sixDof')) notices.push('windInactive');
  const keys = [...new Set([...a.figures.map((f) => f.key), ...b.figures.map((f) => f.key)])];
  return { changes, notices, figures: keys.map((key) => {
    const ref = a.figures.find((f) => f.key === key), cur = b.figures.find((f) => f.key === key);
    return { key, unit: (ref ?? cur)!.unit, reference: ref?.value ?? null, current: cur?.value ?? null };
  }) };
}

/** Capture only evidence visible by the display clock. The simulation may have
 * stepped ahead; its t and full command journal remain explicit provenance. */
export function captureExperimentRun(input: ExperimentRunInput, at = new Date()): ExperimentRun | null {
  const telemetry = input.telemetry.filter((sample) => sample.t <= input.clock);
  if (!telemetry.length || input.status === 'prelaunch' || input.actions.length > MAX_ACTIONS) return null;
  const source = { telemetry, events: input.events.filter((event) => event.t <= input.clock) };
  const run: ExperimentRun = {
    label: input.label.slice(0, 300), capturedAt: at.toISOString(), mission: copy(input.mission),
    actions: copy([...input.actions]), app: input.app, t: input.t, clock: input.clock,
    status: input.status, complete: input.complete, source: 'recorded-telemetry', sampleCount: telemetry.length,
    sampleStart: telemetry[0].t, sampleEnd: telemetry[telemetry.length - 1].t,
    figures: compareFlights(source, source).map((f) => ({ key: f.key, unit: f.unit, value: finite(f.current) ? f.current : null })),
  };
  return validRun(run) ? run : null;
}
