import { describe } from 'vitest';
import { flexibleFleet } from './flex-matrix';

describe('flexible vehicles (roadmap P05): Long March, H-IIA, H3', () => {
  flexibleFleet(['longmarch2d', 'longmarch3be', 'longmarch5', 'h2a202', 'h3']);
});
