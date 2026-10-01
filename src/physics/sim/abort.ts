/**
 * A crewed launch abort (roadmap G06): the simulation's side of the escape
 * (src/physics/rigid/escape.ts). An abort hands the flight over to the crew:
 * from the command on, the simulation's state is the escaping body — the head
 * section, then the descent module — and the rocket left behind is debris.
 * The flight ends with the descent module at rest, `status` 'landed' — or,
 * when the pilot left it on his seat (C01: Vostok-1), with him on the ground
 * too: until then the sphere waits at rest with the status still 'abort'.
 *
 * An abort is set off by any failure that would lose the vehicle while the
 * crew is on it (`Simulation.destroy`, and a total loss of thrust or a stage
 * coming apart, which lose it a little later), by the `launchAbort` failure
 * at its time, or by hand in the Engineer mode (`command`).
 */
import type { Simulation } from '../simulation';
import type { Debris } from './types';
import { add, addScaled, clone, cross, dot, norm, normalize, scale, v3, type Vec3 } from '../vec3';
import { enuFrame } from '../orbital';
import { OMEGA_EARTH } from '../constants';
import { quatFromAxisAngle, quatInverseRotate, quatMultiply, quatNormalize, quatRotate, type Quat } from '../rigid/math';
import { targetAttitude } from '../rigid/runtime';
import type { RigidState } from '../rigid/integrator';
import { ESCAPE, EscapeFlight, MERCURY_CAPSULE, VOSTOK_CAPSULE, capsuleConfiguration, headConfiguration, retroDirection, spacecraftConfiguration,
  type EscapeMode, type EscapeRelease } from '../rigid/escape';
import { stackLayout } from '../frame';
import { hashSeed } from './seed';
import { ModuleEntry, VOSTOK_IM } from './module-entry';
import { CrewDescent, VOSTOK_CREW } from './crew-descent';
import { FallingBody } from './fall';

/** Seconds from the escape to the burning rocket's explosion on its pad (T-10-1: 2–6 s). */
export const PAD_FIRE_EXPLOSION = 4;

/** Seconds from a suborbital capsule flight's cut-off to the capsule's separation (MR-3: T+2:21.8 to 2:32.3). */
export const CAPSULE_SEPARATION_DELAY = 10.5;

/**
 * C01: Vostok-1's hatch No. 1 as it falls: a 1 m disc (GCTC: the hatches
 * are 1 m across), tumbling, its drag coefficient 1.2 on its mean projected
 * area, a quarter of its two faces (Cauchy) — an estimate.
 */
const HATCH_CDA = 1.2 * (2 * Math.PI * 0.5 * 0.5) / 4;

/**
 * C01: the step while the sphere lies on the ground and the pilot is still
 * on his parachutes, s. His own flight steps itself finely; this only sets
 * how often the picture of him moves (ten times a second).
 */
const CREW_WAIT_DT = 0.1;

export class LaunchEscape {
  flight: EscapeFlight | null = null;
  /** C01: the flight is a capsule coming home as planned, not an abort */
  returning = false;
  private cause = '';
  private rocketLost?: { r: Vec3; t: number };
  /** C01: the pilot's own body, from his ejection (Vostok-1: the sphere lands without him) */
  private crewId?: number;

  constructor(readonly sim: Simulation) {}

  /**
   * C01: the flight is a return that measures its heights on the WGS-84
   * ellipsoid (Vostok-1, `DescentCapsule.datum`), from the retro sequence to
   * the sphere at rest: the simulation's altitude and latitude are then
   * geodetic too.
   */
  get geodetic(): boolean {
    return this.flight?.mode === 'capsule' && this.flight.capsule.datum === 'wgs84';
  }

  /** This flight carries an escape system: a crewed launch of a vehicle that has one. */
  get fitted(): boolean {
    return !!this.sim.vehicleSpec.escapeSystem && !!this.sim.satellite.crewed;
  }

  /**
   * Whether an abort can be flown now: the escape system is armed from the
   * countdown until the spacecraft is in orbit or has left the rocket.
   */
  get available(): boolean {
    const s = this.sim.state;
    if (!this.fitted || this.flight || s.payloadSeparated || s.destroyed) return false;
    return s.status === 'prelaunch' || s.status === 'ascent' || s.status === 'burn' || s.status === 'coast';
  }

