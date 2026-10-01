/**
 * Where the scene draws a body whose flight reads its heights on the WGS-84
 * ellipsoid (C01: Vostok-1's return, `DescentCapsule.datum`).
 *
 * The scene's Earth is the 6,378.137 km sphere every other flight is flown on.
 * The real surface under Vostok-1's track lies lower than that sphere — about
 * 0.6 km at the retro-fire off Africa, 12.5 km over Saratov — and the return is
 * flown against it (docs/PHYSICS.md §13.6), so the sphere landed 12.5 km
 * inside the drawn Earth and Gagarin came down under the ground. The return's
 * bodies are therefore drawn on the radius through their true position at
 * their WGS-84 height over the drawn sphere: on the ground when they are on the
 * ground, at their altitude when they fly. Only the picture moves; the frame
 * the HUD and the replay read is untouched.
 */
import type { VisualFrame } from '../physics/frame';
import { R_EARTH } from '../physics/constants';
import { geodeticHeight } from '../physics/geodesy';
import { MERCURY_CAPSULE, SOYUZ_DESCENT, VOSTOK_CAPSULE, type DescentCapsule } from '../physics/rigid/escape';
import { norm, scale, type Vec3 } from '../physics/vec3';

const CAPSULES: Record<DescentCapsule['id'], DescentCapsule> = { soyuz: SOYUZ_DESCENT, mercury: MERCURY_CAPSULE, vostok: VOSTOK_CAPSULE };

/** The frame's bodies fly on WGS-84 heights: a return of a capsule whose datum is the ellipsoid. */
export function onEllipsoid(frame: Pick<VisualFrame, 'abort'>): boolean {
  const a = frame.abort;
  return !!a && a.body === 'capsule' && CAPSULES[a.capsule]?.datum === 'wgs84';
}

/** A position at its WGS-84 height over the drawn sphere, on the same radius. */
export function onDrawnSphere(r: Vec3): Vec3 {
  const n = norm(r);
  return n > 1 ? scale(r, (R_EARTH + geodeticHeight(r)) / n) : r;
}

/**
 * The frame as the scene draws it: for a return on the ellipsoid, its body and
 * its debris moved onto the drawn sphere (`onDrawnSphere`); any other frame as
 * it is. A shallow copy: nothing the frame holds is changed.
 */
export function drawnFrame(frame: VisualFrame): VisualFrame {
  if (!onEllipsoid(frame)) return frame;
  return { ...frame, r: onDrawnSphere(frame.r), debris: frame.debris.map((d) => ({ ...d, r: onDrawnSphere(d.r) })) };
}
