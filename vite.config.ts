import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { injectPrecacheManifest, precacheManifest } from './src/pwa/manifest.ts';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * Orbitlab as an installable app that works offline (roadmap U03): the build
 * emits `sw.js` beside `index.html`, with a manifest of every other file of
 * the build — the page, its scripts, each Web Worker's bundle, the public
 * textures and icons — each with a content hash, so a deploy that changes a
 * file changes the worker and the browser installs the new version
 * (src/pwa/sw-core.ts). Build only: the dev server never registers a worker
 * (src/pwa/register.ts), so nothing here touches `vite` in development.
 */
function pwaPlugin(): Plugin {
  let config: ResolvedConfig;
  const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
  const revision = (content: string | Uint8Array): string => createHash('sha256').update(content).digest('hex').slice(0, 16);
  return {
    name: 'orbitlab-pwa',
    apply: 'build',
    configResolved(resolved) { config = resolved; },
    // after Vite's own HTML plugin has emitted index.html
    generateBundle: { order: 'post', handler(_options, bundle) {
      const sw = bundle['sw.js'];
      if (!sw || sw.type !== 'chunk') throw new Error('orbitlab-pwa: the build did not emit sw.js');
      const entries = Object.values(bundle)
        .filter((out) => out.fileName !== 'sw.js')
        .map((out) => ({ url: out.fileName, revision: revision(out.type === 'chunk' ? out.code : out.source) }));
      if (config.publicDir) {
        for (const path of files(config.publicDir)) {
          entries.push({ url: relative(config.publicDir, path).split(sep).join('/'), revision: revision(readFileSync(path)) });
        }
      }
      sw.code = injectPrecacheManifest(sw.code, precacheManifest(entries));
    } },
  };
}

// Relative base so the build works both locally and under a GitHub Pages
// sub-path (https://<user>.github.io/Orbitlab/).
export default defineConfig({
  base: './',
  plugins: [pwaPlugin()],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      // the service worker is an entry of its own, at the root so its scope is the whole app
      input: { index: join(root, 'index.html'), sw: join(root, 'src/pwa/sw.ts') },
      output: { entryFileNames: (chunk) => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js') },
    },
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
