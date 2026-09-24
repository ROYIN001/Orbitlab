/**
 * Runtime vehicle model: propellant bookkeeping, thrust at altitude,
 * staging state, frontal area and delta-v accounting.
 */
import type { VehicleSpec, StageSpec, BoosterGroupSpec, EngineSpec, SatelliteSpec, RecoveryMode, RecoveryPlan, TargetedRecovery } from '../types';
import { G0, P0 } from './constants';

export interface BoosterState {
  spec: BoosterGroupSpec;
  propellant: number;
  attached: boolean;
  ignited: boolean;
  burnedOut: boolean;
  /** mission time at burnout, for jettison delay */
  burnoutTime: number;
  /** mission time the motor was lit, s (start-up transient) */
  startTime: number;
  /** thrust level (fraction of full) the motor was running at, last step */
  level: number;
  /** level it was running at when it ran dry, the start of its tail-off */
  stopLevel: number;
}

export interface StageState {
  index: number;
  spec: StageSpec;
  propellant: number;
  attached: boolean;
  ignited: boolean;
  /** engine commanded off (cutoff) */
  cutoff: boolean;
  /** propellant exhausted */
  burnedOut: boolean;
  /** fraction of engines still running (engine-out failures) */
  engineFraction: number;
  boosters: BoosterState[];
  /** mission time of first ignition */
  ignitionTime: number;
  /** mission time the stage was separated */
  sepTime: number;
  /** mission time at cutoff/burnout */
  cutoffTime: number;
  /** number of ignitions performed */
  ignitions: number;
  /** mission time of the latest ignition — or of the burn actually starting to thrust, s */
  startTime: number;
  /** thrust level (fraction of full, all factors) the core was running at, last step */
  level: number;
  /** level at the latest shutdown, the start of its tail-off */
  stopLevel: number;
  /**
   * Engines lit, by engine index, when not all of them are: Starship's ship
   * lands on its three sea-level Raptors and leaves the vacuum ones cold.
   * Absent, every engine runs.
   */
  litEngines?: readonly number[];
  /**
   * The stage is flying itself back to the surface after a suborbital cut-off
   * (`ShipDescent`): its landing propellant sits in its header tanks and its
   * flaps are working.
   */
  descent?: boolean;
}

/**
 * Engine start-up and shutdown transients.
 *
 * A rocket engine does not go from nothing to full thrust in a step. A
 * pump-fed liquid engine spins its turbopump up and reaches rated chamber
 * pressure in about a second; a solid motor's igniter pressurises the grain in
 * a few tenths. After shutdown, liquid engines tail off as the lines and the
 * pump run down, over a few tenths of a second, and a solid motor's burn-out
 * is the slivers of grain left against the case burning away over a second or
 * two. The propellant for all of it comes out of the tanks, so the mass flow
 * follows the thrust through both transients at the engine's own Isp.
 *
 * Instantaneous thrust switching was the model before this, and it matters
 * most where a large thrust disappears at once — four Soyuz strap-ons burning
 * out together took ~3.3 MN off the stack in one 10 ms step, and the six-DOF
 * attitude loop answered it with a nose dip.
 */
export const LIQUID_STARTUP_S = 1.0;
export const SOLID_STARTUP_S = 0.3;
export const LIQUID_TAILOFF_S = 0.25;
export const SOLID_TAILOFF_S = 1.0;
/** A tail-off is over after this many time constants (e⁻⁵ ≈ 0.7 % of its start). */
export const TAILOFF_SPAN = 5;

export function engineStartupS(e: EngineSpec): number {
  return e.startupS ?? (e.solid ? SOLID_STARTUP_S : LIQUID_STARTUP_S);
}
export function engineTailoffS(e: EngineSpec): number {
  return e.tailoffS ?? (e.solid ? SOLID_TAILOFF_S : LIQUID_TAILOFF_S);
}

/** Smooth start-up rise: 0 at ignition, 1 after `startup` s. */
function rise(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x * x * (3 - 2 * x);
}
/** ∫ rise, for the step average. */
function riseIntegral(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 0.5 + (x - 1);
  return x * x * x - 0.5 * x * x * x * x;
}

/**
 * Mean start-up factor over [since, since + dt] s after ignition (the value at
 * `since` when dt is 0), so that a step's thrust and its propellant use are the
 * same integral whatever the step length.
 */
export function startupFactor(e: EngineSpec, since: number, dt = 0): number {
  const T = engineStartupS(e);
  if (!(T > 0) || since >= T) return 1;
  if (!(dt > 0)) return rise(since / T);
  return (riseIntegral((since + dt) / T) - riseIntegral(since / T)) * T / dt;
}

/** Mean tail-off factor over [since, since + dt] s after shutdown (0 once it is over). */
export function tailoffFactor(e: EngineSpec, since: number, dt = 0): number {
  const tau = engineTailoffS(e);
  const end = TAILOFF_SPAN * tau;
  if (!(tau > 0) || since >= end || since < 0) return 0;
  if (!(dt > 0)) return Math.exp(-since / tau);
  const b = Math.min(end, since + dt);
  return tau * (Math.exp(-since / tau) - Math.exp(-b / tau)) / dt;
}

/**
 * Whether an engine shut down at `stopTime` is still tailing off at `t`. The
 * nanosecond of slack makes the end of a tail-off, `stopTime + span`, count as
 * over whatever the rounding of that sum: an action scheduled for the moment
 * a tail-off ends must find it ended.
 */
