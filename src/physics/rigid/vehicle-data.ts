/** Educational 6DOF geometry/actuator estimates, not manufacturer mass properties.
 * Provenance and uncertainty: docs/SIXDOF-VEHICLE-DATA.md. SI throughout.
 * All positions use a structural datum, +X noseward. Subtract CG exactly once.
 */
import type { EngineSpec, StageSpec, VehicleSpec } from '../../types';
import type { Vec3 } from '../vec3';
import { add, cross, normalize, v3 } from '../vec3';
import { stackLayout } from '../frame';
import { engineLayout } from '../../data/engine-layout';
import { vehicleDataId } from '../../data/vehicles';

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
  /**
   * The id the vehicle's id-keyed tables are read by: its own, or a custom
   * vehicle's catalogue origin (`vehicleDataId`, roadmap S02).
   */
  vehicleId: string; length: number; stageBases: Vec3[]; stageHeights: number[];
  fairingBase: Vec3; payloadBase: Vec3; boosters: BoosterPlacement[];
  /**
   * S02: the launcher's own stages (not the spacecraft's), and the stages and
   * strap-on groups whose propellant is a solid grain — read from the spec
   * itself, so a custom vehicle's are its own. Absent on a detached stage and
   * a synthetic test body, which look them up by `vehicleId`.
   */
  launcherStageIds?: readonly string[];
  solidPropellantIds?: readonly string[];
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
  const { launcherStageIds, solidPropellantIds } = stageRoles(spec);
  return {
    vehicleId: vehicleDataId(spec), length: layout.total + (spec.fairing?.length ?? 0),
    stageBases: layout.base.map((x) => v3(x, 0, 0)), stageHeights: [...layout.height],
    fairingBase: v3(layout.total, 0, 0), payloadBase: v3(layout.total + 0.5, 0, 0),
    boosters, launcherStageIds, solidPropellantIds, estimated: true,
  };
}

const ROLES = new WeakMap<VehicleSpec, { launcherStageIds: readonly string[]; solidPropellantIds: readonly string[] }>();
/** The launcher's stages and the solid ones, once per spec: the lists are the flex model's cache keys. */
function stageRoles(spec: VehicleSpec): { launcherStageIds: readonly string[]; solidPropellantIds: readonly string[] } {
  let roles = ROLES.get(spec);
  if (!roles) {
    roles = {
      launcherStageIds: spec.stages.filter((stage) => !stage.isSpacecraft).map((stage) => stage.id),
      solidPropellantIds: spec.stages.flatMap((stage) => [...(stage.engine.solid ? [stage.id] : []),
        ...(stage.boosters ?? []).filter((booster) => booster.engine.solid).map((booster) => booster.id)]),
    };
    ROLES.set(spec, roles);
  }
  return roles;
}

/**
 * What a stage's propellant is and how it sits in the stage, for the mass
 * model. Falcon 9 and Soyuz-2.1a stages (and the Falcon Heavy boosters, which
 * are Falcon 9 first stages) keep the split they were accepted with and have no
 * entry here.
 */
