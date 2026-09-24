/**
 * The failures a mission sets (`DynamicsConfig.controlFaults`, roadmap G08): what each kind of
 * failure takes, its limits, the accident presets, and what the vehicle's runtime flies. Absent,
 * nothing fails and the flight is the one it was, bit for bit.
 */
import type { ControlFaultKind, ControlFaultSpec, ControlFaultsConfig } from '../../types';

export const CONTROL_FAULT_KINDS: readonly ControlFaultKind[] = [
  'gimbalStuck', 'gimbalHardover', 'gimbalSlow', 'actuatorPolarity', 'rcsStuckOn', 'rcsFailedOff',
  'rateInverted', 'gyroStuck', 'gyroBias', 'gyroNoise', 'imuFailure', 'accelBias', 'gnssLoss', 'starTrackerLoss',
  'computerHold', 'gainSign',
];
export type FaultGroup = 'actuator' | 'sensor' | 'computer';
export const FAULT_GROUP: Readonly<Record<ControlFaultKind, FaultGroup>> = {
  gimbalStuck: 'actuator', gimbalHardover: 'actuator', gimbalSlow: 'actuator', actuatorPolarity: 'actuator',
  rcsStuckOn: 'actuator', rcsFailedOff: 'actuator',
  rateInverted: 'sensor', gyroStuck: 'sensor', gyroBias: 'sensor', gyroNoise: 'sensor', imuFailure: 'sensor',
  accelBias: 'sensor', gnssLoss: 'sensor', starTrackerLoss: 'sensor',
  computerHold: 'computer', gainSign: 'computer',
};
export type FaultField = 'engine' | 'jet' | 'units' | 'axis' | 'sign' | 'magnitude';
/** The fields each kind takes, besides `kind`, `time` and `stage`. */
export const FAULT_FIELDS: Readonly<Record<ControlFaultKind, readonly FaultField[]>> = {
  gimbalStuck: ['engine'], gimbalHardover: ['engine', 'axis', 'sign'], gimbalSlow: ['engine', 'magnitude'], actuatorPolarity: ['engine', 'axis'],
  rcsStuckOn: ['jet'], rcsFailedOff: ['jet'],
  rateInverted: ['units', 'axis'], gyroStuck: ['units', 'axis'], gyroBias: ['units', 'axis', 'magnitude'], gyroNoise: ['units', 'magnitude'],
  imuFailure: ['units'], accelBias: ['units', 'axis', 'magnitude'], gnssLoss: [], starTrackerLoss: [],
  computerHold: ['magnitude'], gainSign: ['axis'],
};
/** The kinds that only the navigation (G02) reads: without it they would change nothing. */
export const NAVIGATION_FAULTS: readonly ControlFaultKind[] = ['accelBias', 'gnssLoss', 'starTrackerLoss'];
/** Each kind's size: its default and range, in the unit the panel shows. */
export const FAULT_MAGNITUDE: Readonly<Partial<Record<ControlFaultKind, { value: number; limits: readonly [number, number]; unit: string }>>> = {
  gyroBias: { value: 1, limits: [-90, 90], unit: 'loop.unit.degS' },
  gyroNoise: { value: 1, limits: [0.001, 90], unit: 'loop.unit.degS' },
  accelBias: { value: 10, limits: [-10000, 10000], unit: 'fault.unit.mg' },
  gimbalSlow: { value: 0.1, limits: [0.001, 1], unit: '' },
  computerHold: { value: 2, limits: [0.01, 600], unit: 'u.s' },
};
export const FAULT_AXES = ['roll', 'pitch', 'yaw'] as const;
export const IMU_UNIT_COUNT = 3;
export const MAX_FAULTS = 8;
export const FAULT_TIME_LIMITS = [0, 1e6] as const;

/**
 * Accidents a preset re-creates, on the vehicle the preset belongs to. Every
 * preset is replayed with the flight's FDIR as set — the lesson of the first
 * three is that it does not help.
 */
export const CONTROL_FAULT_PRESETS: Readonly<Record<string, { vehicleId: string; faults: readonly ControlFaultSpec[] }>> = {
  // Proton-M, 2 July 2013: the yaw channel's angular-rate sensors were installed upside down.
  proton2013: { vehicleId: 'protonm', faults: [{ kind: 'rateInverted', time: 0, units: 'all', axis: 'yaw' }] },
  // Ariane 501, 4 June 1996: both inertial reference systems shut down on the same software exception
  // at about H0 + 37 s, and the on-board computer flew their diagnostic words as attitude.
  ariane501: { vehicleId: 'ariane64', faults: [{ kind: 'imuFailure', time: 36.7, units: 'all' }] },
  // Vega VV17, 17 November 2020: two cables of the AVUM's nozzle actuators were swapped at integration.
  vega17: { vehicleId: 'vegac', faults: [{ kind: 'actuatorPolarity', time: 0, stage: 3, engine: 'all' }] },
  // Not an accident: one of Falcon 9's outer engines driven to its stop at T+60 s.
  falconGimbal: { vehicleId: 'falcon9', faults: [{ kind: 'gimbalHardover', time: 60, engine: 1, axis: 'pitch', sign: 1 }] },
};

