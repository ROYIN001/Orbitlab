#!/usr/bin/env node
/**
 * Orbitlab performance baseline: a reproducible, headless measurement of the
 * production build (dist/) so that later changes can be proven with
 * before/after numbers.
 *
 *   node measure.mjs [--repo DIR] [--dist DIR] [--runs 3] [--label NAME] [--out FILE]
 *                    [--only startup,home,orbit,launch,flight,warm,storage]
 *                    [--window 5] [--flight-window 8] [--scale 0.5] [--viewport 1280x800]
 *                    [--profile]                 # CPU profile of the 1x flight window (needs .map files: --dist dist-sm)
 *   node measure.mjs --compare before.json after.json
 *
 * Everything runs against a private static server that serves DIR under
 * /Orbitlab/ exactly like tests/browser/serve.mjs (SPA fallback, no-cache, no
 * validators), and that logs every request so bytes/requests are counted
 * server-side (page, workers and the service worker alike).
 *
 * Numbers are RELATIVE: headless Chromium, software WebGL (ANGLE/SwiftShader),
 * device pixel ratio 0.5 by default (the browser-journey harness setting).
 * Compare only runs taken on the same machine with the same flags.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, extname, sep, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import os from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));

// ─── options ────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = {
    repo: resolve(here, '..', 'ol'), dist: null, runs: 3, label: 'baseline', out: null,
    only: null, window: 5, flightWindow: 8, scale: Number(process.env.BROWSER_SCALE) || 0.5,
    viewport: '1280x800', profile: false, compare: null, quiet: false, chromium: process.env.CHROMIUM || null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--repo') o.repo = resolve(next());
    else if (a === '--dist') o.dist = resolve(next());
    else if (a === '--runs') o.runs = Number(next());
    else if (a === '--label') o.label = next();
    else if (a === '--out') o.out = resolve(next());
    else if (a === '--only') o.only = next().split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--window') o.window = Number(next());
    else if (a === '--flight-window') o.flightWindow = Number(next());
    else if (a === '--scale') o.scale = Number(next());
    else if (a === '--viewport') o.viewport = next();
    else if (a === '--profile') o.profile = true;
    else if (a === '--chromium') o.chromium = resolve(next());
    else if (a === '--compare') o.compare = [resolve(next()), resolve(next())];
    else if (a === '--report') o.report = resolve(next());
    else if (a === '--quiet') o.quiet = true;
    else { console.error(`unknown option ${a}`); process.exit(2); }
  }
  o.dist ??= join(o.repo, 'dist');
  const [w, h] = o.viewport.split('x').map(Number);
  o.size = { width: w, height: h };
  return o;
}

const FALLBACK_CHROMIUM = '/opt/pw-browsers/chromium';
const SCENARIOS = ['startup', 'home', 'orbit', 'launch', 'flight', 'warm', 'storage'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.error('[perf]', ...a);

// ─── a logging static server (same contract as tests/browser/serve.mjs) ────────
const BASE = '/Orbitlab/';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.wasm': 'application/wasm', '.woff2': 'font/woff2',
};
const fileAt = async (p) => { try { return (await stat(p)).isFile() ? p : null; } catch { return null; } };
const gzCache = new Map();
function gzipBytes(file, body) {
  if (!gzCache.has(file)) {
    const ext = extname(file).toLowerCase();
    const compressible = ['.html', '.js', '.mjs', '.css', '.json', '.webmanifest', '.txt', '.md', '.svg'].includes(ext);
    gzCache.set(file, compressible ? gzipSync(body, { level: 6 }).length : body.length);
  }
  return gzCache.get(file);
}

async function serveLogged(root) {
  const dir = resolve(root);
  if (!(await fileAt(join(dir, 'index.html')))) throw new Error(`no build at ${dir}`);
  const requests = [];
  const server = createServer(async (req, res) => {
    const t = Date.now();
    const send = (status, body, headers = {}, file = null) => {
      res.writeHead(status, { 'Cache-Control': 'no-cache', ...headers });
      res.end(req.method === 'HEAD' ? undefined : body);
      const bytes = req.method === 'HEAD' || !body ? 0 : Buffer.byteLength(body);
      requests.push({ t, path: pathname ?? req.url, status, bytes, gz: file && status === 200 ? gzipBytes(file, body) : bytes,
        ua: /HeadlessChrome|Chrome/.test(req.headers['user-agent'] ?? '') ? 'chrome' : 'other',
        dest: req.headers['sec-fetch-dest'] ?? '', mode: req.headers['sec-fetch-mode'] ?? '' });
    };
    let pathname = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'method not allowed');
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { return send(400, 'bad request'); }
    if (pathname === BASE.slice(0, -1)) return send(301, '', { Location: BASE });
    if (!pathname.startsWith(BASE)) return send(pathname === '/' ? 302 : 404, 'not found', pathname === '/' ? { Location: BASE } : {});
    const rel = pathname.slice(BASE.length);
    const target = resolve(dir, rel);
    if (target !== dir && !target.startsWith(dir + sep)) return send(403, 'forbidden');
    let file = await fileAt(target) ?? (rel === '' || rel.endsWith('/') ? await fileAt(join(target, 'index.html')) : null);
    if (!file && !extname(rel)) file = join(dir, 'index.html');
    if (!file) return send(404, 'not found');
    const body = await readFile(file);
    send(200, body, { 'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'Content-Length': body.length }, file);
  });
  await new Promise((ok, no) => { server.once('error', no); server.listen(0, '127.0.0.1', ok); });
  const port = server.address().port;
  return {
    url: `http://127.0.0.1:${port}${BASE}`, requests,
    close: () => new Promise((ok) => { server.closeAllConnections?.(); server.close(() => ok()); }),
  };
}

function typeOf(path) {
  const ext = extname(path).toLowerCase();
  if (['.js', '.mjs'].includes(ext)) return /\.worker-/.test(path) ? 'js-worker' : 'js';
  if (ext === '.css') return 'css';
  if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.gif', '.avif'].includes(ext)) return 'image';
  if (ext === '.json' || ext === '.webmanifest') return 'json';
  if (['.mp3', '.ogg', '.wav'].includes(ext)) return 'audio';
  if (ext === '' || ext === '.html') return 'html';
  return 'other';
}

function summarizeRequests(list) {
  const byType = {};
  let bytes = 0, gz = 0;
  const seen = new Map();
  for (const r of list) {
    const k = typeOf(r.path);
    byType[k] ??= { n: 0, kB: 0, gzkB: 0 };
    byType[k].n++; byType[k].kB += r.bytes / 1000; byType[k].gzkB += r.gz / 1000;
    bytes += r.bytes; gz += r.gz;
    seen.set(r.path, (seen.get(r.path) ?? 0) + 1);
  }
  for (const v of Object.values(byType)) { v.kB = +v.kB.toFixed(1); v.gzkB = +v.gzkB.toFixed(1); }
  const duplicates = [...seen].filter(([, n]) => n > 1).map(([p, n]) => `${p.replace(BASE, '')}×${n}`);
  return { requests: list.length, kB: +(bytes / 1000).toFixed(1), gzkB: +(gz / 1000).toFixed(1), byType, duplicates };
}

// ─── processes and threads (/proc) ──────────────────────────────────────────
const CLK_TCK = (() => { try { return Number(execSync('getconf CLK_TCK').toString().trim()) || 100; } catch { return 100; } })();
function readStat(path) {
  try {
    const s = readFileSync(path, 'utf8');
    const open = s.indexOf('('), close = s.lastIndexOf(')');
    const comm = s.slice(open + 1, close);
    const f = s.slice(close + 2).split(' ');
    return { comm, ppid: Number(f[1]), ticks: Number(f[11]) + Number(f[12]) };
  } catch { return null; }
}
function cmdline(pid) { try { return readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').join(' '); } catch { return ''; } }
function browserTree(marker) {
  const pids = readdirSync('/proc').filter((d) => /^\d+$/.test(d)).map(Number);
  const info = new Map();
  for (const pid of pids) { const st = readStat(`/proc/${pid}/stat`); if (st) info.set(pid, st); }
  const roots = pids.filter((pid) => cmdline(pid).includes(marker) && !cmdline(info.get(pid)?.ppid).includes(marker));
  const tree = new Set(roots);
  let grew = true;
  while (grew) { grew = false; for (const [pid, st] of info) if (!tree.has(pid) && tree.has(st.ppid)) { tree.add(pid); grew = true; } }
  return [...tree];
}
/** CPU ticks per process type and per thread group (renderer main, workers, compositor, GPU, …). */
function cpuSnapshot(marker) {
  const out = { byType: {}, byThread: {} };
  for (const pid of browserTree(marker)) {
    const m = /--type=([\w-]+)/.exec(cmdline(pid));
    const type = m ? m[1] : 'browser';
    let tasks = [];
    try { tasks = readdirSync(`/proc/${pid}/task`); } catch { continue; }
    for (const tid of tasks) {
      const st = readStat(`/proc/${pid}/task/${tid}/stat`);
      if (!st) continue;
      out.byType[type] = (out.byType[type] ?? 0) + st.ticks;
      // a process's main thread has tid === pid (Chromium names it after the binary, e.g. "chrome")
      const group = Number(tid) === pid ? `${type}:main` : `${type}:${st.comm.replace(/[0-9]+$/, '').replace(/\s+$/, '')}`;
      out.byThread[group] = (out.byThread[group] ?? 0) + st.ticks;
    }
  }
  return out;
}
function cpuDelta(a, b, seconds) {
  const ms = (t) => (t * 1000) / CLK_TCK;
  const per = (x0, x1) => Object.fromEntries(Object.keys(x1).map((k) => [k, +(ms((x1[k] ?? 0) - (x0[k] ?? 0)) / seconds).toFixed(1)]));
  const byType = per(a.byType, b.byType);
  const byThread = per(a.byThread, b.byThread);
  const sum = (o, f) => +Object.entries(o).filter(([k]) => f(k)).reduce((s, [, v]) => s + v, 0).toFixed(1);
  return {
    totalMsPerS: sum(byType, () => true),
    rendererMainMsPerS: sum(byThread, (k) => k === 'renderer:main'),
    rendererWorkersMsPerS: sum(byThread, (k) => k.startsWith('renderer:') && /Worker/i.test(k)),
    rendererOtherMsPerS: sum(byThread, (k) => k.startsWith('renderer:') && k !== 'renderer:main' && !/Worker/i.test(k)),
    gpuMsPerS: sum(byType, (k) => k === 'gpu-process'),
    browserMsPerS: sum(byType, (k) => k === 'browser'),
    byType,
    topThreads: Object.entries(byThread).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]).slice(0, 8),
  };
}

