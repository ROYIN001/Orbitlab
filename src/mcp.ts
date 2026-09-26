/**
 * WebMCP tools: let a page-attached agent (a browser MCP client, e.g. an
 * assistant reading `navigator.modelContext` / `document.modelContext`)
 * drive the simulator through the same operations the mission-setup panel
 * and the playback controls expose, plus read back what is on screen.
 *
 * Split in two on purpose:
 *
 * - `createMcpTools(host)` builds the tool definitions and is pure and
 *   DOM-free: it only touches the `McpAppHost` surface (a structural subset
 *   of `App`, see below), so `tests/mcp.test.ts` exercises every handler
 *   — including the validation that mirrors `SetupPanel` — against a tiny
 *   fake with no `document`.
 * - `registerMcpTools(host)` is the thin, DOM-touching half: it looks for
 *   `navigator.modelContext` / `document.modelContext`, registers each tool
 *   and unregisters them on `pagehide`. Every step is wrapped so that a
 *   browser with no WebMCP support, or a host that throws, never breaks the
 *   app — this is the only thing `src/main.ts` calls at startup.
 *
 * `App` is never imported here (it would pull in every DOM-touching module
 * transitively and defeat the point of the split); instead `registerMcpTools`
 * is typed to accept anything with the same shape, which `App` already has.
 */
import type { FailureConfig, FailureMode, GuidanceParams, MissionConfig, OrbitSpec, RecoveryMode, RecoveryPlan, VehicleSpec } from './types';
import type { Simulation, SimEvent } from './physics/simulation';
import type { VisualFrame, StageFrame } from './physics/frame';
import type { CameraMode } from './render/cameras';
import type { Feasibility } from './ui/panel';
import { VEHICLES, vehicleById } from './data/vehicles';
import { SITES, siteById } from './data/sites';
import { SATELLITES, satelliteById } from './data/satellites';
import { ORBIT_PRESETS } from './data/orbits';
import { resolveTarget } from './physics/mission';
import { DEG, RAD } from './physics/constants';
import { FAILURE_MODES, GUIDANCE_FIELDS, NUMBER_FIELDS, fieldLimits, flightHomeCapable, guidanceLimits, numericIssue, issueText, parseUtcDateTime, assertConfigInput } from './config/validation';
import { LANDING_ZONES } from './data/landing-zones';
import { buildTelemetryCsv } from './ui/csv';
import { defaultDynamics } from './physics/rigid/config';
import { cloneRigidTelemetry } from './physics/rigid/telemetry';
import { FLEX_LIMITS } from './physics/rigid/flex';
import { aeroAngles, bodyRates, getNotation, simulatorRates } from './ui/notation';
import { loopLimiterNames, loopView } from './ui/loop-view';
import { linearModelAt, PLANE_OF, type LinearModel } from './physics/rigid/linear';
import { CONTROL_CHANNEL_KEYS, CONTROL_CHANNELS, CONTROL_LIMITS } from './physics/rigid/control-config';
import { AIDING_KEYS, AIDING_LIMITS, IMU_KEYS, NAV_GRADES } from './physics/nav/config';
import { IMU_LIMITS } from './physics/nav/sensors';
import { navigationAt, type NavigationRecord } from './physics/nav/navigation';
import { CONTROL_FAULT_KINDS, CONTROL_FAULT_PRESETS, FAULT_AXES, FAULT_FIELDS, FAULT_TIME_LIMITS, IMU_UNIT_COUNT, MAX_FAULTS, controlFaultProblems } from './physics/rigid/fault-config';
import type { ControlFaultRecord } from './physics/rigid/faults';
import { CYCLE_LIMITS, EXPLICIT_LAWS, type ExplicitGuidanceRecord } from './physics/explicit-guidance';
import { elementsFromState } from './physics/orbital';
import { ATTITUDE_TEST_LIMITS, attitudeTestAt, attitudeTestDuration, limiterShares, predictAttitudeTest, pulseMetrics, responseMismatch, type AttitudeTestRecord } from './physics/rigid/attitude-test';
import type { RigidTelemetry } from './physics/rigid/telemetry';
import { createLessonTools, type LessonToolsHost } from './lessons/mcp-tools';
import { MONTE_CARLO_RUNS, OUTPUT_KEYS, validMonteCarloConfig, type MonteCarloConfig, type OutputStats, type PointSummary } from './physics/monte-carlo';
import type { MonteCarloJob } from './physics/monte-carlo-job';
import { cloneDispersions, DISPERSION_KEYS, DISPERSION_SIGMA_LIMITS, type DispersionSettings } from './physics/dispersion';

/** configure_mission's `flex` fields (roadmap P05). */
const FLEX_KEYS = ['slosh', 'bending', 'notch', ...Object.keys(FLEX_LIMITS)];

// ─────────────────────────────────────────────────────────────── host shape

/** The subset of `SetupPanel.state` the tools read and write. Structurally
 *  identical to (but independent of) `SetupPanel`'s own private `SetupState`,
 *  so this file never imports the panel class — only its `Feasibility` type. */
interface McpPanelState {
  dynamics?: import('./types').DynamicsConfig;
  vehicleId: string;
  satelliteId: string;
  siteId: string;
  orbitId: string;
  orbit: OrbitSpec;
  launchTime: Date;
  guidanceOverrides: Partial<GuidanceParams>;
  failure: FailureConfig;
  boosterRecovery: boolean;
  recoveryPlan?: RecoveryPlan;
  payloadMass: number;
}

interface McpPanelHost {
  state: McpPanelState;
  /**
   * Sync the auto-tune signature to the current `state` and repaint. The
   * panel's own controls call `changed()` on every edit, which drops
   * `state.guidanceOverrides` the moment `missionSignature()` no longer
   * matches the signature the last auto-tune (or edit) was measured for
   * (`SetupPanel#changed`); a caller that writes `state` directly, as
   * `applyConfigureInput` below does, has to resync that signature itself or
   * the very next human edit through the panel silently clears whatever this
   * call just set. `render()` alone (the pre-fix behaviour) does not do this.
   * `siteReassigned` mirrors the one-shot flag the panel's own vehicle
   * dropdown sets when it forces a different launch site, so the verdict this
   * call returns still carries the amber "site was reassigned" warning when
   * this call performed the same reassignment. The flag is one-shot on the
   * panel's side (assigned, then cleared once the verdict below is computed),
   * so a later call that does not reassign the site never inherits it.
   */
  applyExternalEdit(opts?: { siteReassigned?: boolean }): Feasibility;
  getConfig(): MissionConfig;
  feasibility(): Feasibility;
}

interface McpRecorderHost {
  readonly events: readonly SimEvent[];
  readonly startTime: number;
  readonly headTime: number;
  recordNow(): VisualFrame;
}

interface McpPlayerHost {
  readonly live: boolean;
  readonly playing: boolean;
  readonly cursor: number;
  frame(): VisualFrame | null;
  lastEvent(t: number): SimEvent | null;
  nextEvent(t: number): SimEvent | null;
}

/**
 * Everything the WebMCP tools need from the app shell. `App` (`src/main.ts`)
 * satisfies this structurally — every member here is one of its existing
 * public fields or methods — so `registerMcpTools(app)` needs no change to
 * the class and no `implements` clause.
 */
export interface McpAppHost {
  readonly panel: McpPanelHost;
  readonly recorder: McpRecorderHost;
  readonly player: McpPlayerHost;
  sim: Simulation | null;
  camMode: CameraMode;
  /** the live simulation is advancing (meaningful while `player.live`) */
  playing: boolean;
  readonly warp: number;
  readonly replayWarp: number;
  getPerformance?(): Record<string, unknown>;
  setCamera(mode: CameraMode): void;
  togglePlay(): void;
  /** Set the time warp of whichever clock (`warp` or `replayWarp`) is currently
   *  active, keeping the on-screen warp selector and the `,`/`.` keyboard
   *  stepping in sync (`App.setWarp`) — writing `warp`/`replayWarp` directly
   *  leaves both stale. */
  setWarp(v: number): void;
  seek(time: number): void;
  goLive(): void;
  skip(): void;
  previousEvent(): void;
  preview(cfg: MissionConfig): void;
  launch(cfg: MissionConfig): void;
  /** E03: the lessons and the placement test, when the app has them */
  lessons?: LessonToolsHost;
  /** G05: the Monte Carlo set the window runs; absent, `run_monte_carlo` reports that none can run. */
  readonly monteCarlo?: McpMonteCarloHost;
}

/** G05: the app's Monte Carlo runner, as the window drives it. */
export interface McpMonteCarloHost {
  /** The window's current settings, which a start input is merged over. */
  settings(): MonteCarloConfig;
  /** Fly a set on the mission in the setup panel; a reason when it cannot start. */
  start(mc: MonteCarloConfig): MonteCarloJob | string;
  stop(): void;
  readonly job: MonteCarloJob | null;
}

// ───────────────────────────────────────────────────────────────── tool type

interface WebMcpAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface WebMcpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: WebMcpAnnotations;
  execute: (input: unknown) => unknown;
}

// ──────────────────────────────────────────────────────────────── constants

const CAMERA_MODES: CameraMode[] = ['exterior', 'onboard', 'space', 'map'];
const RAAN_MODES: OrbitSpec['raanMode'][] = ['free', 'fixed', 'iss', 'ltan'];
/** Mirrors the union in `src/types.ts` (`FailureMode`); not re-exported there. */
const PLAYBACK_ACTIONS = ['play', 'pause', 'warp', 'live', 'skip_next', 'skip_previous'] as const;
type PlaybackAction = (typeof PLAYBACK_ACTIONS)[number];

// ───────────────────────────────────────────────────────────── input helpers

function asRecord(input: unknown): Record<string, unknown> {
  return input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
}
function expectString(v: unknown, field: string): string {
  if (typeof v !== 'string' || v.length === 0) throw new Error(`"${field}" must be a non-empty string`);
  return v;
}
function expectNumber(v: unknown, field: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`"${field}" must be a finite number`);
  return v;
}

function parseGuidanceInput(raw: unknown, spec: VehicleSpec): Partial<GuidanceParams> {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('"guidance" must be an object');
  const out: Partial<GuidanceParams> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const def = GUIDANCE_FIELDS[k];
    if (!def) throw new Error(`Unknown guidance field "${k}". Valid fields: ${Object.keys(GUIDANCE_FIELDS).join(', ')}`);
    const num = expectNumber(v, `guidance.${k}`);
    const stored = num * def.scale;
    const { min: lo = -Infinity, max: hi = Infinity } = guidanceLimits(def.key, spec);
    if (!Number.isFinite(stored) || stored < lo || stored > hi) {
      throw new Error(`guidance.${k} must be between ${lo / def.scale} and ${hi / def.scale} (got ${num})`);
    }
    out[def.key] = stored;
  }
  return out;
}

function expectFieldNumber(value: unknown, field: string, labelKey: string, orbit?: Pick<OrbitSpec, 'suborbital'>): number {
  const num = expectNumber(value, field);
  const issue = numericIssue(num, field, fieldLimits(labelKey, orbit));
  if (issue) throw new Error(issueText(issue));
  return num;
}

