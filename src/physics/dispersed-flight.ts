/**
 * One dispersed flight (roadmap P08): a single run of a Monte Carlo set (G05) flown on its own, in
 * the app, as any other flight — its vehicle and air dispersed exactly as the set drew that run.
 * The mission names the run (`dynamics.dispersion`: the set's seed, the run's index and, when not
 * the default, the set's dispersions); the Simulation draws it with `drawDispersion`, the same
 * function, stream and order the Monte Carlo runs use, so run `n` flown here is run `n` of the set.
 *
 * Six-DOF draws everything: the stages' thrust, Isp, propellant and dry mass, the air's density, a
 * steady wind and the gusts' phase, a fresh realisation of the IMU. Point-mass flies the same draws
 * of what it models — the vehicle and the density; it has no wind and no IMU. A mission without
 * `dispersion` flies exactly as before.
 */
import type { DispersedFlightConfig, VehicleSpec } from '../types';
import { DEFAULT_DISPERSIONS, drawDispersion, validDispersions, type FlightDispersion } from './dispersion';

/** The highest run index a set can have (G05's `MONTE_CARLO_RUNS.max` − 1). */
export const DISPERSED_RUN_MAX = 1999;

export function validDispersedFlight(value: unknown): value is DispersedFlightConfig {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<DispersedFlightConfig>;
  if (Object.keys(v).some((k) => !['seed', 'run', 'settings'].includes(k))) return false;
  return Number.isInteger(v.seed) && v.seed! >= 0 && v.seed! <= 0xffffffff
    && Number.isInteger(v.run) && v.run! >= 0 && v.run! <= DISPERSED_RUN_MAX
    && (v.settings === undefined || validDispersions(v.settings));
}

/** What the named run flies with, for this vehicle. */
export function configuredDispersion(spec: VehicleSpec, d: DispersedFlightConfig): FlightDispersion {
  return drawDispersion(spec, d.settings ?? DEFAULT_DISPERSIONS, d.seed, d.run).dispersion;
}
