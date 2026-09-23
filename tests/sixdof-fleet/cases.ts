/**
 * The six-DOF fleet matrix: the accepted cases of the regular fleet test
 * (tests/fleet-harness.ts, `fleetCases`), flown as rigid bodies and judged by
 * the same `acceptanceFailures` — the target-orbit event, the orbit re-derived
 * from the raw state, the insertion clock. Split into files by vehicle so
 * vitest's workers share the two hours.
 */
import { expect, it } from 'vitest';
import { acceptanceFailures, caseKey, fleetCases, flyCase } from '../fleet-harness';

export function sixDofFleet(vehicles: readonly string[]): void {
  const cases = fleetCases().filter((c) => vehicles.includes(c.vehicle));
  it.each(cases.map((c) => [caseKey(c), c] as const))('%s reaches its target in six-DOF', (_key, c) => {
    const sim = flyCase(c, 'cubesats', { model: 'sixDof', wind: 'calm', seed: 20260919 });
    expect(acceptanceFailures(sim, c), JSON.stringify(sim.events.slice(-6).map((e) => e.key))).toEqual([]);
  });
}
