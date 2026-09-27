/**
 * Separated hardware: boosters, stages, fairing halves and the spent upper
 * stage, each propagated individually until impact, landing or orbit.
 * Recovered boosters fly their entry and landing burns here.
 */
import type { BoosterGroupSpec, StageSpec, EngineSpec, TargetedRecovery } from '../../types';
import { G0, MU_EARTH, R_EARTH, OMEGA_EARTH, RAD, DEG } from '../constants';
import { Vec3, v3, add, sub, scale, dot, cross, norm, normalize, addScaled, clone, slerpLimited } from '../vec3';
import { atmosphere } from '../atmosphere';
import { landingZoneById } from '../../data/landing-zones';
import { CATCH_HORIZONTAL_SPEED, CATCH_VERTICAL_SPEED } from './return-constants';
import { groundPositionEci } from '../orbital';
import {
  boostbackCommand, brakingHeight, distanceFromTarget, ENTRY_BURN_CEILING, entryStep, landingDivert, landingEngineCount, localGravity,
  predictDescent, type DescentModel, type DescentState, type EntryState, type ReturnTarget,
} from './return-guidance';
import type { RigidVehicleSnapshot } from '../rigid/mass';
import { vehicleDataId } from '../../data/vehicles';
import type { PartitionedRigidBody } from '../rigid/partition';
import { createRigidDebris, RETURN_CONTROL_GAINS, RETURN_LANDING_LEVEL, returnPropellant, zoneLabel, type RigidDebrisRuntime } from '../rigid/debris-runtime';
import { rk4Step } from '../integrator';
import { quatFromAxisAngle, quatInverseRotate, quatMultiply, quatNormalize, quatRotate } from '../rigid/math';
import { elementsFromState, eciToLatLon, propagateKepler } from '../orbital';
import type { StageState, BoosterState } from '../vehicle';
import { targetedRecovery } from '../vehicle';
import type { Simulation } from '../simulation';
import type { Debris } from './types';
import { pointMassAcceleration } from './forces';


/**
 * Airspeed a returning stage's entry burn aims to reach, m/s. Above roughly
 * this the peak heating and dynamic pressure of the descent are what a booster
 * is flown to avoid; below it the stage rides the atmosphere down.
 */
const ENTRY_BURN_TARGET_SPEED = 1400;

/** Δv reserved for the landing burn, m/s (terminal velocity plus gravity losses). */
const LANDING_BURN_DV = 800;

/**
 * The entry burn of a stage flown back to the launch site ends lower, at this
 * airspeed, m/s. Coming down from a boostback arc the stage meets the
 * atmosphere at about 1.1–1.3 km/s, under the downrange burn's 1.4 km/s, and
 * would fly no entry burn at all — where the returning Falcon stages every
 * flight has shown do (Arabsat-6A's side boosters at T+6:11). It is also the
 * last burn that can move the landing point by more than the landing burn's
 * divert.
 */
export const RETURN_ENTRY_TARGET_SPEED = 550;

/** Turn rate of the flip after separation and of the attitude between burns, rad/s. */
const RETURN_TURN_RATE = 10 * DEG;
/** The boostback lights when the stage points within this angle of its burn. */
const BOOSTBACK_LIGHT_ANGLE = 5 * DEG;
/** Below this much velocity still to add, the boostback trims on one engine, m/s. */
const BOOSTBACK_TRIM_DV = 40;
/** The boostback is finished when this little velocity is left to add, m/s. */
const BOOSTBACK_DONE_DV = 0.3;
/** How often the boostback and entry-burn solutions are refreshed, s. */
const RETURN_REPLAN_S = 0.5;
/** Largest lean of the entry burn and the landing burn off their nominal axis. */
const ENTRY_MAX_TILT = 15 * DEG;
const LANDING_MAX_TILT = 20 * DEG;
/** Vertical speed a targeted landing burn aims to touch down at, m/s. */
const TOUCHDOWN_SPEED = 2;
/** …and into a tower's arms, gentler, well inside what the arms take (`CATCH_VERTICAL_SPEED`). */
const CATCH_APPROACH_SPEED = 1;
const touchSpeed = (target: ReturnTarget | undefined) => target?.kind === 'tower' ? CATCH_APPROACH_SPEED : TOUCHDOWN_SPEED;
/** Fraction of the landing engines' thrust the landing burn is timed for. */
const LANDING_PLANNED_THROTTLE = 0.7;
/** Radius of a drone ship's deck, m (Of Course I Still Love You: 52 × 91 m). */
const DRONE_SHIP_RADIUS = 30;

