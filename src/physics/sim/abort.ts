/**
 * A crewed launch abort (roadmap G06): the simulation's side of the escape
 * (src/physics/rigid/escape.ts). An abort hands the flight over to the crew:
 * from the command on, the simulation's state is the escaping body — the head
 * section, then the descent module — and the rocket left behind is debris.
 * The flight ends with the descent module at rest, `status` 'landed'.
 *
 * An abort is set off by any failure that would lose the vehicle while the
 * crew is on it (`Simulation.destroy`, and a total loss of thrust or a stage
 * coming apart, which lose it a little later), by the `launchAbort` failure
 * at its time, or by hand in the Engineer mode (`command`).
 */
import type { Simulation } from '../simulation';
import type { Debris } from './types';
import { add, addScaled, clone, cross, dot, normalize, scale, v3, type Vec3 } from '../vec3';
import { enuFrame } from '../orbital';
import { OMEGA_EARTH } from '../constants';
import { quatFromAxisAngle, quatInverseRotate, quatMultiply, quatNormalize, quatRotate, type Quat } from '../rigid/math';
import { targetAttitude } from '../rigid/runtime';
import type { RigidState } from '../rigid/integrator';
import { ESCAPE, EscapeFlight, MERCURY_CAPSULE, capsuleConfiguration, headConfiguration, spacecraftConfiguration, type EscapeMode } from '../rigid/escape';
import { stackLayout } from '../frame';

/** Seconds from the escape to the burning rocket's explosion on its pad (T-10-1: 2–6 s). */
export const PAD_FIRE_EXPLOSION = 4;

/** Seconds from a suborbital capsule flight's cut-off to the capsule's separation (MR-3: T+2:21.8 to 2:32.3). */
export const CAPSULE_SEPARATION_DELAY = 10.5;

export class LaunchEscape {
  flight: EscapeFlight | null = null;
  /** C01: the flight is a capsule coming home as planned, not an abort */
  returning = false;
  private cause = '';
  private rocketLost?: { r: Vec3; t: number };

  constructor(readonly sim: Simulation) {}

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
    }, (what, state, t) => this.release(what, state, t));
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
   */
  beginReturn(): void {
    const sim = this.sim, s = sim.state;
    let attitudeQ;
    if (s.rigid) attitudeQ = s.rigid.attitudeQ;
    else {
      const { east, north, up } = enuFrame(s.r);
      const az = sim.plan.azimuthRotating;
      attitudeQ = targetAttitude(s.dir, cross(up, add(scale(east, Math.sin(az)), scale(north, Math.cos(az)))));
    }
    // capsule axes: +x out of the heat shield, which faced the booster
    attitudeQ = quatMultiply(attitudeQ, quatFromAxisAngle(v3(0, 1, 0), Math.PI));
    this.returning = true;
    this.cause = '';
    this.flight = new EscapeFlight('capsule', { r: clone(s.r), v: clone(s.v), attitudeQ, omegaBody: v3() }, s.t, v3(0, 1, 0), {
      groundElevation: (r) => sim.groundElevation(r),
      wind: (r, t) => sim.rigidRuntime ? sim.rigidRuntime.windAt(r, t) : v3(),
    }, (what, state, t) => this.release(what, state, t), MERCURY_CAPSULE);
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

  /** A body the escape leaves behind, as debris. */
  private release(what: 'head' | 'modules', state: RigidState, t: number): void {
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

  /** Advance the escape by `dt`; the simulation's clock and state follow. */
  step(dt: number): void {
    const sim = this.sim, s = sim.state, flight = this.flight!;
    flight.step(s.t, dt);
    s.t += dt;
    for (const e of flight.takeEvents()) sim.event(e.key, e.severity, e.params);
    this.sync();
    if (flight.landed) {
      s.status = 'landed';
      s.note = this.returning ? 'capsuleLanded' : 'abortLanded';
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
    s.abort = { ...flight.status, motors: { ...flight.status.motors }, cause: this.cause, ...(this.returning ? { kind: 'return' as const } : {}),
      ...(this.rocketLost ? { rocketLost: this.rocketLost } : {}) };
  }

  /** At rest: turned with the Earth by `turn`, as a landed vehicle is. */
  rest(turn: Quat): void {
    const flight = this.flight!, st = flight.state;
    const r = quatRotate(turn, st.r), attitudeQ = quatNormalize(quatMultiply(turn, st.attitudeQ));
    flight.state = { r, v: cross(v3(0, 0, OMEGA_EARTH), r), attitudeQ, omegaBody: quatInverseRotate(attitudeQ, v3(0, 0, OMEGA_EARTH)) };
    this.sync();
  }

  suggestedDt(): number { return this.flight ? this.flight.suggestedDt() : 1; }
}
