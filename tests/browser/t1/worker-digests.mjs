/**
 * The twelve workers of a built app, each sent fixed requests in Chromium, their answers hashed
 * (plan S20-T1, Task A, Step 3): what shows that a change to the build left every worker's
 * answers as they were.
 *
 *   node tests/browser/t1/worker-digests.mjs <dist folder> <out.json>
 *   node tests/browser/t1/worker-digests.mjs --compare <a.json> <b.json>
 *
 * The first form serves the folder under /Orbitlab/ (tests/browser/serve.mjs) and launches Chromium
 * as the journeys do (tests/browser/harness.mjs). For each worker in turn it opens a new page on
 * `<base>manifest.webmanifest` (a small file of the build: the app does not start and no service
 * worker is registered), finds the worker's entry in `dist/assets` by the anchored name
 * `^<name>\.worker-[^.]+\.js$`, starts it with `new Worker(url, { type: 'module' })`, posts the
 * messages of tests/fixtures/t1/requests.json as the plan's table orders them, records every
 * message until the row's end, removes what the plan leaves out of the comparison (below), turns
 * the sequence into canonical bytes in the page (tests/browser/t1/canonical.mjs) and keeps their
 * SHA-256 and the count of messages by `type`. A worker `error` event, a reply of type `error`, no
 * end within 120 s, or a row's condition that does not hold fails the run for that worker.
 *
 * What the comparison leaves out, and nothing else (the plan's table "What a worker answers that
 * depends on the clock or on the build"):
 *   - ratings: `result.elapsedMs` of the `result` message;
 *   - monte-carlo: `run.ms` of each `run` message;
 *   - screening: the `progress` messages (counted, not hashed);
 *   - recheck: every field named `app`, at any depth of any reply;
 *   - flight: nothing; `advance` is sent with `budgetMs: 1e9` and `fastForward` is not sent.
 *
 * Three more checks, each a line of the output with pass or fail:
 *   - cancel: the lifetime-altitude worker started again with its request and ended with
 *     `terminate()` at its first `progress`; no message may arrive in the two seconds after;
 *   - precache: every file each worker entry imports statically, directly or through another chunk
 *     (the `import … from` and `export … from` statements of the files in dist/assets), is listed in
 *     the precache manifest inside dist/sw.js (`precacheManifest` of scripts/bundle-budget.mjs);
 *   - failed load: each worker started on a fresh page with the request for the first file its
 *     entry imports aborted (`page.route`), or for its own entry file when it imports nothing, and
 *     its request posted; what the Worker object does in the next five seconds is recorded: an
 *     `error` event, messages, or nothing. It passes when the worker posts no answer (a message of
 *     type `result`, or `run` for monte-carlo, or `delta` for flight). If the route does not see the
 *     request, that is recorded and the check is made again with the file removed from a copy of
 *     the dist folder.
 *
 * out.json holds, per worker, `entry`, `digest`, `messages` (count by type), `seconds` (wall time
 * from the first post to the end, for information, never compared) and its condition; and the three
 * checks with their lines. The canonical bytes of each worker's sequence go to `<out.json>.raw/`.
 *
 * Two outputs agree (`--compare`) when every worker's `digest` and `messages` are equal, screening's
 * `progress` count aside, the cancel and precache checks pass in both, and the failed-load check
 * records the same for each worker in both. Where two digests differ and both raw folders are there,
 * the comparison names the first differing message and field.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../serve.mjs';
import { launchBrowser } from '../harness.mjs';
import { precacheManifest } from '../../../scripts/bundle-budget.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const REQUESTS = join(here, '../../fixtures/t1/requests.json');
const CANONICAL = join(here, 'canonical.mjs');

/** The twelve workers, in the order of the plan's table. */
export const WORKERS = ['flight', 'tune', 'attitude-tune', 'monte-carlo', 'ratings', 'readiness', 'reentry', 'screening', 'lifetime',
  'lifetime-altitude', 'requirement-trades', 'recheck'];

