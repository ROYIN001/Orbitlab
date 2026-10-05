import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';

// Exercise the real standalone CLI with isolated fixture dist files; never alter the app's dist.
function check(budgets, assets, { log = null, data = {} } = {}) {
  const dir = mkdtempSync(resolve(tmpdir(), 'orbitlab-budget-'));
  try {
    mkdirSync(resolve(dir, 'scripts'), { recursive: true });
    mkdirSync(resolve(dir, 'dist/assets'), { recursive: true });
    copyFileSync('scripts/bundle-budget.mjs', resolve(dir, 'scripts/bundle-budget.mjs'));
    writeFileSync(resolve(dir, 'budgets.json'), typeof budgets === 'string' ? budgets : JSON.stringify(budgets));
    writeFileSync(resolve(dir, 'dist/index.html'), Buffer.alloc(100));
    const entries = [{ url: 'index.html' }];
    for (const [file, size] of Object.entries(assets)) {
      const path = resolve(dir, 'dist/assets', file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, Buffer.alloc(size));
      entries.push({ url: `assets/${file}` });
    }
    for (const [file, size] of Object.entries(data)) {
      const path = resolve(dir, 'dist/data', file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, Buffer.alloc(size));
      entries.push({ url: `data/${file}` });
    }
    const manifest = { version: 'fixture-version', entries };
    writeFileSync(resolve(dir, 'dist/sw.js'), `const manifest = JSON.parse(${JSON.stringify(JSON.stringify(manifest))});\n`);
    const args = [resolve(dir, 'scripts/bundle-budget.mjs')];
    if (log !== null) {
      writeFileSync(resolve(dir, 'fixture-build.log'), log);
      args.push(resolve(dir, 'fixture-build.log'));
    }
    const result = spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8' });
    return { code: result.status, output: result.stdout + result.stderr };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('named hashed, unmatched, nested JS/CSS assets each count once', () => {
  const result = check({ 'index-*.js': 1, 'other chunks': 0.2, precache: 1.3 }, {
    'index-AAAABBBB.js': 400, 'nested/index-CCCCDDDD.js': 600, 'plain.js': 50, 'nested/plain.css': 150,
  });
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /index-\*\.js\s+1\.0\s+1\.0/);
  assert.match(result.output, /other chunks\s+0\.2\s+0\.2/);
  assert.match(result.output, /precache\s+1\.3\s+1\.3/);
  assert.match(result.output, /5 files precached/);
});

test('an unhashed JS file cannot escape the other-chunks ceiling', () => {
  const result = check({ 'index-*.js': 1, 'other chunks': 0.15, precache: 2 }, {
    'index-AAAABBBB.js': 100, 'helper-CCCCDDDD.js': 1, 'plain.js': 200,
  });
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /other chunks\s+0\.2\s+0\.1\s+\+0\.1\s+FAIL/);
});

test('a nested CSS file cannot escape the other-chunks ceiling', () => {
  const result = check({ 'index-*.js': 1, 'other chunks': 0.15, precache: 2 }, {
    'index-AAAABBBB.js': 100, 'helper-CCCCDDDD.js': 1, 'nested/extra.css': 200,
  });
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /other chunks.*FAIL/);
});

test('catalogue splits use their explicit groups while remaining assets stay counted', () => {
  const result = check({ 'i18n-*.js': 1, 'lesson-file-*.js': 0.2, 'catalog-*.js': 0.1, 'other chunks': 0.01, precache: 1.41 }, {
    'i18n-AAAABBBB.js': 1000, 'lesson-file-CCCCDDDD.js': 200, 'catalog-EEEEFFFF.js': 100, 'helper.js': 10,
  });
  assert.equal(result.code, 0, result.output);
  for (const group of ['i18n-*.js', 'lesson-file-*.js', 'catalog-*.js']) assert.ok(result.output.includes(group), result.output);
});

test('a named group disappearing still fails rather than silently removing its gate', () => {
  const result = check({ 'index-*.js': 1, 'other chunks': 1, precache: 2 }, { 'helper.js': 100 });
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /index-\*\.js\s+absent/);
});

test('unknown assets require an other-chunks budget', () => {
  const result = check({ 'index-*.js': 1, precache: 2 }, { 'index-AAAABBBB.js': 100, 'helper.js': 100 });
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /FAIL: no budget in budgets\.json/);
});

test('nonfinite ceilings cannot disable enforcement', () => {
  const result = check('{"other chunks":1e999,"precache":2}', { 'helper.js': 100 });
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /finite positive number/);
});

test('ineffective dynamic imports still fail even when all sizes fit', () => {
  const result = check({ 'other chunks': 1, precache: 2 }, { 'helper.js': 100 }, { log: 'warning: INEFFECTIVE_DYNAMIC_IMPORT\n' });
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /INEFFECTIVE_DYNAMIC_IMPORT warning/);
});

// CO-1 (D-38): the precache split into code and data/ ceilings, through the real CLI.
const split = (code, data, baseline) => ({ 'other chunks': 1, precache: 10, 'precache code': code, 'precache data/': data, _precache_split: { dataBaselineKB: baseline } });

test('the split counts data/ entries apart from code and passes inside both ceilings', () => {
  const result = check(split(0.3, 1, 0.5), { 'helper.js': 100 }, { data: { 'satellites.json': 600 } });
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /precache code\s+0\.2\s+0\.3/);
  assert.match(result.output, /precache data\/\s+0\.6\s+1\.0/);
  assert.match(result.output, /precache\s+0\.8\s+10\.0/);
});

test('code over its ceiling fails as the code ceiling, whatever data does', () => {
  const result = check(split(0.15, 1, 0.5), { 'helper.js': 100 }, { data: { 'satellites.json': 600 } });
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /FAIL: code ceiling/);
  assert.doesNotMatch(result.output, /FAIL: data ceiling/);
});

test('data over its ceiling fails as the data ceiling; past 80 % of headroom only warns', () => {
  const over = check(split(1, 1, 0.5), { 'helper.js': 100 }, { data: { 'satellites.json': 1100 } });
  assert.equal(over.code, 1, over.output);
  assert.match(over.output, /FAIL: data ceiling/);
  assert.doesNotMatch(over.output, /FAIL: code ceiling/);
  const warned = check(split(1, 1, 0.5), { 'helper.js': 100 }, { data: { 'satellites.json': 950 } });
  assert.equal(warned.code, 0, warned.output);
  assert.match(warned.output, /WARNING: precache data\//);
});

test('a half-configured split fails rather than silently dropping its gate', () => {
  const result = check({ 'other chunks': 1, precache: 10, 'precache code': 1 }, { 'helper.js': 100 });
  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /precache data\/" must be a finite positive number/);
});
