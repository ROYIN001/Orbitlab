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
});

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
