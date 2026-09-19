import { type Vec3, add, cross, norm, scale, sub, v3 } from '../vec3';
import { type Mat3, type Quat, assertSPD, matMul, matTranspose, matVecMul,
  quatIdentity, quatInverseRotate, quatMultiply, quatNormalize, quatRotate, quatToMatrix, solveSPD } from './math';
import type { RigidState } from './integrator';

export interface RigidMassProperties { mass: number; inertiaBody: Mat3 }
export interface StagingChild extends RigidMassProperties {
  id: string;
  /** Child CG relative to parent CG, expressed in parent body axes, m. */
  offsetBody: Vec3;
  /** Child body axes → parent body axes. Omission means axes remain aligned. */
  bodyToParentQ?: Quat;
}
/** A paired internal impulse at one shared point conserves both total momenta.
 * No external impulse is smuggled into a staging event. Spring energy is allowed. */
export interface SeparationImpulse {
  childAId: string;
  childBId: string;
  /** Location relative to parent CG, in parent body axes, m. */
  pointBody: Vec3;
  /** Linear impulse on A; B receives its negative, in parent body axes, N s. */
  impulseOnABody: Vec3;
  /** Optional pure angular impulse pair, in parent body axes, N m s. */
  angularImpulseOnABody?: Vec3;
}
export interface SeparatedBody extends RigidMassProperties { id: string; state: RigidState }

function finite(v: Vec3): void {
  if (![v.x, v.y, v.z].every(Number.isFinite)) throw new RangeError('Staging vectors must be finite');
}
function massProperties(p: RigidMassProperties): void {
  if (!(p.mass > 0) || !Number.isFinite(p.mass)) throw new RangeError('Staging mass must be finite and positive');
  assertSPD(p.inertiaBody);
}

/** Validate that all attached mass is represented exactly once, with zero
 * composite CG offset and the full parallel-axis tensor. No tolerance-based
 * repair is performed; mismatched geometry must be fixed by the mass model. */
function validateAssembly(parent: RigidMassProperties, children: readonly StagingChild[]): void {
  massProperties(parent);
  if (!children.length) throw new RangeError('Staging needs at least one child');
  const ids = new Set<string>();
  let mass = 0;
  let weightedOffset = v3();
  let lengthScale = 1;
  const tensor = Array<number>(9).fill(0);
  for (const child of children) {
    if (!child.id || ids.has(child.id)) throw new RangeError('Staging child IDs must be unique and nonempty');
    ids.add(child.id);
    massProperties(child); finite(child.offsetBody);
    const rotation = quatToMatrix(child.bodyToParentQ ?? quatIdentity());
    const rotated = matMul(matMul(rotation, child.inertiaBody), matTranspose(rotation));
    const r = child.offsetBody;
    const a = [r.x, r.y, r.z];
    const r2 = r.x * r.x + r.y * r.y + r.z * r.z;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      tensor[3 * i + j] += rotated[3 * i + j] + child.mass * ((i === j ? r2 : 0) - a[i] * a[j]);
    }
    mass += child.mass;
    weightedOffset = add(weightedOffset, scale(r, child.mass));
    lengthScale = Math.max(lengthScale, norm(r));
  }
  if (Math.abs(mass - parent.mass) > 1e-9 * Math.max(1, mass, parent.mass)) throw new RangeError('Staging mass does not match parent');
  if (norm(weightedOffset) > 1e-9 * mass * lengthScale) throw new RangeError('Staging child CGs do not match parent CG');
  const tensorScale = Math.max(1, ...parent.inertiaBody.map(Math.abs), ...tensor.map(Math.abs));
  if (tensor.some((value, index) => !Number.isFinite(value) || Math.abs(value - parent.inertiaBody[index]) > 1e-9 * tensorScale)) {
    throw new RangeError('Staging child inertia does not match parent inertia');
  }
}

/** Instantaneous split. For every child v=v_parent+omega_ECI×offset_ECI.
 * Impulses change each child's translation AND spin about its own CG.
 * Conservation concerns orbital+spin momentum about a common inertial point.
 * Reference: MIT 2.003SC Lecture 5, impulse/torque/angular momentum:
 * https://ocw.mit.edu/courses/2-003sc-engineering-dynamics-fall-2011/resources/lecture-5-impulse-torque-and-angular-momentum-for-a-system-of-particles-1/
 */
export function separateRigidBody(parentState: RigidState, parentProperties: RigidMassProperties,
  children: readonly StagingChild[], impulses: readonly SeparationImpulse[] = []): SeparatedBody[] {
  validateAssembly(parentProperties, children);
  finite(parentState.r); finite(parentState.v); finite(parentState.omegaBody);
  const parentQ = quatNormalize(parentState.attitudeQ);
  const omegaECI = quatRotate(parentQ, parentState.omegaBody);
  const result = children.map((child): SeparatedBody => {
    const relativeQ = quatNormalize(child.bodyToParentQ ?? quatIdentity());
    const offsetECI = quatRotate(parentQ, child.offsetBody);
    return { id: child.id, mass: child.mass, inertiaBody: [...child.inertiaBody] as unknown as Mat3,
      state: { r: add(parentState.r, offsetECI), v: add(parentState.v, cross(omegaECI, offsetECI)),
        attitudeQ: quatNormalize(quatMultiply(parentQ, relativeQ)),
        omegaBody: quatInverseRotate(relativeQ, parentState.omegaBody) } };
  });
  const index = new Map(result.map((body, i) => [body.id, i]));
  for (const impulse of impulses) {
    const a = index.get(impulse.childAId), b = index.get(impulse.childBId);
    if (a === undefined || b === undefined || a === b) throw new RangeError('Impulse requires two distinct existing child IDs');
    finite(impulse.pointBody); finite(impulse.impulseOnABody);
    const couple = impulse.angularImpulseOnABody ?? v3();
    finite(couple);
    for (const [i, sign] of [[a, 1], [b, -1]] as const) {
      const body = result[i], child = children[i];
      const jBodyParent = scale(impulse.impulseOnABody, sign);
      const angularImpulseParent = add(cross(sub(impulse.pointBody, child.offsetBody), jBodyParent), scale(couple, sign));
      const angularImpulseChild = quatInverseRotate(child.bodyToParentQ ?? quatIdentity(), angularImpulseParent);
      body.state.v = add(body.state.v, scale(quatRotate(parentQ, jBodyParent), 1 / body.mass));
      body.state.omegaBody = add(body.state.omegaBody, solveSPD(body.inertiaBody, angularImpulseChild));
    }
  }
  return result;
}

/** Diagnostic for invariant tests and staging audits. Reference point is ECI.
 * Use parent CG as the common point to avoid cancellation at Earth-scale radii. */
export function rigidMomentum(state: RigidState, properties: RigidMassProperties, referenceECI: Vec3 = v3()):
  { linear: Vec3; angular: Vec3 } {
  const linear = scale(state.v, properties.mass);
  return { linear, angular: add(cross(sub(state.r, referenceECI), linear),
    quatRotate(state.attitudeQ, matVecMul(properties.inertiaBody, state.omegaBody))) };
}
