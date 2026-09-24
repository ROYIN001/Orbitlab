/**
 * Starship's ship flying itself home after a suborbital cut-off (roadmap
 * item 10b): the test-flight profile, 213 × −15 km at 26.2° on Flight 5, with
 * no deorbit burn — the perigee is under the ground, so the coast ends in the
 * air by itself.
 *
 * The descent is five phases, each a different way of flying:
 *
 * 1. **coast** — above the air the ship turns to its entry attitude on its
 *    cold-gas thrusters, belly (+Z, the heat-shield side) towards the flight
 *    path and nose `ENTRY_ANGLE_OF_ATTACK` above it, and holds it. Thirty
 *    seconds after the cut-off it vents what is left in its main tanks and
 *    keeps `SHIP_LANDING_PROPELLANT` in its header tanks, which is what puts
 *    its centre of mass near its middle (`headerTankComponents`).
 * 2. **entry** — from `ENTRY_INTERFACE` it flies belly first on its flaps,
 *    the lift of its tilted belly pointed up, easing the angle of attack from
 *    70° hypersonic to 80° as it slows (`descentAngleOfAttack`).
 * 3. **bellyflop** — subsonic, the ship falls belly first at its terminal
 *    speed, about 80 m/s, still flying on its flaps.
 * 4. **flip** — at the height its landing burn needs (`flipHeight`) it lights
 *    its three sea-level Raptors and swings upright on them and its flaps.
 * 5. **landing** — it brakes to `TOUCHDOWN_SPEED` at the water on as many of
 *    the three as the thrust asks for, taking out the sideways speed the flip
 *    gave it and arriving upright.
 *
 * Six-DOF flies every phase with the ship's own body — its belly-first table,
 * its four flaps (`shipFlapSurfaces`), its engines and thrusters — through the
 * attitude this module commands. The point-mass model flies the same phases
 * with the drag of that table at the commanded attitude and no lift.
 */
import { DEG, G0, OMEGA_EARTH, R_EARTH } from '../constants';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import { atmosphere } from '../atmosphere';
import { dragCoefficient } from '../aero';
import { gravity } from '../gravity';
import { eciToLatLon } from '../orbital';
import { engineMassFlow, engineThrust } from '../vehicle';
import { atMach, crossflowDragCoefficient, shipDescentAeroTable, type AeroTable } from '../rigid/aero-tables';
import { targetAttitude } from '../rigid/runtime';
import { quatRotate, type Quat } from '../rigid/math';
import type { ControlGains } from '../rigid/control';
import { brakingHeight } from './return-guidance';
import type { DescentPhase } from './types';
import type { Simulation } from '../simulation';

/**
 * Propellant the ship keeps for its landing, kg; the rest is vented after the
 * cut-off. Braking from 80 m/s on the sea-level engines takes about 10 t; the
 * header tanks' capacity is not published and 30 t is an estimate with room
 * for the flip.
 */
export const SHIP_LANDING_PROPELLANT = 30e3;
/** Height the entry is flown from, m. */
export const ENTRY_INTERFACE = 120e3;
/** Hypersonic angle of attack, the belly into the flow. */
export const ENTRY_ANGLE_OF_ATTACK = 70 * DEG;
/** Subsonic angle of attack of the belly flop. */
export const BELLYFLOP_ANGLE_OF_ATTACK = 80 * DEG;
/** Seconds after the cut-off the main tanks are vented. */
const VENT_DELAY_S = 30;
/** Below this Mach number the entry has become a belly flop. */
const BELLYFLOP_MACH = 0.9;
/** The three sea-level Raptors, by engine index (`chamberGeometry` puts them first). */
const SEA_LEVEL_ENGINES: readonly number[] = [0, 1, 2];
/**
 * The engines lit for each count: two are the pair either side of the
 * pitch plane, so that between them they can roll the ship as well.
 */
const ENGINE_SETS: Readonly<Record<number, readonly number[]>> = { 1: [0], 2: [1, 2], 3: SEA_LEVEL_ENGINES };
/** Level the flip is flown at, of each engine lit: the least they run at. */
const FLIP_LEVEL = 0.4;
/**
 * Fewest engines the landing burn runs on while it is still leaning or
 * falling fast. One engine sits off the axis, where its gimbal cannot pitch
 * the ship without rolling it too, so it is lit alone only for the last
 * settle (`SETTLE`); two Raptors at their least still lift the ship, so on
 * them alone it would stop above the water and climb.
 */