export function inTailoff(e: EngineSpec, stopTime: number, t: number): boolean {
  return t - stopTime >= 0 && t - stopTime < TAILOFF_SPAN * engineTailoffS(e) - 1e-9;
}

export interface ThrustResult {
  /** total thrust, N */
  thrust: number;
  /** total mass flow, kg/s */
  mdot: number;
  /** vacuum-equivalent thrust of running engines at full throttle (for limits) */
  thrustFullVac: number;
  /**
   * Fraction of full thrust the core engines of the active stage are actually
   * producing: the commanded throttle after the engine's minimum-throttle
   * clamp and the `throttleWithBoosters` clamp, times a solid motor's thrust
   * profile. 0 when the core is not burning.
   *
   * It is an *output*, recorded on `SimState` and read by the renderer for the
   * plume (`StageFrame.effectiveThrottle`). Nothing in the physics reads it
   * back — `thrust` itself is already the clamped number.
   */
  coreThrottle: number;
  /** the same for the strap-on boosters of the active stage (solid profile included) */
  boosterThrottle: number;
  /**
   * The level the core is flying at, unclamped: a solid motor's regressive
   * profile runs above its mean thrust early in the burn (P120C 1.52 ×), and a
   * six-DOF body pushed at the clamped `coreThrottle` delivers less impulse
   * than the propellant `consume` takes for it.
   */
  coreLevel: number;
  /**
   * The level of each strap-on group of the active stage, by group index, also
   * unclamped. `boosterThrottle` is the strongest of them clamped to 1, which is
   * every group's level while they light and burn out together; PSLV's air-lit
   * pair lights 25 s after the ground-lit four and outlives them, and a
   * six-DOF body or a propellant boundary sized on the pair's level for the
   * four is wrong.
   */
  boosterLevels: number[];
  /** any engine currently producing thrust */
  burning: boolean;
}

/**
 * Sea-level thrust actually used by the model.
 *
 * A `vacuumOnly` engine has no sea-level operating point; its `thrustSL` field
 * is a placeholder kept only so that the type stays uniform. Using it would be
 * using fiction, so the vacuum figure is returned instead and the pressure blend
 * below becomes a no-op for those engines.
 */
export function engineThrustSL(e: EngineSpec): number {
  return e.vacuumOnly ? e.thrustVac : e.thrustSL;
}

/** Thrust of one engine at ambient pressure p (Pa). */
export function engineThrust(e: EngineSpec, p: number): number {
  const f = Math.min(1, Math.max(0, p / P0));
  const tSL = engineThrustSL(e);
  return e.thrustVac - (e.thrustVac - tSL) * f;
}

/**
 * Full-throttle mass flow of one engine, kg/s.
 *
 * Physically ṁ is a property of the turbopump and the injector, not of the
 * ambient pressure: thrust is linear in ambient pressure because the nozzle exit
 * term is, while the propellant flow is unchanged. So ṁ = F_vac/(g₀ Isp_vac) and
 * F_SL/(g₀ Isp_SL) are the *same* number, and a data pair that says otherwise is
 * inconsistent. The model takes the vacuum pair as authoritative (it is the one
 * every source quotes for every engine, and the one a vacuum-only engine has at
 * all) and back-solves the sea-level Isp from it — see `engineIsp`.
 */
export function engineMassFlow(e: EngineSpec): number {
  return e.thrustVac / (G0 * e.ispVac);
}

/**
 * Isp of one engine at ambient pressure p (Pa), s.
 *
 * Derived from the thrust the engine delivers at that pressure and the (fixed)
 * mass flow, so that F = ṁ g₀ Isp(p) holds exactly at every altitude. At p = 0
 * this is `ispVac` by construction; at sea level it is thrustSL/(ṁ g₀), which
 * is the Isp the vehicle *delivers* and not necessarily the `ispSL` the data
 * file quotes. `data-consistency` asserts the two agree to 1 % for every
 * ground-lit engine, which is what stops that discrepancy coming back.
 */
export function engineIsp(e: EngineSpec, p: number): number {
  const mdot = engineMassFlow(e);
  if (mdot <= 0) return e.ispVac;
  return engineThrust(e, p) / (G0 * mdot);
}

/** Delivered sea-level Isp, s: what `ispSL` in the data file has to agree with. */
export function deliveredIspSL(e: EngineSpec): number {
  return engineIsp(e, P0);
}

/**
 * Tail fraction of the regressive ramp, cached per peak factor.
 *
 * The profile is a function of the fraction of grain BURNED, but the quantity
 * that has to come out right is the burn TIME — `thrustVac` is defined as the
 * mean thrust that reproduces the published burn time at constant flow, so the
 * profile must not change it. Those are not the same normalisation, and the
 * difference is not small: a ramp that is symmetric about 1 in burned fraction
 * spends longer at low flow than at high flow, so
 *
 *   t_burn = (m/ṁ) ∫₀¹ df / p(f)
 *
 * and for a 1.52 → 0.48 ramp that integral is 1.108 — an 11 % longer burn,
 * which on Ariane 6 moved P120C separation from T+140 s to T+153 s against a
 * published 130–140 s. So the tail is solved for instead: with p(f) = P(1 − cf),
 * c is the root of ln(1/(1−c)) = Pc, which makes ∫₀¹ df/p(f) exactly 1 and
 * leaves the published burn time untouched whatever the peak is. For P = 1.2 it
 * gives 1.2 → 0.82, which is why the file's original hand-picked 1.2 → 0.8 ramp
 * was very nearly right; for P = 1.52 it gives 1.52 → 0.60.
 */
