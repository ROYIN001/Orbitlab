/**
 * A historical flight loaded into the setup panel and then edited (C01:
 * Vostok-1). The record of how it flew — the orbit its guidance was set for
 * (`OrbitSpec.aim`), the cut-off command that did not pass (`backupCutoff`),
 * the measure its figures are given in (`extremes`) and its return
 * (`deorbit`) — belongs to that flight: another vehicle, another payload or
 * any field of the orbit makes it a different flight, and the record goes
 * (`ownFlight`, src/config/validation.ts; WebMCP's edits in tests/mcp.test.ts).
 * Rendering is covered by the browser run; this drives the panel's handlers.
 */
import { describe, expect, it, vi } from 'vitest';
import { SetupPanel } from '../src/ui/panel';
import { watchMissionSettings } from '../src/ui/watch-missions';
import { validateConfigInput } from '../src/config/validation';
import { vehicleById } from '../src/data/vehicles';
import type { OrbitSpec } from '../src/types';

type State = ReturnType<typeof watchMissionSettings> & { orbitId: string };
interface Panel {
  state: State; siteReassigned: boolean;
  render: () => void; changed: () => void;
  pickVehicle: (v: string) => void; customise: () => void;
}

/** A panel with Vostok-1 loaded from the historical list, its drawing stubbed. */
function vostokPanel(): Panel {
  const panel = Object.create(SetupPanel.prototype) as Panel;
  const s = watchMissionSettings('vostok1');
  panel.state = { ...s, orbit: { ...s.orbit } } as State;
  panel.render = vi.fn();
  panel.changed = vi.fn();
  return panel;
}

const RECORD = ['aim', 'backupCutoff', 'extremes', 'deorbit'] as const;
const expectOwnFlight = (orbit: OrbitSpec, why: string) => {
  for (const key of RECORD) expect(orbit, `${why}: ${key}`).not.toHaveProperty(key);
};

describe('Vostok-1 edited on the setup panel', () => {
  it('keeps its record as loaded', () => {
    const panel = vostokPanel();
    expect(panel.state.orbit).toMatchObject({ aim: { apogee: 230e3 }, backupCutoff: { dv: 25.43 }, extremes: true, deorbit: { time: 4684.2 } });
  });

  it('flown on another rocket is that rocket\'s flight: not aimed at Vostok-K\'s 230 km, no over-burn, no return', () => {
    for (const vehicle of ['soyuz21a', 'falcon9']) {
      const panel = vostokPanel();
      panel.pickVehicle(vehicle);
      expect(panel.state.vehicleId).toBe(vehicle);
      // the payload gives way to the generic crew ship: Vostok rides Vostok-K only
      expect(panel.state.satelliteId).toBe('crew');
      expectOwnFlight(panel.state.orbit, vehicle);
      // the orbit itself, and its node, are what the panel shows and are kept
      expect(panel.state.orbit).toMatchObject({ perigee: 168e3, apogee: 314e3, inclination: 64.95, raanMode: 'fixed', raan: 326.653 });
      expect(validateConfigInput(panel.state)).toEqual([]);
    }
    // the same rocket picked again changes nothing
    const panel = vostokPanel();
    panel.state.vehicleSpec = vehicleById('vostokk');
    panel.pickVehicle('vostokk');
    expect(panel.state.orbit.backupCutoff).toEqual({ dv: 25.43 });
  });

  it('with any field of its orbit edited (`customise`, which every orbit field calls) is another flight too', () => {
    const panel = vostokPanel();
    panel.customise();
    panel.state.orbit.apogee = 250e3;
    expectOwnFlight(panel.state.orbit, 'apogee');
    expect(panel.state.orbit).toMatchObject({ perigee: 168e3, apogee: 250e3, raanMode: 'fixed', raan: 326.653 });
    expect(validateConfigInput(panel.state)).toEqual([]);
  });
});
