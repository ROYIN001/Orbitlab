/**
 * Vostok-1 in six-DOF, liftoff to landing (roadmap C01): Vostok-K to a
 * 168 × 314 km orbit, once round the Earth, the TDU-1's 40 s retro-fire, the
 * instrument module held on by its cables for ten minutes, the ballistic
 * entry, Gagarin's ejection at 7 km and the sphere down on its parachutes.
 * About a minute and a half.
 */
import { describe, it } from 'vitest';
import { expectFlownVostok1, flyVostok1 } from '../vostok1-harness';

describe('six-DOF Vostok-1', () => {
  it('flies Gagarin once round the Earth and brings the sphere down by the Volga, as flown', { timeout: 900_000 }, () => {
    expectFlownVostok1(flyVostok1('sixDof'));
  });
});
