import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { RocketView, rigidNozzleIds } from '../src/render/rocket';
import { DebrisView } from '../src/render/debris';
import type { SceneManager } from '../src/render/scene';
import { engineLayout, type NozzlePos } from '../src/render/liveries';
import { VEHICLES } from '../src/data/vehicles';
import { chamberGeometry } from '../src/physics/rigid/vehicle-data';
import { type RigidTelemetry } from '../src/physics/rigid/telemetry';
import { quatFromAxisAngle, quatRotate } from '../src/physics/rigid/math';
import { v3 } from '../src/physics/vec3';
import type { DebrisFrame } from '../src/physics/frame';

function rigid(): RigidTelemetry {
  return { modelVersion: 'test', attitudeQ: quatFromAxisAngle(v3(1, 2, 3), 0.6), omegaBody: v3(),
    cgBody: v3(), renderOffsetBody: v3(-5, 0.3, -0.4), inertiaBody: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    controlMode: 'auto', engineDeflections: {}, engineDirectionsBody: {}, engineThrottles: {},
    rcsPropellantKg: 1, saturated: false, angleOfAttack: 0, sideslip: 0, aeroWithinEnvelope: true, windECI: v3(), rawQuaternionNormError: 0 };
}
interface EngineVisual {
  bells: THREE.InstancedMesh; glow: THREE.InstancedMesh; nozzles: NozzlePos[]; ids: string[]; rigidApplied: boolean;
}
function engineHarness() {
  // Exercise the production matrix updater without constructing textures/DOM or
  // a WebGL context. Existing meshes and their actual instance matrices are real.
  const scratch = Object.assign(Object.create(RocketView.prototype), {
    tmpMat: new THREE.Matrix4(), engineDirection: new THREE.Vector3(), enginePosition: new THREE.Vector3(),
    engineScale: new THREE.Vector3(), engineQuaternion: new THREE.Quaternion(), engineParentInverse: new THREE.Quaternion(),
  }) as { updateEngineVisual(visual: EngineVisual, telemetry: RigidTelemetry | undefined, parent?: THREE.Quaternion): void };
  const nozzles = [{ x: 1, z: 2, r: 0.3, len: 1.2 }, { x: -1, z: -2, r: 0.2, len: 0.8 }];
  const visual: EngineVisual = { bells: new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 2),
    glow: new THREE.InstancedMesh(new THREE.CircleGeometry(), new THREE.MeshBasicMaterial(), 2),
    nozzles, ids: ['s1.engine.0', 's1.engine.1'], rigidApplied: true };
  scratch.updateEngineVisual(visual, undefined);
  return { visual, update: (telemetry?: RigidTelemetry, parent?: THREE.Quaternion) => scratch.updateEngineVisual(visual, telemetry, parent) };
}

