/**
 * The Soyuz launch escape system (САС, roadmap G06) as rigid bodies: the head
 * section pulled off the rocket by the escape tower or by the fairing's own
 * motors, the whole spacecraft separated from the rocket after the fairing is
 * gone, and the descent module that comes out of either and lands on its
 * parachutes and soft-landing motors.
 *
 * Three ways out, by the time of the abort (docs/PHYSICS.md §8.3):
 *
 * - `tower`, on the pad and up to the tower's jettison at T+114.5 s: the head
 *   section (tower, upper fairing, orbital and descent modules) leaves the
 *   service module behind on the tower's main motor, pushed sideways by its
 *   control motor; the fairing's grid fins open; the descent module drops out
 *   of the fairing near the top of the climb.
 * - `fairing`, from the tower's jettison to the fairing's (T+157 s): the four
 *   solid motors on the fairing (РДГ 860М) do the tower's work, as on Soyuz
 *   MS-10.
 * - `separation`, after the fairing is gone: the spacecraft is released from
 *   the rocket, its modules part, and the descent module flies a ballistic
 *   entry, as on Soyuz 18a.
 *
 * Each configuration is one rigid body integrated by the same RK4 as the
 * rocket (`integrateRigidStep`), with J2 gravity, the motors as forces at
 * their stations, a low-order aerodynamic model and, for the descent module,
 * its parachutes pulling at their riser point. The descent module is flown in
 * its own axes: +x out of its heat shield, so heat shield first is nose first.
 *
 * Masses and the tower's thrust are sourced (research notes in PHYSICS.md
 * §8.3); the control motor, the fairing motors, the grid fins' effect and the
 * aerodynamic coefficients are estimates, chosen where the sources give none.
 */
import { atmosphere } from '../atmosphere';
import { G0, OMEGA_EARTH, R_EARTH } from '../constants';
import { gravityJ2 } from '../gravity';
import { add, addScaled, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import { integrateRigidStep, type RigidLoads, type RigidState } from './integrator';
import { quatFromAxisAngle, quatInverseRotate, quatMultiply, quatRotate, type Mat3 } from './math';
import type { RigidTelemetry } from './telemetry';

export type EscapeMode = 'tower' | 'fairing' | 'separation';
/**
 * The escape's progress: motors burning; coasting before the descent module
 * is free; the descent module falling; on its drogue; on its main parachute;
 * down.
 */
export type EscapePhase = 'escape' | 'coast' | 'fall' | 'drogue' | 'main' | 'landed';
/** Which body is flying: the head section, the whole spacecraft, or the descent module alone. */
export type EscapeBody = 'head' | 'spacecraft' | 'capsule';

/** The data the escape is flown on. Estimates are marked; the rest is sourced (PHYSICS.md §8.3). */
export const ESCAPE = {
  /** nominal tower jettison, s after liftoff (MKB Iskra: T+114 s; Soyuz MS flights T+114–115 s) */
  towerJettison: 114.5,
  /** head section with the tower, kg: 7 635 kg (Braeunig) */
  tower: { mass: 1740, propellant: 800,
    /** net axial thrust, N. 76 tf is quoted, but the crews of T-10-1 felt 14–17 g, which needs about 1 MN on this mass (estimate) */
    thrust: 1.05e6, rise: 0.08, burn: 1.55, tailOff: 0.4,
    /** station of the main motor's nozzles and of the control motor above the head section's base, m */
    nozzleX: 9.0, controlX: 12.6,
    /** control motor: a sideways push at the tower's top that turns the head section away from the pad (estimate) */
    controlThrust: 4e3, controlBurn: 1.6,
    length: 6.5 },
  /** the upper fairing with its grid fins and its four РДГ 860М motors (mass, thrust and burn are estimates) */
  fairing: { mass: 1645, propellant: 300, thrust: 280e3, rise: 0.1, burn: 2.6, tailOff: 0.3, nozzleX: 5.2,
    /** the head section's length from the service module's interface to the fairing's nose, m */
    length: 7.4,
    /** the crewed fairing's diameter (Soyuz-FG: 2.72 m) */
    diameter: 2.72,
    /** seconds after the abort before the grid fins open (T-10-1: at about 650 m, estimate) */
    finsOpen: 2.5 },
  orbitalModule: { mass: 1300, x0: 2.25, length: 2.6 },
  descentModule: { mass: 2950, x0: 0, length: 2.24, diameter: 2.17,
    /** heat shield dropped under the main parachute (estimate) */
    heatShield: 90 },
  serviceModule: { mass: 2900, length: 2.7 },
  /** separation of the spacecraft from the rocket after the fairing is gone: springs, m/s (estimate) */
  separationSpeed: 1.0,
  /** the descent module dropping out of the bottom of the fairing, m/s (estimate) */
  capsuleDrop: 2.0,
  /** seconds after the abort before the descent module is free, by mode (estimates); `tower` also frees it at the top of the climb */
  capsuleFree: { tower: 14, fairing: 8, separation: 10 },
  /** below this altitude, m, the parachute is opened on a timer, straight to the main (pad and low aborts) */
  lowAltitude: 3000,
  drogue: { area: 24, cd: 0.6, altitude: 10500, maxSpeed: 260, inflation: 1.5, duration: 16 },
  main: { area: 1000, cd: 0.8, altitude: 7500, reefed: 0.08, reefS: 4, inflation: 4, lowDelay: 1.0 },
  /** soft-landing motors: fire at this height above the ground, m; six motors together, N, for s */
  softLanding: { height: 1.0, thrust: 105e3, burn: 0.25 },
  /** heat shield jettison after the main parachute is fully open, s */
  heatShieldDelay: 12,
} as const;

const EARTH_RATE = v3(0, 0, OMEGA_EARTH);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Piecewise-linear table lookup. */
function table(points: readonly (readonly [number, number])[], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) if (x <= points[i][0]) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    return lerp(y0, y1, (x - x0) / (x1 - x0));
  }
  return points[points.length - 1][1];
}

