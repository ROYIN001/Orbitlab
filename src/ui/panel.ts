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
import type { MissionConfig, OrbitSpec, GuidanceParams, FailureConfig, FailureMode, SatelliteSpec, VehicleSpec } from '../types';
import { RATING_ORBITS, VEHICLES, vehicleById } from '../data/vehicles';
import { SATELLITES, satelliteById } from '../data/satellites';
import { SITES, siteById, type SiteExtra } from '../data/sites';
import { ORBIT_PRESETS, orbitById } from '../data/orbits';
import { DEFAULT_FAILURE, guidanceForVehicle } from '../physics/defaults';
import { liftoffMass, liftoffThrust, idealDeltaV, VehicleModel } from '../physics/vehicle';
import {
  planMission, launchWindows, resolveTarget, inclinationCorridor, canBurnAfterAscent,
  apsisTolerance, perigeeTolerance, ASCENT_MARGIN_REQUIRED, RAAN_TOLERANCE, type MissionPlan,
} from '../physics/mission';
import { wrapPi } from '../physics/orbital';
import { probeInsertion, type InsertionProbe } from '../physics/autotune';
import { runTuneJob } from '../physics/tune-job';
import { DEG, G0, RAD } from '../physics/constants';
import { t, getLang } from '../i18n';
import { localized, satelliteName, siteName, stageName, vehicleManufacturer, vehicleNotes } from './names';
import { GUIDANCE_FIELDS, NUMBER_FIELDS, guidanceLimits, parseNumberField, parseUtcDateTime, validateConfigInput, type ValidationIssue } from '../config/validation';
import { quickstartMission, type QuickstartId } from './quickstart';
import { loadExperience, saveExperience, type ExperienceMode } from './experience';

export interface SetupCallbacks {
  onLaunch: (cfg: MissionConfig) => void;
  onReset: () => void;
  onChange?: (cfg: MissionConfig) => void;
}

interface SetupState {
  vehicleId: string;
  satelliteId: string;
  siteId: string;
  orbitId: string;
  orbit: OrbitSpec;
  launchTime: Date;
  /** operator edits layered on top of the vehicle's resolved guidance */
  guidanceOverrides: Partial<GuidanceParams>;
  failure: FailureConfig;
  boosterRecovery: boolean;
  payloadMass: number;
}

/** Which rated payload figure a target orbit should be measured against. */
export type OrbitClass = 'leo' | 'sso' | 'gto';

export interface Feasibility {
  level: 'ok' | 'warn' | 'fail';
  text: string;
}

const FAILURE_MODES: FailureMode[] = ['none', 'engineOut', 'thrustLoss', 'prematureSep', 'fairingStuck', 'rangeSafety', 'random'];

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

const orbitName = (o: OrbitSpec): string => localized(`orbit.${o.id}.name`, o.name);
const orbitDesc = (o: OrbitSpec): string => localized(`orbit.${o.id}.desc`, o.description);
const orbitShort = (o: OrbitSpec): string => localized(`orbit.${o.id}.short`, o.id.toUpperCase());

/** Which payload rating this target should be judged against. */
export function orbitClassOf(orbit: OrbitSpec): OrbitClass {
  if (orbit.apogee >= 30000e3) return 'gto';
  if (orbit.raanMode === 'ltan' || orbit.inclination === 'sso') return 'sso';
  if (typeof orbit.inclination === 'number' && orbit.inclination >= 95) return 'sso';
  return 'leo';
}

/**
 * The vehicle's rated payload for an orbit class, and the class the figure
 * actually belongs to. A vehicle with no published SSO figure is judged on its
 * LEO rating, and says so, rather than being failed for missing data.
 */
export function ratedPayload(spec: VehicleSpec, cls: OrbitClass): { cap: number; cls: OrbitClass } {
  if (cls === 'gto') return { cap: spec.payloadGTO, cls: 'gto' };
  if (cls === 'sso') return spec.payloadSSO ? { cap: spec.payloadSSO, cls: 'sso' } : { cap: spec.payloadLEO, cls: 'leo' };
  return { cap: spec.payloadLEO, cls: 'leo' };
}

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

