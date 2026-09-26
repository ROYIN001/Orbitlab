/**
 * Roadmap S02's acceptance, in six degrees of freedom: a deep copy of
 * falcon9 under an id of its own flies a recording identical to falcon9's, from
 * the pad to the end of the mission. A file of its own so the suite flies it
 * beside the other long flights (tests/custom-vehicle.test.ts has the rest).
 */
import { describe, expect, it } from 'vitest';
import { copyOf, fly, mission } from './custom-vehicle-harness';

describe('custom vehicles (S02): identical six-DOF flight', () => {
  it('flies a copy of falcon9 exactly as falcon9, six-DOF', () => {
    const original = fly(mission('falcon9', 'sixDof'), 7200);
    const copy = fly(mission('falcon9', 'sixDof', copyOf('falcon9')), 7200);
    expect(original.flight.done).toBe(true);
    expect(original.flight.status).not.toBe('failed');
    expect(copy.flight).toEqual(original.flight);
  }, 900_000);
});
