import { describe } from 'vitest';
import { explicitFleet } from './explicit-matrix';

describe('PEG and IGM (roadmap G01): R-7 family, Proton, Angara, Falcon, Atlas, Vulcan', () => {
  explicitFleet(['soyuz21b', 'protonm', 'angaraa5', 'falcon9', 'falconheavy', 'atlasv551', 'vulcan']);
});