const RECOVERY_KINDS: RecoveryMode['kind'][] = ['downrange', 'droneShip', 'landingZone', 'expended'];

function parseRecoveryMode(value: unknown, field: string): RecoveryMode {
  const m = asRecord(value);
  const kind = expectString(m.kind, `${field}.kind`);
  if (!RECOVERY_KINDS.includes(kind as RecoveryMode['kind'])) throw new Error(`"${field}.kind" must be one of ${RECOVERY_KINDS.join(', ')}`);
  if (kind === 'landingZone') {
    const zoneId = expectString(m.zoneId, `${field}.zoneId`);
    if (!LANDING_ZONES.some((z) => z.id === zoneId)) throw new Error(`Unknown landing zone "${zoneId}". Valid ids: ${LANDING_ZONES.map((z) => z.id).join(', ')}`);
    return { kind: 'landingZone', zoneId };
  }
  return { kind } as RecoveryMode;
}

function parseRecoveryPlan(value: unknown): RecoveryPlan {
  const p = asRecord(value);
  const plan: { core?: RecoveryMode; boosters?: RecoveryMode[] } = {};
  if (p.core !== undefined) plan.core = parseRecoveryMode(p.core, 'recoveryPlan.core');
  if (p.boosters !== undefined) {
    if (!Array.isArray(p.boosters)) throw new Error('"recoveryPlan.boosters" must be an array');
    plan.boosters = p.boosters.map((b, i) => parseRecoveryMode(b, `recoveryPlan.boosters[${i}]`));
  }
  return plan;
}

/** The inverse of `parseGuidanceInput`, for echoing a resolved config back. */
function guidanceToOutput(g: GuidanceParams): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, def] of Object.entries(GUIDANCE_FIELDS)) out[name] = g[def.key] / def.scale;
  return out;
}

/**
 * Apply the orbit-shaped fields of a `configure_mission` / `launch_mission`
 * input onto the panel state, exactly like the panel's own pill buttons and
 * number fields: picking a preset id replaces the orbit outright, and
 * touching any individual field (with or without a preset id first) turns it
 * into a "custom" orbit, per `SetupPanel.customise()`.
 */
function applyOrbitInput(state: McpPanelState, input: Record<string, unknown>): void {
  const customKeys = ['perigeeKm', 'apogeeKm', 'inclinationDeg', 'argPerigeeDeg', 'raanMode', 'raanDeg', 'ltanHours', 'suborbital'];
  const hasCustomFields = customKeys.some((k) => input[k] !== undefined);
  let orbit: OrbitSpec;
  let explicitCustom = false;
  if (input.orbitId !== undefined) {
    const id = expectString(input.orbitId, 'orbitId');
    if (id === 'custom') {
      // Matches the hasCustomFields branch below (and the panel's own
      // `customise()`): carrying over the previous preset's name/description
      // would paint "custom" with e.g. the ISS preset's description.
      const custom = ORBIT_PRESETS.find((o) => o.id === 'custom')!;
      orbit = { ...state.orbit, id: 'custom', name: custom.name, description: custom.description };
      explicitCustom = true;
    } else {
      const preset = ORBIT_PRESETS.find((o) => o.id === id);
      if (!preset) throw new Error(`Unknown orbitId "${id}". Valid ids: ${ORBIT_PRESETS.map((o) => o.id).join(', ')}`);
      orbit = { ...preset };
    }
  } else {
    orbit = { ...state.orbit };
  }
  if (hasCustomFields) {
    // First: a suborbital target changes what the perigee may be.
    if (input.suborbital !== undefined) {
      if (typeof input.suborbital !== 'boolean') throw new Error('"suborbital" must be a boolean');
      if (input.suborbital) orbit.suborbital = true;
      else delete orbit.suborbital;
    }
    if (input.perigeeKm !== undefined) orbit.perigee = expectFieldNumber(input.perigeeKm, 'perigeeKm', 'setup.perigee', orbit) * 1000;
    if (input.apogeeKm !== undefined) orbit.apogee = expectFieldNumber(input.apogeeKm, 'apogeeKm', 'setup.apogee') * 1000;
    if (input.inclinationDeg !== undefined) orbit.inclination = expectFieldNumber(input.inclinationDeg, 'inclinationDeg', 'setup.inclination');
    if (input.argPerigeeDeg !== undefined) {
      orbit.argPerigee = expectFieldNumber(input.argPerigeeDeg, 'argPerigeeDeg', 'setup.argPerigee');
    }
    if (input.raanMode !== undefined) {
      const m = expectString(input.raanMode, 'raanMode');
      if (!RAAN_MODES.includes(m as OrbitSpec['raanMode'])) throw new Error(`raanMode must be one of ${RAAN_MODES.join(', ')}`);
      orbit.raanMode = m as OrbitSpec['raanMode'];
    }
    if (input.raanDeg !== undefined) {
      orbit.raan = expectFieldNumber(input.raanDeg, 'raanDeg', 'setup.raan');
    }
    if (input.ltanHours !== undefined) orbit.ltan = expectFieldNumber(input.ltanHours, 'ltanHours', 'setup.ltan');
    if (orbit.perigee > orbit.apogee) {
      throw new Error(`Custom orbit perigee (${(orbit.perigee / 1000).toFixed(1)} km) must not exceed apogee (${(orbit.apogee / 1000).toFixed(1)} km)`);
    }
    if (!explicitCustom) {
      const custom = ORBIT_PRESETS.find((o) => o.id === 'custom')!;
      orbit = { ...orbit, id: 'custom', name: custom.name, description: custom.description };
    }
    state.orbitId = 'custom';
  } else if (input.orbitId !== undefined) {
    state.orbitId = input.orbitId as string;
  }
  state.orbit = orbit;
}

/**
 * Apply every recognised field of a configure/launch input onto the panel
 * state (validating as it goes, exactly like the panel's own controls) and
 * repaint it, so the mission-setup panel on screen reflects what the
 * MCP-driven agent just set. Returns notices for soft corrections (a vehicle
 * that does not fly from the previously selected site gets reassigned, the
 * same thing `SetupPanel` does when the operator picks it from the dropdown)
 * and the feasibility verdict for the edit that was just applied.
 *
 * Transactional: every field is validated and written onto a shallow copy of
 * `state` first, and `host.panel.state` is only touched once nothing below
 * has thrown. A field-by-field write straight onto the live state left a
 * throw part-way through (e.g. an explicit `siteId` the vehicle does not fly
 * from, rejected after the vehicle had already been written) with an
 * impossible vehicle/site pair applied and never repainted — `launch_mission`
 * would then fly it, since nothing else re-validates `host.panel.state`
 * before `getConfig()` reads it.
 */