// ─── in-page instrumentation (runs before any app script) ─────────────────────
function perfInit({ lang, jsonProbe }) {
  const now = () => performance.now();
  const P = window.__perf = {
    marks: {}, contexts: [], workers: [], longtasks: [], loafs: [],
    storage: { local: { get: 0, set: 0, remove: 0, getChars: 0, setChars: 0, ms: 0 }, session: { get: 0, set: 0, remove: 0, getChars: 0, setChars: 0, ms: 0 }, keys: {} },
    json: { parseN: 0, parseChars: 0, parseMs: 0, strN: 0, strChars: 0, strMs: 0 },
    frames: { count: 0, last: -1, times: null, cb: null, cbMs: 0, cbN: 0 },
    draws: { calls: 0, by: {}, framesBy: {}, lastFrameBy: {} },
    tex: { uploads: 0, mpix: 0, big: [] },
    errors: [],
  };
  window.addEventListener('error', (e) => P.errors.push(String(e.message).slice(0, 200)));
  // the WebMCP stand-in and the first-visit settings of tests/browser/harness.mjs
  const tools = new Map();
  navigator.modelContext = { registerTool: (tool) => {
    if (!tools.size) { P.marks.interactive = now(); requestAnimationFrame(() => { P.marks.firstFrameAfterInteractive = now(); }); }
    tools.set(tool.name, tool);
  } };
  window.__mcp = async (name, input = {}) => {
    const tool = tools.get(name);
    if (!tool) throw new Error(`no WebMCP tool "${name}"`);
    return JSON.parse(JSON.stringify(await tool.execute(input)));
  };
  try {
    localStorage.setItem('orbitlab.guide.v1', 'done');
    if (lang && !localStorage.getItem('orbitlab.lang')) localStorage.setItem('orbitlab.lang', lang);
  } catch { /* storage off */ }
  // the loading screen hidden = the app's first ready signal (src/main.ts init)
  const mo = new MutationObserver(() => {
    const el = document.getElementById('loading');
    if (el && el.classList.contains('hidden') && P.marks.loadingHidden === undefined) { P.marks.loadingHidden = now(); mo.disconnect(); }
  });
  mo.observe(document, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
  // long tasks and long animation frames
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.longtasks.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch { /* unsupported */ }
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.loafs.push([e.startTime, e.duration, e.blockingDuration ?? 0]); }).observe({ type: 'long-animation-frame', buffered: true }); } catch { /* unsupported */ }
  // animation frames: count the app's own frames, time its callbacks (no extra rAF loop is added)
  const origRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (cb) {
    return origRAF((ts) => {
      const F = P.frames;
      if (ts !== F.last) { F.count++; F.last = ts; if (F.times) F.times.push(ts); if (F.cb) F.cb.push(0); }
      const t0 = performance.now();
      try { return cb(ts); } finally {
        const d = performance.now() - t0; F.cbMs += d; F.cbN++;
        if (F.cb && F.cb.length) F.cb[F.cb.length - 1] += d;
      }
    });
  };
  // canvases: every rendering context created, and its attributes
  let canvasN = 0;
  const label = (c) => {
    if (!c) return 'none';
    if (typeof OffscreenCanvas !== 'undefined' && c instanceof OffscreenCanvas) return 'offscreen';
    if (!c.__perfLabel) c.__perfLabel = c.id ? `#${c.id}` : c.className ? `.${String(c.className).split(' ')[0]}` : `canvas${++canvasN}`;
    return c.__perfLabel;
  };
  const seenCtx = new WeakSet();
  for (const C of [window.HTMLCanvasElement, window.OffscreenCanvas].filter(Boolean)) {
    const orig = C.prototype.getContext;
    C.prototype.getContext = function (type, attrs) {
      const ctx = orig.apply(this, arguments);
      if (!ctx) P.contexts.push({ type, canvas: label(this), t: now(), failed: true });
      else if (!seenCtx.has(ctx)) {
        seenCtx.add(ctx);
        const a = attrs && typeof attrs === 'object' ? { antialias: attrs.antialias, powerPreference: attrs.powerPreference, alpha: attrs.alpha, depth: attrs.depth } : null;
        P.contexts.push({ type, canvas: label(this), t: now(), attrs: a });
      }
      return ctx;
    };
  }
  // WebGL draw calls (per canvas, and frames in which each canvas drew) and texture uploads
  const ctxLabel = new WeakMap();
  const keyOf = (gl) => { let k = ctxLabel.get(gl); if (!k) { k = label(gl.canvas); ctxLabel.set(gl, k); } return k; };
  const protos = [window.WebGL2RenderingContext?.prototype, window.WebGLRenderingContext?.prototype].filter(Boolean);
  for (const proto of protos) {
    for (const n of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements']) {
      const o = proto[n];
      if (!o) continue;
      proto[n] = function () {
        const D = P.draws, k = keyOf(this);
        D.calls++; D.by[k] = (D.by[k] ?? 0) + 1;
        if (D.lastFrameBy[k] !== P.frames.last) { D.lastFrameBy[k] = P.frames.last; D.framesBy[k] = (D.framesBy[k] ?? 0) + 1; }
        return o.apply(this, arguments);
      };
    }
    const dims = (src) => src ? [src.width || src.videoWidth || src.displayWidth || 0, src.height || src.videoHeight || src.displayHeight || 0] : [0, 0];
    const rec = (fn, gl, w, h, levels = 1) => {
      const T = P.tex; T.uploads++; T.mpix += (w * h * (levels > 1 ? 4 / 3 : 1)) / 1e6;
      if (w * h >= 512 * 512) T.big.push({ fn, w, h, canvas: keyOf(gl), t: Math.round(now()) });
    };
    const wrap = (n, f) => { const o = proto[n]; if (!o) return; proto[n] = function () { try { f(this, arguments); } catch { /* measuring only */ } return o.apply(this, arguments); }; };
    wrap('texStorage2D', (gl, a) => rec('texStorage2D', gl, a[3], a[4], a[1]));
    wrap('texImage2D', (gl, a) => { if (a.length >= 8) { if (a[1] === 0) rec('texImage2D', gl, a[3], a[4]); } else if (a[1] === 0) { const [w, h] = dims(a[5]); rec('texImage2D', gl, w, h); } });
    wrap('texSubImage2D', (gl, a) => { if (a[1] !== 0) return; if (a.length >= 8 && typeof a[4] === 'number' && typeof a[6] === 'number') rec('texSubImage2D', gl, a[4], a[5]); else { const [w, h] = dims(a[6]); rec('texSubImage2D', gl, w, h); } });
    wrap('compressedTexImage2D', (gl, a) => { if (a[1] === 0) rec('compressedTexImage2D', gl, a[3], a[4]); });
  }
  // shader programs linked with exactly the same sources as one linked before: in the same context
  // (three.js released and rebuilt an identical program) or in another context (no sharing across contexts)
  P.programs = { linked: 0, dupSameContext: 0, dupOtherContext: 0 };
  {
    // sources are reduced to a hash (two 32-bit FNV-style hashes + length) so the measurement retains no shader text
    const digest = (t) => {
      let a = 0x811c9dc5, b = 0x9e3779b9 ^ t.length;
      for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); a = Math.imul(a ^ c, 16777619); b = Math.imul(b ^ c, 2246822519); }
      return `${(a >>> 0).toString(36)}.${(b >>> 0).toString(36)}.${t.length}`;
    };
    const src = new WeakMap(), attached = new WeakMap(), seen = new Map();
    for (const proto of protos) {
      const ss = proto.shaderSource, at = proto.attachShader, lk = proto.linkProgram;
      proto.shaderSource = function (sh, text) { try { src.set(sh, digest(String(text))); } catch { /* measuring only */ } return ss.apply(this, arguments); };
      proto.attachShader = function (pr, sh) { const l = attached.get(pr) ?? []; l.push(sh); attached.set(pr, l); return at.apply(this, arguments); };
      proto.linkProgram = function (pr) {
        try {
          const key = (attached.get(pr) ?? []).map((sh) => src.get(sh) ?? '').sort().join('\u0000');
          const ctx = keyOf(this), where = seen.get(key);
          P.programs.linked++;
          if (where?.has(ctx)) P.programs.dupSameContext++; else if (where) P.programs.dupOtherContext++;
          if (where) where.add(ctx); else seen.set(key, new Set([ctx]));
        } catch { /* measuring only */ }
        return lk.apply(this, arguments);
      };
    }
  }
  // time spent inside every WebGL call, by name (sync calls such as getProgramParameter wait for the GPU process)
  P.gl = {};
  for (const proto of protos) {
    for (const n of Object.getOwnPropertyNames(proto)) {
      if (n === 'constructor') continue;
      const desc = Object.getOwnPropertyDescriptor(proto, n);
      if (!desc || typeof desc.value !== 'function') continue;
      const o = desc.value;
      proto[n] = function () {
        const t0 = performance.now();
        try { return o.apply(this, arguments); } finally { const g = P.gl[n] ??= [0, 0]; g[0]++; g[1] += performance.now() - t0; }
      };
    }
  }
  // workers created
  if (window.Worker) {
    window.Worker = new Proxy(window.Worker, { construct(target, args, nt) {
      P.workers.push({ url: String(args[0]).split('/').pop().replace(/-[A-Za-z0-9_-]{8}\.js.*/, ''), t: Math.round(now()) });
      return Reflect.construct(target, args, nt);
    } });
  }
  // raw Web Storage traffic (the workspace profile record lives in one localStorage key)
  let LS = null; try { LS = window.localStorage; } catch { /* off */ }
  const S = Storage.prototype, og = S.getItem, os = S.setItem, orm = S.removeItem;
  const group = (k) => (/^orbitlab\.profile\.v1\./.test(k) ? 'profile-record' : String(k));
  const keyStat = (k, op, chars) => { const g = P.storage.keys[group(k)] ??= { get: 0, set: 0, getChars: 0, setChars: 0 }; g[op]++; g[`${op}Chars`] += chars; };
  S.getItem = function (k) {
    const t0 = performance.now(); const v = og.call(this, k); const b = this === LS ? P.storage.local : P.storage.session;
    b.ms += performance.now() - t0; b.get++; const c = v ? v.length : 0; b.getChars += c; keyStat(k, 'get', c); return v;
  };
  S.setItem = function (k, v) {
    const t0 = performance.now(); try { return os.call(this, k, v); } finally {
      const b = this === LS ? P.storage.local : P.storage.session; b.ms += performance.now() - t0; b.set++; const c = String(v).length; b.setChars += c; keyStat(k, 'set', c);
    }
  };
  S.removeItem = function (k) { const b = this === LS ? P.storage.local : P.storage.session; b.remove++; return orm.call(this, k); };
  // optional: time spent parsing / serialising large JSON (>= 64 k characters), e.g. the profile record
  if (jsonProbe) {
    const JP = JSON.parse, JS = JSON.stringify;
    JSON.parse = function (text, reviver) {
      if (typeof text !== 'string' || text.length < 65536) return JP.call(JSON, text, reviver);
      const t0 = performance.now(); try { return JP.call(JSON, text, reviver); } finally { const J = P.json; J.parseN++; J.parseChars += text.length; J.parseMs += performance.now() - t0; }
    };
    JSON.stringify = function (v, r, s) {
      const t0 = performance.now(); const out = JS.call(JSON, v, r, s); const d = performance.now() - t0;
      if (typeof out === 'string' && out.length >= 65536) { const J = P.json; J.strN++; J.strChars += out.length; J.strMs += d; }
      return out;
    };
  }
  // window helpers used by the runner
  const copy = (o) => JSON.parse(JSON.stringify(o));
  window.__perfCounters = () => copy({ frames: { count: P.frames.count, cbMs: P.frames.cbMs, cbN: P.frames.cbN }, draws: { calls: P.draws.calls, by: P.draws.by, framesBy: P.draws.framesBy },
    storage: P.storage, json: P.json, tex: { uploads: P.tex.uploads, mpix: P.tex.mpix }, longtasks: P.longtasks.length, loafs: P.loafs.length, errors: P.errors.length, gl: P.gl, programs: P.programs });
  window.__perfBegin = () => { P.frames.times = []; P.frames.cb = []; P.window0 = { counters: window.__perfCounters(), lt: P.longtasks.length, loaf: P.loafs.length, t: performance.now() }; };
  window.__perfEntries = () => ({ longtasks: P.longtasks, loafs: P.loafs });
  window.__perfEnd = () => {
    const w0 = P.window0, c1 = window.__perfCounters(), t1 = performance.now();
    const times = P.frames.times ?? [], cb = P.frames.cb ?? [];
    P.frames.times = null; P.frames.cb = null;
    return { w0: w0.counters, w1: c1, seconds: (t1 - w0.t) / 1000, t0: w0.t, t1, times, cb,
      longtasks: P.longtasks.slice(w0.lt), loafs: P.loafs.slice(w0.loaf) };
  };
}

