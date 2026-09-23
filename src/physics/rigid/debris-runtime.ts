/** Physical detached-body evolution. Recovery commands finite actuators; it
 * never replaces velocity or attitude with a desired value. */
import type { DynamicsConfig, StageSpec } from '../../types';
import type { Debris } from '../simulation';
import { atmosphere } from '../atmosphere';
import { tumblingDragCoefficient } from '../aero';
import { DEG, G0, MU_EARTH, OMEGA_EARTH, R_EARTH } from '../constants';
import { engineMassFlow, engineThrust } from '../vehicle';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import { buildDetachedStage, type RigidVehicleSnapshot } from './mass';
import type { PartitionedRigidBody } from './partition';
import { RigidRuntime, type RigidRuntimeOptions } from './runtime';
import type { RigidState } from './integrator';
import { quatRotate } from './math';
import { eciToLatLon } from '../orbital';
import { CATCH_HORIZONTAL_SPEED, CATCH_VERTICAL_SPEED } from '../sim/return-constants';
import { minimumBurnDistance, TERMINAL_PLANNED_THROTTLE_FRACTION, TERMINAL_RESTART } from './recovery-guidance';
import { detachedAeroTable, GRID_FIN_SLOPE_PER_M2 } from './aero-tables';
import { gridFinSurfaces, type ControlSurfaceSpec } from './surfaces';
import type { ControlGains } from './control';
import {
  airVelocityAtDescent, boostbackCommand, brakingHeight, distanceFromTarget, ENTRY_BURN_CEILING, entryStep, landingDivert, predictDescent,
  type DescentModel, type EntryState, type ReturnTarget,
} from '../sim/return-guidance';

/**
 * The stages the rigid model flies back: every Falcon first stage — Falcon
 * 9's, and Falcon Heavy's core and side boosters, which are the same stage —
 * and Starship's Super Heavy.
 */
const RIGID_RECOVERABLE = new Set(['falcon9:s1', 'falconheavy:core', 'falconheavy:side', 'starship:superheavy']);

/**
 * Attitude limits of a stage flown back to a target: it turns round on its
 * engines' gimbals after separation, which the ascent's 5 °/s rate limit would
 * stretch over 40 s of a boostback that has no time to spare. The same
 * attitude and rate gains as `FLIGHT_CONTROL_GAINS`.
 */
export const RETURN_CONTROL_GAINS: ControlGains = {
  attitudeGain: v3(1.5, 1.5, 1.5), rateGain: v3(3, 3, 3),
  maxRate: v3(8 * DEG, 12 * DEG, 12 * DEG), maxAngularAcceleration: v3(5 * DEG, 6 * DEG, 6 * DEG),
};

/** What a targeted return needs beyond the body itself. */
export interface ReturnGuidanceOptions {
  /** Greenwich sidereal angle at mission time zero, rad */
  gmst0: number;
  /** the descent as the prediction flies it */
  model: DescentModel;
  /** entry-burn target speed, m/s */
  entryTargetSpeed: number;
}

/** Seconds after separation before the centre engine lights for the flip: clear of the upper stage. */
const FLIP_IGNITION_DELAY = 5;
/** The boostback lights when the stage points within this angle of its burn. */
const BOOSTBACK_LIGHT_ANGLE = 10 * DEG;
const BOOSTBACK_TRIM_DV = 40;
const BOOSTBACK_DONE_DV = 0.3;
const RETURN_REPLAN_S = 0.5;
const TRIM_REPLAN_S = 0.1;
const ENTRY_MAX_TILT = 15 * DEG;
const LANDING_MAX_TILT = 20 * DEG;
/** An entry burn lights on the centre engine alone, turning the stage, until it points within this of its burn. */
const ENTRY_ALIGN_ANGLE = 15 * DEG;
/** Fraction of the centre engine's thrust a targeted landing burn is timed for. */
export const RETURN_LANDING_LEVEL = 0.8;
/** A drone-ship stage's turn after separation is done within this angle and rate. */
const SHIP_FLIP_DONE_ANGLE = 3 * DEG;
const SHIP_FLIP_DONE_RATE = 0.2 * DEG;
/** Tilt and turn rate the tower's arms can take a booster at (estimates). */
const CATCH_TILT = 5 * DEG;
const CATCH_RATE = 3 * DEG;
/** Dynamic pressure below which the grid fins are not asked to steer, Pa. */
const AERO_STEER_MIN_Q = 500;
/** Largest angle of attack the aerodynamic steering asks for. */
const AERO_STEER_MAX_ALPHA = 8 * DEG;
/** Seconds of landing burn kept beyond what the divert needs. */
const DIVERT_MARGIN_S = 5;

export interface RigidContact {
  r: Vec3; clearance: number; tailClearance: number; tiltRad: number;
  angularRateRadS: number; verticalSpeed: number; horizontalSpeed: number; totalSpeed: number;
}
export interface RigidDebrisEvent { key: string; severity: 'info' | 'success'; params: Record<string, string | number> }
export interface RigidDebrisStepResult { events: RigidDebrisEvent[]; contact?: RigidContact }
export interface RigidDebrisOptions {
  vehicleId: string; stage?: StageSpec; consumed?: Readonly<Record<string, number>>;
  /** Preserve the parent's spatial engine-out allocation; separation is no repair. */
  engineFraction?: number;
  /** Continue the same explicit sensitivity model after separation. */
  runtimeOptions?: RigidRuntimeOptions;
  /** Disclosed terminal timing sensitivity; predictor and plant use the same values. */
  terminalRestart?: { ignitionDelayS: number; thrustRiseS: number };
  /** A strap-on: its attached model has no attitude thrusters, so the returning body has none either. */
  withoutRcs?: boolean;
  /** Present when the body is flown to a target (`debris.recovery.target`). */
  returnGuidance?: ReturnGuidanceOptions;
}
const EARTH_RATE = v3(0, 0, OMEGA_EARTH);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Cylinder support approximation about the actual CG, including sideways
 * contact. Landing legs/contact elasticity are outside this disclosed model. */
