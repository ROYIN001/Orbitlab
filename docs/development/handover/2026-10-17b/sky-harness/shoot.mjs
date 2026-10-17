// node shoot.mjs <label> <checkout> <out-dir> [view ...]        PNG per view
// node shoot.mjs --time <label> <checkout> <json-out> <frames> [view ...]   ms per frame
// <label>: a build under out/<label> (see README); textures come from <checkout>/public/textures.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const timing = args[0] === '--time';
if (timing) args.shift();
const [label, checkout, out, ...rest] = args;
const frames = timing ? Number(rest.shift()) : 0;
const root = resolve(import.meta.dirname, 'out', label);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = p.startsWith('/textures/') ? join(checkout, 'public', p) : join(root, p === '/' ? 'index.html' : p);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(url);
await page.waitForFunction(() => window.harnessReady, null, { timeout: 120_000 });
await page.evaluate(() => window.harnessReady);
const views = rest.length ? rest : await page.evaluate(() => window.views);
if (timing) {
  const results = {};
  for (const v of views) {
    results[v] = await page.evaluate(([n, k]) => window.time(n, k), [v, frames]);
    console.log(`${label} ${v}: mean ${results[v].mean.toFixed(1)} ms, median ${results[v].median.toFixed(1)} ms, min ${results[v].min.toFixed(1)} ms over ${frames}`);
  }
  await writeFile(out, JSON.stringify(results, null, 1));
} else {
  await mkdir(out, { recursive: true });
  for (const v of views) {
    const data = await page.evaluate((n) => window.shoot(n), v);
    await writeFile(join(out, `${v}.png`), Buffer.from(data.split(',')[1], 'base64'));
    console.log(`${label} ${v} -> ${join(out, `${v}.png`)}`);
  }
}
if (errors.length) console.log(errors.slice(0, 20).join('\n'));
await browser.close();
server.close();
