import { describe } from 'vitest';
import { flexibleFleet } from './flex-matrix';

describe('flexible vehicles (roadmap P05): Falcon Heavy, Atlas V, Vulcan, Ariane 6, Vega-C', () => {
  flexibleFleet(['falconheavy', 'atlasv551', 'vulcan', 'ariane64', 'vegac']);
});