/** Engines a booster flies its boostback on: Falcon's three, Super Heavy's inner thirteen. */
export function boostbackEngineCount(e: EngineSpec): number {
  return e.count >= 20 ? 13 : Math.min(3, e.count);
}

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
  setRecoveryEngines(rc, entryEngineCount(e, dryMass, landingReserve));
  return rc;
}

/** Entry-burn engines: three, or more when three cannot give the empty stage 2.5 g. */
function entryEngineCount(e: EngineSpec, dryMass: number, landingReserve: number): number {
  return Math.min(e.count, Math.max(3, Math.ceil((2.5 * G0 * (dryMass + landingReserve)) / e.thrustSL)));
}

export class DebrisTracker {
  readonly rigidDebris = new Map<number, RigidDebrisRuntime>();

  constructor(readonly sim: Simulation) {}

  /**
   * Hand a separated body to the rigid model. `stage` is the stage it was —
   * or, for a recovered strap-on, the booster group, which the rigid model
   * then flies as a stage of its own with no attitude thrusters (its attached
   * model has none).
   */
  attachRigidDebris(d: Debris, body: PartitionedRigidBody, parent: RigidVehicleSnapshot, stage?: StageSpec | BoosterGroupSpec, engineFraction = 1): void {
    const booster = !!stage && 'count' in stage;
    if (booster && !d.recovery) stage = undefined;
    const asStage: StageSpec | undefined = stage && booster
      ? { id: stage.id, name: stage.name, dryMass: stage.dryMass, propellantMass: stage.propellantMass, engine: stage.engine,
        diameter: stage.diameter, length: stage.length, color: stage.color, gridFins: true, legs: true }
      : stage as StageSpec | undefined;
    const rc = d.recovery;
    const runtime = createRigidDebris(d, body, this.sim.cfg.dynamics!, parent,
      { stage: asStage, vehicleId: vehicleDataId(this.sim.vehicleSpec), consumed: this.sim.rigidRuntime!.consumed, engineFraction,
        withoutRcs: booster || undefined,
        returnGuidance: rc?.target ? { gmst0: this.sim.plan.gmst0, model: this.descentModel(d),
          entryTargetSpeed: rc.target.kind !== 'droneShip' ? RETURN_ENTRY_TARGET_SPEED : ENTRY_BURN_TARGET_SPEED } : undefined,
        runtimeOptions: { massFlowModel: this.sim.rigidRuntime!.massFlowModel,
          controlGains: rc?.target ? RETURN_CONTROL_GAINS : this.sim.rigidRuntime!.controlGains, fuelAwareCoast: !!rc?.target || undefined,
          integrationStepS: this.sim.rigidRuntime!.integrationStepS, derivativeStepS: this.sim.rigidRuntime!.derivativeStepS } });
    this.rigidDebris.set(d.id, runtime);
  }

  // ------------------------------------------------------------ debris
  spawnBoosterDebris(b: BoosterState): void {
    const s = this.sim.state;
    const spec: BoosterGroupSpec = b.spec;
    const up = normalize(s.r);
    const along = normalize(s.dir);
    let side = cross(along, up);
    if (norm(side) < 1e-6) side = cross(along, v3(1, 0, 0));
    side = normalize(side);
    const side2 = normalize(cross(along, side));
    const plan = this.sim.cfg.recoveryPlan;
    const recoverable = this.sim.vehicleSpec.recoverable && this.sim.vehicle.boosterRecoveryReserve > 0 && spec.engine.count > 1;
    for (let k = 0; k < spec.count; k++) {
      const ang = (2 * Math.PI * k) / spec.count;
      const lateral = add(scale(side, Math.cos(ang)), scale(side2, Math.sin(ang)));
      const d: Debris = {
        id: this.sim.nextDebrisId(), name: spec.name, r: addScaled(s.r, lateral, spec.diameter + 2), v: addScaled(s.v, lateral, 3),
        dir: clone(s.dir), mass: spec.dryMass + b.propellant, area: Math.PI * (spec.diameter / 2) ** 2 * 1.5, cd: 1.2,
        visual: { diameter: spec.diameter, length: spec.length, color: spec.color ?? '#ccc', conicalTop: spec.conicalTop, kind: 'booster' },
        alive: true, createdAt: s.t,
      };
      // A plan names the strap-ons it brings back; one it leaves out is expended.
      const mode = plan ? plan.boosters?.[k] : undefined;
      if (recoverable && (!plan || (mode && mode.kind !== 'expended'))) {
        d.recovery = recoveryFor(spec.engine, spec.dryMass, Math.max(0, b.propellant));
        if (targetedRecovery(mode)) this.planReturn(d, mode);
      }
      this.sim.debris.push(d);
    }
  }

