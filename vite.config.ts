import { defineConfig } from 'vite';

// Relative base so the build works both locally and under a GitHub Pages
// sub-path (https://<user>.github.io/Orbitlab/).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