export function rigidContactMetrics(state: RigidState, snapshot: RigidVehicleSnapshot,
  length: number, radius: number, groundElevation: (r: Vec3) => number): RigidContact {
  const axis = quatRotate(state.attitudeQ, v3(1, 0, 0));
  const up = normalize(state.r), tiltRad = Math.acos(clamp(dot(axis, up), -1, 1));
  const evaluate = (x: number) => {
    const offset = quatRotate(state.attitudeQ, sub(v3(x, 0, 0), snapshot.cg));
    const centre = add(state.r, offset), radial = normalize(centre);
    const projection = sub(radial, scale(axis, dot(radial, axis)));
    const side = norm(projection) > 1e-12 ? scale(normalize(projection), -radius) : v3();
    const contactOffset = add(offset, side), point = add(state.r, contactOffset);
    return { clearance: norm(point) - R_EARTH - groundElevation(point), point, contactOffset };
  };
  const tail = evaluate(0), nose = evaluate(length), lowest = tail.clearance <= nose.clearance ? tail : nose;
  const omegaI = quatRotate(state.attitudeQ, state.omegaBody);
  const pointVelocity = add(state.v, cross(omegaI, lowest.contactOffset));
  const surfaceVelocity = sub(pointVelocity, cross(EARTH_RATE, lowest.point));
  const normal = normalize(lowest.point), verticalSpeed = dot(surfaceVelocity, normal);
  return { r: lowest.point, clearance: lowest.clearance, tailClearance: tail.clearance, tiltRad,
    angularRateRadS: norm(sub(omegaI, EARTH_RATE)), verticalSpeed,
    horizontalSpeed: norm(sub(surfaceVelocity, scale(normal, verticalSpeed))), totalSpeed: norm(surfaceVelocity) };
}

/** Deliberately strict educational touchdown gate. Terrain intersection alone
 * is impact; a recoverable label never turns a sideways slow collision into success. */
export function acceptsRigidLanding(contact: RigidContact, recoveryEnabled: boolean): boolean {
  return recoveryEnabled && contact.tailClearance <= 0.05 && contact.tiltRad <= 10 * DEG
    && contact.angularRateRadS <= 5 * DEG && Math.abs(contact.verticalSpeed) <= 5
    && contact.horizontalSpeed <= 3 && contact.totalSpeed <= 6;
}

export class RigidDebrisRuntime {
  state: RigidState;
  snapshot: RigidVehicleSnapshot;
  readonly runtime: RigidRuntime;
  readonly recoveryEnabled: boolean;
  readonly terminalRestart: Readonly<{ ignitionDelayS: number; thrustRiseS: number }>;
  private readonly initialSnapshot: RigidVehicleSnapshot;
  private terminalCoast = false;
  private terminalIgnitionTime?: number;

  constructor(readonly debris: Debris, split: PartitionedRigidBody, config: DynamicsConfig,
    parentSnapshot: RigidVehicleSnapshot, readonly options: RigidDebrisOptions) {
    if (options.engineFraction !== undefined && (!Number.isFinite(options.engineFraction)
      || options.engineFraction < 0 || options.engineFraction > 1)) throw new RangeError('Invalid detached engine health');
    this.terminalRestart = { ...TERMINAL_RESTART, ...options.terminalRestart };
    if (![this.terminalRestart.ignitionDelayS, this.terminalRestart.thrustRiseS]
      .every(value => Number.isFinite(value) && value >= 0)) throw new RangeError('Invalid terminal restart timing');
    this.state = { r: { ...split.state.r }, v: { ...split.state.v }, attitudeQ: { ...split.state.attitudeQ }, omegaBody: { ...split.state.omegaBody } };
    this.runtime = new RigidRuntime(config, `debris.${debris.id}`, options.runtimeOptions);
    Object.assign(this.runtime.consumed, options.consumed ?? {});
    this.recoveryEnabled = !!debris.recovery && !!options.stage && RIGID_RECOVERABLE.has(`${options.vehicleId}:${options.stage.id}`);
    const length = debris.visual.length, radius = debris.visual.diameter / 2;
    const mach = [0, 0.6, 1, 1.2, 2, 5, 10, 25];
    // Its own table: lift at whichever end meets the flow, crossflow drag on
    // its whole side when it tumbles, and grid-fin lift at the top of a stage
    // flown back for recovery.
    const table = detachedAeroTable(length, 2 * radius, debris.cd, debris.area,
      { gridFins: this.recoveryEnabled && !!options.stage?.gridFins, halfShell: debris.visual.kind === 'fairing' });
    this.initialSnapshot = { ...parentSnapshot, ...split.properties,
      engines: [], rcs: [], rcsThrusters: [], activeBase: v3(),
      geometry: { vehicleId: options.vehicleId, length, stageBases: [v3()], stageHeights: [length],
        fairingBase: v3(length), payloadBase: v3(length), boosters: [], estimated: true },
      aero: { referenceArea: debris.area, referenceLength: length, cpBody: v3(table.cpX[0]),
        cdMach: mach.map(m => [m, tumblingDragCoefficient(debris.cd, m)] as const), normalSlopePerRad: 2,
        rateDamping: v3(0.2 * (2 * radius / Math.max(length, 0.1)) ** 2, 10, 10), validAngleRad: 15 * DEG, table } };
    this.snapshot = this.recoveryEnabled ? this.recoverySnapshot(0, 0, 0, [], this.runtime.consumed) : this.initialSnapshot;
    // An exact partition must not silently become a differently loaded body.
    const scaleI = Math.max(1, ...split.properties.inertia.map(Math.abs));
    if (Math.abs(this.snapshot.mass - split.properties.mass) > 1e-8 * split.properties.mass
      || norm(sub(this.snapshot.cg, split.properties.cg)) > 1e-8
      || this.snapshot.inertia.some((value, i) => Math.abs(value - split.properties.inertia[i]) > 1e-8 * scaleI)) {
      throw new RangeError('Detached recovery data must match the conservative partition');
    }
    this.sync(debris.createdAt);
  }

