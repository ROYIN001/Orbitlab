/**
 * A rendezvous and docking with the station (roadmap G07): the simulation's
 * side of it. From the spacecraft's separation the flight is the
 * spacecraft's: the burns of the chosen profile on its main engine (СКД), then
 * the automatic approach (Kurs) on its attitude and translation thrusters
 * (ДПО) — to a point 400 m off, round the station to the port's axis, a hold
 * at 150 m, the final approach — and the docking: contact, capture, the hooks
 * closed. In the Engineer mode the final metres can be flown by hand (TORU).
 *
 * The far phases are flown as a point under J2 with the attitude set where
 * each burn needs it; from the approach on the spacecraft is a rigid body in
 * six degrees of freedom, as the station's docking port is judged against its
 * probe. Numbers and sources: docs/PHYSICS.md §9.2.
 */
import type { Simulation } from '../simulation';
import { atmosphere } from '../atmosphere';
import { G0, OMEGA_EARTH, R_EARTH } from '../constants';
import { gravityJ2 } from '../gravity';
import { rk4Step } from '../integrator';
import { add, cross, dot, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import { integrateRigidStep, type RigidState } from '../rigid/integrator';
import { quatFromMatrix, quatInverseRotate, quatMultiply, quatRotate, type Mat3, type Quat } from '../rigid/math';
import { targetAttitude } from '../rigid/runtime';
import type { RigidTelemetry } from '../rigid/telemetry';
import { AIM_POINT, APPROACH, PROFILES, SPACECRAFT, rendezvousAvailable, type RendezvousProfileId } from '../rendezvous/profiles';
import { vehicleDataId } from '../../data/vehicles';
import { PORTS, type PortId } from '../rendezvous/ports';
import { brakeImpulse, leadAngle, planRendezvous, posigrade, raiseImpulse, type BurnId, type RendezvousPlan } from '../rendezvous/plan';
import { STATION_RADIUS, fromLvlh, lvlhFrame, toLvlh, type PointState } from '../rendezvous/station';
import { coastJ2, interceptImpulse } from '../rendezvous/targeting';

export type RendezvousPhase = 'separation' | 'coast' | 'burn' | 'approach' | 'flyaround' | 'stationkeeping' | 'final' | 'retreat' | 'capture' | 'docked' | 'aborted';

/** What a frame carries of the rendezvous: the station, where the spacecraft is from it, and what it is doing. */
export interface RendezvousState {
  profile: RendezvousProfileId;
  port: PortId;
  phase: RendezvousPhase;
  /** the station's centre of mass and velocity, ECI, and its attitude (its LVLH axes) */
  station: { r: Vec3; v: Vec3; q: Quat };
  /** the spacecraft's centre of mass from the station, LVLH axes (x V-bar, y −h, z R-bar), m and m/s */
  rel: { r: Vec3; v: Vec3 };
  /** distance and closing speed, m and m/s (positive closing) */
  range: number;
  rangeRate: number;
  /** the probe's distance to the port along its axis, and off it, m (the approach's last hundred metres) */
  axial?: number;
  lateral?: number;
  /** the burns: when, the impulse (m/s), flown or not */
  burns: { id: BurnId; t: number; dv: number; done: boolean }[];
  /** the burn under way */
  burn?: BurnId;
  /** arrival at the aim point, s */
  tArrive: number;
  /** the final approach flown by hand (TORU) */
  manual: boolean;
  /** what the docking mechanism saw at contact: closing and lateral speed (m/s), miss (m), pitch/yaw and roll error (deg), rate (deg/s) */
  contact?: { t: number; speed: number; lateralSpeed: number; lateral: number; angle: number; roll: number; rate: number; captured: boolean };
  /** hooks closed, s */
  dockedAt?: number;
  /** propellant left, kg */
  propellant: number;
}

/** The hand controllers of the TORU mode: translation (m/s wanted along the port's axes) and rotation (rad/s wanted, body axes). */
export interface ToruCommand { translate: Vec3; rotate: Vec3 }

const ZERO_Q: Quat = { w: 1, x: 0, y: 0, z: 0 };
const INERTIA: Mat3 = [SPACECRAFT.inertia[0], 0, 0, 0, SPACECRAFT.inertia[1], 0, 0, 0, SPACECRAFT.inertia[2]];
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const quatConj = (q: Quat): Quat => ({ w: q.w, x: -q.x, y: -q.y, z: -q.z });
const normalizeQ = (q: Quat): Quat => { const n = Math.hypot(q.w, q.x, q.y, q.z) || 1; return { w: q.w / n, x: q.x / n, y: q.y / n, z: q.z / n }; };
/** The rotation by `angle` about the unit axis `k`. */
const axisAngle = (k: Vec3, angle: number): Quat => { const h = angle / 2, sn = Math.sin(h); return { w: Math.cos(h), x: k.x * sn, y: k.y * sn, z: k.z * sn }; };

/** The station's attitude: its body axes on its LVLH axes (+XVV). */
function stationAttitude(st: PointState): Quat {
  const f = lvlhFrame(st);
  return quatFromMatrix([f.x.x, f.y.x, f.z.x, f.x.y, f.y.y, f.z.y, f.x.z, f.y.z, f.z.z]);
}

export class Rendezvous {
  plan: RendezvousPlan | null = null;
  phase: RendezvousPhase = 'separation';
  private burnIndex = 0;
  private burnDir = v3();
  private burnLeft = 0;
  private solved = new Map<BurnId, number>();
  /** the spacecraft in six degrees of freedom (from the approach on) */
  private body: RigidState | null = null;
  private attitude: Quat = ZERO_Q;
  private phaseStart = 0;
  /** the direction from the port the approach comes in on, station LVLH (set when the approach starts) */
  private holdDir = v3(-1, 0, 0);
  /** the flyaround's length, s */
  private flyTime = 0;
  /** the attitude the hand controller holds, from the station's (TORU), and the rate it turns it at (body axes) */
  private manualAttitude: Quat | null = null;
  private rateFeed = v3();
  private attempts = 0;
  private toru: ToruCommand | null = null;
  private manualMode = false;
  private contactInfo: RendezvousState['contact'];
  private dockedAt: number | undefined;
  private prevAxial = Infinity;
  private propellant = 0;

  constructor(readonly sim: Simulation) {}

  /** This mission flies to the station. */
  get enabled(): boolean {
    const cfg = this.sim.cfg.rendezvous;
    return !!cfg && rendezvousAvailable(vehicleDataId(this.sim.vehicleSpec), this.sim.cfg.satelliteId, this.sim.cfg.orbit);
  }
  get profile(): RendezvousProfileId { return this.sim.cfg.rendezvous?.profile ?? 'twoOrbit'; }
  get port(): PortId { return this.sim.cfg.rendezvous?.port ?? 'rassvet'; }

  /**
   * The ascent has ended: the rendezvous takes the flight over. The
   * spacecraft separates from the spent stage when its tail-off is over.
   */
  onInsertion(): void {
    for (const b of this.sim.plan.burns) b.done = true;
    const s = this.sim.state;
    // the stage's tail-off, which the cut-off was judged with, is still to come: the spacecraft rides it before it separates
    const tail = this.sim.vehicle.tailoffDeltaV(s.t, atmosphere(Math.max(0, norm(s.r) - R_EARTH)).p, s.mass);
    if (tail > 0) s.v = add(s.v, scale(s.dir, tail));
    s.status = 'rendezvous';
    s.note = 'rendezvous';
    s.currentBurn = null;
    s.nextBurnTime = -1;
    this.phase = 'separation';
    this.sim.staging.separatePayload(false);
  }

  /** The spacecraft has separated: plan the profile and place the station. */
  start(): void {
    const sim = this.sim, s = sim.state;
    const sc = sim.vehicle.stages.find((st) => st.spec.isSpacecraft && st.attached);
    this.propellant = sc ? sc.propellant : 0;
    this.plan = planRendezvous(this.profile, s.t, { r: s.r, v: s.v }, STATION_RADIUS);
    this.burnIndex = 0;
    this.phase = 'coast';
    this.attitude = targetAttitude(s.v, scale(s.r, -1));
    const st = this.plan.station.at(s.t);
    sim.event('evt.rendezvousPlan', 'info', {
      profile: this.profile, lead: +(leadAngle({ r: s.r, v: s.v }, st) * 180 / Math.PI).toFixed(1),
      arrive: Math.round((this.plan.tArrive - s.t) / 60),
    });
    this.sync();
  }

  /** The Engineer mode's hand controllers: take over the approach (null hands it back to Kurs). */
  command(cmd: ToruCommand | null): boolean {
    if (!this.plan || !this.inApproach) return false;
    if (cmd && !this.manualMode) {
      this.sim.event('evt.toruOn', 'info', { range: Math.round(this.rangeNow()) });
      // the operator flies it from here on: the final approach, judged at contact
      this.manualAttitude = null;
      this.phase = 'final';
      this.phaseStart = this.sim.state.t;
    }
    if (!cmd && this.manualMode) {
      // Kurs takes it back from the stationkeeping point
      this.sim.event('evt.toruOff', 'info');
      this.enter('retreat', 'evt.kursRetreat');
    }
    this.manualMode = !!cmd;
    this.toru = cmd;
    // the frame the recorder pins the command into says so
    this.sync();
    return true;
  }

  /** The flight to the station is over but the spacecraft is still its: docked, or coasting by it after a docking called off. */
  get holding(): boolean {
    return !!this.plan && (this.phase === 'capture' || this.phase === 'docked' || this.phase === 'aborted');
  }

  private get inApproach(): boolean {
    return this.phase === 'approach' || this.phase === 'flyaround' || this.phase === 'stationkeeping' || this.phase === 'final' || this.phase === 'retreat';
  }

  suggestedDt(): number {
    const s = this.sim.state;
    if (!this.plan) return 1;
    switch (this.phase) {
      case 'coast': {
        const b = this.plan.burns[this.burnIndex];
        if (!b) return 1;
        const start = b.t - this.burnDuration(b.id) / 2;
        return clamp(start - s.t, 0.05, 10);
      }
      case 'burn': return 0.5;
      case 'approach': case 'flyaround': case 'retreat': return this.rangeNow() > 2000 ? 1 : 0.25;
      case 'stationkeeping': return 0.25;
      case 'final': return 0.05;
      case 'capture': return 5;
      default: return 10;
    }
  }

  private burnDuration(id: BurnId): number {
    const b = this.plan?.burns.find((x) => x.id === id);
    const dv = this.solved.get(id) ?? (b ? norm(b.dv) : 0);
    const mass = this.mass();
    return (mass * dv) / SPACECRAFT.mainThrust;
  }

  private mass(): number {
    const sc = this.sim.vehicle.stages.find((st) => st.spec.isSpacecraft);
    return sc ? sc.spec.dryMass + this.propellant : this.sim.state.mass;
  }

  private rangeNow(): number {
    const s = this.sim.state;
    return this.plan ? norm(sub(s.r, this.plan.station.at(s.t).r)) : Infinity;
  }

  /** Advance the rendezvous by `dt`. */
  step(dt: number): void {
    const sim = this.sim, s = sim.state;
    if (this.phase === 'separation') {
      // the spent stage is still tailing off: coast with it
      const next = rk4Step(0, { r: s.r, v: s.v }, dt, (_t, r) => gravityJ2(r));
      s.r = next.r; s.v = next.v; s.t += dt;
      if (s.payloadSeparated) this.start();
      return;
    }
    const plan = this.plan!;
    switch (this.phase) {
      case 'coast': {
        const next = rk4Step(0, { r: s.r, v: s.v }, dt, (_t, r) => gravityJ2(r));
        s.r = next.r; s.v = next.v; s.t += dt;
        this.attitude = targetAttitude(s.v, scale(s.r, -1));
        const b = plan.burns[this.burnIndex];
        if (b && s.t >= b.t - this.burnDuration(b.id) / 2 - 1e-6) this.startBurn();
        else if (!b) this.startApproach();
        break;
      }
      case 'burn': this.stepBurn(dt); break;
      case 'capture': case 'docked': this.stepDocked(dt); break;
      case 'aborted': {
        const next = rk4Step(0, { r: s.r, v: s.v }, dt, (_t, r) => gravityJ2(r));
        s.r = next.r; s.v = next.v; s.t += dt;
        break;
      }
      default: this.stepApproach(dt);
    }
    this.sync();
  }

  // ------------------------------------------------------------ burns
  private startBurn(): void {
    const sim = this.sim, s = sim.state, plan = this.plan!;
    const b = plan.burns[this.burnIndex];
    // each impulse is solved where the finite burn is centred, half its length ahead
    const half = Math.max(0, b.t - s.t);
    const here: PointState = coastJ2({ r: s.r, v: s.v }, half, 1);
    const tc = s.t + half;
    let dv: Vec3;
    switch (b.kind) {
      case 'phasing': dv = posigrade(here, this.nominalDv(b.id)); break;
      case 'correction': dv = this.phasingCorrection(here, tc); break;
      case 'transfer': {
        const aim = fromLvlh(plan.station.at(plan.tArrive), { r: v3(AIM_POINT.x, 0, AIM_POINT.z), v: v3() });
        const guess = raiseImpulse(here, norm(aim.r));
        const shot = interceptImpulse(here, plan.tArrive - tc, aim.r, guess, 5);
        dv = shot ? shot.dv : guess;
        break;
      }
      default: dv = brakeImpulse(plan.station.at(tc), here);
    }
    const mag = norm(dv);
    this.solved.set(b.id, mag);
    b.dv = dv;
    if (mag < 0.05) {
      this.burnIndex++;
      return;
    }
    this.burnDir = normalize(dv);
    this.burnLeft = mag;
    this.phase = 'burn';
    this.attitude = targetAttitude(this.burnDir, scale(s.r, -1));
    sim.event('evt.rendezvousBurn', 'info', { burn: b.id, dv: +mag.toFixed(1) });
  }

  /** A phasing burn's (or the correction's nominal) size, m/s. */
  private nominalDv(id: BurnId): number {
    return PROFILES[this.profile].burns.find((b) => b.id === id)?.dv ?? 0;
  }

  /** A posigrade impulse that brings the station's lead at the transfer back to the plan's (secant on the J2 coast from the burn's centre `tc`). */
  private phasingCorrection(here: PointState, tc: number): Vec3 {
    const plan = this.plan!;
    const transfer = plan.burns.find((b) => b.kind === 'transfer')!;
    // the coast to the transfer, with the phasing burns still to come on it as impulses
    const later = plan.burns.filter((b) => b.kind === 'phasing' && b.t > tc && b.t < transfer.t);
    const leadAt = (x: number) => {
      let st: PointState = { r: here.r, v: add(here.v, posigrade(here, x)) }, t = tc;
      for (const b of later) {
        st = coastJ2(st, b.t - t, 10);
        st = { r: st.r, v: add(st.v, posigrade(st, this.nominalDv(b.id))) };
        t = b.t;
      }
      return leadAngle(coastJ2(st, transfer.t - t, 10), plan.station.at(transfer.t)) - plan.leadAtTransfer;
    };
    const x0 = this.nominalDv('corr');
    let a = x0, b = x0 + 0.5, fa = leadAt(a), fb = leadAt(b);
    for (let k = 0; k < 10 && Math.abs(fb) > 1e-6 && fb !== fa; k++) {
      const c = b - (fb * (b - a)) / (fb - fa);
      a = b; fa = fb; b = clamp(c, -20, 20); fb = leadAt(b);
    }
    return posigrade(here, b);
  }

  private stepBurn(dt: number): void {
    const sim = this.sim, s = sim.state;
    const mass = this.mass();
    const a = SPACECRAFT.mainThrust / mass;
    const h = Math.min(dt, this.burnLeft / a);
    const accel = scale(this.burnDir, a);
    const next = rk4Step(0, { r: s.r, v: s.v }, h, (_t, r) => add(gravityJ2(r), accel));
    s.r = next.r; s.v = next.v;
    if (dt > h) {
      const rest = rk4Step(0, { r: s.r, v: s.v }, dt - h, (_t, r) => gravityJ2(r));
      s.r = rest.r; s.v = rest.v;
    }
    s.t += dt;
    this.burnLeft -= a * h;
    this.propellant = Math.max(0, this.propellant - (SPACECRAFT.mainThrust / (SPACECRAFT.mainIsp * G0)) * h);
    s.thrust = SPACECRAFT.mainThrust; s.throttle = 1;
    if (this.burnLeft <= 1e-3 || this.propellant <= 0) {
      const b = this.plan!.burns[this.burnIndex];
      sim.event('evt.rendezvousBurnDone', 'info', { burn: b.id });
      this.burnIndex++;
      this.phase = 'coast';
      s.thrust = 0; s.throttle = 0;
      if (b.kind === 'brake') this.startApproach();
    }
  }

  // ------------------------------------------------------------ the approach
  private startApproach(): void {
    const sim = this.sim, s = sim.state, plan = this.plan!;
    const st = plan.station.at(s.t);
    this.body = { r: { ...s.r }, v: { ...s.v }, attitudeQ: this.attitude, omegaBody: quatInverseRotate(this.attitude, lvlhFrame(st).omega) };
    // the flyaround starts 400 m off the port, on the side the spacecraft comes from
    const port = this.portNow(s.t), f = lvlhFrame(st), d = sub(s.r, port.p);
    this.holdDir = normalize(v3(dot(d, f.x), dot(d, f.y), dot(d, f.z)));
    this.phase = 'approach';
    this.phaseStart = s.t;
    sim.event('evt.kursApproach', 'info', { range: Math.round(norm(sub(s.r, st.r))) });
  }

  /** The port's centre, axis and velocity, ECI, at `t`. */
  private portNow(t: number): { p: Vec3; n: Vec3; v: Vec3; st: PointState; q: Quat; omega: Vec3 } {
    const st = this.plan!.station.at(t);
    const q = stationAttitude(st), port = PORTS[this.port];
    const arm = quatRotate(q, port.position);
    const omega = lvlhFrame(st).omega;
    return { p: add(st.r, arm), n: quatRotate(q, port.axis), v: add(st.v, cross(omega, arm)), st, q, omega };
  }

  private stepApproach(dt: number): void {
    const sim = this.sim, s = sim.state, body = this.body!;
    const t = s.t;
    const port = this.portNow(t);
    const f = lvlhFrame(port.st);
    const lv = (x: number, y: number, z: number) => add(add(scale(f.x, x), scale(f.y, y)), scale(f.z, z));
    // the target point and its velocity (moving with the station's frame), and how fast to close on it
    let target: Vec3, speedLimit: number, targetVel = v3();
    let noseAt: Vec3 = port.st.r;
    let docking = false;
    switch (this.phase) {
      case 'approach': {
        target = add(port.p, lv(this.holdDir.x * APPROACH.flyaroundRange, this.holdDir.y * APPROACH.flyaroundRange, this.holdDir.z * APPROACH.flyaroundRange));
        speedLimit = APPROACH.farSpeed;
        if (norm(sub(body.r, target)) < 30) {
          const angle = Math.acos(clamp(dot(this.holdDir, PORTS[this.port].axis), -1, 1));
          this.flyTime = Math.max(APPROACH.flyaroundMin, angle / APPROACH.flyaroundRate);
          this.enter('flyaround', 'evt.kursFlyaround');
        }
        break;
      }
      case 'flyaround': {
        // round the station onto the port's axis and in to the stationkeeping point, the point moving on a smooth schedule
        const tau = clamp((t - this.phaseStart) / this.flyTime, 0, 1);
        const p = tau * tau * (3 - 2 * tau), rate = (6 * tau * (1 - tau)) / this.flyTime;
        const here = this.flyPoint(p), ahead = this.flyPoint(Math.min(1, p + 1e-3));
        target = add(port.p, lv(here.x, here.y, here.z));
        const dp = Math.min(1, p + 1e-3) - p;
        if (dp > 0) targetVel = scale(lv(ahead.x - here.x, ahead.y - here.y, ahead.z - here.z), rate / dp);
        speedLimit = 1.5;
        if (tau >= 1 && norm(sub(body.r, target)) < 3) this.enter('stationkeeping', 'evt.kursStationkeeping');
        break;
      }
      case 'retreat':
      case 'stationkeeping': {
        target = add(port.p, scale(port.n, APPROACH.stationkeepingRange + SPACECRAFT.probe));
        noseAt = port.p;
        speedLimit = 0.8;
        const settled = norm(sub(body.r, target)) < 1.5 && norm(this.relVel(body, port)) < 0.05;
        if (this.phase === 'retreat' && settled) this.enter('stationkeeping', 'evt.kursStationkeeping');
        else if (settled && s.t - this.phaseStart > APPROACH.stationkeepingHold) this.enter('final', 'evt.kursFinal');
        break;
      }
      default: {
        // final: close along the port's axis on the speed schedule, the probe held on the axis
        docking = true;
        noseAt = port.p;
        const tip = add(body.r, quatRotate(body.attitudeQ, v3(SPACECRAFT.probe, 0, 0)));
        const axial = dot(sub(tip, port.p), port.n);
        const closing = clamp(APPROACH.finalGain * axial + APPROACH.contactSpeed, APPROACH.contactSpeed, APPROACH.finalMaxSpeed);
        target = add(port.p, scale(port.n, Math.max(0, axial - closing * 2) + SPACECRAFT.probe));
        targetVel = scale(port.n, -closing);
        speedLimit = APPROACH.finalMaxSpeed;
        this.checkContact(tip, axial, body, port);
        if (this.phase !== 'final') return this.integrate(dt, v3(), v3());
      }
    }
    // --- translation: a velocity toward the target, braking in time, relative to the moving frame
    const toTarget = sub(target, body.r);
    const d = norm(toTarget);
    const brake = Math.sqrt(2 * APPROACH.farBraking * d);
    const along = d > 1e-6 ? scale(toTarget, Math.min(speedLimit, brake, 0.05 + 0.02 * d) / d) : v3();
    let vWanted = add(along, targetVel);
    if (docking) vWanted = add(targetVel, scale(sub(toTarget, scale(port.n, dot(toTarget, port.n))), 0.1));
    if (this.manualMode && this.toru) {
      // TORU: the hand controller asks for a velocity along the port's axes (x toward the port)
      const u = this.portAxes(port.n, port.q);
      vWanted = add(add(scale(u.x, this.toru.translate.x), scale(u.y, this.toru.translate.y)), scale(u.z, this.toru.translate.z));
    }
    const vRel = this.relVel(body, port);
    const aWanted = scale(sub(vWanted, vRel), 1 / 4);
    if (this.manualMode && this.toru) {
      // and a rate about the spacecraft's axes; released, it holds the attitude in the station's frame
      const qs = this.manualAttitude ?? quatMultiply(quatConj(port.q), body.attitudeQ);
      const w = this.toru.rotate, wm = norm(w);
      this.manualAttitude = wm > 1e-9 ? normalizeQ(quatMultiply(qs, axisAngle(scale(w, 1 / wm), wm * dt))) : qs;
      this.attitude = quatMultiply(port.q, this.manualAttitude);
      this.rateFeed = w;
    } else {
      this.rateFeed = v3();
      // the attitude: the probe on the port (docking) or the nose on the station, rolled to the station's x
      const nose = docking || this.phase === 'stationkeeping' || this.phase === 'retreat' ? scale(port.n, -1) : normalize(sub(noseAt, body.r));
      this.attitude = targetAttitude(nose, quatRotate(port.q, v3(1, 0, 0)));
    }
    this.integrate(dt, aWanted, port.omega);
  }

  private enter(phase: RendezvousPhase, event: string): void {
    this.phase = phase;
    this.phaseStart = this.sim.state.t;
    this.sim.event(event, 'info', { range: Math.round(this.rangeNow()) });
  }

  /** The flyaround's point at progress `p` (0 to 1), from the port, station LVLH axes, m: turned from the approach's side onto the port's axis and brought in from 400 m to the stationkeeping point. */
  private flyPoint(p: number): Vec3 {
    const axis = PORTS[this.port].axis;
    const radius = APPROACH.flyaroundRange + (APPROACH.stationkeepingRange + SPACECRAFT.probe - APPROACH.flyaroundRange) * p;
    const angle = Math.acos(clamp(dot(this.holdDir, axis), -1, 1));
    let k = cross(this.holdDir, axis);
    if (norm(k) < 1e-6) k = v3(0, 1, 0);
    k = normalize(k);
    const a = angle * p, c = Math.cos(a), sn = Math.sin(a), u = this.holdDir;
    const dir = add(add(scale(u, c), scale(cross(k, u), sn)), scale(k, dot(k, u) * (1 - c)));
    return scale(dir, radius);
  }

  /** The port's axes for the hand controller: x into the port, y and z across it. */
  private portAxes(n: Vec3, q: Quat): { x: Vec3; y: Vec3; z: Vec3 } {
    const x = scale(n, -1);
    let z = quatRotate(q, v3(1, 0, 0));
    z = normalize(sub(z, scale(x, dot(z, x))));
    return { x, y: cross(z, x), z };
  }

  /** The spacecraft's velocity from the station's rotating frame at its own position. */
  private relVel(body: RigidState, port: { st: PointState; omega: Vec3 }): Vec3 {
    return sub(sub(body.v, port.st.v), cross(port.omega, sub(body.r, port.st.r)));
  }

  /** One rigid step with the thrusters asked for `accel` (ECI) and the attitude held on `this.attitude`. */
  private integrate(dt: number, accel: Vec3, frameRate: Vec3): void {
    const s = this.sim.state, body = this.body!;
    const mass = this.mass();
    // the translation force in body axes, within what the thrusters give
    const fBody = quatInverseRotate(body.attitudeQ, scale(accel, mass));
    const fx = clamp(fBody.x, -SPACECRAFT.translationAxial, SPACECRAFT.translationAxial);
    const fy = clamp(fBody.y, -SPACECRAFT.translationLateral, SPACECRAFT.translationLateral);
    const fz = clamp(fBody.z, -SPACECRAFT.translationLateral, SPACECRAFT.translationLateral);
    const forceECI = quatRotate(body.attitudeQ, v3(fx, fy, fz));
    // the attitude: a rate toward the wanted attitude, the frame's own rate added
    const qErr = quatMultiply({ w: body.attitudeQ.w, x: -body.attitudeQ.x, y: -body.attitudeQ.y, z: -body.attitudeQ.z }, this.attitude);
    const sign = qErr.w < 0 ? -1 : 1;
    const errBody = v3(2 * sign * qErr.x, 2 * sign * qErr.y, 2 * sign * qErr.z);
    // the commanded turn (TORU's rotation controller) fed forward, so the attitude does not lag it
    const rateWanted = add(add(scale(errBody, 0.08), quatInverseRotate(body.attitudeQ, frameRate)), this.rateFeed);
    const I = SPACECRAFT.inertia;
    const torque = v3(
      clamp(I[0] * 0.5 * (rateWanted.x - body.omegaBody.x), -SPACECRAFT.torque, SPACECRAFT.torque),
      clamp(I[1] * 0.5 * (rateWanted.y - body.omegaBody.y), -SPACECRAFT.torque, SPACECRAFT.torque),
      clamp(I[2] * 0.5 * (rateWanted.z - body.omegaBody.z), -SPACECRAFT.torque, SPACECRAFT.torque));
    const result = integrateRigidStep(s.t, body, dt, (_t, st) => ({
      mass, inertiaBody: INERTIA, forceECI, momentBody: torque, externalAccelerationECI: gravityJ2(st.r),
    }));
    this.body = result.state;
    s.r = result.state.r; s.v = result.state.v; s.t += dt;
    const used = (Math.abs(fx) + Math.abs(fy) + Math.abs(fz) + (Math.abs(torque.x) + Math.abs(torque.y) + Math.abs(torque.z)) / 3) / (SPACECRAFT.thrusterIsp * G0);
    this.propellant = Math.max(0, this.propellant - used * dt);
    s.thrust = 0; s.throttle = 0;
  }

  // ------------------------------------------------------------ contact and docking
  private checkContact(tip: Vec3, axial: number, body: RigidState, port: ReturnType<Rendezvous['portNow']>): void {
    const sim = this.sim, s = sim.state;
    if (!(axial <= 0 && this.prevAxial > 0)) { this.prevAxial = axial; return; }
    this.prevAxial = axial;
    const tipV = add(body.v, quatRotate(body.attitudeQ, cross(body.omegaBody, v3(SPACECRAFT.probe, 0, 0))));
    const vRel = sub(tipV, add(port.v, cross(port.omega, sub(tip, port.p))));
    const speed = -dot(vRel, port.n);
    const lateralSpeed = norm(sub(vRel, scale(port.n, -speed)));
    const off = sub(sub(tip, port.p), scale(port.n, axial));
    const lateral = norm(off);
    const angle = Math.acos(clamp(dot(quatRotate(body.attitudeQ, v3(1, 0, 0)), scale(port.n, -1)), -1, 1)) * 180 / Math.PI;
    // roll: the turn about the long axis left between the spacecraft and its docked attitude
    const qDock = targetAttitude(scale(port.n, -1), quatRotate(port.q, v3(1, 0, 0)));
    const qe = quatMultiply(quatConj(qDock), body.attitudeQ);
    const roll = Math.abs(Math.atan2(qe.x, qe.w) * 2 * 180 / Math.PI);
    const rollErr = roll > 180 ? 360 - roll : roll;
    const rate = norm(sub(body.omegaBody, quatInverseRotate(body.attitudeQ, port.omega))) * 180 / Math.PI;
    const captured = speed >= APPROACH.captureSpeed[0] && speed <= APPROACH.captureSpeed[1] && lateral <= APPROACH.captureLateral
      && lateralSpeed <= APPROACH.captureLateralSpeed && angle <= APPROACH.captureAngle && rollErr <= APPROACH.captureRoll && rate <= APPROACH.captureRate;
    this.contactInfo = {
      t: s.t, speed: +speed.toFixed(3), lateralSpeed: +lateralSpeed.toFixed(3), lateral: +lateral.toFixed(3),
      angle: +angle.toFixed(2), roll: +rollErr.toFixed(2), rate: +rate.toFixed(3), captured,
    };
    sim.event(captured ? 'evt.contact' : 'evt.contactFailed', captured ? 'success' : 'warn',
      { speed: +speed.toFixed(2), lateral: +lateral.toFixed(2), angle: +angle.toFixed(1) });
    if (captured) {
      this.phase = 'capture';
      this.phaseStart = s.t;
      this.manualMode = false;
      this.toru = null;
    } else if (++this.attempts < 2) {
      this.manualMode = false;
      this.toru = null;
      this.enter('retreat', 'evt.kursRetreat');
      this.prevAxial = Infinity;
    } else {
      this.phase = 'aborted';
      s.status = 'orbit';
      s.note = 'dockingAborted';
      sim.event('evt.dockingAborted', 'fail');
    }
  }

  /** Held on the port: the station carries the spacecraft. */
  private stepDocked(dt: number): void {
    const sim = this.sim, s = sim.state;
    s.t += dt;
    const port = this.portNow(s.t);
    const q = targetAttitude(scale(port.n, -1), quatRotate(port.q, v3(1, 0, 0)));
    const r = add(port.p, scale(port.n, SPACECRAFT.probe));
    this.body = { r, v: add(port.v, cross(port.omega, scale(port.n, SPACECRAFT.probe))), attitudeQ: q, omegaBody: quatInverseRotate(q, port.omega) };
    s.r = this.body.r; s.v = this.body.v;
    if (this.phase === 'capture' && s.t - this.phaseStart >= APPROACH.hooks) {
      this.phase = 'docked';
      this.dockedAt = s.t;
      s.status = 'orbit';
      s.note = 'docked';
      const liftoff = sim.events.find((e) => e.key === 'evt.liftoff')?.t ?? 0;
      sim.event('evt.docked', 'success', { port: this.port, hours: +((s.t - liftoff) / 3600).toFixed(2) });
    }
  }

  // ------------------------------------------------------------ the frame
  sync(): void {
    const sim = this.sim, s = sim.state, plan = this.plan;
    if (!plan) return;
    const st = plan.station.at(s.t);
    const rel = toLvlh(st, { r: s.r, v: s.v });
    const range = norm(rel.r);
    const q = this.body?.attitudeQ ?? this.attitude;
    s.dir = quatRotate(q, v3(1, 0, 0));
    s.mass = this.mass();
    // in free fall but for the main engine (a few hundredths of a g); the thrusters' pushes are smaller still
    s.gLoad = this.phase === 'burn' ? SPACECRAFT.mainThrust / s.mass / G0 : 0;
    const sc = sim.vehicle.stages.find((x) => x.spec.isSpacecraft);
    if (sc) sc.propellant = this.propellant;
    s.rigid = this.telemetry(q);
    let axial: number | undefined, lateral: number | undefined;
    if (this.body && this.inApproachOrDocked()) {
      const port = this.portNow(s.t);
      const tip = add(this.body.r, quatRotate(this.body.attitudeQ, v3(SPACECRAFT.probe, 0, 0)));
      axial = dot(sub(tip, port.p), port.n);
      lateral = norm(sub(sub(tip, port.p), scale(port.n, axial)));
    }
    s.rendezvous = {
      profile: plan.profile, port: this.port, phase: this.phase,
      station: { r: st.r, v: st.v, q: stationAttitude(st) },
      rel, range, rangeRate: range > 1e-6 ? -dot(rel.r, rel.v) / range : 0,
      ...(axial !== undefined ? { axial, lateral } : {}),
      burns: plan.burns.map((b, i) => ({ id: b.id, t: b.t, dv: +(this.solved.get(b.id) ?? norm(b.dv)).toFixed(1), done: i < this.burnIndex })),
      ...(this.phase === 'burn' ? { burn: plan.burns[this.burnIndex].id } : {}),
      tArrive: plan.tArrive, manual: this.manualMode,
      ...(this.contactInfo ? { contact: this.contactInfo } : {}),
      ...(this.dockedAt !== undefined ? { dockedAt: this.dockedAt } : {}),
      propellant: this.propellant,
    };
    s.nextBurnTime = plan.burns[this.burnIndex]?.t ?? -1;
  }

  private inApproachOrDocked(): boolean {
    return this.inApproach || this.phase === 'capture' || this.phase === 'docked';
  }

  private telemetry(q: Quat): RigidTelemetry {
    const omega = this.body?.omegaBody ?? v3();
    return {
      modelVersion: 'rendezvous-1', bodyId: 'spacecraft', configurationId: 'rendezvous.spacecraft',
      attitudeQ: { ...q }, omegaBody: { ...omega }, cgBody: v3(), inertiaBody: INERTIA,
      renderOffsetBody: v3(-this.cgAboveBase(), 0, 0), controlMode: this.manualMode ? 'manual' : 'auto', engineDeflections: {},
      rcsPropellantKg: this.propellant, saturated: false, angleOfAttack: 0, sideslip: 0, aeroWithinEnvelope: true, windECI: v3(),
      rawQuaternionNormError: 0,
    };
  }

  /** The spacecraft's centre of mass above the base it is drawn from, m (the probe's tip is at the top). */
  private cgAboveBase(): number {
    const h = this.sim.satellite.size?.height ?? 7;
    return h - SPACECRAFT.probe;
  }

  /** The spacecraft's rotation rate the Earth's turning would give it at rest (for a landed hand-over; unused in orbit). */
  static readonly EARTH_RATE = v3(0, 0, OMEGA_EARTH);
}
