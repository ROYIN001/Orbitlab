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
import { PLANE_OF } from '../physics/rigid/linear';
import { aeroAngles, bodyRates, getNotation, type Notation } from './notation';
import { LOOP_AXES, loopLimiterNames, loopView, triple } from './loop-view';

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

// --- U07: rates and aerodynamic angles in the axes and signs of the notation in force
function notationColumnNames(n: Notation): string[] {
  const rates = n === 'iso' ? ['p', 'q', 'r'] : ['omega_x', 'omega_z', 'omega_y'];
  return [...rates.map(name => `${n}_${name}_rad_s`), ...rates.map(name => `${n}_command_${name}_rad_s`), `${n}_alpha_rad`, `${n}_beta_rad`];
}
function notationColumns(value: RigidTelemetry | undefined, n: Notation): string[] {
  if (!value) return notationColumnNames(n).map(() => '');
  const rates = bodyRates(value.omegaBody, n), command = value.commandRatesBody ? bodyRates(value.commandRatesBody, n) : null;
  const angles = aeroAngles(value.angleOfAttack, value.sideslip);
  return [rates.roll, rates.pitch, rates.yaw, command?.roll ?? '', command?.pitch ?? '', command?.yaw ?? '', angles.alpha, angles.beta]
    .map(entry => typeof entry === 'number' ? (Number.isInteger(entry) ? String(entry) : entry.toPrecision(12)) : entry);
}

// --- G03: the attitude loop, in the axes and signs of the notation in force
const LOOP_GROUPS = [['attitude_error', 'rad'], ['rate_command', 'rad_s'], ['angular_acceleration', 'rad_s2'], ['moment_demand', 'n_m'],
  ['moment_filtered', 'n_m'], ['moment_engines', 'n_m'], ['moment_jets', 'n_m'], ['moment_aero', 'n_m']] as const;
function loopColumnNames(n: Notation): string[] {
  return [...LOOP_GROUPS.flatMap(([name, unit]) => LOOP_AXES.map(axis => `${n}_loop_${name}_${axis}_${unit}`)),
    'loop_gimbal_use', 'loop_rcs_duty', 'loop_limiters', 'loop_load_relief_rad'];
}
function loopColumns(value: RigidTelemetry | undefined, n: Notation): string[] {
  const loop = value?.attitudeLoop, view = loopView(value, n);
  if (!loop || !view) return loopColumnNames(n).map(() => '');
  const vectors = [loop.attitudeErrorBody, loop.desiredRatesBody, loop.angularAccelerationBody, loop.momentDemandBody,
    loop.momentFilteredBody, loop.engineMomentBody, loop.rcsMomentBody, loop.aeroMomentBody];
  const entries: (string | number)[] = [...vectors.flatMap((v): (string | number)[] => (v ? LOOP_AXES.map(axis => triple(v, n)[axis]) : ['', '', ''])),
    loop.gimbalUse, loop.rcsDuty, loopLimiterNames(view).join('|'), loop.loadRelief?.appliedRad ?? ''];
  return entries.map(entry => typeof entry === 'number' ? (Number.isInteger(entry) ? String(entry) : entry.toPrecision(9)) : entry);
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

// --- G04: the linearised loop's margins, per plane, from the latest linearisation (once a second)
const MARGIN_FIELDS = ['stable', 'growth_per_s', 'pm_deg', 'crossover_rad_s', 'gm_db', 'gm_rad_s', 'gm_low_db'] as const;
const MARGIN_COLUMNS = ['loop_linearised_t_s', ...LOOP_AXES.flatMap(axis => MARGIN_FIELDS.map(field => `loop_${axis}_${field}`))];
function marginColumns(value: RigidTelemetry | undefined): string[] {
  const model = value?.linearModel;
  if (!model) return MARGIN_COLUMNS.map(() => '');
  const entries: (string | number | boolean)[] = [model.t, ...LOOP_AXES.flatMap((axis) => {
    const m = model.margins[PLANE_OF[axis]];
    return [m.active ? m.stable : '', m.growthRate, m.pmDeg ?? '', m.wcRadS ?? '', m.gmDb ?? '', m.wgRadS ?? '', m.gmLowDb ?? ''];
  })];
  return entries.map(entry => typeof entry === 'number' ? (Number.isFinite(entry) ? (Number.isInteger(entry) ? String(entry) : entry.toPrecision(6)) : '') : String(entry));
}

/** Telemetry samples plus the event log, as CSV text (no trailing newline). */
export function buildTelemetryCsv(sim: Pick<Simulation, 'telemetry' | 'events'>): string {
  const cols = ['t_s', 'alt_m', 'v_inertial_ms', 'v_air_ms', 'q_pa', 'mach', 'g_load', 'mass_kg', 'thrust_n', 'throttle', 'pitch_deg', 'apoapsis_m', 'periapsis_m', 'inclination_deg', 'dv_remaining_ms', 'downrange_m', 'lat_deg', 'lon_deg', 'stage', 'phase'];
  const hasRigid = sim.telemetry.some(sample => !!sample.rigid);
  if (hasRigid) cols.push(...RIGID_COLUMNS);
  const notation = getNotation();
  if (hasRigid) cols.push(...notationColumnNames(notation));
  const hasLoop = sim.telemetry.some(sample => !!sample.rigid?.attitudeLoop);
  if (hasLoop) cols.push(...loopColumnNames(notation));
  const hasFlex = sim.telemetry.some(sample => !!sample.rigid?.flex);
  if (hasFlex) cols.push(...FLEX_COLUMNS);
  const hasMargins = sim.telemetry.some(sample => !!sample.rigid?.linearModel);
  if (hasMargins) cols.push(...MARGIN_COLUMNS);
  const lines = [cols.join(',')];
  for (const s of sim.telemetry) {
    const row = [s.t, s.alt, s.vInertial, s.vAir, s.q, s.mach, s.gLoad, s.mass, s.thrust, s.throttle, s.pitch, s.ap, s.pe, s.inc, s.dvRemaining, s.downrange, s.lat, s.lon, s.stage, s.phase].map((v) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toPrecision(7)) : String(v)));
    if (hasRigid) row.push(...rigidColumns(s.rigid));
    if (hasRigid) row.push(...notationColumns(s.rigid, notation));
    if (hasLoop) row.push(...loopColumns(s.rigid, notation));
    if (hasFlex) row.push(...flexColumns(s.rigid));
    if (hasMargins) row.push(...marginColumns(s.rigid));
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
