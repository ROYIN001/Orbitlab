import { describe, expect, it, vi } from 'vitest';
import { SetupPanel } from '../src/ui/panel';
import type { DynamicsConfig, MissionConfig, VehicleSpec } from '../src/types';
import { defaultDynamics } from '../src/physics/rigid/config';
import { ALL_VEHICLES, vehicleById } from '../src/data/vehicles';
import { dispersedRunMission } from '../src/physics/monte-carlo';
import { DEFAULT_DISPERSIONS } from '../src/physics/dispersion';

/**
 * M-LAUNCH-032 (CO-4 step 8): ticking "Fly dispersed" on a mission that has no
 * dynamics yet takes the default flight model of the mission's own vehicle, as
 * the setup's other `defaultDynamics(...)` fallbacks do
 * (`defaultDynamics(missionVehicle(state))`). It took it from the vehicle id,
 * which for a custom vehicle is not in the catalogue and so gave point-mass:
 * run n flown alone was then not run n of the set the Monte Carlo window
 * flies, which is six-DOF (P08).
 *
 * The production section is built with its DOM stubbed; the checkbox's change
 * handler is the only control used.
 */
function dispersedSection(state: { vehicleId: string; vehicleSpec?: VehicleSpec; dynamics?: DynamicsConfig }) {
  let tick: () => void = () => { throw new Error('the dispersion checkbox was not built'); };
  const element = () => {
    const e: Record<string, unknown> = { dataset: {}, append: (..._children: unknown[]) => {}, checked: false };
    e.addEventListener = (type: string, change: () => void) => { if (type === 'change') tick = () => { e.checked = true; change(); }; };
    return e;
  };
  const panel = Object.create(SetupPanel.prototype) as { state: typeof state; el: typeof element; number: typeof element; render: () => void; changed: () => void; dispersedFlightSection: () => unknown };
  Object.assign(panel, { state, el: element, number: element, render: vi.fn(), changed: vi.fn() });
  panel.dispersedFlightSection();
  return { panel, tick: () => tick() };
}

const customFalcon = (): VehicleSpec => ({ ...structuredClone(vehicleById('falcon9')), id: 'my-falcon', name: 'My Falcon', derivedFrom: 'falcon9' });

describe('dispersed flight in the setup (M-LAUNCH-032)', () => {
  it('a custom vehicle restored without dynamics flies its own default model when dispersed', () => {
    const spec = customFalcon();
    expect(defaultDynamics(spec).model).toBe('sixDof');
    expect(defaultDynamics(spec.id).model).toBe('pointMass'); // what the id alone gives
    const state = { vehicleId: spec.id, vehicleSpec: spec, dynamics: undefined as DynamicsConfig | undefined };
    const { panel, tick } = dispersedSection(state);
    tick();
    expect(panel.state.dynamics).toEqual({ ...defaultDynamics(spec), dispersion: { seed: 1, run: 0 } });
  });

  it('the dispersed flight is the set\'s own run of that mission (P08)', () => {
    const spec = customFalcon();
    const state = { vehicleId: spec.id, vehicleSpec: spec, dynamics: undefined as DynamicsConfig | undefined };
    const { panel, tick } = dispersedSection(state);
    tick();
    // the Monte Carlo window's run 0 of a seed-1 set with the default dispersions, from the same mission
    const setRun = dispersedRunMission({ dynamics: undefined } as MissionConfig, { seed: 1, dispersions: DEFAULT_DISPERSIONS }, { index: 0, law: 'standard' });
    expect(panel.state.dynamics).toEqual(setRun.dynamics);
  });

  it('a mission restored without dynamics reaches the section with none', () => {
    const panel = Object.create(SetupPanel.prototype) as SetupPanel & Record<string, unknown>;
    Object.assign(panel, { state: { vehicleId: 'falcon9', dynamics: defaultDynamics('falcon9') }, running: false, cb: { onChange: vi.fn() }, cancelTune: vi.fn(), applyExternalEdit: vi.fn(), getConfig: vi.fn(), render: vi.fn(), changed: vi.fn() });
    panel.restoreMission({ vehicleId: 'my-falcon', vehicleSpec: customFalcon(), satelliteId: 'cubesats', guidanceOverrides: {}, launchTime: new Date(0) } as unknown as Parameters<SetupPanel['restoreMission']>[0]);
    expect(panel.state.dynamics).toBeUndefined();
  });

  it('every catalogue vehicle gets the same dynamics as before, byte for byte', () => {
    for (const v of ALL_VEHICLES) {
      const state = { vehicleId: v.id, dynamics: undefined as DynamicsConfig | undefined };
      const { panel, tick } = dispersedSection(state);
      tick();
      expect(JSON.stringify(panel.state.dynamics)).toBe(JSON.stringify({ ...defaultDynamics(v.id), dispersion: { seed: 1, run: 0 } }));
    }
  });
});
