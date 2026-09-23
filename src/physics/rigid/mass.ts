/** Variable mass/CG/full inertia from disclosed component estimates. Pure: never
 * consumes fuel, changes staging, or mutates the legacy VehicleModel. */
import type { BoosterGroupSpec, StageSpec } from '../../types';
import type { VehicleModel } from '../vehicle';
import { engineMassFlow, engineThrust } from '../vehicle';
import { add, scale, sub, v3, type Vec3 } from '../vec3';
import { dragCoefficient, tumblingDragCoefficient } from '../aero';
import { assertSPD, type Mat3 } from './math';
import type { Aero6DofSpec } from './aero';
import { AERO_MACH, ascentAeroTable, detachedAeroTable, type AeroTable } from './aero-tables';
import {
  chamberGeometry, getRigidVehicleGeometry, PROPELLANT_DENSITY, PROPELLANT_LOADS, rcsGeometry, RIGID_DATA_ASSUMPTIONS, RIGID_DATA_REVISION,
  type ChamberGeometry, type RcsReservoir, type RcsThrusterGeometry, type RigidVehicleGeometry,
} from './vehicle-data';

export interface MassComponent {
  id: string; ownerId: string; mass: number; centerBody: Vec3;
  /** About component's own CG, already expressed in vehicle body axes. */
  inertiaAtCenter: Mat3; kind: 'structure' | 'equipment' | 'fuel' | 'oxidizer' | 'rcs' | 'fairing' | 'payload';
}
export interface MassProperties {
  mass: number; cg: Vec3; inertia: Mat3; components: readonly MassComponent[];
}
export interface BudgetedEngine extends ChamberGeometry {
  thrustBudgetN: number; massFlowKgS: number;
  /** Actual held chamber throttle, including engine availability. Display only:
   * thrustBudgetN and massFlowKgS already contain this fraction. */
  upstreamThrottle?: number;
}
export interface RigidOperatingState {
  /** Throttles are engine levels: a solid motor's may exceed 1 (its profile above the mean thrust). */
  pressure?: number; coreThrottle?: number; boosterThrottle?: number; time?: number;
  /** Level of each strap-on group of the active stage; `boosterThrottle` stands in for a missing one. */
  boosterThrottles?: readonly number[];
  /** RK trial time within a held-command step. Pure prediction, not consumption. */
  propellantOffsetSeconds?: number;
  rcsConsumedKgByStage?: Readonly<Record<string, number>>;
  /** Passive payload dimensions, otherwise the explicit 2 m × 3 m estimate. */
  payloadDiameter?: number; payloadLength?: number;
}
export interface RigidVehicleSnapshot extends MassProperties {
  engines: BudgetedEngine[]; rcs: RcsReservoir[]; rcsThrusters: RcsThrusterGeometry[];
  geometry: RigidVehicleGeometry; activeBase: Vec3; aero: Aero6DofSpec;
  modelId: string; dataRevision: string; assumptions: readonly string[];
}
const diagonal = (a: number, b: number, c: number): Mat3 => [a, 0, 0, 0, b, 0, 0, 0, c];
const finiteVector = (p: Vec3) => [p.x, p.y, p.z].every(Number.isFinite);

/** A thick-walled tube about its own centre: a solid motor's grain around its bore. */
export function annulusInertia(mass: number, outer: number, inner: number, length: number): Mat3 {
  if (![mass, outer, inner, length].every((n) => Number.isFinite(n) && n >= 0) || inner > outer) throw new RangeError('Invalid annulus mass or dimensions');
  const r2 = outer ** 2 + inner ** 2;
  return diagonal(mass * r2 / 2, mass * (r2 / 4 + length ** 2 / 12), mass * (r2 / 4 + length ** 2 / 12));
}

export function cylinderInertia(mass: number, radius: number, length: number, thinShell = false): Mat3 {
  if (![mass, radius, length].every((n) => Number.isFinite(n) && n >= 0)) throw new RangeError('Invalid cylinder mass or dimensions');
  const axial = mass * radius ** 2 * (thinShell ? 1 : 0.5);
  const transverse = mass * (radius ** 2 * (thinShell ? 0.5 : 0.25) + length ** 2 / 12);
  return diagonal(axial, transverse, transverse);
}

