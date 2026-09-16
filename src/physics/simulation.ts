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
import type { MissionConfig, FailureMode, SatelliteSpec, VehicleSpec, BoosterGroupSpec, StageSpec, GuidanceParams } from '../types';
import { siteById, type SiteExtra } from '../data/sites';
import { vehicleById } from '../data/vehicles';
import { satelliteById } from '../data/satellites';
import { G0, MU_EARTH, R_EARTH, OMEGA_EARTH, DEG, RAD } from './constants';
import { Vec3, v3, add, sub, scale, dot, cross, norm, normalize, addScaled, slerpLimited, clone } from './vec3';
import { atmosphere } from './atmosphere';
import { dragCoefficient } from './aero';
import { gravity, gravityJ2 } from './gravity';
import { rk4Step } from './integrator';
import {
  OrbitalElements, elementsFromState, groundPositionEci, groundVelocityEci, eciToLatLon,
  timeToArgumentOfLatitude, timeToApoapsis, timeToPeriapsis, propagateKepler, gmst, julianDate, planeNormal,
} from './orbital';
import { VehicleModel, StageState, BoosterState } from './vehicle';
import { AscentGuidance, AscentPhase, desiredVelocity, planeNormalThrough } from './guidance';
import { MissionPlan, BurnPlan, planMission, replanBurns } from './mission';
import { DEFAULT_GUIDANCE } from './defaults';

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
  recovery?: { propellant: number; thrustVac: number; thrustSL: number; mdot: number; burning: boolean; landed: boolean; entryBurnLeft: number; phase: 'coast' | 'entry' | 'landing' };
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

/** Safety stop for the closed-loop re-planner (each cut-off may re-plan once). */
const MAX_REPLANS = 6;

/** How long before a scheduled burn the stack points at the burn attitude, s. */
const BURN_PREORIENT_TIME = 240;

