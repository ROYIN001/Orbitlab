/**
 * The mission as a document (roadmap U01): a link that carries the whole
 * setup, a `.orbitlab.json` file that can be saved and opened again, and the
 * copy the page keeps so a closed tab comes back to the same mission.
 *
 * All three are one format with a version number. Whatever comes in is held
 * to `validateConfigInput`, the same check `configure_mission` makes over
 * WebMCP, and a value it rejects goes back to its default (the rest of the
 * mission is kept) with an issue naming the field, for the page to show.
 */
import type { DynamicsConfig, FailureConfig, GuidanceParams, MissionConfig, OrbitSpec, RecoveryPlan } from '../types';
import { VEHICLES } from '../data/vehicles';
import { SATELLITES } from '../data/satellites';
import { ORBIT_PRESETS } from '../data/orbits';
import { DEFAULT_FAILURE } from '../physics/defaults';
import { defaultDynamics } from '../physics/rigid/config';
import { GUIDANCE_FIELDS, parseUtcDateTime, validateConfigInput, type ConfigInput, type ValidationCode } from './validation';

/** What the file says it is. */
export const MISSION_FORMAT = 'orbitlab.mission';
/**
 * The version of the layout below. Raise it when a field changes meaning, and
 * teach `upgrade` to read the old one; a field that is only added needs no new
 * version, since a document without it takes the default.
 */
export const MISSION_FORMAT_VERSION = 1;

/** The setup panel's mission: `ConfigInput` plus which orbit preset it started from. */
export type MissionState = ConfigInput & { orbitId: string };

export interface MissionDocument {
  format: typeof MISSION_FORMAT;
  version: number;
  mission: {
    vehicleId: string; satelliteId: string; siteId: string;
    orbitId: string; orbit: OrbitSpec;
    /** ISO 8601, UTC */
    launchTime: string;
    payloadMass: number;
    guidanceOverrides: Partial<GuidanceParams>;
    failure: FailureConfig;
    boosterRecovery: boolean;
    recoveryPlan?: RecoveryPlan;
    dynamics?: DynamicsConfig;
    /** the site's pad, when not its first (V05) */
    padId?: string;
    /** the flight on to the station (G07) */
    rendezvous?: MissionConfig['rendezvous'];
  };
}

/**
 * Something in a document that could not be used. `field` is a setup field's
 * key (as in `ValidationIssue`) when one value was reset, or `'document'` when
 * the whole document was.
 */
export interface MissionIssue {
  field: string;
  code: ValidationCode | 'format' | 'newerVersion' | 'unreadable';
}

export interface ParsedMission {
  /** the mission to load; the fallback itself when nothing was usable */
  state: MissionState;
  issues: MissionIssue[];
  /** false when nothing in the document was usable */
  usable: boolean;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)) as T);

/** The mission as a document: plain JSON, nothing the state shares by reference. */
export function missionDocument(state: MissionState): MissionDocument {
  return {
    format: MISSION_FORMAT,
    version: MISSION_FORMAT_VERSION,
    mission: {
      vehicleId: state.vehicleId, satelliteId: state.satelliteId, siteId: state.siteId,
      orbitId: state.orbitId, orbit: clone(state.orbit),
      launchTime: state.launchTime.toISOString(),
      payloadMass: state.payloadMass,
      guidanceOverrides: clone(state.guidanceOverrides),
      failure: clone(state.failure),
      boosterRecovery: state.boosterRecovery,
      ...(state.recoveryPlan ? { recoveryPlan: clone(state.recoveryPlan) } : {}),
      ...(state.dynamics ? { dynamics: clone(state.dynamics) } : {}),
      ...(state.padId ? { padId: state.padId } : {}),
      ...(state.rendezvous ? { rendezvous: clone(state.rendezvous) } : {}),
    },
  };
}

/** A copy of a mission, with its own date and nested objects. */
export function copyMission(state: MissionState): MissionState {
  return {
    ...clone({ ...state, launchTime: undefined }),
    launchTime: new Date(state.launchTime.getTime()),
  } as MissionState;
}

