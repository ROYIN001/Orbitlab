/**
 * `buildTelemetryCsv`/`telemetryCsvFilename` (`src/ui/csv.ts`) — the flight
 * -data CSV format shared by `TelemetryPanel.exportCsv` and the WebMCP
 * `export_csv` tool. Pins the exact text (header, per-sample number
 * formatting, the trailing event section) and cross-checks that the WebMCP
 * tool's output is identical to the UI export, including retrospective events.
 */
import { describe, expect, it } from 'vitest';
import { buildTelemetryCsv, telemetryCsvFilename } from '../src/ui/csv';
import { createMcpTools, type McpAppHost, type WebMcpTool } from '../src/mcp';
import { vehicleById } from '../src/data/vehicles';
import { siteById } from '../src/data/sites';
import { satelliteById } from '../src/data/satellites';
import { orbitById } from '../src/data/orbits';
import { guidanceForVehicle, DEFAULT_FAILURE } from '../src/physics/defaults';
import type { Simulation, SimEvent, TelemetrySample } from '../src/physics/simulation';
import type { MissionConfig } from '../src/types';

// ────────────────────────────────────────────────────────────────── fakes

function makeConfig(): MissionConfig {
  const vehicleId = 'soyuz21a';
  return {
    vehicleId, satelliteId: 'crew', siteId: 'baikonur', orbit: { ...orbitById('iss') },
    launchTime: new Date('2026-09-20T12:00:00Z'),
    guidance: guidanceForVehicle(vehicleById(vehicleId)),
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: satelliteById('crew').mass,
  };
}

const EVENTS: SimEvent[] = [
  { t: 10.04, key: 'evt.liftoff', severity: 'info' },
  { t: 60.6, key: 'evt.maxQ', severity: 'info', params: { alt: 12000, q: '18000' } },
  { t: 155.2, key: 'evt.meco', severity: 'major' },
];

function makeSim(cfg: MissionConfig = makeConfig()): Simulation {
  const sample: TelemetrySample = {
    t: 0, alt: 0, vInertial: 0, vAir: 0, q: 0, mach: 0, gLoad: 1, mass: 310000, thrust: 0,
    throttle: 0, pitch: 90, ap: 0, pe: 0, inc: 51.6, dvRemaining: 9000, downrange: 0,
    lat: 45.965, lon: 63.305, stage: 0, phase: 'prelaunch',
  };
  return {
    cfg,
    vehicleSpec: vehicleById(cfg.vehicleId),
    site: siteById(cfg.siteId),
    satellite: satelliteById(cfg.satelliteId),
    telemetry: [sample, { ...sample, t: 1.5, alt: 40, vInertial: 12.3456789, phase: 'ascent' }],
    events: EVENTS,
  } as unknown as Simulation;
}

// ──────────────────────────────────────────────────────────────── tests

