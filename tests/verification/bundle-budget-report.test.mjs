// M-PLAN-020 (R0.4): the bundle budget also reports gzip and brotli sizes, an
// initial-load group and a texture group. They are reported only: no ceiling,
// and the gate's own lines, exit code and messages stay as they were.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

// Run the real CLI on a throwaway dist/ (never the app's): `files` maps a path under dist/ to its bytes;
// the precache manifest names every file except those listed in `notPrecached`.
function budget(budgets, files, { notPrecached = [], log = null } = {}) {
  const dir = mkdtempSync(resolve(tmpdir(), 'orbitlab-budget-report-'));
  try {
    mkdirSync(resolve(dir, 'scripts'), { recursive: true });
    mkdirSync(resolve(dir, 'dist/assets'), { recursive: true });
    copyFileSync('scripts/bundle-budget.mjs', resolve(dir, 'scripts/bundle-budget.mjs'));
    writeFileSync(resolve(dir, 'budgets.json'), JSON.stringify(budgets));
    const entries = [];
    for (const [path, bytes] of Object.entries(files)) {
      mkdirSync(dirname(resolve(dir, 'dist', path)), { recursive: true });
      writeFileSync(resolve(dir, 'dist', path), bytes);
      if (!notPrecached.includes(path)) entries.push({ url: path });
    }
    const manifest = { version: 'fixture-version', entries };
    writeFileSync(resolve(dir, 'dist/sw.js'), `const manifest = JSON.parse(${JSON.stringify(JSON.stringify(manifest))});\n`);
    const args = [resolve(dir, 'scripts/bundle-budget.mjs')];
    if (log !== null) {
      writeFileSync(resolve(dir, 'fixture-build.log'), log);
      args.push(resolve(dir, 'fixture-build.log'));
    }
    // Without GITHUB_ACTIONS: on CI the gate also prints `::warning` annotations, which the expected text leaves out.
    const result = spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: '' } });
    return { code: result.status, stdout: result.stdout, stderr: result.stderr, output: result.stdout + result.stderr };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// Deterministic text that compresses like code: gzip and brotli both shrink it, by different amounts.
function code(bytes, seed) {
  const words = ['const', 'orbit', 'thrust', 'stage', '=', '(', ')', '{', '}', 'return', 'apogee', 'mass', '0.5', 'if', 'vehicle'];
  let x = seed, s = '';
  while (s.length < bytes) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    s += words[(x >>> 8) % words.length] + ((x >>> 4) % 9 === 0 ? ';\n' : ' ');
  }
  return Buffer.from(s.slice(0, bytes));
}

// What the report must print for a group of files: raw, gzip -9 and brotli q11, each file compressed alone.
const kB = (bytes) => (bytes / 1000).toFixed(1);
const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const br = (buf) => brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
const sum = (bufs, size) => bufs.reduce((total, buf) => total + size(buf), 0);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
function row(group, bufs, { compressed = true } = {}) {
  const raw = sum(bufs, (b) => b.length);
  const [g, b] = compressed ? [sum(bufs, gz), sum(bufs, br)] : [raw, raw];
  return new RegExp(`^${escape(group)}\\s+${bufs.length}\\s+${escape(kB(raw))}\\s+${escape(kB(g))}\\s+${escape(kB(b))}$`, 'm');
}

// ceilings far above every fixture, so the gate passes and only the report is under test
const roomy = (...groups) => Object.fromEntries([...groups, 'precache'].map((group) => [group, 10_000]));

