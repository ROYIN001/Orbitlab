import { describe } from 'vitest';
import { sixDofFleet } from './cases';

describe('six-DOF fleet matrix', () => sixDofFleet(['ariane64', 'h2a202', 'protonm', 'starship']));
