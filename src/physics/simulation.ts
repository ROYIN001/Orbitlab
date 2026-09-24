/**
 * Launch-to-orbit simulation.
 *
 * Frame: Earth-centered inertial (ECI). The legacy point-mass model uses a
 * slew-limited thrust direction, RK4 and analytic Kepler coasts. Supported
 * six-DOF profiles integrate translation and rigid-body rotation under J2,
 * finite engine/RCS wrenches and estimated aerodynamics. Guidance and control
 * use a 0.01 s clock; a smaller numerical step refines integration inside that
 * same control interval, without changing the controller's update frequency.
 *
 * This file is the flight loop: the clock, the scheduler, the integration of
 * each step and the derived state. The mission logic lives in `sim/`:
 *
 * - `sim/ascent.ts` — when the ascent cuts off, max-Q, the structural placard
 * - `sim/staging.ts` — boosters, stages, fairing and payload separation
 * - `sim/burns.ts` — the orbital burn sequence and the end of the mission
 * - `sim/debris.ts` — separated hardware and recovered boosters
 * - `sim/failures.ts` — injected failures
 * - `sim/rigid-link.ts` — the six-DOF body behind the stages
 */
import type { MissionConfig, SatelliteSpec, VehicleSpec, GuidanceParams, DynamicsConfig } from '../types';
import { siteById, type SiteExtra } from '../data/sites';
import { vehicleById } from '../data/vehicles';
import { satelliteById } from '../data/satellites';
import { G0, MU_EARTH, R_EARTH, OMEGA_EARTH, DEG, RAD } from './constants';
import { Vec3, v3, add, addScaled, sub, scale, dot, cross, norm, normalize, slerpLimited, clone } from './vec3';
import { atmosphere } from './atmosphere';
import { dragCoefficient, tumblingDragCoefficient } from './aero';
import { cloneRigidTelemetry, type RigidCommand } from './rigid/telemetry';
import { RigidRuntime, type RigidRuntimeOptions } from './rigid/runtime';
import { resolveFlexOptions } from './rigid/flex';
import { limitAscentCommand } from './rigid/control';
import { nosePointingTarget } from './rigid/guidance-attitude';
import { AeroEnvelopeEvents } from './rigid/envelope-events';
import { buildRigidVehicle } from './rigid/mass';
import { rigidContactMetrics } from './rigid/debris-runtime';
import { quatRotate } from './rigid/math';
import { validateDynamics } from './rigid/config';
import { rk4Step } from './integrator';
import { elementsFromState, groundPositionEci, groundVelocityEci, eciToLatLon, propagateKepler, gmst, julianDate, wrapPi } from './orbital';
import { VehicleModel, StageState, engineMassFlow } from './vehicle';
import { AscentGuidance } from './guidance';
import { MissionPlan, planMission, RAAN_TOLERANCE } from './mission';
import { DEFAULT_GUIDANCE, guidanceForVehicle } from './defaults';
import { chronologicalEvents } from './events';
import { AscentMonitor } from './sim/ascent';
import { BurnSequencer } from './sim/burns';
import { DebrisTracker } from './sim/debris';
import { FailureInjector } from './sim/failures';
import { RigidLink } from './sim/rigid-link';
import { Staging } from './sim/staging';
import { pointMassAcceleration } from './sim/forces';
import { RIGID_ASCENT_COMMAND_RATE, RIGID_STEERING_FREEZE_S, TELEMETRY_CAP, TRANSIENT_DT } from './sim/constants';
import type { Debris, EventSeverity, PendingAction, SimEvent, SimState, TelemetrySample } from './sim/types';

export type { SimStatus, EventSeverity, SimEvent, TelemetrySample, DebrisVisual, Debris, Losses, SimState } from './sim/types';
export { hashSeed, mulberry32 } from './sim/seed';
export { FAIRING_HEAT_FLUX_LIMIT, FAIRING_Q_LIMIT, FAIRING_ALTITUDE_FLOOR } from './sim/constants';

/**
 * Merge a vehicle's `guidanceDefaults` into a guidance set, overriding only the
 * fields the caller left at the library default. A parameter the operator (or a
 * tuning run) changed explicitly is always kept.
 *
 * The test is a value comparison, which cannot distinguish "the operator chose
 * the number that happens to be the library default" from "nobody touched it".
 * Callers that know the difference should say so instead of relying on this:
 * pass `guidanceResolved: true` (the merge is then skipped entirely) and build
 * the set with `guidanceForVehicle`, which is also what a user interface should
 * display, so that what is shown and what is flown are the same thing.
 * `runAscent` in `autotune.ts` deliberately measures whatever this merge
 * produces for the caller's own configuration, so a tuning result is never a
 * trajectory the mission will not fly.
 */
export function applyVehicleGuidanceDefaults(g: GuidanceParams, spec: VehicleSpec, model?: DynamicsConfig['model']): GuidanceParams {
  const vd = guidanceForVehicle(spec, DEFAULT_GUIDANCE, model);
  const out: GuidanceParams = { ...g };
  for (const k of Object.keys(vd) as (keyof GuidanceParams)[]) {
    const v = vd[k];
    if (v !== undefined && out[k] === DEFAULT_GUIDANCE[k]) out[k] = v;
  }
  return out;
}

export class Simulation {
  readonly cfg: MissionConfig;
  readonly site: SiteExtra;
  readonly vehicleSpec: VehicleSpec;
  readonly satellite: SatelliteSpec;
  readonly plan: MissionPlan;
  readonly vehicle: VehicleModel;
  readonly guidance: AscentGuidance;
  readonly state: SimState;
  readonly events: SimEvent[] = [];
  readonly telemetry: TelemetrySample[] = [];
  private telemetryGeneration = 0;
  /** Changes when compaction rewrites existing telemetry indexes. */
  get telemetryRevision(): number { return this.telemetryGeneration; }
  /** User-facing occurrence order; `events` remains the append-only detection log. */
  get chronologicalEvents(): readonly SimEvent[] { return chronologicalEvents(this.events); }
  /**
   * @internal Take telemetry recorded by the same mission flown elsewhere —
   * the physics worker (src/session/mirror.ts) — into this never-stepped
   * shell: appended samples, or the whole buffer again after a compaction.
   */
  mirrorTelemetry(samples: readonly TelemetrySample[], reset: boolean, revision: number): void {
    if (reset) this.telemetry.length = 0;
    for (const sample of samples) this.telemetry.push(sample);
    this.telemetryGeneration = revision;
  }
  readonly debris: Debris[] = [];
  private debrisCounter = 0;
  /**
   * @internal Next identifier for a separated body. Numbered per mission, so
   * a flight's debris — and the body names its six-DOF events carry — do not
   * depend on how many missions this page, or this worker, flew before it.
   */
  nextDebrisId(): number { return ++this.debrisCounter; }
  readonly payloadMass: number;
  readonly headless: boolean;
  readonly rigidRuntime?: RigidRuntime;
  private readonly rigidDt: number;
  private advanceRemainder = 0;
  private readonly aeroEnvelopeEvents = new AeroEnvelopeEvents();
  /** @internal Queued actions (ignition, separations, burns), ordered by time. */
  pending: PendingAction[] = [];
  private lastSampleT = -Infinity;
  private readonly siteR0: Vec3;
  /**
   * The pad as a unit vector in the ROTATING (Earth-fixed) frame, and the two
   * cosines that bound `groundElevation`'s fade — all constant, all computed
   * once. See `groundElevation` for why this is worth caching.
   */
  private readonly padEcef: Vec3;
  private readonly padCosNear: number;
  private readonly padCosFar: number;

