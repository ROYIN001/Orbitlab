import { describe } from 'vitest';
import { deliveredCase } from './delivered-matrix';

describe('six-DOF delivered orbit: Soyuz-2.1a in wind', () => {
  deliveredCase('Soyuz-2.1a / quasi-steady / crosswind');
  deliveredCase('Soyuz-2.1a / quasi-steady / shear');
});