  spawnStageDebris(st: StageState): void {
    const s = this.sim.state;
    const spec: StageSpec = st.spec;
    const recoverable = st.index === 0 && this.sim.vehicleSpec.recoverable && this.sim.vehicle.recoveryReserve > 0;
    const d: Debris = {
      id: this.sim.nextDebrisId(), name: spec.name, r: clone(s.r), v: addScaled(s.v, normalize(s.dir), -2),
      dir: clone(s.dir), mass: spec.dryMass + st.propellant, area: Math.PI * (spec.diameter / 2) ** 2 * 1.5, cd: 1.2,
      visual: { diameter: spec.diameter, length: spec.length, color: spec.color ?? '#ccc', kind: 'stage', ...(spec.profile ? { profile: spec.profile } : {}) },
      alive: true, createdAt: s.t,
    };
    if (recoverable) {
      d.recovery = recoveryFor(spec.engine, spec.dryMass, Math.max(0, st.propellant));
      const mode = this.sim.cfg.recoveryPlan?.core;
      if (targetedRecovery(mode)) this.planReturn(d, mode);
    }
    this.sim.debris.push(d);
  }

  // ------------------------------------------------------------ return
  /**
   * What the returning stage's descent looks like to the prediction: its own
   * drag and the entry burn it is going to fly. The rigid body carries J2 in
   * its gravity, the point-mass debris does not, and the prediction has to
   * agree with whichever one is flying.
   */
  descentModel(d: Debris): DescentModel {
    const rc = d.recovery!;
    const e = rc.engine;
    if (this.sim.rigidRuntime && e) {
      // The rigid stage's own burns (rigid/debris-runtime.ts): the entry on
      // the centre engine and its two opposite neighbours, the landing on the
      // centre engine alone, timed by its vacuum-stop rule.
      return {
        cd: d.cd, area: d.area, j2: true,
        entry: { thrustVac: 3 * e.thrustVac, thrustSL: 3 * e.thrustSL, mdot: (3 * e.thrustVac) / (G0 * e.ispVac),
          targetSpeed: rc.target && rc.target.kind !== 'droneShip' ? RETURN_ENTRY_TARGET_SPEED : ENTRY_BURN_TARGET_SPEED, reserve: rc.landingReserve },
        landing: { thrustVac: e.thrustVac, thrustSL: e.thrustSL, mdot: e.thrustVac / (G0 * e.ispVac), count: 1,
          level: RETURN_LANDING_LEVEL, vTouch: touchSpeed(rc.target), engines: () => 1 },
      };
    }
    const n = e ? entryEngineCount(e, d.mass - rc.propellant, rc.landingReserve) : 0;
    return {
      cd: d.cd, area: d.area, j2: !!this.sim.rigidRuntime,
      entry: e ? {
        thrustVac: n * e.thrustVac, thrustSL: n * e.thrustSL, mdot: (n * e.thrustVac) / (G0 * e.ispVac),
        targetSpeed: rc.target && rc.target.kind !== 'droneShip' ? RETURN_ENTRY_TARGET_SPEED : ENTRY_BURN_TARGET_SPEED, reserve: rc.landingReserve,
      } : undefined,
      landing: e ? {
        thrustVac: e.thrustVac, thrustSL: e.thrustSL, mdot: e.thrustVac / (G0 * e.ispVac), count: e.count,
        level: LANDING_PLANNED_THROTTLE, vTouch: touchSpeed(rc.target),
      } : undefined,
    };
  }

