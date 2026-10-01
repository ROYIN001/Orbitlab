/**
 * Vostok-1 recorded in six-DOF from liftoff to Gagarin on the ground (roadmap
 * C01): the longest six-DOF recording and its heaviest frames, the spent
 * stages and then the return's bodies on each, inside the six-DOF frame
 * ceiling and the ~101 MB it is sized for without thinning
 * (src/replay/recorder.ts). Some two minutes.
 */
import { describe, it } from 'vitest';
import { expectVostok1Recording, recordVostok1 } from '../vostok1-recording-harness';

describe('six-DOF Vostok-1 recorded', () => {
  it('keeps the whole flight under the frame ceiling and its memory, the orbit and the way home at their own cadence', { timeout: 900_000 }, () => {
    expectVostok1Recording(recordVostok1('sixDof'), 101e6);
  });
});