function applyConfigureInput(host: McpAppHost, rawInput: unknown): { notices: string[]; feasibility: Feasibility } {
  const input = asRecord(rawInput);
  const live = host.panel.state;
  const state: McpPanelState = {
    ...live,
    orbit: { ...live.orbit },
    failure: { ...live.failure },
    guidanceOverrides: { ...live.guidanceOverrides },
  };
  const notices: string[] = [];
  // Mirrors `SetupPanel`'s own one-shot `siteReassigned` flag, so the
  // feasibility verdict returned alongside `notices` carries the same amber
  // "site was reassigned" warning the panel itself would show for this edit.
  let siteReassigned = false;

  if (input.vehicleId !== undefined) {
    const id = expectString(input.vehicleId, 'vehicleId');
    if (!VEHICLES.some((v) => v.id === id)) throw new Error(`Unknown vehicleId "${id}". Valid ids: ${VEHICLES.map((v) => v.id).join(', ')}`);
    if (id !== state.vehicleId || !state.dynamics) state.dynamics = defaultDynamics(id);
    state.vehicleId = id;
    const spec = vehicleById(id);
    // Skip the auto-reassignment (and its notice) when this same call also
    // gives an explicit siteId: the block below validates and applies that
    // choice, and a transient reassignment to the old vehicle's first site
    // would just be overwritten a few lines later.
    if (input.siteId === undefined && !spec.sites.includes(state.siteId)) {
      state.siteId = spec.sites[0];
      siteReassigned = true;
      notices.push(`Site reassigned to "${state.siteId}": ${spec.name} does not fly from the previously selected site.`);
    }
    if (!spec.recoverable) state.boosterRecovery = false;
    // a plan belongs to one vehicle at one site, as on the panel
    if (id !== live.vehicleId) state.recoveryPlan = undefined;
  }
  if (input.siteId !== undefined) {
    const id = expectString(input.siteId, 'siteId');
    if (!SITES.some((s) => s.id === id)) throw new Error(`Unknown siteId "${id}". Valid ids: ${SITES.map((s) => s.id).join(', ')}`);
    const spec = vehicleById(state.vehicleId);
    if (!spec.sites.includes(id)) throw new Error(`${spec.name} does not fly from "${id}". Valid sites for this vehicle: ${spec.sites.join(', ')}`);
    if (id !== live.siteId) state.recoveryPlan = undefined;
    state.siteId = id;
  }
  if (input.satelliteId !== undefined) {
    const id = expectString(input.satelliteId, 'satelliteId');
    if (!SATELLITES.some((s) => s.id === id)) throw new Error(`Unknown satelliteId "${id}". Valid ids: ${SATELLITES.map((s) => s.id).join(', ')}`);
    state.satelliteId = id;
    // Mirrors the panel's satellite handler: a new payload sets its own mass
    // unless this same call also gave an explicit payloadMassKg.
    if (input.payloadMassKg === undefined) state.payloadMass = satelliteById(id).mass;
  }
  applyOrbitInput(state, input);
  if (input.payloadMassKg !== undefined) {
    const v = expectFieldNumber(input.payloadMassKg, 'payloadMassKg', 'setup.payloadMass', state.orbit);
    state.payloadMass = v;
  }
  if (input.launchTimeIso !== undefined) {
    const s = expectString(input.launchTimeIso, 'launchTimeIso');
    const d = parseUtcDateTime(s, true);
    if (!d) throw new Error(`"launchTimeIso" ("${s}") is not a valid ISO 8601 date-time with a time zone`);
    state.launchTime = d;
  }
  if (input.boosterRecovery !== undefined) {
    if (typeof input.boosterRecovery !== 'boolean') throw new Error('"boosterRecovery" must be a boolean');
    const spec = vehicleById(state.vehicleId);
    if (input.boosterRecovery && !spec.recoverable) throw new Error(`${spec.name} has no first-stage recovery option`);
    state.boosterRecovery = input.boosterRecovery;
  }
  if (input.recoveryPlan !== undefined) {
    // null clears it; the plan itself is checked against the vehicle and the
    // site by `assertConfigInput` below
    state.recoveryPlan = input.recoveryPlan === null ? undefined : parseRecoveryPlan(input.recoveryPlan);
    if (state.recoveryPlan && !vehicleById(state.vehicleId).recoverable) {
      throw new Error(`${vehicleById(state.vehicleId).name} has no first-stage recovery option`);
    }
  }
  if (input.failureMode !== undefined) {
    const m = expectString(input.failureMode, 'failureMode');
    if (!(FAILURE_MODES as readonly string[]).includes(m as FailureMode)) throw new Error(`"failureMode" must be one of ${FAILURE_MODES.join(', ')}`);
    state.failure = { ...state.failure, mode: m as FailureMode };
  }
  if (input.failureTimeS !== undefined) {
    const v = expectNumber(input.failureTimeS, 'failureTimeS');
    // Same 0-2000 s band as the panel's own failure-time field (panel.ts's
    // `number('setup.failureTime', ..., 0, 2000)`).
    if (numericIssue(v, 'failureTimeS', NUMBER_FIELDS['setup.failureTime'])) throw new Error('"failureTimeS" must be between 0 and 2000');
    state.failure = { ...state.failure, time: v };
  }
  if (input.failureStageIndex !== undefined) {
    const spec = vehicleById(state.vehicleId);
    const v = expectNumber(input.failureStageIndex, 'failureStageIndex');
    if (!Number.isInteger(v) || v < 0 || v >= spec.stages.length) {
      throw new Error(`"failureStageIndex" must be an integer between 0 and ${spec.stages.length - 1} for ${spec.name}`);
    }
    state.failure = { ...state.failure, stage: v };
  }
  if (input.guidance !== undefined) {
    state.guidanceOverrides = { ...state.guidanceOverrides, ...parseGuidanceInput(input.guidance, vehicleById(state.vehicleId)) };
  }
  // --- P05: a vehicle, physics or wind edit keeps the flexible-body settings already chosen.
  const priorFlex = live.dynamics?.flex;
  if (input.physicsModel !== undefined || input.windScenario !== undefined || input.windSeed !== undefined) {
    const current = state.dynamics ?? { model:'pointMass', wind:'calm', seed:20260919 };
    state.dynamics = {
      model: (input.physicsModel ?? current.model) as import('./types').DynamicsConfig['model'],
      wind: (input.windScenario ?? current.wind) as import('./types').DynamicsConfig['wind'],
      seed: (input.windSeed ?? current.seed) as number,
    };
  }
  if (priorFlex && state.dynamics && !state.dynamics.flex) state.dynamics = { ...state.dynamics, flex: priorFlex };
  // --- E04: and the autopilot's tuning.
  const priorControl = live.dynamics?.control;
  if (priorControl && state.dynamics && !state.dynamics.control) state.dynamics = { ...state.dynamics, control: priorControl };
  // --- G02: and the navigation.
  const priorNavigation = live.dynamics?.navigation;
  if (priorNavigation && state.dynamics && !state.dynamics.navigation) state.dynamics = { ...state.dynamics, navigation: priorNavigation };
  if (input.navigation !== undefined) {
    const { navigation: previous, ...rest } = state.dynamics ?? defaultDynamics(state.vehicleId);
    state.dynamics = { ...rest, ...mergeNavigation(previous, input.navigation) };
  }
  // --- G01: and the explicit guidance.
  const priorExplicit = live.dynamics?.explicitGuidance;
  if (priorExplicit && state.dynamics && !state.dynamics.explicitGuidance) state.dynamics = { ...state.dynamics, explicitGuidance: priorExplicit };
  if (input.explicitGuidance !== undefined) {
    const { explicitGuidance: previous, ...rest } = state.dynamics ?? defaultDynamics(state.vehicleId);
    state.dynamics = { ...rest, ...mergeExplicitGuidance(previous, input.explicitGuidance) };
  }
  // --- G08: and the failures.
  const priorFaults = live.dynamics?.controlFaults;
  if (priorFaults && state.dynamics && !state.dynamics.controlFaults) state.dynamics = { ...state.dynamics, controlFaults: priorFaults };
  if (input.controlFaults !== undefined) {
    const { controlFaults: previous, ...rest } = state.dynamics ?? defaultDynamics(state.vehicleId);
    state.dynamics = { ...rest, ...mergeControlFaults(previous, input.controlFaults) };
  }
  if (input.control !== undefined) {
    const { control: _, ...rest } = state.dynamics ?? defaultDynamics(state.vehicleId);
    state.dynamics = { ...rest, ...mergeControl(state.dynamics?.control, input.control) };
  }
  if (input.flex !== undefined) {
    // Merged into what is set: a field given as null goes back to its default.
    if (!input.flex || typeof input.flex !== 'object' || Array.isArray(input.flex)) throw new Error('"flex" must be an object');
    const current = state.dynamics ?? defaultDynamics(state.vehicleId);
    const flex: Record<string, unknown> = { ...(current.flex ?? {}) };
    for (const [key, value] of Object.entries(input.flex as Record<string, unknown>)) {
      if (!FLEX_KEYS.includes(key)) throw new Error(`Unknown flex field "${key}"`);
      if (value === null) delete flex[key]; else flex[key] = value;
    }
    state.dynamics = { ...current, flex: flex as import('./types').FlexConfig };
  }
  assertConfigInput(state);
  // Every validator above has run without throwing: commit the whole edit at
  // once, so a throw earlier in this function never leaves a partial write on
  // the state the rest of the app treats as the current mission.
  Object.assign(live, state);
  const feasibility = host.panel.applyExternalEdit({ siteReassigned });
  return { notices, feasibility };
}

function summarizeConfig(cfg: MissionConfig): Record<string, unknown> {
  const site = siteById(cfg.siteId);
  const target = resolveTarget(cfg.orbit, site, cfg.launchTime);
  return {
    vehicleId: cfg.vehicleId,
    satelliteId: cfg.satelliteId,
    siteId: cfg.siteId,
    payloadMassKg: cfg.payloadMassOverride ?? null,
    launchTimeIso: cfg.launchTime.toISOString(),
    orbit: {
      id: cfg.orbit.id,
      perigeeKm: cfg.orbit.perigee / 1000,
      apogeeKm: cfg.orbit.apogee / 1000,
      inclinationInput: cfg.orbit.inclination,
      resolvedInclinationDeg: target.inclination * RAD,
      argPerigeeDeg: cfg.orbit.argPerigee,
      raanMode: cfg.orbit.raanMode,
      suborbital: !!cfg.orbit.suborbital,
    },
    boosterRecovery: cfg.boosterRecovery,
    recoveryPlan: cfg.recoveryPlan ? structuredClone(cfg.recoveryPlan) : null,
    dynamics: cfg.dynamics ? { ...cfg.dynamics } : { model:'pointMass', wind:'calm', seed:20260919 },
    failure: { mode: cfg.failure.mode, timeS: cfg.failure.time, stageIndex: cfg.failure.stage },
    guidance: guidanceToOutput(cfg.guidance),
  };
}

/** A stage or booster group's display name, from the frame's own `id` — no
 *  UI/i18n dependency, since these tools speak plain English identifiers. */
function stageDisplayName(vehicleSpec: VehicleSpec, sf: StageFrame): string {
  const spec = vehicleSpec.stages.find((s) => s.id === sf.id);
  if (spec) return spec.name;
  return sf.isSpacecraft ? 'Spacecraft propulsion' : sf.id;
}

function frameSummary(frame: VisualFrame, vehicleSpec: VehicleSpec): Record<string, unknown> {
  const sf = frame.stages[frame.activeStageIndex] as StageFrame | undefined;
  return {
    timeS: frame.t,
    status: frame.status,
    ascentPhase: frame.ascentPhase,
    descentPhase: frame.descentPhase ?? null,
    noteKey: frame.note,
    liftoff: frame.liftoff,
    destroyed: frame.destroyed,
    fairingAttached: frame.fairingAttached,
    payloadSeparated: frame.payloadSeparated,
    // Same immutable recording data the user sees, including replay cursor.
    // Quaternion/rates use the documented SI/body-frame conventions.
    rigid: cloneRigidTelemetry(frame.rigid) ?? null,
    // U07: the same rates and α, β in the two standards' body axes and signs.
    flightDynamics: frame.rigid ? flightDynamics(frame.rigid) : null,
    detachedBodies: frame.debris.map(body => ({ id: body.id, name: body.name, outcome: body.outcome ?? null,
      rigid: cloneRigidTelemetry(body.rigid) ?? null })),
    altitudeKm: frame.altitude / 1000,
    altitudeAglKm: frame.altitudeAGL / 1000,
    speedMs: frame.speed,
    airspeedMs: frame.airspeed,
    verticalSpeedMs: frame.vz,
    mach: frame.mach,
    dynamicPressurePa: frame.q,
    gLoad: frame.gLoad,
    apoapsisKm: frame.elements.apoapsisAlt / 1000,
    periapsisKm: frame.elements.periapsisAlt / 1000,
    inclinationDeg: frame.elements.i * RAD,
    periodS: Number.isFinite(frame.elements.period) ? frame.elements.period : null,
    latitudeDeg: frame.lat,
    longitudeDeg: frame.lon,
    downrangeKm: frame.downrange / 1000,
    dvRemainingMs: frame.dvRemaining,
    nextScheduledBurnInS: frame.nextBurnTime > frame.t ? frame.nextBurnTime - frame.t : null,
    dvBudgetMs: {
      thrust: frame.losses.dvThrust, gravity: frame.losses.gravity, drag: frame.losses.drag, steering: frame.losses.steering,
    },
    stage: sf ? {
      index: frame.activeStageIndex,
      ofStages: frame.stages.length,
      id: sf.id,
      name: stageDisplayName(vehicleSpec, sf),
      isSpacecraft: sf.isSpacecraft,
      attached: sf.attached,
      burning: sf.burning,
      propellantFraction: sf.propellantFraction,
    } : null,
  };
}

/** Body rates (deg/s) and aerodynamic angles (deg) in ISO 1151 and ГОСТ 20058-80 axes. */
function flightDynamics(rigid: RigidTelemetry): Record<string, unknown> {
  const iso = bodyRates(rigid.omegaBody, 'iso'), gost = bodyRates(rigid.omegaBody, 'gost');
  const angles = aeroAngles(rigid.angleOfAttack, rigid.sideslip);
  return {
    notation: getNotation(),
    iso: { pDegS: iso.roll * RAD, qDegS: iso.pitch * RAD, rDegS: iso.yaw * RAD },
    gost: { omegaXDegS: gost.roll * RAD, omegaYDegS: gost.yaw * RAD, omegaZDegS: gost.pitch * RAD },
    alphaDeg: angles.alpha * RAD, betaDeg: angles.beta * RAD,
    // G03: the attitude loop at this step, in ISO 1151 axes (as set_flight_control takes them).
    attitudeLoop: attitudeLoopSummary(rigid),
  };
}

/** What the autopilot decided at this step (roadmap G03), in ISO axes: roll about x, pitch about y, yaw about z. */
function attitudeLoopSummary(rigid: RigidTelemetry): Record<string, unknown> | null {
  const view = loopView(rigid, 'iso');
  if (!view) return null;
  return {
    mode: view.mode,
    attitudeErrorDeg: view.errorDeg ?? null, rateCommandDegS: view.commandDegS, rateMeasuredDegS: view.measuredDegS,
    rateSensedDegS: view.sensedDegS, angularAccelerationDegS2: view.accelerationDegS2,
    gains: { attitudePerS: view.gains.attitude, ratePerS: view.gains.rate, maxRateDegS: view.gains.maxRateDegS,
      maxAngularAccelerationDegS2: view.gains.maxAccelerationDegS2 },
    momentKNm: { demand: view.momentKNm.demand, filtered: view.momentKNm.filtered ?? null, engines: view.momentKNm.engines,
      jets: view.momentKNm.jets, aero: view.momentKNm.aero, unmet: view.momentKNm.unmet },
    unmetSignificant: view.unmetSignificant, limiters: loopLimiterNames(view),
    gimbalUsePct: view.gimbalUsePct, rcsDutyPct: view.rcsDutyPct, loadReliefDeg: view.loadReliefDeg ?? null,
  };
}

