import type { DynamicsConfig } from '../../types';
import { ALL_VEHICLES } from '../../data/vehicles';
import { validFlexConfig } from './flex';
import { validControlConfig } from './control-config';
import { validNavigationConfig } from '../nav/config';
import { validControlFaultsConfig } from './fault-config';
import { validExplicitGuidanceConfig } from '../explicit-guidance';

export const RIGID_MODEL_VERSION = 'sixdof-1';
/**
 * Every vehicle has six-DOF data (src/physics/rigid/vehicle-data.ts) and flies
 * as a rigid body unless the user chooses the point-mass model.
 */
export const supportsRigid = (vehicleId: string): boolean => ALL_VEHICLES.some((v) => v.id === vehicleId);

export function defaultDynamics(vehicleId: string): DynamicsConfig {
  return { model: supportsRigid(vehicleId) ? 'sixDof' : 'pointMass', wind: 'calm', seed: 20260919 };
}

export function validateDynamics(value: unknown, vehicleId: string): value is DynamicsConfig {
  if (!value || typeof value !== 'object') return false;
  const d = value as DynamicsConfig;
  return (d.model === 'pointMass' || (d.model === 'sixDof' && supportsRigid(vehicleId)))
    && ['calm', 'crosswind', 'shear'].includes(d.wind)
    && Number.isInteger(d.seed) && d.seed >= 0 && d.seed <= 0xffffffff
    && (d.flex === undefined || validFlexConfig(d.flex))
    && (d.control === undefined || validControlConfig(d.control))
    && (d.navigation === undefined || validNavigationConfig(d.navigation))
    && (d.controlFaults === undefined || validControlFaultsConfig(d.controlFaults, { navigation: d.navigation !== undefined }))
    && (d.explicitGuidance === undefined || validExplicitGuidanceConfig(d.explicitGuidance));
}
