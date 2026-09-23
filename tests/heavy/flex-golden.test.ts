import { describe, expect, it } from 'vitest';
import { flightFingerprint, GOLDEN, GOLDEN_FLIGHTS } from '../flex-golden-harness';

// The whole mission, to the target orbit, recorded before roadmap P05.
describe('six-DOF missions without the flexible-body options', () => {
  it.each(GOLDEN_FLIGHTS.map((f) => [f.vehicle, f] as const))('%s flies its mission exactly as recorded', (_id, flight) => {
    expect(flightFingerprint(flight, 30 * 3600)).toBe(GOLDEN[flight.vehicle].mission);
  }, 600_000);
});