const solidTailCache = new Map<number, number>();
function solidTail(peak: number): number {
  const hit = solidTailCache.get(peak);
  if (hit !== undefined) return hit;
  // ln(1/(1-c))/(P c) rises monotonically from 1/P (< 1) to infinity on (0, 1).
  let lo = 1e-9;
  let hi = 1 - 1e-9;
  for (let k = 0; k < 80; k++) {
    const c = (lo + hi) / 2;
    if (Math.log(1 / (1 - c)) / (peak * c) > 1) hi = c;
    else lo = c;
  }
  const c = (lo + hi) / 2;
  solidTailCache.set(peak, c);
  return c;
}

/**
 * Regressive thrust profile factor for solid motors.
 *
 * `thrustVac` is the *mean* thrust (grain mass / published burn time) and a real
 * grain delivers a head-end peak and a long tail-off around it. `peakFactor` is
 * the published peak/mean — P120C 1.52, SRB-A3 1.22, Zefiro 40 1.16 — and the
 * fleet default of 1.2 is what every motor used before the field existed. The
 * ramp is normalised so the burn time is unchanged; see `solidTail`.
 */
export function solidProfile(fractionBurned: number, peakFactor = 1.2): number {
  const p = Math.max(1, peakFactor);
  if (p <= 1) return 1;
  const f = Math.min(1, Math.max(0, fractionBurned));
  return p * (1 - solidTail(p) * f);
}

/**
 * Propellant fractions held back for recovery, core and strap-ons.
 *
 * Without a plan every recovered body keeps the vehicle's `recoveryReserve`
 * and lands where it comes down. With one, a body flown back to a landing zone
 * keeps the larger `returnReserve` for its boostback, one landed on a drone
 * ship keeps `recoveryReserve`, and a body the plan does not name is expended
 * and keeps nothing. The strap-ons of one group share a propellant state, so
 * the group keeps the largest reserve any of them needs.
 */
/** A mode that flies the stage to a target, rather than down where it falls or not at all. */
export const targetedRecovery = (mode: RecoveryMode | undefined): mode is TargetedRecovery =>
  mode?.kind === 'droneShip' || mode?.kind === 'landingZone';

export function recoveryReserves(spec: VehicleSpec, boosterRecovery: boolean, plan?: RecoveryPlan): { core: number; boosters: number } {
  if (!boosterRecovery || !spec.recoverable) return { core: 0, boosters: 0 };
  const base = spec.recoveryReserve ?? 0;
  if (!plan) return { core: base, boosters: base };
  const of = (mode: RecoveryMode | undefined): number => !mode || mode.kind === 'expended' ? 0
    : mode.kind === 'landingZone' ? spec.returnReserve ?? base : base;
  return { core: of(plan.core), boosters: Math.max(0, ...(plan.boosters ?? []).map(of)) };
}

export class VehicleModel {
  readonly spec: VehicleSpec;
  readonly stages: StageState[];
  fairingAttached: boolean;
  payloadMass: number;
  payloadAttached = true;
  activeIndex = 0;
  /** first-stage (core) propellant fraction reserved for recovery */
  recoveryReserve: number;
  /** strap-on propellant fraction reserved for recovery */
  boosterRecoveryReserve: number;

  /** index of the last launcher stage (excludes the spacecraft stage) */
  readonly lastLauncherIndex: number;
  readonly hasSpacecraftStage: boolean;

  constructor(spec: VehicleSpec, payloadMass: number, boosterRecovery = false, spacecraft?: SatelliteSpec, plan?: RecoveryPlan) {
    this.spec = spec;
    this.fairingAttached = spec.fairing !== null;
    const reserves = recoveryReserves(spec, boosterRecovery, plan);
    this.recoveryReserve = reserves.core;
    this.boosterRecoveryReserve = reserves.boosters;
    const stageSpecs: StageSpec[] = [...spec.stages];
    this.lastLauncherIndex = spec.stages.length - 1;
    this.hasSpacecraftStage = false;
    // A suborbital test flight may carry no payload at all, and nothing is
    // left of a spacecraft to fly on its own engine.
    if (spacecraft?.propulsion && payloadMass > 0) {
      const pr = spacecraft.propulsion;
      stageSpecs.push({
        id: 'spacecraft', name: spacecraft.name, dryMass: payloadMass * (1 - pr.propellantFraction),
        propellantMass: payloadMass * pr.propellantFraction,
        engine: { name: 'Spacecraft engine', count: 1, thrustSL: pr.thrust, thrustVac: pr.thrust, ispSL: pr.isp, ispVac: pr.isp },
        diameter: spacecraft.size?.width ?? 2, length: spacecraft.size?.height ?? 3, restartable: true, sepDelay: 3, ignitionDelay: 5,
        color: '#d0d4dc', isSpacecraft: true,
      });
      this.hasSpacecraftStage = true;
      this.payloadMass = 0;
    } else {
      this.payloadMass = payloadMass;
    }
    this.stages = stageSpecs.map((s, index) => ({
      index,
      spec: s,
      propellant: s.propellantMass,
      attached: true,
      ignited: false,
      cutoff: false,
      burnedOut: false,
      engineFraction: 1,
      boosters: (s.boosters ?? []).map((b) => ({
        spec: b,
        propellant: b.propellantMass,
        attached: true,
        ignited: false,
        burnedOut: false,
        burnoutTime: 0,
        startTime: -Infinity,
        level: 0,
        stopLevel: 0,
      })),
      ignitionTime: 0,
      sepTime: 0,
      cutoffTime: 0,
      ignitions: 0,
      startTime: -Infinity,
      level: 0,
      stopLevel: 0,
    }));
  }

