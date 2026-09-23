/**
 * Aerodynamic control surfaces: a returning booster's grid fins.
 *
 * A surface is a fin at a fixed point on the body whose deflection turns its
 * lift: `δ` radians of deflection at dynamic pressure `q` gives a force of
 * `q · slope · δ` along the surface's force direction, and the moment of that
 * force about the centre of mass. Its passive lift — the fin as a fixed part of
 * the body at the body's angle of attack — is already in the body's
 * aerodynamic table (`detachedAeroTable`), so only the deflection is added
 * here. The direction flips with the flow: a fin whose deflection pushes one
 * way in the stream from the base pushes the other way in a stream from the
 * nose.
 *
 * Deflection follows the command through a first-order lag and a rate limit,
 * like an engine gimbal. The allocation is a regularised least-squares split
 * of the moment the engines left over, clipped to the travel: four fins have
 * one more degree of freedom than the three moments, and the minimum-norm
 * answer spends it on keeping every fin as close to neutral as it can.
 */
import { add, cross, scale, sub, v3, type Vec3 } from '../vec3';
import type { Wrench } from './actuators';

export interface ControlSurfaceSpec {
  id: string;
  /** where the surface's force acts, body frame, m */
  positionBody: Vec3;
  /** unit direction of the force a positive deflection gives in a stream from the base, body frame */
  forceDirectionBody: Vec3;
  /** force per unit dynamic pressure per radian of deflection, m²/rad */
  forceSlopeM2: number;
  maxDeflectionRad: number;
  maxRateRadS: number;
  timeConstantS: number;
}

/** Deflection of each surface, rad. */
export type SurfaceDeflections = readonly number[];

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** +1 in a stream from the base (flying engines first), −1 in a stream from the nose. */
export function flowSign(airVelocityBody: Vec3): number {
  return airVelocityBody.x < 0 ? 1 : -1;
}

/** Force and moment of the surfaces' deflections about `cg`. */
export function surfaceWrench(specs: readonly ControlSurfaceSpec[], deflections: SurfaceDeflections,
  dynamicPressure: number, sign: number, cg: Vec3): Wrench {
  let force = v3(), moment = v3();
  specs.forEach((spec, i) => {
    const f = scale(spec.forceDirectionBody, sign * dynamicPressure * spec.forceSlopeM2 * (deflections[i] ?? 0));
    force = add(force, f);
    moment = add(moment, cross(sub(spec.positionBody, cg), f));
  });
  return { forceBody: force, momentBody: moment };
}

/**
 * Deflections that best give `moment` (body, N·m): δ = Bᵀ(BBᵀ + λI)⁻¹M with B
 * the moment each surface gives per radian, then clipped to the travel. Zero
 * at no dynamic pressure, where a fin has nothing to push on.
 */
export function allocateSurfaces(specs: readonly ControlSurfaceSpec[], moment: Vec3, dynamicPressure: number,
  sign: number, cg: Vec3): number[] {
  if (!specs.length || !(dynamicPressure > 0)) return specs.map(() => 0);
  const columns = specs.map((spec) => cross(sub(spec.positionBody, cg), scale(spec.forceDirectionBody, sign * dynamicPressure * spec.forceSlopeM2)));
  // BBᵀ, 3×3, plus a small regularisation relative to its own size.
  const m = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const comp = (c: Vec3) => [c.x, c.y, c.z];
  for (const c of columns) {
    const a = comp(c);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[3 * i + j] += a[i] * a[j];
  }
  const trace = m[0] + m[4] + m[8];
  const lambda = Math.max(1e-12, 1e-6 * trace);
  m[0] += lambda; m[4] += lambda; m[8] += lambda;
  const y = solve3(m, [moment.x, moment.y, moment.z]);
  return columns.map((c, i) => clamp(c.x * y[0] + c.y * y[1] + c.z * y[2], -specs[i].maxDeflectionRad, specs[i].maxDeflectionRad));
}

/** Largest moment the surfaces can give about each body axis at this dynamic pressure, N·m. */
export function surfaceAuthority(specs: readonly ControlSurfaceSpec[], dynamicPressure: number, cg: Vec3): Vec3 {
  const out = v3();
  for (const spec of specs) {
    const per = cross(sub(spec.positionBody, cg), scale(spec.forceDirectionBody, dynamicPressure * spec.forceSlopeM2 * spec.maxDeflectionRad));
    out.x += Math.abs(per.x); out.y += Math.abs(per.y); out.z += Math.abs(per.z);
  }
  return out;
}

/** First-order lag toward the command with a rate limit, over `dt` seconds. */
export function stepSurfaces(specs: readonly ControlSurfaceSpec[], deflections: SurfaceDeflections,
  commands: readonly number[], dt: number): number[] {
  return specs.map((spec, i) => {
    const current = deflections[i] ?? 0;
    const target = clamp(commands[i] ?? 0, -spec.maxDeflectionRad, spec.maxDeflectionRad);
    const lagged = spec.timeConstantS > 0 ? current + (target - current) * (1 - Math.exp(-dt / spec.timeConstantS)) : target;
    const step = clamp(lagged - current, -spec.maxRateRadS * dt, spec.maxRateRadS * dt);
    return clamp(current + step, -spec.maxDeflectionRad, spec.maxDeflectionRad);
  });
}

function solve3(m: number[], b: number[]): number[] {
  const [a, bb, c, d, e, f, g, h, i] = m;
  const det = a * (e * i - f * h) - bb * (d * i - f * g) + c * (d * h - e * g);
  if (!(Math.abs(det) > 0)) return [0, 0, 0];
  const inv = [
    (e * i - f * h), -(bb * i - c * h), (bb * f - c * e),
    -(d * i - f * g), (a * i - c * g), -(a * f - c * d),
    (d * h - e * g), -(a * h - bb * g), (a * e - bb * d),
  ].map((x) => x / det);
  return [0, 1, 2].map((r) => inv[3 * r] * b[0] + inv[3 * r + 1] * b[1] + inv[3 * r + 2] * b[2]);
}

/**
 * Four grid fins at the top of a returning stage, at 90° around it, each
 * deflecting about its own radial hinge. A fin of about a third by two-fifths
 * of the stage's diameter, the lift slope `detachedAeroTable` gives the same
 * fins as fixed surfaces, ±20° of travel at 30 °/s (Falcon 9's are
 * hydraulic; the figures are estimates).
 */
export function gridFinSurfaces(ownerId: string, length: number, diameter: number, slopePerM2: number): ControlSurfaceSpec[] {
  const area = 0.33 * diameter * 0.4 * diameter;
  const x = length - 0.5, r = diameter / 2 + 0.4 * diameter / 2;
  const fins: [string, Vec3, Vec3][] = [
    ['py', v3(x, r, 0), v3(0, 0, 1)], ['my', v3(x, -r, 0), v3(0, 0, 1)],
    ['pz', v3(x, 0, r), v3(0, 1, 0)], ['mz', v3(x, 0, -r), v3(0, 1, 0)],
  ];
  return fins.map(([id, positionBody, forceDirectionBody]) => ({
    id: `${ownerId}.gridFin.${id}`, positionBody, forceDirectionBody,
    forceSlopeM2: slopePerM2 * area, maxDeflectionRad: 20 * Math.PI / 180, maxRateRadS: 30 * Math.PI / 180, timeConstantS: 0.1,
  }));
}