/** The defaults a reset value falls back on, for this vehicle and satellite. */
function vehicleDefaults(vehicleId: string) {
  const spec = VEHICLES.find((v) => v.id === vehicleId);
  return { spec, dynamics: defaultDynamics(vehicleId), site: spec?.sites[0] };
}

/**
 * Put the document's values over the fallback, keeping only values of the
 * right JSON type; the ranges and selections are `validateConfigInput`'s to
 * judge, below. A value of the wrong type is reported like an invalid one.
 */
function overlay(m: Record<string, unknown>, fallback: MissionState, issues: MissionIssue[]): MissionState {
  const out = copyMission(fallback);
  const str = (key: 'vehicleId' | 'satelliteId' | 'siteId' | 'orbitId', field: string) => {
    if (m[key] === undefined) return;
    if (typeof m[key] === 'string') out[key] = m[key] as string;
    else issues.push({ field, code: 'selection' });
  };
  str('vehicleId', 'setup.vehicle');
  const vehicleChanged = out.vehicleId !== fallback.vehicleId;
  // A different vehicle starts from its own defaults, not the fallback's.
  if (vehicleChanged) {
    const d = vehicleDefaults(out.vehicleId);
    out.dynamics = d.dynamics;
    if (d.site) out.siteId = d.site;
    out.guidanceOverrides = {};
    out.boosterRecovery = false;
    out.recoveryPlan = undefined;
    out.failure = { ...DEFAULT_FAILURE };
  }
  str('satelliteId', 'setup.satellite');
  str('siteId', 'setup.site');
  // a pad belongs to one site; a flight to the station to one vehicle and payload
  if (vehicleChanged || out.siteId !== fallback.siteId) out.padId = undefined;
  if (vehicleChanged || out.satelliteId !== fallback.satelliteId) out.rendezvous = undefined;
  str('orbitId', 'setup.orbit');
  if (m.orbit !== undefined) {
    if (isRecord(m.orbit)) out.orbit = { ...clone(m.orbit) } as unknown as OrbitSpec;
    else issues.push({ field: 'setup.orbit', code: 'selection' });
  }
  if (m.launchTime !== undefined) {
    const date = typeof m.launchTime === 'string' ? parseUtcDateTime(m.launchTime, true) : null;
    if (date) out.launchTime = date;
    else issues.push({ field: 'setup.launchTime', code: 'date' });
  }
  if (m.payloadMass !== undefined) out.payloadMass = m.payloadMass as number;
  if (m.guidanceOverrides !== undefined) {
    if (isRecord(m.guidanceOverrides)) out.guidanceOverrides = clone(m.guidanceOverrides) as Partial<GuidanceParams>;
    else issues.push({ field: 'setup.guidance', code: 'selection' });
  }
  if (m.failure !== undefined) {
    if (isRecord(m.failure)) out.failure = { ...DEFAULT_FAILURE, ...clone(m.failure) } as FailureConfig;
    else issues.push({ field: 'setup.failureMode', code: 'selection' });
  }
  if (m.boosterRecovery !== undefined) out.boosterRecovery = m.boosterRecovery as boolean;
  if (m.recoveryPlan !== undefined) out.recoveryPlan = clone(m.recoveryPlan) as RecoveryPlan;
  else if (m.boosterRecovery !== undefined) out.recoveryPlan = undefined;
  if (m.dynamics !== undefined) {
    if (isRecord(m.dynamics)) out.dynamics = clone(m.dynamics) as unknown as DynamicsConfig;
    else issues.push({ field: 'setup.dynamics.model', code: 'selection' });
  }
  // A document that names its mission names these too, or has none.
  if (m.padId !== undefined) {
    if (typeof m.padId === 'string') out.padId = m.padId;
    else issues.push({ field: 'setup.site', code: 'selection' });
  } else if (m.vehicleId !== undefined) out.padId = undefined;
  if (m.rendezvous !== undefined) {
    if (isRecord(m.rendezvous)) out.rendezvous = clone(m.rendezvous) as unknown as MissionConfig['rendezvous'];
    else issues.push({ field: 'setup.rendezvous', code: 'selection' });
  } else if (m.vehicleId !== undefined) out.rendezvous = undefined;
  return out;
}