  get active(): StageState | null {
    return this.activeIndex < this.stages.length ? this.stages[this.activeIndex] : null;
  }

  /** Usable propellant of a stage (excluding recovery reserve on stage 0/boosters). */
  usablePropellant(st: StageState): number {
    const reserve = st.index === 0 ? this.recoveryReserve * st.spec.propellantMass : 0;
    return Math.max(0, st.propellant - reserve);
  }
  usableBoosterPropellant(bs: BoosterState): number {
    const reserve = this.boosterRecoveryReserve * bs.spec.propellantMass;
    return Math.max(0, bs.propellant - reserve);
  }

  /**
   * Fraction of the *usable* grain a solid motor has burned, which is what the
   * regressive thrust profile is a function of. Keying it to the loaded mass
   * instead would mean a motor with a recovery reserve never reaches the
   * tail-off, because the reserve it may not touch still counts as unburned.
   */
  private solidProfileFor(st: StageState): number {
    const usable = Math.max(1e-9, st.spec.propellantMass - (st.index === 0 ? this.recoveryReserve * st.spec.propellantMass : 0));
    return solidProfile(1 - this.usablePropellant(st) / usable, st.spec.engine.peakFactor);
  }
  private solidProfileForBooster(b: BoosterState): number {
    const usable = Math.max(1e-9, b.spec.propellantMass * (1 - this.boosterRecoveryReserve));
    return solidProfile(1 - this.usableBoosterPropellant(b) / usable, b.spec.engine.peakFactor);
  }

  totalMass(): number {
    let m = this.payloadAttached ? this.payloadMass : 0;
    if (this.fairingAttached && this.spec.fairing) m += this.spec.fairing.mass;
    for (const st of this.stages) {
      if (!st.attached) continue;
      m += st.spec.dryMass + st.propellant;
      for (const b of st.boosters) {
        if (!b.attached) continue;
        m += (b.spec.dryMass + b.propellant) * b.spec.count;
      }
    }
    return m;
  }

  /** Frontal (reference) area for drag, m^2. */
  frontalArea(): number {
    // The override short-circuits before the sum, not after it: this runs on
    // every integration sub-step of every flight (audit item B39(7)).
    if (this.spec.dragArea !== undefined) return this.spec.dragArea;
    let maxD = 0;
    for (const st of this.stages) if (st.attached) maxD = Math.max(maxD, st.spec.diameter);
    if (this.fairingAttached && this.spec.fairing) maxD = Math.max(maxD, this.spec.fairing.diameter);
    let area = Math.PI * (maxD / 2) ** 2;
    const act = this.active;
    if (act) {
      for (const b of act.boosters) {
        if (b.attached) area += b.spec.count * Math.PI * (b.spec.diameter / 2) ** 2;
      }
    }
    return area;
  }

  /**
   * Thrust and mass flow at mission time t, ambient pressure p, with a commanded
   * throttle (0..1) for the core engines. Does not consume propellant.
   *
   * `dt` > 0 averages the start-up and tail-off transients over [t, t + dt],
   * which is what the step that follows will fly; `consume` takes the same
   * average, so a step's impulse and its propellant always agree. A throttle
   * command of 0 lights nothing, but an engine already shut down keeps tailing
   * off whatever the command.
   */
  /** Engines of the stage running, counting failures and a partial light-up (`litEngines`). */
  static enginesRunning(st: StageState): number {
    return st.litEngines ? st.litEngines.length * st.engineFraction : st.spec.engine.count * st.engineFraction;
  }

  thrust(t: number, p: number, throttleCmd: number, dt = 0): ThrustResult {
    const st = this.active;
    const out: ThrustResult = { thrust: 0, mdot: 0, thrustFullVac: 0, coreThrottle: 0, boosterThrottle: 0, coreLevel: 0, boosterLevels: [], burning: false };
    if (!st) return out;
    const boostersBurning = st.boosters.some((b) => b.attached && b.ignited && !b.burnedOut);
    const e = st.spec.engine;
    const n = VehicleModel.enginesRunning(st);
    // core
    if (throttleCmd > 0 && st.ignited && !st.cutoff && !st.burnedOut && this.usablePropellant(st) > 0 && st.engineFraction > 0) {
      let thr = throttleCmd;
      if (boostersBurning && st.spec.throttleWithBoosters !== undefined) {
        const tSince = t - st.ignitionTime;
        if (tSince > 20) thr = Math.min(thr, st.spec.throttleWithBoosters);
      }
      const minT = e.solid ? 1 : e.minThrottle ?? 1;
      thr = Math.max(minT, Math.min(1, thr));
      let profile = 1;
      if (e.solid) profile = this.solidProfileFor(st);
      const level = thr * profile * startupFactor(e, t - st.startTime, dt);
      out.thrust += n * engineThrust(e, p) * level;
      out.mdot += n * engineMassFlow(e) * level;
      out.thrustFullVac += n * e.thrustVac * profile;
      // `* profile` so a solid core's plume follows its own thrust curve
      out.coreThrottle = Math.min(1, level);
      out.coreLevel = level;
      out.burning = true;
    } else if (this.coreTailingOff(st, t)) {
      const level = this.coreTailLevel(st, t, dt);
      out.thrust += n * engineThrust(e, p) * level;
      out.mdot += n * engineMassFlow(e) * level;
      out.coreThrottle = Math.min(1, level);
      out.coreLevel = level;
      out.burning = level > 0;
    }
    // boosters
    out.boosterLevels = st.boosters.map(() => 0);
    for (const [group, b] of st.boosters.entries()) {
      if (!b.attached || !b.ignited) continue;
      const be = b.spec.engine;
      const nb = be.count * b.spec.count;
      let level = 0;
      if (!b.burnedOut) {
        if (!(throttleCmd > 0) || this.usableBoosterPropellant(b) <= 0) continue;
        let profile = 1;
        if (be.solid) profile = this.solidProfileForBooster(b);
        const thr = be.solid ? 1 : Math.max(be.minThrottle ?? 1, Math.min(1, throttleCmd));
        level = thr * profile * startupFactor(be, t - b.startTime, dt);
        out.thrustFullVac += nb * be.thrustVac * profile;
      } else if (this.boosterTailingOff(b, t)) {
        level = this.boosterTailLevel(b, t, dt);
      } else continue;
      out.thrust += nb * engineThrust(be, p) * level;
      out.mdot += nb * engineMassFlow(be) * level;
      // The strongest burning group wins: several groups on one stage (H3's
      // SRB-3 pair, Angara's four URM-1s) light and burn out together, so a
      // maximum and a per-group value differ only during the second in which
      // one of them has burned out and is about to be jettisoned.
      out.boosterThrottle = Math.max(out.boosterThrottle, Math.min(1, level));
      out.boosterLevels[group] = level;
      if (level > 0) out.burning = true;
    }
    return out;
  }