  /**
   * Give a recovered stage its destination. A landing zone is a fixed pad; a
   * drone ship is stationed where the stage is predicted, at separation, to
   * come down — which is how a recovery ship is placed, days ahead, from the
   * planned trajectory.
   */
  planReturn(d: Debris, mode: TargetedRecovery): void {
    const rc = d.recovery!;
    const theta = this.sim.plan.gmst0 + OMEGA_EARTH * this.sim.state.t;
    if (mode.kind === 'landingZone') {
      const zone = landingZoneById(mode.zoneId);
      const lat = zone.latitude * DEG, lon = zone.longitude * DEG;
      const ground = this.sim.groundElevation(groundPositionEci(lat, lon, 0, theta));
      rc.target = zone.kind === 'tower'
        ? { kind: 'tower', id: zone.id, lat, lon, alt: ground + (zone.catchHeight ?? 0), radius: zone.radius, catchHeight: zone.catchHeight ?? 0 }
        : { kind: 'pad', id: zone.id, lat, lon, alt: ground, radius: zone.radius };
      rc.phase = 'flip';
      return;
    }
    const surface = 0;
    const p = predictDescent({ r: d.r, v: d.v, t: this.sim.state.t, mass: d.mass, propellant: rc.propellant },
      { ...this.descentModel(d) }, surface);
    const ll = eciToLatLon(p.r, this.sim.plan.gmst0 + OMEGA_EARTH * p.t);
    const alt = this.sim.groundElevation(groundPositionEci(ll.lat, ll.lon, 0, this.sim.plan.gmst0 + OMEGA_EARTH * p.t));
    rc.target = { kind: 'droneShip', id: 'droneShip', lat: ll.lat, lon: ll.lon, alt, radius: DRONE_SHIP_RADIUS };
    // A rigid stage with no cold gas left cannot turn during its coast; it
    // turns on its centre engine first (rigid/debris-runtime.ts), and the
    // ship is stationed again on the trajectory that turn leaves it on.
    if (this.sim.rigidRuntime) rc.phase = 'flip';
  }

  /** The stage as the prediction sees it, with the propellant it will carry into the entry burn (`returnPropellant`). */
  private descentState(d: Debris, t: number): DescentState {
    const rc = d.recovery!;
    const entry: EntryState = rc.phase === 'entry' ? (rc.entryFlown ? 'burning' : 'armed') : rc.phase === 'landing' ? 'done' : 'pending';
    const propellant = rc.engine ? returnPropellant(rc, d.mass, rc.engine.ispVac) : rc.propellant;
    return { r: d.r, v: d.v, t, mass: d.mass - (rc.propellant - propellant), propellant, entry };
  }

  /**
   * The boostback (or entry-burn correction) solution, refreshed every
   * `RETURN_REPLAN_S` — or every step once the burn is down to its trim, where
   * the last metres per second are decided.
   */
  private returnSolution(d: Debris, t: number, every: number) {
    const rc = d.recovery!;
    const memo = rc.guidance;
    if (memo && t - memo.t < every - 1e-9) return memo;
    const c = boostbackCommand(this.descentState(d, t), this.descentModel(d), rc.target!, this.sim.plan.gmst0);
    rc.guidance = { t, dir: c.dir, dvNeeded: c.dvNeeded, miss: c.miss, trim: memo?.trim ?? false, lateral: memo?.lateral };
    return rc.guidance;
  }

