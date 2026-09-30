/**
 * The viewer missions of group f (ariane6AmazonLeo, soyuzMs16, vostok1), flown
 * as the app flies them: Ariane 6's Amazon Leo launch, Soyuz MS-16 and Vostok
 * 1.
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
  flyGroup('f');
});