  /**
   * Mean tail-off level over [t, t + dt], never more than the tanks still
   * hold: `thrust` and `consume` both use it, so the last step of a tail-off
   * cannot deliver impulse the propellant was not there for.
   */
  private coreTailLevel(st: StageState, t: number, dt: number): number {
    const e = st.spec.engine;
    const level = st.stopLevel * tailoffFactor(e, t - st.cutoffTime, dt);
    if (!(dt > 0)) return level;
    return Math.min(level, this.usablePropellant(st) / (VehicleModel.enginesRunning(st) * engineMassFlow(e) * dt));
  }
  private boosterTailLevel(b: BoosterState, t: number, dt: number): number {
    const e = b.spec.engine;
    const level = b.stopLevel * tailoffFactor(e, t - b.burnoutTime, dt);
    if (!(dt > 0)) return level;
    return Math.min(level, this.usableBoosterPropellant(b) / (e.count * engineMassFlow(e) * dt));
  }

  /** The stage's core was shut down (or ran dry) and is still tailing off at `t`. */
  coreTailingOff(st: StageState, t: number): boolean {
    return st.ignited && (st.cutoff || st.burnedOut) && st.stopLevel > 0 && st.engineFraction > 0
      && this.usablePropellant(st) > 0 && inTailoff(st.spec.engine, st.cutoffTime, t);
  }
  /** The strap-on group ran dry and is still tailing off at `t`. */
  boosterTailingOff(b: BoosterState, t: number): boolean {
    return b.burnedOut && b.stopLevel > 0 && this.usableBoosterPropellant(b) > 0 && inTailoff(b.spec.engine, b.burnoutTime, t);
  }

  /**
   * Propellant an engine running at `flow` kg/s still burns in its tail-off, kg.
   * The depletion sensor shuts the engine down with this much aboard, so the
   * tail-off runs on real propellant and ends with the tanks empty.
   */
  static tailoffReserve(e: EngineSpec, flow: number): number {
    return flow * engineTailoffS(e) * (1 - Math.exp(-TAILOFF_SPAN));
  }

  /**
   * An engine of the active stage (or one of its boosters) is spinning up or
   * tailing off at `t` — the thrust is changing faster than the ascent's normal
   * step resolves.
   */
  inTransient(t: number): boolean {
    const st = this.active;
    if (!st) return false;
    const e = st.spec.engine;
    if (st.ignited && !st.cutoff && !st.burnedOut && t - st.startTime < engineStartupS(e)) return true;
    if (this.coreTailingOff(st, t)) return true;
    for (const b of st.boosters) {
      if (!b.attached || !b.ignited) continue;
      if (!b.burnedOut && t - b.startTime < engineStartupS(b.spec.engine)) return true;
      if (this.boosterTailingOff(b, t)) return true;
    }
    return false;
  }

  /**
   * Velocity the active core's tail-off still adds after `t`, m/s along the
   * thrust axis, at ambient pressure `p` and stack mass `mass`: all of it if
   * the core were shut down at `t` from the level it ran at on the last step,
   * what is left of it if it is already tailing off. This is what a cut-off
   * has to anticipate — real ascent guidance subtracts the tail-off impulse
   * from its cut-off target in exactly this way — and what the orbit a cut-off
   * leaves behind is measured with.
   */
  tailoffDeltaV(t: number, p: number, mass: number): number {
    const st = this.active;
    if (!st || !(mass > 0) || !st.ignited || !(st.engineFraction > 0)) return 0;
    const e = st.spec.engine;
    const tau = engineTailoffS(e);
    let level: number;
    let fraction: number;
    if (!st.cutoff && !st.burnedOut) {
      level = st.level;
      fraction = 1 - Math.exp(-TAILOFF_SPAN);
    } else if (this.coreTailingOff(st, t)) {
      level = st.stopLevel;
      fraction = Math.exp(-Math.max(0, t - st.cutoffTime) / tau) - Math.exp(-TAILOFF_SPAN);
    } else return 0;
    if (!(level > 0) || !(fraction > 0)) return 0;
    return VehicleModel.enginesRunning(st) * engineThrust(e, p) * level * tau * fraction / mass;
  }

