/**
 * The mission panel's landing choices (SetupPanel#recoveryChoices): what each
 * recovered stage can be flown to from its site, and the recovery plan the
 * choices make. Rendering is covered by the browser run; this drives the
 * section's own change callbacks.
 */
import { describe, expect, it, vi } from 'vitest';
import { SetupPanel } from '../src/ui/panel';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { validateConfigInput } from '../src/config/validation';
import { DEFAULT_FAILURE } from '../src/physics/defaults';
import type { RecoveryPlan, VehicleSpec } from '../src/types';

interface Choice { options: { value: string; label: string }[]; value: string; change: (v: string) => void }

function choices(vehicleId: string, siteId: string, recoveryPlan?: RecoveryPlan) {
  const selects: Choice[] = [];
  const element = () => ({ appendChild: () => undefined });
  const panel = Object.create(SetupPanel.prototype) as {
    state: { vehicleId: string; siteId: string; boosterRecovery: boolean; recoveryPlan?: RecoveryPlan };
    el: typeof element; changed: () => void;
    select: (key: string, options: Choice['options'], value: string, change: (v: string) => void) => unknown;
    recoveryChoices: (vehicle: VehicleSpec) => unknown;
  };
  panel.state = { vehicleId, siteId, boosterRecovery: true, recoveryPlan };
  panel.el = element;
  panel.changed = vi.fn();
  panel.select = (_key, options, value, change) => { selects.push({ options, value, change }); return element(); };
  panel.recoveryChoices(vehicleById(vehicleId));
  return { panel, selects, values: (i: number) => selects[i].options.map((o) => o.value) };
}

const valid = (vehicleId: string, siteId: string, recoveryPlan?: RecoveryPlan) => validateConfigInput({
  vehicleId, siteId, satelliteId: 'comsat', payloadMass: 1000, orbit: { ...orbitById('leo') }, launchTime: new Date('2026-09-24T15:00:00Z'),
  guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: true, recoveryPlan,
});

describe('landing choices on the mission panel', () => {
  it('offers a Falcon 9 the sea, a drone ship and the site\'s landing zones, and makes no plan until one is picked', () => {
    const { panel, selects, values } = choices('falcon9', 'ksc39a');
    expect(selects).toHaveLength(1);
    expect(values(0)).toEqual(['downrange', 'droneShip', 'zone:lz1', 'zone:lz2', 'expended']);
    expect(selects[0].value).toBe('downrange');
    selects[0].change('zone:lz1');
    expect(panel.state.recoveryPlan).toEqual({ core: { kind: 'landingZone', zoneId: 'lz1' } });
    expect(valid('falcon9', 'ksc39a', panel.state.recoveryPlan)).toEqual([]);
    selects[0].change('downrange');
    expect(panel.state.recoveryPlan).toBeUndefined();
    // Vandenberg has no landing zone in the data
    expect(choices('falcon9', 'vandenberg').values(0)).toEqual(['downrange', 'droneShip', 'expended']);
  });

  it('gives each of Falcon Heavy\'s side boosters its own choice', () => {
    const { panel, selects } = choices('falconheavy', 'cape');
    expect(selects).toHaveLength(3);
    selects[1].change('zone:lz1');
    selects[2].change('zone:lz2');
    selects[0].change('droneShip');
    expect(panel.state.recoveryPlan).toEqual({
      core: { kind: 'droneShip' }, boosters: [{ kind: 'landingZone', zoneId: 'lz1' }, { kind: 'landingZone', zoneId: 'lz2' }],
    });
    expect(valid('falconheavy', 'cape', panel.state.recoveryPlan)).toEqual([]);
    // shown again, the choices read back from the plan
    const again = choices('falconheavy', 'cape', panel.state.recoveryPlan);
    expect(again.selects.map((s) => s.value)).toEqual(['droneShip', 'zone:lz1', 'zone:lz2']);
  });

  it('offers Super Heavy, which has no legs, the tower\'s arms instead of a pad or a ship', () => {
    const { panel, selects, values } = choices('starship', 'starbase');
    expect(values(0)).toEqual(['downrange', 'zone:olm', 'expended']);
    selects[0].change('zone:olm');
    expect(valid('starship', 'starbase', panel.state.recoveryPlan)).toEqual([]);
    selects[0].change('expended');
    expect(panel.state.recoveryPlan).toEqual({ core: { kind: 'expended' } });
  });
});