/**
 * What the mission plan says about this stack's ability to DELIVER the orbit,
 * as opposed to its ability to lift the mass (release review 2, major #3).
 *
 * Every number here is the planner's own, evaluated with the planner's own
 * thresholds, so the verdict and the flight cannot drift apart:
 *
 * - `ascentShortfall` is `MissionPlan.ascentMargin` against
 *   `ASCENT_MARGIN_REQUIRED` — the ideal Δv of the stages that have to fly the
 *   ascent, minus what the mission's own orbit costs them. It is the same test
 *   `tests/fleet-defaults.test.ts` files a row under `BEYOND_CAPABILITY` with.
 * - `stranded` is the `ARCHITECTURE` case: nothing in the stack can light an
 *   engine after cut-off (`canBurnAfterAscent`), so the orbit the ascent cuts
 *   off in is final — and the plan's own insertion orbit is not the mission's,
 *   judged by the acceptance bands the simulation itself uses. Long March 2D
 *   from Jiuquan to a 600 km sun-synchronous orbit is exactly this: two
 *   hypergolic stages, no restart, an inert payload, and a direct insertion
 *   that closes at 200 km.
 * - `burnShortfall` is a BOUND, not an estimate: whatever is left when the
 *   ascent cuts off, the stage that has to fly the post-ascent burns can never
 *   deliver more than its own ideal Δv (plus the spacecraft's), and the plan
 *   asks it for `dvEstimateBurns`. The fairing is gone by then, so it is not
 *   carried.
 *
 * Deliberately still not a headless flight (see `missionVerdict`): what this
 * cannot see is the ascent LOSSES, which is why a row like `pslvxl/gto/50` —
 * short of nothing on paper and out of propellant in the air — is invisible
 * here and is recorded as such in tests/panel-verdict.test.ts.
 */
export interface Capability {
  /**
   * m/s the ascent stages are short of this orbit, 0 when they are not short.
   * Measured against the line the planner itself draws — the orbit's cost PLUS
   * `ASCENT_MARGIN_REQUIRED` — so a stack that clears the cost with no margin
   * to spare still reports the margin it is missing.
   */
  ascentShortfall: number;
  /** nothing in the stack can light an engine after the ascent cuts off */
  singleShot: boolean;
  /** …and the orbit it cuts off in is not the mission's */
  stranded: boolean;
  /** m/s the post-ascent burns exceed what can possibly fly them, 0 when they do not */
  burnShortfall: number;
}

export function missionCapability(
  spec: VehicleSpec, satellite: SatelliteSpec, payloadMass: number, plan: MissionPlan,
): Capability {
  const singleShot = !canBurnAfterAscent(spec, satellite, plan.weakFinalStage);
  const onTarget = Math.abs(plan.insertionApoapsis - plan.target.apogee) <= apsisTolerance(plan.target.apogee)
    && Math.abs(plan.insertionAltitude - plan.target.perigee) <= perigeeTolerance(plan.target);
  const last = spec.stages[spec.stages.length - 1];
  // The kick stage never flies the ascent, and a restartable last stage can
  // light again; anything else has nothing left to give the burns but the
  // spacecraft's own engine.
  const relights = plan.weakFinalStage || last.restartable === true;
  const afterAscent = (relights ? new VehicleModel({ ...spec, stages: [last], fairing: null }, payloadMass).deltaVRemaining() : 0)
    + new VehicleModel(spec, payloadMass, false, satellite).spacecraftDeltaV();
  return {
    ascentShortfall: Math.max(0, ASCENT_MARGIN_REQUIRED - plan.ascentMargin),
    singleShot,
    stranded: singleShot && !onTarget,
    burnShortfall: Math.max(0, plan.dvEstimateBurns - afterAscent),
  };
}

