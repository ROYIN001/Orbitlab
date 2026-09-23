import { describe } from 'vitest';
import { deliveredCase } from './delivered-matrix';

describe('six-DOF delivered orbit: the reduced-flux rotational mass-flow model', () => {
  deliveredCase('Falcon 9 / reduced flux / calm');
  deliveredCase('Soyuz-2.1a / reduced flux / calm');
});
