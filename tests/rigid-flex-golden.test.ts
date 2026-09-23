import { describe, expect, it } from 'vitest';
import { flightFingerprint, GOLDEN, GOLDEN_FLIGHTS } from './flex-golden-harness';

// Slosh, bending and the notch filter (roadmap P05) are off by default; off,
// the six-DOF flight is the one recorded before they existed, bit for bit.
describe('six-DOF flight without the flexible-body options', () => {
  it.each(GOLDEN_FLIGHTS.map((f) => [f.vehicle, f] as const))('%s flies its first 160 s exactly as recorded', (_id, flight) => {
    expect(flightFingerprint(flight, 160)).toBe(GOLDEN[flight.vehicle].first160s);
  }, 120_000);
});
