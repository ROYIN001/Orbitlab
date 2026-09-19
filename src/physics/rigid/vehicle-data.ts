/** Educational 6DOF geometry/actuator estimates, not manufacturer mass properties.
 * Provenance and uncertainty: docs/SIXDOF-VEHICLE-DATA.md. SI throughout.
 * All positions use a structural datum, +X noseward. Subtract CG exactly once.
 */
import type { EngineSpec, StageSpec, VehicleSpec } from '../../types';
import type { Vec3 } from '../vec3';
import { add, cross, normalize, v3 } from '../vec3';
import { stackLayout } from '../frame';

export const RIGID_DATA_REVISION = 'estimated-components-2026-09-19-v1';
export const RIGID_DATA_ASSUMPTIONS = [
  'Estimated cylinder/tank mass distributions; not measured vehicle CG or inertia.',
  'Geometry follows the displayed stage/adapter layout, not the rounded manufacturer height.',
  'Legacy thrust/propellant totals retained; finite TVC/RCS and aerodynamics are estimates.',
  'Quasi-steady variable mass; internal flow, slosh and structural flexibility omitted.',
] as const;

export interface BoosterPlacement {
  id: string; stageIndex: number; groupIndex: number; unitIndex: number;
  baseBody: Vec3; rotationAboutX: number;
}
export interface RigidVehicleGeometry {
  vehicleId: string; length: number; stageBases: Vec3[]; stageHeights: number[];
  fairingBase: Vec3; payloadBase: Vec3; boosters: BoosterPlacement[];
  estimated: true;
}

/** Proper rotation from the existing +Y-nose mesh; determinant +1. */
export const renderToBody = (p: Vec3): Vec3 => v3(p.y, -p.x, p.z);
export const bodyToRender = (p: Vec3): Vec3 => v3(-p.y, p.x, p.z);

/** Pure shared layout, already used by RocketView. The 0.5 m payload gap is
 * RocketView's attached-payload gap; there is no extra inertia-free adapter mass. */
export function getRigidVehicleGeometry(spec: VehicleSpec): RigidVehicleGeometry {
  const layout = stackLayout(spec);
  const boosters: BoosterPlacement[] = [];
  spec.stages.forEach((stage, stageIndex) => {
    const groups = stage.boosters ?? [];
    groups.forEach((group, groupIndex) => {
      const phase = groups.length > 1 ? Math.PI / (group.count * groups.length) * (2 * groupIndex + 1) : 0;
      const radius = (stage.diameter + group.diameter) / 2;
      for (let unitIndex = 0; unitIndex < group.count; unitIndex++) {
        const angle = phase + unitIndex / group.count * 2 * Math.PI;
        const local = Math.PI / 2 - angle;
        boosters.push({
          id: `${group.id}.${unitIndex}`, stageIndex, groupIndex, unitIndex,
          baseBody: add(v3(layout.base[stageIndex], 0, 0), renderToBody(v3(
            Math.cos(local) * radius, group.baseOffset ?? 0, Math.sin(local) * radius))),
          rotationAboutX: -local,
        });
      }
    });
  });
  return {
    vehicleId: spec.id, length: layout.total + (spec.fairing?.length ?? 0),
    stageBases: layout.base.map((x) => v3(x, 0, 0)), stageHeights: [...layout.height],
    fairingBase: v3(layout.total, 0, 0), payloadBase: v3(layout.total + 0.5, 0, 0),
    boosters, estimated: true,
  };
}

export interface ChamberGeometry {
  id: string; clusterId: string; kind: 'main' | 'vernier';
  positionBody: Vec3; directionBody: Vec3; thrustFraction: number;
  gimbalAxesBody: Vec3[]; maxGimbalRad: number; maxGimbalRateRadS: number; timeConstantS: number;
  /** Independent Merlin index, or 0 for a shared-feed Soyuz cluster. */
  engineIndex: number;
}
const DEG = Math.PI / 180;
const rotateX = (p: Vec3, angle: number): Vec3 => v3(p.x,
  p.y * Math.cos(angle) - p.z * Math.sin(angle), p.y * Math.sin(angle) + p.z * Math.cos(angle));

/** Geometry matches the source mesh patterns without importing Three.js.
 * Soyuz vernier thrust partitions the existing cluster budget; it is not added.
 */