test('the initial load is the page and every script, module preload and stylesheet it links, read from dist/index.html', () => {
  const html = Buffer.from([
    '<!doctype html><html><head>',
    '<!-- <script type="module" src="./assets/old-ZZZZYYYY.js"></script> -->',
    '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'%3E%3C/svg%3E" />',
    '<link rel="manifest" href="./manifest.webmanifest" />',
    '<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png" />',
    '<script type="module" crossorigin src="./assets/index-AAAABBBB.js"></script>',
    '<link rel="modulepreload" crossorigin href="./assets/i18n-CCCCDDDD.js">',
    '<link rel="modulepreload" crossorigin href="./assets/download-EEEEFFFF.js">',
    '<link rel="stylesheet" crossorigin href="./assets/index-GGGGHHHH.css">',
    '<script src="https://example.org/analytics.js"></script>',
    '</head><body><script>window.inline = 1;</script></body></html>',
  ].join('\n'));
  const index = code(30_000, 1), i18n = code(20_000, 2), download = code(2_000, 3), css = code(5_000, 4), lazy = code(10_000, 5);
  const result = budget(roomy('index-*.js', 'i18n-*.js', 'index-*.css', 'other chunks'), {
    'index.html': html,
    'assets/index-AAAABBBB.js': index,
    'assets/i18n-CCCCDDDD.js': i18n,
    'assets/download-EEEEFFFF.js': download,
    'assets/index-GGGGHHHH.css': css,
    'assets/lazy-IIIIJJJJ.js': lazy,
    'manifest.webmanifest': Buffer.from('{}'),
    'icons/apple-touch-icon.png': Buffer.alloc(500),
  });
  assert.equal(result.code, 0, result.output);
  // the page, then what it links in its order; the lazy chunk, the manifest, the icons and the other origin are not part of it
  assert.match(result.stdout, row('initial load', [html, index, i18n, download, css]), result.stdout);
  assert.match(result.stdout, /^\(initial load: index\.html, assets\/index-AAAABBBB\.js, assets\/i18n-CCCCDDDD\.js, assets\/download-EEEEFFFF\.js, assets\/index-GGGGHHHH\.css\)$/m);
});

test('every group gets gzip and brotli columns, each file compressed alone at the maximum level', () => {
  const index = code(40_000, 6), a = code(15_000, 7);
  const html = Buffer.from('<script type="module" src="./assets/index-AAAABBBB.js"></script>');
  // two identical chunks: compressed together they would shrink to about one; alone, each counts in full
  const result = budget(roomy('index-*.js', 'other chunks'), { 'index.html': html, 'assets/index-AAAABBBB.js': index, 'assets/a.js': a, 'assets/b.js': a });
  assert.equal(result.code, 0, result.output);
  assert.match(result.stdout, row('index-*.js', [index]), result.stdout);
  assert.match(result.stdout, row('other chunks', [a, a]), result.stdout);
  assert.match(result.stdout, row('precache', [html, index, a, a]), result.stdout);
  assert.match(result.stdout, /^group\s+files\s+raw kB\s+gzip kB\s+brotli kB$/m);
});

test('the texture group is every file under textures/, precached or not; JPEG and PNG count at their raw size', () => {
  // zeros would compress to almost nothing: counting them raw shows the images are sent as they are
  const atmos = Buffer.alloc(12_000), clouds = Buffer.alloc(9_000), normal = Buffer.alloc(3_000);
  const result = budget(roomy('index-*.js'), {
    'index.html': Buffer.from(''),
    'assets/index-AAAABBBB.js': code(1_000, 8),
    'textures/earth_atmos_2048.jpg': atmos,
    'textures/earth_clouds_4096.jpg': clouds,
    'textures/sub/earth_normal_2048.png': normal,
  }, { notPrecached: ['textures/earth_clouds_4096.jpg'] });
  assert.equal(result.code, 0, result.output);
  assert.match(result.stdout, row('textures', [atmos, clouds, normal], { compressed: false }), result.stdout);
});

test('the report never fails: no ceiling for its groups, and an absent group is only reported', () => {
  const big = code(400_000, 9);
  const result = budget(roomy('index-*.js'), {
    'index.html': Buffer.from('<script type="module" src="./assets/index-AAAABBBB.js"></script><link rel="stylesheet" href="./assets/gone-AAAABBBB.css">'),
    'assets/index-AAAABBBB.js': big,
  });
  assert.equal(result.code, 0, result.output);
  assert.match(result.stdout, /^textures\s+0\s+absent$/m, result.stdout);
  // a linked file that is not in dist/ is named, not counted
  assert.match(result.stdout, /^\(initial load: index\.html, assets\/index-AAAABBBB\.js; not in dist\/: assets\/gone-AAAABBBB\.css\)$/m, result.stdout);
  assert.doesNotMatch(result.output, /FAIL/);
  assert.match(result.stdout, /bundle budget: ok\n$/);
});

