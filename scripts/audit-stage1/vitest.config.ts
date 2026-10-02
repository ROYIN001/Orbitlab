import { defineConfig } from 'vitest/config';

// Optional evidence-generating diagnostics; deliberately outside the normal test suite.
export default defineConfig({
  test: {
    include: ['scripts/audit-stage1/*.test.ts'],
    environment: 'node',
    maxWorkers: 1,
    testTimeout: 120_000,
  },
});
