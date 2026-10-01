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
 * the HUD and the replay read is untouched. The drawn globe's facets lie up to
 * 1.6 km under that sphere there, so the ground they stand on is drawn on the
 * sphere itself (render/steppe.ts).
 */
import type { VisualFrame } from '../physics/frame';
import { R_EARTH } from '../physics/constants';
import { geodeticHeight } from '../physics/geodesy';
import { MERCURY_CAPSULE, SOYUZ_DESCENT, VOSTOK_CAPSULE, type DescentCapsule } from '../physics/rigid/escape';
import { dot, norm, scale, type Vec3 } from '../physics/vec3';
import { quatRotate } from '../physics/rigid/math';

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
 * Where a spherical capsule at rest stands on the drawn ground (C01: Vostok's
 * sphere on the steppe): its CG, the frame's position, as high over the ground
 * as the sphere's radius and its CG's offset from the centre along the local
 * vertical put it (`cgAbove` from the heavy side, which leads, `+x`, as
 * physics/rigid/escape.ts flies it). Two things put the flown position lower:
 * the step it touched down in, up to 0.2 m into the ground at 10 m/s, and the
 * recording, which takes a frame every 30 s while the sphere waits on the
 * ground and blends its position along the chord the Earth's turn carries it
 * round (up to 2.4 m inside it at 51° N). Neither is the ground's, so the
 * picture stands it on the ground.
 */
function onDrawnGround(frame: VisualFrame, spec: DescentCapsule): Vec3 {
  const r = frame.r, n = norm(r);
  if (!(n > 1)) return r;
  const R = spec.diameter / 2;
  // the CG from the centre, along the heavy side's +x (cgX 0, the centre at cgAbove − R: rigid/escape.ts)
  const off = R - spec.cgAbove;
  const q = frame.rigid?.attitudeQ;
  const lead = q ? dot(quatRotate(q, { x: 1, y: 0, z: 0 }), scale(r, 1 / n)) : -1;
  return scale(r, (R_EARTH + R + off * lead) / n);
}

/**
 * The frame as the scene draws it: for a return on the ellipsoid, its body and
 * its debris moved onto the drawn sphere (`onDrawnSphere`), its sphere once it
 * is down stood on the drawn ground (`onDrawnGround`); any other frame as it
 * is. A shallow copy: nothing the frame holds is changed.
 */
export function drawnFrame(frame: VisualFrame): VisualFrame {
  if (!onEllipsoid(frame)) return frame;
  const spec = CAPSULES[frame.abort!.capsule];
  const r = frame.abort!.phase === 'landed' && spec.sphere ? onDrawnGround(frame, spec) : onDrawnSphere(frame.r);
  return { ...frame, r, debris: frame.debris.map((d) => ({ ...d, r: onDrawnSphere(d.r) })) };
}