// ─── statistics ───────────────────────────────────────────────────────────────
const median = (a) => { const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y); if (!s.length) return NaN; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return NaN; const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1)); return s[i]; };
const r1 = (x) => (Number.isFinite(x) ? +x.toFixed(1) : null);
const r2 = (x) => (Number.isFinite(x) ? +x.toFixed(2) : null);

/** WebGL calls that wait for shader compilation/link to finish (sync round trips to the GPU process). */
const SHADER_WAIT = ['getShaderInfoLog', 'getProgramInfoLog', 'getProgramParameter', 'getShaderParameter'];
/** [name, calls, ms] per WebGL method between two counter snapshots, by time spent. */
function glDelta(a = {}, b = {}) {
  return Object.keys(b).map((n) => [n, b[n][0] - (a[n]?.[0] ?? 0), b[n][1] - (a[n]?.[1] ?? 0)]).filter(([, c]) => c > 0).sort((x, y) => y[2] - x[2]);
}
function windowStats(raw, cdp0, cdp1, cpu, extra = {}) {
  const s = raw.seconds;
  const d = (k) => (cdp1[k] ?? 0) - (cdp0[k] ?? 0);
  const frames = raw.w1.frames.count - raw.w0.frames.count;
  const intervals = raw.times.slice(1).map((t, i) => t - raw.times[i]);
  const drawsBy = Object.fromEntries(Object.keys(raw.w1.draws.framesBy).map((k) => [k, r1(((raw.w1.draws.framesBy[k] ?? 0) - (raw.w0.draws.framesBy[k] ?? 0)) / s)]).filter(([, v]) => v > 0));
  const st = (b) => ({ getsPerS: r1((raw.w1.storage[b].get - raw.w0.storage[b].get) / s), setsPerS: r1((raw.w1.storage[b].set - raw.w0.storage[b].set) / s),
    readKBPerS: r1((raw.w1.storage[b].getChars - raw.w0.storage[b].getChars) / 1000 / s), writtenKBPerS: r1((raw.w1.storage[b].setChars - raw.w0.storage[b].setChars) / 1000 / s) });
  return {
    seconds: r2(s),
    fps: r2(frames / s),
    frameMs: { p50: r1(pct(intervals, 50)), p95: r1(pct(intervals, 95)), p99: r1(pct(intervals, 99)), max: intervals.length ? r1(Math.max(...intervals)) : null, n: intervals.length },
    rafCallbackMsPerFrame: r2(median(raw.cb)),
    rafCallbackMsPerFrameP95: r2(pct(raw.cb, 95)),
    rafCallbackMaxMs: raw.cb.length ? r1(Math.max(...raw.cb)) : null,
    rafCallbackMsPerS: r1((raw.w1.frames.cbMs - raw.w0.frames.cbMs) / s),
    drawCallsPerS: r1((raw.w1.draws.calls - raw.w0.draws.calls) / s),
    drawCallsPerFrame: frames ? r1((raw.w1.draws.calls - raw.w0.draws.calls) / frames) : null,
    renderedFramesPerSByCanvas: drawsBy,
    cdp: { scriptMsPerS: r1((d('ScriptDuration') * 1000) / s), taskMsPerS: r1((d('TaskDuration') * 1000) / s),
      layoutStyleMsPerS: r1(((d('LayoutDuration') + d('RecalcStyleDuration')) * 1000) / s) },
    cpu,
    longTasks: { n: raw.longtasks.length, totalMs: r1(raw.longtasks.reduce((a, [, x]) => a + x, 0)), maxMs: r1(Math.max(0, ...raw.longtasks.map(([, x]) => x))),
      list: raw.longtasks.map(([t, x]) => [Math.round(t - raw.t0), Math.round(x)]) },
    glMsPerS: r1(glDelta(raw.w0.gl, raw.w1.gl).reduce((a, [, , ms]) => a + ms, 0) / s),
    programsCreated: glDelta(raw.w0.gl, raw.w1.gl).find(([n]) => n === 'createProgram')?.[1] ?? 0,
    programsDuplicateSameContext: raw.w1.programs.dupSameContext - raw.w0.programs.dupSameContext,
    programsDuplicateOtherContext: raw.w1.programs.dupOtherContext - raw.w0.programs.dupOtherContext,
    window: [raw.t0, raw.t1],
    shaderWaitMs: r1(glDelta(raw.w0.gl, raw.w1.gl).filter(([n]) => SHADER_WAIT.includes(n)).reduce((a, [, , ms]) => a + ms, 0)),
    glTop: glDelta(raw.w0.gl, raw.w1.gl).slice(0, 6).map(([n, c, ms]) => [n, Math.round(c / s), r2(ms / s)]),
    longAnimationFrames: { n: raw.loafs.length, blockingMs: r1(raw.loafs.reduce((a, [, , b]) => a + b, 0)) },
    localStorage: st('local'),
    ...extra,
  };
}