/** A solid motor's thrust at `t` s after ignition: a linear rise, a plateau, a linear tail-off. */
export function motorThrust(peak: number, rise: number, burn: number, tailOff: number, t: number): number {
  if (t < 0 || t > burn + tailOff) return 0;
  if (t < rise) return peak * t / rise;
  if (t <= burn) return peak;
  return peak * (1 - (t - burn) / tailOff);
}
/** Total impulse of `motorThrust`, N s. */
export const motorImpulse = (peak: number, rise: number, burn: number, tailOff: number): number => peak * (burn - rise / 2 + tailOff / 2);

/** A part of a body: a uniform cylinder along x. */
interface Part { mass: number; x0: number; length: number; radius: number }

function massProperties(parts: readonly Part[]): { mass: number; cgX: number; inertia: Mat3 } {
  const mass = parts.reduce((s, p) => s + p.mass, 0);
  const cgX = parts.reduce((s, p) => s + p.mass * (p.x0 + p.length / 2), 0) / mass;
  let ixx = 0, iyy = 0;
  for (const p of parts) {
    const c = p.x0 + p.length / 2 - cgX;
    ixx += 0.5 * p.mass * p.radius * p.radius;
    iyy += p.mass * (3 * p.radius * p.radius + p.length * p.length) / 12 + p.mass * c * c;
  }
  return { mass, cgX, inertia: [ixx, 0, 0, 0, iyy, 0, 0, 0, iyy] };
}

/** The aerodynamics of one configuration, low order: drag along the axis, a normal force at a centre of pressure, damping. */
interface Aero {
  area: number;
  length: number;
  /** axial force coefficient against Mach, flying nose first */
  cd: readonly (readonly [number, number])[];
  /** normal force slope, per rad, small angles */
  cnAlpha: number;
  /** crossflow drag on the side at large angles, on `sideArea` */
  crossflowCd: number;
  sideArea: number;
  /** centre of pressure, body x, m (behind the CG is stable) */
  cpX: number;
  /** pitch/yaw damping, nondimensional; roll damping */
  damping: number;
  rollDamping: number;
}

