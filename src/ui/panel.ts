/**
 * Mission setup panel: vehicle and site, payload, target orbit and launch
 * time, then guidance, failure injection and options in collapsible sections.
 * Keeps its own state and produces a `MissionConfig` on demand.
 *
 * Two things that are not merely cosmetic:
 *
 * - **The guidance shown is the guidance flown.** `DEFAULT_GUIDANCE` is the
 *   library baseline; every vehicle overrides part of it through
 *   `guidanceDefaults`, and `Simulation` merges those in. Displaying the
 *   baseline while flying the merge is how the panel came to show a 2.5° kick
 *   for a Falcon 9 that flies 1.5°. The panel now resolves
 *   `guidanceForVehicle(spec)` and layers the operator's own edits on top of
 *   it, and hands the result back with `guidanceResolved: true` so the
 *   simulation flies exactly what was on screen.
 * - **A pre-flight feasibility verdict** (audit B12) in the status note above
 *   the Launch button. It is derived from data — the vehicle's rated payload
 *   for the orbit class, the site's reachable inclinations, the mission plan —
 *   because a full mission takes tens of milliseconds per keystroke and
 *   `runAscent` is not a sound oracle for "will this succeed" (it stops at the
 *   parking orbit, so it reports success for missions that later fall short and
 *   failure for missions whose coast outlives its horizon).
 *
 *   The one exception is **`probeInsertion`**, and it is an exception because
 *   stopping at the parking orbit is precisely the question it is asked: *is
 *   there a parking orbit?* No static budget can answer that for a stack whose
 *   orbit is made by a kick stage — it turns on the ascent losses, the one term
 *   only a flight measures — and the budget's answer was wrong in both
 *   directions when it was tried (see `probeInsertion`). The probe therefore
 *   runs only for a configuration the static budget already calls marginal, is
 *   cached per configuration, and can only make the verdict worse, never
 *   better.
 */
import type { MissionConfig, OrbitSpec, GuidanceParams, FailureConfig, FailureMode, SatelliteSpec, VehicleSpec, RecoveryMode, RecoveryPlan } from '../types';
import { ALL_VEHICLES, HISTORICAL_VEHICLES, RATING_ORBITS, VEHICLES, missionVehicle, openTopVehicle, vehicleById, vehicleDataId } from '../data/vehicles';
import { SATELLITES, missionSatellite, satelliteById } from '../data/satellites';
import { FAIRING_ENVELOPE, fairingFit } from '../config/satellite-spec';
import { unbroken } from './build/figures';
import { SITES, siteById, type SiteExtra } from '../data/sites';
import { ORBIT_PRESETS, orbitById } from '../data/orbits';
import { DEFAULT_FAILURE, guidanceForVehicle } from '../physics/defaults';
import { liftoffMass, liftoffThrust, idealDeltaV, VehicleModel } from '../physics/vehicle';
import {
  planMission, launchWindows, resolveTarget, inclinationCorridor, maxInclinationFor, type MissionPlan,
} from '../physics/mission';
import { probeInsertion, type InsertionProbe } from '../physics/autotune';
import { runTuneJob } from '../physics/tune-job';
import { DEG, G0, RAD } from '../physics/constants';
import { t, getLang } from '../i18n';
import { localized, satelliteName, siteName, stageName, vehicleManufacturer, vehicleNotes, zoneName } from './names';
import { FAILURE_MODES, GUIDANCE_FIELDS, failureAvailable, fieldLimits, flightHomeCapable, guidanceLimits, parseNumberField, parseUtcDateTime, validateConfigInput, type ValidationIssue, type ConfigInput } from '../config/validation';
import { landingZonesForSite } from '../data/landing-zones';
import { quickstartMission, type QuickstartId } from './quickstart';
import { WATCH_MISSIONS, historicalDate, isHistorical, watchMissionSettings } from './watch-missions';
import { loadExperience, saveExperience, type ExperienceMode } from './experience';
import {
  CHALLENGE_PRESETS, CHALLENGE_TEXT, ENGINEER_SETTING_TITLE, autoGuidanceRows, challengeTiming, engineerSettings, hasAdjustments,
  heaviestPassing, withoutEngineerSettings,
} from './explore';
import { defaultDynamics, supportsRigid } from '../physics/rigid/config';
import type { DynamicsConfig } from '../types';
import type { FlexConfig } from '../types';
import { FLEX_DEFAULTS } from '../physics/rigid/flex';
import type { ControlConfig, NavigationConfig } from '../types';
import { aidingFor, imuFor, IMU_KEYS, NAV_FIELD_KEYS, NAV_GRADES } from '../physics/nav/config';
import { CONTROL_CHANNEL_KEYS, CONTROL_CHANNELS, CONTROL_DEFAULTS, controlFieldKey, controlValue, type ControlChannelKey } from '../physics/rigid/control-config';
import { getNotationPreference, notationFor, setNotationPreference, type NotationPreference } from './notation';
import { PROFILE_IDS, rendezvousAvailable, type RendezvousProfileId } from '../physics/rendezvous/profiles';
import { PORT_IDS, type PortId } from '../physics/rendezvous/ports';
import type { ControlFaultKind, ControlFaultSpec, ControlFaultsConfig } from '../types';
import { CONTROL_FAULT_KINDS, CONTROL_FAULT_PRESETS, FAULT_AXES, FAULT_FIELDS, FAULT_GROUP, FAULT_MAGNITUDE, MAX_FAULTS, NAVIGATION_FAULTS } from '../physics/rigid/fault-config';
import { faultKindName } from './fault-names';
import type { ExplicitGuidanceConfig } from '../types';
import { EXPLICIT_FIELD_KEYS } from '../physics/explicit-guidance';
import { copyMission, type MissionState } from '../config/mission-file';
import { configuredDispersion } from '../physics/dispersed-flight'; // P08
import { propulsionElements } from '../physics/dispersion'; // P08
import type { DispersedFlightConfig } from '../types'; // P08
import { MissionShare } from './mission-share';
import {
  missionVerdict, missionCapability, ratedPayload, orbitClassOf, marginalMission,
  type Capability, type Feasibility, type OrbitClass, type VerdictCause, type VerdictInput,
} from '../config/verdict';

// The verdict itself is DOM-free and lives in src/config/verdict.ts (roadmap
// D04's readiness review calls it too); every name stays importable from here.
export {
  missionVerdict, missionCapability, ratedPayload, orbitClassOf, marginalMission,
  type Capability, type Feasibility, type OrbitClass, type VerdictCause, type VerdictInput,
};

export interface SetupCallbacks {
  onLaunch: (cfg: MissionConfig) => void;
  onReset: () => void;
  onChange?: (cfg: MissionConfig) => void;
  /**
   * The user asked for the other layout from inside the panel ("Adjust in the
   * Engineer mode" under Explore's computed guidance). The app owns the mode —
   * it is in the URL and the top bar — so the panel reports the request
   * instead of switching itself.
   */
  onExperience?: (mode: ExperienceMode) => void;
  /** G05: open the Monte Carlo window on the mission as set here. */
  onMonteCarlo?: (opener: HTMLElement) => void;
}

interface SetupState {
  dynamics?: DynamicsConfig;
  vehicleId: string;
  /** S02: a custom vehicle, from a mission file; its id is `vehicleId` */
  vehicleSpec?: VehicleSpec;
  satelliteId: string;
  /** D06: a custom satellite, from a mission file; its id is `satelliteId` */
  satelliteSpec?: SatelliteSpec;
  siteId: string;
  orbitId: string;
  orbit: OrbitSpec;
  launchTime: Date;
  /** operator edits layered on top of the vehicle's resolved guidance */
  guidanceOverrides: Partial<GuidanceParams>;
  failure: FailureConfig;
  boosterRecovery: boolean;
  /**
   * Where each recovered stage flies back to, from a prepared mission. It
   * belongs to one vehicle at one site, so changing either drops it.
   */
  recoveryPlan?: RecoveryPlan;
  /** the site's launch pad a prepared mission names; changing the vehicle or the site drops it */
  padId?: string;
  /** a flight on to the station (G07); dropped when the orbit or the payload no longer allows one */
  rendezvous?: MissionConfig['rendezvous'];
  payloadMass: number;
}

/** Whether `vehicleId` carries this payload (Crew Dragon flies on Falcon 9 only). */
const carries = (vehicleId: string, sat: SatelliteSpec): boolean => !sat.carriers || sat.carriers.includes(vehicleId);

