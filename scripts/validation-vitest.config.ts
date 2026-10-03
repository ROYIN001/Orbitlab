import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/audit-stage1/*.test.ts', 'scripts/validation-collect.test.ts'],
    environment: 'node', maxWorkers: 1, testTimeout: 240_000,
  },
});
