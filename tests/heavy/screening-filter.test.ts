/**
 * The screening's time filter (roadmap M01, P2.5) over the whole sweep: every
 * primary of tests/screening-cases.ts against the bundled catalogue, windows
 * of 1, 3 and 7 days, limits of 1, 5 and 25 km. Each run must give exactly the
 * full search's approaches (the same objects, TCA within 1 ms, miss within
 * 1 mm), the criterion fixed before the comparison was first run. It takes a
 * few minutes (`npm run test:heavy`); tests/screening-filter.test.ts runs a
 * part of it with every `npm test`.
 */
import { describe, it } from 'vitest';
import { compareScreenings, PRIMARIES } from '../screening-cases';

describe('the filtered screening against the full search, the whole sweep (M01, P2.5)', () => {
  it.each(Object.keys(PRIMARIES))('%s', (key) => {
    const { label, self } = PRIMARIES[key]();
    for (const days of [1, 3, 7]) for (const within of [1e3, 5e3, 25e3]) {
      const c = compareScreenings(self, days, within, `${label}, ${days} d, ${within / 1e3} km`);
      // one line per run for the record (docs/VALIDATION.md §7)
      console.log(`${key} ${days} d ${within / 1e3} km: ${c.reference} approaches, both ways; pairs ${c.stats.pairs}, whole ${c.stats.whole}, none ${c.stats.none}; `
        + `${c.ms.reference.toFixed(0)} ms full, ${c.ms.filtered.toFixed(0)} ms filtered`);
    }
  }, 3_600_000);
});
