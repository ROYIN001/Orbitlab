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
import { minimumBurnDistance, TERMINAL_PLANNED_THROTTLE_FRACTION, TERMINAL_RESTART } from './recovery-guidance';
import { detachedAeroTable } from './aero-tables';

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
    this.recoveryEnabled = !!debris.recovery && options.vehicleId === 'falcon9' && options.stage?.id === 's1';
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
      propellantOffsetSeconds: elapsed, rcsConsumedKgByStage: consumed,
    });
    // Base-first descent is not the slender ascent: the returning stage keeps
    // the detached body's own table. The continuation remains an estimate,
    // recorded outside the small-angle envelope.
    return { ...result, aero: this.initialSnapshot.aero };
  }

  private sync(time: number): void {
    const d = this.debris;
    d.r = { ...this.state.r }; d.v = { ...this.state.v };
    d.dir = quatRotate(this.state.attitudeQ, v3(1, 0, 0)); d.mass = this.snapshot.mass;
    d.rigid = this.runtime.telemetry(this.state, time, this.snapshot);
  }

  private guidance(time: number, contact: RigidContact): { nose: Vec3; throttle: number; engines: number[] } {
    const d = this.debris, rc = d.recovery, up = normalize(this.state.r);
    if (!this.recoveryEnabled || !rc || !this.options.stage) return { nose: d.dir, throttle: 0, engines: [] };
    const air = this.runtime.airVelocity(this.state, time), speed = norm(air), downward = -dot(air, up);
    const height = Math.max(0, norm(this.state.r) - R_EARTH), stage = this.options.stage;
    let throttle = 0, engines: number[] = [];
    if (downward > 0 && rc.phase === 'coast' && height < 70000) rc.phase = 'entry';
    if (rc.phase === 'entry') {
      if (rc.propellant > rc.landingReserve && height > 25000 && speed > 1400) {
        throttle = 1; engines = [8, 0, 4]; // Centre and opposing ring engines.
      } else rc.phase = 'landing';
    }
    let nose = downward > 0 && speed > 20 ? scale(air, -1 / speed) : up;
    if (rc.phase === 'landing' && (downward > 0 || this.terminalCoast) && height < 20000) {
      const g = MU_EARTH / norm(this.state.r) ** 2;
      const thrust = engineThrust(stage.engine, atmosphere(height).p) * this.engineHealth(8);
      const deceleration = Math.max(0.1, thrust / this.snapshot.mass - g);
      const stopDistance = Math.max(0, (downward ** 2 - 4) / (2 * deceleration));
      if (rc.landingStarted || contact.tailClearance < 1.15 * stopDistance + 20) {
        rc.landingStarted = true;
        const groundDownward = -contact.verticalSpeed;
        const demandedAcceleration = Math.max(0, g + (groundDownward ** 2 - 4) / (2 * Math.max(1, contact.tailClearance)));
        const requestedThrottle = thrust > 0 ? this.snapshot.mass * demandedAcceleration / thrust : 0;
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
              downwardMs: groundDownward, minimumThrustN: thrust * planned,
              minimumFlowKgS: engineMassFlow(stage.engine) * planned * this.engineHealth(8),
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
        engines = throttle > 0 ? [8] : [];
        // A landing targets zero surface-relative drift. Wind still enters the
        // actual aerodynamic loads; following zero airspeed would land drifting
        // downwind even when the vehicle tracked that command perfectly.
        const surfaceVelocity = sub(this.state.v, cross(EARTH_RATE, this.state.r));
        const horizontal = sub(surfaceVelocity, scale(up, dot(surfaceVelocity, up)));
        const lateral = scale(horizontal, -0.35);
        const lateralLimit = demandedAcceleration * Math.tan(15 * DEG);
        nose = normalize(add(scale(up, demandedAcceleration), norm(lateral) > lateralLimit ? scale(normalize(lateral), lateralLimit) : lateral));
      }
    }
    engines = engines.filter(index => this.engineHealth(index) > 0);
    const activeEngines = engines.reduce((sum, index) => sum + this.engineHealth(index), 0);
    if (activeEngines === 0) throttle = 0;
    if (rc.propellant <= 0) { throttle = 0; engines = []; }
    rc.burning = throttle > 0;
    rc.thrustVac = activeEngines * stage.engine.thrustVac * throttle;
    rc.thrustSL = activeEngines * stage.engine.thrustSL * throttle;
    rc.mdot = activeEngines * engineMassFlow(stage.engine) * throttle;
    return { nose, throttle, engines };
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
      const landed = acceptsRigidLanding(contact, this.recoveryEnabled);
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
      if (landed || d.visual.kind !== 'fairing') events.push({ key: landed ? 'evt.boosterLanded' : 'evt.stageImpact',
        severity: landed ? 'success' : 'info', params: { name: d.name, speed: contact.totalSpeed,
          tiltDeg: contact.tiltRad / DEG, verticalSpeed: contact.verticalSpeed, horizontalSpeed: contact.horizontalSpeed } });
      return { events, contact };
    };
    const initialContact = contactNow();
    if (initialContact.clearance <= 0) return finish(initialContact, time);
    let elapsed = 0;
    while (elapsed < dt - 1e-12 && d.alive) {
      const at = time + elapsed, contact = contactNow(), command = this.guidance(at, contact);
      let h = Math.min(0.01, dt - elapsed);
      const rc = d.recovery;
      if (this.recoveryEnabled && rc && rc.mdot > 0) {
        const usable = rc.phase === 'entry' ? Math.max(0, rc.propellant - rc.landingReserve) : rc.propellant;
        h = Math.min(h, usable / rc.mdot);
      }
      if (!(h > 0)) throw new RangeError('Detached body integration made no progress');
      const pressure = atmosphere(norm(this.state.r) - R_EARTH).p;
      const result = this.runtime.step(at, this.state, h, command.nose, v3(0, 0, 1),
        (offset, consumed) => this.recoveryEnabled
          ? this.recoverySnapshot(offset, pressure, command.throttle, command.engines, consumed)
          : this.initialSnapshot);
      this.state = result.state; this.snapshot = result.snapshot;
      if (this.recoveryEnabled && rc) rc.propellant = Math.max(0, rc.propellant - rc.mdot * h);
      elapsed += h;
      this.sync(time + elapsed);
      // Preserve numerical status from the actual integration, including any
      // out-of-envelope aero continuation and actuator saturation.
      d.rigid = result.telemetry;
      const nextContact = contactNow();
      if (nextContact.clearance <= 0) return finish(nextContact, time + elapsed);
    }
    return { events };
  }
}

export function createRigidDebris(debris: Debris, split: PartitionedRigidBody, config: DynamicsConfig,
  parentSnapshot: RigidVehicleSnapshot, options: RigidDebrisOptions): RigidDebrisRuntime {
  return new RigidDebrisRuntime(debris, split, config, parentSnapshot, options);
}

/** Same reserve rule as the legacy mission planner, in kg. This is an estimate. */
export const rigidLandingReserve = (stage: StageSpec): number => stage.dryMass * (Math.exp(800 / (G0 * stage.engine.ispSL)) - 1);
