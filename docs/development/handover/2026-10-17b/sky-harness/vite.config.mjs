// Builds the harness page against one checkout's src/ (WT=<checkout>), into out/<LABEL>/.
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
const wt = process.env.WT;
if (!wt) throw new Error('set WT to the checkout to build against');
export default defineConfig({
  root: import.meta.dirname,
  base: './',
  publicDir: false,
  resolve: { alias: { '@src': resolve(wt, 'src') } },
  define: { __ORBITLAB_BUILD__: JSON.stringify({ version: 'harness', commit: 'harness' }), __NOAERIAL__: JSON.stringify(process.env.NOAERIAL === '1') },
  build: { outDir: resolve(import.meta.dirname, 'out', process.env.LABEL ?? 'x'), emptyOutDir: true, target: 'es2022', minify: true },
  worker: { format: 'es' },
});