/** Full parallel-axis theorem, including products of inertia. Empty bodies are
 * explicit zero-mass snapshots, with zero tensor; do not integrate them. */
export function buildMassProperties(components: readonly MassComponent[]): MassProperties {
  let mass = 0, weighted = v3();
  for (const part of components) {
    if (!Number.isFinite(part.mass) || part.mass < 0 || !finiteVector(part.centerBody)
      || !part.inertiaAtCenter.every(Number.isFinite)) throw new RangeError(`Invalid mass component ${part.id}`);
    if (part.mass === 0) {
      if (part.inertiaAtCenter.some(value => value !== 0)) throw new RangeError('A massless component cannot carry inertia');
      continue;
    }
    assertSPD(part.inertiaAtCenter);
    // Necessary physical triangle inequalities in any orthogonal frame.
    const I = part.inertiaAtCenter, tolerance = Math.max(I[0], I[4], I[8]) * 1e-12;
    if (I[0] > I[4] + I[8] + tolerance || I[4] > I[0] + I[8] + tolerance || I[8] > I[0] + I[4] + tolerance) {
      throw new RangeError(`Nonphysical component inertia ${part.id}`);
    }
    mass += part.mass;
    weighted = add(weighted, scale(part.centerBody, part.mass));
  }
  const cg = mass > 0 ? scale(weighted, 1 / mass) : v3();
  const out = Array<number>(9).fill(0);
  for (const part of components) {
    if (part.mass === 0) continue;
    const d = sub(part.centerBody, cg), p = [d.x, d.y, d.z];
    const d2 = d.x ** 2 + d.y ** 2 + d.z ** 2;
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      out[3 * row + col] += part.inertiaAtCenter[3 * row + col]
        + part.mass * ((row === col ? d2 : 0) - p[row] * p[col]);
    }
  }
  const inertia = out as unknown as Mat3;
  if (mass > 0) assertSPD(inertia);
  return { mass, cg, inertia, components };
}

const fraction = (n: number) => Math.max(0, Math.min(1, n));
function checkPropellant(remaining: number, full: number): void {
  if (!Number.isFinite(remaining) || remaining < 0 || remaining > full + 1e-7) throw new RangeError('Propellant outside mass budget');
}
const oxidizerFraction = (id: string) => id === 'blokBVGD' ? 27900 / 39160
  : id === 'blokA' ? 63800 / 90100 : id === 'blokI' ? 2.5 / 3.5 : 2.56 / 3.56;

/** Returns new components. Equivalent tank volumes are mass-distribution
 * surrogates, not reconstructed manufacturer tank contours or liquid density. */