const LANDING_MIN_ENGINES = 2;
/** Upright, slow and no longer sliding: one engine may lower the ship the last metres. */
const SETTLE = { vertical: 8, horizontal: 3, tilt: 5 * DEG } as const;
/** Level the landing burn after the flip is planned at, on `LANDING_MIN_ENGINES`. */
const LANDING_PLAN_LEVEL = 0.7;
/**
 * How long the flip falls for, s at the speed it starts at: the swing
 * upright takes about eight seconds, braking harder as it comes up, and
 * leaves the ship falling at about half the speed it started at.
 */
const FLIP_DROP_S = 6.5;
/**
 * Margin on top of the flip height, m: the time the burn after the flip
 * needs to take out the fifty-odd metres a second of sideways speed the
 * swing leaves, leaning no more than `LANDING_MAX_TILT`.
 */
const FLIP_MARGIN = 400;
/**
 * The flip is over when the nose is this close to upright and has stopped
 * swinging, or after `FLIP_TIMEOUT_S`.
 */
const FLIP_DONE_ANGLE = 12 * DEG;
const FLIP_DONE_RATE = 3 * DEG;
const FLIP_TIMEOUT_S = 10;
/** Speed the landing burn arrives at the water with, m/s. */
export const TOUCHDOWN_SPEED = 1.5;
/**
 * Largest lean the landing burn takes to take out sideways speed — the
 * flip's own, mostly: the ship swings through it past upright, leaning
 * back, as Starship's prototypes did.
 */
const LANDING_MAX_TILT = 30 * DEG;
/** The lean fades out over the last seconds, so the ship arrives upright. */
const UPRIGHT_S = 3;
/** Beyond any of these a splashdown breaks the ship up: m/s down, m/s across, lean. */
export const SPLASHDOWN_LIMITS = { vertical: 6, horizontal: 5, tilt: 15 * DEG } as const;

/**
 * Gains for the flip: it swings through 90° in about five seconds on its
 * engines and flaps, which the flight's slow orbital gains would take half a
 * minute over, and it may plan with twice the usual share of what the
 * gimbals have to spare — the thrust it flips on is pushing it sideways
 * for as long as the swing takes. Roll and yaw stay gentle.
 */
export const FLIP_CONTROL_GAINS: ControlGains = {
  attitudeGain: v3(1.5, 1.5, 1.5), rateGain: v3(3, 3, 3),
  maxRate: v3(8 * DEG, 20 * DEG, 8 * DEG), maxAngularAcceleration: v3(5 * DEG, 20 * DEG, 5 * DEG), authorityShare: 0.7,
};
/**
 * Gains for the landing burn: a returning booster's rates, and the flip's
 * share of the gimbals — the lean that takes out the flip's sideways speed
 * has to come and go within the burn.
 */
export const LANDING_CONTROL_GAINS: ControlGains = {
  attitudeGain: v3(1.5, 1.5, 1.5), rateGain: v3(3, 3, 3),
  maxRate: v3(8 * DEG, 12 * DEG, 12 * DEG), maxAngularAcceleration: v3(5 * DEG, 10 * DEG, 10 * DEG), authorityShare: 0.7,
};

/** Angle of attack flown at `mach`: 70° hypersonic, 80° once subsonic. */
export function descentAngleOfAttack(mach: number): number {
  const f = Math.max(0, Math.min(1, (3 - mach) / (3 - BELLYFLOP_MACH)));
  return ENTRY_ANGLE_OF_ATTACK + f * (BELLYFLOP_ANGLE_OF_ATTACK - ENTRY_ANGLE_OF_ATTACK);
}

/**
 * The belly-first attitude at angle of attack `alpha` to the flight path
 * `vDir`: the nose `alpha` above it, in the vertical plane of the flight, and
 * the belly (+Z) towards it. `heading` is the horizontal direction flown,
 * which is what "above" means once the fall is vertical.
 */