  private recoverySnapshot(elapsed: number, pressure: number, throttle: number, engines: readonly number[], consumed: Readonly<Record<string, number>>) {
    const stage = this.options.stage!, rc = this.debris.recovery!;
    const result = buildDetachedStage(this.options.vehicleId, stage, rc.propellant, {
      pressure, coreThrottle: throttle, activeEngineIndices: engines,
      engineFraction: this.options.engineFraction,
      propellantOffsetSeconds: elapsed, rcsConsumedKgByStage: consumed, withoutRcs: this.options.withoutRcs,
    });
    // Base-first descent is not the slender ascent: the returning stage keeps
    // the detached body's own table. The continuation remains an estimate,
    // recorded outside the small-angle envelope.
    return { ...result, aero: this.initialSnapshot.aero, ...(this.finsDeployed() ? { surfaces: this.gridFins } : {}) };
  }

  /**
   * A stage flown to a target steers on its grid fins once they are out —
   * after the boostback, as Falcon 9 deploys them. The original, untargeted
   * recovery keeps them as fixed surfaces only, as it always has.
   */
  private finsDeployed(): boolean {
    const rc = this.debris.recovery;
    return !!rc?.target && !!this.options.returnGuidance && !!this.options.stage?.gridFins
      && rc.phase !== 'flip' && rc.phase !== 'boostback';
  }
  private get gridFins(): ControlSurfaceSpec[] {
    return this.finSpecs ??= gridFinSurfaces(this.options.stage!.id, this.debris.visual.length, this.debris.visual.diameter, GRID_FIN_SLOPE_PER_M2);
  }
  private finSpecs?: ControlSurfaceSpec[];

  private sync(time: number): void {
    const d = this.debris;
    d.r = { ...this.state.r }; d.v = { ...this.state.v };
    d.dir = quatRotate(this.state.attitudeQ, v3(1, 0, 0)); d.mass = this.snapshot.mass;
    d.rigid = this.runtime.telemetry(this.state, time, this.snapshot);
  }

  /** Events raised by the guidance, collected by `step`. */
  private raised: RigidDebrisEvent[] = [];

  private guidance(time: number, contact: RigidContact): { nose: Vec3; throttle: number; engines: number[] } {
    const d = this.debris, rc = d.recovery, up = normalize(this.state.r);
    if (!this.recoveryEnabled || !rc || !this.options.stage) return { nose: d.dir, throttle: 0, engines: [] };
    if (rc.target && this.options.returnGuidance) return this.applyCommand(this.returnGuidance(time, contact));
    const air = this.runtime.airVelocity(this.state, time), speed = norm(air), downward = -dot(air, up);
    const height = Math.max(0, norm(this.state.r) - R_EARTH);
    let throttle = 0, engines: number[] = [];
    if (downward > 0 && rc.phase === 'coast' && height < 70000) rc.phase = 'entry';
    if (rc.phase === 'entry') {
      if (rc.propellant > rc.landingReserve && height > 25000 && speed > 1400) {
        throttle = 1; engines = this.trio; // Centre and opposing ring engines.
      } else rc.phase = 'landing';
    }
    let nose = downward > 0 && speed > 20 ? scale(air, -1 / speed) : up;
    if (rc.phase === 'landing') {
      const landing = this.landingCommand(time, contact, nose, undefined);
      if (landing) { nose = landing.nose; throttle = landing.throttle; engines = landing.engines; }
    }
    return this.applyCommand({ nose, throttle, engines });
  }

