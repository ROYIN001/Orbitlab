/** Local coast maneuver planning with finite gas. This shapes rate commands;
 * only the existing actuator allocator/plant may apply moments or consume gas. */
import { G0 } from '../constants';
import { cross, norm, normalize, scale, sub, v3, type Vec3 } from '../vec3';
import { assertSPD, matVecMul, type Mat3 } from './math';
import type { RcsThrusterSpec } from './actuators';

const AXES = ['x', 'y', 'z'] as const;
const PAIR_TOLERANCE = 1e-9;
const finiteVector = (value: Vec3) => AXES.every(axis => Number.isFinite(value[axis]));

/** Impulse per kg for existing balanced, opposed-force, pure-axis couples.
 * For equal applied force F on the two jets, M=F[(r1-r2)×d] and
 * mdot=F/g0*(1/Isp1+1/Isp2). Unequal max thrust is balanced at the smaller
 * force, within both duty bounds. CG translation cancels from the couple.
 * Require both torque signs and take the least efficient eligible pair, so an
 * efficient installation never silently substitutes for a less efficient one.
 * Mixed-axis couples are not inferred into a new actuator installation. */
export function rcsImpulseEfficiencies(jets: readonly RcsThrusterSpec[]): Vec3 {
  for (const jet of jets) {
    if (!finiteVector(jet.positionBody) || !finiteVector(jet.directionBody) || !(norm(jet.directionBody) > 0)
      || !Number.isFinite(jet.maxThrust) || jet.maxThrust < 0 || !Number.isFinite(jet.isp) || !(jet.isp > 0)) {
      throw new RangeError('Invalid coast-pointing jet');
    }
  }
  const positive = v3(Infinity, Infinity, Infinity), negative = v3(Infinity, Infinity, Infinity);
  for (let i = 0; i < jets.length; i++) for (let j = i + 1; j < jets.length; j++) {
    const a = jets[i], b = jets[j];
    if (!(Math.min(a.maxThrust, b.maxThrust) > 0)) continue;
    const direction = normalize(a.directionBody), other = normalize(b.directionBody);
    if (norm(sub(direction, scale(other, -1))) > PAIR_TOLERANCE) continue;
    const lever = cross(sub(a.positionBody, b.positionBody), direction), length = norm(lever);
    if (!(length > PAIR_TOLERANCE)) continue;
    const axis = AXES.reduce((best, candidate) => Math.abs(lever[candidate]) > Math.abs(lever[best]) ? candidate : best, 'x');
    if (AXES.some(candidate => candidate !== axis && Math.abs(lever[candidate]) > PAIR_TOLERANCE * length)) continue;
    const efficiency = Math.abs(lever[axis]) * G0 / (1 / a.isp + 1 / b.isp);
    const sign = lever[axis] > 0 ? positive : negative;
    sign[axis] = Math.min(sign[axis], efficiency);
  }
  return v3(...AXES.map(axis => Number.isFinite(positive[axis]) && Number.isFinite(negative[axis])
    ? Math.min(positive[axis], negative[axis]) : 0) as [number, number, number]);
}

export interface CoastPointingInput {
  requestedRatesBody: Vec3;
  omegaBody: Vec3;
  inertiaBody: Mat3;
  remainingGasKg: number;
  jets: readonly RcsThrusterSpec[];
  /** Additional untouched gas fraction, after accounting for current braking. */
  reserveFraction?: number;
}
export interface CoastPointingBudget {
  ratesBody: Vec3;
  scale: number;
  efficiencyNmSPerKg: Vec3;
  /** Infinity means current momentum requires a missing couple axis. */
  brakingFuelKg: number;
  /** Gas for one leg at the requested angular momentum, before rate scaling. */
  requestedFuelKg: number;
  availableManeuverFuelKg: number;
  insufficientBraking: boolean;
  limited: boolean;
}

function impulseCost(momentum: Vec3, efficiency: Vec3): number {
  let gas = 0;
  for (const axis of AXES) {
    if (momentum[axis] === 0) continue;
    if (!(efficiency[axis] > 0)) return Infinity;
    gas += Math.abs(momentum[axis]) / efficiency[axis];
  }
  return gas;
}

/** Approximate local maneuver budget, not a guarantee against arbitrary
 * disturbances, fast changing inertia, or arbitrary rotating-frame coupling.
 * Intended for engine-off automatic coast pointing with fixed/slow inertia.
 * Full Iω retains products of inertia; all axes share one gas inventory:
 *   current braking = Σ |(Iω)i|/ηi
 *   usable maneuver gas = max(0, (1-reserve)*gas - current braking)
 *   2 Σ |(Iωcmd)i|/ηi <= usable maneuver gas
 * The factor two reserves acceleration and subsequent braking. The allocator
 * must still honor real jets/duty/fuel; this helper neither supplies a hidden
 * moment nor declares the vehicle recovered when the gas is insufficient.
 * Until a directional underactuated planner exists, a missing axis suppresses
 * all new slew rates conservatively. Existing measured rotation is untouched. */
export function fuelAwareCoastRates(input: CoastPointingInput): CoastPointingBudget {
  const reserve = input.reserveFraction ?? 0.2;
  if (!finiteVector(input.requestedRatesBody) || !finiteVector(input.omegaBody)
    || !Number.isFinite(input.remainingGasKg) || input.remainingGasKg < 0
    || !Number.isFinite(reserve) || reserve < 0 || reserve > 1) throw new RangeError('Invalid coast-pointing budget');
  assertSPD(input.inertiaBody);
  const efficiency = rcsImpulseEfficiencies(input.jets);
  const brakingFuelKg = impulseCost(matVecMul(input.inertiaBody, input.omegaBody), efficiency);
  const requestedFuelKg = impulseCost(matVecMul(input.inertiaBody, input.requestedRatesBody), efficiency);
  const availableManeuverFuelKg = Math.max(0, (1 - reserve) * input.remainingGasKg - brakingFuelKg);
  let factor = requestedFuelKg === 0 ? 1 : Number.isFinite(requestedFuelKg)
    ? Math.min(1, availableManeuverFuelKg / (2 * requestedFuelKg)) : 0;
  if (AXES.some(axis => !(efficiency[axis] > 0))) factor = 0;
  return { ratesBody: scale(input.requestedRatesBody, factor), scale: factor, efficiencyNmSPerKg: efficiency,
    brakingFuelKg, requestedFuelKg, availableManeuverFuelKg,
    insufficientBraking: brakingFuelKg > input.remainingGasKg,
    limited: factor < 1 && norm(input.requestedRatesBody) > 0 };
}