/** The loop's stability margins per plane (roadmap G04), from the latest linearisation at or before the cursor. */
function loopMarginsSummary(model: LinearModel | undefined): Record<string, unknown> | null {
  if (!model) return null;
  const plane = (axis: keyof typeof PLANE_OF) => {
    const m = model.margins[PLANE_OF[axis]], p = model.planes[PLANE_OF[axis]];
    return { actuator: p.actuator, states: p.states, stable: m.active ? m.stable : null, leastDampedGrowthPerS: m.growthRate, leastDampedRadS: m.growthFrequency,
      phaseMarginDeg: m.pmDeg ?? null, crossoverRadS: m.wcRadS ?? null, gainMarginDb: m.gmDb ?? null, gainMarginRadS: m.wgRadS ?? null,
      lowGainMarginDb: m.gmLowDb ?? null, openLoopUnstablePoles: m.openLoopUnstable };
  };
  return { linearisedAtS: model.t, controlStepS: model.T, roll: plane('roll'), pitch: plane('pitch'), yaw: plane('yaw') };
}

function eventOut(e: SimEvent): Record<string, unknown> {
  return { timeS: e.t, key: e.key, severity: e.severity, params: e.params ?? {} };
}

function playbackState(host: McpAppHost): Record<string, unknown> {
  const live = host.player.live;
  return {
    mode: live ? 'live' : 'replay',
    playing: live ? host.playing : host.player.playing,
    warp: live ? host.warp : host.replayWarp,
    cursorTimeS: host.player.cursor,
    headTimeS: host.recorder.headTime,
    startTimeS: host.recorder.startTime,
  };
}

// ──────────────────────────────────────────────────────────── input schemas

const CONFIG_PROPERTIES: Record<string, unknown> = {
  vehicleId: { type: 'string', enum: VEHICLES.map((v) => v.id), description: 'Launch vehicle id.' },
  siteId: { type: 'string', enum: SITES.map((s) => s.id), description: 'Launch site id; must be one the vehicle flies from (see list_missions).' },
  satelliteId: { type: 'string', enum: SATELLITES.map((s) => s.id), description: 'Payload id. Sets payloadMassKg to its typical mass unless payloadMassKg is also given.' },
  orbitId: { type: 'string', enum: [...ORBIT_PRESETS.map((o) => o.id)], description: 'Orbit preset id, or "custom" together with the fields below.' },
  perigeeKm: { type: 'number', minimum: -1000, description: 'Custom orbit perigee altitude, km: at least 100 for an orbit, between -1000 and 0 for a suborbital flight. Setting this (or any other custom field) switches the orbit to "custom".' },
  suborbital: { type: 'boolean', description: 'A suborbital test flight (Starship only): the ship is cut off short of orbit on a path whose perigee is below the ground, and flies itself home to a splashdown, as on Flight 5 (perigee -15 km, apogee 213 km, 26.2°). Switches the orbit to "custom".' },
  apogeeKm: { type: 'number', minimum: 100, description: 'Custom orbit apogee altitude, km.' },
  inclinationDeg: { type: 'number', minimum: 0, maximum: 180, description: 'Custom orbit inclination, deg.' },
  argPerigeeDeg: { type: 'number', minimum: 0, maximum: 360, description: 'Custom orbit argument of perigee, deg.' },
  raanMode: { type: 'string', enum: RAAN_MODES, description: 'How the ascending node is targeted: free, a fixed RAAN, the ISS plane, or a local time of ascending node.' },
  raanDeg: { type: 'number', minimum: 0, maximum: 360, description: 'Fixed RAAN, deg (raanMode "fixed").' },
  ltanHours: { type: 'number', minimum: 0, maximum: 24, description: 'Local time of ascending node, hours (raanMode "ltan").' },
  payloadMassKg: { type: 'number', minimum: 0, description: 'Payload mass, kg: at least 1, or 0 on a suborbital flight.' },
  launchTimeIso: { type: 'string', description: 'Launch epoch, ISO 8601 UTC, e.g. "2026-09-20T12:00:00Z".' },
  boosterRecovery: { type: 'boolean', description: 'Reserve first-stage propellant for recovery (only for vehicles that support it).' },
  recoveryPlan: {
    type: ['object', 'null'],
    description: 'Where each recovered stage flies with boosterRecovery on (null clears it: every stage lands downrange where it comes down). '
      + '"core" is the first stage or the core; "boosters" are the strap-ons in separation order. Each is {kind:"downrange"}, {kind:"droneShip"} (needs legs), '
      + '{kind:"landingZone", zoneId} (a zone of the launch site: a pad needs legs, a tower catches a stage without them) or {kind:"expended"}; '
      + 'a stage the plan leaves out is expended. See list_missions for the landing zones.',
    properties: {
      core: { type: 'object', properties: { kind: { type: 'string', enum: RECOVERY_KINDS }, zoneId: { type: 'string', enum: LANDING_ZONES.map((z) => z.id) } }, required: ['kind'] },
      boosters: { type: 'array', items: { type: 'object', properties: { kind: { type: 'string', enum: RECOVERY_KINDS }, zoneId: { type: 'string', enum: LANDING_ZONES.map((z) => z.id) } }, required: ['kind'] } },
    },
    additionalProperties: false,
  },
  physicsModel: { type:'string', enum:['pointMass','sixDof'], description:'Six-DOF is available for every vehicle and is its default; pointMass is the legacy model.' },
  windScenario: { type:'string', enum:['calm','crosswind','shear'], description:'Repeatable wind scenario for six-DOF.' },
  windSeed: { type:'integer', minimum:0, maximum:4294967295, description:'Seed for repeatable six-DOF wind gusts.' },
  flex: {
    type: 'object',
    description: 'Six-DOF flexible body (all off by default; off, the flight is the rigid one): propellant slosh, the first bending mode (with shell loads and break-up past their allowable stress), and the bending notch filter with the flexible-vehicle autopilot. Merged into the current settings; null resets a field.',
    properties: {
      slosh: { type: ['boolean', 'null'], description: 'First-mode slosh of every liquid tank under thrust.' },
      bending: { type: ['boolean', 'null'], description: 'First lateral bending mode; the IMU reads the bent structure.' },
      notch: { type: ['boolean', 'null'], description: 'Notch filter on the pitch/yaw torque, centred on the predicted bending frequency, and the autopilot held below it.' },
      imuStation: { type: ['number', 'null'], minimum: FLEX_LIMITS.imuStation[0], maximum: FLEX_LIMITS.imuStation[1], description: 'IMU station as a fraction of the stack from its aft end; null = the instrument bay atop the upper stage.' },
      notchZetaZero: { type: ['number', 'null'], minimum: FLEX_LIMITS.notchZetaZero[0], maximum: FLEX_LIMITS.notchZetaZero[1], description: 'Notch numerator damping ratio (depth = ζz/ζp).' },
      notchZetaPole: { type: ['number', 'null'], minimum: FLEX_LIMITS.notchZetaPole[0], maximum: FLEX_LIMITS.notchZetaPole[1], description: 'Notch denominator damping ratio (width).' },
      notchFrequencyScale: { type: ['number', 'null'], minimum: FLEX_LIMITS.notchFrequencyScale[0], maximum: FLEX_LIMITS.notchFrequencyScale[1], description: 'Notch centre as a multiple of the predicted bending frequency (1 = tuned).' },
      bandwidthRatio: { type: ['number', 'null'], minimum: FLEX_LIMITS.bandwidthRatio[0], maximum: FLEX_LIMITS.bandwidthRatio[1], description: 'With the filter on, the autopilot rate gain is held below the bending frequency divided by this.' },
      sloshDamping: { type: ['number', 'null'], minimum: FLEX_LIMITS.sloshDamping[0], maximum: FLEX_LIMITS.sloshDamping[1], description: 'Slosh damping ratio (baffles).' },
      bendingDamping: { type: ['number', 'null'], minimum: FLEX_LIMITS.bendingDamping[0], maximum: FLEX_LIMITS.bendingDamping[1], description: 'Structural damping ratio of the bending mode.' },
    },
    additionalProperties: false,
  },
  control: {
    type: 'object',
    description: 'Six-DOF attitude autopilot tuning (roadmap E04; absent, the default autopilot). Per channel (roll; pitchYaw, the pitch–yaw pair): K_θ attitudeGain and K_ω rateGain in 1/s, the rate limit maxRateDegS and the angular-acceleration ceiling maxAccelerationDegS2; and feedForward, the weight of the aerodynamic feed-forward (0–1). Pitch–yaw gains set here are flown as set, without the flexible-vehicle cap. Merged into the current settings; null resets a field, a channel or (control: null) all of it.',
    properties: {
      ...Object.fromEntries(CONTROL_CHANNELS.map((channel) => [channel, { type: ['object', 'null'], properties: Object.fromEntries(CONTROL_CHANNEL_KEYS.map((key) =>
        [key, { type: ['number', 'null'], minimum: CONTROL_LIMITS[key][0], maximum: CONTROL_LIMITS[key][1] }])), additionalProperties: false }])),
      feedForward: { type: ['number', 'null'], minimum: CONTROL_LIMITS.feedForward[0], maximum: CONTROL_LIMITS.feedForward[1] },
    },
    additionalProperties: false,
  },
  navigation: {
    type: ['object', 'null'],
    description: 'Six-DOF inertial navigation (roadmap G02; absent or null, the flight knows its true state): an IMU of a grade (navigation, tactical, mems; custom takes the imu figures over tactical) with a 21-state error-state Kalman filter aided by GNSS (with one outage) and a star tracker; the autopilot, ascent guidance and the cut-off fly on its estimate. Merged into the current settings; null resets a field, or (navigation: null) turns it off.',
    properties: {
      grade: { type: ['string', 'null'], enum: [...NAV_GRADES, null] },
      imu: { type: ['object', 'null'], properties: Object.fromEntries(IMU_KEYS.map((key) => [key, { type: ['number', 'null'], minimum: IMU_LIMITS[key][0], maximum: IMU_LIMITS[key][1] }])), additionalProperties: false,
        description: 'Gyro bias deg/h, bias instability deg/h, angle random walk deg/√h, scale factor ppm; accelerometer bias µg, instability µg, velocity random walk m/s/√h, scale factor ppm; pad alignment deg (1σ).' },
      gnss: { type: ['boolean', 'null'] },
      ...Object.fromEntries(AIDING_KEYS.map((key) => [key, { type: ['number', 'null'], minimum: AIDING_LIMITS[key][0], maximum: AIDING_LIMITS[key][1] }])),
      gnssOutage: { type: ['array', 'null'], items: { type: 'number', minimum: 0 }, minItems: 2, maxItems: 2, description: 'Mission seconds [start, end) without GNSS fixes.' },
      starTracker: { type: ['boolean', 'null'] },
      seed: { type: ['integer', 'null'], minimum: 0, maximum: 4294967295 },
    },
    additionalProperties: false,
  },
  controlFaults: {
    type: ['object', 'null'],
    description: `Six-DOF failures of the control system (roadmap G08; absent or null, nothing fails): up to ${MAX_FAULTS} failures, each striking at its mission time (and not before its stage flies), and the FDIR (IMU voting 2-of-3, the gimbal monitor with engine-out steering, RCS jet isolation, the backup computer), off unless fdir is true. A preset replaces the list with an accident's: ${Object.entries(CONTROL_FAULT_PRESETS).map(([k, p]) => `${k} (${p.vehicleId})`).join(', ')} — set vehicleId to its vehicle. Given fields replace the current ones; null resets a field.`,
    properties: {
      faults: { type: ['array', 'null'], maxItems: MAX_FAULTS, items: faultSchema(true) },
      fdir: { type: ['boolean', 'null'] },
      preset: { type: ['string', 'null'], enum: [...Object.keys(CONTROL_FAULT_PRESETS), null] },
      seed: { type: ['integer', 'null'], minimum: 0, maximum: 4294967295 },
    },
    additionalProperties: false,
  },
  explicitGuidance: {
    type: ['object', 'null'],
    description: 'Explicit ascent guidance (roadmap G01; absent or null, the standard ascent guidance): "peg" (the Space Shuttle\'s Powered Explicit Guidance, a predictor–corrector on the velocity to be gained) or "igm" (the Saturn V\'s Iterative Guidance Mode, closed form in the terminal frame). The first stage flies the pitch program; the law takes over once a later stage is lit or the first is out of the atmosphere (q < 100 Pa above 70 km), and steers to the insertion orbit\'s perigee — altitude, speed, flight-path angle and plane. In six-DOF it also releases the load relief smoothly. Given fields replace the current ones; null resets a field.',
    properties: {
      law: { type: 'string', enum: EXPLICIT_LAWS },
      cycleS: { type: ['number', 'null'], minimum: CYCLE_LIMITS[0], maximum: CYCLE_LIMITS[1], description: 'Guidance cycle, s (default 1).' },
    },
    additionalProperties: false,
  },
  failureMode: { type: 'string', enum: FAILURE_MODES, description: 'Inject a failure scenario; "none" disarms it. "launchAbort" fires a crewed Soyuz\'s escape system at failureTimeS; "padFire" (before liftoff, failureTimeS down to -10), "boosterCollision" (at the strap-ons\' separation) and "stagingFailure" (at the separation of failureStage) are the failures of Soyuz T-10-1, MS-10 and 18a, and on a crewed Soyuz set its escape off.' },
  failureTimeS: { type: 'number', minimum: 0, maximum: 2000, description: 'Mission time the failure is injected, s.' },
  failureStageIndex: { type: 'integer', minimum: 0, description: 'Stage index the failure affects (0-based).' },
  guidance: {
    type: 'object',
    description: "Overrides on top of the vehicle's own guidance program.",
    properties: Object.fromEntries(Object.entries(GUIDANCE_FIELDS).map(([name, def]) => [
      name, { type: 'number', minimum: def.range[0] / def.scale, maximum: def.range[1] / def.scale },
    ])),
    additionalProperties: false,
  },
};