export function bellyFirstAttitude(vDir: Vec3, up: Vec3, heading: Vec3, alpha: number): { nose: Vec3; belly: Vec3 } {
  const sinGamma = Math.max(-1, Math.min(1, dot(vDir, up)));
  const cosGamma = Math.sqrt(1 - sinGamma * sinGamma);
  // "Up" square to the flight path: the local vertical while the path is
  // shallow, the heading once it has turned down.
  let lift = sub(scale(up, cosGamma), scale(heading, sinGamma));
  lift = sub(lift, scale(vDir, dot(lift, vDir)));
  if (norm(lift) < 1e-9) lift = normalize(cross(vDir, cross(up, vDir)));
  lift = normalize(lift);
  return {
    nose: add(scale(vDir, Math.cos(alpha)), scale(lift, Math.sin(alpha))),
    belly: sub(scale(vDir, Math.sin(alpha)), scale(lift, Math.cos(alpha))),
  };
}

/**
 * Aerodynamic force on the ship from its descent table, N (ECI), with the
 * nose along `nose` and the air meeting it at `vAir` (the vehicle's velocity
 * through the air): the axial force along the body and the normal force
 * square to it, as the six-DOF table gives them (`tabulatedLoads`) but
 * through the centre of mass. Belly first the normal force is both the drag
 * and the lift — about a third of it at 70°, pointed wherever the nose is.
 */
export function descentAeroForce(table: AeroTable, referenceArea: number, nose: Vec3, vAir: Vec3, density: number, soundSpeed: number): Vec3 {
  const speed = norm(vAir);
  if (!(speed > 0.1) || !(density > 0)) return v3();
  const mach = speed / soundSpeed;
  const c = dot(nose, vAir) / speed;
  const lateral = sub(scale(vAir, 1 / speed), scale(nose, c));
  const s = norm(lateral);
  const qS = 0.5 * density * speed * speed * referenceArea;
  const noseFirst = c >= 0;
  const axial = (noseFirst ? dragCoefficient(mach) : atMach(table, table.baseAxial, mach)) * c * c;
  const potential = (noseFirst ? atMach(table, table.normalSlope, mach) : table.baseNormalSlope) * s * Math.abs(c);
  const crossflow = table.crossflowEta * crossflowDragCoefficient(mach * s) * (table.planformArea / referenceArea) * s * s;
  let force = scale(nose, -Math.sign(c) * qS * axial);
  if (s > 1e-9) force = add(force, scale(lateral, -qS * (potential + crossflow) / s));
  return force;
}

export interface DescentCommand {
  /** where the nose is to point (ECI) */
  nose: Vec3;
  /**
   * Where the belly (+Z) is to point (ECI), or null when the roll is free:
   * upright on its engines the ship turns its nose the shortest way and
   * leaves its roll alone — with one engine lit, a roll the gimbal cannot
   * make on its own would be taken out of the pitch it can.
   */
  belly: Vec3 | null;
  /** engine command, 0..1 */
  throttle: number;
  /** fastest the point-mass model turns the nose, rad/s */
  slewRate: number;
}

export class ShipDescent {
  phase: DescentPhase = 'coast';
  /** horizontal direction flown, kept once the fall has no horizontal speed left to say it */
  private heading: Vec3 | null = null;
  private flipStart = 0;
  private engines = SEA_LEVEL_ENGINES.length;
  private table: AeroTable | null = null;

  constructor(private readonly sim: Simulation) {}

  /** The ascent has been cut off on the suborbital target: start flying home. */
  start(): void {
    const s = this.sim.state;
    s.status = 'descent';
    s.note = 'descent';
    s.descentPhase = this.phase = 'coast';
    this.sim.schedule(s.t + VENT_DELAY_S, 'shipVent', () => this.vent());
  }

  /** Empty the main tanks, keeping the landing propellant in the header tanks. */
  private vent(): void {
    const st = this.sim.vehicle.active;
    if (!st || this.sim.state.status !== 'descent') return;
    const vented = Math.max(0, st.propellant - SHIP_LANDING_PROPELLANT);
    st.propellant -= vented;
    st.descent = true;
    this.sim.state.mass = this.sim.vehicle.totalMass();
    this.sim.event('evt.shipVent', 'info', { t: Math.round(vented / 1000), kept: Math.round(st.propellant / 1000) });
  }