export type PropellantFamily = 'kerolox' | 'hydrolox' | 'methalox' | 'hypergolic' | 'solid';
export interface PropellantLoad {
  family: PropellantFamily;
  /** oxidizer / fuel, by mass (liquids) */
  mixtureRatio?: number;
  /** the oxidizer tank is forward of (above) the fuel tank */
  oxidizerForward?: boolean;
}
/** Liquid densities, kg/m³, for the tank volumes: oxidizer then fuel. */
export const PROPELLANT_DENSITY: Record<Exclude<PropellantFamily, 'solid'>, readonly [number, number]> = {
  kerolox: [1141, 810], hydrolox: [1141, 71], methalox: [1141, 423], hypergolic: [1443, 791],
};
/** Estimates (E): family and mixture ratio from each engine's published figures, tank order from the stage's layout. */
export const PROPELLANT_LOADS: Readonly<Record<string, PropellantLoad>> = {
  // Soyuz-2.1b / Angara / Proton
  fregat: { family: 'hypergolic', mixtureRatio: 2.0, oxidizerForward: true },
  brizm: { family: 'hypergolic', mixtureRatio: 1.9, oxidizerForward: true },
  p1: { family: 'hypergolic', mixtureRatio: 2.67, oxidizerForward: true },
  p2: { family: 'hypergolic', mixtureRatio: 2.6, oxidizerForward: true },
  p3: { family: 'hypergolic', mixtureRatio: 2.6, oxidizerForward: true },
  urm1core: { family: 'kerolox', mixtureRatio: 2.6, oxidizerForward: true },
  urm1: { family: 'kerolox', mixtureRatio: 2.6, oxidizerForward: true },
  urm2: { family: 'kerolox', mixtureRatio: 2.6, oxidizerForward: true },
  // Atlas V / Vulcan
  ccb: { family: 'kerolox', mixtureRatio: 2.72, oxidizerForward: true },
  gem63: { family: 'solid' },
  centaur3: { family: 'hydrolox', mixtureRatio: 5.88, oxidizerForward: false },
  v1: { family: 'methalox', mixtureRatio: 3.4, oxidizerForward: true },
  gem63xl: { family: 'solid' },
  centaur5: { family: 'hydrolox', mixtureRatio: 5.88, oxidizerForward: false },
  // Ariane 6 / Vega-C
  llpm: { family: 'hydrolox', mixtureRatio: 6.1, oxidizerForward: false },
  p120c: { family: 'solid' },
  ulpm: { family: 'hydrolox', mixtureRatio: 5.8, oxidizerForward: true },
  z40: { family: 'solid' },
  z9: { family: 'solid' },
  avum: { family: 'hypergolic', mixtureRatio: 2.0, oxidizerForward: true },
  // Long March
  // C01: Vostok-K's Blok E, Saturn V
  blokE: { family: 'kerolox', mixtureRatio: 2.5, oxidizerForward: true },
  sic: { family: 'kerolox', mixtureRatio: 2.27, oxidizerForward: true },
  sii: { family: 'hydrolox', mixtureRatio: 5.5, oxidizerForward: false },
  sivb: { family: 'hydrolox', mixtureRatio: 5.5, oxidizerForward: false },
  cz2d1: { family: 'hypergolic', mixtureRatio: 2.1, oxidizerForward: true },
  cz2d2: { family: 'hypergolic', mixtureRatio: 2.1, oxidizerForward: true },
  cz3b1: { family: 'hypergolic', mixtureRatio: 2.1, oxidizerForward: true },
  cz3bb: { family: 'hypergolic', mixtureRatio: 2.1, oxidizerForward: true },
  cz3b2: { family: 'hypergolic', mixtureRatio: 2.1, oxidizerForward: true },
  cz3b3: { family: 'hydrolox', mixtureRatio: 5.0, oxidizerForward: false },
  cz5core: { family: 'hydrolox', mixtureRatio: 6.0, oxidizerForward: true },
  k3: { family: 'kerolox', mixtureRatio: 2.6, oxidizerForward: true },
  cz5s2: { family: 'hydrolox', mixtureRatio: 6.0, oxidizerForward: false },
  // H-IIA / H3
  h2a1: { family: 'hydrolox', mixtureRatio: 5.9, oxidizerForward: true },
  srba: { family: 'solid' },
  h2a2: { family: 'hydrolox', mixtureRatio: 5.0, oxidizerForward: false },
  h3s1: { family: 'hydrolox', mixtureRatio: 5.9, oxidizerForward: true },
  srb3: { family: 'solid' },
  h3s2: { family: 'hydrolox', mixtureRatio: 5.0, oxidizerForward: false },
  // PSLV
  ps1: { family: 'solid' },
  psomg: { family: 'solid' },
  psoma: { family: 'solid' },
  ps2: { family: 'hypergolic', mixtureRatio: 1.7, oxidizerForward: true },
  ps3: { family: 'solid' },
  ps4: { family: 'hypergolic', mixtureRatio: 2.0, oxidizerForward: true },
  // Electron
  e1: { family: 'kerolox', mixtureRatio: 2.4, oxidizerForward: true },
  e2: { family: 'kerolox', mixtureRatio: 2.4, oxidizerForward: true },
  curie: { family: 'hypergolic', mixtureRatio: 1.6, oxidizerForward: true },
  // Starship
  superheavy: { family: 'methalox', mixtureRatio: 3.6, oxidizerForward: false },
  ship: { family: 'methalox', mixtureRatio: 3.6, oxidizerForward: false },
};