export interface EscapeConfiguration {
  body: EscapeBody;
  mass: number;
  /** body x of the CG, m, from the configuration's own origin */
  cgX: number;
  inertia: Mat3;
  /** body x of the lowest point, m: what touches the ground */
  bottomX: number;
  /** body x of the top, m */
  topX: number;
  radius: number;
  aero: Aero;
}

/** Axial drag coefficients against Mach (estimates). */
const HEAD_CD = [[0, 0.4], [0.8, 0.45], [1.1, 0.85], [1.5, 0.8], [3, 0.7], [10, 0.65]] as const;
const CAPSULE_CD = [[0, 0.95], [0.6, 1.0], [1, 1.15], [2, 1.3], [5, 1.32], [25, 1.3]] as const;

/**
 * The head section in its stack axes (origin at the interface with the
 * service module, +x to the nose), with or without the tower, and with its
 * grid fins open or not. Closed, its centre of pressure is ahead of its centre
 * of mass; open, the fins put it behind (estimates: the fins exist to make the
 * head section fly nose first on its own).
 */
export function headConfiguration(tower: boolean, towerPropellant: number, fairingPropellant: number, finsOpen: boolean): EscapeConfiguration {
  const f = ESCAPE.fairing, dm = ESCAPE.descentModule, om = ESCAPE.orbitalModule, tw = ESCAPE.tower;
  const R = f.diameter / 2;
  const parts: Part[] = [
    { mass: dm.mass, x0: dm.x0, length: dm.length, radius: dm.diameter / 2 },
    { mass: om.mass, x0: om.x0, length: om.length, radius: 1.1 },
    { mass: f.mass - f.propellant + fairingPropellant, x0: 0, length: f.length, radius: R * 0.9 },
  ];
  if (tower) parts.push({ mass: tw.mass - tw.propellant + towerPropellant, x0: f.length + 1.6, length: tw.length - 1.6, radius: 0.42 });
  const m = massProperties(parts);
  const length = f.length + (tower ? tw.length : 0);
  const margin = finsOpen ? 1.0 : -0.4;
  return { body: 'head', ...m, bottomX: 0, topX: length, radius: R,
    aero: { area: Math.PI * R * R, length, cd: HEAD_CD.map(([mach, cd]) => [mach, cd + (finsOpen ? 0.25 : 0)] as const),
      cnAlpha: finsOpen ? 3.5 : 2.2, crossflowCd: 1.1, sideArea: 2 * R * f.length, cpX: m.cgX - margin, damping: finsOpen ? 8 : 3, rollDamping: 0.1 } };
}

/** The spacecraft whole, after the fairing is gone: service module below the interface, descent and orbital modules above. */
export function spacecraftConfiguration(): EscapeConfiguration {
  const dm = ESCAPE.descentModule, om = ESCAPE.orbitalModule, sm = ESCAPE.serviceModule;
  const m = massProperties([
    { mass: sm.mass, x0: -sm.length, length: sm.length, radius: 1.36 },
    { mass: dm.mass, x0: dm.x0, length: dm.length, radius: dm.diameter / 2 },
    { mass: om.mass, x0: om.x0, length: om.length, radius: 1.1 },
  ]);
  return { body: 'spacecraft', ...m, bottomX: -sm.length, topX: om.x0 + om.length, radius: 1.36,
    aero: { area: Math.PI * 1.36 * 1.36, length: sm.length + om.x0 + om.length, cd: CAPSULE_CD, cnAlpha: 1, crossflowCd: 1.2,
      sideArea: 2.7 * 7, cpX: m.cgX, damping: 2, rollDamping: 0.1 } };
}

/**
 * The descent module in its own axes: origin at its CG, +x out of the heat
 * shield. Statically stable heat shield first, the pressure acting through
 * the heat shield's centre of curvature behind the CG, and symmetric, so it
 * flies without lift: a ballistic entry.
 */
