import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { posix, ROOT, sourceIdentity, walk } from '../../scripts/verification/lib.mjs';

const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
const pages = readFileSync('.github/workflows/deploy.yml', 'utf8');
const consumed = ['docs/ROADMAP-PART2-3.md', 'docs/SIXDOF-VEHICLE-DATA.md', 'docs/history/phase4-2026-10-01/T03-CURRICULA-RESEARCH.md'];

function eventPaths(source, event) {
  const lines = source.split('\n');
  const start = lines.indexOf(`  ${event}:`);
  assert.ok(start >= 0, `Missing ${event} event`);
  const paths = [];
  let inPaths = false;
  for (const line of lines.slice(start + 1)) {
    if (line.trim() && !line.startsWith('    ')) break;
    if (line === '    paths:') { inPaths = true; continue; }
    if (inPaths && line.trim()) {
      const match = /^      - '([^']+)'$/.exec(line);
      if (!match) break;
      paths.push(match[1]);
    }
  }
  return paths;
}
function selected(paths, file) {
  let matches = false;
  for (const pattern of paths) {
    if (pattern === '**') matches = true;
    else if (pattern === '!**/*.md' && file.endsWith('.md')) matches = false;
    else if (pattern === file) matches = true;
  }
  return matches;
}

test('CI PR, branch push and Pages main push use the same ordered Markdown policy', () => {
  const expected = ['**', '!**/*.md', ...consumed];
  assert.deepEqual(eventPaths(ci, 'pull_request'), expected);
  assert.deepEqual(eventPaths(ci, 'push'), expected);
  assert.deepEqual(eventPaths(pages, 'push'), expected);
  assert.match(pages, /push:\n    branches: \[main\]/);
});

test('reports alone skip while all consumed Markdown and non-Markdown evidence remain gated', () => {
  for (const paths of [eventPaths(ci, 'pull_request'), eventPaths(ci, 'push'), eventPaths(pages, 'push')]) {
    for (const file of ['README.md', 'docs/development/PROGRESS.md', 'docs/development/reports/released.md']) assert.equal(selected(paths, file), false, file);
    for (const file of [...consumed, 'src/physics/sim/rendezvous.ts', 'public/data/satellites.json', 'docs/history/live-evidence.json', 'docs/plot.png', '.github/workflows/deploy.yml']) assert.equal(selected(paths, file), true, file);
    assert.equal(['docs/development/reports/released.md', 'src/main.ts'].some(file => selected(paths, file)), true, 'Mixed source/report commit remains gated');
  }
});

test('every current literal Markdown import is explicitly gated and included in source provenance', () => {
  const actual = new Set();
  for (const dir of ['src', 'tests', 'scripts']) for (const file of walk(resolve(ROOT, dir))) {
    if (!/\.(?:ts|mjs)$/.test(file) || file.includes('/tests/probe/') || file.includes('/tests/browser/artifacts/')) continue;
    const source = readFileSync(file, 'utf8');
    const patterns = [/(?:\bfrom\s+|\bimport\s+)(['"])([^'"]+\.md)(?:\?[^'"]*)?\1/g, /import\.meta\.glob\(\s*(['"])([^'"]+\.md)(?:\?[^'"]*)?\1/g];
    for (const pattern of patterns) for (const match of source.matchAll(pattern)) actual.add(posix(relative(ROOT, resolve(dirname(file), match[2]))));
  }
  assert.deepEqual([...actual].sort(), [...consumed].sort(), 'Review newly imported Markdown before updating the allowlist');
  const files = new Set(sourceIdentity().files.map(entry => entry.file));
  for (const file of actual) {
    assert.ok(eventPaths(ci, 'pull_request').includes(file), file);
    assert.ok(eventPaths(pages, 'push').includes(file), file);
    assert.ok(files.has(file), `Missing provenance input ${file}`);
  }
});

test('scheduled and manual Pages refresh keep their full unfiltered entry points', () => {
  assert.match(pages, /schedule:\n    - cron: '43 17 \* \* \*'/);
  assert.match(pages, /^  workflow_dispatch:\s*$/m);
  assert.deepEqual(eventPaths(pages, 'schedule'), []);
  assert.deepEqual(eventPaths(pages, 'workflow_dispatch'), []);
});

test('cheap repository hygiene runs before collection or downstream expensive gates', () => {
  for (const source of [ci, pages]) {
    const verify = source.indexOf('run: node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs');
    const hygiene = source.indexOf('name: Repository hygiene preflight');
    const command = source.indexOf('run: npx vitest run tests/repo-hygiene.test.ts');
    const collect = source.indexOf('run: node scripts/verification/create-plan.mjs');
    assert.ok(verify >= 0 && hygiene > verify && command > hygiene && collect > command);
    assert.ok(source.indexOf('run: npm ci') < verify);
  }
  assert.match(pages, /name: Repository hygiene preflight\n        if: steps\.coordinate\.outputs\.proceed == 'true'\n        run: npx vitest run tests\/repo-hygiene\.test\.ts/);
  assert.deepEqual(eventPaths(ci, 'pull_request'), eventPaths(pages, 'push'));
});

test('each workflow runs exactly the browser shards its plan creates', () => {
  // create-plan.mjs: PR CI runs the smoke journeys in two shards, Pages every journey in three
  const plan = readFileSync('scripts/verification/create-plan.mjs', 'utf8');
  assert.match(plan, /const browserShards = mode === 'pages' \? 3 : 2;/);
  for (const [source, name, shards] of [[ci, 'browser-smoke', 2], [pages, 'browser', 3]]) {
    const start = source.indexOf(`\n  ${name}:\n`);
    assert.ok(start >= 0, `Missing ${name} job`);
    const job = source.slice(start, source.indexOf('\n  verify:\n', start));
    const list = Array.from({ length: shards }, (_, i) => i + 1).join(', ');
    assert.ok(job.includes(`        shard: [${list}]`), `browser matrix should be [${list}]`);
    assert.ok(job.includes(`run: node scripts/verification/run-browser.mjs browser-\${{ matrix.shard }}of${shards}`));
    assert.ok(job.includes(`browser-\${{ matrix.shard }}of${shards}.report.json`));
  }
});
