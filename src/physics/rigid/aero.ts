/** Explicit low-order aerodynamic/wind estimates; no vehicle-specific truth is implied. */
import { add, cross, norm, scale, sub, v3, type Vec3 } from '../vec3';
import type { Wrench } from './actuators';
import { atMach, crossflowDragCoefficient, type AeroTable } from './aero-tables';

export interface Aero6DofSpec {
  referenceArea: number;
  referenceLength: number;
  /**
   * Centre of pressure. With a `table`, only its x matters, and only as a shift
   * of the table's own centre-of-pressure curve: `cpBody.x - table.cpX[0]`
   * (zero as built; the sensitivity studies move it).
   */
  cpBody: Vec3;
  /** Axial (nose-first) force coefficient against Mach; without a table, the drag along the airflow. */
  cdMach: readonly (readonly [number, number])[];
  /** Small-angle normal-force slope; with a table, a scale on its potential lift (2 = as tabulated). */
  normalSlopePerRad: number;
  /** Nonnegative nondimensional p/q/r damping derivatives (magnitudes). */
  rateDamping: Vec3;
  validAngleRad: number;
  /**
   * Per-vehicle coefficients (src/physics/rigid/aero-tables.ts): axial force
   * along the body, normal force from slender-body lift plus viscous
   * crossflow, and a centre of pressure that moves with Mach and angle. Absent,
   * the single-slope model below is used.
   */
  table?: AeroTable;
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
  let forceBody: Vec3, momentBody: Vec3;
  if (spec.table) {
    ({ forceBody, momentBody } = tabulatedLoads(spec, spec.table, velocity, speed, mach, dynamicPressure, input.cgBody));
  } else {
    const coefficient = interpolateCd(spec.cdMach, mach);
    const drag = scale(velocity, -dynamicPressure * spec.referenceArea * coefficient / speed);
    // sin(total angle) provides a bounded extension outside the small-angle
    // envelope. It is an estimate, flagged above, not a claim of high-AoA data.
    const normal = scale(v3(0, velocity.y, velocity.z), -dynamicPressure * spec.referenceArea * spec.normalSlopePerRad / speed);
    forceBody = add(drag, normal);
    momentBody = cross(sub(spec.cpBody, input.cgBody), forceBody);
  }
  // q*S*L * (omega*L/(2V)); evaluated without a singular division by V.
  const damping = 0.25 * input.density * speed * spec.referenceArea * spec.referenceLength ** 2;
  momentBody.x -= damping * spec.rateDamping.x * input.omegaBody.x;
  momentBody.y -= damping * spec.rateDamping.y * input.omegaBody.y;
  momentBody.z -= damping * spec.rateDamping.z * input.omegaBody.z;
  return { forceBody, momentBody, mach, angleOfAttack, sideslip, dynamicPressure, withinEnvelope };
}

/**
 * Force and moment from a per-vehicle table, for a total angle anywhere from
 * nose first to base first. Axial force acts along the body and opposes its
 * axial motion; normal force is slender-body lift (C_Nα sin α |cos α|) plus
 * viscous crossflow (η C_dc(M sin α) (A_p/S) sin²α) and opposes the lateral
 * motion; the two act at their own centres of pressure, so the combined one
 * moves aft as the crossflow grows with the angle.
 */
function tabulatedLoads(spec: Aero6DofSpec, table: AeroTable, velocity: Vec3, speed: number, mach: number,
  dynamicPressure: number, cg: Vec3): { forceBody: Vec3; momentBody: Vec3 } {
  const lateral = Math.hypot(velocity.y, velocity.z);
  const s = lateral / speed, c = velocity.x / speed;
  const noseFirst = velocity.x >= 0;
  const qS = dynamicPressure * spec.referenceArea;
  const axialCoefficient = (noseFirst ? interpolateCd(spec.cdMach, mach) : atMach(table, table.baseAxial, mach)) * c * c;
  const potentialSlope = noseFirst ? atMach(table, table.normalSlope, mach) * spec.normalSlopePerRad / 2 : table.baseNormalSlope;
  const potential = potentialSlope * s * Math.abs(c);
  const crossflow = table.crossflowEta * crossflowDragCoefficient(mach * s) * (table.planformArea / spec.referenceArea) * s * s;
  const normal = potential + crossflow;
  const shift = spec.cpBody.x - table.cpX[0];
  const potentialX = noseFirst ? atMach(table, table.cpX, mach) : table.baseCpX;
  const cpX = (normal > 0 ? (potential * potentialX + crossflow * table.planformX) / normal : potentialX) + shift;
  const axial = -Math.sign(velocity.x) * qS * axialCoefficient;
  const forceBody = lateral > 0
    ? v3(axial, -velocity.y / lateral * qS * normal, -velocity.z / lateral * qS * normal)
    : v3(axial, 0, 0);
  const momentBody = cross(sub(v3(cpX, spec.cpBody.y, spec.cpBody.z), cg), forceBody);
  return { forceBody, momentBody };
}

/**
 * Magnitude of the static aerodynamic moment about `cg` at total angle `angle`
 * in one plane, at Mach `mach` and dynamic pressure `dynamicPressure` — what a
 * trim has to hold.
 */
export function staticAeroMoment(spec: Aero6DofSpec, mach: number, dynamicPressure: number, angle: number, cg: Vec3): number {
  if (!(dynamicPressure > 0)) return 0;
  const speed = 300, sound = mach > 0 ? speed / mach : Infinity;
  const load = aerodynamicWrench(spec, { density: 2 * dynamicPressure / (speed * speed), speedOfSound: Number.isFinite(sound) ? sound : 1e9,
    airVelocityBody: v3(speed * Math.cos(angle), 0, speed * Math.sin(angle)), omegaBody: v3(), cgBody: cg });
  return norm(load.momentBody);
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
