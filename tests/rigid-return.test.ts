/**
 * Falcon 9's first stage flown back to Landing Zone 1 as a rigid body: it
 * turns round on its centre engine, boosts back on three, flies its entry
 * burn, steers on its grid fins through the air and diverts onto the pad in
 * its landing burn — Bandwagon-1's profile. It has to land on the pad through
 * the same strict contact gate as the downrange recovery
 * (tests/rigid-recovery.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { flyWithReturns } from './return-harness';
import { orbitById } from '../src/data/orbits';
import { landingZoneById } from '../src/data/landing-zones';

describe('six-DOF return to the launch site', () => {
  it('lands Falcon 9 on Landing Zone 1', { timeout: 600_000 }, () => {
    const sim = flyWithReturns({ vehicleId: 'falcon9', payload: 1300, model: 'sixDof',
      orbit: { ...orbitById('custom'), perigee: 590e3, apogee: 590e3, inclination: 45.4 },
      plan: { core: { kind: 'landingZone', zoneId: 'lz1' } } });
    const stage = sim.debris.find((d) => d.recovery)!;
    const landing = sim.events.find((e) => e.key === 'evt.boosterLandedZone');
    expect(stage.outcome).toBe('landed');
    expect(landing?.params?.zone).toBe('LZ-1');
    expect(stage.recovery!.missDistance!).toBeLessThan(landingZoneById('lz1').radius);
    expect(Math.abs(Number(landing!.params!.verticalSpeed))).toBeLessThanOrEqual(5);
    expect(Number(landing!.params!.horizontalSpeed)).toBeLessThanOrEqual(3);
    expect(Number(landing!.params!.tiltDeg)).toBeLessThanOrEqual(10);
    for (const key of ['evt.boostbackStart', 'evt.boostbackEnd', 'evt.entryBurnStart', 'evt.landingBurnStart']) {
      expect(sim.events.some((e) => e.key === key)).toBe(true);
    }
    // It flew the grid fins through the air and put them to work.
    expect(stage.rigid?.surfaceDeflections).toBeDefined();
  });

  it('catches Super Heavy on the arms of the Starbase tower', { timeout: 600_000 }, () => {
    const sim = flyWithReturns({ vehicleId: 'starship', siteId: 'starbase', payload: 15600, model: 'sixDof',
      orbit: orbitById('leo'), plan: { core: { kind: 'landingZone', zoneId: 'olm' } }, tMax: 800 });
    const booster = sim.debris.find((d) => d.recovery)!;
    const caught = sim.events.find((e) => e.key === 'evt.boosterCaught');
    expect(caught).toBeDefined();
    expect(booster.recovery!.caught).toBe(true);
    expect(booster.recovery!.missDistance!).toBeLessThan(landingZoneById('olm').radius);
    expect(Number(caught!.params!.tiltDeg)).toBeLessThanOrEqual(5);
    expect(Math.abs(Number(caught!.params!.verticalSpeed))).toBeLessThanOrEqual(3);
    expect(Number(caught!.params!.horizontalSpeed)).toBeLessThanOrEqual(2);
  });
});
