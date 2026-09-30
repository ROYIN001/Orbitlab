/**
 * The viewer missions of group z (starshipFlight5, soyuzT10, apollo11,
 * h2aHayabusa2), flown as the app flies them: Starship Flight 5, the Soyuz
 * T-10-1 pad abort, Apollo 11's ascent and H-IIA's Hayabusa2.
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
  flyGroup('z');
});