/** Everything the verdict is derived from. Pure data, so it can be tested without a DOM. */
export interface VerdictInput {
  spec: VehicleSpec;
  site: SiteExtra;
  orbit: OrbitSpec;
  /** what is being flown, for its own propulsion and its rated mass */
  satellite: SatelliteSpec;
  payloadMass: number;
  /** resolved target inclination, deg */
  inclinationDeg: number;
  /**
   * The mission plan for this configuration, or null when the planner rejected
   * it. Everything the verdict says about DELIVERING the orbit — the corridor,
   * the ascent margin, the insertion orbit, the burn budget — comes from here,
   * so the verdict cannot promise something the planner does not.
   */
  plan: MissionPlan | null;
  failureMode: FailureMode;
  /** the vehicle forced a different site and the change has not been reported yet */
  siteReassigned: boolean;
  /**
   * A headless flight of the ascent and the insertion, when one was run.
   *
   * The verdict is still a static budget everywhere else, and deliberately so.
   * This is the single question the budget provably cannot answer — *does the
   * stack get into orbit at all?* — because for a stack that carries a kick
   * stage the answer turns on the ascent LOSSES, which is the one term only a
   * flight measures (`probeInsertion` carries the measurement that rules out
   * the static alternatives). Left null the verdict behaves exactly as it did.
   *
   * `SetupPanel` runs it only when the static budget already says the mission
   * is marginal — the ascent stages short of the orbit, or the payload at 90 %
   * of the rating or above — so a comfortable configuration still costs
   * nothing, and a marginal one costs the 7-95 ms the probe measures at.
   */
  insertion?: InsertionProbe | null;
}

/**
 * Pre-flight feasibility verdict (audit B12), from data and the mission plan.
 *
 * Ordering is by how badly the mission is broken: no rating, over-capacity, a
 * target outside the site's range-safety corridor and a stack that cannot
 * deliver the orbit are failures; an unreachable inclination costs a plane
 * change; the site reassignment is news about what the user just did; and the
 * rest are margins and caveats on a mission that will fly.
 *
 * **An armed failure is reported whatever else is true.** It used to be the
 * last branch of the chain, so the shipped default mission — permanently tight
 * at 7 150 of 7 430 kg — never mentioned it: arming "Range-safety destruct"
 * left the note reading "Tight margin…" and the flight then ended with
 * `evt.ftsCommanded` at T+70 s (release review 2, minor #4). An armed
 * loss-of-vehicle is more important news than a 96 % margin, so it is written
 * FIRST and the rest of the verdict follows it, rather than being ordered
 * against it.
 *
 * `siteReassigned` is deliberately a **one-shot** input, cleared by the panel
 * as soon as it has been shown. Left sticky it masked every later verdict:
 * once the user picked a vehicle that does not fly from the selected site, the
 * note stayed on "this vehicle does not fly from the previous site" for the
 * rest of the session and never reported a tight margin, an over-capacity
 * payload or an armed failure again.
 *
 * Deliberately not a headless flight, with one exception: a full mission costs
 * tens of milliseconds per keystroke, and `runAscent` stops at the parking
 * orbit, so it reports success for missions that later run out of propellant
 * and failure for missions whose coast outlives its 2400 s horizon. The
 * exception is `VerdictInput.insertion`, which asks only whether the stack
 * reaches an orbit at all — the question stopping at the parking orbit
 * answers — and is supplied by the caller rather than run here.
 */