  private get spec() { return this.sim.vehicle.active!.spec; }
  private get referenceArea(): number { return Math.PI * (this.spec.diameter / 2) ** 2; }
  private descentTable(): AeroTable {
    return this.table ??= shipDescentAeroTable(this.spec.length, this.spec.diameter, this.referenceArea);
  }

  /** Air-relative velocity with the Earth's rotation only (the point-mass model has no wind). */
  private static airVelocity(r: Vec3, v: Vec3): Vec3 { return sub(v, cross(v3(0, 0, OMEGA_EARTH), r)); }

  private updateHeading(vAir: Vec3, up: Vec3): Vec3 {
    const horizontal = sub(vAir, scale(up, dot(vAir, up)));
    if (norm(horizontal) > 30 || !this.heading) {
      this.heading = norm(horizontal) > 1e-6 ? normalize(horizontal) : normalize(cross(v3(0, 0, 1), up));
    }
    return this.heading;
  }

  /** The attitude held on the coast above the air, from the inertial flight path. */
  coastAttitude(r: Vec3, v: Vec3): Quat {
    const up = normalize(r);
    const heading = this.updateHeading(v, up);
    const { nose, belly } = bellyFirstAttitude(normalize(v), up, heading, ENTRY_ANGLE_OF_ATTACK);
    return targetAttitude(nose, belly);
  }

  /**
   * Longest held-coast step the descent allows now, s: nothing that could
   * bring the ship down to 150 km within it, falling freely from where it is.
   */
  coastWindow(): number {
    const s = this.sim.state;
    if (this.phase !== 'coast') return 0;
    const g = gravityAt(norm(s.r));
    const drop = s.altitude - 150e3;
    if (!(drop > 0)) return 0;
    return (s.vz + Math.sqrt(s.vz * s.vz + 2 * g * drop)) / g;
  }

  /** Height of the lowest point of the ship above the water, m. */
  private clearance(): number {
    const s = this.sim.state;
    const surface = this.sim.groundElevation(s.r);
    const snapshot = this.sim.rigidRuntime?.snapshot;
    if (!s.rigid || !snapshot) return s.altitude - surface;
    // The engines' end of the ship, which is what meets the water upright.
    const base = add(s.r, quatRotate(s.rigid.attitudeQ, sub(snapshot.activeBase, snapshot.cg)));
    return norm(base) - R_EARTH - surface;
  }

  /**
   * The height the flip has to start at, m above the water: what the flip
   * falls, what the landing burn after it needs to stop from the speed the
   * flip leaves, and `FLIP_MARGIN`. About a kilometre, as Starship's own.
   */
  flipHeight(vDown: number, mass: number, g: number): number {
    const e = this.spec.engine;
    const n = LANDING_MIN_ENGINES;
    const brake = brakingHeight({
      alt: 1000, surfaceAlt: 0, vDown: vDown / 2, vTouch: TOUCHDOWN_SPEED, mass,
      thrust: (alt) => n * engineThrust(e, atmosphere(Math.max(0, alt)).p) * LANDING_PLAN_LEVEL,
      flow: n * engineMassFlow(e) * LANDING_PLAN_LEVEL, cd: 1.0, area: this.referenceArea, gravity: g,
    });
    return vDown * FLIP_DROP_S + brake + FLIP_MARGIN;
  }

