/**
 * The bridge between the mission model (stages, boosters, fairing) and the
 * six-DOF rigid body: pad hold, mass-property snapshots, body splits at
 * separation and manual engine commands.
 */
import { OMEGA_EARTH, DEG } from '../constants';
import { Vec3, v3, add, scale, cross, normalize, norm, sub, dot } from '../vec3';
import { gravityJ2 } from '../gravity';
import { atmosphere } from '../atmosphere';
import { targetAttitude } from '../rigid/runtime';
import { buildRigidVehicle, type RigidVehicleSnapshot } from '../rigid/mass';
import { partitionRigidSnapshot, type ComponentPartition, type PartitionedRigidBody, type PartitionImpulse } from '../rigid/partition';
import { quatAngularDistance, quatFromAxisAngle, quatIdentity, quatInverseRotate, quatMultiply, quatNormalize, quatRotate } from '../rigid/math';
import { nosePointingTarget } from '../rigid/guidance-attitude';
import { propagateJ2Coast } from '../rigid/orbit-prediction';
import type { RigidState } from '../rigid/integrator';
import type { RigidTelemetry } from '../rigid/telemetry';
import { BURN_PREORIENT_TIME } from './constants';
import { groundPositionEci, groundVelocityEci } from '../orbital';
import type { StageState } from '../vehicle';
import type { Simulation } from '../simulation';

/**
 * Held coast. In vacuum with every engine off, an autopilot that has settled on
 * its prograde target has nothing left to do: no aerodynamic or thrust torque
 * disturbs the body, and turning with the velocity vector at the orbital rate
 * is torque-free rotation about a transverse principal axis, which costs no
 * gas. Such a stretch is propagated in the coast's own long steps — the centre
 * of mass by the same J2 gravity as the plant, the attitude carried round by
 * the rotation the velocity direction makes, so the steady lag a proportional
 * autopilot keeps behind a turning target (0.22° on a Falcon 9 upper stage) is
 * kept too — instead of 0.01 s control ticks; a day in geostationary transfer
 * would otherwise be nine million of them. Anything that would make the
 * controller work ends it: an engine, the air below 140 km, a manual command,
 * the burn's pre-orientation (entered in control ticks with a margin), or a
 * body turning at a rate other than its target's.
 */
const HELD_ATTITUDE_TOLERANCE_RAD = 1 * DEG;
const HELD_RATE_TOLERANCE_RAD_S = 0.005 * DEG;
const HELD_ALTITUDE_M = 140e3;
/** Control ticks resume this long before a burn's pre-orientation begins, s. */
const HELD_BURN_MARGIN_S = 30;

/** Inertial rate at which the velocity direction turns under gravity alone. */
function progradeRate(r: Vec3, v: Vec3): Vec3 {
  const speed = norm(v);
  if (!(speed > 1)) return v3();
  const vHat = scale(v, 1 / speed), a = gravityJ2(r);
  const turn = scale(sub(a, scale(vHat, dot(a, vHat))), 1 / speed);
  return cross(vHat, turn);
}

export class RigidLink {
  readonly manualShutdown = new Set<StageState>();
  readonly manualRelightPending = new Set<StageState>();

  constructor(readonly sim: Simulation) {}

  /** Fixed launch-plane roll reference; independent from camera/render frames. */
  rigidSide(): Vec3 {
    const up = normalize(groundPositionEci(this.sim.site.latitude * DEG, this.sim.site.longitude * DEG, this.sim.site.altitude, this.sim.plan.gmst0));
    const east = normalize(cross(v3(0, 0, 1), up));
    const north = normalize(cross(up, east));
    const heading = add(scale(east, Math.sin(this.sim.plan.azimuthRotating)), scale(north, Math.cos(this.sim.plan.azimuthRotating)));
    return normalize(cross(up, heading));
  }