  /** Which way out the time of the abort gives. */
  mode(): EscapeMode {
    const s = this.sim.state;
    if (s.t < ESCAPE.towerJettison) return 'tower';
    return this.sim.vehicle.fairingAttached ? 'fairing' : 'separation';
  }

  /**
   * Abort now.
   *
   * @param cause event key of what set it off
   * @param rocketLost the rocket is being lost with it (drawn as a break-up where it is now)
   */
  begin(cause: string, rocketLost: boolean): boolean {
    if (!this.available) return false;
    const sim = this.sim, s = sim.state, mode = this.mode();
    this.cause = cause;
    const start = this.startState(mode);
    // a rocket burning on its pad goes up a few seconds after the crew has gone (T-10-1)
    this.rocketLost = rocketLost ? { r: clone(s.r), t: s.t + (cause === 'evt.padFire' ? PAD_FIRE_EXPLOSION : 0) } : undefined;
    sim.event('evt.abort', 'fail', { mode, t: Math.round(s.t * 10) / 10 });
    // What stays behind: every stage still on, and its strap-ons.
    this.shedRocket();
    sim.pending.length = 0;
    this.flight = new EscapeFlight(mode, start, s.t, v3(0, 1, 0), {
      groundElevation: (r) => sim.groundElevation(r),
      wind: (r, t) => sim.rigidRuntime ? sim.rigidRuntime.windAt(r, t) : v3(),
    }, (what, state, t, mass) => this.release(what, state, t, mass));
    s.status = 'abort';
    s.note = 'abort';
    s.ascentPhase = null;
    s.thrust = 0; s.throttle = 0; s.coreThrottle = 0; s.boosterThrottle = 0;
    s.currentBurn = null;
    this.sync();
    return true;
  }

  /**
   * A suborbital capsule flight (C01: Mercury-Redstone 3): the capsule, just
   * separated from the spent booster, flies home on its own — ballistic over
   * the top, its retro-rockets, the entry heat shield first, drogue, main,
   * the water. The same flight as an abort's descent module, for Mercury's
   * capsule, and not an abort.
   *
   * Or from orbit (C01: Vostok-1), at the TDU-1's pressurising command, the
   * deorbit's time: the spacecraft turned as the orientation system set it
   * and its gyros hold it, the engine's nozzle and the sphere's heavy side
   * ahead, the thrust line `retroDirection` at the launch command `starts[0]`
   * s later (the local horizontal turns with the orbit, 0.15° in the 2.2 s).
   */
  beginReturn(): void {
    const sim = this.sim, s = sim.state;
    const capsule = sim.satellite.descent === 'vostok' ? VOSTOK_CAPSULE : MERCURY_CAPSULE;
    let attitudeQ;
    if (capsule.id === 'vostok') {
      const rp = capsule.retro!, n = cross(s.r, s.v);
      const ahead = quatFromAxisAngle(normalize(n), norm(n) / dot(s.r, s.r) * rp.starts[0]);
      const thrust = retroDirection(quatRotate(ahead, s.r), s.v, (rp.pitch ?? 0) * Math.PI / 180);
      attitudeQ = targetAttitude(scale(thrust, -1), n);
    } else {
      if (s.rigid) attitudeQ = s.rigid.attitudeQ;
      else {
        const { east, north, up } = enuFrame(s.r);
        const az = sim.plan.azimuthRotating;
        attitudeQ = targetAttitude(s.dir, cross(up, add(scale(east, Math.sin(az)), scale(north, Math.cos(az)))));
      }
      // capsule axes: +x out of the heat shield, which faced the booster
      attitudeQ = quatMultiply(attitudeQ, quatFromAxisAngle(v3(0, 1, 0), Math.PI));
    }
    this.returning = true;
    this.cause = '';
    this.flight = new EscapeFlight('capsule', { r: clone(s.r), v: clone(s.v), attitudeQ, omegaBody: v3() }, s.t, v3(0, 1, 0), {
      groundElevation: (r) => sim.groundElevation(r),
      wind: (r, t) => sim.rigidRuntime ? sim.rigidRuntime.windAt(r, t) : v3(),
    }, (what, state, t, mass) => this.release(what, state, t, mass), capsule);
    s.status = 'abort';
    s.note = 'capsuleReturn';
    s.ascentPhase = null;
    s.thrust = 0; s.throttle = 0; s.coreThrottle = 0; s.boosterThrottle = 0;
    s.currentBurn = null;
    this.sync();
  }

