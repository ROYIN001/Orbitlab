/**
 * A static server for the production build, with no dependencies: `dist/`
 * served under `/Orbitlab/`, as GitHub Pages serves the site, so the browser
 * journeys meet the same sub-path, service-worker scope and relative URLs as
 * the deployed app.
 *
 *   node tests/browser/serve.mjs [dist-dir] [port]   # prints the URL, runs until killed
 *
 * or from a script: `const server = await serve({ root, port }); … await server.close()`.
 *
 * A path under the base that names no file and has no extension is an app
 * route and gets `index.html` (the SPA fallback); a missing file with an
 * extension is a 404, so a missing bundle or texture fails loudly instead of
 * coming back as HTML. Nothing is cached by the browser, and `override(path,
 * body)` serves other bytes for one file without touching `dist/` — how the
 * offline journey stages a new deploy (a changed `sw.js`) even in the deploy
 * workflow, whose `dist/` is then published.
 */
import { createServer } from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const BASE_PATH = '/Orbitlab/';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
};

async function fileAt(path) {
  try { return (await stat(path)).isFile() ? path : null; } catch { return null; }
}

/**
 * Serve `root` under `base` on `host:port` (port 0 picks a free one).
 * Resolves to `{ url, port, close() }` once listening.
 */
export async function serve({ root = 'dist', base = BASE_PATH, port = 0, host = '127.0.0.1' } = {}) {
  const dir = resolve(root);
  const overrides = new Map();
  if (!(await fileAt(join(dir, 'index.html')))) throw new Error(`no build at ${dir} (run npm run build first)`);
  const server = createServer(async (req, res) => {
    const send = (status, body, headers = {}) => {
      res.writeHead(status, { 'Cache-Control': 'no-cache', ...headers });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'method not allowed', { Allow: 'GET, HEAD' });
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { return send(400, 'bad request'); }
    if (pathname === base.slice(0, -1)) return send(301, '', { Location: base });
    if (!pathname.startsWith(base)) return send(pathname === '/' ? 302 : 404, 'not found', pathname === '/' ? { Location: base } : {});
    const rel = pathname.slice(base.length);
    const target = resolve(dir, rel);
    if (target !== dir && !target.startsWith(dir + sep)) return send(403, 'forbidden');
    if (overrides.has(rel)) {
      const body = Buffer.from(overrides.get(rel));
      return send(200, body, { 'Content-Type': TYPES[extname(rel).toLowerCase()] ?? 'application/octet-stream', 'Content-Length': body.length });
    }
    let file = await fileAt(target) ?? (rel === '' || rel.endsWith('/') ? await fileAt(join(target, 'index.html')) : null);
    if (!file && !extname(rel)) file = join(dir, 'index.html'); // an app route: the SPA fallback
    if (!file) return send(404, 'not found');
    const body = await readFile(file);
    send(200, body, { 'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'Content-Length': body.length });
  });
  await new Promise((ok, no) => { server.once('error', no); server.listen(port, host, ok); });
  const actual = server.address().port;
  return {
    url: `http://${host === '0.0.0.0' ? 'localhost' : host}:${actual}${base}`,
    port: actual,
    /** Serve `body` for `path` (relative to the base) instead of the file; null restores the file. */
    override: (path, body) => { if (body === null) overrides.delete(path); else overrides.set(path, body); },
    close: () => new Promise((ok) => { server.closeAllConnections?.(); server.close(() => ok()); }),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const server = await serve({ root: process.argv[2] ?? 'dist', port: Number(process.argv[3] ?? 4173) });
  console.log(`serving ${resolve(process.argv[2] ?? 'dist')} at ${server.url}`);
}