export function stageMassComponents(
  stage: StageSpec | BoosterGroupSpec, propellant: number, base = v3(),
  ownerId = stage.id, rcs?: { initialPropellantKg: number; consumedKg: number; centerBody: Vec3 },
): MassComponent[] {
  checkPropellant(propellant, stage.propellantMass);
  const radius = stage.diameter / 2, length = stage.length;
  if (!(radius > 0 && length > 0 && stage.dryMass > 0)) throw new RangeError('Stage requires positive dimensions and dry mass');
  const initialGas = rcs?.initialPropellantKg ?? 0, consumed = rcs?.consumedKg ?? 0;
  if (![initialGas, consumed].every(Number.isFinite) || initialGas < 0 || initialGas > stage.dryMass
    || consumed < 0 || consumed > initialGas + 1e-7) throw new RangeError('RCS consumption outside included dry mass budget');
  const dryStructure = stage.dryMass - initialGas;
  const components: MassComponent[] = [];
  const addCylinder = (name: MassComponent['kind'], m: number, r: number, len: number, centre: Vec3, shell = false) => {
    if (m <= 0) return;
    components.push({ id: `${ownerId}.${name}`, ownerId, mass: m, centerBody: centre,
      inertiaAtCenter: cylinderInertia(m, r, len, shell), kind: name });
  };
  addCylinder('structure', dryStructure * 0.75, radius, length, add(base, v3(length / 2, 0, 0)), true);
  addCylinder('equipment', dryStructure * 0.25, radius * 0.85, length * 0.08, add(base, v3(length * 0.06, 0, 0)));
  if (rcs && initialGas > consumed) addCylinder('rcs', initialGas - consumed, radius * 0.2, length * 0.02, rcs.centerBody);
  const fill = stage.propellantMass > 0 ? fraction(propellant / stage.propellantMass) : 0;
  const load = PROPELLANT_LOADS[stage.id];
  if (load?.family === 'solid') {
    // A case-bonded grain burning outward from its bore: the length stays,
    // the web thins, and what is left sits at the case wall.
    const outer = radius * 0.95, port = radius * 0.3;
    const inner = Math.sqrt(outer ** 2 - fill * (outer ** 2 - port ** 2));
    if (propellant > 0) components.push({ id: `${ownerId}.fuel`, ownerId, mass: propellant, centerBody: add(base, v3(length * 0.5, 0, 0)),
      inertiaAtCenter: annulusInertia(propellant, outer, inner, length * 0.9), kind: 'fuel' });
    return components;
  }
  if (load) {
    // Tanks between 10 % and 92 % of the stage, sized by volume; each
    // liquid settled at the bottom of its tank.
    const ratio = load.mixtureRatio ?? 2.56;
    const [oxDensity, fuelDensity] = PROPELLANT_DENSITY[load.family];
    const of = ratio / (1 + ratio);
    const fuelVolume = (1 - of) / fuelDensity, oxVolume = of / oxDensity;
    const zone = length * 0.82, fuelTank = zone * fuelVolume / (fuelVolume + oxVolume), oxTank = zone - fuelTank;
    const fuelBottom = length * 0.10 + (load.oxidizerForward ? 0 : oxTank);
    const oxBottom = length * 0.10 + (load.oxidizerForward ? fuelTank : 0);
    const fuelLength = fuelTank * fill, oxLength = oxTank * fill;
    addCylinder('fuel', propellant * (1 - of), radius * 0.90, fuelLength, add(base, v3(fuelBottom + fuelLength / 2, 0, 0)));
    addCylinder('oxidizer', propellant * of, radius * 0.90, oxLength, add(base, v3(oxBottom + oxLength / 2, 0, 0)));
    return components;
  }
  const of = oxidizerFraction(stage.id);
  const fuelLength = length * 0.32 * fill, oxLength = length * 0.50 * fill;
  addCylinder('fuel', propellant * (1 - of), radius * 0.90, fuelLength, add(base, v3(length * 0.10 + fuelLength / 2, 0, 0)));
  addCylinder('oxidizer', propellant * of, radius * 0.90, oxLength, add(base, v3(length * 0.42 + oxLength / 2, 0, 0)));
  return components;
}

function budgetEngines(geometry: readonly ChamberGeometry[], thrustPerEngine: number, flowPerEngine: number,
  count: number, engineFraction = 1, upstreamThrottle = 1): BudgetedEngine[] {
  // Consume the failed engine budget from index 0 first: off-axis Falcon fault
  // stays spatially localized instead of reducing every engine equally.
  const failed = count * (1 - fraction(engineFraction));
  return geometry.map((engine) => {
    const available = fraction(engine.engineIndex + 1 - failed);
    return { ...engine, thrustBudgetN: thrustPerEngine * available * engine.thrustFraction,
      massFlowKgS: flowPerEngine * available * engine.thrustFraction, upstreamThrottle: upstreamThrottle * available };
  });
}
function aeroEstimate(area: number, length: number, base: Vec3, diameter: number, table?: AeroTable,
  cd: (mach: number) => number = dragCoefficient): Aero6DofSpec {
  return { referenceArea: area, referenceLength: length,
    // With a table the centre of pressure is the table's; this is its reference point.
    cpBody: table ? v3(table.cpX[0], 0, 0) : add(base, v3(length * 0.65, 0, 0)),
    cdMach: AERO_MACH.map((m) => [m, cd(m)] as const), normalSlopePerRad: 2,
    // Aero evaluator uses L for all axes; scale roll to the diameter convention.
    rateDamping: v3(0.2 * (diameter / Math.max(length, 1e-6)) ** 2, 10, 10), validAngleRad: 15 * Math.PI / 180,
    ...(table ? { table } : {}) };
}