export function capsuleConfiguration(heatShield: boolean): EscapeConfiguration {
  const dm = ESCAPE.descentModule;
  const mass = dm.mass - (heatShield ? 0 : dm.heatShield);
  const R = dm.diameter / 2;
  // a bell 2.24 m tall with its CG 0.9 m above the heat shield's face
  const ixx = 0.5 * mass * (0.75 * R) ** 2, iyy = mass * (3 * (0.75 * R) ** 2 + dm.length ** 2) / 12;
  return { body: 'capsule', mass, cgX: 0, inertia: [ixx, 0, 0, 0, iyy, 0, 0, 0, iyy], bottomX: 0.9, topX: -(dm.length - 0.9), radius: R,
    aero: { area: Math.PI * R * R, length: dm.diameter, cd: CAPSULE_CD, cnAlpha: 0.35, crossflowCd: 0.9, sideArea: dm.diameter * dm.length,
      cpX: 0.9 - 2.235, damping: 0.6, rollDamping: 0.05 } };
}

/** The descent module's riser point, capsule axes: its top. */
const RISER_X = -1.1;

/** One parachute: its drag area now, m² (area × drag coefficient). */
function canopy(area: number, cd: number, openedAt: number | undefined, inflation: number, t: number, reefed = 1, reefS = 0): number {
  if (openedAt === undefined || t < openedAt) return 0;
  const age = t - openedAt;
  if (age < reefS) return area * cd * reefed * clamp(age / Math.max(1e-3, inflation * 0.5), 0, 1) ** 2;
  const open = clamp((age - reefS) / inflation, 0, 1);
  return area * cd * lerp(reefed, 1, open * open);
}

/** What is burning and what is out, for the drawing and the events. */
export interface EscapeStatus {
  mode: EscapeMode;
  phase: EscapePhase;
  body: EscapeBody;
  /** mission time of the abort command */
  t0: number;
  /** the tower's main motor, its control motor and the fairing's motors, 0–1 of their peak thrust */
  motors: { main: number; control: number; fairing: number; softLanding: number };
  finsOpen: boolean;
  /** 0–1: how far each parachute is open */
  drogue: number;
  main: number;
  heatShield: boolean;
  /** peak specific force on the crew so far, g, and when */
  maxG: number;
  maxGT: number;
  /** touchdown speed, m/s, once down */
  touchdownSpeed?: number;
}

/** An event the escape raises, for the simulation's log. */
export interface EscapeEvent { key: string; severity: 'info' | 'major' | 'warn' | 'success'; params?: Record<string, number | string> }

/** The environment the escape flies in. */
export interface EscapeEnvironment {
  groundElevation: (r: Vec3) => number;
  wind: (r: Vec3, t: number) => Vec3;
}

/**
 * One escape, from the abort command to the descent module at rest. The
 * owner reads `state`, `config` and `status` after each `step`, and is told
 * through `onRelease` of each body the flight leaves behind (the tower with
 * the fairing and the orbital module; the orbital and service modules).
 */
export class EscapeFlight {
  state: RigidState;
  config: EscapeConfiguration;
  readonly status: EscapeStatus;
  private towerPropellant: number;
  private fairingPropellant: number;
  /** body direction the control motor pushes the tower's top, head-section axes */
  private readonly controlDir: Vec3;
  private drogueAt?: number;
  private mainAt?: number;
  private mainFullAt?: number;
  private softAt?: number;
  private readonly events: EscapeEvent[] = [];
  private lastSpecificForce = 0;
  private quaternionError = 0;
  private alpha = 0;
  private beta = 0;
  private windNow = v3();

  /**
   * @param state the head section's (or the spacecraft's) CG state at the abort, in its stack axes
   * @param side unit vector, head-section body axes, the control motor pushes the tower's top towards
   */
  constructor(readonly mode: EscapeMode, state: RigidState, readonly t0: number, side: Vec3,
    private readonly env: EscapeEnvironment, readonly onRelease: (what: 'head' | 'modules', state: RigidState, t: number) => void) {
    this.towerPropellant = mode === 'tower' ? ESCAPE.tower.propellant : 0;
    this.fairingPropellant = mode === 'separation' ? 0 : ESCAPE.fairing.propellant;
    this.controlDir = normalize(v3(0, side.y, side.z));
    this.config = mode === 'separation' ? spacecraftConfiguration() : headConfiguration(mode === 'tower', this.towerPropellant, this.fairingPropellant, false);
    this.state = { r: { ...state.r }, v: { ...state.v }, attitudeQ: { ...state.attitudeQ }, omegaBody: { ...state.omegaBody } };
    if (mode === 'separation') {
      // released on springs, away from the stage below
      this.state.v = addScaled(this.state.v, quatRotate(this.state.attitudeQ, v3(1, 0, 0)), ESCAPE.separationSpeed);
    }
    this.status = { mode, phase: mode === 'separation' ? 'coast' : 'escape', body: this.config.body, t0,
      motors: { main: 0, control: 0, fairing: 0, softLanding: 0 }, finsOpen: false, drogue: 0, main: 0, heatShield: true, maxG: 0, maxGT: t0 };
  }

