#!/usr/bin/env node
/**
 * The bundle budget: the size of what `npx vite build` wrote to dist/,
 * checked against the ceilings in budgets.json at the repository root.
 *
 *   npx vite build 2>&1 | tee build.log
 *   node scripts/bundle-budget.mjs [build.log]      (or: npm run budget)
 *
 * Groups, in kB of 1000 bytes, raw (not gzip) sizes:
 *   - each chunk in dist/assets named after its prefix, the hash dropped:
 *     `index-*.js`, `index-*.css`, `i18n-*.js`, every `<name>.worker-*.js` …
 *     when budgets.json names that group;
 *   - `other chunks`: every other *.js and *.css in dist/assets, together;
 *   - `precache`: every file the service worker downloads on install, read
 *     back from the manifest the build writes into dist/sw.js
 *     (src/pwa/manifest.ts, `injectPrecacheManifest`).
 *
 * The optional argument is a saved log of the Vite build: the check also fails
 * when it contains INEFFECTIVE_DYNAMIC_IMPORT — an `await import()` of a
 * module that is imported statically elsewhere, which splits nothing.
 *
 * Prints the table either way; exits 1 when a group is over its ceiling, a
 * group named in budgets.json has no file, or the log shows the warning.
 * Ceilings only ratchet down: see budgets.json's `_notes`.
 *
 * Plain Node, no dependencies.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const ASSETS = join(DIST, 'assets');
const OTHER = 'other chunks';
const PRECACHE = 'precache';

const kB = (bytes) => bytes / 1000;
const fmt = (n) => n.toFixed(1);

function fail(message) {
  console.error(`bundle budget: ${message}`);
  process.exit(1);
}

/** `index-C_bwFgA7.js` → `index-*.js`; `monte-carlo.worker-DA3Ow2wV.js` → `monte-carlo.worker-*.js`. */
function chunkGroup(file) {
  const m = /^(.+)-[\w-]{8}\.(js|css)$/.exec(file);
  return m ? `${m[1]}-*.${m[2]}` : null;
}

/** The precache manifest written into the built worker, parsed back. */
function precacheManifest(swCode) {
  for (const m of swCode.matchAll(/JSON\.parse\(("(?:[^"\\]|\\.)*")\)/g)) {
    let value;
    try { value = JSON.parse(JSON.parse(m[1])); } catch { continue; }
    if (value && typeof value.version === 'string' && Array.isArray(value.entries)) return value;
  }
  return null;
}

const budgetsPath = join(ROOT, 'budgets.json');
if (!existsSync(budgetsPath)) fail('budgets.json is missing');
const budgets = Object.fromEntries(
  Object.entries(JSON.parse(readFileSync(budgetsPath, 'utf8'))).filter(([key]) => !key.startsWith('_')),
);
for (const [group, ceiling] of Object.entries(budgets)) {
  if (typeof ceiling !== 'number' || !(ceiling > 0)) fail(`budgets.json: "${group}" must be a positive number of kB`);
}

if (!existsSync(ASSETS) || !existsSync(join(DIST, 'sw.js'))) fail('dist/ is missing or incomplete: run `npx vite build` first');

// chunk groups
const sizes = new Map();
for (const file of readdirSync(ASSETS).sort()) {
  const group = chunkGroup(file);
  if (!group) continue;
  const key = group in budgets ? group : OTHER;
  sizes.set(key, (sizes.get(key) ?? 0) + statSync(join(ASSETS, file)).size);
}

// precache total
const manifest = precacheManifest(readFileSync(join(DIST, 'sw.js'), 'utf8'));
if (!manifest) fail('no precache manifest found in dist/sw.js (src/pwa/manifest.ts writes it as JSON.parse("…"))');
let precacheBytes = 0;
for (const entry of manifest.entries) {
  const path = join(DIST, entry.url);
  if (!existsSync(path)) fail(`the precache manifest names ${entry.url}, which is not in dist/`);
  precacheBytes += statSync(path).size;
}
sizes.set(PRECACHE, precacheBytes);

// the table
const rows = [];
let over = false;
for (const [group, ceiling] of Object.entries(budgets)) {
  const bytes = sizes.get(group);
  if (bytes === undefined) {
    rows.push([group, 'absent', fmt(ceiling), '', 'FAIL: no such file; rename or remove the budget']);
    over = true;
    continue;
  }
  const size = kB(bytes);
  const overrun = size - ceiling;
  if (overrun > 0) over = true;
  rows.push([group, fmt(size), fmt(ceiling), overrun > 0 ? `+${fmt(overrun)}` : fmt(overrun), overrun > 0 ? 'FAIL' : 'ok']);
}
for (const [group, bytes] of sizes) {
  if (!(group in budgets)) {
    rows.push([group, fmt(kB(bytes)), '-', '', 'FAIL: no budget in budgets.json']);
    over = true;
  }
}
const head = ['group', 'size kB', 'budget kB', 'overrun kB', ''];
const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
const line = (r) => r.map((c, i) => (i === 0 || i === 4 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('  ').trimEnd();
console.log(line(head));
console.log(widths.map((w) => '-'.repeat(w)).join('  '));
for (const r of rows) console.log(line(r));
console.log(`(${manifest.entries.length} files precached, manifest ${manifest.version})`);

// the build log
let ineffective = 0;
const logPath = process.argv[2];
if (logPath) {
  if (!existsSync(logPath)) fail(`build log ${logPath} not found`);
  ineffective = readFileSync(logPath, 'utf8').split('\n').filter((l) => l.includes('INEFFECTIVE_DYNAMIC_IMPORT')).length;
  console.log(ineffective
    ? `FAIL: the build log has ${ineffective} INEFFECTIVE_DYNAMIC_IMPORT warning(s): make those imports static`
    : 'build log: no INEFFECTIVE_DYNAMIC_IMPORT');
}

if (over || ineffective) {
  console.error('bundle budget: FAILED. A ceiling is raised only with the reason written in budgets.json _notes.');
  process.exit(1);
}
console.log('bundle budget: ok');