export function missionVerdict(i: VerdictInput): Feasibility {
  const cls = orbitClassOf(i.orbit);
  const { cap, cls: capCls } = ratedPayload(i.spec, cls);
  const className = t(`orbit.class.${capCls}`);
  // Written first and carried into whatever the rest of the verdict turns out
  // to be, so no branch below can return without it.
  const armed = i.failureMode !== 'none' ? t('setup.verdict.failureArmed', { mode: t(`setup.fail.${i.failureMode}`) }) : '';
  const planeError = i.plan && i.plan.target.raan !== null
    ? Math.abs(wrapPi(i.plan.raanExpected - i.plan.target.raan)) : 0;
  const planeWarning = planeError > RAAN_TOLERANCE
    ? t('setup.verdict.offWindow', { error: (planeError * RAD).toFixed(1) }) : '';
  const say = (level: Feasibility['level'], ...clauses: string[]): Feasibility =>
    ({ level: planeWarning && level === 'ok' ? 'warn' : level,
      text: [armed, planeWarning, ...clauses].filter((s) => s !== '').join(' ') });

  if (cap <= 0) {
    return say('fail', t('setup.verdict.noRating', { vehicle: i.spec.name, class: t(`orbit.class.${cls}`) }));
  }
  if (i.payloadMass > cap) {
    return say('fail', t('setup.verdict.overCapacity', { mass: num(i.payloadMass), cap: num(cap), class: className, vehicle: i.spec.name }));
  }
  // Range safety before performance: a heading the site may not fly is not a
  // margin the operator can trade, and no amount of Δv buys it.
  const corridor = inclinationCorridor(i.site, i.inclinationDeg * DEG);
  if (corridor === 'aboveCorridor') {
    return say('fail', t('setup.verdict.corridor', {
      inc: i.inclinationDeg.toFixed(1), site: siteName(i.site),
      min: i.site.minInclination.toFixed(1), max: i.site.maxInclination.toFixed(1),
    }));
  }
  const capability = i.plan ? missionCapability(i.spec, i.satellite, i.payloadMass, i.plan) : null;
  if (capability && i.plan) {
    // Nothing can burn after cut-off, so the ascent has to BE the mission: the
    // two ways that fails are not having the Δv for the orbit and not being
    // able to arrive on it (direct insertion closes at DIRECT_INSERTION_CEILING).
    if (capability.singleShot && capability.ascentShortfall > 0) {
      return say('fail', t('setup.verdict.beyondCapability', { dv: num(Math.round(capability.ascentShortfall)), vehicle: i.spec.name }));
    }
    if (capability.stranded) {
      return say('fail', t('setup.verdict.noRestart', {
        alt: num(Math.round(i.plan.insertionAltitude / 1000)), ap: num(Math.round(i.plan.insertionApoapsis / 1000)),
        pe: num(Math.round(i.plan.target.perigee / 1000)), target: num(Math.round(i.plan.target.apogee / 1000)),
      }));
    }
    if (capability.burnShortfall > 0) {
      return say('fail', t('setup.verdict.burnBudget', {
        dv: num(Math.round(i.plan.dvEstimateBurns)), have: num(Math.round(i.plan.dvEstimateBurns - capability.burnShortfall)),
      }));
    }
  }
  // Last of the capability failures, because it is the least specific: the
  // three above name what is missing, this one only reports that the flight was
  // made and the stack did not get into orbit. It is also the only one that can
  // see an ascent-loss shortfall, which is why the note it replaces was wrong —
  // "the upper stage has to make up the difference" is true of Proton-M/Briz-M
  // right up to the payload at which the upper stage cannot, and a 19.6 kN
  // Briz-M under 29 t stops being able to somewhere between 5.75 t and 7.15 t.
  if (i.insertion && !i.insertion.reachesOrbit) {
    return say('fail', t('setup.verdict.noInsertion', { vehicle: i.spec.name }));
  }
  const reachable = i.plan ? i.plan.inclinationReachable : corridor === 'ok';
  if (!reachable) {
    return say('warn', t('setup.verdict.inclination', { inc: i.inclinationDeg.toFixed(1), site: siteName(i.site), min: i.site.minInclination.toFixed(1) }));
  }
  if (i.siteReassigned) {
    return say('warn', t('setup.verdict.siteChanged', { site: siteName(i.site) }));
  }
  const notes: string[] = [];
  // Short on paper, but something above the ascent can make it up — which is
  // how Proton-M and Angara-A5 fly every one of their missions in this model,
  // their three or four core stages being short of a direct ascent and the
  // Briz-M finishing the job. Reported rather than hidden, and not a failure.
  if (capability && capability.ascentShortfall > 0) {
    notes.push(t('setup.verdict.ascentShort', { dv: num(Math.round(capability.ascentShortfall)) }));
  }
  // At or above 90 % of the rating. Inclusive: the fleet matrix's own 90 % rows
  // land exactly on this line, and several of them are `BEYOND_CAPABILITY`.
  if (i.payloadMass >= cap * 0.9) {
    notes.push(t('setup.verdict.tight', { mass: num(i.payloadMass), cap: num(cap), class: className }));
  }
  if (armed !== '' || notes.length > 0) return say('warn', ...notes);
  return say('ok', t('setup.verdict.readyMargin', { mass: num(i.payloadMass), cap: num(cap), class: className }));
}

