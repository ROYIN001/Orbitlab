/**
 * Apollo's flight from the parking orbit (roadmap C01): the simulation's side
 * of it. The Saturn V's third stage, the S-IVB, and the spacecraft on it coast
 * in the parking orbit, the stage's hydrogen venting behind them; it relights
 * at the flown time for the translunar injection (TLI) and is steered onto the
 * conic the flight left on (`TliGuidance`); the command and service module
 * separates, turns round, docks with the lunar module still in the S-IVB's
 * adapter and pulls it out, and the S-IVB is left behind. The two spacecraft
 * then fly on to the Moon: the service propulsion system's evasive burn away
 * from the S-IVB, the three days' coast with the Moon and the Sun pulling, the
 * midcourse correction aimed at the lunar orbit the landing needs, and the
 * Moon's sphere of influence, to the moment of the lunar orbit insertion.
 *
 * Flown as a point with the attitude set where each phase needs it, as the far
 * phases of a rendezvous are (G07), in both dynamics models: the six-DOF ascent
 * hands over its state at the parking orbit. Numbers and sources:
 * docs/PHYSICS.md §13.9 and §13.10.
 */
import type { Simulation } from '../simulation';
import { DEG, G0, MU_EARTH, OMEGA_EARTH, R_EARTH } from '../constants';
import { rk4Step } from '../integrator';
import { elementsFromState } from '../orbital';
import { targetAttitude } from '../rigid/runtime';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import { engineStartupS, engineTailoffS } from '../vehicle';
import { APOLLO11, DPS, LM_RCS, SM_RCS, SPS } from '../../data/apollo11';
import { LUNAR_SOI, cislunarStep, coastToPerilune, lunarOrbit, lunisolar, targetMidcourse, type LunarAim } from '../lunar/cislunar';
import { MU_MOON, moonState, R_MOON } from '../lunar/ephemeris';
import { eciToSelenographic, selenographicToEci } from '../lunar/orientation';
import { pointMassAcceleration } from './forces';
import { PoweredDescent, type DescentPhase } from './apollo-descent';
import { gravityJ2 } from '../gravity';
import { TliGuidance } from './tli-guidance';
import { CHUTES, EI_ALT, EntryGuidance, airVelocity, cmAerodynamics, coastToEntryInterface, earthFixed, entryAcceleration, opened, perigeeOfEntry, targetEntry } from './apollo-entry';
import { AscentGuidance, apsPoint, brakingAcceleration, cdhImpulse, closingSpeed, csiImpulse, elevation, heightBelow, interceptImpulse,
  STATIONKEEPING_M, type OrbitState } from './apollo-rendezvous';

/**
 * Where the flight is: in the parking orbit; burning for the Moon; coasting
 * with the spacecraft still in the S-IVB; the CSM separated and turning round
 * to dock (transposition); docked to the LM in the adapter; the CSM and LM
 * pulled out; the evasive burn; the coast; the midcourse correction; inside
 * the Moon's sphere of influence; the lunar orbit insertion; in lunar orbit;
 * the circularization.
 */
export type ApolloPhase = 'parking' | 'tli' | 'translunar' | 'transposition' | 'docked' | 'extracted'
  | 'evasive' | 'coast' | 'midcourse' | 'approach' | 'loi' | 'lunarOrbit' | 'circularize'
  | 'undocked' | 'doi' | 'descentOrbit' | 'descent' | 'landed'
  | 'ascent' | 'lmOrbit' | 'csi' | 'cdh' | 'tpi' | 'lmMidcourse' | 'terminal' | 'braking' | 'stationkeeping'
  | 'redocked' | 'csmOrbit'
  | 'tei' | 'transearth' | 'returnMidcourse' | 'cmSeparated' | 'entry' | 'drogues' | 'mains' | 'splashdown';

/** The phases with the CSM and LM out of the S-IVB, docked nose to nose. */
export const APOLLO_DOCKED: readonly ApolloPhase[] = ['extracted', 'evasive', 'coast', 'midcourse', 'approach', 'loi', 'lunarOrbit', 'circularize'];
/** The lunar module on its own, the flight followed with it: undocked, its descent, on the Moon. */
export const APOLLO_LM: readonly ApolloPhase[] = ['undocked', 'doi', 'descentOrbit', 'descent', 'landed'];
/** The ascent stage on its own, the descent stage left on the Moon: the ascent, the rendezvous's burns and coasts. */
export const APOLLO_ASCENT: readonly ApolloPhase[] = ['ascent', 'lmOrbit', 'csi', 'cdh', 'tpi', 'lmMidcourse', 'terminal', 'braking', 'stationkeeping'];
/** The CSM, the flight followed with it again: docked with the ascent stage, then on its own. */
export const APOLLO_CSM_BACK: readonly ApolloPhase[] = ['redocked', 'csmOrbit'];
/** The CSM on its way home: the transearth injection, the coast, its correction. */
export const APOLLO_HOME: readonly ApolloPhase[] = ['tei', 'transearth', 'returnMidcourse'];
/** The command module on its own: to the entry interface, through the air, under its parachutes, in the water. */
export const APOLLO_CM: readonly ApolloPhase[] = ['cmSeparated', 'entry', 'drogues', 'mains', 'splashdown'];
/** The phases with the spacecraft out of the S-IVB. */
export const APOLLO_OUT: readonly ApolloPhase[] = [...APOLLO_DOCKED, ...APOLLO_LM, ...APOLLO_ASCENT, ...APOLLO_CSM_BACK, ...APOLLO_HOME, ...APOLLO_CM];
/** The phases at the Moon: from its sphere of influence on, heights and speeds are the Moon's. */
export const APOLLO_AT_MOON: readonly ApolloPhase[] = ['approach', 'loi', 'lunarOrbit', 'circularize', ...APOLLO_LM, ...APOLLO_ASCENT, ...APOLLO_CSM_BACK, 'tei'];

/** What a frame carries of it. */
export interface ApolloState {
  phase: ApolloPhase;
  /** mission times of the phases after the injection, s (the drawing's transposition) */
  sequence?: { panels: number; separation: number; docking: number; extraction: number };
  /** mission time of the restart, s */
  tliTime: number;
  /** the conic the injection left the stack on: C3 (m²/s²), eccentricity, inclination and argument of perigee (deg) */
  tli?: { c3: number; e: number; inc: number; argp: number };
  /**
   * The closest approach to the Moon the flight is on, predicted after its last
   * manoeuvre: altitude above the landing site's radius (m), mission time (s),
   * selenographic latitude and longitude (deg).
   */
  perilune?: { alt: number; t: number; lat: number; lon: number };
  /** the midcourse correction's burn, when it has been worked out: Δv, m/s */
  mcc?: { dv: number };
  /** the Moon from the spacecraft: its height above the landing site's radius, as the Mission Report gives heights (m), and its speed relative to the Moon (m/s) */
  moon: { alt: number; speed: number };
  /** mission time of the next burn or milestone the flight is timed to, s (0 when none) */
  next: number;
  /**
   * In lunar orbit, the osculating one: apolune and perilune above the landing
   * site's radius (m), inclination to the Moon's equator (deg); and the burns
   * into it, their Δv (m/s), and when the circularization ended (s).
   */
  lunar?: { ap: number; pe: number; inc: number; loi?: number; loi2?: number; circularized?: number };
  /** the command and service module, flying on its own from the undocking: its position and velocity (ECI, m, m/s) */
  csm?: { r: Vec3; v: Vec3 };
  /**
   * The powered descent: its program, whether the engine is at its fixed
   * throttle position, its thrust as a fraction of its rating, the height over
   * the landing site's ground (m), the distance to the site over the surface
   * (m), the speed over the ground and the rate of descent (m/s).
   */
  descent?: { phase: DescentPhase; ftp: boolean; throttle: number; alt: number; range: number; vh: number; vz: number };
  /** on the Moon: where (selenographic, deg), how far from Tranquility Base's published position (m), and when (s) */
  landed?: { lat: number; lon: number; miss: number; t: number };
  /**
   * The rendezvous: the CSM's distance from the ascent stage (m), the rate it
   * closes at (m/s), the height of the CSM's orbit over the LM (m) and its
   * elevation above the LM's horizon (deg).
   */
  rendezvous?: { range: number; closing: number; dh: number; elevation: number };
  /** the ascent stage after its jettison: its state (ECI, m, m/s) */
  ascentStage?: { r: Vec3; v: Vec3 };
  /** the docking axis while the two are docked again, from the CSM to the ascent stage (ECI, unit) */
  dockAxis?: Vec3;
  /** the service module after the CM's separation from it: its state (ECI, m, m/s) */
  serviceModule?: { r: Vec3; v: Vec3 };
  /**
   * The command module coming home: its bank angle (deg), the load on it and
   * the most so far (g), and its parachutes open, 0..1 each; the entry
   * interface ahead, predicted after the last burn: its flight-path angle (deg)
   * and time (s).
   */
  entry?: { bank: number; load: number; maxLoad: number; drogue: number; main: number };
  interfaceAhead?: { fpa: number; t: number };
  /** in the water: where (deg) and when (s) */
  splash?: { lat: number; lon: number; t: number };
}

/** Integration step while the engine burns, s. */
export const TLI_STEP_S = 0.2;
/** Integration step in the coasts near the Earth, s: a few hundred steps an orbit under J2. */
export const APOLLO_COAST_STEP_S = 10;
/** The CSM and LM's release from the S-IVB, m/s (the ejection springs; Apollo 11 Mission Report). */
export const EXTRACTION_SPEED = 0.3;
/** The contact probes under the LM's footpads, m (67 in). */
const LM_PROBE = 1.70;
/** Integration step while the service propulsion system burns, s, at most. */
const SPS_STEP_S = 0.25;
/**
 * The ascent stage's and the CSM's reference points apart when docked, m: the
 * ascent stage's base to its docking tunnel's top (3.4 m), the CSM's service
 * module's aft face to its probe's tip (7.5 m) — the drawing's lengths.
 */
export const DOCKED_RANGE = 10.9;
/** The last approach from station-keeping to the docking, m/s. */
const DOCKING_SPEED = 0.1;
/** The ascent stage's drift from the CSM at its jettison, m/s (the model's). */
const JETTISON_SPEED = 0.3;
/** The service module's drift back from the CM at their separation, m/s, its mass (kg, 14,549 lb, MR Table A-I) and the height it breaks up at, m (the model's). */
const SM_DRIFT = 1;
const SM_MASS = 14549.0 * 0.45359237;
const SM_BREAKUP = 70e3;

/**
 * A lunar orbit a burn is steered into: its energy (m²/s²), semi-major axis
 * (m) and angular momentum (m²/s), and its plane's normal (ECI); flown against
 * the velocity, the energy ending it (`retrograde`), or onto the orbit's
 * velocity where the stack is.
 */
interface LunarTarget { energy: number; a: number; h: number; n: Vec3; rp: number; retrograde?: boolean; pitch?: number }