  /**
   * The landing burn: a constant deceleration to the ground, flown down to
   * the minimum throttle and, below it, as one latched coast and a single
   * finite restart. `target` adds the zero-effort-miss divert that steers onto
   * a landing zone or a drone ship; without it the stage only takes out its
   * drift over the ground. Undefined until the burn is due.
   */
  private landingCommand(time: number, contact: RigidContact, coastNose: Vec3, target: ReturnTarget | undefined):
    { nose: Vec3; throttle: number; engines: number[] } | undefined {
    const d = this.debris, rc = d.recovery!, up = normalize(this.state.r), stage = this.options.stage!;
    const air = this.runtime.airVelocity(this.state, time), downward = -dot(air, up);
    const height = Math.max(0, norm(this.state.r) - R_EARTH);
    let nose = coastNose, throttle = 0, engines: number[] = [];
    if ((downward > 0 || this.terminalCoast) && height < 20000) {
      const g = MU_EARTH / norm(this.state.r) ** 2;
      const thrust = engineThrust(stage.engine, atmosphere(height).p) * this.health(this.centre);
      const deceleration = Math.max(0.1, thrust / this.snapshot.mass - g);
      const stopDistance = Math.max(0, (downward ** 2 - 4) / (2 * deceleration));
      if (rc.landingStarted || contact.tailClearance < 1.15 * stopDistance + 20) {
        rc.landingStarted = true;
        const groundDownward = -contact.verticalSpeed;
        const demandedAcceleration = Math.max(0, g + (groundDownward ** 2 - 4) / (2 * Math.max(1, contact.tailClearance)));
        // Super Heavy's three inner engines cannot throttle below its weight;
        // two of them, or one, can. Fly the burn on as many of them as the
        // thrust asked for allows, so it can hover over the arms instead of
        // coasting blind to a single restart.
        const set = this.landingSet === 'one' && !this.terminalCoast ? this.hoverSet(this.snapshot.mass * demandedAcceleration, height) : this.finalSet;
        this.finalSet = set;
        const setThrust = set === this.centre ? thrust : engineThrust(stage.engine, atmosphere(height).p) * this.health(set);
        const requestedThrottle = setThrust > 0 ? this.snapshot.mass * demandedAcceleration / setThrust : 0;
        const minimumThrottle = stage.engine.minThrottle ?? 1;
        // A low-mass stage cannot hover below minimum thrust. A single latched
        // terminal coast/restart replaces rapid on/off pulses. The final burn
        // has finite delay/rise and cannot be restarted again before contact.
        if (!this.terminalCoast && requestedThrottle < minimumThrottle) this.terminalCoast = true;
        if (this.terminalCoast) {
          if (this.terminalIgnitionTime === undefined) {
            const density = atmosphere(height).rho;
            // Timed for a throttle in the middle of the range, so the burn can
            // go down as well as up once it is lit (TERMINAL_PLANNED_THROTTLE_FRACTION).
            const planned = minimumThrottle + TERMINAL_PLANNED_THROTTLE_FRACTION * (1 - minimumThrottle);
            const brakingDistance = minimumBurnDistance({ massKg: this.snapshot.mass, propellantKg: rc.propellant,
              downwardMs: groundDownward, minimumThrustN: setThrust * planned,
              minimumFlowKgS: engineMassFlow(stage.engine) * planned * this.health(set),
              gravityMs2: g + dot(cross(EARTH_RATE, cross(EARTH_RATE, this.state.r)), up),
              dragKgM: 0.5 * density * this.snapshot.aero.referenceArea * this.snapshot.aero.cdMach[0][1],
              windUpMs: downward - groundDownward, ...this.terminalRestart });
            if (brakingDistance >= contact.tailClearance) this.terminalIgnitionTime = time;
          }
          const sinceIgnition = this.terminalIgnitionTime === undefined ? -Infinity : time - this.terminalIgnitionTime;
          // If the finite restart consumes part of the available stopping
          // distance, use feasible extra thrust. The minimum is a lower bound
          // on this final continuous burn, not an arbitrary fixed setting.
          throttle = clamp(requestedThrottle, minimumThrottle, 1)
            * (this.terminalRestart.thrustRiseS === 0
              ? Number(sinceIgnition >= this.terminalRestart.ignitionDelayS)
              : clamp((sinceIgnition - this.terminalRestart.ignitionDelayS) / this.terminalRestart.thrustRiseS, 0, 1));
        } else throttle = clamp(requestedThrottle, minimumThrottle, 1);
        engines = throttle > 0 ? set : [];
        // A landing targets zero surface-relative drift. Wind still enters the
        // actual aerodynamic loads; following zero airspeed would land drifting
        // downwind even when the vehicle tracked that command perfectly.
        const surfaceVelocity = sub(this.state.v, cross(EARTH_RATE, this.state.r));
        const horizontal = sub(surfaceVelocity, scale(up, dot(surfaceVelocity, up)));
        // With a target, the zero-effort-miss divert over the time the
        // constant deceleration takes to reach the ground.
        const lateral = target && this.options.returnGuidance
          ? landingDivert(this.state.r, this.state.v, target, this.options.returnGuidance.gmst0, time,
            (2 * Math.max(1, contact.tailClearance)) / Math.max(1, groundDownward + 2), demandedAcceleration, LANDING_MAX_TILT)
          : scale(horizontal, -0.35);
        const lateralLimit = demandedAcceleration * Math.tan(target ? LANDING_MAX_TILT : 15 * DEG);
        nose = normalize(add(scale(up, demandedAcceleration), norm(lateral) > lateralLimit ? scale(normalize(lateral), lateralLimit) : lateral));
        // Engines off in the terminal coast, a lean only turns the body into
        // the airflow and its lift slides it sideways: a targeted stage falls
        // straight into the air until the restart.
        if (target && throttle === 0) nose = coastNose;
      }
      return { nose, throttle, engines };
    }
    return undefined;
  }

  /** Engines of a targeted landing burn: three while one cannot fly it, then the centre engine. */
  private landingSet: 'three' | 'one' = 'one';

  /**
   * A targeted landing burn. It lights on the drag-aware braking height of the
   * centre engine — or earlier, on three engines, when the stage comes down
   * too far from the target for a short burn to divert (`divertNeedsTime`) —
   * and flies the same constant deceleration with the zero-effort-miss divert.
   * Once one engine can carry the burn it hands over to the centre engine,
   * whose law (`landingCommand`) finishes it, down to the latched terminal
   * coast and single restart of a stage that cannot hover.
   */
  private targetedLanding(time: number, contact: RigidContact, retro: Vec3): { nose: Vec3; throttle: number; engines: number[] } | undefined {
    const d = this.debris, rc = d.recovery!, stage = this.options.stage!, rg = this.options.returnGuidance!, target = rc.target!;
    const up = normalize(this.state.r);
    const air = this.runtime.airVelocity(this.state, time), downward = -dot(air, up);
    const height = Math.max(0, norm(this.state.r) - R_EARTH);
    const g = MU_EARTH / norm(this.state.r) ** 2;
    const perEngine = engineThrust(stage.engine, atmosphere(height).p);
    const one = perEngine * this.health(this.centre);
    const three = perEngine * this.health(this.trio);
    if (!rc.landingStarted) {
      if (!(downward > 0 && height < 20000)) return { nose: this.aeroSteerNose(time, retro), throttle: 0, engines: [] };
      const braking = contact.tailClearance < 1.1 * brakingHeight({ alt: height, surfaceAlt: height - contact.tailClearance, vDown: downward,
        vTouch: 2, mass: this.snapshot.mass, thrust: (y) => engineThrust(stage.engine, atmosphere(Math.max(0, y)).p) * this.health(this.centre) * RETURN_LANDING_LEVEL,
        flow: engineMassFlow(stage.engine) * this.health(this.centre) * RETURN_LANDING_LEVEL, cd: d.cd, area: d.area, gravity: g }) + 10;
      const divert = !braking && this.divertNeedsTime(time, contact, downward, three, g);
      if (!braking && !divert) return { nose: this.aeroSteerNose(time, retro), throttle: 0, engines: [] };
      rc.landingStarted = true;
      this.landingSet = divert ? 'three' : 'one';
    }
    if (this.landingSet === 'three') {
      const groundDownward = -contact.verticalSpeed;
      const aV = Math.max(0, g + (groundDownward ** 2 - 4) / (2 * Math.max(1, contact.tailClearance)));
      const lateral = landingDivert(this.state.r, this.state.v, target, rg.gmst0, time,
        (2 * Math.max(1, contact.tailClearance)) / Math.max(1, groundDownward + 2), aV, LANDING_MAX_TILT);
      const wanted = add(scale(up, aV), lateral);
      const force = this.snapshot.mass * norm(wanted);
      if (force > 0.95 * one) {
        return { nose: normalize(wanted), throttle: clamp(force / Math.max(1, three), stage.engine.minThrottle ?? 1, 1), engines: this.trio };
      }
      this.landingSet = 'one';
    }
    return this.landingCommand(time, contact, retro, target);
  }