describe('rigid render transforms', () => {
  it('matches actual chamber IDs and ordering for every vehicle\'s cores, upper stages and strap-ons', () => {
    for (const vehicle of VEHICLES) {
      for (const stage of vehicle.stages.filter(s => !s.isSpacecraft)) {
        const layout = engineLayout(stage.id, stage.engine, stage.diameter / 2);
        expect(rigidNozzleIds(stage.id, stage.id, layout)).toEqual(chamberGeometry(stage.id, stage.id, stage.engine, stage.diameter / 2).map(c => c.id));
        for (const booster of stage.boosters ?? []) for (let i = 0; i < booster.count; i++) {
          const ownerId = `${booster.id}.${i}`;
          expect(rigidNozzleIds(ownerId, booster.id, engineLayout(booster.id, booster.engine, booster.diameter / 2)))
            .toEqual(chamberGeometry(ownerId, booster.id, booster.engine, booster.diameter / 2).map(c => c.id));
        }
      }
    }
  });

  it('tilts each nozzle about its mount, turns off only the failed glow, and restores legacy matrices', () => {
    const { visual, update } = engineHarness();
    const originalBells = visual.bells.instanceMatrix.array.slice(), originalGlows = visual.glow.instanceMatrix.array.slice();
    update(undefined);
    expect(visual.bells.instanceMatrix.array).toEqual(originalBells);
    const telemetry = rigid();
    telemetry.engineDirectionsBody = { 's1.engine.0': v3(Math.cos(0.08), Math.sin(0.08), 0), 's1.engine.1': v3(1, 0, 0) };
    telemetry.engineThrottles = { 's1.engine.0': 1, 's1.engine.1': 0 };
    update(telemetry);
    const bell = new THREE.Matrix4(), glow = new THREE.Matrix4();
    visual.bells.getMatrixAt(0, bell);
    const direction = new THREE.Vector3(0, 1, 0).transformDirection(bell);
    expect(direction.distanceTo(new THREE.Vector3(-Math.sin(0.08), Math.cos(0.08), 0))).toBeLessThan(1e-7);
    expect(new THREE.Vector3().setFromMatrixPosition(bell).toArray()).toEqual([1, 0, 2]);
    visual.glow.getMatrixAt(1, glow);
    expect(new THREE.Vector3().setFromMatrixScale(glow).length()).toBe(0);
    visual.glow.getMatrixAt(0, glow);
    expect(new THREE.Vector3().setFromMatrixScale(glow).length()).toBeGreaterThan(1);
    update(undefined);
    expect(visual.bells.instanceMatrix.array).toEqual(originalBells);
    expect(visual.glow.instanceMatrix.array).toEqual(originalGlows);
  });

  it('undoes the strap-on local yaw when applying body-axis directions', () => {
    const { visual, update } = engineHarness(), telemetry = rigid();
    const directionBody = v3(Math.cos(0.1), 0, Math.sin(0.1));
    telemetry.engineDirectionsBody = { 's1.engine.0': directionBody };
    const parent = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
    update(telemetry, parent);
    const matrix = new THREE.Matrix4(); visual.bells.getMatrixAt(0, matrix);
    const inRenderAxes = new THREE.Vector3(0, 1, 0).transformDirection(matrix).applyQuaternion(parent);
    expect(inRenderAxes.distanceTo(new THREE.Vector3(-directionBody.y, directionBody.x, directionBody.z))).toBeLessThan(1e-7);
  });

  it('places rigid debris from its complete current CG offset and stored attitude, independent of animation age', () => {
    const scene = new THREE.Scene();
    const manager = { scene, toScene: (p: { x: number; y: number; z: number }, out: THREE.Vector3) => out.set(p.x, p.y, p.z) } as unknown as SceneManager;
    const renderer = new DebrisView(manager);
    const telemetry = rigid();
    const debris: DebrisFrame = { id: 1, name: 'stage', r: v3(10, 20, 30), v: v3(), dir: v3(1, 0, 0), alive: true,
      burning: false, createdAt: 0, rigid: telemetry, anchor: -999,
      visual: { kind: 'stage', length: 10, diameter: 2, color: '#fff' } };
    renderer.update([debris], 3);
    const group = scene.children.find(child => child instanceof THREE.Group)!;
    const rotated = quatRotate(telemetry.attitudeQ, telemetry.renderOffsetBody);
    expect(group.position.distanceTo(new THREE.Vector3(10 + rotated.x, 20 + rotated.y, 30 + rotated.z))).toBeLessThan(1e-10);
    const expectedNose = quatRotate(telemetry.attitudeQ, v3(1, 0, 0));
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(group.quaternion).distanceTo(new THREE.Vector3(expectedNose.x, expectedNose.y, expectedNose.z))).toBeLessThan(1e-10);
    const orientation = group.quaternion.clone();
    telemetry.renderOffsetBody = v3(-3, -0.4, 0.5);
    renderer.update([debris], 100);
    expect(group.quaternion.equals(orientation)).toBe(true);
    const newOffset = quatRotate(telemetry.attitudeQ, telemetry.renderOffsetBody);
    expect(group.position.distanceTo(new THREE.Vector3(10 + newOffset.x, 20 + newOffset.y, 30 + newOffset.z))).toBeLessThan(1e-10);
    renderer.clear();
  });
});
