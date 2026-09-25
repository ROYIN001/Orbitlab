/**
 * Flights recorded from this simulator for the placement test's charts
 * (roadmap E03): a question that asks when max-Q comes, or predicts what an
 * engine lost at T+80 s does, shows the simulator's own flight, not a drawing.
 * The series are kept in `flights.json`; tests/assessment.test.ts flies each
 * mission again and holds the file to it (`vitest -u` rewrites it).
 */
import type { MissionConfig } from '../../types';
import type { FlightSeries } from './types';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../../physics/defaults';
import { orbitById } from '../../data/orbits';
import { vehicleById } from '../../data/vehicles';
import { siteById } from '../../data/sites';
import { launchWindows } from '../../physics/mission';

export interface FlightDataset {
  /** mission time of each sample, s */
  t: number[];
  series: Partial<Record<FlightSeries, number[]>>;
  /** events worth marking on a chart: mission time and key */
  events: Array<[number, string]>;
}

export type FlightData = Record<string, FlightDataset>;

export const SERIES_UNITS: Readonly<Record<FlightSeries, string>> = {
  alt: 'km', vInertial: 'm/s', q: 'kPa', gLoad: 'g', mass: 't', thrust: 'kN', pitch: '°', dvRemaining: 'm/s',
};

const LAUNCH = new Date(Date.UTC(2026, 8, 15, 12));

function config(vehicleId: string, siteId: string, orbitId: string, satelliteId: string, payload: number, extra: Partial<MissionConfig> = {}): MissionConfig {
  const orbit = { ...orbitById(orbitId) };
  const window = orbit.raanMode === 'free' ? undefined : launchWindows(orbit, siteById(siteId), LAUNCH, 1)[0];
  return {
    vehicleId, satelliteId, siteId, orbit, launchTime: window?.time ?? LAUNCH,
    guidance: guidanceForVehicle(vehicleById(vehicleId), DEFAULT_GUIDANCE, 'pointMass'), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: payload,
    dynamics: { model: 'pointMass', wind: 'calm', seed: 20260919 },
    ...extra,
  };
}

/** The flights, as the missions they fly and how long of them to keep. */
export const DATASET_SPECS: Readonly<Record<string, { cfg: () => MissionConfig; until: number; step: number; series: FlightSeries[] }>> = {
  'f9-leo': { cfg: () => config('falcon9', 'cape', 'leo', 'cubesats', 10000), until: 540, step: 4, series: ['alt', 'vInertial', 'q', 'gLoad', 'mass', 'thrust', 'pitch'] },
  'f9-leo-engine-out': {
    cfg: () => config('falcon9', 'cape', 'leo', 'cubesats', 10000, { failure: { mode: 'engineOut', time: 80, stage: 0 } }),
    until: 540, step: 4, series: ['alt', 'vInertial', 'q', 'gLoad', 'thrust'],
  },
  'soyuz-iss': { cfg: () => config('soyuz21a', 'baikonur', 'iss', 'crew', 7150), until: 560, step: 4, series: ['alt', 'vInertial', 'q', 'gLoad', 'mass', 'thrust'] },
};

/** Four significant figures: enough for a chart, and stable across machines. */
const sig = (v: number): number => (v === 0 || !Number.isFinite(v) ? 0 : Number(v.toPrecision(4)));

/** A telemetry sample's value in the chart's unit. */
export function seriesValue(s: { alt: number; vInertial: number; q: number; gLoad: number; mass: number; thrust: number; pitch: number; dvRemaining: number }, key: FlightSeries): number {
  switch (key) {
    case 'alt': return s.alt / 1000;
    case 'q': return s.q / 1000;
    case 'mass': return s.mass / 1000;
    case 'thrust': return s.thrust / 1000;
    default: return s[key];
  }
}
export { sig };