/** The whole orbit reset: to the preset the document names, else to the fallback's. */
function resetOrbit(state: MissionState, fallback: MissionState): void {
  const preset = ORBIT_PRESETS.find((o) => o.id === state.orbitId);
  if (preset) state.orbit = { ...preset };
  else { state.orbitId = fallback.orbitId; state.orbit = clone(fallback.orbit); }
}

/** Put the part of the mission an issue's field belongs to back to its default. */
function reset(state: MissionState, field: string, fallback: MissionState): void {
  const d = vehicleDefaults(state.vehicleId);
  const dynamics = (): DynamicsConfig => (state.dynamics ??= d.dynamics);
  if (field === 'setup.vehicle') {
    Object.assign(state, copyMission(fallback));
    return;
  }
  if (field === 'setup.site') { if (d.site) state.siteId = d.site; state.recoveryPlan = undefined; state.padId = undefined; return; }
  if (field === 'setup.rendezvous') { state.rendezvous = undefined; return; }
  if (field === 'setup.satellite') {
    state.satelliteId = fallback.satelliteId;
    state.payloadMass = SATELLITES.find((s) => s.id === fallback.satelliteId)?.mass ?? fallback.payloadMass;
    return;
  }
  if (field === 'setup.payloadMass') {
    state.payloadMass = SATELLITES.find((s) => s.id === state.satelliteId)?.mass ?? fallback.payloadMass;
    return;
  }
  if (['setup.orbit', 'setup.perigee', 'setup.apogee', 'setup.inclination', 'setup.argPerigee', 'setup.raanMode', 'setup.raan', 'setup.ltan'].includes(field)) {
    resetOrbit(state, fallback);
    return;
  }
  if (field === 'setup.launchTime') { state.launchTime = new Date(fallback.launchTime.getTime()); return; }
  if (field === 'setup.guidance') {
    const known = new Set(Object.values(GUIDANCE_FIELDS).map((f) => f.key as string));
    for (const key of Object.keys(state.guidanceOverrides)) if (!known.has(key)) delete (state.guidanceOverrides as Record<string, unknown>)[key];
    return;
  }
  const guidanceKey = Object.values(GUIDANCE_FIELDS).find((f) => `setup.${f.key}` === field)?.key;
  if (guidanceKey) { delete state.guidanceOverrides[guidanceKey]; return; }
  if (field.startsWith('setup.failure')) { state.failure = { ...DEFAULT_FAILURE }; return; }
  if (field === 'setup.boosterRecovery') { state.boosterRecovery = false; state.recoveryPlan = undefined; return; }
  if (field === 'setup.dynamics.model') { dynamics().model = d.dynamics.model; return; }
  if (field === 'setup.dynamics.wind') { dynamics().wind = d.dynamics.wind; return; }
  if (field === 'setup.dynamics.seed') { dynamics().seed = d.dynamics.seed; return; }
  if (field.startsWith('setup.flex.')) { delete dynamics().flex; return; }
  if (field.startsWith('setup.control.')) { delete dynamics().control; return; }
  if (field.startsWith('setup.nav.')) {
    // control-system faults of the navigation kind need the navigation they act on
    delete dynamics().navigation;
    delete dynamics().controlFaults;
    return;
  }
  if (field.startsWith('setup.faults.')) { delete dynamics().controlFaults; return; }
  if (field.startsWith('setup.explicit.')) { delete dynamics().explicitGuidance; return; }
  // a field this function does not know: the whole dynamics goes back to the vehicle's
  state.dynamics = d.dynamics;
}

/** A document in an older layout, brought to the current one (none yet: version 1 is the first). */
function upgrade(doc: Record<string, unknown>): Record<string, unknown> {
  return doc;
}