/**
 * How a stage or strap-on steers, for every vehicle beyond the two reference
 * ones (whose chambers are built by the dedicated branches in
 * `chamberGeometry`). Chambers sit where src/data/engine-layout.ts draws them;
 * this says which of them move and how far. Public figures where they exist
 * (docs/SIXDOF-VEHICLE-DATA.md lists the sources); `estimated: true` marks a
 * travel that is not published and was chosen from engines of the same class.
 */
export interface StageSteering {
  /** ± travel of a steerable main chamber, degrees; 0 for a fixed nozzle */
  gimbalDeg: number;
  /** 'tvc' swings in two planes; 'tangential' in one, about the chamber's radius from the vehicle axis */
  steer: 'tvc' | 'tangential';
  /** only the first N main chambers of the layout steer (Super Heavy's inner 13) */
  steerable?: number;
  /** the verniers' share of the stage's thrust, their travel and their plane */
  vernierFraction?: number;
  vernierDeg?: number;
  estimated?: boolean;
}
export const STAGE_STEERING: Readonly<Record<string, StageSteering>> = {
  // Falcon Heavy: three Falcon 9 first stages
  core: { gimbalDeg: 5, steer: 'tvc' },
  side: { gimbalDeg: 5, steer: 'tvc' },
  // Soyuz-2.1b / Angara / Proton
  fregat: { gimbalDeg: 0, steer: 'tvc' },
  brizm: { gimbalDeg: 3, steer: 'tvc', estimated: true },
  p1: { gimbalDeg: 7, steer: 'tangential' },
  p2: { gimbalDeg: 3.25, steer: 'tangential' },
  // RD-0213 fixed; the four-chamber RD-0214 vernier (31 kN) steers
  p3: { gimbalDeg: 0, steer: 'tvc', vernierFraction: 31000 / 613800, vernierDeg: 45 },
  urm1: { gimbalDeg: 8, steer: 'tvc' },
  // the four small nozzles drawn on the core are its turbine-exhaust roll nozzles
  urm1core: { gimbalDeg: 8, steer: 'tvc', vernierFraction: 0.004, vernierDeg: 30, estimated: true },
  urm2: { gimbalDeg: 4, steer: 'tvc', estimated: true },
  // Atlas V / Vulcan
  ccb: { gimbalDeg: 8, steer: 'tvc' },
  gem63: { gimbalDeg: 0, steer: 'tvc' },
  centaur3: { gimbalDeg: 4, steer: 'tvc', estimated: true },
  v1: { gimbalDeg: 5, steer: 'tvc' },
  gem63xl: { gimbalDeg: 0, steer: 'tvc' },
  centaur5: { gimbalDeg: 4, steer: 'tvc', estimated: true },
  // Ariane 6 / Vega-C
  llpm: { gimbalDeg: 6, steer: 'tvc', estimated: true },
  p120c: { gimbalDeg: 6, steer: 'tvc', estimated: true },
  ulpm: { gimbalDeg: 5, steer: 'tvc', estimated: true },
  z40: { gimbalDeg: 6.5, steer: 'tvc', estimated: true },
  z9: { gimbalDeg: 6, steer: 'tvc' },
  avum: { gimbalDeg: 10, steer: 'tvc' },
  // Long March: first-stage chambers swing tangentially; the second-stage main engine is
  // fixed and its four YF-23C verniers (47 kN together) steer
  cz2d1: { gimbalDeg: 10, steer: 'tangential' },
  cz2d2: { gimbalDeg: 0, steer: 'tvc', vernierFraction: 47000 / 789140, vernierDeg: 60 },
  cz3b1: { gimbalDeg: 10, steer: 'tangential' },
  cz3bb: { gimbalDeg: 10, steer: 'tangential', estimated: true },
  cz3b2: { gimbalDeg: 0, steer: 'tvc', vernierFraction: 47000 / 789140, vernierDeg: 60 },
  cz3b3: { gimbalDeg: 4, steer: 'tvc' },
  cz5core: { gimbalDeg: 4, steer: 'tvc' },
  k3: { gimbalDeg: 8, steer: 'tangential', estimated: true },
  cz5s2: { gimbalDeg: 4, steer: 'tvc' },
  // H-IIA / H3
  h2a1: { gimbalDeg: 5, steer: 'tvc', estimated: true },
  srba: { gimbalDeg: 5, steer: 'tvc', estimated: true },
  h2a2: { gimbalDeg: 5, steer: 'tvc', estimated: true },
  h3s1: { gimbalDeg: 5, steer: 'tvc', estimated: true },
  srb3: { gimbalDeg: 0, steer: 'tvc' },
  h3s2: { gimbalDeg: 5, steer: 'tvc', estimated: true },
  // PSLV: secondary-injection TVC on the core, fixed strap-ons, the second stage's
  // hot-gas roll motor drawn as its two small nozzles
  ps1: { gimbalDeg: 3, steer: 'tvc', estimated: true },
  psomg: { gimbalDeg: 0, steer: 'tvc' },
  psoma: { gimbalDeg: 0, steer: 'tvc' },
  ps2: { gimbalDeg: 4, steer: 'tvc', vernierFraction: 0.005, vernierDeg: 30, estimated: true },
  ps3: { gimbalDeg: 2, steer: 'tvc' },
  ps4: { gimbalDeg: 3, steer: 'tvc' },
  // Electron
  e1: { gimbalDeg: 5, steer: 'tvc', estimated: true },
  e2: { gimbalDeg: 5, steer: 'tvc', estimated: true },
  curie: { gimbalDeg: 0, steer: 'tvc' },
  // C01. Blok E's RD-0109 chamber is fixed; four turbine-exhaust nozzles
  // steer it (E). Saturn V's outer four F-1 and J-2 gimbal ±6° / ±7°, the
  // centre engine is fixed; the S-IVB's single J-2 gimbals ±7°.
  blokE: { gimbalDeg: 0, steer: 'tvc', vernierFraction: 0.02, vernierDeg: 45, estimated: true },
  sic: { gimbalDeg: 6, steer: 'tvc', steerable: 4 },
  sii: { gimbalDeg: 7, steer: 'tvc', steerable: 4 },
  sivb: { gimbalDeg: 7, steer: 'tvc' },
  // Starship: the inner 13 Raptors of 33, and the ship's three sea-level Raptors, gimbal
  superheavy: { gimbalDeg: 15, steer: 'tvc', steerable: 13 },
  ship: { gimbalDeg: 15, steer: 'tvc', steerable: 3 },
};

