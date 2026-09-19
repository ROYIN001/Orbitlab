/**
 * Launch-to-orbit simulation.
 *
 * Frame: Earth-centered inertial (ECI). The vehicle is a point mass with a
 * commanded thrust direction (attitude dynamics are reduced to a slew-rate
 * limit). Forces: inverse-square gravity (+J2 in the orbital phase), thrust
 * (pressure-dependent), aerodynamic drag with a Mach-dependent Cd in an
 * atmosphere that co-rotates with the Earth. Integration: RK4 with adaptive
 * step size; exo-atmospheric coasts use the analytic Kepler solution.
 */
import type { MissionConfig, FailureMode, SatelliteSpec, VehicleSpec, BoosterGroupSpec, StageSpec, GuidanceParams, EngineSpec } from '../types';
import { siteById, type SiteExtra } from '../data/sites';
import { vehicleById } from '../data/vehicles';
import { satelliteById } from '../data/satellites';
import { G0, MU_EARTH, R_EARTH, OMEGA_EARTH, DEG, RAD } from './constants';
import { Vec3, v3, add, sub, scale, dot, cross, norm, normalize, addScaled, slerpLimited, clone, angleBetween } from './vec3';
import { atmosphere } from './atmosphere';
import { dragCoefficient, tumblingDragCoefficient } from './aero';
import { gravity, gravityJ2 } from './gravity';
import { rk4Step } from './integrator';
import {
  OrbitalElements, elementsFromState, groundPositionEci, groundVelocityEci, eciToLatLon,
  timeToArgumentOfLatitude, timeToApoapsis, timeToPeriapsis, propagateKepler, gmst, julianDate, planeNormal, wrapPi,
} from './orbital';
import { VehicleModel, StageState, BoosterState } from './vehicle';
import { AscentGuidance, AscentPhase, desiredVelocity, planeNormalThrough } from './guidance';
import {
  MissionPlan, BurnPlan, planMission, replanBurns, orbitResiduals, apsisTolerance, RAAN_TOLERANCE,
  ORBIT_INSERTION_FLOOR,
} from './mission';
import { DEFAULT_GUIDANCE } from './defaults';
import { chronologicalEvents } from './events';

export type SimStatus = 'prelaunch' | 'ascent' | 'coast' | 'burn' | 'orbit' | 'failed';

export type EventSeverity = 'info' | 'major' | 'warn' | 'fail' | 'success';

export interface SimEvent {
  t: number;
  key: string;
  params?: Record<string, string | number>;
  severity: EventSeverity;
}

export interface TelemetrySample {
  t: number;
  alt: number;
  vInertial: number;
  vAir: number;
  q: number;
  mach: number;
  gLoad: number;
  mass: number;
  thrust: number;
  throttle: number;
  pitch: number;
  ap: number;
  pe: number;
  inc: number;
  dvRemaining: number;
  downrange: number;
  lat: number;
  lon: number;
  stage: number;
  phase: string;
}

export interface DebrisVisual {
  diameter: number;
  length: number;
  color: string;
  conicalTop?: boolean;
  kind: 'stage' | 'booster' | 'fairing' | 'upperStage';
}

export interface Debris {
  id: number;
  name: string;
  r: Vec3;
  v: Vec3;
  /** thrust/attitude axis for rendering */
  dir: Vec3;
  mass: number;
  area: number;
  cd: number;
  visual: DebrisVisual;
  alive: boolean;
  createdAt: number;
  recovery?: {
    /**
     * Engine of the returning stage, so the number of engines burning can be
     * re-chosen for the landing. Optional: a frame-backed view of a recorded
     * flight rebuilds the phase and the flags, not the propulsion.
     */
    engine?: EngineSpec;
    propellant: number; thrustVac: number; thrustSL: number; mdot: number;
    burning: boolean; landed: boolean;
    /** propellant held back for the landing burn, kg */
    landingReserve: number;
    /** the landing burn has begun (its bang-bang throttling keeps the plume lit) */
    landingStarted?: boolean;
    phase: 'coast' | 'entry' | 'landing';
  };
  outcome?: 'impact' | 'landed' | 'orbit' | 'burnup';
  impact?: { lat: number; lon: number };
}

export interface Losses {
  dvThrust: number;
  gravity: number;
  drag: number;
  steering: number;
}

export interface SimState {
  t: number;
  r: Vec3;
  v: Vec3;
  /** unit thrust/body axis direction (ECI) */
  dir: Vec3;
  status: SimStatus;
  ascentPhase: AscentPhase | null;
  throttle: number;
  /**
   * What the engines are actually running at, as opposed to what guidance
   * commanded (`throttle`): the minimum-throttle clamp, the
   * `throttleWithBoosters` clamp and a solid motor's thrust profile are all
   * already in these. Output only — nothing in the physics reads them back;
   * they exist so the renderer's plumes can be driven from the frame instead of
   * from a second copy of the clamping rules (`ThrustResult.coreThrottle`).
   */
  coreThrottle: number;
  boosterThrottle: number;
  thrust: number;
  mass: number;
  q: number;
  mach: number;
  gLoad: number;
  altitude: number;
  altitudeAGL: number;
  airspeed: number;
  speed: number;
  downrange: number;
  lat: number;
  lon: number;
  elements: OrbitalElements;
  maxQ: { value: number; t: number; alt: number };
  losses: Losses;
  currentBurn: BurnPlan | null;
  burnStartTime: number;
  burnDvRemaining: number;
  /** target orbit-plane normal fixed at burn start (plane-change burns) */
  burnPlaneNormal: Vec3 | null;
  nextBurnTime: number;
  payloadSeparated: boolean;
  destroyed: boolean;
  liftoff: boolean;
  /** local sidereal angle of Greenwich at time t */
  theta: number;
  pitchCmd: number;
  predictedApoapsis: number;
  /** vertical speed, m/s */
  vz: number;
  /** progress note key for the HUD */
  note: string;
}

interface PendingAction {
  t: number;
  fn: () => void;
  label: string;
}

let debrisCounter = 0;

/** 32-bit mixing of the launch epoch (ms) and the vehicle id into a PRNG seed. */
export function hashSeed(epochMs: number, ...parts: string[]): number {
  let h = Math.imul(epochMs >>> 0, 2654435761) ^ Math.imul(Math.floor(epochMs / 4294967296), 40503);
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) h = (Math.imul(h ^ p.charCodeAt(i), 16777619) >>> 0);
  }
  return h >>> 0;
}

/**
 * Backstop for the closed-loop re-planner. The real stop is the residual (see
 * `replanRemainingBurns`); this only bounds a pathological case. It has to be
 * generous, because a low-thrust kick stage splits one apogee raising across
 * five or six perigee passes and every pass re-plans.
 */
const MAX_REPLANS = 16;

/** How long before a scheduled burn the stack points at the burn attitude, s. */
const BURN_PREORIENT_TIME = 240;

/** How close to the commanded direction the stack must be before a burn lights, rad. */
const BURN_IGNITION_ALIGNMENT = 4 * DEG;

/**
 * Airspeed a returning stage's entry burn aims to reach, m/s. Above roughly
 * this the peak heating and dynamic pressure of the descent are what a booster
 * is flown to avoid; below it the stage rides the atmosphere down.
 */
const ENTRY_BURN_TARGET_SPEED = 1400;

/** Δv reserved for the landing burn, m/s (terminal velocity plus gravity losses). */
const LANDING_BURN_DV = 800;

/** Select how many of a returning stage's engines burn, and the thrust that follows. */
function setRecoveryEngines(rc: NonNullable<Debris['recovery']>, n: number): void {
  const e = rc.engine;
  if (!e) return;
  const k = Math.max(1, Math.min(e.count, n));
  rc.thrustVac = k * e.thrustVac;
  rc.thrustSL = k * e.thrustSL;
  rc.mdot = (k * e.thrustVac) / (G0 * e.ispVac);
}

/**
 * Recovery parameters for a returning stage: a propellant reserve sized by the
 * rocket equation for a `LANDING_BURN_DV` landing burn, and an entry burn on up
 * to three engines — or more, when three cannot give the empty stage 2.5 g.
 */
function recoveryFor(e: EngineSpec, dryMass: number, propellant: number): NonNullable<Debris['recovery']> {
  const landingReserve = dryMass * (Math.exp(LANDING_BURN_DV / (G0 * e.ispSL)) - 1);
  const rc: NonNullable<Debris['recovery']> = {
    engine: e, propellant, thrustVac: 0, thrustSL: 0, mdot: 0,
    burning: false, landed: false, landingReserve, phase: 'coast',
  };
  setRecoveryEngines(rc, Math.max(3, Math.ceil((2.5 * G0 * (dryMass + landingReserve)) / e.thrustSL)));
  return rc;
}

/**
 * Most telemetry samples a flight keeps. Past this the older half is thinned
 * 2:1 (see `sample`), which bounds the buffer without bounding the mission: a
 * geostationary delivery warped through several days of coasting used to grow
 * it without limit, and every chart redraw and CSV export walks all of it.
 */
const TELEMETRY_CAP = 20000;

/**
 * Lowest periapsis the ascent may cut off at when the apoapsis is already on
 * target, m — the same floor `abandonInsertion` holds the post-ascent sequence
 * to, and deliberately the same constant rather than a second copy of 140 km.
 */
const ASCENT_MIN_PERIAPSIS = ORBIT_INSERTION_FLOOR;

/**
 * Fraction of the acceptance band a single-shot ascent has to be inside before
 * it calls the mission done and shuts the engine off — see `singleShotCutoff`.
 */
const SINGLE_SHOT_CUTOFF_BAND = 0.25;

/** Fairing placard: free-molecular heating limit, W/m^2 (0.1 BTU/ft^2/s). */
export const FAIRING_HEAT_FLUX_LIMIT = 1135;
/** Fairing placard: dynamic-pressure limit, Pa. */
export const FAIRING_Q_LIMIT = 1100;
/** Fairing placard: altitude floor below which the fairing is never dropped, m. */
export const FAIRING_ALTITUDE_FLOOR = 80e3;

