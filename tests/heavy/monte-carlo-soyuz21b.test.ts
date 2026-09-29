import { describe } from 'vitest';
import { monteCarloSet } from './monte-carlo-matrix';

// Recorded 2026-09-25 (seed 1): 24/30 in orbit and on target; lost 6: evt.aeroBreakup (q·α, runs 1, 20, 23) and
// evt.outOfPropellant (runs 12, 16, 25). G05, known issues 2 and 3.
describe('Monte Carlo insertion accuracy (roadmap G05)', () => monteCarloSet({
  vehicle: 'soyuz21b', law: 'standard', runs: 30, maxLost: 6, maxShort: 0, minOnTarget: 24,
  bands: { perigeeKm: 8, apogeeKm: 8, inclinationDeg: 0.03 },
}));