/** Lowest periapsis the ascent may cut off at when the apoapsis is already on target, m. */
const ASCENT_MIN_PERIAPSIS = 140e3;

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
  readonly debris: Debris[] = [];
  readonly payloadMass: number;
  readonly headless: boolean;
  private pending: PendingAction[] = [];
  private lastSampleT = -Infinity;
  private lastBurnDv = Infinity;
  private failureApplied = false;
  private failureMode: FailureMode;
  private failureTime: number;
  private failureStage: number;
  private fairingStuck = false;
  private stagingInProgress = false;
  private circularizeInserted = false;
  private replans = 0;
  private readonly siteR0: Vec3;
  private readonly maxQAscent: number;
  /** perigee speed of the insertion orbit, m/s (fixed by the plan) */
  private readonly insertionSpeed: number;
  private maxQReported = false;
  private structuralFailed = false;
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
    this.siteR0 = groundPositionEci(lat, lon, this.site.altitude, theta0);
    const r = clone(this.siteR0);
    const v = groundVelocityEci(r);
    const t0 = -10;
    this.state = {
      t: t0, r, v, dir: normalize(r), status: 'prelaunch', ascentPhase: 'vertical', throttle: 0, thrust: 0,
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
  private event(key: string, severity: EventSeverity, params?: Record<string, string | number>): void {
    this.events.push({ t: this.state.t, key, params, severity });
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
    if (s.t >= 0) {
      const weight = s.mass * G0;
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
        this.event('evt.noLiftoff', 'fail', { twr: +(thr.thrust / Math.max(1, weight)).toFixed(2) });
      }
    }
  }

  private accelerationFn(thrustAccel: number, dir: Vec3, mass0: number, mdot: number, t0: number, area: number, useJ2: boolean) {
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
          const cd = dragCoefficient(mach);
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
        apoapsisAlt: el.e < 1 ? el.apoapsisAlt : Infinity,
        maxQThrottle: this.vehicleSpec.maxQThrottle, maxAccel,
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
      throttleCmd = 1;
      if (fullThrust.thrustFullVac / mass > maxAccel && maxAccel > 0) throttleCmd = maxAccel / (fullThrust.thrustFullVac / mass);
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
        if (nb.kind === 'raiseApoapsis') {
          if (nb.lowering) dirCmd = scale(dirCmd, -1);
        } else {
          const vDesPre = desiredVelocity(s.r, s.v, nb.kind, nb.targetApoapsis, nb.targetPeriapsis, nb.targetInclination);
          const dvPre = sub(vDesPre, s.v);
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
    const thr = throttleCmd > 0 ? this.vehicle.thrust(s.t, atm.p, throttleCmd) : { thrust: 0, mdot: 0, thrustFullVac: 0, coreThrottle: 0, burning: false };
    s.thrust = thr.thrust;
    s.throttle = thr.burning ? throttleCmd : 0;

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
    if (thr.burning && s.status === 'ascent') {
      const g = MU_EARTH / (rm * rm);
      const vMag = norm(s.v);
      s.losses.dvThrust += thrustAccel * dt;
      const sinGamma = vMag > 1 ? dot(s.v, up) / vMag : 1;
      s.losses.gravity += g * sinGamma * dt;
      const refDir = alt < 100e3 && vAirMag > 1 ? scale(vAir, 1 / vAirMag) : vMag > 1 ? scale(s.v, 1 / vMag) : s.dir;
      const cosA = Math.max(-1, Math.min(1, dot(s.dir, refDir)));
      s.losses.steering += thrustAccel * (1 - cosA) * dt;
    }
    if (q > 0 && s.status === 'ascent') {
      const cd = dragCoefficient(vAirMag / atm.a);
      s.losses.drag += (q * cd * area) / mass * dt;
    }
    // proper acceleration for g-load
    const dragAccel = (q * dragCoefficient(vAirMag / atm.a) * area) / mass;
    s.gLoad = Math.hypot(thrustAccel, dragAccel) / G0;
    if (s.status === 'ascent' && alt < 100e3 && q > s.maxQ.value) s.maxQ = { value: q, t: s.t, alt };

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
      this.event('evt.maxQ', 'info', { q: Math.round(s.maxQ.value / 100) / 10, alt: Math.round(s.maxQ.alt / 100) / 10 });
    }
    // --- structural placard. Tested on *every* ascent step against the
    // vehicle's quoted max-Q limit: a trajectory that dives back into the
    // atmosphere passes its first local q peak long before it exceeds the
    // placard, so testing only at that peak lets a vehicle fly at tens of
    // times its limit and simply hit the ground instead of breaking up.
    if (s.status === 'ascent' && s.liftoff && !this.structuralFailed && q > this.maxQAscent * 1.15) {
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
    if (s.liftoff && altNew < this.site.altitude - 1 && !this.isFailed()) {
      this.event('evt.impact', 'fail', { speed: Math.round(norm(sub(s.v, cross(omega, s.r)))) });
      this.destroy();
    }
  }

  private stepOrbit(dt: number): void {
    const s = this.state;
    const area = this.orbitArea();
    const mass = Math.max(1, this.vehicle.totalMass());
    s.mass = mass;
    const next = rk4Step(s.t, { r: s.r, v: s.v }, dt, this.accelerationFn(0, s.dir, mass, 0, s.t, area, true));
    s.r = next.r;
    s.v = next.v;
    s.t += dt;
    s.thrust = 0;
    s.throttle = 0;
    s.gLoad = 0;
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

  private onCoreBurnout(st: StageState, rNext: Vec3, vNext: Vec3): void {
    const s = this.state;
    const isLast = st.index >= this.vehicle.lastLauncherIndex;
    if (st.spec.isSpacecraft) this.event('evt.spacecraftPropellantOut', 'warn', { stage: st.spec.name });
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
    const heatFlux = 0.5 * rho * airspeed * airspeed * airspeed;
    if (heatFlux < FAIRING_HEAT_FLUX_LIMIT && q < FAIRING_Q_LIMIT) return true;
    // Backstop for a trajectory that never satisfies the placard (a slow,
    // heavily lofted climb): drop it well above the vehicle's quoted altitude.
    return alt >= f.sepAltitude + 40e3;
  }

  /**
   * Whether the vehicle could still light an engine after shutting the current
   * one down: the active stage restarts, or a later stage (launcher or
   * spacecraft) still has propellant. Cutting off a stage that cannot be
   * relit — Soyuz-2.1a's Blok I, a solid upper stage — ends the mission, so
   * guards that trade a cut-off for a coast must not fire for those vehicles.
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

  // ------------------------------------------------------------ ascent
  private checkAscent(el: OrbitalElements, alt: number, vz: number): void {
    const s = this.state;
    const hIns = this.plan.insertionAltitude;
    const haIns = this.plan.insertionApoapsis;
    const tol = 3e3;
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
      if (act) this.vehicle.cutoffStage(act, s.t);
      this.event('evt.seco', 'major', { stage: act?.spec.name ?? '' });
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
      if (act) this.vehicle.cutoffStage(act, s.t);
      this.circularizeInserted = true;
      this.plan.burns.unshift({
        id: 'circ', kind: 'circularize', atU: 0,
        targetPeriapsis: Math.min(el.apoapsisAlt, Math.max(hIns, haIns)), dvEstimate: 0, done: false,
      });
      this.event('evt.seco', 'major', { stage: act?.spec.name ?? '' });
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

  // ------------------------------------------------------------ orbital burns
  private scheduleNextBurn(el: OrbitalElements): void {
    const s = this.state;
    const burn = this.plan.burns.find((b) => !b.done);
    if (!burn) {
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
      if (el.e > 0.01 || burn.lowering) {
        tGo = timeToPeriapsis(el);
        // Insertion happens at the periapsis, so `timeToPeriapsis` is almost a
        // whole revolution: burn now instead of wasting an orbit when the
        // periapsis has only just gone by.
        if (isFinite(el.period) && tGo > el.period - 150) tGo = 0;
      }
      else if (burn.atU === 'asap') tGo = 0;
      else if (burn.atU === 'node') tGo = Math.min(timeToArgumentOfLatitude(el, 0), timeToArgumentOfLatitude(el, Math.PI));
      else tGo = timeToArgumentOfLatitude(el, burn.atU);
    } else {
      tGo = timeToApoapsis(el);
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
    if (burn.kind === 'raiseApoapsis' && burn.atU === 'asap' && el.e <= 0.01) {
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
    // A burn whose velocity-to-be-gained at the burn point is negligible does
    // nothing; flying it would only re-plan the same burn again next time.
    if (dv < 3) {
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
      this.event('evt.ignition', 'major', { stage: st.spec.name });
    }
    s.status = 'burn';
    s.note = 'burn';
    s.currentBurn = burn;
    s.burnStartTime = s.t;
    s.burnDvRemaining = Math.max(0.5, burn.dvEstimate);
    this.lastBurnDv = Infinity;
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
    this.event('evt.burnStart', 'major', { kind: burn.kind, stage: st.spec.name });
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
      // safety: a retrograde apoapsis trim must never dig the periapsis out of the orbit
      else if (b.lowering && el.periapsisAlt < this.plan.target.perigee - 20e3) complete = true;
      else if (s.t - s.burnStartTime > (b.maxDuration ?? this.maxBurnDurationFor(b, el)) && el.e < 1 && el.periapsisAlt > 120e3) {
        // low-thrust stage: split the apogee-raising into several perigee burns
        const st = this.vehicle.active;
        if (st) this.vehicle.cutoffStage(st, s.t);
        this.event('evt.burnPaused', 'info', { ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000) });
        s.currentBurn = null;
        s.status = 'coast';
        s.note = 'coast';
        this.scheduleNextBurn(el);
        return;
      }
    } else {
      const dv = s.burnDvRemaining;
      if (dv < 0.5) complete = true;
      else if (dv < 40 && dv > this.lastBurnDv + 0.02) complete = true; // passed the minimum
      else if (dv > 40 && s.t - s.burnStartTime > (b.maxDuration ?? this.maxBurnDurationFor(b, el)) && el.e < 1 && el.periapsisAlt > 120e3) {
        // long low-thrust apogee burn: continue at the next apoapsis
        const st = this.vehicle.active;
        if (st) this.vehicle.cutoffStage(st, s.t);
        this.event('evt.burnPaused', 'info', { ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000) });
        s.currentBurn = null;
        s.status = 'coast';
        s.note = 'coast';
        this.scheduleNextBurn(el);
        return;
      }
      this.lastBurnDv = dv;
    }
    if (complete) {
      const st = this.vehicle.active;
      if (st) this.vehicle.cutoffStage(st, s.t);
      b.done = true;
      s.currentBurn = null;
      this.event('evt.burnComplete', 'success', {
        kind: b.kind, ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000), inc: +(el.i * RAD).toFixed(2),
      });
      if (b.kind === 'circularize' && !this.events.some((e) => e.key === 'evt.parkingOrbit')) {
        this.event('evt.parkingOrbit', 'success', {
          ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000), inc: +(el.i * RAD).toFixed(2),
          dv: Math.round(this.vehicle.deltaVRemaining()),
        });
      }
      this.replanRemainingBurns(el);
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
  private replanRemainingBurns(el: OrbitalElements): void {
    if (this.replans >= MAX_REPLANS) return;
    if (!(el.e < 1) || !isFinite(el.apoapsisAlt) || el.periapsisAlt < 100e3) return;
    this.replans++;
    const fresh = replanBurns(this.plan.target, el)
      .filter((b) => b.dvEstimate > 2)
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

  private reachTargetOrbit(el: OrbitalElements, onTarget = true): void {
    const s = this.state;
    s.status = 'orbit';
    s.note = onTarget ? 'orbit' : 'orbitOffTarget';
    s.currentBurn = null;
    s.nextBurnTime = -1;
    this.event(onTarget ? 'evt.targetOrbit' : 'evt.offTargetOrbit', onTarget ? 'success' : 'warn', {
      ap: Math.round(el.apoapsisAlt / 1000), pe: Math.round(el.periapsisAlt / 1000), inc: +(el.i * RAD).toFixed(2),
      raan: +(el.raan * RAD).toFixed(1), period: Math.round(el.period / 60),
      dv: Math.round(this.vehicle.deltaVRemaining()),
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
      this.debris.push({
        id: ++debrisCounter, name: st.spec.name, r: clone(s.r), v: addScaled(s.v, vDir, -0.5), dir: clone(s.dir),
        mass: st.spec.dryMass + st.propellant, area: Math.PI * (st.spec.diameter / 2) ** 2, cd: 2.2,
        visual: { diameter: st.spec.diameter, length: st.spec.length, color: st.spec.color ?? '#ccc', kind: 'upperStage' },
        alive: true, createdAt: s.t, outcome: 'orbit',
      });
      this.vehicle.separateStage(st, s.t);
    }
    s.payloadSeparated = true;
    s.mass = this.vehicle.totalMass();
    this.event('evt.payloadSep', 'success', { name: this.satellite.name });
    if (igniteSpacecraft) {
      const sc = this.vehicle.active;
      if (sc && sc.spec.isSpacecraft) {
        this.schedule(s.t + (sc.spec.ignitionDelay ?? 5), 'ignition', () => {
          this.vehicle.igniteStage(sc, this.state.t);
          this.event('evt.ignition', 'major', { stage: sc.spec.name });
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
        this.event('evt.prematureSep', 'fail', { stage: target.spec.name });
        if (target.index === this.vehicle.activeIndex) {
          target.burnedOut = true;
          target.cutoffTime = s.t;
          for (const b of target.boosters) if (b.attached) { b.burnedOut = true; this.vehicle.jettisonBooster(b, s.t); this.spawnBoosterDebris(b); }
          this.onCoreBurnout(target, s.r, s.v);
        }
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
      if (recoverable) {
        const e = spec.engine;
        d.recovery = {
          propellant: Math.max(0, b.propellant), thrustVac: 3 * e.thrustVac, thrustSL: 3 * e.thrustSL,
          mdot: (3 * e.thrustVac) / (G0 * e.ispVac), burning: false, landed: false, entryBurnLeft: 12, phase: 'coast',
        };
      }
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
    if (recoverable) {
      const e = spec.engine;
      const n = Math.min(3, e.count);
      d.recovery = {
        propellant: st.propellant, thrustVac: n * e.thrustVac, thrustSL: n * e.thrustSL,
        mdot: (n * e.thrustVac) / (G0 * e.ispVac), burning: false, landed: false, entryBurnLeft: 15, phase: 'coast',
      };
    }
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
        const next = propagateKepler(d.r, d.v, dt);
        d.r = next.r;
        d.v = next.v;
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
          const T = rc.thrustVac - (rc.thrustVac - rc.thrustSL) * Math.min(1, atm.p / 101325);
          let burn = false;
          // Entry burn: a short retrograde burn near 70 km to cut the re-entry speed.
          if (rc.phase === 'coast' && altK < 70e3) rc.phase = 'entry';
          if (rc.phase === 'entry') {
            if (rc.entryBurnLeft > 0 && altK > 30e3) {
              burn = true;
              rc.entryBurnLeft -= h;
            } else {
              rc.phase = 'landing';
            }
          }
          // Landing burn: follow a constant-deceleration descent profile (bang-bang thrust
          // stands in for engine throttling) so that the vertical speed reaches ~2 m/s at
          // touchdown.
          if (rc.phase === 'landing' && altK < 15e3) {
            const hAgl = Math.max(0.5, altK - this.site.altitude);
            const vRef = Math.sqrt(2 * 9 * hAgl) + 2;
            if (vDown > vRef) burn = true;
            else if (vDown < vRef - 4) burn = false;
            else burn = rc.burning;
          }
          if (burn) {
            rc.burning = true;
            thrustAccel = T / d.mass;
            thrustDir = scale(vAir, -1 / vAirMag);
            rc.propellant -= rc.mdot * h;
            d.mass -= rc.mdot * h;
          } else if (rc.phase !== 'landing') {
            rc.burning = false;
          }
        }
        const next = rk4Step(0, { r: d.r, v: d.v }, h, this.accelerationFn(thrustAccel, thrustDir, d.mass, 0, 0, d.area, false));
        d.r = next.r;
        d.v = next.v;
        if (vAirMag > 1 && d.recovery) d.dir = scale(vAir, -1 / vAirMag);
        const altN = norm(d.r) - R_EARTH;
        const vImpactNow = norm(sub(d.v, cross(omega, d.r)));
        const touchdown = altN <= 0 || (altN <= this.site.altitude + 3 && d.recovery !== undefined && vImpactNow < 12);
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
    s.altitudeAGL = s.altitude - this.site.altitude;
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
    const interval = s.status === 'ascent' || s.status === 'burn' ? 0.5 : s.status === 'prelaunch' ? 1 : 10;
    if (s.t - this.lastSampleT < interval - 1e-6) return;
    this.lastSampleT = s.t;
    const act = this.vehicle.active;
    this.telemetry.push({
      t: s.t, alt: s.altitude, vInertial: s.speed, vAir: s.airspeed, q: s.q, mach: s.mach, gLoad: s.gLoad,
      mass: s.mass, thrust: s.thrust, throttle: s.throttle, pitch: s.pitchCmd,
      ap: isFinite(s.elements.apoapsisAlt) ? s.elements.apoapsisAlt : -1, pe: s.elements.periapsisAlt, inc: s.elements.i * RAD,
      dvRemaining: this.vehicle.deltaVRemaining(), downrange: s.downrange, lat: s.lat, lon: s.lon,
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
