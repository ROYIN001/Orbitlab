import { defineConfig } from 'vitest/config';

// The fleet acceptance matrix flown in six-DOF: every accepted vehicle × orbit
// × payload case of tests/fleet-defaults.test.ts, as a rigid body with the
// vehicle's own actuators. About two hours on four cores; run with
// `npm run test:sixdof-fleet`. Results: docs/SIXDOF-ACCEPTANCE.md.
export default defineConfig({
  test: {
    include: ['tests/sixdof-fleet/**/*.test.ts'],
    environment: 'node',
    testTimeout: 3_600_000,
  },
});
