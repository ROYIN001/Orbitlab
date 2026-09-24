/**
 * The attitude autopilot's tuning (roadmap E04): the gains and limits of the
 * roll channel and of the pitch–yaw pair, and the weight of the aerodynamic
 * feed-forward, as a mission sets them (`DynamicsConfig.control`). Absent, the
 * runtime flies its own defaults (src/physics/rigid/runtime.ts,
 * `FLIGHT_CONTROL_GAINS`) bit for bit.
 */
import { DEG } from '../constants';
import { v3 } from '../vec3';
import type { ControlGains } from './control';
import type { ControlChannelConfig, ControlConfig } from '../../types';

export type ControlChannel = 'roll' | 'pitchYaw';
export const CONTROL_CHANNELS: readonly ControlChannel[] = ['roll', 'pitchYaw'];
export const CONTROL_CHANNEL_KEYS = ['attitudeGain', 'rateGain', 'maxRateDegS', 'maxAccelerationDegS2'] as const;
export type ControlChannelKey = (typeof CONTROL_CHANNEL_KEYS)[number];

/** The runtime's defaults, in the units a mission sets them (1/s, deg/s, deg/s²). */
export const CONTROL_DEFAULTS: Readonly<Record<ControlChannel, Readonly<Required<ControlChannelConfig>>>> & { feedForward: number } = {
  roll: { attitudeGain: 1.5, rateGain: 3, maxRateDegS: 8, maxAccelerationDegS2: 5 },
  pitchYaw: { attitudeGain: 1.5, rateGain: 3, maxRateDegS: 5, maxAccelerationDegS2: 3 },
  feedForward: 1,
};

/** Accepted ranges, in the same units (the feed-forward as a fraction). */
export const CONTROL_LIMITS: Readonly<Record<ControlChannelKey | 'feedForward', readonly [number, number]>> = {
  attitudeGain: [0.05, 10],
  rateGain: [0.1, 30],
  maxRateDegS: [0.5, 30],
  maxAccelerationDegS2: [0.1, 30],
  feedForward: [0, 1],
};

/** The setup panel's field (and validation) key of each setting, which is also its label. */
const FIELD_KEYS: Readonly<Record<ControlChannel, Readonly<Record<ControlChannelKey, string>>>> = {
  roll: { attitudeGain: 'setup.control.rollAttitudeGain', rateGain: 'setup.control.rollRateGain',
    maxRateDegS: 'setup.control.rollMaxRate', maxAccelerationDegS2: 'setup.control.rollMaxAcceleration' },
  pitchYaw: { attitudeGain: 'setup.control.pitchYawAttitudeGain', rateGain: 'setup.control.pitchYawRateGain',
    maxRateDegS: 'setup.control.pitchYawMaxRate', maxAccelerationDegS2: 'setup.control.pitchYawMaxAcceleration' },
};
export function controlFieldKey(channel: ControlChannel | 'feedForward', key?: ControlChannelKey): string {
  return channel === 'feedForward' ? 'setup.control.feedForward' : FIELD_KEYS[channel][key!];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Every problem with a `control` object: [field key, value] pairs out of range or of the wrong shape. */
export function controlProblems(control: unknown): { field: string; value: unknown; limits?: readonly [number, number] }[] {
  if (!isRecord(control)) return [{ field: 'setup.control.title', value: control }];
  const problems: { field: string; value: unknown; limits?: readonly [number, number] }[] = [];
  for (const key of Object.keys(control)) {
    if (key !== 'feedForward' && !(CONTROL_CHANNELS as readonly string[]).includes(key)) problems.push({ field: 'setup.control.title', value: key });
  }
  for (const channel of CONTROL_CHANNELS) {
    const c = control[channel];
    if (c === undefined) continue;
    if (!isRecord(c)) { problems.push({ field: 'setup.control.title', value: c }); continue; }
    for (const key of Object.keys(c)) {
      if (!(CONTROL_CHANNEL_KEYS as readonly string[]).includes(key)) { problems.push({ field: 'setup.control.title', value: key }); continue; }
      const value = c[key], limits = CONTROL_LIMITS[key as ControlChannelKey];
      if (value !== undefined && !(typeof value === 'number' && Number.isFinite(value) && value >= limits[0] && value <= limits[1])) {
        problems.push({ field: controlFieldKey(channel, key as ControlChannelKey), value, limits });
      }
    }
  }
  const ff = control.feedForward, limits = CONTROL_LIMITS.feedForward;
  if (ff !== undefined && !(typeof ff === 'number' && Number.isFinite(ff) && ff >= limits[0] && ff <= limits[1])) {
    problems.push({ field: controlFieldKey('feedForward'), value: ff, limits });
  }
  return problems;
}

export function validControlConfig(control: unknown): control is ControlConfig {
  return controlProblems(control).length === 0;
}

/** A setting as flown: the mission's, or the default. */
export function controlValue(control: ControlConfig | undefined, channel: ControlChannel, key: ControlChannelKey): number {
  return control?.[channel]?.[key] ?? CONTROL_DEFAULTS[channel][key];
}

/**
 * What the runtime flies for a mission's tuning, or undefined to fly its defaults untouched.
 * Gains set for the pitch–yaw pair are flown as set: the flexible-vehicle autopilot's cap on
 * them (P05's bandwidth ratio) applies to the default gains only.
 */
export function resolveControl(control: ControlConfig | undefined): { gains: ControlGains; feedForward: number; capPitchYawGains: boolean } | undefined {
  if (!control) return undefined;
  const set = (c?: ControlChannelConfig) => !!c && Object.values(c).some((v) => v !== undefined);
  if (!set(control.roll) && !set(control.pitchYaw) && control.feedForward === undefined) return undefined;
  const r = (key: ControlChannelKey) => controlValue(control, 'roll', key), p = (key: ControlChannelKey) => controlValue(control, 'pitchYaw', key);
  const gains: ControlGains = {
    attitudeGain: v3(r('attitudeGain'), p('attitudeGain'), p('attitudeGain')),
    rateGain: v3(r('rateGain'), p('rateGain'), p('rateGain')),
    maxRate: v3(r('maxRateDegS') * DEG, p('maxRateDegS') * DEG, p('maxRateDegS') * DEG),
    maxAngularAcceleration: v3(r('maxAccelerationDegS2') * DEG, p('maxAccelerationDegS2') * DEG, p('maxAccelerationDegS2') * DEG),
  };
  const py = control.pitchYaw;
  return { gains, feedForward: control.feedForward ?? CONTROL_DEFAULTS.feedForward,
    capPitchYawGains: !(py && (py.attitudeGain !== undefined || py.rateGain !== undefined)) };
}
