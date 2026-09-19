import type { DynamicsConfig } from '../../types';

export const RIGID_MODEL_VERSION = 'sixdof-1';
export const RIGID_VEHICLES: readonly string[] = ['falcon9', 'soyuz21a'];
export const supportsRigid = (vehicleId: string): boolean => RIGID_VEHICLES.includes(vehicleId);

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
