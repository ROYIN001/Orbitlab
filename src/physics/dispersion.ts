/**
 * The dispersions of a Monte Carlo flight (roadmap G05): how the vehicle that flies, and the air
 * it flies through, differ from the nominal ones the mission was planned on.
 *
 * Every run draws from its own seeded stream, always in the same order and whether a quantity is
 * switched on or not, one standard normal number per dispersed quantity, clipped at ±3σ. Switching
 * one quantity off therefore never moves the others' draws, and the same seed flies the same
 * vehicles through the same air under every guidance law.
 *
 * Per stage and per strap-on group (a group's boosters share their draw): thrust, specific impulse,
 * the propellant loaded and the dry mass. For the flight: the air's density, a steady wind added to
 * the mission's, the gusts' phase, and — with the inertial navigation of G02 — a fresh realisation
 * of the same IMU grade. The mission is still planned on the nominal vehicle; the dispersed one is
 * what flies, and what its flight computer senses.
 */
import type { BoosterGroupSpec, EngineSpec, StageSpec, VehicleSpec } from '../types';
import { mulberry32 } from './sim/seed';
import { v3 } from './vec3';
import type { WindScenario } from './rigid/aero';

export type DispersionKey = 'thrust' | 'isp' | 'propellant' | 'dryMass' | 'density' | 'wind' | 'imu';
export const DISPERSION_KEYS: readonly DispersionKey[] = ['thrust', 'isp', 'propellant', 'dryMass', 'density', 'wind', 'imu'];
/** The quantities drawn per stage and strap-on group. */
export const PROPULSION_KEYS = ['thrust', 'isp', 'propellant', 'dryMass'] as const;
export type PropulsionKey = typeof PROPULSION_KEYS[number];

/** One quantity: whether it is dispersed, and its 1σ — per cent, or m/s per horizontal axis for the wind. */
export interface DispersionSetting { enabled: boolean; sigma: number }
export type DispersionSettings = Record<DispersionKey, DispersionSetting>;

/**
 * The minimal set agreed with the owner, every 1σ editable: thrust 1 %, Isp 0.3 %, propellant and
 * dry mass 0.5 %, density 5 %, wind 5 m/s per axis, the IMU a fresh realisation of its grade.
 */
export const DEFAULT_DISPERSIONS: Readonly<DispersionSettings> = Object.freeze({
  thrust: { enabled: true, sigma: 1 },
  isp: { enabled: true, sigma: 0.3 },
  propellant: { enabled: true, sigma: 0.5 },
  dryMass: { enabled: true, sigma: 0.5 },
  density: { enabled: true, sigma: 5 },
  wind: { enabled: true, sigma: 5 },
  imu: { enabled: true, sigma: 0 },
});
/** The 1σ each quantity accepts (the IMU has none: it is its grade's own error model). */
export const DISPERSION_SIGMA_LIMITS: Readonly<Record<DispersionKey, readonly [number, number]>> = {
  thrust: [0, 10], isp: [0, 5], propellant: [0, 5], dryMass: [0, 10], density: [0, 30], wind: [0, 30], imu: [0, 0],
};
/** Draws are clipped here, in σ: a 4σ engine is a failed engine, not a dispersed one. */
export const CLIP_SIGMA = 3;

export function cloneDispersions(settings: Readonly<DispersionSettings>): DispersionSettings {
  return Object.fromEntries(DISPERSION_KEYS.map((k) => [k, { ...settings[k] }])) as DispersionSettings;
}

/** A complete, in-range setting (what the window and MCP send). */
export function validDispersions(value: unknown): value is DispersionSettings {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some((k) => !(DISPERSION_KEYS as readonly string[]).includes(k))) return false;
  return DISPERSION_KEYS.every((k) => {
    const s = v[k] as Partial<DispersionSetting> | undefined;
    const [lo, hi] = DISPERSION_SIGMA_LIMITS[k];
    return !!s && typeof s === 'object' && typeof s.enabled === 'boolean' && typeof s.sigma === 'number'
      && Number.isFinite(s.sigma) && s.sigma >= lo && s.sigma <= hi;
  });
}

/** A stage or strap-on group that flies the ascent (the spacecraft does not). */
export interface PropulsionElement { id: string; kind: 'stage' | 'booster'; stage: number }
export function propulsionElements(spec: VehicleSpec): PropulsionElement[] {
  const out: PropulsionElement[] = [];
  spec.stages.forEach((st, i) => {
    if (st.isSpacecraft) return;
    out.push({ id: st.id, kind: 'stage', stage: i });
    for (const b of st.boosters ?? []) out.push({ id: b.id, kind: 'booster', stage: i });
  });
  return out;
}

/** One stage's or strap-on group's factors, 1 nominal. */
export type PropulsionFactors = Record<PropulsionKey, number>;

