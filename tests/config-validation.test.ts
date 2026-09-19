import { describe, expect, it } from 'vitest';
import { parseNumberField, parseUtcDateTime, validateConfigInput, guidanceLimits, type ConfigInput } from '../src/config/validation';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { ORBIT_PRESETS, orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE } from '../src/physics/defaults';

const mission = (): ConfigInput => ({
  vehicleId: 'falcon9', siteId: 'cape', satelliteId: 'cubesats',
  payloadMass: 1000, orbit: { ...orbitById('leo') },
  launchTime: new Date('2026-09-20T12:00:00Z'),
  guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
});

describe('numeric entry validation', () => {
  it.each(['', ' ', '\t'])('does not turn an empty field %j into zero', (raw) => {
    expect(parseNumberField(raw, 'setup.payloadMass', { min: 1 }).issue?.code).toBe('required');
  });
  it.each(['NaN', 'Infinity', '1e309', '0x10', '12kg', '1e'])('rejects malformed/non-finite entry %j', (raw) => {
    expect(parseNumberField(raw, 'setup.payloadMass').issue?.code).toBe('number');
  });
  it('keeps explicit zero and decimal/scientific notation when the field permits them', () => {
    expect(parseNumberField('0', 'setup.inclination', { min: 0, max: 180 })).toEqual({ value: 0, issue: null });
    expect(parseNumberField('1.5e3', 'setup.payloadMass', { min: 1 })).toEqual({ value: 1500, issue: null });
  });
  it('rejects guidance outside its displayed range without clamping', () => {
    const limits = guidanceLimits('maxTurnRate', vehicleById('falcon9'));
    expect(parseNumberField('-1', 'setup.maxTurnRate', limits).issue).toMatchObject({ code: 'minimum', limit: 0.1 });
    expect(parseNumberField('4', 'setup.maxTurnRate', limits).issue).toMatchObject({ code: 'maximum', limit: 3 });
  });
  it('preserves a trusted vehicle programme outside the generic UI band', () => {
    const spec = { ...vehicleById('falcon9'), guidanceDefaults: { maxTurnRate: 0.05, pitchOverAltitude: 6000 } };
    expect(guidanceLimits('maxTurnRate', spec)).toEqual({ min: 0.05, max: 3 });
    expect(guidanceLimits('pitchOverAltitude', spec)).toEqual({ min: 20, max: 6000 });
  });
});

describe('UTC date-time validation', () => {
  it.each(['', '2026-02-30T12:00', '2026-13-01T12:00', '2026-01-01T24:00', '2026-01-01T00:60', '09/20/2026', '2026-01-01T00:00+25:00'])('rejects %j without Date normalization', (raw) => {
    expect(parseUtcDateTime(raw)).toBeNull();
  });
  it('treats the UI wall clock as UTC and preserves real leap days', () => {
    expect(parseUtcDateTime('2028-02-29T12:34')?.toISOString()).toBe('2028-02-29T12:34:00.000Z');
    expect(parseUtcDateTime('2026-02-29T12:34')).toBeNull();
  });
  it('requires a timezone for API date-times', () => {
    expect(parseUtcDateTime('2026-09-20T12:00', true)).toBeNull();
    expect(parseUtcDateTime('2026-09-20T12:00:00+03:00', true)?.toISOString()).toBe('2026-09-20T09:00:00.000Z');
  });
});

describe('configuration validity versus mission feasibility', () => {
  it('keeps every shipped vehicle/orbit preset structurally valid', () => {
    for (const vehicle of VEHICLES) for (const orbit of ORBIT_PRESETS) {
      const state = { ...mission(), vehicleId: vehicle.id, siteId: vehicle.sites[0], orbit: { ...orbit } };
      expect(validateConfigInput(state), `${vehicle.id}/${orbit.id}`).toEqual([]);
    }
  });
  it('allows an overweight and unreachable experiment to reach the feasibility verdict', () => {
    const state = mission();
    state.payloadMass = 1_000_000;
    state.orbit.inclination = 5;
    expect(validateConfigInput(state)).toEqual([]);
  });
  it('rejects a malformed cross-field orbit and recovers after the paired field is fixed', () => {
    const state = mission();
    state.orbit.perigee = 600000;
    expect(validateConfigInput(state).map((i) => i.field)).toEqual(['setup.perigee', 'setup.apogee']);
    state.orbit.apogee = 700000;
    expect(validateConfigInput(state)).toEqual([]);
  });
  it('catches non-finite converted heights, wrong dates, failure stages, and raw override bypasses', () => {
    const state = mission();
    state.orbit.apogee = Infinity;
    state.launchTime = new Date(NaN);
    state.failure.stage = 0.5;
    state.guidanceOverrides.maxTurnRate = -1;
    expect(validateConfigInput(state).map((i) => i.field)).toEqual(['setup.apogee', 'setup.launchTime', 'setup.maxTurnRate', 'setup.failureStage']);
  });
});
