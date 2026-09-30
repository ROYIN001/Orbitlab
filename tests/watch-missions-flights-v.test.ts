/**
 * The viewer missions of group v (falcon9Bandwagon, soyuzMsDocking,
 * falcon9Demo2, sputnik1), flown as the app flies them: Falcon 9's Bandwagon-1
 * and Crew Demo-2, the Soyuz docking in three hours and Sputnik 1.
 *
 * The flights are split over tests/watch-missions-flights-*.test.ts because
 * vitest runs files in parallel but the tests of one file one after another;
 * in a single file they took about 16 minutes on a CI runner. The groups, the
 * tests and why the files have these names are in tests/watch-missions-flights.ts;
 * tests/watch-missions.test.ts checks that every mission is in exactly one group.
 */
import { describe } from 'vitest';
import { flyGroup } from './watch-missions-flights';

describe('viewer missions', () => {
  flyGroup('v');
});