  holdRigidOnPad(): void {
    const runtime = this.sim.rigidRuntime!;
    const s = this.sim.state;
    const snapshot = buildRigidVehicle(this.sim.vehicle, { pressure: atmosphere(s.altitude).p,
      payloadDiameter: this.sim.satellite.size ? Math.max(this.sim.satellite.size.width, this.sim.satellite.size.depth) : undefined, payloadLength: this.sim.satellite.size?.height,
      coreThrottle: s.coreThrottle, boosterThrottle: s.boosterThrottle, time: s.t, rcsConsumedKgByStage: runtime.consumed });
    const pad = groundPositionEci(this.sim.site.latitude * DEG, this.sim.site.longitude * DEG, this.sim.site.altitude, this.sim.plan.gmst0 + OMEGA_EARTH * s.t);
    const attitudeQ = targetAttitude(normalize(pad), this.rigidSide());
    s.r = add(pad, quatRotate(attitudeQ, snapshot.cg));
    s.v = groundVelocityEci(s.r);
    const rigid = { r: s.r, v: s.v, attitudeQ, omegaBody: quatInverseRotate(attitudeQ, v3(0, 0, OMEGA_EARTH)) };
    s.rigid = runtime.telemetry(rigid, s.t, snapshot);
    // The pad carries a constrained vehicle while its engines already burn.
    // Their upstream budgets are authoritative before free-flight actuators run.
    s.rigid.engineThrottles = Object.fromEntries(snapshot.engines.map(engine => [engine.id,
      engine.thrustBudgetN > 0 ? engine.upstreamThrottle ?? 1 : 0]));
    runtime.snapshot = snapshot;
    s.dir = quatRotate(attitudeQ, v3(1, 0, 0));
    s.mass = snapshot.mass;
    this.sim.updateDerived();
  }

  currentRigidSnapshot(): RigidVehicleSnapshot | undefined {
    if (!this.sim.rigidRuntime) return undefined;
    return buildRigidVehicle(this.sim.vehicle, { pressure: atmosphere(this.sim.state.altitude).p,
      payloadDiameter: this.sim.satellite.size ? Math.max(this.sim.satellite.size.width, this.sim.satellite.size.depth) : undefined, payloadLength: this.sim.satellite.size?.height,
      rcsConsumedKgByStage: this.sim.rigidRuntime.consumed });
  }

  applyManualEngineCommand(stage: StageState | null, throttle: number): void {
    if (!stage || !this.sim.rigidRuntime || !stage.attached || !stage.ignited) return;
    const manual = this.sim.rigidRuntime.command.mode === 'manual';
    if (manual && throttle === 0 && !stage.cutoff && !stage.burnedOut) {
      this.sim.vehicle.cutoffStage(stage, this.sim.state.t);
      for (const booster of stage.boosters) if (booster.attached) booster.ignited = false;
      this.manualShutdown.add(stage);
      this.sim.event('evt.stageCutoff', 'major', { stage: stage.spec.name, n: stage.index + 1 });
    }
    if (throttle > 0 && this.manualShutdown.has(stage) && stage.spec.restartable && !stage.burnedOut
      && !this.manualRelightPending.has(stage) && this.sim.vehicle.usablePropellant(stage) > 0) {
      this.manualRelightPending.add(stage);
      this.sim.schedule(this.sim.state.t + Math.max(1, stage.spec.ignitionDelay ?? 5), 'manualRelight', () => {
        this.manualRelightPending.delete(stage);
        if (this.sim.vehicle.active !== stage || !stage.attached || stage.burnedOut || this.sim.isFailed()
          || (this.sim.rigidRuntime!.command.mode === 'manual' && this.sim.rigidRuntime!.command.throttle === 0)) return;
        this.sim.vehicle.igniteStage(stage, this.sim.state.t);
        this.manualShutdown.delete(stage);
        this.sim.event('evt.ignition', 'major', { stage: stage.spec.name });
      });
    }
  }