  /** Consume propellant for dt seconds at the given conditions. Returns burnout flags. */
  consume(t: number, throttleCmd: number, dt: number): { coreBurnout: boolean; boosterBurnout: BoosterState[] } {
    const st = this.active;
    const res = { coreBurnout: false, boosterBurnout: [] as BoosterState[] };
    if (!st) return res;
    const boostersBurning = st.boosters.some((b) => b.attached && b.ignited && !b.burnedOut);
    const e = st.spec.engine;
    const n = VehicleModel.enginesRunning(st);
    if (throttleCmd > 0 && st.ignited && !st.cutoff && !st.burnedOut && st.engineFraction > 0) {
      let thr = throttleCmd;
      if (boostersBurning && st.spec.throttleWithBoosters !== undefined && t - st.ignitionTime > 20) {
        thr = Math.min(thr, st.spec.throttleWithBoosters);
      }
      const minT = e.solid ? 1 : e.minThrottle ?? 1;
      thr = Math.max(minT, Math.min(1, thr));
      let profile = 1;
      if (e.solid) profile = this.solidProfileFor(st);
      const level = thr * profile * startupFactor(e, t - st.startTime, dt);
      st.level = level;
      const flow = n * engineMassFlow(e) * level;
      st.propellant -= flow * dt;
      // Shut down by the depletion sensor with the tail-off's propellant aboard.
      if (this.usablePropellant(st) <= VehicleModel.tailoffReserve(e, flow)) {
        st.propellant = Math.max(st.propellant, st.index === 0 ? this.recoveryReserve * st.spec.propellantMass : 0);
        st.burnedOut = true;
        st.cutoffTime = t + dt;
        // The sensor trips within a step of the reserve, so scale the tail-off
        // to burn exactly what is left.
        const perLevel = VehicleModel.tailoffReserve(e, n * engineMassFlow(e));
        st.stopLevel = perLevel > 0 ? Math.min(level, this.usablePropellant(st) / perLevel) : 0;
        res.coreBurnout = true;
      }
    } else if (this.coreTailingOff(st, t)) {
      const level = this.coreTailLevel(st, t, dt);
      st.propellant -= Math.min(this.usablePropellant(st), n * engineMassFlow(e) * level * dt);
      st.level = 0;
    } else {
      st.level = 0;
    }
    for (const b of st.boosters) {
      if (!b.attached || !b.ignited) continue;
      const be = b.spec.engine;
      const nb = be.count;
      if (!b.burnedOut) {
        if (!(throttleCmd > 0)) { b.level = 0; continue; }
        let profile = 1;
        if (be.solid) profile = this.solidProfileForBooster(b);
        const thr = be.solid ? 1 : Math.max(be.minThrottle ?? 1, Math.min(1, throttleCmd));
        const level = thr * profile * startupFactor(be, t - b.startTime, dt);
        b.level = level;
        const flow = nb * engineMassFlow(be) * level;
        b.propellant -= flow * dt;
        if (this.usableBoosterPropellant(b) <= VehicleModel.tailoffReserve(be, flow)) {
          b.propellant = Math.max(b.propellant, this.boosterRecoveryReserve * b.spec.propellantMass);
          b.burnedOut = true;
          b.burnoutTime = t + dt;
          const perLevel = VehicleModel.tailoffReserve(be, nb * engineMassFlow(be));
          b.stopLevel = perLevel > 0 ? Math.min(level, this.usableBoosterPropellant(b) / perLevel) : 0;
          res.boosterBurnout.push(b);
        }
      } else if (this.boosterTailingOff(b, t)) {
        const level = this.boosterTailLevel(b, t, dt);
        b.propellant -= Math.min(this.usableBoosterPropellant(b), nb * engineMassFlow(be) * level * dt);
        b.level = 0;
      }
    }
    return res;
  }

  igniteStage(st: StageState, t: number): void {
    if (!st.ignited) st.ignitionTime = t;
    st.ignited = true;
    st.cutoff = false;
    st.ignitions += 1;
    st.startTime = t;
  }
  /**
   * Light a strap-on group. Without a time the motor is taken as already at
   * full thrust (a fixture that is not flying the start-up).
   */
  igniteBooster(b: BoosterState, t = -Infinity): void {
    b.ignited = true;
    b.startTime = t;
  }
  /**
   * The engine starts thrusting now rather than at ignition: an orbital burn
   * that was lit and then held at zero throttle until its attitude was right
   * spins up when it actually opens the valves.
   */
  markStart(st: StageState, t: number): void {
    st.startTime = t;
  }
  cutoffStage(st: StageState, t: number): void {
    if (st.ignited && !st.cutoff) {
      st.cutoff = true;
      // A stage that ran dry is already tailing off from its depletion time.
      if (!st.burnedOut) {
        st.cutoffTime = t;
        st.stopLevel = st.level;
      }
    }
  }
  jettisonBooster(b: BoosterState, t: number): void {
    b.attached = false;
    b.burnoutTime = t;
  }
  separateStage(st: StageState, t: number): void {
    st.attached = false;
    st.sepTime = t;
    for (const b of st.boosters) b.attached = false;
    if (this.activeIndex === st.index) this.activeIndex = st.index + 1;
  }
  jettisonFairing(): void {
    this.fairingAttached = false;
  }

  /** Whether the active stage can still produce thrust (has usable propellant and engines). */
  activeHasPropellant(): boolean {
    const st = this.active;
    if (!st) return false;
    return this.usablePropellant(st) > 0 && st.engineFraction > 0 && !st.burnedOut;
  }