describe('buildTelemetryCsv', () => {
  it('starts with the exact header row', () => {
    const csv = buildTelemetryCsv(makeSim());
    const header = csv.split('\n')[0];
    expect(header).toBe('t_s,alt_m,v_inertial_ms,v_air_ms,q_pa,mach,g_load,mass_kg,thrust_n,throttle,pitch_deg,apoapsis_m,periapsis_m,inclination_deg,dv_remaining_ms,downrange_m,lat_deg,lon_deg,stage,phase');
  });

  it('writes one row per telemetry sample, in order, with integer/precision formatting and the phase string passed through', () => {
    const sim = makeSim();
    const lines = buildTelemetryCsv(sim).split('\n');
    // lines[0] is the header; two telemetry rows follow.
    expect(lines[1]).toBe('0,0,0,0,0,0,1,310000,0,0,90,0,0,51.60000,9000,0,45.96500,63.30500,0,prelaunch');
    expect(lines[2]).toBe('1.500000,40,12.34568,0,0,0,1,310000,0,0,90,0,0,51.60000,9000,0,45.96500,63.30500,0,ascent');
  });

  it('appends a blank line, "# events", the events header, then one line per event', () => {
    const sim = makeSim();
    const lines = buildTelemetryCsv(sim).split('\n');
    const tail = lines.slice(3);
    expect(tail[0]).toBe('');
    expect(tail[1]).toBe('# events');
    expect(tail[2]).toBe('t_s,event,details');
    expect(tail[3]).toBe('10.0,evt.liftoff,"{}"');
    expect(tail[4]).toBe('60.6,evt.maxQ,"{""alt"":12000,""q"":""18000""}"');
    expect(tail[5]).toBe('155.2,evt.meco,"{}"');
    expect(tail).toHaveLength(6);
  });

  it('exports retrospective events chronologically without changing the detection log', () => {
    const sim = { ...makeSim(), events: [
      { t: 60, key: 'evt.engineOut', severity: 'warn' },
      { t: 59, key: 'evt.maxQ', severity: 'info' },
    ] satisfies SimEvent[] };
    const csv = buildTelemetryCsv(sim);
    expect(csv.indexOf('59.0,evt.maxQ')).toBeLessThan(csv.indexOf('60.0,evt.engineOut'));
    expect(sim.events.map((e) => e.t)).toEqual([60, 59]);
  });

  it('retains the exact command clock and SI metadata for sub-tenth-second changes', () => {
    const params = { mode: 'manual', rollRateRadS: 0.01, pitchRateRadS: -0.02, yawRateRadS: 0.03, throttle: 0.6 };
    const sim = { ...makeSim(), events: [
      { t: 5.01, key: 'evt.controlCommand', severity: 'info', params },
      { t: 5.02, key: 'evt.controlCommand', severity: 'info', params: { ...params, throttle: 0.4 } },
    ] satisfies SimEvent[] };
    const rows = buildTelemetryCsv(sim).split('\n').filter(row => row.includes(',evt.controlCommand,'));
    expect(rows.map(row => Number(csvRow(row)[0]))).toEqual([5.01, 5.02]);
    expect(JSON.parse(csvRow(rows[0])[2])).toEqual(params);
  });

  it('exports recorded rigid SI quantities and applied actuators without filling legacy samples from the future', () => {
    const sim = makeSim();
    sim.telemetry[1].rigid = { modelVersion: 'education-6dof-v1', massFlowModel: 'reducedFlux', bodyId: 'stage, "upper"', configurationId: 's2+payload',
      attitudeQ: { w: 0.5, x: 0.5, y: -0.5, z: 0.5 }, omegaBody: { x: 0.01, y: -0.02, z: 0.03 },
      cgBody: { x: 20, y: 0, z: 0 }, renderOffsetBody: { x: -20, y: 0, z: 0 },
      inertiaBody: [2, 0.1, 0, 0.1, 3, 0, 0, 0, 4], controlMode: 'manual', commandRatesBody: { x: 0.01, y: -0.02, z: 0.03 }, commandThrottle: 0.6,
      engineDeflections: { 's2.engine.0': [0.02, -0.03] }, engineDirectionsBody: { 's2.engine.0': { x: 1, y: 0, z: 0 } },
      engineThrottles: { 's2.engine.0': 0 }, rcsPropellantKg: 12.5, saturated: true,
      angleOfAttack: 0.04, sideslip: -0.05, aeroWithinEnvelope: false, windECI: { x: 1, y: 2, z: 3 }, rawQuaternionNormError: 1e-13 };
    const lines = buildTelemetryCsv(sim).split('\n');
    const header = csvRow(lines[0]), legacy = csvRow(lines[1]), values = csvRow(lines[2]);
    const value = (name: string) => values[header.indexOf(name)];
    expect(legacy).toHaveLength(header.length); expect(values).toHaveLength(header.length);
    expect(legacy.slice(20).every(cell => cell === '')).toBe(true);
    expect(value('recording_schema_version')).toBe('3');
    expect(value('rigid_model_version')).toBe('education-6dof-v1');
    expect(value('rigid_mass_flow_model')).toBe('reducedFlux');
    for (const name of ['rigid_data_revision', 'rigid_wind_profile_json', 'rigid_wind_seed', 'rigid_integration_max_step_s', 'rigid_flow_derivative_max_step_s']) {
      expect(value(name)).toBe(''); // Unknown metadata is not filled from a current configuration.
    }
    expect(Number(value('command_roll_rad_s'))).toBe(0.01); expect(Number(value('command_pitch_rad_s'))).toBe(-0.02);
    expect(Number(value('command_yaw_rad_s'))).toBe(0.03); expect(Number(value('command_throttle'))).toBe(0.6);
    expect(value('body_id')).toBe('stage, "upper"'); expect(value('configuration_id')).toBe('s2+payload');
    expect(Number(value('attitude_qy'))).toBe(-0.5); expect(Number(value('omega_body_y_rad_s'))).toBe(-0.02);
    expect(Number(value('angle_of_attack_rad'))).toBe(0.04); expect(value('actuator_saturated')).toBe('true');
    expect(value('aero_within_envelope')).toBe('false');
    expect(JSON.parse(value('inertia_body_kg_m2_json'))).toEqual(sim.telemetry[1].rigid.inertiaBody);
    expect(JSON.parse(value('engine_deflections_rad_json'))).toEqual({ 's2.engine.0': [0.02, -0.03] });
    expect(JSON.parse(value('engine_throttles_json'))).toEqual({ 's2.engine.0': 0 });
    const exportTool = createMcpTools({ sim } as unknown as McpAppHost).find(tool => tool.name === 'export_csv')!;
    expect((exportTool.execute({}) as { csv: string }).csv).toBe(lines.join('\n'));
  });
});