/**
 * Attitude-control thrusters beyond the reference vehicles: a full three-axis
 * set on an upper stage that coasts or restarts, and a roll-only pair on a
 * stage that cannot roll with its own engine (one chamber on the axis). Force
 * per nozzle, specific impulse (cold gas about 65 s, hydrazine 220 s,
 * bipropellant 280 s) and the propellant set aside for it are estimates (E).
 * Keyed by `vehicle:stage` where one stage id is flown differently on two
 * vehicles (the P120C is Vega-C's first stage and Ariane 6's strap-on).
 */
export interface StageRcs { axes: 'all' | 'roll'; forceN: number; isp: number; propellantKg: number }
export const STAGE_RCS: Readonly<Record<string, StageRcs>> = {
  fregat: { axes: 'all', forceN: 50, isp: 220, propellantKg: 60 },
  brizm: { axes: 'all', forceN: 13.3, isp: 250, propellantKg: 60 },
  urm2: { axes: 'roll', forceN: 100, isp: 220, propellantKg: 30 },
  centaur3: { axes: 'all', forceN: 27, isp: 220, propellantKg: 150 },
  centaur5: { axes: 'all', forceN: 27, isp: 220, propellantKg: 150 },
  llpm: { axes: 'roll', forceN: 400, isp: 65, propellantKg: 60 },
  ulpm: { axes: 'all', forceN: 50, isp: 65, propellantKg: 60 },
  'vegac:p120c': { axes: 'roll', forceN: 250, isp: 65, propellantKg: 30 },
  z40: { axes: 'roll', forceN: 150, isp: 65, propellantKg: 20 },
  z9: { axes: 'roll', forceN: 100, isp: 65, propellantKg: 10 },
  avum: { axes: 'all', forceN: 50, isp: 65, propellantKg: 25 },
  cz3b3: { axes: 'all', forceN: 70, isp: 220, propellantKg: 80 },
  h2a1: { axes: 'roll', forceN: 400, isp: 65, propellantKg: 60 },
  h2a2: { axes: 'all', forceN: 50, isp: 220, propellantKg: 100 },
  cz5s2: { axes: 'all', forceN: 70, isp: 220, propellantKg: 100 },
  h3s2: { axes: 'all', forceN: 50, isp: 220, propellantKg: 100 },
  ps1: { axes: 'roll', forceN: 600, isp: 280, propellantKg: 60 },
  ps3: { axes: 'roll', forceN: 100, isp: 280, propellantKg: 10 },
  ps4: { axes: 'all', forceN: 50, isp: 280, propellantKg: 60 },
  e2: { axes: 'all', forceN: 10, isp: 65, propellantKg: 10 },
  curie: { axes: 'all', forceN: 5, isp: 65, propellantKg: 3 },
  ship: { axes: 'all', forceN: 2000, isp: 65, propellantKg: 1000 },
  // C01: the S-IVB's auxiliary propulsion system, two modules of 147 lbf
  // hypergolic thrusters; the S-II rolls on its gimballed engines.
  sivb: { axes: 'all', forceN: 650, isp: 280, propellantKg: 300 },
};

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
  } else if (STAGE_STEERING[shapeId]) {
    return layoutChambers(ownerId, shapeId, engine, radius, base, rotationAboutX, STAGE_STEERING[shapeId]);
  } else {
    // Supported upper stage or explicitly synthetic spacecraft engine.
    make('engine.0', 0, v3(), 1, 'main', 'tvc');
  }
  return list;
}