  /** Events raised since the last call. */
  takeEvents(): EscapeEvent[] { return this.events.splice(0); }

  get landed(): boolean { return this.status.phase === 'landed'; }

  /** The integration step the current phase needs, s. */
  suggestedDt(): number {
    const tau = this.lastT - this.t0, phase = this.status.phase;
    if (phase === 'landed') return 1;
    if (phase === 'escape' || tau < 4) return 0.005;
    const alt = norm(this.state.r) - R_EARTH;
    if (this.softAt !== undefined || (this.mainAt !== undefined && this.height() < 30)) return 0.005;
    if (phase === 'drogue' || (this.mainAt !== undefined && this.mainFullAt === undefined)) return 0.01;
    if (phase === 'main') return 0.02;
    return alt > 120e3 ? 0.2 : alt > 60e3 ? 0.05 : 0.01;
  }
  private lastT = 0;

  /** Height of the lowest point above the ground, m. */
  height(state: RigidState = this.state): number {
    const bottom = add(state.r, quatRotate(state.attitudeQ, v3(this.config.bottomX - this.config.cgX, 0, 0)));
    return norm(bottom) - R_EARTH - this.env.groundElevation(bottom);
  }

  /** Advance to `t + dt`. */
  step(t: number, dt: number): void {
    this.lastT = t;
    let elapsed = 0;
    while (elapsed < dt - 1e-9 && !this.landed) {
      const now = t + elapsed;
      this.sequence(now);
      if (this.landed) break;
      const h = Math.min(this.suggestedDt(), dt - elapsed);
      const result = integrateRigidStep(now, this.state, h, (time, s) => this.loads(time, s));
      this.quaternionError = Math.abs(result.quaternionNormBeforeNormalize - 1);
      this.state = result.state;
      this.burn(now, h);
      elapsed += h;
      this.lastT = t + elapsed;
      this.observe(t + elapsed);
      if (this.height() <= 0) this.touchdown();
    }
    this.lastT = t + dt;
  }

  /** Propellant spent by the motors over [t, t + h]. */
  private burn(t: number, h: number): void {
    const tau = t + h / 2 - this.t0;
    if (this.towerPropellant > 0) {
      const tw = ESCAPE.tower, impulse = motorImpulse(tw.thrust, tw.rise, tw.burn, tw.tailOff);
      this.towerPropellant = Math.max(0, this.towerPropellant - motorThrust(tw.thrust, tw.rise, tw.burn, tw.tailOff, tau) * h * tw.propellant / impulse);
    }
    if (this.mode === 'fairing' && this.fairingPropellant > 0) {
      const f = ESCAPE.fairing, impulse = motorImpulse(f.thrust, f.rise, f.burn, f.tailOff);
      this.fairingPropellant = Math.max(0, this.fairingPropellant - motorThrust(f.thrust, f.rise, f.burn, f.tailOff, tau) * h * f.propellant / impulse);
    }
    if (this.config.body === 'head') {
      this.config = headConfiguration(this.mode === 'tower', this.towerPropellant, this.fairingPropellant, this.status.finsOpen);
    }
  }