/** Independent CSV field reader for quoted JSON/string round-trip checks. */
function csvRow(row: string): string[] {
  const fields: string[] = [];
  let field = '', quoted = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (quoted && row[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted;
    } else if (char === ',' && !quoted) { fields.push(field); field = ''; } else field += char;
  }
  fields.push(field);
  return fields;
}

describe('telemetryCsvFilename', () => {
  it('names the file after the vehicle and orbit ids', () => {
    expect(telemetryCsvFilename(makeSim())).toBe('orbitlab_soyuz21a_iss.csv');
  });
});

describe('export_csv WebMCP tool cross-check', () => {
  it('produces text and a filename identical to the shared helpers', () => {
    const sim = { ...makeSim(), events: [
      ...EVENTS,
      { t: 59, key: 'evt.maxQ', severity: 'info' },
      { t: 155.2, key: 'evt.stageSep', severity: 'major' },
    ] satisfies SimEvent[] };
    // `export_csv`'s `execute()` only reads `host.sim`; `createMcpTools`
    // builds every tool definition without eagerly touching any other host
    // field (see `src/mcp.ts`'s `createMcpTools`), so this minimal fake is
    // enough to exercise it.
    const host = { sim } as unknown as McpAppHost;
    const tools: WebMcpTool[] = createMcpTools(host);
    const exportTool = tools.find((tl) => tl.name === 'export_csv');
    if (!exportTool) throw new Error('no such tool: export_csv');
    const result = exportTool.execute({}) as { ok: boolean; csv: string; filename: string };
    expect(result.ok).toBe(true);
    expect(result.csv).toBe(buildTelemetryCsv(sim));
    expect(result.csv.indexOf('59.0,evt.maxQ')).toBeLessThan(result.csv.indexOf('155.2,evt.meco'));
    expect(result.csv.indexOf('155.2,evt.meco')).toBeLessThan(result.csv.indexOf('155.2,evt.stageSep'));
    expect(result.filename).toBe(telemetryCsvFilename(sim));
  });
});
