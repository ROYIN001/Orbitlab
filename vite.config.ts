import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { injectPrecacheManifest, precacheManifest } from './src/pwa/manifest.ts';
import { builtPage } from './scripts/html-comments.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * The build stamp (plan S5), compiled into the page as `__ORBITLAB_BUILD__`
 * (src/build-info.ts): package.json's version and the commit's short SHA,
 * "dev" when git cannot say. No build time here — it goes to build-info.json
 * only — so two builds of one commit give the same bundle.
 */
const buildStamp = {
  version: (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string }).version,
  commit: ((): string => {
    try {
      return execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'dev';
    } catch {
      return 'dev';
    }
  })(),
};

/**
 * Orbitlab as an installable app that works offline (roadmap U03): the build
 * emits `sw.js` beside `index.html`, with a manifest of every other file of
 * the build — the page, its scripts, each Web Worker's bundle, the public
 * textures and icons — each with a content hash, so a deploy that changes a
 * file changes the worker and the browser installs the new version
 * (src/pwa/sw-core.ts). Build only: the dev server never registers a worker
 * (src/pwa/register.ts), so nothing here touches `vite` in development.
 */
/**
 * The page's source comments stay in index.html and leave the built page,
 * which every visitor downloads and the app precaches (D-38 offset for the G2
 * layout fix, F5: about 2.6 kB of the precache code group), and the indentation
 * of every line (about 2 kB more; D-38 offset for redesign A, S0, the owner's
 * answer of 2026-11-14, docs/development/reports/redesign-a.md). Nothing reads a comment node: every
 * comment sits between elements, and nothing in the page is whitespace-
 * sensitive (scripts/html-comments.mjs, tests/verification/html-comments.test.mjs).
 */
function htmlCommentsPlugin(): Plugin {
  return {
    name: 'orbitlab-html-comments',
    apply: 'build',
    transformIndexHtml: { order: 'pre', handler: builtPage },
  };
}

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
      // D-7: the soundtrack is precached only in the intranet zip's build
      sw.code = injectPrecacheManifest(sw.code, precacheManifest(entries, { precacheAudio: process.env.ORBITLAB_PRECACHE_AUDIO === '1' }));
    } },
    // Once the files are on disk (a build with `write: false` never gets
    // here): build-info.json — the stamp, the build time and the date of each
    // data snapshot — and SHA256SUMS over every file, for `sha256sum -c`.
    // Neither is in the precache manifest: the build time would change sw.js
    // on every rebuild of the same commit.
    writeBundle: { order: 'post', handler() {
      const outDir = resolve(config.root, config.build.outDir);
      const asOf = (name: string): string | null => {
        try { return (JSON.parse(readFileSync(join(outDir, 'data', name), 'utf8')) as { asOf?: string }).asOf ?? null; } catch { return null; }
      };
      const epoch = Number(process.env.SOURCE_DATE_EPOCH);
      const info = {
        ...buildStamp,
        builtAt: new Date(Number.isFinite(epoch) && epoch > 0 ? epoch * 1000 : Date.now()).toISOString(),
        data: { spaceWeather: asOf('space-weather.json'), satellites: asOf('satellites.json'), earthOrientation: asOf('earth-orientation.json') },
      };
      writeFileSync(join(outDir, 'build-info.json'), `${JSON.stringify(info, null, 2)}\n`);
      const sums = files(outDir)
        .map((path) => relative(outDir, path).split(sep).join('/'))
        .filter((path) => path !== 'SHA256SUMS')
        .sort()
        .map((path) => `${createHash('sha256').update(readFileSync(join(outDir, path))).digest('hex')}  ${path}\n`);
      writeFileSync(join(outDir, 'SHA256SUMS'), sums.join(''));
    } },
  };
}

/**
 * The twelve Web Workers share their code (EQ-8, M-PLATFORM-033; plan S20-T1,
 * route 1). Build only: each `new Worker(new URL('./x.worker.ts',
 * import.meta.url), …)` becomes an entry chunk of the main build
 * (`emitFile`), kept at `assets/x.worker-<hash>.js` and started as a module
 * worker as before, so the bundler shares code between the workers and with
 * the page as it does between any two entries. Vite's `worker` options cannot
 * do this: Vite bundles each worker by a build of its own, so `worker.format`
 * and a worker's chunking options split a worker only inside its own bundle,
 * and the physics core was paid once per worker. A module that still holds a
 * `new URL(` with `.worker.ts` in it after the rewrite (double quotes, a
 * sub-folder, another form) fails the build, naming the file, so that no
 * worker stays a bundle of its own unnoticed. The development server is left
 * alone and serves each worker from its source.
 */
function sharedWorkersPlugin(): Plugin {
  const re = /new URL\(\s*'(\.\/[\w.-]+\.worker\.ts)'\s*,\s*import\.meta\.url\s*\)/g;
  const left = /new URL\([^)]*\.worker\.ts/;
  return {
    name: 'orbitlab-shared-workers',
    apply: 'build',
    enforce: 'pre',
    async transform(code, id) {
      if (!/\.[cm]?[jt]sx?$/.test(id) || !code.includes('.worker.ts')) return null;
      let out = code;
      for (const m of [...code.matchAll(re)]) {
        const resolved = await this.resolve(m[1], id);
        if (!resolved) continue;
        const ref = this.emitFile({ type: 'chunk', id: resolved.id, name: m[1].slice(2, -3), preserveSignature: false });
        // the call's own line breaks are kept, so the rewrite never changes a line count
        out = out.replace(m[0], `import.meta.ROLLUP_FILE_URL_${ref}${'\n'.repeat(m[0].split('\n').length - 1)}`);
      }
      if (left.test(out)) this.error(`orbitlab-shared-workers: ${relative(root, id)} has a new URL( with .worker.ts that was not made an entry of the build; write it as new URL('./name.worker.ts', import.meta.url)`);
      if (out === code) return null;
      // The file as written, mapped one segment per line: exact at line level since the
      // line count is unchanged, and the build's module comparison then sees the file as written.
      const mappings = ['AAAA', ...Array<string>(out.split('\n').length - 1).fill('AACA')].join(';');
      return { code: out, map: { version: 3, sources: [id], sourcesContent: [code], names: [], mappings } };
    },
  };
}

// Relative base so the build works both locally and under a GitHub Pages
// sub-path (https://<user>.github.io/Orbitlab/).
export default defineConfig({
  base: './',
  plugins: [sharedWorkersPlugin(), htmlCommentsPlugin(), pwaPlugin()],
  define: { __ORBITLAB_BUILD__: JSON.stringify(buildStamp) },
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
    // EQ-6 step 3: the app loads Russian and Thai on demand; the tests have all three dictionaries from the start
    setupFiles: ['src/i18n/all.ts'],
    // tests/probe is gitignored scratch space; tests/heavy and
    // tests/sixdof-fleet run separately (`npm run test:heavy`,
    // `npm run test:sixdof-fleet`) because each case is a complete six-DOF flight.
    exclude: ['**/node_modules/**', 'tests/probe/**', 'tests/heavy/**', 'tests/sixdof-fleet/**'],
    environment: 'node',
  },
});