  /**
   * Where to point the stage as it falls through the air before the landing
   * burn: base first, leaned so that the body's own lift moves the landing
   * point onto the target. The grid fins hold the angle. A body flying
   * engines first at angle of attack α is pushed against the side its top
   * leans to (the normal force opposes the crossflow), so to move towards D
   * the top leans away from D, by the angle whose lift gives the acceleration
   * the prediction still asks for over the time left before the burn.
   */
  private aeroSteerNose(time: number, retro: Vec3): Vec3 {
    const table = this.snapshot.aero.table;
    const up = normalize(this.state.r), height = norm(this.state.r) - R_EARTH;
    const air = this.runtime.airVelocity(this.state, time), speed = norm(air);
    const atm = atmosphere(Math.max(0, height));
    const q = 0.5 * atm.rho * speed * speed;
    if (!table || !this.finsDeployed() || q < AERO_STEER_MIN_Q || speed < 20) return retro;
    const g = this.solution(time, RETURN_REPLAN_S);
    const downward = Math.max(50, -dot(air, up));
    const tau = Math.max(5, height / downward - 10);
    const wanted = scale(g.dir, g.dvNeeded / tau);
    // Only the part across the flow can be had from lift.
    const across = sub(wanted, scale(retro, dot(wanted, retro)));
    const size = norm(across);
    if (size < 1e-6) return retro;
    const slope = Math.max(0.1, table.baseNormalSlope);
    const alpha = Math.min(AERO_STEER_MAX_ALPHA, (this.snapshot.mass * size) / (q * this.snapshot.aero.referenceArea * slope));
    return normalize(sub(scale(retro, Math.cos(alpha)), scale(across, Math.sin(alpha) / size)));
  }

  /** Where a stage bound for a drone ship points through its coast, and when that was worked out. */
  private entryAttitude?: { t: number; nose: Vec3 };

  /**
   * A stage bound for a drone ship turns round after separation to the
   * attitude it will need at the top of its entry burn — the air velocity it
   * will fall through `ENTRY_BURN_CEILING` with, reversed — on its centre
   * engine at the lowest thrust, then coasts. A stage with no cold gas left
   * (Falcon Heavy's core spends its own on the ascent) could not turn at all
   * during the coast, and turning on three engines at the top of the entry
   * burn pushed the landing point ten kilometres. The turn moves the landing
   * point too, so the ship is stationed on the trajectory it leaves, which is
   * where a real recovery ship is placed from: the planned one.
   */
  private shipFlip(time: number): { nose: Vec3; throttle: number; engines: number[] } {
    const d = this.debris, rc = d.recovery!, rg = this.options.returnGuidance!, stage = this.options.stage!;
    if (!this.entryAttitude || time - this.entryAttitude.t >= 1) {
      const air = airVelocityAtDescent({ r: this.state.r, v: this.state.v, t: time, mass: this.snapshot.mass }, rg.model, ENTRY_BURN_CEILING);
      this.entryAttitude = { t: time, nose: air ? normalize(scale(air, -1)) : d.dir };
    }
    const nose = this.entryAttitude.nose;
    const lit = time - d.createdAt >= FLIP_IGNITION_DELAY;
    const rate = norm(this.state.omegaBody);
    if (lit && Math.acos(clamp(dot(d.dir, nose), -1, 1)) < SHIP_FLIP_DONE_ANGLE && rate < SHIP_FLIP_DONE_RATE) {
      const p = predictDescent({ r: this.state.r, v: this.state.v, t: time, mass: this.snapshot.mass, propellant: rc.propellant, entry: 'pending' },
        rg.model, rc.target!.alt);
      const ll = eciToLatLon(p.r, rg.gmst0 + OMEGA_EARTH * p.t);
      // A new object: recorded frames share the old one.
      rc.target = { ...rc.target!, lat: ll.lat, lon: ll.lon };
      rc.phase = 'coast';
      rc.guidance = undefined;
      return { nose, throttle: 0, engines: [] };
    }
    return { nose, throttle: lit ? stage.engine.minThrottle ?? 1 : 0, engines: lit ? this.centre : [] };
  }

  /** The last landing-point prediction of the unpowered descent (time, miss). */
  private descentMiss?: { t: number; miss: number };

  /**
   * Whether the landing burn has to light now to have time to divert. The
   * prediction is a point mass with axial drag only; the rigid body falls
   * base-first at a few degrees of angle of attack, and the lift of that angle
   * through the dense air below 20 km carries it a few hundred metres off the
   * point the entry burn aimed it at. Nothing but the landing burn can steer
   * down there — the grid fins are not actuators in this model — so the burn
   * lights early enough to take the miss out: a bang-bang divert at the
   * burn's tilt limit needs 2·√(miss / a) seconds, and the burn lasts
   * 2h / (v + 2) at the constant deceleration it flies from here.
   */
  private divertNeedsTime(time: number, contact: RigidContact, downward: number, thrust: number, g: number): boolean {
    const rc = this.debris.recovery!, rg = this.options.returnGuidance!;
    if (!this.descentMiss || time - this.descentMiss.t >= RETURN_REPLAN_S) {
      const p = predictDescent({ r: this.state.r, v: this.state.v, t: time, mass: this.snapshot.mass, propellant: rc.propellant, entry: 'done' },
        rg.model, rc.target!.alt);
      this.descentMiss = { t: time, miss: distanceFromTarget(p.r, rc.target!, rg.gmst0, p.t) };
    }
    const decel = (downward * downward - 4) / (2 * Math.max(1, contact.tailClearance));
    const aV = g + decel;
    if (!(aV < 0.9 * thrust / this.snapshot.mass)) return false;
    const lateral = aV * Math.tan(LANDING_MAX_TILT);
    const needed = 2 * Math.sqrt(this.descentMiss.miss / Math.max(0.1, lateral)) + DIVERT_MARGIN_S;
    return (2 * contact.tailClearance) / Math.max(1, downward + 2) <= needed;
  }

