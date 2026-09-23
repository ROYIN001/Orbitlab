import { describe, expect, it } from 'vitest';
import { flightFingerprint, GOLDEN, GOLDEN_FLIGHTS } from './flex-golden-harness';

// Slosh, bending and the notch filter (roadmap P05) are off by default; off,
// the six-DOF flight is the one recorded before they existed, bit for bit.
describe('six-DOF flight without the flexible-body options', () => {
  it.each(GOLDEN_FLIGHTS.map((f) => [f.vehicle, f] as const))('%s flies its first 160 s exactly as recorded', async (_id, flight) => {
    expect(await flightFingerprint(flight, 160)).toBe(GOLDEN[flight.vehicle].first160s);
  }, 120_000);
  it('Falcon 9 flies the same with every option given and off', async () => {
    const off = { slosh: false, bending: false, notch: false, imuStation: 0.3, notchZetaZero: 0.1, bandwidthRatio: 3 };
    expect(await flightFingerprint(GOLDEN_FLIGHTS[0], 160, { model: 'sixDof', wind: 'crosswind', seed: 20260919, flex: off }))
      .toBe(GOLDEN.falcon9.first160s);
  }, 120_000);
});