  // The simulation's parts. Each owns its own state and reaches the shared
  // flight state through this object; `@internal` means "for the parts and
  // the tests", not for the user interface.
  /** @internal staging, fairing and payload separation */
  readonly staging = new Staging(this);
  /** @internal the orbital burn sequence and the end of the mission */
  readonly burns = new BurnSequencer(this);
  /** @internal separated hardware and recovered boosters */
  readonly debrisTracker = new DebrisTracker(this);
  /** @internal six-DOF body bookkeeping */
  readonly rigidLink = new RigidLink(this);
  /** The six-DOF steering held through a burn's last seconds (RIGID_STEERING_FREEZE_S). */
  private frozenCommand: Vec3 | null = null;
  /** The six-DOF vacuum-ascent command, rate-limited (RIGID_ASCENT_COMMAND_RATE). */
  private limitedCommand: Vec3 | null = null;
  /** @internal ascent cut-off, max-Q, structural placard, insertion floor */
  readonly ascent: AscentMonitor;
  /** @internal injected failures */
  readonly failures: FailureInjector;
  constructor(cfgIn: MissionConfig, opts: { headless?: boolean; rigidDt?: number; rigidOptions?: RigidRuntimeOptions } = {}) {
    this.headless = opts.headless ?? false;
    const integrationStepS = opts.rigidDt ?? opts.rigidOptions?.integrationStepS ?? 0.01;
    if (!(integrationStepS > 0 && integrationStepS <= 0.02)) throw new RangeError('Rigid timestep must be in (0, 0.02] s');
    this.rigidDt = 0.01;
    if (cfgIn.dynamics) {
      if (!validateDynamics(cfgIn.dynamics, cfgIn.vehicleId)) throw new RangeError('Invalid dynamics configuration');
      if (cfgIn.dynamics.model === 'sixDof') {
        // Slosh, bending and the notch filter fly on the vehicle only, never on its debris.
        const flex = resolveFlexOptions(cfgIn.dynamics.flex);
        // G03: the flown vehicle records its attitude loop for the inspector (its debris do not).
        const options = { ...opts.rigidOptions, integrationStepS, recordLoop: opts.rigidOptions?.recordLoop ?? true };
        this.rigidRuntime = new RigidRuntime(cfgIn.dynamics, 'vehicle', flex ? { ...options, flex } : options);
      }
    }
    this.site = siteById(cfgIn.siteId);
    this.vehicleSpec = vehicleById(cfgIn.vehicleId);
    // Per-vehicle guidance defaults fill in every parameter the caller left at
    // the library default, so the UI (and any caller that does not merge them
    // itself) flies each launcher with its own pitch program.
    const cfg: MissionConfig = cfgIn.guidanceResolved
      ? cfgIn
      : { ...cfgIn, guidance: applyVehicleGuidanceDefaults(cfgIn.guidance, this.vehicleSpec, cfgIn.dynamics?.model), guidanceResolved: true };
    this.cfg = cfg;
    this.satellite = satelliteById(cfg.satelliteId);
    this.payloadMass = cfg.payloadMassOverride ?? this.satellite.mass;
    this.plan = planMission(cfg, this.site, this.vehicleSpec);
    this.vehicle = new VehicleModel(this.vehicleSpec, this.payloadMass, cfg.boosterRecovery, this.satellite);
    this.guidance = new AscentGuidance(cfg.guidance, this.plan.azimuthRotating, this.plan.ascentInclination, this.plan.insertionAltitude, this.plan.insertionApoapsis);
    this.ascent = new AscentMonitor(this);
    this.failures = new FailureInjector(this, cfg);

    const lat = this.site.latitude * DEG;
    const lon = this.site.longitude * DEG;
    const theta0 = this.plan.gmst0;
    // The clock starts at T−10 s, so the pad is where the Earth's rotation has
    // carried it by then: the sidereal angle used to place `r` must be the same
    // `theta` the state carries, or the very first frame shows the vehicle 3–5 km
    // away from its own launch pad. (`stepPrelaunch` re-derives both from
    // `gmst0 + OMEGA_EARTH * t` on every step, so only the seed was wrong.)
    const t0 = -10;
    this.siteR0 = groundPositionEci(lat, lon, this.site.altitude, theta0 + OMEGA_EARTH * t0);
    // Constants for `groundElevation`: the pad as an Earth-fixed unit vector,
    // and its 50 km / 250 km fade radii pre-converted to cosines.
    this.padEcef = v3(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat));
    this.padCosNear = Math.cos(50e3 / R_EARTH);
    this.padCosFar = Math.cos(250e3 / R_EARTH);
    const r = clone(this.siteR0);
    const v = groundVelocityEci(r);
    this.state = {
      t: t0, r, v, dir: normalize(r), status: 'prelaunch', ascentPhase: 'vertical', throttle: 0, coreThrottle: 0, boosterThrottle: 0, thrust: 0,
      mass: this.vehicle.totalMass(), q: 0, mach: 0, gLoad: 1, altitude: this.site.altitude, altitudeAGL: 0,
      airspeed: 0, speed: norm(v), downrange: 0, lat: this.site.latitude, lon: this.site.longitude,
      elements: elementsFromState(r, v), maxQ: { value: 0, t: 0, alt: 0 },
      losses: { dvThrust: 0, gravity: 0, drag: 0, steering: 0 }, currentBurn: null, burnStartTime: 0,
      burnDvRemaining: 0, burnPlaneNormal: null, nextBurnTime: -1, payloadSeparated: false, destroyed: false, liftoff: false,
      theta: theta0 + OMEGA_EARTH * t0, pitchCmd: 90, predictedApoapsis: 0, vz: 0, note: 'countdown',
    };
    // ignition sequence for liquid first stages
    const st0 = this.vehicle.stages[0];
    const ignT = st0.spec.engine.solid ? 0 : -2.5;
    this.schedule(ignT, 'ignition0', () => {
      this.vehicle.igniteStage(st0, this.state.t);
      for (const b of st0.boosters) if ((b.spec.igniteAt ?? 0) <= 0 && !b.spec.engine.solid) this.vehicle.igniteBooster(b, this.state.t);
      this.event('evt.ignition', 'major', { stage: st0.spec.name });
    });
    this.schedule(0, 'liftoff', () => {
      for (const b of st0.boosters) if ((b.spec.igniteAt ?? 0) <= 0 && !b.ignited) this.vehicle.igniteBooster(b, this.state.t);
      if (st0.spec.engine.solid && !st0.ignited) {
        this.vehicle.igniteStage(st0, 0);
        this.event('evt.ignition', 'major', { stage: st0.spec.name });
      }
      for (const b of st0.boosters) {
        if ((b.spec.igniteAt ?? 0) > 0) {
          this.schedule(b.spec.igniteAt!, 'boosterIgnite', () => {
            this.vehicle.igniteBooster(b, this.state.t);
            this.event('evt.boosterIgnition', 'major', { name: b.spec.name });
          });
        }
      }
    });
    this.failures.arm();
    if (this.rigidRuntime) this.rigidLink.holdRigidOnPad();
    this.sample();
  }

  setRigidCommand(command: RigidCommand): void {
    const runtime = this.rigidRuntime;
    if (!runtime || this.state.status === 'failed') return;
    const previous = runtime.command;
    runtime.setCommand(command); // validate before modifying telemetry or the event log
    const accepted = runtime.command;
    if (previous.mode === accepted.mode && previous.throttle === accepted.throttle
      && previous.rates.x === accepted.rates.x && previous.rates.y === accepted.rates.y && previous.rates.z === accepted.rates.z) return;
    this.burns.rigidBurnForecast = null;
    this.burns.rigidTransfer = null;
    if (this.state.currentBurn && (this.state.currentBurn.physicalApoapsis !== undefined || this.state.currentBurn.physicalObjective !== undefined)) this.burns.burnIgnited = false;
    if (this.state.status === 'coast') this.burns.rigidCoastIntervened = true;
    if (this.state.rigid) {
      this.state.rigid.controlMode = accepted.mode;
      this.state.rigid.commandRatesBody = { ...accepted.rates };
      this.state.rigid.commandThrottle = accepted.throttle;
    }
    // Rates in ISO 1151 body axes (p, q, r; src/ui/notation.ts): the simulator's
    // x is the nose, y the belly side and z the left, so q = −ω_z and r = ω_y.
    const r = accepted.rates;
    this.event('evt.controlCommand', 'info', { mode: accepted.mode,
      rollRateRadS: r.x, pitchRateRadS: r.z === 0 ? 0 : -r.z, yawRateRadS: r.y, throttle: accepted.throttle });
  }

  // ------------------------------------------------------------------ utils
  /** @internal */
  schedule(t: number, label: string, fn: () => void): void {
    this.pending.push({ t, fn, label });
    this.pending.sort((a, b) => a.t - b.t);
  }

  /** Commit due actions at the accepted clock without advancing physical time. */
  /** @internal */
  processScheduledActions(): boolean {
    if (this.isFailed() || !this.pending.length || this.pending[0].t > this.state.t + 1e-9) return false;
    const activeBefore = this.vehicle.active;
    const wasIgnited = !!activeBefore?.ignited && !activeBefore.cutoff && !activeBefore.burnedOut;
    let changed = false;
    while (!this.isFailed() && this.pending.length > 0 && this.pending[0].t <= this.state.t + 1e-9) {
      this.pending.shift()!.fn();
      changed = true;
    }
    if (changed) {
      if (this.state.status === 'prelaunch') {
        const thrust = this.vehicle.thrust(this.state.t, atmosphere(this.state.altitude).p, 1);
        this.state.thrust = thrust.thrust;
        this.state.throttle = thrust.burning ? 1 : 0;
        this.state.coreThrottle = thrust.coreThrottle;
        this.state.boosterThrottle = thrust.boosterThrottle;
        if (this.rigidRuntime) this.rigidLink.holdRigidOnPad();
      } else this.refreshScheduledFlightTelemetry(this.vehicle.active !== activeBefore || !wasIgnited);
      this.updateDerived();
    }
    return changed;
  }

  /** Refresh accepted operating state without a guidance tick, fuel consumption,
   * or motion. Orbital ignition still waits for the normal alignment gate. */
  private refreshScheduledFlightTelemetry(newIgnition: boolean): void {
    const s = this.state, runtime = this.rigidRuntime;
    let throttle = s.throttle;
    if (s.status === 'failed' || s.status === 'orbit') throttle = 0;
    else if (runtime?.command.mode === 'manual') throttle = runtime.command.throttle;
    else if (s.status === 'coast' || (s.status === 'burn' && !this.burns.burnIgnited)) throttle = 0;
    else if (s.status === 'ascent' && newIgnition && this.vehicle.active?.ignited) throttle = throttle || 1;
    const thrust = this.vehicle.thrust(s.t, atmosphere(s.altitude).p, throttle);
    s.thrust = thrust.thrust; s.throttle = thrust.burning ? throttle : 0;
    s.coreThrottle = thrust.coreThrottle; s.boosterThrottle = thrust.boosterThrottle;
    if (!runtime || !s.rigid) return;
    const snapshot = buildRigidVehicle(this.vehicle, { pressure: atmosphere(s.altitude).p,
      coreThrottle: s.coreThrottle, boosterThrottle: s.boosterThrottle, time: s.t,
      payloadDiameter: this.satellite.size ? Math.max(this.satellite.size.width, this.satellite.size.depth) : undefined,
      payloadLength: this.satellite.size?.height, rcsConsumedKgByStage: runtime.consumed });
    runtime.synchronizeEngineBudgets(snapshot);
    s.rigid = runtime.telemetry({ r: s.r, v: s.v, attitudeQ: s.rigid.attitudeQ, omegaBody: s.rigid.omegaBody },
      s.t, snapshot, s.rigid.saturated, s.rigid.rawQuaternionNormError);
  }
  /**
   * Log an event. `at` overrides the timestamp for a *peak-detected* event: the
   * max-Q marker is raised when q has clearly fallen away from the peak, tens of
   * seconds after the peak itself, and stamping it with the detection time put
   * it 19 s late on the event bar (audit item B40(5)).
   */
  /** @internal */
  event(key: string, severity: EventSeverity, params?: Record<string, string | number>, at?: number): void {
    this.events.push({ t: at ?? this.state.t, key, params, severity });
  }

  /**
   * The `{stage}` parameter for an event about `st`.
   *
   * A stage name is the English literal from `src/data`, and the presentation
   * layer translates it by matching it against the vehicle's own stage list
   * (`stageNameByLabel`, src/ui/names.ts). The SPACECRAFT stage is the one that
   * list can never contain — `VehicleModel` synthesises it from the satellite
   * record — so its events carry `satId` as well, exactly as `evt.payloadSep`
   * does, and the UI resolves the localized name from the id. Without it a
   * Russian or Thai event log read "จุดเครื่องยนต์: Crewed spacecraft"
   * (release review 2, major #1, same family as the payload-separation event).
   */
  /** @internal */
  stageParams(st: StageState): Record<string, string | number> {
    return st.spec.isSpacecraft ? { stage: st.spec.name, satId: this.satellite.id } : { stage: st.spec.name };
  }

  /**
   * Height of the ground above the mean sphere at a point, m.
   *
   * The launch site's own elevation is the ground only near the pad (and at the
   * landing zone next to it). A booster that comes down 1500 km downrange of
   * Vostochny lands in the sea, not 250 m up (audit item B40(2)), so the
   * elevation is faded out over the first few hundred kilometres.
   */
  /** @internal */
  groundElevation(r: Vec3): number {
    const e = this.site.altitude;
    if (e === 0) return 0;
    // Great-circle distance from the pad, measured in the rotating frame: the
    // pad moves with the Earth, so an ECI comparison with its position at T−10 s
    // would put it 450 km away by T+1000 s.
    //
    // This is on the integration hot path — `updateDerived` and the impact test
    // call it every step, `stepDebris` on every debris sub-step — so it is
    // written to do as little as possible (audit item B37, review follow-up).
    // It used to go through `eciToLatLon`, which allocates a {lat, lon, alt}
    // object and costs an asin, an atan2 and a wrapPi, and then spent four more
    // trig calls plus an acos on the spherical law of cosines. What it needs is
    // one dot product against the pad's own (constant) rotating-frame unit
    // vector, and the two fade thresholds compared as COSINES so that the acos
    // is only paid inside the 50–250 km fade band — which is a few seconds of
    // any flight. Two trig calls, no allocation, no acos in the common case,
    // and the value is identical to the previous form.
    const theta = this.state.theta;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const rm = norm(r);
    if (rm < 1) return e;
    // r rotated into the Earth-fixed frame, dotted with the pad unit vector.
    const xf = r.x * ct + r.y * st;
    const yf = -r.x * st + r.y * ct;
    const cosC = (this.padEcef.x * xf + this.padEcef.y * yf + this.padEcef.z * r.z) / rm;
    if (cosC >= this.padCosNear) return e;
    if (cosC <= this.padCosFar) return 0;
    const d = R_EARTH * Math.acos(Math.max(-1, Math.min(1, cosC)));
    return e * (1 - (d - 50e3) / 200e3);
  }
  isFailed(): boolean {
    return this.state.status === 'failed';
  }
  get done(): boolean {
    if (this.state.status === 'failed') return true;
    // The engine shut down on the final cut-off is still tailing off for a
    // moment, and that impulse is part of the orbit the flight ends in.
    return this.state.status === 'orbit' && !this.vehicle.inTransient(this.state.t);
  }

  /** Step size the simulation would like to take next, s. */
  suggestedDt(): number {
    const s = this.state;
    let dt: number;
    switch (s.status) {
      case 'prelaunch': dt = 0.1; break;
      case 'ascent': {
        dt = s.altitude < 100e3 ? 0.1 : 0.25;
        // Near cut-off the orbit is almost circular, where a metre per second
        // moves the apoapsis by kilometres: a 0.25 s step at 40 m/s² would
        // overshoot the insertion apoapsis by 30 km, which is outside the
        // accuracy the mission is judged on. Step finely through the last
        // seconds only — and "the last seconds" is the speed still to be
        // gained, not the apoapsis: on a lofted ascent the osculating apoapsis
        // crosses the target minutes before cut-off, and a band on it put the
        // whole second half of a Soyuz ascent on 0.02 s steps (17 000 of the
        // 19 000 steps of the flight) for no accuracy at all. At the 20–40 m/s²
        // of a nearly empty upper stage, 250 m/s is the last six to twelve
        // seconds of the burn.
        const vh = Math.sqrt(Math.max(0, s.speed * s.speed - s.vz * s.vz));
        if (s.altitude > 100e3 && this.ascent.insertionSpeed - vh < 250) dt = 0.02;
        break;
      }
      case 'burn': {
        // Use the thrust the stage *can* produce, not the thrust it produced on
        // the previous step: on the first step of a burn the latter is still
        // zero from the coast, and a 0.5 s step at full thrust overshoots a
        // small trim burn by tens of m/s.
        const st = this.vehicle.active;
        const avail = st ? st.spec.engine.count * st.spec.engine.thrustVac * st.engineFraction : 0;
        const aT = s.mass > 0 ? Math.max(s.thrust, avail) / s.mass : 1;
        // What is left once the tail-off is counted, which is what ends the burn.
        const tail = st ? this.vehicle.tailoffDeltaV(s.t, 0, Math.max(1, s.mass)) : 0;
        const dv = s.burnDvRemaining > 0 ? Math.max(0.01, s.burnDvRemaining - tail) : 20;
        dt = aT > 0 ? Math.max(0.01, Math.min(0.5, dv / (20 * aT))) : 0.5;
        break;
      }
      // Exo-atmospheric coasts are propagated analytically (Kepler), so a long
      // step costs no accuracy; it only has to stay short enough to resolve the
      // scheduled burn, which the pending-action clamp below takes care of.
      case 'coast': dt = s.altitude > 2000e3 ? 60 : s.altitude > 140e3 ? 10 : 0.5; break;
      case 'orbit': dt = Math.min(30, Math.max(1, (s.elements.period || 5400) / 300)); break;
      default: dt = 1;
    }
    if (this.rigidRuntime) {
      const held = this.rigidLink.heldCoastWindow();
      dt = held > 0 ? Math.min(dt, held) : Math.min(dt, this.rigidDt);
    }
    // An engine spinning up or tailing off is flown in short steps whatever
    // the regime: a coast or an orbit would otherwise take its whole tail-off
    // in one 10-30 s step.
    if (s.status !== 'prelaunch' && dt > TRANSIENT_DT && this.vehicle.inTransient(s.t)) dt = TRANSIENT_DT;
    if (this.pending.length > 0) {
      const gap = this.pending[0].t - s.t;
      if (gap > 1e-4 && gap < dt) dt = gap;
    }
    if (s.status === 'coast' && s.nextBurnTime > s.t) {
      const gap = s.nextBurnTime - s.t;
      if (gap < dt) dt = Math.max(1e-3, gap);
    }
    return dt;
  }

  /** Advance simulated time by `seconds`, bounded by `maxSteps`. */
  advance(seconds: number, maxSteps = 5000): number {
    if (this.rigidRuntime) {
      // Render frames contribute time, never fractional physics ticks. Drop
      // unserved overload rather than creating an unbounded simulation backlog.
      this.advanceRemainder += Math.max(0, seconds);
      const before = this.state.t;
      let steps = 0;
      while (this.state.status !== 'failed' && steps < maxSteps) {
        let dt = this.suggestedDt();
        // A held coast has no control ticks to keep whole: step it by what the
        // frame brought, so a slow warp still moves every frame.
        if (dt > this.rigidDt + 1e-9) dt = Math.max(this.rigidDt, Math.min(dt, this.advanceRemainder));
        if (this.advanceRemainder + 1e-10 < dt) break;
        const used = this.step(dt);
        if (!(used > 0)) break;
        this.advanceRemainder -= used;
        steps++;
      }
      if (steps >= maxSteps) this.advanceRemainder = Math.min(this.advanceRemainder, this.rigidDt);
      return this.state.t - before;
    }
    let remaining = seconds;
    let steps = 0;
    while (remaining > 1e-6 && steps < maxSteps && this.state.status !== 'failed') {
      const dt = Math.min(this.suggestedDt(), remaining);
      const used = this.step(dt);
      remaining -= used > 0 ? used : dt;
      steps++;
    }
    return seconds - remaining;
  }

  // ------------------------------------------------------------------ step
  step(dt: number, onTransition?: () => void): number {
    const s = this.state;
    if (s.status === 'failed') return 0;
    // Observe already-due transitions before integrating; a recorder must never
    // label the next physical pose with the preceding action's timestamp.
    if (this.processScheduledActions()) onTransition?.();
    if (this.isFailed()) return 0;
    // an action may have changed the regime (e.g. coast -> burn): re-clamp the step
    dt = Math.min(dt, this.suggestedDt());

    if (s.status === 'prelaunch') this.stepPrelaunch(dt);
    else if (s.status === 'orbit' && !this.vehicle.inTransient(s.t)) this.stepOrbit(dt);
    else dt = this.stepFlight(dt);

    this.debrisTracker.stepDebris(dt);
    s.theta = this.plan.gmst0 + OMEGA_EARTH * s.t;
    this.updateDerived();
    // Commit on arrival too, so pausing exactly on ignition/staging is current.
    this.processScheduledActions();
    if (this.rigidRuntime && s.liftoff) {
      const event = this.aeroEnvelopeEvents.observe(s.t, s.rigid,
        { id: 'vehicle', name: this.vehicle.active?.spec.name ?? this.satellite.name, scope: 'vehicle' });
      if (event) this.events.push(event);
      for (const body of this.debris) {
        const event = this.aeroEnvelopeEvents.observe(s.t, body.rigid,
          { id: `debris-${body.id}`, name: body.name, scope: 'debris' });
        if (event) this.events.push(event);
      }
    }
    this.sample();
    return dt;
  }

  private stepPrelaunch(dt: number): void {
    const s = this.state;
    const lat = this.site.latitude * DEG;
    const lon = this.site.longitude * DEG;
    const tNew = s.t + dt;
    // consume propellant of already-running engines while held down
    const atm = atmosphere(s.altitude);
    const thr = this.vehicle.thrust(s.t, atm.p, 1, dt);
    if (thr.burning) this.vehicle.consume(s.t, 1, dt);
    s.thrust = thr.thrust;
    s.throttle = thr.burning ? 1 : 0;
    s.t = tNew;
    const theta = this.plan.gmst0 + OMEGA_EARTH * s.t;
    s.r = groundPositionEci(lat, lon, this.site.altitude, theta);
    s.v = groundVelocityEci(s.r);
    s.dir = normalize(s.r);
    s.mass = this.vehicle.totalMass();
    s.coreThrottle = thr.coreThrottle;
    s.boosterThrottle = thr.boosterThrottle;
    if (this.rigidRuntime) this.rigidLink.holdRigidOnPad();
    // Held down: the pad carries the whole weight, so the proper acceleration is
    // exactly 1 g until release (the field used to keep its initial value).
    s.gLoad = 1;
    if (s.t >= 0) {
      // Local gravity at the pad, not standard gravity: G0 is 0.09 % high at
      // Baikonur's radius and the release test is a hold-down release, not a
      // convention (audit item B40(8)).
      const rmPad = norm(s.r);
      const weight = s.mass * (MU_EARTH / (rmPad * rmPad));
      if (thr.thrust > weight) {
        s.status = 'ascent';
        s.liftoff = true;
        s.note = 'ascent';
        // `updateDerived` only refreshes the elements outside powered flight, and
        // `stepFlight` reads them at the top of the step, so seed them here.
        s.elements = elementsFromState(s.r, s.v);
        this.event('evt.liftoff', 'major', { twr: +(thr.thrust / weight).toFixed(2) });
      } else if (s.t > 3) {
        s.status = 'failed';
        // Without its own note the HUD looked up `hud.note.countdown`, which no
        // dictionary declares, and printed the key.
        s.note = 'noLiftoff';
        this.event('evt.noLiftoff', 'fail', { twr: +(thr.thrust / Math.max(1, weight)).toFixed(2) });
      }
    }
  }

  /** @internal */
  stepFlight(dt: number): number {
    const s = this.state;
    const rm = norm(s.r);
    const alt = rm - R_EARTH;
    const atm = atmosphere(alt);
    const omega = v3(0, 0, OMEGA_EARTH);
    const vAir = this.rigidRuntime ? this.rigidRuntime.airVelocity(s, s.t) : sub(s.v, cross(omega, s.r));
    const vAirMag = norm(vAir);
    const q = 0.5 * atm.rho * vAirMag * vAirMag;
    const mass = s.rigid ? s.mass : this.vehicle.totalMass();
    // Elements of the state at the start of the step. They were computed at the
    // end of the previous step (or by `updateDerived` when the previous step was
    // a prelaunch/orbit one), so recomputing them here would double the cost of
    // the hottest path — near cut-off the step size drops to 0.02 s.
    const el = s.elements;
    const up = normalize(s.r);
    const vz = dot(s.v, up);

    // --- steering & throttle command
    let dirCmd = s.dir;
    let throttleCmd = 0;
    const active = this.vehicle.active;
    const fullThrust = this.vehicle.thrust(s.t, atm.p, 1);
    const maxAccel = this.cfg.guidance.maxAccel > 0 ? this.cfg.guidance.maxAccel : this.vehicleSpec.maxAccel;

    if (s.status === 'ascent') {
      const cmd = this.guidance.update({
        requireDownrangeKick: !!this.rigidRuntime,
        vGround: this.rigidRuntime ? sub(s.v, cross(v3(0, 0, OMEGA_EARTH), s.r)) : undefined,
        t: s.t, r: s.r, v: s.v, vAir, altitudeAGL: alt - this.site.altitude, altitude: alt, q,
        thrustAccelFull: fullThrust.thrustFullVac / mass, isFirstStage: (active?.index ?? 0) === 0,
        thrustAccel: Math.min(fullThrust.thrust, maxAccel > 0 ? maxAccel * mass : Infinity) / mass,
        timeToGo: (dv: number) => this.vehicle.burnTimeFor(dv, false, this.plan.weakFinalStage),
        stageBurnTimeLeft: this.vehicle.stageBurnTimeLeft(),
        stageDvLeft: this.vehicle.stageDvLeft(),
        nextStageAccel: this.vehicle.nextStageAccel(this.plan.weakFinalStage),
        // The same figure without the weak-final exclusion. It differs from the
        // line above only at the hand-over TO the kick stage, which is the one
        // place the lofted hand-off has to see it (see `GuidanceInputs`).
        kickStageAccel: this.vehicle.nextStageAccel(false),
        apoapsisAlt: el.e < 1 ? el.apoapsisAlt : Infinity,
        maxQThrottle: this.vehicleSpec.maxQThrottle, maxAccel, maxQPlacard: this.ascent.maxQAscent,
      });
      dirCmd = cmd.dir;
      throttleCmd = cmd.throttle;
      s.ascentPhase = cmd.phase;
      s.pitchCmd = cmd.pitchDeg;
      s.predictedApoapsis = cmd.predictedApoapsis;
    } else if (s.status === 'orbit') {
      // The final cut-off's tail-off: hold the attitude it was cut off in.
      dirCmd = s.dir;
      throttleCmd = 0;
    } else if (s.status === 'burn' && s.currentBurn) {
      const cmd = this.burns.burnCommand(fullThrust.thrustFullVac, mass, maxAccel, up);
      if (!cmd) return 0;
      dirCmd = cmd.dir;
      throttleCmd = cmd.throttle;
    } else {
      // Coast: hold prograde, but pre-point at the attitude the next burn needs
      // once it is close. The slew-rate limit is a few degrees per second, so a
      // short retrograde trim would otherwise spend its entire burn turning
      // around — and thrust the wrong way while doing it.
      const cmd = this.burns.coastCommand();
      if (!cmd) return 0;
      dirCmd = cmd;
      throttleCmd = 0;
      s.ascentPhase = null;
    }
    if (this.rigidRuntime?.command.mode === 'auto') {
      // Terminal steering freeze: hold the command in an orbital burn's last
      // seconds (RIGID_STEERING_FREEZE_S).
      const accel = mass > 0 ? fullThrust.thrustFullVac / mass : 0;
      const toGo = s.status === 'burn' && this.burns.burnIgnited && accel > 0 ? s.burnDvRemaining / accel : Infinity;
      if (toGo < RIGID_STEERING_FREEZE_S) dirCmd = this.frozenCommand ??= dirCmd;
      else this.frozenCommand = null;
      // Above the atmosphere the ascent command swings no faster than
      // RIGID_ASCENT_COMMAND_RATE: the stage follows it, and cuts off turning
      // at the rate it was following.
      if (s.status === 'ascent' && q < 100) {
        dirCmd = this.limitedCommand = this.limitedCommand
          ? slerpLimited(this.limitedCommand, dirCmd, RIGID_ASCENT_COMMAND_RATE * dt) : dirCmd;
      } else this.limitedCommand = null;
    }
    // An engine that has just been shut down is still tailing off. Its gimbals
    // keep their authority for that second while it fades, and following a
    // guidance command that no longer has thrust to steer with swung a Falcon 9
    // stack to 1.3 °/s between MECO and separation — more than the returning
    // stage's cold-gas thrusters could take out. Hold the attitude it was shut
    // down in, as real vehicles do until separation.
    if (this.rigidRuntime && active && this.vehicle.coreTailingOff(active, s.t)) dirCmd = s.dir;
    // slew-limited attitude
    const slew = this.cfg.guidance.slewRate * DEG * dt;
    if (!this.rigidRuntime) s.dir = slerpLimited(s.dir, dirCmd, slew);
    if (this.rigidRuntime?.command.mode === 'manual') throttleCmd = this.rigidRuntime.command.throttle;
    this.rigidLink.applyManualEngineCommand(active, throttleCmd);

    // --- propulsion
    // Averaged over the step: an engine spinning up or tailing off delivers the
    // same impulse whatever the step length, and `consume` takes the same mean.
    let thr = this.vehicle.thrust(s.t, atm.p, throttleCmd, dt);
    if (this.rigidRuntime && active && thr.burning) {
      // Liquid reference profiles: split exactly at the first propellant
      // boundary using the command actually applied in this interval. The
      // boundary is where the depletion sensor shuts the engine down, with
      // its tail-off propellant still aboard.
      const dt0 = dt;
      const coreFlow = engineMassFlow(active.spec.engine) * active.spec.engine.count * active.engineFraction * thr.coreThrottle;
      if (coreFlow > 0 && !active.cutoff && !active.burnedOut && this.vehicle.usablePropellant(active) > 0) {
        const left = this.vehicle.usablePropellant(active) - VehicleModel.tailoffReserve(active.spec.engine, coreFlow);
        // A boundary already reached is the depletion sensor's to act on: never
        // shrink the step towards it forever.
        if (left > coreFlow * 1e-6) dt = Math.min(dt, left / coreFlow);
      }
      for (const [group, booster] of active.boosters.entries()) {
        if (!booster.attached || !booster.ignited || booster.burnedOut) continue;
        const flow = engineMassFlow(booster.spec.engine) * booster.spec.engine.count * (thr.boosterLevels[group] ?? thr.boosterThrottle);
        if (flow > 0 && this.vehicle.usableBoosterPropellant(booster) > 0) {
          const left = this.vehicle.usableBoosterPropellant(booster) - VehicleModel.tailoffReserve(booster.spec.engine, flow);
          if (left > flow * 1e-6) dt = Math.min(dt, left / flow);
        }
      }
      if (dt < dt0) thr = this.vehicle.thrust(s.t, atm.p, throttleCmd, dt);
    }
    s.thrust = thr.thrust;
    s.throttle = thr.burning ? throttleCmd : 0;
    // What the engines are really doing, as opposed to what was commanded.
    // `captureFrame` used to re-derive this from the spec — a second copy of
    // the clamping rules in `VehicleModel.thrust`, which had already dropped
    // the solid thrust profile. Recording the value the thrust model itself
    // produced is one rule instead of two.
    s.coreThrottle = thr.coreThrottle;
    s.boosterThrottle = thr.boosterThrottle;

    // --- integrate
    const area = this.vehicle.frontalArea();
    const thrustAccel = thr.thrust / mass;
    const useKepler = !thr.burning && alt > 140e3 && s.status !== 'ascent';
    let next: { r: Vec3; v: Vec3 };
    let rigidGLoad: number | undefined;
    let rigidAccelerations: { propulsionECI: Vec3; aerodynamicECI: Vec3; gravityECI: Vec3 } | undefined;
    const held = this.rigidRuntime && s.rigid && dt > this.rigidDt + 1e-9 && s.status === 'coast'
      ? this.rigidLink.heldCoastStep(dt) : null;
    if (held) {
      next = held.state;
      s.rigid = held.telemetry;
      s.dir = quatRotate(held.state.attitudeQ, v3(1, 0, 0));
      rigidGLoad = 0;
    } else if (this.rigidRuntime && s.rigid) {
      const runtime = this.rigidRuntime;
      let loadRelief: { requestedRad: number; limitRad: number; appliedRad: number } | undefined;
      if (runtime.command.mode === 'auto' && s.status === 'ascent' && q > 500) {
        const snapshot = buildRigidVehicle(this.vehicle, { pressure: atm.p, coreThrottle: thr.coreLevel, boosterThrottle: thr.boosterThrottle, boosterThrottles: thr.boosterLevels,
          time: s.t, rcsConsumedKgByStage: runtime.consumed,
          payloadDiameter: this.satellite.size ? Math.max(this.satellite.size.width, this.satellite.size.depth) : undefined,
          payloadLength: this.satellite.size?.height });
        const requested = dirCmd, limitRad = runtime.ascentAngleLimit(snapshot, q, vAirMag / atm.a);
        dirCmd = limitAscentCommand(dirCmd, vAir, limitRad);
        // G03: what the load relief did, for the attitude-loop inspector.
        if (runtime.recordLoop) {
          const angle = (a: Vec3, b: Vec3) => Math.acos(Math.max(-1, Math.min(1, dot(normalize(a), normalize(b)))));
          loadRelief = { requestedRad: angle(requested, vAir), limitRad, appliedRad: angle(requested, dirCmd) };
        }
      }
      const result = runtime.step(s.t, { r: s.r, v: s.v, attitudeQ: s.rigid.attitudeQ, omegaBody: s.rigid.omegaBody }, dt,
        dirCmd, s.status === 'ascent' ? this.rigidLink.rigidSide()
          : quatRotate(nosePointingTarget(s.rigid.attitudeQ, dirCmd), v3(0, 0, 1)), (elapsed, consumed) => buildRigidVehicle(this.vehicle, {
          payloadDiameter: this.satellite.size ? Math.max(this.satellite.size.width, this.satellite.size.depth) : undefined, payloadLength: this.satellite.size?.height,
          pressure: atm.p, coreThrottle: thr.coreLevel, boosterThrottle: thr.boosterThrottle, boosterThrottles: thr.boosterLevels, time: s.t + elapsed,
          propellantOffsetSeconds: elapsed, rcsConsumedKgByStage: consumed }));
      next = result.state;
      s.rigid = result.telemetry;
      if (loadRelief && s.rigid.attitudeLoop) s.rigid.attitudeLoop.loadRelief = loadRelief;
      s.dir = quatRotate(result.state.attitudeQ, v3(1, 0, 0));
      rigidGLoad = norm(result.nonGrav) / G0;
      rigidAccelerations = result.accelerationsStart;
      this.burns.accountDeliveredDv(result.accelerationsStart.propulsionECI, thr.burning, dt);
    } else if (useKepler) {
      next = propagateKepler(s.r, s.v, dt);
    } else {
      next = rk4Step(s.t, { r: s.r, v: s.v }, dt, pointMassAcceleration(thrustAccel, s.dir, mass, thr.mdot, s.t, area, false));
    }
    // --- ascent losses (evaluated at step start)
    //
    // The Δv budget closes only if every term is projected on the SAME axis, and
    // the identity that defines it — d|v|/dt = a_T·v̂ − (μ/r²)(r̂·v̂) −
    // (D/m)(v̂_air·v̂) — is written in the INERTIAL frame. Measuring the steering
    // loss against the air-relative velocity below 100 km (audit item B14) mixed
    // frames: early in flight v_air is nearly vertical while v is dominated by
    // the 320–465 m/s of eastward rotation velocity, so cos α read ≈1 against
    // v_air and the budget came out 485 m/s short on a Soyuz ascent with the
    // steering loss under-reported 6×.
    const vMag = norm(s.v);
    const vHat = vMag > 1 ? scale(s.v, 1 / vMag) : s.dir;
    const dragAccel = (q * dragCoefficient(vAirMag / atm.a) * area) / mass;
    if (rigidAccelerations && s.status === 'ascent') {
      // The six-DOF budget uses the actual vector wrenches, including gimbal,
      // RCS, normal aerodynamic forces and J2. All terms share the inertial
      // velocity axis: dvThrust - steering - drag - gravity = change in speed
      // (up to quadrature and discrete-separation contributions).
      const propulsion = rigidAccelerations.propulsionECI;
      const magnitude = norm(propulsion);
      s.losses.dvThrust += magnitude * dt;
      s.losses.steering += (magnitude - dot(propulsion, vHat)) * dt;
      s.losses.gravity -= dot(rigidAccelerations.gravityECI, vHat) * dt;
      s.losses.drag -= dot(rigidAccelerations.aerodynamicECI, vHat) * dt;
    } else if (thr.burning && s.status === 'ascent') {
      const g = MU_EARTH / (rm * rm);
      s.losses.dvThrust += thrustAccel * dt;
      const sinGamma = vMag > 1 ? dot(s.v, up) / vMag : 1;
      s.losses.gravity += g * sinGamma * dt;
      const cosA = Math.max(-1, Math.min(1, dot(s.dir, vHat)));
      s.losses.steering += thrustAccel * (1 - cosA) * dt;
    }
    if (!rigidAccelerations && q > 0 && s.status === 'ascent' && vAirMag > 1) {
      // Only the component of the drag along the inertial velocity slows the
      // vehicle down; the rest turns it and is the steering term's business.
      const along = Math.max(0, dot(scale(vAir, 1 / vAirMag), vHat));
      s.losses.drag += dragAccel * along * dt;
    }
    // Proper acceleration for the g-load: thrust and drag are never
    // perpendicular — during ascent they are close to ANTI-parallel — so
    // hypot() over-reported by ~23 % (audit item B40(1)). Sum them as vectors.
    const aNonGrav = vAirMag > 1
      ? add(scale(s.dir, thrustAccel), scale(vAir, -dragAccel / vAirMag))
      : scale(s.dir, thrustAccel);
    s.gLoad = rigidGLoad ?? norm(aNonGrav) / G0;
    this.ascent.trackMaxQ(alt, vz, q);

    // --- propellant & staging
    const stepStartTime = s.t;
    if (this.rigidRuntime) { s.r = next.r; s.v = next.v; s.t += dt; }
    if (thr.burning) {
      const res = this.vehicle.consume(stepStartTime, throttleCmd, dt);
      for (const b of res.boosterBurnout) this.staging.onBoosterBurnout(b);
      if (res.coreBurnout && active) {
        // Judged on the orbit the stage leaves behind once its tail-off is over.
        const tail = this.vehicle.tailoffDeltaV(stepStartTime + dt, atm.p, this.vehicle.totalMass());
        this.staging.onCoreBurnout(active, next.r, tail > 0 ? addScaled(next.v, s.dir, tail) : next.v);
      }
    }
    if (!this.rigidRuntime) { s.r = next.r; s.v = next.v; s.t += dt; }
    s.mass = this.vehicle.totalMass();

    this.ascent.reportMaxQ(q);
    // --- insertion floor. Asked BEFORE the structural placard, because the
    // whole point of it is that a stack still trying to reach orbit must be
    // stopped before it is destroyed doing so (see `abandonInsertion`).
    if (this.ascent.abandonInsertion(q, vz)) return dt;
    if (this.ascent.checkStructural(q)) return dt;
    if (this.checkShellLoads()) return dt;
    this.staging.checkFairing(alt, q, atm.rho, vAirMag);

    // --- mission logic
    const el2 = elementsFromState(s.r, s.v);
    s.elements = el2;
    // A cut-off is decided on the orbit it would leave behind: the engine
    // shut down now still tails off for a moment, and on an upper stage that
    // is several metres per second — kilometres of apoapsis.
    const tailDv = s.status === 'ascent' || s.status === 'burn'
      ? this.vehicle.tailoffDeltaV(s.t, atmosphere(Math.max(0, norm(s.r) - R_EARTH)).p, s.mass) : 0;
    const elCut = tailDv > 0 ? elementsFromState(s.r, addScaled(s.v, s.dir, tailDv)) : el2;
    if (s.status === 'ascent') this.ascent.checkAscent(elCut, alt, vz);
    else if (s.status === 'coast') this.burns.checkCoast(el2);
    else if (s.status === 'burn') this.burns.checkBurn(elCut, tailDv);

    // --- ground impact / reentry
    const altNew = norm(s.r) - R_EARTH;
    let groundImpact = altNew < this.groundElevation(s.r) - 1;
    if (this.rigidRuntime?.snapshot && s.rigid && altNew - this.groundElevation(s.r) < 200) {
      const snapshot = this.rigidRuntime.snapshot;
      let radius = this.satellite.size ? Math.max(this.satellite.size.width, this.satellite.size.depth) / 2 : 1;
      for (const stage of this.vehicle.stages) if (stage.attached) {
        radius = Math.max(radius, stage.spec.diameter / 2);
        for (const booster of stage.boosters) if (booster.attached) radius = Math.max(radius, stage.spec.diameter / 2 + booster.spec.diameter);
      }
      if (this.vehicle.fairingAttached && this.vehicleSpec.fairing) radius = Math.max(radius, this.vehicleSpec.fairing.diameter / 2);
      const contact = rigidContactMetrics({ r: s.r, v: s.v, attitudeQ: s.rigid.attitudeQ, omegaBody: s.rigid.omegaBody },
        { ...snapshot, cg: sub(snapshot.cg, snapshot.activeBase) }, snapshot.aero.referenceLength, radius, r => this.groundElevation(r));
      groundImpact = contact.clearance < -0.01;
    }
    if (s.liftoff && groundImpact && !this.isFailed()) {
      this.event('evt.impact', 'fail', { speed: Math.round(norm(sub(s.v, cross(omega, s.r)))) });
      this.destroy();
    }
    return dt;
  }

  private stepOrbit(dt: number): void {
    const s = this.state;
    const held = this.rigidRuntime && s.rigid && dt > this.rigidDt + 1e-9 ? this.rigidLink.heldCoastStep(dt) : null;
    if (held) {
      s.r = held.state.r; s.v = held.state.v; s.t += dt; s.rigid = held.telemetry;
      s.dir = quatRotate(held.state.attitudeQ, v3(1, 0, 0));
      s.thrust = 0; s.throttle = 0; s.coreThrottle = 0; s.boosterThrottle = 0; s.gLoad = 0;
      s.elements = elementsFromState(s.r, s.v);
      return;
    }
    if (this.rigidRuntime && s.rigid) {
      const result = this.rigidRuntime.step(s.t, { r: s.r, v: s.v, attitudeQ: s.rigid.attitudeQ, omegaBody: s.rigid.omegaBody },
        dt, normalize(s.v), quatRotate(nosePointingTarget(s.rigid.attitudeQ, normalize(s.v)), v3(0, 0, 1)), (_elapsed, consumed) => buildRigidVehicle(this.vehicle, {
          payloadDiameter: this.satellite.size ? Math.max(this.satellite.size.width, this.satellite.size.depth) : undefined, payloadLength: this.satellite.size?.height, rcsConsumedKgByStage: consumed }));
      s.r = result.state.r; s.v = result.state.v; s.t += dt; s.rigid = result.telemetry;
      s.dir = quatRotate(result.state.attitudeQ, v3(1, 0, 0)); s.mass = result.snapshot.mass;
      s.thrust = 0; s.throttle = 0; s.coreThrottle = 0; s.boosterThrottle = 0;
      s.gLoad = norm(result.nonGrav) / G0;
      s.elements = elementsFromState(s.r, s.v);
      if (norm(s.r) - R_EARTH < 80e3) {
        this.event('evt.reentry', 'fail', { alt: Math.round((norm(s.r) - R_EARTH) / 1000) });
        s.status = 'failed'; s.note = 'reentry';
      }
      return;
    }
    const area = this.orbitArea();
    const mass = Math.max(1, this.vehicle.totalMass());
    s.mass = mass;
    // A separated spacecraft is a blunt body in free molecular flow, not a
    // slender launcher (audit items B15/B33).
    const cd = s.payloadSeparated ? 2.2 : undefined;
    const next = rk4Step(s.t, { r: s.r, v: s.v }, dt, pointMassAcceleration(0, s.dir, mass, 0, s.t, area, true, cd));
    s.r = next.r;
    s.v = next.v;
    s.t += dt;
    s.thrust = 0;
    s.throttle = 0;
    // Not zero: drag is still applied below 1000 km, and the g-load readout is
    // the non-gravitational acceleration, which is exactly that drag.
    {
      const atm = atmosphere(Math.max(0, norm(s.r) - R_EARTH));
      const vAirO = sub(s.v, cross(v3(0, 0, OMEGA_EARTH), s.r));
      const vAirO2 = dot(vAirO, vAirO);
      const cdO = cd === undefined ? dragCoefficient(Math.sqrt(vAirO2) / atm.a) : tumblingDragCoefficient(cd, Math.sqrt(vAirO2) / atm.a);
      s.gLoad = (0.5 * atm.rho * vAirO2 * cdO * area) / mass / G0;
    }
    s.elements = elementsFromState(s.r, s.v);
    const up = normalize(s.r);
    s.dir = norm(s.v) > 1 ? normalize(s.v) : up;
    const alt = norm(s.r) - R_EARTH;
    if (alt < 80e3) {
      this.event('evt.reentry', 'fail', { alt: Math.round(alt / 1000) });
      s.status = 'failed';
      s.note = 'reentry';
    }
  }

  private orbitArea(): number {
    // ballistic area of the orbiting object (payload after separation, else the stack)
    if (this.state.payloadSeparated) return Math.max(1, this.vehicle.totalMass() * 0.01);
    return this.vehicle.frontalArea();
  }

  /**
   * Whether this launch was made into a window that could reach the target
   * plane. Steering/early-cutoff checks use this to avoid wasting fuel on a
   * plane the current burn plan cannot correct. Final mission acceptance
   * always checks every requested constraint, including an off-window RAAN.
   */
  /** @internal */
  raanWasReachable(): boolean {
    const want = this.plan.target.raan;
    if (want === null) return false;
    return Math.abs(wrapPi(this.plan.raanExpected - want)) <= RAAN_TOLERANCE;
  }

  /**
   * With bending modelled, the stack breaks up where its shells are loaded past
   * their allowable stress (src/physics/rigid/flex.ts, shell loads).
   */
  private checkShellLoads(): boolean {
    const s = this.state, bending = s.rigid?.flex?.bending;
    if (!bending || !(bending.loadRatio > 1) || !s.liftoff || this.isFailed()) return false;
    const base = this.rigidRuntime?.snapshot?.activeBase.x ?? 0;
    this.event('evt.bendingFailure', 'fail', { x: Math.round(bending.loadStationX - base), pct: Math.round(bending.loadRatio * 100) });
    this.destroy();
    return true;
  }

  /** @internal */
  failSuborbital(): void {
    const s = this.state;
    s.status = 'failed';
    s.note = 'suborbital';
  }

  /** @internal */
  destroy(): void {
    const s = this.state;
    s.destroyed = true;
    s.status = 'failed';
    s.note = 'destroyed';
    s.thrust = 0;
    s.throttle = 0;
    this.event('evt.vehicleLost', 'fail', { t: Math.round(s.t) });
  }

  // ------------------------------------------------------------ derived
  /** @internal */
  updateDerived(): void {
    const s = this.state;
    const rm = norm(s.r);
    s.altitude = rm - R_EARTH;
    s.altitudeAGL = s.altitude - this.groundElevation(s.r);
    const omega = v3(0, 0, OMEGA_EARTH);
    const vAir = this.rigidRuntime ? this.rigidRuntime.airVelocity(s, s.t) : sub(s.v, cross(omega, s.r));
    if (this.rigidRuntime?.snapshot) s.mass = this.rigidRuntime.snapshot.mass;
    s.airspeed = norm(vAir);
    s.speed = norm(s.v);
    const atm = atmosphere(Math.max(0, s.altitude));
    s.q = 0.5 * atm.rho * s.airspeed * s.airspeed;
    s.mach = s.airspeed / atm.a;
    const ll = eciToLatLon(s.r, s.theta);
    s.lat = ll.lat * RAD;
    s.lon = ll.lon * RAD;
    const lat0 = this.site.latitude * DEG, lon0 = this.site.longitude * DEG;
    const cosC = Math.sin(lat0) * Math.sin(ll.lat) + Math.cos(lat0) * Math.cos(ll.lat) * Math.cos(ll.lon - lon0);
    s.downrange = R_EARTH * Math.acos(Math.max(-1, Math.min(1, cosC)));
    s.vz = dot(s.v, normalize(s.r));
    if (s.status === 'prelaunch' || s.status === 'orbit') s.elements = elementsFromState(s.r, s.v);
  }

  private sample(): void {
    const s = this.state;
    // Fine during powered flight; in orbit, no finer than 1/360 of a period, so
    // that a day of geostationary coasting is a few hundred samples rather than
    // a hundred thousand. (A GEO period is 24 h: at the flat 10 s interval a
    // single day of warped coast wrote 8 640 samples, and the charts, the CSV
    // export and the map's ground track all walk that buffer.)
    const period = isFinite(s.elements.period) && s.elements.period > 0 ? s.elements.period : 5400;
    const interval = s.status === 'ascent' || s.status === 'burn' ? 0.5
      : s.status === 'prelaunch' ? 1
      : Math.max(10, period / 360);
    if (s.t - this.lastSampleT < interval - 1e-6) return;
    this.lastSampleT = s.t;
    // Bounded buffer: past the cap, thin the older half 2:1 and keep the recent
    // flight at full resolution. The buffer is mutated in place, never
    // reassigned — the telemetry panel, the CSV export and the replay view all
    // hold a reference to this very array.
    if (this.telemetry.length >= TELEMETRY_CAP) {
      const half = this.telemetry.length >> 1;
      const kept: TelemetrySample[] = [];
      for (let i = 0; i < half; i += 2) kept.push(this.telemetry[i]);
      this.telemetry.splice(0, half, ...kept);
      this.telemetryGeneration++;
    }
    const act = this.vehicle.active;
    this.telemetry.push({
      rigid: cloneRigidTelemetry(s.rigid),
      t: s.t, alt: s.altitude, vInertial: s.speed, vAir: s.airspeed, q: s.q, mach: s.mach, gLoad: s.gLoad,
      mass: s.mass, thrust: s.thrust, throttle: s.throttle, pitch: s.pitchCmd,
      ap: isFinite(s.elements.apoapsisAlt) ? s.elements.apoapsisAlt : -1, pe: s.elements.periapsisAlt, inc: s.elements.i * RAD,
      // After separation the launcher is not the thing being flown any more:
      // report what the spacecraft has, exactly as `captureFrame` does for the
      // HUD. The telemetry chart and the CSV export used to keep reporting the
      // spent upper stage's Δv, which is not the number that matters and not
      // the number on screen.
      dvRemaining: s.payloadSeparated ? this.vehicle.spacecraftDeltaV() : this.vehicle.deltaVRemaining(),
      downrange: s.downrange, lat: s.lat, lon: s.lon,
      stage: act ? act.index + 1 : 0, phase: s.status === 'ascent' ? s.ascentPhase ?? '' : s.status,
    });
  }

  /** Current Julian date of the simulation clock. */
  julianDate(): number {
    return julianDate(this.cfg.launchTime) + this.state.t / 86400;
  }
  /** Greenwich sidereal angle now. */
  siderealAngle(): number {
    return gmst(this.julianDate());
  }
}