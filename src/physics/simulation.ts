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
import type { MissionConfig, FailureMode, SatelliteSpec, VehicleSpec, BoosterGroupSpec, StageSpec } from '../types';
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
import { MissionPlan, BurnPlan, planMission } from './mission';

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
  private readonly siteR0: Vec3;
  private readonly maxQAscent: number;
  private orbitStableSince = -1;
  /** Longest single orbital burn before splitting it across perigee/apogee passes, s. */
  private maxBurnDurationFor(burn: BurnPlan, el: OrbitalElements): number {
    const period = isFinite(el.period) ? el.period : 5400;
    if (burn.kind === 'raiseApoapsis') return Math.min(900, Math.max(300, 0.1 * period));
    return Math.min(3600, Math.max(400, 0.12 * period));
  }

  constructor(cfg: MissionConfig, opts: { headless?: boolean } = {}) {
    this.cfg = cfg;
    this.headless = opts.headless ?? false;
    this.site = siteById(cfg.siteId);
    this.vehicleSpec = vehicleById(cfg.vehicleId);
    this.satellite = satelliteById(cfg.satelliteId);
    this.payloadMass = cfg.payloadMassOverride ?? this.satellite.mass;
    this.plan = planMission(cfg, this.site, this.vehicleSpec);
    this.vehicle = new VehicleModel(this.vehicleSpec, this.payloadMass, cfg.boosterRecovery, this.satellite);
    this.guidance = new AscentGuidance(cfg.guidance, this.plan.azimuthRotating, this.plan.ascentInclination, this.plan.insertionAltitude, this.plan.insertionApoapsis);
    this.maxQAscent = this.vehicleSpec.maxQ;

    this.failureMode = cfg.failure.mode;
    this.failureTime = cfg.failure.time;
    this.failureStage = cfg.failure.stage;
    if (this.failureMode === 'random') {
      const modes: FailureMode[] = ['engineOut', 'thrustLoss', 'prematureSep', 'fairingStuck'];
      this.failureMode = modes[Math.floor(Math.random() * modes.length)];
      this.failureTime = 10 + Math.random() * 140;
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
      case 'ascent': dt = s.altitude < 100e3 ? 0.1 : 0.25; break;
      case 'burn': {
        const aT = s.mass > 0 ? s.thrust / s.mass : 1;
        dt = aT > 0 ? Math.max(0.02, Math.min(0.5, s.burnDvRemaining / (6 * aT))) : 0.5;
        break;
      }
      case 'coast': dt = s.altitude > 140e3 ? 10 : 0.5; break;
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
    const el = elementsFromState(s.r, s.v);
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
        // apogee raising: thrust prograde (velocity-to-be-gained would fight the radial
        // velocity away from perigee and waste propellant raising the perigee instead)
        dirCmd = norm(s.v) > 1 ? normalize(s.v) : s.dir;
        s.burnDvRemaining = Math.max(0, norm(vDes) - norm(s.v));
      } else {
        dirCmd = dvMag > 0.01 ? scale(dvVec, 1 / dvMag) : s.dir;
      }
      throttleCmd = 1;
      if (fullThrust.thrustFullVac / mass > maxAccel && maxAccel > 0) throttleCmd = maxAccel / (fullThrust.thrustFullVac / mass);
      s.ascentPhase = null;
      s.pitchCmd = Math.asin(Math.max(-1, Math.min(1, dot(dirCmd, up)))) * RAD;
    } else {
      // coast: hold prograde attitude
      dirCmd = norm(s.v) > 1 ? normalize(s.v) : s.dir;
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

    // --- max-Q event (detect peak)
    if (s.status === 'ascent' && s.maxQ.value > 0 && q < s.maxQ.value * 0.97 && !this.events.some((e) => e.key === 'evt.maxQ') && s.t > 5) {
      this.event('evt.maxQ', 'info', { q: Math.round(s.maxQ.value / 100) / 10, alt: Math.round(s.maxQ.alt / 100) / 10 });
      if (s.maxQ.value > this.maxQAscent * 1.15) {
        this.event('evt.structuralFailure', 'fail', { q: Math.round(s.maxQ.value / 1000) });
        this.destroy();
        return;
      }
    }
    // --- fairing
    if (this.vehicle.fairingAttached && this.vehicleSpec.fairing && !this.fairingStuck && alt > this.vehicleSpec.fairing.sepAltitude && s.liftoff) {
      this.vehicle.jettisonFairing();
      this.event('evt.fairingSep', 'major', { alt: Math.round(alt / 1000) });
      this.spawnFairing(s.r, s.v);
    } else if (this.fairingStuck && this.vehicleSpec.fairing && alt > this.vehicleSpec.fairing.sepAltitude && !this.events.some((e) => e.key === 'evt.fairingStuck')) {
      this.event('evt.fairingStuck', 'warn');
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
    void el;
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

  // ------------------------------------------------------------ ascent
  private checkAscent(el: OrbitalElements, alt: number, vz: number): void {
    const s = this.state;
    const hIns = this.plan.insertionAltitude;
    const haIns = this.plan.insertionApoapsis;
    const tol = 3e3;
    if (el.e < 1 && el.periapsisAlt >= hIns - tol && el.apoapsisAlt >= haIns - tol) {
      const act = this.vehicle.active;
      if (act) this.vehicle.cutoffStage(act, s.t);
      this.event('evt.seco', 'major', { stage: act?.spec.name ?? '' });
      this.finishAscent(el);
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
      if (el.e > 0.01) tGo = timeToPeriapsis(el); // already elliptical: burn at the existing perigee
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
      if (el.e < 1 && el.apoapsisAlt >= target - Math.max(2e3, target * 0.002)) complete = true;
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
      if (this.plan.burns.some((x) => !x.done)) {
        s.status = 'coast';
        s.note = 'coast';
        this.scheduleNextBurn(el);
      } else {
        this.reachTargetOrbit(el);
      }
    }
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
    this.orbitStableSince = s.t;
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
          const gMag = MU_EARTH / (norm(d.r) ** 2);
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
            void gMag;
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
    void this.orbitStableSince;
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
