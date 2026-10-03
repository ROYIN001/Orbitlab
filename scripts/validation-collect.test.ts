import { it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RATING_ORBITS, vehicleById } from '../src/data/vehicles';
import { computedRatings } from '../src/design/ratings';
import { RATING_REFERENCES, type RatingMeasurement } from '../src/validation/report';

// Collection has no assertion that a reference must pass: see report.references.
it('collects the eight authoritative rating comparisons with reproducible flight budgets', () => {
  const rows: RatingMeasurement[] = [];
  for (const id of new Set(RATING_REFERENCES.map(([vehicle]) => vehicle))) {
    const vehicle = vehicleById(id);
    const ratings = computedRatings(vehicle, { maxFlights: 40, timeBudgetMs: Infinity });
    for (const [rowId, rating] of RATING_REFERENCES) {
      if (rowId !== id) continue;
      const measured = ratings[rating];
      rows.push({
        id: `${id} ${rating}`, publishedKg: vehicle[rating], computedKg: measured.kg,
        converged: measured.converged, stoppedBy: measured.stoppedBy, flights: measured.flights,
        failsAtKg: measured.failsAtKg, orbit: measured.orbit,
        catalogueSources: (RATING_ORBITS[id] ?? []).filter(ref => ref.rating === (rating === 'payloadLEO' ? 'LEO' : 'GTO')).map(ref => ref.source),
      });
    }
  }
  const output = resolve(process.env.ORBITLAB_AUDIT_DIR ?? 'tests/browser/artifacts/validation');
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'ratings-evidence.json'), `${JSON.stringify(rows, null, 2)}\n`);
}, 240_000);