/**
 * Chambers where the renderer draws the bells. The stage's thrust is shared
 * equally among the main chambers after the verniers' share; a multi-chamber
 * engine (RD-180's two, YF-21C's four) is one engine for failures, a cluster of
 * separate engines is one engine per chamber.
 */
function layoutChambers(ownerId: string, shapeId: string, engine: EngineSpec, radius: number, base: Vec3,
  rotationAboutX: number, steering: StageSteering): ChamberGeometry[] {
  const layout = engineLayout(shapeId, engine, radius);
  const mains = layout.nozzles.length, verniers = layout.verniers.length;
  const vernierShare = verniers > 0 ? steering.vernierFraction ?? 0 : 0;
  const count = engine.count;
  const chamber = (suffix: string, index: number, nozzle: { x: number; z: number }, fraction: number, kind: 'main' | 'vernier',
    travelDeg: number, steer: 'tvc' | 'tangential'): ChamberGeometry => {
    const local = rotateX(renderToBody(v3(nozzle.x, 0, nozzle.z)), rotationAboutX);
    const position = add(base, local);
    // Radius from the vehicle axis: a strap-on's chamber swings about the line to the core.
    const radial = Math.hypot(position.y, position.z);
    const axes = !(travelDeg > 0) ? [] : steer === 'tangential' && radial > 1e-6
      ? [normalize(v3(0, position.y, position.z))] : [v3(0, 1, 0), v3(0, 0, 1)];
    return { id: `${ownerId}.${suffix}`, clusterId: `${ownerId}.engine.${index}`, kind,
      positionBody: position, directionBody: v3(1, 0, 0), thrustFraction: fraction,
      gimbalAxesBody: axes, maxGimbalRad: axes.length ? travelDeg * DEG : 0,
      maxGimbalRateRadS: 20 * DEG, timeConstantS: 0.1, engineIndex: index };
  };
  const list: ChamberGeometry[] = layout.nozzles.map((nozzle, i) => chamber(`engine.${i}`, Math.floor(i * count / mains), nozzle,
    count * (1 - vernierShare) / mains, 'main', steering.steerable === undefined || i < steering.steerable ? steering.gimbalDeg : 0, steering.steer));
  layout.verniers.forEach((nozzle, i) => list.push(chamber(`vernier.${i}`, Math.floor(i * count / verniers), nozzle,
    count * vernierShare / verniers, 'vernier', steering.vernierDeg ?? 0, 'tangential')));
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
  // Falcon Heavy flies Falcon 9's stages and their installation.
  const falcon = vehicleId === 'falcon9' || vehicleId === 'falconheavy';
  const firstStage = stage.id === 's1' || stage.id === 'core' || stage.id === 'side';
  const extra = falcon ? undefined : STAGE_RCS[`${vehicleId}:${stage.id}`] ?? STAGE_RCS[stage.id];
  const supported = falcon || stage.isSpacecraft || !!extra;
  const initial = !supported ? 0 : extra ? Math.min(stage.dryMass * 0.1, extra.propellantKg) : Math.min(stage.dryMass * 0.1,
    stage.isSpacecraft ? 10 : firstStage ? 100 : 30);
  const force = extra?.forceN ?? (stage.isSpacecraft ? 20 : firstStage ? 200 : 50);
  // A spacecraft's attitude thrusters burn its own propellant, at its engine's
  // specific impulse (E): Long March 2D's 1.2 t Earth-observation satellite,
  // raising its orbit over seven passes of its 22 N engine, spent 10 kg of the
  // 60 s cold gas assumed before by the sixth.
  const isp = extra?.isp ?? (stage.isSpacecraft ? stage.engine.ispVac : 60);
  const L = stage.length, R = stage.diameter / 2;
  const thrusters: RcsThrusterGeometry[] = [];
  if (initial > 0) {
    const pairs: { name: string; a: Vec3; b: Vec3; direction: Vec3 }[] = [
      { name: 'roll', a: v3(0.85 * L, R, 0), b: v3(0.85 * L, -R, 0), direction: v3(0, 0, 1) },
      { name: 'pitch', a: v3(0.2 * L, 0, 0), b: v3(0.8 * L, 0, 0), direction: v3(0, 0, 1) },
      { name: 'yaw', a: v3(0.8 * L, 0, 0), b: v3(0.2 * L, 0, 0), direction: v3(0, 1, 0) },
    ].filter(pair => extra?.axes !== 'roll' || pair.name === 'roll');
    for (const pair of pairs) for (const sign of [1, -1]) {
      for (const [n, p, factor] of [[0, pair.a, sign], [1, pair.b, -sign]] as const) {
        thrusters.push({ id: `${stage.id}.rcs.${pair.name}.${sign}.${n}`, stageId: stage.id,
          positionBody: add(base, p), directionBody: v3(pair.direction.x * factor, pair.direction.y * factor, pair.direction.z * factor),
          maxThrust: force, isp });
      }
    }
  }
  return { stageId: stage.id, initialPropellantKg: initial,
    centerBody: add(base, v3(0.85 * L, 0, 0)), thrusters };
}

/** For allocation/rank tests: physical moment from a thruster about the CG. */
export const thrusterMomentArm = (thruster: RcsThrusterGeometry, cg: Vec3): Vec3 => cross(
  v3(thruster.positionBody.x - cg.x, thruster.positionBody.y - cg.y, thruster.positionBody.z - cg.z), thruster.directionBody);