export function chamberGeometry(
  ownerId: string, shapeId: string, engine: EngineSpec, radius: number,
  base = v3(), rotationAboutX = 0,
): ChamberGeometry[] {
  const list: ChamberGeometry[] = [];
  const make = (suffix: string, index: number, pointRender: Vec3, fraction: number,
    kind: 'main' | 'vernier', steer: 'fixed' | 'tvc' | 'tangential') => {
    const local = rotateX(renderToBody(pointRender), rotationAboutX);
    // Tangential thrust deflection is rotation around the radial axis.
    const axes = steer === 'fixed' ? [] : steer === 'tvc'
      ? [v3(0, 1, 0), v3(0, 0, 1)] : [normalize(v3(0, local.y, local.z))];
    // RD-107/108: Energomash authors describe 45-degree chamber travel (2004,
    // p191), without resolving +/- versus total. Use an estimated +/-20-degree
    // operational limit; see dossier S9 and 10..45-degree sensitivity bounds.
    // This evidence does not apply to RD-0110 or Merlin.
    const angleDeg = kind === 'vernier' && (shapeId === 'blokA' || shapeId === 'blokBVGD') ? 20 : 5;
    list.push({
      id: `${ownerId}.${suffix}`, clusterId: `${ownerId}.engine.${index}`, kind,
      positionBody: add(base, local), directionBody: v3(1, 0, 0), thrustFraction: fraction,
      gimbalAxesBody: axes, maxGimbalRad: axes.length ? angleDeg * DEG : 0,
      maxGimbalRateRadS: 20 * DEG, timeConstantS: 0.1, engineIndex: index,
    });
  };
  const point = (r: number, angle: number) => v3(r * Math.cos(angle), 0, r * Math.sin(angle));
  if (shapeId === 's1' && engine.count === 9) {
    for (let i = 0; i < 8; i++) make(`engine.${i}`, i, point(radius * 0.70, Math.PI / 8 + i * Math.PI / 4), 1, 'main', 'tvc');
    make('engine.8', 8, v3(), 1, 'main', 'tvc');
  } else if (shapeId === 'blokA' || shapeId === 'blokBVGD' || shapeId === 'blokI') {
    const count = shapeId === 'blokBVGD' ? 2 : 4;
    const nominalVernier = shapeId === 'blokI' ? 6000 : 35000;
    const vf = nominalVernier / engine.thrustVac;
    const mainRadius = radius * (shapeId === 'blokA' ? 0.40 : 0.42);
    const vernierRadius = radius * (shapeId === 'blokA' ? 0.84 : shapeId === 'blokI' ? 0.82 : 0.85);
    for (let i = 0; i < 4; i++) make(`main.${i}`, 0, point(mainRadius, Math.PI / 4 + i * Math.PI / 2), (1 - count * vf) / 4, 'main', 'fixed');
    for (let i = 0; i < count; i++) make(`vernier.${i}`, 0, point(vernierRadius, i * 2 * Math.PI / count), vf, 'vernier', 'tangential');
  } else {
    // Supported upper stage or explicitly synthetic spacecraft engine.
    make('engine.0', 0, v3(), 1, 'main', 'tvc');
  }
  return list;
}

export interface RcsThrusterGeometry {
  id: string; stageId: string; positionBody: Vec3; directionBody: Vec3; maxThrust: number; isp: number;
}
export interface RcsReservoir {
  stageId: string; initialPropellantKg: number; centerBody: Vec3; thrusters: RcsThrusterGeometry[];
}

/** Synthetic finite force-pair installation. It is NOT SpaceX's nozzle count.
 * Opposed pairs yield pure torque only when both real forces are commanded.
 */
export function rcsGeometry(vehicleId: string, stage: StageSpec, base = v3()): RcsReservoir {
  const supported = vehicleId === 'falcon9' || stage.isSpacecraft;
  const initial = !supported ? 0 : Math.min(stage.dryMass * 0.1,
    stage.isSpacecraft ? 10 : stage.id === 's1' ? 100 : 30);
  const force = stage.isSpacecraft ? 20 : stage.id === 's1' ? 200 : 50;
  const L = stage.length, R = stage.diameter / 2;
  const thrusters: RcsThrusterGeometry[] = [];
  if (initial > 0) {
    const pairs: { name: string; a: Vec3; b: Vec3; direction: Vec3 }[] = [
      { name: 'roll', a: v3(0.85 * L, R, 0), b: v3(0.85 * L, -R, 0), direction: v3(0, 0, 1) },
      { name: 'pitch', a: v3(0.2 * L, 0, 0), b: v3(0.8 * L, 0, 0), direction: v3(0, 0, 1) },
      { name: 'yaw', a: v3(0.8 * L, 0, 0), b: v3(0.2 * L, 0, 0), direction: v3(0, 1, 0) },
    ];
    for (const pair of pairs) for (const sign of [1, -1]) {
      for (const [n, p, factor] of [[0, pair.a, sign], [1, pair.b, -sign]] as const) {
        thrusters.push({ id: `${stage.id}.rcs.${pair.name}.${sign}.${n}`, stageId: stage.id,
          positionBody: add(base, p), directionBody: v3(pair.direction.x * factor, pair.direction.y * factor, pair.direction.z * factor),
          maxThrust: force, isp: 60 });
      }
    }
  }
  return { stageId: stage.id, initialPropellantKg: initial,
    centerBody: add(base, v3(0.85 * L, 0, 0)), thrusters };
}

/** For allocation/rank tests: physical moment from a thruster about the CG. */
export const thrusterMomentArm = (thruster: RcsThrusterGeometry, cg: Vec3): Vec3 => cross(
  v3(thruster.positionBody.x - cg.x, thruster.positionBody.y - cg.y, thruster.positionBody.z - cg.z), thruster.directionBody);