  /**
   * One step of a point-mass stage flown to a target: flip, boostback, coast,
   * entry burn and a landing burn that steers onto the target. Sub-stepped
   * finely while it burns, so a burn ends within a tenth of a second of where
   * its guidance wants it to.
   */
  private stepReturning(d: Debris, dt: number): void {
    const rc = d.recovery!, target = rc.target!, sim = this.sim, gmst0 = sim.plan.gmst0;
    const omega = v3(0, 0, OMEGA_EARTH);
    let t = sim.state.t - dt, remaining = dt;
    while (remaining > 1e-9 && d.alive) {
      const alt = norm(d.r) - R_EARTH;
      const up = normalize(d.r);
      const air = sub(d.v, cross(omega, d.r));
      const speed = norm(air);
      const retro = speed > 1 ? scale(air, -1 / speed) : up;
      const vDown = -dot(air, up);
      const pressure = Math.min(1, atmosphere(Math.max(0, alt)).p / 101325);
      const thrustOf = (level: number) => (rc.thrustVac - (rc.thrustVac - rc.thrustSL) * pressure) * level;
      let h = Math.min(remaining, alt < 20e3 || rc.phase === 'boostback' || rc.phase === 'flip' ? 0.1 : 0.5);
      // The last hundred metres of a landing burn in fine steps: the burn
      // cycles on and off below its engines' minimum thrust, and a tenth of a
      // second of it is 1.5 m/s at the surface — the whole margin a tower's
      // arms allow.
      if (rc.landingStarted && alt - target.alt < 100) h = Math.min(h, 0.02);
      let level = 0;
      let dir = d.dir;
      if (rc.propellant <= 0) rc.phase = rc.phase === 'flip' || rc.phase === 'boostback' ? 'coast' : rc.phase;
      switch (rc.phase) {
        case 'flip': {
          const g = this.returnSolution(d, t, RETURN_REPLAN_S);
          dir = slerpLimited(d.dir, g.dir, RETURN_TURN_RATE * h);
          if (Math.acos(Math.max(-1, Math.min(1, dot(dir, g.dir)))) < BOOSTBACK_LIGHT_ANGLE) {
            rc.phase = 'boostback';
            setRecoveryEngines(rc, rc.engine ? boostbackEngineCount(rc.engine) : 1);
            sim.event('evt.boostbackStart', 'info', { name: d.name });
          }
          break;
        }
        case 'boostback': {
          // The trim ends once the predicted miss stops shrinking. The Δv still
          // needed is no guide there: it comes from a finite-difference
          // Jacobian of a stepped descent and wobbles by a metre per second
          // or two, which once cut a boostback 40 m/s short (4.5 km long).
          const before = rc.guidance?.miss ?? Infinity;
          const g = this.returnSolution(d, t, rc.guidance?.trim ? 0 : RETURN_REPLAN_S);
          const spent = rc.propellant <= rc.landingReserve;
          if (g.dvNeeded < BOOSTBACK_DONE_DV || spent || (g.trim && (g.miss ?? 0) > before + 1)) {
            rc.phase = 'coast';
            rc.guidance = undefined;
            rc.burning = false;
            if (rc.engine) setRecoveryEngines(rc, entryEngineCount(rc.engine, d.mass - rc.propellant, rc.landingReserve));
            sim.event('evt.boostbackEnd', 'info', { name: d.name });
            break;
          }
          if (!g.trim && g.dvNeeded < BOOSTBACK_TRIM_DV) {
            g.trim = true;
            setRecoveryEngines(rc, 1);
          }
          level = 1;
          const a = thrustOf(1) / d.mass;
          if (g.trim && a > 0) h = Math.max(1e-3, Math.min(h, g.dvNeeded / a));
          h = Math.min(h, Math.max(1e-3, (rc.propellant - rc.landingReserve) / Math.max(1e-9, rc.mdot)));
          dir = g.dir;
          break;
        }
        case 'coast':
          if (vDown > 0 && alt < ENTRY_BURN_CEILING) {
            rc.phase = 'entry';
            rc.guidance = undefined;
          } else if (vDown > 0) h = Math.min(h, Math.max(0.01, (alt - ENTRY_BURN_CEILING) / vDown + 1e-3));
          dir = slerpLimited(d.dir, retro, RETURN_TURN_RATE * h);
          break;
        case 'entry': {
          const targetSpeed = target.kind !== 'droneShip' ? RETURN_ENTRY_TARGET_SPEED : ENTRY_BURN_TARGET_SPEED;
          const step = entryStep(rc.entryFlown ? 'burning' : 'armed', vDown > 0, alt, speed, rc.propellant,
            { targetSpeed, reserve: rc.landingReserve });
          if (step.burn) {
            if (!rc.entryFlown) sim.event('evt.entryBurnStart', 'info', { name: d.name });
            rc.entryFlown = true;
            level = 1;
            const aT = thrustOf(1) / d.mass;
            const g = this.returnSolution(d, t, RETURN_REPLAN_S);
            // The horizontal velocity the solution still wants, spread over
            // the rest of the burn and held to a modest lean.
            const tau = Math.max(3, (speed - targetSpeed) / Math.max(1, aT));
            let lateral = scale(g.dir, g.dvNeeded / tau);
            const cap = aT * Math.tan(ENTRY_MAX_TILT);
            if (norm(lateral) > cap) lateral = scale(normalize(lateral), cap);
            dir = normalize(add(scale(retro, aT), lateral));
            h = Math.min(h, Math.max(0.02, (speed - targetSpeed) / Math.max(1, aT)),
              Math.max(1e-3, (rc.propellant - rc.landingReserve) / Math.max(1e-9, rc.mdot)));
          } else if (step.state === 'armed') {
            dir = slerpLimited(d.dir, retro, RETURN_TURN_RATE * h);
          } else {
            rc.phase = 'landing';
            rc.guidance = undefined;
            if (rc.engine) setRecoveryEngines(rc, landingEngineCount(rc.engine.thrustSL, rc.engine.count, d.mass));
            dir = retro;
          }
          break;
        }
        case 'landing': {
          const hAgl = Math.max(0.5, alt - target.alt);
          const gLocal = localGravity(d.r);
          const T = thrustOf(1);
          const minimum = rc.engine?.minThrottle ?? 1;
          if (!rc.landingStarted && vDown > 0 && alt < 20e3) {
            const stop = brakingHeight({ alt, surfaceAlt: target.alt, vDown, vTouch: touchSpeed(target), mass: d.mass,
              thrust: (y) => (rc.thrustVac - (rc.thrustVac - rc.thrustSL) * Math.min(1, atmosphere(Math.max(0, y)).p / 101325)) * LANDING_PLANNED_THROTTLE,
              flow: rc.mdot * LANDING_PLANNED_THROTTLE, cd: d.cd, area: d.area, gravity: gLocal });
            if (hAgl < 1.1 * stop + 10) {
              rc.landingStarted = true;
              sim.event('evt.landingBurnStart', 'info', { name: d.name });
            }
          }
          if (rc.landingStarted) {
            const vTouch = touchSpeed(target);
            const aV = gLocal + Math.max(0, vDown * vDown - vTouch ** 2) / (2 * hAgl);
            const tgo = (2 * hAgl) / Math.max(1, vDown + vTouch);
            const aH = landingDivert(d.r, d.v, target, gmst0, t, tgo, aV, LANDING_MAX_TILT);
            const aCmd = add(scale(up, aV), aH);
            const want = (d.mass * norm(aCmd)) / Math.max(1, T);
            dir = normalize(aCmd);
            // Below the engine's minimum the stage cannot throttle down any
            // further: it coasts until the profile asks for thrust again.
            level = want >= minimum ? Math.min(1, want) : 0;
          } else dir = slerpLimited(d.dir, retro, RETURN_TURN_RATE * h);
          break;
        }
      }
      const burning = level > 0 && rc.propellant > 0;
      rc.burning = burning || (rc.phase === 'landing' && !!rc.landingStarted);
      const thrust = burning ? thrustOf(level) : 0;
      const flow = burning ? rc.mdot * level : 0;
      if (flow > 0) h = Math.min(h, Math.max(1e-3, rc.propellant / flow));
      const next = rk4Step(0, { r: d.r, v: d.v }, h, pointMassAcceleration(thrust / d.mass, dir, d.mass, flow, 0, d.area, false, d.cd));
      d.r = next.r;
      d.v = next.v;
      d.dir = dir;
      d.mass -= flow * h;
      rc.propellant = Math.max(0, rc.propellant - flow * h);
      t += h;
      remaining -= h;
      const altN = norm(d.r) - R_EARTH;
      const ground = sim.groundElevation(d.r);
      if (target.kind === 'tower' && !rc.catchPassed && altN <= target.alt) this.catchAttempt(d, t);
      if (!d.alive) break;
      if (altN <= ground) this.touchdown(d, t);
      else if (t - d.createdAt > 3 * 3600) d.alive = false;
    }
  }

