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
 *   - `other chunks`: every other *.js and *.css in dist/assets (including
 *     nested directories and names without the usual hash), together;
 *   - `precache`: every file the service worker downloads on install, read
 *     back from the manifest the build writes into dist/sw.js
 *     (src/pwa/manifest.ts, `injectPrecacheManifest`);
 *   - `precache code` and `precache data/` (CO-1, D-38): the same manifest
 *     entries split in two, each counted once. `precache data/` is every entry
 *     under `data/` — the snapshots that the Pages build refreshes
 *     (`npm run snapshots`) and PR CI takes as committed; `precache code` is
 *     every other entry (chunks, workers, CSS, HTML, icons, textures,
 *     lessons), which is the same in both builds. Each has its own ceiling:
 *     over the code ceiling fails with "code ceiling", over the data ceiling
 *     fails with "data ceiling", and data that has used more than 80 % of its
 *     headroom (from the measured baseline in budgets.json `_precache_split`
 *     to its ceiling) prints a warning but does not fail.
 *
 * The optional argument is a saved log of the Vite build: the check also fails
 * when it contains INEFFECTIVE_DYNAMIC_IMPORT — an `await import()` of a
 * module that is imported statically elsewhere, which splits nothing.
 *
 * Prints the table either way; exits 1 when a group is over its ceiling, a
 * group named in budgets.json has no file, or the log shows the warning.
 * Ceilings only ratchet down: see budgets.json's `_notes`.
 *
 * Reported only, after that table (M-PLAN-020): no ceilings and never part of
 * the verdict, so the gate's lines, messages and exit code stay as they were.
 *   - gzip and brotli columns for every group: each file compressed alone at
 *     each format's maximum level (gzip -9, brotli quality 11), as a server
 *     sends it; JPEG, PNG and other already-compressed media at raw size;
 *   - `initial load`: dist/index.html and every script, module preload,
 *     preload and stylesheet it links (today the index, i18n, lesson-file,
 *     download and catalog chunks and the index CSS): what a first visit
 *     downloads before the app runs;
 *   - `textures`: every file under dist/textures/, precached or not.
 *
 * Plain Node, no dependencies. The pure parts are exported for
 * tests/bundle-budget.test.ts and tests/verification/bundle-budget-report.test.mjs;
 * the check runs only when this file is the command
 * (`node scripts/bundle-budget.mjs`), not when it is imported.
 */
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { brotliCompress, constants as zlibConstants, gzip } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const ASSETS = join(DIST, 'assets');
const OTHER = 'other chunks';
const PRECACHE = 'precache';
export const PRECACHE_CODE = 'precache code';
export const PRECACHE_DATA = 'precache data/';
/** Manifest entries under this path are the data snapshots (public/data, src/provider/*). */
export const DATA_PREFIX = 'data/';
/** Data that has used more than this share of its headroom gets a warning. */
export const DATA_WARN_FRACTION = 0.8;

const kB = (bytes) => bytes / 1000;
const fmt = (n) => n.toFixed(1);

function fail(message) {
  console.error(`bundle budget: ${message}`);
  process.exit(1);
}

/** `index-C_bwFgA7.js` → `index-*.js`; `monte-carlo.worker-DA3Ow2wV.js` → `monte-carlo.worker-*.js`. */
function chunkGroup(file) {
  const m = /^(.+)-[\w-]{8}\.(js|css)$/.exec(basename(file));
  return m ? `${m[1]}-*.${m[2]}` : null;
}

/** Count every emitted JS/CSS file once (or every file `pattern` matches), including names the chunk matcher does not recognise. */
function assetFiles(dir, pattern = /\.(js|css)$/) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) return assetFiles(file, pattern);
    return pattern.test(entry.name) ? [file] : [];
  }).sort();
}

