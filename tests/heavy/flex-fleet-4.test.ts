import { describe, expect, it } from 'vitest';
import { FULL_FLEX, flexibleFleet, flyFlexible } from './flex-matrix';
import { rigidMission } from '../rigid-harness';
import { achievedElements } from '../fleet-harness';

describe('flexible vehicles (roadmap P05): PSLV, Electron, Starship', () => {
  flexibleFleet(['pslvxl', 'electron', 'starship']);
});

describe('flexible Falcon 9 between integration steps', () => {
  // The control clock stays 0.01 s; halving the RK step inside it moves the
  // delivered orbit by metres, as it does for the rigid body.
  it('delivers the same orbit at 0.01 s and 0.005 s', () => {
    const cfg = { ...rigidMission('leo'), dynamics: { model: 'sixDof' as const, wind: 'crosswind' as const, seed: 20260919, flex: FULL_FLEX } };
    const coarse = flyFlexible(cfg, 10 * 3600, 0.01), fine = flyFlexible(cfg, 10 * 3600, 0.005);
    for (const flight of [coarse, fine]) expect(flight.sim.events.map((e) => e.key)).toContain('evt.targetOrbit');
    const a = achievedElements(coarse.sim), b = achievedElements(fine.sim);
    expect(Math.abs(a.apoapsisAlt - b.apoapsisAlt)).toBeLessThan(2000);
    expect(Math.abs(a.periapsisAlt - b.periapsisAlt)).toBeLessThan(2000);
    expect(Math.abs(coarse.maxDeflection - fine.maxDeflection)).toBeLessThan(0.1 * coarse.maxDeflection + 0.002);
  }, 3_600_000);
});
