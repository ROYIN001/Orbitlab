/**
 * The flight-data CSV format: telemetry samples followed by the event log,
 * as one text blob.
 *
 * This is the single definition of that format. `TelemetryPanel.exportCsv`
 * (`src/ui/telemetry.ts`, the panel's download button) calls
 * `buildTelemetryCsv`/`telemetryCsvFilename` here and handles only the DOM
 * half itself — Blob, anchor, `URL.createObjectURL`. The WebMCP `export_csv`
 * tool (`src/mcp.ts`) uses the same builder. Event rows use occurrence order,
 * matching the timeline even when a peak was detected retrospectively.
 *
 * DOM-free on purpose: no `Blob`, no `document`, nothing that only exists in
 * a browser, so this can be unit-tested under `environment: 'node'` and
 * shared with any future non-DOM caller (e.g. a Node-side export).
 */
import type { Simulation } from '../physics/simulation';
import { chronologicalEvents } from '../physics/events';

/** Telemetry samples plus the event log, as CSV text (no trailing newline). */
export function buildTelemetryCsv(sim: Pick<Simulation, 'telemetry' | 'events'>): string {
  const cols = ['t_s', 'alt_m', 'v_inertial_ms', 'v_air_ms', 'q_pa', 'mach', 'g_load', 'mass_kg', 'thrust_n', 'throttle', 'pitch_deg', 'apoapsis_m', 'periapsis_m', 'inclination_deg', 'dv_remaining_ms', 'downrange_m', 'lat_deg', 'lon_deg', 'stage', 'phase'];
  const lines = [cols.join(',')];
  for (const s of sim.telemetry) {
    lines.push([s.t, s.alt, s.vInertial, s.vAir, s.q, s.mach, s.gLoad, s.mass, s.thrust, s.throttle, s.pitch, s.ap, s.pe, s.inc, s.dvRemaining, s.downrange, s.lat, s.lon, s.stage, s.phase].map((v) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toPrecision(7)) : String(v))).join(','));
  }
  lines.push('');
  lines.push('# events');
  lines.push('t_s,event,details');
  for (const e of chronologicalEvents(sim.events)) lines.push(`${e.t.toFixed(1)},${e.key},"${JSON.stringify(e.params ?? {}).replace(/"/g, '""')}"`);
  return lines.join('\n');
}

/** The CSV export's filename for one simulation. */
export function telemetryCsvFilename(sim: Pick<Simulation, 'vehicleSpec' | 'cfg'>): string {
  return `orbitlab_${sim.vehicleSpec.id}_${sim.cfg.orbit.id}.csv`;
}