  /**
   * The booster's base has come down to the height the tower's arms hold it
   * at. Inside their envelope, slow and upright enough, the arms close on it
   * (`evt.boosterCaught`); too fast, it hits them. Outside the envelope it
   * falls on past them to the ground.
   */
  private catchAttempt(d: Debris, t: number): void {
    const rc = d.recovery!, target = rc.target!;
    const miss = distanceFromTarget(d.r, target, this.sim.plan.gmst0, t);
    if (miss > target.radius) { rc.catchPassed = true; return; }
    const up = normalize(d.r);
    const ground = sub(d.v, cross(v3(0, 0, OMEGA_EARTH), d.r));
    const vertical = -dot(ground, up), horizontal = norm(sub(ground, scale(up, -vertical)));
    const caught = vertical <= CATCH_VERTICAL_SPEED && horizontal <= CATCH_HORIZONTAL_SPEED;
    this.finishCatch(d, t, miss, caught);
  }

  private finishCatch(d: Debris, t: number, miss: number, caught: boolean): void {
    const rc = d.recovery!;
    d.alive = false;
    d.restT = t;
    rc.burning = false;
    rc.missDistance = miss;
    const ll = eciToLatLon(d.r, this.sim.plan.gmst0 + OMEGA_EARTH * t);
    d.impact = { lat: ll.lat * RAD, lon: ll.lon * RAD };
    d.outcome = caught ? 'landed' : 'impact';
    rc.landed = caught;
    rc.caught = caught;
    const at = { lat: +d.impact.lat.toFixed(2), lon: +d.impact.lon.toFixed(2) };
    if (caught) this.sim.event('evt.boosterCaught', 'success', { name: d.name, ...at });
    else this.sim.event('evt.stageImpact', 'info', { name: d.name, ...at, miss: Math.round(miss) });
  }

