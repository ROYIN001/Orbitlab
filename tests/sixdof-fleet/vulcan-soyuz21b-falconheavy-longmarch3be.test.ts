import { describe } from 'vitest';
import { sixDofFleet } from './cases';

describe('six-DOF fleet matrix', () => sixDofFleet(['vulcan', 'soyuz21b', 'falconheavy', 'longmarch3be']));
