import { describe } from 'vitest';
import { flexibleFleet } from './flex-matrix';

describe('flexible vehicles (roadmap P05): R-7 family, Proton, Angara, Falcon', () => {
  flexibleFleet(['soyuz21a', 'soyuz21b', 'protonm', 'angaraa5', 'falcon9']);
});