// ─────────────────────────────────────────────────────────────────── tools

function toolReadFlightState(host: McpAppHost): WebMcpTool {
  return {
    name: 'read_flight_state',
    title: 'Read flight state',
    description: 'Current playback cursor (live or replay), the mission and the telemetry of the frame on screen, plus the surrounding events. Safe with no mission configured.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    execute: () => {
      if (!host.sim) return { hasMission: false, camera: host.camMode };
      // `recordNow()`, not `recorder.head`: `head` is only the last *stored*
      // frame, and the store cadence is as sparse as 30 s in coast/orbit
      // (`FlightRecorder`'s `interval()`), so it can lag the live simulation
      // by tens of seconds — an internally inconsistent result for a tool
      // whose own description promises "the frame on screen" (review major
      // #3: measured a 25 s cursorTimeS/frame.timeS split and ~190 km of
      // along-track error). `recordNow()` is exactly what the render loop
      // itself draws every tick (`App`'s render loop, `src/main.ts`): a fresh
      // capture that only pays for a copy on the tick a store was due
      // anyway, so this stays cheap despite `readOnlyHint: true`. It only
      // ever *appends* to the recording when the cadence was already about to
      // fire on its own — it does not create staleness or drift by being
      // called from here.
      const frame = host.player.live
        ? host.recorder.recordNow()
        : (host.player.frame() ?? host.recorder.recordNow());
      const cursor = host.player.cursor;
      const last = host.player.lastEvent(cursor);
      const next = host.player.nextEvent(cursor);
      return {
        hasMission: true,
        ...playbackState(host),
        camera: host.camMode,
        performance: host.getPerformance?.() ?? null,
        vehicle: { id: host.sim.vehicleSpec.id, name: host.sim.vehicleSpec.name },
        site: { id: host.sim.site.id, name: host.sim.site.name },
        satellite: { id: host.sim.satellite.id, name: host.sim.satellite.name },
        frame: frameSummary(frame, host.sim.vehicleSpec),
        // G04: the linearised attitude loop's margins at the cursor (6-DOF only).
        loopMargins: loopMarginsSummary(linearModelAt(host.sim.telemetry, cursor)),
        // E04: the latest attitude test at or before the cursor.
        attitudeTest: attitudeTestSummary(attitudeTestAt(host.sim.telemetry, cursor)),
        // G02: what the navigation believes, at the cursor.
        navigation: navigationSummary(navigationAt(host.sim.telemetry, cursor)),
        // G01: the explicit ascent guidance, at the cursor.
        explicitGuidance: explicitGuidanceSummary(host.sim.telemetry, cursor),
        // G08: the failures struck and the FDIR's state, at the cursor.
        controlFaults: controlFaultsSummary(host.sim.telemetry, cursor),
        lastEvent: last ? eventOut(last) : null,
        nextEvent: next ? eventOut(next) : null,
      };
    },
  };
}

function toolListMissions(): WebMcpTool {
  return {
    name: 'list_missions',
    title: 'List available missions',
    description: 'Every vehicle, launch site, payload and orbit preset configure_mission and launch_mission accept, with the numbers needed to pick a feasible combination.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    execute: () => ({
      vehicles: VEHICLES.map((v) => ({
        id: v.id, name: v.name, country: v.country, manufacturer: v.manufacturer,
        sites: v.sites, stageCount: v.stages.length,
        payloadLeoKg: v.payloadLEO, payloadGtoKg: v.payloadGTO, payloadSsoKg: v.payloadSSO ?? null,
        recoverable: !!v.recoverable, crewCapable: !!v.crewCapable, suborbitalCapable: flightHomeCapable(v),
      })),
      landingZones: LANDING_ZONES.map((z) => ({
        id: z.id, name: z.name, kind: z.kind, siteIds: z.siteIds, latitudeDeg: z.latitude, longitudeDeg: z.longitude,
      })),
      sites: SITES.map((s) => ({
        id: s.id, name: s.name, country: s.country, latitudeDeg: s.latitude, longitudeDeg: s.longitude,
        minInclinationDeg: s.minInclination, maxInclinationDeg: s.maxInclination,
      })),
      satellites: SATELLITES.map((s) => ({
        id: s.id, name: s.name, massKg: s.mass, typicalOrbit: s.typicalOrbit, crewed: !!s.crewed,
      })),
      orbitPresets: ORBIT_PRESETS.map((o) => ({
        id: o.id, name: o.name, perigeeKm: o.perigee / 1000, apogeeKm: o.apogee / 1000,
        inclination: o.inclination, raanMode: o.raanMode, description: o.description,
      })),
      failureModes: FAILURE_MODES,
      cameraModes: CAMERA_MODES,
    }),
  };
}