/** What a run flies with: the vehicle's factors and the air's. */
export interface FlightDispersion {
  /** by stage or strap-on group id */
  vehicle: Record<string, PropulsionFactors>;
  /** the air's density over the standard atmosphere's */
  densityFactor: number;
  /** a steady wind added to the mission's, m/s (six-DOF) */
  windENU: { east: number; north: number };
  /** the gusts' phase seed (six-DOF); absent, the mission's */
  windSeed?: number;
  /** the navigation sensors' seed (G02); absent, the mission's */
  navigationSeed?: number;
}

/** One number drawn: standard normal, clipped at ±CLIP_SIGMA — drawn whether its quantity is on or not. */
export interface DispersionDraw { key: DispersionKey; element?: string; axis?: 'east' | 'north'; z: number }
export interface DrawnRun { index: number; seed: number; dispersion: FlightDispersion; draws: DispersionDraw[] }

/** The stream of run `index` of the set seeded `seed`. */
export function runSeed(seed: number, index: number): number {
  let h = Math.imul((seed >>> 0) ^ 0x4d6f6e74, 0x9e3779b1) ^ Math.imul((index >>> 0) + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Run `index`'s dispersions for this vehicle. */
export function drawDispersion(spec: VehicleSpec, settings: Readonly<DispersionSettings>, seed: number, index: number): DrawnRun {
  const uniform = mulberry32(runSeed(seed, index));
  const normal = (): number => {
    const u = (Math.floor(uniform() * 4294967296) + 0.5) / 4294967296, v = uniform();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return Math.max(-CLIP_SIGMA, Math.min(CLIP_SIGMA, z));
  };
  const word = (): number => Math.floor(uniform() * 4294967296) >>> 0;
  const factor = (key: DispersionKey, z: number): number => settings[key].enabled ? 1 + settings[key].sigma / 100 * z : 1;
  const draws: DispersionDraw[] = [];
  const vehicle: Record<string, PropulsionFactors> = {};
  for (const e of propulsionElements(spec)) {
    const f = {} as PropulsionFactors;
    for (const key of PROPULSION_KEYS) {
      const z = normal();
      draws.push({ key, element: e.id, z });
      f[key] = factor(key, z);
    }
    vehicle[e.id] = f;
  }
  const zDensity = normal(), zEast = normal(), zNorth = normal();
  const windSeed = word(), navigationSeed = word();
  draws.push({ key: 'density', z: zDensity }, { key: 'wind', axis: 'east', z: zEast }, { key: 'wind', axis: 'north', z: zNorth });
  const wind = settings.wind.enabled ? settings.wind.sigma : 0;
  const dispersion: FlightDispersion = {
    vehicle, densityFactor: factor('density', zDensity),
    windENU: wind > 0 ? { east: wind * zEast, north: wind * zNorth } : { east: 0, north: 0 },
    ...(settings.wind.enabled ? { windSeed } : {}),
    ...(settings.imu.enabled ? { navigationSeed } : {}),
  };
  return { index, seed, dispersion, draws };
}

function dispersedEngine(e: EngineSpec, f: PropulsionFactors): EngineSpec {
  return { ...e, thrustSL: e.thrustSL * f.thrust, thrustVac: e.thrustVac * f.thrust, ispSL: e.ispSL * f.isp, ispVac: e.ispVac * f.isp };
}
function dispersedBooster(b: BoosterGroupSpec, f: PropulsionFactors | undefined): BoosterGroupSpec {
  return f ? { ...b, dryMass: b.dryMass * f.dryMass, propellantMass: b.propellantMass * f.propellant, engine: dispersedEngine(b.engine, f) } : b;
}

/**
 * The vehicle that flies: each stage's and strap-on group's engines, propellant and dry mass
 * scaled. A thrust factor keeps the Isp (the flow follows the thrust, and the burn time the flow);
 * an Isp factor keeps the thrust.
 */
export function dispersedVehicle(spec: VehicleSpec, factors: Readonly<Record<string, PropulsionFactors>>): VehicleSpec {
  return {
    ...spec,
    stages: spec.stages.map((st): StageSpec => {
      const f = factors[st.id];
      const boosters = st.boosters?.map((b) => dispersedBooster(b, factors[b.id]));
      const scaled = f ? { ...st, dryMass: st.dryMass * f.dryMass, propellantMass: st.propellantMass * f.propellant, engine: dispersedEngine(st.engine, f) } : { ...st };
      if (boosters) scaled.boosters = boosters;
      return scaled;
    }),
  };
}

/** A run's air for the six-DOF runtime: the density factor, and the steady wind and gust phase over the mission's. */
export interface AirDispersion { densityFactor: number; windENU: { east: number; north: number }; windSeed?: number }

/** The mission's declared wind with the run's steady wind added (a calm day gets that wind alone) and its gusts' phase. */
export function dispersedWind(base: WindScenario, air: AirDispersion | undefined): WindScenario {
  if (!air) return base;
  const velocity = base.velocityENU ?? v3();
  return {
    ...base, kind: base.kind === 'calm' ? 'constant' : base.kind,
    velocityENU: v3(velocity.x + air.windENU.east, velocity.y + air.windENU.north, velocity.z),
    ...(air.windSeed !== undefined ? { seed: air.windSeed } : {}),
  };
}