/** The setup panel's field (and validation) key of each setting. */
export const FAULT_FIELD_KEYS = {
  title: 'setup.faults.title', kind: 'setup.faults.kind', time: 'setup.faults.time', stage: 'setup.faults.stage',
  engine: 'setup.faults.engine', jet: 'setup.faults.jet', units: 'setup.faults.units', axis: 'setup.faults.axis',
  sign: 'setup.faults.sign', magnitude: 'setup.faults.magnitude', fdir: 'setup.faults.fdir', seed: 'setup.faults.seed',
  preset: 'setup.faults.preset',
} as const;

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const inRange = (v: unknown, [lo, hi]: readonly [number, number]) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const count = (v: unknown, max: number) => v === 'all' || (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= max);

export interface FaultProblem { field: string; value: unknown; limits?: readonly [number, number] }

/** Every problem with one failure. */
export function controlFaultProblems(fault: unknown, context: { navigation?: boolean } = {}): FaultProblem[] {
  const K = FAULT_FIELD_KEYS;
  if (!isRecord(fault)) return [{ field: K.title, value: fault }];
  const kind = fault.kind as ControlFaultKind;
  if (!CONTROL_FAULT_KINDS.includes(kind)) return [{ field: K.kind, value: fault.kind }];
  const out: FaultProblem[] = [], fields = FAULT_FIELDS[kind];
  for (const key of Object.keys(fault)) {
    if (!['kind', 'time', 'stage', ...fields].includes(key)) out.push({ field: K.title, value: key });
  }
  if (!inRange(fault.time, FAULT_TIME_LIMITS)) out.push({ field: K.time, value: fault.time, limits: FAULT_TIME_LIMITS });
  if (fault.stage !== undefined && !(Number.isInteger(fault.stage) && (fault.stage as number) >= 0 && (fault.stage as number) <= 9)) {
    out.push({ field: K.stage, value: fault.stage, limits: [0, 9] });
  }
  if (fault.engine !== undefined && !count(fault.engine, 64)) out.push({ field: K.engine, value: fault.engine, limits: [1, 64] });
  if (fault.jet !== undefined && !count(fault.jet, 64)) out.push({ field: K.jet, value: fault.jet, limits: [1, 64] });
  if (fault.units !== undefined) {
    const u = fault.units;
    if (u !== 'all' && !(Array.isArray(u) && u.length >= 1 && u.length <= IMU_UNIT_COUNT && new Set(u).size === u.length
      && u.every((n) => Number.isInteger(n) && n >= 1 && n <= IMU_UNIT_COUNT))) out.push({ field: K.units, value: u });
  }
  if (fault.axis !== undefined && !(FAULT_AXES as readonly unknown[]).includes(fault.axis)) out.push({ field: K.axis, value: fault.axis });
  if (fault.sign !== undefined && fault.sign !== 1 && fault.sign !== -1) out.push({ field: K.sign, value: fault.sign });
  const size = FAULT_MAGNITUDE[kind];
  if (size && fault.magnitude !== undefined && !inRange(fault.magnitude, size.limits)) out.push({ field: K.magnitude, value: fault.magnitude, limits: size.limits });
  if (NAVIGATION_FAULTS.includes(kind) && context.navigation === false) out.push({ field: K.kind, value: kind });
  return out;
}

/** Every problem with a `controlFaults` object. */
export function controlFaultsProblems(config: unknown, context: { navigation?: boolean } = {}): FaultProblem[] {
  const K = FAULT_FIELD_KEYS;
  if (!isRecord(config)) return [{ field: K.title, value: config }];
  const out: FaultProblem[] = [];
  for (const key of Object.keys(config)) if (!['faults', 'fdir', 'preset', 'seed'].includes(key)) out.push({ field: K.title, value: key });
  if (!Array.isArray(config.faults) || config.faults.length > MAX_FAULTS) out.push({ field: K.title, value: config.faults, limits: [0, MAX_FAULTS] });
  else for (const fault of config.faults) out.push(...controlFaultProblems(fault, context));
  if (config.fdir !== undefined && typeof config.fdir !== 'boolean') out.push({ field: K.fdir, value: config.fdir });
  if (config.preset !== undefined && !(typeof config.preset === 'string' && config.preset in CONTROL_FAULT_PRESETS)) out.push({ field: K.preset, value: config.preset });
  if (config.seed !== undefined && !(Number.isInteger(config.seed) && (config.seed as number) >= 0 && (config.seed as number) <= 0xffffffff)) {
    out.push({ field: K.seed, value: config.seed });
  }
  return out;
}

export function validControlFaultsConfig(config: unknown, context: { navigation?: boolean } = {}): config is ControlFaultsConfig {
  return controlFaultsProblems(config, context).length === 0;
}

/** What the vehicle's runtime flies. */
export interface ControlFaultOptions { faults: readonly ControlFaultSpec[]; fdir: boolean; seed: number }

/** The runtime's failures, or undefined when the mission sets none (the flight as before). */
export function resolveControlFaults(config: ControlFaultsConfig | undefined, dynamicsSeed: number): ControlFaultOptions | undefined {
  if (!config) return undefined;
  return { faults: config.faults.map((f) => ({ ...f, ...(Array.isArray(f.units) ? { units: [...f.units] } : {}) })),
    fdir: config.fdir === true, seed: config.seed ?? faultSeed(dynamicsSeed) };
}
export const faultSeed = (dynamicsSeed: number) => (dynamicsSeed ^ 0x67303866) >>> 0;