/** Prints rows under a head, each column padded: the columns in `left` align left, the others right. */
function printTable(head, rows, left) {
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (r) => r.map((c, i) => (left.includes(i) ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('  ').trimEnd();
  console.log(line(head));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) console.log(line(r));
}

/** The precache manifest written into the built worker, parsed back. */
export function precacheManifest(swCode) {
  for (const m of swCode.matchAll(/JSON\.parse\(("(?:[^"\\]|\\.)*")\)/g)) {
    let value;
    try { value = JSON.parse(JSON.parse(m[1])); } catch { continue; }
    if (value && typeof value.version === 'string' && Array.isArray(value.entries)) return value;
  }
  return null;
}

/**
 * The manifest's entries ({ url, bytes }) in two groups: `data` is every entry
 * under `data/`, `code` every other. Each entry counts once, so code + data is
 * the old single precache sum (`total`).
 */
export function groupPrecache(entries) {
  let code = 0, data = 0;
  for (const { url, bytes } of entries) {
    if (url.startsWith(DATA_PREFIX)) data += bytes;
    else code += bytes;
  }
  return { code, data, total: code + data };
}

/**
 * The two ceilings and the data baseline, in kB, from budgets.json: the keys
 * `precache code` and `precache data/`, and `_precache_split.dataBaselineKB`
 * (the measured size of the refreshed snapshots the headroom is counted from).
 */
export function precacheLimits(budgets) {
  const split = budgets._precache_split;
  return {
    code: budgets[PRECACHE_CODE],
    data: budgets[PRECACHE_DATA],
    dataBaseline: split && typeof split === 'object' ? split.dataBaselineKB : undefined,
  };
}

/**
 * Checks the two groups (bytes) against their limits (kB). Over the code
 * ceiling is a failure that names the "code ceiling"; over the data ceiling a
 * failure that names the "data ceiling"; data past 80 % of its headroom
 * (baseline → ceiling) is a warning only.
 */
export function checkPrecacheSplit(groups, limits) {
  const failures = [], warnings = [];
  const code = kB(groups.code), data = kB(groups.data);
  if (code - limits.code > 0) {
    failures.push(`precache code is ${fmt(code)} kB, over its code ceiling of ${fmt(limits.code)} kB by ${fmt(code - limits.code)} kB: code may not raise it without a named offset (D-38, budgets.json _notes)`);
  }
  if (data - limits.data > 0) {
    failures.push(`precache data/ is ${fmt(data)} kB, over its data ceiling of ${fmt(limits.data)} kB by ${fmt(data - limits.data)} kB: the data snapshots outgrew their headroom (D-38, budgets.json _notes)`);
  } else {
    const headroom = limits.data - limits.dataBaseline;
    const used = data - limits.dataBaseline;
    if (headroom > 0 && used > DATA_WARN_FRACTION * headroom) {
      warnings.push(`precache data/ is ${fmt(data)} kB: ${fmt(used)} of its ${fmt(headroom)} kB headroom (${Math.round((100 * used) / headroom)} %) is used, more than ${Math.round(100 * DATA_WARN_FRACTION)} %; ask for the data ceiling to be reviewed before it fails a release`);
    }
  }
  return { failures, warnings };
}

// Reported only (M-PLAN-020): no ceilings, never part of the verdict.
const INITIAL_LOAD = 'initial load';
const TEXTURES = 'textures';
/** Already-compressed formats: a server sends them as they are, so their gzip and brotli size is their raw size. */
const PRECOMPRESSED = /\.(?:jpe?g|png|gif|webp|avif|woff2?|mp3|ogg|m4a|mp4|webm)$/i;
const LOADED_RELS = ['modulepreload', 'preload', 'stylesheet'];

/**
 * The initial load: the page itself, then every script, module preload,
 * preload and stylesheet it links, as paths under dist/ in the page's order.
 * Commented-out tags, inline scripts, data: URLs, other origins, and the
 * manifest and icons (fetched beside the start, not before it) are left out.
 */
export function initialLoad(html) {
  const paths = ['index.html'];
  const tags = html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<(script|link)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi);
  for (const [, name, body] of tags) {
    const attrs = {};
    for (const [, key, ...values] of body.matchAll(/([^\s=>"'/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g)) {
      attrs[key.toLowerCase()] ??= values.find((value) => value !== undefined) ?? '';
    }
    const url = name.toLowerCase() === 'script' ? attrs.src
      : (attrs.rel ?? '').toLowerCase().split(/\s+/).some((rel) => LOADED_RELS.includes(rel)) ? attrs.href : undefined;
    if (!url || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)) continue;
    const path = url.replace(/[?#].*$/, '').replace(/^(?:\.?\/)+/, '');
    if (path && !paths.includes(path)) paths.push(path);
  }
  return paths;
}

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);
const BROTLI_MAX = { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY } };

/** One file's bytes { raw, gzip, brotli }: compressed alone at each format's maximum level; precompressed media at raw size. */
async function transferSizes(path) {
  const bytes = readFileSync(path);
  if (PRECOMPRESSED.test(path)) return { raw: bytes.length, gzip: bytes.length, brotli: bytes.length };
  const [gz, br] = await Promise.all([gzipAsync(bytes, { level: 9 }), brotliAsync(bytes, BROTLI_MAX)]);
  return { raw: bytes.length, gzip: gz.length, brotli: br.length };
}

/** Sums each group's files (group → paths, in order); every file is measured once, however many groups list it. */
async function measureGroups(groups, measure = transferSizes) {
  const cache = new Map();
  const sizeOf = (path) => {
    if (!cache.has(path)) cache.set(path, measure(path));
    return cache.get(path);
  };
  const measured = await Promise.all([...groups].map(([, paths]) => Promise.all(paths.map(sizeOf))));
  return [...groups.keys()].map((group, i) => {
    const sum = (key) => measured[i].reduce((total, sizes) => total + sizes[key], 0);
    return { group, files: measured[i].length, raw: sum('raw'), gzip: sum('gzip'), brotli: sum('brotli') };
  });
}

/** The report-only table: the gate's groups that have files, in its order, then the initial load and the textures. */
async function printReport(budgets, members) {
  const groups = new Map([...Object.keys(budgets), ...members.keys()].filter((group) => members.has(group)).map((group) => [group, members.get(group)]));
  const page = join(DIST, 'index.html');
  const linked = existsSync(page) ? initialLoad(readFileSync(page, 'utf8')) : [];
  const isFile = (path) => existsSync(join(DIST, path)) && statSync(join(DIST, path)).isFile();
  const present = linked.filter(isFile), missing = linked.filter((path) => !isFile(path));
  groups.set(INITIAL_LOAD, present.map((path) => join(DIST, path)));
  const textures = join(DIST, TEXTURES);
  groups.set(TEXTURES, existsSync(textures) ? assetFiles(textures, /(?:)/) : []);
  const rows = (await measureGroups(groups)).map(({ group, files, raw, gzip: gz, brotli: br }) => (files
    ? [group, String(files), fmt(kB(raw)), fmt(kB(gz)), fmt(kB(br))]
    : [group, '0', 'absent', '', '']));
  console.log('report only, no ceilings (M-PLAN-020): each file compressed alone, gzip -9 and brotli q11; JPEG, PNG and other compressed media at raw size');
  printTable(['group', 'files', 'raw kB', 'gzip kB', 'brotli kB'], rows, [0]);
  console.log(`(${INITIAL_LOAD}: ${present.join(', ') || 'none'}${missing.length ? `; not in dist/: ${missing.join(', ')}` : ''})`);
}

async function main() {

  const budgetsPath = join(ROOT, 'budgets.json');
  if (!existsSync(budgetsPath)) fail('budgets.json is missing');
  const budgetsFile = JSON.parse(readFileSync(budgetsPath, 'utf8'));
  const budgets = Object.fromEntries(
    Object.entries(budgetsFile).filter(([key]) => !key.startsWith('_')),
  );
  // The split is checked when budgets.json names it, as every other group is;
  // naming any one of its three values without the others is an error, so the
  // gate cannot be half-configured.
  const limits = precacheLimits(budgetsFile);
  const splitNamed = [limits.code, limits.data, limits.dataBaseline].some((value) => value !== undefined);
  if (splitNamed) {
    for (const [name, value] of [[PRECACHE_CODE, limits.code], [PRECACHE_DATA, limits.data], ['_precache_split.dataBaselineKB', limits.dataBaseline]]) {
      if (typeof value !== 'number' || !Number.isFinite(value) || !(value > 0)) fail(`budgets.json: "${name}" must be a finite positive number of kB`);
    }
    if (!(limits.data > limits.dataBaseline)) fail('budgets.json: the data ceiling must be above _precache_split.dataBaselineKB');
  }
  for (const [group, ceiling] of Object.entries(budgets)) {
    if (typeof ceiling !== 'number' || !Number.isFinite(ceiling) || !(ceiling > 0)) fail(`budgets.json: "${group}" must be a finite positive number of kB`);
  }

  if (!existsSync(ASSETS) || !existsSync(join(DIST, 'sw.js'))) fail('dist/ is missing or incomplete: run `npx vite build` first');

  // chunk groups
  const sizes = new Map();
  const members = new Map(); // the files behind each group, for the report only
  for (const file of assetFiles(ASSETS)) {
    const group = chunkGroup(file);
    const key = group && group in budgets ? group : OTHER;
    sizes.set(key, (sizes.get(key) ?? 0) + statSync(file).size);
    members.set(key, [...(members.get(key) ?? []), file]);
  }

  // precache: the total, and the same entries as code and data/
  const manifest = precacheManifest(readFileSync(join(DIST, 'sw.js'), 'utf8'));
  if (!manifest) fail('no precache manifest found in dist/sw.js (src/pwa/manifest.ts writes it as JSON.parse("…"))');
  const measured = manifest.entries.map((entry) => {
    const path = join(DIST, entry.url);
    if (!existsSync(path)) fail(`the precache manifest names ${entry.url}, which is not in dist/`);
    return { url: entry.url, bytes: statSync(path).size };
  });
  const groups = groupPrecache(measured);
  sizes.set(PRECACHE, groups.total);
  if (splitNamed) {
    sizes.set(PRECACHE_CODE, groups.code);
    sizes.set(PRECACHE_DATA, groups.data);
  }
  const paths = (entries) => entries.map(({ url }) => join(DIST, url));
  members.set(PRECACHE, paths(measured));
  if (splitNamed) {
    members.set(PRECACHE_CODE, paths(measured.filter(({ url }) => !url.startsWith(DATA_PREFIX))));
    members.set(PRECACHE_DATA, paths(measured.filter(({ url }) => url.startsWith(DATA_PREFIX))));
  }
  const split = splitNamed ? checkPrecacheSplit(groups, limits) : { failures: [], warnings: [] };

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
    const failed = group === PRECACHE_CODE ? 'FAIL: code ceiling' : group === PRECACHE_DATA ? 'FAIL: data ceiling' : 'FAIL';
    const warned = group === PRECACHE_DATA && split.warnings.length ? 'ok (warning: over 80 % of data headroom)' : 'ok';
    rows.push([group, fmt(size), fmt(ceiling), overrun > 0 ? `+${fmt(overrun)}` : fmt(overrun), overrun > 0 ? failed : warned]);
  }
  for (const [group, bytes] of sizes) {
    if (!(group in budgets)) {
      rows.push([group, fmt(kB(bytes)), '-', '', 'FAIL: no budget in budgets.json']);
      over = true;
    }
  }
  printTable(['group', 'size kB', 'budget kB', 'overrun kB', ''], rows, [0, 4]);
  console.log(`(${manifest.entries.length} files precached, manifest ${manifest.version}${splitNamed ? `; ${fmt(kB(groups.code))} kB code + ${fmt(kB(groups.data))} kB under ${DATA_PREFIX}, data baseline ${fmt(limits.dataBaseline)} kB` : ''})`);
  for (const w of split.warnings) {
    console.log(`WARNING: ${w}`);
    // shown in the run's summary too, not only in the log
    if (process.env.GITHUB_ACTIONS === 'true') console.log(`::warning title=precache data/::${w}`);
  }
  for (const f of split.failures) console.error(`bundle budget: ${f}`);
  if (split.failures.length) over = true;

  // reported only: a failure to measure is printed, never turned into a verdict
  try {
    await printReport(budgets, members);
  } catch (error) {
    console.log(`report only: not measured (${error instanceof Error ? error.message : error})`);
  }

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
}

// realpath: the command may name this file through a symlink
if (process.argv[1] && existsSync(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) await main();