  rigidSplit(snapshot: RigidVehicleSnapshot | undefined, partitions: ComponentPartition[], impulses: PartitionImpulse[] = []): PartitionedRigidBody[] {
    const s = this.sim.state;
    if (!snapshot || !s.rigid) return [];
    return partitionRigidSnapshot({ r: s.r, v: s.v, attitudeQ: s.rigid.attitudeQ, omegaBody: s.rigid.omegaBody }, snapshot, partitions, impulses);
  }

  applyRetainedRigid(parts: PartitionedRigidBody[]): void {
    const body = parts.find(part => part.id === 'active');
    if (!body || !this.sim.rigidRuntime) return;
    const s = this.sim.state, snapshot = this.currentRigidSnapshot()!;
    s.r = body.state.r; s.v = body.state.v; s.mass = snapshot.mass;
    s.dir = quatRotate(body.state.attitudeQ, v3(1, 0, 0));
    s.rigid = this.sim.rigidRuntime.telemetry(body.state, s.t, snapshot);
    this.sim.rigidRuntime.snapshot = snapshot;
  }

  /**
   * The longest held-coast step the flight allows now, s, or 0 when control
   * ticks are needed (see the note on held coasts above).
   */
  heldCoastWindow(): number {
    const sim = this.sim, s = sim.state, runtime = sim.rigidRuntime;
    if (!runtime || !s.rigid || runtime.command.mode !== 'auto') return 0;
    // A returning ship holds its entry attitude on its coast, not prograde.
    const descent = s.status === 'descent' && sim.shipDescent.phase === 'coast';
    if (s.status !== 'coast' && s.status !== 'orbit' && !descent) return 0;
    if (s.altitude < HELD_ALTITUDE_M || sim.vehicle.inTransient(s.t)) return 0;
    const snapshot = runtime.snapshot;
    if (!snapshot || snapshot.engines.some((engine) => engine.thrustBudgetN > 0)) return 0;
    let window = Infinity;
    if (s.status === 'coast') {
      if (!(s.nextBurnTime > s.t)) return 0;
      window = s.nextBurnTime - BURN_PREORIENT_TIME - HELD_BURN_MARGIN_S - s.t;
    }
    if (descent) {
      window = sim.shipDescent.coastWindow();
      // Control ticks while anything is still to happen aboard (the vent).
      if (sim.pending.length > 0) window = Math.min(window, sim.pending[0].t - s.t - 1);
    }
    if (!(window > 0.02)) return 0;
    const target = descent ? sim.shipDescent.coastAttitude(s.r, s.v) : nosePointingTarget(s.rigid.attitudeQ, s.v);
    if (quatAngularDistance(s.rigid.attitudeQ, target) > HELD_ATTITUDE_TOLERANCE_RAD) return 0;
    const rate = quatInverseRotate(s.rigid.attitudeQ, progradeRate(s.r, s.v));
    if (norm(sub(s.rigid.omegaBody, rate)) > HELD_RATE_TOLERANCE_RAD_S) return 0;
    return window;
  }

  /** One held-coast step; null when the ballistic path would meet the ground. */
  heldCoastStep(dt: number): { state: RigidState; telemetry: RigidTelemetry } | null {
    const s = this.sim.state, runtime = this.sim.rigidRuntime!;
    const next = propagateJ2Coast({ r: s.r, v: s.v }, dt, { stepS: 10 });
    if (!next) return null;
    // The inertial rotation that takes the old velocity direction to the new one.
    const from = normalize(s.v), to = normalize(next.v);
    const axis = cross(from, to), turn = Math.atan2(norm(axis), dot(from, to));
    const rotation = norm(axis) > 1e-15 ? quatFromAxisAngle(normalize(axis), turn) : quatIdentity();
    const attitudeQ = quatNormalize(quatMultiply(rotation, s.rigid!.attitudeQ));
    const state: RigidState = { r: next.r, v: next.v, attitudeQ, omegaBody: quatInverseRotate(attitudeQ, progradeRate(next.r, next.v)) };
    return { state, telemetry: runtime.telemetry(state, s.t + dt, runtime.snapshot!, false, 0) };
  }
}
