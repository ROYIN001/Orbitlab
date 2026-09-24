/**
 * The navigation a mission sets (`DynamicsConfig.navigation`, roadmap G02): the IMU's grade or
 * figures, GNSS and its outage, the star tracker. Absent, the flight knows its true state and
 * flies bit for bit as before.
 */
import type { NavigationConfig } from '../../types';
import { AIDING_DEFAULTS, IMU_LIMITS, IMU_PRESETS, type AidingSpec, type ImuSpec } from './sensors';
import type { NavigationOptions } from './navigation';

export const NAV_GRADES = ['navigation', 'tactical', 'mems', 'custom'] as const;
export const IMU_KEYS = Object.keys(IMU_LIMITS) as (keyof ImuSpec)[];
export const AIDING_LIMITS = {
  gnssPositionM: [0.01, 1000], gnssVelocityMs: [0.001, 10], gnssRateHz: [0.1, 20],
  starTrackerArcsec: [0.1, 3600], starTrackerMinAltitudeKm: [0, 2000],
} as const;
type AidingKey = keyof typeof AIDING_LIMITS;
export const AIDING_KEYS = Object.keys(AIDING_LIMITS) as AidingKey[];

/** The setup panel's field (and validation) key of each setting, which is also its label. */
export const NAV_FIELD_KEYS: Readonly<Record<keyof ImuSpec | AidingKey | 'gnssOutageStart' | 'gnssOutageEnd' | 'seed', string>> = {
  gyroBiasDegH: 'setup.nav.gyroBias', gyroBiasInstabilityDegH: 'setup.nav.gyroInstability', gyroArwDegRtH: 'setup.nav.gyroArw',
  gyroScalePpm: 'setup.nav.gyroScale', accelBiasUg: 'setup.nav.accelBias', accelBiasInstabilityUg: 'setup.nav.accelInstability',
  accelVrwMsRtH: 'setup.nav.accelVrw', accelScalePpm: 'setup.nav.accelScale', alignmentDeg: 'setup.nav.alignment',
  gnssPositionM: 'setup.nav.gnssPosition', gnssVelocityMs: 'setup.nav.gnssVelocity', gnssRateHz: 'setup.nav.gnssRate',
  starTrackerArcsec: 'setup.nav.starArcsec', starTrackerMinAltitudeKm: 'setup.nav.starAltitude',
  gnssOutageStart: 'setup.nav.outageStart', gnssOutageEnd: 'setup.nav.outageEnd', seed: 'setup.nav.seed',
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const inRange = (v: unknown, [lo, hi]: readonly [number, number]) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

/** Every problem with a `navigation` object, as [field key, value, range]. */
export function navigationProblems(nav: unknown): { field: string; value: unknown; limits?: readonly [number, number] }[] {
  if (!isRecord(nav)) return [{ field: 'setup.nav.title', value: nav }];
  const out: { field: string; value: unknown; limits?: readonly [number, number] }[] = [];
  const known = ['grade', 'imu', 'gnss', 'starTracker', 'gnssOutage', 'seed', ...AIDING_KEYS];
  for (const key of Object.keys(nav)) if (!known.includes(key)) out.push({ field: 'setup.nav.title', value: key });
  if (nav.grade !== undefined && !(NAV_GRADES as readonly unknown[]).includes(nav.grade)) out.push({ field: 'setup.nav.grade', value: nav.grade });
  for (const key of ['gnss', 'starTracker'] as const) if (nav[key] !== undefined && typeof nav[key] !== 'boolean') out.push({ field: `setup.nav.${key}`, value: nav[key] });
  if (nav.imu !== undefined) {
    if (!isRecord(nav.imu)) out.push({ field: 'setup.nav.title', value: nav.imu });
    else for (const [key, value] of Object.entries(nav.imu)) {
      if (!(IMU_KEYS as string[]).includes(key)) { out.push({ field: 'setup.nav.title', value: key }); continue; }
      const limits = IMU_LIMITS[key as keyof ImuSpec];
      if (value !== undefined && !inRange(value, limits)) out.push({ field: NAV_FIELD_KEYS[key as keyof ImuSpec], value, limits });
    }
  }
  for (const key of AIDING_KEYS) if (nav[key] !== undefined && !inRange(nav[key], AIDING_LIMITS[key])) out.push({ field: NAV_FIELD_KEYS[key], value: nav[key], limits: AIDING_LIMITS[key] });
  if (nav.gnssOutage !== undefined) {
    const o = nav.gnssOutage;
    if (!Array.isArray(o) || o.length !== 2 || !inRange(o[0], [0, 1e6]) || !inRange(o[1], [0, 1e6]) || !(o[1] > o[0])) out.push({ field: NAV_FIELD_KEYS.gnssOutageEnd, value: o });
  }
  if (nav.seed !== undefined && !(Number.isInteger(nav.seed) && (nav.seed as number) >= 0 && (nav.seed as number) <= 0xffffffff)) out.push({ field: NAV_FIELD_KEYS.seed, value: nav.seed });
  return out;
}

export function validNavigationConfig(nav: unknown): nav is NavigationConfig { return navigationProblems(nav).length === 0; }

/** The IMU a setting flies: its grade's figures, with any set over them. */
export function imuFor(nav: NavigationConfig): ImuSpec {
  const grade = nav.grade === undefined || nav.grade === 'custom' ? 'tactical' : nav.grade;
  const out = { ...IMU_PRESETS[grade] };
  for (const key of IMU_KEYS) { const v = nav.imu?.[key]; if (v !== undefined) out[key] = v; }
  return out;
}

export function aidingFor(nav: NavigationConfig): AidingSpec {
  return {
    ...AIDING_DEFAULTS,
    ...(nav.gnss !== undefined ? { gnss: nav.gnss } : {}),
    ...(nav.starTracker !== undefined ? { starTracker: nav.starTracker } : {}),
    ...Object.fromEntries(AIDING_KEYS.filter((k) => nav[k] !== undefined).map((k) => [k, nav[k]])),
    gnssOutages: nav.gnssOutage ? [[nav.gnssOutage[0], nav.gnssOutage[1]]] : [],
  };
}

/** What the vehicle's runtime flies, or undefined for no navigation (the truth, as before). */
export function resolveNavigation(nav: NavigationConfig | undefined, dynamicsSeed: number): NavigationOptions | undefined {
  if (!nav) return undefined;
  return { imu: imuFor(nav), aiding: aidingFor(nav), seed: nav.seed ?? ((dynamicsSeed ^ 0x6e617631) >>> 0) };
}
