import type { DynamicsConfig, VehicleSpec } from '../../types';
import { isCatalogueVehicle } from '../../data/vehicles';
import { validFlexConfig } from './flex';
import { validControlConfig } from './control-config';
import { validNavigationConfig } from '../nav/config';
import { validControlFaultsConfig } from './fault-config';
import { validDispersedFlight } from '../dispersed-flight';
import { validExplicitGuidanceConfig } from '../explicit-guidance';

export const RIGID_MODEL_VERSION = 'sixdof-1';
/**
 * Every vehicle has six-DOF data (src/physics/rigid/vehicle-data.ts) and flies
 * as a rigid body unless the user chooses the point-mass model. The data are
 * built from the spec, so a custom vehicle (roadmap S02), given as its spec,
 * has them too; an id alone names a catalogue vehicle or nothing.
 */
export const supportsRigid = (vehicle: string | VehicleSpec): boolean =>
  typeof vehicle === 'string' ? isCatalogueVehicle(vehicle) : true;

export function defaultDynamics(vehicle: string | VehicleSpec): DynamicsConfig {
  return { model: supportsRigid(vehicle) ? 'sixDof' : 'pointMass', wind: 'calm', seed: 20260919 };
}

export function validateDynamics(value: unknown, vehicle: string | VehicleSpec): value is DynamicsConfig {
  if (!value || typeof value !== 'object') return false;
  const d = value as DynamicsConfig;
  return (d.model === 'pointMass' || (d.model === 'sixDof' && supportsRigid(vehicle)))
    && ['calm', 'crosswind', 'shear'].includes(d.wind)
    && Number.isInteger(d.seed) && d.seed >= 0 && d.seed <= 0xffffffff
    && (d.flex === undefined || validFlexConfig(d.flex))
    && (d.control === undefined || validControlConfig(d.control))
    && (d.navigation === undefined || validNavigationConfig(d.navigation))
    && (d.controlFaults === undefined || validControlFaultsConfig(d.controlFaults, { navigation: d.navigation !== undefined }))
    && (d.explicitGuidance === undefined || validExplicitGuidanceConfig(d.explicitGuidance))
    // P08: one run of a Monte Carlo set, flown on its own
    && (d.dispersion === undefined || validDispersedFlight(d.dispersion));
}