function toolConfigureMission(host: McpAppHost): WebMcpTool {
  return {
    name: 'configure_mission',
    title: 'Configure mission',
    description: 'Set up a mission (vehicle, site, payload, orbit, launch time, guidance overrides) the same way the setup panel does, and preview it paused on the pad. Every field is optional and defaults to what is already configured. Throws on an invalid input (unknown id, a site the vehicle does not fly from, out-of-range guidance, a malformed date). A mission that is valid but infeasible (over-capacity payload, an unreachable inclination, …) is not rejected: it is applied and previewed just as it would be if a person set the same values on the panel, and the result reports ok:true with the verdict in `feasibility` — check `feasibility.level` before assuming the mission will fly. Does not launch.',
    inputSchema: { type: 'object', properties: CONFIG_PROPERTIES, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    execute: (rawInput: unknown) => {
      // `feasibility` is the verdict `applyExternalEdit` computed while its
      // one-shot `siteReassigned` flag was still set for this edit; reading
      // `host.panel.feasibility()` again here would see the flag already
      // cleared (review major #1).
      const { notices, feasibility } = applyConfigureInput(host, rawInput);
      const cfg = host.panel.getConfig();
      host.preview(cfg);
      return { ok: true, notices, feasibility, config: summarizeConfig(cfg) };
    },
  };
}

function toolLaunchMission(host: McpAppHost): WebMcpTool {
  return {
    name: 'launch_mission',
    title: 'Launch mission',
    description: 'Launch the mission: with no arguments, launches whatever is currently configured (identical to pressing Launch); with arguments, configures it first — same validation as configure_mission — then launches.',
    inputSchema: { type: 'object', properties: CONFIG_PROPERTIES, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    execute: (rawInput: unknown) => {
      const input = asRecord(rawInput);
      if (Object.keys(input).length === 0) assertConfigInput(host.panel.state);
      const { notices, feasibility } = Object.keys(input).length > 0
        ? applyConfigureInput(host, rawInput)
        : { notices: [] as string[], feasibility: host.panel.feasibility() };
      const cfg = host.panel.getConfig();
      host.launch(cfg);
      return { ok: true, notices, feasibility, config: summarizeConfig(cfg), mode: 'live', playing: true };
    },
  };
}

function ensurePlaying(host: McpAppHost, want: boolean): void {
  const current = host.player.live ? host.playing : host.player.playing;
  if (current !== want) host.togglePlay();
}

function toolControlPlayback(host: McpAppHost): WebMcpTool {
  return {
    name: 'control_playback',
    title: 'Control playback',
    description: 'Play, pause, change the time warp, jump back to the live flight, or skip to the next/previous event. "play"/"pause" act on the live flight while at the recording head and on the replay cursor while scrubbing, exactly like the space bar. No-op (ok: false) when no mission is configured.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: PLAYBACK_ACTIONS, description: 'The control to apply.' },
        warp: { type: 'number', exclusiveMinimum: 0, description: 'Time warp factor; required (and only used) when action is "warp".' },
      },
      required: ['action'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    execute: (rawInput: unknown) => {
      const input = asRecord(rawInput);
      const action = input.action;
      if (typeof action !== 'string' || !(PLAYBACK_ACTIONS as readonly string[]).includes(action)) {
        throw new Error(`"action" must be one of ${PLAYBACK_ACTIONS.join(', ')}`);
      }
      if (!host.sim) return { ok: false, reason: 'No active mission: configure or launch one first.' };
      switch (action as PlaybackAction) {
        case 'play': ensurePlaying(host, true); break;
        case 'pause': ensurePlaying(host, false); break;
        case 'live': host.goLive(); break;
        case 'skip_next': host.skip(); break;
        case 'skip_previous': host.previousEvent(); break;
        case 'warp': {
          const w = expectNumber(input.warp, 'warp');
          if (w <= 0) throw new Error('"warp" must be a positive number for action "warp"');
          // 50000x is the app's own top preset (`WARPS` in main.ts); clamping
          // to it, not further, keeps this in the range the rest of the UI
          // actually supports. `host.setWarp` (not a direct field write) is
          // what keeps the on-screen warp selector and the `,`/`.` keyboard
          // step in sync with whatever this sets.
          host.setWarp(Math.min(50000, w));
          break;
        }
      }
      return { ok: true, ...playbackState(host) };
    },
  };
}

function toolSeek(host: McpAppHost): WebMcpTool {
  return {
    name: 'seek',
    title: 'Seek the timeline',
    description: 'Move the playback cursor to a mission time, in seconds after liftoff (negative during the count-down). Seeking behind the recording head enters replay; seeking to or past the head returns to live. No-op (ok: false) when no mission is configured.',
    inputSchema: {
      type: 'object',
      properties: { timeS: { type: 'number', description: 'Target mission time, s.' } },
      required: ['timeS'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    execute: (rawInput: unknown) => {
      const input = asRecord(rawInput);
      const timeS = expectNumber(input.timeS, 'timeS');
      if (!host.sim) return { ok: false, reason: 'No active mission: configure or launch one first.' };
      host.seek(timeS);
      return { ok: true, ...playbackState(host) };
    },
  };
}

function toolSetCamera(host: McpAppHost): WebMcpTool {
  return {
    name: 'set_camera',
    title: 'Set camera view',
    description: 'Switch the viewport between the exterior chase camera, the onboard/crew view, the space view, and the 2-D orbital map.',
    inputSchema: {
      type: 'object',
      properties: { mode: { type: 'string', enum: CAMERA_MODES } },
      required: ['mode'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    execute: (rawInput: unknown) => {
      const input = asRecord(rawInput);
      const mode = input.mode;
      if (typeof mode !== 'string' || !(CAMERA_MODES as readonly string[]).includes(mode)) {
        throw new Error(`"mode" must be one of ${CAMERA_MODES.join(', ')}`);
      }
      host.setCamera(mode as CameraMode);
      return { ok: true, camera: host.camMode };
    },
  };
}

function toolGetEvents(host: McpAppHost): WebMcpTool {
  return {
    name: 'get_events',
    title: 'Get flight events',
    description: 'The recorded event log (staging, max Q, burns, failures, …) with their mission times, optionally filtered to those at or after sinceS and capped to limit entries.',
    inputSchema: {
      type: 'object',
      properties: {
        sinceS: { type: 'number', description: 'Only events at or after this mission time, s.' },
        limit: { type: 'integer', minimum: 1, description: 'Maximum number of events to return.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    execute: (rawInput: unknown) => {
      if (!host.sim) return { hasMission: false, events: [] };
      const input = asRecord(rawInput);
      const sinceS = input.sinceS !== undefined ? expectNumber(input.sinceS, 'sinceS') : -Infinity;
      let limit: number | undefined;
      if (input.limit !== undefined) {
        const v = expectNumber(input.limit, 'limit');
        if (!Number.isInteger(v) || v < 1) throw new Error('"limit" must be a positive integer');
        limit = v;
      }
      let events = host.recorder.events.filter((e) => e.t >= sinceS).map(eventOut);
      const totalCount = events.length;
      if (limit !== undefined) events = events.slice(0, limit);
      return { hasMission: true, count: events.length, totalCount, events };
    },
  };
}

function toolExportCsv(host: McpAppHost): WebMcpTool {
  return {
    name: 'export_csv',
    title: 'Export flight data as CSV',
    description: 'The whole recorded flight (telemetry samples and events) as CSV text, in the same format the telemetry panel downloads.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    execute: () => {
      if (!host.sim) return { ok: false, reason: 'No active mission: nothing recorded yet.' };
      const sim = host.sim;
      return { ok: true, filename: `orbitlab_${sim.vehicleSpec.id}_${sim.cfg.orbit.id}.csv`, csv: buildTelemetryCsv(sim) };
    },
  };
}

function toolSetFlightControl(host: McpAppHost): WebMcpTool {
  return {
    name: 'set_flight_control', title: 'Set live flight controls',
    description: 'Set automatic guidance or manual body roll/pitch/yaw rate commands and throttle for a live 6DOF mission. Rates are degrees per second in ISO 1151 body axes: roll p positive right side down, pitch q positive nose up, yaw r positive nose right (x to the nose, y to the right, z to the belly). Commands act through finite actuators and do not directly set attitude. Replay is read-only.',
    inputSchema: { type: 'object', properties: {
      mode: { type: 'string', enum: ['auto', 'manual'] },
      rollRateDegS: { type: 'number', minimum: -5, maximum: 5 },
      pitchRateDegS: { type: 'number', minimum: -5, maximum: 5 },
      yawRateDegS: { type: 'number', minimum: -5, maximum: 5 },
      throttle: { type: 'number', minimum: 0, maximum: 1 },
    }, required: ['mode'], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    execute: raw => {
      const input = asRecord(raw), mode = input.mode;
      if (mode !== 'auto' && mode !== 'manual') throw new Error('"mode" must be "auto" or "manual".');
      const rate = (name: string) => {
        const value = input[name] === undefined ? 0 : expectNumber(input[name], name);
        if (value < -5 || value > 5) throw new Error(`"${name}" must be between -5 and 5 degrees per second.`);
        return value * DEG;
      };
      // ISO 1151 body axes (src/ui/notation.ts), whatever the interface shows.
      const iso = { roll: rate('rollRateDegS'), pitch: rate('pitchRateDegS'), yaw: rate('yawRateDegS') };
      const rates = simulatorRates(iso, 'iso');
      const throttle = input.throttle === undefined ? 1 : expectNumber(input.throttle, 'throttle');
      if (throttle < 0 || throttle > 1) throw new Error('"throttle" must be between 0 and 1.');
      if (!host.sim || host.sim.cfg.dynamics?.model !== 'sixDof') return { ok: false, reason: 'An active 6DOF mission is required.' };
      if (!host.player.live) return { ok: false, reason: 'Replay cannot change live flight controls. Return to live first.' };
      host.sim.setRigidCommand({ mode, rates, throttle });
      return { ok: true, mode, ratesRadS: { p: iso.roll, q: iso.pitch, r: iso.yaw }, throttle };
    },
  };
}

/** E04: configure_mission's `control`, merged field by field into the current tuning (null resets). */
function mergeControl(current: import('./types').ControlConfig | undefined, input: unknown): { control?: import('./types').ControlConfig } {
  if (input === null) return {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('"control" must be an object or null');
  const next: Record<string, unknown> = { ...(current ?? {}) };
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (key === 'feedForward') { if (value === null) delete next.feedForward; else next.feedForward = value; continue; }
    if (!(CONTROL_CHANNELS as readonly string[]).includes(key)) throw new Error(`Unknown control field "${key}"`);
    if (value === null) { delete next[key]; continue; }
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`"control.${key}" must be an object or null`);
    const channel: Record<string, unknown> = { ...((next[key] as Record<string, unknown> | undefined) ?? {}) };
    for (const [field, v] of Object.entries(value as Record<string, unknown>)) {
      if (!(CONTROL_CHANNEL_KEYS as readonly string[]).includes(field)) throw new Error(`Unknown control field "${key}.${field}"`);
      if (v === null) delete channel[field]; else channel[field] = v;
    }
    if (Object.keys(channel).length) next[key] = channel; else delete next[key];
  }
  return Object.keys(next).length ? { control: next as import('./types').ControlConfig } : {};
}

/** G02: configure_mission's `navigation`, merged field by field (null resets a field; `navigation: null` turns it off). */
function mergeNavigation(current: import('./types').NavigationConfig | undefined, input: unknown): { navigation?: import('./types').NavigationConfig } {
  if (input === null) return {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('"navigation" must be an object or null');
  const next: Record<string, unknown> = { ...(current ?? {}) };
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (key === 'imu') {
      if (value === null) { delete next.imu; continue; }
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('"navigation.imu" must be an object or null');
      const imu: Record<string, unknown> = { ...((next.imu as Record<string, unknown> | undefined) ?? {}) };
      for (const [field, v] of Object.entries(value as Record<string, unknown>)) {
        if (!(IMU_KEYS as string[]).includes(field)) throw new Error(`Unknown navigation field "imu.${field}"`);
        if (v === null) delete imu[field]; else imu[field] = v;
      }
      if (Object.keys(imu).length) next.imu = imu; else delete next.imu;
      continue;
    }
    if (!['grade', 'gnss', 'starTracker', 'gnssOutage', 'seed', ...AIDING_KEYS].includes(key)) throw new Error(`Unknown navigation field "${key}"`);
    if (value === null) delete next[key]; else next[key] = value;
  }
  return { navigation: next as import('./types').NavigationConfig };
}

/**
 * G08: one failure's JSON schema. Engines, jets and IMU units count from 1; the axis is ISO 1151's.
 * `time` is required in a mission's list, and defaults to now for a live injection.
 */
function faultSchema(timeRequired: boolean): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: CONTROL_FAULT_KINDS, description: Object.entries(FAULT_FIELDS).map(([k, f]) => `${k}${f.length ? ` (${f.join(', ')})` : ''}`).join('; ') },
      time: { type: 'number', minimum: FAULT_TIME_LIMITS[0], maximum: FAULT_TIME_LIMITS[1], description: 'Mission time it strikes, s.' },
      stage: { type: 'integer', minimum: 0, maximum: 9, description: 'Not before this stage (0-based) flies.' },
      engine: { oneOf: [{ type: 'integer', minimum: 1, maximum: 64 }, { const: 'all' }], description: 'Engine of the flying stage (1-based) or "all".' },
      jet: { oneOf: [{ type: 'integer', minimum: 1, maximum: 64 }, { const: 'all' }], description: 'RCS jet of the flying stage (1-based) or "all".' },
      units: { oneOf: [{ type: 'array', items: { type: 'integer', minimum: 1, maximum: IMU_UNIT_COUNT }, minItems: 1, maxItems: IMU_UNIT_COUNT }, { const: 'all' }],
        description: 'IMU units struck (1–3), or "all" for a common-mode failure; default [1].' },
      axis: { type: 'string', enum: FAULT_AXES, description: 'ISO 1151 body axis; absent, every axis.' },
      sign: { type: 'integer', enum: [1, -1], description: 'gimbalHardover: which stop.' },
      magnitude: { type: 'number', description: 'gyroBias deg/s; gyroNoise deg/s 1σ; accelBias mg; gimbalSlow the fraction of the rate left (0–1); computerHold s.' },
    },
    required: timeRequired ? ['kind', 'time'] : ['kind'],
    additionalProperties: false,
  };
}

/** G08: configure_mission's `controlFaults` (null turns them off; a preset replaces the list; null resets a field). */
function mergeControlFaults(current: import('./types').ControlFaultsConfig | undefined, input: unknown): { controlFaults?: import('./types').ControlFaultsConfig } {
  if (input === null) return {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('"controlFaults" must be an object or null');
  const next: Record<string, unknown> = { faults: [], ...(current ?? {}) };
  const given = input as Record<string, unknown>;
  for (const [key, value] of Object.entries(given)) {
    if (!['faults', 'fdir', 'preset', 'seed'].includes(key)) throw new Error(`Unknown controlFaults field "${key}"`);
    if (value === null) { if (key === 'faults') next.faults = []; else delete next[key]; continue; }
    next[key] = value;
  }
  if (typeof given.preset === 'string') {
    const preset = CONTROL_FAULT_PRESETS[given.preset];
    if (!preset) throw new Error(`Unknown controlFaults preset "${given.preset}"`);
    if (given.faults === undefined) next.faults = preset.faults.map((f) => ({ ...f }));
  } else if (given.faults !== undefined) delete next.preset;
  return { controlFaults: next as unknown as import('./types').ControlFaultsConfig };
}

/** G01: configure_mission's `explicitGuidance` (null turns it off; null resets a field). */
function mergeExplicitGuidance(current: import('./types').ExplicitGuidanceConfig | undefined, input: unknown): { explicitGuidance?: import('./types').ExplicitGuidanceConfig } {
  if (input === null) return {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('"explicitGuidance" must be an object or null');
  const next: Record<string, unknown> = { ...(current ?? {}) };
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (key !== 'law' && key !== 'cycleS') throw new Error(`Unknown explicitGuidance field "${key}"`);
    if (value === null) delete next[key]; else next[key] = value;
  }
  if (next.law === undefined) throw new Error('"explicitGuidance.law" is required ("peg" or "igm")');
  return { explicitGuidance: next as unknown as import('./types').ExplicitGuidanceConfig };
}

/** G01: the explicit guidance at the cursor (during the ascent). */
function explicitGuidanceSummary(samples: readonly { t: number; explicitGuidance?: ExplicitGuidanceRecord }[], cursor: number): Record<string, unknown> | null {
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].t > cursor + 1e-9) continue;
    const g = samples[i].explicitGuidance;
    if (!g) return null;
    const km = (m: number | undefined) => (m === undefined ? null : m / 1000);
    return { law: g.law, status: g.status, timeToGoS: g.tGo ?? null, velocityToGainMs: g.vGo ?? null,
      predictedCutoff: { periapsisKm: km(g.predictedPeriapsis), apoapsisKm: km(g.predictedApoapsis) },
      target: { periapsisKm: km(g.targetPeriapsis), apoapsisKm: km(g.targetApoapsis) },
      correctionMs: g.miss ?? null, pitchDeg: g.pitchDeg ?? null, yawOutOfPlaneDeg: g.yawDeg ?? null, standardPitchDeg: g.standardPitchDeg, stagesPlanned: g.stages };
  }
  return null;
}

/** G08: the failures and the FDIR at the cursor. */
function controlFaultsSummary(samples: readonly { t: number; rigid?: { controlFaults?: ControlFaultRecord } }[], cursor: number): Record<string, unknown> | null {
  let record: ControlFaultRecord | undefined;
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].t > cursor + 1e-9) continue;
    record = samples[i].rigid?.controlFaults;
    break;
  }
  if (!record) return null;
  const deg = (v: { x: number; y: number; z: number } | undefined) => (v ? { x: v.x * RAD, y: v.y * RAD, z: v.z * RAD } : null);
  return { fdir: record.fdir, struck: record.active, imuUnits: record.units, imuInUse: record.selected, openLoop: record.openLoop,
    computer: record.computer, engines: record.engines, jets: record.jets,
    sensedRateDegSBody: deg(record.sensedRateBody), trueRateDegSBody: deg(record.trueRateBody), sensorAttitudeErrorDegBody: deg(record.sensorAttitudeErrorBody) };
}