  /** Hand a command to the actuators: only healthy engines, none once the tanks are dry. */
  private applyCommand(command: { nose: Vec3; throttle: number; engines: number[] }): { nose: Vec3; throttle: number; engines: number[] } {
    const rc = this.debris.recovery!, stage = this.options.stage!;
    let { throttle, engines } = command;
    engines = engines.filter(index => this.engineHealth(index) > 0);
    const activeEngines = engines.reduce((sum, index) => sum + this.engineHealth(index), 0);
    if (activeEngines === 0) throttle = 0;
    if (rc.propellant <= 0) { throttle = 0; engines = []; }
    rc.burning = throttle > 0;
    rc.thrustVac = activeEngines * stage.engine.thrustVac * throttle;
    rc.thrustSL = activeEngines * stage.engine.thrustSL * throttle;
    rc.mdot = activeEngines * engineMassFlow(stage.engine) * throttle;
    return { nose: command.nose, throttle, engines };
  }

  /**
   * The engines a returning stage lights. A Falcon octaweb: the centre engine
   * (8) and the entry-burn trio, centre and the two opposite on the ring (0
   * and 4). Super Heavy: the inner three, and the inner thirteen it boosts
   * back and starts its landing burn on.
   */
  private get centre(): number[] { return this.options.stage?.id === 'superheavy' ? [0, 1, 2] : [8]; }
  private get trio(): number[] { return this.options.stage?.id === 'superheavy' ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [8, 0, 4]; }
  /** The engine set the landing burn is on (for the terminal coast and restart). */
  private finalSet: number[] = [];
  private get isSuperHeavy(): boolean { return this.options.stage?.id === 'superheavy'; }
  /**
   * The engines to land on for a thrust of `force`: for a Falcon the centre
   * engine; for Super Heavy the most of its three inner engines whose lowest
   * thrust is still under `force`, falling back to one.
   */
  private hoverSet(force: number, height: number): number[] {
    if (!this.isSuperHeavy) return this.centre;
    const stage = this.options.stage!;
    const per = engineThrust(stage.engine, atmosphere(Math.max(0, height)).p), minimum = stage.engine.minThrottle ?? 1;
    const sets = [[0, 1, 2], [0, 1], [0]];
    // Keep the engines lit while they can fly the thrust asked for: switching
    // on every small change is a step in thrust and in torque each time.
    const current = sets.findIndex(set => set.length === this.finalSet.length);
    if (current >= 0) {
      const set = sets[current], lo = per * this.health(set) * minimum, hi = per * this.health(set);
      if (force >= 0.97 * lo && force <= hi) return set;
      if (force > hi && current > 0) return sets[current - 1];
    }
    for (const set of sets) if (per * this.health(set) * minimum <= force) return set;
    return [0];
  }
  /** Healthy engines among `engines`, as a count. */
  private health(engines: readonly number[]): number { return engines.reduce((sum, i) => sum + this.engineHealth(i), 0); }

  private entryState(): EntryState {
    const rc = this.debris.recovery!;
    return rc.phase === 'entry' ? (rc.entryFlown ? 'burning' : 'armed') : rc.phase === 'landing' ? 'done' : 'pending';
  }

  /** The boostback / entry-correction solution, refreshed every `every` seconds. */
  private solution(time: number, every: number) {
    const rc = this.debris.recovery!, rg = this.options.returnGuidance!;
    const memo = rc.guidance;
    if (memo && time - memo.t < every - 1e-9) return memo;
    const carried = returnPropellant(rc, this.snapshot.mass, this.options.stage!.engine.ispVac);
    const c = boostbackCommand({ r: this.state.r, v: this.state.v, t: time, mass: this.snapshot.mass - (rc.propellant - carried),
      propellant: carried, entry: this.entryState() }, rg.model, rc.target!, rg.gmst0);
    rc.guidance = { t: time, dir: c.dir, dvNeeded: c.dvNeeded, trim: memo?.trim ?? false };
    return rc.guidance;
  }