/**
 * Read a mission document: whatever the document holds that is valid, over
 * `fallback` (the mission on the page) for anything it lacks or gets wrong.
 */
export function parseMissionDocument(raw: unknown, fallback: MissionState): ParsedMission {
  const unusable = (code: MissionIssue['code']): ParsedMission => ({ state: copyMission(fallback), issues: [{ field: 'document', code }], usable: false });
  if (!isRecord(raw) || raw.format !== MISSION_FORMAT || !isRecord(raw.mission)) return unusable('format');
  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) return unusable('format');
  const issues: MissionIssue[] = [];
  // A newer file is read as far as this version understands it, and says so.
  if (raw.version > MISSION_FORMAT_VERSION) issues.push({ field: 'document', code: 'newerVersion' });
  const doc = upgrade(raw);
  const state = overlay(doc.mission as Record<string, unknown>, fallback, issues);
  for (const issue of issues) if (issue.field !== 'document') reset(state, issue.field, fallback);
  // Each pass resets what was wrong; a reset can only make the mission more
  // default, so a handful of passes settles it.
  for (let pass = 0; pass < 6; pass++) {
    let found;
    try { found = validateConfigInput(state); } catch { found = [{ field: 'document', code: 'unreadable' as const }]; }
    if (!found.length) return { state, issues: dedupe(issues), usable: true };
    for (const issue of found) {
      issues.push({ field: issue.field, code: issue.code });
      if (issue.field === 'document') return unusable('unreadable');
      reset(state, issue.field, fallback);
    }
  }
  return unusable('unreadable');
}

function dedupe(issues: MissionIssue[]): MissionIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const key = `${i.field}|${i.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── the link ───────────────────────────────────────────────────────────────

/** The query parameter a mission link carries its mission in. */
export const MISSION_PARAM = 'm';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/**
 * The document as a link parameter: `z` and the deflated JSON in base64url,
 * or `j` and the JSON itself where the browser has no CompressionStream.
 */
export async function encodeMissionParam(doc: MissionDocument): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(doc));
  if (typeof CompressionStream === 'function') return `z${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}`;
  return `j${toBase64Url(json)}`;
}

/** A link parameter back to the JSON it carries; throws when it is not one. */
export async function decodeMissionParam(param: string): Promise<unknown> {
  const kind = param[0], body = fromBase64Url(param.slice(1));
  let bytes: Uint8Array;
  if (kind === 'z') bytes = await pipe(body, new DecompressionStream('deflate-raw'));
  else if (kind === 'j') bytes = body;
  else throw new Error('not a mission link');
  return JSON.parse(new TextDecoder().decode(bytes));
}

// ─── the file ───────────────────────────────────────────────────────────────

export const MISSION_FILE_EXTENSION = '.orbitlab.json';

export function missionFileText(doc: MissionDocument): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

/** A file name for the mission: vehicle, site and launch date. */
export function missionFileName(state: MissionState): string {
  const date = state.launchTime.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return `${state.vehicleId}-${state.siteId}-${date}${MISSION_FILE_EXTENSION}`;
}

/** A file's text back to the JSON it holds; `null` when it is not JSON. */
export function readMissionFileText(text: string): unknown {
  try { return JSON.parse(text); } catch { return null; }
}

// ─── the copy the page keeps ────────────────────────────────────────────────

export const MISSION_STORE_KEY = 'orbitlab.mission';

export function saveStoredMission(state: MissionState, store?: Pick<Storage, 'setItem'>): void {
  try { (store ?? localStorage).setItem(MISSION_STORE_KEY, JSON.stringify(missionDocument(state))); } catch { /* storage off or full */ }
}

export function loadStoredMission(store?: Pick<Storage, 'getItem'>): unknown {
  try {
    const text = (store ?? localStorage).getItem(MISSION_STORE_KEY);
    return text ? JSON.parse(text) : null;
  } catch { return null; }
}
