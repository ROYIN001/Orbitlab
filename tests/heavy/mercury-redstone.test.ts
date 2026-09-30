/**
 * Mercury-Redstone 3 in six-DOF, liftoff to splashdown (roadmap C01): the
 * Redstone's 142 s burn, Freedom 7 separated and flown home on its own —
 * retros, entry at 11 g, drogue, main, the Atlantic. Some ten seconds.
 */
import { describe, it } from 'vitest';
import { expectFlownMr3, flyMr3 } from '../mr3-harness';

describe('six-DOF Mercury-Redstone 3', () => {
  it('lobs Freedom 7 to 187 km and brings it down in the Atlantic under its parachutes, as flown', { timeout: 600_000 }, () => {
    expectFlownMr3(flyMr3('sixDof'));
  });
});
