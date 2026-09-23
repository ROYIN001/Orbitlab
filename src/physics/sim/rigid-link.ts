/**
 * The bridge between the mission model (stages, boosters, fairing) and the
 * six-DOF rigid body: pad hold, mass-property snapshots, body splits at
 * separation and manual engine commands.
 */
import { OMEGA_EARTH, DEG } from '../constants';
import { Vec3, v3, add, scale, cross, normalize } from '../vec3';
import { atmosphere } from '../atmosphere';
import { targetAttitude } from '../rigid/runtime';
import { buildRigidVehicle, type RigidVehicleSnapshot } from '../rigid/mass';
import { partitionRigidSnapshot, type ComponentPartition, type PartitionedRigidBody, type PartitionImpulse } from '../rigid/partition';
import { quatInverseRotate, quatRotate } from '../rigid/math';
import { groundPositionEci, groundVelocityEci } from '../orbital';
import type { StageState } from '../vehicle';
import type { Simulation } from '../simulation';

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
}
