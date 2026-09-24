import { describe, expect, it } from 'vitest';
import { VEHICLES } from '../../src/data/vehicles';
import { acceptanceFailures, caseKey, fleetCases, flyCase } from '../fleet-harness';

/**
 * Each vehicle's reference case — its first accepted fleet row — flown in the
 * two declared wind scenarios, as Falcon 9 and Soyuz-2.1a were accepted
 * (docs/SIXDOF-ACCEPTANCE.md). The crosswind is 8 m/s east with repeatable
 * gusts, the shear adds 1 and 0.5 mm/s per metre up to 12 km.
 */
const reference = VEHICLES.map((v) => fleetCases().find((c) => c.vehicle === v.id)).filter((c) => c !== undefined);

describe('six-DOF reference cases in wind', () => {
  for (const wind of ['crosswind', 'shear'] as const) {
    it.each(reference.map((c) => [caseKey(c), c] as const))(`%s reaches its target in ${wind}`, (_key, c) => {
      const sim = flyCase(c, 'cubesats', { model: 'sixDof', wind, seed: 20260919 });
      expect(acceptanceFailures(sim, c), JSON.stringify(sim.events.slice(-6).map((e) => e.key))).toEqual([]);
    });
  }
});