export const RUN_TIMEOUT_MS = 120_000;
const CANCEL_QUIET_MS = 2_000;
const FAILED_LOAD_MS = 5_000;

/** The worker's answer, the message type a failed load must not produce. */
const ANSWER = { flight: 'delta', 'monte-carlo': 'run' };
const answerType = (name) => ANSWER[name] ?? 'result';

// ─── the build's files ──────────────────────────────────────────────────────────────────────

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The one entry of `name` among the files of dist/assets. */
export function workerEntry(assets, name) {
  const re = new RegExp(`^${escape(name)}\\.worker-[^.]+\\.js$`);
  const found = assets.filter((f) => re.test(f));
  if (found.length !== 1) throw new Error(`${name}: ${found.length} files in dist/assets match ${re} (${found.join(', ') || 'none'})`);
  return found[0];
}

/**
 * The relative specifiers of a module's static imports, in source order: `import … from "x"`,
 * `import "x"`, `export … from "x"`. Dynamic `import(…)` is not static and is not read.
 */
export function staticImports(code) {
  const re = /(?<![\w$.])(?:import\s*(?:[\w$*{},\s]+?\s*from\s*)?|export\s*(?:\*\s*(?:as\s+[\w$]+\s*)?|\{[\w$,\s]*\}\s*)from\s*)(["'])(\.{0,2}\/[^"'\n]+)\1/g;
  const out = [];
  for (const m of code.matchAll(re)) out.push({ at: m.index, spec: m[2] });
  return out.sort((a, b) => a.at - b.at).map((m) => m.spec);
}

/** Every file of dist/assets as a path relative to dist (`assets/x.js`). */
function assetFiles(dist) {
  const walk = (dir) => readdirSync(join(dist, dir), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(posix.join(dir, e.name)) : [posix.join(dir, e.name)]));
  return walk('assets');
}

/** The direct static imports of a file of dist (relative to dist), resolved; throws on one that names no file. */
function importsOf(dist, file, files) {
  const code = readFileSync(join(dist, file), 'utf8');
  return staticImports(code).map((spec) => {
    const target = spec.startsWith('/') ? spec.slice(1) : posix.normalize(posix.join(posix.dirname(file), spec));
    if (!files.has(target)) throw new Error(`${file} imports ${spec}, which is no file of the build (${target})`);
    return target;
  });
}

/** The entry and everything it imports statically, directly or through another chunk, in the order met. */
export function staticClosure(dist, entry, files) {
  const seen = [entry];
  for (let i = 0; i < seen.length; i++) for (const f of importsOf(dist, seen[i], files)) if (!seen.includes(f)) seen.push(f);
  return seen;
}

// ─── in the page ────────────────────────────────────────────────────────────────────────────

/**
 * Runs in the page: start the worker, post the row's messages, record what it posts until the
 * row's end, take out what the comparison leaves out, and hash. Returns the record.
 */
export async function runInPage({ name, url, worker: entryFile, timeoutMs }) {
  const spec = window.__t1;
  const revive = (v, planes) => {
    if (Array.isArray(v)) return v.map((x) => revive(x, planes));
    if (v && typeof v === 'object') {
      const keys = Object.keys(v);
      if (keys.length === 1 && keys[0] === '$date') return new Date(v.$date);
      if (keys.length === 1 && keys[0] === '$ref') {
        if (!planes) throw new Error('a $ref with no $planes');
        return planes[v.$ref];
      }
      return Object.fromEntries(keys.map((k) => [k, revive(v[k], planes)]));
    }
    return v;
  };
  const planes = spec.$planes ? revive(spec.$planes, null) : null;
  const messages = revive(spec.messages, planes);
  const seen = [];
  const counts = {};
  let started = 0;
  const outcome = await new Promise((done) => {
    const worker = new Worker(url, { type: 'module' });
    const timer = setTimeout(() => done({ failure: `no end within ${timeoutMs / 1000} s` }), timeoutMs);
    const end = (r) => { clearTimeout(timer); worker.terminate(); done(r); };
    let next = 0; // the next message to post
    const post = () => { if (!started) started = performance.now(); worker.postMessage(messages[next++]); };
    worker.onerror = (e) => { e.preventDefault?.(); end({ failure: `worker error event: ${e.message || '(no message)'} ${e.filename || ''}:${e.lineno || ''}` }); };
    worker.onmessageerror = () => end({ failure: 'messageerror: a reply could not be read' });
    let runs = 0;
    worker.onmessage = (e) => {
      const m = e.data;
      seen.push(m);
      const type = m && typeof m === 'object' ? m.type : typeof m;
      counts[type] = (counts[type] ?? 0) + 1;
      if (type === 'error') { end({ failure: `a reply of type error: ${m.message}` }); return; }
      if (name === 'flight') {
        if (type !== 'delta') return;
        // the reply to start is a delta with no ack; each later advance goes out on the delta with ack k - 1
        const expected = next === 1 ? undefined : messages[next - 1].id;
        if (m.ack !== expected) return;
        if (next < messages.length) post();
        else end({ ended: `delta with ack ${m.ack}` });
        return;
      }
      if (name === 'monte-carlo') {
        if (type !== 'run') return;
        runs++;
        if (runs < messages.length) post();
        else end({ ended: `reply ${runs} of type run` });
        return;
      }
      if (type === 'result') end({ ended: 'result' });
    };
    post();
  });
  const seconds = started ? (performance.now() - started) / 1000 : 0;

  // what the comparison leaves out (the plan's table), and nothing else
  const dropApp = (v) => {
    if (Array.isArray(v)) return v.map(dropApp);
    if (v && typeof v === 'object' && !(v instanceof Date) && !ArrayBuffer.isView(v) && !(v instanceof ArrayBuffer)) {
      return Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'app').map(([k, x]) => [k, dropApp(x)]));
    }
    return v;
  };
  const compared = [];
  for (const m of seen) {
    if (name === 'screening' && m.type === 'progress') continue;
    if (name === 'ratings' && m.type === 'result' && m.result && typeof m.result === 'object') {
      const { elapsedMs: _drop, ...result } = m.result;
      compared.push({ ...m, result });
    } else if (name === 'monte-carlo' && m.type === 'run' && m.run && typeof m.run === 'object') {
      const { ms: _drop, ...run } = m.run;
      compared.push({ ...m, run });
    } else if (name === 'recheck') compared.push(dropApp(m));
    else compared.push(m);
  }

  // the row's condition
  let condition = null;
  const last = seen[seen.length - 1];
  if (name === 'screening' && last?.type === 'result') {
    condition = { what: 'the list is not empty', length: last.list.length, holds: last.list.length > 0 };
  }
  if (name === 'recheck' && last?.type === 'result') {
    const statuses = {};
    for (const r of last.result.records) statuses[r.status] = (statuses[r.status] ?? 0) + 1;
    condition = { what: '4 match and 2 borderline', statuses, holds: statuses.match === 4 && statuses.borderline === 2 && last.result.records.length === 6 };
  }

  const bytes = window.canonicalBytes(compared);
  const digest = await window.digest(compared);
  let raw = '';
  for (let i = 0; i < bytes.length; i += 0x8000) raw += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { entry: entryFile, ...outcome, digest, messages: counts, seconds, condition, compared: compared.length, raw: btoa(raw) };
}

