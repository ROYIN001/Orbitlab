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
  it('attributes malformed dynamics to the actual model, wind, and seed fields', () => {
    const state = mission();
    state.dynamics = { model: 'sixDof', wind: 'crosswind', seed: 123 };
    expect(validateConfigInput(state)).toEqual([]);
    state.dynamics.wind = 'unsupported' as typeof state.dynamics.wind;
    expect(validateConfigInput(state)).toEqual([{ field: 'setup.dynamics.wind', code: 'selection' }]);
    state.dynamics.wind = 'calm'; state.dynamics.model = 'unsupported' as typeof state.dynamics.model;
    expect(validateConfigInput(state)).toEqual([{ field: 'setup.dynamics.model', code: 'selection' }]);
    // Every vehicle has six-DOF data now (roadmap P01), Electron included.
    state.vehicleId = 'electron'; state.siteId = vehicleById('electron').sites[0]; state.dynamics.model = 'sixDof';
    expect(validateConfigInput(state)).toEqual([]);
  });
  it.each([
    [-1, 'minimum', 0], [0x100000000, 'maximum', 0xffffffff], [1.5, 'integer', undefined],
    [NaN, 'number', undefined], [Infinity, 'number', undefined],
  ])('reports seed %s at its own field in either model', (seed, code, limit) => {
    for (const model of ['pointMass', 'sixDof'] as const) {
      const state = mission(); state.dynamics = { model, wind: 'calm', seed: seed as number };
      expect(validateConfigInput(state)).toEqual([{ field: 'setup.dynamics.seed', code, ...(limit !== undefined ? { limit } : {}) }]);
    }
  });
  it('accepts both uint32 seed endpoints and rejects malformed dynamics containers without throwing', () => {
    const state = mission();
    for (const seed of [0, 0xffffffff]) {
      state.dynamics = { model: 'sixDof', wind: 'shear', seed };
      expect(validateConfigInput(state)).toEqual([]);
    }
    for (const invalid of [null, [], 'sixDof']) {
      state.dynamics = invalid as unknown as ConfigInput['dynamics'];
      expect(validateConfigInput(state)).toEqual([{ field: 'setup.dynamics.model', code: 'selection' }]);
    }
  });

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

describe('recovery plans and suborbital targets', () => {
  const recovered = (over: Partial<ConfigInput>): ConfigInput => ({ ...mission(), boosterRecovery: true, ...over });
  const field = (state: ConfigInput) => validateConfigInput(state).map((i) => `${i.field}:${i.code}`);

  it('flies a stage only to a place it can reach from its site, on the hardware that place needs', () => {
    expect(field(recovered({ recoveryPlan: { core: { kind: 'landingZone', zoneId: 'lz1' } } }))).toEqual([]);
    expect(field(recovered({ siteId: 'ksc39a', recoveryPlan: { core: { kind: 'droneShip' } } }))).toEqual([]);
    expect(field(recovered({ vehicleId: 'falconheavy', siteId: 'ksc39a', satelliteId: 'comsat', recoveryPlan: {
      core: { kind: 'droneShip' }, boosters: [{ kind: 'landingZone', zoneId: 'lz1' }, { kind: 'landingZone', zoneId: 'lz2' }],
    } }))).toEqual([]);
    expect(field(recovered({ vehicleId: 'starship', siteId: 'starbase', recoveryPlan: { core: { kind: 'landingZone', zoneId: 'olm' } } }))).toEqual([]);
    const bad = 'setup.boosterRecovery:selection';
    // no such zone; a zone of another site; Falcon 9 from Vandenberg has no LZ-1
    expect(field(recovered({ recoveryPlan: { core: { kind: 'landingZone', zoneId: 'lz9' } } }))).toEqual([bad]);
    expect(field(recovered({ recoveryPlan: { core: { kind: 'landingZone', zoneId: 'olm' } } }))).toEqual([bad]);
    expect(field(recovered({ siteId: 'vandenberg', recoveryPlan: { core: { kind: 'landingZone', zoneId: 'lz1' } } }))).toEqual([bad]);
    // Super Heavy has no legs for a ship's deck; Falcon Heavy has two strap-ons, not three
    expect(field(recovered({ vehicleId: 'starship', siteId: 'starbase', recoveryPlan: { core: { kind: 'droneShip' } } }))).toEqual([bad]);
    expect(field(recovered({ vehicleId: 'falconheavy', satelliteId: 'comsat', recoveryPlan: { boosters: [{ kind: 'droneShip' }, { kind: 'droneShip' }, { kind: 'droneShip' }] } }))).toEqual([bad]);
    // a vehicle that is not recovered at all
    expect(field({ ...mission(), vehicleId: 'soyuz21a', siteId: 'baikonur', recoveryPlan: { core: { kind: 'droneShip' } } })).toEqual([bad]);
  });

  it('takes a suborbital target from Starship only, with its perigee below the ground and no payload needed', () => {
    const flight5 = (over: Partial<ConfigInput> = {}): ConfigInput => ({
      ...mission(), vehicleId: 'starship', siteId: 'starbase', payloadMass: 0,
      orbit: { ...orbitById('custom'), perigee: -15e3, apogee: 213e3, inclination: 26.2, suborbital: true }, ...over,
    });
    expect(field(flight5())).toEqual([]);
    expect(field(flight5({ vehicleId: 'falcon9', siteId: 'cape' }))).toEqual(['setup.perigee:suborbital']);
    expect(field(flight5({ orbit: { ...flight5().orbit, perigee: 50e3 } }))).toEqual(['setup.perigee:maximum']);
    expect(field(flight5({ orbit: { ...flight5().orbit, perigee: -2000e3 } }))).toEqual(['setup.perigee:minimum']);
    // an orbit still needs its payload and a perigee above the air
    expect(field(flight5({ orbit: { ...orbitById('leo') } }))).toEqual(['setup.payloadMass:minimum']);
  });
});