  /**
   * A stage flown to a target (`sim/return-guidance.ts`): it turns round on
   * its centre engine, boosts back on three, coasts, flies an entry burn that
   * trims the landing point and a landing burn that diverts onto it.
   */
  private returnGuidance(time: number, contact: RigidContact): { nose: Vec3; throttle: number; engines: number[] } {
    const d = this.debris, rc = d.recovery!, stage = this.options.stage!, rg = this.options.returnGuidance!;
    const up = normalize(this.state.r);
    const air = this.runtime.airVelocity(this.state, time), speed = norm(air), downward = -dot(air, up);
    const height = norm(this.state.r) - R_EARTH;
    const retro = speed > 20 ? scale(air, -1 / speed) : up;
    const minimum = stage.engine.minThrottle ?? 1;
    const angleTo = (dir: Vec3) => Math.acos(clamp(dot(d.dir, dir), -1, 1));
    switch (rc.phase) {
      case 'flip': {
        if (rc.target!.kind === 'droneShip') return this.shipFlip(time);
        const g = this.solution(time, RETURN_REPLAN_S);
        // The cold-gas thrusters cannot turn a 40 t stage round in the time a
        // boostback has; the centre engine's gimbal can, at its lowest thrust.
        const lit = time - d.createdAt >= FLIP_IGNITION_DELAY;
        if (angleTo(g.dir) < BOOSTBACK_LIGHT_ANGLE) {
          rc.phase = 'boostback';
          this.raised.push({ key: 'evt.boostbackStart', severity: 'info', params: { name: d.name } });
        }
        return { nose: g.dir, throttle: lit ? minimum : 0, engines: lit ? this.centre : [] };
      }
      case 'boostback': {
        const before = rc.guidance?.dvNeeded ?? Infinity;
        const g = this.solution(time, rc.guidance?.trim ? TRIM_REPLAN_S : RETURN_REPLAN_S);
        const spent = rc.propellant <= rc.landingReserve;
        if (g.dvNeeded < BOOSTBACK_DONE_DV || spent || (g.trim && g.dvNeeded > before + 1e-6)) {
          rc.phase = 'coast';
          rc.guidance = undefined;
          this.raised.push({ key: 'evt.boostbackEnd', severity: 'info', params: { name: d.name } });
          return { nose: retro, throttle: 0, engines: [] };
        }
        if (!g.trim && g.dvNeeded < BOOSTBACK_TRIM_DV) g.trim = true;
        // The last metres per second on the centre engine, throttled down so
        // one control step does not overshoot them.
        const one = engineThrust(stage.engine, atmosphere(Math.max(0, height)).p) * this.health(this.centre) / this.snapshot.mass;
        const throttle = g.trim ? clamp(g.dvNeeded / Math.max(1e-6, one * 1.0), minimum, 1) : 1;
        return { nose: g.dir, throttle, engines: g.trim ? this.centre : this.trio };
      }
      case 'coast':
        if (downward > 0 && height < ENTRY_BURN_CEILING) {
          rc.phase = 'entry';
          rc.guidance = undefined;
        }
        return { nose: retro, throttle: 0, engines: [] };
      case 'entry': {
        const step = entryStep(this.entryState(), downward > 0, height, speed, rc.propellant,
          { targetSpeed: rg.entryTargetSpeed, reserve: rc.landingReserve });
        if (step.burn) {
          if (!rc.entryFlown) this.raised.push({ key: 'evt.entryBurnStart', severity: 'info', params: { name: d.name } });
          rc.entryFlown = true;
          const thrust = this.health(this.trio)
            * engineThrust(stage.engine, atmosphere(Math.max(0, height)).p);
          const aT = thrust / this.snapshot.mass;
          const g = this.solution(time, RETURN_REPLAN_S);
          const tau = Math.max(3, (speed - rg.entryTargetSpeed) / Math.max(1, aT));
          let lateral = scale(g.dir, g.dvNeeded / tau);
          const cap = aT * Math.tan(ENTRY_MAX_TILT);
          if (norm(lateral) > cap) lateral = scale(normalize(lateral), cap);
          const nose = normalize(add(scale(retro, aT), lateral));
          // Coming out of the coast the stage points wherever the boostback
          // left it; three engines lit ninety degrees off would push it a
          // kilometre sideways. The centre engine at its lowest thrust turns
          // it first.
          if (angleTo(nose) > ENTRY_ALIGN_ANGLE) return { nose, throttle: minimum, engines: this.centre };
          return { nose, throttle: 1, engines: this.trio };
        }
        if (step.state === 'armed') return { nose: retro, throttle: 0, engines: [] };
        rc.phase = 'landing';
        rc.guidance = undefined;
        return { nose: retro, throttle: 0, engines: [] };
      }
      case 'landing': {
        const wasStarted = !!rc.landingStarted;
        // A tower's catch point is the surface this burn stops on.
        const surface = rc.target!.kind === 'tower' && !rc.catchPassed
          ? { ...contact, tailClearance: contact.tailClearance - (rc.target!.catchHeight ?? 0) } : contact;
        const landing = this.targetedLanding(time, surface, retro);
        if (!wasStarted && rc.landingStarted) this.raised.push({ key: 'evt.landingBurnStart', severity: 'info', params: { name: d.name } });
        return landing ?? { nose: retro, throttle: 0, engines: [] };
      }
    }
  }

  private engineHealth(index: number): number {
    const failed = (this.options.stage?.engine.count ?? 0) * (1 - (this.options.engineFraction ?? 1));
    return clamp(index + 1 - failed, 0, 1);
  }

