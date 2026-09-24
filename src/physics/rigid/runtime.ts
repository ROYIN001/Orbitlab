/** Flight adapter: commands request torque; only physical wrenches change state. */
import type { DynamicsConfig } from '../../types';
import { atmosphere } from '../atmosphere';
import { DEG, G0, OMEGA_EARTH, R_EARTH } from '../constants';
import { gravityJ2 } from '../gravity';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import { allocateEngineGimbals, allocateRcs, createEngineStates, engineWrench, stepEngineActuators, stepRcs, type EngineActuatorSpec, type EngineActuatorState } from './actuators';
import { aerodynamicWrench, staticAeroMoment, windVelocityECI, type WindScenario } from './aero';
import { attitudeControl, rateControl, type ControlDemand, type ControlGains, type ControlTrace } from './control';
import { encodeLoopLimits, type AttitudeLoopTelemetry } from './loop';
import { linearise, type LinearModel } from './linear';
import { integrateRigidStep, rigidDerivative, type RigidState } from './integrator';
import { matVecMul, quatFromAxisAngle, quatFromBasis, quatInverseRotate, quatMultiply, quatRotate, type Mat3, type Quat } from './math';
import { attitudeTestDuration, attitudeTestOffset, validateAttitudeTestSpec, type AttitudeTestRecord, type AttitudeTestSpec } from './attitude-test';
import { NavigationSystem, type NavigationOptions } from '../nav/navigation';
import type { RigidVehicleSnapshot } from './mass';
import { RIGID_MODEL_VERSION } from './config';
import { fuelAwareCoastRates } from './pointing';
import { FlexBody, type FlexOptions } from './flex';
import { cloneWindProfile, type RigidCommand, type RigidTelemetry } from './telemetry';

export type SnapshotProvider = (elapsed: number, consumed: Readonly<Record<string, number>>) => RigidVehicleSnapshot;
/** How often the flown vehicle's attitude loop is linearised (roadmap G04), s. */
export const LINEARISE_EVERY_S = 0.5;
/** A side-effect-free evaluation of a step's model (G04's linearisation). */
interface LinearProbe { engineStates?: unknown; extraMomentBody?: Vec3 }
export interface RigidRuntimeOptions {
  /** Internal RK step only; command/actuator/RCS cadence remains the outer step. */
  integrationStepS?: number;
  /** Maximum inertia-difference interval; bounded by outer dt/4, independent of RK refinement. */
  derivativeStepS?: number;
  /** Reduced point-exit model is a sensitivity comparison, not exact internal-flow dynamics. */
  massFlowModel?: 'quasiSteady' | 'reducedFlux';
  /** Explicit sensitivity override; never mutate shared flight gains. */
  controlGains?: ControlGains;
  /** Slosh, bending and the notch filter (roadmap P05). Absent or all off: the rigid body. */
  flex?: FlexOptions;
  /** Record the attitude loop's decisions in the telemetry (roadmap G03); reads the loop, never changes it. */
  recordLoop?: boolean;
  /** E04: the weight of the aerodynamic feed-forward, 0–1; absent, 1 (the gimbals are asked for M − M_aero). */
  feedForward?: number;
  /** E04: false when the pitch–yaw gains were set by hand, which P05's flexible-vehicle cap then leaves alone. */
  capPitchYawGains?: boolean;
  /** G02: inertial navigation aided by GNSS and a star tracker; the autopilot then flies on its estimate. */
  navigation?: NavigationOptions;
}
export interface RigidAccelerations {
  propulsionECI: Vec3;
  aerodynamicECI: Vec3;
  gravityECI: Vec3;
}

/** Reduced point-exit angular-flow comparison. Positions are relative to CG,
 * outward mass rates are positive. This omits arbitrary internal fluid motion
 * and finite exit disks; it is not a general open-system dynamics formula. */
export function pointExitFlowMoment(inertiaRate: Mat3, omega: Vec3,
  exits: readonly { positionRelativeCg: Vec3; massFlowKgS: number }[]): Vec3 {
  if (!inertiaRate.every(Number.isFinite) || ![omega.x, omega.y, omega.z].every(Number.isFinite)) throw new RangeError('Invalid angular-flow input');
  let moment = scale(matVecMul(inertiaRate, omega), -1);
  for (const exit of exits) {
    if (!Number.isFinite(exit.massFlowKgS) || exit.massFlowKgS < 0 || ![exit.positionRelativeCg.x, exit.positionRelativeCg.y, exit.positionRelativeCg.z].every(Number.isFinite)) throw new RangeError('Invalid point-exit flow');
    moment = sub(moment, scale(cross(exit.positionRelativeCg, cross(omega, exit.positionRelativeCg)), exit.massFlowKgS));
  }
  return moment;
}
export const FLIGHT_CONTROL_GAINS: ControlGains = {
  attitudeGain: v3(1.5, 1.5, 1.5), rateGain: v3(3, 3, 3),
  maxRate: v3(8 * DEG, 5 * DEG, 5 * DEG), maxAngularAcceleration: v3(5 * DEG, 3 * DEG, 3 * DEG),
};