  /** The events of the sequence, by time, altitude and speed. */
  private sequence(t: number): void {
    const tau = t - this.t0, s = this.status;
    const alt = norm(this.state.r) - R_EARTH;
    const up = normalize(this.state.r);
    const vz = dot(this.state.v, up);
    if (s.body === 'head' && !s.finsOpen && tau >= ESCAPE.fairing.finsOpen) {
      s.finsOpen = true;
      this.config = headConfiguration(this.mode === 'tower', this.towerPropellant, this.fairingPropellant, true);
      this.events.push({ key: 'evt.escapeFins', severity: 'info', params: { alt: Math.round(alt) } });
    }
    if (s.phase === 'escape') {
      const tw = ESCAPE.tower, f = ESCAPE.fairing;
      const done = this.mode === 'tower' ? tau > tw.burn + tw.tailOff : tau > f.burn + f.tailOff;
      if (done) {
        s.phase = 'coast';
        this.events.push({ key: 'evt.escapeBurnout', severity: 'info', params: { alt: Math.round(alt), speed: Math.round(norm(this.airVelocity(this.state, t))) } });
      }
    }
    if ((s.body === 'head' || s.body === 'spacecraft') && s.phase === 'coast') {
      const free = ESCAPE.capsuleFree[this.mode];
      if (tau >= free || (this.mode === 'tower' && tau > 4 && vz <= 0)) this.freeCapsule(t);
    }
    if (s.body !== 'capsule') return;
    const airspeed = norm(this.airVelocity(this.state, t));
    if (s.phase === 'fall' && vz < 0) {
      if (this.freedAlt < ESCAPE.lowAltitude) {
        if (t - this.freedAt >= ESCAPE.main.lowDelay) this.openMain(t, alt, true);
      } else if (alt < ESCAPE.drogue.altitude && airspeed < ESCAPE.drogue.maxSpeed) {
        this.drogueAt = t; s.phase = 'drogue';
        this.events.push({ key: 'evt.escapeDrogue', severity: 'info', params: { alt: Math.round(alt), speed: Math.round(airspeed) } });
      }
    }
    if (s.phase === 'drogue' && (t - this.drogueAt! >= ESCAPE.drogue.duration || alt < ESCAPE.main.altitude)) this.openMain(t, alt, false);
    if (s.phase === 'main') {
      if (this.mainFullAt === undefined && t - this.mainAt! >= ESCAPE.main.reefS + ESCAPE.main.inflation) this.mainFullAt = t;
      if (s.heatShield && this.mainFullAt !== undefined && t - this.mainFullAt >= ESCAPE.heatShieldDelay) {
        s.heatShield = false;
        this.config = capsuleConfiguration(false);
        this.events.push({ key: 'evt.escapeHeatShield', severity: 'info', params: { alt: Math.round(alt) } });
      }
      if (this.softAt === undefined && this.height() <= ESCAPE.softLanding.height) {
        this.softAt = t;
        this.events.push({ key: 'evt.escapeSoftLanding', severity: 'info', params: { speed: +(-vz).toFixed(1) } });
      }
    }
  }
  private freedAt = 0;
  private freedAlt = 0;

  private openMain(t: number, alt: number, low: boolean): void {
    this.mainAt = t; this.drogueAt = undefined;
    this.status.phase = 'main'; this.status.drogue = 0;
    this.events.push({ key: low ? 'evt.escapeMainLow' : 'evt.escapeMain', severity: 'info', params: { alt: Math.round(alt) } });
  }

  /** The descent module leaves the head section (or the spacecraft's other modules). */
  private freeCapsule(t: number): void {
    const s = this.status, c = capsuleConfiguration(true);
    // the descent module's CG, 0.9 m above its heat shield's face, from the configuration's CG
    const offset = quatRotate(this.state.attitudeQ, v3(ESCAPE.descentModule.x0 + c.bottomX - this.config.cgX, 0, 0));
    const r = add(this.state.r, offset);
    const v = add(this.state.v, quatRotate(this.state.attitudeQ, cross(this.state.omegaBody, quatInverseRotate(this.state.attitudeQ, offset))));
    this.onRelease(s.body === 'head' ? 'head' : 'modules', { ...this.state }, t);
    // capsule axes: +x out of the heat shield, which faced the service module
    const flip = quatFromAxisAngle(v3(0, 1, 0), Math.PI);
    this.state = { r, v: addScaled(v, quatRotate(this.state.attitudeQ, v3(1, 0, 0)), -ESCAPE.capsuleDrop), attitudeQ: quatMultiply(this.state.attitudeQ, flip),
      omegaBody: { x: -this.state.omegaBody.x, y: this.state.omegaBody.y, z: -this.state.omegaBody.z } };
    this.config = c;
    s.body = 'capsule'; s.phase = 'fall'; s.finsOpen = false;
    this.freedAt = t; this.freedAlt = norm(r) - R_EARTH;
    this.events.push({ key: 'evt.escapeCapsule', severity: 'major', params: { alt: Math.round(this.freedAlt) } });
  }