/** A payload or spacecraft flying without its launcher: a blunt body, as the point-mass model flies it. */
const RELEASED_BODY_CD = 2.2;

/** Tables per attached configuration: the stack changes only at separations. */
const aeroTables = new Map<string, AeroTable>();

function stackAeroTable(vehicle: VehicleModel, geometry: RigidVehicleGeometry, area: number, length: number, diameter: number,
  base: Vec3): { table: AeroTable; cd?: (mach: number) => number } {
  const launcher = vehicle.stages.some((st) => st.attached && !st.spec.isSpacecraft);
  if (!launcher) {
    const key = `released|${length}|${diameter}|${area}|${base.x}`;
    let table = aeroTables.get(key);
    if (!table) {
      table = shiftTable(detachedAeroTable(length, diameter, RELEASED_BODY_CD, area), base.x);
      aeroTables.set(key, table);
    }
    return { table, cd: (m) => tumblingDragCoefficient(RELEASED_BODY_CD, m) };
  }
  const active = vehicle.active;
  // One booster state per strap-on group.
  const groups = active ? active.boosters.map((b) => b.attached) : [];
  const stageAttached = vehicle.stages.map((st) => st.attached);
  const key = `${vehicle.spec.id}|${vehicle.activeIndex}|${stageAttached.map(Number).join('')}|${vehicle.fairingAttached}|${groups.map(Number).join('')}|${area}`;
  let table = aeroTables.get(key);
  if (!table) {
    table = ascentAeroTable(vehicle.spec, { activeIndex: vehicle.activeIndex, stageAttached, fairingAttached: vehicle.fairingAttached, boosterGroups: groups },
      area, (index) => geometry.stageBases[index].x);
    aeroTables.set(key, table);
  }
  return { table };
}

/** A detached-body table is built about its own base; move it to the stack datum. */
function shiftTable(table: AeroTable, dx: number): AeroTable {
  return { ...table, cpX: table.cpX.map((x) => x + dx), baseCpX: table.baseCpX + dx, planformX: table.planformX + dx };
}
const MAX_LEVEL = 2;
function validateOperating(op: RigidOperatingState): void {
  for (const n of [op.pressure ?? 0, op.coreThrottle ?? 0, op.boosterThrottle ?? 0, op.propellantOffsetSeconds ?? 0, ...(op.boosterThrottles ?? [])]) {
    if (!Number.isFinite(n) || n < 0) throw new RangeError('Invalid rigid operating state');
  }
  // Levels, not commands: a solid's regressive profile runs up to about 1.5 ×
  // its mean thrust early in the burn. Anything past 2 is not an engine.
  if ((op.coreThrottle ?? 0) > MAX_LEVEL || (op.boosterThrottle ?? 0) > MAX_LEVEL || (op.boosterThrottles ?? []).some((n) => n > MAX_LEVEL)) {
    throw new RangeError('Engine level outside [0, 2]');
  }
}

/** Live attached stack, keeping the original full-stack datum across staging.
 * Engine budgets sum legacy thrust; this does not consume thrust or RCS fuel.
 */