/**
 * A service-propulsion burn: along a fixed inertial direction until its Δv is
 * in; or, into a lunar orbit, steered onto it until the energy is the orbit's.
 */
interface SpsBurn {
  kind: 'evasive' | 'midcourse' | 'loi' | 'circularize' | 'tei' | 'returnMidcourse';
  dir: Vec3; dv: number; done: number; next: ApolloPhase; target?: LunarTarget;
  /** the engine, when not the service engine (the transearth correction's thrusters) */
  engine?: { thrust: number; isp: number };
}

export class ApolloFlight {
  phase: ApolloPhase = 'parking';
  started = false;
  private a = 0;
  private tli?: ApolloState['tli'];
  private guidance?: TliGuidance;
  /** the vent's impulse over the coast, N·s, for the mass it carries away */
  private ventImpulse = 0;
  private sps?: SpsBurn;
  private perilune?: ApolloState['perilune'];
  private mcc?: ApolloState['mcc'];
  private soiEntered = false;
  private lastMoon?: { t: number; d: number };
  private lunar?: { loi?: number; loi2?: number; circularized?: number };
  /** the CSM after the undocking, relative to nothing: its own state (ECI) */
  private csm?: { r: Vec3; v: Vec3 };
  /** the descent engine's burn into the descent orbit: its Δv so far */
  private doiDone = 0;
  private descent?: PoweredDescent;
  private contact?: number;
  private landed?: { lat: number; lon: number; miss: number; t: number; r: Vec3 };
  private ascentGuidance?: AscentGuidance;
  /** a rendezvous burn on the LM's thrusters: along a fixed direction until its Δv is in */
  private rcs?: { dir: Vec3; dv: number; done: number; next: ApolloPhase };
  private cdhDone = false;
  /** the terminal phase's intercept time, and the midcourse corrections still to come */
  private intercept?: number;
  private dockAxis?: Vec3;
  private ascentStage?: OrbitState;
  private teiDv?: Vec3;
  private interfaceAhead?: { fpa: number; t: number };
  private serviceModule?: OrbitState;
  private entryGuidance?: EntryGuidance;
  private entryState = { bank: 0, load: 0, maxLoad: 0, drogue: 0, main: 0 };
  private chuteAt = { drogue: 0, main: 0 };
  private splash?: { lat: number; lon: number; t: number };

  constructor(private readonly sim: Simulation) {}

  /** The flight's injection, when it has one. */
  get spec() { return this.sim.cfg.orbit.injection; }
  /** Flying the stack itself from the parking orbit on. */
  get active(): boolean { return this.started; }
  /** The S-IVB's burn for the Moon. */
  get burning(): boolean { return this.phase === 'tli'; }
  /** The service propulsion system's burn. */
  get spsBurning(): boolean { return !!this.sps; }
  /** The Moon's state now, and the stack's relative to it. */
  private moonRel(t: number, r: Vec3, v: Vec3): { moon: { r: Vec3; v: Vec3 }; r: Vec3; v: Vec3 } {
    const moon = moonState(this.jd0 + t / 86400);
    return { moon, r: sub(r, moon.r), v: sub(v, moon.v) };
  }

  /** Past the injection and away from the Earth: the coast's step follows the nearer body. */
  get cislunar(): boolean { return APOLLO_OUT.includes(this.phase) && !this.sps; }

  private get jd0(): number { return this.sim.plan.jd0; }

