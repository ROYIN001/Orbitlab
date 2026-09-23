import { describe } from 'vitest';
import { sixDofFleet } from './cases';

describe('six-DOF fleet matrix', () => sixDofFleet(['electron', 'longmarch5', 'vegac', 'falcon9']));
