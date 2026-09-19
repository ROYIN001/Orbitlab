import { cross, norm, normalize, v3, type Vec3 } from '../vec3';
import { quatFromAxisAngle, quatInverseRotate, quatMultiply, quatNormalize, type Quat } from './math';

/** Shortest nose-only pointing command. Roll is free in orbital guidance;
 * request no twist about the current nose, while the rate controller still
 * brakes measured roll. A fixed external roll vector can become parallel to
 * a plane-change burn and manufacture a large, unnecessary roll maneuver.
 * This returns a target only; it never changes physical attitude or rates. */
export function nosePointingTarget(attitude: Quat, noseECI: Vec3): Quat {
  const direction = quatInverseRotate(attitude, normalize(noseECI));
  const axis = cross(v3(1, 0, 0), direction);
  const length = norm(axis);
  const angle = Math.atan2(length, direction.x);
  // Exactly antipodal: either transverse axis is a valid shortest rotation.
  // Choose body Z deterministically instead of an ill-conditioned projection.
  const rotation = quatFromAxisAngle(length > 1e-12 ? axis : v3(0, 0, 1), angle);
  return quatNormalize(quatMultiply(attitude, rotation));
}