/** Full roll reference, including polar/parallel degeneracies. */
export function targetAttitude(nose: Vec3, sideReference: Vec3): Quat {
  const x = normalize(nose);
  let z = sub(sideReference, scale(x, dot(x, sideReference)));
  if (norm(z) < 1e-8) {
    const reference = Math.abs(x.z) < 0.8 ? v3(0, 0, 1) : v3(0, 1, 0);
    z = sub(reference, scale(x, dot(x, reference)));
  }
  z = normalize(z);
  return quatFromBasis(x, normalize(cross(z, x)), z);
}

/** Declared educational weather, ENU m/s, reproducible at any integration step. */
export function windScenario(config: DynamicsConfig): WindScenario {
  if (config.wind === 'calm') return { kind: 'calm', seed: config.seed };
  return { kind: config.wind === 'shear' ? 'shear' : 'constant',
    velocityENU: v3(8, 0, 0), referenceAltitude: 0, altitudeRangeM: [0, 12000],
    shearPerMeterENU: config.wind === 'shear' ? v3(0.001, 0.0005, 0) : v3(),
    gustAmplitudeENU: v3(2, 1, 0), gustPeriodSeconds: 12, seed: config.seed };
}

/** Throw `RangeError` for a flight command the runtime would refuse. */
export function validateRigidCommand(command: RigidCommand): void {
  if (!['auto', 'manual'].includes(command.mode) || ![command.rates.x, command.rates.y, command.rates.z, command.throttle].every(Number.isFinite)
    || command.throttle < 0 || command.throttle > 1 || Math.max(Math.abs(command.rates.x), Math.abs(command.rates.y), Math.abs(command.rates.z)) > 5 * DEG + 1e-12) {
    throw new RangeError('Invalid rigid flight command');
  }
}

export class RigidRuntime {
  command: RigidCommand = { mode: 'auto', rates: v3(), throttle: 1 };
  readonly consumed: Record<string, number> = {};
  readonly wind: WindScenario;
  readonly massFlowModel: 'quasiSteady' | 'reducedFlux';
  readonly integrationStepS: number;
  readonly derivativeStepS: number;
  readonly controlGains: ControlGains;
  private engines = new Map<string, EngineActuatorState>();
  /** The flexible body, when slosh, bending or the notch filter is modelled. */
  readonly flex?: FlexBody;
  /** Whether `step` records the attitude loop (roadmap G03). */
  readonly recordLoop: boolean;
  /** E04: the aerodynamic feed-forward's weight, and whether P05's cap applies to the pitch–yaw gains. */
  readonly feedForward: number;
  readonly capPitchYawGains: boolean;
  /** G02: the vehicle's navigation, when it flies one. */
  readonly navigation?: NavigationSystem;
  /** The attitude loop linearised about a recent step (roadmap G04), and when it is next due. */
  latestLinear?: LinearModel;
  private nextLinearAt = -Infinity;
  /** E04: an attitude test in flight — its offset added to the target — and its record. */
  attitudeTest?: AttitudeTestRecord;
  snapshot?: RigidVehicleSnapshot;
  constructor(config: DynamicsConfig, readonly bodyId = 'vehicle', options: RigidRuntimeOptions = {}) {
    this.wind = windScenario(config);
    this.integrationStepS = options.integrationStepS ?? 0.01;
    if (!Number.isFinite(this.integrationStepS) || this.integrationStepS <= 0 || this.integrationStepS > 0.02) throw new RangeError('Invalid rigid integration step');
    this.derivativeStepS = options.derivativeStepS ?? 0.001;
    if (!Number.isFinite(this.derivativeStepS) || this.derivativeStepS <= 0) throw new RangeError('Invalid inertia derivative step');
    this.massFlowModel = options.massFlowModel ?? 'quasiSteady';
    if (!['quasiSteady', 'reducedFlux'].includes(this.massFlowModel)) throw new RangeError('Invalid rotational mass-flow model');
    const gains = options.controlGains ?? FLIGHT_CONTROL_GAINS;
    this.controlGains = { attitudeGain: { ...gains.attitudeGain }, rateGain: { ...gains.rateGain },
      maxRate: { ...gains.maxRate }, maxAngularAcceleration: { ...gains.maxAngularAcceleration }, responseDelayS: gains.responseDelayS };
    this.recordLoop = options.recordLoop === true;
    this.feedForward = options.feedForward ?? 1;
    if (!(this.feedForward >= 0 && this.feedForward <= 1)) throw new RangeError('Invalid feed-forward weight');
    this.capPitchYawGains = options.capPitchYawGains ?? true;
    if (options.navigation) this.navigation = new NavigationSystem(options.navigation);
    const flex = options.flex;
    if (flex && (flex.slosh || flex.bending || flex.notch)) {
      if (![flex.notchZetaZero, flex.notchZetaPole, flex.notchFrequencyScale, flex.bandwidthRatio, flex.sloshDamping, flex.bendingDamping].every(Number.isFinite)
        || flex.notchZetaZero < 0 || !(flex.notchZetaPole > 0) || !(flex.notchFrequencyScale > 0) || !(flex.bandwidthRatio > 0) || flex.sloshDamping < 0 || flex.bendingDamping < 0
        || (flex.imuStation !== undefined && !(flex.imuStation >= 0 && flex.imuStation <= 1))) throw new RangeError('Invalid flexible-body options');
      this.flex = new FlexBody({ ...flex });
    }
  }

