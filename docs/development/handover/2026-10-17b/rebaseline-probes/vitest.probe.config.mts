import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/probe/**/*.test.ts'], environment: 'node', testTimeout: 7_200_000 } });