/** Mulberry32: small, fast, deterministic PRNG (replaces Math.random in physics). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
export function applyVehicleGuidanceDefaults(g: GuidanceParams, spec: VehicleSpec): GuidanceParams {
  const vd = spec.guidanceDefaults;
  if (!vd) return g;
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
  readonly debris: Debris[] = [];
  readonly payloadMass: number;
  readonly headless: boolean;
  private pending: PendingAction[] = [];
  private lastSampleT = -Infinity;
  private lastBurnDv = Infinity;
  /** the current burn has lit (the attitude-alignment gate has been passed once) */
  private burnIgnited = false;
  private failureApplied = false;
  private failureMode: FailureMode;
  private failureTime: number;
  private failureStage: number;
  private fairingStuck = false;
  private stagingInProgress = false;
  private circularizeInserted = false;
  private replans = 0;
  /** smallest apsis residual any replan has seen, m (progress detector) */
  private lastResidual = Infinity;
  /** consecutive replans that did not improve the residual */
  private stalledReplans = 0;
  /** best apsis residual the ascent has reached, m (single-shot cut-off) */
  private bestAscentResidual = Infinity;
  private readonly siteR0: Vec3;
  /**
   * The pad as a unit vector in the ROTATING (Earth-fixed) frame, and the two
   * cosines that bound `groundElevation`'s fade — all constant, all computed
   * once. See `groundElevation` for why this is worth caching.
   */
  private readonly padEcef: Vec3;
  private readonly padCosNear: number;
  private readonly padCosFar: number;
  private readonly maxQAscent: number;
  /** perigee speed of the insertion orbit, m/s (fixed by the plan) */
  private readonly insertionSpeed: number;
  private maxQReported = false;
  private structuralFailed = false;
  /** ascent max-Q peak is final (the vehicle is falling back through the air) */
  private maxQLatched = false;
  private sinkingSince = -1;
  private secoReported = false;
  /** Longest single orbital burn before splitting it across perigee/apogee passes, s. */
  private maxBurnDurationFor(burn: BurnPlan, el: OrbitalElements): number {
    const period = isFinite(el.period) ? el.period : 5400;
    if (burn.kind === 'raiseApoapsis') return Math.min(900, Math.max(300, 0.1 * period));
    return Math.min(3600, Math.max(400, 0.12 * period));
  }

  constructor(cfgIn: MissionConfig, opts: { headless?: boolean } = {}) {
    this.headless = opts.headless ?? false;
    this.site = siteById(cfgIn.siteId);
    this.vehicleSpec = vehicleById(cfgIn.vehicleId);
    // Per-vehicle guidance defaults fill in every parameter the caller left at
    // the library default, so the UI (and any caller that does not merge them
    // itself) flies each launcher with its own pitch program.
    const cfg: MissionConfig = cfgIn.guidanceResolved
      ? cfgIn
      : { ...cfgIn, guidance: applyVehicleGuidanceDefaults(cfgIn.guidance, this.vehicleSpec), guidanceResolved: true };
    this.cfg = cfg;
    this.satellite = satelliteById(cfg.satelliteId);
    this.payloadMass = cfg.payloadMassOverride ?? this.satellite.mass;
    this.plan = planMission(cfg, this.site, this.vehicleSpec);
    this.vehicle = new VehicleModel(this.vehicleSpec, this.payloadMass, cfg.boosterRecovery, this.satellite);
    this.guidance = new AscentGuidance(cfg.guidance, this.plan.azimuthRotating, this.plan.ascentInclination, this.plan.insertionAltitude, this.plan.insertionApoapsis);
    this.maxQAscent = this.vehicleSpec.maxQ;
    const rIns = R_EARTH + this.plan.insertionAltitude;
    this.insertionSpeed = Math.sqrt(MU_EARTH * (2 / rIns - 2 / (2 * R_EARTH + this.plan.insertionAltitude + this.plan.insertionApoapsis)));

    this.failureMode = cfg.failure.mode;
    this.failureTime = cfg.failure.time;
    this.failureStage = cfg.failure.stage;
    if (this.failureMode === 'random') {
      // Deterministic: the seed is the launch epoch, so replaying a recorded
      // flight injects exactly the same failure at exactly the same time.
      const rnd = mulberry32(hashSeed(cfg.launchTime.getTime(), cfg.vehicleId));
      const modes: FailureMode[] = ['engineOut', 'thrustLoss', 'prematureSep', 'fairingStuck'];
      this.failureMode = modes[Math.min(modes.length - 1, Math.floor(rnd() * modes.length))];
      this.failureTime = 10 + rnd() * 140;
      this.failureStage = 0;
    }
    if (this.failureMode === 'fairingStuck') this.fairingStuck = true;

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
      for (const b of st0.boosters) if ((b.spec.igniteAt ?? 0) <= 0 && !b.spec.engine.solid) this.vehicle.igniteBooster(b);
      this.event('evt.ignition', 'major', { stage: st0.spec.name });
    });
    this.schedule(0, 'liftoff', () => {
      for (const b of st0.boosters) if ((b.spec.igniteAt ?? 0) <= 0) this.vehicle.igniteBooster(b);
      if (st0.spec.engine.solid && !st0.ignited) {
        this.vehicle.igniteStage(st0, 0);
        this.event('evt.ignition', 'major', { stage: st0.spec.name });
      }
      for (const b of st0.boosters) {
        if ((b.spec.igniteAt ?? 0) > 0) {
          this.schedule(b.spec.igniteAt!, 'boosterIgnite', () => {
            this.vehicle.igniteBooster(b);
            this.event('evt.boosterIgnition', 'major', { name: b.spec.name });
          });
        }
      }
    });
    if (this.failureMode !== 'none' && this.failureMode !== 'fairingStuck') {
      this.schedule(this.failureTime, 'failure', () => this.applyFailure());
    }
    this.sample();
  }

  // ------------------------------------------------------------------ utils
  private schedule(t: number, label: string, fn: () => void): void {
    this.pending.push({ t, fn, label });
    this.pending.sort((a, b) => a.t - b.t);
  }
  /**
   * Log an event. `at` overrides the timestamp for a *peak-detected* event: the
   * max-Q marker is raised when q has clearly fallen away from the peak, tens of
   * seconds after the peak itself, and stamping it with the detection time put
   * it 19 s late on the event bar (audit item B40(5)).
   */
  private event(key: string, severity: EventSeverity, params?: Record<string, string | number>, at?: number): void {
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
  private stageParams(st: StageState): Record<string, string | number> {
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
  private groundElevation(r: Vec3): number {
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
    return this.state.status === 'failed' || this.state.status === 'orbit';
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
        if (s.altitude > 100e3 && this.insertionSpeed - vh < 250) dt = 0.02;
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
        const dv = s.burnDvRemaining > 0 ? s.burnDvRemaining : 20;
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
  step(dt: number): number {
    const s = this.state;
    if (s.status === 'failed') return 0;
    // pending actions due at or before the current time
    while (this.pending.length > 0 && this.pending[0].t <= s.t + 1e-9) {
      const a = this.pending.shift()!;
      a.fn();
    }
    if (this.isFailed()) return 0;
    // an action may have changed the regime (e.g. coast -> burn): re-clamp the step
    dt = Math.min(dt, this.suggestedDt());

    if (s.status === 'prelaunch') this.stepPrelaunch(dt);
    else if (s.status === 'orbit') this.stepOrbit(dt);
    else this.stepFlight(dt);

    this.stepDebris(dt);
    s.theta = this.plan.gmst0 + OMEGA_EARTH * s.t;
    this.updateDerived();
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
    const thr = this.vehicle.thrust(s.t, atm.p, 1);
    if (thr.burning) this.vehicle.consume(s.t, 1, dt);
    s.thrust = thr.thrust;
    s.throttle = thr.burning ? 1 : 0;
    s.t = tNew;
    const theta = this.plan.gmst0 + OMEGA_EARTH * s.t;
    s.r = groundPositionEci(lat, lon, this.site.altitude, theta);
    s.v = groundVelocityEci(s.r);
    s.dir = normalize(s.r);
    s.mass = this.vehicle.totalMass();
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

  /**
   * Acceleration field for the integrator.
   *
   * `cd0` selects the drag law: undefined keeps the slender-body ascent curve
   * (`dragCoefficient(mach)`, 0.22–0.64), a number is the blunt-body drag
   * coefficient of a tumbling object and is flown through
   * `tumblingDragCoefficient`. Every `Debris` has carried a `cd` since the type
   * was written — 2.2 for a spent upper stage, 1.2 for a booster, 1.5 for a
   * fairing half — and nothing read it (audit item B15), so boosters, stages and
   * fairing halves all fell with 2–7× too little drag and landed too fast and
   * too far downrange.
   */
  private accelerationFn(thrustAccel: number, dir: Vec3, mass0: number, mdot: number, t0: number, area: number, useJ2: boolean, cd0?: number) {
    return (t: number, r: Vec3, v: Vec3): Vec3 => {
      const rm = norm(r);
      const alt = rm - R_EARTH;
      let a = useJ2 ? gravityJ2(r) : gravity(r);
      const m = Math.max(1, mass0 - mdot * (t - t0));
      if (thrustAccel > 0) {
        const T = thrustAccel * mass0; // thrust force
        a = addScaled(a, dir, T / m);
      }
      if (alt < 1000e3) {
        const atm = atmosphere(alt);
        const vAir = sub(v, cross(v3(0, 0, OMEGA_EARTH), r));
        const vAirMag = norm(vAir);
        if (vAirMag > 0.1 && atm.rho > 0) {
          const mach = vAirMag / atm.a;
          const cd = cd0 === undefined ? dragCoefficient(mach) : tumblingDragCoefficient(cd0, mach);
          const D = 0.5 * atm.rho * vAirMag * vAirMag * cd * area;
          a = addScaled(a, vAir, -D / (m * vAirMag));
        }
      }
      return a;
    };
  }

  private stepFlight(dt: number): void {
    const s = this.state;
    const rm = norm(s.r);
    const alt = rm - R_EARTH;
    const atm = atmosphere(alt);
    const omega = v3(0, 0, OMEGA_EARTH);
    const vAir = sub(s.v, cross(omega, s.r));
    const vAirMag = norm(vAir);
    const q = 0.5 * atm.rho * vAirMag * vAirMag;
    const mass = this.vehicle.totalMass();
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
        maxQThrottle: this.vehicleSpec.maxQThrottle, maxAccel, maxQPlacard: this.maxQAscent,
      });
      dirCmd = cmd.dir;
      throttleCmd = cmd.throttle;
      s.ascentPhase = cmd.phase;
      s.pitchCmd = cmd.pitchDeg;
      s.predictedApoapsis = cmd.predictedApoapsis;
    } else if (s.status === 'burn' && s.currentBurn) {
      const b = s.currentBurn;
      const vDes = desiredVelocity(s.r, s.v, b.kind, b.targetApoapsis, b.targetPeriapsis, b.targetInclination, s.burnPlaneNormal ?? undefined);
      const dvVec = sub(vDes, s.v);
      const dvMag = norm(dvVec);
      s.burnDvRemaining = dvMag;
      if (b.kind === 'raiseApoapsis') {
        // apoapsis adjustment: thrust along (or against) the velocity vector.
        // Velocity-to-be-gained steering would fight the radial velocity away
        // from periapsis and waste propellant moving the periapsis instead.
        const need = norm(vDes) - norm(s.v);
        const sign = b.lowering ? -1 : 1;
        dirCmd = norm(s.v) > 1 ? scale(normalize(s.v), sign) : s.dir;
        s.burnDvRemaining = Math.abs(need);
      } else {
        dirCmd = dvMag > 0.01 ? scale(dvVec, 1 / dvMag) : s.dir;
      }
      // Light the engine only once the stack is pointing where the burn wants
      // to push. The pre-orient above covers a burn that was scheduled minutes
      // ahead, but several paths arm one for `s.t + 1` — a re-planned trim, a
      // remainder finished on the same pass — and a 3°/s slew cannot turn a
      // prograde stack round for a retrograde trim in one second: the first
      // seconds of thrust went in at ninety degrees to the commanded direction,
      // moving the wrong element and ending the burn on the "passed the
      // minimum" test. Suborbital is the exception, where every second of
      // thrust is worth more than its direction. Once lit, the burn stays lit
      // even if the command swings as the remaining Δv goes to zero.
      const aligned = angleBetween(s.dir, dirCmd) < BURN_IGNITION_ALIGNMENT;
      if (!this.burnIgnited && !aligned && s.elements.periapsisAlt > 120e3) {
        throttleCmd = 0;
      } else {
        this.burnIgnited = true;
        throttleCmd = 1;
        if (fullThrust.thrustFullVac / mass > maxAccel && maxAccel > 0) throttleCmd = maxAccel / (fullThrust.thrustFullVac / mass);
      }
      s.ascentPhase = null;
      s.pitchCmd = Math.asin(Math.max(-1, Math.min(1, dot(dirCmd, up)))) * RAD;
    } else {
      // Coast: hold prograde, but pre-point at the attitude the next burn needs
      // once it is close. The slew-rate limit is a few degrees per second, so a
      // short retrograde trim would otherwise spend its entire burn turning
      // around — and thrust the wrong way while doing it.
      dirCmd = norm(s.v) > 1 ? normalize(s.v) : s.dir;
      const nb = s.currentBurn;
      if (nb && s.nextBurnTime > s.t && s.nextBurnTime - s.t < BURN_PREORIENT_TIME) {
        // Point at the attitude the burn needs AT ITS OWN IGNITION POINT, not at
        // the one it would need here (audit item B6, review follow-up).
        //
        // `desiredVelocity` for a shaping burn means "make the radius I am at
        // now the apoapsis", so evaluating it minutes short of the apoapsis
        // describes a different orbit and returns a nearly RADIAL correction.
        // Measured on vulcan/iss/50: 240 s out the pre-orient asked for 166 m/s
        // at 96° to the velocity vector, the stack dutifully turned there, and
        // at ignition the burn wanted 9 m/s at 178° — which a 3°/s slew cannot
        // cover in the 0.7 s such a trim lasts. The impulse went in almost
        // radially, moved the periapsis 6 km instead of 25, the "passed the
        // minimum" clause ended the burn, and the re-planner scheduled the same
        // trim one revolution later, five times over, until the flight ran out
        // of horizon. Propagating to the ignition point first is the whole fix:
        // attitude is an inertial quantity, so the direction computed there is
        // the one to hold now.
        const at = propagateKepler(s.r, s.v, Math.max(0, s.nextBurnTime - s.t));
        const vAt = norm(at.v) > 1 ? normalize(at.v) : dirCmd;
        if (nb.kind === 'raiseApoapsis') {
          dirCmd = nb.lowering ? scale(vAt, -1) : vAt;
        } else {
          const vDesPre = desiredVelocity(at.r, at.v, nb.kind, nb.targetApoapsis, nb.targetPeriapsis, nb.targetInclination);
          const dvPre = sub(vDesPre, at.v);
          if (norm(dvPre) > 0.01) dirCmd = normalize(dvPre);
        }
      }
      throttleCmd = 0;
      s.ascentPhase = null;
    }
    // slew-limited attitude
    const slew = this.cfg.guidance.slewRate * DEG * dt;
    s.dir = slerpLimited(s.dir, dirCmd, slew);

    // --- propulsion
    const thr = throttleCmd > 0
      ? this.vehicle.thrust(s.t, atm.p, throttleCmd)
      : { thrust: 0, mdot: 0, thrustFullVac: 0, coreThrottle: 0, boosterThrottle: 0, burning: false };
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
    if (useKepler) {
      next = propagateKepler(s.r, s.v, dt);
    } else {
      next = rk4Step(s.t, { r: s.r, v: s.v }, dt, this.accelerationFn(thrustAccel, s.dir, mass, thr.mdot, s.t, area, false));
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
    if (thr.burning && s.status === 'ascent') {
      const g = MU_EARTH / (rm * rm);
      s.losses.dvThrust += thrustAccel * dt;
      const sinGamma = vMag > 1 ? dot(s.v, up) / vMag : 1;
      s.losses.gravity += g * sinGamma * dt;
      const cosA = Math.max(-1, Math.min(1, dot(s.dir, vHat)));
      s.losses.steering += thrustAccel * (1 - cosA) * dt;
    }
    if (q > 0 && s.status === 'ascent' && vAirMag > 1) {
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
    s.gLoad = norm(aNonGrav) / G0;
    // Max Q is the peak of the ASCENT. A trajectory that lofts and falls back is
    // still `ascent`, and its re-entry dynamic pressure would otherwise replace
    // the real peak in the field the HUD, the telemetry and every captured frame
    // read (audit item B4). Once the vehicle has been sinking through the
    // atmosphere for a few seconds the ascent is over, whatever the status says.
    if (alt < 100e3 && vz < -20) {
      if (this.sinkingSince < 0) this.sinkingSince = s.t;
      if (s.t - this.sinkingSince > 3) this.maxQLatched = true;
    } else {
      this.sinkingSince = -1;
    }
    if (s.status === 'ascent' && !this.maxQLatched && alt < 100e3 && q > s.maxQ.value) s.maxQ = { value: q, t: s.t, alt };

    // --- propellant & staging
    if (thr.burning) {
      const res = this.vehicle.consume(s.t, throttleCmd, dt);
      for (const b of res.boosterBurnout) this.onBoosterBurnout(b);
      if (res.coreBurnout && active) this.onCoreBurnout(active, next.r, next.v);
    }
    s.r = next.r;
    s.v = next.v;
    s.t += dt;
    s.mass = this.vehicle.totalMass();

    // --- max-Q event (detect peak). Informational only: it fires at the first
    // local maximum of the dynamic pressure, which on a vehicle that flies a
    // throttle bucket is a plateau rather than a single spike.
    if (s.status === 'ascent' && s.maxQ.value > 0 && q < s.maxQ.value * 0.97 && !this.maxQReported && s.t > 5) {
      this.maxQReported = true;
      // Stamped with the time of the PEAK, not the time it was detected: the
      // detection lags by the width of the plateau, which on Falcon 9 is 19 s.
      this.event('evt.maxQ', 'info',
        { q: Math.round(s.maxQ.value / 100) / 10, alt: Math.round(s.maxQ.alt / 100) / 10 }, s.maxQ.t);
    }
    // --- insertion floor. Asked BEFORE the structural placard, because the
    // whole point of it is that a stack still trying to reach orbit must be
    // stopped before it is destroyed doing so (see `abandonInsertion`).
    if (this.abandonInsertion(q, vz)) return;
    // --- structural placard. Armed continuously from liftoff until the payload
    // separates, and tested on *every* step of powered or coasting flight
    // against the vehicle's quoted max-Q limit (audit item B4). Testing it only
    // at the detected max-Q peak let a trajectory that dives back into the
    // atmosphere fly at tens of times its limit and simply hit the ground
    // instead of breaking up; restricting it to `ascent` let the same thing
    // happen to a stack that had already been handed to the coast/burn logic.
    // It is deliberately NOT tested in `stepOrbit`, where `orbitArea()` models a
    // small satellite and a stacked launcher's placard is meaningless.
    if (s.liftoff && !s.payloadSeparated && !this.structuralFailed && q > this.maxQAscent * 1.15) {
      this.structuralFailed = true;
      this.event('evt.structuralFailure', 'fail', { q: Math.round(q / 1000) });
      this.destroy();
      return;
    }
    // --- fairing: jettisoned on the free-molecular heating / dynamic-pressure
    // placard rather than at a fixed altitude (see fairingReleased).
    if (this.vehicleSpec.fairing && s.liftoff && this.fairingReleased(alt, q, atm.rho, vAirMag)) {
      if (this.vehicle.fairingAttached && !this.fairingStuck) {
        this.vehicle.jettisonFairing();
        this.event('evt.fairingSep', 'major', { alt: Math.round(alt / 1000) });
        this.spawnFairing(s.r, s.v);
      } else if (this.fairingStuck && !this.events.some((e) => e.key === 'evt.fairingStuck')) {
        this.event('evt.fairingStuck', 'warn');
      }
    }

    // --- mission logic
    const el2 = elementsFromState(s.r, s.v);
    s.elements = el2;
    if (s.status === 'ascent') this.checkAscent(el2, alt, vz);
    else if (s.status === 'coast') this.checkCoast(el2);
    else if (s.status === 'burn') this.checkBurn(el2);

    // --- ground impact / reentry
    const altNew = norm(s.r) - R_EARTH;
    if (s.liftoff && altNew < this.groundElevation(s.r) - 1 && !this.isFailed()) {
      this.event('evt.impact', 'fail', { speed: Math.round(norm(sub(s.v, cross(omega, s.r)))) });
      this.destroy();
    }
  }

  private stepOrbit(dt: number): void {
    const s = this.state;
    const area = this.orbitArea();
    const mass = Math.max(1, this.vehicle.totalMass());
    s.mass = mass;
    // A separated spacecraft is a blunt body in free molecular flow, not a
    // slender launcher (audit items B15/B33).
    const cd = s.payloadSeparated ? 2.2 : undefined;
    const next = rk4Step(s.t, { r: s.r, v: s.v }, dt, this.accelerationFn(0, s.dir, mass, 0, s.t, area, true, cd));
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

  // ------------------------------------------------------------ staging
  private onBoosterBurnout(b: BoosterState): void {
    const s = this.state;
    this.event('evt.boosterBurnout', 'info', { name: b.spec.name });
    const delay = b.spec.sepDelay ?? 2;
    this.schedule(s.t + delay, 'boosterSep', () => {
      if (!b.attached) return;
      this.vehicle.jettisonBooster(b, this.state.t);
      this.event('evt.boosterSep', 'major', { name: b.spec.name, alt: Math.round(this.state.altitude / 1000), speed: Math.round(this.state.speed) });
      this.spawnBoosterDebris(b);
    });
  }

  /**
   * Shut the ascent stage down and log SECO.
   *
   * Every path that ends the powered ascent goes through here, so the marquee
   * milestone the event bar is built around cannot go missing on one of them:
   * before this existed `evt.seco` was emitted from `checkAscent` only, and the
   * natural-depletion branch of `onCoreBurnout` — which hands the insertion to
   * the coast-to-apoapsis + circularise machinery — logged `evt.coastToApoapsis`
   * and `evt.burnComplete` but never a SECO (audit item B20).
   */
  private cutoffAscentStage(st: StageState | null): void {
    const s = this.state;
    if (st) this.vehicle.cutoffStage(st, s.t);
    if (this.secoReported) return;
    this.secoReported = true;
    this.event('evt.seco', 'major', st ? this.stageParams(st) : { stage: '' });
  }

  private onCoreBurnout(st: StageState, rNext: Vec3, vNext: Vec3): void {
    const s = this.state;
    const isLast = st.index >= this.vehicle.lastLauncherIndex;
    if (st.spec.isSpacecraft) this.event('evt.spacecraftPropellantOut', 'warn', this.stageParams(st));
    else this.event(st.index === 0 ? 'evt.meco' : 'evt.stageCutoff', 'major', { stage: st.spec.name, n: st.index + 1 });
    if (s.status === 'burn' && s.currentBurn) {
      // stage exhausted mid-burn
      if (st.index === this.vehicle.stages.length - 1) {
        this.finishBurnIncomplete();
        return;
      }
      if (isLast && this.vehicle.hasSpacecraftStage) {
        this.separatePayload(true);
        return;
      }
      this.stageTo(st.index + 1, true);
      return;
    }
    if (s.status === 'ascent') {
      const el = elementsFromState(rNext, vNext);
      const hIns = this.plan.insertionAltitude;
      // Decide between continuing the powered ascent with the next stage or coasting
      // to apoapsis and circularising there. Coasting is preferred when the apoapsis
      // is already at the parking altitude and either the next stage is too weak to
      // hold altitude or the remaining delta-v is small.
      let nearApo = false;
      const haIns = this.plan.insertionApoapsis;
      if (!isLast && el.apoapsisAlt >= haIns - 3e3 && el.periapsisAlt < hIns - 3e3 && s.altitude > 120e3 && el.e < 1) {
        const next = this.vehicle.stages[st.index + 1];
        const massAfter = this.vehicle.totalMass() - (st.spec.dryMass + st.propellant);
        const aNext = (next.spec.engine.count * next.spec.engine.thrustVac) / Math.max(1, massAfter);
        const rm = norm(rNext);
        const up = normalize(rNext);
        const vzN = dot(vNext, up);
        const vh = norm(sub(vNext, scale(up, vzN)));
        const gEff = MU_EARTH / (rm * rm) - (vh * vh) / rm;
        const aIns = (2 * R_EARTH + hIns + haIns) / 2;
        const vPer = Math.sqrt(MU_EARTH * (2 / (R_EARTH + hIns) - 1 / aIns));
        // Coast + circularise only when the shortfall is small; a large shortfall is
        // better flown with the closed-loop ascent law (which lofts as required).
        const shortfall = vPer - vh;
        nearApo = shortfall < (aNext < 0.9 * gEff ? 700 : 400);
      }
      if (isLast) {
        if (el.periapsisAlt > 100e3 && el.apoapsisAlt >= hIns - 3e3 && el.e < 1) {
          this.cutoffAscentStage(st);
          this.event('evt.lowPerigee', 'warn', { pe: Math.round(el.periapsisAlt / 1000) });
          this.finishAscent(el);
        } else {
          this.event('evt.outOfPropellant', 'fail', { ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000) });
          this.failSuborbital();
        }
        return;
      }
      if (nearApo && !this.circularizeInserted) {
        // coast to apoapsis and circularise with the next stage (more efficient than continuing to push)
        this.circularizeInserted = true;
        this.plan.burns.unshift({ id: 'circ', kind: 'circularize', atU: 0, targetPeriapsis: hIns, dvEstimate: 0, done: false });
        this.cutoffAscentStage(st);
        this.event('evt.coastToApoapsis', 'info', { ap: Math.round(el.apoapsisAlt / 1000) });
        this.stageTo(st.index + 1, false);
        s.status = 'coast';
        s.note = 'coast';
        this.scheduleNextBurn(el);
        return;
      }
      this.stageTo(st.index + 1, true);
    }
  }

  /** Separate the stage below `nextIndex` and (optionally) ignite the next stage after its delays. */
  private stageTo(nextIndex: number, igniteNext: boolean): void {
    const s = this.state;
    const prev = this.vehicle.stages[nextIndex - 1];
    const next = this.vehicle.stages[nextIndex];
    const sepDelay = next.spec.sepDelay ?? 2;
    const ignDelay = next.spec.ignitionDelay ?? 2;
    this.stagingInProgress = true;
    this.schedule(s.t + sepDelay, 'stageSep', () => {
      if (!prev.attached) return;
      this.vehicle.separateStage(prev, this.state.t);
      this.event('evt.stageSep', 'major', { stage: prev.spec.name, n: prev.index + 1, alt: Math.round(this.state.altitude / 1000), speed: Math.round(this.state.speed) });
      this.spawnStageDebris(prev);
      if (igniteNext) {
        this.schedule(this.state.t + ignDelay, 'ignition', () => {
          this.vehicle.igniteStage(next, this.state.t);
          this.event('evt.ignition', 'major', { stage: next.spec.name });
          this.stagingInProgress = false;
        });
      } else {
        this.stagingInProgress = false;
      }
    });
  }

  /**
   * Fairing jettison criterion. Payload fairings are dropped on a thermal
   * placard, not at a fixed altitude: the usual one is free-molecular heating
   * q̇ = ½ρv³ below 1135 W/m² (0.1 BTU/ft²·s) together with a dynamic pressure
   * below about 1.1 kPa, which on a normal ascent happens around 95–120 km. The
   * vehicle's `sepAltitude` is kept as a fallback ceiling for trajectories that
   * never satisfy the placard (a slow, very lofted climb).
   */
  private fairingReleased(alt: number, q: number, rho: number, airspeed: number): boolean {
    const f = this.vehicleSpec.fairing;
    if (!f) return false;
    if (alt < Math.min(f.sepAltitude, FAIRING_ALTITUDE_FLOOR)) return false;
    // An operator who publishes a jettison TIME flies it: Ariane 6, Vega-C,
    // H-IIA and Long March 2D all do, and the altitude floor above is what
    // stops a slow trajectory from shedding the fairing in dense air anyway.
    // This replaces four per-vehicle `heatFluxLimit` values that had been
    // back-solved from these same times — see `FairingSpec.sepTime` in
    // src/types.ts for why that was not a placard (audit hand-off d, review
    // follow-up).
    if (f.sepTime !== undefined) return this.state.t >= f.sepTime;
    const heatFlux = 0.5 * rho * airspeed * airspeed * airspeed;
    // The placard is an operator's choice, not a law of nature, but 1135 W/m²
    // (0.1 BTU/ft²·s) is the common one and it is the only one in the model.
    if (heatFlux < FAIRING_HEAT_FLUX_LIMIT && q < FAIRING_Q_LIMIT) return true;
    // Backstop for a trajectory that never satisfies the placard (a slow,
    // heavily lofted climb): drop it well above the vehicle's quoted altitude.
    return alt >= f.sepAltitude + 40e3;
  }

  /**
   * Whether this launch was made into a window that could reach the target
   * plane. Steering/early-cutoff checks use this to avoid wasting fuel on a
   * plane the current burn plan cannot correct. Final mission acceptance
   * always checks every requested constraint, including an off-window RAAN.
   */
  private raanWasReachable(): boolean {
    const want = this.plan.target.raan;
    if (want === null) return false;
    return Math.abs(wrapPi(this.plan.raanExpected - want)) <= RAAN_TOLERANCE;
  }

  /**
   * Whether the vehicle could still light an engine after shutting the current
   * one down: the active stage restarts, or a later stage (launcher or
   * spacecraft) still has propellant. Cutting off a stage that cannot be
   * relit — Soyuz-2.1a's Blok I, a solid upper stage — ends the mission, so a
   * guard that trades a cut-off for a coast must not fire for those vehicles.
   * What such a stack needs instead is `singleShotCutoff`.
   */
  private canReigniteAfterCutoff(): boolean {
    const act = this.vehicle.active;
    if (!act) return false;
    if (act.spec.restartable && this.vehicle.usablePropellant(act) > 0) return true;
    for (let i = act.index + 1; i < this.vehicle.stages.length; i++) {
      const st = this.vehicle.stages[i];
      if (st.attached && this.vehicle.usablePropellant(st) > 0) return true;
    }
    return false;
  }

  /**
   * Cut-off test for a stack that cannot light anything again — Soyuz-2.1a's
   * Blok I, Long March 2D's second stage, a solid upper stage (audit wave-1
   * hand-off (a)).
   *
   * Everything else in `checkAscent` assumes a later burn exists: the apoapsis
   * guard and the "stalled" clause both trade a cut-off for a coast and are
   * gated on `canReigniteAfterCutoff`, and the periapsis gate waits for an
   * orbit that a stack like this may never reach. A single-burn insertion is a
   * different problem with a different answer, and it has only two moments
   * worth stopping at:
   *
   *  1. **The orbit is already the mission's** — and comfortably so, not
   *     barely. There is nothing left to gain, and every further second of
   *     thrust takes it back off target. This is the whole of single-shot
   *     direct insertion: Soyuz-2.1a with an inert payload aimed at a 200 km
   *     circular orbit now cuts off at 197.2 × 200.4 km (1.755 t) with 2.7 km/s
   *     still in the tanks, where it used to burn on to 197 × 695 km and be
   *     reported off target. The full grid is measured in exactly one place —
   *     the `single-shot direct insertion` section of
   *     tests/fleet-defaults.test.ts.
   *
   *     The band this clause asks about is `SINGLE_SHOT_CUTOFF_BAND` of the
   *     acceptance band, and the fraction is the point. Asking at the full band
   *     stops the burn the first instant the orbit is legal: the perigee is
   *     still climbing at cut-off, so it stops at the low EDGE and the mission
   *     is declared on target with a few hundred metres to spare (measured
   *     190.4 × 200.1 km against a 10 km band — 395 m of margin, which any
   *     change to the atmosphere or the loss bookkeeping would flip to a miss).
   *     Cutting off at a quarter of the band leaves the mission near the middle
   *     of it, and clause 2 still catches the stack that cannot get there.
   *  2. **The orbit has stopped getting better.** The apsis residual against
   *     the plan falls while the stage is closing the gap and rises once it is
   *     only adding energy to an orbit that is already too big. Cutting off at
   *     that minimum is the best a single burn can do, and it is the difference
   *     between Long March 2D's 197 × 695 km and the 197 × 5 147 km it reaches
   *     by simply burning to depletion. The orbit still has to be one worth
   *     being in — above the 140 km floor, out of the atmosphere — or an early
   *     wobble in the residual would cut a healthy ascent off at 120 km.
   */
  private singleShotCutoff(el: OrbitalElements, alt: number): boolean {
    if (el.e >= 1 || this.canReigniteAfterCutoff()) return false;
    if (!this.state.liftoff || alt < 100e3) return false;
    if (orbitResiduals(this.plan.target, el, this.raanWasReachable(), SINGLE_SHOT_CUTOFF_BAND).onTarget) return true;
    if (el.periapsisAlt < Math.min(this.plan.insertionAltitude, ASCENT_MIN_PERIAPSIS)) return false;
    const residual = Math.abs(el.apoapsisAlt - this.plan.insertionApoapsis)
      + Math.abs(el.periapsisAlt - this.plan.insertionAltitude);
    if (residual < this.bestAscentResidual) {
      this.bestAscentResidual = residual;
      return false;
    }
    // Ignore the numerical noise of a residual sitting at its minimum; only a
    // clear, sustained rise means the burn has started undoing its own work.
    return residual > this.bestAscentResidual + apsisTolerance(this.plan.insertionApoapsis);
  }

  // ------------------------------------------------------------ ascent
  private checkAscent(el: OrbitalElements, alt: number, vz: number): void {
    const s = this.state;
    const hIns = this.plan.insertionAltitude;
    const haIns = this.plan.insertionApoapsis;
    const tol = 3e3;
    if (this.singleShotCutoff(el, alt)) {
      this.cutoffAscentStage(this.vehicle.active);
      this.finishAscent(el);
      return;
    }
    // Cut-off. When the insertion orbit is an ellipse (a transfer whose apogee
    // is the target), what has to be right at cut-off is the *apoapsis*: the
    // following burn at apogee sets the periapsis anyway. Waiting for the
    // periapsis to climb all the way to the insertion altitude lets the
    // apoapsis run 15–20 km past the target, which is outside the accuracy the
    // mission is judged on. A periapsis high enough to coast one revolution
    // without decaying is enough — but only in that case. A *circular*
    // insertion orbit has no later burn to fix its perigee with: cutting a
    // 200 km parking orbit off at a 140 km perigee is not a parking orbit, it
    // is a decaying ellipse, so there the gate is the insertion altitude
    // itself.
    const elliptical = haIns > hIns + 1e3;
    const peSafe = Math.min(hIns, ASCENT_MIN_PERIAPSIS);
    const peGate = elliptical ? peSafe : hIns;
    const margin = Math.max(25e3, 0.05 * haIns);
    // Degradation clause for a circular insertion plan. Thrust applied at the
    // periapsis raises the apoapsis, not the periapsis: a stage that has ended
    // up *at* its own periapsis (or whose apoapsis has already run past what
    // the plan asked for) cannot close the remaining perigee gap by burning
    // on, and every second it keeps thrusting makes the orbit more eccentric,
    // not less. Cut off there instead, provided the orbit is already safe to
    // coast and a later burn can raise the perigee at apogee — which is where
    // it is cheapest anyway. `finishAscent` re-plans from the orbit actually
    // achieved, so the following burns aim at the real shortfall.
    // "At the periapsis" is tested against the *apoapsis* as well: on a nearly
    // circular orbit the vehicle is a few kilometres from both apsides at once,
    // and a healthy insertion spends its last seconds exactly there, flying
    // level at the apoapsis while the periapsis climbs to meet it. Only a
    // vehicle sinking at the low point of an orbit whose apoapsis is far above
    // it has nothing left to gain.
    const atPeriapsis = vz <= 0 && alt - el.periapsisAlt < 15e3 && el.apoapsisAlt - alt > 50e3;
    const stalled = el.periapsisAlt >= peSafe - tol
      && (atPeriapsis || el.apoapsisAlt > haIns + margin)
      && this.canReigniteAfterCutoff();
    if (el.e < 1 && (el.periapsisAlt >= peGate - tol || stalled) && el.apoapsisAlt >= haIns - tol) {
      const act = this.vehicle.active;
      this.cutoffAscentStage(act);
      this.finishAscent(el);
      return;
    }
    // Apoapsis guard. The periapsis-based cut-off above never fires on a lofted
    // trajectory: the apoapsis runs away while the periapsis is still deep
    // inside the Earth, and the stage burns to depletion in a 200 × 20 000 km
    // "parking orbit". When the osculating apoapsis overshoots the insertion
    // apoapsis by more than the margin, cut off and hand the rest to the
    // coast-to-apoapsis + circularise machinery.
    // Margin: a healthy ascent to a circular insertion orbit reaches the target
    // apoapsis a little before the periapsis catches up, so the guard must sit
    // well above the natural overshoot and only catch a genuine runaway.
    // The signature of a runaway is a vehicle that is *still climbing*, already
    // above the insertion altitude, with an apoapsis well past the target and a
    // periapsis that is not following. A healthy ascent into a transfer ellipse
    // also has a high apoapsis and a low periapsis, but it is flying level by
    // then, so the vertical-speed test is what separates the two.
    if (
      el.e < 1 && alt > 110e3 && !this.circularizeInserted
      && el.apoapsisAlt > haIns + margin && el.periapsisAlt < peSafe - tol
      && alt > hIns - 30e3 && vz > 120
      && this.vehicle.activeHasPropellant() && s.thrust > 0 && this.canReigniteAfterCutoff()
      // Only worth it while there is still propellant to save: a stage seconds
      // from depletion should simply finish the job.
      && this.vehicle.stageBurnTimeLeft() > 20
    ) {
      const act = this.vehicle.active;
      this.cutoffAscentStage(act);
      this.circularizeInserted = true;
      this.plan.burns.unshift({
        id: 'circ', kind: 'circularize', atU: 0,
        targetPeriapsis: Math.min(el.apoapsisAlt, Math.max(hIns, haIns)), dvEstimate: 0, done: false,
      });
      this.event('evt.coastToApoapsis', 'info', { ap: Math.round(el.apoapsisAlt / 1000) });
      s.status = 'coast';
      s.note = 'coast';
      this.scheduleNextBurn(el);
      return;
    }
    // range safety / loss of vehicle: falling back without thrust below 100 km
    const thrusting = s.thrust > 0;
    if (!thrusting && !this.stagingInProgress && this.pending.every((p) => p.label !== 'ignition' && p.label !== 'stageSep') && vz < -50 && alt < 100e3 && s.t > 5) {
      if (!this.vehicle.activeHasPropellant() || (this.vehicle.active?.engineFraction ?? 1) === 0) {
        this.event('evt.rangeSafety', 'fail', { alt: Math.round(alt / 1000) });
        this.destroy();
      }
    }
  }

  private finishAscent(el: OrbitalElements): void {
    const s = this.state;
    this.event('evt.parkingOrbit', 'success', {
      ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000), inc: +(el.i * RAD).toFixed(2),
      dv: Math.round(this.vehicle.deltaVRemaining()),
    });
    // The mission may already be over. A direct insertion that meets the
    // acceptance band at cut-off has nothing left to do, and the plan it was
    // given before liftoff must not be flown anyway: Falcon 9 to the ISS inserts
    // at 419 × 419 km at T+526 s and then spent most of a revolution flying a
    // sub-tolerance circularisation trim, so `evt.targetOrbit` — the moment the
    // user is waiting for, and the moment the payload is deployed — landed at
    // T+53 min instead of T+9 min (audit item B6).
    if (orbitResiduals(this.plan.target, el, this.raanWasReachable()).onTarget) {
      for (const b of this.plan.burns) b.done = true;
      this.reachTargetOrbit(el);
      return;
    }
    this.replanRemainingBurns(el);
    if (this.plan.burns.some((b) => !b.done)) {
      s.status = 'coast';
      s.note = 'coast';
      this.scheduleNextBurn(el);
    } else {
      this.reachTargetOrbit(el);
    }
  }

  private failSuborbital(): void {
    const s = this.state;
    s.status = 'failed';
    s.note = 'suborbital';
  }

  /**
   * The insertion floor: the post-ascent sequence may not fly a stack that is
   * still meant to reach orbit back into the atmosphere.
   *
   * `ORBIT_INSERTION_FLOOR` is the perigee below which the sequencer does not
   * consider the vehicle to be in an orbit at all. Everything in `checkCoast` /
   * `checkBurn` above it assumes there is an orbit to shape: the burn-pause
   * clauses are gated on a periapsis above 120 km, `desiredVelocity` for a
   * shaping burn aims at "make the radius I am at now an apsis", and neither
   * has a stopping condition for a trajectory whose perigee is a thousand
   * kilometres inside the Earth. So a kick stage handed one simply thrusts
   * until something else ends the flight, and what ended it was the structural
   * placard — Proton-M/Briz-M with the 7.15 t crew ship burned for 666 s from
   * 199 km down to 45 km and broke up at 46 kPa, 668 s after its own SECO.
   *
   * The rule is therefore: while the payload is still aboard and the mission is
   * still trying to reach orbit, a perigee below the floor is only survivable
   * as long as the stack is not in air. The line is `FAIRING_Q_LIMIT` — the
   * model's own "this is meaningful air" placard, 1.1 kPa, the pressure below
   * which a fairing may be released — and it is forty times below the softest
   * structural placard in the fleet, so a healthy flight can never reach it:
   * measured, every insertion in the fleet that works stays under 0.05 kPa, and
   * the one that does not passes 1.1 kPa 86 s before it is destroyed.
   *
   * Reaching it means the insertion has failed. The stack is shut down and the
   * mission ends saying so, which is the honest outcome — a suborbital
   * trajectory — rather than a break-up several minutes after a reported
   * insertion. Nothing is rescued by continuing: the same flight with the
   * engines left running is the one that broke up.
   */
  private abandonInsertion(q: number, vz: number): boolean {
    const s = this.state;
    if (s.payloadSeparated || !s.liftoff) return false;
    if (s.status !== 'burn' && s.status !== 'coast') return false;
    const el = s.elements;
    if (!(el.e < 1) || el.periapsisAlt >= ORBIT_INSERTION_FLOOR) return false;
    if (!(q >= FAIRING_Q_LIMIT && vz < 0)) return false;
    const st = this.vehicle.active;
    if (st) this.vehicle.cutoffStage(st, s.t);
    s.currentBurn = null;
    s.nextBurnTime = -1;
    s.thrust = 0;
    s.throttle = 0;
    for (const b of this.plan.burns) b.done = true;
    this.event('evt.insertionAbandoned', 'fail', {
      alt: Math.round(s.altitude / 1000),
      pe: Math.round(el.periapsisAlt / 1000),
      dv: Math.round(this.vehicle.deltaVRemaining()),
    });
    this.failSuborbital();
    return true;
  }

  // ------------------------------------------------------------ orbital burns
  private scheduleNextBurn(el: OrbitalElements): void {
    const s = this.state;
    const burn = this.plan.burns.find((b) => !b.done);
    if (!burn) {
      this.reachTargetOrbit(el);
      return;
    }
    // The mission may already be over. The planner's tolerance is deliberately a
    // little tighter than the acceptance band, so a residual can be inside the
    // band and still look worth a burn — and flying it costs a revolution (ten
    // and a half hours at a geostationary transfer) for an orbit that was
    // already the one that was asked for.
    if (orbitResiduals(this.plan.target, el, this.raanWasReachable()).onTarget) {
      for (const b of this.plan.burns) b.done = true;
      this.reachTargetOrbit(el);
      return;
    }
    // ensure a stage with propellant is available (stage to the next one if needed)
    let stage = this.vehicle.active;
    if (stage && (stage.burnedOut || !this.vehicle.activeHasPropellant() || (!stage.spec.restartable && stage.ignited))) {
      if (stage.index + 1 < this.vehicle.stages.length) {
        const next = this.vehicle.stages[stage.index + 1];
        if (next.spec.isSpacecraft) {
          if (!s.payloadSeparated) this.separatePayload(false);
        } else if (stage.attached) {
          this.stageTo(stage.index + 1, false);
        }
        stage = next;
      } else {
        this.event('evt.noStagesLeft', 'warn');
        this.finishBurnIncomplete();
        return;
      }
    }
    if (!stage) {
      this.finishBurnIncomplete();
      return;
    }
    let tGo: number;
    if (burn.kind === 'raiseApoapsis') {
      burn.lowering = (burn.targetApoapsis ?? 0) < el.apoapsisAlt;
      // An apoapsis change is made at the periapsis. On a circular parking
      // orbit any point will do when raising ('asap'), but a trim that has to
      // bring the apoapsis *down* must be flown at the periapsis or it digs
      // the opposite side of the orbit out instead.
      // `timeToPeriapsis` needs a line of apsides to exist. Below e ≈ 0.001 the
      // eccentricity vector is numerical noise, argp is arbitrary and the
      // function returns a time to a point that means nothing — which is how a
      // 4 m/s "periapsis trim" came to be flown at the apoapsis and ratchet the
      // periapsis DOWN one kilometre per revolution (audit items B6, B40(6)).
      const apsidesDefined = el.e > 1e-3;
      if (apsidesDefined && (el.e > 0.01 || burn.lowering)) {
        tGo = timeToPeriapsis(el);
        // Insertion happens at the periapsis, so `timeToPeriapsis` is almost a
        // whole revolution: burn now instead of wasting an orbit when the
        // periapsis has only just gone by.
        if (isFinite(el.period) && tGo > el.period - 150) tGo = 0;
      }
      else if (burn.atU === 'asap' || !apsidesDefined) tGo = 0;
      else if (burn.atU === 'node') tGo = Math.min(timeToArgumentOfLatitude(el, 0), timeToArgumentOfLatitude(el, Math.PI));
      else tGo = timeToArgumentOfLatitude(el, burn.atU);
    } else if (el.e > 1e-3) {
      tGo = timeToApoapsis(el);
    } else {
      // Circular orbit: the "apoapsis" is a meaningless point on it, so a burn
      // that shapes the orbit AND changes the plane has to be flown at a node,
      // where a plane change is cheapest and well defined.
      tGo = burn.targetInclination !== undefined
        ? Math.min(timeToArgumentOfLatitude(el, 0), timeToArgumentOfLatitude(el, Math.PI))
        : 0;
    }
    if (!isFinite(tGo)) tGo = 0;
    const at = propagateKepler(s.r, s.v, tGo);
    const vDes = desiredVelocity(at.r, at.v, burn.kind, burn.targetApoapsis, burn.targetPeriapsis, burn.targetInclination);
    const dv = norm(sub(vDes, at.v));
    const e = stage.spec.engine;
    const thrust = e.count * e.thrustVac * stage.engineFraction;
    const tBurn = thrust > 0 ? this.vehicle.burnTimeFor(dv, true) : 1e9;
    const maxDur = this.maxBurnDurationFor(burn, el);
    burn.maxDuration = maxDur;
    const tBurnThis = Math.min(tBurn, maxDur);
    const period = isFinite(el.period) ? el.period : 5400;
    let tStart = s.t + tGo - tBurnThis / 2;
    // `atU: 'asap'` means "any point on a circular parking orbit will do", and
    // for a burn that RAISES the apoapsis that is true. It is false for a
    // retrograde trim, and this override applying to one was the whole of the
    // B6 symptom that survived the last wave (audit item B6, review follow-up):
    // `planBurns` marks a circular target 'asap', `tGo` was correctly set to
    // `timeToPeriapsis`, and this line then threw it away and re-armed the burn
    // 30 s later — i.e. at the apoapsis the previous shape burn had just ended
    // at. The slew guard below then added a whole period, which preserves the
    // orbital position, so the trim ignited at the APOAPSIS every time: it dug
    // the periapsis out at ~19 km/s of apsis rate, the "never dig the periapsis
    // out" safety in `checkBurn` stopped it on its first or second step, the
    // apoapsis had not moved, and the re-planner scheduled the same burn again.
    // Measured on atlasv551/iss/50: burnStart 4793/10453/16033, two of them one
    // second long, apoapsis pinned at 480.0 km against a 420 km target for
    // 4.4 hours. (The audit's suggested cause — `desiredVelocity` clamping
    // rP = min(rP, rm) — is not it: that clamp only bites when the target
    // periapsis is ABOVE the current radius, which cannot happen at the point a
    // lowering burn is flown from. Instrumented per-step, `desiredVelocity`
    // returned the correct retrograde target throughout.)
    if (burn.kind === 'raiseApoapsis' && burn.atU === 'asap' && el.e <= 0.01 && !burn.lowering) {
      tStart = s.t + 30;
    } else if (burn.kind !== 'raiseApoapsis' && el.periapsisAlt < 120e3) {
      // suborbital: no second chance; burn now unless the apoapsis is clearly still ahead
      tStart = tGo < period / 2 ? Math.max(s.t + 1, s.t + tGo - tBurnThis / 2) : s.t + 1;
    } else if (tStart < s.t + 1) {
      if (tGo < 60) tStart = s.t + 1;
      else tStart = s.t + tGo + period - tBurnThis / 2;
    }
    // A retrograde trim has to be flown at the periapsis (anywhere else it
    // moves the periapsis instead), and the stack needs time to turn around
    // first — the attitude slew rate is a few degrees per second.
    if (burn.lowering && tStart - s.t < 120 && isFinite(period)) tStart += period;
    // Deadband (audit item B6). A burn whose velocity-to-be-gained is smaller
    // than what would move the apsis it is aiming at by a fifth of the
    // acceptance band does nothing useful: it ignites and reports
    // `evt.burnComplete` inside a single integration step, the apsis does not
    // move, and the re-planner schedules the same burn again next revolution.
    //
    // The threshold is derived, not guessed. Burning δv at radius r on an orbit
    // of semi-major axis a moves the OPPOSITE apsis by δr = 4a²vδv/μ, so the
    // impulse worth flying is δv = μ δr /(4 a² v). At a 500 km circular target
    // that makes a fifth of the 10 km band 0.55 m/s; at a geostationary
    // transfer's apogee, a fifth of the 2 km perigee band is 0.21 m/s — which is
    // exactly why a single fleet-wide "3 m/s" constant could not work for both.
    const bandM = apsisTolerance(burn.kind === 'raiseApoapsis' ? burn.targetApoapsis ?? 0 : burn.targetPeriapsis ?? 0);
    const aBurn = Math.max(1e6, isFinite(el.a) && el.a > 0 ? el.a : norm(at.r));
    const vBurn = Math.max(1, norm(at.v));
    const deadband = Math.max(0.05, Math.min(20, (MU_EARTH * 0.2 * bandM) / (4 * aBurn * aBurn * vBurn)));
    if (dv < deadband) {
      burn.done = true;
      s.currentBurn = null;
      const next = this.plan.burns.find((b) => !b.done);
      if (next) this.scheduleNextBurn(el);
      else this.reachTargetOrbit(el);
      return;
    }
    s.nextBurnTime = tStart;
    s.currentBurn = burn;
    burn.dvEstimate = dv;
    this.event('evt.burnScheduled', 'info', { kind: burn.kind, dv: Math.round(dv), tgo: Math.round(tStart - s.t), dur: Math.round(tBurnThis) });
    const stRef = stage;
    this.schedule(tStart, 'burnStart', () => {
      const st = this.vehicle.active;
      if (!st || st.index !== stRef.index) {
        // staging still pending; retry shortly
        this.schedule(this.state.t + 1, 'burnStart', () => this.startBurn(burn));
        return;
      }
      this.startBurn(burn);
    });
  }

  private startBurn(burn: BurnPlan): void {
    const s = this.state;
    const st = this.vehicle.active;
    if (!st) {
      this.finishBurnIncomplete();
      return;
    }
    if (!st.ignited || st.cutoff) {
      this.vehicle.igniteStage(st, s.t);
      this.event('evt.ignition', 'major', this.stageParams(st));
    }
    s.status = 'burn';
    s.note = 'burn';
    s.currentBurn = burn;
    s.burnStartTime = s.t;
    s.burnDvRemaining = Math.max(0.05, burn.dvEstimate);
    this.lastBurnDv = Infinity;
    this.burnIgnited = false;
    s.burnPlaneNormal = null;
    if (burn.kind === 'shapeAtApoapsis' && burn.targetInclination !== undefined) {
      const el = elementsFromState(s.r, s.v);
      if (Math.abs(burn.targetInclination - el.i) > 0.5 * DEG) {
        // Genuine plane change: keep the current line of nodes, rotate to the new inclination.
        s.burnPlaneNormal = planeNormal(burn.targetInclination, el.raan);
      } else {
        // Small correction: the plane through the apoapsis point closest to the current one.
        const tGo = Math.min(timeToApoapsis(el), (isFinite(el.period) ? el.period : 5400) / 2);
        const at = propagateKepler(s.r, s.v, tGo);
        const curNormal = normalize(cross(at.r, at.v));
        s.burnPlaneNormal = planeNormalThrough(normalize(at.r), burn.targetInclination, curNormal);
      }
    }
    this.event('evt.burnStart', 'major', { kind: burn.kind, ...this.stageParams(st) });
  }

  private checkCoast(_el: OrbitalElements): void {
    // nothing: pending action starts the burn
  }

  private checkBurn(el: OrbitalElements): void {
    const s = this.state;
    const b = s.currentBurn;
    if (!b) return;
    let complete = false;
    if (b.kind === 'raiseApoapsis') {
      const target = b.targetApoapsis ?? 0;
      const tolA = Math.max(2e3, target * 0.002);
      if (el.e >= 1) complete = true; // escaped: stop before it gets worse
      // Completion is judged on the apoapsis itself. The velocity-to-be-gained
      // figure is only meaningful exactly at the periapsis, so it must not be
      // allowed to end the burn.
      else if (b.lowering ? el.apoapsisAlt <= target + tolA : el.apoapsisAlt >= target - tolA) complete = true;
      // Safety: a retrograde apoapsis trim must never dig the periapsis out of
      // the orbit — and never below the insertion floor whatever the target is.
      // The floor half is the same rule as `abandonInsertion`, stated where the
      // burn is commanded rather than where its consequences arrive; for every
      // target in the fleet the 20 km band below the target perigee is already
      // the binding one, so it is explicitness rather than a change.
      else if (b.lowering && el.periapsisAlt < Math.max(ORBIT_INSERTION_FLOOR, this.plan.target.perigee - 20e3)) complete = true;
      else if (s.t - s.burnStartTime > (b.maxDuration ?? this.maxBurnDurationFor(b, el)) && el.e < 1 && el.periapsisAlt > 120e3) {
        // low-thrust stage: split the apogee-raising into several perigee burns
        const st = this.vehicle.active;
        if (st) this.vehicle.cutoffStage(st, s.t);
        this.event('evt.burnPaused', 'info', { ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000) });
        s.currentBurn = null;
        s.status = 'coast';
        s.note = 'coast';
        // Re-plan from the orbit the paused burn actually left behind, exactly
        // as a completed burn does. Both pause branches used to go straight to
        // `scheduleNextBurn`, so a multi-pass Briz-M or Fregat kept flying the
        // burn list it had before the pass (audit item B6).
        this.replanRemainingBurns(el);
        if (!this.plan.burns.some((x) => !x.done)) {
          this.reachTargetOrbit(el);
          return;
        }
        this.scheduleNextBurn(el);
        return;
      }
    } else {
      const dv = s.burnDvRemaining;
      // The cut-off floor has to be below the smallest burn the planner will
      // schedule, or a sub-metre-per-second apsis trim completes on its first
      // step having done nothing. `scheduleNextBurn`'s deadband is as low as
      // 0.05 m/s at a geostationary apogee, so this is too.
      if (dv < 0.05) complete = true;
      else if (dv < 40 && dv > this.lastBurnDv * 1.02 + 0.002) complete = true; // passed the minimum
      else if (dv > 40 && s.t - s.burnStartTime > (b.maxDuration ?? this.maxBurnDurationFor(b, el)) && el.e < 1 && el.periapsisAlt > 120e3) {
        // long low-thrust apogee burn: continue at the next apoapsis
        const st = this.vehicle.active;
        if (st) this.vehicle.cutoffStage(st, s.t);
        this.event('evt.burnPaused', 'info', { ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000) });
        s.currentBurn = null;
        s.status = 'coast';
        s.note = 'coast';
        // Re-plan from the orbit the paused burn actually left behind, exactly
        // as a completed burn does. Both pause branches used to go straight to
        // `scheduleNextBurn`, so a multi-pass Briz-M or Fregat kept flying the
        // burn list it had before the pass (audit item B6).
        this.replanRemainingBurns(el);
        if (!this.plan.burns.some((x) => !x.done)) {
          this.reachTargetOrbit(el);
          return;
        }
        this.scheduleNextBurn(el);
        return;
      }
      this.lastBurnDv = dv;
    }
    if (complete) {
      // A burn that ignited and finished inside two seconds cannot have moved
      // the apsis it was aimed at; `replanRemainingBurns` treats that as a
      // whole stall allowance rather than half of one.
      const noOpBurn = s.t - s.burnStartTime < 2;
      const st = this.vehicle.active;
      if (st) this.vehicle.cutoffStage(st, s.t);
      b.done = true;
      s.currentBurn = null;
      this.event('evt.burnComplete', 'success', {
        kind: b.kind, ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000), inc: +(el.i * RAD).toFixed(2),
      });
      if (b.kind === 'circularize' && !this.events.some((e) => e.key === 'evt.parkingOrbit')) {
        // Nothing under the insertion floor is a parking orbit. A circularise
        // burn flown from a trajectory that is still sinking ends when the
        // vehicle matches circular speed at whatever radius it has reached by
        // then, and that radius follows the vehicle down: Proton-M/Briz-M with
        // 5.75 t reported "parking orbit 94 × 94 km" and then flew a 43-minute
        // transfer with a 94 km perigee. The burn is complete either way and
        // the re-planner carries on from the orbit achieved, but calling that
        // an insertion is how a failed one came to look like a good one.
        if (el.periapsisAlt >= ORBIT_INSERTION_FLOOR) {
          this.event('evt.parkingOrbit', 'success', {
            ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000), inc: +(el.i * RAD).toFixed(2),
            dv: Math.round(this.vehicle.deltaVRemaining()),
          });
        } else {
          this.event('evt.lowPerigee', 'warn', { pe: Math.round(el.periapsisAlt / 1000) });
        }
      }
      this.replanRemainingBurns(el, noOpBurn);
      if (this.plan.burns.some((x) => !x.done)) {
        s.status = 'coast';
        s.note = 'coast';
        this.scheduleNextBurn(el);
      } else {
        this.reachTargetOrbit(el);
      }
    }
  }

  /**
   * Re-plan the burns that are still outstanding from the orbit that was
   * actually achieved. Without this the sequence computed before liftoff is
   * flown even when the ascent inserted 300 km high or 100 m/s short, and the
   * mission ends "off target" although the propellant to fix it was there.
   */
  private replanRemainingBurns(el: OrbitalElements, noOpBurn = false): void {
    if (!(el.e < 1) || !isFinite(el.apoapsisAlt) || el.periapsisAlt < 100e3) return;
    // Stop on the RESIDUAL, not on a counter (audit items B5/B6). The hard
    // `replans >= MAX_REPLANS` freeze left the outstanding burns in the plan and
    // returned, so the caller scheduled the same burn that had just failed to
    // converge, again, forever: `vulcan/leo` at 50 % payload sat in `coast`
    // indefinitely at 596 × 499 km. The counter is still a backstop, but when it
    // runs out — or when a whole replan cycle stopped making progress — the
    // outstanding burns are dropped so the mission ends and `reachTargetOrbit`
    // reports what it actually achieved.
    //
    // A NO-OP burn spends the whole allowance at once (review follow-up). The
    // stop was asked to trip after a single non-improving cycle so a stuck
    // mission ends in minutes rather than the measured 3.9–4.4 hours of hung
    // coast; flying that as a flat `stalledReplans >= 1` costs a real mission —
    // `tests/ascent.test.ts`'s equatorial GTO needs one cycle that does not
    // improve the summed residual and then converges, and with the flat rule it
    // ends at 28 754 × 35 667 km instead of on target (measured).
    //
    // So the discriminator is what the burn DID, not how many cycles have run.
    // A burn that ignited and reported complete inside two seconds moved
    // nothing — that is the exact B6 signature — and one of those is enough.
    // A burn that ran for a meaningful time and still did not help keeps the
    // two-cycle allowance it had.
    const residual = Math.abs(el.apoapsisAlt - this.plan.target.apogee)
      + Math.abs(el.periapsisAlt - this.plan.target.perigee)
      + Math.abs(el.i - this.plan.target.inclination) * 1e6;
    if (residual > this.lastResidual - 1e3) this.stalledReplans += noOpBurn ? 2 : 1;
    else this.stalledReplans = 0;
    this.lastResidual = Math.min(this.lastResidual, residual);
    if (this.replans >= MAX_REPLANS || this.stalledReplans >= 2) {
      for (const b of this.plan.burns) b.done = true;
      return;
    }
    this.replans++;
    // The 2 m/s floor this filter used to carry threw away real corrections: at
    // a geostationary transfer's apogee, 1.1 m/s is 11 km of perigee — the whole
    // acceptance band — so every GTO mission kept whatever perigee the ascent
    // happened to give it (audit item B5). Whether a burn is worth flying is
    // decided in `scheduleNextBurn` against the apsis it would move, not here.
    const fresh = replanBurns(this.plan.target, el)
      .filter((b) => b.dvEstimate > 0.05)
      .map((b) => (b.kind === 'raiseApoapsis' ? { ...b, lowering: (b.targetApoapsis ?? 0) < el.apoapsisAlt } : b));
    this.plan.burns = [...this.plan.burns.filter((b) => b.done), ...fresh];
  }

  private finishBurnIncomplete(): void {
    const s = this.state;
    const el = elementsFromState(s.r, s.v);
    if (s.currentBurn) s.currentBurn.done = true;
    s.currentBurn = null;
    if (el.e < 1 && el.periapsisAlt > 120e3) {
      this.event('evt.insufficientDv', 'warn', { ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000), inc: +(el.i * RAD).toFixed(2) });
      this.reachTargetOrbit(el, false);
    } else {
      this.event('evt.outOfPropellant', 'fail', { ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000) });
      this.failSuborbital();
    }
  }

  /**
   * End of mission. `onTarget` is now only a *veto*: a caller that already knows
   * the mission fell short (a burn that could not be completed) passes false,
   * and everything else is decided by comparing the orbit with the target
   * (audit item B5). Before this, `evt.targetOrbit` was emitted unconditionally
   * from four call sites and the HUD said "target orbit achieved" on orbits that
   * were not — a 95 km high perigee at GTO, a quarter of a degree of plane error
   * on a geostationary mission, or simply whatever the plan happened to contain
   * when the re-planner ran out of budget.
   */
  private reachTargetOrbit(el: OrbitalElements, onTarget = true): void {
    const s = this.state;
    const res = orbitResiduals(this.plan.target, el, true);
    const hit = onTarget && res.onTarget;
    s.status = 'orbit';
    s.note = hit ? 'orbit' : 'orbitOffTarget';
    s.currentBurn = null;
    s.nextBurnTime = -1;
    this.event(hit ? 'evt.targetOrbit' : 'evt.offTargetOrbit', hit ? 'success' : 'warn', {
      ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000), inc: +(el.i * RAD).toFixed(2),
      raan: +(el.raan * RAD).toFixed(1), period: Math.round(el.period / 60),
      dv: Math.round(this.vehicle.deltaVRemaining()),
      // `res.misses` is deliberately NOT put on the event. It used to be
      // joined into an English `miss` clause here — built inside
      // `orbitResiduals`, in physics — and no dictionary in en/ru/th declared
      // the placeholder, so it was dead payload that would have rendered as an
      // English fragment inside a Russian or Thai sentence the day one did
      // (review follow-up). Everything a presentation layer needs to say which
      // parameter missed is already here as numbers: `ap` / `pe` / `inc` /
      // `raan` against `sim.plan.target`, or `orbitResiduals` itself, which now
      // returns `OrbitMiss[]`.
    });
    const st = this.vehicle.active;
    if (st) this.vehicle.cutoffStage(st, s.t);
    if (!s.payloadSeparated) this.schedule(s.t + 15, 'payloadSep', () => this.separatePayload(false));
  }

  /**
   * Separate the spacecraft from the last launcher stage. The spent stage becomes
   * debris drifting behind; the spacecraft (with its own propulsion stage, if any)
   * is what the simulation continues to track.
   */
  private separatePayload(igniteSpacecraft: boolean): void {
    const s = this.state;
    if (s.payloadSeparated) return;
    const st = this.vehicle.active;
    if (st && st.attached && !st.spec.isSpacecraft) {
      const vDir = norm(s.v) > 1 ? normalize(s.v) : s.dir;
      // The spent stage is only orbital debris if the orbit it is left in is one:
      // hard-coding `outcome: 'orbit'` propagated it on a Kepler arc straight
      // through the planet whenever the payload was released off a marginal
      // ascent (audit item B28).
      const elNow = elementsFromState(s.r, s.v);
      const orbital = elNow.e < 1 && elNow.periapsisAlt > 120e3;
      this.debris.push({
        id: ++debrisCounter, name: st.spec.name, r: clone(s.r), v: addScaled(s.v, vDir, -0.5), dir: clone(s.dir),
        mass: st.spec.dryMass + st.propellant, area: Math.PI * (st.spec.diameter / 2) ** 2, cd: 2.2,
        visual: { diameter: st.spec.diameter, length: st.spec.length, color: st.spec.color ?? '#ccc', kind: 'upperStage' },
        alive: true, createdAt: s.t, outcome: orbital ? 'orbit' : undefined,
      });
      this.vehicle.separateStage(st, s.t);
    }
    s.payloadSeparated = true;
    s.mass = this.vehicle.totalMass();
    // `satId` is what the presentation layer resolves the localized spacecraft
    // name from (`localizeEventParams` in src/ui/names.ts). `name` stays on the
    // event as the English literal from src/data: physics is not allowed to
    // know about dictionaries, the CSV export is a data file, and a renderer
    // that has no dictionary entry for this spacecraft falls back to it.
    this.event('evt.payloadSep', 'success', { name: this.satellite.name, satId: this.satellite.id });
    if (igniteSpacecraft) {
      const sc = this.vehicle.active;
      if (sc && sc.spec.isSpacecraft) {
        this.schedule(s.t + (sc.spec.ignitionDelay ?? 5), 'ignition', () => {
          this.vehicle.igniteStage(sc, this.state.t);
          this.event('evt.ignition', 'major', this.stageParams(sc));
        });
      }
    }
  }

  // ------------------------------------------------------------ failures
  private applyFailure(): void {
    if (this.failureApplied) return;
    this.failureApplied = true;
    const s = this.state;
    const st = this.vehicle.stages[Math.min(this.failureStage, this.vehicle.stages.length - 1)] ?? this.vehicle.active;
    const target = st && st.attached && st.index >= this.vehicle.activeIndex ? st : this.vehicle.active;
    if (!target) return;
    switch (this.failureMode) {
      case 'engineOut': {
        const n = target.spec.engine.count;
        target.engineFraction = Math.max(0, (n - 1) / n);
        this.event('evt.engineOut', 'warn', { stage: target.spec.name, n: n - 1, total: n });
        break;
      }
      case 'thrustLoss':
        target.engineFraction = 0;
        this.event('evt.thrustLoss', 'fail', { stage: target.spec.name });
        break;
      case 'prematureSep': {
        // A stage that has not lit yet cannot separate prematurely — it is
        // still bolted to the stack. Asking for one at T+60 on stage 3 used to
        // announce the failure and then do nothing at all, because the guard
        // below only fired for the active stage: the flight carried on
        // nominally after a "PREMATURE SEPARATION" callout. The break-up
        // happens where the thrust is, so the stage that is burning is the one
        // that comes apart.
        const victim = target.index === this.vehicle.activeIndex ? target : this.vehicle.active;
        if (!victim) break;
        this.event('evt.prematureSep', 'fail', { stage: victim.spec.name });
        victim.burnedOut = true;
        victim.cutoffTime = s.t;
        for (const b of victim.boosters) if (b.attached) { b.burnedOut = true; this.vehicle.jettisonBooster(b, s.t); this.spawnBoosterDebris(b); }
        this.onCoreBurnout(victim, s.r, s.v);
        break;
      }
      case 'rangeSafety':
        this.event('evt.ftsCommanded', 'fail');
        this.destroy();
        break;
      default:
        break;
    }
  }

  private destroy(): void {
    const s = this.state;
    s.destroyed = true;
    s.status = 'failed';
    s.note = 'destroyed';
    s.thrust = 0;
    s.throttle = 0;
    this.event('evt.vehicleLost', 'fail', { t: Math.round(s.t) });
  }

  // ------------------------------------------------------------ debris
  private spawnBoosterDebris(b: BoosterState): void {
    const s = this.state;
    const spec: BoosterGroupSpec = b.spec;
    const up = normalize(s.r);
    const along = normalize(s.dir);
    let side = cross(along, up);
    if (norm(side) < 1e-6) side = cross(along, v3(1, 0, 0));
    side = normalize(side);
    const side2 = normalize(cross(along, side));
    const recoverable = this.vehicleSpec.recoverable && this.vehicle.recoveryReserve > 0 && spec.engine.count > 1;
    for (let k = 0; k < spec.count; k++) {
      const ang = (2 * Math.PI * k) / spec.count;
      const lateral = add(scale(side, Math.cos(ang)), scale(side2, Math.sin(ang)));
      const d: Debris = {
        id: ++debrisCounter, name: spec.name, r: addScaled(s.r, lateral, spec.diameter + 2), v: addScaled(s.v, lateral, 3),
        dir: clone(s.dir), mass: spec.dryMass + b.propellant, area: Math.PI * (spec.diameter / 2) ** 2 * 1.5, cd: 1.2,
        visual: { diameter: spec.diameter, length: spec.length, color: spec.color ?? '#ccc', conicalTop: spec.conicalTop, kind: 'booster' },
        alive: true, createdAt: s.t,
      };
      if (recoverable) d.recovery = recoveryFor(spec.engine, spec.dryMass, Math.max(0, b.propellant));
      this.debris.push(d);
    }
  }

  private spawnStageDebris(st: StageState): void {
    const s = this.state;
    const spec: StageSpec = st.spec;
    const recoverable = st.index === 0 && this.vehicleSpec.recoverable && this.vehicle.recoveryReserve > 0;
    const d: Debris = {
      id: ++debrisCounter, name: spec.name, r: clone(s.r), v: addScaled(s.v, normalize(s.dir), -2),
      dir: clone(s.dir), mass: spec.dryMass + st.propellant, area: Math.PI * (spec.diameter / 2) ** 2 * 1.5, cd: 1.2,
      visual: { diameter: spec.diameter, length: spec.length, color: spec.color ?? '#ccc', kind: 'stage' },
      alive: true, createdAt: s.t,
    };
    if (recoverable) d.recovery = recoveryFor(spec.engine, spec.dryMass, Math.max(0, st.propellant));
    this.debris.push(d);
  }

  private spawnFairing(r: Vec3, v: Vec3): void {
    const f = this.vehicleSpec.fairing;
    if (!f) return;
    const along = normalize(this.state.dir);
    let side = cross(along, normalize(r));
    if (norm(side) < 1e-6) side = cross(along, v3(1, 0, 0));
    side = normalize(side);
    for (const sgn of [1, -1]) {
      this.debris.push({
        id: ++debrisCounter, name: 'fairing', r: addScaled(r, side, sgn * (f.diameter / 2 + 1)), v: addScaled(v, side, sgn * 2.5),
        dir: along, mass: f.mass / 2, area: (f.diameter * f.length) / 2, cd: 1.5,
        visual: { diameter: f.diameter, length: f.length, color: f.color ?? '#eee', kind: 'fairing' },
        alive: true, createdAt: this.state.t,
      });
    }
  }

  private stepDebris(dt: number): void {
    const omega = v3(0, 0, OMEGA_EARTH);
    for (const d of this.debris) {
      if (!d.alive) continue;
      const alt = norm(d.r) - R_EARTH;
      if (d.outcome === 'orbit') {
        // Orbital debris is Kepler-propagated — but the outcome has to stay
        // true. An object promoted with a 121 km perigee decays, and the branch
        // skipped every touchdown, drag and lifetime test, so it orbited through
        // the planet forever (audit item B28). Re-check the perigee each step
        // and hand it back to the drag path when it can no longer stay up.
        const next = propagateKepler(d.r, d.v, dt);
        d.r = next.r;
        d.v = next.v;
        const elD = elementsFromState(d.r, d.v);
        if (!(elD.e < 1) || elD.periapsisAlt < 120e3) d.outcome = undefined;
        continue;
      }
      // sub-step for accuracy when low and fast
      const sub_ = alt < 60e3 ? Math.max(1, Math.ceil(dt / 0.5)) : Math.max(1, Math.ceil(dt / 2));
      const h = dt / sub_;
      for (let k = 0; k < sub_ && d.alive; k++) {
        let thrustAccel = 0;
        let thrustDir = d.dir;
        const altK = norm(d.r) - R_EARTH;
        const vAir = sub(d.v, cross(omega, d.r));
        const vAirMag = norm(vAir);
        const up = normalize(d.r);
        const vDown = -dot(vAir, up);
        if (d.recovery && d.recovery.propellant > 0 && vDown > 0) {
          const rc = d.recovery;
          const atm = atmosphere(Math.max(0, altK));
          const pressure = Math.min(1, atm.p / 101325);
          let burn = false;
          // Entry burn: retrograde below 70 km until the airspeed is something
          // the structure can take (~1.4 km/s), spending everything above the
          // landing reserve. It replaces a fixed 12-15 s of burn, which was
          // sized for one booster and was either wasteful or not nearly enough
          // for anything else.
          if (rc.phase === 'coast' && altK < 70e3) rc.phase = 'entry';
          if (rc.phase === 'entry') {
            if (rc.propellant > rc.landingReserve && altK > 25e3 && vAirMag > ENTRY_BURN_TARGET_SPEED) {
              burn = true;
            } else {
              rc.phase = 'landing';
              // Re-select the engines for a thrust/weight of about three on the
              // mass that is actually left: a hoverslam is flown with as few
              // engines as will stop the stage, and three Merlins on an empty
              // booster is 6 g of deceleration nobody flies.
              setRecoveryEngines(rc, Math.ceil((3 * G0 * d.mass) / Math.max(1, rc.engine?.thrustSL ?? rc.thrustSL)));
            }
          }
          const T = rc.thrustVac - (rc.thrustVac - rc.thrustSL) * pressure;
          // Landing burn: a constant-deceleration descent profile (bang-bang
          // thrust stands in for engine throttling) that reaches ~2 m/s at
          // touchdown.
          if (rc.phase === 'landing' && altK < 20e3) {
            const hAgl = Math.max(0.5, altK - this.groundElevation(d.r));
            // Deceleration reference from the local gravity that is actually
            // acting, rather than a hardcoded 9 m/s² next to the computed value
            // (audit item B39(2)), and from the thrust that is actually
            // available: 60 % of the net acceleration the engines can produce,
            // so a booster with margin falls further before it brakes — the
            // late, hard "hoverslam" a returning stage really flies — while one
            // with little thrust starts early and never asks for more than it has.
            const rmD = norm(d.r);
            const gMag = MU_EARTH / (rmD * rmD);
            const aRef = Math.max(6, Math.min(25, 0.6 * (T / d.mass - gMag)));
            const vRef = Math.sqrt(2 * aRef * hAgl) + 2;
            if (vDown > vRef) burn = true;
            else if (vDown < vRef - 4) burn = false;
            else burn = rc.burning;
          }
          if (burn) {
            rc.burning = true;
            if (rc.phase === 'landing') rc.landingStarted = true;
            thrustAccel = T / d.mass;
            thrustDir = scale(vAir, -1 / vAirMag);
            rc.propellant -= rc.mdot * h;
            d.mass -= rc.mdot * h;
          } else if (!(rc.phase === 'landing' && rc.landingStarted)) {
            // once the hoverslam has started, the gaps in its bang-bang cycle
            // are throttling, not shutdown: the plume stays lit
            rc.burning = false;
          }
        }
        const next = rk4Step(0, { r: d.r, v: d.v }, h, this.accelerationFn(thrustAccel, thrustDir, d.mass, 0, 0, d.area, false, d.cd));
        d.r = next.r;
        d.v = next.v;
        if (vAirMag > 1 && d.recovery) d.dir = scale(vAir, -1 / vAirMag);
        const altN = norm(d.r) - R_EARTH;
        const vImpactNow = norm(sub(d.v, cross(omega, d.r)));
        const ground = this.groundElevation(d.r);
        const touchdown = altN <= ground || (altN <= ground + 3 && d.recovery !== undefined && vImpactNow < 12);
        if (touchdown) {
          d.alive = false;
          const ll = eciToLatLon(d.r, this.state.theta);
          d.impact = { lat: ll.lat * RAD, lon: ll.lon * RAD };
          const vImpact = vImpactNow;
          if (d.recovery && vImpact < 12) {
            d.outcome = 'landed';
            d.recovery.landed = true;
            this.event('evt.boosterLanded', 'success', { name: d.name, lat: +d.impact.lat.toFixed(2), lon: +d.impact.lon.toFixed(2) });
          } else {
            d.outcome = 'impact';
            if (d.visual.kind !== 'fairing') this.event('evt.stageImpact', 'info', { name: d.name, lat: +d.impact.lat.toFixed(2), lon: +d.impact.lon.toFixed(2) });
          }
        } else if (this.state.t - d.createdAt > 3 * 3600) {
          d.alive = false;
        } else if (altN > 140e3) {
          const el = elementsFromState(d.r, d.v);
          if (el.e < 1 && el.periapsisAlt > 120e3) d.outcome = 'orbit';
        }
      }
    }
  }

  // ------------------------------------------------------------ derived
  private updateDerived(): void {
    const s = this.state;
    const rm = norm(s.r);
    s.altitude = rm - R_EARTH;
    s.altitudeAGL = s.altitude - this.groundElevation(s.r);
    const omega = v3(0, 0, OMEGA_EARTH);
    const vAir = sub(s.v, cross(omega, s.r));
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
