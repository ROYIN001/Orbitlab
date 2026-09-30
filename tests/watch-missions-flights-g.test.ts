/**
 * The viewer missions of group g (soyuzMs25, falcon9Orbcomm2,
 * angaraA5Flight1), flown as the app flies them: Soyuz MS-25, Falcon 9's
 * ORBCOMM OG2 flight 2 and Angara-A5's first flight.
 *
 * The flights are split over tests/watch-missions-flights-*.test.ts because
 * vitest runs files in parallel but the tests of one file one after another;
 * in a single file they took about 16 minutes on a CI runner. The groups, the
 * tests and why the files have these names are in tests/watch-missions-flights.ts;
 * tests/watch-missions.test.ts checks that every mission is in exactly one group.
 */
import { describe } from 'vitest';
import { FLIGHT_GROUPS, flyFailures, flyToTarget } from './watch-missions-flights';

describe('viewer missions', () => {
  flyFailures(FLIGHT_GROUPS.g);
  flyToTarget(FLIGHT_GROUPS.g);
});
