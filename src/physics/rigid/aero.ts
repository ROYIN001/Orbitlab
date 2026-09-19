/** Explicit low-order aerodynamic/wind estimates; no vehicle-specific truth is implied. */
import { add, cross, norm, scale, sub, v3, type Vec3 } from '../vec3';
import type { Wrench } from './actuators';

export interface Aero6DofSpec {
  referenceArea: number;
  referenceLength: number;
  cpBody: Vec3;
  cdMach: readonly (readonly [number, number])[];
  normalSlopePerRad: number;
  /** Nonnegative nondimensional p/q/r damping derivatives (magnitudes). */
  rateDamping: Vec3;
  validAngleRad: number;
}
export interface AeroInput {
  density: number; speedOfSound: number; airVelocityBody: Vec3; omegaBody: Vec3; cgBody: Vec3;
}
export interface AeroWrench extends Wrench {
  mach: number; angleOfAttack: number; sideslip: number; dynamicPressure: number; withinEnvelope: boolean;
}

function interpolateCd(table: Aero6DofSpec['cdMach'], mach: number): number {
  if (table.length === 0 || table.some(([m, cd], index) => !Number.isFinite(m) || !Number.isFinite(cd) || m < 0 || cd < 0 || (index > 0 && m <= table[index - 1][0]))) {
    throw new RangeError('Cd table must be finite, nonnegative and strictly increasing in Mach');
  }
  if (mach <= table[0][0]) return table[0][1];
  for (let index = 1; index < table.length; index++) {
    if (mach <= table[index][0]) {
      const [m0, cd0] = table[index - 1];
      const [m1, cd1] = table[index];
      return cd0 + (cd1 - cd0) * (mach - m0) / (m1 - m0);
    }
  }
  return table[table.length - 1][1];
}

/** airVelocityBody is vehicle velocity relative to air, not incoming wind direction. */
export function aerodynamicWrench(spec: Aero6DofSpec, input: AeroInput): AeroWrench {
  const values = [input.density, spec.referenceArea, spec.referenceLength, spec.normalSlopePerRad,
    spec.rateDamping.x, spec.rateDamping.y, spec.rateDamping.z, spec.validAngleRad];
  if (values.some(value => !Number.isFinite(value) || value < 0)) throw new RangeError('Invalid aerodynamic coefficients');
  if ([input.airVelocityBody, input.omegaBody, input.cgBody, spec.cpBody].some(vec => ![vec.x, vec.y, vec.z].every(Number.isFinite))) throw new RangeError('Aerodynamic vectors must be finite');
  const velocity = input.airVelocityBody;
  const speed = norm(velocity);
  if (input.density > 0 && speed > 0 && !(input.speedOfSound > 0 && Number.isFinite(input.speedOfSound))) throw new RangeError('Positive sound speed required in atmosphere');
  const mach = input.speedOfSound > 0 ? speed / input.speedOfSound : 0;
  const totalAngle = speed > 0 ? Math.atan2(Math.hypot(velocity.y, velocity.z), velocity.x) : 0;
  const angleOfAttack = speed > 0 ? Math.atan2(velocity.z, velocity.x) : 0;
  const sideslip = speed > 0 ? Math.atan2(velocity.y, Math.hypot(velocity.x, velocity.z)) : 0;
  const dynamicPressure = 0.5 * input.density * speed * speed;
  // With exactly zero dynamic pressure no aerodynamic coefficient is applied.
  // Keep low-but-nonzero extrapolation distinct; display/exposure thresholds
  // must not silently turn an uncertain coefficient into validated data.
  const withinEnvelope = dynamicPressure === 0 || (totalAngle <= spec.validAngleRad && (spec.cdMach.length > 0 && mach <= spec.cdMach[spec.cdMach.length - 1][0]));
  if (speed === 0 || input.density === 0) return { forceBody: v3(), momentBody: v3(), mach, angleOfAttack, sideslip, dynamicPressure, withinEnvelope };
  const coefficient = interpolateCd(spec.cdMach, mach);
  const drag = scale(velocity, -dynamicPressure * spec.referenceArea * coefficient / speed);
  // sin(total angle) provides a bounded extension outside the small-angle
  // envelope. It is an estimate, flagged above, not a claim of high-AoA data.
  const normal = scale(v3(0, velocity.y, velocity.z), -dynamicPressure * spec.referenceArea * spec.normalSlopePerRad / speed);
  const forceBody = add(drag, normal);
  const momentBody = cross(sub(spec.cpBody, input.cgBody), forceBody);
  // q*S*L * (omega*L/(2V)); evaluated without a singular division by V.
  const damping = 0.25 * input.density * speed * spec.referenceArea * spec.referenceLength ** 2;
  momentBody.x -= damping * spec.rateDamping.x * input.omegaBody.x;
  momentBody.y -= damping * spec.rateDamping.y * input.omegaBody.y;
  momentBody.z -= damping * spec.rateDamping.z * input.omegaBody.z;
  return { forceBody, momentBody, mach, angleOfAttack, sideslip, dynamicPressure, withinEnvelope };
}