async function cdpMetrics(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
}

// ─── CPU profile → original sources (optional) ─────────────────────────────────
async function summarizeProfile(profile, distDir) {
  let TraceMap, originalPositionFor;
  try {
    const req = createRequire(join(OPTS.repo, 'package.json'));
    ({ TraceMap, originalPositionFor } = req('@jridgewell/trace-mapping'));
  } catch { return { error: '@jridgewell/trace-mapping not available' }; }
  const maps = new Map();
  const mapFor = (url) => {
    if (maps.has(url)) return maps.get(url);
    let m = null;
    try {
      const rel = new URL(url).pathname.replace(BASE, '');
      const p = join(distDir, `${rel}.map`);
      if (existsSync(p)) m = new TraceMap(readFileSync(p, 'utf8'));
    } catch { /* not ours */ }
    maps.set(url, m); return m;
  };
  const self = new Map();
  const dt = profile.timeDeltas ?? [];
  profile.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (dt[i + 1] ?? dt[i] ?? 0)));
  const byFile = new Map(), byFn = new Map();
  let total = 0;
  for (const node of profile.nodes) {
    const us = self.get(node.id) ?? 0;
    if (!us) continue;
    total += us;
    const cf = node.callFrame;
    let file = cf.url ? basename(new URL(cf.url, 'http://x').pathname) : `(${cf.functionName || 'native'})`;
    let fn = cf.functionName || '(anonymous)';
    const m = cf.url ? mapFor(cf.url) : null;
    if (m) {
      const pos = originalPositionFor(m, { line: cf.lineNumber + 1, column: cf.columnNumber });
      if (pos.source) { file = pos.source.replace(/^(\.\.\/)+/, '').replace(/^.*node_modules\//, 'node_modules/'); fn = `${pos.name || fn} (${file}:${pos.line})`; }
    }
    byFile.set(file, (byFile.get(file) ?? 0) + us);
    byFn.set(fn, (byFn.get(fn) ?? 0) + us);
  }
  const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, us]) => [k, r1(us / 1000), r1((100 * us) / total)]);
  return { totalMs: r1(total / 1000), topFiles: top(byFile, 20), topFunctions: top(byFn, 25) };
}

