import type { DynamicsConfig } from '../../types';
import { VEHICLES } from '../../data/vehicles';

export const RIGID_MODEL_VERSION = 'sixdof-1';
/**
 * Every vehicle has six-DOF data (src/physics/rigid/vehicle-data.ts) and flies
 * as a rigid body unless the user chooses the point-mass model.
 */
export const supportsRigid = (vehicleId: string): boolean => VEHICLES.some((v) => v.id === vehicleId);

export function defaultDynamics(vehicleId: string): DynamicsConfig {
  return { model: supportsRigid(vehicleId) ? 'sixDof' : 'pointMass', wind: 'calm', seed: 20260919 };
}

export function validateDynamics(value: unknown, vehicleId: string): value is DynamicsConfig {
  if (!value || typeof value !== 'object') return false;
  const d = value as DynamicsConfig;
  return (d.model === 'pointMass' || (d.model === 'sixDof' && supportsRigid(vehicleId)))
    && ['calm', 'crosswind', 'shear'].includes(d.wind)
    && Number.isInteger(d.seed) && d.seed >= 0 && d.seed <= 0xffffffff;
}