function toDatetimeLocalUTC(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
function fromDatetimeLocalUTC(s: string): Date | null {
  return parseUtcDateTime(s);
}
const fmtUTC = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

function num(v: number, digits = 0): string {
  try {
    return v.toLocaleString(getLang(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
  } catch {
    return v.toFixed(digits);
  }
}

/** The fewest decimals (up to two) that print a value exactly: 1.5, 0.45, 4. */
function decimals(v: number): number {
  for (let d = 0; d < 2; d++) if (Math.abs(Math.round(v * 10 ** d) - v * 10 ** d) < 1e-9) return d;
  return 2;
}

/** Where a payload to low orbit sits between 100 kg and 150 t, on a logarithmic scale, 0–1. */
export function liftShare(kg: number): number {
  const lo = Math.log10(100), hi = Math.log10(150e3);
  return Math.min(1, Math.max(0, (Math.log10(Math.max(kg, 1)) - lo) / (hi - lo)));
}

const orbitName = (o: OrbitSpec): string => localized(`orbit.${o.id}.name`, o.name);
const orbitDesc = (o: OrbitSpec): string => localized(`orbit.${o.id}.desc`, o.description);
const orbitShort = (o: OrbitSpec): string => localized(`orbit.${o.id}.short`, o.id.toUpperCase());

/**
 * Whether the site's range-safety corridor contains this inclination — BOTH
 * ends of it, which is `inclinationCorridor` in src/physics/mission.ts, the
 * same function `planMission` reports `inclinationReachable` from.
 *
 * It used to test only the lower bound here, and `maxInclination` had no
 * consumer in `src/` at all: the app flew a 51.64° ISS mission out of Starbase
 * (corridor 80–110°, reaching 31.8°) and called it "Ready to simulate"
 * (release review 2, major #2). The verdict now reads the planner's own
 * function, so the two cannot disagree about what a site can fly.
 */
export function reachableFromSite(site: SiteExtra, incDeg: number): boolean {
  return inclinationCorridor(site, incDeg * DEG) === 'ok';
}

/** The payload step the verdict's fix searches in: 10 kg for a small launcher, 100 kg otherwise. */
export function payloadStep(spec: VehicleSpec): number {
  return spec.payloadLEO < 5000 ? 10 : 100;
}

/** Explore's title over the verdict, by its level. */
const VERDICT_LIGHT: Record<Feasibility['level'], string> = { ok: 'setup.light.ok', warn: 'setup.light.warn', fail: 'setup.light.fail' };

export class SetupPanel {
  readonly root: HTMLElement;
  private cb: SetupCallbacks;
  state: SetupState;
  private running = false;
  private tuning = false;
  private tuneController: AbortController | null = null;
  private tuneMessage = '';
  /** the "Share & save" row (roadmap U01) */
  readonly share = new MissionShare(this);
  /** the mission the current auto-tune result was measured for */
  private tunedFor = '';
  /** the vehicle forced a different site than the one that was selected */
  private siteReassigned = false;
  private noteEl: HTMLElement | null = null;
  private infoEl: HTMLElement | null = null;
  private descEl: HTMLElement | null = null;
  private statsEl: HTMLElement | null = null;
  private windowsEl: HTMLElement | null = null;
  private launchBtn: HTMLButtonElement | null = null;
  /** Explore: the payload against the vehicle's rating, and the verdict's fixes */
  private meterEl: HTMLElement | null = null;
  private fixesEl: HTMLElement | null = null;
  private scrollEl: HTMLElement | null = null;
  /** Explore: the set-up step on screen */
  private step: 1 | 2 | 3 = 1;
  /** Explore: what the last fix did, until the next edit */
  private fixMessage = '';
  private readonly fieldInputs = new Map<string, { input: HTMLInputElement; error: HTMLElement }>();
  private readonly fieldDrafts = new Map<string, string>();
  private readonly inputIssues = new Map<string, ValidationIssue>();
  private experience: ExperienceMode = loadExperience();
  /** the mission plan for the current state; null when the planner rejected it */
  private planCache: ReturnType<typeof planMission> | null = null;
  /** the headless insertion flight for the current state; null when none was run */
  private probeCache: InsertionProbe | null = null;
  /** what `probeCache` was measured for, so a slider drag flies it once per value */
  private probedFor = '';

  constructor(root: HTMLElement, cb: SetupCallbacks) {
    this.root = root;
    this.cb = cb;
    const now = new Date();
    now.setUTCSeconds(0, 0);
    now.setUTCMinutes(Math.ceil(now.getUTCMinutes() / 5) * 5);
    this.state = {
      vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbitId: 'iss', orbit: { ...orbitById('iss') },
      launchTime: now, guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
      payloadMass: satelliteById('crew').mass,
      dynamics: defaultDynamics('soyuz21a'),
    };
    // Explore launches into a plane at its window: the default mission is the ISS's
    if (this.experience === 'learning') this.snapToWindow();
    this.tunedFor = this.missionSignature();
    this.render();
  }

  /** The guidance that will be flown: the vehicle's own programme plus operator edits. */
  get guidance(): GuidanceParams {
    return { ...guidanceForVehicle(missionVehicle(this.state), undefined, this.state.dynamics?.model), ...this.state.guidanceOverrides };
  }

  getConfig(): MissionConfig {
    if (!this.isValid()) throw new Error(t('setup.validation.summary'));
    const s = this.state;
    return {
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: { ...s.orbit },
      ...(s.vehicleSpec ? { vehicleSpec: structuredClone(s.vehicleSpec) } : {}),
      ...(s.satelliteSpec ? { satelliteSpec: structuredClone(s.satelliteSpec) } : {}),
      launchTime: new Date(s.launchTime.getTime()), guidance: this.guidance, failure: { ...s.failure },
      boosterRecovery: s.boosterRecovery, payloadMassOverride: s.payloadMass,
      ...(s.boosterRecovery && s.recoveryPlan ? { recoveryPlan: structuredClone(s.recoveryPlan) } : {}),
      ...(s.padId ? { padId: s.padId } : {}),
      ...(s.rendezvous ? { rendezvous: { ...s.rendezvous } } : {}),
      // the values above are already merged with the vehicle's own programme
      guidanceResolved: true,
      dynamics: s.dynamics ? { ...s.dynamics } : undefined,
    };
  }

  /** Input validity is separate from feasibility: an infeasible experiment may
   * still launch, but a malformed field must never preview or launch stale data. */
  isValid(): boolean {
    return this.inputIssues.size === 0 && validateConfigInput(this.state).length === 0;
  }

  private validationText(issue: ValidationIssue): string {
    const params = { limit: issue.limit ?? '' };
    switch (issue.code) {
      case 'required': return t('setup.validation.required');
      case 'number': return t('setup.validation.number');
      case 'minimum': return t('setup.validation.minimum', params);
      case 'maximum': return t('setup.validation.maximum', params);
      case 'integer': return t('setup.validation.integer');
      case 'date': return t('setup.validation.date');
      case 'orbitOrder': return t('setup.validation.orbitOrder');
      case 'selection': return t('setup.validation.selection');
      case 'suborbital': return t('setup.validation.suborbital');
      case 'failureUnavailable': return t('setup.validation.failureUnavailable');
      case 'rendezvousUnavailable': return t('setup.validation.rendezvousUnavailable');
      case 'vehicleSpec': return t('setup.validation.vehicleSpec');
      case 'satelliteSpec': return t('setup.customSat.invalid');
    }
  }

  private updateValidation(): void {
    const issues = [...validateConfigInput(this.state), ...this.inputIssues.values()];
    for (const [field, { input, error }] of this.fieldInputs) {
      const issue = issues.find((i) => i.field === field);
      const message = issue ? this.validationText(issue) : '';
      input.setAttribute('aria-invalid', String(!!issue));
      input.setCustomValidity(message);
      error.textContent = message;
      error.hidden = !issue;
      if (issue) {
        const details = input.closest('details');
        if (details) details.open = true;
      }
    }
    const guidance = this.root.querySelector<HTMLElement>('.guidance-parameters');
    if (guidance) guidance.dataset.invalid = String(!!guidance.querySelector('[aria-invalid="true"]'));
    if (this.launchBtn) this.launchBtn.disabled = this.tuning || issues.length > 0;
    const tune = this.root.querySelector<HTMLButtonElement>('[data-action="autotune"]');
    if (tune && !this.tuning) tune.disabled = this.running || issues.length > 0;
    // Explore: a step holding a field to correct says so on its tab
    for (const tab of this.root.querySelectorAll<HTMLElement>('.explore-step-tab')) {
      const pane = this.root.querySelector(`.explore-step[data-step="${tab.dataset.step}"]`);
      tab.dataset.invalid = String(!!pane?.querySelector('[aria-invalid="true"]'));
    }
    if (issues.length && this.noteEl) {
      this.noteEl.className = 'status-note fail';
      const text = this.noteEl.querySelector('.status-text');
      if (text) text.textContent = t('setup.validation.summary');
      const title = this.noteEl.querySelector('.status-title');
      if (title) title.textContent = t('setup.light.fail');
      this.fixesEl?.replaceChildren();
    } else if (this.noteEl) this.updateVerdict();
  }

  private registerField(labelKey: string, input: HTMLInputElement, label: HTMLElement): void {
    const error = this.el('span', 'field-error');
    error.id = `validation-${labelKey.replace(/\./g, '-')}`;
    error.hidden = true;
    error.setAttribute('aria-live', 'polite');
    input.setAttribute('aria-describedby', error.id);
    label.append(input, error);
    this.fieldInputs.set(labelKey, { input, error });
  }

  private clearFieldDrafts(...fields: string[]): void {
    for (const field of fields) {
      this.fieldDrafts.delete(field);
      this.inputIssues.delete(field);
    }
  }

  private clearOrbitDrafts(): void {
    this.clearFieldDrafts('setup.perigee', 'setup.apogee', 'setup.inclination', 'setup.argPerigee', 'setup.raan', 'setup.ltan');
  }

  /** New mission: the rocket back on the pad and the set-up open again (the Explore debrief's "fly again" too). */
  backToSetup(): void {
    this.cancelTune();
    this.fieldDrafts.clear();
    this.inputIssues.clear();
    this.running = false;
    this.render();
    this.cb.onReset();
  }

  setRunning(r: boolean): void {
    if (r) this.cancelTune();
    this.running = r;
    this.render();
  }

  /**
   * Apply an edit made to `state` from outside the panel's own controls (the
   * WebMCP tools in `src/mcp.ts`) and repaint.
   *
   * The panel's own fields all funnel through `changed()`, which resyncs
   * `tunedFor` to `missionSignature()` on every edit; an external caller that
   * writes `state` directly and just calls `render()` skips that resync, so
   * the *next* edit made through the panel's own controls sees a stale
   * `tunedFor`, decides the auto-tune (or the override an external caller
   * just set) belongs to a different mission, and silently clears
   * `guidanceOverrides`. Resyncing here is what makes an MCP-set guidance
   * override survive a later, unrelated panel edit.
   *
   * `siteReassigned` mirrors the one-shot flag the vehicle dropdown sets
   * when it forces a different launch site (see `render()` and
   * `missionVerdict`'s doc comment): pass it when the caller performed that
   * same reassignment itself, so the verdict this call returns — and the note
   * `render()` paints — still carries the amber warning instead of silently
   * dropping it.
   *
   * The flag is assigned, not OR'd, and cleared again before returning, the
   * same way `changed()` clears it after `refresh()`: otherwise a later call
   * with `siteReassigned: false` (any edit that does not itself reassign the
   * site) would leave a `true` from an earlier call stuck, and every
   * feasibility verdict after the first site reassignment would mask
   * over-capacity, tight-margin and armed-failure warnings for the rest of
   * the session — the exact bug the one-shot flag exists to prevent.
   *
   * Returns the verdict computed while the flag was still set, so a caller
   * (`src/mcp.ts`) can report the reassignment warning for *this* edit without
   * a second `feasibility()` call racing the clear below.
   */
  applyExternalEdit(opts?: { siteReassigned?: boolean }): Feasibility {
    this.cancelTune();
    this.fixMessage = '';
    this.fieldDrafts.clear();
    this.inputIssues.clear();
    this.siteReassigned = !!opts?.siteReassigned;
    this.tunedFor = this.missionSignature();
    this.render();
    const verdict = this.feasibility();
    this.siteReassigned = false;
    return verdict;
  }

  /**
   * Replace the whole mission with a prepared one (a quick start, a launch
   * picked in the viewer) and preview it. Settings only: nothing launches.
   */
  loadMission(mission: ConfigInput & { orbitId: string }): void {
    this.cancelTune();
    Object.assign(this.state, mission);
    // a mission without a plan must not inherit the last one's
    this.state.recoveryPlan = mission.recoveryPlan ? structuredClone(mission.recoveryPlan) : undefined;
    // nor its pad, nor its flight to the station
    this.state.padId = mission.padId;
    this.state.rendezvous = mission.rendezvous ? { ...mission.rendezvous } : undefined;
    // and a catalogue vehicle's, unless it carries its own (S02)
    this.state.vehicleSpec = mission.vehicleSpec ? structuredClone(mission.vehicleSpec) : undefined;
    // and a catalogue satellite, unless it carries its own (D06)
    this.state.satelliteSpec = mission.satelliteSpec ? structuredClone(mission.satelliteSpec) : undefined;
    this.state.dynamics = defaultDynamics(missionVehicle(this.state));
    this.tuneMessage = '';
    this.applyExternalEdit();
    this.cb.onChange?.(this.getConfig());
  }

  isRunning(): boolean {
    return this.running;
  }

  /** The mission as it stands, as a copy (roadmap U01: links, files, the page's own copy). */
  missionState(): MissionState {
    return copyMission(this.state);
  }

  /**
   * Replace the whole mission with a saved one — dynamics and all, unlike
   * `loadMission`, which gives a prepared mission the vehicle's defaults.
   * The caller has validated it (`parseMissionDocument`).
   */
  restoreMission(mission: MissionState): void {
    this.cancelTune();
    Object.assign(this.state, copyMission(mission));
    if (!mission.recoveryPlan) this.state.recoveryPlan = undefined;
    if (!mission.vehicleSpec) this.state.vehicleSpec = undefined;
    if (!mission.satelliteSpec) this.state.satelliteSpec = undefined;
    if (!mission.dynamics) this.state.dynamics = undefined;
    // nor the last mission's pad or flight to the station: Vostok-1's Site 1
    // left on a Saturn V at LC-39A made the next lesson unlaunchable (C01)
    if (!mission.padId) this.state.padId = undefined;
    if (!mission.rendezvous) this.state.rendezvous = undefined;
    this.tuneMessage = '';
    this.applyExternalEdit();
    this.cb.onChange?.(this.getConfig());
  }

  /** Show the learning or the advanced layout (set by the app's mode). */
  setExperience(mode: ExperienceMode): void {
    if (mode === this.experience) return;
    this.experience = mode;
    saveExperience(mode);
    this.render();
    if (mode === 'advanced') {
      const guidance = this.root.querySelector<HTMLDetailsElement>('details[data-section="guidance"]');
      if (guidance) guidance.open = true;
    }
  }

  /** What an auto-tune result is valid for: change any of it and the tune is stale. */
  private missionSignature(): string {
    const s = this.state;
    return JSON.stringify({ vehicle: s.vehicleId, custom: s.vehicleSpec, site: s.siteId, orbit: s.orbit,
      payload: s.payloadMass, satellite: s.satelliteId, customSatellite: s.satelliteSpec, launchTime: s.launchTime,
      failure: s.failure, recovery: s.boosterRecovery, plan: s.recoveryPlan, dynamics: s.dynamics });
  }

  // ─── element helpers ──────────────────────────────────────────────────────

  private el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  private select(labelKey: string, options: { value: string; label: string }[], value: string, onChange: (v: string) => void, label = t(labelKey)): HTMLElement {
    const lab = this.el('label', 'field');
    lab.appendChild(this.el('span', undefined, label));
    const sel = this.el('select');
    sel.setAttribute('aria-label', label);
    for (const o of options) {
      const op = this.el('option', undefined, o.label);
      op.value = o.value;
      if (o.value === value) op.selected = true;
      sel.appendChild(op);
    }
    sel.disabled = this.running;
    sel.addEventListener('change', () => onChange(sel.value));
    lab.appendChild(sel);
    return lab;
  }

  private number(labelKey: string, value: number, onChange: (v: number) => void, step = 1, min?: number, max?: number): HTMLElement {
    const lab = this.el('label', 'field');
    lab.appendChild(this.el('span', undefined, t(labelKey)));
    const inp = this.el('input');
    inp.type = 'number';
    inp.value = this.fieldDrafts.get(labelKey) ?? String(+value.toFixed(3));
    inp.step = String(step);
    inp.setAttribute('aria-label', t(labelKey));
    const def = Object.values(GUIDANCE_FIELDS).find((f) => `setup.${f.key}` === labelKey);
    const stored = def ? guidanceLimits(def.key, missionVehicle(this.state)) : null;
    const limits = def && stored
      ? { min: stored.min === undefined ? undefined : stored.min / def.scale, max: stored.max === undefined ? undefined : stored.max / def.scale }
      : fieldLimits(labelKey, this.state.orbit) ?? { min, max };
    if (limits.min !== undefined) inp.min = String(limits.min);
    if (limits.max !== undefined) inp.max = String(limits.max);
    inp.disabled = this.running;
    const read = (): { value: number; issue: ValidationIssue | null } => {
      const parsed = parseNumberField(inp.value, labelKey, limits);
      if (inp.validity.badInput) parsed.issue = { field: labelKey, code: 'number' };
      if (parsed.issue) this.inputIssues.set(labelKey, parsed.issue);
      else this.inputIssues.delete(labelKey);
      return parsed;
    };
    inp.addEventListener('input', () => {
      this.cancelTune();
      this.fieldDrafts.set(labelKey, inp.value);
      read();
      this.updateValidation();
    });
    inp.addEventListener('change', () => {
      const parsed = read();
      if (!parsed.issue) {
        this.fieldDrafts.delete(labelKey);
        onChange(parsed.value);
      } else {
        this.cancelTune();
        this.fieldDrafts.set(labelKey, inp.value);
      }
      this.updateValidation();
    });
    this.registerField(labelKey, inp, lab);
    return lab;
  }

  private sectionTitle(step: string, titleKey: string): HTMLElement {
    const head = this.el('div', 'section-title');
    head.appendChild(this.el('span', 'step-number', step));
    head.appendChild(this.el('h2', undefined, t(titleKey)));
    return head;
  }

  private quickstartSection(): HTMLElement {
    const section = this.el('section', 'config-section quickstart');
    section.id = 'quickstart-missions';
    const heading = this.el('h2', undefined, t('setup.quickstart.title'));
    heading.id = 'quickstart-title';
    section.setAttribute('aria-labelledby', heading.id);
    section.append(heading, this.el('p', 'field-note', t('setup.quickstart.note')));
    const options: { id: QuickstartId; title: string; detail: string }[] = [
      { id: 'leo', title: t('setup.quickstart.leo'), detail: t('setup.quickstart.leoDetail') },
      { id: 'iss', title: t('setup.quickstart.iss'), detail: t('setup.quickstart.issDetail') },
      { id: 'gto', title: t('setup.quickstart.gto'), detail: t('setup.quickstart.gtoDetail') },
    ];
    for (const option of options) {
      const button = this.el('button', 'quickstart-button');
      button.type = 'button';
      button.dataset.quickstart = option.id;
      button.disabled = this.running;
      button.append(this.el('strong', undefined, option.title), this.el('span', undefined, option.detail));
      button.addEventListener('click', () => {
        if (this.running) return;
        this.loadMission(quickstartMission(option.id));
      });
      section.append(button);
    }
    return section;
  }

  /**
   * The flights of history (roadmap C01), the viewer's own list: each fills
   * the settings as flown, on its day and at its second, for the reader to
   * launch as it is or to change.
   */
  /** the historical list stays open across the panel's re-renders */
  private historyOpen = false;

  private historicalSection(): HTMLElement {
    const section = this.el('details', 'config-section quickstart historical-missions') as HTMLDetailsElement;
    section.id = 'historical-missions';
    section.open = this.historyOpen;
    section.addEventListener('toggle', () => { this.historyOpen = section.open; });
    const summary = this.el('summary', undefined);
    summary.append(this.el('h2', undefined, t('setup.history.title')));
    section.append(summary, this.el('p', 'field-note', t('setup.history.note')));
    for (const m of WATCH_MISSIONS.filter(isHistorical)) {
      const button = this.el('button', 'quickstart-button');
      button.type = 'button';
      button.dataset.historical = m.id;
      button.disabled = this.running;
      const spec = vehicleById(m.vehicleId);
      button.append(this.el('strong', undefined, t(m.titleKey)), this.el('span', undefined, `${spec.name} · ${historicalDate(m.launchTime!)}`));
      button.addEventListener('click', () => {
        if (this.running) return;
        this.loadMission(watchMissionSettings(m.id));
      });
      section.append(button);
    }
    return section;
  }

  private statCell(label: string, value: string, unit?: string): HTMLElement {
    const cell = this.el('div');
    cell.appendChild(this.el('small', undefined, label));
    const strong = this.el('strong', undefined, value);
    if (unit) strong.appendChild(this.el('em', undefined, ` ${unit}`));
    cell.appendChild(strong);
    return cell;
  }

  private changed(): void {
    this.cancelTune();
    this.fixMessage = '';
    // An auto-tune result belongs to the mission it was measured on.
    const sig = this.missionSignature();
    if (sig !== this.tunedFor) {
      this.tunedFor = sig;
      if (Object.keys(this.state.guidanceOverrides).length > 0) {
        this.state.guidanceOverrides = {};
        this.tuneMessage = t('setup.autotuneCleared');
        const msg = this.root.querySelector('#tune-msg');
        if (msg) msg.textContent = this.tuneMessage;
      }
    }
    this.refresh();
    if (this.isValid()) this.cb.onChange?.(this.getConfig());
    // The site notice is news about the edit that has just been painted, not a
    // state of the mission: clearing it here is what stops it masking every
    // later verdict for the rest of the session.
    this.siteReassigned = false;
  }

  // ─── rendering ────────────────────────────────────────────────────────────

  /**
   * Rebuild the whole panel from state.
   *
   * The control set itself depends on the state (the site list follows the
   * vehicle, the RAAN mode adds or removes a field), so a rebuild is sometimes
   * unavoidable — but it drops focus, and the operator is often mid-edit. The
   * focused control is identified by its accessible name, which survives the
   * rebuild, and is focused again with its selection restored.
   */
  render(): void {
    const s = this.state;
    if (s.rendezvous && !this.rendezvousAvailable()) s.rendezvous = undefined;
    const root = this.root;
    const openDetails = new Map(Array.from(root.querySelectorAll<HTMLDetailsElement>('details[data-section]'), (details) => [details.dataset.section!, details.open]));
    const active = document.activeElement as HTMLElement | null;
    const focusName = active && root.contains(active) ? active.getAttribute('aria-label') : null;
    const caret = active instanceof HTMLInputElement && active.type !== 'number' ? active.selectionStart : null;
    root.setAttribute('aria-label', t('a11y.setupPanel'));
    root.dataset.experience = this.experience;
    this.fieldInputs.clear();
    root.replaceChildren();
    const vehicle = missionVehicle(s);
    if (!vehicle.sites.includes(s.siteId)) {
      s.siteId = vehicle.sites[0];
      this.siteReassigned = true;
    }

    s.failure.stage = Math.min(s.failure.stage, vehicle.stages.length - 1);
    const learning = this.experience === 'learning';

    // heading
    const heading = this.el('div', 'panel-heading');
    const headLeft = this.el('div');
    headLeft.appendChild(this.el('span', 'eyebrow', t('app.missionControl')));
    headLeft.appendChild(this.el('h1', undefined, t('app.buildMission')));
    heading.appendChild(headLeft);
    if (!learning) heading.appendChild(this.el('span', 'step-count', '01—03'));
    root.appendChild(heading);
    if (learning) root.appendChild(this.stepTabs());

    const scroll = this.el('div', 'setup-scroll');
    this.scrollEl = scroll;
    root.appendChild(scroll);
    // Explore sets a mission up in three steps — the rocket, the payload, the
    // orbit — one on screen at a time; the Engineer level has it all in one
    // column. Every control is built either way, so a lesson's locks, the
    // validation and the focus kept across a rebuild find them all.
    const steps = learning ? ([1, 2, 3] as const).map((n) => {
      const pane = this.el('div', 'explore-step');
      pane.dataset.step = String(n);
      pane.hidden = n !== this.step;
      scroll.append(pane);
      return pane;
    }) : null;
    const into = (n: 1 | 2 | 3): HTMLElement => steps ? steps[n - 1] : scroll;
    // Explore, while the rocket flies: the steps give way to what is flying (style.css)
    root.dataset.running = String(this.running);
    if (learning) scroll.prepend(this.flightSummary(vehicle));
    // The level itself is chosen in the top bar only (src/ui/app-mode.ts): the
    // panel used to carry a second switch for it, which did the same thing.
    if (this.experience === 'advanced') scroll.appendChild(this.notationSection());
    into(1).appendChild(this.quickstartSection());
    into(1).appendChild(this.historicalSection());
    if (!learning) scroll.appendChild(this.share.section());

    // ── 01 vehicle & site ───────────────────────────────────────────────────
    const s1 = this.el('section', 'config-section');
    s1.appendChild(this.sectionTitle('01', 'setup.step.vehicle'));
    if (learning) s1.appendChild(this.vehicleCards());
    else {
      // S02: a custom vehicle (from a mission file) is offered beside the catalogue until another is picked
      const custom = s.vehicleSpec ? [{ value: s.vehicleSpec.id, label: t('setup.vehicle.custom', { name: s.vehicleSpec.name }) }] : [];
      s1.appendChild(this.select('setup.vehicle', [...custom, ...VEHICLES.map((v) => ({ value: v.id, label: `${v.name} (${v.country})` })),
        // C01: the vehicles of historical flights, after the fleet
        ...HISTORICAL_VEHICLES.map((v) => ({ value: v.id, label: `${v.name} (${v.country}) · ${t('setup.vehicle.historical')}` }))], s.vehicleId, (v) => this.pickVehicle(v)));
    }
    const detail = this.el('div', 'vehicle-detail');
    detail.appendChild(this.el('span', undefined, `${vehicleManufacturer(vehicle)} · ${vehicle.country}`));
    detail.appendChild(this.el('span', undefined, `${vehicle.stages.length} · ${t('setup.info.stages')}`));
    s1.appendChild(detail);
    const stats = this.el('div', 'vehicle-stats');
    stats.id = 'vehicle-stats';
    this.statsEl = stats;
    s1.appendChild(stats);
    if (vehicle.notes) {
      const notes = this.el('p', 'field-note vehicle-notes');
      notes.appendChild(this.el('strong', undefined, `${t('setup.stats.notes')}: `));
      notes.appendChild(document.createTextNode(vehicleNotes(vehicle)));
      s1.appendChild(notes);
    }
    const siteField = this.select('setup.site', SITES.filter((x) => vehicle.sites.includes(x.id)).map((x) => ({ value: x.id, label: siteName(x) })), s.siteId, (v) => {
      s.siteId = v;
      s.recoveryPlan = undefined;
      s.padId = undefined;
      this.siteReassigned = false;
      this.render();
      this.changed();
    });
    // Sites no vehicle flies from yet (roadmap C04), shown for what they are
    const unflown = SITES.filter((x) => !ALL_VEHICLES.some((v) => v.sites.includes(x.id)));
    if (unflown.length) {
      const group = this.el('optgroup');
      group.label = t('setup.siteUnflown');
      for (const x of unflown) {
        const op = this.el('option', undefined, siteName(x));
        op.value = x.id;
        op.disabled = true;
        group.appendChild(op);
      }
      siteField.querySelector('select')!.appendChild(group);
    }
    s1.appendChild(siteField);
    const coords = this.el('p', 'field-note');
    coords.id = 'site-coordinates';
    s1.appendChild(coords);
    // Explore: whether the first stage comes home belongs with the rocket
    if (learning && vehicle.recoverable) s1.appendChild(this.optionsSection(vehicle));
    into(1).appendChild(s1);

    // ── 02 payload ──────────────────────────────────────────────────────────
    const s2 = this.el('section', 'config-section');
    s2.appendChild(this.sectionTitle('02', 'setup.step.payload'));
    // D06: a custom satellite (from a mission file) is offered beside the catalogue until another is picked; its name is the designer's
    const customSat = s.satelliteSpec ? [{ value: s.satelliteSpec.id, label: t('setup.customSat.option', { name: s.satelliteSpec.name }) }] : [];
    s2.appendChild(this.select('setup.satellite', [...customSat, ...SATELLITES.filter((x) => carries(vehicleDataId(missionVehicle(s)), x)).map((x) => ({ value: x.id, label: satelliteName(x) }))], s.satelliteId, (v) => {
      if (v === s.satelliteSpec?.id) return;
      this.clearOrbitDrafts();
      this.clearFieldDrafts('setup.payloadMass');
      s.satelliteId = v;
      s.satelliteSpec = undefined;
      const sat = satelliteById(v);
      s.payloadMass = sat.mass;
      const typical = orbitById(sat.typicalOrbit);
      s.orbitId = typical.id;
      s.orbit = { ...typical };
      if (learning) this.snapToWindow();
      this.render();
      this.changed();
    }));
    s2.appendChild(this.number('setup.payloadMass', s.payloadMass, (v) => { s.payloadMass = v; this.changed(); }, 10, 1));
    if (s.satelliteSpec) s2.appendChild(this.fairingFitNote(vehicle, s.satelliteSpec));
    if (learning) {
      const meter = this.el('div', 'payload-meter');
      meter.id = 'payload-meter';
      this.meterEl = meter;
      s2.appendChild(meter);
    } else this.meterEl = null;
    into(2).appendChild(s2);

    // ── 03 target orbit & launch time ───────────────────────────────────────
    const s3 = this.el('section', 'config-section orbit-section');
    s3.appendChild(this.sectionTitle('03', 'setup.step.orbit'));
    const pills = this.el('div', 'orbit-presets');
    pills.setAttribute('role', 'group');
    pills.setAttribute('aria-label', t('a11y.orbitPresets'));
    for (const o of ORBIT_PRESETS) {
      const b = this.el('button', s.orbitId === o.id ? 'active' : undefined, orbitShort(o));
      b.type = 'button';
      b.title = orbitName(o);
      b.setAttribute('aria-pressed', String(s.orbitId === o.id));
      b.disabled = this.running;
      b.addEventListener('click', () => {
        this.clearOrbitDrafts();
        s.orbitId = o.id;
        s.orbit = { ...orbitById(o.id) };
        // Explore: a plane that has to be launched into at its time gets that time
        if (learning) this.snapToWindow();
        this.render();
        this.changed();
      });
      pills.appendChild(b);
    }
    s3.appendChild(pills);
    const desc = this.el('p', 'field-note');
    desc.id = 'orbit-description';
    this.descEl = desc;
    s3.appendChild(desc);

    const site = siteById(s.siteId);
    const target = resolveTarget(s.orbit, site, s.launchTime);
    const orbitRow = this.el('div', 'row');
    orbitRow.appendChild(this.number('setup.perigee', s.orbit.perigee / 1000, (v) => { this.customise(); s.orbit.perigee = v * 1000; this.changed(); }, 10, 100));
    orbitRow.appendChild(this.number('setup.apogee', s.orbit.apogee / 1000, (v) => { this.customise(); s.orbit.apogee = v * 1000; this.changed(); }, 10, 100));
    s3.appendChild(orbitRow);
    const orbitRow2 = this.el('div', 'row');
    // `changed()`, not `render()`: the control set does not depend on the
    // inclination, and rebuilding the panel here destroyed the field the
    // operator had just typed into and dropped focus to the body.
    orbitRow2.appendChild(this.number('setup.inclination', target.inclination * RAD, (v) => { this.customise(); s.orbit.inclination = v; this.changed(); }, 0.1, 0, 180));
    // Explore keeps the orbit's geometry — ω, the RAAN mode, the LTAN — as the
    // preset sets it (src/ui/explore.ts); the Engineer level edits it.
    if (!learning) orbitRow2.appendChild(this.number('setup.argPerigee', s.orbit.argPerigee, (v) => { this.customise(); s.orbit.argPerigee = v; this.changed(); }, 1, 0, 360));
    s3.appendChild(orbitRow2);
    if (learning) s3.appendChild(this.el('p', 'field-note orbit-glossary', t('setup.glossary')));
    if (flightHomeCapable(vehicle)) s3.appendChild(this.suborbitalOption());
    if (!learning) {
      s3.appendChild(this.select('setup.raanMode', [
        { value: 'free', label: t('setup.raanFree') }, { value: 'fixed', label: t('setup.raanFixed') },
        { value: 'iss', label: t('setup.raanIss') }, { value: 'ltan', label: t('setup.raanLtan') },
      ], s.orbit.raanMode, (v) => { this.customise(); s.orbit.raanMode = v as OrbitSpec['raanMode']; this.render(); this.changed(); }));
      if (s.orbit.raanMode === 'fixed') s3.appendChild(this.number('setup.raan', s.orbit.raan ?? 0, (v) => { s.orbit.raan = v; this.changed(); }, 1, 0, 360));
      if (s.orbit.raanMode === 'ltan') s3.appendChild(this.number('setup.ltan', s.orbit.ltan ?? 10.5, (v) => { s.orbit.ltan = v; this.changed(); }, 0.25, 0, 24));
    }
    if (this.rendezvousAvailable()) s3.appendChild(this.rendezvousOption());

    const timeLab = this.el('label', 'field');
    timeLab.appendChild(this.el('span', undefined, t('setup.launchTime')));
    const timeInp = this.el('input');
    timeInp.type = 'datetime-local';
    timeInp.value = this.fieldDrafts.get('setup.launchTime') ?? toDatetimeLocalUTC(s.launchTime);
    timeInp.disabled = this.running;
    timeInp.setAttribute('aria-label', t('setup.launchTime'));
    const readDate = (): Date | null => {
      const d = fromDatetimeLocalUTC(timeInp.value);
      if (d) this.inputIssues.delete('setup.launchTime');
      else this.inputIssues.set('setup.launchTime', { field: 'setup.launchTime', code: timeInp.value ? 'date' : 'required' });
      return d;
    };
    timeInp.addEventListener('input', () => {
      this.cancelTune();
      this.fieldDrafts.set('setup.launchTime', timeInp.value);
      readDate();
      this.updateValidation();
    });
    timeInp.addEventListener('change', () => {
      const d = readDate();
      if (d) {
        this.fieldDrafts.delete('setup.launchTime');
        s.launchTime = d;
        this.changed();
      } else {
        this.cancelTune();
        this.fieldDrafts.set('setup.launchTime', timeInp.value);
      }
      this.updateValidation();
    });
    this.registerField('setup.launchTime', timeInp, timeLab);
    s3.appendChild(timeLab);
    const winBox = this.el('div', 'windows');
    winBox.id = 'launch-windows';
    this.windowsEl = winBox;
    s3.appendChild(winBox);

    const info = this.el('div', 'info');
    info.id = 'vehicle-info';
    this.infoEl = info;
    s3.appendChild(info);
    into(3).appendChild(s3);

    // ── collapsible: guidance / failure / options ───────────────────────────
    const s4 = this.el('section', 'config-section');
    const dynamics = this.dynamicsSection();
    if (dynamics) s4.appendChild(dynamics);
    if (this.experience === 'advanced' && this.state.dynamics?.model === 'sixDof') s4.appendChild(this.flexSection());
    if (this.experience === 'advanced' && this.state.dynamics?.model === 'sixDof') s4.appendChild(this.controlSection());
    if (this.experience === 'advanced' && this.state.dynamics?.model === 'sixDof') s4.appendChild(this.navigationSection());
    if (this.experience === 'advanced' && this.state.dynamics?.model === 'sixDof') s4.appendChild(this.faultsSection());
    if (this.experience === 'advanced') s4.appendChild(this.explicitGuidanceSection());
    if (this.experience === 'advanced') s4.appendChild(this.dispersedFlightSection()); // P08
    if (this.experience === 'advanced' && this.cb.onMonteCarlo) s4.appendChild(this.monteCarloSection());
    s4.appendChild(this.guidanceSection());
    s4.appendChild(this.failureSection(vehicle));
    if (!learning) s4.appendChild(this.optionsSection(vehicle));
    into(3).appendChild(s4);
    if (steps) {
      steps[2].appendChild(this.share.section());
      for (const [k, pane] of steps.entries()) pane.appendChild(this.stepNav((k + 1) as 1 | 2 | 3));
    }

    // ── launch area ─────────────────────────────────────────────────────────
    const area = this.el('div', 'launch-area');
    const note = this.el('p', 'status-note');
    note.id = 'mission-note';
    note.setAttribute('aria-live', 'polite');
    note.appendChild(this.el('span', 'status-dot'));
    if (learning) {
      // Explore: the verdict as a light with a title, and the changes that answer it
      const body = this.el('span', 'status-body');
      body.append(this.el('strong', 'status-title'), this.el('span', 'status-text'));
      note.appendChild(body);
    } else note.appendChild(this.el('span', 'status-text'));
    this.noteEl = note;
    area.appendChild(note);
    if (learning) {
      const fixes = this.el('div', 'verdict-fixes');
      this.fixesEl = fixes;
      area.appendChild(fixes);
    } else this.fixesEl = null;
    const launch = this.el('button', 'launch-button');
    launch.type = 'button';
    launch.appendChild(this.el('span', 'arrow', '↗'));
    launch.appendChild(this.el('span', 'launch-label', t(this.running ? 'setup.relaunch' : 'setup.launchMission')));
    launch.appendChild(this.el('span', 'key-hint', 'SPACE'));
    launch.disabled = this.tuning;
    launch.addEventListener('click', () => { if (this.isValid()) this.cb.onLaunch(this.getConfig()); });
    this.launchBtn = launch;
    area.appendChild(launch);
    const reset = this.el('button', 'ghost-button', t('setup.reset'));
    reset.type = 'button';
    reset.addEventListener('click', () => { this.step = 1; this.backToSetup(); });
    area.appendChild(reset);
    area.appendChild(this.el('p', 'launch-note', t('setup.launchNote')));
    root.appendChild(area);

    for (const details of root.querySelectorAll<HTMLDetailsElement>('details[data-section]')) {
      if (openDetails.has(details.dataset.section!)) details.open = openDetails.get(details.dataset.section!)!;
    }
    // A RAAN/LTAN control can disappear when its mode changes. A discarded
    // field must not keep an invisible draft error blocking the next mission.
    for (const field of this.inputIssues.keys()) {
      if (!this.fieldInputs.has(field)) this.clearFieldDrafts(field);
    }
    this.refresh();
    if (focusName) {
      const again = root.querySelector<HTMLElement>(`[aria-label="${CSS.escape(focusName)}"]`);
      if (again) {
        again.focus();
        if (caret !== null && again instanceof HTMLInputElement) {
          try { again.setSelectionRange(caret, caret); } catch { /* not a text-like input */ }
        }
      }
    }
  }

  // ─── Explore: the three set-up steps ──────────────────────────────────────

  private static readonly STEP_TAB = { 1: 'setup.tab.vehicle', 2: 'setup.tab.payload', 3: 'setup.tab.orbit' } as const;

  /** The step tabs under the heading: any step can be opened at any time. */
  private stepTabs(): HTMLElement {
    const nav = this.el('nav', 'explore-steps');
    nav.setAttribute('aria-label', t('setup.steps'));
    for (const n of [1, 2, 3] as const) {
      const b = this.el('button', 'explore-step-tab');
      b.type = 'button';
      b.dataset.step = String(n);
      b.append(this.el('small', undefined, `0${n}`), this.el('span', undefined, t(SetupPanel.STEP_TAB[n])));
      if (n === this.step) b.setAttribute('aria-current', 'step');
      b.addEventListener('click', () => this.goStep(n));
      nav.append(b);
    }
    return nav;
  }

  /** Back and on, at the foot of each step; the last step's "on" is the Launch button. */
  private stepNav(n: 1 | 2 | 3): HTMLElement {
    const nav = this.el('div', 'step-nav');
    if (n > 1) {
      const back = this.el('button', 'btn', t('setup.stepBack'));
      back.type = 'button';
      back.addEventListener('click', () => this.goStep((n - 1) as 1 | 2));
      nav.append(back);
    }
    if (n < 3) {
      const next = this.el('button', 'btn next', t('setup.stepNext', { step: t(SetupPanel.STEP_TAB[(n + 1) as 2 | 3]) }));
      next.type = 'button';
      next.addEventListener('click', () => this.goStep((n + 1) as 2 | 3));
      nav.append(next);
    }
    return nav;
  }

  /** Show one step. Nothing is rebuilt: the steps are all there, and hidden. */
  private goStep(n: 1 | 2 | 3): void {
    this.step = n;
    for (const pane of this.root.querySelectorAll<HTMLElement>('.explore-step')) pane.hidden = pane.dataset.step !== String(n);
    for (const tab of this.root.querySelectorAll<HTMLElement>('.explore-step-tab')) {
      if (tab.dataset.step === String(n)) tab.setAttribute('aria-current', 'step');
      else tab.removeAttribute('aria-current');
    }
    if (this.scrollEl) this.scrollEl.scrollTop = 0;
  }

  /** The first launch window at or after the launch time set, for a plane that has one. */
  private nextWindow(): Date | null {
    const s = this.state;
    if (s.orbit.raanMode === 'free') return null;
    return launchWindows(s.orbit, siteById(s.siteId), new Date(s.launchTime.getTime() - 60e3), 1)[0]?.time ?? null;
  }

  /**
   * Explore: launch at the next window of the plane just chosen (the ISS's, a
   * sun-synchronous one). Not in a lesson: 5.4 and 5.5 fix the launch time
   * and leave the orbit free, and a moved launch time would break the lock.
   */
  private snapToWindow(): void {
    if (document.body.dataset.lesson) return;
    const w = this.nextWindow();
    if (!w) return;
    this.clearFieldDrafts('setup.launchTime');
    this.state.launchTime = new Date(w.getTime());
  }

  /** Explore: the payload as a share of what the vehicle is rated to lift to this orbit's class. */
  private updatePayloadMeter(): void {
    const box = this.meterEl;
    if (!box) return;
    const s = this.state;
    const spec = missionVehicle(s);
    const want = orbitClassOf(s.orbit);
    const { cap, cls } = ratedPayload(spec, want);
    box.replaceChildren();
    if (cap <= 0) {
      box.dataset.level = 'fail';
      box.append(this.el('p', 'field-note', t('setup.meter.noRating', { vehicle: spec.name, class: t(`orbit.class.${want}`) })));
      return;
    }
    const share = s.payloadMass / cap;
    box.dataset.level = share > 1 ? 'fail' : share >= 0.9 ? 'warn' : 'ok';
    const bar = this.el('div', 'payload-bar');
    const fill = this.el('span');
    fill.style.width = `${Math.min(100, share * 100).toFixed(1)}%`;
    bar.append(fill);
    box.append(bar, this.el('p', 'field-note', t('setup.meter', {
      mass: num(s.payloadMass), cap: num(cap), class: t(`orbit.class.${cls}`), pct: num(Math.round(share * 100)),
    })));
  }

  /**
   * Explore: the changes that answer the verdict, each a button that makes
   * it. Only what the verdict's own cause points to is offered, and nothing
   * during a lesson (style.css), where finding the change is the exercise.
   */
  private updateFixes(v: Feasibility): void {
    const box = this.fixesEl;
    if (!box) return;
    box.replaceChildren();
    const s = this.state;
    const message = (text: string, cls = 'field-note'): void => { if (text) box.append(this.el('p', cls, text)); };
    if (this.tuning) {
      message(this.tuneMessage, 'progress tune-progress');
      const cancel = this.el('button', 'btn', t('setup.tune.cancel'));
      cancel.type = 'button';
      cancel.addEventListener('click', () => { this.cancelTune(); this.render(); });
      box.append(cancel);
      return;
    }
    if (this.running || !this.isValid()) return;
    const fix = (label: string, apply: (button: HTMLButtonElement) => void): void => {
      const b = this.el('button', 'btn fix', label);
      b.type = 'button';
      b.addEventListener('click', () => apply(b));
      box.append(b);
    };
    if (v.offWindow) {
      const w = this.nextWindow();
      if (w) fix(t('setup.fix.window', { time: fmtUTC(w) }), () => {
        this.clearFieldDrafts('setup.launchTime');
        s.launchTime = w;
        this.render();
        this.changed();
      });
    }
    if (v.cause === 'corridor' || v.cause === 'inclination') {
      const site = this.siteForOrbit();
      const here = siteById(s.siteId);
      if (site) {
        fix(t('setup.fix.site', { site: siteName(site) }), () => {
          s.siteId = site.id;
          s.recoveryPlan = undefined;
          s.padId = undefined;
          this.siteReassigned = false;
          this.render();
          this.changed();
        });
      } else if (typeof s.orbit.inclination === 'number') {
        const inc = Math.round(Math.min(Math.max(s.orbit.inclination, here.minInclination), maxInclinationFor(here) * RAD) * 10) / 10;
        fix(t('setup.fix.inclination', { inc: inc.toFixed(1) }), () => {
          this.clearOrbitDrafts();
          this.customise();
          s.orbit.inclination = inc;
          this.render();
          this.changed();
        });
      }
    }
    if (v.cause === 'overCapacity' || v.cause === 'beyondCapability' || v.cause === 'noInsertion' || v.cause === 'burnBudget') {
      fix(t('setup.fix.payload'), (b) => {
        b.disabled = true;
        b.textContent = t('setup.fix.working');
        // let the button say so before the search takes the thread
        setTimeout(() => this.lightenPayload(), 20);
      });
    }
    // Only a flown shortfall: the auto-tuner buys Δv margin, which no static note measures.
    if (v.cause === 'noInsertion') fix(t('setup.fix.tune'), () => void this.autotune());
    message(this.fixMessage);
    if (!this.fixMessage) message(this.tuneMessage, 'progress tune-progress');
  }

  /** Another site the vehicle flies from whose corridor reaches the target plane without a plane change. */
  private siteForOrbit(): SiteExtra | null {
    const s = this.state;
    for (const id of missionVehicle(s).sites) {
      if (id === s.siteId) continue;
      const site = siteById(id);
      const inc = resolveTarget(s.orbit, site, s.launchTime).inclination * RAD;
      if (inclinationCorridor(site, inc * DEG) === 'ok' && inc >= site.minInclination - 0.05) return site;
    }
    return null;
  }

  /**
   * Set the heaviest payload, to the vehicle's own step, that the pre-flight
   * verdict does not fail (`heaviestPassing`). The verdict is the whole of
   * it, the insertion probe included when the budget calls the mass
   * marginal, so what this sets is what the light then shows.
   */
  private lightenPayload(): void {
    if (!this.isValid() || this.running) return;
    const s = this.state;
    const base = this.getConfig();
    const mass = heaviestPassing(s.payloadMass, payloadStep(missionVehicle(s)), (m) => this.verdictAt(base, m).level !== 'fail');
    if (mass !== null) {
      this.clearFieldDrafts('setup.payloadMass');
      s.payloadMass = mass;
      this.render();
      this.changed();
    }
    this.fixMessage = mass === null ? t('setup.fix.payloadNone') : t('setup.fix.payloadDone', { mass: num(mass) });
    this.updateVerdict();
  }

  /** The verdict this mission would get with another payload mass (see `refreshInsertionProbe` for the probe's gate). */
  private verdictAt(cfg: MissionConfig, mass: number): Feasibility {
    const s = this.state;
    const spec = missionVehicle(s);
    const site = siteById(s.siteId);
    const satellite = missionSatellite(s);
    const flown: MissionConfig = { ...cfg, payloadMassOverride: mass };
    let plan: MissionPlan | null = null;
    try { plan = planMission(flown, site, spec); } catch { plan = null; }
    let insertion: InsertionProbe | null = null;
    if (plan && marginalMission(spec, satellite, mass, plan, s.orbit)) {
      try { insertion = probeInsertion({ ...flown, dynamics: { ...(flown.dynamics ?? { wind: 'calm', seed: 20260919 }), model: 'pointMass' } }); } catch { insertion = null; }
    }
    return missionVerdict({
      spec, site, orbit: s.orbit, satellite, payloadMass: mass,
      inclinationDeg: resolveTarget(s.orbit, site, s.launchTime).inclination * RAD,
      plan, insertion, failureMode: s.failure.mode, siteReassigned: false,
    });
  }

  /**
   * D06 (Phase 4 map §2.6 c): whether the mission's custom satellite fits the
   * vehicle's fairing — an estimate, and said to be one, since a fairing's
   * usable space is the launcher's user's guide's and `FairingSpec` carries
   * only its shell (`fairingFit`, src/config/satellite-spec.ts). A catalogue
   * satellite flies as it flew and gets no note.
   */
  private fairingFitNote(vehicle: VehicleSpec, satellite: SatelliteSpec): HTMLElement {
    const fit = fairingFit(vehicle, satellite);
    // a size and a share on one line each, however narrow the panel: "4,4 × 10,5 м" never ends a line at "10,5" (`unbroken`)
    const size = (b?: { diameter: number; length: number }): string => (b ? unbroken(`${num(b.diameter, 1)} × ${num(b.length, 1)} ${t('u.m')}`) : '');
    const params = { payload: size(fit.payload), envelope: size(fit.envelope), shell: size(fit.shell) };
    const estimate = t('setup.customSat.estimate', { d: num(FAIRING_ENVELOPE.diameter * 100), l: num(FAIRING_ENVELOPE.length * 100) })
      .replace(/(\d) %/g, '$1\u00a0%');
    let text: string;
    switch (fit.verdict) {
      case 'fits': text = `${t('setup.customSat.fits', params)} ${estimate}`; break;
      case 'tight': text = `${t('setup.customSat.tight', params)} ${estimate}`; break;
      case 'tooBig': text = t('setup.customSat.tooBig', params); break;
      case 'noFairing': text = t('setup.customSat.noFairing'); break;
      case 'noSize': text = t('setup.customSat.noSize'); break;
    }
    const note = this.el('p', fit.verdict === 'tight' || fit.verdict === 'tooBig' ? 'field-note warn' : 'field-note', text);
    note.dataset.fairingFit = fit.verdict;
    return note;
  }

  /** Fly another vehicle from the catalogue: its own sites, flight model and recovery, the Engineer settings kept. */
  private pickVehicle(v: string): void {
    const s = this.state;
    if (v === s.vehicleSpec?.id) return;
    s.vehicleId = v;
    s.vehicleSpec = undefined;
    const flex = s.dynamics?.flex;
    const control = s.dynamics?.control;
    const navigation = s.dynamics?.navigation;
    const controlFaults = s.dynamics?.controlFaults;
    const explicitGuidance = s.dynamics?.explicitGuidance;
    s.dynamics = defaultDynamics(v);
    if (explicitGuidance) s.dynamics.explicitGuidance = explicitGuidance;
    if (flex) s.dynamics.flex = flex;
    if (control) s.dynamics.control = control;
    if (navigation) s.dynamics.navigation = navigation;
    if (controlFaults) s.dynamics.controlFaults = controlFaults;
    const spec = vehicleById(v);
    this.siteReassigned = false;
    if (!spec.sites.includes(s.siteId)) { s.siteId = spec.sites[0]; this.siteReassigned = true; }
    if (!spec.recoverable) s.boosterRecovery = false;
    // a payload this vehicle does not carry (Crew Dragon off Falcon 9) gives way to the generic crew ship
    if (!carries(v, satelliteById(s.satelliteId))) { s.satelliteId = 'crew'; s.payloadMass = satelliteById('crew').mass; }
    s.recoveryPlan = undefined;
    s.padId = undefined;
    // only a ship that flies itself home can take a suborbital target
    if (s.orbit.suborbital && !flightHomeCapable(spec)) s.orbit = this.orbitalAgain(s.orbit);
    this.render();
    this.changed();
  }

  /**
   * Explore's vehicle choice: the catalogue as cards, each with what it can
   * lift to low orbit on a logarithmic bar — 300 kg to 118 t is too wide a
   * range for a linear one — in place of a list of names.
   */
  private vehicleCards(): HTMLElement {
    const s = this.state;
    const box = this.el('div', 'vehicle-cards');
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', t('setup.vehicle'));
    const card = (spec: VehicleSpec, label: string): void => {
      const b = this.el('button', 'vehicle-card');
      b.type = 'button';
      b.dataset.vehicle = spec.id;
      b.setAttribute('aria-pressed', String(s.vehicleId === spec.id));
      b.disabled = this.running;
      b.append(this.el('strong', undefined, label));
      b.append(this.el('span', 'vehicle-card-meta', `${spec.country} · ${spec.stages.length} ${t('setup.info.stages')}`));
      const bar = this.el('span', 'vehicle-card-bar');
      bar.style.setProperty('--share', String(liftShare(spec.payloadLEO)));
      b.append(bar, this.el('span', 'vehicle-card-lift', `${t('orbit.class.leo')} ${num(spec.payloadLEO / 1000, spec.payloadLEO < 10000 ? 1 : 0)} t`));
      b.addEventListener('click', () => { if (!this.running) this.pickVehicle(spec.id); });
      box.append(b);
    };
    // S02: a custom vehicle (from a mission file) is offered beside the catalogue until another is picked
    if (s.vehicleSpec) card(s.vehicleSpec, t('setup.vehicle.custom', { name: s.vehicleSpec.name }));
    for (const v of VEHICLES) card(v, v.name);
    return box;
  }

  private guidanceSection(): HTMLElement {
    const gd = this.el('details');
    gd.dataset.section = 'guidance';
    const learning = this.experience === 'learning';
    gd.appendChild(this.el('summary', undefined, t(learning ? 'setup.auto.title' : 'setup.guidance')));
    const g = this.guidance;
    const set = (k: keyof GuidanceParams, v: number): void => {
      this.state.guidanceOverrides[k] = v;
      // an explicit edit belongs to this mission too
      this.tunedFor = this.missionSignature();
      this.changed();
    };
    if (learning) {
      // folded unless something flown differs from what is computed
      gd.open = hasAdjustments(this.state.guidanceOverrides, this.state.dynamics);
      this.computedGuidance(gd);
    } else gd.appendChild(this.el('p', 'field-note', t('setup.guidanceNote')));
    // Built at both levels: Explore keeps them folded away (style.css) unless
    // one is invalid or a lesson asks the student to change the guidance.
    const parameters = this.el('div', 'guidance-parameters');
    gd.append(parameters);
    const r1 = this.el('div', 'row');
    r1.appendChild(this.number('setup.kickAngle', g.kickAngle, (v) => set('kickAngle', v), 0.5, 0, 45));
    r1.appendChild(this.number('setup.maxTurnRate', g.maxTurnRate, (v) => set('maxTurnRate', v), 0.05, 0.1, 3));
    parameters.appendChild(r1);
    const r2 = this.el('div', 'row');
    r2.appendChild(this.number('setup.pitchOverAltitude', g.pitchOverAltitude, (v) => set('pitchOverAltitude', v), 50, 20, 5000));
    r2.appendChild(this.number('setup.kickDuration', g.kickDuration, (v) => set('kickDuration', v), 1, 1, 60));
    parameters.appendChild(r2);
    const r3 = this.el('div', 'row');
    r3.appendChild(this.number('setup.loftAltitude', g.loftAltitude / 1000, (v) => set('loftAltitude', v * 1000), 10, 0, 400));
    r3.appendChild(this.number('setup.gravityTurnEnd', g.gravityTurnEnd / 1000, (v) => set('gravityTurnEnd', v * 1000), 5, 30, 150));
    parameters.appendChild(r3);
    const r4 = this.el('div', 'row');
    r4.appendChild(this.number('setup.pitchMax', g.pitchMax, (v) => set('pitchMax', v), 1, 0, 80));
    r4.appendChild(this.number('setup.pitchMin', g.pitchMin, (v) => set('pitchMin', v), 1, -60, 0));
    parameters.appendChild(r4);
    const r5 = this.el('div', 'row');
    r5.appendChild(this.number('setup.slewRate', g.slewRate, (v) => set('slewRate', v), 0.5, 0.5, 20));
    r5.appendChild(this.number('setup.maxAccel', g.maxAccel, (v) => set('maxAccel', v), 1, 0, 100));
    parameters.appendChild(r5);
    parameters.appendChild(this.number('setup.parkingAltitude', g.parkingAltitude / 1000, (v) => set('parkingAltitude', v * 1000), 10, 0, 2000));
    const tools = this.el('div', 'guidance-tools');
    const tuneBtn = this.el('button', 'btn', this.tuning ? t('setup.tune.cancel') : t('setup.autotune'));
    tuneBtn.type = 'button';
    tuneBtn.dataset.action = 'autotune';
    tuneBtn.disabled = this.running || (!this.tuning && !this.isValid());
    tuneBtn.addEventListener('click', () => {
      if (this.tuning) { this.cancelTune(); this.render(); }
      else void this.autotune();
    });
    tools.appendChild(tuneBtn);
    tools.appendChild(this.el('p', 'field-note', t('setup.autotuneScope')));
    const tuneMsg = this.el('div', 'progress', this.tuneMessage);
    tuneMsg.id = 'tune-msg';
    tools.appendChild(tuneMsg);
    gd.appendChild(tools);
    return gd;
  }

  /**
   * Explore's guidance: the values the vehicle flies, computed and shown
   * rather than asked for (src/ui/explore.ts), with what the Engineer level
   * has changed of them — still flown here, since a level never touches the
   * mission — and the way back to the precomputed set.
   */
  private computedGuidance(gd: HTMLElement): void {
    const s = this.state;
    const vehicle = missionVehicle(s);
    gd.append(this.el('p', 'field-note', t(s.vehicleSpec ? 'setup.auto.noteCustom' : 'setup.auto.note', { vehicle: vehicle.name })));
    const box = this.el('div', 'info auto-guidance');
    const line = (key: string, value: string, cls?: string): void => {
      const row = this.el('div', cls);
      row.append(this.el('span', 'k', key), this.el('span', 'v', value));
      box.append(row);
    };
    line(t('setup.dynamics.title'), t(s.dynamics?.model === 'sixDof' ? 'setup.dynamics.sixDof' : 'setup.dynamics.pointMass'), 'model');
    for (const row of autoGuidanceRows(this.guidance, s.guidanceOverrides)) {
      line(t(`setup.${row.key}`), `${row.adjusted ? '✎ ' : ''}${num(row.value, decimals(row.value))}`, row.adjusted ? 'adjusted' : undefined);
    }
    gd.append(box);
    if (Object.keys(s.guidanceOverrides).length > 0) gd.append(this.el('p', 'field-note warn', t('setup.auto.adjusted')));
    const engineer = engineerSettings(s.dynamics);
    if (engineer.length > 0) {
      gd.append(this.el('p', 'field-note warn', t('setup.auto.engineer', { list: engineer.map((key) => t(ENGINEER_SETTING_TITLE[key])).join(' · ') })));
    }
    const actions = this.el('div', 'auto-actions');
    if (hasAdjustments(s.guidanceOverrides, s.dynamics)) {
      const reset = this.el('button', 'btn', t('setup.auto.reset'));
      reset.type = 'button';
      reset.disabled = this.running;
      reset.addEventListener('click', () => {
        if (this.running) return;
        this.cancelTune();
        this.clearFieldDrafts(...Object.values(GUIDANCE_FIELDS).map((f) => `setup.${f.key}`));
        s.guidanceOverrides = {};
        if (s.dynamics) s.dynamics = withoutEngineerSettings(s.dynamics);
        this.tuneMessage = '';
        this.tunedFor = this.missionSignature();
        this.render();
        this.changed();
      });
      actions.append(reset);
    }
    const engineerBtn = this.el('button', 'btn', t('setup.auto.open'));
    engineerBtn.type = 'button';
    engineerBtn.addEventListener('click', () => {
      if (this.cb.onExperience) this.cb.onExperience('advanced'); else this.setExperience('advanced');
    });
    actions.append(engineerBtn);
    gd.append(actions);
  }

  private failureSection(vehicle: VehicleSpec): HTMLElement {
    if (this.experience === 'learning') return this.challengeSection(vehicle);
    const s = this.state;
    const fd = this.el('details');
    fd.dataset.section = 'failure';
    fd.appendChild(this.el('summary', undefined, t('setup.failure')));
    // only the failures this vehicle and payload can have (a launch abort needs an escape system)
    const modes = FAILURE_MODES.filter((m) => m === s.failure.mode || failureAvailable(m, vehicle, missionSatellite(s)));
    fd.appendChild(this.select('setup.failureMode', modes.map((m) => ({ value: m, label: t(`setup.fail.${m}`) })), s.failure.mode, (v) => { s.failure.mode = v as FailureMode; this.changed(); }));
    const fr = this.el('div', 'row');
    // a strap-on collision and a stage separation failure happen at their separations, not at a time
    if (s.failure.mode !== 'boosterCollision' && s.failure.mode !== 'stagingFailure') {
      fr.appendChild(this.number('setup.failureTime', s.failure.time, (v) => { s.failure.time = v; this.changed(); }, 5, -10, 2000));
    }
    fr.appendChild(this.select('setup.failureStage', vehicle.stages.map((st, i) => ({ value: String(i), label: `${i + 1}: ${stageName(vehicle, st.id, st.name)}` })), String(Math.min(s.failure.stage, vehicle.stages.length - 1)), (v) => { s.failure.stage = Number(v); this.changed(); }));
    fd.appendChild(fr);
    return fd;
  }

  /**
   * Explore's failure scenarios, as challenges: pick what goes wrong, and it
   * goes wrong at the moment it is set for (`CHALLENGE_PRESETS`). The
   * Engineer level sets the moment and the stage itself; a scenario set
   * there is kept here, and its own moment is the one shown.
   */
  private challengeSection(vehicle: VehicleSpec): HTMLElement {
    const s = this.state;
    const fd = this.el('details');
    fd.dataset.section = 'failure';
    fd.open = true;
    fd.append(this.el('summary', undefined, t('setup.challenge.title')), this.el('p', 'field-note', t('setup.challenge.note')));
    const box = this.el('div', 'challenge-cards');
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', t('setup.challenge.title'));
    // only the failures this vehicle and payload can have (a launch abort needs an escape system)
    for (const mode of FAILURE_MODES.filter((m) => m === s.failure.mode || failureAvailable(m, vehicle, missionSatellite(s)))) {
      const b = this.el('button', 'challenge-card');
      b.type = 'button';
      b.dataset.failure = mode;
      b.setAttribute('aria-pressed', String(s.failure.mode === mode));
      b.disabled = this.running;
      b.append(this.el('strong', undefined, t(`setup.fail.${mode}`)), this.el('span', undefined, t(CHALLENGE_TEXT[mode])));
      b.title = t(CHALLENGE_TEXT[mode]);
      b.addEventListener('click', () => {
        if (this.running || s.failure.mode === mode) return;
        const preset = mode === 'none' ? DEFAULT_FAILURE : CHALLENGE_PRESETS[mode];
        s.failure = { mode, time: preset.time, stage: Math.min(preset.stage, vehicle.stages.length - 1) };
        this.render();
        this.changed();
      });
      box.append(b);
    }
    fd.append(box);
    const when = this.challengeWhen(vehicle);
    if (when) fd.append(this.el('p', 'field-note challenge-when', when));
    return fd;
  }

  /** When the chosen challenge strikes, in words: its time and stage, its separation, or nothing. */
  private challengeWhen(vehicle: VehicleSpec): string {
    const f = this.state.failure;
    const index = Math.min(f.stage, vehicle.stages.length - 1);
    const st = vehicle.stages[index];
    const stage = `${index + 1}: ${stageName(vehicle, st.id, st.name)}`;
    switch (challengeTiming(f)) {
      case 'time': return t('setup.challenge.at', { time: f.time < 0 ? `−${num(-f.time)}` : `+${num(f.time)}`, stage });
      case 'separation': return t('setup.challenge.atSeparation', { stage });
      case 'strapOns': return t('setup.challenge.atStrapOns');
      default: return '';
    }
  }

  /**
   * Explore, while the rocket flies: what is flying, in place of the set-up
   * it can no longer change. New mission brings the set-up back.
   */
  private flightSummary(vehicle: VehicleSpec): HTMLElement {
    const s = this.state;
    const section = this.el('section', 'config-section flight-summary');
    section.append(this.el('h2', undefined, t('setup.flying.title')));
    const box = this.el('div', 'info');
    const row = (key: string, value: string): void => {
      const line = this.el('div');
      line.append(this.el('span', 'k', key), this.el('span', 'v', value));
      box.append(line);
    };
    const site = siteById(s.siteId);
    const target = resolveTarget(s.orbit, site, s.launchTime);
    row(t('setup.tab.vehicle'), vehicle.name);
    row(t('setup.site'), siteName(site));
    row(t('setup.tab.payload'), `${satelliteName(missionSatellite(s))} · ${num(s.payloadMass)} kg`);
    row(t('setup.tab.orbit'), `${num(Math.round(s.orbit.perigee / 1000))} × ${num(Math.round(s.orbit.apogee / 1000))} km · ${(target.inclination * RAD).toFixed(1)}°`);
    if (s.failure.mode !== 'none') row(t('setup.challenge.title'), t(`setup.fail.${s.failure.mode}`));
    if (s.dynamics?.model === 'sixDof') row(t('setup.weather'), t(`setup.dynamics.${s.dynamics.wind}`));
    section.append(box, this.el('p', 'field-note', t('setup.flying.note')));
    return section;
  }

  // --- U07: the flight-dynamics notation (Engineer mode) -------------------------
  /** ISO 1151 or ГОСТ 20058-80, or by language; a preference, not a mission setting. */
  private notationSection(): HTMLElement {
    const section = this.el('section', 'config-section notation-section');
    section.append(this.select('setup.notation', [
      { value: 'auto', label: t('setup.notation.auto', { standard: notationFor(getLang(), 'auto') === 'gost' ? 'ГОСТ 20058-80' : 'ISO 1151' }) },
      { value: 'iso', label: t('setup.notation.iso') },
      { value: 'gost', label: t('setup.notation.gost') },
    ], getNotationPreference(), (value) => setNotationPreference(value as NotationPreference)));
    section.append(this.el('p', 'field-note', t('setup.notation.note')));
    // A display preference: never disabled by a running mission.
    section.querySelector('select')!.disabled = false;
    return section;
  }

  // --- P05: the flexible vehicle (Engineer mode, six-DOF only) ------------------
  /**
   * Slosh, bending and the bending filter, with the parameters an engineer
   * tunes: where the IMU sits, the notch's depth, width and centre, the
   * autopilot's bandwidth and the two damping ratios. All off by default.
   */
  private flexSection(): HTMLElement {
    const section = this.el('details');
    section.dataset.section = 'flex';
    section.append(this.el('summary', undefined, t('setup.flex.title')));
    const flex: FlexConfig = this.state.dynamics?.flex ?? {};
    const update = (patch: Partial<FlexConfig>, rebuild = false): void => {
      const dynamics = this.state.dynamics ?? defaultDynamics(missionVehicle(this.state));
      const next: Record<string, unknown> = { ...(dynamics.flex ?? {}), ...patch };
      for (const key of Object.keys(next)) if (next[key] === undefined || next[key] === false) delete next[key];
      this.state.dynamics = { ...dynamics, ...(Object.keys(next).length ? { flex: next as FlexConfig } : {}) };
      if (!Object.keys(next).length) delete this.state.dynamics.flex;
      if (rebuild) this.render();
      this.changed();
    };
    const toggle = (key: 'slosh' | 'bending' | 'notch', label: string): void => {
      const row = this.el('label', 'checkbox');
      const box = this.el('input');
      box.type = 'checkbox';
      box.checked = !!flex[key];
      box.disabled = this.running;
      box.addEventListener('change', () => update({ [key]: box.checked }, true));
      row.append(box, this.el('span', undefined, label));
      section.append(row);
    };
    toggle('slosh', t('setup.flex.slosh'));
    toggle('bending', t('setup.flex.bending'));
    toggle('notch', t('setup.flex.notch'));
    section.append(this.el('p', 'field-note', t('setup.flex.note')));
    if (flex.bending || flex.notch) {
      section.append(this.select('setup.flex.imu', [
        { value: 'bay', label: t('setup.flex.imuBay') }, { value: 'custom', label: t('setup.flex.imuCustom') },
      ], flex.imuStation === undefined ? 'bay' : 'custom', (value) => update({ imuStation: value === 'bay' ? undefined : 0.5 }, true)));
      if (flex.imuStation !== undefined) {
        section.append(this.number('setup.flex.imuStation', flex.imuStation * 100, (value) => update({ imuStation: value / 100 }), 1));
      }
    }
    if (flex.notch) {
      section.append(this.number('setup.flex.notchZetaZero', flex.notchZetaZero ?? FLEX_DEFAULTS.notchZetaZero, (value) => update({ notchZetaZero: value }), 0.005));
      section.append(this.number('setup.flex.notchZetaPole', flex.notchZetaPole ?? FLEX_DEFAULTS.notchZetaPole, (value) => update({ notchZetaPole: value }), 0.05));
      section.append(this.number('setup.flex.notchFrequencyScale', flex.notchFrequencyScale ?? FLEX_DEFAULTS.notchFrequencyScale, (value) => update({ notchFrequencyScale: value }), 0.05));
      section.append(this.number('setup.flex.bandwidthRatio', flex.bandwidthRatio ?? FLEX_DEFAULTS.bandwidthRatio, (value) => update({ bandwidthRatio: value }), 0.5));
    }
    if (flex.slosh) section.append(this.number('setup.flex.sloshDamping', (flex.sloshDamping ?? FLEX_DEFAULTS.sloshDamping) * 100, (value) => update({ sloshDamping: value / 100 }), 0.1));
    if (flex.bending) section.append(this.number('setup.flex.bendingDamping', (flex.bendingDamping ?? FLEX_DEFAULTS.bendingDamping) * 100, (value) => update({ bendingDamping: value / 100 }), 0.1));
    return section;
  }

  // --- E04: the attitude autopilot's tuning (Engineer mode, six-DOF only) --------
  /**
   * K_θ, K_ω and the rate and angular-acceleration limits of the roll channel and of the pitch–yaw
   * pair, and the weight of the aerodynamic feed-forward. Untouched, the default autopilot flies.
   */
  private controlSection(): HTMLElement {
    const section = this.el('details');
    section.dataset.section = 'control';
    const control: ControlConfig | undefined = this.state.dynamics?.control;
    if (control) section.open = true;
    section.append(this.el('summary', undefined, t('setup.control.title')));
    section.append(this.el('p', 'field-note', t('setup.control.note')));
    const update = (next: ControlConfig | undefined, rebuild = false): void => {
      const dynamics = this.state.dynamics ?? defaultDynamics(missionVehicle(this.state));
      this.state.dynamics = { ...dynamics, ...(next ? { control: next } : {}) };
      if (!next) delete this.state.dynamics.control;
      if (rebuild) this.render();
      this.changed();
    };
    const STEP: Record<ControlChannelKey, number> = { attitudeGain: 0.05, rateGain: 0.1, maxRateDegS: 0.5, maxAccelerationDegS2: 0.1 };
    for (const channel of CONTROL_CHANNELS) {
      section.append(this.el('p', 'field-subtitle', t(channel === 'roll' ? 'setup.control.roll' : 'setup.control.pitchYaw')));
      for (const key of CONTROL_CHANNEL_KEYS) {
        section.append(this.number(controlFieldKey(channel, key), controlValue(control, channel, key), (value) => {
          const current = this.state.dynamics?.control ?? {};
          update({ ...current, [channel]: { ...(current[channel] ?? {}), [key]: value } });
        }, STEP[key]));
      }
    }
    section.append(this.number(controlFieldKey('feedForward'), (control?.feedForward ?? CONTROL_DEFAULTS.feedForward) * 100,
      (value) => update({ ...(this.state.dynamics?.control ?? {}), feedForward: value / 100 }), 5));
    if (control) {
      const reset = this.el('button', 'ghost-button', t('setup.control.reset'));
      reset.type = 'button';
      reset.disabled = this.running;
      reset.addEventListener('click', () => { for (const key of this.controlFieldKeys()) this.fieldDrafts.delete(key); update(undefined, true); });
      section.append(reset);
    }
    return section;
  }
  private controlFieldKeys(): string[] {
    return [...CONTROL_CHANNELS.flatMap((channel) => CONTROL_CHANNEL_KEYS.map((key) => controlFieldKey(channel, key))), controlFieldKey('feedForward')];
  }

  // --- G02: inertial navigation (Engineer mode, six-DOF only) ----------------------
  /**
   * An IMU of a grade, or its figures; GNSS with an outage; a star tracker. Off, the flight knows
   * its true state.
   */
  private navigationSection(): HTMLElement {
    const section = this.el('details');
    section.dataset.section = 'navigation';
    const nav: NavigationConfig | undefined = this.state.dynamics?.navigation;
    section.append(this.el('summary', undefined, t('setup.nav.title')));
    section.append(this.el('p', 'field-note', t('setup.nav.note')));
    const update = (next: NavigationConfig | undefined, rebuild = false): void => {
      const dynamics = this.state.dynamics ?? defaultDynamics(missionVehicle(this.state));
      this.state.dynamics = { ...dynamics, ...(next ? { navigation: next } : {}) };
      if (!next) delete this.state.dynamics.navigation;
      if (rebuild) this.render();
      this.changed();
    };
    const current = (): NavigationConfig => this.state.dynamics?.navigation ?? {};
    const toggle = (label: string, checked: boolean, onChange: (on: boolean) => void): void => {
      const row = this.el('label', 'checkbox'), box = this.el('input');
      box.type = 'checkbox'; box.checked = checked; box.disabled = this.running;
      box.addEventListener('change', () => onChange(box.checked));
      row.append(box, this.el('span', undefined, label));
      section.append(row);
    };
    toggle(t('setup.nav.enable'), !!nav, (on) => { for (const key of Object.values(NAV_FIELD_KEYS)) this.fieldDrafts.delete(key); update(on ? { grade: 'tactical' } : undefined, true); });
    if (!nav) return section;
    const GRADE_NAME = { navigation: 'setup.nav.grade.navigation', tactical: 'setup.nav.grade.tactical', mems: 'setup.nav.grade.mems', custom: 'setup.nav.grade.custom' } as const;
    const grade = nav.grade ?? 'tactical';
    section.append(this.select('setup.nav.grade', NAV_GRADES.map((g) => ({ value: g, label: t(GRADE_NAME[g]) })), grade, (value) => {
      for (const key of IMU_KEYS) this.fieldDrafts.delete(NAV_FIELD_KEYS[key]);
      const { imu: _imu, ...rest } = current();
      update({ ...rest, grade: value as NavigationConfig['grade'], ...(value === 'custom' ? { imu: { ...imuFor(current()) } } : {}) }, true);
    }));
    const imu = imuFor(nav);
    if (grade === 'custom') {
      const STEP: Record<string, number> = { gyroBiasDegH: 0.1, gyroBiasInstabilityDegH: 0.1, gyroArwDegRtH: 0.01, gyroScalePpm: 10, accelBiasUg: 10, accelBiasInstabilityUg: 10, accelVrwMsRtH: 0.01, accelScalePpm: 10, alignmentDeg: 0.01 };
      for (const key of IMU_KEYS) {
        section.append(this.number(NAV_FIELD_KEYS[key], imu[key], (value) => update({ ...current(), imu: { ...(current().imu ?? {}), [key]: value } }), STEP[key]));
      }
    } else {
      section.append(this.el('p', 'field-note', t('setup.nav.figures', { gb: imu.gyroBiasDegH, arw: imu.gyroArwDegRtH, ab: imu.accelBiasUg, vrw: imu.accelVrwMsRtH,
        gs: imu.gyroScalePpm, as: imu.accelScalePpm, align: imu.alignmentDeg })));
    }
    const aiding = aidingFor(nav);
    toggle(t('setup.nav.gnss'), aiding.gnss, (on) => update({ ...current(), gnss: on }, true));
    if (aiding.gnss) {
      section.append(this.number(NAV_FIELD_KEYS.gnssPositionM, aiding.gnssPositionM, (value) => update({ ...current(), gnssPositionM: value }), 0.5));
      section.append(this.number(NAV_FIELD_KEYS.gnssVelocityMs, aiding.gnssVelocityMs, (value) => update({ ...current(), gnssVelocityMs: value }), 0.01));
      section.append(this.number(NAV_FIELD_KEYS.gnssRateHz, aiding.gnssRateHz, (value) => update({ ...current(), gnssRateHz: value }), 1));
      toggle(t('setup.nav.outage'), !!nav.gnssOutage, (on) => {
        const { gnssOutage: _o, ...rest } = current();
        update(on ? { ...rest, gnssOutage: [60, 200] } : rest, true);
      });
      if (nav.gnssOutage) {
        const [a, b] = nav.gnssOutage;
        section.append(this.number(NAV_FIELD_KEYS.gnssOutageStart, a, (value) => update({ ...current(), gnssOutage: [value, Math.max(value + 1, current().gnssOutage?.[1] ?? value + 1)] }), 10));
        section.append(this.number(NAV_FIELD_KEYS.gnssOutageEnd, b, (value) => update({ ...current(), gnssOutage: [Math.min(current().gnssOutage?.[0] ?? 0, value - 1), value] }), 10));
      }
    }
    toggle(t('setup.nav.starTracker'), aiding.starTracker, (on) => update({ ...current(), starTracker: on }, true));
    if (aiding.starTracker) {
      section.append(this.number(NAV_FIELD_KEYS.starTrackerArcsec, aiding.starTrackerArcsec, (value) => update({ ...current(), starTrackerArcsec: value }), 1));
      section.append(this.number(NAV_FIELD_KEYS.starTrackerMinAltitudeKm, aiding.starTrackerMinAltitudeKm, (value) => update({ ...current(), starTrackerMinAltitudeKm: value }), 10));
    }
    return section;
  }

  // --- G01: explicit ascent guidance (Engineer mode) --------------------------------
  /** The standard ascent guidance, PEG or IGM for the stages out of the atmosphere, and the guidance cycle. */
  private explicitGuidanceSection(): HTMLElement {
    const section = this.el('details');
    section.dataset.section = 'explicit';
    const config: ExplicitGuidanceConfig | undefined = this.state.dynamics?.explicitGuidance;
    if (config) section.open = true;
    section.append(this.el('summary', undefined, t('setup.explicit.title')));
    section.append(this.el('p', 'field-note', t('setup.explicit.note')));
    const update = (next: ExplicitGuidanceConfig | undefined): void => {
      const dynamics = this.state.dynamics ?? defaultDynamics(missionVehicle(this.state));
      this.state.dynamics = { ...dynamics, ...(next ? { explicitGuidance: next } : {}) };
      if (!next) delete this.state.dynamics.explicitGuidance;
      this.render();
      this.changed();
    };
    section.append(this.select(EXPLICIT_FIELD_KEYS.law, [
      { value: 'standard', label: t('setup.explicit.standard') }, { value: 'peg', label: t('setup.explicit.peg') }, { value: 'igm', label: t('setup.explicit.igm') },
    ], config?.law ?? 'standard', (value) => {
      this.fieldDrafts.delete(EXPLICIT_FIELD_KEYS.cycleS);
      update(value === 'standard' ? undefined : { ...(this.state.dynamics?.explicitGuidance ?? {}), law: value as ExplicitGuidanceConfig['law'] });
    }));
    section.append(this.el('p', 'field-note', t(config ? `setup.explicit.about.${config.law}` : 'setup.explicit.about.standard')));
    if (config) {
      section.append(this.number(EXPLICIT_FIELD_KEYS.cycleS, config.cycleS ?? 1, (value) => update({ ...config, cycleS: value }), 0.1));
      section.append(this.el('p', 'field-note', t('setup.explicit.engage')));
    }
    return section;
  }

  // --- P08: one dispersed flight (Engineer mode) --------------------------------------
  /**
   * Fly this mission as one run of a Monte Carlo set: the set's seed and the run's number, the
   * vehicle and air that run drew shown beside them. Off, the mission flies nominal.
   */
  private dispersedFlightSection(): HTMLElement {
    const section = this.el('details');
    section.dataset.section = 'dispersion';
    const config = this.state.dynamics?.dispersion;
    if (config) section.open = true;
    section.append(this.el('summary', undefined, t('setup.dispersion.title')));
    section.append(this.el('p', 'field-note', t('setup.dispersion.note')));
    const update = (next: DispersedFlightConfig | undefined): void => {
      const dynamics = this.state.dynamics ?? defaultDynamics(this.state.vehicleId);
      this.state.dynamics = { ...dynamics, ...(next ? { dispersion: next } : {}) };
      if (!next) delete this.state.dynamics.dispersion;
      this.render();
      this.changed();
    };
    const row = this.el('label', 'checkbox'), box = this.el('input');
    box.type = 'checkbox'; box.checked = !!config; box.disabled = this.running;
    box.addEventListener('change', () => update(box.checked ? { seed: 1, run: 0 } : undefined));
    row.append(box, this.el('span', undefined, t('setup.dispersion.on')));
    section.append(row);
    if (!config) return section;
    section.append(this.number('setup.dispersion.seed', config.seed, (v) => update({ ...config, seed: v })));
    section.append(this.number('setup.dispersion.run', config.run + 1, (v) => update({ ...config, run: v - 1 })));
    if (config.settings) {
      section.append(this.el('p', 'field-note', t('setup.dispersion.ownSet')));
      const reset = this.el('button', 'quiet-btn', t('setup.dispersion.defaultSet'));
      reset.type = 'button';
      reset.disabled = this.running;
      reset.addEventListener('click', () => update({ seed: config.seed, run: config.run }));
      section.append(reset);
    }
    // what the run drew, as the flight flies it (S02: the mission's vehicle, custom ones included)
    const spec = missionVehicle(this.state);
    const drawn = configuredDispersion(spec, config);
    const pct = (f: number) => `${f >= 1 ? '+' : '−'}${Math.abs((f - 1) * 100).toFixed(2)} %`;
    const list = this.el('ul', 'field-note dispersion-draws');
    for (const e of propulsionElements(spec)) {
      const f = drawn.vehicle[e.id];
      const name = e.kind === 'stage' ? spec.stages[e.stage].name : spec.stages[e.stage].boosters?.find((b) => b.id === e.id)?.name ?? e.id;
      list.append(this.el('li', undefined, t('setup.dispersion.stage', { name, thrust: pct(f.thrust), isp: pct(f.isp), prop: pct(f.propellant), dry: pct(f.dryMass) })));
    }
    list.append(this.el('li', undefined, t('setup.dispersion.density', { density: pct(drawn.densityFactor) })));
    if (this.state.dynamics?.model === 'sixDof') {
      list.append(this.el('li', undefined, t('setup.dispersion.wind', { east: drawn.windENU.east.toFixed(1).replace('-', '−'), north: drawn.windENU.north.toFixed(1).replace('-', '−') })));
      if (this.state.dynamics.navigation) list.append(this.el('li', undefined, t('setup.dispersion.imu')));
    } else list.append(this.el('li', undefined, t('setup.dispersion.pointMass')));
    section.append(list);
    return section;
  }

  // --- G05: Monte Carlo insertion accuracy (Engineer mode) ------------------------
  /** Opens the Monte Carlo window on the mission as it is set here (its runs fly six-DOF). */
  private monteCarloSection(): HTMLElement {
    const section = this.el('details');
    section.dataset.section = 'montecarlo';
    section.append(this.el('summary', undefined, t('setup.mc.title')));
    section.append(this.el('p', 'field-note', t('setup.mc.note')));
    const open = this.el('button', 'btn', t('setup.mc.open'));
    open.type = 'button';
    open.addEventListener('click', () => this.cb.onMonteCarlo?.(open));
    section.append(open);
    return section;
  }

  // --- G08: failures of the control system (Engineer mode, six-DOF only) ---------
  /**
   * An accident's preset, or a list of failures — actuators, sensors, the flight computer — each
   * with its time and target, and the FDIR switch. Empty, nothing fails.
   */
  private faultsSection(): HTMLElement {
    const section = this.el('details');
    section.dataset.section = 'faults';
    const config: ControlFaultsConfig | undefined = this.state.dynamics?.controlFaults;
    if (config) section.open = true;
    section.append(this.el('summary', undefined, t('setup.faults.title')));
    section.append(this.el('p', 'field-note', t('setup.faults.note')));
    const update = (next: ControlFaultsConfig | undefined, rebuild = true): void => {
      const dynamics = this.state.dynamics ?? defaultDynamics(missionVehicle(this.state));
      this.state.dynamics = { ...dynamics, ...(next ? { controlFaults: next } : {}) };
      if (!next) delete this.state.dynamics.controlFaults;
      if (rebuild) this.render();
      this.changed();
    };
    const current = (): ControlFaultsConfig => this.state.dynamics?.controlFaults ?? { faults: [] };
    const setFaults = (faults: ControlFaultSpec[]): void => {
      const { preset: _preset, ...rest } = current();
      update({ ...rest, faults });
    };
    // The preset: an accident, on its own vehicle.
    const presetValue = config?.preset ?? (config ? 'custom' : 'none');
    const presets = [{ value: 'none', label: t('setup.faults.preset.none') }, { value: 'custom', label: t('setup.faults.preset.custom') },
      ...Object.entries(CONTROL_FAULT_PRESETS).map(([key, p]) => ({ value: key, label: `${t(`setup.faults.preset.${key}`)} — ${vehicleById(p.vehicleId).name}` }))];
    section.append(this.select('setup.faults.preset', presets, presetValue, (value) => {
      if (value === 'none') { update(undefined); return; }
      if (value === 'custom') { const { preset: _preset, ...rest } = current(); update({ ...rest }); return; }
      const preset = CONTROL_FAULT_PRESETS[value];
      const next: ControlFaultsConfig = { ...current(), preset: value, faults: preset.faults.map((f) => ({ ...f, ...(Array.isArray(f.units) ? { units: [...f.units] } : {}) })) };
      if (preset.vehicleId !== this.state.vehicleId) this.faultPresetVehicle(preset.vehicleId);
      update(next);
    }));
    if (!config) return section;
    if (config.preset && CONTROL_FAULT_PRESETS[config.preset]) {
      section.append(this.el('p', 'field-note fault-preset-note', t(`setup.faults.presetNote.${config.preset}`)));
      const own = CONTROL_FAULT_PRESETS[config.preset].vehicleId;
      if (own !== vehicleDataId(missionVehicle(this.state))) section.append(this.el('p', 'field-note warn', t('setup.faults.otherVehicle', { vehicle: vehicleById(own).name })));
    }
    // The FDIR.
    const fdirRow = this.el('label', 'checkbox'), fdirBox = this.el('input');
    fdirBox.type = 'checkbox'; fdirBox.checked = config.fdir === true; fdirBox.disabled = this.running;
    fdirBox.addEventListener('change', () => update({ ...current(), fdir: fdirBox.checked }));
    fdirRow.append(fdirBox, this.el('span', undefined, t('setup.faults.fdir')));
    section.append(fdirRow, this.el('p', 'field-note', t('setup.faults.fdirNote')));
    // The failures.
    const vehicle = missionVehicle(this.state), navigation = !!this.state.dynamics?.navigation;
    config.faults.forEach((fault, index) => section.append(this.faultRow(fault, index, vehicle, navigation, (next) => {
      const faults = [...current().faults];
      if (next) faults[index] = next; else faults.splice(index, 1);
      setFaults(faults);
    })));
    if (!config.faults.length) section.append(this.el('p', 'field-note', t('setup.faults.empty')));
    const buttons = this.el('div', 'fault-buttons');
    const add = this.el('button', 'ghost-button', t('setup.faults.add'));
    add.type = 'button';
    add.disabled = this.running || config.faults.length >= MAX_FAULTS;
    add.addEventListener('click', () => setFaults([...current().faults, { kind: 'gyroBias', time: 30, units: [1], axis: 'pitch', magnitude: 1 }]));
    const clear = this.el('button', 'ghost-button', t('setup.faults.clear'));
    clear.type = 'button';
    clear.disabled = this.running;
    clear.addEventListener('click', () => update(undefined));
    buttons.append(add, clear);
    section.append(buttons);
    return section;
  }

  /** G08: one failure — its kind, time and stage, and what its kind takes. */
  private faultRow(fault: ControlFaultSpec, index: number, vehicle: VehicleSpec, navigation: boolean, change: (next: ControlFaultSpec | undefined) => void): HTMLElement {
    const row = this.el('div', 'fault-row');
    row.dataset.fault = String(index);
    const head = this.el('div', 'fault-row-head');
    head.append(this.el('strong', undefined, `${index + 1}. ${faultKindName(fault.kind)}`));
    const remove = this.el('button', 'ghost-button fault-remove', '✕');
    remove.type = 'button'; remove.disabled = this.running;
    remove.title = t('setup.faults.remove'); remove.setAttribute('aria-label', t('setup.faults.remove'));
    remove.addEventListener('click', () => change(undefined));
    head.append(remove);
    row.append(head);
    const field = (labelKey: string, control: HTMLElement): void => {
      const lab = this.el('label', 'field');
      lab.append(this.el('span', undefined, t(labelKey)), control);
      row.append(lab);
    };
    const choice = (options: { value: string; label: string; disabled?: boolean; group?: string }[], value: string, onChange: (v: string) => void): HTMLSelectElement => {
      const sel = this.el('select');
      const groups = new Map<string, HTMLElement>();
      for (const o of options) {
        const op = this.el('option', undefined, o.label);
        op.value = o.value; op.selected = o.value === value; op.disabled = !!o.disabled;
        if (o.group) {
          let g = groups.get(o.group);
          if (!g) { g = this.el('optgroup'); (g as HTMLOptGroupElement).label = o.group; groups.set(o.group, g); sel.append(g); }
          g.append(op);
        } else sel.append(op);
      }
      sel.disabled = this.running;
      sel.addEventListener('change', () => onChange(sel.value));
      return sel;
    };
    const numberInput = (value: number, limits: readonly [number, number], step: number, onChange: (v: number) => void): HTMLInputElement => {
      const inp = this.el('input');
      inp.type = 'number'; inp.value = String(+value.toFixed(3)); inp.step = String(step);
      inp.min = String(limits[0]); inp.max = String(limits[1]); inp.disabled = this.running;
      inp.addEventListener('change', () => {
        const v = Number(inp.value);
        if (inp.value.trim() === '' || !Number.isFinite(v)) { inp.value = String(+value.toFixed(3)); return; }
        onChange(Math.min(limits[1], Math.max(limits[0], v)));
      });
      return inp;
    };
    const set = (patch: Partial<ControlFaultSpec>) => change({ ...fault, ...patch });
    // The kind: a new kind keeps the time and stage and takes its own defaults.
    const kinds = CONTROL_FAULT_KINDS.map((k) => ({ value: k, label: faultKindName(k) + (NAVIGATION_FAULTS.includes(k) && !navigation ? ` (${t('setup.faults.needsNav')})` : ''),
      disabled: NAVIGATION_FAULTS.includes(k) && !navigation, group: t(`fault.group.${FAULT_GROUP[k]}`) }));
    field('setup.faults.kind', choice(kinds, fault.kind, (v) => change(defaultFault(v as ControlFaultKind, fault.time, fault.stage))));
    field('setup.faults.time', numberInput(fault.time, [0, 1e5], 1, (v) => set({ time: v })));
    field('setup.faults.stage', choice([{ value: '', label: t('setup.faults.stageAny') },
      ...vehicle.stages.map((st, i) => ({ value: String(i), label: `${i + 1}: ${stageName(vehicle, st.id, st.name)}` }))],
    fault.stage === undefined ? '' : String(fault.stage), (v) => { const { stage: _s, ...rest } = fault; change(v === '' ? rest : { ...rest, stage: Number(v) }); }));
    const fields = FAULT_FIELDS[fault.kind];
    if (fields.includes('engine')) {
      const stage = vehicle.stages[Math.min(fault.stage ?? 0, vehicle.stages.length - 1)];
      const count = Math.max(1, stage?.engine.count ?? 1);
      field('setup.faults.engine', choice([{ value: 'all', label: t('fault.all') }, ...Array.from({ length: count }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))],
        String(fault.engine ?? 'all'), (v) => set({ engine: v === 'all' ? 'all' : Number(v) })));
    }
    if (fields.includes('jet')) {
      field('setup.faults.jet', choice([{ value: 'all', label: t('fault.all') }, ...Array.from({ length: 16 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))],
        String(fault.jet ?? 'all'), (v) => set({ jet: v === 'all' ? 'all' : Number(v) })));
    }
    if (fields.includes('units')) {
      const units = fault.units === 'all' ? 'all' : (fault.units ?? [1]).join(',');
      field('setup.faults.units', choice([{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '1,2', label: '1 + 2' },
        { value: 'all', label: t('fault.target.allUnits') }], units, (v) => set({ units: v === 'all' ? 'all' : v.split(',').map(Number) })));
    }
    if (fields.includes('axis')) {
      field('setup.faults.axis', choice([...(fault.kind === 'gimbalHardover' ? [] : [{ value: '', label: t('setup.faults.axisAll') }]),
        ...FAULT_AXES.filter((a) => !fault.kind.startsWith('gimbal') || a !== 'roll').map((a) => ({ value: a, label: t(`loop.axis.${a}`) }))],
      fault.axis ?? '', (v) => { const { axis: _a, ...rest } = fault; change(v === '' ? rest : { ...rest, axis: v as ControlFaultSpec['axis'] }); }));
    }
    if (fields.includes('sign')) {
      field('setup.faults.sign', choice([{ value: '1', label: '+' }, { value: '-1', label: '−' }], String(fault.sign ?? 1), (v) => set({ sign: Number(v) as 1 | -1 })));
    }
    const size = FAULT_MAGNITUDE[fault.kind];
    if (fields.includes('magnitude') && size) {
      const lab = this.el('label', 'field');
      lab.append(this.el('span', undefined, `${t(`setup.faults.magnitude.${fault.kind}`)}${size.unit ? ` (${t(size.unit)})` : ''}`),
        numberInput(fault.magnitude ?? size.value, size.limits, size.value / 10, (v) => set({ magnitude: v })));
      row.append(lab);
    }
    row.append(this.el('p', 'field-note', t(`fault.about.${fault.kind}`)));
    return row;
  }

  /** G08: a preset flies on its own vehicle, as the vehicle select would set it (the Engineer settings kept). */
  private faultPresetVehicle(vehicleId: string): void {
    const s = this.state, kept = s.dynamics;
    s.vehicleId = vehicleId;
    s.vehicleSpec = undefined;
    s.dynamics = defaultDynamics(vehicleId);
    for (const key of ['flex', 'control', 'navigation', 'controlFaults', 'explicitGuidance'] as const) if (kept?.[key]) (s.dynamics as unknown as Record<string, unknown>)[key] = kept[key];
    const spec = vehicleById(vehicleId);
    this.siteReassigned = false;
    if (!spec.sites.includes(s.siteId)) { s.siteId = spec.sites[0]; this.siteReassigned = true; }
    if (!spec.recoverable) s.boosterRecovery = false;
  }

  /** E04: take a tuning (the attitude-loop inspector's "use for the next launch"); undefined restores the defaults. */
  applyControl(control: ControlConfig | undefined): boolean {
    // Also while a flight runs: the setup then holds it for the next launch.
    const dynamics = this.state.dynamics ?? defaultDynamics(missionVehicle(this.state));
    if (dynamics.model !== 'sixDof') return false;
    this.state.dynamics = { ...dynamics, ...(control ? { control } : {}) };
    if (!control) delete this.state.dynamics.control;
    for (const key of this.controlFieldKeys()) this.fieldDrafts.delete(key);
    this.render();
    this.changed();
    return true;
  }
  /** E04: the tuning the setup holds. */
  currentControl(): ControlConfig | undefined { return this.state.dynamics?.control; }

  private optionsSection(vehicle: VehicleSpec): HTMLElement {
    const s = this.state;
    const od = this.el('details');
    od.dataset.section = 'options';
    od.appendChild(this.el('summary', undefined, t('setup.options')));
    const chk = this.el('label', 'checkbox');
    const cb = this.el('input');
    cb.type = 'checkbox';
    cb.checked = s.boosterRecovery;
    cb.disabled = this.running || !vehicle.recoverable;
    // re-rendered: the landing choices below come and go with it
    cb.addEventListener('change', () => { s.boosterRecovery = cb.checked; this.render(); this.changed(); });
    chk.appendChild(cb);
    chk.appendChild(this.el('span', undefined, t('setup.boosterRecovery')));
    od.appendChild(chk);
    // Explore flies each stage home the vehicle's own way; a prepared mission's
    // landing places are still flown, and named.
    if (vehicle.recoverable && s.boosterRecovery) {
      if (this.experience === 'advanced') od.appendChild(this.recoveryChoices(vehicle));
      else if (s.recoveryPlan) od.appendChild(this.el('p', 'field-note', this.recoveryPlanText(vehicle, s.recoveryPlan)));
    }
    if (vehicle.recoverable && s.dynamics?.model === 'sixDof') od.appendChild(this.el('p', 'field-note', t('setup.recoveryRigidNote')));
    return od;
  }

  /**
   * A suborbital test flight, for a vehicle whose ship flies itself home.
   * Ticked, it starts from Flight 5's path (213 × −15 km); unticked, the
   * orbit is circularised at its apogee.
   */
  private suborbitalOption(): HTMLElement {
    const s = this.state;
    const box = this.el('div', 'suborbital-option');
    const lab = this.el('label', 'checkbox');
    const cb = this.el('input');
    cb.type = 'checkbox';
    cb.checked = !!s.orbit.suborbital;
    cb.disabled = this.running;
    cb.addEventListener('change', () => {
      this.clearOrbitDrafts();
      this.customise();
      s.orbit = cb.checked ? { ...s.orbit, suborbital: true, perigee: -15e3, apogee: 213e3 } : this.orbitalAgain(s.orbit);
      this.render();
      this.changed();
    });
    lab.append(cb, this.el('span', undefined, t('setup.suborbital')));
    box.appendChild(lab);
    if (s.orbit.suborbital) box.appendChild(this.el('p', 'field-note', t('setup.suborbitalNote')));
    return box;
  }

  /** A flight on to the station: a Soyuz MS to the ISS orbit (the rule `validateConfigInput` states). */
  private rendezvousAvailable(): boolean {
    const s = this.state;
    return rendezvousAvailable(vehicleDataId(missionVehicle(s)), missionSatellite(s), s.orbit);
  }

  /**
   * G07: fly on to the station after the insertion — which of the three
   * rendezvous profiles, and to which of the Russian segment's ports.
   */
  private rendezvousOption(): HTMLElement {
    const s = this.state;
    const box = this.el('div', 'rendezvous-option');
    box.appendChild(this.select('setup.rendezvous', [
      { value: '', label: t('setup.rendezvous.none') },
      ...PROFILE_IDS.map((id) => ({ value: id, label: t(`setup.rendezvous.${id}`) })),
    ], s.rendezvous?.profile ?? '', (v) => {
      s.rendezvous = v ? { profile: v as RendezvousProfileId, port: s.rendezvous?.port ?? 'rassvet' } : undefined;
      this.render();
      this.changed();
    }));
    if (s.rendezvous) {
      box.appendChild(this.select('setup.rendezvousPort', PORT_IDS.map((id) => ({ value: id, label: t(`rv.port.${id}`) })), s.rendezvous.port ?? 'rassvet', (v) => {
        if (s.rendezvous) s.rendezvous = { ...s.rendezvous, port: v as PortId };
        this.changed();
      }));
      box.appendChild(this.el('p', 'field-note', t('setup.rendezvousNote')));
    }
    return box;
  }

  /** A suborbital target made an orbit again: circular at its apogee. */
  private orbitalAgain(orbit: OrbitSpec): OrbitSpec {
    const { suborbital: _dropped, ...rest } = orbit;
    const alt = Math.max(rest.apogee, 200e3);
    return { ...rest, perigee: alt, apogee: alt };
  }

  /**
   * Where each recovered stage lands: where it comes down (the recovery with
   * no plan), a drone ship, a landing zone of this site, a tower's arms, or
   * not at all. Every choice left on "where it comes down" is no plan.
   */
  private recoveryChoices(vehicle: VehicleSpec): HTMLElement {
    const s = this.state;
    const box = this.el('div', 'recovery-choices');
    const core = vehicle.stages[0];
    const strapOns = (core.boosters ?? []).filter((b) => b.engine.count > 1).reduce((n, b) => n + b.count, 0);
    const zones = landingZonesForSite(s.siteId);
    const choices = (legs: boolean): { value: string; label: string }[] => [
      { value: 'downrange', label: t('setup.recovery.downrange') },
      ...(legs ? [{ value: 'droneShip', label: t('setup.recovery.droneShip') }] : []),
      ...zones.filter((z) => (z.kind === 'tower') !== legs).map((z) => ({ value: `zone:${z.id}`, label: zoneName(z) })),
      { value: 'expended', label: t('setup.recovery.expended') },
    ];
    const plan = s.recoveryPlan;
    const current = (mode: RecoveryMode | undefined): string =>
      !plan ? 'downrange' : !mode ? 'expended' : mode.kind === 'landingZone' ? `zone:${mode.zoneId}` : mode.kind;
    const picked = [current(plan?.core), ...Array.from({ length: strapOns }, (_, k) => current(plan?.boosters?.[k]))];
    const toMode = (v: string): RecoveryMode => v.startsWith('zone:') ? { kind: 'landingZone', zoneId: v.slice(5) }
      : { kind: v as 'downrange' | 'droneShip' | 'expended' };
    const apply = (): void => {
      s.recoveryPlan = picked.every((v) => v === 'downrange') ? undefined
        : { core: toMode(picked[0]), ...(strapOns ? { boosters: picked.slice(1).map(toMode) } : {}) };
      this.changed();
    };
    box.appendChild(this.select('setup.recovery.core', choices(!!core.legs), picked[0], (v) => { picked[0] = v; apply(); }));
    for (let k = 0; k < strapOns; k++) {
      box.appendChild(this.select('setup.recovery.booster', choices(true), picked[k + 1], (v) => { picked[k + 1] = v; apply(); },
        t('setup.recovery.booster', { n: k + 1 })));
    }
    if (zones.some((z) => z.kind === 'pad')) box.appendChild(this.el('p', 'field-note', t('setup.recovery.note')));
    return box;
  }

  /** A recovery plan in words, one clause per stage, as the Engineer level's choices name them. */
  private recoveryPlanText(vehicle: VehicleSpec, plan: RecoveryPlan): string {
    const zones = landingZonesForSite(this.state.siteId);
    const where = (mode: RecoveryMode | undefined): string => {
      if (!mode) return t('setup.recovery.expended');
      if (mode.kind === 'landingZone') {
        const zone = zones.find((z) => z.id === mode.zoneId);
        return zone ? zoneName(zone) : mode.zoneId;
      }
      return t(`setup.recovery.${mode.kind}`);
    };
    const strapOns = (vehicle.stages[0].boosters ?? []).filter((b) => b.engine.count > 1).reduce((n, b) => n + b.count, 0);
    return [
      `${t('setup.recovery.core')}: ${where(plan.core)}`,
      ...Array.from({ length: strapOns }, (_, k) => `${t('setup.recovery.booster', { n: k + 1 })}: ${where(plan.boosters?.[k])}`),
    ].join(' · ');
  }

  private customise(): void {
    if (this.state.orbitId !== 'custom') {
      this.state.orbitId = 'custom';
      const custom = orbitById('custom');
      this.state.orbit = { ...this.state.orbit, id: 'custom', name: custom.name, description: custom.description };
      // the preset pills have to follow
      this.root.querySelectorAll<HTMLButtonElement>('.orbit-presets button').forEach((b) => {
        const on = b.title === orbitName(custom);
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
  }

  /** Update everything derived from state without rebuilding the controls. */
  private refresh(): void {
    if (!this.isValid()) {
      this.planCache = null;
      this.probeCache = null;
      this.updateValidation();
      return;
    }
    // One plan per refresh: both the info card and the feasibility verdict read
    // it, and planning twice per keystroke buys nothing.
    try { this.planCache = planMission(this.getConfig(), siteById(this.state.siteId), openTopVehicle(missionVehicle(this.state), missionSatellite(this.state))); } catch { this.planCache = null; }
    this.refreshInsertionProbe();
    this.updateStats();
    this.updateWindows();
    this.updateInfo();
    this.updatePayloadMeter();
    this.updateVerdict();
    if (this.descEl) this.descEl.textContent = orbitDesc(this.state.orbit);
    if (this.launchBtn) {
      const label = this.launchBtn.querySelector('.launch-label');
      if (label) label.textContent = t(this.running ? 'setup.relaunch' : 'setup.launchMission');
    }
    this.updateValidation();
  }

  private updateStats(): void {
    const box = this.statsEl;
    if (!box) return;
    const s = this.state;
    const sat = missionSatellite(s);
    const spec = openTopVehicle(missionVehicle(s), sat);
    const m0 = liftoffMass(spec, s.payloadMass);
    const T0 = liftoffThrust(spec);
    box.replaceChildren();
    box.appendChild(this.statCell(t('setup.info.height'), num(spec.height, spec.height % 1 === 0 ? 0 : 1), 'm'));
    box.appendChild(this.statCell(t('setup.info.liftoffMass'), num(m0 / 1000, 1), 't'));
    box.appendChild(this.statCell(t('setup.info.liftoffThrust'), num(T0 / 1000), 'kN'));
    box.appendChild(this.statCell(t('setup.info.twr'), num(T0 / (m0 * G0), 2)));
    box.appendChild(this.statCell(t('setup.info.stages'), `${spec.stages.length}${sat.propulsion ? ' + s/c' : ''}`));
    const caps: string[] = [`${t('orbit.class.leo')} ${num(spec.payloadLEO)}`];
    if (spec.payloadGTO) caps.push(`${t('orbit.class.gto')} ${num(spec.payloadGTO)}`);
    if (spec.payloadSSO) caps.push(`${t('orbit.class.sso')} ${num(spec.payloadSSO)}`);
    const cell = this.statCell(t('setup.stats.payloadCap'), caps.join(' · '), 'kg');
    cell.className = 'wide';
    box.appendChild(cell);
    // The second half of audit item B26: a rating is a number to an orbit from
    // a site, and without them it is not comparable with anything. Soyuz-2.1a's
    // 7 430 kg is to 240 km × 51.6° FROM BAIKONUR and is 6 800 kg from
    // Plesetsk; the fleet matrix's own presets are 420–600 km, which costs
    // 150–300 m/s more than any of them. `RATING_ORBITS` has carried those
    // references since wave 2 with nothing reading them.
    const refs = RATING_ORBITS[spec.id];
    if (refs && refs.length > 0) {
      const lines = refs.map((o) => {
        const shape = o.perigeeKm === o.apogeeKm
          ? `${num(o.perigeeKm)} km`
          : `${num(o.perigeeKm)} × ${num(o.apogeeKm)} km`;
        return `${t(`orbit.class.${o.rating.toLowerCase()}`)} ${shape} · ${o.inclinationDeg.toFixed(1)}° · ${siteName(siteById(o.siteId))}`;
      });
      const ref = this.statCell(t('setup.stats.ratingOrbit'), lines.join(' — '));
      ref.className = 'wide';
      box.appendChild(ref);
    }
  }

  private updateWindows(): void {
    const box = this.windowsEl;
    if (!box) return;
    const s = this.state;
    const site = siteById(s.siteId);
    box.replaceChildren();
    if (s.orbit.raanMode === 'free') {
      box.appendChild(this.el('div', 'k', t('setup.noWindow')));
      return;
    }
    box.appendChild(this.el('div', 'k', t('setup.windowInfo')));
    const wins = launchWindows(s.orbit, site, new Date(s.launchTime.getTime() - 60e3), 3);
    for (const w of wins) {
      const row = this.el('button', 'window-row', `▸ ${fmtUTC(w.time)} · RAAN ${(w.raanTarget * RAD).toFixed(1)}°`);
      row.type = 'button';
      row.disabled = this.running;
      row.addEventListener('click', () => { this.clearFieldDrafts('setup.launchTime'); s.launchTime = w.time; this.render(); this.changed(); });
      box.appendChild(row);
    }
    const btn = this.el('button', 'btn', t('setup.nextWindow'));
    btn.type = 'button';
    btn.disabled = this.running || wins.length === 0;
    btn.addEventListener('click', () => { if (wins[0]) { this.clearFieldDrafts('setup.launchTime'); s.launchTime = wins[0].time; this.render(); this.changed(); } });
    box.appendChild(btn);
  }

  private updateInfo(): void {
    const box = this.infoEl;
    if (!box) return;
    const s = this.state;
    const spec = openTopVehicle(missionVehicle(s), missionSatellite(s));
    const site = siteById(s.siteId);
    const sat = missionSatellite(s);
    const dv = idealDeltaV(spec, s.payloadMass);
    const vm = new VehicleModel(spec, s.payloadMass, s.boosterRecovery, sat);
    const plan = this.planCache;
    box.replaceChildren();
    const row = (k: string, v: string, cls = ''): void => {
      const line = this.el('div', cls || undefined);
      line.appendChild(this.el('span', 'k', k));
      line.appendChild(this.el('span', 'v', v));
      box.appendChild(line);
    };
    row(t('setup.info.idealDv'), `${num(dv)} m/s`);
    if (sat.propulsion) row(t('setup.info.spacecraftDv'), `${num(vm.spacecraftDeltaV())} m/s`);
    if (plan) {
      row(t('setup.info.azimuth'), `${(plan.azimuthRotating * RAD).toFixed(1)}° (${plan.descending ? 'S' : 'N'})`);
      row(t('setup.info.ascentInclination'), `${(plan.ascentInclination * RAD).toFixed(2)}°`);
      row(t('setup.info.insertion'), `${num(plan.insertionAltitude / 1000)} × ${num(plan.insertionApoapsis / 1000)} km`);
      if (plan.doglegDeg > 0) row(t('setup.info.dogleg'), `${plan.doglegDeg.toFixed(1)}°`);
      if (plan.planeChangeDeg > 0.05) row(t('setup.info.planeChange'), `${plan.planeChangeDeg.toFixed(1)}°`, 'warn');
      row(t('setup.info.burnsDv'), `${num(plan.dvEstimateBurns)} m/s (${plan.burns.length})`);
    }
    // site coordinates note
    const coords = this.root.querySelector('#site-coordinates');
    if (coords) {
      const lat = `${Math.abs(site.latitude).toFixed(2)}° ${site.latitude < 0 ? 'S' : 'N'}`;
      const lon = `${Math.abs(site.longitude).toFixed(2)}° ${site.longitude < 0 ? 'W' : 'E'}`;
      coords.textContent = t('setup.siteCoordinates', { lat, lon, inc: site.minInclination.toFixed(1) });
    }
  }

  /**
   * Re-measure the headless insertion flight, if this configuration is one
   * worth flying.
   *
   * Two gates, and both matter. The first is *whether to fly at all*: the
   * static budget is right about the overwhelming majority of configurations
   * and costs nothing, so the probe is only run when that budget already says
   * the mission is marginal — the ascent stages short of the orbit they are
   * aimed at, or the payload at 90 % of the rating or above. The second is the
   * cache: a payload slider fires on every value, and the probe is 7-95 ms, so
   * it is flown once per distinct configuration rather than once per event.
   *
   * The signature deliberately leaves out the launch time. Nothing in the
   * ascent or the insertion depends on it — it sets the RAAN the plane is
   * reached at, which the verdict judges from the plan — and including it would
   * re-fly the mission on every tick of the clock control.
   */
  private refreshInsertionProbe(): void {
    const plan = this.planCache;
    const s = this.state;
    if (!plan) {
      this.probeCache = null;
      this.probedFor = '';
      return;
    }
    const spec = openTopVehicle(missionVehicle(s), missionSatellite(s));
    if (!marginalMission(spec, missionSatellite(s), s.payloadMass, plan, s.orbit)) {
      this.probeCache = null;
      this.probedFor = '';
      return;
    }
    const g = this.guidance;
    const sig = `${this.missionSignature()}|${s.boosterRecovery}|${g.kickAngle}|${g.maxTurnRate}|${g.pitchMax}`
      + `|${g.pitchMin}|${g.loftAltitude}|${g.parkingAltitude}|${g.maxAccel}|${g.slewRate}|${g.pitchOverAltitude}`
      + `|${g.kickDuration}|${g.gravityTurnEnd}|${g.maxTimeToGo}`;
    if (sig === this.probedFor && this.probeCache) return;
    this.probedFor = sig;
    // Flown as a point mass whatever the chosen model: a rigid flight is
    // seconds of CPU work on the page's own thread, and the two models reach
    // the same insertions across the fleet (docs/SIXDOF-ACCEPTANCE.md).
    const cfg = this.getConfig();
    try { this.probeCache = probeInsertion({ ...cfg, dynamics: { ...(cfg.dynamics ?? { wind: 'calm', seed: 20260919 }), model: 'pointMass' } }); } catch { this.probeCache = null; }
  }

  /** The current mission's verdict; see `missionVerdict`. */
  feasibility(): Feasibility {
    const s = this.state;
    const site = siteById(s.siteId);
    return missionVerdict({
      spec: openTopVehicle(missionVehicle(s), missionSatellite(s)),
      site,
      orbit: s.orbit,
      satellite: missionSatellite(s),
      payloadMass: s.payloadMass,
      inclinationDeg: resolveTarget(s.orbit, site, s.launchTime).inclination * RAD,
      // The plan made for this very configuration in `refresh()`: the corridor,
      // the ascent margin, the insertion orbit and the burn budget all come
      // from it, so the verdict says what the planner says.
      plan: this.planCache,
      // Measured in `refresh()` for this same configuration, and null unless
      // the static budget said the mission was marginal enough to be worth
      // flying (see `refreshInsertionProbe`).
      insertion: this.probeCache,
      failureMode: s.failure.mode,
      siteReassigned: this.siteReassigned,
    });
  }

  private updateVerdict(): void {
    const note = this.noteEl;
    if (!note) return;
    const v = this.feasibility();
    note.className = `status-note ${v.level}`;
    const text = note.querySelector<HTMLElement>('.status-text');
    if (text) text.textContent = v.text;
    // Explore clamps the sentence to a few lines under its title; all of it is the tooltip
    if (text && this.experience === 'learning') text.title = v.text;
    const title = note.querySelector('.status-title');
    if (title) title.textContent = t(VERDICT_LIGHT[v.level]);
    this.updateFixes(v);
  }

  private cancelTune(): void {
    if (!this.tuneController) return;
    this.tuneController.abort();
    this.tuneController = null;
    this.tuning = false;
    this.tuneMessage = t('setup.tune.cancelled');
    // Draft edits cancel before blur. Refresh only these nodes so focus and
    // the unfinished input are retained, while the cancelled worker's last
    // progress line cannot remain visible as if it were still running.
    for (const message of this.root.querySelectorAll('#tune-msg, .tune-progress')) message.textContent = this.tuneMessage;
    const button = this.root.querySelector<HTMLButtonElement>('[data-action="autotune"]');
    if (button) button.textContent = t('setup.autotune');
  }

  private dynamicsSection(): HTMLElement | null {
    const section = this.el('details');
    section.dataset.section = 'dynamics';
    section.open = true;
    const d = this.state.dynamics ?? { model: 'pointMass', wind: 'calm', seed: 20260919 };
    if (this.experience === 'learning') {
      // Explore: the model is the vehicle's own (named in the computed
      // guidance) and the seed is fixed; the weather is the choice left, and
      // only a six-DOF flight feels the wind.
      if (d.model !== 'sixDof') return null;
      section.append(this.el('summary', undefined, t('setup.weather')));
      section.append(this.select('setup.dynamics.wind', [
        { value: 'calm', label: t('setup.dynamics.calm') }, { value: 'crosswind', label: t('setup.dynamics.crosswind') }, { value: 'shear', label: t('setup.dynamics.shear') },
      ], d.wind, (value) => { this.state.dynamics = { ...(this.state.dynamics ?? d), wind: value as DynamicsConfig['wind'] }; this.changed(); }));
      return section;
    }
    section.append(this.el('summary', undefined, t('setup.dynamics.title')));
    const choices = [{ value: 'pointMass', label: t('setup.dynamics.pointMass') }];
    if (supportsRigid(missionVehicle(this.state))) choices.unshift({ value:'sixDof', label:t('setup.dynamics.sixDof') });
    section.append(this.select('setup.dynamics.model', choices, d.model, value => {
      const next = { ...(this.state.dynamics ?? d), model: value as DynamicsConfig['model'] };
      // Legacy flight hides weather controls. Preserve valid settings for a
      // later return to six-DOF, but repair malformed external state before its
      // editing controls disappear. Ordinary invalid UI drafts are discarded by render().
      if (value === 'pointMass') {
        if (!['calm', 'crosswind', 'shear'].includes(next.wind)) next.wind = 'calm';
        if (!Number.isInteger(next.seed) || next.seed < 0 || next.seed > 0xffffffff) next.seed = defaultDynamics(missionVehicle(this.state)).seed;
      }
      this.state.dynamics = next;
      this.render(); this.changed();
    }));
    section.append(this.el('p', 'field-note', t(supportsRigid(missionVehicle(this.state)) ? 'setup.dynamics.note' : 'setup.dynamics.unsupported')));
    if (d.model === 'sixDof') {
      section.append(this.select('setup.dynamics.wind', [
        {value:'calm',label:t('setup.dynamics.calm')}, {value:'crosswind',label:t('setup.dynamics.crosswind')}, {value:'shear',label:t('setup.dynamics.shear')},
      ],d.wind,value=>{ this.state.dynamics={...(this.state.dynamics ?? d),wind:value as DynamicsConfig['wind']};this.changed(); }));
      section.append(this.number('setup.dynamics.seed',d.seed,value=>{this.state.dynamics={...(this.state.dynamics ?? d),seed:value};this.changed();},1,0,0xffffffff));
    }
    return section;
  }

  /** One shared, bounded full-mission tuner; cancellation terminates its worker. */
  private async autotune(): Promise<void> {
    if (this.tuning || !this.isValid()) return;
    const cfg = this.getConfig();
    const signature = JSON.stringify(cfg);
    const controller = new AbortController();
    this.tuneController = controller;
    this.tuning = true;
    this.tuneMessage = t('setup.autotuning');
    this.render();
    try {
      const outcome = await runTuneJob(cfg, controller.signal, (progress) => {
        if (this.tuneController !== controller) return;
        this.tuneMessage = t(progress.phase === 'ascent' ? 'setup.tune.ascent' : 'setup.tune.mission', { done: progress.completed, total: progress.total });
        for (const msg of this.root.querySelectorAll('#tune-msg, .tune-progress')) msg.textContent = this.tuneMessage;
      });
      if (this.tuneController !== controller || this.running || !this.isValid() || JSON.stringify(this.getConfig()) !== signature) return;
      const best = outcome.best;
      if (best?.missionOnTarget) {
        this.state.guidanceOverrides = { ...best.guidance };
        this.tunedFor = this.missionSignature();
        this.tuneMessage = t('setup.tune.verified', { kick: best.kickAngle, rate: best.maxTurnRate, loft: best.loftAltitude / 1000 });
        this.cb.onChange?.(this.getConfig());
      } else this.tuneMessage = t('setup.tune.noTarget');
    } catch (error) {
      if (this.tuneController === controller) {
        this.tuneMessage = t(error instanceof DOMException && error.name === 'AbortError' ? 'setup.tune.cancelled' : 'setup.tune.error');
      }
    } finally {
      if (this.tuneController === controller) {
        this.tuneController = null;
        this.tuning = false;
        this.render();
      }
    }
  }
}

/** G08: a failure of a kind with its own defaults, at `time` (and `stage`). */
function defaultFault(kind: ControlFaultKind, time: number, stage?: number): ControlFaultSpec {
  const base: ControlFaultSpec = { kind, time, ...(stage !== undefined ? { stage } : {}) };
  const fields = FAULT_FIELDS[kind];
  if (fields.includes('engine')) base.engine = 1;
  if (fields.includes('jet')) base.jet = 1;
  if (fields.includes('units')) base.units = [1];
  if (kind === 'gimbalHardover') { base.axis = 'pitch'; base.sign = 1; } else if (fields.includes('axis') && kind !== 'actuatorPolarity') base.axis = 'pitch';
  const size = FAULT_MAGNITUDE[kind];
  if (size) base.magnitude = size.value;
  return base;
}