  /** Contact with the ground or the sea: a landing, on target or not, or an impact. */
  private touchdown(d: Debris, t: number): void {
    const rc = d.recovery!, target = rc.target!;
    d.alive = false;
    d.restT = t;
    rc.burning = false;
    const theta = this.sim.plan.gmst0 + OMEGA_EARTH * t;
    const ll = eciToLatLon(d.r, theta);
    d.impact = { lat: ll.lat * RAD, lon: ll.lon * RAD };
    const speed = norm(sub(d.v, cross(v3(0, 0, OMEGA_EARTH), d.r)));
    const miss = distanceFromTarget(d.r, target, this.sim.plan.gmst0, t);
    rc.missDistance = miss;
    const at = { lat: +d.impact.lat.toFixed(2), lon: +d.impact.lon.toFixed(2) };
    // A booster without legs, meant for a tower's arms, does not land on the ground.
    const soft = speed < 12 && target.kind !== 'tower';
    const onTarget = miss <= target.radius;
    // Off a drone ship's deck is the open sea.
    if (soft && (onTarget || target.kind === 'pad')) {
      d.outcome = 'landed';
      rc.landed = true;
      if (onTarget) this.sim.event(target.kind === 'droneShip' ? 'evt.boosterLandedShip' : 'evt.boosterLandedZone', 'success',
        { name: d.name, zone: zoneLabel(target), ...at });
      else this.sim.event('evt.boosterLanded', 'success', { name: d.name, ...at, miss: Math.round(miss) });
    } else {
      d.outcome = 'impact';
      this.sim.event('evt.stageImpact', 'info', { name: d.name, ...at, miss: Math.round(miss) });
    }
  }

  spawnFairing(r: Vec3, v: Vec3): void {
    const f = this.sim.vehicleSpec.fairing;
    if (!f) return;
    // a fairing with its own adapter cone narrows to the stage it stood on
    const adapter = f.adapter ? [...this.sim.vehicleSpec.stages].reverse().find((st) => !st.isSpacecraft) : undefined;
    const along = normalize(this.sim.state.dir);
    let side = cross(along, normalize(r));
    if (norm(side) < 1e-6) side = cross(along, v3(1, 0, 0));
    side = normalize(side);
    for (const sgn of [1, -1]) {
      this.sim.debris.push({
        id: this.sim.nextDebrisId(), name: 'fairing', r: addScaled(r, side, sgn * (f.diameter / 2 + 1)), v: addScaled(v, side, sgn * 2.5),
        dir: along, mass: f.mass / 2, area: (f.diameter * f.length) / 2, cd: 1.5,
        visual: { diameter: f.diameter, length: f.length, color: f.color ?? '#eee', kind: 'fairing', ...(adapter ? { adapter: f.adapter, baseDiameter: adapter.diameter } : {}) },
        alive: true, createdAt: this.sim.state.t,
      });
    }
  }

  /**
   * A stage that has landed — on a pad, a drone ship's deck, a tower's arms —
   * stays where it came down: it turns with the Earth, which is all that
   * moves it, rather than staying put in inertial space and sliding off the
   * pad at the speed of the ground. It is turned from the instant it came to
   * rest, which is part-way through the step that landed it, to the end of
   * the current step.
   */
  private rest(d: Debris): void {
    const now = this.sim.state.t;
    const from = d.restT ?? now;
    if (now > from) DebrisTracker.rideWithEarth(d, now - from);
    d.restT = now;
  }