  /**
   * The head section's (or, after the fairing, the spacecraft's) state at the
   * abort, in the stack's axes: x the nose, y the belly, z to the left — the
   * rigid body's own, or the point mass's, held wings level on the launch
   * azimuth as it is drawn.
   */
  private startState(mode: EscapeMode): RigidState {
    const sim = this.sim, s = sim.state;
    const config = mode === 'separation' ? spacecraftConfiguration() : headConfiguration(mode === 'tower', ESCAPE.tower.propellant, ESCAPE.fairing.propellant, false);
    // the head section's base, the interface with the service module, above the fairing's base
    const interfaceAboveFairing = ESCAPE.serviceModule.length;
    let attitudeQ, omegaBody = v3(), offset: number;
    if (s.rigid && sim.rigidRuntime) {
      attitudeQ = s.rigid.attitudeQ; omegaBody = s.rigid.omegaBody;
      const snapshot = sim.rigidLink.currentRigidSnapshot();
      const fairingBase = snapshot ? snapshot.geometry.fairingBase.x : 0, cg = snapshot ? snapshot.cg.x : 0;
      offset = fairingBase + interfaceAboveFairing + config.cgX - cg;
    } else {
      const { east, north, up } = enuFrame(s.r);
      const az = sim.plan.azimuthRotating;
      const heading = add(scale(east, Math.sin(az)), scale(north, Math.cos(az)));
      attitudeQ = targetAttitude(s.dir, cross(up, heading));
      // the point mass is drawn with the attached stack's base on its position
      const layout = stackLayout(sim.vehicleSpec);
      let base = 0;
      for (let i = 0; i < sim.vehicle.stages.length; i++) {
        const st = sim.vehicle.stages[i];
        if (st.spec.isSpacecraft) continue;
        if (st.attached) break;
        base += layout.height[i] ?? 0;
      }
      offset = layout.total - base + interfaceAboveFairing + config.cgX;
    }
    const arm = quatRotate(attitudeQ, v3(offset, 0, 0));
    const spin = quatRotate(attitudeQ, omegaBody);
    return { r: add(s.r, arm), v: add(s.v, cross(spin, arm)), attitudeQ, omegaBody };
  }

  /**
   * Every stage still attached, and its strap-ons, left behind as debris
   * where they were in the stack: a stage by its top (it is drawn hanging
   * below its debris point), a strap-on by its base, beside the core.
   */
  private shedRocket(): void {
    const sim = this.sim, s = sim.state;
    const layout = stackLayout(sim.vehicleSpec);
    // stack heights are measured from the full stack's bottom; `s.r` is the
    // attached stack's base for a point mass, its CG for a rigid body
    let attachedBase = 0;
    for (let i = 0; i < sim.vehicle.stages.length; i++) {
      const st = sim.vehicle.stages[i];
      if (st.spec.isSpacecraft) continue;
      if (st.attached) break;
      attachedBase += layout.height[i] ?? 0;
    }
    // the attached stack's base: the point mass's own position, or the rigid body's drawn base
    const origin = s.rigid ? addScaled(s.r, s.dir, s.rigid.renderOffsetBody.x) : s.r;
    const at = (height: number) => addScaled(origin, s.dir, height - attachedBase);
    const { east, up } = enuFrame(s.r);
    const lateral = normalize(cross(s.dir, Math.abs(dot(s.dir, up)) > 0.99 ? east : up));
    const lateral2 = cross(s.dir, lateral);
    for (let i = 0; i < sim.vehicle.stages.length; i++) {
      const st = sim.vehicle.stages[i];
      if (!st.attached || st.spec.isSpacecraft) continue;
      st.boosters.forEach((b, k) => {
        if (!b.attached) return;
        b.attached = false;
        const a = (k / Math.max(1, st.boosters.length)) * 2 * Math.PI;
        const off = add(scale(lateral, Math.cos(a)), scale(lateral2, Math.sin(a)));
        sim.debris.push({ id: sim.nextDebrisId(), name: b.spec.name, r: addScaled(at(layout.base[i]), off, st.spec.diameter / 2 + b.spec.diameter / 2),
          v: clone(s.v), dir: clone(s.dir), mass: b.spec.dryMass + b.propellant, area: Math.PI * (b.spec.diameter / 2) ** 2 * 1.5, cd: 1.2,
          visual: { diameter: b.spec.diameter, length: b.spec.length, color: b.spec.color ?? '#ccc', kind: 'booster', conicalTop: b.spec.conicalTop },
          alive: true, createdAt: s.t });
      });
      sim.debrisTracker.spawnStageDebris(st);
      const d = sim.debris[sim.debris.length - 1];
      d.r = at(layout.base[i] + layout.height[i]);
      st.attached = false;
      st.sepTime = s.t;
    }
    sim.vehicle.fairingAttached = false;
  }