  /** The parking orbit is reached: set the injection's target and its time. */
  begin(): void {
    const inj = this.spec;
    if (!inj || this.started) return;
    const s = this.sim.state;
    this.a = -MU_EARTH / inj.c3;
    this.started = true;
    this.phase = 'parking';
    s.note = 'parkingOrbit';
    if (inj.vent) {
      const k = inj.vent.thrust;
      for (let i = 1; i < k.length; i++) this.ventImpulse += ((k[i][1] + k[i - 1][1]) / 2) * (k[i][0] - k[i - 1][0]);
    }
    this.sim.schedule(Math.max(s.t, inj.time), 'tliIgnition', () => this.ignite());
    if (inj.mixture) this.sim.schedule(inj.mixture.t, 'tliMixture', () => this.shiftMixture());
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
        // the CSM and LM leave the S-IVB on the ejection springs: the stage, the adapter's ring with it, is
        // left behind, and what flies on is the two spacecraft as they were weighed at the ejection
        this.sim.staging.separatePayload(false);
        this.sim.vehicle.payloadMass = APOLLO11.dockedMass;
        this.sim.state.mass = this.sim.vehicle.totalMass();
        this.sim.event('evt.lmExtraction', 'success');
        this.planLunarFlight();
      });
    }
  }

  /** The S-IVB relit, at its second burn's operating point; its steering solved for the whole burn. */
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
    const e = st.spec.engine, n = e.count;
    const points = [{ from: s.t, thrust: e.thrustVac * n, isp: e.ispVac }];
    if (inj.mixture && inj.mixture.t > s.t) points.push({ from: inj.mixture.t, thrust: inj.mixture.thrustVac * n, isp: inj.mixture.ispVac });
    this.guidance = new TliGuidance(
      { c3: inj.c3, e: inj.eccentricity, inc: inj.inclination * DEG, raan: inj.raan * DEG, argp: inj.argPerigee * DEG },
      { ignition: s.t, startupS: engineStartupS(e), tailoffS: engineTailoffS(e), points },
    );
    this.guidance.update(s.t, s.r, s.v, this.sim.vehicle.totalMass());
  }

  /** The mixture ratio shifted: the engine's operating point after it. */
  private shiftMixture(): void {
    const m = this.spec?.mixture, st = this.sim.vehicle.active;
    if (!m || !st || this.phase !== 'tli') return;
    st.spec = { ...st.spec, engine: { ...st.spec.engine, thrustVac: m.thrustVac, ispVac: m.ispVac } };
    this.sim.event('evt.mixtureShift', 'info', { ...this.sim.stageParams(st), kn: Math.round((st.spec.engine.count * m.thrustVac) / 1000) });
  }

  /** The propulsive vent's thrust at `t`, N. */
  private ventThrust(t: number): number {
    const k = this.spec?.vent?.thrust;
    if (!k || t < k[0][0] || t > k[k.length - 1][0]) return 0;
    for (let i = 1; i < k.length; i++) {
      if (t <= k[i][0]) {
        const f = (t - k[i - 1][0]) / Math.max(1e-9, k[i][0] - k[i - 1][0]);
        return k[i - 1][1] + f * (k[i][1] - k[i - 1][1]);
      }
    }
    return 0;
  }

  /**
   * Velocity-to-be-gained steering onto the target conic, for a burn the
   * iterative steering could not solve: the velocity the conic has at the
   * stack's radius, in its plane, climbing, less the velocity the stack has.
   */
  private fallbackSteering(r: Vec3, v: Vec3): Vec3 {
    const inj = this.spec!;
    const i = inj.inclination * DEG, raan = inj.raan * DEG;
    const n = v3(Math.sin(i) * Math.sin(raan), -Math.sin(i) * Math.cos(raan), Math.cos(i));
    const rIn = sub(r, scale(n, dot(n, r)));
    const rm = norm(r), rHat = normalize(rIn);
    const h = Math.sqrt(MU_EARTH * this.a * (1 - inj.eccentricity * inj.eccentricity));
    const speed = Math.sqrt(Math.max(0, MU_EARTH * (2 / rm - 1 / this.a)));
    const vh = Math.min(speed, h / rm);
    const vr = Math.sqrt(Math.max(0, speed * speed - vh * vh));
    const want = add(scale(normalize(cross(n, rHat)), vh), scale(rHat, vr));
    const vg = sub(want, v);
    return norm(vg) > 1e-3 ? normalize(vg) : normalize(v);
  }

  step(dt: number): void {
    if (APOLLO_LM.includes(this.phase)) { this.stepLunarModule(dt); return; }
    if (APOLLO_ASCENT.includes(this.phase)) { this.stepAscentStage(dt); return; }
    if (APOLLO_CSM_BACK.includes(this.phase)) { this.stepCsmBack(dt); return; }
    if (APOLLO_CM.includes(this.phase)) { this.stepCm(dt); return; }
    const sim = this.sim, s = sim.state, vehicle = sim.vehicle;
    const burning = this.burning, sps = this.sps;
    const mass = Math.max(1, vehicle.totalMass());
    let dir: Vec3;
    let thrust = 0, mdot = 0, throttle = 0;
    if (sps) {
      if (sps.target) sps.dir = this.lunarSteering(sps.target, sps.dv - sps.done, SPS.thrust / mass);
      const eng = sps.engine ?? SPS;
      dir = sps.dir;
      thrust = eng.thrust;
      mdot = eng.thrust / (eng.isp * G0);
      throttle = 1;
    } else {
      // an engine shut down still tails off: `thrust` gives it, whatever the command
      const thr = vehicle.thrust(s.t, 0, burning ? 1 : 0, dt);
      if (burning) {
        const g = this.guidance;
        g?.update(s.t, s.r, s.v, mass);
        dir = g?.steer(s.t, s.r, s.v, thr.thrust / mass) ?? this.fallbackSteering(s.r, s.v);
      } else dir = norm(s.v) > 1 ? normalize(s.v) : normalize(s.r);
      thrust = thr.thrust; mdot = thr.mdot; throttle = thr.coreThrottle;
      if (thr.burning) vehicle.consume(s.t, burning ? 1 : 0, dt);
      // in the parking orbit, the S-IVB's hydrogen vent pushes it along its flight path
      const vent = this.phase === 'parking' ? this.ventThrust(s.t) : 0;
      if (vent > 0) {
        thrust += vent;
        const st = vehicle.active, spent = vent * dt * (this.spec!.vent!.mass / Math.max(1, this.ventImpulse));
        if (st) st.propellant = Math.max(0, st.propellant - spent);
      }
    }
    const jd0 = this.jd0;
    const base = pointMassAcceleration(thrust / mass, dir, mass, mdot, s.t, 10, true, 2.2);
    const next = rk4Step(s.t, { r: s.r, v: s.v }, dt, (t, r, v) => add(base(t, r, v), lunisolar(jd0, t, r)));
    s.r = next.r; s.v = next.v; s.t += dt;
    if (sps) {
      vehicle.payloadMass = Math.max(1, vehicle.payloadMass - mdot * dt);
      // the Δv the step gave, by the rocket equation over it
      sps.done += mdot > 0 ? (thrust / mdot) * Math.log(mass / Math.max(1, mass - mdot * dt)) : (thrust / mass) * dt;
    }
    // the docked stack is drawn with the CSM's engine bell up: its service engine pushes it the other way
    s.dir = sps && !sps.engine ? scale(dir, -1) : dir;
    s.thrust = thrust; s.throttle = throttle; s.coreThrottle = throttle; s.boosterThrottle = 0;
    s.mass = vehicle.totalMass();
    s.gLoad = thrust / mass / G0;
    s.elements = elementsFromState(s.r, s.v);
    if (s.rigid) s.rigid = { ...s.rigid, attitudeQ: targetAttitude(s.dir, normalize(s.r)), omegaBody: v3() };
    if (burning) this.checkCutoff();
    if (sps && (sps.target ? this.lunarCutoff(sps) : sps.done >= sps.dv - 1e-4)) this.endSps();
    if (this.cislunar) this.checkSoi();
  }

  /**
   * The step the burn wants: `TLI_STEP_S`, down to a hundredth of a second as
   * the speed still to gain (the tail-off counted) comes to the last few steps'
   * worth — at the end of the burn the stage gains 14 m/s² and a 0.2 s step
   * would overshoot the conic's energy by 3 m/s.
   */
  burnStep(): number {
    const s = this.sim.state;
    if (this.sps) {
      const aT = SPS.thrust / Math.max(1, s.mass), b = this.sps;
      if (b.target?.retrograde) {
        // the speed still to shed before the orbit's energy, at the stack's speed about the Moon
        const rel = this.moonRel(s.t, s.r, s.v), speed = Math.max(1, norm(rel.v));
        const toGo = (dot(rel.v, rel.v) / 2 - MU_MOON / norm(rel.r) - b.target.energy) / speed;
        return Math.max(0.01, Math.min(SPS_STEP_S * 4, toGo / (4 * aT)));
      }
      if (b.target) return Math.max(0.01, Math.min(SPS_STEP_S * 4, this.lunarToGo(b.target).total / (4 * aT)));
      const eng = b.engine ?? SPS;
      return Math.max(0.01, Math.min(SPS_STEP_S, (b.dv - b.done) / (4 * (eng.thrust / Math.max(1, s.mass)))));
    }
    const aT = s.mass > 0 ? s.thrust / s.mass : 0;
    if (!(aT > 0)) return TLI_STEP_S;
    const tail = this.sim.vehicle.tailoffDeltaV(s.t, 0, s.mass);
    const toGo = (-MU_EARTH / (2 * this.a) - (dot(s.v, s.v) / 2 - MU_EARTH / norm(s.r))) / Math.max(1, norm(s.v)) - tail;
    return Math.max(0.01, Math.min(TLI_STEP_S, toGo / (5 * aT)));
  }

  /** The step the flight wants now, s. */
  suggestedDt(): number {
    if (this.phase === 'doi' || this.phase === 'descent') {
      const alt = norm(this.moonRel(this.sim.state.t, this.sim.state.r, this.sim.state.v).r) - APOLLO11.siteRadius;
      return this.phase === 'descent' && alt < 300 ? 0.05 : 0.2;
    }
    if (this.phase === 'landed') return 10;
    if (this.phase === 'ascent') {
      const s = this.sim.state, rel = this.moonRel(s.t, s.r, s.v), aT = Math.max(0.1, s.thrust / Math.max(1, s.mass));
      const toGo = this.ascentGuidance ? this.ascentGuidance.toGo(rel.r, rel.v) : 100;
      return Math.max(0.01, Math.min(0.2, toGo / (4 * aT)));
    }
    if (this.rcs) return Math.max(0.01, Math.min(0.5, (this.rcs.dv - this.rcs.done) / (2 * LM_RCS.thrust / Math.max(1, this.sim.state.mass))));
    if (this.phase === 'braking' || this.phase === 'stationkeeping') return 0.5;
    if (this.phase === 'terminal') return this.rendezvousNow().range < 8e3 ? 1 : 5;
    if (APOLLO_ASCENT.includes(this.phase) || APOLLO_CSM_BACK.includes(this.phase)) return 10;
    if (this.phase === 'entry' || this.phase === 'drogues' || this.phase === 'mains') return 0.5;
    if (this.phase === 'cmSeparated') {
      // the last seconds to the entry interface a step at a time
      const s = this.sim.state, alt = norm(s.r) - R_EARTH, vr = -dot(s.v, normalize(s.r));
      return Math.max(0.2, Math.min(cislunarStep(this.jd0, s.t, s), vr > 0 ? (alt - EI_ALT) / (2 * vr) : 60));
    }
    // the half hour before the descent's ignition, which is timed by the LM's position: a second at a time
    if (this.phase === 'descentOrbit' && this.sim.state.t > APOLLO11.pdi.t - 1800) return 0.5;
    if (this.burning || this.sps) return this.burnStep();
    if (this.sim.vehicle.inTransient(this.sim.state.t)) return TLI_STEP_S;
    if (this.cislunar) return cislunarStep(this.jd0, this.sim.state.t, this.sim.state);
    return APOLLO_COAST_STEP_S;
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
    this.tli = { c3: 2 * el.energy, e: el.e, inc: el.i / DEG, argp: el.argp / DEG };
    this.phase = 'translunar';
    s.note = 'translunar';
    sim.event(dry ? 'evt.tliShort' : 'evt.tli', dry ? 'warn' : 'success',
      { c3: +(this.tli.c3 / 1e6).toFixed(4), e: +this.tli.e.toFixed(5), inc: +this.tli.inc.toFixed(3), argp: +this.tli.argp.toFixed(2) });
  }

  // ------------------------------------------------------------ to the Moon

  /** The Moon's closest approach from the state now, as the Mission Report gives it. */
  private predictPerilune(t: number, st: { r: Vec3; v: Vec3 }): ApolloState['perilune'] {
    const p = coastToPerilune(this.jd0, t, st, APOLLO11.loi1.t + 12 * 3600);
    if (!p) return undefined;
    const sel = eciToSelenographic(p.rel.r, this.jd0 + p.t / 86400);
    return { alt: norm(p.rel.r) - APOLLO11.siteRadius, t: p.t, lat: sel.lat, lon: sel.lon };
  }

  /** Out of the S-IVB: the burns and the milestones to the Moon, at their flown times. */
  private planLunarFlight(): void {
    const s = this.sim.state;
    this.perilune = this.predictPerilune(s.t, s);
    this.sim.schedule(APOLLO11.evasive.t, 'evasive', () => this.evasive());
    this.sim.schedule(APOLLO11.mcc2.t, 'midcourse', () => this.midcourse());
    this.sim.schedule(APOLLO11.loi1.t, 'loi', () => this.lunarOrbitInsertion());
    this.sim.schedule(APOLLO11.loi2.t, 'circularize', () => this.circularization());
    this.sim.schedule(APOLLO11.undocking.t, 'undocking', () => this.undock());
    this.sim.schedule(APOLLO11.doi.t, 'doi', () => {
      if (this.phase !== 'undocked') return;
      this.sim.vehicle.payloadMass = APOLLO11.doi.mass;
      this.phase = 'doi';
      this.sim.state.note = 'doi';
      this.doiDone = 0;
      this.sim.event('evt.doi', 'major', { dv: +APOLLO11.doi.dv.toFixed(1) });
    });
    this.sim.schedule(APOLLO11.ascent.t - 3600, 'planLiftoff', () => this.planLiftoff());
    this.sim.schedule(APOLLO11.csi.t, 'csi', () => this.coellipticInitiation());
    this.sim.schedule(APOLLO11.cdh.t, 'cdh', () => this.constantHeight());
    this.sim.schedule(APOLLO11.jettison.t, 'lmJettison', () => this.jettisonAscentStage());
    this.sim.schedule(APOLLO11.separation.t, 'finalSeparation', () => {
      if (this.phase === 'csmOrbit') this.sim.event('evt.asSeparation', 'info', { dv: +APOLLO11.separation.dv.toFixed(2) });
    });
    this.sim.schedule(APOLLO11.tei.t - 1800, 'planTei', () => this.planTei());
    this.sim.schedule(APOLLO11.tei.t, 'tei', () => this.transearthInjection());
    this.sim.schedule(APOLLO11.mcc5.t, 'mcc5', () => this.returnMidcourse());
    this.sim.schedule(APOLLO11.cmSep.t, 'cmSep', () => this.separateCm());
  }

  // ------------------------------------------------------- the lunar module

  /**
   * Undocking: Eagle flies on as the tracked vehicle, weighed as the Mission
   * Report weighed it; Columbia, with its own mass, flies beside it, and half
   * an hour later backs off with its separation maneuver.
   */
  private undock(): void {
    if (this.phase !== 'lunarOrbit') return;
    const s = this.sim.state;
    this.csm = { r: { ...s.r }, v: { ...s.v } };
    this.sim.vehicle.payloadMass = APOLLO11.undocking.lm;
    s.mass = this.sim.vehicle.totalMass();
    this.phase = 'undocked';
    s.note = 'undocked';
    this.sim.event('evt.undocking', 'major');
    this.sim.schedule(APOLLO11.csmSep.t, 'csmSep', () => this.sim.event('evt.separationBurn', 'info', { dv: +APOLLO11.csmSep.dv.toFixed(2) }));
  }

  /** The landing site, relative to the Moon's centre, at mission time `t`: on the landing site's radius, turning with the Moon. */
  private siteAt = (t: number): { r: Vec3; v: Vec3 } => {
    const l = APOLLO11.landing, R = APOLLO11.siteRadius, jd = (x: number) => this.jd0 + x / 86400;
    const r = selenographicToEci(l.lat, l.lon, R, jd(t)), r1 = selenographicToEci(l.lat, l.lon, R, jd(t + 1));
    return { r, v: sub(r1, r) };
  };

  /**
   * Powered descent initiation, when the LM is as far round the Moon from the
   * landing site as Eagle was: the guidance takes it down (`PoweredDescent`),
   * its gates as long after the ignition as the flown ones were.
   */
  private poweredDescent(): void {
    if (this.phase !== 'descentOrbit') return;
    const p = APOLLO11.pdi, t = this.sim.state.t, after = (x: number) => t + (x - p.t);
    this.sim.vehicle.payloadMass = p.mass;
    this.descent = new PoweredDescent(this.siteAt,
      { ignition: t, ullage: p.ullage, highGate: after(APOLLO11.highGate.t), lowGate: after(APOLLO11.lowGate.t), touchdown: after(APOLLO11.landing.t) },
      { highGateAlt: APOLLO11.highGate.alt, highGateVz: APOLLO11.highGate.vz, lowGateAlt: APOLLO11.lowGate.alt });
    this.phase = 'descent';
    this.sim.state.note = 'descent';
    this.sim.event('evt.pdi', 'major');
  }

  /** The LM's flight — and the CSM's beside it — from the undocking to the surface. */
  private stepLunarModule(dt: number): void {
    const sim = this.sim, s = sim.state, vehicle = sim.vehicle, jd0 = this.jd0;
    const gravity = (t: number, r: Vec3) => add(gravityJ2(r), lunisolar(jd0, t, r));
    // Columbia, and its separation maneuver radially down
    if (this.csm) {
      const c = this.csm, sep = APOLLO11.csmSep;
      const push = (t: number, r: Vec3): Vec3 => {
        if (t < sep.t || t > sep.t + sep.duration) return v3();
        const m = moonState(jd0 + t / 86400);
        return scale(normalize(sub(r, m.r)), -sep.dv / sep.duration);
      };
      const n = rk4Step(s.t, { r: c.r, v: c.v }, dt, (t, r) => add(gravity(t, r), push(t, r)));
      this.csm = { r: n.r, v: n.v };
    }
    if (this.phase === 'landed') {
      // on the surface: where it stopped, turning with the Moon
      const l = this.landed!, t = s.t + dt, m = moonState(jd0 + t / 86400);
      const R = norm(l.r), jd = jd0 + t / 86400;
      const here = selenographicToEci(l.lat, l.lon, R, jd), next = selenographicToEci(l.lat, l.lon, R, jd + 1 / 86400);
      s.r = add(m.r, here); s.v = add(m.v, sub(next, here)); s.t = t;
      s.thrust = 0; s.throttle = 0; s.coreThrottle = 0; s.gLoad = 0;
      // standing upright on its legs
      s.dir = normalize(here);
      if (s.rigid) s.rigid = { ...s.rigid, attitudeQ: targetAttitude(s.dir, normalize(s.r)), omegaBody: v3() };
      s.elements = elementsFromState(s.r, s.v);
      return;
    }
    const mass = Math.max(1, vehicle.totalMass()), rel = this.moonRel(s.t, s.r, s.v);
    let thrust = 0;
    let dir = norm(rel.v) > 1 ? normalize(rel.v) : normalize(rel.r);
    if (this.phase === 'doi') {
      // retrograde, 15 s at 10 %, then 40 % to the targeted perilune
      const d = APOLLO11.doi, since = s.t - d.t;
      thrust = (since < d.low ? d.lowThrottle : d.highThrottle) * DPS.rated;
      dir = normalize(scale(rel.v, -1));
    } else if (this.phase === 'descent' && this.descent) {
      if (this.contact !== undefined && s.t >= APOLLO11.engineOff - APOLLO11.landing.t + this.contact) thrust = 0;
      else {
        const c = this.descent.command(s.t, rel.r, rel.v, mass);
        thrust = c.thrust; dir = c.dir;
      }
    }
    const mdot = thrust / (DPS.isp * G0);
    const next = rk4Step(s.t, { r: s.r, v: s.v }, dt, (t, r) => add(gravity(t, r), scale(dir, thrust / Math.max(1, mass - mdot * (t - s.t)))));
    s.r = next.r; s.v = next.v; s.t += dt;
    if (thrust > 0) vehicle.payloadMass = Math.max(1, vehicle.payloadMass - mdot * dt);
    s.dir = thrust > 0 ? dir : normalize(sub(s.r, moonState(jd0 + s.t / 86400).r));
    s.thrust = thrust; s.throttle = thrust / DPS.rated; s.coreThrottle = s.throttle; s.boosterThrottle = 0;
    s.mass = vehicle.totalMass();
    s.gLoad = thrust / mass / G0;
    s.elements = elementsFromState(s.r, s.v);
    if (s.rigid) s.rigid = { ...s.rigid, attitudeQ: targetAttitude(s.dir, normalize(s.r)), omegaBody: v3() };
    if (this.phase === 'doi') {
      // to the perilune it was targeted at (or, a safeguard, half its Δv again)
      this.doiDone += (thrust / mass) * dt;
      const now = this.moonRel(s.t, s.r, s.v), o = lunarOrbit(now, jd0 + s.t / 86400);
      if (o.rp - APOLLO11.siteRadius <= APOLLO11.doi.perilune || this.doiDone >= 1.5 * APOLLO11.doi.dv) {
        this.phase = 'descentOrbit';
        s.note = 'descentOrbit';
        sim.event('evt.lunarOrbit', 'success', { ap: Math.round((o.ra - APOLLO11.siteRadius) / 100) / 10,
          pe: Math.round((o.rp - APOLLO11.siteRadius) / 100) / 10, dv: +this.doiDone.toFixed(1) });
      }
    }
    // the descent's ignition, by the distance round the Moon to the site, within the half-revolution before the site
    if (this.phase === 'descentOrbit' && s.t > APOLLO11.pdi.t - 1800) {
      const site = this.siteAt(s.t), now = this.moonRel(s.t, s.r, s.v);
      const ahead = dot(cross(now.r, site.r), cross(now.r, now.v)) > 0;
      const range = Math.acos(Math.max(-1, Math.min(1, dot(normalize(now.r), normalize(site.r))))) * APOLLO11.siteRadius;
      if (ahead && range <= APOLLO11.pdi.range) this.poweredDescent();
    }
    if (this.phase === 'descent' && this.descent) this.checkDescent();
  }

  /** The descent's milestones: the throttle recovery, the gates, the contact probes touching, the engine off. */
  private checkDescent(): void {
    const d = this.descent!, s = this.sim.state, rel = this.moonRel(s.t, s.r, s.v);
    if (d.recovery !== undefined && !this.sim.events.some((e) => e.key === 'evt.throttleRecovery')) {
      this.sim.event('evt.throttleRecovery', 'info', undefined, d.recovery);
    }
    if (d.phase !== 'braking' && !this.sim.events.some((e) => e.key === 'evt.highGate')) this.sim.event('evt.highGate', 'info', { alt: Math.round(norm(rel.r) - APOLLO11.siteRadius) });
    if ((d.phase === 'landing' || d.phase === 'vertical') && !this.sim.events.some((e) => e.key === 'evt.lowGate')) {
      this.sim.event('evt.lowGate', 'info', { alt: Math.round(norm(rel.r) - APOLLO11.siteRadius) });
    }
    const alt = this.groundHeight(rel.r);
    // the probes under three of the footpads reach 67 in (1.7 m) below them: "contact light"
    if (this.contact === undefined && alt <= LM_PROBE) {
      this.contact = s.t;
      this.sim.event('evt.lunarLanding', 'success');
    }
    if (this.contact !== undefined && (alt <= 0 || s.t >= this.contact + (APOLLO11.engineOff - APOLLO11.landing.t))) {
      const jd = this.jd0 + s.t / 86400, sel = eciToSelenographic(rel.r, jd);
      const site = selenographicToEci(APOLLO11.landing.lat, APOLLO11.landing.lon, APOLLO11.siteRadius, jd);
      const onGround = scale(normalize(rel.r), APOLLO11.siteRadius);
      this.landed = { lat: sel.lat, lon: sel.lon, miss: norm(sub(onGround, site)), t: s.t, r: onGround };
      this.phase = 'landed';
      s.note = 'landed';
      this.sim.event('evt.lmEngineOff', 'success', { miss: Math.round(this.landed.miss) });
    }
  }

  // ---------------------------------------------------------- back to Columbia

  /** A coast under the flight's own forces — the Earth with its J2, the Moon with its field, the Sun — in 10-s steps. */
  private coast = (t0: number, st: OrbitState, t1: number): OrbitState => {
    const jd0 = this.jd0, gravity = (t: number, r: Vec3) => add(gravityJ2(r), lunisolar(jd0, t, r));
    let t = t0, x = { r: st.r, v: st.v };
    while (t1 - t > 1e-9) {
      const h = Math.min(10, t1 - t);
      const n = rk4Step(t, x, h, gravity);
      x = { r: n.r, v: n.v }; t += h;
    }
    return x;
  };

  /** The same, for a state relative to the Moon's centre. */
  private coastRel = (t0: number, st: OrbitState, t1: number): OrbitState => {
    const m0 = moonState(this.jd0 + t0 / 86400), m1 = moonState(this.jd0 + t1 / 86400);
    const x = this.coast(t0, { r: add(st.r, m0.r), v: add(st.v, m0.v) }, t1);
    return { r: sub(x.r, m1.r), v: sub(x.v, m1.v) };
  };

  /** The rendezvous seen from the ascent stage: range to the CSM (m), closing rate (m/s), ΔH (m), elevation (deg). */
  private rendezvousNow(): { range: number; closing: number; dh: number; elevation: number } {
    const s = this.sim.state, c = this.csm!, m = moonState(this.jd0 + s.t / 86400);
    const l = { r: sub(s.r, m.r), v: sub(s.v, m.v) }, cr = { r: sub(c.r, m.r), v: sub(c.v, m.v) };
    const rel = sub(c.r, s.r), range = norm(rel);
    return { range, closing: -dot(sub(c.v, s.v), scale(rel, 1 / Math.max(1e-9, range))), dh: heightBelow(cr, l), elevation: elevation(cr, l) };
  }

  /**
   * The lift-off's time, worked out an hour before it from the CSM's state as
   * the flight's was, for the rendezvous: when the CSM will be as far ahead of
   * the insertion — as long after the lift-off as the flown one, as far west of
   * the landing site — as planned (a secant search on the lift-off's time).
   */
  private planLiftoff(): void {
    if (this.phase !== 'landed' || !this.csm || !this.landed) return;
    const a = APOLLO11.ascent, s = this.sim.state, t0 = s.t, dur = a.cutoff - a.t, l = this.landed;
    const m0 = moonState(this.jd0 + t0 / 86400), c0 = { r: sub(this.csm.r, m0.r), v: sub(this.csm.v, m0.v) };
    const miss = (tlo: number): number => {
      const ti = tlo + dur, c = this.coastRel(t0, c0, ti), n = normalize(cross(c.r, c.v));
      const u = normalize(selenographicToEci(l.lat, l.lon, 1, this.jd0 + ti / 86400)), th = a.downrange / APOLLO11.siteRadius;
      const p = scale(add(scale(u, Math.cos(th)), scale(normalize(cross(n, u)), Math.sin(th))), APOLLO11.siteRadius + a.alt);
      return norm(sub(c.r, p)) - a.lead;
    };
    let x0 = a.t, x1 = a.t + 30, f0 = miss(x0), f1 = miss(x1);
    for (let i = 0; i < 10 && Math.abs(f1) > 50; i++) {
      const d = f1 - f0;
      if (!(Math.abs(d) > 1e-6)) break;
      const x2 = Math.max(a.t - 900, Math.min(a.t + 900, x1 - (f1 * (x1 - x0)) / d));
      x0 = x1; f0 = f1; x1 = x2; f1 = miss(x1);
    }
    this.sim.schedule(Math.max(s.t + 1, x1), 'lunarLiftoff', () => this.liftoff());
  }

  /**
   * Lift-off: the ascent stage off the descent stage, its engine lit and
   * steered by P12 into the CSM's plane.
   */
  private liftoff(): void {
    if (this.phase !== 'landed' || !this.csm) return;
    const s = this.sim.state, a = APOLLO11.ascent, m = moonState(this.jd0 + s.t / 86400);
    const c = { r: sub(this.csm.r, m.r), v: sub(this.csm.v, m.v) };
    this.sim.vehicle.payloadMass = a.mass;
    s.mass = this.sim.vehicle.totalMass();
    this.ascentGuidance = new AscentGuidance({ r: APOLLO11.siteRadius + a.alt, vr: a.vr, vh: a.vh }, normalize(cross(c.r, c.v)), s.t, a.vertical);
    this.phase = 'ascent';
    s.note = 'ascent';
    this.sim.event('evt.lunarLiftoff', 'major');
  }

  /** The ascent engine's cut-off at the insertion's speed: the ascent stage in orbit, weighed as flown. */
  private insertion(): void {
    const s = this.sim.state, rel = this.moonRel(s.t, s.r, s.v), o = lunarOrbit(rel, this.jd0 + s.t / 86400);
    this.ascentGuidance = undefined;
    this.phase = 'lmOrbit';
    s.note = 'lmOrbit';
    this.sim.event('evt.lmInsertion', 'success', { ap: Math.round((o.ra - APOLLO11.siteRadius) / 100) / 10, pe: Math.round((o.rp - APOLLO11.siteRadius) / 100) / 10,
      mass: Math.round(this.sim.vehicle.totalMass()) });
  }

  /** A rendezvous burn on the LM's thrusters: along `dv`'s direction until its size is in. */
  private startRcs(kind: 'csi' | 'cdh' | 'tpi' | 'lmMidcourse', dv: Vec3, event: string, params: Record<string, number>): void {
    this.rcs = { dir: normalize(dv), dv: norm(dv), done: 0, next: kind === 'tpi' || kind === 'lmMidcourse' ? 'terminal' : 'lmOrbit' };
    this.phase = kind;
    this.sim.state.note = kind;
    this.sim.event(event, 'major', { ...params, dv: +norm(dv).toFixed(1) });
  }

  /** The two spacecraft's states about the Moon now. */
  private pair(): { l: OrbitState; c: OrbitState } {
    const s = this.sim.state, m = moonState(this.jd0 + s.t / 86400);
    return { l: { r: sub(s.r, m.r), v: sub(s.v, m.v) }, c: { r: sub(this.csm!.r, m.r), v: sub(this.csm!.v, m.v) } };
  }

  /** CSI at its flown time: the impulse along the LM's horizontal that puts it 15 n mi under the CSM at CDH. */
  private coellipticInitiation(): void {
    if (this.phase !== 'lmOrbit' || !this.csm) return;
    const s = this.sim.state, c = APOLLO11.csi;
    this.sim.vehicle.payloadMass = c.mass;
    s.mass = this.sim.vehicle.totalMass();
    const { l, c: cm } = this.pair();
    const dv = csiImpulse(this.coastRel, s.t, l, cm, APOLLO11.cdh.t, c.dh, c.dv);
    if (!dv) { this.sim.event('evt.rendezvousFailed', 'warn'); return; }
    this.startRcs('csi', dv, 'evt.csi', {});
  }

  /** CDH at its flown time: the LM's orbit made coelliptic with the CSM's. */
  private constantHeight(): void {
    if (this.phase !== 'lmOrbit' || !this.csm) return;
    const { l, c } = this.pair();
    this.cdhDone = true;
    this.startRcs('cdh', cdhImpulse(l, c), 'evt.cdh', { dh: Math.round(heightBelow(c, l) / 100) / 10 });
  }

  /** TPI, when the CSM stands 26.6° over the LM's horizon: onto the path that meets it 130° of its orbit later. */
  private terminalPhaseInitiation(): void {
    const s = this.sim.state;
    const { l, c: cm } = this.pair(), a = 1 / (2 / norm(cm.r) - dot(cm.v, cm.v) / MU_MOON);
    const period = 2 * Math.PI * Math.sqrt((a * a * a) / MU_MOON);
    this.intercept = s.t + (APOLLO11.tpi.transfer / 360) * period;
    const dv = interceptImpulse(this.coastRel, s.t, l, cm, this.intercept);
    if (!dv) { this.sim.event('evt.rendezvousFailed', 'warn'); return; }
    // the two midcourse corrections, as long after TPI as the flown ones were
    APOLLO11.lmMcc.forEach((tm, i) => this.sim.schedule(s.t + (tm - APOLLO11.tpi.t), `lmMcc${i + 1}`, () => this.lmMidcourse(i + 1)));
    this.startRcs('tpi', dv, 'evt.tpi', { el: +elevation(this.pair().c, this.pair().l).toFixed(1) });
  }

  /** A midcourse correction of the terminal phase: back onto the path to the intercept. */
  private lmMidcourse(n: number): void {
    if (this.phase !== 'terminal' || !this.csm || !this.intercept) return;
    const s = this.sim.state, { l, c } = this.pair();
    const dv = interceptImpulse(this.coastRel, s.t, l, c, this.intercept);
    if (!dv) return;
    this.startRcs('lmMidcourse', dv, 'evt.lmMcc', { n });
  }

  /** The ascent stage's flight — and the CSM's beside it — from the lift-off to the docking. */
  private stepAscentStage(dt: number): void {
    const sim = this.sim, s = sim.state, vehicle = sim.vehicle, jd0 = this.jd0;
    const gravity = (t: number, r: Vec3) => add(gravityJ2(r), lunisolar(jd0, t, r));
    const c0 = this.csm!;
    const cn = rk4Step(s.t, { r: c0.r, v: c0.v }, dt, gravity);
    const mass = Math.max(1, vehicle.totalMass()), rel = this.moonRel(s.t, s.r, s.v);
    let thrust = 0, isp = LM_RCS.isp;
    let dir = norm(rel.v) > 1 ? normalize(rel.v) : normalize(rel.r);
    if (this.phase === 'ascent' && this.ascentGuidance) {
      const p = apsPoint(s.t - APOLLO11.ascent.t);
      thrust = p.thrust; isp = p.isp;
      dir = this.ascentGuidance.steer(s.t, rel.r, rel.v, thrust / mass, isp * G0);
    } else if (this.rcs) {
      thrust = LM_RCS.thrust; dir = this.rcs.dir;
    } else if (this.phase === 'braking' || this.phase === 'stationkeeping') {
      const range = norm(sub(c0.r, s.r));
      const close = this.phase === 'braking' ? closingSpeed(range)
        : s.t >= APOLLO11.redocking.t - (STATIONKEEPING_M - DOCKED_RANGE) / DOCKING_SPEED ? DOCKING_SPEED * Math.min(1, (range - DOCKED_RANGE + 0.5) / 2) : 0;
      const a = brakingAcceleration({ r: s.r, v: s.v }, c0, close, LM_RCS.thrust / mass);
      thrust = norm(a) * mass;
      if (thrust > 1e-6) dir = normalize(a);
    }
    const mdot = thrust / (isp * G0);
    const next = rk4Step(s.t, { r: s.r, v: s.v }, dt, (t, r) => add(gravity(t, r), scale(dir, thrust / Math.max(1, mass - mdot * (t - s.t)))));
    s.r = next.r; s.v = next.v; s.t += dt;
    this.csm = { r: cn.r, v: cn.v };
    if (thrust > 0) vehicle.payloadMass = Math.max(1, vehicle.payloadMass - mdot * dt);
    // the ascent engine up its thrust axis; in the rendezvous the stage's docking tunnel towards the CSM
    const los = normalize(sub(this.csm.r, s.r));
    s.dir = this.phase === 'ascent' ? dir : APOLLO_ASCENT.includes(this.phase) && this.phase !== 'lmOrbit' ? los : normalize(sub(s.r, moonState(jd0 + s.t / 86400).r));
    s.thrust = thrust; s.throttle = this.phase === 'ascent' ? 1 : 0; s.coreThrottle = s.throttle; s.boosterThrottle = 0;
    s.mass = vehicle.totalMass();
    s.gLoad = thrust / mass / G0;
    s.elements = elementsFromState(s.r, s.v);
    if (s.rigid) s.rigid = { ...s.rigid, attitudeQ: targetAttitude(s.dir, normalize(s.r)), omegaBody: v3() };
    // the milestones
    if (this.phase === 'ascent' && this.ascentGuidance) {
      const now = this.moonRel(s.t, s.r, s.v);
      if (this.ascentGuidance.toGo(now.r, now.v) <= 0.01) this.insertion();
      return;
    }
    if (this.rcs) {
      this.rcs.done += (thrust / mass) * dt;
      if (this.rcs.done >= this.rcs.dv - 1e-4) {
        const next = this.rcs.next;
        this.rcs = undefined;
        this.phase = next;
        s.note = next;
      }
      return;
    }
    const rv = this.rendezvousNow();
    if (this.phase === 'lmOrbit' && this.cdhDone && !this.intercept && rv.elevation >= APOLLO11.tpi.elevation) this.terminalPhaseInitiation();
    else if (this.phase === 'terminal' && rv.range <= 6000 * 0.3048 && rv.closing > 0) {
      this.phase = 'braking';
      s.note = 'braking';
      this.sim.event('evt.braking', 'info', { range: Math.round(rv.range) });
    } else if (this.phase === 'braking' && rv.range <= STATIONKEEPING_M + 1 && Math.abs(rv.closing) < 0.05) {
      this.phase = 'stationkeeping';
      s.note = 'stationkeeping';
      this.sim.event('evt.stationkeeping', 'info', { range: Math.round(rv.range) });
    } else if (this.phase === 'stationkeeping' && rv.range <= DOCKED_RANGE) this.redock();
  }

  /**
   * Docked again: the flight followed with the CSM, the ascent stage on its
   * nose, weighed as the Mission Report weighed the two.
   */
  private redock(): void {
    const s = this.sim.state, c = this.csm!;
    this.dockAxis = normalize(sub(s.r, c.r));
    s.r = { ...c.r }; s.v = { ...c.v };
    this.csm = undefined;
    const d = APOLLO11.redocking;
    this.sim.vehicle.payloadMass = d.csm + d.lm;
    s.mass = this.sim.vehicle.totalMass();
    s.thrust = 0;
    this.phase = 'redocked';
    s.note = 'redocked';
    this.sim.event('evt.lmDocked', 'success');
  }

  /** The ascent stage jettisoned at its flown time, drifting off the CSM's nose; the CSM as weighed after it. */
  private jettisonAscentStage(): void {
    if (this.phase !== 'redocked' || !this.dockAxis) return;
    const s = this.sim.state, ax = this.dockAxis;
    this.ascentStage = { r: add(s.r, scale(ax, DOCKED_RANGE)), v: add(s.v, scale(ax, JETTISON_SPEED)) };
    this.sim.vehicle.payloadMass = APOLLO11.jettison.csm;
    s.mass = this.sim.vehicle.totalMass();
    this.phase = 'csmOrbit';
    s.note = 'csmOrbit';
    this.sim.event('evt.lmJettison', 'major');
  }

  /** The CSM again, with the ascent stage docked or drifting off, and its separation push retrograde. */
  private stepCsmBack(dt: number): void {
    const sim = this.sim, s = sim.state, jd0 = this.jd0;
    const gravity = (t: number, r: Vec3) => add(gravityJ2(r), lunisolar(jd0, t, r));
    if (this.ascentStage) {
      const n = rk4Step(s.t, this.ascentStage, dt, gravity);
      this.ascentStage = { r: n.r, v: n.v };
    }
    const sep = APOLLO11.separation, rel = this.moonRel(s.t, s.r, s.v);
    const push = this.phase === 'csmOrbit' && s.t >= sep.t && s.t < sep.t + sep.duration ? scale(normalize(rel.v), -sep.dv / sep.duration) : v3();
    const next = rk4Step(s.t, { r: s.r, v: s.v }, dt, (t, r) => add(gravity(t, r), push));
    s.r = next.r; s.v = next.v; s.t += dt;
    s.thrust = 0; s.throttle = 0; s.coreThrottle = 0; s.boosterThrottle = 0; s.gLoad = 0;
    s.dir = this.dockAxis ?? normalize(sub(s.r, moonState(jd0 + s.t / 86400).r));
    s.mass = sim.vehicle.totalMass();
    s.elements = elementsFromState(s.r, s.v);
    if (s.rigid) s.rigid = { ...s.rigid, attitudeQ: targetAttitude(s.dir, normalize(s.r)), omegaBody: v3() };
  }

  // ------------------------------------------------------------------- home

  /**
   * Where the flight comes home to: the vacuum perigee of the entry the flight
   * flew after its correction (MR Table 7-VII), which the burns home aim at.
   */
  private get entryAim(): { alt: number; time: number; lat: number } {
    const e = APOLLO11.entryInterface;
    const p = perigeeOfEntry(this.jd0, { t: e.t, lat: e.lat, lon: e.lon, alt: EI_ALT, speed: e.speed, fpa: e.fpa, heading: e.heading });
    return { alt: p.alt, time: p.t, lat: p.lat };
  }

  /**
   * The burn home's aim, worked out half an hour before it as the ground
   * worked it out: the burn along a fixed direction from its flown ignition
   * that puts the flight's vacuum perigee where the flown entry's was, from
   * the impulse at the burn's middle that does it (itself from the flown size
   * along the velocity).
   */
  private planTei(): void {
    if (this.phase !== 'csmOrbit') return;
    // first as an impulse at the burn's middle, then as the burn itself from there
    const s = this.sim.state, e = APOLLO11.tei, mid = e.t + e.duration / 2;
    const sm = this.coast(s.t, { r: s.r, v: s.v }, mid), m = moonState(this.jd0 + mid / 86400);
    const guess = scale(normalize(sub(sm.v, m.v)), e.dv), aim = this.entryAim;
    const impulse = targetEntry(this.jd0, mid, sm, aim, guess) ?? guess;
    const st = this.coast(s.t, { r: s.r, v: s.v }, e.t);
    this.teiDv = targetEntry(this.jd0, e.t, st, aim, impulse, { thrust: SPS.thrust, isp: SPS.isp, mass: e.mass }) ?? impulse;
  }

  /** The transearth injection at its flown time: the service engine along the aim until its size is in. */
  private transearthInjection(): void {
    if (this.phase !== 'csmOrbit' || !this.teiDv) return;
    const s = this.sim.state;
    this.sim.vehicle.payloadMass = APOLLO11.tei.mass;
    s.mass = this.sim.vehicle.totalMass();
    this.ascentStage = undefined;
    this.dockAxis = undefined;
    this.startSps('tei', normalize(this.teiDv), norm(this.teiDv), 'transearth');
    this.sim.event('evt.tei', 'major', { dv: +norm(this.teiDv).toFixed(1) });
  }

  /** MCC-5 at its flown time, on the service module's thrusters: back onto the entry interface. */
  private returnMidcourse(): void {
    if (this.phase !== 'transearth') return;
    const s = this.sim.state;
    const dv = targetEntry(this.jd0, s.t, { r: s.r, v: s.v }, this.entryAim, v3(), { ...SM_RCS, mass: this.sim.vehicle.totalMass() });
    if (!dv || norm(dv) < 0.03) { this.sim.event('evt.mccSkipped', 'info'); return; }
    this.startSps('returnMidcourse', normalize(dv), norm(dv), 'transearth', undefined, SM_RCS);
    this.sim.event('evt.transearthMcc', 'major', { dv: +norm(dv).toFixed(2) });
  }

  /** The CM off the SM at its flown time, weighed as it was; the SM drifting off behind it. */
  private separateCm(): void {
    if (this.phase !== 'transearth') return;
    const s = this.sim.state;
    this.serviceModule = { r: { ...s.r }, v: sub(s.v, scale(normalize(s.v), SM_DRIFT)) };
    this.sim.vehicle.payloadMass = APOLLO11.cmSep.cm;
    s.mass = this.sim.vehicle.totalMass();
    this.phase = 'cmSeparated';
    s.note = 'cmSeparated';
    this.sim.event('evt.cmSmSeparation', 'major');
  }

  /**
   * The CM from its separation to the water: to the entry interface under the
   * Earth's and the Moon's and the Sun's pull; through the air on its lift,
   * steered by `EntryGuidance` to where Columbia came down; under its drogues
   * and its mains; and in the water, turning with the Earth.
   */
  private stepCm(dt: number): void {
    const sim = this.sim, s = sim.state, jd0 = this.jd0, vehicle = sim.vehicle;
    // the service module on its own arc, until it breaks up in the air (MR §7.6)
    if (this.serviceModule) {
      const n = rk4Step(s.t, this.serviceModule, dt, (t, r, v) => add(add(gravityJ2(r), lunisolar(jd0, t, r)),
        norm(r) - R_EARTH < EI_ALT ? cmAerodynamics(r, v, 0, SM_MASS, 0) : v3()));
      this.serviceModule = norm(n.r) - R_EARTH > SM_BREAKUP ? { r: n.r, v: n.v } : undefined;
    }
    if (this.phase === 'cmSeparated') {
      const n = rk4Step(s.t, { r: s.r, v: s.v }, dt, (t, r) => add(gravityJ2(r), lunisolar(jd0, t, r)));
      s.r = n.r; s.v = n.v; s.t += dt;
      this.cmState(0);
      if (norm(s.r) - R_EARTH <= EI_ALT) {
        const a = APOLLO11.splashdown, e = APOLLO11.cmSep;
        this.entryGuidance = new EntryGuidance(jd0, { lat: a.lat * DEG, lon: a.lon * DEG });
        vehicle.payloadMass = e.ei;
        s.mass = vehicle.totalMass();
        this.phase = 'entry';
        s.note = 'entry';
        const rm = norm(s.r), sp = norm(s.v);
        sim.event('evt.entryInterface', 'major', { v: Math.round(sp), fpa: +((Math.asin(dot(s.r, s.v) / (rm * sp)) * 180) / Math.PI).toFixed(2) });
      }
      return;
    }
    // the drogues below 24,000 ft, the mains below 10,000 ft
    const alt = norm(s.r) - R_EARTH, sp = APOLLO11.splashdown;
    if (this.phase === 'entry' && alt <= CHUTES.drogueAlt) {
      this.phase = 'drogues'; s.note = 'drogues'; this.chuteAt.drogue = s.t;
      vehicle.payloadMass = sp.drogueMass;
      sim.event('evt.drogues', 'info', { alt: Math.round(alt) });
    } else if (this.phase === 'drogues' && alt <= CHUTES.mainAlt) {
      this.phase = 'mains'; s.note = 'mains'; this.chuteAt.main = s.t;
      vehicle.payloadMass = sp.mainMass;
      sim.event('evt.mains', 'info', { alt: Math.round(alt) });
    }
    // under the mains, the CM's propellant dumped: to its weight in the water in two minutes
    if (this.phase === 'mains') vehicle.payloadMass = sp.mainMass + (sp.mass - sp.mainMass) * Math.min(1, (s.t - this.chuteAt.main) / 120);
    const m = Math.max(1, vehicle.totalMass());
    const bank = this.phase === 'entry' && this.entryGuidance ? this.entryGuidance.update(s.t, s.r, s.v, m) : 0;
    const drogue = this.phase === 'drogues' ? opened(s.t - this.chuteAt.drogue, CHUTES.drogueReef) : 0;
    const main = this.phase === 'mains' ? opened(s.t - this.chuteAt.main, CHUTES.mainReef) : 0;
    const cda = drogue * CHUTES.drogueCdA + main * CHUTES.mainCdA(sp.mass);
    const acc = entryAcceleration(bank, m, cda);
    const load = norm(sub(acc(s.t, s.r, s.v), gravityJ2(s.r))) / G0;
    const n = rk4Step(s.t, { r: s.r, v: s.v }, dt, acc);
    s.r = n.r; s.v = n.v; s.t += dt;
    s.mass = vehicle.totalMass();
    this.entryState = { bank: (bank * 180) / Math.PI, load, maxLoad: Math.max(this.entryState.maxLoad, load), drogue, main };
    this.cmState(load);
    if (norm(s.r) - R_EARTH <= 0) this.splashdown();
  }

  /** The CM's state's other fields: heat shield into the air, or apex up under the parachutes. */
  private cmState(load: number): void {
    const s = this.sim.state, va = airVelocity(s.r, s.v);
    s.dir = this.phase === 'drogues' || this.phase === 'mains' || norm(va) < 1 ? normalize(s.r) : normalize(scale(va, -1));
    s.thrust = 0; s.throttle = 0; s.coreThrottle = 0; s.boosterThrottle = 0;
    s.gLoad = load;
    s.elements = elementsFromState(s.r, s.v);
    if (s.rigid) s.rigid = { ...s.rigid, attitudeQ: targetAttitude(s.dir, normalize(s.r)), omegaBody: v3() };
  }

  /** In the water: at sea level, turning with the Earth from here on, the flight landed. */
  private splashdown(): void {
    const s = this.sim.state, jd = this.jd0 + s.t / 86400, p = earthFixed(s.r, jd), a = APOLLO11.splashdown;
    s.r = scale(normalize(s.r), R_EARTH);
    s.v = cross(v3(0, 0, OMEGA_EARTH), s.r);
    this.splash = { lat: p.lat / DEG, lon: p.lon / DEG, t: s.t };
    this.phase = 'splashdown';
    s.note = 'splashdown';
    s.status = 'landed';
    // how far from where Columbia came down, km
    const c = Math.sin(p.lat) * Math.sin(a.lat * DEG) + Math.cos(p.lat) * Math.cos(a.lat * DEG) * Math.cos(p.lon - a.lon * DEG);
    this.sim.event('evt.cmSplashdown', 'success', { lat: +this.splash.lat.toFixed(2), lon: +this.splash.lon.toFixed(2),
      miss: Math.round((Math.acos(Math.max(-1, Math.min(1, c))) * R_EARTH) / 100) / 10, g: +this.entryState.maxLoad.toFixed(2) });
  }

  /** Height over the landing site's ground, m: the Moon, where Eagle came down, is at the site's radius. */
  private groundHeight(rel: Vec3): number {
    return norm(rel) - APOLLO11.siteRadius;
  }

  /**
   * The lunar orbit's target: apolune and perilune above the landing site's
   * radius, in a plane through the Moon's centre with normal `n`.
   */
  private lunarTarget(apolune: number, perilune: number, n: Vec3): LunarTarget {
    const ra = APOLLO11.siteRadius + apolune, rp = APOLLO11.siteRadius + perilune, a = (ra + rp) / 2;
    return { energy: -MU_MOON / (2 * a), a, h: Math.sqrt(MU_MOON * a * (1 - ((ra - rp) / (ra + rp)) ** 2)), n, rp };
  }

  /**
   * LOI-1, behind the Moon at its flown time: the service engine against the
   * velocity through the pericynthion — which is where the orbit's perilune
   * stays — until the energy is the 169.7 × 60.0 n mi orbit's; yawed into the
   * plane through the Moon's centre, the burn's middle and the landing site
   * where it will be when the landing is due. (The flight biased its plane by
   * the regression the Moon's mascons were to give it, which the model's field
   * has not; §13.11.)
   */
  private lunarOrbitInsertion(): void {
    if (this.phase !== 'approach' && this.phase !== 'coast') return;
    const s = this.sim.state, l = APOLLO11.loi1;
    this.sim.vehicle.payloadMass = APOLLO11.mass.loi1;
    s.mass = this.sim.vehicle.totalMass();
    const rel = this.moonRel(s.t, s.r, s.v), h = normalize(cross(rel.r, rel.v));
    const site = normalize(selenographicToEci(APOLLO11.landing.lat, APOLLO11.landing.lon, R_MOON, this.jd0 + APOLLO11.landing.t / 86400));
    // where the stack will be half-way through the burn, on its way round: its position turned on by the
    // angle it covers at its mean speed
    const mid = normalize(add(scale(normalize(rel.r), Math.cos(this.loiArc(rel))), scale(normalize(cross(h, rel.r)), Math.sin(this.loiArc(rel)))));
    const cr = cross(mid, site);
    const n = norm(cr) > 0.05 ? scale(normalize(cr), Math.sign(dot(cr, h)) || 1) : normalize(sub(h, scale(site, dot(h, site))));
    const target: LunarTarget = { ...this.lunarTarget(l.apolune, l.perilune, n), retrograde: true };
    target.pitch = this.loiPitch(rel, target);
    this.startSps('loi', this.lunarSteeringFor(target, l.dv), l.dv, 'lunarOrbit', target);
    this.sim.event('evt.loi', 'major', { dv: +l.dv.toFixed(1) });
  }

  /** Against the in-plane velocity, pitched up (away from the Moon) by `pitch` rad. */
  private retroPitched(vIn: Vec3, pitch: number): Vec3 {
    const s = this.sim.state, rel = this.moonRel(s.t, s.r, s.v);
    const back = normalize(scale(vIn, -1)), rHat = normalize(rel.r);
    const up = sub(rHat, scale(back, dot(rHat, back)));
    return norm(up) > 1e-9 ? normalize(add(scale(back, Math.cos(pitch)), scale(normalize(up), Math.sin(pitch)))) : back;
  }

  /**
   * The pitch the retrograde burn is held at so that the orbit its energy ends
   * it in has the perilune aimed at, or comes nearest it: the burn predicted
   * about the Moon alone (six minutes, where the Earth's and the Sun's tides
   * are metres).
   */
  private loiPitch(rel0: { r: Vec3; v: Vec3 }, target: LunarTarget): number {
    const F = SPS.thrust, mdot = SPS.thrust / (SPS.isp * G0), m0 = this.sim.vehicle.totalMass();
    const predict = (pitch: number): number => {
      let r = rel0.r, v = rel0.v, m = m0;
      for (let i = 0; i < 3000; i++) {
        const back = normalize(scale(v, -1)), rHat = normalize(r), up = normalize(sub(rHat, scale(back, dot(rHat, back))));
        const dir = normalize(add(scale(back, Math.cos(pitch)), scale(up, Math.sin(pitch))));
        const aT = F / m, g = (x: Vec3) => scale(x, -MU_MOON / Math.pow(dot(x, x), 1.5));
        const acc = (_t: number, x: Vec3) => add(g(x), scale(dir, aT));
        const nx = rk4Step(0, { r, v }, 1, acc);
        r = nx.r; v = nx.v; m -= mdot;
        if (dot(v, v) / 2 - MU_MOON / norm(r) <= target.energy) break;
      }
      const a = 1 / (2 / norm(r) - dot(v, v) / MU_MOON), hh = norm(cross(r, v));
      return a * (1 - Math.sqrt(Math.max(0, 1 - (hh * hh) / (MU_MOON * a))));
    };
    // the perilune rises with the pitch, then falls again as the burn climbs: the pitch nearest the aim,
    // by a golden-section search (the approach's own pericynthion is about as high as the orbit's can be)
    const miss = (p: number) => Math.abs(predict(p) - target.rp);
    let a = -5 * DEG, b = 10 * DEG;
    for (let k = 0; k < 16; k++) {
      const c = b - (b - a) * 0.618, d = a + (b - a) * 0.618;
      if (miss(c) < miss(d)) b = d; else a = c;
    }
    return (a + b) / 2;
  }

  /** The angle round the Moon the stack covers in the first half of LOI-1, rad. */
  private loiArc(rel: { r: Vec3; v: Vec3 }): number {
    const l = APOLLO11.loi1, rm = norm(rel.r), vt = norm(sub(rel.v, scale(normalize(rel.r), dot(rel.v, normalize(rel.r)))));
    // about the mean of the arrival's speed and the orbit's
    const vOrbit = Math.sqrt(MU_MOON * (2 / rm - 2 / (2 * APOLLO11.siteRadius + l.apolune + l.perilune)));
    return (((vt + vOrbit) / 2) * (l.duration / 2)) / rm;
  }

  /** LOI-2, two revolutions later: the orbit rounded off to 65.7 × 53.7 n mi in its own plane. */
  private circularization(): void {
    if (this.phase !== 'lunarOrbit') return;
    const s = this.sim.state, l = APOLLO11.loi2;
    this.sim.vehicle.payloadMass = APOLLO11.mass.loi2;
    s.mass = this.sim.vehicle.totalMass();
    const rel = this.moonRel(s.t, s.r, s.v);
    const target = this.lunarTarget(l.apolune, l.perilune, normalize(cross(rel.r, rel.v)));
    this.startSps('circularize', this.lunarSteeringFor(target, l.dv), l.dv, 'lunarOrbit', target);
    this.sim.event('evt.circularize', 'major', { dv: +l.dv.toFixed(1) });
  }

  private lunarSteeringFor(target: LunarTarget, dv: number): Vec3 {
    const mass = Math.max(1, this.sim.vehicle.totalMass());
    return this.lunarSteering(target, dv, SPS.thrust / mass);
  }

  /**
   * Velocity-to-be-gained steering onto a lunar orbit: in its plane, the
   * velocity the orbit has at the stack's radius, climbing or falling as the
   * stack is, less the stack's; across it, the distance and the speed out of
   * the plane brought to zero together by the cut-off.
   */
  private lunarSteering(target: LunarTarget, dvToGo: number, aT: number): Vec3 {
    const g = this.lunarToGo(target), n = target.n;
    const inPlane = target.retrograde || !(norm(g.vgIn) > 1e-6) ? this.retroPitched(g.vIn, target.pitch ?? 0) : normalize(g.vgIn);
    // the time to go: a retrograde burn's by the energy still to take off (it ends on the energy), the others' by
    // the Δv still to make
    let T = Math.max(20, dvToGo / Math.max(1e-3, aT));
    if (target.retrograde) {
      const s = this.sim.state, rel = this.moonRel(s.t, s.r, s.v), e = dot(rel.v, rel.v) / 2 - MU_MOON / norm(rel.r);
      T = Math.max(4, (e - target.energy) / Math.max(1e-3, aT * norm(g.vIn) * Math.cos(target.pitch ?? 0)));
    }
    const lat = Math.max(-0.6, Math.min(0.6, -(6 * g.y / (T * T) + 4 * g.yd / T) / Math.max(1e-3, aT)));
    return normalize(add(scale(inPlane, Math.sqrt(1 - lat * lat)), scale(n, lat)));
  }

  /**
   * What a burn into a lunar orbit still has to do: the velocity to be gained
   * in the orbit's plane, the stack's distance and speed out of it, and the
   * whole velocity still to change (m/s).
   */
  private lunarToGo(target: LunarTarget): { vgIn: Vec3; vIn: Vec3; y: number; yd: number; total: number } {
    const s = this.sim.state, rel = this.moonRel(s.t, s.r, s.v), n = target.n;
    const y = dot(rel.r, n), yd = dot(rel.v, n);
    const rIn = sub(rel.r, scale(n, y)), rm = norm(rIn), up = normalize(rIn), hor = normalize(cross(n, up));
    const speed = Math.sqrt(Math.max(0, MU_MOON * (2 / rm - 1 / target.a)));
    const vh = Math.min(speed, target.h / rm);
    const vr = Math.sign(dot(rel.v, up) || 1) * Math.sqrt(Math.max(0, speed * speed - vh * vh));
    const vIn = sub(rel.v, scale(n, yd));
    const vgIn = sub(add(scale(hor, vh), scale(up, vr)), vIn);
    return { vgIn, vIn, y, yd, total: Math.hypot(norm(vgIn), yd) };
  }

  /**
   * A burn into a lunar orbit ends when the velocity still to change is under
   * what one step gains, or the energy about the Moon has gone past the
   * orbit's (or, a safeguard, its Δv half as much again is spent).
   */
  private lunarCutoff(b: SpsBurn): boolean {
    const s = this.sim.state, rel = this.moonRel(s.t, s.r, s.v), t = b.target!;
    const energy = dot(rel.v, rel.v) / 2 - MU_MOON / norm(rel.r);
    if (t.retrograde) return energy <= t.energy || b.done > 1.5 * b.dv;
    const aT = SPS.thrust / Math.max(1, this.sim.vehicle.totalMass());
    return this.lunarToGo(t).total < 0.5 * aT * 0.02 + 0.05 || energy < t.energy - 2e3 || b.done > 1.5 * b.dv;
  }

  /**
   * The evasive burn, its flown Δv, in the orbit's plane, pointed so that it
   * lowers the pericynthion to the planned height: of the two directions that
   * do, the one whose arrival is nearer the flown one.
   */
  private evasive(): void {
    if (this.phase !== 'extracted') return;
    const s = this.sim.state, ev = APOLLO11.evasive;
    const vHat = normalize(s.v), nHat = normalize(cross(s.r, s.v)), side = cross(nHat, vHat);
    const dirAt = (phi: number) => add(scale(vHat, Math.cos(phi)), scale(side, Math.sin(phi)));
    const miss = (phi: number) => {
      const p = this.predictPerilune(s.t, { r: s.r, v: add(s.v, scale(dirAt(phi), ev.dv)) });
      return p ? { f: p.alt - ev.perilune, p } : null;
    };
    const N = 12;
    const samples: { phi: number; f: number; t: number }[] = [];
    for (let i = 0; i < N; i++) {
      const phi = (2 * Math.PI * i) / N, m = miss(phi);
      if (m) samples.push({ phi, f: m.f, t: m.p.t });
    }
    let best: { phi: number; score: number } | null = null;
    for (let i = 0; i < samples.length; i++) {
      const a = samples[i], b = samples[(i + 1) % samples.length];
      if (Math.sign(a.f) === Math.sign(b.f)) continue;
      // the root between, by the false position, four times
      let lo = a, hi = b.phi < a.phi ? { ...b, phi: b.phi + 2 * Math.PI } : b;
      let phi = lo.phi;
      for (let k = 0; k < 4; k++) {
        phi = lo.phi + (hi.phi - lo.phi) * (lo.f / (lo.f - hi.f));
        const m = miss(phi);
        if (!m) break;
        const pt = { phi, f: m.f, t: m.p.t };
        if (Math.sign(pt.f) === Math.sign(lo.f)) lo = pt; else hi = pt;
      }
      const m = miss(phi);
      const score = m ? Math.abs(m.p.t - APOLLO11.pericynthion.evasive.t) : Infinity;
      if (!best || score < best.score) best = { phi, score };
    }
    // no direction reaches the planned height: the one that comes nearest
    const phi = best?.phi ?? samples.reduce((x, y) => (Math.abs(y.f) < Math.abs(x.f) ? y : x), samples[0] ?? { phi: Math.PI, f: 0, t: 0 }).phi;
    this.startSps('evasive', dirAt(phi), ev.dv, 'coast');
    this.sim.event('evt.evasive', 'major', { dv: +ev.dv.toFixed(2) });
  }

  /**
   * The midcourse correction: the impulse that puts the pericynthion at the
   * height aimed at, when and at the latitude the flown one was — flown as a
   * burn along it.
   */
  private midcourse(): void {
    if (this.phase !== 'coast' && this.phase !== 'extracted') return;
    const s = this.sim.state, m = APOLLO11.mcc2;
    this.sim.vehicle.payloadMass = APOLLO11.mass.mcc2;
    s.mass = this.sim.vehicle.totalMass();
    const aim: LunarAim = { perilune: APOLLO11.siteRadius + m.perilune - R_MOON, time: m.arrival, lat: m.lat };
    const dv = targetMidcourse(this.jd0, s.t, { r: s.r, v: s.v }, aim);
    if (!dv || !(norm(dv) > 1e-3)) {
      this.sim.event('evt.mccSkipped', 'warn');
      return;
    }
    this.mcc = { dv: norm(dv) };
    this.startSps('midcourse', normalize(dv), norm(dv), 'coast');
    this.sim.event('evt.mcc', 'major', { n: 2, dv: +norm(dv).toFixed(2) });
  }

  private startSps(kind: SpsBurn['kind'], dir: Vec3, dv: number, next: ApolloPhase, target?: LunarTarget, engine?: SpsBurn['engine']): void {
    this.sps = { kind, dir, dv, done: 0, next, ...(target ? { target } : {}), ...(engine ? { engine } : {}) };
    this.phase = kind;
    this.sim.state.note = kind;
  }

  private endSps(): void {
    const b = this.sps;
    if (!b) return;
    this.sps = undefined;
    this.sim.state.thrust = 0;
    if (b.target) {
      // into lunar orbit: its apolune and perilune, above the landing site's radius
      this.phase = b.next;
      this.sim.state.note = 'lunarOrbit';
      const s = this.sim.state, rel = this.moonRel(s.t, s.r, s.v), o = lunarOrbit(rel, this.jd0 + s.t / 86400);
      this.lunar = { ...this.lunar, ...(b.kind === 'loi' ? { loi: b.done } : { loi2: b.done, circularized: s.t }) };
      this.sim.event('evt.lunarOrbit', 'success', { ap: Math.round((o.ra - APOLLO11.siteRadius) / 100) / 10,
        pe: Math.round((o.rp - APOLLO11.siteRadius) / 100) / 10, dv: +b.done.toFixed(1) });
      return;
    }
    if (b.kind === 'tei' || b.kind === 'returnMidcourse') {
      // on the way home: where the flight will meet the air
      this.phase = 'transearth';
      this.sim.state.note = 'transearth';
      const s = this.sim.state, ei = coastToEntryInterface(this.jd0, s.t, { r: s.r, v: s.v }, APOLLO11.entryInterface.t + 12 * 3600);
      this.interfaceAhead = ei ? { fpa: ei.fpa, t: ei.t } : undefined;
      this.sim.event(b.kind === 'tei' ? 'evt.transearth' : 'evt.spsCutoff', 'success', ei ? { fpa: +ei.fpa.toFixed(2), dv: +b.done.toFixed(1) } : { dv: +b.done.toFixed(1) });
      return;
    }
    this.phase = this.soiEntered ? 'approach' : b.next;
    this.sim.state.note = this.phase;
    this.perilune = this.predictPerilune(this.sim.state.t, this.sim.state);
    const p = this.perilune;
    this.sim.event('evt.spsCutoff', 'info', p ? { alt: Math.round(p.alt / 100) / 10 } : undefined);
  }

  /** Into the Moon's sphere of influence: the crossing timed between the steps either side of it. */
  private checkSoi(): void {
    if (this.soiEntered) return;
    const s = this.sim.state, m = moonState(this.jd0 + s.t / 86400);
    const d = norm(sub(s.r, m.r)), last = this.lastMoon;
    this.lastMoon = { t: s.t, d };
    if (d > LUNAR_SOI) return;
    this.soiEntered = true;
    if (this.phase === 'coast' || this.phase === 'extracted') {
      this.phase = 'approach';
      s.note = 'approach';
    }
    const at = last && last.d > d ? last.t + ((last.d - LUNAR_SOI) / (last.d - d)) * (s.t - last.t) : s.t;
    this.sim.event('evt.lunarSoi', 'success', undefined, at);
  }

  /** The next burn or milestone the flight is timed to, s (0 when none is left). */
  private nextMilestone(t: number): number {
    const q = this.spec?.sequence;
    const times = [this.spec?.time ?? 0, q?.panels ?? 0, q?.separation ?? 0, q?.docking ?? 0, q?.extraction ?? 0,
      APOLLO11.evasive.t, APOLLO11.mcc2.t, APOLLO11.loi1.t, APOLLO11.loi2.t, APOLLO11.undocking.t, APOLLO11.csmSep.t,
      APOLLO11.doi.t, APOLLO11.pdi.t - 120, APOLLO11.ascent.t - 120, APOLLO11.csi.t, APOLLO11.cdh.t, this.cdhDone && !this.intercept ? APOLLO11.tpi.t - 600 : 0,
      ...(this.intercept ? [this.intercept - 1500] : []), APOLLO11.jettison.t, APOLLO11.separation.t, APOLLO11.tei.t, APOLLO11.mcc5.t, APOLLO11.cmSep.t, APOLLO11.entryInterface.t - 300];
    return times.filter((x) => x > t).reduce((a, b) => Math.min(a, b), Infinity) || 0;
  }

  /** The frame's copy. */
  frame(): ApolloState | undefined {
    if (!this.started) return undefined;
    const s = this.sim.state, rel = this.moonRel(s.t, s.r, s.v);
    const next = this.nextMilestone(s.t);
    const orbit = ['lunarOrbit', 'circularize', 'undocked', 'doi', 'descentOrbit', ...APOLLO_ASCENT.filter((p) => p !== 'ascent'), ...APOLLO_CSM_BACK]
      .includes(this.phase) ? lunarOrbit(rel, this.jd0 + s.t / 86400) : null;
    const rv = APOLLO_ASCENT.includes(this.phase) && this.csm ? this.rendezvousNow() : undefined;
    const d = this.descent, ds = d && this.phase === 'descent' ? this.siteAt(s.t) : null;
    const descent = d && ds ? (() => {
      const up = normalize(rel.r), vRel = sub(rel.v, ds.v), vz = dot(vRel, up);
      const cosang = Math.max(-1, Math.min(1, dot(up, normalize(ds.r))));
      return { phase: d.phase, ftp: d.ftp, throttle: s.thrust / DPS.rated, alt: this.groundHeight(rel.r),
        range: Math.acos(cosang) * APOLLO11.siteRadius, vh: norm(sub(vRel, scale(up, vz))), vz };
    })() : undefined;
    return {
      phase: this.phase, tliTime: this.spec?.time ?? 0,
      moon: { alt: norm(rel.r) - APOLLO11.siteRadius, speed: norm(rel.v) },
      ...(orbit ? { lunar: { ap: orbit.ra - APOLLO11.siteRadius, pe: orbit.rp - APOLLO11.siteRadius, inc: orbit.inc, ...this.lunar } } : {}),
      next: isFinite(next) ? next : 0,
      ...(this.spec?.sequence ? { sequence: { ...this.spec.sequence } } : {}),
      ...(this.tli ? { tli: { ...this.tli } } : {}),
      ...(this.perilune ? { perilune: { ...this.perilune } } : {}),
      ...(this.mcc ? { mcc: { ...this.mcc } } : {}),
      ...(this.csm ? { csm: { r: { ...this.csm.r }, v: { ...this.csm.v } } } : {}),
      ...(descent ? { descent } : {}),
      ...(this.landed ? { landed: { lat: this.landed.lat, lon: this.landed.lon, miss: this.landed.miss, t: this.landed.t } } : {}),
      ...(rv ? { rendezvous: rv } : {}),
      ...(this.ascentStage ? { ascentStage: { r: { ...this.ascentStage.r }, v: { ...this.ascentStage.v } } } : {}),
      ...(this.dockAxis && this.phase === 'redocked' ? { dockAxis: { ...this.dockAxis } } : {}),
      ...(this.serviceModule ? { serviceModule: { r: { ...this.serviceModule.r }, v: { ...this.serviceModule.v } } } : {}),
      ...(APOLLO_CM.includes(this.phase) ? { entry: { ...this.entryState } } : {}),
      ...(this.interfaceAhead && (this.phase === 'transearth' || this.phase === 'returnMidcourse' || this.phase === 'cmSeparated') ? { interfaceAhead: { ...this.interfaceAhead } } : {}),
      ...(this.splash ? { splash: { ...this.splash } } : {}),
    };
  }
}
