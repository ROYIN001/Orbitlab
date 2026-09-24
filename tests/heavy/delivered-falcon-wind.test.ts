import { describe } from 'vitest';
import { deliveredCase } from './delivered-matrix';

describe('six-DOF delivered orbit: Falcon 9 in wind', () => {
  deliveredCase('Falcon 9 / quasi-steady / fixed 5 m/s');
  deliveredCase('Falcon 9 / quasi-steady / fixed 10 m/s');
  deliveredCase('Falcon 9 / quasi-steady / shear');
});