  step(time: number, dt: number, groundElevation: (r: Vec3) => number): RigidDebrisStepResult {
    if (![time, dt].every(Number.isFinite) || dt < 0) throw new RangeError('Invalid detached-body timestep');
    const d = this.debris, events: RigidDebrisEvent[] = [];
    if (!d.alive) return { events };
    const contactNow = () => rigidContactMetrics(this.state, this.snapshot, d.visual.length, d.visual.diameter / 2, groundElevation);
    const finish = (contact: RigidContact, contactTime: number): RigidDebrisStepResult => {
      let landed = acceptsRigidLanding(contact, this.recoveryEnabled);
      const target = d.recovery?.target, rg = this.options.returnGuidance;
      let miss: number | undefined;
      if (target && rg) {
        miss = distanceFromTarget(contact.r, target, rg.gmst0, contactTime);
        d.recovery!.missDistance = miss;
        // Off a drone ship's deck is the open sea; a booster meant for a
        // tower's arms has no legs to land on the ground with.
        if ((target.kind === 'droneShip' && miss > target.radius) || target.kind === 'tower') landed = false;
      }
      const onTarget = !!target && miss !== undefined && miss <= target.radius;
      d.alive = false; d.outcome = landed ? 'landed' : 'impact';
      if (d.recovery) {
        d.recovery.landed = landed; d.recovery.burning = false;
        d.recovery.thrustVac = 0; d.recovery.thrustSL = 0; d.recovery.mdot = 0;
      }
      // Contact terminates propulsion. Preserve the integrated pose/velocity,
      // but do not record a permanently lit engine on the stopped body.
      this.snapshot = { ...this.snapshot, rcsThrusters: [], engines: this.snapshot.engines.map(engine => ({
        ...engine, thrustBudgetN: 0, massFlowKgS: 0,
      })) };
      this.runtime.snapshot = this.snapshot;
      d.rigid = this.runtime.telemetry(this.state, contactTime, this.snapshot, d.rigid?.saturated,
        d.rigid?.rawQuaternionNormError);
      const key = !landed ? 'evt.stageImpact' : !onTarget ? 'evt.boosterLanded'
        : target!.kind === 'droneShip' ? 'evt.boosterLandedShip' : 'evt.boosterLandedZone';
      if (landed || d.visual.kind !== 'fairing') events.push({ key,
        severity: landed ? 'success' : 'info', params: { name: d.name, speed: contact.totalSpeed,
          tiltDeg: contact.tiltRad / DEG, verticalSpeed: contact.verticalSpeed, horizontalSpeed: contact.horizontalSpeed,
          ...(target ? { zone: zoneLabel(target), miss: Math.round(miss ?? 0) } : {}) } });
      return { events, contact };
    };
    /**
     * The booster's base has come down to the tower's catch height inside
     * the arms' envelope: slow, upright and steady enough, the arms close on
     * it; otherwise it hits them.
     */
    const catchAt = (contact: RigidContact, contactTime: number, miss: number): RigidDebrisStepResult => {
      const rc = d.recovery!;
      const caught = contact.tiltRad <= CATCH_TILT && contact.angularRateRadS <= CATCH_RATE
        && Math.abs(contact.verticalSpeed) <= CATCH_VERTICAL_SPEED && contact.horizontalSpeed <= CATCH_HORIZONTAL_SPEED;
      d.alive = false; d.outcome = caught ? 'landed' : 'impact';
      rc.landed = caught; rc.caught = caught; rc.missDistance = miss;
      rc.burning = false; rc.thrustVac = 0; rc.thrustSL = 0; rc.mdot = 0;
      this.snapshot = { ...this.snapshot, rcsThrusters: [], engines: this.snapshot.engines.map(engine => ({
        ...engine, thrustBudgetN: 0, massFlowKgS: 0,
      })) };
      this.runtime.snapshot = this.snapshot;
      d.rigid = this.runtime.telemetry(this.state, contactTime, this.snapshot, d.rigid?.saturated, d.rigid?.rawQuaternionNormError);
      events.push({ key: caught ? 'evt.boosterCaught' : 'evt.stageImpact', severity: caught ? 'success' : 'info',
        params: { name: d.name, speed: contact.totalSpeed, tiltDeg: contact.tiltRad / DEG, verticalSpeed: contact.verticalSpeed,
          horizontalSpeed: contact.horizontalSpeed, zone: zoneLabel(rc.target!), miss: Math.round(miss) } });
      return { events, contact };
    };
    const initialContact = contactNow();
    if (initialContact.clearance <= 0) return finish(initialContact, time);
    let elapsed = 0;
    while (elapsed < dt - 1e-12 && d.alive) {
      const at = time + elapsed, contact = contactNow(), command = this.guidance(at, contact);
      if (this.raised.length) { events.push(...this.raised); this.raised = []; }
      let h = Math.min(0.01, dt - elapsed);
      const rc = d.recovery;
      if (this.recoveryEnabled && rc && rc.mdot > 0) {
        const usable = rc.phase === 'entry' || (rc.phase === 'boostback' && rc.target)
          ? Math.max(0, rc.propellant - rc.landingReserve) : rc.propellant;
        h = Math.min(h, usable / rc.mdot);
      }
      if (!(h > 0)) throw new RangeError('Detached body integration made no progress');
      const pressure = atmosphere(norm(this.state.r) - R_EARTH).p;
      // A targeted stage turns round and boosts back on its engines' gimbals
      // and keeps its cold gas for the coast that follows.
      const engineTurn = !!rc?.target && (rc.phase === 'flip' || rc.phase === 'boostback');
      const result = this.runtime.step(at, this.state, h, command.nose, v3(0, 0, 1),
        (offset, consumed) => {
          if (!this.recoveryEnabled) return this.initialSnapshot;
          const snapshot = this.recoverySnapshot(offset, pressure, command.throttle, command.engines, consumed);
          return engineTurn ? { ...snapshot, rcsThrusters: [] } : snapshot;
        });
      this.state = result.state; this.snapshot = result.snapshot;
      if (this.recoveryEnabled && rc) rc.propellant = Math.max(0, rc.propellant - rc.mdot * h);
      elapsed += h;
      this.sync(time + elapsed);
      // Preserve numerical status from the actual integration, including any
      // out-of-envelope aero continuation and actuator saturation.
      d.rigid = result.telemetry;
      const nextContact = contactNow();
      const tower = rc?.target?.kind === 'tower' && !rc.catchPassed && this.options.returnGuidance ? rc.target : undefined;
      if (tower && nextContact.tailClearance - (tower.catchHeight ?? 0) <= 0) {
        const miss = distanceFromTarget(this.state.r, tower, this.options.returnGuidance!.gmst0, time + elapsed);
        if (miss > tower.radius) rc!.catchPassed = true;
        else return catchAt(nextContact, time + elapsed, miss);
      }
      if (nextContact.clearance <= 0) return finish(nextContact, time + elapsed);
    }
    return { events };
  }
}

/**
 * The propellant a stage will carry into its entry burn, as the prediction
 * should assume it. After the boostback it is what is in the tanks; before
 * and during it, what the boostback's remaining velocity will leave — by the
 * rocket equation on the last solution's `dvNeeded`, or on
 * `ENTRY_BUDGET_DV` less than a full load before there is a solution. The
 * prediction otherwise flies an entry burn that spends the boostback's own
 * propellant and puts the landing point hundreds of kilometres off.
 */
export function returnPropellant(rc: NonNullable<Debris['recovery']>, mass: number, isp: number): number {
  if (rc.phase !== 'flip' && rc.phase !== 'boostback') return rc.propellant;
  const need = rc.guidance?.dvNeeded;
  if (need === undefined) {
    const empty = mass - rc.propellant + rc.landingReserve;
    return Math.min(rc.propellant, rc.landingReserve + empty * (Math.exp(ENTRY_BUDGET_DV / (G0 * isp)) - 1));
  }
  return Math.max(Math.min(rc.propellant, rc.landingReserve), rc.propellant - mass * (1 - Math.exp(-need / (G0 * isp))));
}

/** Entry burn the prediction allows for before a boostback has a solution, m/s. */
const ENTRY_BUDGET_DV = 300;

/** "LZ-1" for a landing zone id "lz1"; the drone ship keeps its id. */
export function zoneLabel(target: ReturnTarget): string {
  return target.kind === 'pad' ? target.id.toUpperCase().replace(/^LZ/, 'LZ-') : target.kind === 'tower' ? 'OLM' : target.id;
}

export function createRigidDebris(debris: Debris, split: PartitionedRigidBody, config: DynamicsConfig,
  parentSnapshot: RigidVehicleSnapshot, options: RigidDebrisOptions): RigidDebrisRuntime {
  return new RigidDebrisRuntime(debris, split, config, parentSnapshot, options);
}

/** Same reserve rule as the legacy mission planner, in kg. This is an estimate. */
export const rigidLandingReserve = (stage: StageSpec): number => stage.dryMass * (Math.exp(800 / (G0 * stage.engine.ispSL)) - 1);