function toolInjectControlFault(host: McpAppHost): WebMcpTool {
  return {
    name: 'inject_control_fault', title: 'Inject a control-system failure in flight',
    description: 'Roadmap G08: strike the live six-DOF flight with a failure of its control system — an actuator (gimbalStuck, gimbalHardover, gimbalSlow, actuatorPolarity, rcsStuckOn, rcsFailedOff), a sensor (rateInverted, gyroStuck, gyroBias, gyroNoise, imuFailure; accelBias, gnssLoss and starTrackerLoss need navigation) or the flight computer (computerHold, gainSign) — now, or at `time` if later. fdir switches the FDIR (IMU voting, the gimbal monitor, jet isolation, the backup computer); a flight that carries no failures yet has it off unless set. Events and read_flight_state.controlFaults show what happens. It changes the flight.',
    inputSchema: { ...faultSchema(false), properties: { ...(faultSchema(false).properties as Record<string, unknown>), fdir: { type: 'boolean' } } },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    execute: raw => {
      const { fdir, ...input } = asRecord(raw);
      if (fdir !== undefined && typeof fdir !== 'boolean') throw new Error('"fdir" must be a boolean.');
      if (!host.sim || host.sim.cfg.dynamics?.model !== 'sixDof') return { ok: false, reason: 'An active 6DOF mission is required.' };
      if (!host.player.live) return { ok: false, reason: 'Replay cannot change the flight. Return to live first.' };
      const spec = { ...input, time: input.time ?? host.sim.state.t } as import('./types').ControlFaultSpec;
      const problems = controlFaultProblems(spec, { navigation: !!host.sim.rigidRuntime?.navigation });
      if (problems.length) throw new Error(`Invalid failure: ${problems.map((p) => `${p.field.replace('setup.faults.', '')}=${JSON.stringify(p.value)}`).join(', ')}`);
      const result = host.sim.injectControlFault(spec, fdir as boolean | undefined);
      return result === 'injected' ? { ok: true, strikesAtS: Math.max(spec.time, host.sim.state.t) } : { ok: false, reason: result };
    },
  };
}

/** G02: the navigation at the cursor: errors against the filter's 3σ (radial, along-track, cross-track; body axes), and the orbit it believes in. */
function navigationSummary(record: NavigationRecord | undefined): Record<string, unknown> | null {
  if (!record) return null;
  const rsw = (v: { x: number; y: number; z: number }) => ({ radial: v.x, alongTrack: v.y, crossTrack: v.z });
  const body = (v: { x: number; y: number; z: number }, k: number) => ({ x: v.x * k, y: v.y * k, z: v.z * k });
  const el = elementsFromState(record.r, record.v);
  return { timeS: record.t, gnss: record.gnss, starTracker: record.starTracker,
    positionErrorM: rsw(record.positionError), position3SigmaM: rsw(body(record.positionSigma, 3)),
    velocityErrorMs: rsw(record.velocityError), velocity3SigmaMs: rsw(body(record.velocitySigma, 3)),
    attitudeErrorDegBody: body(record.attitudeError, RAD), attitude3SigmaDegBody: body(record.attitudeSigma, 3 * RAD),
    believedApoapsisKm: el.apoapsisAlt / 1000, believedPeriapsisKm: el.periapsisAlt / 1000,
    innovation: { positionM: record.innovation.position ?? null, velocityMs: record.innovation.velocity ?? null,
      attitudeArcsec: record.innovation.attitude === undefined ? null : record.innovation.attitude * RAD * 3600 } };
}

/** E04: the latest attitude test at or before the cursor, measured against the linear prediction, in ISO axes. */
function attitudeTestSummary(record: AttitudeTestRecord | undefined): Record<string, unknown> | null {
  if (!record) return null;
  const { spec } = record, iso = spec.axis === 'x' ? { axis: 'roll', sign: spec.sign } : spec.axis === 'z' ? { axis: 'pitch', sign: -spec.sign } : { axis: 'yaw', sign: spec.sign };
  const measured = pulseMetrics(record.t, record.response, spec), prediction = predictAttitudeTest(record);
  const predicted = prediction ? pulseMetrics(prediction.t, prediction.response, spec) : null;
  return { axis: iso.axis, kind: spec.kind, amplitudeDeg: iso.sign * spec.amplitudeRad * RAD, holdS: spec.holdS, startS: record.startS,
    durationS: attitudeTestDuration(spec), recordedS: record.progressS ?? (record.t.length ? record.t[record.t.length - 1] : 0), done: record.done, aborted: record.aborted ?? null,
    measured: { riseS: measured.riseS ?? null, overshootPct: measured.overshootPct, peakOverAmplitude: measured.peak },
    predicted: predicted ? { riseS: predicted.riseS ?? null, overshootPct: predicted.overshootPct, peakOverAmplitude: predicted.peak, linearisedAtS: record.model!.t } : null,
    rmsMismatchOverAmplitude: prediction ? responseMismatch(record.response, prediction.response, spec.amplitudeRad) : null,
    limiterShare: limiterShares(record) };
}