  /**
   * Ideal remaining delta-v (vacuum Isp, no losses) from the current state,
   * summing the active stage and all stages above it.
   *
   * Two things this has to get right, because both are worth 5–19 % on a
   * booster-equipped launcher (audit item B13):
   *
   * - **Strap-ons are a separate phase, not a bigger tank.** Lumping the booster
   *   and core propellant into one burn at a flow-weighted Isp makes the core
   *   carry the booster dry mass until the *combined* load is gone, which on
   *   Ariane 64 is 52 t of empty P120C casings dragged through the whole Vulcain
   *   burn — 2 272 m/s of pure fiction. The burn is split at booster burnout:
   *   during the parallel phase the core consumes coreFlow/(coreFlow+boosterFlow)
   *   of the flow, the booster casings are dropped, and the core finishes alone.
   * - **The fairing comes off.** `totalMass()` includes it and the old walk never
   *   subtracted it, so every launcher carried 1–3.5 t of jettisoned composite to
   *   orbit. It is dropped where it really is: during the burn of the stage above
   *   the first, i.e. at the first staging boundary this walk crosses.
   */
  deltaVRemaining(): number {
    const act = this.active;
    if (!act) return 0;
    let dv = 0;
    let mass = this.totalMass();
    let fairing = this.fairingAttached && this.spec.fairing ? this.spec.fairing.mass : 0;
    const stagesAbove = this.stages.filter((s) => s.attached && s.index >= act.index && !s.spec.isSpacecraft);
    // The fairing is jettisoned a minute or so into the second stage's burn. If
    // the walk starts above the first stage the jettison is already imminent, so
    // it is dropped before the first stage of the walk rather than after it.
    if (fairing > 0 && act.index > 0) {
      mass -= fairing;
      fairing = 0;
    }
    for (const st of stagesAbove) {
      const e = st.spec.engine;
      const coreProp = this.usablePropellant(st);
      const veCore = G0 * e.ispVac;
      let boosterProp = 0;
      let boosterFlow = 0;
      let boosterDry = 0;
      let boosterVe = veCore;
      if (st.index === act.index) {
        for (const b of st.boosters) {
          if (!b.attached) continue;
          boosterProp += this.usableBoosterPropellant(b) * b.spec.count;
          boosterFlow += b.spec.count * b.spec.engine.count * engineMassFlow(b.spec.engine);
          boosterDry += (b.spec.dryMass + (b.propellant - this.usableBoosterPropellant(b))) * b.spec.count;
        }
        if (boosterProp > 0) boosterVe = G0 * st.boosters[0].spec.engine.ispVac;
      }
      const coreFlow = Math.max(1e-9, e.count * st.engineFraction * engineMassFlow(e));
      if (boosterProp > 0 && boosterFlow > 0) {
        // --- parallel phase: both burn until the strap-ons run dry
        const tPar = boosterProp / boosterFlow;
        const coreInPar = Math.min(coreProp, coreFlow * tPar);
        const burned = boosterProp + coreInPar;
        const ve = (coreFlow * veCore + boosterFlow * boosterVe) / (coreFlow + boosterFlow);
        if (mass > burned) dv += ve * Math.log(mass / (mass - burned));
        mass -= burned + boosterDry;
        // --- core-only phase
        const coreLeft = coreProp - coreInPar;
        if (coreLeft > 0 && mass > coreLeft) dv += veCore * Math.log(mass / (mass - coreLeft));
        mass -= coreLeft;
      } else if (coreProp > 0 && mass > coreProp) {
        dv += veCore * Math.log(mass / (mass - coreProp));
        mass -= coreProp;
      } else {
        mass -= coreProp;
      }
      mass -= st.spec.dryMass + (st.propellant - coreProp);
      if (fairing > 0) {
        mass -= fairing;
        fairing = 0;
      }
    }
    return dv;
  }

  /**
   * Estimated burn time (s) needed to deliver `dv` m/s of ideal delta-v from the
   * current state, walking through the remaining stages (includes staging gaps).
   */
  burnTimeFor(dv: number, includeSpacecraft = false, excludeWeakFinal = false): number {
    const act = this.active;
    if (!act) return 0;
    let mass = this.totalMass();
    let dvRem = Math.max(0, dv);
    let t = 0;
    const stagesAbove = this.stages.filter((s) => s.attached && s.index >= act.index && (includeSpacecraft || !s.spec.isSpacecraft)
      && !(excludeWeakFinal && s.index === this.lastLauncherIndex && s.index !== act.index));
    for (const st of stagesAbove) {
      const e = st.spec.engine;
      let prop = this.usablePropellant(st);
      let flow = e.count * st.engineFraction * engineMassFlow(e);
      let isp = e.ispVac;
      let boosterDry = 0;
      if (st.index === act.index) {
        let bProp = 0, bFlow = 0;
        for (const b of st.boosters) {
          if (!b.attached) continue;
          bProp += this.usableBoosterPropellant(b) * b.spec.count;
          bFlow += b.spec.count * b.spec.engine.count * engineMassFlow(b.spec.engine);
          boosterDry += (b.spec.dryMass + (b.propellant - this.usableBoosterPropellant(b))) * b.spec.count;
        }
        if (bProp > 0) {
          isp = (flow * e.ispVac + bFlow * st.boosters[0].spec.engine.ispVac) / (flow + bFlow);
          prop += bProp;
          flow += bFlow;
        }
      }
      if (flow <= 0 || prop <= 0) {
        mass -= st.spec.dryMass + st.propellant + boosterDry;
        t += 5;
        continue;
      }
      const ve = G0 * isp;
      const dvStage = ve * Math.log(mass / (mass - prop));
      if (dvStage >= dvRem) {
        t += (mass / flow) * (1 - Math.exp(-dvRem / ve));
        return t;
      }
      t += prop / flow + 6; // staging gap
      dvRem -= dvStage;
      mass -= prop + boosterDry + st.spec.dryMass + (st.propellant - this.usablePropellant(st));
    }
    // out of stages: extrapolate with the last stage's acceleration
    return t + dvRem / 10;
  }