  setCommand(command: RigidCommand): void {
    validateRigidCommand(command);
    this.command = { ...command, rates: { ...command.rates } };
  }

  windAt(r: Vec3, time: number): Vec3 { return windVelocityECI(this.wind, r, norm(r) - R_EARTH, time); }
  airVelocity(state: Pick<RigidState, 'r' | 'v'>, time: number): Vec3 {
    return sub(sub(state.v, cross(v3(0, 0, OMEGA_EARTH), state.r)), this.windAt(state.r, time));
  }
  private environment(state: RigidState, time: number, snapshot: RigidVehicleSnapshot) {
    const atm = atmosphere(norm(state.r) - R_EARTH);
    return aerodynamicWrench(snapshot.aero, { density: atm.rho, speedOfSound: atm.a,
      airVelocityBody: quatInverseRotate(state.attitudeQ, this.airVelocity(state, time)),
      omegaBody: state.omegaBody, cgBody: snapshot.cg });
  }
  private specs(snapshot: RigidVehicleSnapshot): EngineActuatorSpec[] {
    return snapshot.engines.map(engine => ({ ...engine, maxThrust: engine.thrustBudgetN }));
  }

  private authority(snapshot: RigidVehicleSnapshot): { center: Vec3; radius: Vec3; delay: number } {
    const center = v3(), radius = v3();
    let delay = 0;
    for (const engine of snapshot.engines) {
      const thrust = engine.thrustBudgetN, direction = normalize(engine.directionBody), arm = sub(engine.positionBody, snapshot.cg);
      const neutral = scale(cross(arm, direction), thrust);
      const derivatives = engine.gimbalAxesBody.map(axis => scale(cross(arm, cross(normalize(axis), direction)), thrust));
      if (thrust > 0 && derivatives.length && engine.maxGimbalRateRadS > 0) {
        for (const axis of ['x', 'y', 'z'] as const) {
          // Finite sin-angle authority, subtract worst axial cosine loss.
          // The two-hinge small-angle geometry receives an additional margin.
          radius[axis] += Math.max(0, Math.sin(engine.maxGimbalRad) * Math.hypot(...derivatives.map(d => d[axis]))
            - (1 - Math.cos(engine.maxGimbalRad)) * Math.abs(neutral[axis])) * (derivatives.length > 1 ? 0.95 : 1);
        }
        delay = Math.max(delay, engine.timeConstantS + engine.maxGimbalRad / engine.maxGimbalRateRadS);
      }
      center.x += neutral.x; center.y += neutral.y; center.z += neutral.z;
    }
    const positive = v3(), negative = v3();
    for (const jet of snapshot.rcsThrusters) {
      const reservoir = snapshot.rcs.find(r => r.stageId === jet.stageId);
      if (!reservoir || reservoir.initialPropellantKg <= (this.consumed[jet.stageId] ?? 0)) continue;
      const moment = scale(cross(sub(jet.positionBody, snapshot.cg), normalize(jet.directionBody)), jet.maxThrust);
      for (const axis of ['x', 'y', 'z'] as const) { positive[axis] += Math.max(0, moment[axis]); negative[axis] += Math.max(0, -moment[axis]); }
    }
    for (const axis of ['x', 'y', 'z'] as const) radius[axis] += Math.min(positive[axis], negative[axis]);
    return { center, radius, delay };
  }

  /**
   * The angular acceleration the stage's attitude thrusters give at the
   * controller's braking share (the slower of pitch and yaw), rad/s², times
   * `seconds` — the rate they can bring to rest in that time. Infinity when the
   * stage has no thrusters with gas left; the engines do not count.
   */
  coastArrestRate(snapshot: RigidVehicleSnapshot, seconds: number): number {
    const jets = snapshot.rcsThrusters;
    const reservoir = snapshot.rcs.find(r => r.stageId === jets[0]?.stageId);
    if (!jets.length || !reservoir || reservoir.initialPropellantKg <= (this.consumed[reservoir.stageId] ?? 0)) return Infinity;
    const positive = v3(), negative = v3();
    for (const jet of jets) {
      const moment = scale(cross(sub(jet.positionBody, snapshot.cg), normalize(jet.directionBody)), jet.maxThrust);
      for (const axis of ['y', 'z'] as const) { positive[axis] += Math.max(0, moment[axis]); negative[axis] += Math.max(0, -moment[axis]); }
    }
    let rate = Infinity;
    (['y', 'z'] as const).forEach((axis) => {
      const row = axis === 'y' ? 1 : 2;
      const inertiaBound = Math.abs(snapshot.inertia[row * 3]) + Math.abs(snapshot.inertia[row * 3 + 1]) + Math.abs(snapshot.inertia[row * 3 + 2]);
      rate = Math.min(rate, 0.35 * Math.min(positive[axis], negative[axis]) / Math.max(1e-12, inertiaBound) * seconds);
    });
    return rate;
  }

