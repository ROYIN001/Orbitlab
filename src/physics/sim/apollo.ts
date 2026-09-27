/**
 * Apollo's flight from the parking orbit (roadmap C01, part 6b): the
 * simulation's side of it. The Saturn V's third stage, the S-IVB, and the
 * spacecraft on it coast in the parking orbit until the restart, relight at the
 * flown time for the translunar injection (TLI), and are steered onto the conic
 * the flight left on; then the command and service module separates, turns
 * round, docks with the lunar module still in the S-IVB's adapter and pulls it
 * out, and the S-IVB is left behind.
 *
 * Flown as a point under J2 with the attitude set where each phase needs it,
 * as the far phases of a rendezvous are (G07), in both dynamics models: the
 * six-DOF ascent hands over its state at the parking orbit. Numbers and
 * sources: docs/PHYSICS.md §13.9.
 */
import type { Simulation } from '../simulation';
import { DEG, G0, MU_EARTH } from '../constants';
import { rk4Step } from '../integrator';
import { elementsFromState } from '../orbital';
import { targetAttitude } from '../rigid/runtime';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import { pointMassAcceleration } from './forces';

/**
 * Where the flight is: in the parking orbit; burning for the Moon; coasting
 * with the spacecraft still in the S-IVB; the CSM separated and turning round
 * to dock (transposition); docked to the LM in the adapter; the CSM and LM
 * extracted and on their own.
 */
export type ApolloPhase = 'parking' | 'tli' | 'translunar' | 'transposition' | 'docked' | 'extracted';

/** What a frame carries of it. */
export interface ApolloState {
  phase: ApolloPhase;
  /** mission times of the phases after the injection, s (the drawing's transposition) */
  sequence?: { panels: number; separation: number; docking: number; extraction: number };
  /** mission time of the restart, s */
  tliTime: number;
  /** the conic the injection left the stack on: C3 (m²/s²), eccentricity, inclination (deg) */
  tli?: { c3: number; e: number; inc: number };
}

/** Integration step while the engine burns, s. */
export const TLI_STEP_S = 0.2;
/** Integration step in the coasts, s: a few hundred steps an orbit under J2. */
export const APOLLO_COAST_STEP_S = 10;
/** The CSM and LM's release from the S-IVB, m/s (the ejection springs; Apollo 11 Mission Report). */
export const EXTRACTION_SPEED = 0.3;

export class ApolloFlight {
  phase: ApolloPhase = 'parking';
  started = false;
  private normal: Vec3 | null = null;
  private a = 0;
  private h = 0;
  private tli?: ApolloState['tli'];

  constructor(private readonly sim: Simulation) {}

  /** The flight's injection, when it has one. */
  get spec() { return this.sim.cfg.orbit.injection; }
  /** Flying the stack itself from the parking orbit on. */
  get active(): boolean { return this.started; }
  get burning(): boolean { return this.phase === 'tli'; }

  /** The parking orbit is reached: set the injection's target and its time. */
  begin(): void {
    const inj = this.spec;
    if (!inj || this.started) return;
    const s = this.sim.state;
    const el = elementsFromState(s.r, s.v);
    // The conic's plane, from the parking orbit's at insertion shifted as the
    // flight's was between its insertion and its injection (the nodal regression
    // between the two is in both, the flown and the modelled).
    const i = el.i + inj.inclinationShift * DEG, raan = el.raan + inj.nodeShift * DEG;
    this.normal = v3(Math.sin(i) * Math.sin(raan), -Math.sin(i) * Math.cos(raan), Math.cos(i));
    this.a = -MU_EARTH / inj.c3;
    this.h = Math.sqrt(MU_EARTH * this.a * (1 - inj.eccentricity * inj.eccentricity));
    this.started = true;
    this.phase = 'parking';
    s.note = 'parkingOrbit';
    this.sim.schedule(Math.max(s.t, inj.time), 'tliIgnition', () => this.ignite());
    const q = inj.sequence;
    if (q) {
      // the adapter's panels open first, a minute and a half before the CSM backs away
      this.sim.schedule(q.panels, 'slaPanels', () => {
        if (this.phase === 'translunar') this.sim.event('evt.slaPanels', 'success');
      });
      this.sim.schedule(q.separation, 'csmSeparation', () => {
        if (this.phase !== 'translunar') return;
        this.phase = 'transposition';
        this.sim.state.note = 'transposition';
        this.sim.event('evt.csmSeparation', 'success');
      });
      this.sim.schedule(q.docking, 'csmDocking', () => {
        if (this.phase !== 'transposition') return;
        this.phase = 'docked';
        this.sim.state.note = 'lmDocked';
        this.sim.event('evt.csmDocked', 'success');
      });
      this.sim.schedule(q.extraction, 'lmExtraction', () => {
        if (this.phase !== 'docked') return;
        this.phase = 'extracted';
        this.sim.state.note = 'extracted';
        // the CSM and LM leave the S-IVB on the ejection springs: the stage is left behind
        this.sim.staging.separatePayload(false);
        this.sim.event('evt.lmExtraction', 'success');
      });
    }
  }