  /** What to fly this step. */
  command(): DescentCommand {
    const sim = this.sim, s = sim.state, st = sim.vehicle.active!;
    const up = normalize(s.r);
    const vAir = sim.rigidRuntime ? sim.rigidRuntime.airVelocity(s, s.t) : ShipDescent.airVelocity(s.r, s.v);
    const vGround = ShipDescent.airVelocity(s.r, s.v);
    const heading = this.updateHeading(this.phase === 'coast' ? s.v : vAir, up);
    const g = gravityAt(norm(s.r));
    const vDown = -dot(vGround, up);
    const clearance = this.clearance();

    // --- phase changes
    if (this.phase === 'coast' && s.altitude < ENTRY_INTERFACE && s.vz < 0) {
      this.setPhase('entry');
      sim.event('evt.shipEntry', 'major', { speed: Math.round(norm(vAir)) });
    }
    if (this.phase === 'entry' && s.mach < BELLYFLOP_MACH && s.altitude < 40e3) this.setPhase('bellyflop');
    if ((this.phase === 'entry' || this.phase === 'bellyflop') && vDown > 0
      && clearance <= this.flipHeight(vDown, s.mass, g)) {
      this.setPhase('flip');
      this.flipStart = s.t;
      this.engines = SEA_LEVEL_ENGINES.length;
      st.litEngines = SEA_LEVEL_ENGINES;
      sim.vehicle.igniteStage(st, s.t);
      sim.event('evt.shipFlip', 'major', { alt: Math.round(clearance) });
      sim.rigidRuntime?.setControlGains(FLIP_CONTROL_GAINS);
    }
    const aim = this.landingAim(up, vGround, vDown, clearance, g);
    if (this.phase === 'flip') {
      const off = Math.acos(Math.max(-1, Math.min(1, dot(s.dir, up))));
      const swinging = s.rigid ? norm(s.rigid.omegaBody) > FLIP_DONE_RATE + OMEGA_EARTH : false;
      if ((off < FLIP_DONE_ANGLE && !swinging) || s.t - this.flipStart > FLIP_TIMEOUT_S) {
        this.setPhase('landing');
        sim.rigidRuntime?.setControlGains(LANDING_CONTROL_GAINS);
      }
    }

    // --- what each phase flies
    switch (this.phase) {
      case 'coast': {
        const { nose, belly } = bellyFirstAttitude(normalize(s.v), up, heading, ENTRY_ANGLE_OF_ATTACK);
        return { nose, belly, throttle: 0, slewRate: 2 * DEG };
      }
      case 'entry':
      case 'bellyflop': {
        const alpha = descentAngleOfAttack(s.mach);
        const { nose, belly } = bellyFirstAttitude(normalize(vAir), up, heading, alpha);
        return { nose, belly, throttle: 0, slewRate: 5 * DEG };
      }
      case 'flip':
        // Upright, swinging the shortest way (the belly ends facing the way
        // it was flying). The sideways speed the swing's own thrust gives it
        // is the landing burn's to take out.
        return { nose: up, belly: null, throttle: FLIP_LEVEL, slewRate: 20 * DEG };
      case 'landing':
      default:
        return this.landingCommand(aim.thrust, st.propellant > 0,
          vDown < SETTLE.vertical && norm(sub(vGround, scale(up, dot(vGround, up)))) < SETTLE.horizontal
          && dot(s.dir, up) > Math.cos(SETTLE.tilt));
    }
  }

  private setPhase(phase: DescentPhase): void {
    this.phase = phase;
    this.sim.state.descentPhase = phase;
  }

  /**
   * What the landing burn asks of the engines, m/s² (ECI): a constant
   * deceleration that arrives at the water at `TOUCHDOWN_SPEED`, and the
   * sideways speed taken out over a third of the time left, leaning up to
   * `LANDING_MAX_TILT` for it and upright for the last `UPRIGHT_S` seconds.
   */
  private landingAim(up: Vec3, vGround: Vec3, vDown: number, clearance: number, g: number): { thrust: Vec3; tgo: number } {
    const h = Math.max(0.5, clearance);
    const aDown = vDown > TOUCHDOWN_SPEED ? (vDown * vDown - TOUCHDOWN_SPEED * TOUCHDOWN_SPEED) / (2 * h)
      : (vDown - TOUCHDOWN_SPEED) / 1;
    const aVertical = Math.max(0, g + aDown);
    const tgo = 2 * h / Math.max(TOUCHDOWN_SPEED, vDown);
    const horizontal = sub(vGround, scale(up, dot(vGround, up)));
    const tau = Math.max(1.5, Math.min(6, tgo / 3));
    let aSide = scale(horizontal, -1 / tau);
    const fade = Math.max(0, Math.min(1, (tgo - 0.5) / UPRIGHT_S));
    const cap = Math.max(aVertical, g) * Math.tan(LANDING_MAX_TILT) * fade;
    if (norm(aSide) > cap) aSide = scale(aSide, cap / Math.max(1e-12, norm(aSide)));
    return { thrust: add(scale(up, aVertical), aSide), tgo };
  }

