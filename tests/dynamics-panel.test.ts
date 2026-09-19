import { describe, expect, it, vi } from 'vitest';
import { SetupPanel } from '../src/ui/panel';
import type { DynamicsConfig } from '../src/types';
import { defaultDynamics } from '../src/physics/rigid/config';
import { DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { Simulation } from '../src/physics/simulation';
import { rigidMission } from './rigid-harness';
import { vehicleById } from '../src/data/vehicles';

/** Exercise the production section's model-change callback independently from
 * expensive mission preview and DOM layout. Browser smoke covers rendering. */
function dynamicsSection(dynamics: DynamicsConfig) {
  let selectModel: (value: string) => void = () => { throw new Error('Model control was not built'); };
  const element = () => ({ dataset: {}, append: (..._children: unknown[]) => {} });
  const panel = Object.create(SetupPanel.prototype) as {
    state: { vehicleId: string; dynamics: DynamicsConfig };
    el: typeof element; select: (key: string, choices: unknown[], value: string, change: (value: string) => void) => unknown;
    number: (...args: unknown[]) => unknown; render: () => void; changed: () => void; dynamicsSection: () => void;
  };
  panel.state = { vehicleId: 'falcon9', dynamics };
  panel.el = element;
  panel.select = (key, _choices, _value, change) => { if (key === 'setup.dynamics.model') selectModel = change; return element(); };
  panel.number = element; panel.render = vi.fn(); panel.changed = vi.fn();
  panel.dynamicsSection();
  return { panel, selectModel: (value: string) => selectModel(value) };
}

describe('flight model changes', () => {
  it('shows and flies the same model-specific defaults while retaining explicit edits', () => {
    const panel = Object.create(SetupPanel.prototype) as SetupPanel;
    const cfg = rigidMission('iss');
    panel.state = { vehicleId: cfg.vehicleId, dynamics: cfg.dynamics, guidanceOverrides: {} } as SetupPanel['state'];
    const untouched = new Simulation(cfg, { headless: true });
    expect(panel.guidance).toEqual(untouched.cfg.guidance);
    expect(panel.guidance).toMatchObject({ pitchOverAltitude: 50, kickAngle: 4, kickDuration: 12, maxTurnRate: 0.5 });
    panel.state.guidanceOverrides = { kickAngle: DEFAULT_GUIDANCE.kickAngle };
    const explicit = new Simulation({ ...cfg, guidance: panel.guidance, guidanceResolved: true }, { headless: true });
    expect(explicit.cfg.guidance.kickAngle).toBe(DEFAULT_GUIDANCE.kickAngle);
    panel.state.dynamics = { ...cfg.dynamics!, model: 'pointMass' };
    expect(panel.guidance).toEqual({ ...guidanceForVehicle(vehicleById(cfg.vehicleId)), kickAngle: DEFAULT_GUIDANCE.kickAngle });
    panel.state.guidanceOverrides = {};
    const legacy = new Simulation({ ...cfg, dynamics: panel.state.dynamics }, { headless: true });
    expect(legacy.cfg.guidance).toEqual(panel.guidance);
  });

  it.each([
    ['crosswind', 123], ['shear', 0], ['calm', 0xffffffff],
  ] as const)('retains valid %s wind and seed %s through legacy and back', (wind, seed) => {
    const original = { model: 'sixDof' as const, wind, seed };
    const { panel, selectModel } = dynamicsSection(original);
    selectModel('pointMass');
    expect(panel.state.dynamics).toEqual({ model: 'pointMass', wind, seed });
    selectModel('sixDof');
    expect(panel.state.dynamics).toEqual(original);
    expect(original.model).toBe('sixDof');
  });

  it.each([-1, NaN, Infinity, 1.5, 0x100000000])('repairs only an invalid hidden seed %s when entering legacy', seed => {
    const { panel, selectModel } = dynamicsSection({ model: 'sixDof', wind: 'shear', seed });
    selectModel('pointMass');
    expect(panel.state.dynamics).toEqual({ model: 'pointMass', wind: 'shear', seed: defaultDynamics('falcon9').seed });
    expect(panel.render).toHaveBeenCalledOnce(); expect(panel.changed).toHaveBeenCalledOnce();
  });

  it('repairs an invalid hidden wind selection while preserving a valid seed', () => {
    const { panel, selectModel } = dynamicsSection({ model: 'sixDof', wind: 'invalid' as DynamicsConfig['wind'], seed: 123 });
    selectModel('pointMass');
    expect(panel.state.dynamics).toEqual({ model: 'pointMass', wind: 'calm', seed: 123 });
  });
});