  /** Command cone for attached ascent only; never clip aerodynamic forces.
   * Soyuz's verified reference program permits up to 65% of its conservative
   * torque radius for aerodynamic trim, leaving 35% before axis coupling.
   * Falcon retains its separately tested 35% trim/65% reserve program.
   * These are guidance margins, not changes to hardware authority. The rate
   * controller below separately uses 35% of the remaining actual torque. */
  ascentAngleLimit(snapshot: RigidVehicleSnapshot, dynamicPressure: number, mach = 0): number {
    if (!Number.isFinite(dynamicPressure) || dynamicPressure < 0) throw new RangeError('Invalid dynamic pressure');
    const authority = this.authority(snapshot);
    const trimShare = snapshot.geometry.vehicleId === 'soyuz21a' ? 0.65 : 0.35;
    const margin = trimShare * Math.max(0, Math.min(authority.radius.y - Math.abs(authority.center.y), authority.radius.z - Math.abs(authority.center.z)));
    if (snapshot.aero.table) {
      // The tabulated moment is not proportional to sin α — the crossflow grows
      // with sin²α and moves the centre of pressure — so find the largest angle
      // whose static moment the trim share can hold.
      const moment = (angle: number) => staticAeroMoment(snapshot.aero, mach, dynamicPressure, angle, snapshot.cg);
      const ceiling = snapshot.aero.validAngleRad;
      if (!(dynamicPressure > 0) || moment(ceiling) <= margin) return dynamicPressure > 0 ? ceiling : Math.PI;
      let lo = 0, hi = ceiling;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (moment(mid) <= margin) lo = mid; else hi = mid;
      }
      return lo;
    }
    const coefficient = snapshot.aero.normalSlopePerRad + Math.max(...snapshot.aero.cdMach.map(([, cd]) => cd), 0);
    const perSinAngle = dynamicPressure * snapshot.aero.referenceArea * coefficient * norm(sub(snapshot.aero.cpBody, snapshot.cg));
    return perSinAngle > 0 ? Math.min(snapshot.aero.validAngleRad, Math.asin(Math.min(1, margin / perSinAngle))) : Math.PI;
  }

  private scheduledGains(snapshot: RigidVehicleSnapshot, aeroMoment: Vec3, omega: Vec3): ControlGains {
    const authority = this.authority(snapshot), gyro = cross(omega, matVecMul(snapshot.inertia, omega));
    const acceleration = v3();
    (['x', 'y', 'z'] as const).forEach((axis, index) => {
      const offset = authority.center[axis] + aeroMoment[axis] - gyro[axis];
      // Symmetric braking reserve, conservative about cross-axis inertia.
      const margin = 0.35 * Math.max(0, authority.radius[axis] - Math.abs(offset));
      const inertiaBound = Math.abs(snapshot.inertia[index * 3]) + Math.abs(snapshot.inertia[index * 3 + 1]) + Math.abs(snapshot.inertia[index * 3 + 2]);
      acceleration[axis] = Math.min(this.controlGains.maxAngularAcceleration[axis], margin / Math.max(1e-12, inertiaBound));
    });
    return { ...this.controlGains, maxAngularAcceleration: acceleration,
      responseDelayS: Math.max(this.controlGains.responseDelayS ?? 0, authority.delay) };
  }
  /** Apply a discrete upstream ignition/failure at the current clock. Chamber
   * throttle is instantaneous in this model; gimbal angles and fuel are not. */
  synchronizeEngineBudgets(snapshot: RigidVehicleSnapshot): void {
    for (const spec of this.specs(snapshot)) {
      const current = this.engines.get(spec.id) ?? createEngineStates([spec])[0];
      this.engines.set(spec.id, { deflections: [...current.deflections], throttle: spec.maxThrust > 0 ? 1 : 0 });
    }
    this.snapshot = snapshot;
  }

  telemetry(state: RigidState, time: number, snapshot: RigidVehicleSnapshot, saturated = false, rawError = 0, loop?: AttitudeLoopTelemetry): RigidTelemetry {
    const specs = this.specs(snapshot);
    const states = specs.map(spec => this.engines.get(spec.id) ?? createEngineStates([spec])[0]);
    const wrench = engineWrench(specs, states, snapshot.cg);
    const aero = this.environment(state, time, snapshot);
    return { modelVersion: RIGID_MODEL_VERSION, dataRevision: snapshot.dataRevision,
      windProfile: cloneWindProfile(this.wind), integrationMaxStepS: Math.min(this.integrationStepS, 0.01),
      flowDerivativeMaxStepS: this.derivativeStepS,
      massFlowModel: this.massFlowModel, bodyId: this.bodyId,
      configurationId: snapshot.components.map(part => part.id).sort().join('|'),
      attitudeQ: { ...state.attitudeQ }, omegaBody: { ...state.omegaBody }, cgBody: { ...snapshot.cg },
      inertiaBody: [...snapshot.inertia] as unknown as RigidTelemetry['inertiaBody'], renderOffsetBody: sub(snapshot.activeBase, snapshot.cg),
      controlMode: this.command.mode, engineDeflections: Object.fromEntries(wrench.engines.map(e => [e.id, [...e.deflections]])),
      commandRatesBody: { ...this.command.rates }, commandThrottle: this.command.throttle,
      engineDirectionsBody: Object.fromEntries(wrench.engines.map(e => [e.id, { ...e.directionBody }])),
      engineThrottles: Object.fromEntries(specs.map((e, i) => [e.id, e.maxThrust > 0
        ? states[i].throttle * (snapshot.engines[i].upstreamThrottle ?? 1) : 0])),
      rcsPropellantKg: snapshot.rcs.reduce((sum, r) => sum + Math.max(0, r.initialPropellantKg - (this.consumed[r.stageId] ?? 0)), 0),
      saturated, angleOfAttack: aero.angleOfAttack, sideslip: aero.sideslip, aeroWithinEnvelope: aero.withinEnvelope,
      windECI: this.windAt(state.r, time), rawQuaternionNormError: rawError,
      ...(this.flex ? { flex: this.flex.telemetry() } : {}),
      ...(loop ? { attitudeLoop: loop } : {}) };
  }

  /** The attitude loop as it ran this step (roadmap G03): copies, never references into the loop. */
  private loopRecord(trace: ControlTrace, step: { target?: Quat; demand: ControlDemand; unfilteredMoment: Vec3; sensedOmega: Vec3;
    gains: ControlGains; aeroMoment: Vec3; engineMoment: Vec3; rcsMoment: Vec3; gasLimited: boolean; gimbalLimited: boolean; rcsLimited: boolean;
    specs: readonly EngineActuatorSpec[]; engineStates: readonly EngineActuatorState[]; rcsDuties: readonly number[] }): AttitudeLoopTelemetry {
    const copy = (v: Vec3): Vec3 => ({ x: v.x, y: v.y, z: v.z }), g = step.gains, notch = !!this.flex?.options.notch;
    let gimbalUse = 0;
    step.specs.forEach((spec, index) => {
      if (spec.maxGimbalRad > 0) gimbalUse = Math.max(gimbalUse, Math.hypot(...step.engineStates[index].deflections) / spec.maxGimbalRad);
    });
    return {
      ...(step.target ? { targetQ: { ...step.target } } : {}),
      ...(trace.attitudeError ? { attitudeErrorBody: copy(trace.attitudeError) } : {}),
      desiredRatesBody: copy(step.demand.desiredRates),
      sensedOmegaBody: copy(step.sensedOmega),
      angularAccelerationBody: copy(step.demand.angularAcceleration),
      momentDemandBody: copy(step.unfilteredMoment),
      ...(notch ? { momentFilteredBody: copy(step.demand.momentBody) } : {}),
      aeroMomentBody: copy(step.aeroMoment), engineMomentBody: copy(step.engineMoment), rcsMomentBody: copy(step.rcsMoment),
      gains: { attitudeGain: copy(g.attitudeGain), rateGain: copy(g.rateGain), maxRate: copy(g.maxRate),
        maxAngularAcceleration: copy(g.maxAngularAcceleration), ...(g.responseDelayS !== undefined ? { responseDelayS: g.responseDelayS } : {}) },
      limits: encodeLoopLimits(trace, { gasBudget: step.gasLimited, gimbal: step.gimbalLimited, rcs: step.rcsLimited }),
      gimbalUse: Math.min(1, gimbalUse), rcsDuty: step.rcsDuties.reduce((max, duty) => Math.max(max, duty), 0),
    };
  }

  /**
   * E04: fly an attitude test from `time` (the next step): its offset rotates the guidance target
   * about the target's own body axis, and every step records the offset and the attitude reached.
   * Only a runtime that records its loop can record the test.
   */
  startAttitudeTest(spec: AttitudeTestSpec, time: number): AttitudeTestRecord {
    if (!this.recordLoop) throw new Error('An attitude test needs the loop record');
    validateAttitudeTestSpec(spec);
    const model = this.latestLinear && time - this.latestLinear.t <= 1 ? this.latestLinear : undefined;
    this.attitudeTest = { spec: { ...spec }, startS: time, t: [], command: [], response: [], limits: [], baselineRad: 0, done: false, ...(model ? { model } : {}) };
    return this.attitudeTest;
  }

  step(time: number, state: RigidState, dt: number, noseCommand: Vec3, sideReference: Vec3, provider: SnapshotProvider) {
    if (!Number.isFinite(time) || !Number.isFinite(dt) || dt < 0) throw new RangeError('Invalid runtime time step');
    const initialConsumed = { ...this.consumed };
    const start = provider(0, initialConsumed);
    const aeroStart = this.environment(state, time, start);
    const flex = this.flex;
    const flexStart = flex?.begin(time, dt, start, aeroStart.forceBody, Math.min(this.integrationStepS, 0.01));
    // With bending, the autopilot sees what its IMU reads, not the rigid body.
    const imuCase = flex ? flex.sensed(state.attitudeQ, state.omegaBody) : state;
    // G02: with a navigation system, what the navigation makes of it.
    const sensed = this.navigation ? this.navigation.reading(time, state.r, state.v, imuCase.attitudeQ, imuCase.omegaBody) : imuCase;
    const gains = flex && this.capPitchYawGains ? flex.limitGains(this.scheduledGains(start, aeroStart.momentBody, sensed.omegaBody))
      : this.scheduledGains(start, aeroStart.momentBody, sensed.omegaBody);
    // G03: the trace only reads what the controller decides.
    const trace: ControlTrace | undefined = this.recordLoop ? { stoppingLimited: 0, rateLimited: 0, accelerationLimited: 0 } : undefined;
    const guided = this.command.mode === 'manual' ? undefined : targetAttitude(noseCommand, sideReference);
    // E04: an attitude test adds its offset about the target's own body axis.
    const test = this.attitudeTest && !this.attitudeTest.done && time + 1e-9 >= this.attitudeTest.startS ? this.attitudeTest : undefined;
    const offset = test ? attitudeTestOffset(test.spec, time - test.startS) : 0;
    const target = guided && test && offset !== 0
      ? quatMultiply(guided, quatFromAxisAngle({ x: v3(1, 0, 0), y: v3(0, 1, 0), z: v3(0, 0, 1) }[test.spec.axis], test.spec.sign * offset)) : guided;
    let demand = !target
      ? rateControl(this.command.rates, sensed.omegaBody, start.inertia, gains, trace)
      : attitudeControl(sensed.attitudeQ, target, sensed.omegaBody, start.inertia, gains, trace);
    if (test) {
      const tau = time - test.startS;
      if (!guided) { test.done = true; test.aborted = 'manual'; } else if (trace?.attitudeError) {
        // The attitude reached along the test's axis: the offset less the error left to it, less the error before the test.
        const error = test.spec.sign * trace.attitudeError[test.spec.axis];
        if (!test.t.length) test.baselineRad = error - offset;
        test.t.push(tau); test.command.push(offset); test.response.push(offset - error + test.baselineRad);
        const bit = 1 << { x: 0, y: 1, z: 2 }[test.spec.axis];
        test.limits.push((trace.stoppingLimited & bit ? 1 : 0) | (trace.rateLimited & bit ? 2 : 0) | (trace.accelerationLimited & bit ? 4 : 0));
        if (tau + dt >= attitudeTestDuration(test.spec) - 1e-9) test.done = true;
      }
    }
    let gasLimited = false;
    const specs = this.specs(start);
    const activeStage = start.rcsThrusters[0]?.stageId;
    const reservoir = start.rcs.find(r => r.stageId === activeStage);
    const gas = reservoir ? Math.max(0, reservoir.initialPropellantKg - (this.consumed[reservoir.stageId] ?? 0)) : 0;
    const jets = gas > 0 ? start.rcsThrusters : [];
    // Orbital mission pointing shares a finite gas supply across every slew.
    // Shape the command with a braking reserve before allocating actual jets.
    // Recovery has its own guidance and is not an orbital pointing maneuver.
    if (this.bodyId === 'vehicle' && this.command.mode === 'auto' && norm(state.r) - R_EARTH > 140e3
      && specs.every(engine => engine.maxThrust === 0)) {
      const budget = fuelAwareCoastRates({ requestedRatesBody: demand.desiredRates, omegaBody: sensed.omegaBody,
        inertiaBody: start.inertia, remainingGasKg: gas, jets });
      if (budget.limited) {
        demand = { ...rateControl(budget.ratesBody, sensed.omegaBody, start.inertia, gains, trace), saturated: true };
        gasLimited = true;
      }
    }
    const unfilteredMoment = demand.momentBody;
    if (flex?.options.notch) demand = { ...demand, momentBody: flex.filterMoment(demand.momentBody) };
    const states = specs.map(spec => this.engines.get(spec.id) ?? createEngineStates([spec])[0]);
    // E04: the air's moment fed forward, at the mission's weight (the default, 1, is the moment itself).
    const fedForward = this.feedForward === 1 ? aeroStart.momentBody : scale(aeroStart.momentBody, this.feedForward);
    const allocation = allocateEngineGimbals(specs, specs.map(e => e.maxThrust > 0 ? 1 : 0), sub(demand.momentBody, fedForward), start.cg);
    const actualStates = stepEngineActuators(specs, states, allocation.commands, dt);
    const midpointStates = stepEngineActuators(specs, states, allocation.commands, dt / 2);
    const engineActual = engineWrench(specs, midpointStates, start.cg);
    const residual = sub(sub(demand.momentBody, fedForward), engineActual.momentBody);
    const rcsAllocation = allocateRcs(jets, residual, start.cg, Math.max(1, start.aero.referenceLength));
    const rcs = stepRcs(jets, rcsAllocation.duties, gas, dt, start.cg);
    const snapshots = new Map<number, RigidVehicleSnapshot>([[0, start]]);
    const snapshotAt = (elapsed: number): RigidVehicleSnapshot => {
      const cached = snapshots.get(elapsed);
      if (cached) return cached;
      const consumed = { ...initialConsumed };
      if (reservoir) consumed[reservoir.stageId] = (initialConsumed[reservoir.stageId] ?? 0) + rcs.consumedKg * (dt > 0 ? elapsed / dt : 0);
      const snapshot = provider(elapsed, consumed);
      snapshots.set(elapsed, snapshot);
      return snapshot;
    };
    const statesAt = (elapsed: number): EngineActuatorState[] => elapsed === dt ? actualStates : elapsed === dt / 2 ? midpointStates
      : stepEngineActuators(specs, states, allocation.commands, elapsed);
    const flowMoment = (elapsed: number, snapshot: RigidVehicleSnapshot, omega: Vec3): Vec3 => {
      if (this.massFlowModel === 'quasiSteady' || dt === 0) return v3();
      // Reduced negligible/symmetric internal-motion comparison. Point exits,
      // no finite nozzle disk, slosh or arbitrary internal-fluid momentum.
      // Both inertia variation and outward angular momentum flux are required.
      // Caller must split at every discontinuous configuration/fuel event.
      const h = Math.min(this.derivativeStepS, dt / 4);
      const before = Math.max(0, elapsed - h), after = Math.min(dt, elapsed + h);
      const left = snapshotAt(before).inertia, right = snapshotAt(after).inertia;
      const derivative = right.map((value, index) => (value - left[index]) / (after - before)) as unknown as Mat3;
      const exits = snapshot.engines.map(engine => ({ positionRelativeCg: sub(engine.positionBody, snapshot.cg), massFlowKgS: engine.massFlowKgS }));
      jets.forEach((jet, index) => exits.push({ positionRelativeCg: sub(jet.positionBody, snapshot.cg), massFlowKgS: jet.maxThrust * rcs.duties[index] / (jet.isp * G0) }));
      return pointExitFlowMoment(derivative, omega, exits);
    };
    let nonGrav = v3(), accelerationsStart: RigidAccelerations | undefined;
    // `probe` (G04's linearisation only): other engine states, or an extra pure moment, and no side effects.
    const model = (at: number, trial: Readonly<RigidState>, probe?: LinearProbe) => {
      const elapsed = Math.max(0, Math.min(dt, at - time));
      const snapshot = snapshotAt(elapsed);
      const engine = engineWrench(this.specs(snapshot), (probe?.engineStates as EngineActuatorState[] | undefined) ?? statesAt(elapsed), snapshot.cg);
      // RCS duty and actual impulse are held for the control interval; update
      // moment about the trial CG without changing the reservoir a second time.
      const rcsHeld = add(rcs.wrench.momentBody, cross(sub(start.cg, snapshot.cg), rcs.wrench.forceBody));
      const rcsMoment = probe?.extraMomentBody ? add(rcsHeld, probe.extraMomentBody) : rcsHeld;
      const aero = this.environment(trial, at, snapshot);
      if (trial.flex) {
        const gravityECI = gravityJ2(trial.r);
        const result = flex!.loads({ snapshot, attitudeQ: trial.attitudeQ, omegaBody: trial.omegaBody, flex: trial.flex, engine,
          enginePositions: this.specs(snapshot).map(spec => spec.positionBody), rcsJets: jets, rcsDuties: rcs.duties,
          rcsForceBody: rcs.wrench.forceBody, rcsMomentBody: rcsMoment, aeroForceBody: aero.forceBody, aeroMomentBody: aero.momentBody,
          gravityECI, flowMomentBody: flowMoment(elapsed, snapshot, trial.omegaBody) }, !accelerationsStart && !probe);
        const forceECI = quatRotate(trial.attitudeQ, result.forceBody);
        if (!probe) nonGrav = scale(forceECI, 1 / snapshot.mass);
        if (!accelerationsStart && !probe) accelerationsStart = {
          propulsionECI: scale(quatRotate(trial.attitudeQ, sub(result.forceBody, aero.forceBody)), 1 / snapshot.mass),
          aerodynamicECI: scale(quatRotate(trial.attitudeQ, aero.forceBody), 1 / snapshot.mass), gravityECI,
        };
        return { mass: snapshot.mass, inertiaBody: snapshot.inertia, forceECI, momentBody: result.momentBody, externalAccelerationECI: gravityECI,
          flex: { accelerationECI: result.accelerationECI, omegaDotBody: result.omegaDotBody, rates: result.rates } };
      }
      const forceECI = quatRotate(trial.attitudeQ, add(add(engine.forceBody, rcs.wrench.forceBody), aero.forceBody));
      if (!probe) nonGrav = scale(forceECI, 1 / snapshot.mass);
      const gravityECI = gravityJ2(trial.r);
      if (!accelerationsStart && !probe) accelerationsStart = {
        propulsionECI: scale(quatRotate(trial.attitudeQ, add(engine.forceBody, rcs.wrench.forceBody)), 1 / snapshot.mass),
        aerodynamicECI: scale(quatRotate(trial.attitudeQ, aero.forceBody), 1 / snapshot.mass), gravityECI,
      };
      return { mass: snapshot.mass, inertiaBody: snapshot.inertia, forceECI,
        momentBody: add(add(engine.momentBody, rcsMoment), aero.momentBody), externalAccelerationECI: gravityECI,
        massFlowMomentBody: flowMoment(elapsed, snapshot, trial.omegaBody) };
    };
    // Control targets, RCS duties and their finite impulse are chosen once above.
    // Refining only this coupled plant integration cannot change control cadence.
    // All trial snapshots/deflections retain elapsed time from the outer interval.
    const substeps = Math.max(1, Math.ceil(dt / Math.min(this.integrationStepS, 0.01)));
    const stepSize = dt / substeps;
    // With bending the flexible solution runs even with nothing to integrate (a
    // quasi-static mode), for its loads; slosh alone only while a tank sloshes.
    const initial: RigidState = flexStart && (flexStart.length || flex!.options.bending) ? { ...state, flex: flexStart } : state;
    let integratedState = initial, rawError = 0;
    for (let index = 0; index < substeps; index++) {
      const integrated = integrateRigidStep(time + index * stepSize, integratedState, stepSize, model);
      integratedState = integrated.state;
      rawError = Math.max(rawError, Math.abs(integrated.quaternionNormBeforeNormalize - 1));
    }
    // The integrator intentionally does not evaluate loads for a zero-duration
    // read. Return the same initial physical acceleration decomposition anyway.
    if (!accelerationsStart) model(time, initial);
    const end = snapshotAt(dt);
    if (flex && dt > 0) {
      flex.end(time + dt, integratedState.flex);
      const { flex: _carried, ...rigid } = integratedState;
      integratedState = rigid;
    }
    // G02: the navigation follows the IMU to the step's end, where guidance and the cut-off read it.
    if (this.navigation && dt > 0) {
      const imuEnd = flex ? flex.imuCase(integratedState.attitudeQ, integratedState.omegaBody) : integratedState;
      this.navigation.advance(time + dt, integratedState.r, integratedState.v, imuEnd.attitudeQ, imuEnd.omegaBody);
    }
    if (dt > 0) {
      specs.forEach((spec, i) => this.engines.set(spec.id, actualStates[i]));
      if (reservoir) this.consumed[reservoir.stageId] = (initialConsumed[reservoir.stageId] ?? 0) + rcs.consumedKg;
    }
    this.snapshot = end;
    const remainingTorque = sub(residual, rcs.wrench.momentBody);
    const saturated = demand.saturated || norm(remainingTorque) > Math.max(1, norm(demand.momentBody) * 0.05);
    // G04: the loop linearised about this step's start, every half second.
    if (trace && dt > 0 && time + 1e-9 >= this.nextLinearAt) {
      this.nextLinearAt = (Math.floor(time / LINEARISE_EVERY_S + 1e-9) + 1) * LINEARISE_EVERY_S;
      try {
        const flexContext = flex?.linearContext() ?? { tanks: [], bending: false, imuSlope: 0 };
        const requested = sub(demand.momentBody, fedForward), throttles = specs.map(e => e.maxThrust > 0 ? 1 : 0);
        const baseMoment = engineWrench(specs, states, start.cg).momentBody;
        const axisOf = { x: v3(1, 0, 0), y: v3(0, 1, 0), z: v3(0, 0, 1) } as const;
        this.latestLinear = linearise({ time, T: dt, state: initial, hasJets: jets.length > 0,
          derivative: (trial, probe) => rigidDerivative(time, trial, (at, s) => model(at, s, probe ?? {})),
          aeroMoment: (trial) => this.environment(trial, time, start).momentBody,
          engineProbe: (axis, dM) => {
            if (!specs.some(e => e.maxThrust > 0 && e.gimbalAxesBody.length > 0)) return null;
            const moved = allocateEngineGimbals(specs, throttles, add(requested, scale(axisOf[axis], dM)), start.cg);
            const engineStates = states.map((state, i) => ({ ...state, deflections: state.deflections.map((d, j) =>
              d + (moved.commands[i].deflections[j] ?? 0) - (allocation.commands[i].deflections[j] ?? 0)) }));
            return { engineStates, momentChange: dot(sub(engineWrench(specs, engineStates, start.cg).momentBody, baseMoment), axisOf[axis]) };
          },
          tanks: flexContext.tanks, bending: flexContext.bending, imuSlope: flexContext.imuSlope,
          tau: specs.reduce((m, e) => (e.maxThrust > 0 && e.gimbalAxesBody.length > 0 ? Math.max(m, e.timeConstantS) : m), 0),
          inertia: v3(start.inertia[0], start.inertia[4], start.inertia[8]), kTheta: gains.attitudeGain, kOmega: gains.rateGain,
          ...(flexContext.notch ? { notch: flexContext.notch } : {}), ...(this.feedForward !== 1 ? { feedForward: this.feedForward } : {}) });
      } catch { /* a record only: never let the analysis stop a flight */ }
    }
    const loop = trace ? this.loopRecord(trace, { target, demand, unfilteredMoment, sensedOmega: sensed.omegaBody,
      gains, aeroMoment: aeroStart.momentBody, engineMoment: engineActual.momentBody, rcsMoment: rcs.wrench.momentBody,
      gasLimited, gimbalLimited: allocation.saturated, rcsLimited: rcsAllocation.saturated, specs, engineStates: actualStates, rcsDuties: rcs.duties }) : undefined;
    return { state: integratedState, snapshot: end, nonGrav, accelerationsStart: accelerationsStart!,
      telemetry: this.telemetry(integratedState, time + dt, end, saturated, rawError, loop) };
  }
}