  /**
   * The landing burn on as many of the three sea-level engines as the
   * thrust `landingAim` asks for takes.
   */
  private landingCommand(aThrust: Vec3, fuel: boolean, settling: boolean): DescentCommand {
    const s = this.sim.state, st = this.sim.vehicle.active!;
    const e = st.spec.engine;
    const perEngine = engineThrust(e, atmosphere(Math.max(0, s.altitude)).p);
    const need = s.mass * norm(aThrust);
    // One more engine when those lit are nearly flat out; one fewer, down to
    // `LANDING_MIN_ENGINES`, as soon as those lit cannot throttle down to
    // what is asked — held at their least they would brake harder than the
    // plan and stop the ship above the water.
    const least = e.minThrottle ?? 1;
    if (need > 0.9 * this.engines * perEngine && this.engines < SEA_LEVEL_ENGINES.length) this.engines++;
    else if (this.engines > (settling ? 1 : LANDING_MIN_ENGINES) && need < 1.1 * least * this.engines * perEngine
      && need < 0.9 * (this.engines - 1) * perEngine) this.engines--;
    st.litEngines = ENGINE_SETS[this.engines];
    // Never quite zero while there is propellant: the engines stay lit at
    // their least, and the constant-deceleration law asks for more again.
    const throttle = fuel ? Math.max(1e-3, Math.min(1, need / (this.engines * perEngine))) : 0;
    return { nose: normalize(aThrust), belly: null, throttle, slewRate: 15 * DEG };
  }

  /** Aerodynamic acceleration of the point-mass ship flying nose along `dir`, m/s² (ECI). */
  aeroAcceleration(r: Vec3, v: Vec3, dir: Vec3, mass: number): Vec3 {
    const alt = norm(r) - R_EARTH;
    if (!(alt < 1000e3)) return v3();
    const atm = atmosphere(alt);
    return scale(descentAeroForce(this.descentTable(), this.referenceArea, dir, ShipDescent.airVelocity(r, v), atm.rho, atm.a), 1 / Math.max(1, mass));
  }

  /**
   * The point-mass model's force field for the descent: gravity, thrust along
   * the nose, and the ship's table at the attitude it is flying, lift and all.
   */
  pointMassAcceleration(thrustAccel: number, dir: Vec3, mass0: number, mdot: number, t0: number) {
    return (t: number, r: Vec3, v: Vec3): Vec3 => {
      let a = gravity(r);
      const m = Math.max(1, mass0 - mdot * (t - t0));
      if (thrustAccel > 0) a = add(a, scale(dir, thrustAccel * mass0 / m));
      return add(a, this.aeroAcceleration(r, v, dir, m));
    };
  }

  /**
   * The ship has met the water. Soft and upright is a splashdown; anything
   * else breaks it up. Either way the flight is over where it came down.
   */
  touchdown(): void {
    const sim = this.sim, s = sim.state, st = sim.vehicle.active;
    const up = normalize(s.r);
    const vGround = ShipDescent.airVelocity(s.r, s.v);
    const vertical = Math.max(0, -dot(vGround, up));
    const horizontal = norm(sub(vGround, scale(up, dot(vGround, up))));
    const tilt = Math.acos(Math.max(-1, Math.min(1, dot(s.dir, up))));
    const intact = this.phase === 'landing' && vertical <= SPLASHDOWN_LIMITS.vertical
      && horizontal <= SPLASHDOWN_LIMITS.horizontal && tilt <= SPLASHDOWN_LIMITS.tilt;
    const ll = eciToLatLon(s.r, s.theta);
    const params = {
      speed: +vertical.toFixed(1), across: +horizontal.toFixed(1), tilt: +(tilt / DEG).toFixed(1),
      lat: +(ll.lat / DEG).toFixed(2), lon: +(ll.lon / DEG).toFixed(2),
    };
    if (st) { sim.vehicle.cutoffStage(st, s.t); st.litEngines = undefined; }
    sim.event(intact ? 'evt.shipSplashdown' : 'evt.shipImpact', intact ? 'success' : 'warn', params);
    s.status = 'landed';
    s.note = intact ? 'splashdown' : 'shipLost';
    s.descentPhase = null;
    s.thrust = 0; s.throttle = 0; s.coreThrottle = 0;
  }
}

/** Gravity at radius `r`, m/s². */
function gravityAt(r: number): number {
  return G0 * (R_EARTH / r) ** 2;
}