/** Runs in the page: start the worker and end it at its first progress; count what arrives after. */
async function cancelInPage({ url, quietMs, timeoutMs }) {
  const spec = window.__t1;
  return new Promise((done) => {
    const worker = new Worker(url, { type: 'module' });
    let ended = 0, after = 0, before = 0;
    const timer = setTimeout(() => { worker.terminate(); done({ pass: false, line: `no progress within ${timeoutMs / 1000} s` }); }, timeoutMs);
    worker.onerror = (e) => { clearTimeout(timer); worker.terminate(); done({ pass: false, line: `worker error event: ${e.message}` }); };
    worker.onmessage = (e) => {
      if (ended) { after++; return; }
      before++;
      if (e.data?.type !== 'progress') return;
      clearTimeout(timer);
      worker.terminate();
      ended = performance.now();
      setTimeout(() => done({ pass: after === 0, before, after }), quietMs);
    };
    worker.postMessage(spec.messages[0]);
  });
}

/** Runs in the page: start the worker and post its request; record what it does in the next `ms`. */
async function failedLoadInPage({ url, ms, answer }) {
  const spec = window.__t1;
  const revive = (v) => (Array.isArray(v) ? v.map(revive) : v && typeof v === 'object'
    ? (Object.keys(v).length === 1 && '$date' in v ? new Date(v.$date) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x)])))
    : v);
  const events = [];
  let worker;
  try {
    worker = new Worker(url, { type: 'module' });
  } catch (e) {
    return { thrown: String(e), events, answered: false };
  }
  worker.onerror = (e) => { events.push({ event: 'error', message: e.message || '' }); };
  worker.onmessageerror = () => { events.push({ event: 'messageerror' }); };
  worker.onmessage = (e) => { events.push({ event: 'message', type: e.data?.type ?? typeof e.data }); };
  // the attitude request's planes are posted as objects; their identity does not matter here
  const planes = spec.$planes ?? null;
  const swap = (v) => (Array.isArray(v) ? v.map(swap) : v && typeof v === 'object'
    ? (Object.keys(v).length === 1 && '$ref' in v ? planes[v.$ref] : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)])))
    : v);
  worker.postMessage(revive(swap(spec.messages[0])));
  await new Promise((r) => setTimeout(r, ms));
  worker.terminate();
  return { events, answered: events.some((e) => e.event === 'message' && e.type === answer) };
}

