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
    // tests/probe is gitignored scratch space; tests/heavy and
    // tests/sixdof-fleet run separately (`npm run test:heavy`,
    // `npm run test:sixdof-fleet`) because each case is a complete six-DOF flight.
    exclude: ['**/node_modules/**', 'tests/probe/**', 'tests/heavy/**', 'tests/sixdof-fleet/**'],
    environment: 'node',
  },
});
