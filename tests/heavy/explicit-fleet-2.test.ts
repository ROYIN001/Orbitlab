import { describe } from 'vitest';
import { explicitFleet } from './explicit-matrix';

describe('PEG and IGM (roadmap G01): Ariane, Vega, Long March, H-IIA, H3, PSLV, Electron, Starship', () => {
  explicitFleet(['ariane64', 'vegac', 'longmarch3be', 'h2a202', 'longmarch5', 'h3', 'pslvxl', 'electron', 'starship']);
});
