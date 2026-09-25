import { describe } from 'vitest';
import { monteCarloSet } from './monte-carlo-matrix';

// Recorded 2026-09-25 (seed 1), after G02's jet deadband: 20/20 in orbit, 19 on target (run 13: the plane not
// corrected, G05 known issue 4). Before it, 0 on target (known issue 5).
describe('Monte Carlo insertion accuracy (roadmap G05)', () => monteCarloSet({
  vehicle: 'falcon9', law: 'peg', runs: 20, navigation: { grade: 'tactical' }, maxLost: 0, maxShort: 0, minOnTarget: 19,
  bands: { perigeeKm: 2, apogeeKm: 2.5, inclinationDeg: 0.01 },
}));