// The gate's lines, exactly as scripts/bundle-budget.mjs printed them before M-PLAN-020 (recorded on 4de951f with this fixture).
const GATE_STDOUT = [
  'group           size kB  budget kB  overrun kB',
  '--------------  -------  ---------  ----------  -----------------------------------------------',
  'index-*.js          0.3        0.1        +0.2  FAIL',
  'catalog-*.js     absent        1.0              FAIL: no such file; rename or remove the budget',
  'precache            1.4       10.0        -8.6  ok',
  'precache code       0.5        5.0        -4.5  ok',
  'precache data/      0.9        1.0        -0.1  ok (warning: over 80 % of data headroom)',
  'other chunks        0.1          -              FAIL: no budget in budgets.json',
  '(4 files precached, manifest fixture-version; 0.5 kB code + 0.9 kB under data/, data baseline 0.5 kB)',
  'WARNING: precache data/ is 0.9 kB: 0.4 of its 0.5 kB headroom (90 %) is used, more than 80 %; ask for the data ceiling to be reviewed before it fails a release',
  'FAIL: the build log has 1 INEFFECTIVE_DYNAMIC_IMPORT warning(s): make those imports static',
  '',
].join('\n');
const GATE_STDERR = 'bundle budget: FAILED. A ceiling is raised only with the reason written in budgets.json _notes.\n';

test('the gate is unchanged: its lines, messages and exit code are as before, with the report between them', () => {
  const result = budget({
    'index-*.js': 0.1, 'catalog-*.js': 1, precache: 10, 'precache code': 5, 'precache data/': 1, _precache_split: { dataBaselineKB: 0.5 },
  }, {
    'index.html': Buffer.alloc(100),
    'assets/index-AAAABBBB.js': Buffer.alloc(300),
    'assets/helper.js': Buffer.alloc(100),
    'data/satellites.json': Buffer.alloc(950),
  }, { log: 'warning: INEFFECTIVE_DYNAMIC_IMPORT\n' });
  assert.equal(result.code, 1, result.output);
  assert.equal(result.stderr, GATE_STDERR);
  const lines = result.stdout.split('\n');
  const start = lines.findIndex((l) => l.startsWith('report only'));
  assert.ok(start > 0, result.stdout);
  const end = lines.findIndex((l, i) => i > start && l.startsWith('FAIL: the build log'));
  assert.ok(end > start, result.stdout);
  assert.equal([...lines.slice(0, start), ...lines.slice(end)].join('\n'), GATE_STDOUT);
});

test('initialLoad reads the tags as HTML does: quotes, comments, queries, duplicates, other origins', async () => {
  const { initialLoad } = await import('../../scripts/bundle-budget.mjs');
  assert.equal(typeof initialLoad, 'function');
  assert.deepEqual(initialLoad(''), ['index.html']);
  assert.deepEqual(initialLoad([
    '<!--<script src="./assets/commented.js"></script>-->',
    "<script type='module' src='./assets/index-A.js?v=1#x'></script>",
    '<link rel=modulepreload href=./assets/i18n-B.js>',
    '<link rel="preload" as="image" href="/textures/earth.jpg">',
    '<link data-note="a > b" rel="stylesheet" href="./assets/index-C.css">',
    '<link rel="modulepreload" href="./assets/index-A.js">',
    '<link rel="icon" href="./icons/icon.svg"><link rel="manifest" href="./manifest.webmanifest">',
    '<script src="//cdn.example.org/x.js"></script><script src="https://example.org/y.js"></script>',
    '<link rel="stylesheet" href="data:text/css,body{}"><script>inline()</script>',
  ].join('\n')), ['index.html', 'assets/index-A.js', 'assets/i18n-B.js', 'textures/earth.jpg', 'assets/index-C.css']);
});