export function buildRigidVehicle(vehicle: VehicleModel, op: RigidOperatingState = {}): RigidVehicleSnapshot {
  validateOperating(op);
  const geometry = getRigidVehicleGeometry(vehicle.spec), components: MassComponent[] = [], engines: BudgetedEngine[] = [], rcs: RcsReservoir[] = [];
  const pressure = op.pressure ?? 0;
  // A tail-off is judged at the start of the physics step, like the averaged
  // level the caller passes: an RK substep that lands past the end of the decay
  // must not switch the engine off for the rest of a step whose mean thrust
  // still includes it, or the answer depends on the substep length.
  const stepStart = op.time !== undefined ? op.time - (op.propellantOffsetSeconds ?? 0) : undefined;
  let activeBase = geometry.payloadBase, diameter = op.payloadDiameter ?? 2, highest = geometry.payloadBase.x + (op.payloadLength ?? 3);
  let firstAttached = true;
  for (const st of vehicle.stages) {
    if (!st.attached) continue;
    const base = st.spec.isSpacecraft ? geometry.payloadBase : geometry.stageBases[st.index];
    if (firstAttached) { activeBase = base; firstAttached = false; }
    diameter = Math.max(diameter, st.spec.diameter);
    highest = Math.max(highest, base.x + st.spec.length);
    const reservoir = rcsGeometry(vehicle.spec.id, st.spec, base);
    rcs.push(reservoir);
    const consumed = op.rcsConsumedKgByStage?.[st.spec.id] ?? 0;
    // A core that has been shut down still thrusts through its tail-off; the
    // level the caller passes is already the decayed one (VehicleModel.thrust).
    const coreOn = st.index === vehicle.activeIndex && st.ignited && vehicle.usablePropellant(st) > 0
      && ((!st.cutoff && !st.burnedOut) || (stepStart !== undefined && vehicle.coreTailingOff(st, stepStart)));
    const throttle = coreOn ? op.coreThrottle ?? 0 : 0;
    const offset = op.propellantOffsetSeconds ?? 0;
    const massFlow = engineMassFlow(st.spec.engine) * st.spec.engine.count * fraction(st.engineFraction) * throttle;
    const propellantFloor = st.index === 0 ? vehicle.recoveryReserve * st.spec.propellantMass : 0;
    const propellant = Math.max(Math.min(st.propellant, propellantFloor), st.propellant - massFlow * offset);
    components.push(...stageMassComponents(st.spec, propellant, base, st.spec.id,
      { ...reservoir, consumedKg: consumed }));
    engines.push(...budgetEngines(chamberGeometry(st.spec.id, st.spec.id, st.spec.engine, st.spec.diameter / 2, base),
      engineThrust(st.spec.engine, pressure) * throttle, engineMassFlow(st.spec.engine) * throttle,
      st.spec.engine.count, st.engineFraction, throttle));
    st.boosters.forEach((b, groupIndex) => {
      if (!b.attached) return;
      const boosterOn = st.index === vehicle.activeIndex && b.ignited && vehicle.usableBoosterPropellant(b) > 0
        && (!b.burnedOut || (stepStart !== undefined && vehicle.boosterTailingOff(b, stepStart)));
      const bt = boosterOn ? op.boosterThrottles?.[groupIndex] ?? op.boosterThrottle ?? 0 : 0;
      const boosterPropellant = Math.max(Math.min(b.propellant, vehicle.recoveryReserve * b.spec.propellantMass),
        b.propellant - engineMassFlow(b.spec.engine) * b.spec.engine.count * bt * offset);
      const placements = geometry.boosters.filter(p => p.stageIndex === st.index && p.groupIndex === groupIndex);
      for (const placement of placements) {
        components.push(...stageMassComponents(b.spec, boosterPropellant, placement.baseBody, placement.id));
        engines.push(...budgetEngines(chamberGeometry(placement.id, b.spec.id, b.spec.engine, b.spec.diameter / 2,
          placement.baseBody, placement.rotationAboutX), engineThrust(b.spec.engine, pressure) * bt,
        engineMassFlow(b.spec.engine) * bt, b.spec.engine.count, 1, bt));
      }
    });
  }
  if (vehicle.fairingAttached && vehicle.spec.fairing) {
    const f = vehicle.spec.fairing;
    components.push({ id: 'fairing', ownerId: 'fairing', mass: f.mass,
      centerBody: add(geometry.fairingBase, v3(f.length / 2, 0, 0)), inertiaAtCenter: cylinderInertia(f.mass, f.diameter / 2, f.length, true), kind: 'fairing' });
    highest = Math.max(highest, geometry.fairingBase.x + f.length);
    diameter = Math.max(diameter, f.diameter);
  }
  if (vehicle.payloadAttached && vehicle.payloadMass > 0) {
    const L = op.payloadLength ?? 3, R = (op.payloadDiameter ?? 2) / 2;
    components.push({ id: 'payload', ownerId: 'payload', mass: vehicle.payloadMass,
      centerBody: add(geometry.payloadBase, v3(L / 2, 0, 0)), inertiaAtCenter: cylinderInertia(vehicle.payloadMass, R, L), kind: 'payload' });
  }
  const properties = buildMassProperties(components);
  const length = Math.max(0.1, highest - activeBase.x);
  const activeId = vehicle.active?.spec.id;
  const activeReservoir = rcs.find(r => r.stageId === activeId);
  // The legacy area helper only sees launcher stages/fairing. An inert payload
  // remains a finite body after separation and must not become drag-free.
  const area = firstAttached && vehicle.payloadAttached && vehicle.payloadMass > 0
    ? Math.PI * (diameter / 2) ** 2 : vehicle.frontalArea();
  const { table, cd } = stackAeroTable(vehicle, geometry, area, length, diameter, activeBase);
  return { ...properties, engines, rcs,
    rcsThrusters: activeReservoir?.thrusters ?? [], geometry, activeBase,
    aero: aeroEstimate(area, length, activeBase, diameter, table, cd),
    modelId: 'quasi-steady', dataRevision: RIGID_DATA_REVISION, assumptions: RIGID_DATA_ASSUMPTIONS };
}