// ─── the run ────────────────────────────────────────────────────────────────────────────────

/** A new page on the build's manifest, with the canonical module and one worker's requests in it. */
export async function freshPage(browser, base, spec) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  const res = await page.goto(`${base}manifest.webmanifest`, { waitUntil: 'load' });
  if (!res?.ok()) throw new Error(`manifest.webmanifest: HTTP ${res?.status()}`);
  await page.addScriptTag({ type: 'module', content: readFileSync(CANONICAL, 'utf8') });
  await page.waitForFunction(() => typeof window.digest === 'function' && typeof window.canonicalBytes === 'function');
  await page.evaluate((s) => { window.__t1 = s; }, spec);
  return { context, page, consoleErrors };
}

/** A line for one failed-load record. */
function describeLoad(r) {
  if (r.thrown) return `new Worker threw: ${r.thrown}`;
  const kinds = r.events.map((e) => (e.event === 'message' ? `message ${e.type}` : e.event));
  return kinds.length ? kinds.join(', ') : 'nothing';
}

async function failedLoad(browser, base, dist, name, spec, closure) {
  const target = closure.length > 1 ? closure[1] : closure[0];
  const url = `${base}${closure[0]}`;
  const { context, page } = await freshPage(browser, base, spec);
  let hits = 0;
  await page.route(`${base}${target}`, (route) => { hits++; return route.abort(); });
  let record;
  try {
    record = await page.evaluate(failedLoadInPage, { url, ms: FAILED_LOAD_MS, answer: answerType(name) });
  } finally {
    await context.close();
  }
  const out = { aborted: target, how: 'page.route', routeSaw: hits > 0, ...record, record: describeLoad(record) };
  if (hits > 0) return { ...out, pass: !record.answered };
  // the route did not see the worker's request: the same with the file removed from a copy of dist
  const copy = mkdtempSync(join(tmpdir(), 't1-failed-load-'));
  let again;
  try {
    cpSync(dist, copy, { recursive: true });
    rmSync(join(copy, target));
    const server = await serve({ root: copy });
    try {
      const fresh = await freshPage(browser, server.url, spec);
      try {
        again = await fresh.page.evaluate(failedLoadInPage, { url: `${server.url}${closure[0]}`, ms: FAILED_LOAD_MS, answer: answerType(name) });
      } finally {
        await fresh.context.close();
      }
    } finally {
      await server.close();
    }
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
  return { ...out, removed: { ...again, record: describeLoad(again) }, record: `route did not see it; file removed: ${describeLoad(again)}`, pass: !again.answered };
}

async function run(distArg, outArg) {
  const dist = resolve(distArg);
  const outPath = resolve(outArg);
  const requests = JSON.parse(readFileSync(REQUESTS, 'utf8'));
  const assets = assetFiles(dist).map((f) => f.slice('assets/'.length));
  const files = new Set(assetFiles(dist));
  const buildInfo = existsSync(join(dist, 'build-info.json')) ? JSON.parse(readFileSync(join(dist, 'build-info.json'), 'utf8')) : null;
  const entries = Object.fromEntries(WORKERS.map((name) => [name, `assets/${workerEntry(assets, name)}`]));
  const closures = Object.fromEntries(WORKERS.map((name) => [name, staticClosure(dist, entries[name], files)]));

  const rawDir = `${outPath}.raw`;
  rmSync(rawDir, { recursive: true, force: true });
  mkdirSync(rawDir, { recursive: true });

  const server = await serve({ root: dist });
  const browser = await launchBrowser();
  const out = { dist, build: buildInfo && { version: buildInfo.version, commit: buildInfo.commit }, browser: browser.version(), workers: {}, checks: {} };
  let ok = true;
  try {
    for (const name of WORKERS) {
      const spec = requests.workers[name];
      const { context, page, consoleErrors } = await freshPage(browser, server.url, spec);
      let r;
      try {
        r = await page.evaluate(runInPage, { name, url: `${server.url}${entries[name]}`, worker: entries[name], timeoutMs: RUN_TIMEOUT_MS });
      } finally {
        await context.close();
      }
      const { raw, ...rest } = r;
      writeFileSync(join(rawDir, `${name}.bin`), Buffer.from(raw, 'base64'));
      const failures = [];
      if (r.failure) failures.push(r.failure);
      if (r.condition && !r.condition.holds) failures.push(`condition does not hold: ${r.condition.what} (${JSON.stringify(r.condition)})`);
      if ((name === 'screening' || name === 'recheck') && !r.condition) failures.push('no result to check the condition on');
      if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join(' | ')}`);
      out.workers[name] = { ...rest, imports: closures[name].slice(1), failures };
      if (failures.length) ok = false;
      const counts = Object.entries(r.messages).map(([k, v]) => `${k} ${v}`).join(', ');
      console.log(`${failures.length ? 'FAIL' : 'ok  '} ${name.padEnd(19)} ${r.digest.slice(0, 12)}  ${counts}  ${r.seconds.toFixed(1)} s${failures.length ? `  ${failures.join('; ')}` : ''}`);
    }

    // cancel
    {
      const name = 'lifetime-altitude';
      const { context, page } = await freshPage(browser, server.url, requests.workers[name]);
      let r;
      try {
        r = await page.evaluate(cancelInPage, { url: `${server.url}${entries[name]}`, quietMs: CANCEL_QUIET_MS, timeoutMs: RUN_TIMEOUT_MS });
      } finally {
        await context.close();
      }
      const line = `cancel: ${r.pass ? 'pass' : 'fail'}: lifetime-altitude ended with terminate() at its first progress (${r.before ?? '?'} message(s) before); ${r.after ?? '?'} message(s) in the ${CANCEL_QUIET_MS / 1000} s after${r.line ? `; ${r.line}` : ''}`;
      out.checks.cancel = { pass: r.pass, line, ...r };
      if (!r.pass) ok = false;
      console.log(line);
    }

    // precache
    {
      const manifest = precacheManifest(readFileSync(join(dist, 'sw.js'), 'utf8'));
      const listed = new Set((manifest?.entries ?? []).map((e) => e.url));
      const missing = [];
      for (const name of WORKERS) for (const f of closures[name]) if (!listed.has(f)) missing.push(`${name}: ${f}`);
      const counted = WORKERS.reduce((n, name) => n + closures[name].length, 0);
      const pass = !!manifest && missing.length === 0;
      const line = `precache: ${pass ? 'pass' : 'fail'}: ${manifest ? `${counted} file(s) loaded at start by the 12 worker entries (entries and their static imports), ${missing.length} not in the precache manifest` : 'no precache manifest in sw.js'}${missing.length ? `: ${missing.join(', ')}` : ''}`;
      out.checks.precache = { pass, line, missing, files: Object.fromEntries(WORKERS.map((n) => [n, closures[n]])) };
      if (!pass) ok = false;
      console.log(line);
    }

    // failed load
    {
      const per = {};
      for (const name of WORKERS) per[name] = await failedLoad(browser, server.url, dist, name, requests.workers[name], closures[name]);
      const pass = WORKERS.every((n) => per[n].pass);
      const line = `failed load: ${pass ? 'pass' : 'fail'}: ${WORKERS.map((n) => `${n} [${per[n].aborted.slice('assets/'.length)} aborted] ${per[n].record}${per[n].pass ? '' : ' (ANSWERED)'}`).join('; ')}`;
      out.checks.failedLoad = { pass, line, workers: per };
      if (!pass) ok = false;
      console.log(line);
    }
  } finally {
    await browser.close();
    await server.close();
  }
  out.ok = ok;
  writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`${ok ? 'worker digests: ok' : 'worker digests: FAILED'} (${outPath})`);
  return ok;
}

// ─── the comparison of two outputs ──────────────────────────────────────────────────────────

/** Read canonical bytes back into values (tests/browser/t1/canonical.mjs): numbers as their hex, to keep -0 and NaN visible. */
export function readCanonical(bytes) {
  let i = 0;
  const text = (n) => { const s = Buffer.from(bytes.subarray(i, i + n)).toString('latin1'); i += n; return s; };
  const len = () => parseInt(text(8), 16);
  const str = () => { if (text(1) !== 's') throw new Error(`no string at ${i - 1}`); const n = len(); const s = Buffer.from(bytes.subarray(i, i + n)).toString('utf8'); i += n; return s; };
  const value = () => {
    const t = text(1);
    switch (t) {
      case 'u': return { $undefined: true };
      case 'n': return null;
      case 't': return true;
      case 'f': return false;
      case 'd': { const h = text(16); const v = Buffer.from(h, 'hex').readDoubleBE(0); return Number.isNaN(v) || Object.is(v, -0) ? { $number: h } : v; }
      case 's': { i--; return str(); }
      case 'D': { text(1); return { $date: Buffer.from(text(16), 'hex').readDoubleBE(0) }; }
      case 'B': { const type = str(); const n = len(); const hex = Buffer.from(bytes.subarray(i, i + n)).toString('hex'); i += n; return { $bytes: type, hex }; }
      case 'a': { const n = len(); const a = []; for (let k = 0; k < n; k++) a.push(value()); return a; }
      case 'o': { const n = len(); const o = {}; for (let k = 0; k < n; k++) { const key = str(); o[key] = value(); } return o; }
      default: throw new Error(`unknown tag ${JSON.stringify(t)} at ${i - 1}`);
    }
  };
  const v = value();
  if (i !== bytes.length) throw new Error(`${bytes.length - i} byte(s) left over`);
  return v;
}

/** The path of the first difference between two read values, and the two values there; null when equal. */
function firstDifference(a, b, path = '') {
  if (Object.is(a, b)) return null;
  const isObj = (x) => x && typeof x === 'object';
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let k = 0; k < Math.min(a.length, b.length); k++) { const d = firstDifference(a[k], b[k], `${path}[${k}]`); if (d) return d; }
    return a.length === b.length ? null : { path: `${path}.length`, a: a.length, b: b.length };
  }
  if (isObj(a) && isObj(b) && !Array.isArray(a) && !Array.isArray(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    for (const k of keys) {
      if (!(k in a) || !(k in b)) return { path: `${path}.${k}`, a: k in a ? a[k] : '(absent)', b: k in b ? b[k] : '(absent)' };
      const d = firstDifference(a[k], b[k], `${path}.${k}`);
      if (d) return d;
    }
    return null;
  }
  return { path, a, b };
}

function compare(aPath, bPath) {
  const a = JSON.parse(readFileSync(resolve(aPath), 'utf8'));
  const b = JSON.parse(readFileSync(resolve(bPath), 'utf8'));
  const lines = [];
  let agree = true;
  const counts = (m, name) => Object.fromEntries(Object.entries(m ?? {}).filter(([k]) => !(name === 'screening' && k === 'progress')).sort());
  for (const name of WORKERS) {
    const wa = a.workers[name], wb = b.workers[name];
    if (!wa || !wb) { agree = false; lines.push(`${name}: missing in ${wa ? 'B' : 'A'}`); continue; }
    const sameDigest = wa.digest === wb.digest;
    const sameCounts = JSON.stringify(counts(wa.messages, name)) === JSON.stringify(counts(wb.messages, name));
    if (sameDigest && sameCounts) { lines.push(`${name}: agree (${wa.digest.slice(0, 12)})`); continue; }
    agree = false;
    let where = '';
    const ra = `${resolve(aPath)}.raw/${name}.bin`, rb = `${resolve(bPath)}.raw/${name}.bin`;
    if (!sameDigest && existsSync(ra) && existsSync(rb)) {
      const va = readCanonical(readFileSync(ra)), vb = readCanonical(readFileSync(rb));
      const d = firstDifference(va, vb);
      if (d) {
        const m = /^\[(\d+)\]/.exec(d.path);
        where = `; first difference in message ${m ? Number(m[1]) + 1 : '?'} (type ${m ? JSON.stringify(va[Number(m[1])]?.type ?? vb[Number(m[1])]?.type) : '?'}), at ${d.path}: ${JSON.stringify(d.a)} against ${JSON.stringify(d.b)}`;
      }
    }
    lines.push(`${name}: DIFFER: digest ${wa.digest.slice(0, 12)} / ${wb.digest.slice(0, 12)}, messages ${JSON.stringify(wa.messages)} / ${JSON.stringify(wb.messages)}${where}`);
  }
  for (const check of ['cancel', 'precache']) {
    const pa = a.checks?.[check]?.pass, pb = b.checks?.[check]?.pass;
    if (!(pa && pb)) agree = false;
    lines.push(`${check}: ${pa ? 'pass' : 'fail'} / ${pb ? 'pass' : 'fail'}`);
  }
  for (const name of WORKERS) {
    const fa = a.checks?.failedLoad?.workers?.[name], fb = b.checks?.failedLoad?.workers?.[name];
    const same = !!fa && !!fb && fa.record === fb.record && fa.pass === fb.pass;
    if (!same) agree = false;
    lines.push(`failed load, ${name}: ${same ? 'same' : 'DIFFER'}: ${fa?.record ?? '(none)'} / ${fb?.record ?? '(none)'}`);
  }
  for (const l of lines) console.log(l);
  console.log(agree ? 'the two outputs agree' : 'the two outputs DO NOT agree');
  return agree;
}

const args = process.argv.slice(2);
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (args[0] === '--compare' && args.length === 3) process.exit(compare(args[1], args[2]) ? 0 : 1);
  else if (args.length === 2 && !args[0].startsWith('--')) process.exit((await run(args[0], args[1])) ? 0 : 1);
  else {
    console.error('usage: node tests/browser/t1/worker-digests.mjs <dist folder> <out.json>\n       node tests/browser/t1/worker-digests.mjs --compare <a.json> <b.json>');
    process.exit(2);
  }
}
