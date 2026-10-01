/**
 * Write the lesson packs the app ships (roadmap T03):
 *
 *   node --experimental-strip-types scripts/lesson-packs.ts           write them
 *   node --experimental-strip-types scripts/lesson-packs.ts --check   only compare
 *
 * Each pack's source is src/lessons/pack-sources/<id>.ts; its file is
 * public/lessons/packs/<id>.orbitlab-lesson.json, which the service worker
 * precaches with the rest of public/ and the lessons page fetches. The app's
 * modules are TypeScript with extensionless imports, so they are loaded
 * through Vite's own module runner (as scripts/recheck-fixtures.ts does).
 * tests/lesson-packs.test.ts fails when a committed file differs from what
 * this writes, so a change to a pack's source is followed by a run of this.
 * A pack whose lessons do not read cleanly is not written.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = join(root, 'public/lessons/packs');
const check = process.argv.includes('--check');

const server = await createServer({ root, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false } });
let failed = false;
try {
  const sources = await server.ssrLoadModule('/src/lessons/pack-sources/index.ts') as typeof import('../src/lessons/pack-sources/index.ts');
  const packs = await server.ssrLoadModule('/src/lessons/packs.ts') as typeof import('../src/lessons/packs.ts');
  if (!check) mkdirSync(dir, { recursive: true });
  for (const id of packs.BUNDLED_PACKS) {
    const { text, issues } = sources.packFileText(id);
    const path = join(root, 'public', packs.packPath(id));
    if (issues.length) {
      console.error(`${id}: not written, its lessons do not read cleanly:\n${issues.map((i) => `  ${i.where}: ${i.code}${i.detail ? ` (${i.detail})` : ''}`).join('\n')}`);
      failed = true;
      continue;
    }
    const same = existsSync(path) && readFileSync(path, 'utf8') === text;
    if (check) {
      console.log(`${id}: ${same ? 'up to date' : 'DIFFERS'}`);
      if (!same) failed = true;
    } else if (!same) {
      writeFileSync(path, text);
      console.log(`${id}: written (${text.length} characters)`);
    } else console.log(`${id}: unchanged`);
  }
} finally {
  await server.close();
}
if (failed) process.exit(1);
