/**
 * da67341's mission reader and writer (S10 §10.3.1): what a build from before
 * #77/#80 does with `orbitlab.mission`. Copied verbatim; only these imports are
 * new. Lines 21/40/42, 90-338 and 415-419 of da67341:src/config/mission-file.ts.
 */
import type { DynamicsConfig, FailureConfig, GuidanceParams, MissionConfig, OrbitSpec, RecoveryPlan, SatelliteSpec, VehicleSpec } from '../../../src/types';
import type { MissionDocument, MissionIssue, MissionState, ParsedMission } from '../../../src/config/mission-file';
import { ALL_VEHICLES } from '../../../src/data/vehicles';
import { SATELLITES } from '../../../src/data/satellites';
import { ORBIT_PRESETS } from '../../../src/data/orbits';
import { DEFAULT_FAILURE } from '../../../src/physics/defaults';
import { defaultDynamics } from '../../../src/physics/rigid/config';
import { GUIDANCE_FIELDS, parseUtcDateTime, validateConfigInput, vehicleGuidanceFigureValid } from '../../../src/config/validation';
import { workspaceStorage } from '../../../src/workspace/storage';

export const MISSION_FORMAT = 'orbitlab.mission';
export const MISSION_FORMAT_VERSION = 3;
export const MISSION_BASE_VERSION = 2;

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)) as T);