// ─── one run ────────────────────────────────────────────────────────────────
let OPTS;
async function oneRun(chromium, server, runIndex) {
  const marker = `orbitlab-perf-${randomUUID()}`;
  const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--${marker}`];
  let browser;
  try {
    browser = await chromium.launch({ executablePath: OPTS.chromium || undefined, args });
  } catch (e) {
    // Playwright's pinned browser build is not installed: use the preinstalled Chromium (never `playwright install`)
    if (OPTS.chromium || !/Executable doesn't exist/.test(String(e?.message)) || !existsSync(FALLBACK_CHROMIUM)) throw e;
    OPTS.chromium = FALLBACK_CHROMIUM;
    log(`Playwright's own browser is missing; using ${FALLBACK_CHROMIUM}`);
    browser = await chromium.launch({ executablePath: OPTS.chromium, args });
  }
  const want = (s) => !OPTS.only || OPTS.only.includes(s);
  const result = { run: runIndex, browserVersion: browser.version() };
  try {
    // ── cold start (fresh profile, service workers allowed: a real first visit) ──
    const context = await browser.newContext({ viewport: OPTS.size, deviceScaleFactor: OPTS.scale, locale: 'en-GB' });
    await context.addInitScript(perfInit, { lang: 'en', jsonProbe: false });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    const reqStart = server.requests.length;
    const cpuStart = cpuSnapshot(marker);
    if (OPTS.profile) {
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
      await cdp.send('Profiler.start');
    }
    const wallStart = Date.now();
    await page.goto(OPTS.base, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForFunction(() => window.__perf?.marks.interactive !== undefined, null, { timeout: 180_000, polling: 50 });
    await page.waitForFunction(() => window.__perf?.marks.firstFrameAfterInteractive !== undefined, null, { timeout: 60_000, polling: 50 });
    let startupProfile = null;
    if (OPTS.profile) {
      const { profile } = await cdp.send('Profiler.stop');
      await cdp.send('Profiler.disable');
      startupProfile = await summarizeProfile(profile, OPTS.dist);
    }
    const cdpAtReady = await cdpMetrics(cdp);
    const cpuAtReady = cpuSnapshot(marker);
    const wallAtReady = Date.now();
    const startup = await page.evaluate(() => {
      const P = window.__perf, nav = performance.getEntriesByType('navigation')[0];
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      const until = P.marks.interactive;
      const lts = P.longtasks.filter(([s]) => s <= until);
      return {
        timeOrigin: performance.timeOrigin,
        responseEndMs: nav?.responseEnd, domContentLoadedMs: nav?.domContentLoadedEventEnd, loadMs: nav?.loadEventEnd || null, fcpMs: fcp?.startTime ?? null,
        loadingHiddenMs: P.marks.loadingHidden, interactiveMs: P.marks.interactive, firstFrameMs: P.marks.firstFrameAfterInteractive,
        longTasks: { n: lts.length, totalMs: lts.reduce((a, [, d]) => a + d, 0), tbtMs: lts.reduce((a, [, d]) => a + Math.max(0, d - 50), 0), maxMs: Math.max(0, ...lts.map(([, d]) => d)) },
        contexts: P.contexts.filter((c) => c.t <= until), workers: P.workers.filter((w) => w.t <= until),
        tex: { uploads: P.tex.uploads, mpix: P.tex.mpix, big: P.tex.big.filter((b) => b.t <= until) },
        storage: JSON.parse(JSON.stringify(P.storage)),
        gl: JSON.parse(JSON.stringify(P.gl)),
        programs: { ...P.programs },
      };
    });
    // load event may fire after interactive; wait for it, then record it
    await page.waitForFunction(() => performance.getEntriesByType('navigation')[0]?.loadEventEnd > 0, null, { timeout: 60_000 }).catch(() => {});
    startup.loadMs = await page.evaluate(() => performance.getEntriesByType('navigation')[0]?.loadEventEnd || null);
    const readyEpoch = startup.timeOrigin + startup.interactiveMs;
    const startupReqs = server.requests.slice(reqStart).filter((r) => r.t <= readyEpoch);
    // network quiet: the service worker's precache, deferred chunks, data files
    const quietStart = Date.now();
    let lastCount = server.requests.length, lastChange = Date.now();
    while (Date.now() - quietStart < 30_000) {
      await sleep(250);
      if (server.requests.length !== lastCount) { lastCount = server.requests.length; lastChange = Date.now(); }
      if (Date.now() - lastChange >= 2000) break;
    }
    const afterReady = server.requests.slice(reqStart).filter((r) => r.t > readyEpoch);
    const sw = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker?.getRegistration?.();
      return { registered: !!reg, active: !!reg?.active, controlled: !!navigator.serviceWorker?.controller };
    }).catch(() => ({}));
    const cpuStartup = cpuDelta(cpuStart, cpuAtReady, (wallAtReady - wallStart) / 1000);
    const lastReq = afterReady.length ? Math.max(...afterReady.map((r) => r.t)) : readyEpoch;
    await sleep(1000);
    const heapPre = await cdpMetrics(cdp);
    try { await cdp.send('HeapProfiler.collectGarbage'); } catch { /* unsupported */ }
    await sleep(300);
    const heapPost = await cdpMetrics(cdp);
    result.startup = {
      domContentLoadedMs: r1(startup.domContentLoadedMs), loadMs: r1(startup.loadMs), fcpMs: r1(startup.fcpMs),
      loadingHiddenMs: r1(startup.loadingHiddenMs), interactiveMs: r1(startup.interactiveMs), firstFrameMs: r1(startup.firstFrameMs),
      mainThreadToInteractive: { scriptMs: r1(cdpAtReady.ScriptDuration * 1000), taskMs: r1(cdpAtReady.TaskDuration * 1000), layoutStyleMs: r1((cdpAtReady.LayoutDuration + cdpAtReady.RecalcStyleDuration) * 1000) },
      cpuToInteractiveMs: { total: r1(cpuStartup.totalMsPerS * (wallAtReady - wallStart) / 1000), rendererMain: r1(cpuStartup.rendererMainMsPerS * (wallAtReady - wallStart) / 1000), gpu: r1(cpuStartup.gpuMsPerS * (wallAtReady - wallStart) / 1000) },
      longTasks: { n: startup.longTasks.n, totalMs: r1(startup.longTasks.totalMs), tbtMs: r1(startup.longTasks.tbtMs), maxMs: r1(startup.longTasks.maxMs) },
      network: summarizeRequests(startupReqs),
      imagesFetched: startupReqs.filter((r) => typeOf(r.path) === 'image').map((r) => `${r.path.replace(BASE, '')} (${(r.bytes / 1000).toFixed(0)} kB)`),
      jsonFetched: startupReqs.filter((r) => typeOf(r.path) === 'json').map((r) => `${r.path.replace(BASE, '')} (${(r.bytes / 1000).toFixed(0)} kB)`),
      afterInteractive: { ...summarizeRequests(afterReady), untilQuietMs: r1(lastReq - readyEpoch),
        refetchedKB: r1(afterReady.filter((r) => startupReqs.some((q) => q.path === r.path)).reduce((a, r) => a + r.bytes, 0) / 1000),
        refetchedN: afterReady.filter((r) => startupReqs.some((q) => q.path === r.path)).length },
      serviceWorker: sw,
      webglContexts: startup.contexts.filter((c) => /webgl/.test(c.type) && !c.failed).length,
      contexts: startup.contexts.map((c) => `${c.type}@${c.canvas}${c.failed ? ' FAILED' : ''}${c.attrs?.powerPreference ? ` (${c.attrs.powerPreference})` : ''} t=${Math.round(c.t)}`),
      workers: startup.workers.map((w) => `${w.url} t=${w.t}`),
      textureUploadsToInteractive: { n: startup.tex.uploads, mpix: r1(startup.tex.mpix), big: startup.tex.big.map((b) => `${b.fn} ${b.w}x${b.h} @${b.canvas}`) },
      webglCallMsToInteractive: r1(glDelta({}, startup.gl).reduce((a, [, , ms]) => a + ms, 0)),
      shaderProgramsToInteractive: glDelta({}, startup.gl).find(([n]) => n === 'createProgram')?.[1] ?? 0,
      shaderProgramsDuplicateToInteractive: startup.programs.dupSameContext + startup.programs.dupOtherContext,
      shaderWaitMsToInteractive: r1(glDelta({}, startup.gl).filter(([n]) => SHADER_WAIT.includes(n)).reduce((a, [, , ms]) => a + ms, 0)),
      textureUploadMsToInteractive: r1(glDelta({}, startup.gl).filter(([n]) => /^tex(Sub)?Image2D$|^texStorage2D$/.test(n)).reduce((a, [, , ms]) => a + ms, 0)),
      webglTopCallsToInteractive: glDelta({}, startup.gl).slice(0, 8).map(([n, c, ms]) => `${n} ×${c} ${ms.toFixed(0)} ms`),
      storageToInteractive: { local: startup.storage.local, session: startup.storage.session, profileRecord: startup.storage.keys['profile-record'] ?? null },
      heapMB: { usedPreGC: r1(heapPre.JSHeapUsedSize / 1e6), usedPostGC: r1(heapPost.JSHeapUsedSize / 1e6), totalPostGC: r1(heapPost.JSHeapTotalSize / 1e6) },
      dom: { nodes: heapPost.Nodes, listeners: heapPost.JSEventListeners, documents: heapPost.Documents },
      profile: startupProfile,
    };
    log(`run ${runIndex}: interactive ${result.startup.interactiveMs} ms, ${result.startup.network.requests} req / ${result.startup.network.kB} kB before interactive`);

    const measure = async (name, seconds, { extraFn = null, action = null } = {}) => {
      await page.evaluate(() => window.__perfBegin());
      const c0 = await cdpMetrics(cdp); const p0 = cpuSnapshot(marker); const t0 = Date.now();
      const before = extraFn ? await extraFn('before') : null;
      let actionMs = null;
      if (action) {
        const a0 = Date.now(); await action(); actionMs = Date.now() - a0;
        // a transition lasts until the app has drawn three more frames (the hitch is over), at least `seconds`, at most 30 s more
        const f0 = await page.evaluate(() => window.__perf.frames.count);
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline) {
          if (Date.now() - t0 >= seconds * 1000 && await page.evaluate((n) => window.__perf.frames.count >= n, f0 + 3)) break;
          await sleep(100);
        }
        await sleep(250); // long-task entries are delivered asynchronously
      }
      const rest = seconds * 1000 - (Date.now() - t0);
      if (rest > 0) await sleep(rest);
      const after = extraFn ? await extraFn('after') : null;
      const c1 = await cdpMetrics(cdp); const p1 = cpuSnapshot(marker); const t1 = Date.now();
      const raw = await page.evaluate(() => window.__perfEnd());
      const extra = extraFn ? await extraFn('summary', before, after, raw.seconds) : {};
      if (actionMs !== null) extra.actionMs = actionMs;
      const stats = windowStats(raw, c0, c1, cpuDelta(p0, p1, (t1 - t0) / 1000), extra);
      log(`run ${runIndex}: ${name}: ${stats.fps} fps, frame p50 ${stats.frameMs.p50} max ${stats.frameMs.max} ms, rAF cb ${stats.rafCallbackMsPerFrame} ms/frame, main ${stats.cpu.rendererMainMsPerS} ms/s, all CPU ${stats.cpu.totalMsPerS} ms/s, long tasks ${JSON.stringify(stats.longTasks.list)}${actionMs !== null ? `, action ${actionMs} ms` : ''}`);
      return stats;
    };
    result.idle = {};
    await sleep(1000);
    if (want('home')) result.idle.home = await measure('home', OPTS.window);
    if (want('orbit')) {
      // entering the section: the hitch the user sees, then its steady cost playing and paused
      result.idle.orbitEnter = await measure('orbit enter', 4, { action: async () => {
        await page.evaluate(() => { location.hash = '#/orbit/explore'; });
        await page.locator('.pg-canvas-3d').first().waitFor({ state: 'visible', timeout: 60_000 });
      } });
      await sleep(1000);
      result.idle.orbitPlaying = await measure('orbit playing', OPTS.window);
      await page.locator('.pg-play').first().click();
      const paused = await page.locator('.pg-play').first().evaluate((b) => b.textContent.includes('\u25B6'));
      await sleep(1000);
      result.idle.orbitPaused = await measure('orbit paused', OPTS.window, { extraFn: async (phase) => (phase === 'summary' ? { pausedConfirmed: paused } : null) });
    }
    if (want('launch') || want('flight')) {
      // entering Launch and configuring Falcon 9 → LEO from Cape Canaveral (as tests/browser/journeys/launch-explore.mjs)
      result.idle.launchEnter = await measure('launch enter + configure', 4, { action: async () => {
        await page.evaluate(() => { location.hash = '#/launch/explore'; });
        await page.waitForFunction(() => document.body.dataset.section === 'launch', null, { timeout: 30_000 });
        const setup = await page.evaluate(() => window.__mcp('configure_mission', { vehicleId: 'falcon9', siteId: 'cape', orbitId: 'leo' }));
        if (!setup.ok) throw new Error('configure_mission failed');
      } });
      await sleep(1500);
      if (want('launch')) result.idle.launchPad = await measure('launch pad', OPTS.window);
      if (want('flight')) {
        result.idle.flightStart = await measure('flight start (ignition, liftoff)', 4, { action: async () => {
          const launched = await page.evaluate(() => window.__mcp('launch_mission', {}));
          if (!launched.ok) throw new Error('launch_mission failed');
        } });
        const simClock = async (phase, a, b, secs) => {
          if (phase !== 'summary') return (await page.evaluate(() => window.__mcp('read_flight_state'))).frame;
          return { simSecondsPerWallSecond: r2((b.timeS - a.timeS) / secs), simT: [r1(a.timeS), r1(b.timeS)], status: b.status };
        };
        if (OPTS.profile) {
          await cdp.send('Profiler.enable');
          await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
          await cdp.send('Profiler.start');
        }
        result.idle.flight1x = await measure('flight 1x', OPTS.flightWindow, { extraFn: simClock });
        if (OPTS.profile) {
          const { profile } = await cdp.send('Profiler.stop');
          result.idle.flight1x.profile = await summarizeProfile(profile, OPTS.dist);
          await cdp.send('Profiler.disable');
        }
        const warp = await page.evaluate(() => window.__mcp('control_playback', { action: 'warp', warp: 100 }));
        if (!warp.ok) throw new Error('warp failed');
        await sleep(1500);
        result.idle.flight100x = await measure('flight 100x', OPTS.window, { extraFn: simClock });
        await page.evaluate(() => window.__mcp('control_playback', { action: 'pause' })).catch(() => {});
      }
    }
    // long-task / long-animation-frame entries can arrive after their window closed: re-assign them by start time
    {
      const { longtasks, loafs } = await page.evaluate(() => window.__perfEntries());
      for (const w of Object.values(result.idle)) {
        const [a, b] = w.window;
        const lt = longtasks.filter(([t]) => t >= a && t < b), lf = loafs.filter(([t]) => t >= a && t < b);
        w.longTasks = { n: lt.length, totalMs: r1(lt.reduce((x, [, d]) => x + d, 0)), maxMs: r1(Math.max(0, ...lt.map(([, d]) => d))), list: lt.map(([t, d]) => [Math.round(t - a), Math.round(d)]) };
        w.longAnimationFrames = { n: lf.length, blockingMs: r1(lf.reduce((x, [, , bl]) => x + bl, 0)), maxMs: r1(Math.max(0, ...lf.map(([, d]) => d))) };
      }
    }
    // ── warm start: reload with the service worker in control ──
    if (want('warm')) {
      const reqWarm = server.requests.length;
      await cdp.send('Performance.disable').catch(() => {});
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
      await cdp.send('Performance.enable').catch(() => {});
      await page.waitForFunction(() => window.__perf?.marks.interactive !== undefined, null, { timeout: 180_000, polling: 50 });
      await page.waitForFunction(() => window.__perf?.marks.firstFrameAfterInteractive !== undefined, null, { timeout: 60_000, polling: 50 });
      const w = await page.evaluate(() => {
        const P = window.__perf, nav = performance.getEntriesByType('navigation')[0];
        const lts = P.longtasks.filter(([s]) => s <= P.marks.interactive);
        return { timeOrigin: performance.timeOrigin, dcl: nav?.domContentLoadedEventEnd, hidden: P.marks.loadingHidden, interactive: P.marks.interactive, first: P.marks.firstFrameAfterInteractive,
          tbt: lts.reduce((a, [, d]) => a + Math.max(0, d - 50), 0), controlled: !!navigator.serviceWorker?.controller,
          contexts: P.contexts.filter((c) => /webgl/.test(c.type) && !c.failed && c.t <= P.marks.interactive).length,
          programs: P.gl.createProgram?.[0] ?? 0, shaderWait: ['getShaderInfoLog', 'getProgramInfoLog', 'getProgramParameter', 'getShaderParameter'].reduce((a, n) => a + (P.gl[n]?.[1] ?? 0), 0) };
      });
      const warmReqs = server.requests.slice(reqWarm).filter((r) => r.t <= w.timeOrigin + w.interactive);
      result.warmStart = { controlledBySW: w.controlled, domContentLoadedMs: r1(w.dcl), loadingHiddenMs: r1(w.hidden), interactiveMs: r1(w.interactive), firstFrameMs: r1(w.first),
        tbtMs: r1(w.tbt), webglContexts: w.contexts, shaderProgramsToFirstFrame: w.programs, shaderWaitMsToFirstFrame: r1(w.shaderWait), network: summarizeRequests(warmReqs) };
      log(`run ${runIndex}: warm start interactive ${result.warmStart.interactiveMs} ms, ${result.warmStart.network.requests} requests reached the server`);
    }
    result.pageErrors = pageErrors;
    await context.close();

    // ── storage: a default profile vs a ~1.5 MB profile ──
    if (want('storage')) {
      result.storage = {};
      for (const [name, padChars] of [['defaultProfile', 0], ['largeProfile', 1_500_000]]) {
        const ctx = await browser.newContext({ viewport: OPTS.size, deviceScaleFactor: OPTS.scale, locale: 'en-GB', serviceWorkers: 'block' });
        await ctx.addInitScript(perfInit, { lang: 'en', jsonProbe: true });
        const pg = await ctx.newPage();
        await pg.goto(OPTS.base, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await pg.waitForFunction(() => window.__perf?.marks.interactive !== undefined, null, { timeout: 180_000, polling: 50 });
        await sleep(500);
        // a documented fixture (cf. tests/browser/workspace-storage.mjs putWorkspaceFixture): bytes in the current owner's record
        const recordChars = await pg.evaluate((pad) => {
          const id = sessionStorage.getItem('orbitlab.profiles.selected.v1') || JSON.parse(localStorage.getItem('orbitlab.profiles.catalog.v1') ?? 'null')?.legacyId;
          const key = `orbitlab.profile.v1.${id}`;
          const record = JSON.parse(localStorage.getItem(key));
          if (pad > 0) {
            record.values['orbitlab.author.draft'] = JSON.stringify({ id: 'perf-fixture', criteria: [], notes: 'x'.repeat(pad) });
            record.revision++;
            localStorage.setItem(key, JSON.stringify(record));
          }
          return localStorage.getItem(key).length;
        }, padChars);
        await pg.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
        await pg.waitForFunction(() => window.__perf?.marks.interactive !== undefined, null, { timeout: 180_000, polling: 50 });
        const atStart = await pg.evaluate(() => ({ interactive: window.__perf.marks.interactive, hidden: window.__perf.marks.loadingHidden, c: window.__perfCounters() }));
        await sleep(1500);
        await pg.evaluate(() => { location.hash = '#/launch/explore'; });
        await sleep(1500);
        const op = await pg.evaluate(async () => {
          const c0 = window.__perfCounters(); const t0 = performance.now();
          await window.__mcp('configure_mission', { vehicleId: 'falcon9', siteId: 'cape', orbitId: 'leo' });
          const t1 = performance.now();
          await new Promise((r) => setTimeout(r, 1000)); // debounced saves
          const c1 = window.__perfCounters();
          return { ms: t1 - t0, c0, c1 };
        });
        const pr = (c) => c.storage.keys['profile-record'] ?? { get: 0, set: 0, getChars: 0, setChars: 0 };
        const delta = (a, b) => ({ recordReads: pr(b).get - pr(a).get, recordWrites: pr(b).set - pr(a).set,
          recordMBRead: r2((pr(b).getChars - pr(a).getChars) / 1e6), recordMBWritten: r2((pr(b).setChars - pr(a).setChars) / 1e6),
          bigJsonParse: { n: b.json.parseN - a.json.parseN, ms: r1(b.json.parseMs - a.json.parseMs) }, bigJsonStringify: { n: b.json.strN - a.json.strN, ms: r1(b.json.strMs - a.json.strMs) },
          localGets: b.storage.local.get - a.storage.local.get, localSets: b.storage.local.set - a.storage.local.set, nativeStorageMs: r1(b.storage.local.ms - a.storage.local.ms) });
        const zero = { storage: { keys: {}, local: { get: 0, set: 0, ms: 0 } }, json: { parseN: 0, parseMs: 0, strN: 0, strMs: 0 } };
        result.storage[name] = { recordKB: r1(recordChars / 1000), reloadInteractiveMs: r1(atStart.interactive), reloadLoadingHiddenMs: r1(atStart.hidden),
          startup: delta(zero, atStart.c), configureMission: { wallMs: r1(op.ms), ...delta(op.c0, op.c1) } };
        log(`run ${runIndex}: storage ${name}: record ${result.storage[name].recordKB} kB, interactive ${result.storage[name].reloadInteractiveMs} ms, startup record reads ${result.storage[name].startup.recordReads}, configure_mission ${result.storage[name].configureMission.wallMs} ms`);
        await ctx.close();
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }
  return result;
}

// ─── aggregation and reporting ────────────────────────────────────────────────
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'number') out[key] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
  }
  return out;
}
function aggregate(runs) {
  const flat = runs.map((r) => flatten(r));
  const keys = [...new Set(flat.flatMap((f) => Object.keys(f)))].filter((k) => !/\.run$|^run$|timeOrigin/.test(k));
  const agg = {};
  for (const k of keys) {
    const vals = flat.map((f) => f[k]).filter((v) => Number.isFinite(v));
    if (!vals.length) continue;
    const med = median(vals), lo = Math.min(...vals), hi = Math.max(...vals);
    agg[k] = { median: r2(med), min: r2(lo), max: r2(hi), spreadPct: med ? r1((100 * (hi - lo)) / Math.abs(med)) : 0, n: vals.length };
  }
  return agg;
}
const fmt = (a) => (a ? `${a.median} (${a.min}–${a.max})` : 'n/a');
function report(res) {
  const A = res.aggregate;
  const g = (k) => A[k];
  const lines = [];
  lines.push(`# Orbitlab performance baseline — ${res.label}`);
  lines.push(`${res.when} · ${res.runs.length} runs · ${res.env.cpus}×${res.env.cpuModel} · Chromium ${res.runs[0]?.browserVersion} · ${res.opts.viewport} @ DPR ${res.opts.scale} · SwiftShader WebGL · dist ${res.env.dist}`);
  lines.push('Values: median (min–max) over runs.\n');
  lines.push('## Startup (cold, fresh profile, first visit)');
  lines.push('| metric | value |\n|---|---|');
  for (const [label, k] of [
    ['DOMContentLoaded ms', 'startup.domContentLoadedMs'], ['load event ms', 'startup.loadMs'], ['first contentful paint ms', 'startup.fcpMs'],
    ['#loading hidden (scene ready) ms', 'startup.loadingHiddenMs'], ['interactive (init done, WebMCP registered) ms', 'startup.interactiveMs'], ['first frame after interactive ms', 'startup.firstFrameMs'],
    ['main-thread script ms to interactive (CDP)', 'startup.mainThreadToInteractive.scriptMs'], ['main-thread task ms to interactive (CDP)', 'startup.mainThreadToInteractive.taskMs'],
    ['all-process CPU ms to interactive', 'startup.cpuToInteractiveMs.total'], ['renderer main-thread CPU ms to interactive', 'startup.cpuToInteractiveMs.rendererMain'], ['GPU process CPU ms to interactive', 'startup.cpuToInteractiveMs.gpu'],
    ['long tasks (n) to interactive', 'startup.longTasks.n'], ['long tasks total ms', 'startup.longTasks.totalMs'], ['total blocking time ms', 'startup.longTasks.tbtMs'], ['longest task ms', 'startup.longTasks.maxMs'],
    ['requests to interactive', 'startup.network.requests'], ['bytes to interactive kB (raw)', 'startup.network.kB'], ['bytes to interactive kB (gzip est.)', 'startup.network.gzkB'],
    ['  JS kB', 'startup.network.byType.js.kB'], ['  JS worker kB', 'startup.network.byType.js-worker.kB'], ['  CSS kB', 'startup.network.byType.css.kB'], ['  images kB', 'startup.network.byType.image.kB'], ['  JSON kB', 'startup.network.byType.json.kB'], ['  HTML kB', 'startup.network.byType.html.kB'],
    ['requests after interactive (SW precache etc.)', 'startup.afterInteractive.requests'], ['bytes after interactive kB', 'startup.afterInteractive.kB'], ['  …until network quiet ms', 'startup.afterInteractive.untilQuietMs'],
    ['  of which re-fetched (same path) kB', 'startup.afterInteractive.refetchedKB'],
    ['time inside WebGL calls to interactive ms', 'startup.webglCallMsToInteractive'],
    ['  shader programs created', 'startup.shaderProgramsToInteractive'], ['  of which identical to one linked earlier', 'startup.shaderProgramsDuplicateToInteractive'], ['  waiting on shader compile/link ms', 'startup.shaderWaitMsToInteractive'], ['  texture upload calls ms (incl. image decode)', 'startup.textureUploadMsToInteractive'],
    ['WebGL contexts to interactive', 'startup.webglContexts'], ['texture uploads to interactive', 'startup.textureUploadsToInteractive.n'], ['texture Mpixels uploaded', 'startup.textureUploadsToInteractive.mpix'],
    ['localStorage gets to interactive', 'startup.storageToInteractive.local.get'], ['localStorage chars read', 'startup.storageToInteractive.local.getChars'], ['profile-record reads', 'startup.storageToInteractive.profileRecord.get'], ['profile-record writes', 'startup.storageToInteractive.profileRecord.set'],
    ['JS heap used MB (pre-GC, settled)', 'startup.heapMB.usedPreGC'], ['JS heap used MB (post-GC)', 'startup.heapMB.usedPostGC'], ['DOM nodes', 'startup.dom.nodes'], ['JS event listeners', 'startup.dom.listeners'],
  ]) if (g(k)) lines.push(`| ${label} | ${fmt(g(k))} |`);
  const r0 = res.runs[0]?.startup;
  if (r0) {
    lines.push(`\nRun 1 detail — contexts: ${r0.contexts.join('; ')}`);
    lines.push(`Workers created to interactive: ${r0.workers.join('; ') || 'none'}`);
    lines.push(`Images fetched to interactive: ${r0.imagesFetched.join(', ') || 'none'}`);
    lines.push(`JSON fetched to interactive: ${r0.jsonFetched.join(', ') || 'none'}`);
    lines.push(`Large texture uploads: ${r0.textureUploadsToInteractive.big.join('; ') || 'none'}`);
    lines.push(`WebGL calls by time to interactive: ${r0.webglTopCallsToInteractive.join('; ')}`);
    lines.push(`Duplicate fetches to interactive: ${r0.network.duplicates.join(', ') || 'none'}`);
    lines.push(`Service worker: ${JSON.stringify(r0.serviceWorker)}; after-interactive by type: ${JSON.stringify(r0.afterInteractive.byType)}`);
  }
  if (g('warmStart.interactiveMs')) {
    lines.push('\n## Warm start (reload, service worker in control)');
    lines.push('| metric | value |\n|---|---|');
    for (const [label, k] of [['DOMContentLoaded ms', 'warmStart.domContentLoadedMs'], ['#loading hidden ms', 'warmStart.loadingHiddenMs'], ['interactive ms', 'warmStart.interactiveMs'], ['first frame ms', 'warmStart.firstFrameMs'], ['TBT ms', 'warmStart.tbtMs'], ['shader programs (to now)', 'warmStart.shaderProgramsToFirstFrame'], ['waiting on shader compile/link ms', 'warmStart.shaderWaitMsToFirstFrame'], ['requests reaching the server', 'warmStart.network.requests'], ['kB from server', 'warmStart.network.kB'], ['WebGL contexts', 'warmStart.webglContexts']])
      if (g(k)) lines.push(`| ${label} | ${fmt(g(k))} |`);
  }
  const TRANSITIONS = ['orbitEnter', 'launchEnter', 'flightStart'];
  const trans = Object.keys(res.runs[0]?.idle ?? {}).filter((w) => TRANSITIONS.includes(w));
  if (trans.length) {
    lines.push('\n## Transitions (4 s window from the user action; hitches the user feels)');
    lines.push(`| metric | ${trans.join(' | ')} |`);
    lines.push(`|---|${trans.map(() => '---').join('|')}|`);
    for (const [label, k] of [['action wall ms (route+wait / MCP call)', 'actionMs'], ['window length s (until 3 frames after the action)', 'seconds'], ['longest frame interval ms', 'frameMs.max'], ['longest app rAF callback ms', 'rafCallbackMaxMs'], ['frames/s in window', 'fps'],
      ['long tasks (n)', 'longTasks.n'], ['long tasks total ms', 'longTasks.totalMs'], ['longest task ms', 'longTasks.maxMs'],
      ['time inside WebGL calls ms/s', 'glMsPerS'], ['shader programs created', 'programsCreated'], ['  identical to one already linked in this context', 'programsDuplicateSameContext'], ['  identical to one linked in another context', 'programsDuplicateOtherContext'], ['waiting on shader compile/link ms', 'shaderWaitMs'], ['CDP task ms/s (main)', 'cdp.taskMsPerS']]) {
      const cells = trans.map((w) => fmt(g(`idle.${w}.${k}`)));
      if (cells.some((c) => c !== 'n/a')) lines.push(`| ${label} | ${cells.join(' | ')} |`);
    }
    lines.push(`\nRun-by-run long tasks [start ms into window, duration ms]: ${trans.map((w) => `${w}: ${res.runs.map((r) => JSON.stringify(r.idle[w]?.longTasks.list ?? [])).join(' / ')}`).join('; ')}`);
    lines.push(`Run 1 WebGL calls by time [name, calls/s, ms/s]: ${trans.map((w) => `${w}: ${JSON.stringify(res.runs[0].idle[w].glTop.slice(0, 3))}`).join('; ')}`);
  }
  const windows = Object.keys(res.runs[0]?.idle ?? {}).filter((w) => !TRANSITIONS.includes(w));
  if (windows.length) {
    lines.push('\n## Steady-state cost per scenario (per wall-clock second unless noted)');
    lines.push(`| metric | ${windows.join(' | ')} |`);
    lines.push(`|---|${windows.map(() => '---').join('|')}|`);
    for (const [label, k] of [
      ['frames/s (app rAF)', 'fps'], ['frame interval p50 ms', 'frameMs.p50'], ['frame interval p95 ms', 'frameMs.p95'], ['frame interval p99 ms', 'frameMs.p99'], ['frame interval max ms', 'frameMs.max'],
      ['rAF callback ms/frame (median)', 'rafCallbackMsPerFrame'], ['rAF callback ms/frame p95', 'rafCallbackMsPerFrameP95'], ['rAF callback max ms', 'rafCallbackMaxMs'], ['rAF callback ms/s', 'rafCallbackMsPerS'],
      ['WebGL draw calls/s', 'drawCallsPerS'], ['draw calls/frame', 'drawCallsPerFrame'], ['time inside WebGL calls ms/s', 'glMsPerS'],
      ['CDP script ms/s (main)', 'cdp.scriptMsPerS'], ['CDP task ms/s (main)', 'cdp.taskMsPerS'], ['CDP layout+style ms/s', 'cdp.layoutStyleMsPerS'],
      ['CPU renderer main ms/s', 'cpu.rendererMainMsPerS'], ['CPU renderer workers ms/s', 'cpu.rendererWorkersMsPerS'], ['CPU renderer other ms/s', 'cpu.rendererOtherMsPerS'], ['CPU GPU process ms/s', 'cpu.gpuMsPerS'], ['CPU browser ms/s', 'cpu.browserMsPerS'], ['CPU all processes ms/s', 'cpu.totalMsPerS'],
      ['long tasks (n)', 'longTasks.n'], ['longest task ms', 'longTasks.maxMs'],
      ['shader programs created', 'programsCreated'],
      ['localStorage gets/s', 'localStorage.getsPerS'], ['localStorage sets/s', 'localStorage.setsPerS'], ['localStorage kB read/s', 'localStorage.readKBPerS'], ['localStorage kB written/s', 'localStorage.writtenKBPerS'],
      ['sim s per wall s', 'simSecondsPerWallSecond'],
    ]) {
      const cells = windows.map((w) => fmt(g(`idle.${w}.${k}`)));
      if (cells.some((c) => c !== 'n/a')) lines.push(`| ${label} | ${cells.join(' | ')} |`);
    }
    const canv = windows.map((w) => `${w}: ${JSON.stringify(res.runs[0].idle[w].renderedFramesPerSByCanvas)}`);
    lines.push(`\nRun 1 — frames/s in which each canvas issued draw calls: ${canv.join('; ')}`);
    const threads = windows.map((w) => `${w}: ${res.runs[0].idle[w].cpu.topThreads.map(([k, v]) => `${k} ${v}`).join(', ')}`);
    lines.push(`\nRun 1 — busiest threads (ms/s): ${threads.join(' || ')}`);
    lines.push(`\nRun 1 — WebGL calls by time [name, calls/s, ms/s]: ${windows.map((w) => `${w}: ${JSON.stringify(res.runs[0].idle[w].glTop.slice(0, 4))}`).join('; ')}`);
    if (res.runs[0].idle.orbitPaused) lines.push(`\nOrbit pause confirmed: ${res.runs.map((r) => r.idle.orbitPaused?.pausedConfirmed).join(', ')}`);
  }
  if (res.runs[0]?.storage) {
    lines.push('\n## Workspace storage (default vs ~1.5 MB profile; reload in a fresh context, service worker blocked)');
    lines.push('| metric | defaultProfile | largeProfile |\n|---|---|---|');
    for (const [label, k] of [['profile record kB', 'recordKB'], ['reload: interactive ms', 'reloadInteractiveMs'], ['startup: profile-record reads', 'startup.recordReads'], ['startup: MB of record read', 'startup.recordMBRead'],
      ['startup: profile-record writes', 'startup.recordWrites'], ['startup: big JSON.parse n', 'startup.bigJsonParse.n'], ['startup: big JSON.parse ms', 'startup.bigJsonParse.ms'], ['startup: big JSON.stringify n', 'startup.bigJsonStringify.n'], ['startup: big JSON.stringify ms', 'startup.bigJsonStringify.ms'],
      ['startup: native localStorage ms', 'startup.nativeStorageMs'],
      ['configure_mission: wall ms', 'configureMission.wallMs'], ['configure_mission (+1 s): record reads', 'configureMission.recordReads'], ['configure_mission (+1 s): record writes', 'configureMission.recordWrites'],
      ['configure_mission (+1 s): MB read', 'configureMission.recordMBRead'], ['configure_mission (+1 s): MB written', 'configureMission.recordMBWritten'],
      ['configure_mission (+1 s): big JSON parse ms', 'configureMission.bigJsonParse.ms'], ['configure_mission (+1 s): big JSON stringify ms', 'configureMission.bigJsonStringify.ms']])
      lines.push(`| ${label} | ${fmt(g(`storage.defaultProfile.${k}`))} | ${fmt(g(`storage.largeProfile.${k}`))} |`);
  }
  for (const [title, prof] of [['startup to interactive', res.runs.find((r) => r.startup?.profile)?.startup.profile], ['1× flight window', res.runs.find((r) => r.idle?.flight1x?.profile)?.idle.flight1x.profile]]) {
  if (!prof || prof.error) continue;
    lines.push(`\n## CPU profile, main thread, ${title} (run 1, ${prof.totalMs} ms sampled incl. idle)`);
    lines.push('| source file | self ms | % |\n|---|---|---|');
    for (const [f, ms, p] of prof.topFiles) lines.push(`| ${f} | ${ms} | ${p} |`);
    lines.push('\n| function | self ms | % |\n|---|---|---|');
    for (const [f, ms, p] of prof.topFunctions) lines.push(`| ${f} | ${ms} | ${p} |`);
  }
  const errs = res.runs.flatMap((r) => r.pageErrors ?? []);
  lines.push(`\nPage errors during runs: ${errs.length ? errs.join(' | ') : 'none'}`);
  return lines.join('\n');
}

