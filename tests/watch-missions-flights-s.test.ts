/**
 * The viewer missions of group s (soyuzIss, electronSso, soyuzMs10), flown as
 * the app flies them: the Soyuz to the station, Electron to a sun-synchronous
 * orbit and the Soyuz MS-10 abort.
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
  flyFailures(FLIGHT_GROUPS.s);
  flyToTarget(FLIGHT_GROUPS.s);
});
