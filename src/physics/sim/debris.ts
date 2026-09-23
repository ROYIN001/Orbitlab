/**
 * Separated hardware: boosters, stages, fairing halves and the spent upper
 * stage, each propagated individually until impact, landing or orbit.
 * Recovered boosters fly their entry and landing burns here.
 */
import type { BoosterGroupSpec, StageSpec, EngineSpec } from '../../types';
import { G0, MU_EARTH, R_EARTH, OMEGA_EARTH, RAD } from '../constants';
import { Vec3, v3, add, sub, scale, dot, cross, norm, normalize, addScaled, clone } from '../vec3';
import { atmosphere } from '../atmosphere';
import type { RigidVehicleSnapshot } from '../rigid/mass';
import type { PartitionedRigidBody } from '../rigid/partition';
import { createRigidDebris, type RigidDebrisRuntime } from '../rigid/debris-runtime';
import { rk4Step } from '../integrator';
import { elementsFromState, eciToLatLon, propagateKepler } from '../orbital';
import type { StageState, BoosterState } from '../vehicle';
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

export class DebrisTracker {
  readonly rigidDebris = new Map<number, RigidDebrisRuntime>();

  constructor(readonly sim: Simulation) {}

  attachRigidDebris(d: Debris, body: PartitionedRigidBody, parent: RigidVehicleSnapshot, stage?: StageSpec, engineFraction = 1): void {
    const runtime = createRigidDebris(d, body, this.sim.cfg.dynamics!, parent,
      { stage, vehicleId: this.sim.cfg.vehicleId, consumed: this.sim.rigidRuntime!.consumed, engineFraction,
        runtimeOptions: { massFlowModel: this.sim.rigidRuntime!.massFlowModel, controlGains: this.sim.rigidRuntime!.controlGains,
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
    const recoverable = this.sim.vehicleSpec.recoverable && this.sim.vehicle.recoveryReserve > 0 && spec.engine.count > 1;
    for (let k = 0; k < spec.count; k++) {
      const ang = (2 * Math.PI * k) / spec.count;
      const lateral = add(scale(side, Math.cos(ang)), scale(side2, Math.sin(ang)));
      const d: Debris = {
        id: this.sim.nextDebrisId(), name: spec.name, r: addScaled(s.r, lateral, spec.diameter + 2), v: addScaled(s.v, lateral, 3),
        dir: clone(s.dir), mass: spec.dryMass + b.propellant, area: Math.PI * (spec.diameter / 2) ** 2 * 1.5, cd: 1.2,
        visual: { diameter: spec.diameter, length: spec.length, color: spec.color ?? '#ccc', conicalTop: spec.conicalTop, kind: 'booster' },
        alive: true, createdAt: s.t,
      };
      if (recoverable) d.recovery = recoveryFor(spec.engine, spec.dryMass, Math.max(0, b.propellant));
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
      visual: { diameter: spec.diameter, length: spec.length, color: spec.color ?? '#ccc', kind: 'stage' },
      alive: true, createdAt: s.t,
    };
    if (recoverable) d.recovery = recoveryFor(spec.engine, spec.dryMass, Math.max(0, st.propellant));
    this.sim.debris.push(d);
  }

  spawnFairing(r: Vec3, v: Vec3): void {
    const f = this.sim.vehicleSpec.fairing;
    if (!f) return;
    const along = normalize(this.sim.state.dir);
    let side = cross(along, normalize(r));
    if (norm(side) < 1e-6) side = cross(along, v3(1, 0, 0));
    side = normalize(side);
    for (const sgn of [1, -1]) {
      this.sim.debris.push({
        id: this.sim.nextDebrisId(), name: 'fairing', r: addScaled(r, side, sgn * (f.diameter / 2 + 1)), v: addScaled(v, side, sgn * 2.5),
        dir: along, mass: f.mass / 2, area: (f.diameter * f.length) / 2, cd: 1.5,
        visual: { diameter: f.diameter, length: f.length, color: f.color ?? '#eee', kind: 'fairing' },
        alive: true, createdAt: this.sim.state.t,
      });
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
        if (result.contact) {
          const ll = eciToLatLon(result.contact.r, this.sim.plan.gmst0 + OMEGA_EARTH * this.sim.state.t);
          d.impact = { lat: ll.lat * RAD, lon: ll.lon * RAD };
        }
        for (const event of result.events) {
          const contactEvent = event.key === 'evt.stageImpact' || event.key === 'evt.boosterLanded';
          const params = contactEvent && d.impact
            ? { ...event.params, lat: +d.impact.lat.toFixed(2), lon: +d.impact.lon.toFixed(2) }
            : event.params;
          this.sim.event(event.key, event.severity, params);
        }
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
  }
}
