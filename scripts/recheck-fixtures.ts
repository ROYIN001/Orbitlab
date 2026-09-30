/**
 * Write the re-check fixtures ONCE (roadmap T02; Phase 4 map §4.2):
 *
 *   node --experimental-strip-types scripts/recheck-fixtures.ts
 *
 * It flies the records live, keeps them in a results file and checks that
 * file in Node (tests/recheck-fixture-build.ts says what each file holds),
 * then writes tests/fixtures/recheck/{scenario.orbitlab-lesson.json,
 * results.orbitlab-results.json,expected.json}. The app's modules are
 * TypeScript with extensionless imports, so they are loaded through Vite's
 * own module runner (the same transform the tests use), not by Node.
 *
 * The files are committed and read by tests/recheck.test.ts (`?raw`) and
 * tests/browser/journeys/recheck.mjs; `expected.json` is never a snapshot and
 * this script refuses to overwrite it. A test that misses records the miss;
 * regenerating to hide one is not allowed (`--force` exists only for a
 * deliberate change of the fixture itself, said in its commit).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = join(root, 'tests/fixtures/recheck');
const expectedPath = join(dir, 'expected.json');
if (existsSync(expectedPath) && !process.argv.includes('--force')) {
  console.error(`${expectedPath} exists: the fixtures are written once (see the header). Pass --force only to change the fixture on purpose.`);
  process.exit(1);
}

const server = await createServer({ root, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false } });
try {
  const mod = await server.ssrLoadModule('/tests/recheck-fixture-build.ts') as typeof import('../tests/recheck-fixture-build.ts');
  const f = await mod.buildRecheckFixtures();
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'scenario.orbitlab-lesson.json'), f.scenario);
  writeFileSync(join(dir, mod.RESULTS_NAME), `${JSON.stringify(f.results, null, 2)}\n`);
  writeFileSync(expectedPath, `${JSON.stringify(f.expected, null, 2)}\n`);
  console.log(`wrote ${dir}: ${f.expected.records.map((r) => `${r.lessonId}/${r.which.join('+')} ${r.status}`).join(', ')}`);
} finally {
  await server.close();
}
