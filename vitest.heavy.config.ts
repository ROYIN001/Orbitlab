import { defineConfig } from 'vitest/config';

// Complete six-DOF flights that take minutes each: the delivered-orbit matrix
// and anything else too slow for every `npm test`. Run with `npm run test:heavy`.
export default defineConfig({
  test: {
    include: ['tests/heavy/**/*.test.ts'],
    environment: 'node',
  },
});
