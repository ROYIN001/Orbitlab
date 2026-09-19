/** Conservative staging adapter over component ownership. No fuel is discarded
 * and no visual separation kick is applied outside an explicit impulse pair. */
import { sub, v3, type Vec3 } from '../vec3';
import type { RigidState } from './integrator';
import { buildMassProperties, type MassComponent, type MassProperties } from './mass';
import { matMul, matTranspose, quatIdentity, quatInverseRotate, quatNormalize, quatToMatrix, type Mat3, type Quat } from './math';
import { separateRigidBody, type SeparationImpulse } from './staging';

export type ComponentPartition = {
  id: string;
  /** New structural datum, expressed in the parent's structural datum. */
  datumBody?: Vec3;
  /** Child body axes -> parent body axes, e.g. a booster's retained roll. */
  bodyToParentQ?: Quat;
} & ({ ownerIds: readonly string[]; components?: never }
  | { components: readonly MassComponent[]; ownerIds?: never });

export interface PartitionImpulse extends Omit<SeparationImpulse, 'pointBody'> {
  /** Shared impulse location in parent's STRUCTURAL datum, not relative to CG. */
  pointDatumBody: Vec3;
}
export interface PartitionedRigidBody {
  id: string; state: RigidState;
  /** Child-local component positions, CG and inertia. */
  properties: MassProperties;
  /** Initial child CG minus parent CG, in the parent's body axes. */
  offsetBody: Vec3;
  /** Child structural datum in parent's structural coordinates. */
  datumBody: Vec3;
  bodyToParentQ: Quat;
  sourceOwnerIds: readonly string[];
}

const cloneComponent = (c: MassComponent): MassComponent => ({ ...c,
  centerBody: { ...c.centerBody }, inertiaAtCenter: [...c.inertiaAtCenter] as unknown as Mat3 });
const close = (a: number, b: number, scale = Math.max(1, Math.abs(a), Math.abs(b))) => Math.abs(a - b) <= 1e-10 * scale;

/** Explicit component pieces keep their original component id and centre, and
 * scale mass/tensor by the same fraction. This permits disclosed co-located
 * fairing halves while detecting manufactured or missing mass in a split. */
