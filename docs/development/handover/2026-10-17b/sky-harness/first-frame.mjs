// node first-frame.mjs <labelA> <checkoutA> <labelB> <checkoutB> <rounds> : ms of the first frame of a fresh page
// (shader programs compiled, the sky's tables filled, one frame drawn), alternating A and B
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { chromium } from 'playwright';
const [la, ca, lb, cb, rounds] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg' };
async function host(label, checkout) {
  const root = resolve(import.meta.dirname, 'out', label);
  const server = createServer(async (req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = p.startsWith('/textures/') ? join(checkout, 'public', p) : join(root, p === '/' ? 'index.html' : p);
    try { const body = await readFile(file); res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }); res.end(body); } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}
const hosts = { [la]: await host(la, ca), [lb]: await host(lb, cb) };
const out = { [la]: [], [lb]: [] };
for (let i = 0; i < Number(rounds); i++) {
  for (const l of i % 2 ? [lb, la] : [la, lb]) {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(hosts[l].url);
    await page.waitForFunction(() => window.harnessReady, null, { timeout: 120_000 });
    await page.evaluate(() => window.harnessReady);
    const ms = await page.evaluate(async () => { const t0 = performance.now(); await window.time('limb-day', 1); return performance.now() - t0; });
    out[l].push(ms);
    await browser.close();
  }
}
for (const l of [la, lb]) console.log(`${l}: first frame (compile, tables, 4 frames) ${out[l].map((x) => x.toFixed(0)).join(', ')} ms`);
for (const h of Object.values(hosts)) h.server.close();
