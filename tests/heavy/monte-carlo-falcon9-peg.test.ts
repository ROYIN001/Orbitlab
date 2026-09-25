import { describe } from 'vitest';
import { monteCarloSet } from './monte-carlo-matrix';

// Recorded 2026-09-25 (seed 1): as the standard guidance, 36/40 in orbit, 33 on target; lost 4 (evt.structuralFailure,
// runs 21, 23, 25, 34); in orbit off target 3 (runs 13, 35, 36). G05, known issues 1 and 4.
describe('Monte Carlo insertion accuracy (roadmap G05)', () => monteCarloSet({
  vehicle: 'falcon9', law: 'peg', runs: 40, maxLost: 4, maxShort: 0, minOnTarget: 33,
  bands: { perigeeKm: 2, apogeeKm: 2.5, inclinationDeg: 0.01 },
}));