/** ENU components use x=east, y=north, z=up. These are scenarios, not measured weather. */
export interface WindScenario {
  kind: 'calm' | 'constant' | 'shear';
  velocityENU?: Vec3;
  shearPerMeterENU?: Vec3;
  referenceAltitude?: number;
  /** Optional bounds for the altitude used by the linear shear profile. */
  altitudeRangeM?: readonly [number, number];
  gustAmplitudeENU?: Vec3;
  gustPeriodSeconds?: number;
  seed?: number;
}
function phase(seed: number, axis: number): number {
  let value = (seed ^ Math.imul(axis + 1, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 4294967296 * 2 * Math.PI;
}
export function windVelocityENU(scenario: WindScenario, altitudeM: number, timeS: number): Vec3 {
  if (!Number.isFinite(altitudeM) || !Number.isFinite(timeS)) throw new RangeError('Wind coordinates must be finite');
  if (scenario.kind === 'calm') return v3();
  const base = scenario.velocityENU ?? v3();
  const shear = scenario.kind === 'shear' ? scenario.shearPerMeterENU ?? v3() : v3();
  const gust = scenario.gustAmplitudeENU ?? v3();
  const range = scenario.altitudeRangeM;
  if (range && (!range.every(Number.isFinite) || range[0] > range[1])) throw new RangeError('Invalid wind altitude range');
  const boundedAltitude = range ? Math.max(range[0], Math.min(range[1], altitudeM)) : altitudeM;
  const height = boundedAltitude - (scenario.referenceAltitude ?? 0);
  const period = scenario.gustPeriodSeconds ?? 20;
  if (!(period > 0) || !Number.isFinite(period) || !Number.isFinite(height)
    || [base, shear, gust].some(vec => ![vec.x, vec.y, vec.z].every(Number.isFinite))) throw new RangeError('Invalid wind scenario');
  const result = v3();
  (['x', 'y', 'z'] as const).forEach((axis, index) => {
    result[axis] = base[axis] + shear[axis] * height + gust[axis] * Math.sin(2 * Math.PI * timeS / period + phase(scenario.seed ?? 0, index));
  });
  return result;
}

export function enuWindToEci(windENU: Vec3, positionECI: Vec3): Vec3 {
  const radius = norm(positionECI);
  if (!(radius > 0) || ![positionECI.x, positionECI.y, positionECI.z, windENU.x, windENU.y, windENU.z].every(Number.isFinite)) throw new RangeError('Invalid local wind frame');
  const up = scale(positionECI, 1 / radius);
  let east = cross(v3(0, 0, 1), up);
  if (norm(east) < 1e-12) east = v3(0, 1, 0); // longitude convention at the pole
  else east = scale(east, 1 / norm(east));
  const north = cross(up, east);
  return add(add(scale(east, windENU.x), scale(north, windENU.y)), scale(up, windENU.z));
}
export function windVelocityECI(scenario: WindScenario, positionECI: Vec3, altitudeM: number, timeS: number): Vec3 {
  return enuWindToEci(windVelocityENU(scenario, altitudeM, timeS), positionECI);
}
