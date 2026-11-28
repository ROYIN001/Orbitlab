/**
 * The modules of two builds, read from their source maps (plan S20-T1, Task A, Step 4; the oracle
 * EO-BUN-1): that a change to the build lost no module and changed none, and what each worker loads.
 *
 *   node tests/browser/t1/bundle-modules.mjs <build A> <build B> <out.json> [build log …]
 *
 * Each build is a folder made with source maps, `npx vite build --sourcemap --outDir <folder>
 * --emptyOutDir` (the real build keeps `sourcemap: false`). From every `.map` file under the
 * folder's `assets` it takes each (source path, SHA-256 of its `sourcesContent`) and reports:
 *   - the set of those pairs for each build, and whether the two sets are equal;
 *   - every pair present in A and absent in B, and the other way round;
 *   - every source path that comes with more than one content in one build (a module twice);
 *   - for each of the twelve worker entries and for the page's entry (the module script of
 *     index.html), the files it loads at start (the entry and everything it imports statically,
 *     directly or through another chunk) and the sorted list of the sources in them.
 * It fails if the two sets differ, if a source has no `sourcesContent`, or if a build log given
 * after the output contains `INEFFECTIVE_DYNAMIC_IMPORT`. Run on a build against itself it must
 * report equal sets and a list of modules for each worker.
 *
 * A source path is written from the checkout's root: a map's own path for a source depends on where
 * the build ran and where its output went (a worker's bundle, built on its own, writes it from
 * another folder than the page's), so the leading `../` are dropped and the path starts at its
 * first segment that names a top-level entry of this repository (`src`, `node_modules`, `docs`,
 * `index.html` …); a path with no such segment is kept as it is and listed under `unplaced`.
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORKERS, staticClosure, workerEntry } from './worker-digests.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = resolve(here, '../../..');

/** The names at the top of this repository, and node_modules. */
function topLevel() {
  let names;
  try {
    names = execSync('git ls-tree --name-only HEAD', { cwd: repo, encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    names = readdirSync(repo).filter((n) => n !== '.git');
  }
  return new Set([...names, 'node_modules']);
}

/** A map's source as a path from the checkout's root, or null when no segment places it. */
export function placeSource(source, top) {
  const parts = source.replace(/\\/g, '/').split('/').filter((p) => p !== '' && p !== '.' && p !== '..');
  const k = parts.findIndex((p) => top.has(p.replace(/\?.*$/, '')));
  return k < 0 ? null : parts.slice(k).join('/');
}

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

function filesUnder(dir, sub = '') {
  return readdirSync(join(dir, sub), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? filesUnder(dir, posix.join(sub, e.name)) : [posix.join(sub, e.name)]));
}

/** What one build holds: each JS file's sources, the set of (path, hash), the entries' lists. */
function readBuild(dir, top) {
  if (!existsSync(join(dir, 'index.html'))) throw new Error(`no build at ${dir}`);
  const all = filesUnder(dir, 'assets');
  const files = new Set(all);
  const maps = all.filter((f) => f.endsWith('.js.map'));
  if (!maps.length) throw new Error(`${dir}: no source maps under assets (build it with --sourcemap)`);
  const sourcesOf = {};
  const pairs = new Map(); // path → Set of hashes
  const unplaced = [], noContent = [];
  for (const m of maps) {
    const map = JSON.parse(readFileSync(join(dir, m), 'utf8'));
    const js = m.slice(0, -'.map'.length);
    sourcesOf[js] = [];
    map.sources.forEach((source, i) => {
      const placed = placeSource(posix.join(map.sourceRoot ?? '', source), top);
      if (!placed) unplaced.push(`${m}: ${source}`);
      const path = placed ?? source;
      const content = map.sourcesContent?.[i];
      if (typeof content !== 'string') noContent.push(`${m}: ${source}`);
      const hash = typeof content === 'string' ? sha256(content) : null;
      sourcesOf[js].push(path);
      if (!pairs.has(path)) pairs.set(path, new Set());
      pairs.get(path).add(hash);
    });
  }
  const set = new Set([...pairs].flatMap(([p, hs]) => [...hs].map((h) => `${p}\t${h}`)));
  const twice = [...pairs].filter(([, hs]) => hs.size > 1).map(([p, hs]) => `${p}: ${[...hs].map((h) => h?.slice(0, 12)).join(', ')}`);

  const assets = all.map((f) => f.slice('assets/'.length)).filter((f) => !f.includes('/'));
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  const page = /<script\b[^>]*type="module"[^>]*src="(?:\.\/|\/Orbitlab\/)?(assets\/[^"]+\.js)"/.exec(html)?.[1];
  if (!page) throw new Error(`${dir}: no module script in index.html`);
  const entries = { page, ...Object.fromEntries(WORKERS.map((n) => [n, `assets/${workerEntry(assets, n)}`])) };
  const lists = {};
  for (const [name, entry] of Object.entries(entries)) {
    const loaded = staticClosure(dir, entry, files);
    const missing = loaded.filter((f) => !sourcesOf[f]);
    lists[name] = { entry, files: loaded, sources: [...new Set(loaded.flatMap((f) => sourcesOf[f] ?? []))].sort(), ...(missing.length ? { noMap: missing } : {}) };
  }
  return { dir, maps: maps.length, set, twice, unplaced, noContent, lists };
}