function compare(aPath, bPath) {
  const a = JSON.parse(readFileSync(aPath, 'utf8')), b = JSON.parse(readFileSync(bPath, 'utf8'));
  const keys = [...new Set([...Object.keys(a.aggregate), ...Object.keys(b.aggregate)])].sort();
  const lines = [`# ${a.label} → ${b.label}`, '| metric | before | after | Δ % | beyond run spread? |', '|---|---|---|---|---|'];
  for (const k of keys) {
    const x = a.aggregate[k], y = b.aggregate[k];
    if (!x || !y) continue;
    const d = x.median ? (100 * (y.median - x.median)) / Math.abs(x.median) : 0;
    const beyond = y.max < x.min || y.min > x.max;
    if (Math.abs(d) < 0.05 && !beyond) continue;
    lines.push(`| ${k} | ${fmt(x)} | ${fmt(y)} | ${d.toFixed(1)} | ${beyond ? 'yes' : 'no'} |`);
  }
  return lines.join('\n');
}

// ─── main ───────────────────────────────────────────────────────────────────
OPTS = parseArgs(process.argv.slice(2));
if (OPTS.report) {
  // re-render the Markdown summary of an existing results file
  const res = JSON.parse(readFileSync(OPTS.report, 'utf8'));
  const md = report(res);
  writeFileSync(OPTS.report.replace(/\.json$/, '.md'), `${md}\n`);
  console.log(md);
  process.exit(0);
}
if (OPTS.compare) {
  console.log(compare(...OPTS.compare));
  process.exit(0);
}
const req = createRequire(join(OPTS.repo, 'package.json'));
const { chromium } = req(process.env.PLAYWRIGHT ?? 'playwright');
const server = await serveLogged(OPTS.dist);
OPTS.base = server.url;
const started = Date.now();
const runs = [];
try {
  for (let i = 1; i <= OPTS.runs; i++) {
    log(`run ${i}/${OPTS.runs} against ${OPTS.base}`);
    runs.push(await oneRun(chromium, server, i));
  }
} finally {
  await server.close();
}
const res = {
  label: OPTS.label, when: new Date().toISOString(), wallSeconds: Math.round((Date.now() - started) / 1000),
  opts: { chromium: OPTS.chromium ?? 'playwright default', runs: OPTS.runs, only: OPTS.only, window: OPTS.window, flightWindow: OPTS.flightWindow, scale: OPTS.scale, viewport: OPTS.viewport, profile: OPTS.profile },
  env: { node: process.version, cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model, memGB: Math.round(os.totalmem() / 1e9), dist: OPTS.dist,
    build: (() => { try { return JSON.parse(readFileSync(join(OPTS.dist, 'build-info.json'), 'utf8')); } catch { return null; } })() },
  runs, aggregate: aggregate(runs),
};
const outDir = join(here, 'results');
mkdirSync(outDir, { recursive: true });
const out = OPTS.out ?? join(outDir, `${OPTS.label}-${res.when.replace(/[:.]/g, '-')}.json`);
writeFileSync(out, `${JSON.stringify(res, null, 2)}\n`);
const md = report(res);
writeFileSync(out.replace(/\.json$/, '.md'), `${md}\n`);
console.log(md);
log(`wrote ${out} (+ .md) in ${res.wallSeconds} s`);
