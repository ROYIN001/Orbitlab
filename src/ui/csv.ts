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
import type { RigidTelemetry } from '../physics/rigid/telemetry';

const RIGID_COLUMNS = ['recording_schema_version', 'rigid_model_version', 'rigid_data_revision',
  'rigid_mass_flow_model', 'rigid_wind_profile_json', 'rigid_wind_seed', 'rigid_integration_max_step_s', 'rigid_flow_derivative_max_step_s',
  'wind_eci_x_ms', 'wind_eci_y_ms', 'wind_eci_z_ms', 'body_id', 'configuration_id',
  'attitude_qw', 'attitude_qx', 'attitude_qy', 'attitude_qz',
  'omega_body_x_rad_s', 'omega_body_y_rad_s', 'omega_body_z_rad_s',
  'cg_body_x_m', 'cg_body_y_m', 'cg_body_z_m', 'inertia_body_kg_m2_json',
  'control_mode', 'command_roll_rad_s', 'command_pitch_rad_s', 'command_yaw_rad_s', 'command_throttle',
  'engine_deflections_rad_json', 'engine_directions_body_json', 'engine_throttles_json',
  'rcs_propellant_kg', 'actuator_saturated', 'angle_of_attack_rad', 'sideslip_rad',
  'aero_within_envelope', 'raw_quaternion_norm_error'];

function rigidColumns(value: RigidTelemetry | undefined): string[] {
  if (!value) return RIGID_COLUMNS.map(() => '');
  const q = value.attitudeQ, w = value.omegaBody, cg = value.cgBody;
  const entries = [3, value.modelVersion, value.dataRevision ?? '', value.massFlowModel ?? '',
    value.windProfile ? JSON.stringify(value.windProfile) : '', value.windProfile ? value.windProfile.seed ?? 0 : '',
    value.integrationMaxStepS ?? '', value.flowDerivativeMaxStepS ?? '', value.windECI.x, value.windECI.y, value.windECI.z,
    value.bodyId ?? '', value.configurationId ?? '',
    q.w, q.x, q.y, q.z, w.x, w.y, w.z, cg.x, cg.y, cg.z, JSON.stringify(value.inertiaBody),
    value.controlMode, value.commandRatesBody?.x ?? '', value.commandRatesBody?.y ?? '', value.commandRatesBody?.z ?? '', value.commandThrottle ?? '',
    JSON.stringify(value.engineDeflections), JSON.stringify(value.engineDirectionsBody ?? {}),
    JSON.stringify(value.engineThrottles ?? {}), value.rcsPropellantKg, value.saturated, value.angleOfAttack,
    value.sideslip, value.aeroWithinEnvelope, value.rawQuaternionNormError];
  return entries.map(value => {
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toPrecision(12);
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  });
}

// --- P05: the flexible body, when it was modelled
const FLEX_COLUMNS = ['slosh_active', 'slosh_max_displacement_m', 'slosh_displacements_m_json',
  'bending_frequency_hz', 'bending_modal_y', 'bending_modal_z', 'bending_deflection_m',
  'imu_station_m', 'imu_sensor_error_rad', 'shell_load_ratio', 'shell_load_station_m', 'notch_center_hz'];

function flexColumns(value: RigidTelemetry | undefined): string[] {
  const flex = value?.flex;
  if (!flex) return FLEX_COLUMNS.map(() => '');
  const tanks = flex.slosh?.tanks ?? [];
  const b = flex.bending;
  const entries: (string | number | boolean)[] = [flex.slosh ? flex.slosh.active : '', tanks.length ? Math.max(...tanks.map((tank) => tank.displacementM)) : '',
    tanks.length ? JSON.stringify(Object.fromEntries(tanks.map((tank) => [tank.id, tank.displacementM]))) : '',
    b?.frequencyHz ?? '', b?.modal.y ?? '', b?.modal.z ?? '', b?.deflectionM ?? '', b?.imuStationX ?? '', b?.sensorErrorRad ?? '',
    b?.loadRatio ?? '', b?.loadStationX ?? '', flex.notch?.centerHz ?? ''];
  return entries.map(value => {
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toPrecision(9);
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  });
}

/** Telemetry samples plus the event log, as CSV text (no trailing newline). */
export function buildTelemetryCsv(sim: Pick<Simulation, 'telemetry' | 'events'>): string {
  const cols = ['t_s', 'alt_m', 'v_inertial_ms', 'v_air_ms', 'q_pa', 'mach', 'g_load', 'mass_kg', 'thrust_n', 'throttle', 'pitch_deg', 'apoapsis_m', 'periapsis_m', 'inclination_deg', 'dv_remaining_ms', 'downrange_m', 'lat_deg', 'lon_deg', 'stage', 'phase'];
  const hasRigid = sim.telemetry.some(sample => !!sample.rigid);
  if (hasRigid) cols.push(...RIGID_COLUMNS);
  const hasFlex = sim.telemetry.some(sample => !!sample.rigid?.flex);
  if (hasFlex) cols.push(...FLEX_COLUMNS);
  const lines = [cols.join(',')];
  for (const s of sim.telemetry) {
    const row = [s.t, s.alt, s.vInertial, s.vAir, s.q, s.mach, s.gLoad, s.mass, s.thrust, s.throttle, s.pitch, s.ap, s.pe, s.inc, s.dvRemaining, s.downrange, s.lat, s.lon, s.stage, s.phase].map((v) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toPrecision(7)) : String(v)));
    if (hasRigid) row.push(...rigidColumns(s.rigid));
    if (hasFlex) row.push(...flexColumns(s.rigid));
    lines.push(row.join(','));
  }
  lines.push('');
  lines.push('# events');
  lines.push('t_s,event,details');
  for (const e of chronologicalEvents(sim.events)) {
    // Distinct accepted controls can share a tenth of a second. Preserve their
    // physics-clock precision while keeping the legacy event format unchanged.
    const time = e.key === 'evt.controlCommand' ? e.t.toFixed(9) : e.t.toFixed(1);
    lines.push(`${time},${e.key},"${JSON.stringify(e.params ?? {}).replace(/"/g, '""')}"`);
  }
  return lines.join('\n');
}

/** The CSV export's filename for one simulation. */
export function telemetryCsvFilename(sim: Pick<Simulation, 'vehicleSpec' | 'cfg'>): string {
  return `orbitlab_${sim.vehicleSpec.id}_${sim.cfg.orbit.id}.csv`;
}