  private touchdown(): void {
    const s = this.status;
    const vz = dot(sub(this.state.v, cross(EARTH_RATE, this.state.r)), normalize(this.state.r));
    s.touchdownSpeed = Math.abs(vz);
    s.phase = 'landed';
    s.motors = { main: 0, control: 0, fairing: 0, softLanding: 0 };
    s.drogue = 0;
    this.events.push({ key: 'evt.escapeLanded', severity: 'success', params: { speed: +s.touchdownSpeed.toFixed(1), g: +s.maxG.toFixed(1) } });
  }

  airVelocity(state: RigidState, t: number): Vec3 {
    return sub(sub(state.v, cross(EARTH_RATE, state.r)), this.env.wind(state.r, t));
  }

  /** Forces and moments on the flying body. */
  private loads(t: number, st: Readonly<RigidState>): RigidLoads {
    const c = this.config, tau = t - this.t0;
    const force = v3(), moment = v3();
    const addForce = (fBody: Vec3, atX: number, lateral = v3()) => {
      force.x += fBody.x; force.y += fBody.y; force.z += fBody.z;
      const arm = add(v3(atX - c.cgX, 0, 0), lateral);
      const m = cross(arm, fBody);
      moment.x += m.x; moment.y += m.y; moment.z += m.z;
    };
    // motors
    if (c.body === 'head') {
      if (this.mode === 'tower') {
        const tw = ESCAPE.tower;
        addForce(v3(motorThrust(tw.thrust, tw.rise, tw.burn, tw.tailOff, tau), 0, 0), tw.nozzleX);
        if (tau >= 0 && tau <= tw.controlBurn) addForce(scale(this.controlDir, tw.controlThrust), tw.controlX);
      } else if (this.mode === 'fairing') {
        const f = ESCAPE.fairing;
        addForce(v3(motorThrust(f.thrust, f.rise, f.burn, f.tailOff, tau), 0, 0), f.nozzleX);
      }
    }
    if (c.body === 'capsule' && this.softAt !== undefined && t - this.softAt <= ESCAPE.softLanding.burn) {
      addForce(v3(-ESCAPE.softLanding.thrust, 0, 0), c.bottomX);
    }
    // aerodynamics
    const alt = norm(st.r) - R_EARTH;
    const atm = atmosphere(Math.max(0, alt));
    const air = this.airVelocity(st, t);
    const u = quatInverseRotate(st.attitudeQ, air), speed = norm(u);
    if (atm.rho > 0 && speed > 1e-3) {
      const q = 0.5 * atm.rho * speed * speed, a = c.aero, mach = speed / atm.a;
      const cosA = clamp(u.x / speed, -1, 1), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
      // axial drag, whichever end leads
      addForce(v3(-Math.sign(u.x) * q * a.area * table(a.cd, mach) * cosA * cosA, 0, 0), c.cgX);
      // normal force against the crossflow, at the centre of pressure
      const lateral = v3(0, u.y, u.z), lat = norm(lateral);
      if (lat > 1e-6) {
        const cn = a.cnAlpha * sinA * Math.abs(cosA) + a.crossflowCd * (a.sideArea / a.area) * sinA * sinA;
        addForce(scale(lateral, -q * a.area * cn / lat), a.cpX);
      }
      // damping
      const k = q * a.area * a.length * a.length / (2 * speed);
      moment.x -= k * a.rollDamping * st.omegaBody.x;
      moment.y -= k * a.damping * st.omegaBody.y;
      moment.z -= k * a.damping * st.omegaBody.z;
      this.alpha = Math.atan2(u.z, u.x); this.beta = Math.asin(clamp(u.y / speed, -1, 1));
    }
    // parachutes, pulling at the riser point against the air
    if (c.body === 'capsule' && speed > 1e-3) {
      const drogue = canopy(ESCAPE.drogue.area, ESCAPE.drogue.cd, this.drogueAt, ESCAPE.drogue.inflation, t);
      const main = canopy(ESCAPE.main.area, ESCAPE.main.cd, this.mainAt, ESCAPE.main.inflation, t, ESCAPE.main.reefed, ESCAPE.main.reefS);
      const cdA = drogue + main;
      if (cdA > 0) {
        const q = 0.5 * atm.rho * speed * speed;
        addForce(scale(u, -q * cdA / speed), RISER_X);
        // the canopy's own damping of the swing, as a drag 3 m from the riser point
        const k = 0.5 * atm.rho * speed * cdA * 9;
        moment.y -= k * st.omegaBody.y; moment.z -= k * st.omegaBody.z; moment.x -= 0.05 * k * st.omegaBody.x;
      }
      this.status.drogue = drogue / (ESCAPE.drogue.area * ESCAPE.drogue.cd);
      this.status.main = main / (ESCAPE.main.area * ESCAPE.main.cd);
    }
    // resting on the ground is the owner's business; mass flow is quasi-steady
    this.windNow = this.env.wind(st.r, t);
    const forceECI = quatRotate(st.attitudeQ, force);
    this.lastSpecificForce = norm(force) / c.mass / G0;
    return { mass: c.mass, inertiaBody: c.inertia, forceECI, momentBody: moment, externalAccelerationECI: gravityJ2(st.r) };
  }