  private static rideWithEarth(d: Debris, dt: number): void {
    const turn = quatFromAxisAngle(v3(0, 0, 1), OMEGA_EARTH * dt);
    d.r = quatRotate(turn, d.r);
    d.v = cross(v3(0, 0, OMEGA_EARTH), d.r);
    d.dir = quatRotate(turn, d.dir);
    if (d.rigid) {
      const attitudeQ = quatNormalize(quatMultiply(turn, d.rigid.attitudeQ));
      d.rigid = { ...d.rigid, attitudeQ, omegaBody: quatInverseRotate(attitudeQ, v3(0, 0, OMEGA_EARTH)) };
    }
  }

  stepDebris(dt: number): void {
    const omega = v3(0, 0, OMEGA_EARTH);
    for (const d of this.sim.debris) {
      if (!d.alive) continue;
      const rigid = this.rigidDebris.get(d.id);
      if (rigid) {
        const from = Math.max(d.createdAt, this.sim.state.t - dt);
        const result = rigid.step(from, Math.max(0, this.sim.state.t - from), r => this.sim.groundElevation(r));
        if (result.contactTime !== undefined) d.restT = result.contactTime;
        if (result.contact) {
          const ll = eciToLatLon(result.contact.r, this.sim.plan.gmst0 + OMEGA_EARTH * this.sim.state.t);
          d.impact = { lat: ll.lat * RAD, lon: ll.lon * RAD };
        }
        for (const event of result.events) {
          const contactEvent = event.key === 'evt.stageImpact' || event.key === 'evt.boosterLanded'
            || event.key === 'evt.boosterLandedZone' || event.key === 'evt.boosterLandedShip' || event.key === 'evt.boosterCaught';
          const params = contactEvent && d.impact
            ? { ...event.params, lat: +d.impact.lat.toFixed(2), lon: +d.impact.lon.toFixed(2) }
            : event.params;
          this.sim.event(event.key, event.severity, params);
        }
        // A passive body in a lasting orbit only drifts: nothing acts on its
        // rotation there, and control ticks for the rest of a day-long
        // transfer would cost more than the whole ascent. Hand it to the Kepler
        // path below, which keeps checking that the orbit lasts; its recorded
        // attitude stays where the rigid body left it.
        if (d.alive && !d.recovery && norm(d.r) - R_EARTH > 140e3) {
          const el = elementsFromState(d.r, d.v);
          if (el.e < 1 && el.periapsisAlt > 120e3) {
            d.outcome = 'orbit';
            this.rigidDebris.delete(d.id);
          }
        }
        continue;
      }
      if (d.recovery?.target && d.alive) {
        this.stepReturning(d, dt);
        continue;
      }
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
            const hAgl = Math.max(0.5, altK - this.sim.groundElevation(d.r));
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
        const next = rk4Step(0, { r: d.r, v: d.v }, h, pointMassAcceleration(thrustAccel, thrustDir, d.mass, 0, 0, d.area, false, d.cd));
        d.r = next.r;
        d.v = next.v;
        if (vAirMag > 1 && d.recovery) d.dir = scale(vAir, -1 / vAirMag);
        const altN = norm(d.r) - R_EARTH;
        const vImpactNow = norm(sub(d.v, cross(omega, d.r)));
        const ground = this.sim.groundElevation(d.r);
        const touchdown = altN <= ground || (altN <= ground + 3 && d.recovery !== undefined && vImpactNow < 12);
        if (touchdown) {
          d.alive = false;
          d.restT = this.sim.state.t - dt + (k + 1) * h;
          const ll = eciToLatLon(d.r, this.sim.state.theta);
          d.impact = { lat: ll.lat * RAD, lon: ll.lon * RAD };
          const vImpact = vImpactNow;
          if (d.recovery && vImpact < 12) {
            d.outcome = 'landed';
            d.recovery.landed = true;
            this.sim.event('evt.boosterLanded', 'success', { name: d.name, lat: +d.impact.lat.toFixed(2), lon: +d.impact.lon.toFixed(2) });
          } else {
            d.outcome = 'impact';
            if (d.visual.kind !== 'fairing') this.sim.event('evt.stageImpact', 'info', { name: d.name, lat: +d.impact.lat.toFixed(2), lon: +d.impact.lon.toFixed(2) });
          }
        } else if (this.sim.state.t - d.createdAt > 3 * 3600) {
          d.alive = false;
        } else if (altN > 140e3) {
          const el = elementsFromState(d.r, d.v);
          if (el.e < 1 && el.periapsisAlt > 120e3) d.outcome = 'orbit';
        }
      }
    }
    for (const d of this.sim.debris) if (!d.alive && d.outcome === 'landed') this.rest(d);
  }
}
