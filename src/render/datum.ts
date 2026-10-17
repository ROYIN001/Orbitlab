/**
 * Where the scene draws a return that comes down on land (C01: Vostok-1's,
 * `DescentCapsule.onLand`).
 *
 * The scene's Earth is the WGS-84 ellipsoid every flight is flown on (D-51:
 * render/scene.ts flattens the globe by 1/298.257 along the pole, and the
 * sites, the air and the ground are on it in the physics), so a body is drawn
 * where it flies. Until D-51 the drawn Earth was the 6,378.137 km sphere and
 * a return flown on WGS-84 heights was moved onto it here, 12.5 km over
 * Saratov; that mapping is gone. What is left is the sphere at rest on the
 * steppe, which the picture stands on the ground: see `onDrawnGround`.
 */
import type { VisualFrame } from '../physics/frame';
import { geodeticHeight } from '../physics/geodesy';
import { MERCURY_CAPSULE, SOYUZ_DESCENT, VOSTOK_CAPSULE, type DescentCapsule } from '../physics/rigid/escape';
import { dot, norm, scale, type Vec3 } from '../physics/vec3';
import { quatRotate } from '../physics/rigid/math';

const CAPSULES: Record<DescentCapsule['id'], DescentCapsule> = { soyuz: SOYUZ_DESCENT, mercury: MERCURY_CAPSULE, vostok: VOSTOK_CAPSULE };

/** The frame is a return of a capsule that comes down on land (Vostok-1's sphere, on the Saratov steppe). */
export function landReturn(frame: Pick<VisualFrame, 'abort'>): boolean {
  const a = frame.abort;
  return !!a && a.body === 'capsule' && !!CAPSULES[a.capsule]?.onLand;
}

/**
 * Where a spherical capsule at rest stands on the drawn ground (C01: Vostok's
 * sphere on the steppe): its CG, the frame's position, as high over the ground
 * as the sphere's radius and its CG's offset from the centre along the local
 * vertical put it (`cgAbove` from the heavy side, which leads, `+x`, as
 * physics/rigid/escape.ts flies it). Two things put the flown position lower:
 * the step it touched down in, up to 0.2 m into the ground at 10 m/s, and the
 * recording, which takes a frame every 30 s while the sphere waits on the
 * ground and blends its position along the chord the Earth's turn carries it
 * round (up to 2.4 m inside it at 51° N). Neither is the ground's, so the
 * picture stands it on the ground: the WGS-84 surface under it, along its
 * radius (0.19° from the normal at most: a metre of height is a metre there).
 */
function onDrawnGround(frame: VisualFrame, spec: DescentCapsule): Vec3 {
  const r = frame.r, n = norm(r);
  if (!(n > 1)) return r;
  const R = spec.diameter / 2;
  // the CG from the centre, along the heavy side's +x (cgX 0, the centre at cgAbove − R: rigid/escape.ts)
  const off = R - spec.cgAbove;
  const q = frame.rigid?.attitudeQ;
  const lead = q ? dot(quatRotate(q, { x: 1, y: 0, z: 0 }), scale(r, 1 / n)) : -1;
  return scale(r, (n - geodeticHeight(r) + R + off * lead) / n);
}

/**
 * The frame as the scene draws it: for a return on land whose sphere is down,
 * the sphere stood on the drawn ground (`onDrawnGround`); any other frame as
 * it is. A shallow copy: nothing the frame holds is changed.
 */
export function drawnFrame(frame: VisualFrame): VisualFrame {
  if (!landReturn(frame)) return frame;
  const spec = CAPSULES[frame.abort!.capsule];
  if (frame.abort!.phase !== 'landed' || !spec.sphere) return frame;
  return { ...frame, r: onDrawnGround(frame, spec) };
}
