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
import { RATING_ORBITS, VEHICLES, missionVehicle, vehicleById, vehicleDataId } from '../data/vehicles';
import { SATELLITES, satelliteById } from '../data/satellites';
import { SITES, siteById, type SiteExtra } from '../data/sites';
import { ORBIT_PRESETS, orbitById } from '../data/orbits';
import { DEFAULT_FAILURE, guidanceForVehicle } from '../physics/defaults';
import { liftoffMass, liftoffThrust, idealDeltaV, VehicleModel } from '../physics/vehicle';
import {
  planMission, launchWindows, resolveTarget, inclinationCorridor, maxInclinationFor, canBurnAfterAscent,
  apsisTolerance, perigeeTolerance, ASCENT_MARGIN_REQUIRED, RAAN_TOLERANCE, type MissionPlan,
} from '../physics/mission';
import { wrapPi } from '../physics/orbital';
import { probeInsertion, type InsertionProbe } from '../physics/autotune';
import { runTuneJob } from '../physics/tune-job';
import { DEG, G0, RAD } from '../physics/constants';
import { t, getLang } from '../i18n';
import { localized, satelliteName, siteName, stageName, vehicleManufacturer, vehicleNotes, zoneName } from './names';
import { FAILURE_MODES, GUIDANCE_FIELDS, failureAvailable, fieldLimits, flightHomeCapable, guidanceLimits, parseNumberField, parseUtcDateTime, validateConfigInput, type ValidationIssue, type ConfigInput } from '../config/validation';
import { landingZonesForSite } from '../data/landing-zones';
import { quickstartMission, type QuickstartId } from './quickstart';
import { loadExperience, saveExperience, type ExperienceMode } from './experience';
import { defaultDynamics, supportsRigid } from '../physics/rigid/config';
import { SHIP_RETURN_VERIFIED_PAYLOAD } from '../physics/sim/ship-descent';
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
import { MissionShare } from './mission-share';