export class SetupPanel {
  readonly root: HTMLElement;
  private cb: SetupCallbacks;
  state: SetupState;
  private running = false;
  private tuning = false;
  private tuneController: AbortController | null = null;
  private tuneMessage = '';
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
    };
    this.tunedFor = this.missionSignature();
    this.render();
  }

  /** The guidance that will be flown: the vehicle's own programme plus operator edits. */
  get guidance(): GuidanceParams {
    return { ...guidanceForVehicle(vehicleById(this.state.vehicleId)), ...this.state.guidanceOverrides };
  }

  getConfig(): MissionConfig {
    if (!this.isValid()) throw new Error(t('setup.validation.summary'));
    const s = this.state;
    return {
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: { ...s.orbit },
      launchTime: new Date(s.launchTime.getTime()), guidance: this.guidance, failure: { ...s.failure },
      boosterRecovery: s.boosterRecovery, payloadMassOverride: s.payloadMass,
      // the values above are already merged with the vehicle's own programme
      guidanceResolved: true,
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
    if (issues.length && this.noteEl) {
      this.noteEl.className = 'status-note fail';
      const text = this.noteEl.querySelector('.status-text');
      if (text) text.textContent = t('setup.validation.summary');
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
    this.fieldDrafts.clear();
    this.inputIssues.clear();
    this.siteReassigned = !!opts?.siteReassigned;
    this.tunedFor = this.missionSignature();
    this.render();
    const verdict = this.feasibility();
    this.siteReassigned = false;
    return verdict;
  }

  /** What an auto-tune result is valid for: change any of it and the tune is stale. */
  private missionSignature(): string {
    const s = this.state;
    return JSON.stringify({ vehicle: s.vehicleId, site: s.siteId, orbit: s.orbit,
      payload: s.payloadMass, satellite: s.satelliteId, launchTime: s.launchTime,
      failure: s.failure, recovery: s.boosterRecovery });
  }

  // ─── element helpers ──────────────────────────────────────────────────────

  private el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  private select(labelKey: string, options: { value: string; label: string }[], value: string, onChange: (v: string) => void): HTMLElement {
    const lab = this.el('label', 'field');
    lab.appendChild(this.el('span', undefined, t(labelKey)));
    const sel = this.el('select');
    sel.setAttribute('aria-label', t(labelKey));
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
    const stored = def ? guidanceLimits(def.key, vehicleById(this.state.vehicleId)) : null;
    const limits = def && stored
      ? { min: stored.min === undefined ? undefined : stored.min / def.scale, max: stored.max === undefined ? undefined : stored.max / def.scale }
      : NUMBER_FIELDS[labelKey] ?? { min, max };
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
        this.cancelTune();
        Object.assign(this.state, quickstartMission(option.id));
        this.tuneMessage = '';
        this.applyExternalEdit();
        this.cb.onChange?.(this.getConfig());
      });
      section.append(button);
    }
    return section;
  }

  private experienceSection(): HTMLElement {
    const section = this.el('section', 'config-section experience-section');
    const label = this.el('label', 'field experience-label');
    label.append(this.el('span', undefined, t('setup.mode.label')));
    const select = this.el('select');
    select.id = 'experience-mode';
    select.setAttribute('aria-label', t('setup.mode.label'));
    for (const [value, text] of [['learning', t('setup.mode.learning')], ['advanced', t('setup.mode.advanced')]]) {
      const option = this.el('option', undefined, text);
      option.value = value;
      option.selected = this.experience === value;
      select.append(option);
    }
    select.addEventListener('change', () => {
      this.experience = select.value as ExperienceMode;
      saveExperience(this.experience);
      this.render();
      if (this.experience === 'advanced') {
        const guidance = this.root.querySelector<HTMLDetailsElement>('details[data-section="guidance"]');
        if (guidance) guidance.open = true;
      }
    });
    label.append(select);
    section.append(label, this.el('p', 'field-note', t(this.experience === 'learning' ? 'setup.mode.learningNote' : 'setup.mode.advancedNote')));
    if (this.experience === 'learning') section.append(this.el('p', 'field-note experience-glossary', t('setup.mode.glossary')));
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
    const root = this.root;
    const openDetails = new Map(Array.from(root.querySelectorAll<HTMLDetailsElement>('details[data-section]'), (details) => [details.dataset.section!, details.open]));
    const active = document.activeElement as HTMLElement | null;
    const focusName = active && root.contains(active) ? active.getAttribute('aria-label') : null;
    const caret = active instanceof HTMLInputElement && active.type !== 'number' ? active.selectionStart : null;
    root.setAttribute('aria-label', t('a11y.setupPanel'));
    root.dataset.experience = this.experience;
    this.fieldInputs.clear();
    root.replaceChildren();
    const vehicle = vehicleById(s.vehicleId);
    if (!vehicle.sites.includes(s.siteId)) {
      s.siteId = vehicle.sites[0];
      this.siteReassigned = true;
    }

    s.failure.stage = Math.min(s.failure.stage, vehicle.stages.length - 1);

    // heading
    const heading = this.el('div', 'panel-heading');
    const headLeft = this.el('div');
    headLeft.appendChild(this.el('span', 'eyebrow', t('app.missionControl')));
    headLeft.appendChild(this.el('h1', undefined, t('app.buildMission')));
    heading.appendChild(headLeft);
    heading.appendChild(this.el('span', 'step-count', '01—03'));
    root.appendChild(heading);

    const scroll = this.el('div', 'setup-scroll');
    root.appendChild(scroll);
    scroll.appendChild(this.experienceSection());
    scroll.appendChild(this.quickstartSection());

    // ── 01 vehicle & site ───────────────────────────────────────────────────
    const s1 = this.el('section', 'config-section');
    s1.appendChild(this.sectionTitle('01', 'setup.step.vehicle'));
    s1.appendChild(this.select('setup.vehicle', VEHICLES.map((v) => ({ value: v.id, label: `${v.name} (${v.country})` })), s.vehicleId, (v) => {
      s.vehicleId = v;
      const spec = vehicleById(v);
      this.siteReassigned = false;
      if (!spec.sites.includes(s.siteId)) { s.siteId = spec.sites[0]; this.siteReassigned = true; }
      if (!spec.recoverable) s.boosterRecovery = false;
      this.render();
      this.changed();
    }));
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
    s1.appendChild(this.select('setup.site', SITES.filter((x) => vehicle.sites.includes(x.id)).map((x) => ({ value: x.id, label: siteName(x) })), s.siteId, (v) => {
      s.siteId = v;
      this.siteReassigned = false;
      this.render();
      this.changed();
    }));
    const coords = this.el('p', 'field-note');
    coords.id = 'site-coordinates';
    s1.appendChild(coords);
    scroll.appendChild(s1);

    // ── 02 payload ──────────────────────────────────────────────────────────
    const s2 = this.el('section', 'config-section');
    s2.appendChild(this.sectionTitle('02', 'setup.step.payload'));
    s2.appendChild(this.select('setup.satellite', SATELLITES.map((x) => ({ value: x.id, label: satelliteName(x) })), s.satelliteId, (v) => {
      this.clearOrbitDrafts();
      this.clearFieldDrafts('setup.payloadMass');
      s.satelliteId = v;
      const sat = satelliteById(v);
      s.payloadMass = sat.mass;
      const typical = orbitById(sat.typicalOrbit);
      s.orbitId = typical.id;
      s.orbit = { ...typical };
      this.render();
      this.changed();
    }));
    s2.appendChild(this.number('setup.payloadMass', s.payloadMass, (v) => { s.payloadMass = v; this.changed(); }, 10, 1));
    scroll.appendChild(s2);

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
    orbitRow2.appendChild(this.number('setup.argPerigee', s.orbit.argPerigee, (v) => { this.customise(); s.orbit.argPerigee = v; this.changed(); }, 1, 0, 360));
    s3.appendChild(orbitRow2);
    s3.appendChild(this.select('setup.raanMode', [
      { value: 'free', label: t('setup.raanFree') }, { value: 'fixed', label: t('setup.raanFixed') },
      { value: 'iss', label: t('setup.raanIss') }, { value: 'ltan', label: t('setup.raanLtan') },
    ], s.orbit.raanMode, (v) => { this.customise(); s.orbit.raanMode = v as OrbitSpec['raanMode']; this.render(); this.changed(); }));
    if (s.orbit.raanMode === 'fixed') s3.appendChild(this.number('setup.raan', s.orbit.raan ?? 0, (v) => { s.orbit.raan = v; this.changed(); }, 1, 0, 360));
    if (s.orbit.raanMode === 'ltan') s3.appendChild(this.number('setup.ltan', s.orbit.ltan ?? 10.5, (v) => { s.orbit.ltan = v; this.changed(); }, 0.25, 0, 24));

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
    scroll.appendChild(s3);

    // ── collapsible: guidance / failure / options ───────────────────────────
    const s4 = this.el('section', 'config-section');
    s4.appendChild(this.guidanceSection());
    s4.appendChild(this.failureSection(vehicle));
    s4.appendChild(this.optionsSection(vehicle));
    scroll.appendChild(s4);

    // ── launch area ─────────────────────────────────────────────────────────
    const area = this.el('div', 'launch-area');
    const note = this.el('p', 'status-note');
    note.id = 'mission-note';
    note.setAttribute('aria-live', 'polite');
    note.appendChild(this.el('span', 'status-dot'));
    note.appendChild(this.el('span', 'status-text'));
    this.noteEl = note;
    area.appendChild(note);
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
    reset.addEventListener('click', () => {
      this.cancelTune();
      this.fieldDrafts.clear();
      this.inputIssues.clear();
      this.running = false;
      this.render();
      this.cb.onReset();
    });
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

  private guidanceSection(): HTMLElement {
    const gd = this.el('details');
    gd.dataset.section = 'guidance';
    gd.appendChild(this.el('summary', undefined, t('setup.guidance')));
    const g = this.guidance;
    const set = (k: keyof GuidanceParams, v: number): void => {
      this.state.guidanceOverrides[k] = v;
      // an explicit edit belongs to this mission too
      this.tunedFor = this.missionSignature();
      this.changed();
    };
    gd.appendChild(this.el('p', 'field-note', t('setup.guidanceNote')));
    const parameters = this.el('div', 'guidance-parameters');
    gd.append(parameters);
    const reveal = this.el('button', 'btn guidance-reveal', t('setup.mode.reveal'));
    reveal.type = 'button';
    reveal.addEventListener('click', () => {
      this.experience = 'advanced';
      saveExperience(this.experience);
      this.render();
      const details = this.root.querySelector<HTMLDetailsElement>('details[data-section="guidance"]');
      if (details) details.open = true;
    });
    gd.append(reveal);
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
    const tuneBtn = this.el('button', 'btn', this.tuning ? t('setup.tune.cancel') : t('setup.autotune'));
    tuneBtn.type = 'button';
    tuneBtn.dataset.action = 'autotune';
    tuneBtn.disabled = this.running || (!this.tuning && !this.isValid());
    tuneBtn.addEventListener('click', () => {
      if (this.tuning) { this.cancelTune(); this.render(); }
      else void this.autotune();
    });
    gd.appendChild(tuneBtn);
    gd.appendChild(this.el('p', 'field-note', t('setup.autotuneScope')));
    const tuneMsg = this.el('div', 'progress', this.tuneMessage);
    tuneMsg.id = 'tune-msg';
    gd.appendChild(tuneMsg);
    return gd;
  }

  private failureSection(vehicle: VehicleSpec): HTMLElement {
    const s = this.state;
    const fd = this.el('details');
    fd.dataset.section = 'failure';
    fd.appendChild(this.el('summary', undefined, t('setup.failure')));
    fd.appendChild(this.select('setup.failureMode', FAILURE_MODES.map((m) => ({ value: m, label: t(`setup.fail.${m}`) })), s.failure.mode, (v) => { s.failure.mode = v as FailureMode; this.changed(); }));
    const fr = this.el('div', 'row');
    fr.appendChild(this.number('setup.failureTime', s.failure.time, (v) => { s.failure.time = v; this.changed(); }, 5, 0, 2000));
    fr.appendChild(this.select('setup.failureStage', vehicle.stages.map((st, i) => ({ value: String(i), label: `${i + 1}: ${stageName(vehicle.id, st.id, st.name)}` })), String(Math.min(s.failure.stage, vehicle.stages.length - 1)), (v) => { s.failure.stage = Number(v); this.changed(); }));
    fd.appendChild(fr);
    return fd;
  }

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
    cb.addEventListener('change', () => { s.boosterRecovery = cb.checked; this.changed(); });
    chk.appendChild(cb);
    chk.appendChild(this.el('span', undefined, t('setup.boosterRecovery')));
    od.appendChild(chk);
    return od;
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
    try { this.planCache = planMission(this.getConfig(), siteById(this.state.siteId), vehicleById(this.state.vehicleId)); } catch { this.planCache = null; }
    this.refreshInsertionProbe();
    this.updateStats();
    this.updateWindows();
    this.updateInfo();
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
    const spec = vehicleById(s.vehicleId);
    const sat = satelliteById(s.satelliteId);
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
    const spec = vehicleById(s.vehicleId);
    const site = siteById(s.siteId);
    const sat = satelliteById(s.satelliteId);
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
    const spec = vehicleById(s.vehicleId);
    const capability = missionCapability(spec, satelliteById(s.satelliteId), s.payloadMass, plan);
    const { cap } = ratedPayload(spec, orbitClassOf(s.orbit));
    const marginal = capability.ascentShortfall > 0 || (cap > 0 && s.payloadMass >= cap * 0.9);
    if (!marginal) {
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
    try { this.probeCache = probeInsertion(this.getConfig()); } catch { this.probeCache = null; }
  }

  /** The current mission's verdict; see `missionVerdict`. */
  feasibility(): Feasibility {
    const s = this.state;
    const site = siteById(s.siteId);
    return missionVerdict({
      spec: vehicleById(s.vehicleId),
      site,
      orbit: s.orbit,
      satellite: satelliteById(s.satelliteId),
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
    const text = note.querySelector('.status-text');
    if (text) text.textContent = v.text;
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
    const message = this.root.querySelector('#tune-msg');
    if (message) message.textContent = this.tuneMessage;
    const button = this.root.querySelector<HTMLButtonElement>('[data-action="autotune"]');
    if (button) button.textContent = t('setup.autotune');
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
        const msg = this.root.querySelector('#tune-msg');
        if (msg) msg.textContent = this.tuneMessage;
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

