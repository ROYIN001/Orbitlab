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
import { DEG, G0, MU_EARTH } from '../constants';
import { rk4Step } from '../integrator';
import { elementsFromState } from '../orbital';
import { targetAttitude } from '../rigid/runtime';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import { engineStartupS, engineTailoffS } from '../vehicle';
import { APOLLO11, SPS } from '../../data/apollo11';
import { LUNAR_SOI, cislunarStep, coastToPerilune, lunisolar, targetMidcourse, type LunarAim } from '../lunar/cislunar';
import { moonState, R_MOON } from '../lunar/ephemeris';
import { eciToSelenographic } from '../lunar/orientation';
import { pointMassAcceleration } from './forces';
import { TliGuidance } from './tli-guidance';

/**
 * Where the flight is: in the parking orbit; burning for the Moon; coasting
 * with the spacecraft still in the S-IVB; the CSM separated and turning round
 * to dock (transposition); docked to the LM in the adapter; the CSM and LM
 * pulled out; the evasive burn; the coast; the midcourse correction; inside
 * the Moon's sphere of influence; at the Moon, the lunar orbit insertion due.
 */
export type ApolloPhase = 'parking' | 'tli' | 'translunar' | 'transposition' | 'docked' | 'extracted'
  | 'evasive' | 'coast' | 'midcourse' | 'approach' | 'arrival';

/** The phases with the CSM and LM out of the S-IVB, docked nose to nose. */
export const APOLLO_OUT: readonly ApolloPhase[] = ['extracted', 'evasive', 'coast', 'midcourse', 'approach', 'arrival'];

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
  /** the Moon from the spacecraft: its height above the Moon's mean radius (m) and its speed relative to the Moon (m/s) */
  moon: { alt: number; speed: number };
  /** mission time of the next burn or milestone the flight is timed to, s (0 when none) */
  next: number;
  /** mission time the flight reached the Moon, the lunar orbit insertion due, s */
  arrival?: number;
}

/** Integration step while the engine burns, s. */
export const TLI_STEP_S = 0.2;
/** Integration step in the coasts near the Earth, s: a few hundred steps an orbit under J2. */
export const APOLLO_COAST_STEP_S = 10;
/** The CSM and LM's release from the S-IVB, m/s (the ejection springs; Apollo 11 Mission Report). */
export const EXTRACTION_SPEED = 0.3;
/** Integration step while the service propulsion system burns, s, at most. */
const SPS_STEP_S = 0.25;

/** A service-propulsion burn: along a fixed inertial direction, until its Δv is in. */
interface SpsBurn { kind: 'evasive' | 'midcourse'; dir: Vec3; dv: number; done: number; next: ApolloPhase }

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
  private arrival?: number;

  constructor(private readonly sim: Simulation) {}

  /** The flight's injection, when it has one. */
  get spec() { return this.sim.cfg.orbit.injection; }
  /** Flying the stack itself from the parking orbit on. */
  get active(): boolean { return this.started; }
  /** The S-IVB's burn for the Moon. */
  get burning(): boolean { return this.phase === 'tli'; }
  /** The service propulsion system's burn. */
  get spsBurning(): boolean { return !!this.sps; }
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
    const sim = this.sim, s = sim.state, vehicle = sim.vehicle;
    const burning = this.burning, sps = this.sps;
    const mass = Math.max(1, vehicle.totalMass());
    let dir: Vec3;
    let thrust = 0, mdot = 0, throttle = 0;
    if (sps) {
      dir = sps.dir;
      thrust = SPS.thrust;
      mdot = SPS.thrust / (SPS.isp * G0);
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
      sps.done += (thrust / mass) * dt;
    }
    s.dir = dir;
    s.thrust = thrust; s.throttle = throttle; s.coreThrottle = throttle; s.boosterThrottle = 0;
    s.mass = vehicle.totalMass();
    s.gLoad = thrust / mass / G0;
    s.elements = elementsFromState(s.r, s.v);
    if (s.rigid) s.rigid = { ...s.rigid, attitudeQ: targetAttitude(dir, normalize(s.r)), omegaBody: v3() };
    if (burning) this.checkCutoff();
    if (sps && sps.done >= sps.dv - 1e-4) this.endSps();
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
      const aT = SPS.thrust / Math.max(1, s.mass);
      return Math.max(0.01, Math.min(SPS_STEP_S, (this.sps.dv - this.sps.done) / (4 * aT)));
    }
    const aT = s.mass > 0 ? s.thrust / s.mass : 0;
    if (!(aT > 0)) return TLI_STEP_S;
    const tail = this.sim.vehicle.tailoffDeltaV(s.t, 0, s.mass);
    const toGo = (-MU_EARTH / (2 * this.a) - (dot(s.v, s.v) / 2 - MU_EARTH / norm(s.r))) / Math.max(1, norm(s.v)) - tail;
    return Math.max(0.01, Math.min(TLI_STEP_S, toGo / (5 * aT)));
  }

  /** The step the flight wants now, s. */
  suggestedDt(): number {
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
    this.sim.schedule(APOLLO11.loi1.t, 'lunarArrival', () => {
      if (!APOLLO_OUT.includes(this.phase)) return;
      this.phase = 'arrival';
      this.arrival = this.sim.state.t;
      this.sim.state.note = 'lunarArrival';
    });
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

  private startSps(kind: SpsBurn['kind'], dir: Vec3, dv: number, next: ApolloPhase): void {
    this.sps = { kind, dir, dv, done: 0, next };
    this.phase = kind;
    this.sim.state.note = kind;
  }

  private endSps(): void {
    const b = this.sps;
    if (!b) return;
    this.sps = undefined;
    this.phase = this.soiEntered ? 'approach' : b.next;
    this.sim.state.note = this.phase;
    this.sim.state.thrust = 0;
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
      APOLLO11.evasive.t, APOLLO11.mcc2.t, APOLLO11.loi1.t];
    return times.filter((x) => x > t).reduce((a, b) => Math.min(a, b), Infinity) || 0;
  }

  /** The frame's copy. */
  frame(): ApolloState | undefined {
    if (!this.started) return undefined;
    const s = this.sim.state, m = moonState(this.jd0 + s.t / 86400);
    const next = this.nextMilestone(s.t);
    return {
      phase: this.phase, tliTime: this.spec?.time ?? 0,
      moon: { alt: norm(sub(s.r, m.r)) - R_MOON, speed: norm(sub(s.v, m.v)) },
      next: isFinite(next) ? next : 0,
      ...(this.spec?.sequence ? { sequence: { ...this.spec.sequence } } : {}),
      ...(this.tli ? { tli: { ...this.tli } } : {}),
      ...(this.perilune ? { perilune: { ...this.perilune } } : {}),
      ...(this.mcc ? { mcc: { ...this.mcc } } : {}),
      ...(this.arrival !== undefined ? { arrival: this.arrival } : {}),
    };
  }
}