  /** The S-IVB relit: its second burn's operating point, if it has its own. */
  private ignite(): void {
    const inj = this.spec, st = this.sim.vehicle.active, s = this.sim.state;
    if (!inj || !st || this.phase !== 'parking') return;
    if (inj.thrustVac !== undefined || inj.ispVac !== undefined) {
      st.spec = { ...st.spec, engine: { ...st.spec.engine, thrustVac: inj.thrustVac ?? st.spec.engine.thrustVac, ispVac: inj.ispVac ?? st.spec.engine.ispVac } };
    }
    this.sim.vehicle.igniteStage(st, s.t);
    this.sim.event('evt.ignition', 'major', this.sim.stageParams(st));
    this.phase = 'tli';
    s.note = 'tli';
  }

  /**
   * Velocity-to-be-gained steering onto the target conic: the velocity the
   * conic has at the stack's radius, in its plane, climbing, less the velocity
   * the stack has. Thrust along it takes up the plane change, the energy and
   * the flight-path angle together; below the conic's perigee radius the
   * wanted velocity is horizontal.
   */
  private steering(r: Vec3, v: Vec3): Vec3 {
    const n = this.normal!;
    const rIn = sub(r, scale(n, dot(n, r)));
    const rm = norm(r), rHat = normalize(rIn);
    const speed = Math.sqrt(Math.max(0, MU_EARTH * (2 / rm - 1 / this.a)));
    const vh = Math.min(speed, this.h / rm);
    const vr = Math.sqrt(Math.max(0, speed * speed - vh * vh));
    const want = add(scale(normalize(cross(n, rHat)), vh), scale(rHat, vr));
    const vg = sub(want, v);
    return norm(vg) > 1e-3 ? normalize(vg) : normalize(v);
  }

  step(dt: number): void {
    const sim = this.sim, s = sim.state, vehicle = sim.vehicle;
    const burning = this.burning;
    const dir = burning ? this.steering(s.r, s.v) : norm(s.v) > 1 ? normalize(s.v) : normalize(s.r);
    // an engine shut down still tails off: `thrust` gives it, whatever the command
    const thr = vehicle.thrust(s.t, 0, burning ? 1 : 0, dt);
    const mass = Math.max(1, vehicle.totalMass());
    const next = rk4Step(s.t, { r: s.r, v: s.v }, dt, pointMassAcceleration(thr.thrust / mass, dir, mass, thr.mdot, s.t, 10, true, 2.2));
    if (thr.burning) vehicle.consume(s.t, burning ? 1 : 0, dt);
    s.r = next.r; s.v = next.v; s.t += dt;
    s.dir = dir;
    s.thrust = thr.thrust; s.throttle = thr.coreThrottle; s.coreThrottle = thr.coreThrottle; s.boosterThrottle = 0;
    s.mass = vehicle.totalMass();
    s.gLoad = thr.thrust / mass / G0;
    s.elements = elementsFromState(s.r, s.v);
    if (s.rigid) s.rigid = { ...s.rigid, attitudeQ: targetAttitude(dir, normalize(s.r)), omegaBody: v3() };
    if (burning) this.checkCutoff();
  }

  /**
   * The step the burn wants: `TLI_STEP_S`, down to a hundredth of a second as
   * the speed still to gain (the tail-off counted) comes to the last few steps'
   * worth — at the end of the burn the stage gains 14 m/s² and a 0.2 s step
   * would overshoot the conic's energy by 3 m/s.
   */
  burnStep(): number {
    const s = this.sim.state;
    const aT = s.mass > 0 ? s.thrust / s.mass : 0;
    if (!(aT > 0)) return TLI_STEP_S;
    const tail = this.sim.vehicle.tailoffDeltaV(s.t, 0, s.mass);
    const toGo = (-MU_EARTH / (2 * this.a) - (dot(s.v, s.v) / 2 - MU_EARTH / norm(s.r))) / Math.max(1, norm(s.v)) - tail;
    return Math.max(0.01, Math.min(TLI_STEP_S, toGo / (5 * aT)));
  }

  /** Cut off when the energy, the tail-off counted, is the conic's; or when the stage runs dry. */
  private checkCutoff(): void {
    const sim = this.sim, s = sim.state, st = sim.vehicle.active;
    if (!st) return;
    const tail = sim.vehicle.tailoffDeltaV(s.t, 0, s.mass);
    const v = add(s.v, scale(s.dir, tail));
    const energy = dot(v, v) / 2 - MU_EARTH / norm(s.r);
    const dry = !sim.vehicle.activeHasPropellant();
    if (energy < -MU_EARTH / (2 * this.a) && !dry) return;
    sim.vehicle.cutoffStage(st, s.t);
    const el = elementsFromState(s.r, v);
    this.tli = { c3: 2 * el.energy, e: el.e, inc: el.i / DEG };
    this.phase = 'translunar';
    s.note = 'translunar';
    sim.event(dry ? 'evt.tliShort' : 'evt.tli', dry ? 'warn' : 'success',
      { c3: +(this.tli.c3 / 1e6).toFixed(3), e: +this.tli.e.toFixed(5), inc: +this.tli.inc.toFixed(3) });
  }

  /** The frame's copy. */
  frame(): ApolloState | undefined {
    if (!this.started) return undefined;
    return { phase: this.phase, tliTime: this.spec?.time ?? 0, ...(this.spec?.sequence ? { sequence: { ...this.spec.sequence } } : {}), ...(this.tli ? { tli: { ...this.tli } } : {}) };
  }
}
