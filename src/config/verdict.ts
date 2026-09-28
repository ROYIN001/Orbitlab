/**
 * The pre-flight feasibility verdict (audit B12), without the DOM.
 *
 * Moved here unchanged from src/ui/panel.ts so that code with no document —
 * the flight readiness review of roadmap D04 (src/design/readiness.ts), and
 * the tests — can call the very functions the setup panel calls, rather than a
 * copy that could drift from them. `panel.ts` re-exports every name, so its
 * importers are untouched; the panel's own doc comment still describes where
 * the verdict sits in the setup screen and why `probeInsertion` is the one
 * flight it may run.
 *
 * Text comes from the dictionaries through `t()`, which runs in node (the
 * verdict tests have always run there).
 */
import type { FailureMode, OrbitSpec, SatelliteSpec, VehicleSpec } from '../types';
import type { SiteExtra } from '../data/sites';
import { VehicleModel } from '../physics/vehicle';
import {
  inclinationCorridor, maxInclinationFor, canBurnAfterAscent, apsisTolerance, perigeeTolerance,
  ASCENT_MARGIN_REQUIRED, RAAN_TOLERANCE, type MissionPlan,
} from '../physics/mission';
import { wrapPi } from '../physics/orbital';
import type { InsertionProbe } from '../physics/autotune';
import { SHIP_RETURN_VERIFIED_PAYLOAD } from '../physics/sim/ship-descent';
import { DEG, RAD } from '../physics/constants';
import { t, getLang } from '../i18n';

/** A count in the reader's locale, as the setup panel prints it (its own `num`). */
function num(v: number, digits = 0): string {
  try {
    return v.toLocaleString(getLang(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
  } catch {
    return v.toFixed(digits);
  }
}

/**
 * A site's localized name: src/ui/names.ts's `siteName`, restated so that this
 * module does not import from src/ui (the dictionary key, or the data file's
 * English name when there is no entry).
 */
function siteName(s: SiteExtra): string {
  const key = `site.${s.id}.name`;
  const text = t(key);
  return text === key ? s.name : text;
}

/** Which rated payload figure a target orbit should be measured against. */
export type OrbitClass = 'leo' | 'sso' | 'gto';

/**
 * What decided a verdict: the branch of `missionVerdict` it came from, so that
 * the Explore level can offer the change that answers it (a lighter payload,
 * another site, the next window) without parsing the sentence.
 */
export type VerdictCause = 'noRating' | 'overCapacity' | 'corridor' | 'beyondCapability' | 'noRestart' | 'burnBudget'
  | 'noInsertion' | 'inclination' | 'siteChanged' | 'margin' | 'ready';

export interface Feasibility {
  level: 'ok' | 'warn' | 'fail';
  text: string;
  cause: VerdictCause;
  /** the launch time misses the target plane by more than the tolerance */
  offWindow: boolean;
}

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
  const say = (level: Feasibility['level'], cause: VerdictCause, ...clauses: string[]): Feasibility =>
    ({ level: planeWarning && level === 'ok' ? 'warn' : level, cause, offWindow: planeWarning !== '',
      text: [armed, planeWarning, ...clauses].filter((s) => s !== '').join(' ') });

  if (cap <= 0) {
    return say('fail', 'noRating', t('setup.verdict.noRating', { vehicle: i.spec.name, class: t(`orbit.class.${cls}`) }));
  }
  if (i.payloadMass > cap) {
    return say('fail', 'overCapacity', t('setup.verdict.overCapacity', { mass: num(i.payloadMass), cap: num(cap), class: className, vehicle: i.spec.name }));
  }
  // Range safety before performance: a heading the site may not fly is not a
  // margin the operator can trade, and no amount of Δv buys it.
  const corridor = inclinationCorridor(i.site, i.inclinationDeg * DEG);
  if (corridor === 'aboveCorridor') {
    // The upper bound quoted is the one the check used — the reach of the
    // site's azimuth window — not the declared `maxInclination`, which is the
    // same figure rounded and could print a different last digit.
    return say('fail', 'corridor', t('setup.verdict.corridor', {
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
      return say('fail', 'beyondCapability', t('setup.verdict.beyondCapability', { dv: num(Math.round(capability.ascentShortfall)), vehicle: i.spec.name }));
    }
    if (capability.stranded) {
      return say('fail', 'noRestart', t('setup.verdict.noRestart', {
        alt: num(Math.round(i.plan.insertionAltitude / 1000)), ap: num(Math.round(i.plan.insertionApoapsis / 1000)),
        pe: num(Math.round(i.plan.target.perigee / 1000)), target: num(Math.round(i.plan.target.apogee / 1000)),
      }));
    }
    if (capability.burnShortfall > 0) {
      return say('fail', 'burnBudget', t('setup.verdict.burnBudget', {
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
    return say('fail', 'noInsertion', t('setup.verdict.noInsertion', { vehicle: i.spec.name }));
  }
  const reachable = i.plan ? i.plan.inclinationReachable : corridor === 'ok';
  if (!reachable) {
    return say('warn', 'inclination', t('setup.verdict.inclination', { inc: i.inclinationDeg.toFixed(1), site: siteName(i.site), min: i.site.minInclination.toFixed(1) }));
  }
  if (i.siteReassigned) {
    return say('warn', 'siteChanged', t('setup.verdict.siteChanged', { site: siteName(i.site) }));
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
  if (armed !== '' || notes.length > 0) return say('warn', notes.length > 0 ? 'margin' : 'ready', ...notes, dogleg);
  return say('ok', 'ready', t('setup.verdict.readyMargin', { mass: num(i.payloadMass), cap: num(cap), class: className }), dogleg);
}

/**
 * Whether the static budget already calls a mission marginal — the ascent
 * stages short of the orbit, or the payload at 90 % of the rating or above —
 * which is when the verdict flies the insertion probe (see
 * `SetupPanel.refreshInsertionProbe`).
 */
export function marginalMission(spec: VehicleSpec, satellite: SatelliteSpec, payloadMass: number, plan: MissionPlan, orbit: OrbitSpec): boolean {
  const capability = missionCapability(spec, satellite, payloadMass, plan);
  const { cap } = ratedPayload(spec, orbitClassOf(orbit));
  return capability.ascentShortfall > 0 || (cap > 0 && payloadMass >= cap * 0.9);
}