/** Independent detached stage (Falcon recovery or a ballistic Soyuz body).
 * No implicit boosters, fairing or payload. Consume retained propellant outside
 * this pure factory, and provide actual clamped throttle for a recovery burn.
 */
export function buildDetachedStage(vehicleId: string, stage: StageSpec, propellant: number,
  op: RigidOperatingState & { engineFraction?: number; activeEngineIndices?: readonly number[] } = {}): RigidVehicleSnapshot {
  validateOperating(op);
  const reservoir = rcsGeometry(vehicleId, stage);
  const throttle = propellant > 0 ? op.coreThrottle ?? 0 : 0;
  const engines = budgetEngines(chamberGeometry(stage.id, stage.id, stage.engine, stage.diameter / 2),
    engineThrust(stage.engine, op.pressure ?? 0) * throttle, engineMassFlow(stage.engine) * throttle,
    stage.engine.count, op.engineFraction ?? 1, throttle);
  if (op.activeEngineIndices) for (const engine of engines) {
    if (!op.activeEngineIndices.includes(engine.engineIndex)) { engine.thrustBudgetN = 0; engine.massFlowKgS = 0; engine.upstreamThrottle = 0; }
  }
  const massFlow = engines.reduce((sum, engine) => sum + engine.massFlowKgS, 0);
  const remaining = Math.max(0, propellant - massFlow * (op.propellantOffsetSeconds ?? 0));
  const components = stageMassComponents(stage, remaining, v3(), stage.id,
    { ...reservoir, consumedKg: op.rcsConsumedKgByStage?.[stage.id] ?? 0 });
  return { ...buildMassProperties(components), engines, rcs: [reservoir], rcsThrusters: reservoir.thrusters,
    geometry: { vehicleId, length: stage.length, stageBases: [v3()], stageHeights: [stage.length],
      fairingBase: v3(stage.length), payloadBase: v3(stage.length), boosters: [], estimated: true },
    activeBase: v3(), aero: aeroEstimate(Math.PI * (stage.diameter / 2) ** 2, stage.length, v3(), stage.diameter),
    modelId: 'quasi-steady', dataRevision: RIGID_DATA_REVISION, assumptions: RIGID_DATA_ASSUMPTIONS };
}