  /** Motors' state and the crew's g, after an accepted step. */
  private observe(t: number): void {
    const tau = t - this.t0, s = this.status, tw = ESCAPE.tower, f = ESCAPE.fairing;
    s.motors.main = s.body === 'head' && this.mode === 'tower' ? motorThrust(1, tw.rise, tw.burn, tw.tailOff, tau) : 0;
    s.motors.control = s.body === 'head' && this.mode === 'tower' && tau <= tw.controlBurn ? 1 : 0;
    s.motors.fairing = s.body === 'head' && this.mode === 'fairing' ? motorThrust(1, f.rise, f.burn, f.tailOff, tau) : 0;
    s.motors.softLanding = this.softAt !== undefined && t - this.softAt <= ESCAPE.softLanding.burn ? 1 : 0;
    // re-evaluate the loads at the accepted state for the specific force
    this.loads(t, this.state);
    if (this.lastSpecificForce > s.maxG) { s.maxG = this.lastSpecificForce; s.maxGT = t; }
  }

  /** The specific force on the crew now, g. */
  get gLoad(): number { return this.lastSpecificForce; }

  /** The flying body as six-DOF telemetry, so the rest of the app can draw and log it like any rigid body. */
  telemetry(): RigidTelemetry {
    const c = this.config;
    return {
      modelVersion: 'escape-1', bodyId: 'escape', configurationId: `escape.${c.body}${this.status.finsOpen ? '.fins' : ''}`,
      attitudeQ: { ...this.state.attitudeQ }, omegaBody: { ...this.state.omegaBody }, cgBody: v3(c.cgX, 0, 0), inertiaBody: c.inertia,
      renderOffsetBody: v3(c.bottomX - c.cgX, 0, 0), controlMode: 'auto', engineDeflections: {}, rcsPropellantKg: 0, saturated: false,
      angleOfAttack: this.alpha, sideslip: this.beta, aeroWithinEnvelope: true, windECI: this.windNow,
      rawQuaternionNormError: this.quaternionError,
    };
  }

  /** The unit body axis in ECI (+x: the tower's end of the head section; the heat shield of the descent module). */
  get axis(): Vec3 { return quatRotate(this.state.attitudeQ, v3(1, 0, 0)); }
}
