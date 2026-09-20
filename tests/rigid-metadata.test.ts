import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { RIGID_MODEL_VERSION } from '../src/physics/rigid/config';
import { RIGID_DATA_REVISION } from '../src/physics/rigid/vehicle-data';
import { cloneRigidTelemetry, interpolateRigidTelemetry, sameRigidConfiguration } from '../src/physics/rigid/telemetry';
import { quatFromAxisAngle } from '../src/physics/rigid/math';
import { v3 } from '../src/physics/vec3';
import { AttitudeTrack } from '../src/replay/attitude-track';
import { buildTelemetryCsv } from '../src/ui/csv';
import { rigidMission } from './rigid-harness';

function mission(wind: 'calm' | 'shear' = 'shear', integrationStepS = 0.005) {
  const cfg = rigidMission();
  cfg.dynamics = { model: 'sixDof', wind, seed: 4294967295 };
  return new Simulation(cfg, { headless: true, rigidOptions: { integrationStepS, derivativeStepS: 0.0005, massFlowModel: 'reducedFlux' } });
}

/** Read CSV independently, including embedded JSON fields. */
function fields(row: string): string[] {
  const result: string[] = [];
  let field = '', quoted = false;
  for (let i = 0; i < row.length; i++) {
    if (row[i] === '"') {
      if (quoted && row[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted;
    } else if (row[i] === ',' && !quoted) { result.push(field); field = ''; } else field += row[i];
  }
  result.push(field);
  return result;
}

describe('recorded six-DOF provenance', () => {
  it('captures the actual model, vehicle data, wind override and effective RK ceiling', () => {
    const sim = mission(), runtime = sim.rigidRuntime!, recorded = sim.state.rigid!;
    expect(recorded).toMatchObject({ modelVersion: RIGID_MODEL_VERSION, dataRevision: RIGID_DATA_REVISION,
      massFlowModel: 'reducedFlux', integrationMaxStepS: 0.005, flowDerivativeMaxStepS: 0.0005,
      windProfile: { kind: 'shear', seed: 4294967295 } });
    expect(recorded.windProfile).toEqual(runtime.wind);
    runtime.wind.velocityENU!.x = 10; // Same override path used by sensitivity runs.
    runtime.wind.seed = 123;
    const next = runtime.telemetry({ r: sim.state.r, v: sim.state.v,
      attitudeQ: recorded.attitudeQ, omegaBody: recorded.omegaBody }, sim.state.t, runtime.snapshot!);
    expect(next.windProfile).toEqual(runtime.wind);
    expect(next.windProfile!.velocityENU!.x).toBe(10);
    expect(next.windProfile!.seed).toBe(123);
    expect(recorded.windProfile!.velocityENU!.x).toBe(8);
    expect(recorded.windProfile!.seed).toBe(4294967295);
    const calm = mission('calm', 0.02).state.rigid!;
    expect(calm.integrationMaxStepS).toBe(0.01); // Runtime caps RK substeps independently of the requested maximum.
    expect(calm.windProfile).toMatchObject({ kind: 'calm', seed: 4294967295 });
  });

  it('isolates every nested weather value in cloned and interpolated recordings', () => {
    const original = mission().state.rigid!;
    const baseline = cloneRigidTelemetry(original)!;
    for (const copy of [cloneRigidTelemetry(original)!, interpolateRigidTelemetry(original, original, 0.5)!]) {
      copy.windProfile!.velocityENU!.x = 999;
      copy.windProfile!.shearPerMeterENU!.y = 999;
      copy.windProfile!.gustAmplitudeENU!.z = 999;
      (copy.windProfile!.altitudeRangeM as [number, number])[1] = 999;
      copy.windProfile!.seed = 999;
      expect(original).toEqual(baseline);
    }
  });

  it('does not interpolate attitude or geometry across a vehicle data revision', () => {
    const a = mission().state.rigid!, b = cloneRigidTelemetry(a)!;
    b.dataRevision = 'a-new-vehicle-data-revision';
    b.attitudeQ = quatFromAxisAngle(v3(1, 0, 0), 1);
    b.cgBody.x += 10;
    expect(sameRigidConfiguration(a, b)).toBe(false);
    expect(interpolateRigidTelemetry(a, b, 0.5)).toEqual(a);
    expect(interpolateRigidTelemetry(a, b, 1)).toEqual(b);
    expect(sameRigidConfiguration({ ...a, dataRevision: undefined }, b)).toBe(false);
    const track = new AttitudeTrack();
    track.record(0, a); track.record(0.01, a); track.record(0.02, b);
    expect(track.at(0.015, a)!.attitudeQ).toEqual(a.attitudeQ);
    expect(track.at(0.02, a)).toBeUndefined();
    expect(track.at(0.02, b)!.attitudeQ).toEqual(b.attitudeQ);
  });

  it('exports per-sample provenance and complete wind parameters instead of the current runtime settings', () => {
    const sim = mission(), recorded = cloneRigidTelemetry(sim.state.rigid)!;
    const sample = sim.telemetry[0];
    expect(sample).toBeDefined();
    const exported = { telemetry: [{ ...sample, rigid: recorded }], events: [] };
    sim.rigidRuntime!.wind.seed = 7;
    sim.rigidRuntime!.wind.velocityENU!.x = 25;
    const lines = buildTelemetryCsv(exported).split('\n'), names = fields(lines[0]), values = fields(lines[1]);
    const value = (name: string) => values[names.indexOf(name)];
    expect(values).toHaveLength(names.length);
    expect(value('recording_schema_version')).toBe('3');
    expect(value('rigid_model_version')).toBe(RIGID_MODEL_VERSION);
    expect(value('rigid_data_revision')).toBe(RIGID_DATA_REVISION);
    expect(value('rigid_mass_flow_model')).toBe('reducedFlux');
    expect(value('rigid_wind_seed')).toBe('4294967295');
    expect(JSON.parse(value('rigid_wind_profile_json'))).toEqual(JSON.parse(JSON.stringify(recorded.windProfile)));
    expect(Number(value('rigid_integration_max_step_s'))).toBe(0.005);
    expect(Number(value('rigid_flow_derivative_max_step_s'))).toBe(0.0005);
    for (const axis of ['x', 'y', 'z'] as const) expect(Number(value(`wind_eci_${axis}_ms`))).toBeCloseTo(recorded.windECI[axis], 8);
    expect(recorded.windProfile!.velocityENU!.x).toBe(8);
  });
});