  /**
   * C01: the pilot is still on his parachutes (he left the sphere on his
   * seat, and his own body is flying, src/physics/sim/crew-descent.ts).
   */
  get crewAloft(): boolean {
    if (this.crewId === undefined) return false;
    return !!this.sim.debris.find((d) => d.id === this.crewId)?.alive;
  }

  /**
   * C01: the sphere lies on the ground with its pilot still in the air (the
   * status still 'abort'), or down too: nothing of the flight is a rigid body
   * in flight any more, so its six-DOF steps need not be short.
   */
  get resting(): boolean {
    const status = this.sim.state.status;
    return !!this.flight?.landed && (status === 'abort' || (status === 'landed' && this.crewId !== undefined));
  }

  /**
   * A body the escape leaves behind, as debris. Vostok's (C01) fly
   * themselves, from their own state at the release (`EscapeFlight.onRelease`):
   * the instrument module as its cables part, burning up (module-entry.ts);
   * hatch No. 1, falling; and Gagarin on his seat (crew-descent.ts).
   */
  private release(what: EscapeRelease, state: RigidState, t: number, mass?: number): void {
    if (what === 'instrumentModule' || what === 'hatch' || what === 'seat') { this.releaseVostok(what, state, t, mass ?? 0); return; }
    const sim = this.sim, flight = this.flight!;
    const config = flight.config;
    const tower = what === 'head' && flight.mode === 'tower';
    // drawn from its base up, as a debris item without an anchor is
    const base = add(state.r, quatRotate(state.attitudeQ, v3(config.bottomX - config.cgX, 0, 0)));
    const d: Debris = {
      id: sim.nextDebrisId(), name: what === 'head' ? 'escapeHead' : 'modules',
      r: base, v: clone(state.v), dir: quatRotate(state.attitudeQ, v3(1, 0, 0)),
      mass: config.mass - capsuleConfiguration(true).mass, area: config.aero.area, cd: 0.8,
      // the head section as it was drawn on the stack: the vehicle's fairing, cut above the service module
      visual: what === 'head'
        ? { diameter: sim.vehicleSpec.fairing?.diameter ?? 2 * config.radius, length: (sim.vehicleSpec.fairing?.length ?? ESCAPE.fairing.length + ESCAPE.serviceModule.length) - ESCAPE.serviceModule.length,
          color: '#e8e8e8', kind: 'escapeHead', ...(tower ? { tower } : {}) }
        : { diameter: 2.72, length: ESCAPE.serviceModule.length, color: '#5b6457', kind: 'modules' },
      alive: true, createdAt: t,
    };
    sim.debris.push(d);
  }