function main([aDir, bDir, outArg, ...logs]) {
  const top = topLevel();
  const a = readBuild(resolve(aDir), top), b = readBuild(resolve(bDir), top);
  const split = (s) => { const [path, hash] = s.split('\t'); return { path, sha256: hash === 'null' ? null : hash }; };
  const onlyA = [...a.set].filter((s) => !b.set.has(s)).sort().map(split);
  const onlyB = [...b.set].filter((s) => !a.set.has(s)).sort().map(split);
  const equal = onlyA.length === 0 && onlyB.length === 0;
  const logReport = logs.map((path) => {
    const lines = readFileSync(resolve(path), 'utf8').split('\n').filter((l) => l.includes('INEFFECTIVE_DYNAMIC_IMPORT'));
    return { log: resolve(path), ineffectiveDynamicImport: lines.length, lines };
  });
  const noContent = [...a.noContent, ...b.noContent];
  const ok = equal && noContent.length === 0 && logReport.every((l) => l.ineffectiveDynamicImport === 0);

  const entries = {};
  for (const name of Object.keys(a.lists)) {
    const la = a.lists[name], lb = b.lists[name];
    entries[name] = {
      a: la, b: lb,
      onlyInA: la.sources.filter((s) => !lb.sources.includes(s)),
      onlyInB: lb.sources.filter((s) => !la.sources.includes(s)),
    };
  }
  const out = {
    a: { dir: a.dir, maps: a.maps, pairs: a.set.size, twice: a.twice, unplaced: a.unplaced },
    b: { dir: b.dir, maps: b.maps, pairs: b.set.size, twice: b.twice, unplaced: b.unplaced },
    equal, absentFromB: onlyA, absentFromA: onlyB, noContent, logs: logReport, entries,
    setA: [...a.set].sort().map(split), ok,
  };
  writeFileSync(resolve(outArg), `${JSON.stringify(out, null, 2)}\n`);

  console.log(`A ${a.dir}: ${a.maps} maps, ${a.set.size} (source, content) pairs${a.twice.length ? `, ${a.twice.length} source(s) with two contents` : ''}${a.unplaced.length ? `, ${a.unplaced.length} unplaced` : ''}`);
  console.log(`B ${b.dir}: ${b.maps} maps, ${b.set.size} (source, content) pairs${b.twice.length ? `, ${b.twice.length} source(s) with two contents` : ''}${b.unplaced.length ? `, ${b.unplaced.length} unplaced` : ''}`);
  console.log(`sets: ${equal ? 'equal' : `DIFFER: ${onlyA.length} in A only, ${onlyB.length} in B only`}`);
  for (const p of onlyA.slice(0, 20)) console.log(`  in A, absent in B: ${p.path} ${p.sha256?.slice(0, 12)}`);
  for (const p of onlyB.slice(0, 20)) console.log(`  in B, absent in A: ${p.path} ${p.sha256?.slice(0, 12)}`);
  if (noContent.length) console.log(`no sourcesContent: ${noContent.length}: ${noContent.slice(0, 5).join(', ')}`);
  for (const l of logReport) console.log(`log ${l.log}: ${l.ineffectiveDynamicImport ? `FAIL: ${l.ineffectiveDynamicImport} INEFFECTIVE_DYNAMIC_IMPORT` : 'no INEFFECTIVE_DYNAMIC_IMPORT'}`);
  for (const [name, e] of Object.entries(entries)) {
    console.log(`${name.padEnd(19)} A: ${String(e.a.sources.length).padStart(3)} modules in ${e.a.files.length} file(s); B: ${String(e.b.sources.length).padStart(3)} modules in ${e.b.files.length} file(s)`
      + `${e.onlyInB.length ? `; ${e.onlyInB.length} more in B` : ''}${e.onlyInA.length ? `; ${e.onlyInA.length} fewer in B` : ''}`);
  }
  console.log(ok ? 'bundle modules: ok' : 'bundle modules: FAILED');
  return ok;
}

const args = process.argv.slice(2);
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (args.length < 3) {
    console.error('usage: node tests/browser/t1/bundle-modules.mjs <build A> <build B> <out.json> [build log …]');
    process.exit(2);
  }
  process.exit(main(args) ? 0 : 1);
}
