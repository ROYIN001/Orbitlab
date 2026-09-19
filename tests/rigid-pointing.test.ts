import { describe, expect, it } from 'vitest';
import { fuelAwareCoastRates, rcsImpulseEfficiencies } from '../src/physics/rigid/pointing';
import type { RcsThrusterSpec } from '../src/physics/rigid/actuators';
import { G0 } from '../src/physics/constants';
import { add, scale, v3, type Vec3 } from '../src/physics/vec3';
import type { Mat3 } from '../src/physics/rigid/math';

function jets(): RcsThrusterSpec[] {
  const result: RcsThrusterSpec[] = [];
  const couple = (name: string, a: Vec3, b: Vec3, direction: Vec3) => {
    for (const sign of [1, -1]) for (const [index, point, multiplier] of [[0, a, sign], [1, b, -sign]] as const) {
      result.push({ id: `${name}-${sign}-${index}`, positionBody: point, directionBody: scale(direction, multiplier), maxThrust: 50, isp: 60 });
    }
  };
  couple('roll', v3(0, 2, 0), v3(0, -2, 0), v3(0, 0, 1));
  couple('pitch', v3(5, 0, 0), v3(-5, 0, 0), v3(0, 0, 1));
  couple('yaw', v3(5, 0, 0), v3(-5, 0, 0), v3(0, 1, 0));
  return result;
}
const inertia: Mat3 = [10, 2, 0, 2, 20, 3, 0, 3, 30];

describe('finite-gas coast rate planning', () => {
  it('derives real balanced-couple impulse efficiency and is independent of structural datum/thrust scale', () => {
    const expected = v3(2 * 60 * G0, 5 * 60 * G0, 5 * 60 * G0);
    expect(rcsImpulseEfficiencies(jets())).toEqual(expected);
    const moved = jets().map((jet, i) => ({ ...jet, positionBody: add(jet.positionBody, v3(20, -8, 4)), maxThrust: i % 2 ? 25 : 100 }));
    expect(rcsImpulseEfficiencies(moved)).toEqual(expected);
  });

  it('accounts for both unequal specific impulses instead of spending one jet of a pair for free', () => {
    const hardware = jets().filter(jet => jet.id.startsWith('pitch')).map(jet => ({ ...jet, isp: jet.id.endsWith('-0') ? 60 : 120 }));
    const efficiency = rcsImpulseEfficiencies(hardware);
    expect(efficiency.y).toBeCloseTo(10 * G0 / (1 / 60 + 1 / 120), 12);
    expect(efficiency.x).toBe(0); expect(efficiency.z).toBe(0);
  });

  it('shares one gas pool across all axes, reserves current braking, and retains full inertia products', () => {
    const input = { requestedRatesBody: v3(0.8, 0.1, -0.2), omegaBody: v3(0.1, -0.2, 0.3),
      inertiaBody: inertia, jets: jets(), remainingGasKg: 0.025 };
    const before = structuredClone(input), result = fuelAwareCoastRates(input);
    // Independently multiplied full tensor: Iω=(0.6,-2.9,8.4), Iωcmd=(8.2,3,-5.7).
    const etaRoll = 120 * G0, etaTransverse = 300 * G0;
    const brake = 0.6 / etaRoll + (2.9 + 8.4) / etaTransverse;
    const requested = 8.2 / etaRoll + (3 + 5.7) / etaTransverse;
    const factor = (0.8 * 0.025 - brake) / (2 * requested);
    expect(result.brakingFuelKg).toBeCloseTo(brake, 14); expect(result.requestedFuelKg).toBeCloseTo(requested, 14);
    expect(result.scale).toBeCloseTo(factor, 14); expect(result.ratesBody.x).toBeCloseTo(0.8 * factor, 14);
    expect(result.ratesBody.y).toBeCloseTo(0.1 * factor, 14); expect(result.ratesBody.z).toBeCloseTo(-0.2 * factor, 14);
    expect(brake + 2 * requested * result.scale + 0.2 * input.remainingGasKg).toBeCloseTo(input.remainingGasKg, 14);
    expect(result.limited).toBe(true); expect(result.insufficientBraking).toBe(false); expect(input).toEqual(before);
  });

  it('leaves affordable commands unchanged and reduces new rate requests before spending the braking reserve', () => {
    const base = { requestedRatesBody: v3(0.01, 0.02, 0.03), omegaBody: v3(), inertiaBody: inertia, jets: jets(), remainingGasKg: 10 };
    expect(fuelAwareCoastRates(base).ratesBody).toEqual(base.requestedRatesBody);
    const exhausted = fuelAwareCoastRates({ ...base, remainingGasKg: 0, omegaBody: v3(0.1, 0, 0) });
    expect(exhausted.ratesBody).toEqual(v3()); expect(exhausted.insufficientBraking).toBe(true);
    const dryIdle = fuelAwareCoastRates({ ...base, requestedRatesBody: v3(), remainingGasKg: 0 });
    expect(dryIdle.ratesBody).toEqual(v3()); expect(dryIdle.insufficientBraking).toBe(false);
  });

  it('never invents a missing torque sign or a centered-jet roll couple', () => {
    const oneDirection = jets().filter(jet => !jet.id.startsWith('roll--1'));
    expect(rcsImpulseEfficiencies(oneDirection).x).toBe(0);
    const result = fuelAwareCoastRates({ requestedRatesBody: v3(0.01, 0, 0), omegaBody: v3(0.1, 0, 0),
      inertiaBody: inertia, remainingGasKg: 100, jets: oneDirection });
    expect(result.ratesBody).toEqual(v3()); expect(result.brakingFuelKg).toBe(Infinity); expect(result.insufficientBraking).toBe(true);
    const centered = jets().map(jet => ({ ...jet, positionBody: v3() }));
    expect(rcsImpulseEfficiencies(centered)).toEqual(v3());
  });

  it('rejects invalid inventory, inertia, rates, reserve and jet data before producing commands', () => {
    const base = { requestedRatesBody: v3(), omegaBody: v3(), inertiaBody: inertia, remainingGasKg: 10, jets: jets() };
    for (const patch of [{ remainingGasKg: -1 }, { remainingGasKg: NaN }, { reserveFraction: 1.1 },
      { requestedRatesBody: v3(Infinity, 0, 0) }, { inertiaBody: [0, 0, 0, 0, 0, 0, 0, 0, 0] as Mat3 }]) {
      expect(() => fuelAwareCoastRates({ ...base, ...patch })).toThrow();
    }
    expect(() => rcsImpulseEfficiencies([{ ...jets()[0], isp: 0 }])).toThrow();
  });
});
