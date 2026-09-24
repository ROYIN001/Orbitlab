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
 *
 * Starship's flaps are the other kind of surface: plates on the hull that
 * work as drag brakes in a stream that meets them face on — the ship falling
 * belly first — and do nothing edge on. Their force grows with the square of
 * the part of the flow against their face (`flow: 'facing'`), and it is never
 * negative: folded against the hull a flap makes none, fully out it makes its
 * whole drag, and the control works on the difference about a half-open trim
 * position (`neutralRad`), which the body's own table does not include.
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
  /**
   * `axial` (the default): a grid fin, whose force changes sign with the
   * stream along the body (`flowSign`). `facing`: a plate that pushes along
   * its force direction only when the stream meets that face, scaled by the
   * square of the part of the stream that does (`surfaceFlow`).
   */
  flow?: 'axial' | 'facing';
  /** deflection the command is measured from, rad: a plate's force is `slope × (δ + neutralRad)` */
  neutralRad?: number;
}

/** Deflection of each surface, rad. */
export type SurfaceDeflections = readonly number[];

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** +1 in a stream from the base (flying engines first), −1 in a stream from the nose. */
export function flowSign(airVelocityBody: Vec3): number {
  return airVelocityBody.x < 0 ? 1 : -1;
}

/**
 * How much of each surface's force the stream gives it now: `flowSign` for a
 * grid fin, and for a plate the square of the stream's component against its
 * face (0 when the stream comes from behind it).
 */
export function surfaceFlow(specs: readonly ControlSurfaceSpec[], airVelocityBody: Vec3): number[] {
  const speed = Math.hypot(airVelocityBody.x, airVelocityBody.y, airVelocityBody.z);
  return specs.map((spec) => {
    if (spec.flow !== 'facing') return flowSign(airVelocityBody);
    if (!(speed > 0)) return 0;
    const n = spec.forceDirectionBody;
    const against = -(airVelocityBody.x * n.x + airVelocityBody.y * n.y + airVelocityBody.z * n.z) / speed;
    return against > 0 ? against * against : 0;
  });
}

/** One sign for every surface, or one flow factor per surface (`surfaceFlow`). */
export type SurfaceFlow = number | readonly number[];
const flowOf = (flow: SurfaceFlow, i: number): number => typeof flow === 'number' ? flow : flow[i] ?? 0;
const withNeutral = (spec: ControlSurfaceSpec, deflection: number): number =>
  spec.neutralRad !== undefined ? deflection + spec.neutralRad : deflection;

/** Force and moment of the surfaces' deflections about `cg`. */
export function surfaceWrench(specs: readonly ControlSurfaceSpec[], deflections: SurfaceDeflections,
  dynamicPressure: number, sign: SurfaceFlow, cg: Vec3): Wrench {
  let force = v3(), moment = v3();
  specs.forEach((spec, i) => {
    const f = scale(spec.forceDirectionBody, flowOf(sign, i) * dynamicPressure * spec.forceSlopeM2 * withNeutral(spec, deflections[i] ?? 0));
    force = add(force, f);
    moment = add(moment, cross(sub(spec.positionBody, cg), f));
  });
  return { forceBody: force, momentBody: moment };
}

/** Moment the surfaces make at zero command (a plate's trim drag), N·m. */
export function surfaceNeutralMoment(specs: readonly ControlSurfaceSpec[], dynamicPressure: number, sign: SurfaceFlow, cg: Vec3): Vec3 {
  let moment = v3();
  specs.forEach((spec, i) => {
    if (!spec.neutralRad) return;
    const f = scale(spec.forceDirectionBody, flowOf(sign, i) * dynamicPressure * spec.forceSlopeM2 * spec.neutralRad);
    moment = add(moment, cross(sub(spec.positionBody, cg), f));
  });
  return moment;
}

/**
 * Deflections that best give `moment` (body, N·m): δ = Bᵀ(BBᵀ + λI)⁻¹M with B
 * the moment each surface gives per radian, then clipped to the travel. Zero
 * at no dynamic pressure, where a fin has nothing to push on.
 */
export function allocateSurfaces(specs: readonly ControlSurfaceSpec[], moment: Vec3, dynamicPressure: number,
  sign: SurfaceFlow, cg: Vec3): number[] {
  if (!specs.length || !(dynamicPressure > 0)) return specs.map(() => 0);
  const columns = specs.map((spec, i) => cross(sub(spec.positionBody, cg), scale(spec.forceDirectionBody, flowOf(sign, i) * dynamicPressure * spec.forceSlopeM2)));
  // What is asked of the deflections is what the trim drag does not already give.
  if (specs.some((spec) => spec.neutralRad)) moment = sub(moment, surfaceNeutralMoment(specs, dynamicPressure, sign, cg));
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

/**
 * Largest moment the surfaces can give about each body axis at this dynamic
 * pressure, N·m, either way from their neutral one (`surfaceNeutralMoment`).
 */
export function surfaceAuthority(specs: readonly ControlSurfaceSpec[], dynamicPressure: number, cg: Vec3, sign: SurfaceFlow = 1): Vec3 {
  const out = v3();
  specs.forEach((spec, i) => {
    const per = cross(sub(spec.positionBody, cg), scale(spec.forceDirectionBody, Math.abs(flowOf(sign, i)) * dynamicPressure * spec.forceSlopeM2 * spec.maxDeflectionRad));
    out.x += Math.abs(per.x); out.y += Math.abs(per.y); out.z += Math.abs(per.z);
  });
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

/**
 * Starship's four flaps: two forward near the nose, two larger aft by the
 * engines, hinged along the hull at 65° either side of the belly (+Z, the
 * heat-shield side) and working as drag plates in the stream that meets the
 * belly. Each pushes along the hull's tangent there — mostly against the fall,
 * and a little outward — so the pair fore against the pair aft pitches the
 * ship, one side against the other rolls it, and the diagonal pairs yaw it
 * with their outward components. Areas (18 m² forward, 32 m² aft), the plate
 * drag coefficient of 1.2, the ±34° of travel either side of half open and
 * the 20 °/s they move at are estimates; SpaceX publishes none of them.
 */
export function shipFlapSurfaces(ownerId: string, length: number, diameter: number): ControlSurfaceSpec[] {
  const R = diameter / 2, hinge = 65 * Math.PI / 180, travel = 0.6;
  const flap = (id: string, x: number, side: number, area: number, span: number): ControlSurfaceSpec => {
    const r = R + span / 2;
    return {
      id: `${ownerId}.flap.${id}`, positionBody: v3(x, side * r * Math.sin(hinge), r * Math.cos(hinge)),
      forceDirectionBody: v3(0, side * Math.cos(hinge), -Math.sin(hinge)),
      // Fully out, the plate's whole drag, 1.2 q A; folded, none.
      forceSlopeM2: 1.2 * area / (2 * travel), maxDeflectionRad: travel, neutralRad: travel,
      maxRateRadS: 20 * Math.PI / 180, timeConstantS: 0.15, flow: 'facing',
    };
  };
  return [
    flap('fwdLeft', 0.86 * length, 1, 18, 3), flap('fwdRight', 0.86 * length, -1, 18, 3),
    flap('aftLeft', 0.13 * length, 1, 32, 4), flap('aftRight', 0.13 * length, -1, 32, 4),
  ];
}