  /** C01: Vostok's bodies, each its own flight on the debris list. */
  private releaseVostok(what: 'instrumentModule' | 'hatch' | 'seat', state: RigidState, t: number, mass: number): void {
    const sim = this.sim, tracker = sim.debrisTracker;
    if (what === 'instrumentModule') {
      const flight = new ModuleEntry(state, t, mass, hashSeed(sim.cfg.launchTime.getTime(), sim.cfg.vehicleId, 'instrumentModule'), VOSTOK_IM);
      const d = flight.debris(sim.nextDebrisId());
      sim.debris.push(d);
      tracker.attachFlight(d, flight);
      return;
    }
    if (what === 'hatch') {
      const d: Debris = {
        id: sim.nextDebrisId(), name: 'hatch', r: { ...state.r }, v: { ...state.v }, dir: quatRotate(state.attitudeQ, v3(1, 0, 0)),
        mass, area: HATCH_CDA / 1.2, cd: 1.2, visual: { diameter: 1.0, length: 0.12, color: '#9aa0a6', kind: 'hatch' }, alive: true, createdAt: t,
      };
      sim.debris.push(d);
      tracker.attachFlight(d, new FallingBody(t, HATCH_CDA));
      return;
    }
    const flight = new CrewDescent(t, { ...VOSTOK_CREW, mass }, () => this.flight ? clone(this.flight.state.r) : null);
    const d = flight.debris(sim.nextDebrisId(), state.r, state.v);
    this.crewId = d.id;
    sim.debris.push(d);
    tracker.attachFlight(d, flight);
  }

  /** Advance the escape by `dt`; the simulation's clock and state follow. */
  step(dt: number): void {
    const sim = this.sim, s = sim.state, flight = this.flight!;
    if (flight.landed) {
      // C01: the sphere on the steppe, turning with the Earth, while its pilot comes down on his parachutes
      this.rest(quatFromAxisAngle(v3(0, 0, 1), OMEGA_EARTH * dt));
      s.t += dt;
    } else {
      flight.step(s.t, dt);
      s.t += dt;
      for (const e of flight.takeEvents()) sim.event(e.key, e.severity, e.params, e.t);
      this.sync();
    }
    if (flight.landed) {
      // the flight is over when the crew is down: the status stays 'abort' while he is in the air
      if (this.crewAloft) { s.note = 'vostokSphereDown'; return; }
      s.status = 'landed';
      s.note = this.crewId !== undefined ? 'vostokLanded' : this.returning ? 'capsuleLanded' : 'abortLanded';
      // a planned return has said so in its own splashdown event
      if (!this.returning) sim.event('evt.abortCrewSafe', 'success', { km: Math.round(s.downrange / 100) / 10, g: +flight.status.maxG.toFixed(1) });
    }
  }

  /** The simulation's state from the escaping body. */
  sync(): void {
    const s = this.sim.state, flight = this.flight!;
    s.r = clone(flight.state.r); s.v = clone(flight.state.v);
    s.dir = flight.axis;
    s.rigid = flight.telemetry();
    s.mass = flight.config.mass;
    s.gLoad = flight.status.phase === 'landed' ? 1 : flight.gLoad;
    const tether = flight.status.tether;
    s.abort = { ...flight.status, motors: { ...flight.status.motors }, ...(tether ? { tether: { sphere: clone(tether.sphere), module: clone(tether.module) } } : {}),
      cause: this.cause, ...(this.returning ? { kind: 'return' as const } : {}),
      ...(this.rocketLost ? { rocketLost: this.rocketLost } : {}) };
  }

  /** At rest: turned with the Earth by `turn`, as a landed vehicle is. */
  rest(turn: Quat): void {
    const flight = this.flight!, st = flight.state;
    const r = quatRotate(turn, st.r), attitudeQ = quatNormalize(quatMultiply(turn, st.attitudeQ));
    flight.state = { r, v: cross(v3(0, 0, OMEGA_EARTH), r), attitudeQ, omegaBody: quatInverseRotate(attitudeQ, v3(0, 0, OMEGA_EARTH)) };
    this.sync();
  }

  suggestedDt(): number {
    // (only while the status is 'abort': 'landed' steps as the simulation does)
    if (this.flight?.landed) return CREW_WAIT_DT;
    return this.flight ? this.flight.suggestedDt() : 1;
  }
}