/** The mission as a document: plain JSON, nothing the state shares by reference. */
export function missionDocument(state: MissionState): MissionDocument {
  return {
    format: MISSION_FORMAT,
    version: state.satelliteSpec ? MISSION_FORMAT_VERSION : MISSION_BASE_VERSION,
    mission: {
      vehicleId: state.vehicleId, satelliteId: state.satelliteId, siteId: state.siteId,
      ...(state.vehicleSpec ? { vehicleSpec: clone(state.vehicleSpec) } : {}),
      ...(state.satelliteSpec ? { satelliteSpec: clone(state.satelliteSpec) } : {}),
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

/**
 * The mission's satellite — a custom one included (D06) — or undefined when
 * the mission names none it has; the checks judge which, not this.
 */
function satelliteOf(state: Pick<MissionState, 'satelliteId' | 'satelliteSpec'>): SatelliteSpec | undefined {
  return state.satelliteSpec?.id === state.satelliteId ? state.satelliteSpec : SATELLITES.find((s) => s.id === state.satelliteId);
}

/** A satellite's own mass as a payload mass, or the fallback's when it gives none that is one. */
function payloadMassOf(state: Pick<MissionState, 'satelliteId' | 'satelliteSpec'>, fallback: number): number {
  const mass = satelliteOf(state)?.mass;
  return typeof mass === 'number' && Number.isFinite(mass) && mass > 0 ? mass : fallback;
}

/** The defaults a reset value falls back on, for this mission's vehicle — a custom one included (S02). */
function vehicleDefaults(state: Pick<MissionState, 'vehicleId' | 'vehicleSpec'>) {
  const spec = state.vehicleSpec?.id === state.vehicleId ? state.vehicleSpec : ALL_VEHICLES.find((v) => v.id === state.vehicleId);
  return { spec, dynamics: spec ? defaultDynamics(spec) : defaultDynamics(state.vehicleId), site: spec?.sites[0] };
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
  // S02: a document that names its vehicle carries its custom spec too, or flies a catalogue one
  if (m.vehicleSpec !== undefined) {
    if (isRecord(m.vehicleSpec)) out.vehicleSpec = clone(m.vehicleSpec) as unknown as VehicleSpec;
    else issues.push({ field: 'setup.vehicle', code: 'vehicleSpec' });
  } else if (m.vehicleId !== undefined) out.vehicleSpec = undefined;
  const vehicleChanged = out.vehicleId !== fallback.vehicleId
    || JSON.stringify(out.vehicleSpec ?? null) !== JSON.stringify(fallback.vehicleSpec ?? null);
  // A different vehicle starts from its own defaults, not the fallback's.
  if (vehicleChanged) {
    const d = vehicleDefaults(out);
    out.dynamics = d.dynamics;
    if (d.site) out.siteId = d.site;
    out.guidanceOverrides = {};
    out.boosterRecovery = false;
    out.recoveryPlan = undefined;
    out.failure = { ...DEFAULT_FAILURE };
  }
  str('satelliteId', 'setup.satellite');
  // D06: a document that names its satellite carries its custom spec too, or flies a catalogue one
  if (m.satelliteSpec !== undefined) {
    if (isRecord(m.satelliteSpec)) out.satelliteSpec = clone(m.satelliteSpec) as unknown as SatelliteSpec;
    else issues.push({ field: 'setup.satellite', code: 'satelliteSpec' });
  } else if (m.satelliteId !== undefined) out.satelliteSpec = undefined;
  const satelliteChanged = out.satelliteId !== fallback.satelliteId
    || JSON.stringify(out.satelliteSpec ?? null) !== JSON.stringify(fallback.satelliteSpec ?? null);
  str('siteId', 'setup.site');
  // a pad belongs to one site; a flight to the station to one vehicle and payload
  if (vehicleChanged || out.siteId !== fallback.siteId) out.padId = undefined;
  if (vehicleChanged || satelliteChanged) out.rendezvous = undefined;
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
  const d = vehicleDefaults(state);
  const dynamics = (): DynamicsConfig => (state.dynamics ??= d.dynamics);
  if (field === 'setup.vehicle') {
    Object.assign(state, copyMission(fallback));
    // Object.assign keeps what the fallback lacks: a custom vehicle must not outlive a reset to a catalogue one
    if (!fallback.vehicleSpec) state.vehicleSpec = undefined;
    // …nor a custom satellite a reset to a catalogue one (D06)
    if (!fallback.satelliteSpec) state.satelliteSpec = undefined;
    return;
  }
  if (field === 'setup.site') { if (d.site) state.siteId = d.site; state.recoveryPlan = undefined; state.padId = undefined; return; }
  if (field === 'setup.rendezvous') { state.rendezvous = undefined; return; }
  if (field === 'setup.satellite') {
    state.satelliteId = fallback.satelliteId;
    // a custom satellite must not outlive a reset to the fallback's, nor the fallback's be lost (D06)
    state.satelliteSpec = fallback.satelliteSpec ? clone(fallback.satelliteSpec) : undefined;
    state.payloadMass = payloadMassOf(fallback, fallback.payloadMass);
    return;
  }
  if (field === 'setup.payloadMass') {
    state.payloadMass = payloadMassOf(state, fallback.payloadMass);
    return;
  }
  if (['setup.orbit', 'setup.perigee', 'setup.apogee', 'setup.inclination', 'setup.argPerigee', 'setup.raanMode', 'setup.raan', 'setup.ltan'].includes(field)) {
    resetOrbit(state, fallback);
    return;
  }
  if (field === 'setup.launchTime') { state.launchTime = new Date(fallback.launchTime.getTime()); return; }
  if (field === 'setup.guidance') {
    const known = new Set(Object.values(GUIDANCE_FIELDS).map((f) => f.key as string));
    const g = state.guidanceOverrides as Record<string, unknown>;
    for (const key of Object.keys(g)) if (!known.has(key) && !vehicleGuidanceFigureValid(key, g[key])) delete g[key];
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

/**
 * A document in an older layout, brought to the current one. Version 1 is
 * version 2 without a custom vehicle: its `vehicleId` always names a catalogue
 * vehicle, so a `vehicleSpec` found in one was not written by Orbitlab and is
 * not read. Version 2 is version 3 without a custom satellite (D06), and a
 * `satelliteSpec` found in a version 1 or 2 file is not read either.
 */
function upgrade(doc: Record<string, unknown>): Record<string, unknown> {
  if (!isRecord(doc.mission) || typeof doc.version !== 'number' || doc.version >= MISSION_FORMAT_VERSION) return doc;
  const { vehicleSpec, satelliteSpec: _satellite, ...mission } = doc.mission;
  return { ...doc, mission: doc.version >= 2 && vehicleSpec !== undefined ? { ...mission, vehicleSpec } : mission };
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

export const MISSION_STORE_KEY = 'orbitlab.mission';

export function saveStoredMission(state: MissionState, store?: Pick<Storage, 'setItem'>): void {
  try { (store ?? workspaceStorage()).setItem(MISSION_STORE_KEY, JSON.stringify(missionDocument(state))); } catch { /* storage off or full */ }
}
