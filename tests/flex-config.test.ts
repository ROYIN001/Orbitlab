import { describe, expect, it } from 'vitest';
import { resolveFlexOptions, validFlexConfig, FLEX_DEFAULTS } from '../src/physics/rigid/flex';
import { validateDynamics } from '../src/physics/rigid/config';
import { validateConfigInput } from '../src/config/validation';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE } from '../src/physics/defaults';
import { buildTelemetryCsv } from '../src/ui/csv';
import type { Simulation } from '../src/physics/simulation';
import type { RigidTelemetry } from '../src/physics/rigid/telemetry';
import { cloneRigidTelemetry, interpolateRigidTelemetry } from '../src/physics/rigid/telemetry';

describe('flexible-body configuration (roadmap P05)', () => {
  it('is nothing to model unless an option is on', () => {
    expect(resolveFlexOptions(undefined)).toBeUndefined();
    expect(resolveFlexOptions({})).toBeUndefined();
    expect(resolveFlexOptions({ slosh: false, bending: false, notch: false, notchZetaZero: 0.2 })).toBeUndefined();
    expect(resolveFlexOptions({ notch: true })).toEqual({ slosh: false, bending: false, notch: true, ...FLEX_DEFAULTS });
    expect(resolveFlexOptions({ bending: true, imuStation: 0.25 })?.imuStation).toBe(0.25);
  });

  it('validates types and ranges, in the dynamics and in the mission', () => {
    expect(validFlexConfig({ slosh: true, notchZetaPole: 0.5 })).toBe(true);
    expect(validFlexConfig({ slosh: 1 })).toBe(false);
    expect(validFlexConfig({ imuStation: 1.2 })).toBe(false);
    expect(validFlexConfig([])).toBe(false);
    expect(validateDynamics({ model: 'sixDof', wind: 'calm', seed: 1, flex: { bending: true } }, 'falcon9')).toBe(true);
    expect(validateDynamics({ model: 'sixDof', wind: 'calm', seed: 1, flex: { bandwidthRatio: 1 } }, 'falcon9')).toBe(false);
    const mission = {
      vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbit: orbitById('leo'), launchTime: new Date(), payloadMass: 1000,
      guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    };
    expect(validateConfigInput({ ...mission, dynamics: { model: 'sixDof', wind: 'calm', seed: 1, flex: { notch: true, notchZetaPole: 0.3 } } })).toEqual([]);
    expect(validateConfigInput({ ...mission, dynamics: { model: 'sixDof', wind: 'calm', seed: 1, flex: { notchZetaPole: 0 } } }))
      .toEqual([{ field: 'setup.flex.notchZetaPole', code: 'minimum', limit: 0.05 }]);
  });
});

const flexTelemetry = (): RigidTelemetry => ({
  modelVersion: 'sixdof-1', attitudeQ: { w: 1, x: 0, y: 0, z: 0 }, omegaBody: { x: 0, y: 0, z: 0 }, cgBody: { x: 20, y: 0, z: 0 },
  inertiaBody: [1, 0, 0, 0, 2, 0, 0, 0, 2], renderOffsetBody: { x: -20, y: 0, z: 0 }, controlMode: 'auto', engineDeflections: {},
  rcsPropellantKg: 0, saturated: false, angleOfAttack: 0, sideslip: 0, aeroWithinEnvelope: true, windECI: { x: 0, y: 0, z: 0 }, rawQuaternionNormError: 0,
  flex: {
    slosh: { active: true, tanks: [{ id: 's1.fuel', stationX: 10, massKg: 5000, frequencyHz: 0.6, displacementM: 0.02 },
      { id: 's1.oxidizer', stationX: 30, massKg: 9000, frequencyHz: 0.6, displacementM: 0.05 }] },
    bending: { frequencyHz: 1.6, structuralFrequencyHz: 1.61, generalizedMassKg: 2e4, modal: { y: 0.01, z: -0.02 }, deflectionM: 0.0224,
      shapeX: [0, 10], shapeW: [1, -0.2], imuStationX: 56, imuSlope: 0.038, sensorErrorRad: 8.5e-4, loadRatio: 0.21, loadStationX: 1.2 },
    notch: { centerHz: 1.6, zetaZero: 0.02, zetaPole: 0.3, active: true },
  },
});

describe('flexible-body telemetry', () => {
  it('is deep-copied, and held (not blended) between two recorded frames', () => {
    const a = flexTelemetry(), b = flexTelemetry();
    b.flex!.bending!.modal.y = 1;
    const copy = cloneRigidTelemetry(a)!;
    copy.flex!.bending!.shapeW[0] = 9; copy.flex!.slosh!.tanks[0].displacementM = 9;
    expect(a.flex!.bending!.shapeW[0]).toBe(1);
    expect(a.flex!.slosh!.tanks[0].displacementM).toBe(0.02);
    expect(interpolateRigidTelemetry(a, b, 0.5)!.flex!.bending!.modal.y).toBe(0.01);
  });

  it('goes to CSV in its own columns only when a flight modelled it', () => {
    const sample = { t: 0, alt: 0, vInertial: 0, vAir: 0, q: 0, mach: 0, gLoad: 1, mass: 1, thrust: 0, throttle: 0, pitch: 90, ap: 0, pe: 0, inc: 0,
      dvRemaining: 0, downrange: 0, lat: 0, lon: 0, stage: 1, phase: 'ascent' };
    const rigidOnly = buildTelemetryCsv({ telemetry: [{ ...sample, rigid: { ...flexTelemetry(), flex: undefined } }], events: [] } as unknown as Simulation);
    expect(rigidOnly.split('\n')[0]).not.toContain('bending_frequency_hz');
    const csv = buildTelemetryCsv({ telemetry: [{ ...sample, rigid: flexTelemetry() }], events: [] } as unknown as Simulation).split('\n');
    const header = csv[0].split(','), row = csv[1].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    const at = (name: string) => row[header.indexOf(name)];
    expect(at('slosh_active')).toBe('true');
    expect(Number(at('slosh_max_displacement_m'))).toBe(0.05);
    expect(Number(at('bending_frequency_hz'))).toBe(1.6);
    expect(Number(at('shell_load_ratio'))).toBe(0.21);
    expect(Number(at('notch_center_hz'))).toBe(1.6);
  });
});