export function partitionRigidSnapshot(parentState: RigidState, parent: MassProperties,
  partitions: readonly ComponentPartition[], impulses: readonly PartitionImpulse[] = []): PartitionedRigidBody[] {
  const source = new Map<string, MassComponent>();
  const ownerIds = new Set<string>();
  for (const part of parent.components) {
    if (!part.id || source.has(part.id)) throw new RangeError('Parent component IDs must be unique');
    source.set(part.id, part); ownerIds.add(part.ownerId);
  }
  const accounted = new Map<string, number>();
  const childIds = new Set<string>();
  const groups = partitions.map((partition) => {
    if (!partition.id || childIds.has(partition.id)) throw new RangeError('Partition child IDs must be unique');
    childIds.add(partition.id);
    let parts: readonly MassComponent[];
    if (partition.ownerIds) {
      const owners = new Set(partition.ownerIds);
      if (owners.size !== partition.ownerIds.length || [...owners].some(id => !ownerIds.has(id))) throw new RangeError('Unknown or repeated partition owner');
      parts = parent.components.filter(c => owners.has(c.ownerId));
    } else {
      parts = partition.components;
    }
    if (!parts.length) throw new RangeError(`Empty partition ${partition.id}`);
    const inThisChild = new Set<string>();
    for (const part of parts) {
      if (inThisChild.has(part.id)) throw new RangeError('Repeated component ID inside one child');
      inThisChild.add(part.id);
      const original = source.get(part.id);
      if (!original || original.ownerId !== part.ownerId || !(original.mass > 0) || !(part.mass > 0)) throw new RangeError('Unknown or massless partition component');
      const share = part.mass / original.mass;
      if (!(share <= 1 + 1e-10) || !Number.isFinite(share)) throw new RangeError('Partition share exceeds original component');
      const a = original.centerBody, b = part.centerBody;
      if (![a.x - b.x, a.y - b.y, a.z - b.z].every(delta => Number.isFinite(delta) && Math.abs(delta) <= 1e-10)) {
        throw new RangeError('Partition cannot relocate component mass at the separation instant');
      }
      const tensorScale = Math.max(1, ...original.inertiaAtCenter.map(Math.abs));
      if (part.inertiaAtCenter.some((value, i) => !close(value, original.inertiaAtCenter[i] * share, tensorScale))) {
        throw new RangeError('Partition tensor must scale with its component mass');
      }
      accounted.set(part.id, (accounted.get(part.id) ?? 0) + share);
    }
    const globalProperties = buildMassProperties(parts);
    const datum = partition.datumBody ?? v3();
    if (![datum.x, datum.y, datum.z].every(Number.isFinite)) throw new RangeError('Partition datum must be finite');
    const rotation = quatNormalize(partition.bodyToParentQ ?? quatIdentity());
    const R = quatToMatrix(rotation), inverse = matTranspose(R);
    const localParts = parts.map((part): MassComponent => ({ ...cloneComponent(part),
      centerBody: quatInverseRotate(rotation, sub(part.centerBody, datum)),
      inertiaAtCenter: matMul(matMul(inverse, part.inertiaAtCenter), R) }));
    return { partition, datum, rotation, globalProperties, localProperties: buildMassProperties(localParts) };
  });
  for (const [id, original] of source) {
    if (original.mass === 0) continue;
    if (!close(accounted.get(id) ?? 0, 1)) throw new RangeError(`Missing or repeated component ownership: ${id}`);
  }
  const childDefs = groups.map(group => ({ id: group.partition.id, mass: group.localProperties.mass,
    inertiaBody: group.localProperties.inertia, offsetBody: sub(group.globalProperties.cg, parent.cg), bodyToParentQ: group.rotation }));
  const paired = impulses.map(({ pointDatumBody, ...impulse }): SeparationImpulse => ({ ...impulse, pointBody: sub(pointDatumBody, parent.cg) }));
  const result = separateRigidBody(parentState, { mass: parent.mass, inertiaBody: parent.inertia }, childDefs, paired);
  return result.map((body, index) => ({ id: body.id, state: body.state, properties: groups[index].localProperties,
    offsetBody: { ...childDefs[index].offsetBody }, datumBody: { ...groups[index].datum }, bodyToParentQ: { ...groups[index].rotation },
    sourceOwnerIds: [...new Set(groups[index].globalProperties.components.map(c => c.ownerId))] }));
}

export interface DetachedOwners { id: string; ownerIds: readonly string[]; datumBody?: Vec3; bodyToParentQ?: Quat }
/** Includes all remaining owners in a single retained body, in the unchanged
 * full-stack datum. The actual split validates overlap/unknown ids afterwards. */
export function detachedOwnerPartitions(parent: MassProperties, detached: readonly DetachedOwners[], retainedId = 'active'): ComponentPartition[] {
  const detachedIds = new Set(detached.flatMap(part => [...part.ownerIds]));
  const remaining = [...new Set(parent.components.map(c => c.ownerId))].filter(id => !detachedIds.has(id));
  return [...(remaining.length ? [{ id: retainedId, ownerIds: remaining }] : []), ...detached.map(part => ({ ...part }))];
}

/** Deliberately approximate fairing halves: half mass and half tensor at the
 * same initial CG. This preserves the pre-split cylinder's mass properties.
 * Visual half-shell shapes are not independent physical hemisphere estimates.
 */
export function fairingHalfPartitions(parent: MassProperties, retainedId = 'active'): ComponentPartition[] {
  const fairing = parent.components.filter(c => c.ownerId === 'fairing');
  if (!fairing.length) throw new RangeError('No attached fairing components');
  const others = [...new Set(parent.components.filter(c => c.ownerId !== 'fairing').map(c => c.ownerId))];
  const halves = [0, 1].map(index => ({ id: `fairing.${index}`, components: fairing.map((part): MassComponent => ({
    ...cloneComponent(part), mass: part.mass / 2, inertiaAtCenter: part.inertiaAtCenter.map(n => n / 2) as unknown as Mat3,
  })) }));
  return [...(others.length ? [{ id: retainedId, ownerIds: others }] : []), ...halves];
}