  /** Remaining full-throttle burn time of the active stage including attached boosters, s. */
  stageBurnTimeLeft(): number {
    const st = this.active;
    if (!st) return 0;
    const e = st.spec.engine;
    let prop = this.usablePropellant(st);
    let flow = e.count * st.engineFraction * engineMassFlow(e);
    let tBoost = 0;
    for (const b of st.boosters) {
      if (!b.attached || !b.ignited || b.burnedOut) continue;
      const f = b.spec.count * b.spec.engine.count * engineMassFlow(b.spec.engine);
      tBoost = Math.max(tBoost, this.usableBoosterPropellant(b) * b.spec.count / f);
    }
    const tCore = flow > 0 ? prop / flow : 0;
    return Math.max(tCore, tBoost);
  }

  /** Ideal delta-v left in the active stage (with attached boosters), m/s. */
  stageDvLeft(): number {
    const st = this.active;
    if (!st) return 0;
    const m0 = this.totalMass();
    let prop = this.usablePropellant(st);
    let isp = st.spec.engine.ispVac;
    for (const b of st.boosters) {
      if (!b.attached || b.burnedOut) continue;
      prop += this.usableBoosterPropellant(b) * b.spec.count;
      isp = (isp + b.spec.engine.ispVac) / 2;
    }
    if (prop <= 0 || m0 <= prop) return 0;
    return G0 * isp * Math.log(m0 / (m0 - prop));
  }

  /** Thrust acceleration of the next launcher stage at its ignition, m/s^2 (-1 if none). */
  nextStageAccel(excludeWeakFinal = false): number {
    const st = this.active;
    if (!st) return -1;
    const next = this.stages[st.index + 1];
    if (!next || next.spec.isSpacecraft) return -1;
    if (excludeWeakFinal && next.index === this.lastLauncherIndex) return -1;
    let mass = 0;
    for (const s of this.stages) if (s.attached && s.index > st.index && !s.spec.isSpacecraft) mass += s.spec.dryMass + s.propellant;
    for (const s of this.stages) if (s.attached && s.spec.isSpacecraft) mass += s.spec.dryMass + s.propellant;
    mass += this.payloadMass;
    if (this.fairingAttached && this.spec.fairing) mass += this.spec.fairing.mass;
    return (next.spec.engine.count * next.spec.engine.thrustVac) / Math.max(1, mass);
  }

  /** Ideal delta-v of the spacecraft's own propulsion, m/s. */
  spacecraftDeltaV(): number {
    const sc = this.stages.find((s) => s.spec.isSpacecraft && s.attached);
    if (!sc) return 0;
    const m0 = sc.spec.dryMass + sc.propellant;
    return G0 * sc.spec.engine.ispVac * Math.log(m0 / sc.spec.dryMass);
  }

  /** Snapshot for UI display. */
  summary(): { stage: string; propellantFraction: number; stagesLeft: number } {
    const st = this.active;
    if (!st) return { stage: '—', propellantFraction: 0, stagesLeft: 0 };
    return {
      stage: st.spec.name,
      propellantFraction: st.spec.propellantMass > 0 ? st.propellant / st.spec.propellantMass : 0,
      stagesLeft: this.stages.length - st.index,
    };
  }
}

/** Ideal total delta-v of a vehicle spec for a payload (vacuum Isp, serial staging). */
export function idealDeltaV(spec: VehicleSpec, payloadMass: number): number {
  const vm = new VehicleModel(spec, payloadMass);
  return vm.deltaVRemaining();
}

/** Liftoff mass for a payload. */
export function liftoffMass(spec: VehicleSpec, payloadMass: number): number {
  return new VehicleModel(spec, payloadMass).totalMass();
}

/**
 * Sea-level liftoff thrust (all ground-lit engines), N.
 *
 * A solid motor's `thrustSL` is its *mean* thrust, so the thrust it actually
 * makes at t = 0 is the head of the regressive profile — `solidProfile(0)`. That
 * applies to a solid FIRST STAGE (Vega-C's P120C, PSLV's S139) exactly as it
 * does to a strap-on; the earlier form of this function applied it only to
 * boosters, so every solid-first-stage vehicle reported a liftoff thrust 20 %
 * (now up to 52 %) below the one it lifts off with, and the fleet T/W check was
 * measuring the wrong number for them.
 */
export function liftoffThrust(spec: VehicleSpec): number {
  const st = spec.stages[0];
  const core = st.engine;
  let T = core.count * engineThrustSL(core) * (core.solid ? solidProfile(0, core.peakFactor) : 1);
  for (const b of st.boosters ?? []) {
    if ((b.igniteAt ?? 0) > 0) continue;
    T += b.count * b.engine.count * engineThrustSL(b.engine) * (b.engine.solid ? solidProfile(0, b.engine.peakFactor) : 1);
  }
  return T;
}