function toolRunAttitudeTest(host: McpAppHost): WebMcpTool {
  return {
    name: 'run_attitude_test', title: 'Run an attitude test in flight',
    description: 'Roadmap E04: add a step or a doublet to the six-DOF autopilot\'s attitude target about one body axis of the live flight, and record the response against what the linearised loop predicts (read it with read_flight_state.attitudeTest). ISO 1151 axes: roll positive right side down, pitch positive nose up, yaw positive nose right. Needs a live six-DOF flight under the autopilot; one test at a time. It changes the flight.',
    inputSchema: { type: 'object', properties: {
      axis: { type: 'string', enum: ['roll', 'pitch', 'yaw'] },
      kind: { type: 'string', enum: ['step', 'doublet'] },
      amplitudeDeg: { type: 'number', minimum: -ATTITUDE_TEST_LIMITS.amplitudeDeg[1], maximum: ATTITUDE_TEST_LIMITS.amplitudeDeg[1], description: 'Offset of the first pulse, deg; at least 0.1 in size.' },
      holdS: { type: 'number', minimum: ATTITUDE_TEST_LIMITS.holdS[0], maximum: ATTITUDE_TEST_LIMITS.holdS[1], description: 'Step: how long it is held; doublet: each half, s.' },
    }, required: ['axis', 'kind', 'amplitudeDeg', 'holdS'], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    execute: raw => {
      const input = asRecord(raw), axis = input.axis, kind = input.kind;
      if (axis !== 'roll' && axis !== 'pitch' && axis !== 'yaw') throw new Error('"axis" must be "roll", "pitch" or "yaw".');
      if (kind !== 'step' && kind !== 'doublet') throw new Error('"kind" must be "step" or "doublet".');
      const amplitude = expectNumber(input.amplitudeDeg, 'amplitudeDeg'), hold = expectNumber(input.holdS, 'holdS');
      const [aMin, aMax] = ATTITUDE_TEST_LIMITS.amplitudeDeg, [hMin, hMax] = ATTITUDE_TEST_LIMITS.holdS;
      if (Math.abs(amplitude) < aMin || Math.abs(amplitude) > aMax) throw new Error(`"amplitudeDeg" must be between ${aMin} and ${aMax} degrees in size.`);
      if (hold < hMin || hold > hMax) throw new Error(`"holdS" must be between ${hMin} and ${hMax} s.`);
      if (!host.sim || host.sim.cfg.dynamics?.model !== 'sixDof') return { ok: false, reason: 'An active 6DOF mission is required.' };
      if (!host.player.live) return { ok: false, reason: 'Replay cannot change the flight. Return to live first.' };
      // ISO axes to the simulator's: pitch q about −z, yaw r about +y.
      const sim = axis === 'roll' ? { axis: 'x' as const, sign: 1 } : axis === 'pitch' ? { axis: 'z' as const, sign: -1 } : { axis: 'y' as const, sign: 1 };
      const sign = (Math.sign(amplitude) * sim.sign) as 1 | -1;
      const result = host.sim.startAttitudeTest({ axis: sim.axis, sign, kind, amplitudeRad: Math.abs(amplitude) * DEG, holdS: hold });
      if (typeof result === 'string') return { ok: false, reason: result };
      // In a worker session the record comes back on the telemetry; the model is the latest linearisation.
      return { ok: true, startS: result.startS, durationS: attitudeTestDuration(result.spec),
        linearisedAtS: (result.model ?? linearModelAt(host.sim.telemetry, result.startS))?.t ?? null };
    },
  };
}

// --- G05 ---
/** A dispersions input merged over `base`: each quantity's `enabled` and `sigma`, checked against its limits. */
function mergeDispersions(base: DispersionSettings, raw: unknown): DispersionSettings {
  if (raw === undefined) return base;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('"dispersions" must be an object.');
  const out = cloneDispersions(base);
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!(DISPERSION_KEYS as readonly string[]).includes(key)) throw new Error(`Unknown dispersion "${key}". Valid: ${DISPERSION_KEYS.join(', ')}.`);
    const k = key as keyof DispersionSettings, v = asRecord(value), [lo, hi] = DISPERSION_SIGMA_LIMITS[k];
    if (Object.keys(v).some((f) => f !== 'enabled' && f !== 'sigma')) throw new Error(`"dispersions.${key}" takes "enabled" and "sigma" only.`);
    if (v.enabled !== undefined && typeof v.enabled !== 'boolean') throw new Error(`"dispersions.${key}.enabled" must be a boolean.`);
    if (v.sigma !== undefined) {
      const sigma = expectNumber(v.sigma, `dispersions.${key}.sigma`);
      if (sigma < lo || sigma > hi) throw new Error(`"dispersions.${key}.sigma" must be between ${lo} and ${hi}.`);
      out[k].sigma = sigma;
    }
    if (v.enabled !== undefined) out[k].enabled = v.enabled as boolean;
  }
  return out;
}

function roundStats(s: OutputStats, digits: number): Record<string, number | null> {
  const r = (x: number | undefined) => (x === undefined || !Number.isFinite(x) ? null : +x.toFixed(digits));
  return { n: s.n, mean: r(s.mean), sigma: r(s.sigma), threeSigma: r(3 * s.sigma), min: r(s.min), max: r(s.max), ...(s.bias !== undefined ? { bias: r(s.bias) } : {}) };
}

/** A law's runs read at one point: statistics, the 3σ ellipse and the shares. */
function pointStatus(p: PointSummary): Record<string, unknown> {
  const digits: Record<string, number> = { perigeeKm: 3, apogeeKm: 3, inclinationDeg: 4, dvLeft: 1 };
  return {
    runs: p.n,
    stats: Object.fromEntries(OUTPUT_KEYS.map((k) => [k, roundStats(p.stats[k], digits[k])])),
    ellipse3SigmaKm: p.ellipse ? { perigeeKm: +p.ellipse.cx.toFixed(3), apogeeKm: +p.ellipse.cy.toFixed(3), semiMajorKm: +p.ellipse.a.toFixed(3),
      semiMinorKm: +p.ellipse.b.toFixed(3), angleDeg: +(p.ellipse.angle * RAD).toFixed(1) } : null,
    sensitivity: Object.fromEntries(OUTPUT_KEYS.map((k) => {
      const sens = p.sensitivity[k];
      return [k, sens.ok ? { shares: Object.fromEntries(Object.entries(sens.shares).map(([q, v]) => [q, +(v ?? 0).toFixed(3)])),
        other: +sens.other.toFixed(3), rSquared: +sens.rSquared.toFixed(3) } : null];
    })),
  };
}

/** The state of the app's Monte Carlo set, with its statistics per guidance law at the end of the mission and at the ascent's cut-off. */
function monteCarloStatus(job: MonteCarloJob | null, includeCsv: boolean): Record<string, unknown> {
  if (!job) return { ok: true, state: 'none' };
  const progress = job.progress(), summary = job.summary();
  return {
    ok: true, state: job.state, done: progress.done, total: progress.total, etaS: progress.etaS === null ? null : Math.round(progress.etaS),
    workers: job.workerCount, vehicleId: job.cfg.vehicleId, runs: job.mc.runs, seed: job.mc.seed, compareLaws: job.mc.compareLaws,
    dispersions: job.mc.dispersions, targets: summary.targets,
    laws: summary.laws.map((l) => ({
      law: l.law, runs: l.runs, inserted: l.inserted, short: l.short, lost: l.lost, onTarget: l.onTarget, lostReasons: l.reasons,
      final: pointStatus(l.points.final), cutoff: pointStatus(l.points.cutoff),
    })),
    ...(includeCsv ? { csv: job.csv() } : {}),
  };
}

function toolRunMonteCarlo(host: McpAppHost): WebMcpTool {
  const dispersionSchema = { type: 'object', additionalProperties: false, properties: Object.fromEntries(DISPERSION_KEYS.map((k) => [k, {
    type: 'object', additionalProperties: false, properties: { enabled: { type: 'boolean' },
      sigma: { type: 'number', minimum: DISPERSION_SIGMA_LIMITS[k][0], maximum: DISPERSION_SIGMA_LIMITS[k][1] } } }])) };
  return {
    name: 'run_monte_carlo', title: 'Monte Carlo insertion accuracy',
    description: 'Roadmap G05: fly the mission in the setup panel many times in six-DOF, each run with its thrust, Isp, propellant and dry mass (per stage and strap-on group), air density and wind dispersed and — with the inertial navigation — a fresh IMU realisation, to the end of the mission, reading its orbit there (after every planned burn: what the payload is delivered to) and at the end of the powered ascent (the ascent guidance\'s accuracy). '
      + 'action "start" starts a set (runs 20–2000, seed, compareLaws flies the standard law, PEG and IGM on the same draws, dispersions as {quantity: {enabled, sigma}} over the window\'s settings: sigma in % for thrust, isp, propellant, dryMass and density, m/s per horizontal axis for wind; the imu has none). '
      + 'Runs take tens of seconds each, spread over the machine\'s cores: "status" reads the progress and, per law, how many runs reached orbit and their target, how many were lost and why, and at both points (final: against the target orbit; cutoff: against the planned insertion) perigee, apogee, inclination and Δv left as mean, σ, 3σ and bias, the 3σ perigee–apogee ellipse, and each dispersion\'s share of each element\'s variance; includeCsv adds every run as CSV. "stop" ends the set.',
    inputSchema: { type: 'object', properties: {
      action: { type: 'string', enum: ['start', 'status', 'stop'] },
      runs: { type: 'integer', minimum: MONTE_CARLO_RUNS.min, maximum: MONTE_CARLO_RUNS.max },
      seed: { type: 'integer', minimum: 0, maximum: 4294967295 },
      compareLaws: { type: 'boolean' },
      dispersions: dispersionSchema,
      includeCsv: { type: 'boolean' },
    }, required: ['action'], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    execute: raw => {
      const input = asRecord(raw), action = input.action, mc = host.monteCarlo;
      if (action !== 'start' && action !== 'status' && action !== 'stop') throw new Error('"action" must be "start", "status" or "stop".');
      if (input.includeCsv !== undefined && typeof input.includeCsv !== 'boolean') throw new Error('"includeCsv" must be a boolean.');
      if (!mc) return { ok: false, reason: 'This page has no Monte Carlo runner.' };
      if (action === 'status') return monteCarloStatus(mc.job, input.includeCsv === true);
      if (action === 'stop') { mc.stop(); return monteCarloStatus(mc.job, false); }
      const base = mc.settings();
      const config: MonteCarloConfig = {
        runs: input.runs === undefined ? base.runs : expectNumber(input.runs, 'runs'),
        seed: input.seed === undefined ? base.seed : expectNumber(input.seed, 'seed'),
        compareLaws: input.compareLaws === undefined ? base.compareLaws : input.compareLaws as boolean,
        dispersions: mergeDispersions(base.dispersions, input.dispersions),
      };
      if (typeof config.compareLaws !== 'boolean') throw new Error('"compareLaws" must be a boolean.');
      if (!validMonteCarloConfig(config)) throw new Error(`"runs" must be an integer from ${MONTE_CARLO_RUNS.min} to ${MONTE_CARLO_RUNS.max}, "seed" an integer from 0 to 4294967295.`);
      const started = mc.start(config);
      if (typeof started === 'string') return { ok: false, reason: started };
      return { ...monteCarloStatus(started, false), started: true };
    },
  };
}

/** Build the tool definitions against `host`. Pure and DOM-free. */
export function createMcpTools(host: McpAppHost): WebMcpTool[] {
  return [
    toolReadFlightState(host),
    toolListMissions(),
    toolConfigureMission(host),
    toolLaunchMission(host),
    toolControlPlayback(host),
    toolSetFlightControl(host),
    toolSeek(host),
    toolSetCamera(host),
    toolGetEvents(host),
    toolExportCsv(host),
    toolRunAttitudeTest(host),
    toolInjectControlFault(host),
    ...(host.lessons ? createLessonTools(host.lessons) : []), // E03
    toolRunMonteCarlo(host),
  ];
}

// ───────────────────────────────────────────────────────────── registration

interface ModelContext {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => unknown;
}

/**
 * Register the WebMCP tools against `navigator.modelContext` or
 * `document.modelContext`, whichever a browser-hosted MCP client provides
 * (the Codex sibling used `document.modelContext`; the API has since moved
 * toward `navigator.modelContext`, so both are tried). Entirely optional:
 * every failure is swallowed, so a browser with no WebMCP support, a host
 * whose `registerTool` throws, or a single tool that fails to register never
 * breaks the app. Tools are unregistered on `pagehide`.
 */
export function registerMcpTools(host: McpAppHost): void {
  try {
    const nav = typeof navigator !== 'undefined' ? (navigator as unknown as { modelContext?: ModelContext }) : undefined;
    const doc = typeof document !== 'undefined' ? (document as unknown as { modelContext?: ModelContext }) : undefined;
    const modelContext = nav?.modelContext ?? doc?.modelContext;
    if (!modelContext || typeof modelContext.registerTool !== 'function') return;
    const lifecycle = new AbortController();
    for (const tool of createMcpTools(host)) {
      try {
        Promise.resolve(modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => { /* registration rejected: leave the app running without this tool */ });
      } catch { /* registerTool threw synchronously: same */ }
    }
    if (typeof window !== 'undefined') window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  } catch {
    /* WebMCP is entirely optional; nothing here may break the app */
  }
}