export interface SetupCallbacks {
  onLaunch: (cfg: MissionConfig) => void;
  onReset: () => void;
  onChange?: (cfg: MissionConfig) => void;
  /**
   * The user asked for the other layout from inside the panel (its mode
   * select, or "Show advanced guidance parameters"). The app owns the mode —
   * it is also in the URL and the top bar — so the panel reports the request
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

/** Which rated payload figure a target orbit should be measured against. */
export type OrbitClass = 'leo' | 'sso' | 'gto';

export interface Feasibility {
  level: 'ok' | 'warn' | 'fail';
  text: string;
}


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
    // The upper bound quoted is the one the check used — the reach of the
    // site's azimuth window — not the declared `maxInclination`, which is the
    // same figure rounded and could print a different last digit.
    return say('fail', t('setup.verdict.corridor', {
      inc: i.inclinationDeg.toFixed(1), site: siteName(i.site),
      min: i.site.minInclination.toFixed(1), max: (maxInclinationFor(i.site) * RAD).toFixed(1),
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
  // A suborbital ship brings its payload home with it, and it has only been
  // flown home with so much (`SHIP_RETURN_VERIFIED_PAYLOAD`).
  if (i.orbit.suborbital && i.payloadMass > SHIP_RETURN_VERIFIED_PAYLOAD) {
    notes.push(t('setup.verdict.suborbitalHeavy', { mass: num(i.payloadMass), max: num(SHIP_RETURN_VERIFIED_PAYLOAD) }));
  }
  // A dogleg is how the site flies this plane, not a problem with the mission:
  // said, but it does not turn a ready verdict into a warning.
  const dogleg = i.plan && i.plan.doglegDeg > 0
    ? t('setup.verdict.dogleg', { site: siteName(i.site), deg: i.plan.doglegDeg.toFixed(1) }) : '';
  if (armed !== '' || notes.length > 0) return say('warn', ...notes, dogleg);
  return say('ok', t('setup.verdict.readyMargin', { mass: num(i.payloadMass), cap: num(cap), class: className }), dogleg);
}

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
    if (!mission.dynamics) this.state.dynamics = undefined;
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
      payload: s.payloadMass, satellite: s.satelliteId, launchTime: s.launchTime,
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
      const mode = select.value as ExperienceMode;
      if (this.cb.onExperience) this.cb.onExperience(mode); else this.setExperience(mode);
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
    if (this.experience === 'advanced') scroll.appendChild(this.notationSection());
    scroll.appendChild(this.quickstartSection());
    scroll.appendChild(this.share.section());

    // ── 01 vehicle & site ───────────────────────────────────────────────────
    const s1 = this.el('section', 'config-section');
    s1.appendChild(this.sectionTitle('01', 'setup.step.vehicle'));
    // S02: a custom vehicle (from a mission file) is offered beside the catalogue until another is picked
    const custom = s.vehicleSpec ? [{ value: s.vehicleSpec.id, label: t('setup.vehicle.custom', { name: s.vehicleSpec.name }) }] : [];
    s1.appendChild(this.select('setup.vehicle', [...custom, ...VEHICLES.map((v) => ({ value: v.id, label: `${v.name} (${v.country})` }))], s.vehicleId, (v) => {
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
      s.recoveryPlan = undefined;
      s.padId = undefined;
      // only a ship that flies itself home can take a suborbital target
      if (s.orbit.suborbital && !flightHomeCapable(spec)) s.orbit = this.orbitalAgain(s.orbit);
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
    const siteField = this.select('setup.site', SITES.filter((x) => vehicle.sites.includes(x.id)).map((x) => ({ value: x.id, label: siteName(x) })), s.siteId, (v) => {
      s.siteId = v;
      s.recoveryPlan = undefined;
      s.padId = undefined;
      this.siteReassigned = false;
      this.render();
      this.changed();
    });
    // Sites no vehicle flies from yet (roadmap C04), shown for what they are
    const unflown = SITES.filter((x) => !VEHICLES.some((v) => v.sites.includes(x.id)));
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
    if (flightHomeCapable(vehicle)) s3.appendChild(this.suborbitalOption());
    s3.appendChild(this.select('setup.raanMode', [
      { value: 'free', label: t('setup.raanFree') }, { value: 'fixed', label: t('setup.raanFixed') },
      { value: 'iss', label: t('setup.raanIss') }, { value: 'ltan', label: t('setup.raanLtan') },
    ], s.orbit.raanMode, (v) => { this.customise(); s.orbit.raanMode = v as OrbitSpec['raanMode']; this.render(); this.changed(); }));
    if (s.orbit.raanMode === 'fixed') s3.appendChild(this.number('setup.raan', s.orbit.raan ?? 0, (v) => { s.orbit.raan = v; this.changed(); }, 1, 0, 360));
    if (s.orbit.raanMode === 'ltan') s3.appendChild(this.number('setup.ltan', s.orbit.ltan ?? 10.5, (v) => { s.orbit.ltan = v; this.changed(); }, 0.25, 0, 24));
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
    scroll.appendChild(s3);

    // ── collapsible: guidance / failure / options ───────────────────────────
    const s4 = this.el('section', 'config-section');
    s4.appendChild(this.dynamicsSection());
    if (this.experience === 'advanced' && this.state.dynamics?.model === 'sixDof') s4.appendChild(this.flexSection());
    if (this.experience === 'advanced' && this.state.dynamics?.model === 'sixDof') s4.appendChild(this.controlSection());
    if (this.experience === 'advanced' && this.state.dynamics?.model === 'sixDof') s4.appendChild(this.navigationSection());
    if (this.experience === 'advanced' && this.state.dynamics?.model === 'sixDof') s4.appendChild(this.faultsSection());
    if (this.experience === 'advanced') s4.appendChild(this.explicitGuidanceSection());
    if (this.experience === 'advanced' && this.cb.onMonteCarlo) s4.appendChild(this.monteCarloSection());
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
      if (this.cb.onExperience) this.cb.onExperience('advanced'); else this.setExperience('advanced');
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
    // only the failures this vehicle and payload can have (a launch abort needs an escape system)
    const modes = FAILURE_MODES.filter((m) => m === s.failure.mode || failureAvailable(m, vehicle, s.satelliteId));
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
    if (vehicle.recoverable && s.boosterRecovery) od.appendChild(this.recoveryChoices(vehicle));
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
    return rendezvousAvailable(vehicleDataId(missionVehicle(s)), s.satelliteId, s.orbit);
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
    try { this.planCache = planMission(this.getConfig(), siteById(this.state.siteId), missionVehicle(this.state)); } catch { this.planCache = null; }
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
    const spec = missionVehicle(s);
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
    const spec = missionVehicle(s);
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
    const spec = missionVehicle(s);
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
      spec: missionVehicle(s),
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

  private dynamicsSection(): HTMLElement {
    const section = this.el('details');
    section.dataset.section = 'dynamics';
    section.open = true;
    section.append(this.el('summary', undefined, t('setup.dynamics.title')));
    const d = this.state.dynamics ?? { model: 'pointMass', wind: 'calm', seed: 20260919 };
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
