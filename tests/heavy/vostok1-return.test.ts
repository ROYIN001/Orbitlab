/**
 * Vostok-1 in six-DOF, liftoff to Gagarin on the ground (roadmap C01):
 * Vostok-K to a 168 × 314 km orbit, once round the Earth, the TDU-1's 40 s
 * retro-fire that ran out of fuel at 132 m/s, the instrument module on until
 * the thermal sensors' backup ten minutes later, then breaking up and
 * burning on its own, the ballistic entry, Gagarin's ejection at 7 km, the
 * sphere down on its parachutes and he on his own a few minutes later.
 * About a minute and a half.
 */
import { describe, it } from 'vitest';
import { expectFlownVostok1, flyVostok1 } from '../vostok1-harness';

describe('six-DOF Vostok-1', () => {
  it('flies Gagarin once round the Earth and brings him and the sphere down by the Volga, as flown', { timeout: 900_000 }, () => {
    expectFlownVostok1(flyVostok1('sixDof'));
  });
});
